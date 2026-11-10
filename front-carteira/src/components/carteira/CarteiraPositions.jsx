import { RefreshCw, Search, ShoppingCart, TrendingDown } from 'lucide-react';
import {
    formatarPreco,
    formatarQuantidade,
    OPCOES_ORDENACAO,
    rotuloMercado
} from '../../utils/carteira.js';
import {
    formatarPercentualFinanceiro,
    formatarValorFinanceiro,
    tomFinanceiro,
    valorDisponivel
} from '../../utils/dashboard.js';
import Card from '../ui/Card.jsx';

function ValorIndisponivel({ children, indisponivel }) {
    if (!indisponivel) return children;
    return <span title="Cotação indisponível"><span aria-hidden="true">—</span><span className="sr-only">Cotação indisponível</span></span>;
}

function AcoesPosicao({ posicao, podeAtualizarCotacao, atualizando, onOperation, onRefreshQuote }) {
    return (
        <div className="position-actions" aria-label={`Ações para ${posicao.ticker}`}>
            <button className="position-action" type="button" onClick={() => onOperation(posicao, 'COMPRA')}>
                <ShoppingCart size={15} aria-hidden="true" /> Comprar
            </button>
            <button className="position-action" type="button" onClick={() => onOperation(posicao, 'VENDA')}>
                <TrendingDown size={15} aria-hidden="true" /> Vender
            </button>
            {podeAtualizarCotacao && <button className="position-action position-action-quote" type="button" disabled={atualizando} onClick={() => onRefreshQuote(posicao)}>
                <RefreshCw className={atualizando ? 'is-spinning' : ''} size={15} aria-hidden="true" />
                {atualizando ? 'Atualizando…' : 'Cotação'}
            </button>}
        </div>
    );
}

function Resultado({ posicao }) {
    const indisponivel = !valorDisponivel(posicao.resultadoNaoRealizado);
    const tone = tomFinanceiro(posicao.resultadoNaoRealizado);
    return (
        <div className="position-result">
            <strong className={`tone-${tone}`}>
                <ValorIndisponivel indisponivel={indisponivel}>
                    {formatarValorFinanceiro(posicao.resultadoNaoRealizado, posicao.moeda, true)}
                </ValorIndisponivel>
            </strong>
            <span className={`tone-${tone}`}>
                <span className="sr-only">{tone === 'positive' ? 'Positivo: ' : tone === 'negative' ? 'Negativo: ' : ''}</span>
                {formatarPercentualFinanceiro(posicao.rentabilidadePercentual)}
            </span>
        </div>
    );
}

