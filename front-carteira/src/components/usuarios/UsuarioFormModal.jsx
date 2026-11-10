import { useRef, useState } from 'react';
import { Check, LoaderCircle, UserPlus, X } from 'lucide-react';
import { cadastrarUsuarioAdmin } from '../../services/usuarios.js';
import { criarFormularioUsuario, mensagemFalhaUsuario, PERFIS_USUARIO, prepararCadastroUsuario, validarFormularioUsuario } from '../../utils/usuarios.js';
import { useModalAcessivel } from './useModalAcessivel.js';

export default function UsuarioFormModal({ onClose, onSuccess, onForbidden }) {
    const [form, setForm] = useState(criarFormularioUsuario);
    const [erros, setErros] = useState({});
    const [erroGeral, setErroGeral] = useState('');
    const [enviando, setEnviando] = useState(false);
    const enviandoRef = useRef(false);
    const dialogRef = useRef(null);
    const nomeRef = useRef(null);

    const limparSenhas = () => setForm(atual => ({ ...atual, senha: '', confirmacaoSenha: '' }));
    const fechar = () => {
        limparSenhas();
        onClose();
    };
    useModalAcessivel({ dialogRef, focoInicialRef: nomeRef, onClose: fechar, bloqueado: enviando });

    const alterar = (campo, valor) => {
        setForm(atual => ({ ...atual, [campo]: valor }));
        setErros(atuais => ({ ...atuais, [campo]: undefined }));
        setErroGeral('');
    };

    const enviar = async evento => {
        evento.preventDefault();
        if (enviandoRef.current) return;
        const validacao = validarFormularioUsuario(form);
        setErros(validacao);
        if (Object.keys(validacao).length) return;
        enviandoRef.current = true;
        setEnviando(true);
        setErroGeral('');
        try {
            const criado = await cadastrarUsuarioAdmin(prepararCadastroUsuario(form));
            limparSenhas();
            await onSuccess(criado);
        } catch (falha) {
            if (falha?.status === 403) {
                limparSenhas();
                await onForbidden?.();
                return;
            }
            setErroGeral(mensagemFalhaUsuario(falha, 'Não foi possível cadastrar o usuário.'));
            setEnviando(false);
            enviandoRef.current = false;
        }
    };

    return (
        <div className="user-modal-backdrop" onMouseDown={evento => evento.target === evento.currentTarget && !enviando && fechar()}>
            <section className="user-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="user-create-title" aria-describedby="user-create-description">
                <header className="user-modal-header">
                    <span className="user-modal-icon"><UserPlus size={20} aria-hidden="true" /></span>
                    <div><h2 id="user-create-title">Novo usuário</h2><p id="user-create-description">Crie uma conta com perfil USER ou ADMIN.</p></div>
                    <button className="icon-button" type="button" disabled={enviando} onClick={fechar} aria-label="Fechar formulário"><X size={19} aria-hidden="true" /></button>
                </header>
                <form className="user-form" onSubmit={enviar} noValidate>
                    {erroGeral && <div className="inline-feedback feedback-error" role="alert">{erroGeral}</div>}
                    <fieldset className="user-form-grid" disabled={enviando}>
                        <div className="form-field-full">
                            <label className="lbl-form" htmlFor="user-name">Nome</label>
                            <input ref={nomeRef} className="input-moderno" id="user-name" maxLength="120" autoComplete="name" value={form.nome} aria-invalid={Boolean(erros.nome)} onChange={evento => alterar('nome', evento.target.value)} />
                            {erros.nome && <span className="field-error" role="alert">{erros.nome}</span>}
                        </div>
                        <div className="form-field-full">
                            <label className="lbl-form" htmlFor="user-email">E-mail</label>
                            <input className="input-moderno" id="user-email" type="email" maxLength="254" autoComplete="username" value={form.email} aria-invalid={Boolean(erros.email)} onChange={evento => alterar('email', evento.target.value)} />
                            {erros.email && <span className="field-error" role="alert">{erros.email}</span>}
                        </div>
                        <div>
                            <label className="lbl-form" htmlFor="user-password">Senha</label>
                            <input className="input-moderno" id="user-password" type="password" minLength="8" maxLength="72" autoComplete="new-password" value={form.senha} aria-invalid={Boolean(erros.senha)} onChange={evento => alterar('senha', evento.target.value)} />
                            {erros.senha && <span className="field-error" role="alert">{erros.senha}</span>}
                        </div>
                        <div>
                            <label className="lbl-form" htmlFor="user-password-confirm">Confirmar senha</label>
                            <input className="input-moderno" id="user-password-confirm" type="password" minLength="8" maxLength="72" autoComplete="new-password" value={form.confirmacaoSenha} aria-invalid={Boolean(erros.confirmacaoSenha)} onChange={evento => alterar('confirmacaoSenha', evento.target.value)} />
                            {erros.confirmacaoSenha && <span className="field-error" role="alert">{erros.confirmacaoSenha}</span>}
                        </div>
                        <div className="form-field-full">
                            <label className="lbl-form" htmlFor="user-profile">Perfil</label>
                            <select className="input-moderno" id="user-profile" value={form.perfil} aria-invalid={Boolean(erros.perfil)} onChange={evento => alterar('perfil', evento.target.value)}>
                                {PERFIS_USUARIO.map(perfil => <option key={perfil} value={perfil}>{perfil}</option>)}
                            </select>
                        </div>
                    </fieldset>
                    <footer className="user-modal-actions">
                        <button className="button button-secondary" type="button" disabled={enviando} onClick={fechar}>Cancelar</button>
                        <button className="button button-primary" type="submit" disabled={enviando}>{enviando ? <LoaderCircle className="is-spinning" size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}{enviando ? 'Cadastrando…' : 'Cadastrar usuário'}</button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
