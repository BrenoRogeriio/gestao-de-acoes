const PERFIL_ADMIN = 'ADMIN';
const PERFIS_ATUALIZACAO_COTACAO = new Set(['USER', PERFIL_ADMIN]);

export function ehAdministrador(usuario, perfilCarregando = false) {
    return !perfilCarregando && usuario?.perfil === PERFIL_ADMIN;
}

export function podeCadastrarAcao(usuario, perfilCarregando = false) {
    return ehAdministrador(usuario, perfilCarregando);
}

export function podeCadastrarCorretora(usuario, perfilCarregando = false) {
    return ehAdministrador(usuario, perfilCarregando);
}

export function podeAtualizarCotacaoGlobal(usuario, perfilCarregando = false) {
    return !perfilCarregando && PERFIS_ATUALIZACAO_COTACAO.has(usuario?.perfil);
}

export function podeExcluirCorretora(usuario, perfilCarregando = false) {
    return ehAdministrador(usuario, perfilCarregando);
}

export function podeGerenciarUsuarios(usuario, perfilCarregando = false) {
    return ehAdministrador(usuario, perfilCarregando);
}
