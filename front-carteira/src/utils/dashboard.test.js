import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    criarDistribuicao,
    criarModeloDashboard,
    formatarPercentualFinanceiro,
    formatarValorFinanceiro,
    tomFinanceiro
} from './dashboard.js';

const resumoBrl = {
    moeda: 'BRL',
    valorInvestidoTotal: 8500,
    valorAtualTotal: 9100,
    resultadoNaoRealizadoTotal: 600,
    resultadoRealizadoTotal: 350,
    resultadoTotal: 950,
    rentabilidadePercentual: 7.0588
};

const resumoUsd = {
    moeda: 'USD',
    valorInvestidoTotal: 1000,
    valorAtualTotal: 900,
    resultadoNaoRealizadoTotal: -100,
    resultadoRealizadoTotal: 0,
    resultadoTotal: -100,
    rentabilidadePercentual: -10
};

test('representa o estado de loading', () => {
    assert.equal(criarModeloDashboard({ loading: true }).estado, 'loading');
});

test('representa o estado de erro', () => {
    assert.equal(criarModeloDashboard({ error: true }).estado, 'error');
});

test('representa carteira vazia sem inventar moeda', () => {
    assert.deepEqual(criarModeloDashboard({ resumos: [], posicoes: [] }), { estado: 'empty', moedas: [] });
});

test('mapeia o resumo BRL usando os campos oficiais', () => {
    const modelo = criarModeloDashboard({ resumos: [resumoBrl], posicoes: [] });
    assert.equal(modelo.moeda, 'BRL');
    assert.equal(modelo.resumo.resultadoTotal, 950);
    assert.equal(formatarValorFinanceiro(modelo.resumo.valorAtualTotal, 'BRL'), 'R$ 9.100,00');
});

test('formata resumo USD sem converter para BRL', () => {
    const modelo = criarModeloDashboard({ resumos: [resumoUsd], posicoes: [] });
    assert.equal(modelo.moeda, 'USD');
    assert.equal(formatarValorFinanceiro(modelo.resumo.valorAtualTotal, 'USD'), 'US$ 900,00');
});

test('mantem BRL e USD separados pela moeda selecionada', () => {
    const modelo = criarModeloDashboard({ resumos: [resumoBrl, resumoUsd], moedaSelecionada: 'USD' });
    assert.deepEqual(modelo.moedas, ['BRL', 'USD']);
    assert.equal(modelo.resumo.valorAtualTotal, 900);
});

test('representa resultados positivos com texto e sinal', () => {
    assert.equal(tomFinanceiro(950), 'positive');
    assert.equal(formatarValorFinanceiro(950, 'BRL', true), '+ R$ 950,00');
    assert.equal(formatarPercentualFinanceiro(7.0588), '+ 7,06%');
});

test('representa resultados negativos com texto e sinal', () => {
    assert.equal(tomFinanceiro(-100), 'negative');
    assert.equal(formatarValorFinanceiro(-100, 'USD', true), '− US$ 100,00');
    assert.equal(formatarPercentualFinanceiro(-10), '− 10,00%');
});

test('representa valores null como indisponiveis', () => {
    assert.equal(formatarValorFinanceiro(null, 'BRL', true), '—');
    assert.equal(formatarPercentualFinanceiro(undefined), '—');
    assert.equal(tomFinanceiro(null), 'neutral');
});

test('filtra e limita a lista resumida de posicoes pela moeda', () => {
    const posicoes = Array.from({ length: 7 }, (_, indice) => ({
        acaoId: indice,
        ticker: `BRL${indice}`,
        moeda: 'BRL',
        valorAtual: 100
    })).concat({ acaoId: 99, ticker: 'USD1', moeda: 'USD', valorAtual: 100 });
    const modelo = criarModeloDashboard({ resumos: [resumoBrl, resumoUsd], posicoes, moedaSelecionada: 'BRL' });
    assert.equal(modelo.totalPosicoes, 7);
    assert.equal(modelo.posicoesResumidas.length, 5);
    assert.ok(modelo.posicoesResumidas.every(posicao => posicao.moeda === 'BRL'));
});

test('calcula distribuicao real e cria agrupamento Outros', () => {
    const distribuicao = criarDistribuicao([
        { ticker: 'A', valorAtual: 50 },
        { ticker: 'B', valorAtual: 20 },
        { ticker: 'C', valorAtual: 10 },
        { ticker: 'D', valorAtual: 10 },
        { ticker: 'E', valorAtual: 5 },
        { ticker: 'F', valorAtual: 5 }
    ]);
    assert.equal(distribuicao.estado, 'ready');
    assert.equal(distribuicao.itens.at(-1).ticker, 'Outros');
    assert.equal(distribuicao.itens.reduce((soma, item) => soma + item.percentual, 0), 100);
});

test('nao calcula distribuicao incompleta quando falta cotacao', () => {
    assert.equal(criarDistribuicao([{ ticker: 'SEM', valorAtual: null }]).estado, 'unavailable');
});

test('preserva resumo realizado mesmo sem posicao aberta', () => {
    const modelo = criarModeloDashboard({
        resumos: [{ ...resumoBrl, valorInvestidoTotal: 0, valorAtualTotal: 0, resultadoNaoRealizadoTotal: 0 }],
        posicoes: []
    });
    assert.equal(modelo.estado, 'ready');
    assert.equal(modelo.semPosicoesComResultadoRealizado, true);
    assert.equal(modelo.resumo.resultadoRealizadoTotal, 350);
});

test('dashboard vazio oferece cadastro a ADMIN e compra a USER', async () => {
    const componente = await readFile(new URL('../components/dashboard/Dashboard.jsx', import.meta.url), 'utf8');
    assert.match(componente, /podeCadastrarAcao/);
    assert.match(componente, /podeCadastrar \? 'acoes' : 'operacoes'/);
    assert.match(componente, /podeCadastrar \? 'Cadastrar primeira ação' : 'Registrar primeira compra'/);
});
