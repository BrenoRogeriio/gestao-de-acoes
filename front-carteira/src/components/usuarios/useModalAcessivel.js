import { useEffect, useRef } from 'react';

export function useModalAcessivel({ dialogRef, focoInicialRef, onClose, bloqueado = false }) {
    const onCloseRef = useRef(onClose);
    const bloqueadoRef = useRef(bloqueado);

    useEffect(() => {
        onCloseRef.current = onClose;
        bloqueadoRef.current = bloqueado;
    }, [bloqueado, onClose]);

    useEffect(() => {
        const focoAnterior = document.activeElement;
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const timer = window.setTimeout(() => focoInicialRef.current?.focus(), 0);

        const teclado = evento => {
            if (evento.key === 'Escape' && !bloqueadoRef.current) {
                onCloseRef.current();
                return;
            }
            if (evento.key !== 'Tab') return;
            const focaveis = dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]');
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
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('keydown', teclado);
            document.body.style.overflow = overflowAnterior;
            focoAnterior?.focus?.();
        };
    }, [dialogRef, focoInicialRef]);
}
