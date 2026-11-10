import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { podeCadastrarAcao } from '../../auth/permissoes.js';
import { useAuth } from '../../auth/useAuth.js';
import { consultarCarteira } from '../../services/carteira.js';
import { criarModeloDashboard } from '../../utils/dashboard.js';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import PageHeader from '../ui/PageHeader.jsx';
import DashboardMetrics from './DashboardMetrics.jsx';
import PortfolioDistribution from './PortfolioDistribution.jsx';
import PositionsOverview from './PositionsOverview.jsx';
import ResultsBreakdown from './ResultsBreakdown.jsx';

export default function Dashboard({ onNavigate }) {
    const { usuario, carregando: perfilCarregando } = useAuth();
    const [dados, setDados] = useState({ resumos: [], posicoes: [] });
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [erro, setErro] = useState(false);
    const [erroAtualizacao, setErroAtualizacao] = useState(false);
    const [moedaSelecionada, setMoedaSelecionada] = useState();
    const podeCadastrar = podeCadastrarAcao(usuario, perfilCarregando);

    const carregar = async ({ signal, atualizacao = false, manterDados = false } = {}) => {
        if (atualizacao) setAtualizando(true);
        else setCarregando(true);
        setErroAtualizacao(false);

        try {
            setDados(await consultarCarteira(signal));
            setErro(false);
        } catch (falha) {
            if (falha.name === 'AbortError') return;
            console.error(falha);
            if (atualizacao && manterDados) setErroAtualizacao(true);
            else setErro(true);
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

    const modelo = criarModeloDashboard({
        loading: carregando,
        error: erro,
        resumos: dados.resumos,
        posicoes: dados.posicoes,
        moedaSelecionada
    });

    if (modelo.estado === 'loading') {
        return <LoadingState title="Carregando o Dashboard" description="Buscando o resumo financeiro e as posições atuais." />;
    }

    if (modelo.estado === 'error') {
        return <ErrorState description="Não foi possível consultar o resumo da carteira. Verifique a conexão e tente novamente." onRetry={() => carregar()} />;
    }

    if (modelo.estado === 'empty') {
        return (
            <EmptyState
                title="Sua carteira ainda está vazia"
                description={podeCadastrar
                    ? 'Cadastre um ativo e registre uma compra para começar a acompanhar os indicadores reais.'
                    : 'Registre uma compra para começar a acompanhar os indicadores reais.'}
                action={(
                    <button className="button button-primary" type="button" onClick={() => onNavigate(podeCadastrar ? 'acoes' : 'operacoes')}>
                        <Plus size={17} aria-hidden="true" /> {podeCadastrar ? 'Cadastrar primeira ação' : 'Registrar primeira compra'}
                    </button>
                )}
            />
        );
    }

    return (
        <div className="dashboard-page">
            <PageHeader
                title="Visão consolidada"
                description="Valores oficiais do resumo da carteira, sempre separados por moeda."
                action={(
                    <button className="button button-secondary" type="button" disabled={atualizando} onClick={() => carregar({ atualizacao: true, manterDados: true })}>
                        <RefreshCw className={atualizando ? 'is-spinning' : ''} size={17} aria-hidden="true" />
                        {atualizando ? 'Atualizando…' : 'Atualizar'}
                    </button>
                )}
            />

            <div className="dashboard-currency-bar">
                <div>
                    <span className="section-eyebrow">Moeda de visualização</span>
                    <p>Não há soma nem conversão entre BRL e USD.</p>
                </div>
                <div className="currency-selector" role="group" aria-label="Selecionar moeda do Dashboard">
                    {modelo.moedas.map(moeda => (
                        <button
                            className={`currency-option ${modelo.moeda === moeda ? 'is-active' : ''}`}
                            type="button"
                            key={moeda}
                            aria-pressed={modelo.moeda === moeda}
                            onClick={() => setMoedaSelecionada(moeda)}
                        >
                            {moeda}
                        </button>
                    ))}
                </div>
            </div>

            {erroAtualizacao && <p className="dashboard-refresh-error" role="alert">Não foi possível atualizar agora. Os últimos dados carregados foram mantidos.</p>}

            <DashboardMetrics resumo={modelo.resumo} moeda={modelo.moeda} />

            <div className="dashboard-secondary-grid">
                <ResultsBreakdown resumo={modelo.resumo} moeda={modelo.moeda} />
                <PortfolioDistribution distribuicao={modelo.distribuicao} moeda={modelo.moeda} />
            </div>

            <PositionsOverview
                posicoes={modelo.posicoesResumidas}
                totalPosicoes={modelo.totalPosicoes}
                moeda={modelo.moeda}
                hasRealizedOnly={modelo.semPosicoesComResultadoRealizado}
                onViewAll={() => onNavigate('carteira')}
            />
        </div>
    );
}
