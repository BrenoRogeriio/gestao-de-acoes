import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Plus, TriangleAlert, X } from 'lucide-react';
import { podeAtualizarCotacaoGlobal, podeCadastrarAcao } from '../../auth/permissoes.js';
import { useAuth } from '../../auth/useAuth.js';
import { atualizarCotacaoAcao, consultarAcoes } from '../../services/acoes.js';
import { criarModeloAcoes, MERCADO_TODOS, resumoAcoes } from '../../utils/acoes.js';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import PageHeader from '../ui/PageHeader.jsx';
import AcaoFormModal from './AcaoFormModal.jsx';
import AcoesFiltros from './AcoesFiltros.jsx';
import AcoesLista from './AcoesLista.jsx';

const FILTROS_INICIAIS = { busca: '', mercado: MERCADO_TODOS, ordenacao: 'ticker' };

function Feedback({ feedback, onClose }) {
    const Icon = feedback.tone === 'error' ? CircleAlert : feedback.tone === 'warning' ? TriangleAlert : CheckCircle2;
    return <div className={`inline-feedback feedback-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}><Icon size={18} aria-hidden="true" /><span>{feedback.message}</span><button type="button" onClick={onClose} aria-label="Fechar mensagem"><X size={16} aria-hidden="true" /></button></div>;
}

export default function Acoes() {
    const { usuario, carregando: perfilCarregando, atualizarUsuario } = useAuth();
    const [acoes, setAcoes] = useState([]);
    const [total, setTotal] = useState(0);
    const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
    const [carregando, setCarregando] = useState(true);
    const [atualizandoLista, setAtualizandoLista] = useState(false);
    const [erro, setErro] = useState(false);
    const [modalAberto, setModalAberto] = useState(false);
    const [atualizandoIds, setAtualizandoIds] = useState(new Set());
    const [feedback, setFeedback] = useState(null);
    const [permissaoAdministrativaNegada, setPermissaoAdministrativaNegada] = useState(false);
    const atualizacoesRef = useRef(new Set());
    const verificandoPermissao = perfilCarregando || permissaoAdministrativaNegada;
    const podeCadastrar = podeCadastrarAcao(usuario, verificandoPermissao);
    const podeAtualizarCotacao = podeAtualizarCotacaoGlobal(usuario, verificandoPermissao);

    const aplicarDados = dados => {
        setAcoes(dados.acoes);
        setTotal(dados.total);
        setErro(false);
    };

    const carregar = async ({ signal, manterDados = false } = {}) => {
        if (manterDados) setAtualizandoLista(true);
        else setCarregando(true);
        try {
            aplicarDados(await consultarAcoes(signal));
            return true;
        } catch (falha) {
            if (falha.name === 'AbortError') return false;
            console.error(falha);
            if (!manterDados) setErro(true);
            return false;
        } finally {
            if (!signal?.aborted) {
                setCarregando(false);
                setAtualizandoLista(false);
            }
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        consultarAcoes(controller.signal)
            .then(aplicarDados)
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

    const cadastrarConcluido = async acao => {
        setModalAberto(false);
        const atualizado = await carregar({ manterDados: true });
        setFeedback(atualizado
            ? { tone: 'success', message: `${acao.ticker} cadastrado e adicionado à base.` }
            : { tone: 'warning', message: `${acao.ticker} foi cadastrado, mas a lista não pôde ser atualizada agora.` });
    };

    const acessoAdministrativoNegado = async () => {
        setPermissaoAdministrativaNegada(true);
        setModalAberto(false);
        setFeedback({ tone: 'error', message: 'Você não tem permissão para executar esta ação administrativa.' });
        try {
            await atualizarUsuario();
        } catch (falha) {
            if (falha?.status !== 401) console.error(falha);
        }
    };

    const atualizarCotacao = async acao => {
        if (!podeAtualizarCotacao) return;
        if (atualizacoesRef.current.has(acao.id)) return;
        atualizacoesRef.current.add(acao.id);
        setAtualizandoIds(new Set(atualizacoesRef.current));
        setFeedback(null);
        try {
            const atualizada = await atualizarCotacaoAcao(acao.id);
            setAcoes(atuais => atuais.map(item => item.id === acao.id ? atualizada : item));
            setFeedback({ tone: 'success', message: `Cotação de ${acao.ticker} atualizada com sucesso.` });
        } catch (falha) {
            if (falha?.status === 403) {
                await acessoAdministrativoNegado();
                return;
            }
            setFeedback({ tone: 'error', message: falha.message || 'Não foi possível atualizar a cotação.' });
        } finally {
            atualizacoesRef.current.delete(acao.id);
            setAtualizandoIds(new Set(atualizacoesRef.current));
        }
    };

    const modelo = criarModeloAcoes({ loading: carregando, error: erro, acoes, total, ...filtros });
    const filtrosAtivos = Boolean(filtros.busca.trim()) || filtros.mercado !== MERCADO_TODOS;

    if (modelo.estado === 'loading') return <LoadingState title="Carregando ações" description="Buscando os ativos e suas cotações mais recentes." />;
    if (modelo.estado === 'error') return <ErrorState title="Não foi possível carregar as ações" description="Verifique a conexão com o servidor e tente novamente." onRetry={() => carregar()} />;

    return (
        <div className="assets-page">
            <PageHeader title="Ações cadastradas" description="Consulte os ativos conhecidos pelo sistema e acompanhe suas cotações." action={podeCadastrar ? <button className="button button-primary" type="button" onClick={() => { setFeedback(null); setModalAberto(true); }}><Plus size={17} aria-hidden="true" /> Nova ação</button> : null} />
            {feedback && <Feedback feedback={feedback} onClose={() => setFeedback(null)} />}
            {modelo.estado === 'empty' ? (
                <EmptyState title="Nenhum ativo cadastrado" description={podeCadastrar ? 'Cadastre sua primeira ação para acompanhar cotações e utilizá-la na carteira.' : 'Ainda não existem ativos disponíveis para consulta.'} action={podeCadastrar ? <button className="button button-primary" type="button" onClick={() => setModalAberto(true)}><Plus size={17} aria-hidden="true" /> Cadastrar ação</button> : null} />
            ) : (
                <>
                    <AcoesFiltros filtros={filtros} onChange={setFiltros} onClear={() => setFiltros(FILTROS_INICIAIS)} />
                    {modelo.estado === 'filtered-empty' ? (
                        <EmptyState title="Nenhum ativo encontrado" description="Nenhum ativo corresponde à busca ou ao mercado selecionado." action={<button className="button button-secondary" type="button" onClick={() => setFiltros(FILTROS_INICIAIS)}>Limpar filtros</button>} />
                    ) : <AcoesLista modelo={modelo} resumo={resumoAcoes(modelo, filtrosAtivos)} podeAtualizarCotacao={podeAtualizarCotacao} atualizandoIds={atualizandoIds} onUpdate={atualizarCotacao} />}
                </>
            )}
            {atualizandoLista && <span className="assets-refreshing" role="status">Atualizando lista…</span>}
            {podeCadastrar && modalAberto && <AcaoFormModal onClose={() => setModalAberto(false)} onSuccess={cadastrarConcluido} onForbidden={acessoAdministrativoNegado} />}
        </div>
    );
}
