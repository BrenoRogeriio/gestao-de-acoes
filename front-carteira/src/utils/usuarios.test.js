import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
    alterarPerfilUsuario,
    alterarStatusUsuario,
    cadastrarUsuarioAdmin,
    consultarUsuario,
    listarUsuarios,
    redefinirSenhaUsuario
} from '../services/usuarios.js';
import {
    formatarDataCadastro,
    mensagemFalhaUsuario,
    prepararCadastroUsuario,
    validarFormularioUsuario,
    validarSenha
} from './usuarios.js';

const json = (dados, status = 200) => new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/problem+json' } });

test('ADMIN lista e consulta usuários pelos endpoints existentes', async () => {
    const requisicoes = [];
    const request = async (path, options) => {
        requisicoes.push({ path, options });
        return path === '/admin/usuarios'
            ? json([{ id: 1, nome: 'Ana', email: 'ana@example.com', perfil: 'ADMIN', ativo: true }])
            : json({ id: 1, nome: 'Ana', email: 'ana@example.com', perfil: 'ADMIN', ativo: true });
    };
    assert.equal((await listarUsuarios(undefined, request))[0].nome, 'Ana');
    assert.equal((await consultarUsuario(1, undefined, request)).perfil, 'ADMIN');
    assert.deepEqual(requisicoes.map(item => item.path), ['/admin/usuarios', '/admin/usuarios/1']);
    assert.equal(requisicoes.every(item => item.options.cache === 'no-store'), true);
});

for (const perfil of ['USER', 'ADMIN']) {
    test(`ADMIN cadastra usuário ${perfil} enviando somente os campos do DTO`, async () => {
        let requisicao;
        const payload = prepararCadastroUsuario({ nome: ' Ana Silva ', email: ' ANA@EXAMPLE.COM ', senha: 'senha-segura', confirmacaoSenha: 'senha-segura', perfil });
        const request = async (path, options) => {
            requisicao = { path, options };
            return json({ id: 2, ...payload, senha: undefined, ativo: true }, 201);
        };
        await cadastrarUsuarioAdmin(payload, request);
        assert.equal(requisicao.path, '/admin/usuarios');
        assert.equal(requisicao.options.method, 'POST');
        assert.deepEqual(JSON.parse(requisicao.options.body), { nome: 'Ana Silva', email: 'ana@example.com', senha: 'senha-segura', perfil });
    });
}

test('alteração de perfil usa PATCH e altera a lista somente com a resposta', async () => {
    let requisicao;
    const request = async (path, options) => {
        requisicao = { path, options };
        return json({ id: 7, perfil: 'ADMIN' });
    };
    const atualizado = await alterarPerfilUsuario(7, 'ADMIN', request);
    assert.equal(atualizado.perfil, 'ADMIN');
    assert.equal(requisicao.path, '/admin/usuarios/7/perfil');
    assert.equal(requisicao.options.method, 'PATCH');
    assert.deepEqual(JSON.parse(requisicao.options.body), { perfil: 'ADMIN' });
});

for (const ativo of [true, false]) {
    test(`${ativo ? 'ativação' : 'desativação'} usa o contrato de status`, async () => {
        let requisicao;
        const request = async (path, options) => {
            requisicao = { path, options };
            return json({ id: 8, ativo });
        };
        assert.equal((await alterarStatusUsuario(8, ativo, request)).ativo, ativo);
        assert.equal(requisicao.path, '/admin/usuarios/8/status');
        assert.deepEqual(JSON.parse(requisicao.options.body), { ativo });
    });
}

test('redefinição envia apenas novaSenha e aceita sucesso HTTP 204', async () => {
    let requisicao;
    const request = async (path, options) => {
        requisicao = { path, options };
        return new Response(null, { status: 204 });
    };
    await redefinirSenhaUsuario(9, 'nova-senha-segura', request);
    assert.equal(requisicao.path, '/admin/usuarios/9/senha');
    assert.equal(requisicao.options.method, 'PUT');
    assert.deepEqual(JSON.parse(requisicao.options.body), { novaSenha: 'nova-senha-segura' });
});

