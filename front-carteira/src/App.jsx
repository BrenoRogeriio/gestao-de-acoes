import { useCallback, useEffect, useState } from 'react';
import { normalizarCaminho, ROTAS_POR_PAGINA, navegar, observarNavegacao, resolverAcesso } from './auth/rotas.js';
import { useAuth } from './auth/useAuth.js';
import AppLayout from './components/layout/AppLayout.jsx';
import AuthLoading from './components/auth/AuthLoading.jsx';
import CadastroPage from './components/auth/CadastroPage.jsx';
import LoginPage from './components/auth/LoginPage.jsx';
import HomeBroker from './components/HomeBroker.jsx';
import Corretoras from './components/corretoras/Corretoras.jsx';
import ContentState from './components/ui/ContentState.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import MinhaCarteira from './components/carteira/MinhaCarteira.jsx';
import HistoricoOperacoes from './components/historico/HistoricoOperacoes.jsx';
import Acoes from './components/acoes/Acoes.jsx';
import Usuarios from './components/usuarios/Usuarios.jsx';

const ROTA_USUARIOS = ROTAS_POR_PAGINA.usuarios;

const PAGINAS = {
    dashboard: { eyebrow: 'Visão geral', titulo: 'Dashboard', descricao: 'Visão geral da sua carteira de investimentos.' },
    carteira: { eyebrow: 'Investimentos', titulo: 'Minha carteira', descricao: 'Consulte suas posições abertas e os principais indicadores.' },
    acoes: { eyebrow: 'Cadastros', titulo: 'Ações', descricao: 'Inclua ativos brasileiros e internacionais na sua base.' },
    corretoras: { eyebrow: 'Cadastros', titulo: 'Corretoras', descricao: 'Mantenha as instituições utilizadas nas suas operações.' },
    historico: { eyebrow: 'Movimentações', titulo: 'Histórico', descricao: 'Revise compras e vendas registradas na carteira.' },
    operacoes: { eyebrow: 'Movimentações', titulo: 'Lançamentos', descricao: 'Registre compras e vendas executadas na sua carteira.' },
    investidores: { eyebrow: 'Em preparação', titulo: 'Investidores', descricao: 'Espaço reservado para uma evolução futura do sistema.' },
    usuarios: { eyebrow: 'Administração', titulo: 'Usuários', descricao: 'Gerencie acessos, perfis, status e credenciais das contas.' }
};

function App() {
    const { usuario, autenticado, carregando, atualizarUsuario, logout } = useAuth();
    const [caminho, setCaminho] = useState(() => window.location.pathname);
    const [validandoAdmin, setValidandoAdmin] = useState(() => normalizarCaminho(window.location.pathname) === ROTA_USUARIOS);
    const [temaEscuro, setTemaEscuro] = useState(() => localStorage.getItem('tema') === 'escuro');
    const rotaAdministrativa = normalizarCaminho(caminho) === ROTA_USUARIOS;
    const acesso = resolverAcesso({
        caminho,
        autenticado,
        carregando: carregando || (rotaAdministrativa && validandoAdmin),
        usuario
    });

    useEffect(() => observarNavegacao(() => {
        const proximoCaminho = window.location.pathname;
        if (normalizarCaminho(proximoCaminho) === ROTA_USUARIOS) setValidandoAdmin(true);
        setCaminho(proximoCaminho);
    }), []);

    useEffect(() => {
        if (!rotaAdministrativa || carregando || !autenticado || !validandoAdmin) return undefined;
        let ativo = true;
        atualizarUsuario()
            .catch(falha => {
                if (falha?.status !== 401) navegar('/', { substituir: true });
            })
            .finally(() => { if (ativo) setValidandoAdmin(false); });
        return () => { ativo = false; };
    }, [atualizarUsuario, autenticado, carregando, rotaAdministrativa, validandoAdmin]);

    useEffect(() => {
        const revalidarAoRetomar = () => {
            if (normalizarCaminho(window.location.pathname) === ROTA_USUARIOS) setValidandoAdmin(true);
        };
        window.addEventListener('focus', revalidarAoRetomar);
        return () => window.removeEventListener('focus', revalidarAoRetomar);
    }, []);

    useEffect(() => {
        localStorage.setItem('tema', temaEscuro ? 'escuro' : 'claro');
    }, [temaEscuro]);

    useEffect(() => {
        if (acesso.estado === 'redirecionar') navegar(acesso.destino, { substituir: true });
    }, [acesso.estado, acesso.destino]);

    const alternarTema = () => setTemaEscuro(tema => !tema);
    const revalidarPerfil = useCallback(async () => {
        setValidandoAdmin(true);
    }, []);
    const irParaPagina = pagina => {
        if (pagina === 'usuarios') setValidandoAdmin(true);
        navegar(ROTAS_POR_PAGINA[pagina] ?? '/');
    };
    const sair = () => {
        logout();
        navegar('/login', { substituir: true });
    };

    const renderizarPagina = paginaAtiva => {
        switch (paginaAtiva) {
            case 'dashboard': return <Dashboard onNavigate={irParaPagina} />;
            case 'carteira': return <MinhaCarteira onNavigate={irParaPagina} />;
            case 'historico': return <HistoricoOperacoes />;
            case 'operacoes': return <HomeBroker />;
            case 'acoes': return <Acoes />;
            case 'corretoras': return <Corretoras />;
            case 'usuarios': return <Usuarios usuarioAtual={usuario} onForbidden={revalidarPerfil} />;
            case 'investidores': return <ContentState title="Módulo de investidores" description="Esta área continua reservada para uma etapa futura." />;
            default: return null;
        }
    };

    let conteudo;
    if (acesso.estado === 'carregando' || acesso.estado === 'redirecionar') {
        conteudo = <AuthLoading />;
    } else if (acesso.estado === 'publica') {
        conteudo = acesso.rota === '/cadastro'
            ? <CadastroPage darkMode={temaEscuro} onToggleTheme={alternarTema} />
            : <LoginPage darkMode={temaEscuro} onToggleTheme={alternarTema} />;
    } else {
        const paginaAtiva = acesso.pagina;
        conteudo = (
            <AppLayout
                activePage={paginaAtiva}
                onNavigate={irParaPagina}
                page={PAGINAS[paginaAtiva]}
                darkMode={temaEscuro}
                onToggleTheme={alternarTema}
                usuario={usuario}
                onLogout={sair}
            >
                {renderizarPagina(paginaAtiva)}
            </AppLayout>
        );
    }

    return <div className={temaEscuro ? 'theme-dark' : 'theme-light'}>{conteudo}</div>;
}

export default App;
