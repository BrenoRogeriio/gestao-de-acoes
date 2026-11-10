import { useEffect, useState } from 'react';
import { CheckCircle2, Plus, RefreshCw, X } from 'lucide-react';
import { podeAtualizarCotacaoGlobal } from '../../auth/permissoes.js';
import { useAuth } from '../../auth/useAuth.js';
import { consultarCarteira, solicitarAtualizacaoCotacao } from '../../services/carteira.js';
import { criarModeloCarteira } from '../../utils/carteira.js';
import DashboardMetrics from '../dashboard/DashboardMetrics.jsx';
import ResultsBreakdown from '../dashboard/ResultsBreakdown.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import PageHeader from '../ui/PageHeader.jsx';
import CarteiraPositions from './CarteiraPositions.jsx';
import OperationModal from './OperationModal.jsx';

export default function MinhaCarteira({ onNavigate }) {
    const { usuario, carregando: perfilCarregando, atualizarUsuario } = useAuth();
    const [dados, setDados] = useState({ resumos: [], posicoes: [] });
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [erro, setErro] = useState(false);
    const [erroAtualizacao, setErroAtualizacao] = useState('');
    const [moedaSelecionada, setMoedaSelecionada] = useState();
    const [busca, setBusca] = useState('');
    const [ordenacao, setOrdenacao] = useState('ticker');
    const [operacao, setOperacao] = useState(null);
    const [atualizandoCotacao, setAtualizandoCotacao] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [permissaoAtualizacaoNegada, setPermissaoAtualizacaoNegada] = useState(false);
    const podeAtualizarCotacao = podeAtualizarCotacaoGlobal(
        usuario,
        perfilCarregando || permissaoAtualizacaoNegada
    );

    const carregar = async ({ signal, manterDados = false } = {}) => {
        if (manterDados) setAtualizando(true);
        else setCarregando(true);
        setErroAtualizacao('');
        try {
            setDados(await consultarCarteira(signal));
            setErro(false);
            return true;
        } catch (falha) {
            if (falha.name === 'AbortError') return false;
            console.error(falha);
            if (manterDados) setErroAtualizacao(falha.message);
            else setErro(true);
            return false;
        } finally {
            if (!signal?.aborted) {
                setCarregando(false);
                setAtualizando(false);
            }
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        consultarCarteira(controller.signal)
            .then(resultado => {
                setDados(resultado);
                setErro(false);
            })
            .catch(falha => {
                if (falha.name !== 'AbortError') {
                    console.error(falha);
                    setErro(true);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCarregando(false);
            });
        return () => controller.abort();
    }, []);

    const modelo = criarModeloCarteira({
        loading: carregando,
        error: erro,
        resumos: dados.resumos,
        posicoes: dados.posicoes,
        moedaSelecionada,
        busca,
        ordenacao
    });

    const abrirOperacao = (posicao, tipo) => {
        setFeedback(null);
        setOperacao({ posicao, tipo });
    };

    const concluirOperacao = async (tipo, ticker) => {
        setOperacao(null);
        setFeedback({ tone: 'success', message: `${tipo === 'VENDA' ? 'Venda' : 'Compra'} de ${ticker} registrada com sucesso.` });
        const atualizado = await carregar({ manterDados: true });
        if (!atualizado) {
            setFeedback({ tone: 'warning', message: 'Operação registrada, mas não foi possível atualizar os dados agora.' });
        }
    };

    const atualizarCotacao = async posicao => {
        if (!podeAtualizarCotacao) return;
        setAtualizandoCotacao(posicao.acaoId);
        setFeedback(null);
        try {
            await solicitarAtualizacaoCotacao(posicao.acaoId);
            const atualizado = await carregar({ manterDados: true });
            setFeedback(atualizado
                ? { tone: 'success', message: `Cotação de ${posicao.ticker} atualizada com sucesso.` }
                : { tone: 'warning', message: 'Cotação atualizada, mas não foi possível recarregar a posição.' });
        } catch (falha) {
            if (falha?.status === 403) {
                setPermissaoAtualizacaoNegada(true);
                setFeedback({ tone: 'error', message: 'Você não tem permissão para atualizar cotações globais.' });
                try {
                    await atualizarUsuario();
                } catch (erroAtualizacaoUsuario) {
                    if (erroAtualizacaoUsuario?.status !== 401) console.error(erroAtualizacaoUsuario);
                }
                return;
            }
            setFeedback({ tone: 'error', message: falha.message });
        } finally {
            setAtualizandoCotacao(null);
        }
    };

    if (modelo.estado === 'loading') {
        return <LoadingState title="Carregando sua carteira" description="Buscando o resumo financeiro e todas as posições abertas." />;
    }

    if (modelo.estado === 'error') {
        return <ErrorState title="Não foi possível carregar sua carteira" description="Verifique a conexão com o servidor e tente novamente." onRetry={() => carregar()} />;
    }

    if (modelo.estado === 'empty') {
        return (
            <EmptyState
                title="Sua carteira ainda está vazia"
                description="Registre uma compra para começar a acompanhar suas posições abertas."
                action={<button className="button button-primary" type="button" onClick={() => onNavigate('operacoes')}><Plus size={17} aria-hidden="true" /> Registrar primeira compra</button>}
            />
        );
    }

    return (
        <div className="portfolio-page">
            <PageHeader
                title="Posições da carteira"
                description="Acompanhe seus ativos e registre operações sem misturar moedas."
                action={(
                    <button className="button button-secondary" type="button" disabled={atualizando} onClick={() => carregar({ manterDados: true })}>
                        <RefreshCw className={atualizando ? 'is-spinning' : ''} size={17} aria-hidden="true" />
                        {atualizando ? 'Atualizando…' : 'Atualizar dados'}
                    </button>
                )}
            />

            <div className="portfolio-currency-bar">
                <div>
                    <span className="section-eyebrow">Moeda da carteira</span>
                    <strong>Resumo e posições em {modelo.moeda}</strong>
                </div>
                <div className="currency-selector" role="group" aria-label="Selecionar moeda da carteira">
                    {modelo.moedas.map(moeda => (
                        <button
                            className={`currency-option ${modelo.moeda === moeda ? 'is-active' : ''}`}
                            type="button"
                            key={moeda}
                            aria-pressed={modelo.moeda === moeda}
                            onClick={() => {
                                setMoedaSelecionada(moeda);
                                setBusca('');
                            }}
                        >
                            {moeda}
                        </button>
                    ))}
                </div>
            </div>

            {(erroAtualizacao || feedback) && (
                <div className={`inline-feedback feedback-${feedback?.tone ?? 'error'}`} role={feedback?.tone === 'success' ? 'status' : 'alert'}>
                    {feedback?.tone === 'success' && <CheckCircle2 size={18} aria-hidden="true" />}
                    <span>{feedback?.message ?? erroAtualizacao}</span>
                    <button type="button" onClick={() => { setFeedback(null); setErroAtualizacao(''); }} aria-label="Fechar mensagem"><X size={16} aria-hidden="true" /></button>
                </div>
            )}

            <DashboardMetrics resumo={modelo.resumo} moeda={modelo.moeda} />

            <div className="portfolio-results-grid">
                <ResultsBreakdown resumo={modelo.resumo} moeda={modelo.moeda} />
                <div className="portfolio-summary-note">
                    <span className="section-eyebrow">Leitura dos indicadores</span>
                    <h2>Resumo da posição</h2>
                    <p>A rentabilidade considera apenas o resultado não realizado das posições abertas. O resultado realizado permanece separado e vem do cálculo oficial do backend.</p>
                </div>
            </div>

            <CarteiraPositions
                modelo={modelo}
                busca={busca}
                ordenacao={ordenacao}
                atualizandoCotacao={atualizandoCotacao}
                podeAtualizarCotacao={podeAtualizarCotacao}
                onSearch={setBusca}
                onSort={setOrdenacao}
                onOperation={abrirOperacao}
                onRefreshQuote={atualizarCotacao}
            />

            {operacao && (
                <OperationModal
                    key={`${operacao.tipo}-${operacao.posicao.acaoId}`}
                    posicao={operacao.posicao}
                    tipo={operacao.tipo}
                    onClose={() => setOperacao(null)}
                    onSuccess={concluirOperacao}
                />
            )}
        </div>
    );
}
