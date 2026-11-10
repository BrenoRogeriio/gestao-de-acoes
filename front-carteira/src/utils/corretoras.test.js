import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
    cadastrarCorretora,
    consultarCorretoraPorId,
    consultarCorretoras,
    excluirCorretora,
    erroCorretoraDaResposta
} from '../services/corretoras.js';
import {
    criarFormularioCorretora,
    criarModeloCorretoras,
    enderecoCorretora,
    formatarCep,
    formatarCnpj,
    localizacaoCorretora,
    mascararCep,
    mascararCnpj,
    nomeDaCorretora,
    prepararCadastroCorretora,
    resumoCorretoras,
    rotuloOpcaoCorretora,
    SITUACAO_ATIVAS,
    SITUACAO_OUTRAS,
    validarFormularioCorretora
} from './corretoras.js';

const xp = {
    id: 7,
    cnpj: '02332886000104',
    razaoSocial: 'XP Investimentos CCTVM S.A.',
    nomeFantasia: 'XP Investimentos',
    email: 'atendimento@xpi.com.br',
    telefone: '0800 000 0000',
    cep: '22440032',
    logradouro: 'Avenida Ataulfo de Paiva',
    numero: '153',
    complemento: 'Sala 201',
    bairro: 'Leblon',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
    situacaoCadastral: 'ATIVA',
    statusCvm: 'EM FUNCIONAMENTO NORMAL'
};

const xpOutra = { ...xp, id: 8, cnpj: '11722289000107', nomeFantasia: 'XP Investimentos Digital', cidade: 'São Paulo', uf: 'SP' };
const inativa = { ...xp, id: 9, cnpj: '11222333000181', nomeFantasia: 'Instituição Antiga', razaoSocial: 'Instituição Antiga S.A.', situacaoCadastral: 'BAIXADA' };

function resposta(dados, { ok = true, status = 200 } = {}) {
    return { ok, status, json: async () => dados };
}

test('representa loading da página', () => assert.deepEqual(criarModeloCorretoras({ loading: true }), { estado: 'loading' }));
test('representa erro da página', () => assert.deepEqual(criarModeloCorretoras({ error: true }), { estado: 'error' }));
test('representa lista vazia', () => assert.deepEqual(criarModeloCorretoras(), { estado: 'empty', corretoras: [], total: 0 }));

test('preserva a corretora cadastrada e seus campos reais', () => {
    const modelo = criarModeloCorretoras({ corretoras: [xp], total: 1 });
    assert.equal(modelo.corretoras[0].id, 7);
    assert.equal(modelo.corretoras[0].email, 'atendimento@xpi.com.br');
});

test('usa nome fantasia como identificação principal', () => assert.equal(nomeDaCorretora(xp), 'XP Investimentos'));
test('usa razão social quando nome fantasia não existe', () => assert.equal(nomeDaCorretora({ ...xp, nomeFantasia: null }), xp.razaoSocial));
test('usa CNPJ como fallback quando os nomes não existem', () => assert.equal(nomeDaCorretora({ cnpj: xp.cnpj }), 'CNPJ 02.332.886/0001-04'));
test('formata CNPJ sem alterar o dado original', () => {
    assert.equal(formatarCnpj(xp.cnpj), '02.332.886/0001-04');
    assert.equal(xp.cnpj, '02332886000104');
});
test('formata CEP retornado', () => assert.equal(formatarCep(xp.cep), '22440-032'));
test('preserva a situação cadastral real', () => assert.equal(criarModeloCorretoras({ corretoras: [xp] }).corretoras[0].situacaoCadastral, 'ATIVA'));
test('preserva o status CVM real', () => assert.equal(criarModeloCorretoras({ corretoras: [xp] }).corretoras[0].statusCvm, 'EM FUNCIONAMENTO NORMAL'));
test('monta localização compacta sem inventar dados', () => assert.equal(localizacaoCorretora(xp), 'Rio de Janeiro • RJ'));
test('monta endereço enriquecido retornado pelo backend', () => assert.deepEqual(enderecoCorretora(xp), ['Avenida Ataulfo de Paiva, 153', 'Leblon • Rio de Janeiro • RJ', 'CEP 22440-032']));

