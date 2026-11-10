import { podeGerenciarUsuarios } from './permissoes.js';

export const ROTAS_POR_PAGINA = Object.freeze({
    dashboard: '/',
    carteira: '/carteira',
    historico: '/historico',
    operacoes: '/lancamentos',
    acoes: '/acoes',
    corretoras: '/corretoras',
    investidores: '/investidores',
    usuarios: '/admin/usuarios'
});

const PAGINAS_POR_ROTA = new Map(Object.entries(ROTAS_POR_PAGINA).map(([pagina, rota]) => [rota, pagina]));
const ROTAS_PUBLICAS = new Set(['/login', '/cadastro']);
const EVENTO_NAVEGACAO = 'gestao-acoes:navegacao';

export function normalizarCaminho(caminho = '/') {
    const normalizado = `/${String(caminho).split('?')[0].split('#')[0]}`.replace(/\/{2,}/g, '/');
    return normalizado.length > 1 ? normalizado.replace(/\/$/, '') : normalizado;
}

export function resolverAcesso({ caminho = '/', autenticado = false, carregando = false, usuario = null } = {}) {
    const rota = normalizarCaminho(caminho);
    if (carregando) return { estado: 'carregando', rota };

    if (!autenticado) {
        return ROTAS_PUBLICAS.has(rota)
            ? { estado: 'publica', rota }
            : { estado: 'redirecionar', rota, destino: '/login' };
    }

    if (ROTAS_PUBLICAS.has(rota) || !PAGINAS_POR_ROTA.has(rota)) {
        return { estado: 'redirecionar', rota, destino: '/' };
    }
    if (PAGINAS_POR_ROTA.get(rota) === 'usuarios' && !podeGerenciarUsuarios(usuario)) {
        return { estado: 'redirecionar', rota, destino: '/' };
    }
    return { estado: 'protegida', rota, pagina: PAGINAS_POR_ROTA.get(rota) };
}

export function navegar(destino, { substituir = false } = {}) {
    if (!globalThis.window) return;
    const rota = normalizarCaminho(destino);
    const metodo = substituir ? 'replaceState' : 'pushState';
    globalThis.window.history[metodo](null, '', rota);
    globalThis.window.dispatchEvent(new Event(EVENTO_NAVEGACAO));
}

export function observarNavegacao(callback) {
    if (!globalThis.window) return () => {};
    globalThis.window.addEventListener('popstate', callback);
    globalThis.window.addEventListener(EVENTO_NAVEGACAO, callback);
    return () => {
        globalThis.window.removeEventListener('popstate', callback);
        globalThis.window.removeEventListener(EVENTO_NAVEGACAO, callback);
    };
}

export function navegarPorLink(evento, destino) {
    if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    evento.preventDefault();
    navegar(destino);
}

