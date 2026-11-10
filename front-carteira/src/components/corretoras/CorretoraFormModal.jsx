import { useEffect, useRef, useState } from 'react';
import { Building2, Check, LoaderCircle, X } from 'lucide-react';
import { cadastrarCorretora } from '../../services/corretoras.js';
import {
    criarFormularioCorretora,
    mascararCep,
    mascararCnpj,
    prepararCadastroCorretora,
    validarFormularioCorretora
} from '../../utils/corretoras.js';

function CampoFormulario({ id, label, campo, form, erros, enviando, onChange, ...inputProps }) {
    return (
        <div>
            <label className="lbl-form" htmlFor={id}>{label}</label>
            <input {...inputProps} className="input-moderno" id={id} value={form[campo]} disabled={enviando} aria-invalid={Boolean(erros[campo])} aria-describedby={erros[campo] ? `${id}-error` : undefined} onChange={evento => onChange(campo, evento.target.value)} />
            {erros[campo] && <span className="field-error" id={`${id}-error`}>{erros[campo]}</span>}
        </div>
    );
}

export default function CorretoraFormModal({ onClose, onSuccess, onForbidden }) {
    const [form, setForm] = useState(criarFormularioCorretora);
    const [erros, setErros] = useState({});
    const [erroGeral, setErroGeral] = useState('');
    const [enviando, setEnviando] = useState(false);
    const enviandoRef = useRef(false);
    const dialogRef = useRef(null);
    const cnpjRef = useRef(null);

    useEffect(() => {
        const anterior = document.activeElement;
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.setTimeout(() => cnpjRef.current?.focus(), 0);
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
        const formatado = campo === 'cnpj' ? mascararCnpj(valor) : campo === 'cep' ? mascararCep(valor) : valor;
        setForm(atual => ({ ...atual, [campo]: formatado }));
        setErros(atuais => ({ ...atuais, [campo]: undefined }));
        setErroGeral('');
    };

    const enviar = async evento => {
        evento.preventDefault();
        if (enviandoRef.current) return;
        const validacao = validarFormularioCorretora(form);
        setErros(validacao);
        if (Object.keys(validacao).length) return;
        enviandoRef.current = true;
        setEnviando(true);
        try {
            const corretora = await cadastrarCorretora(prepararCadastroCorretora(form));
            await onSuccess(corretora);
        } catch (falha) {
            if (falha?.status === 403) {
                await onForbidden?.();
                return;
            }
            setErroGeral(falha.message || 'Não foi possível cadastrar a instituição.');
            setEnviando(false);
            enviandoRef.current = false;
        }
    };

    return (
        <div className="broker-modal-backdrop" onMouseDown={evento => evento.target === evento.currentTarget && !enviando && onClose()}>
            <section className="broker-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="broker-modal-title" aria-describedby="broker-modal-description">
                <header className="broker-modal-header">
                    <span className="broker-modal-icon"><Building2 size={20} aria-hidden="true" /></span>
                    <div><h2 id="broker-modal-title">Nova corretora</h2><p id="broker-modal-description">Informe os dados necessários para validar a instituição.</p></div>
                    <button className="icon-button" type="button" disabled={enviando} onClick={onClose} aria-label="Fechar formulário"><X size={19} aria-hidden="true" /></button>
                </header>
                <form className="broker-form" onSubmit={enviar} noValidate>
                    {erroGeral && <div className="inline-feedback feedback-error" role="alert">{erroGeral}</div>}
                    <div className="broker-form-grid">
                        <div>
                            <label className="lbl-form" htmlFor="broker-cnpj">CNPJ</label>
                            <input className="input-moderno" id="broker-cnpj" ref={cnpjRef} inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" value={form.cnpj} disabled={enviando} aria-invalid={Boolean(erros.cnpj)} aria-describedby={erros.cnpj ? 'broker-cnpj-error' : 'broker-form-helper'} onChange={evento => alterar('cnpj', evento.target.value)} />
                            {erros.cnpj && <span className="field-error" id="broker-cnpj-error">{erros.cnpj}</span>}
                        </div>
                        <CampoFormulario id="broker-cep" label="CEP" campo="cep" form={form} erros={erros} enviando={enviando} onChange={alterar} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" />
                        <CampoFormulario id="broker-number" label="Número (opcional)" campo="numero" form={form} erros={erros} enviando={enviando} onChange={alterar} maxLength="50" autoComplete="address-line2" />
                        <CampoFormulario id="broker-complement" label="Complemento (opcional)" campo="complemento" form={form} erros={erros} enviando={enviando} onChange={alterar} maxLength="255" />
                        <CampoFormulario id="broker-email" label="E-mail institucional (opcional)" campo="email" form={form} erros={erros} enviando={enviando} onChange={alterar} type="email" maxLength="255" autoComplete="email" />
                        <CampoFormulario id="broker-phone" label="Telefone (opcional)" campo="telefone" form={form} erros={erros} enviando={enviando} onChange={alterar} type="tel" maxLength="50" autoComplete="tel" />
                    </div>
                    <p className="broker-form-helper" id="broker-form-helper">Os dados cadastrais, o registro CVM e o endereço serão validados e enriquecidos automaticamente pelo backend.</p>
                    <footer className="broker-modal-actions">
                        <button className="button button-secondary" type="button" disabled={enviando} onClick={onClose}>Cancelar</button>
                        <button className="button button-primary" type="submit" disabled={enviando}>{enviando ? <LoaderCircle className="is-spinning" size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}{enviando ? 'Validando instituição…' : 'Cadastrar'}</button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
