import { apiFetch, erroDaResposta } from './api.js';

export async function erroCorretoraDaResposta(resposta, fallback) {
    return erroDaResposta(resposta, fallback);
}

export async function consultarCorretoras(signal, request = apiFetch) {
    const resposta = await request('/corretoras?size=200&sort=nomeFantasia,asc', { cache: 'no-store', signal });
    if (!resposta.ok) throw await erroCorretoraDaResposta(resposta, 'Não foi possível carregar as instituições cadastradas.');
    const dados = await resposta.json();
    const corretoras = Array.isArray(dados) ? dados : dados?.content;
    if (!Array.isArray(corretoras)) throw new Error('O servidor retornou as instituições em um formato inesperado.');
    return {
        corretoras,
        total: Number.isFinite(Number(dados?.totalElements)) ? Number(dados.totalElements) : corretoras.length
    };
}

export async function cadastrarCorretora(payload, request = apiFetch) {
    const resposta = await request('/corretoras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!resposta.ok) throw await erroCorretoraDaResposta(resposta, 'Não foi possível cadastrar a instituição. Revise os dados e tente novamente.');
    return resposta.json();
}

export async function consultarCorretoraPorId(id, signal, request = apiFetch) {
    const resposta = await request(`/corretoras/${id}`, { cache: 'no-store', signal });
    if (!resposta.ok) throw await erroCorretoraDaResposta(resposta, 'Não foi possível carregar a instituição.');
    return resposta.json();
}

export async function excluirCorretora(id, request = apiFetch) {
    const resposta = await request(`/corretoras/${id}`, { method: 'DELETE' });
    if (resposta.status === 403) {
        throw Object.assign(new Error('Você não tem permissão para excluir corretoras.'), { status: 403 });
    }
    if (!resposta.ok) throw await erroCorretoraDaResposta(resposta, 'Não foi possível excluir a instituição.');
}
