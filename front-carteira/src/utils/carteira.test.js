import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
    criarFormularioOperacao,
    criarModeloCarteira,
    formatarPreco,
    obterTentativaIdempotente,
    prepararOperacao,
    validarFormularioOperacao
} from './carteira.js';
import { formatarPercentualFinanceiro, formatarValorFinanceiro, tomFinanceiro } from './dashboard.js';
import { consultarCarteira, registrarOperacao, solicitarAtualizacaoCotacao } from '../services/carteira.js';

const resumoBRL = {
    moeda: 'BRL', valorInvestidoTotal: 8500, valorAtualTotal: 9100,
    resultadoNaoRealizadoTotal: 600, resultadoRealizadoTotal: 350,
    resultadoTotal: 950, rentabilidadePercentual: 7.06
};
const resumoUSD = {
    moeda: 'USD', valorInvestidoTotal: 1000, valorAtualTotal: 900,
    resultadoNaoRealizadoTotal: -100, resultadoRealizadoTotal: 25,
    resultadoTotal: -75, rentabilidadePercentual: -10
};
const posicaoBRL = {
    acaoId: 1, ticker: 'WEGE3', nomeEmpresa: 'WEG', mercado: 'BRASIL', moeda: 'BRL',
    quantidade: 11, precoMedio: 106.67, cotacaoAtual: 110.20, valorInvestido: 1173.37,
    valorAtual: 1212.20, resultadoNaoRealizado: 38.83, rentabilidadePercentual: 3.31
};
const posicaoUSD = {
    acaoId: 2, ticker: 'MSFT', nomeEmpresa: 'Microsoft', mercado: 'EUA', moeda: 'USD',
    quantidade: 2, precoMedio: 500, cotacaoAtual: 450, valorInvestido: 1000,
    valorAtual: 900, resultadoNaoRealizado: -100, rentabilidadePercentual: -10
};

function resposta(dados, ok = true) {
    return { ok, json: async () => dados };
}

test('representa o estado de loading', () => {
    assert.deepEqual(criarModeloCarteira({ loading: true }), { estado: 'loading' });
});

test('representa o estado de erro', () => {
    assert.deepEqual(criarModeloCarteira({ error: true }), { estado: 'error' });
});

test('representa carteira vazia', () => {
    assert.deepEqual(criarModeloCarteira(), { estado: 'empty', moedas: [] });
});

test('seleciona resumo e posições BRL', () => {
    const modelo = criarModeloCarteira({ resumos: [resumoBRL, resumoUSD], posicoes: [posicaoBRL, posicaoUSD], moedaSelecionada: 'BRL' });
    assert.equal(modelo.moeda, 'BRL');
    assert.equal(modelo.resumo.valorAtualTotal, 9100);
    assert.deepEqual(modelo.posicoes.map(item => item.ticker), ['WEGE3']);
});

test('seleciona resumo e posições USD', () => {
    const modelo = criarModeloCarteira({ resumos: [resumoBRL, resumoUSD], posicoes: [posicaoBRL, posicaoUSD], moedaSelecionada: 'USD' });
    assert.equal(modelo.moeda, 'USD');
    assert.equal(modelo.resumo.valorInvestidoTotal, 1000);
    assert.deepEqual(modelo.posicoes.map(item => item.ticker), ['MSFT']);
});

test('nunca mistura posições BRL e USD', () => {
    const modelo = criarModeloCarteira({ resumos: [resumoBRL, resumoUSD], posicoes: [posicaoBRL, posicaoUSD], moedaSelecionada: 'BRL' });
    assert.ok(modelo.posicoes.every(item => item.moeda === 'BRL'));
    assert.equal(modelo.totalPosicoes, 1);
});

test('mantém todos os campos reais da posição renderizáveis', () => {
    const modelo = criarModeloCarteira({ resumos: [resumoBRL], posicoes: [posicaoBRL] });
    assert.deepEqual(
        Object.keys(modelo.posicoes[0]).filter(chave => ['ticker', 'mercado', 'quantidade', 'precoMedio', 'cotacaoAtual', 'valorInvestido', 'valorAtual', 'resultadoNaoRealizado', 'rentabilidadePercentual'].includes(chave)),
        ['ticker', 'mercado', 'quantidade', 'precoMedio', 'cotacaoAtual', 'valorInvestido', 'valorAtual', 'resultadoNaoRealizado', 'rentabilidadePercentual']
    );
});

test('preserva cotação e métricas null como indisponíveis', () => {
    const semCotacao = { ...posicaoBRL, cotacaoAtual: null, valorAtual: null, resultadoNaoRealizado: null, rentabilidadePercentual: null };
    const modelo = criarModeloCarteira({ resumos: [resumoBRL], posicoes: [semCotacao] });
    assert.equal(modelo.posicoes[0].cotacaoAtual, null);
    assert.equal(formatarPreco(null, 'BRL'), '—');
    assert.equal(formatarValorFinanceiro(null, 'BRL'), '—');
});

test('apresenta resultado positivo com sinal e texto financeiro', () => {
    assert.equal(tomFinanceiro(38.83), 'positive');
    assert.match(formatarValorFinanceiro(38.83, 'BRL', true), /^\+/);
    assert.match(formatarPercentualFinanceiro(3.31), /^\+/);
});

