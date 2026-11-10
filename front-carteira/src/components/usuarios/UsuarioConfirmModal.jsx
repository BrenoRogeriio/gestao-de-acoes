import { useRef, useState } from 'react';
import { AlertTriangle, Check, LoaderCircle, X } from 'lucide-react';
import { alterarPerfilUsuario, alterarStatusUsuario } from '../../services/usuarios.js';
import { mensagemFalhaUsuario } from '../../utils/usuarios.js';
import { useModalAcessivel } from './useModalAcessivel.js';

export default function UsuarioConfirmModal({ alteracao, onClose, onSuccess, onForbidden }) {
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState('');
    const dialogRef = useRef(null);
    const cancelarRef = useRef(null);
    const enviandoRef = useRef(false);
    const { usuario, tipo, valor } = alteracao;
    const perfil = tipo === 'perfil';
    const acao = perfil ? `alterar o perfil para ${valor}` : `${valor ? 'ativar' : 'desativar'} a conta`;
    useModalAcessivel({ dialogRef, focoInicialRef: cancelarRef, onClose, bloqueado: enviando });

    const confirmar = async evento => {
        evento.preventDefault();
        if (enviandoRef.current) return;
        enviandoRef.current = true;
        setEnviando(true);
        setErro('');
        try {
            const atualizado = perfil
                ? await alterarPerfilUsuario(usuario.id, valor)
                : await alterarStatusUsuario(usuario.id, valor);
            await onSuccess(atualizado);
        } catch (falha) {
            if (falha?.status === 403) {
                await onForbidden?.();
                return;
            }
            setErro(mensagemFalhaUsuario(falha, `Não foi possível ${acao}.`));
            setEnviando(false);
            enviandoRef.current = false;
        }
    };

    return (
        <div className="user-modal-backdrop" onMouseDown={evento => evento.target === evento.currentTarget && !enviando && onClose()}>
            <section className="user-modal user-confirm-modal" ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="user-confirm-title" aria-describedby="user-confirm-description">
                <header className="user-modal-header">
                    <span className="user-modal-icon user-warning-icon"><AlertTriangle size={20} aria-hidden="true" /></span>
                    <div><h2 id="user-confirm-title">Confirmar alteração</h2><p id="user-confirm-description">Revise a operação antes de continuar.</p></div>
                    <button className="icon-button" type="button" disabled={enviando} onClick={onClose} aria-label="Fechar confirmação"><X size={19} aria-hidden="true" /></button>
                </header>
                <form className="user-confirm-content" onSubmit={confirmar}>
                    <p>Deseja <strong>{acao}</strong> de <strong>{usuario.nome}</strong>?</p>
                    {(tipo === 'perfil' && valor === 'USER') || (tipo === 'status' && !valor) ? <p className="user-warning-copy">A operação pode remover o acesso administrativo ou impedir novos logins.</p> : null}
                    {erro && <div className="inline-feedback feedback-error" role="alert">{erro}</div>}
                    <footer className="user-modal-actions">
                        <button ref={cancelarRef} className="button button-secondary" type="button" disabled={enviando} onClick={onClose}>Cancelar</button>
                        <button className="button button-primary" type="submit" disabled={enviando}>{enviando ? <LoaderCircle className="is-spinning" size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}{enviando ? 'Alterando…' : 'Confirmar alteração'}</button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
