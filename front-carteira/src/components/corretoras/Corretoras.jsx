import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Plus, TriangleAlert, X } from 'lucide-react';
import { podeExcluirCorretora } from '../../auth/permissoes.js';
import { useAuth } from '../../auth/useAuth.js';
import { consultarCorretoras } from '../../services/corretoras.js';
import {
    criarModeloCorretoras,
    resumoCorretoras,
    SITUACAO_TODAS
} from '../../utils/corretoras.js';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import PageHeader from '../ui/PageHeader.jsx';
import CorretoraFormModal from './CorretoraFormModal.jsx';
import CorretoraDeleteModal from './CorretoraDeleteModal.jsx';
import CorretorasFiltros from './CorretorasFiltros.jsx';
import CorretorasLista from './CorretorasLista.jsx';

const FILTROS_INICIAIS = { busca: '', situacao: SITUACAO_TODAS, ordenacao: 'nome-asc' };

function Feedback({ feedback, onClose }) {
    const Icon = feedback.tone === 'error' ? CircleAlert : feedback.tone === 'warning' ? TriangleAlert : CheckCircle2;
    return <div className={`inline-feedback feedback-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}><Icon size={18} aria-hidden="true" /><span>{feedback.message}</span><button type="button" onClick={onClose} aria-label="Fechar mensagem"><X size={16} aria-hidden="true" /></button></div>;
}

export default function Corretoras() {
    const { usuario, carregando: perfilCarregando, atualizarUsuario } = useAuth();
    const [corretoras, setCorretoras] = useState([]);
    const [total, setTotal] = useState(0);
    const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [erro, setErro] = useState(false);
    const [modalAberto, setModalAberto] = useState(false);
    const [corretoraParaExcluir, setCorretoraParaExcluir] = useState(null);
    const [permissaoExclusaoNegada, setPermissaoExclusaoNegada] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const podeExcluir = podeExcluirCorretora(usuario, perfilCarregando || permissaoExclusaoNegada);

    const aplicarDados = dados => {
        setCorretoras(dados.corretoras);
        setTotal(dados.total);
        setErro(false);
    };

    const carregar = async ({ signal, manterDados = false } = {}) => {
        if (manterDados) setAtualizando(true);
        else setCarregando(true);
        try {
            aplicarDados(await consultarCorretoras(signal));
            return true;
        } catch (falha) {
            if (falha.name === 'AbortError') return false;
            console.error(falha);
            if (!manterDados) setErro(true);
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
        consultarCorretoras(controller.signal)
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

    const cadastrarConcluido = async corretora => {
        setModalAberto(false);
        const atualizado = await carregar({ manterDados: true });
        setFeedback(atualizado
            ? { tone: 'success', message: `${corretora.nomeFantasia || corretora.razaoSocial || 'Instituição'} cadastrada com sucesso.` }
            : { tone: 'warning', message: 'A instituição foi cadastrada, mas a lista não pôde ser atualizada agora.' });
    };

    const exclusaoConcluida = corretora => {
        setCorretoras(atuais => atuais.filter(item => item.id !== corretora.id));
        setTotal(atual => Math.max(0, atual - 1));
        setCorretoraParaExcluir(null);
        setFeedback({
            tone: 'success',
            message: `${corretora.nomeFantasia || corretora.razaoSocial || 'Instituição'} excluída com sucesso.`
        });
    };

    const exclusaoNegada = async () => {
        setPermissaoExclusaoNegada(true);
        setCorretoraParaExcluir(null);
        setFeedback({
            tone: 'error',
            message: 'Você não tem permissão para excluir corretoras.'
        });
        try {
            await atualizarUsuario();
        } catch (falha) {
            if (falha?.status !== 401) console.error(falha);
        }
    };

    const modelo = criarModeloCorretoras({ loading: carregando, error: erro, corretoras, total, ...filtros });
    const filtrosAtivos = Boolean(filtros.busca.trim()) || filtros.situacao !== SITUACAO_TODAS;

    if (modelo.estado === 'loading') return <LoadingState title="Carregando corretoras" description="Buscando as instituições financeiras cadastradas." />;
    if (modelo.estado === 'error') return <ErrorState title="Não foi possível carregar as corretoras" description="Verifique a conexão com o servidor e tente novamente." onRetry={() => carregar()} />;

    const abrirCadastro = () => {
        setFeedback(null);
        setModalAberto(true);
    };

    return (
        <div className="brokers-page">
            <PageHeader title="Corretoras cadastradas" description="Gerencie as instituições financeiras utilizadas nas operações da sua carteira." action={<button className="button button-primary" type="button" onClick={abrirCadastro}><Plus size={17} aria-hidden="true" /> Nova corretora</button>} />
            {feedback && <Feedback feedback={feedback} onClose={() => setFeedback(null)} />}
            {modelo.estado === 'empty' ? (
                <EmptyState title="Nenhuma instituição cadastrada" description="Cadastre uma corretora para utilizá-la nas operações da sua carteira." action={<button className="button button-primary" type="button" onClick={abrirCadastro}><Plus size={17} aria-hidden="true" /> Cadastrar corretora</button>} />
            ) : (
                <>
                    <CorretorasFiltros filtros={filtros} onChange={setFiltros} onClear={() => setFiltros(FILTROS_INICIAIS)} />
                    {modelo.estado === 'filtered-empty'
                        ? <EmptyState title="Nenhuma instituição encontrada" description="Nenhuma corretora corresponde à busca ou à situação selecionada." action={<button className="button button-secondary" type="button" onClick={() => setFiltros(FILTROS_INICIAIS)}>Limpar filtros</button>} />
                        : <CorretorasLista modelo={modelo} resumo={resumoCorretoras(modelo, filtrosAtivos)} podeExcluir={podeExcluir} onDelete={setCorretoraParaExcluir} />}
                </>
            )}
            {atualizando && <span className="brokers-refreshing" role="status">Atualizando lista…</span>}
            {modalAberto && <CorretoraFormModal onClose={() => setModalAberto(false)} onSuccess={cadastrarConcluido} />}
            {podeExcluir && corretoraParaExcluir && <CorretoraDeleteModal corretora={corretoraParaExcluir} onClose={() => setCorretoraParaExcluir(null)} onSuccess={exclusaoConcluida} onForbidden={exclusaoNegada} />}
        </div>
    );
}
