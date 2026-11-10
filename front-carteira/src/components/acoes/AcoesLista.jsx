import { LoaderCircle, RefreshCw } from 'lucide-react';
import { formatarPreco } from '../../utils/carteira.js';
import { formatarDataHoraCotacao, rotuloMercadoAcao } from '../../utils/acoes.js';
import { valorDisponivel } from '../../utils/dashboard.js';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';

function IdentidadeAtivo({ acao }) {
    return <div className="asset-cell"><strong>{acao.ticker}</strong><small>{acao.nomeEmpresa || 'Nome não informado'}</small></div>;
}

function MercadoAtivo({ acao }) {
    return <div className="assets-market"><Badge tone="neutral">{rotuloMercadoAcao(acao.mercado)}</Badge><span>{acao.moeda}</span></div>;
}

function CotacaoAtivo({ acao }) {
    const disponivel = valorDisponivel(acao.cotacaoAtual);
    return <div className="assets-quote"><strong>{disponivel ? formatarPreco(acao.cotacaoAtual, acao.moeda) : '—'}</strong>{!disponivel && <span>Cotação indisponível</span>}</div>;
}

function StatusCotacao({ acao }) {
    const disponivel = valorDisponivel(acao.cotacaoAtual);
    return <Badge tone={disponivel ? 'positive' : 'neutral'}>{disponivel ? 'Disponível' : 'Indisponível'}</Badge>;
}

function AtualizarButton({ acao, atualizando, onUpdate }) {
    return (
        <button className="assets-refresh" type="button" disabled={atualizando} onClick={() => onUpdate(acao)}>
            {atualizando ? <LoaderCircle className="is-spinning" size={15} aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
            {atualizando ? 'Atualizando…' : 'Atualizar cotação'}
        </button>
    );
}

export default function AcoesLista({ modelo, resumo, podeAtualizarCotacao, atualizandoIds, onUpdate }) {
    return (
        <Card className="assets-list" aria-labelledby="assets-list-title">
            <div className="assets-list-header">
                <div><span className="section-eyebrow">Base de ativos</span><h2 id="assets-list-title">Ações cadastradas</h2></div>
                <p aria-live="polite">{resumo}</p>
            </div>
            <div className="assets-table-wrap">
                <table className="data-table assets-table">
                    <thead><tr><th scope="col">Ativo</th><th scope="col">Mercado</th><th scope="col">Cotação atual</th><th scope="col">Última atualização</th><th scope="col">Status</th>{podeAtualizarCotacao && <th scope="col">Ações</th>}</tr></thead>
                    <tbody>{modelo.acoes.map(acao => (
                        <tr key={acao.id}>
                            <td><IdentidadeAtivo acao={acao} /></td>
                            <td><MercadoAtivo acao={acao} /></td>
                            <td><CotacaoAtivo acao={acao} /></td>
                            <td className="assets-updated">{formatarDataHoraCotacao(acao.dataHoraCotacao)}</td>
                            <td><StatusCotacao acao={acao} /></td>
                            {podeAtualizarCotacao && <td><AtualizarButton acao={acao} atualizando={atualizandoIds.has(acao.id)} onUpdate={onUpdate} /></td>}
                        </tr>
                    ))}</tbody>
                </table>
            </div>
            <div className="assets-mobile-list">
                {modelo.acoes.map(acao => (
                    <article className="asset-card" key={acao.id}>
                        <header><IdentidadeAtivo acao={acao} /><StatusCotacao acao={acao} /></header>
                        <div className="asset-card-market"><MercadoAtivo acao={acao} /></div>
                        <dl>
                            <div><dt>Cotação atual</dt><dd><CotacaoAtivo acao={acao} /></dd></div>
                            <div><dt>Atualizada em</dt><dd>{formatarDataHoraCotacao(acao.dataHoraCotacao)}</dd></div>
                        </dl>
                        {podeAtualizarCotacao && <AtualizarButton acao={acao} atualizando={atualizandoIds.has(acao.id)} onUpdate={onUpdate} />}
                    </article>
                ))}
            </div>
        </Card>
    );
}