test('busca local por nome ignorando caixa e espaços', () => {
    const modelo = criarModeloCorretoras({ corretoras: [xp, inativa], busca: '  investimentos ' });
    assert.deepEqual(modelo.corretoras.map(item => item.id), [7]);
});
test('busca por razão social', () => assert.equal(criarModeloCorretoras({ corretoras: [xp], busca: 'cctvm' }).encontradas, 1));
test('busca CNPJ sem máscara', () => assert.equal(criarModeloCorretoras({ corretoras: [xp], busca: '02332886000104' }).encontradas, 1));
test('busca CNPJ com máscara', () => assert.equal(criarModeloCorretoras({ corretoras: [xp], busca: '02.332.886/0001-04' }).encontradas, 1));
test('filtro de ativas usa o status retornado', () => assert.deepEqual(criarModeloCorretoras({ corretoras: [xp, inativa], situacao: SITUACAO_ATIVAS }).corretoras.map(item => item.id), [7]));
test('filtro de outras não inventa enum', () => assert.deepEqual(criarModeloCorretoras({ corretoras: [xp, inativa], situacao: SITUACAO_OUTRAS }).corretoras.map(item => item.id), [9]));
test('representa filtros sem resultado', () => assert.equal(criarModeloCorretoras({ corretoras: [xp], busca: 'inexistente' }).estado, 'filtered-empty'));
test('resume contagem no singular e plural', () => {
    assert.equal(resumoCorretoras({ total: 1 }), '1 instituição cadastrada');
    assert.equal(resumoCorretoras({ encontradas: 2 }, true), '2 instituições encontradas');
});

