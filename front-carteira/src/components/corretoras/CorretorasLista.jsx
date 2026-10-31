import { Building2, ChevronDown, Mail, MapPin, Phone, Trash2 } from 'lucide-react';
import {
    enderecoCorretora,
    formatarCnpj,
    localizacaoCorretora,
    nomeDaCorretora,
    situacaoAtiva
} from '../../utils/corretoras.js';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';

function IdentidadeCorretora({ corretora }) {
    return (
        <div className="broker-identity">
            <span className="broker-symbol"><Building2 size={17} aria-hidden="true" /></span>
            <div><strong>{nomeDaCorretora(corretora)}</strong>{corretora.razaoSocial && corretora.razaoSocial !== corretora.nomeFantasia && <small>{corretora.razaoSocial}</small>}</div>
        </div>
    );
}

function StatusCadastral({ corretora }) {
    return <Badge tone={situacaoAtiva(corretora.situacaoCadastral) ? 'positive' : 'neutral'}>{corretora.situacaoCadastral || 'Não informada'}</Badge>;
}

function StatusCvm({ corretora }) {
    return <div className="broker-cvm"><strong>{corretora.statusCvm || 'Não informado'}</strong><small>Cadastro CVM</small></div>;
}

function Contato({ corretora }) {
    if (!corretora.email && !corretora.telefone) return <span className="broker-muted">Não informado</span>;
    return <div className="broker-contact">{corretora.email && <span><Mail size={13} aria-hidden="true" />{corretora.email}</span>}{corretora.telefone && <span><Phone size={13} aria-hidden="true" />{corretora.telefone}</span>}</div>;
}

function DetalhesEndereco({ corretora }) {
    return (
        <details className="broker-details">
            <summary><ChevronDown size={14} aria-hidden="true" /> Ver endereço</summary>
            <address>{enderecoCorretora(corretora).map(linha => <span key={linha}>{linha}</span>)}{corretora.complemento && <span>{corretora.complemento}</span>}</address>
        </details>
    );
}

function BotaoExcluir({ corretora, onDelete }) {
    return <button className="button button-secondary broker-delete-trigger" type="button" onClick={() => onDelete(corretora)} aria-label={`Excluir ${nomeDaCorretora(corretora)}`}><Trash2 size={15} aria-hidden="true" /> Excluir</button>;
}

export default function CorretorasLista({ modelo, resumo, podeExcluir, onDelete }) {
    return (
        <Card className="brokers-list" aria-labelledby="brokers-list-title">
            <div className="brokers-list-header">
                <div><span className="section-eyebrow">Instituições financeiras</span><h2 id="brokers-list-title">Corretoras cadastradas</h2></div>
                <p aria-live="polite">{resumo}</p>
            </div>
            <div className="brokers-table-wrap">
                <table className="data-table brokers-table">
                    <thead><tr><th scope="col">Instituição</th><th scope="col">CNPJ</th><th scope="col">Situação</th><th scope="col">CVM</th><th scope="col">Localização</th><th scope="col">Contato</th>{podeExcluir && <th scope="col"><span className="sr-only">Ações</span></th>}</tr></thead>
                    <tbody>{modelo.corretoras.map(corretora => (
                        <tr key={corretora.id}>
                            <td><IdentidadeCorretora corretora={corretora} /></td>
                            <td className="broker-document">{formatarCnpj(corretora.cnpj)}</td>
                            <td><StatusCadastral corretora={corretora} /></td>
                            <td><StatusCvm corretora={corretora} /></td>
                            <td><div className="broker-location"><span><MapPin size={14} aria-hidden="true" />{localizacaoCorretora(corretora)}</span><DetalhesEndereco corretora={corretora} /></div></td>
                            <td><Contato corretora={corretora} /></td>
                            {podeExcluir && <td><BotaoExcluir corretora={corretora} onDelete={onDelete} /></td>}
                        </tr>
                    ))}</tbody>
                </table>
            </div>
            <div className="brokers-mobile-list">
                {modelo.corretoras.map(corretora => (
                    <article className="broker-card" key={corretora.id}>
                        <header><IdentidadeCorretora corretora={corretora} /><StatusCadastral corretora={corretora} /></header>
                        <p className="broker-card-document">{formatarCnpj(corretora.cnpj)}</p>
                        <dl>
                            <div><dt>CVM</dt><dd><StatusCvm corretora={corretora} /></dd></div>
                            <div><dt>Localização</dt><dd>{localizacaoCorretora(corretora)}</dd></div>
                            <div className="broker-card-contact"><dt>Contato</dt><dd><Contato corretora={corretora} /></dd></div>
                        </dl>
                        <DetalhesEndereco corretora={corretora} />
                        {podeExcluir && <BotaoExcluir corretora={corretora} onDelete={onDelete} />}
                    </article>
                ))}
            </div>
        </Card>
    );
}
