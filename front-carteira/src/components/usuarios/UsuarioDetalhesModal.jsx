import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, UserRoundSearch, X } from 'lucide-react';
import { consultarUsuario } from '../../services/usuarios.js';
import { formatarDataCadastro, mensagemFalhaUsuario } from '../../utils/usuarios.js';
import { useModalAcessivel } from './useModalAcessivel.js';

export default function UsuarioDetalhesModal({ id, onClose, onForbidden }) {
    const [usuario, setUsuario] = useState(null);
    const [erro, setErro] = useState('');
    const dialogRef = useRef(null);
    const fecharRef = useRef(null);
    useModalAcessivel({ dialogRef, focoInicialRef: fecharRef, onClose });

    useEffect(() => {
        const controller = new AbortController();
        consultarUsuario(id, controller.signal)
            .then(setUsuario)
            .catch(async falha => {
                if (falha?.name === 'AbortError') return;
                if (falha?.status === 403) {
                    await onForbidden?.();
                    return;
                }
                setErro(mensagemFalhaUsuario(falha, 'Não foi possível consultar o usuário.'));
            });
        return () => controller.abort();
    }, [id, onForbidden]);

    return (
        <div className="user-modal-backdrop" onMouseDown={evento => evento.target === evento.currentTarget && onClose()}>
            <section className="user-modal user-details-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="user-details-title">
                <header className="user-modal-header">
                    <span className="user-modal-icon"><UserRoundSearch size={20} aria-hidden="true" /></span>
                    <div><h2 id="user-details-title">Detalhes do usuário</h2><p>Informações administrativas permitidas pela API.</p></div>
                    <button ref={fecharRef} className="icon-button" type="button" onClick={onClose} aria-label="Fechar detalhes"><X size={19} aria-hidden="true" /></button>
                </header>
                <div className="user-details-content">
                    {!usuario && !erro && <div className="user-modal-loading" role="status"><LoaderCircle className="is-spinning" size={22} aria-hidden="true" /> Carregando usuário…</div>}
                    {erro && <div className="inline-feedback feedback-error" role="alert">{erro}</div>}
                    {usuario && <dl className="user-details-list">
                        <div><dt>ID</dt><dd>{usuario.id}</dd></div>
                        <div><dt>Nome</dt><dd>{usuario.nome}</dd></div>
                        <div><dt>E-mail</dt><dd>{usuario.email}</dd></div>
                        <div><dt>Perfil</dt><dd>{usuario.perfil}</dd></div>
                        <div><dt>Status</dt><dd>{usuario.ativo ? 'Ativo' : 'Inativo'}</dd></div>
                        <div><dt>Cadastro</dt><dd>{formatarDataCadastro(usuario.dataHoraCadastro)}</dd></div>
                    </dl>}
                </div>
            </section>
        </div>
    );
}
