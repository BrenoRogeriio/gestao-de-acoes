# Design

## Contexto

Consulte `proposal.md` para a motivação. O frontend está concentrado em `front-carteira`, usa React 19, Vite 8, CSS modularizado por domínio e `lucide-react`, sem biblioteca de componentes ou gráficos externa. Já existem tokens em `styles/tokens.css`, componentes UI reutilizáveis em `components/ui`, folhas por domínio e variações responsivas. O layout atual oferece sidebar, topbar, tema claro/escuro, estados de conteúdo, tabelas com rolagem e listas móveis.

A implementação deve permanecer estritamente no frontend e preservar o JSX funcional, os handlers, permissões, chamadas de serviço, dados exibidos e cálculos. Nenhum dado novo deve ser sintetizado para preencher gráficos ou cards.

## Objetivos / Não objetivos

**Objetivos:**

- Consolidar um design system monocromático por tokens, reduzindo valores de cor literais dispersos.
- Atualizar de forma coerente todas as superfícies existentes, inclusive autenticação, administração e estados transitórios.
- Manter a estrutura de componentes atual, promovendo reutilização de `Card`, `StatCard`, `PageHeader`, `ContentState`, badges, botões, campos, tabelas e padrões de modal.
- Garantir consistência visual em desktop e celular com os breakpoints e alternativas responsivas já existentes.
- Manter contraste, foco de teclado e informação textual/ícones junto aos estados semânticos.

**Não objetivos:**

- Alterar rotas, autenticação JWT, RBAC, APIs, modelos, serviços, utilitários financeiros ou regras de negócio.
- Criar dados, métricas, séries históricas, endpoints, automações ou novas funcionalidades.
- Introduzir uma biblioteca visual, fonte remota ou dependência de gráficos.
- Alterar backend Java, Docker de `aplicacao`/`postgres`, banco, volumes, migrations ou `.env`.

## Decisões

### 1. Evoluir os tokens existentes como fonte única de identidade

`styles/tokens.css` continuará sendo a fonte de cores, tipografia, espaçamento, raios, sombras, transições e dimensões estruturais. A paleta clara será construída sobre `#111111`, `#FFFFFF` e cinzas neutros; a sidebar terá superfície grafite fixa. Verde e vermelho ficarão reservados para significados positivos/negativos, e azul/roxo para visualizações de dados existentes.

O tema escuro será mantido porque já é uma função disponível, mas será reinterpretado como uma variação grafite coerente e não como uma segunda identidade colorida. Alternativa descartada: remover o tema ou seu controle, pois isso eliminaria funcionalidade existente.

### 2. Preservar DOM e comportamento, alterar composição apenas quando necessário para acessibilidade

As mudanças serão prioritariamente em tokens e CSS. JSX só será ajustado quando necessário para aplicar classes consistentes, melhorar hierarquia visual ou adicionar texto/ícone acessível já derivável do estado existente. Handlers, efeitos, condições de permissão, payloads e chamadas de serviço não serão modificados.

Alternativa descartada: reescrever as telas sobre um novo kit de componentes, pois elevaria o risco de regressão e adicionaria dependências sem benefício funcional.

### 3. Sidebar escura como âncora e conteúdo claro como espaço de trabalho

Em desktop, a sidebar será preta/grafite, com marca, seções e rodapé integrados; o item ativo usará contraste claro e um indicador discreto. A topbar e o conteúdo permanecerão em superfícies brancas/cinza muito claro. Em telas menores, o drawer atual e seu backdrop serão preservados, recebendo os mesmos tokens e estados de foco.

### 4. Superfícies e componentes com linguagem compartilhada

Cards, tabelas, filtros, formulários e modais usarão bordas neutras, raios consistentes e sombras discretas. Botões primários serão pretos/brancos; variantes secundárias serão neutras; ações destrutivas e resultados financeiros manterão semântica vermelha/verde. Hover, focus, active e disabled terão diferenças de contraste, borda, sombra ou ícone, sem depender apenas de cor.

As tabelas continuarão com rolagem horizontal quando aplicável. Onde já existe uma lista móvel alternativa, ela será mantida e estilizada com os mesmos tokens.

### 5. Dados e visualizações somente com fontes reais existentes

`PortfolioDistribution` e demais representações atuais usarão uma sequência limitada de azul, roxo e tons auxiliares discretos, definida por tokens. Labels, percentuais, valores e estados vazios continuarão vindo dos modelos atuais. Não serão inseridas séries, legendas ou métricas sem fonte real.

### 6. Validação em camadas e reconstrução Docker isolada

Primeiro serão executados testes frontend, lint e build Vite. Após sucesso, será reconstruído somente o serviço `frontend` com Docker Compose, sem `down`, sem remoção de volumes e sem recriação intencional de `aplicacao` ou `postgres`. A verificação final em `localhost:5173` cobrirá carregamento, navegação e responsividade disponível, sem alterar dados reais.

## Riscos / Trade-offs

- [CSS de domínio extenso pode esconder valores literais antigos] → Auditar todas as folhas, substituir cores decorativas por tokens e pesquisar valores hex/rgb remanescentes.
- [Alterações globais podem reduzir contraste no tema escuro] → Validar cada token nos dois temas e manter foco com contorno de alto contraste.
- [Tabelas densas podem continuar exigindo rolagem no celular] → Preservar rolagem horizontal acessível e listas móveis existentes; não ocultar colunas ou ações.
- [Mudanças de JSX podem afetar testes ou comportamento] → Preferir CSS; limitar JSX a classes/apresentação e executar toda a suíte existente.
- [Reconstrução Docker pode tocar serviços dependentes] → Usar comando direcionado apenas a `frontend`, conferir o estado dos três serviços antes e depois e não executar operações destrutivas.

## Plano de migração

1. Atualizar tokens e fundações globais.
2. Modernizar layout e componentes UI compartilhados.
3. Adaptar autenticação e cada domínio existente, incluindo todos os estados e modais.
4. Validar responsividade e acessibilidade por inspeção e navegador.
5. Executar testes, lint, build e `git diff --check`.
6. Reconstruir somente o frontend e verificar `localhost:5173`.
7. Em caso de regressão visual, reverter apenas os arquivos frontend desta change; não há migração de dados ou contrato a desfazer.
