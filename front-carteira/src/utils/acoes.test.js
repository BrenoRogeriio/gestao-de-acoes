import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { atualizarCotacaoAcao, cadastrarAcao, consultarAcoes } from '../services/acoes.js';
import { formatarPreco } from './carteira.js';
import {
    criarFormularioAcao,
    criarModeloAcoes,
    formatarDataHoraCotacao,
    normalizarTicker,
    prepararCadastroAcao,
    rotuloMercadoAcao,
    validarFormularioAcao
} from './acoes.js';

const brasileira = {
    id: 1, ticker: 'WEGE3', nomeEmpresa: 'WEG', mercado: 'BRASIL', moeda: 'BRL',
    cotacaoAtual: 51.74, dataHoraCotacao: '2026-09-08T14:42:00Z', provedorOrigem: 'provedor-br'
};
const americana = {
    id: 2, ticker: 'MSFT', nomeEmpresa: 'Microsoft Corporation', mercado: 'ESTADOS_UNIDOS', moeda: 'USD',
    cotacaoAtual: 499.70, dataHoraCotacao: '2026-09-08T15:00:00Z', provedorOrigem: 'provedor-us'
};
const semCotacao = {
    id: 3, ticker: 'NULL3', nomeEmpresa: 'Sem Cotação', mercado: 'BRASIL', moeda: 'BRL',
    cotacaoAtual: null, dataHoraCotacao: null, provedorOrigem: null
};
const lista = [americana, semCotacao, brasileira];

function resposta(dados, { ok = true, status = 200 } = {}) {
    return { ok, status, json: async () => dados };
}

test('representa loading', () => assert.deepEqual(criarModeloAcoes({ loading: true }), { estado: 'loading' }));

test('representa erro', () => assert.deepEqual(criarModeloAcoes({ error: true }), { estado: 'error' }));

test('representa lista vazia', () => assert.deepEqual(criarModeloAcoes(), { estado: 'empty', acoes: [], total: 0 }));

test('preserva ação brasileira e seu enum real', () => {
    const modelo = criarModeloAcoes({ acoes: [brasileira] });
    assert.equal(modelo.acoes[0].mercado, 'BRASIL');
    assert.equal(rotuloMercadoAcao(modelo.acoes[0].mercado), 'Brasil');
});

test('preserva ação americana e seu enum real', () => {
    const modelo = criarModeloAcoes({ acoes: [americana] });
    assert.equal(modelo.acoes[0].mercado, 'ESTADOS_UNIDOS');
    assert.equal(rotuloMercadoAcao(modelo.acoes[0].mercado), 'Estados Unidos');
});

test('formata cotação BRL sem conversão', () => assert.match(formatarPreco(51.74, 'BRL').replace(/\u00a0/g, ' '), /R\$ 51,74/));

test('formata cotação USD sem conversão', () => assert.match(formatarPreco(499.70, 'USD'), /US\$ 499,70/));

test('preserva cotação null como indisponível', () => assert.equal(formatarPreco(null, 'BRL'), '—'));

test('formata data e hora de cotação como instante em pt-BR', () => {
    const resultado = formatarDataHoraCotacao('2026-09-08T14:42:00Z');
    assert.match(resultado, /^\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/);
    assert.equal(formatarDataHoraCotacao(null), '—');
});

test('busca local por ticker ignorando caixa e espaços', () => {
    const modelo = criarModeloAcoes({ acoes: lista, busca: '  msft ' });
    assert.deepEqual(modelo.acoes.map(acao => acao.id), [2]);
});

test('busca local por nome da empresa', () => {
    const modelo = criarModeloAcoes({ acoes: lista, busca: 'microsoft corporation' });
    assert.deepEqual(modelo.acoes.map(acao => acao.ticker), ['MSFT']);
});

test('filtra mercado Brasil', () => {
    const modelo = criarModeloAcoes({ acoes: lista, mercado: 'BRASIL' });
    assert.ok(modelo.acoes.every(acao => acao.mercado === 'BRASIL'));
});

