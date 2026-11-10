import { useRef, useState } from 'react';
import { Check, KeyRound, LoaderCircle, X } from 'lucide-react';
import { redefinirSenhaUsuario } from '../../services/usuarios.js';
import { mensagemFalhaUsuario, validarSenha } from '../../utils/usuarios.js';
import { useModalAcessivel } from './useModalAcessivel.js';

export default function UsuarioSenhaModal({ usuario, onClose, onSuccess, onForbidden }) {
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
    const [erros, setErros] = useState({});
    const [erroGeral, setErroGeral] = useState('');
    const [enviando, setEnviando] = useState(false);
    const enviandoRef = useRef(false);
    const dialogRef = useRef(null);
    const senhaRef = useRef(null);

    const limpar = () => {
        setNovaSenha('');
        setConfirmacaoSenha('');
    };
    const fechar = () => {
        limpar();
        onClose();
    };
    useModalAcessivel({ dialogRef, focoInicialRef: senhaRef, onClose: fechar, bloqueado: enviando });

    const enviar = async evento => {
        evento.preventDefault();
        if (enviandoRef.current) return;
        const validacao = validarSenha(novaSenha, confirmacaoSenha);
        setErros(validacao);
        if (Object.keys(validacao).length) return;
        enviandoRef.current = true;
        setEnviando(true);
        setErroGeral('');
        try {
            await redefinirSenhaUsuario(usuario.id, novaSenha);
            limpar();
            await onSuccess(usuario);
        } catch (falha) {
            if (falha?.status === 403) {
                limpar();
                await onForbidden?.();
                return;
            }
            setErroGeral(mensagemFalhaUsuario(falha, 'Não foi possível redefinir a senha.'));
            setEnviando(false);
            enviandoRef.current = false;
        }
    };

    return (
        <div className="user-modal-backdrop" onMouseDown={evento => evento.target === evento.currentTarget && !enviando && fechar()}>
            <section className="user-modal user-password-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="user-password-title" aria-describedby="user-password-description">
                <header className="user-modal-header">
                    <span className="user-modal-icon"><KeyRound size={20} aria-hidden="true" /></span>
                    <div><h2 id="user-password-title">Redefinir senha</h2><p id="user-password-description">Defina uma nova senha para {usuario.nome}.</p></div>
                    <button className="icon-button" type="button" disabled={enviando} onClick={fechar} aria-label="Fechar redefinição de senha"><X size={19} aria-hidden="true" /></button>
                </header>
                <form className="user-form" onSubmit={enviar} noValidate>
                    {erroGeral && <div className="inline-feedback feedback-error" role="alert">{erroGeral}</div>}
                    <fieldset className="user-form-grid" disabled={enviando}>
                        <div className="form-field-full">
                            <label className="lbl-form" htmlFor="new-user-password">Nova senha</label>
                            <input ref={senhaRef} className="input-moderno" id="new-user-password" type="password" minLength="8" maxLength="72" autoComplete="new-password" value={novaSenha} aria-invalid={Boolean(erros.novaSenha)} onChange={evento => { setNovaSenha(evento.target.value); setErros(atuais => ({ ...atuais, novaSenha: undefined })); }} />
                            {erros.novaSenha && <span className="field-error" role="alert">{erros.novaSenha}</span>}
                        </div>
                        <div className="form-field-full">
                            <label className="lbl-form" htmlFor="confirm-user-password">Confirmar nova senha</label>
                            <input className="input-moderno" id="confirm-user-password" type="password" minLength="8" maxLength="72" autoComplete="new-password" value={confirmacaoSenha} aria-invalid={Boolean(erros.confirmacaoSenha)} onChange={evento => { setConfirmacaoSenha(evento.target.value); setErros(atuais => ({ ...atuais, confirmacaoSenha: undefined })); }} />
                            {erros.confirmacaoSenha && <span className="field-error" role="alert">{erros.confirmacaoSenha}</span>}
                        </div>
                    </fieldset>
                    <footer className="user-modal-actions">
                        <button className="button button-secondary" type="button" disabled={enviando} onClick={fechar}>Cancelar</button>
                        <button className="button button-primary" type="submit" disabled={enviando}>{enviando ? <LoaderCircle className="is-spinning" size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}{enviando ? 'Redefinindo…' : 'Redefinir senha'}</button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
