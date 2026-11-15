# Proposta

## Por quê

O frontend já oferece os fluxos funcionais necessários, mas sua identidade visual atual é predominantemente verde e não corresponde ao conceito monocromático aprovado. A mudança moderniza todas as telas React/Vite de forma consistente, acessível e responsiva, sem alterar comportamentos, dados ou integrações.

## O que muda

- Redefinição dos tokens visuais para uma base preta, branca e de cinzas neutros, com verde e vermelho reservados a resultados financeiros e azul/roxo a gráficos e séries de dados.
- Modernização da sidebar, cabeçalho, área do usuário, navegação e estados selecionados.
- Padronização visual de cards, métricas financeiras, tabelas, filtros, buscas, formulários, botões, paginação, badges, mensagens, estados vazios, carregamentos, erros, modais e confirmações.
- Atualização das telas de Dashboard, Minha Carteira, Histórico, Ações, Corretoras, Administração de usuários, Login e Cadastro, incluindo suas variações responsivas.
- Adaptação exclusivamente visual dos gráficos existentes aos novos tokens, utilizando apenas dados realmente disponíveis.
- Reforço de contraste, foco visível, leitura de labels e mensagens, estados de interação e indicação não exclusivamente cromática para lucro ou prejuízo.
- Preservação integral de rotas, login JWT, RBAC USER/ADMIN, integrações HTTP, cálculos financeiros, cadastro e consulta, atualização manual de cotações, compras, vendas e administração.
- Execução dos testes frontend, lint, build Vite, reconstrução apenas do serviço Docker `frontend` e verificação em `localhost:5173`.

Não há alteração incompatível, remoção de funcionalidade nem mudança de comportamento.

## Capacidades

### Novas capacidades

Nenhuma. Esta change é exclusivamente visual e não introduz comportamento observável novo.

### Capacidades modificadas

Nenhuma. Os requisitos existentes de `acoes`, `administracao-usuarios`, `autenticacao`, `carteira`, `controle-de-acesso` e `corretoras` permanecem inalterados. A change usa `skip_specs: true` porque não modifica contratos funcionais.

## Impacto

- Código afetado: somente `front-carteira/src/components/**`, `front-carteira/src/styles/**`, `front-carteira/src/index.css` e testes frontend estritamente necessários por alterações visuais.
- Reutilização: componentes UI e estrutura CSS já existentes serão preservados e consolidados, evitando dependências novas.
- Sistemas não afetados: backend Java, APIs e contratos HTTP, PostgreSQL, migrations, `.env`, autenticação, RBAC, regras e cálculos financeiros.
- Operação: somente a imagem/serviço Docker do frontend será reconstruída; `aplicacao`, `postgres`, volumes e dados reais serão preservados.
