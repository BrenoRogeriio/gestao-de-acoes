import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { apiFetch, configurarTratamentoNaoAutorizado } from '../services/api.js';
import { autenticar, cadastrarUsuario, obterUsuarioAutenticado } from '../services/autenticacao.js';
import { identidadeUsuario } from './usuario.js';
import { prepararCadastro, prepararLogin, validarCadastro, validarLogin } from './validacao.js';
import { resolverAcesso } from './rotas.js';
import { CHAVE_TOKEN_SESSAO, lerTokenJWT, limparTokenJWT, salvarTokenJWT } from './session.js';
import { podeExcluirCorretora } from './permissoes.js';

class SessionStorageFake {
    #dados = new Map();
    getItem(chave) { return this.#dados.get(chave) ?? null; }
    setItem(chave, valor) { this.#dados.set(chave, String(valor)); }
    removeItem(chave) { this.#dados.delete(chave); }
    clear() { this.#dados.clear(); }
}

const fetchOriginal = globalThis.fetch;

beforeEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: new SessionStorageFake() });
    configurarTratamentoNaoAutorizado(null);
});

afterEach(() => {
    globalThis.fetch = fetchOriginal;
    limparTokenJWT();
    configurarTratamentoNaoAutorizado(null);
});

test('login válido envia as credenciais normalizadas e retorna autenticação', async () => {
    let requisicao;
    const request = async (path, options) => {
        requisicao = { path, options };
        return new Response(JSON.stringify({ token: 'token-de-teste', usuario: { nome: 'Ana', email: 'ana@example.com' } }), { status: 200 });
    };
    const credenciais = prepararLogin({ email: ' ANA@Example.com ', senha: 'senha-segura' });
    const resposta = await autenticar(credenciais, request);
    assert.equal(requisicao.path, '/auth/login');
    assert.deepEqual(JSON.parse(requisicao.options.body), { email: 'ana@example.com', senha: 'senha-segura' });
    assert.equal(resposta.usuario.nome, 'Ana');
});

