# Proposal

## Why

Contas `USER` já consultam o catálogo global e dependem de cotações atuais para interpretar suas posições, mas hoje somente `ADMIN` pode solicitar a atualização ao provedor externo. A mudança permite a atualização manual e autenticada por ambos os perfis, sem transformar o preço informado em uma compra ou venda em cotação global e sem introduzir automação.

## What Changes

- Autorizar contas autenticadas `USER` e `ADMIN` a chamar `PUT /acoes/{id}/atualizar-cotacao`, mantendo o endpoint e o contrato de resposta atuais.
- Preservar como exclusivas de `ADMIN` a criação de ações, a criação e exclusão de corretoras e as demais operações administrativas.
- Exibir na tela Ações o botão **Atualizar cotação** para `USER` e `ADMIN`, com carregamento por ação, bloqueio de solicitações simultâneas repetidas, retorno de sucesso ou erro e substituição do item pela resposta atualizada.
- Continuar obtendo o preço exclusivamente da Brapi ou Twelve Data conforme o mercado; o usuário não envia preço nesse endpoint.
- Preservar a última cotação válida quando o provedor falhar e manter inalterados transações, quantidades, preço médio ponderado, resultados financeiros, histórico e isolamento de carteiras.
- Cobrir autorização, ausência de autenticação, chamada única ao provedor, falha externa sem perda da cotação anterior e comportamento da interface com testes automatizados.
- Excluir explicitamente atualização automática, `@Scheduled`, scheduler, cron, jobs, processos em background e atualização em massa.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `acoes`: substituir a atualização administrativa por atualização manual autenticada para `USER` e `ADMIN`, com consulta exclusiva ao provedor e preservação da última cotação válida em caso de falha.
- `controle-de-acesso`: retirar apenas a atualização manual de cotação do conjunto de operações globais exclusivas de `ADMIN`, mantendo cadastro e demais operações administrativas restritos.

## Impact

- Backend: `AcaoController`, `SecurityConfiguration`, testes de RBAC e testes do fluxo de atualização em `AcaoService`.
- Frontend: permissões de atualização, tela/lista de Ações, serviço de ações e testes associados.
- API: sem novo endpoint e sem alteração de payload; muda somente a autorização de `PUT /acoes/{id}/atualizar-cotacao` para qualquer conta autenticada.
- Dados e integrações: nenhuma migration ou dependência nova; permanecem os provedores, validações, transação e modelo de dados atuais.
