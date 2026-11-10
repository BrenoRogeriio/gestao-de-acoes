import { apiFetch, erroDaResposta } from './api.js';

const BASE = '/admin/usuarios';

async function lerJson(resposta, fallback) {
    if (!resposta.ok) throw await erroDaResposta(resposta, fallback);
    return resposta.json();
}

export async function listarUsuarios(signal, request = apiFetch) {
    const resposta = await request(BASE, { cache: 'no-store', signal });
    const dados = await lerJson(resposta, 'Não foi possível carregar os usuários.');
    if (!Array.isArray(dados)) throw new Error('O servidor retornou os usuários em um formato inesperado.');
    return dados;
}

export async function consultarUsuario(id, signal, request = apiFetch) {
    const resposta = await request(`${BASE}/${id}`, { cache: 'no-store', signal });
    return lerJson(resposta, 'Não foi possível consultar o usuário.');
}

export async function cadastrarUsuarioAdmin(payload, request = apiFetch) {
    const resposta = await request(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return lerJson(resposta, 'Não foi possível cadastrar o usuário.');
}

export async function alterarPerfilUsuario(id, perfil, request = apiFetch) {
    const resposta = await request(`${BASE}/${id}/perfil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil })
    });
    return lerJson(resposta, 'Não foi possível alterar o perfil.');
}

export async function alterarStatusUsuario(id, ativo, request = apiFetch) {
    const resposta = await request(`${BASE}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo })
    });
    return lerJson(resposta, 'Não foi possível alterar o status.');
}

export async function redefinirSenhaUsuario(id, novaSenha, request = apiFetch) {
    const resposta = await request(`${BASE}/${id}/senha`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha })
    });
    if (!resposta.ok) throw await erroDaResposta(resposta, 'Não foi possível redefinir a senha.');
    if (resposta.status !== 204) throw new Error('O servidor retornou uma resposta inesperada ao redefinir a senha.');
}