export default function CarteiraPositions({
    modelo,
    busca,
    ordenacao,
    atualizandoCotacao,
    podeAtualizarCotacao,
    onSearch,
    onSort,
    onOperation,
    onRefreshQuote
}) {
    const semPosicoes = modelo.totalPosicoes === 0;

    return (
        <Card className="portfolio-positions" aria-labelledby="portfolio-positions-title">
            <div className="portfolio-positions-header">
                <div>
                    <span className="section-eyebrow">Posições abertas</span>
                    <h2 id="portfolio-positions-title">Ativos em {modelo.moeda}</h2>
                    <p>{semPosicoes ? 'Nenhuma posição aberta nesta moeda.' : `${modelo.totalPosicoes} ${modelo.totalPosicoes === 1 ? 'posição encontrada' : 'posições encontradas'}.`}</p>
                </div>
                {!semPosicoes && (
                    <div className="portfolio-tools">
                        <label className="portfolio-search">
                            <span className="sr-only">Buscar por ticker ou empresa</span>
                            <Search size={16} aria-hidden="true" />
                            <input type="search" value={busca} placeholder="Buscar ativo" onChange={evento => onSearch(evento.target.value)} />
                        </label>
                        <label className="portfolio-sort">
                            <span className="sr-only">Ordenar posições</span>
                            <select value={ordenacao} onChange={evento => onSort(evento.target.value)}>
                                {OPCOES_ORDENACAO.map(opcao => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}
                            </select>
                        </label>
                    </div>
                )}
            </div>

            {semPosicoes ? (
                <div className="portfolio-inline-empty">
                    <strong>Nenhuma posição aberta em {modelo.moeda}</strong>
                    <p>{modelo.semPosicoesComResultadoRealizado
                        ? 'Há resultado realizado nesta moeda, mas todas as posições foram encerradas.'
                        : 'Registre uma compra para começar a acompanhar ativos nesta moeda.'}</p>
                </div>
            ) : modelo.buscaSemResultado ? (
                <div className="portfolio-inline-empty">
                    <strong>Nenhum ativo corresponde à busca</strong>
                    <p>Revise o ticker ou o nome da empresa informado.</p>
                    <button className="button button-secondary" type="button" onClick={() => onSearch('')}>Limpar busca</button>
                </div>
            ) : (
                <>
                    <div className="portfolio-table-wrap">
                        <table className="data-table portfolio-table">
                            <thead>
                                <tr>
                                    <th scope="col">Ativo</th><th scope="col">Quantidade</th><th scope="col">Preço médio</th><th scope="col">Cotação</th><th scope="col">Valor investido</th><th scope="col">Valor atual</th><th scope="col">Resultado</th><th scope="col">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modelo.posicoes.map(posicao => {
                                    const cotacaoAusente = !valorDisponivel(posicao.cotacaoAtual);
                                    return (
                                        <tr key={posicao.acaoId}>
                                            <td className="asset-cell"><strong>{posicao.ticker}</strong><small>{rotuloMercado(posicao.mercado)} · {posicao.moeda}</small></td>
                                            <td className="number-cell">{formatarQuantidade(posicao.quantidade)}</td>
                                            <td className="number-cell">{formatarPreco(posicao.precoMedio, posicao.moeda)}</td>
                                            <td className="number-cell"><ValorIndisponivel indisponivel={cotacaoAusente}>{formatarPreco(posicao.cotacaoAtual, posicao.moeda)}</ValorIndisponivel></td>
                                            <td className="number-cell">{formatarValorFinanceiro(posicao.valorInvestido, posicao.moeda)}</td>
                                            <td className="number-cell"><strong><ValorIndisponivel indisponivel={!valorDisponivel(posicao.valorAtual)}>{formatarValorFinanceiro(posicao.valorAtual, posicao.moeda)}</ValorIndisponivel></strong></td>
                                            <td><Resultado posicao={posicao} /></td>
                                            <td><AcoesPosicao posicao={posicao} podeAtualizarCotacao={podeAtualizarCotacao} atualizando={atualizandoCotacao === posicao.acaoId} onOperation={onOperation} onRefreshQuote={onRefreshQuote} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="portfolio-mobile-list">
                        {modelo.posicoes.map(posicao => (
                            <article className="portfolio-position-card" key={posicao.acaoId}>
                                <header><div className="asset-cell"><strong>{posicao.ticker}</strong><small>{rotuloMercado(posicao.mercado)} · {posicao.moeda}</small></div><Resultado posicao={posicao} /></header>
                                <dl>
                                    <div><dt>Quantidade</dt><dd>{formatarQuantidade(posicao.quantidade)}</dd></div>
                                    <div><dt>Preço médio</dt><dd>{formatarPreco(posicao.precoMedio, posicao.moeda)}</dd></div>
                                    <div><dt>Cotação</dt><dd><ValorIndisponivel indisponivel={!valorDisponivel(posicao.cotacaoAtual)}>{formatarPreco(posicao.cotacaoAtual, posicao.moeda)}</ValorIndisponivel></dd></div>
                                    <div><dt>Valor investido</dt><dd>{formatarValorFinanceiro(posicao.valorInvestido, posicao.moeda)}</dd></div>
                                    <div><dt>Valor atual</dt><dd><ValorIndisponivel indisponivel={!valorDisponivel(posicao.valorAtual)}>{formatarValorFinanceiro(posicao.valorAtual, posicao.moeda)}</ValorIndisponivel></dd></div>
                                </dl>
                                <AcoesPosicao posicao={posicao} podeAtualizarCotacao={podeAtualizarCotacao} atualizando={atualizandoCotacao === posicao.acaoId} onOperation={onOperation} onRefreshQuote={onRefreshQuote} />
                            </article>
                        ))}
                    </div>
                </>
            )}
        </Card>
    );
}
