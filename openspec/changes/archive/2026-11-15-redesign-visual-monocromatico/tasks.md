# Tarefas

## 1. Design system e fundações

- [x] 1.1 Atualizar `styles/tokens.css` com a paleta monocromática, tokens semânticos, séries de gráficos, sombras, raios e foco; verificar que preto `#111111`, branco `#FFFFFF`, cinzas e cores semânticas estão centralizados e funcionam nos temas claro e escuro.
- [x] 1.2 Revisar `index.css` e os componentes UI compartilhados para tipografia, cards, botões, badges, campos, tabelas, feedbacks e estados de conteúdo; verificar por busca que cores decorativas literais remanescentes foram eliminadas ou justificadas como semânticas.

## 2. Estrutura, navegação e autenticação

- [x] 2.1 Modernizar sidebar, marca, item ativo, topbar, área do usuário, drawer e backdrop em `layout.css`/`AppLayout.jsx`, preservando todos os itens e handlers; verificar navegação e abertura/fechamento do menu em desktop e viewport móvel.
- [x] 2.2 Redesenhar `AuthShell`, Login, Cadastro e `PasswordField` sem alterar validação ou submissão; verificar `/login` e `/cadastro`, foco por teclado, mensagens de erro, disabled e alternância de tema.

## 3. Dashboard e carteira

- [x] 3.1 Modernizar Dashboard, cards de métricas, composição de resultados, posições e distribuição de carteira; verificar que todos os valores e segmentos continuam derivados exclusivamente do modelo atual e que a distribuição usa apenas a paleta azul/roxo definida.
- [x] 3.2 Modernizar Minha Carteira, posições, compra/venda e `OperationModal`, preservando cálculos, idempotência, corretoras e submissão; verificar estados loading/error/empty e fluxos de abrir/fechar/validar o modal sem realizar operações reais.
- [x] 3.3 Modernizar Histórico, filtros, lista/tabela e paginação existentes; verificar filtros, ausência de dados, valores positivos/negativos com texto ou ícone e uso em tela pequena.

## 4. Cadastros e administração

- [x] 4.1 Modernizar Ações, filtros, tabela, formulário e ação de atualização de cotação, preservando visibilidade para USER e ADMIN; verificar estados de carregamento, erro, vazio, feedback e responsividade sem disparar atualização real durante a inspeção.
- [x] 4.2 Modernizar Corretoras, filtros, tabela/lista móvel e modais de cadastro/exclusão, preservando permissões; verificar estados, confirmações, foco do modal e ações disponíveis por perfil sem alterar dados reais.
- [x] 4.3 Modernizar Administração de usuários, tabela/lista móvel e modais de criação, detalhes, perfil/status e senha, preservando proteções da própria conta e RBAC; verificar foco, disabled, mensagens e layout responsivo sem executar mutações reais.

## 5. Acessibilidade, responsividade e regressão

- [x] 5.1 Auditar contraste, foco visível, labels, aria, indicadores não exclusivamente cromáticos, rolagem de tabelas e breakpoints de todas as telas; aprovação visual registrada pelo usuário após inspeção manual das telas Minha Carteira e Dashboard, nos temas claro e escuro, sem solicitação de novos ajustes estéticos.
- [x] 5.2 Executar `npm test`, `npm run lint` e `npm run build` em `front-carteira`; corrigir somente regressões frontend relacionadas ao redesign e registrar todos os comandos aprovados.

## 6. Integração e entrega para revisão

- [x] 6.1 Executar `graphify update .` após as alterações e verificar que o grafo foi atualizado sem erro, conforme as instruções do repositório.
- [x] 6.2 Reconstruir somente o serviço `frontend` com Docker Compose, sem remover volumes nem recriar intencionalmente `aplicacao`/`postgres`; verificar os três serviços e o frontend em `http://localhost:5173`.
- [x] 6.3 Executar a validação da change OpenSpec, `git diff --check` e `git status --short`; verificar que não há alterações em backend Java, banco, migrations, `.env`, APIs, autenticação, RBAC ou regras financeiras e parar antes de commit/push.

## Acompanhamento do workflow

- Arquivar a change somente depois da revisão visual e de uma solicitação explícita posterior.
