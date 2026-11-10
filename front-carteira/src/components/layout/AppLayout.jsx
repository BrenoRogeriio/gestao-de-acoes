import { useEffect, useRef, useState } from 'react';
import {
    ArrowLeftRight, Building2, CandlestickChart, History, LayoutDashboard, Menu,
    LogOut, Moon, Plus, Sun, TrendingUp, UserCircle, Users, WalletCards, X
} from 'lucide-react';
import { podeGerenciarUsuarios } from '../../auth/permissoes.js';
import { identidadeUsuario } from '../../auth/usuario.js';

const NAVEGACAO = [
    {
        label: 'Visão geral',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'carteira', label: 'Minha carteira', icon: WalletCards },
            { id: 'historico', label: 'Histórico', icon: History }
        ]
    },
    {
        label: 'Gestão',
        items: [
            { id: 'operacoes', label: 'Lançamentos', icon: ArrowLeftRight },
            { id: 'acoes', label: 'Ações', icon: TrendingUp },
            { id: 'corretoras', label: 'Corretoras', icon: Building2 },
            { id: 'investidores', label: 'Investidores', icon: Users },
            { id: 'usuarios', label: 'Usuários', icon: UserCircle, adminOnly: true }
        ]
    }
];

export default function AppLayout({ activePage, onNavigate, page, darkMode, onToggleTheme, usuario, onLogout, children }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const sidebarRef = useRef(null);
    const menuTriggerRef = useRef(null);
    const identidade = identidadeUsuario(usuario);

    useEffect(() => {
        if (!menuOpen) return undefined;

        const focoAnterior = document.activeElement;
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const timer = window.setTimeout(() => sidebarRef.current?.querySelector('.sidebar-close')?.focus(), 0);

        const teclado = evento => {
            if (evento.key === 'Escape') {
                setMenuOpen(false);
                return;
            }
            if (evento.key !== 'Tab') return;
            const focaveis = [...sidebarRef.current.querySelectorAll('button:not(:disabled), a[href]')];
            const primeiro = focaveis[0];
            const ultimo = focaveis.at(-1);
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
            focoAnterior?.focus();
        };
    }, [menuOpen]);

    const navegar = pagina => {
        onNavigate(pagina);
        setMenuOpen(false);
    };

    return (
        <div className="app-shell">
            <a className="skip-link" href="#main-content">Ir para o conteúdo</a>

            <aside id="main-navigation" ref={sidebarRef} className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} aria-label="Navegação principal">
                <div className="brand">
                    <span className="brand-mark" aria-hidden="true"><CandlestickChart size={22} /></span>
                    <span>
                        <strong>Gestão de Ações</strong>
                        <small>Carteira inteligente</small>
                    </span>
                    <button className="icon-button sidebar-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {NAVEGACAO.map(secao => (
                        <div className="nav-section" key={secao.label}>
                            <p className="nav-section-label">{secao.label}</p>
                            {secao.items.filter(item => !item.adminOnly || podeGerenciarUsuarios(usuario)).map(item => {
                                const Icon = item.icon;
                                const ativo = activePage === item.id;
                                return (
                                    <button
                                        className={`nav-item ${ativo ? 'is-active' : ''}`}
                                        type="button"
                                        key={item.id}
                                        onClick={() => navegar(item.id)}
                                        aria-current={ativo ? 'page' : undefined}
                                    >
                                        <Icon size={19} aria-hidden="true" />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="theme-toggle" type="button" onClick={onToggleTheme}>
                        {darkMode ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
                        <span>{darkMode ? 'Usar tema claro' : 'Usar tema escuro'}</span>
                    </button>
                </div>
            </aside>

            {menuOpen && <button className="sidebar-backdrop" type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}

            <div className="app-workspace">
                <header className="topbar">
                    <div className="topbar-heading">
                        <button ref={menuTriggerRef} className="icon-button menu-trigger" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="main-navigation">
                            <Menu size={21} aria-hidden="true" />
                        </button>
                        <div>
                            <span className="topbar-eyebrow">{page.eyebrow}</span>
                            <h1>{page.titulo}</h1>
                        </div>
                    </div>

                    <div className="topbar-actions">
                        <div className="user-summary" title={identidade.email || identidade.nome}>
                            <UserCircle size={24} aria-hidden="true" />
                            <span><strong>{identidade.nome}</strong>{identidade.email && <small>{identidade.email}</small>}</span>
                        </div>
                        <button className="button button-secondary logout-button" type="button" onClick={onLogout} aria-label="Sair da conta">
                            <LogOut size={18} aria-hidden="true" />
                            <span>Sair</span>
                        </button>
                        <button className="button button-primary topbar-action" type="button" onClick={() => navegar('operacoes')}>
                            <Plus size={18} aria-hidden="true" />
                            <span>Novo lançamento</span>
                        </button>
                    </div>
                </header>

                <main id="main-content" className="main-content" tabIndex="-1">
                    <p className="page-context">{page.descricao}</p>
                    {children}
                </main>
            </div>
        </div>
    );
}