test('login inválido expõe apenas o erro seguro centralizado', async () => {
    const request = async () => new Response(JSON.stringify({ detail: 'Credenciais inválidas' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(() => autenticar({ email: 'ana@example.com', senha: 'incorreta' }, request), erro => erro.status === 401 && erro.message === 'Credenciais inválidas');
    assert.deepEqual(validarLogin({ email: 'invalido', senha: '' }), { email: 'Informe um e-mail válido.', senha: 'Informe sua senha.' });
});

test('cadastro válido envia somente nome, email e senha', async () => {
    let corpo;
    const request = async (_path, options) => {
        corpo = JSON.parse(options.body);
        return new Response(JSON.stringify({ token: 'token-de-teste', usuario: { nome: 'Ana', email: 'ana@example.com' } }), { status: 201 });
    };
    const cadastro = prepararCadastro({ nome: ' Ana Silva ', email: ' ANA@Example.com ', senha: 'senha-segura', confirmacaoSenha: 'senha-segura', perfil: 'ADMIN' });
    await cadastrarUsuario(cadastro, request);
    assert.deepEqual(corpo, { nome: 'Ana Silva', email: 'ana@example.com', senha: 'senha-segura' });
});

test('cadastro rejeita confirmação de senha divergente', () => {
    const erros = validarCadastro({ nome: 'Ana', email: 'ana@example.com', senha: 'senha-segura', confirmacaoSenha: 'outra-senha' });
    assert.equal(erros.confirmacaoSenha, 'As senhas não coincidem.');
});

test('JWT é armazenado e removido exclusivamente no sessionStorage', () => {
    salvarTokenJWT('token-de-teste');
    assert.equal(lerTokenJWT(), 'token-de-teste');
    assert.equal(sessionStorage.getItem(CHAVE_TOKEN_SESSAO), 'token-de-teste');
    limparTokenJWT();
    assert.equal(lerTokenJWT(), null);
});

test('apiFetch adiciona Authorization automaticamente a APIs protegidas', async () => {
    salvarTokenJWT('token-de-teste');
    globalThis.fetch = async (_url, options) => {
        assert.equal(options.headers.get('Authorization'), 'Bearer token-de-teste');
        assert.equal(options.headers.get('Idempotency-Key'), 'operacao-1');
        return new Response(null, { status: 204 });
    };
    await apiFetch('/acoes', { headers: { 'Idempotency-Key': 'operacao-1' } });
});

test('restauração consulta /auth/me e retorna o usuário', async () => {
    const request = async (path, options) => {
        assert.equal(path, '/auth/me');
        assert.equal(options.cache, 'no-store');
        return new Response(JSON.stringify({ nome: 'Ana', email: 'ana@example.com', perfil: 'ADMIN' }), { status: 200 });
    };
    assert.deepEqual(await obterUsuarioAutenticado(undefined, request), { nome: 'Ana', email: 'ana@example.com', perfil: 'ADMIN' });
});

test('permissão de exclusão só é liberada para ADMIN com perfil carregado', () => {
    assert.equal(podeExcluirCorretora({ perfil: 'USER' }), false);
    assert.equal(podeExcluirCorretora({ perfil: 'ADMIN' }), true);
    assert.equal(podeExcluirCorretora({ perfil: 'ADMIN' }, true), false);
    assert.equal(podeExcluirCorretora(null), false);
});

test('token inválido é removido após 401 de rota protegida', async () => {
    salvarTokenJWT('token-invalido');
    globalThis.fetch = async () => new Response(null, { status: 401 });
    await apiFetch('/auth/me');
    assert.equal(lerTokenJWT(), null);
});

test('401 global limpa a sessão e aciona o encerramento uma única vez', async () => {
    salvarTokenJWT('token-expirado');
    let encerramentos = 0;
    configurarTratamentoNaoAutorizado(() => { encerramentos += 1; });
    globalThis.fetch = async () => new Response(null, { status: 401 });
    await apiFetch('/carteira');
    assert.equal(lerTokenJWT(), null);
    assert.equal(encerramentos, 1);
});

test('403 preserva a sessão e não aciona o encerramento global', async () => {
    salvarTokenJWT('token-valido');
    let encerramentos = 0;
    configurarTratamentoNaoAutorizado(() => { encerramentos += 1; });
    globalThis.fetch = async () => new Response(null, { status: 403 });
    await apiFetch('/corretoras/7', { method: 'DELETE' });
    assert.equal(lerTokenJWT(), 'token-valido');
    assert.equal(encerramentos, 0);
});

test('rota protegida sem autenticação redireciona para login', () => {
    assert.deepEqual(resolverAcesso({ caminho: '/acoes', autenticado: false }), { estado: 'redirecionar', rota: '/acoes', destino: '/login' });
});

test('rota protegida autenticada resolve a página existente', () => {
    assert.deepEqual(resolverAcesso({ caminho: '/corretoras', autenticado: true }), { estado: 'protegida', rota: '/corretoras', pagina: 'corretoras' });
});

test('logout remove o token da sessão', () => {
    salvarTokenJWT('token-de-teste');
    limparTokenJWT();
    assert.equal(lerTokenJWT(), null);
});

test('identidade do usuário fornece nome e email ao layout', () => {
    assert.deepEqual(identidadeUsuario({ nome: ' Ana ', email: ' ana@example.com ' }), { nome: 'Ana', email: 'ana@example.com' });
});

test('estado inicial de validação não libera conteúdo protegido', () => {
    assert.deepEqual(resolverAcesso({ caminho: '/', autenticado: false, carregando: true }), { estado: 'carregando', rota: '/' });
});

test('nenhum token é enviado para login e cadastro', async () => {
    salvarTokenJWT('token-de-teste');
    const endpoints = [];
    globalThis.fetch = async (url, options) => {
        endpoints.push(url);
        assert.equal(options.headers.has('Authorization'), false);
        return new Response(null, { status: 204 });
    };
    await apiFetch('/auth/login', { headers: { Authorization: 'Bearer indevido' } });
    await apiFetch('/auth/register');
    assert.equal(endpoints.length, 2);
});

test('formulários usam autocomplete seguro e layout oferece logout', async () => {
    const [login, cadastro, layout] = await Promise.all([
        readFile(new URL('../components/auth/LoginPage.jsx', import.meta.url), 'utf8'),
        readFile(new URL('../components/auth/CadastroPage.jsx', import.meta.url), 'utf8'),
        readFile(new URL('../components/layout/AppLayout.jsx', import.meta.url), 'utf8')
    ]);
    assert.match(login, /autoComplete="username"/);
    assert.match(login, /autoComplete="current-password"/);
    assert.match(cadastro, /autoComplete="new-password"/);
    assert.match(layout, />Sair</);
    assert.match(layout, /identidade\.nome/);
});