test('apresenta resultado negativo com sinal e texto financeiro', () => {
    assert.equal(tomFinanceiro(-100), 'negative');
    assert.match(formatarValorFinanceiro(-100, 'USD', true), /^−/);
    assert.match(formatarPercentualFinanceiro(-10), /^−/);
});

test('abre formulário de compra preenchido com o ativo', () => {
    const form = criarFormularioOperacao(posicaoBRL, 'COMPRA');
    assert.equal(form.tipo, 'COMPRA');
    assert.equal(form.acaoId, '1');
    assert.equal(form.preco, '110.2');
});

test('abre formulário de venda e limita quantidade disponível', () => {
    const form = { ...criarFormularioOperacao(posicaoBRL, 'VENDA'), corretoraId: '3', quantidade: '12' };
    assert.equal(form.tipo, 'VENDA');
    assert.match(validarFormularioOperacao(form, 11).quantidade, /máxima disponível/);
});

test('envia compra ao endpoint correto com Idempotency-Key', async () => {
    let chamada;
    await registrarOperacao('COMPRA', { acaoId: 1 }, 'key-compra', async (path, options) => {
        chamada = { path, options };
        return resposta(null);
    });
    assert.equal(chamada.path, '/carteira/comprar');
    assert.equal(chamada.options.headers['Idempotency-Key'], 'key-compra');
});

test('envia venda ao endpoint correto', async () => {
    let endpoint;
    await registrarOperacao('VENDA', { acaoId: 1 }, 'key-venda', async path => {
        endpoint = path;
        return resposta(null);
    });
    assert.equal(endpoint, '/carteira/vender');
});

test('mantém mensagem segura retornada em erro da operação', async () => {
    await assert.rejects(
        registrarOperacao('VENDA', { acaoId: 1 }, 'key', async () => resposta({ detail: 'Saldo insuficiente para a venda.' }, false)),
        /Saldo insuficiente/
    );
});

test('atualiza cotação pelo endpoint do ativo', async () => {
    let chamada;
    const dados = await solicitarAtualizacaoCotacao(7, async (path, options) => {
        chamada = { path, options };
        return resposta({ id: 7, cotacaoAtual: 99 });
    });
    assert.deepEqual(chamada, { path: '/acoes/7/atualizar-cotacao', options: { method: 'PUT' } });
    assert.equal(dados.cotacaoAtual, 99);
});

test('consulta resumo e posições novamente após uma operação', async () => {
    const caminhos = [];
    const request = async (path) => {
        caminhos.push(path);
        if (path === '/carteira/comprar') return resposta(null);
        if (path === '/carteira/resumo') return resposta([resumoBRL]);
        return resposta([posicaoBRL]);
    };
    await registrarOperacao('COMPRA', { acaoId: 1 }, 'key', request);
    const atualizados = await consultarCarteira(undefined, request);
    assert.deepEqual(caminhos, ['/carteira/comprar', '/carteira/resumo', '/carteira/posicao']);
    assert.equal(atualizados.posicoes[0].ticker, 'WEGE3');
});

test('reutiliza a chave no retry do mesmo payload e troca em outra operação', () => {
    let indice = 0;
    const gerar = () => `key-${++indice}`;
    const primeira = obterTentativaIdempotente(null, { acaoId: 1, quantidade: 2 }, gerar);
    const retry = obterTentativaIdempotente(primeira, { acaoId: 1, quantidade: 2 }, gerar);
    const nova = obterTentativaIdempotente(retry, { acaoId: 1, quantidade: 3 }, gerar);
    assert.equal(retry.chave, 'key-1');
    assert.equal(nova.chave, 'key-2');
});

test('envia a data YYYY-MM-DD literalmente, sem conversão de timezone', () => {
    const payload = prepararOperacao({ acaoId: '1', corretoraId: '2', quantidade: '3', preco: '10.5000', data: '2026-09-07' });
    assert.equal(payload.data, '2026-09-07');
});

test('mantém estruturas distintas para tabela desktop e cards mobile', async () => {
    const componente = await readFile(new URL('../components/carteira/CarteiraPositions.jsx', import.meta.url), 'utf8');
    const css = await readFile(new URL('../styles/carteira.css', import.meta.url), 'utf8');
    assert.match(componente, /portfolio-table-wrap/);
    assert.match(componente, /portfolio-mobile-list/);
    assert.match(css, /@media \(max-width: 820px\)/);
    assert.match(css, /\.portfolio-table-wrap \{\s*display: none;/);
});

test('mantém compra e venda para USER e condiciona somente a cotação global', async () => {
    const pagina = await readFile(new URL('../components/carteira/MinhaCarteira.jsx', import.meta.url), 'utf8');
    const posicoes = await readFile(new URL('../components/carteira/CarteiraPositions.jsx', import.meta.url), 'utf8');
    assert.match(pagina, /podeAtualizarCotacaoGlobal/);
    assert.match(pagina, /podeAtualizarCotacao=\{podeAtualizarCotacao\}/);
    assert.match(posicoes, /\/> Comprar/);
    assert.match(posicoes, /\/> Vender/);
    assert.match(posicoes, /podeAtualizarCotacao && <button className="position-action position-action-quote"/);
});