test('filtra mercado Estados Unidos', () => {
    const modelo = criarModeloAcoes({ acoes: lista, mercado: 'ESTADOS_UNIDOS' });
    assert.deepEqual(modelo.acoes.map(acao => acao.ticker), ['MSFT']);
});

test('representa filtros sem resultado', () => {
    const modelo = criarModeloAcoes({ acoes: lista, busca: 'PETR4', total: 3 });
    assert.equal(modelo.estado, 'filtered-empty');
    assert.equal(modelo.encontrados, 0);
});

test('ordena por ticker', () => {
    assert.deepEqual(criarModeloAcoes({ acoes: lista }).acoes.map(acao => acao.ticker), ['MSFT', 'NULL3', 'WEGE3']);
});

test('ordena por cotação com null ao final', () => {
    assert.deepEqual(criarModeloAcoes({ acoes: lista, ordenacao: 'cotacao' }).acoes.map(acao => acao.ticker), ['MSFT', 'WEGE3', 'NULL3']);
});

test('ordena por atualização com null ao final', () => {
    assert.deepEqual(criarModeloAcoes({ acoes: lista, ordenacao: 'atualizacao' }).acoes.map(acao => acao.ticker), ['MSFT', 'WEGE3', 'NULL3']);
});

test('cadastro e atualização de cotação aparecem somente com permissão administrativa', async () => {
    const componente = await readFile(new URL('../components/acoes/Acoes.jsx', import.meta.url), 'utf8');
    const lista = await readFile(new URL('../components/acoes/AcoesLista.jsx', import.meta.url), 'utf8');
    assert.match(componente, /podeCadastrarAcao/);
    assert.match(componente, /action=\{podeCadastrar \?/);
    assert.match(componente, /podeCadastrar && modalAberto/);
    assert.match(componente, /podeAtualizarCotacaoGlobal/);
    assert.match(lista, /podeAtualizarCotacao && <td><AtualizarButton/);
    assert.match(lista, /podeAtualizarCotacao && <AtualizarButton/);
});

test('403 administrativo revalida o perfil sem encerrar a sessão', async () => {
    const pagina = await readFile(new URL('../components/acoes/Acoes.jsx', import.meta.url), 'utf8');
    const modal = await readFile(new URL('../components/acoes/AcaoFormModal.jsx', import.meta.url), 'utf8');
    assert.match(pagina, /falha\?\.status === 403/);
    assert.match(pagina, /await atualizarUsuario\(\)/);
    assert.match(modal, /await onForbidden\?\.\(\)/);
});

test('prepara cadastro Brasil com os únicos campos do DTO', () => {
    assert.deepEqual(prepararCadastroAcao({ ticker: ' wege3 ', mercado: 'BRASIL' }), { ticker: 'WEGE3', mercado: 'BRASIL' });
});

test('prepara cadastro Estados Unidos sem regra restritiva de ticker', () => {
    assert.deepEqual(prepararCadastroAcao({ ticker: ' brk.b ', mercado: 'ESTADOS_UNIDOS' }), { ticker: 'BRK.B', mercado: 'ESTADOS_UNIDOS' });
});

test('normaliza ticker com trim e uppercase', () => assert.equal(normalizarTicker('  petr4  '), 'PETR4'));

test('valida ticker obrigatório e mercado real', () => {
    assert.match(validarFormularioAcao({ ticker: '', mercado: 'OUTRO' }).ticker, /ticker/i);
    assert.match(validarFormularioAcao({ ticker: '', mercado: 'OUTRO' }).mercado, /mercado/i);
    assert.deepEqual(criarFormularioAcao(), { ticker: '', mercado: 'BRASIL' });
});

test('envia cadastro real e preserva resposta enriquecida', async () => {
    let chamada;
    const criada = await cadastrarAcao({ ticker: 'WEGE3', mercado: 'BRASIL' }, async (path, options) => {
        chamada = { path, options };
        return resposta(brasileira, { status: 201 });
    });
    assert.equal(chamada.path, '/acoes');
    assert.deepEqual(JSON.parse(chamada.options.body), { ticker: 'WEGE3', mercado: 'BRASIL' });
    assert.equal(criada.nomeEmpresa, 'WEG');
});

test('mantém mensagem segura de cadastro com erro', async () => {
    await assert.rejects(cadastrarAcao({ ticker: 'INVALIDO', mercado: 'BRASIL' }, async () => resposta({ detail: 'Ticker não encontrado no mercado informado.' }, { ok: false, status: 422 })), /Ticker não encontrado/);
});

test('mantém mensagem amigável de duplicidade', async () => {
    await assert.rejects(cadastrarAcao({ ticker: 'WEGE3', mercado: 'BRASIL' }, async () => resposta({ detail: 'Ação já cadastrada para este mercado.' }, { ok: false, status: 422 })), /já cadastrada/);
});

test('mantém mensagem segura quando provedor está indisponível', async () => {
    await assert.rejects(cadastrarAcao({ ticker: 'MSFT', mercado: 'ESTADOS_UNIDOS' }, async () => resposta({ detail: 'O provedor externo está temporariamente indisponível.' }, { ok: false, status: 503 })), /temporariamente indisponível/);
});

test('atualiza cotação pelo endpoint individual', async () => {
    let chamada;
    const atualizada = await atualizarCotacaoAcao(2, async (path, options) => {
        chamada = { path, options };
        return resposta({ ...americana, cotacaoAtual: 505 });
    });
    assert.deepEqual(chamada, { path: '/acoes/2/atualizar-cotacao', options: { method: 'PUT' } });
    assert.equal(atualizada.cotacaoAtual, 505);
});

test('trata erro ao atualizar cotação sem expor resposta técnica', async () => {
    await assert.rejects(atualizarCotacaoAcao(2, async () => resposta({ detail: 'O provedor externo retornou uma resposta inválida.', trace: 'segredo' }, { ok: false, status: 502 })), /^Error: O provedor externo retornou uma resposta inválida\.$/);
});

test('bloqueia duplo clique no cadastro e na cotação', async () => {
    const modal = await readFile(new URL('../components/acoes/AcaoFormModal.jsx', import.meta.url), 'utf8');
    const pagina = await readFile(new URL('../components/acoes/Acoes.jsx', import.meta.url), 'utf8');
    assert.match(modal, /if \(enviandoRef\.current\) return/);
    assert.match(pagina, /if \(atualizacoesRef\.current\.has\(acao\.id\)\) return/);
});

test('recarrega a lista após cadastro', async () => {
    const pagina = await readFile(new URL('../components/acoes/Acoes.jsx', import.meta.url), 'utf8');
    assert.match(pagina, /cadastrarConcluido[\s\S]*carregar\(\{ manterDados: true \}\)/);
});

test('atualiza a linha com a resposta real após nova cotação', async () => {
    const pagina = await readFile(new URL('../components/acoes/Acoes.jsx', import.meta.url), 'utf8');
    assert.match(pagina, /atuais\.map\(item => item\.id === acao\.id \? atualizada : item\)/);
});

test('consulta a Page real e preserva totalElements', async () => {
    let chamada;
    const dados = await consultarAcoes(undefined, async (path, options) => {
        chamada = { path, options };
        return resposta({ content: lista, totalElements: 37 });
    });
    assert.equal(chamada.path, '/acoes?size=200&sort=ticker,asc');
    assert.equal(chamada.options.cache, 'no-store');
    assert.equal(dados.total, 37);
});

test('mantém tabela desktop e cards próprios no mobile', async () => {
    const componente = await readFile(new URL('../components/acoes/AcoesLista.jsx', import.meta.url), 'utf8');
    const css = await readFile(new URL('../styles/acoes.css', import.meta.url), 'utf8');
    assert.match(componente, /assets-table-wrap/);
    assert.match(componente, /assets-mobile-list/);
    assert.match(componente, /<th scope="col">/);
    assert.match(css, /@media \(max-width: 820px\)/);
    assert.match(css, /\.assets-table-wrap \{\s*display: none;/);
});
