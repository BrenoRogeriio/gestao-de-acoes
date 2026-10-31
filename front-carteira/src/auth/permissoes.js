export function podeExcluirCorretora(usuario, perfilCarregando = false) {
    return !perfilCarregando && usuario?.perfil === 'ADMIN';
}
