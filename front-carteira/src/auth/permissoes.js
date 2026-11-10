const PERFIL_ADMIN = 'ADMIN';

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
    return ehAdministrador(usuario, perfilCarregando);
}

export function podeExcluirCorretora(usuario, perfilCarregando = false) {
    return ehAdministrador(usuario, perfilCarregando);
}

export function podeGerenciarUsuarios(usuario, perfilCarregando = false) {
    return ehAdministrador(usuario, perfilCarregando);
}
