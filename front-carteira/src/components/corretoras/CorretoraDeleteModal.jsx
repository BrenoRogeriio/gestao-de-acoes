import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Trash2, X } from 'lucide-react';
import { excluirCorretora } from '../../services/corretoras.js';
import { nomeDaCorretora } from '../../utils/corretoras.js';

export default function CorretoraDeleteModal({ corretora, onClose, onSuccess, onForbidden }) {
    const [excluindo, setExcluindo] = useState(false);
    const [erro, setErro] = useState('');
    const excluindoRef = useRef(false);
    const dialogRef = useRef(null);
    const cancelarRef = useRef(null);

    useEffect(() => {
        const anterior = document.activeElement;
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.setTimeout(() => cancelarRef.current?.focus(), 0);
        return () => {
            document.body.style.overflow = overflowAnterior;
            anterior?.focus?.();
        };
    }, []);

    useEffect(() => {
        const teclado = evento => {
            if (evento.key === 'Escape' && !excluindo) onClose();
            if (evento.key !== 'Tab') return;
            const focaveis = dialogRef.current?.querySelectorAll('button:not([disabled])');
            if (!focaveis?.length) return;
            const primeiro = focaveis[0];
            const ultimo = focaveis[focaveis.length - 1];
            if (evento.shiftKey && document.activeElement === primeiro) {
                evento.preventDefault();
                ultimo.focus();
            } else if (!evento.shiftKey && document.activeElement === ultimo) {
                evento.preventDefault();
                primeiro.focus();
            }
        };
        document.addEventListener('keydown', teclado);
        return () => document.removeEventListener('keydown', teclado);
    }, [excluindo, onClose]);

    const confirmar = async evento => {
        evento.preventDefault();
        if (excluindoRef.current) return;
        excluindoRef.current = true;
        setExcluindo(true);
        setErro('');
        try {
            await excluirCorretora(corretora.id);
            onSuccess(corretora);
        } catch (falha) {
            if (falha?.status === 403) {
                await onForbidden?.();
                return;
            }
            setErro(falha.message || 'Não foi possível excluir a instituição.');
            setExcluindo(false);
            excluindoRef.current = false;
        }
    };

    return (
        <div className="broker-modal-backdrop" onMouseDown={evento => evento.target === evento.currentTarget && !excluindo && onClose()}>
            <section className="broker-modal broker-delete-modal" ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="broker-delete-title" aria-describedby="broker-delete-description">
                <header className="broker-modal-header">
                    <span className="broker-modal-icon broker-delete-icon"><Trash2 size={20} aria-hidden="true" /></span>
                    <div><h2 id="broker-delete-title">Excluir esta corretora?</h2><p id="broker-delete-description">Esta ação só será permitida se não existirem operações vinculadas.</p></div>
                    <button className="icon-button" type="button" disabled={excluindo} onClick={onClose} aria-label="Fechar confirmação"><X size={19} aria-hidden="true" /></button>
                </header>
                <form className="broker-delete-content" onSubmit={confirmar}>
                    <p>Você está prestes a excluir <strong>{nomeDaCorretora(corretora)}</strong>.</p>
                    {erro && <div className="inline-feedback feedback-error" role="alert">{erro}</div>}
                    <footer className="broker-modal-actions">
                        <button ref={cancelarRef} className="button button-secondary" type="button" disabled={excluindo} onClick={onClose}>Cancelar</button>
                        <button className="button broker-delete-confirm" type="submit" disabled={excluindo}>{excluindo ? <LoaderCircle className="is-spinning" size={17} aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}{excluindo ? 'Excluindo…' : 'Excluir corretora'}</button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
