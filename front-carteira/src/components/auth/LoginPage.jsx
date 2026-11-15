import { useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { navegar, navegarPorLink } from '../../auth/rotas.js';
import { possuiErros, prepararLogin, validarLogin } from '../../auth/validacao.js';
import { useAuth } from '../../auth/useAuth.js';
import { mensagemErroLogin } from '../../services/autenticacao.js';
import AuthShell from './AuthShell.jsx';
import PasswordField from './PasswordField.jsx';

export default function LoginPage({ darkMode, onToggleTheme }) {
    const { login, mensagemSessao, limparMensagemSessao } = useAuth();
    const [campos, setCampos] = useState({ email: '', senha: '' });
    const [erros, setErros] = useState({});
    const [erroGeral, setErroGeral] = useState('');
    const [enviando, setEnviando] = useState(false);

    const alterar = evento => {
        const { name, value } = evento.target;
        setCampos(atuais => ({ ...atuais, [name]: value }));
        setErros(atuais => ({ ...atuais, [name]: undefined }));
        setErroGeral('');
        limparMensagemSessao();
    };

    const enviar = async evento => {
        evento.preventDefault();
        const novosErros = validarLogin(campos);
        setErros(novosErros);
        if (possuiErros(novosErros)) return;

        setEnviando(true);
        setErroGeral('');
        try {
            await login(prepararLogin(campos));
            navegar('/', { substituir: true });
        } catch (erro) {
            setErroGeral(mensagemErroLogin(erro));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <AuthShell title="Boas-vindas" description="Entre para acessar sua carteira." darkMode={darkMode} onToggleTheme={onToggleTheme}>
            {(mensagemSessao || erroGeral) && <div className="auth-message auth-message-error" role="alert">{erroGeral || mensagemSessao}</div>}
            <form className="auth-form" onSubmit={enviar} noValidate>
                <div className="auth-field">
                    <label htmlFor="email">E-mail</label>
                    <input id="email" name="email" type="email" value={campos.email} onChange={alterar} autoComplete="username" inputMode="email" aria-invalid={Boolean(erros.email)} aria-describedby={erros.email ? 'email-erro' : undefined} required />
                    {erros.email && <span id="email-erro" className="field-error" role="alert">{erros.email}</span>}
                </div>
                <PasswordField id="senha" label="Senha" value={campos.senha} onChange={alterar} error={erros.senha} autoComplete="current-password" />
                <button className="button button-primary auth-submit" type="submit" disabled={enviando}>
                    {enviando ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                    {enviando ? 'Entrando…' : 'Entrar'}
                </button>
            </form>
            <p className="auth-alternative">Ainda não tem conta? <a href="/cadastro" onClick={evento => navegarPorLink(evento, '/cadastro')}>Criar conta</a></p>
        </AuthShell>
    );
}
