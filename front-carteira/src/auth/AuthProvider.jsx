import { useCallback, useEffect, useMemo, useState } from 'react';
import { cadastrarUsuario, autenticar, obterUsuarioAutenticado } from '../services/autenticacao.js';
import { configurarTratamentoNaoAutorizado } from '../services/api.js';
import { navegar } from './rotas.js';
import { lerTokenJWT, limparTokenJWT, salvarTokenJWT } from './session.js';
import { AuthContext } from './auth-context.js';

export default function AuthProvider({ children }) {
    const [tokenInicial] = useState(lerTokenJWT);
    const [usuario, setUsuario] = useState(null);
    const [carregando, setCarregando] = useState(Boolean(tokenInicial));
    const [mensagemSessao, setMensagemSessao] = useState('');

    const encerrarSessaoExpirada = useCallback(() => {
        limparTokenJWT();
        setUsuario(null);
        setMensagemSessao('Sua sessão expirou. Entre novamente.');
        navegar('/login', { substituir: true });
    }, []);

    useEffect(() => configurarTratamentoNaoAutorizado(encerrarSessaoExpirada), [encerrarSessaoExpirada]);

    useEffect(() => {
        if (!tokenInicial) return undefined;

        const controller = new AbortController();
        obterUsuarioAutenticado(controller.signal)
            .then(setUsuario)
            .catch(erro => {
                if (erro?.name !== 'AbortError') encerrarSessaoExpirada();
            })
            .finally(() => {
                if (!controller.signal.aborted) setCarregando(false);
            });

        return () => controller.abort();
    }, [encerrarSessaoExpirada, tokenInicial]);

    const aplicarAutenticacao = useCallback(dados => {
        salvarTokenJWT(dados.token);
        setUsuario(dados.usuario);
        setMensagemSessao('');
        return dados.usuario;
    }, []);

    const atualizarUsuario = useCallback(async () => {
        const usuarioAtualizado = await obterUsuarioAutenticado();
        setUsuario(usuarioAtualizado);
        return usuarioAtualizado;
    }, []);

    const login = useCallback(async credenciais => aplicarAutenticacao(await autenticar(credenciais)), [aplicarAutenticacao]);
    const cadastrar = useCallback(async cadastro => aplicarAutenticacao(await cadastrarUsuario(cadastro)), [aplicarAutenticacao]);
    const logout = useCallback(() => {
        limparTokenJWT();
        setUsuario(null);
        setMensagemSessao('');
    }, []);

    const value = useMemo(() => ({
        usuario,
        autenticado: Boolean(usuario),
        carregando,
        mensagemSessao,
        limparMensagemSessao: () => setMensagemSessao(''),
        atualizarUsuario,
        login,
        cadastrar,
        logout
    }), [usuario, carregando, mensagemSessao, atualizarUsuario, login, cadastrar, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