test('abre cadastro pelos botões reais da página', async () => {
    const pagina = await readFile(new URL('../components/corretoras/Corretoras.jsx', import.meta.url), 'utf8');
    assert.match(pagina, /podeCadastrarCorretora/);
    assert.match(pagina, /action=\{podeCadastrar \?/);
    assert.match(pagina, /podeCadastrar && modalAberto/);
});

test('formulário possui somente campos do request real', () => assert.deepEqual(criarFormularioCorretora(), { cnpj: '', cep: '', numero: '', complemento: '', email: '', telefone: '' }));
test('máscara de CNPJ aceita colagem sem formatação', () => assert.equal(mascararCnpj('02332886000104'), '02.332.886/0001-04'));
test('máscara de CEP aceita colagem sem formatação', () => assert.equal(mascararCep('22440032'), '22440-032'));
test('normaliza CNPJ e CEP no payload e preserva campos opcionais', () => {
    assert.deepEqual(prepararCadastroCorretora({ cnpj: '02.332.886/0001-04', cep: '22440-032', numero: ' 153 ', complemento: '', email: ' contato@xp.test ', telefone: '' }), {
        cnpj: '02332886000104', cep: '22440032', numero: '153', complemento: null, email: 'contato@xp.test', telefone: null
    });
});
test('valida CNPJ estruturalmente antes do submit', () => assert.match(validarFormularioCorretora({ cnpj: '123', cep: '22440032' }).cnpj, /14 dígitos/));
test('valida CEP estruturalmente antes do submit', () => assert.match(validarFormularioCorretora({ cnpj: xp.cnpj, cep: '123' }).cep, /8 dígitos/));

test('envia POST com CNPJ e CEP normalizados', async () => {
    let chamada;
    const payload = prepararCadastroCorretora({ cnpj: '02.332.886/0001-04', cep: '22440-032' });
    const criada = await cadastrarCorretora(payload, async (path, options) => {
        chamada = { path, options };
        return resposta(xp, { status: 201 });
    });
    assert.equal(chamada.path, '/corretoras');
    assert.deepEqual(JSON.parse(chamada.options.body), payload);
    assert.equal(criada.nomeFantasia, 'XP Investimentos');
});

test('trata erro de CNPJ inválido sem conteúdo técnico', async () => {
    await assert.rejects(cadastrarCorretora({}, async () => resposta({ detail: 'CNPJ inválido.' }, { ok: false, status: 422 })), /^Error: CNPJ inválido\.$/);
});
test('trata CNPJ inexistente preservando a regra de negócio', async () => {
    await assert.rejects(cadastrarCorretora({}, async () => resposta({ detail: 'CNPJ não encontrado na Receita Federal.' }, { ok: false, status: 422 })), /CNPJ não encontrado/);
});
test('trata erro cadastral preservando a regra de negócio', async () => {
    await assert.rejects(cadastrarCorretora({}, async () => resposta({ detail: 'O CNPJ não possui situação cadastral ativa.' }, { ok: false, status: 422 })), /situação cadastral ativa/);
});
test('trata erro CVM preservando a mensagem segura', async () => {
    await assert.rejects(cadastrarCorretora({}, async () => resposta({ detail: 'A corretora não está em funcionamento normal segundo a CVM.' }, { ok: false, status: 422 })), /segundo a CVM/);
});
test('trata erro de CEP preservando a mensagem segura', async () => {
    await assert.rejects(cadastrarCorretora({}, async () => resposta({ detail: 'CEP inexistente.' }, { ok: false, status: 422 })), /^Error: CEP inexistente\.$/);
});
test('trata BrasilAPI indisponível por ProblemDetail', async () => {
    await assert.rejects(cadastrarCorretora({}, async () => resposta({ type: 'https://gestao-acoes.com/erros/provedor-externo-indisponivel', detail: 'interno' }, { ok: false, status: 503 })), /temporariamente indisponível/);
});
test('trata ViaCEP indisponível pela mesma resposta pública segura', async () => {
    await assert.rejects(cadastrarCorretora({}, async () => resposta({ type: 'https://gestao-acoes.com/erros/provedor-externo-indisponivel', title: 'Provedor Externo Indisponível' }, { ok: false, status: 503 })), /^Error: O provedor externo está temporariamente indisponível\.$/);
});
test('trata resposta externa inválida por ProblemDetail', async () => {
    await assert.rejects(cadastrarCorretora({}, async () => resposta({ type: 'https://gestao-acoes.com/erros/resposta-externa-invalida', detail: 'interno' }, { ok: false, status: 502 })), /resposta inválida/);
});
test('trata duplicidade preservando a regra de negócio', async () => {
    await assert.rejects(cadastrarCorretora({}, async () => resposta({ detail: 'Corretora já cadastrada com este CNPJ.' }, { ok: false, status: 422 })), /já cadastrada/);
});
test('não expõe FeignException, URL ou stack trace', async () => {
    const erro = await erroCorretoraDaResposta(resposta({ detail: 'FeignException em http://interno/cnpj', trace: 'java.lang.Exception' }, { ok: false, status: 500 }), 'Mensagem segura');
    assert.equal(erro.message, 'Mensagem segura');
});

test('consulta Page real e preserva totalElements', async () => {
    let chamada;
    const dados = await consultarCorretoras(undefined, async (path, options) => {
        chamada = { path, options };
        return resposta({ content: [xp], totalElements: 31 });
    });
    assert.equal(chamada.path, '/corretoras?size=200&sort=nomeFantasia,asc');
    assert.equal(chamada.options.cache, 'no-store');
    assert.equal(dados.total, 31);
});
test('consulta GET por id sem alterar o contrato', async () => {
    let caminho;
    const encontrada = await consultarCorretoraPorId(7, undefined, async path => {
        caminho = path;
        return resposta(xp);
    });
    assert.equal(caminho, '/corretoras/7');
    assert.equal(encontrada.id, 7);
});
test('envia DELETE e aceita resposta 204 sem tentar ler corpo', async () => {
    let chamada;
    await excluirCorretora(7, async (path, options) => {
        chamada = { path, options };
        return { ok: true, status: 204 };
    });
    assert.deepEqual(chamada, { path: '/corretoras/7', options: { method: 'DELETE' } });
});
test('exclusão bloqueada mostra a mensagem amigável do ProblemDetail 409', async () => {
    await assert.rejects(
        excluirCorretora(7, async () => resposta({ detail: 'Não é possível excluir a corretora porque existem operações vinculadas.' }, { ok: false, status: 409 })),
        /existem operações vinculadas/
    );
});
test('DELETE 403 mostra falta de permissão com status preservado', async () => {
    await assert.rejects(
        excluirCorretora(7, async () => resposta({ detail: 'Acesso negado.' }, { ok: false, status: 403 })),
        erro => erro.status === 403 && erro.message === 'Você não tem permissão para excluir corretoras.'
    );
});
test('lista exibe Excluir somente com permissão administrativa', async () => {
    const lista = await readFile(new URL('../components/corretoras/CorretorasLista.jsx', import.meta.url), 'utf8');
    assert.match(lista, /podeExcluir && <td><BotaoExcluir/);
    assert.match(lista, /podeExcluir && <BotaoExcluir/);
});
test('ADMIN inicia o modal de confirmação já existente', async () => {
    const pagina = await readFile(new URL('../components/corretoras/Corretoras.jsx', import.meta.url), 'utf8');
    const modal = await readFile(new URL('../components/corretoras/CorretoraDeleteModal.jsx', import.meta.url), 'utf8');
    assert.match(pagina, /podeExcluir && corretoraParaExcluir && <CorretoraDeleteModal/);
    assert.match(pagina, /onDelete=\{setCorretoraParaExcluir\}/);
    assert.match(modal, /Excluir esta corretora\?/);
    assert.match(modal, /só será permitida se não existirem operações vinculadas/);
});
test('403 fecha o modal, revalida /auth/me e mostra mensagem sem confundir com 409', async () => {
    const pagina = await readFile(new URL('../components/corretoras/Corretoras.jsx', import.meta.url), 'utf8');
    const modal = await readFile(new URL('../components/corretoras/CorretoraDeleteModal.jsx', import.meta.url), 'utf8');
    assert.match(modal, /falha\?\.status === 403/);
    assert.match(modal, /await onForbidden\?\.\(\)/);
    assert.match(pagina, /acessoAdministrativoNegado[\s\S]*setCorretoraParaExcluir\(null\)/);
    assert.match(pagina, /acessoAdministrativoNegado[\s\S]*await atualizarUsuario\(\)/);
    assert.match(pagina, /Você não tem permissão para executar esta ação administrativa\./);
});
test('cancelamento fecha o modal sem executar a função de exclusão', async () => {
    const modal = await readFile(new URL('../components/corretoras/CorretoraDeleteModal.jsx', import.meta.url), 'utf8');
    assert.match(modal, /type="button" disabled=\{excluindo\} onClick=\{onClose\}>Cancelar/);
    assert.match(modal, /onSubmit=\{confirmar\}/);
});
test('sucesso remove a corretora da lista e atualiza o total', async () => {
    const pagina = await readFile(new URL('../components/corretoras/Corretoras.jsx', import.meta.url), 'utf8');
    assert.match(pagina, /exclusaoConcluida[\s\S]*filter\(item => item\.id !== corretora\.id\)/);
    assert.match(pagina, /setTotal\(atual => Math\.max\(0, atual - 1\)\)/);
});
test('confirmação exibe loading e impede envio duplicado durante a exclusão', async () => {
    const modal = await readFile(new URL('../components/corretoras/CorretoraDeleteModal.jsx', import.meta.url), 'utf8');
    assert.match(modal, /if \(excluindoRef\.current\) return/);
    assert.match(modal, /disabled=\{excluindo\}/);
    assert.match(modal, /Excluindo…/);
});
test('recarrega a lista após cadastro', async () => {
    const pagina = await readFile(new URL('../components/corretoras/Corretoras.jsx', import.meta.url), 'utf8');
    assert.match(pagina, /cadastrarConcluido[\s\S]*carregar\(\{ manterDados: true \}\)/);
});
test('mantém tabela desktop e cards próprios no mobile', async () => {
    const lista = await readFile(new URL('../components/corretoras/CorretorasLista.jsx', import.meta.url), 'utf8');
    const css = await readFile(new URL('../styles/corretoras.css', import.meta.url), 'utf8');
    assert.match(lista, /brokers-table-wrap/);
    assert.match(lista, /brokers-mobile-list/);
    assert.match(css, /@media \(max-width: 820px\)/);
    assert.match(css, /\.brokers-table-wrap \{\s*display: none;/);
});

test('opção de compra e venda mostra nome e CNPJ secundário', () => {
    assert.equal(rotuloOpcaoCorretora(xp), 'XP Investimentos — 02.332.886/0001-04');
});
test('e-mail não é identificador principal da opção', () => assert.doesNotMatch(rotuloOpcaoCorretora(xp), /atendimento@/));
test('duas corretoras de nome parecido permanecem distinguíveis', () => assert.notEqual(rotuloOpcaoCorretora(xp), rotuloOpcaoCorretora(xpOutra)));
test('opção aplica fallback somente com CNPJ formatado quando não há nome', () => assert.equal(rotuloOpcaoCorretora({ id: 9, cnpj: xp.cnpj, nomeFantasia: null, razaoSocial: null }), '02.332.886/0001-04'));
test('todos os selects reais usam nome, CNPJ secundário e id como value', async () => {
    const modal = await readFile(new URL('../components/carteira/OperationModal.jsx', import.meta.url), 'utf8');
    const homeBroker = await readFile(new URL('../components/HomeBroker.jsx', import.meta.url), 'utf8');
    const util = await readFile(new URL('./financeiro.js', import.meta.url), 'utf8');
    assert.match(modal, /value=\{corretora\.id\}/);
    assert.match(modal, /rotuloOpcaoCorretora\(corretora\)/);
    assert.match(modal, /services\/corretoras\.js/);
    assert.match(homeBroker, /value=\{corretora\.id\}/);
    assert.match(homeBroker, /rotuloOpcaoCorretora\(corretora\)/);
    assert.doesNotMatch(homeBroker, /CNPJ \{corretora\.cnpj\}[\s\S]*corretora\.email/);
    assert.match(util, /corretoraId:\s*Number\.parseInt\(form\.corretoraId, 10\)/);
});