test('validações refletem limites reais dos DTOs e não enviam confirmação', () => {
    assert.deepEqual(validarFormularioUsuario({ nome: '', email: 'invalido', senha: 'curta', confirmacaoSenha: 'outra', perfil: 'ROOT' }), {
        nome: 'Informe o nome.',
        email: 'Informe um e-mail válido.',
        senha: 'A senha deve ter entre 8 e 72 caracteres.',
        confirmacaoSenha: 'As senhas não coincidem.',
        perfil: 'Selecione um perfil válido.'
    });
    assert.deepEqual(validarSenha('12345678', '12345678'), {});
    assert.equal(Object.hasOwn(prepararCadastroUsuario({ nome: 'A', email: 'a@b.com', senha: '12345678', confirmacaoSenha: '12345678', perfil: 'USER' }), 'confirmacaoSenha'), false);
});

for (const [status, detail] of [
    [400, 'Um ou mais campos estão inválidos.'],
    [401, 'Não autorizado'],
    [403, 'Acesso negado'],
    [404, 'Usuário não encontrado.'],
    [409, 'E-mail já cadastrado.'],
    [422, 'O último administrador ativo não pode ser desativado ou rebaixado.']
]) {
    test(`preserva tratamento seguro do HTTP ${status}`, async () => {
        const request = async () => json({ detail }, status);
        await assert.rejects(() => consultarUsuario(99, undefined, request), erro => erro.status === status && erro.message === detail);
    });
}

test('erro de rede recebe mensagem amigável e data ausente não é inventada', () => {
    assert.equal(mensagemFalhaUsuario(new TypeError('Failed to fetch'), 'Falha'), 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    assert.equal(formatarDataCadastro(null), 'Não informada');
    assert.equal(formatarDataCadastro('inválida'), 'Não informada');
});

test('interface protege menu, rota, confirmações e revalidação de perfil', async () => {
    const [layout, app, pagina, confirmacao] = await Promise.all([
        readFile(new URL('../components/layout/AppLayout.jsx', import.meta.url), 'utf8'),
        readFile(new URL('../App.jsx', import.meta.url), 'utf8'),
        readFile(new URL('../components/usuarios/Usuarios.jsx', import.meta.url), 'utf8'),
        readFile(new URL('../components/usuarios/UsuarioConfirmModal.jsx', import.meta.url), 'utf8')
    ]);
    assert.match(layout, /label: 'Usuários'.*adminOnly: true/);
    assert.match(layout, /podeGerenciarUsuarios\(usuario\)/);
    assert.match(app, /validandoAdmin/);
    assert.match(app, /atualizarUsuario\(\)/);
    assert.match(app, /addEventListener\('focus'/);
    assert.match(pagina, /UsuarioConfirmModal/);
    assert.match(confirmacao, /role="alertdialog"/);
    assert.match(confirmacao, /último|operação pode remover/i);
});

test('senhas ficam em campos protegidos, são limpas e nunca persistidas', async () => {
    const [cadastro, senha, servico] = await Promise.all([
        readFile(new URL('../components/usuarios/UsuarioFormModal.jsx', import.meta.url), 'utf8'),
        readFile(new URL('../components/usuarios/UsuarioSenhaModal.jsx', import.meta.url), 'utf8'),
        readFile(new URL('../services/usuarios.js', import.meta.url), 'utf8')
    ]);
    assert.match(cadastro, /type="password"/);
    assert.match(cadastro, /autoComplete="new-password"/);
    assert.match(cadastro, /limparSenhas\(\)/);
    assert.match(senha, /setNovaSenha\(''\)/);
    assert.match(senha, /setConfirmacaoSenha\(''\)/);
    assert.doesNotMatch(`${cadastro}\n${senha}\n${servico}`, /localStorage|console\./);
    assert.doesNotMatch(servico, /senhaHash|token/);
});
