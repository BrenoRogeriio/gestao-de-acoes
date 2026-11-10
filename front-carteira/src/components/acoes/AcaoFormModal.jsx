import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, TrendingUp, X } from 'lucide-react';
import { cadastrarAcao } from '../../services/acoes.js';
import { criarFormularioAcao, MERCADOS, normalizarTicker, prepararCadastroAcao, validarFormularioAcao } from '../../utils/acoes.js';

export default function AcaoFormModal({ onClose, onSuccess, onForbidden }) {
    const [form, setForm] = useState(criarFormularioAcao);
    const [erros, setErros] = useState({});
    const [erroGeral, setErroGeral] = useState('');
    const [enviando, setEnviando] = useState(false);
    const enviandoRef = useRef(false);
    const dialogRef = useRef(null);
    const tickerRef = useRef(null);

    useEffect(() => {
        const anterior = document.activeElement;
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.setTimeout(() => tickerRef.current?.focus(), 0);
        return () => {
            document.body.style.overflow = overflowAnterior;
            anterior?.focus?.();
        };
    }, []);

    useEffect(() => {
        const teclado = evento => {
            if (evento.key === 'Escape' && !enviando) onClose();
            if (evento.key !== 'Tab') return;
            const focaveis = dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex="0"]');
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
    }, [enviando, onClose]);

    const alterar = (campo, valor) => {
        setForm(atual => ({ ...atual, [campo]: campo === 'ticker' ? valor.toUpperCase() : valor }));
        setErros(atuais => ({ ...atuais, [campo]: undefined }));
        setErroGeral('');
    };

    const enviar = async evento => {
        evento.preventDefault();
        if (enviandoRef.current) return;
        const validacao = validarFormularioAcao(form);
        setErros(validacao);
        if (Object.keys(validacao).length) return;

        enviandoRef.current = true;
        setEnviando(true);
        setErroGeral('');
        try {
            const acao = await cadastrarAcao(prepararCadastroAcao(form));
            await onSuccess(acao);
        } catch (falha) {
            if (falha?.status === 403) {
                await onForbidden?.();
                return;
            }
            setErroGeral(falha.message || 'Não foi possível validar esse ativo.');
            setEnviando(false);
            enviandoRef.current = false;
        }
    };

    return (
        <div className="asset-modal-backdrop" onMouseDown={evento => evento.target === evento.currentTarget && !enviando && onClose()}>
            <section className="asset-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="asset-modal-title" aria-describedby="asset-modal-description">
                <header className="asset-modal-header">
                    <span className="asset-modal-icon"><TrendingUp size={20} aria-hidden="true" /></span>
                    <div><h2 id="asset-modal-title">Nova ação</h2><p id="asset-modal-description">Cadastre um ativo brasileiro ou americano na base.</p></div>
                    <button className="icon-button asset-modal-close" type="button" disabled={enviando} onClick={onClose} aria-label="Fechar formulário"><X size={19} aria-hidden="true" /></button>
                </header>
                <form className="asset-form" onSubmit={enviar} noValidate>
                    {erroGeral && <div className="inline-feedback feedback-error" role="alert">{erroGeral}</div>}
                    <fieldset className="asset-market-field" disabled={enviando}>
                        <legend>Mercado</legend>
                        <div className="asset-market-options">
                            {MERCADOS.map(mercado => (
                                <button className={`asset-market-option ${form.mercado === mercado.value ? 'is-active' : ''}`} type="button" key={mercado.value} aria-pressed={form.mercado === mercado.value} onClick={() => alterar('mercado', mercado.value)}>
                                    <strong>{mercado.label}</strong><span>{mercado.moeda}</span>
                                </button>
                            ))}
                        </div>
                        {erros.mercado && <span className="field-error">{erros.mercado}</span>}
                    </fieldset>
                    <div>
                        <label className="lbl-form" htmlFor="asset-ticker">Ticker</label>
                        <input className="input-moderno" id="asset-ticker" ref={tickerRef} type="text" maxLength="20" autoComplete="off" placeholder={form.mercado === 'BRASIL' ? 'Ex.: WEGE3' : 'Ex.: MSFT'} value={form.ticker} disabled={enviando} aria-invalid={Boolean(erros.ticker)} aria-describedby={erros.ticker ? 'asset-ticker-error' : 'asset-form-helper'} onChange={evento => alterar('ticker', evento.target.value)} />
                        {erros.ticker && <span className="field-error" id="asset-ticker-error">{erros.ticker}</span>}
                        <p className="asset-form-helper" id="asset-form-helper">Os dados e a cotação do ativo serão consultados automaticamente. O ticker será enviado como <strong>{normalizarTicker(form.ticker) || 'TICKER'}</strong>.</p>
                    </div>
                    <footer className="asset-modal-actions">
                        <button className="button button-secondary" type="button" disabled={enviando} onClick={onClose}>Cancelar</button>
                        <button className="button button-primary" type="submit" disabled={enviando}>
                            {enviando ? <LoaderCircle className="is-spinning" size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
                            {enviando ? 'Consultando ativo…' : 'Cadastrar ação'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
