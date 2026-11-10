import { useCallback, useEffect, useState } from 'react';
import { KeyRound, LoaderCircle, Plus, RefreshCw, Search, ShieldCheck, UserCheck, UserX, UsersRound } from 'lucide-react';
import { listarUsuarios } from '../../services/usuarios.js';
import { formatarDataCadastro, mensagemFalhaUsuario } from '../../utils/usuarios.js';
import ContentState from '../ui/ContentState.jsx';
import UsuarioConfirmModal from './UsuarioConfirmModal.jsx';
import UsuarioDetalhesModal from './UsuarioDetalhesModal.jsx';
import UsuarioFormModal from './UsuarioFormModal.jsx';
import UsuarioSenhaModal from './UsuarioSenhaModal.jsx';

export default function Usuarios({ usuarioAtual, onForbidden }) {
    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [mensagem, setMensagem] = useState('');
    const [criando, setCriando] = useState(false);
    const [detalhesId, setDetalhesId] = useState(null);
    const [alteracao, setAlteracao] = useState(null);
    const [usuarioSenha, setUsuarioSenha] = useState(null);

    const tratarForbidden = useCallback(async () => {
        setErro('Acesso negado. Seu perfil está sendo revalidado.');
        await onForbidden?.();
    }, [onForbidden]);

    const carregar = useCallback(async signal => {
        setCarregando(true);
        setErro('');
        try {
            setUsuarios(await listarUsuarios(signal));
        } catch (falha) {
            if (falha?.name === 'AbortError') return;
            if (falha?.status === 403) {
                await tratarForbidden();
                return;
            }
            setErro(mensagemFalhaUsuario(falha, 'Não foi possível carregar os usuários.'));
        } finally {
            if (!signal?.aborted) setCarregando(false);
        }
    }, [tratarForbidden]);

    useEffect(() => {
        const controller = new AbortController();
        listarUsuarios(controller.signal)
            .then(setUsuarios)
            .catch(async falha => {
                if (falha?.name === 'AbortError') return;
                if (falha?.status === 403) {
                    await tratarForbidden();
                    return;
                }
                setErro(mensagemFalhaUsuario(falha, 'Não foi possível carregar os usuários.'));
            })
            .finally(() => {
                if (!controller.signal.aborted) setCarregando(false);
            });
        return () => controller.abort();
    }, [tratarForbidden]);

    const atualizarNaLista = atualizado => {
        setUsuarios(atuais => atuais.map(usuario => usuario.id === atualizado.id ? atualizado : usuario));
    };

    const cadastroConcluido = criado => {
        setUsuarios(atuais => [...atuais, criado].sort((a, b) => Number(a.id) - Number(b.id)));
        setCriando(false);
        setMensagem(`Usuário ${criado.nome} cadastrado com perfil ${criado.perfil}.`);
    };

    const alteracaoConcluida = atualizado => {
        atualizarNaLista(atualizado);
        setAlteracao(null);
        setMensagem(`Dados de ${atualizado.nome} atualizados com sucesso.`);
    };

    const senhaConcluida = usuario => {
        setUsuarioSenha(null);
        setMensagem(`Senha de ${usuario.nome} redefinida com sucesso.`);
    };

    const abrirAlteracaoPerfil = usuario => setAlteracao({ usuario, tipo: 'perfil', valor: usuario.perfil === 'ADMIN' ? 'USER' : 'ADMIN' });
    const abrirAlteracaoStatus = usuario => setAlteracao({ usuario, tipo: 'status', valor: !usuario.ativo });
    const renderizarAcoes = usuario => {
        const propriaConta = String(usuario.id) === String(usuarioAtual?.id);
        const bloqueiaPerfil = propriaConta && usuario.perfil === 'ADMIN';
        const bloqueiaStatus = propriaConta && usuario.ativo;
        return <div className="users-row-actions">
            <button className="user-action" type="button" onClick={() => setDetalhesId(usuario.id)}><Search size={15} aria-hidden="true" /> Detalhes</button>
            <button className="user-action" type="button" disabled={bloqueiaPerfil} title={bloqueiaPerfil ? 'Você não pode rebaixar o próprio perfil.' : undefined} onClick={() => abrirAlteracaoPerfil(usuario)}><ShieldCheck size={15} aria-hidden="true" /> {usuario.perfil === 'ADMIN' ? 'Tornar USER' : 'Tornar ADMIN'}</button>
            <button className="user-action" type="button" disabled={bloqueiaStatus} title={bloqueiaStatus ? 'Você não pode desativar a própria conta.' : undefined} onClick={() => abrirAlteracaoStatus(usuario)}>{usuario.ativo ? <UserX size={15} aria-hidden="true" /> : <UserCheck size={15} aria-hidden="true" />} {usuario.ativo ? 'Desativar' : 'Ativar'}</button>
            <button className="user-action" type="button" onClick={() => setUsuarioSenha(usuario)}><KeyRound size={15} aria-hidden="true" /> Redefinir senha</button>
        </div>;
    };

    return (
        <section className="users-page" aria-labelledby="users-section-title">
            <div className="page-header">
                <div><h2 id="users-section-title">Contas cadastradas</h2><p>Consulte contas e administre permissões sem expor credenciais.</p></div>
                <div className="page-header-action users-header-actions">
                    <button className="button button-secondary" type="button" disabled={carregando} onClick={() => carregar()}><RefreshCw className={carregando ? 'is-spinning' : ''} size={17} aria-hidden="true" /> Atualizar</button>
                    <button className="button button-primary" type="button" onClick={() => { setMensagem(''); setCriando(true); }}><Plus size={17} aria-hidden="true" /> Novo usuário</button>
                </div>
            </div>

            {mensagem && <div className="inline-feedback feedback-success users-feedback" role="status">{mensagem}</div>}
            {erro && !carregando && <ContentState title="Não foi possível exibir os usuários" description={erro} role="alert" icon={UsersRound} action={<button className="button button-secondary" type="button" onClick={() => carregar()}>Tentar novamente</button>} />}
            {carregando && <ContentState title="Carregando usuários" description="Aguarde enquanto consultamos as contas cadastradas." role="status" ariaLive="polite" icon={LoaderCircle} />}
            {!carregando && !erro && usuarios.length === 0 && <ContentState title="Nenhum usuário cadastrado" description="Use o botão Novo usuário para criar a primeira conta administrativa." icon={UsersRound} />}

            {!carregando && !erro && usuarios.length > 0 && <div className="card users-table-card">
                <div className="table-scroll">
                    <table className="data-table users-table">
                        <caption className="sr-only">Lista de usuários cadastrados</caption>
                        <thead><tr><th>ID</th><th>Usuário</th><th>Perfil</th><th>Status</th><th>Cadastro</th><th>Ações</th></tr></thead>
                        <tbody>{usuarios.map(usuario => {
                            const propriaConta = String(usuario.id) === String(usuarioAtual?.id);
                            return <tr key={usuario.id}>
                                <td className="number-cell">#{usuario.id}</td>
                                <td className="asset-cell"><strong>{usuario.nome}</strong><small>{usuario.email}</small>{propriaConta && <small className="current-user-label">Sua conta</small>}</td>
                                <td><span className={`badge ${usuario.perfil === 'ADMIN' ? 'badge-admin' : 'badge-neutral'}`}><ShieldCheck size={13} aria-hidden="true" />{usuario.perfil}</span></td>
                                <td><span className={`badge ${usuario.ativo ? 'badge-positive' : 'badge-negative'}`}>{usuario.ativo ? 'Ativo' : 'Inativo'}</span></td>
                                <td className="number-cell">{formatarDataCadastro(usuario.dataHoraCadastro)}</td>
                                <td>{renderizarAcoes(usuario)}</td>
                            </tr>;
                        })}</tbody>
                    </table>
                </div>
            </div>}

            {!carregando && !erro && usuarios.length > 0 && <div className="users-mobile-list">
                {usuarios.map(usuario => {
                    const propriaConta = String(usuario.id) === String(usuarioAtual?.id);
                    return <article className="card user-mobile-card" key={usuario.id}>
                        <header><div><span className="user-mobile-id">#{usuario.id}</span><h3>{usuario.nome}</h3><p>{usuario.email}</p>{propriaConta && <span className="current-user-label">Sua conta</span>}</div><span className={`badge ${usuario.ativo ? 'badge-positive' : 'badge-negative'}`}>{usuario.ativo ? 'Ativo' : 'Inativo'}</span></header>
                        <dl><div><dt>Perfil</dt><dd>{usuario.perfil}</dd></div><div><dt>Cadastro</dt><dd>{formatarDataCadastro(usuario.dataHoraCadastro)}</dd></div></dl>
                        {renderizarAcoes(usuario)}
                    </article>;
                })}
            </div>}

            {criando && <UsuarioFormModal onClose={() => setCriando(false)} onSuccess={cadastroConcluido} onForbidden={tratarForbidden} />}
            {detalhesId !== null && <UsuarioDetalhesModal id={detalhesId} onClose={() => setDetalhesId(null)} onForbidden={tratarForbidden} />}
            {alteracao && <UsuarioConfirmModal alteracao={alteracao} onClose={() => setAlteracao(null)} onSuccess={alteracaoConcluida} onForbidden={tratarForbidden} />}
            {usuarioSenha && <UsuarioSenhaModal usuario={usuarioSenha} onClose={() => setUsuarioSenha(null)} onSuccess={senhaConcluida} onForbidden={tratarForbidden} />}
        </section>
    );
}
