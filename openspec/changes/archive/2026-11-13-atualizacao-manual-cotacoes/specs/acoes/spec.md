# Spec Delta

## MODIFIED Requirements

### Requirement: Atualização administrativa de cotação

O sistema SHALL permitir que contas autenticadas `USER` e `ADMIN` solicitem manualmente a atualização da cotação global de uma ação existente, sem informar preço, por meio do provedor correspondente ao mercado cadastrado.

#### Scenario: Atualização por usuário comum
- **GIVEN** uma ação existente, uma conta `USER` autenticada e resposta externa válida
- **WHEN** a conta envia `PUT /acoes/{id}/atualizar-cotacao`
- **THEN** o sistema retorna `200` com cotação, instante e provedor atualizados

#### Scenario: Atualização bem-sucedida
- **GIVEN** uma ação existente, uma conta `ADMIN` autenticada e resposta externa válida
- **WHEN** a conta envia `PUT /acoes/{id}/atualizar-cotacao`
- **THEN** o sistema retorna `200` com cotação, instante e provedor atualizados

#### Scenario: Atualização sem autenticação
- **GIVEN** uma requisição sem autenticação válida
- **WHEN** ela envia `PUT /acoes/{id}/atualizar-cotacao`
- **THEN** o sistema responde `401`, não consulta o provedor e preserva a cotação existente

#### Scenario: Atualização de ação inexistente
- **GIVEN** uma conta autenticada e um ID sem ação correspondente
- **WHEN** a conta solicita a atualização da cotação
- **THEN** o sistema responde `422` sem consultar o provedor

#### Scenario: Falha ao atualizar ação existente
- **GIVEN** uma ação com última cotação válida armazenada e uma conta autenticada
- **WHEN** o provedor falha ou retorna dados inválidos durante a atualização manual
- **THEN** o sistema retorna o erro sanitizado correspondente e preserva integralmente a cotação, o instante e o provedor anteriormente armazenados

#### Scenario: Requisição sem preço informado pelo usuário
- **GIVEN** uma conta autenticada e uma ação existente
- **WHEN** a conta solicita a atualização manual sem corpo de preço
- **THEN** o sistema obtém o novo preço exclusivamente do provedor externo correspondente ao mercado

## ADDED Requirements

### Requirement: Interação manual de atualização na tela Ações

A tela Ações SHALL oferecer a atualização manual de cada ação a `USER` e `ADMIN`, apresentar o estado da solicitação e impedir nova solicitação para a mesma ação enquanto a anterior estiver em andamento.

#### Scenario: Botão disponível aos perfis autenticados
- **GIVEN** uma conta autenticada com perfil `USER` ou `ADMIN`
- **WHEN** ela visualiza uma ação na tela Ações
- **THEN** a interface exibe o botão **Atualizar cotação** para essa ação

#### Scenario: Proteção contra cliques simultâneos
- **GIVEN** uma atualização de cotação em andamento para uma ação
- **WHEN** o usuário tenta acionar novamente a atualização da mesma ação
- **THEN** a interface mantém o botão dessa ação desabilitado e não envia outra requisição ao backend

#### Scenario: Atualização visual bem-sucedida
- **GIVEN** que a atualização manual retorna uma ação com nova cotação
- **WHEN** a interface recebe a resposta de sucesso
- **THEN** ela substitui os dados exibidos da ação correspondente e apresenta confirmação de sucesso

#### Scenario: Falha apresentada sem apagar cotação
- **GIVEN** uma ação com cotação exibida
- **WHEN** a atualização manual falha
- **THEN** a interface apresenta mensagem segura de erro, reabilita a ação e mantém a última cotação exibida

### Requirement: Atualização exclusivamente sob demanda

O sistema SHALL consultar provedores para atualizar cotação somente após solicitação explícita de uma ação individual e MUST NOT executar atualização automática, agendada, em background ou em massa.

#### Scenario: Ausência de solicitação manual
- **GIVEN** ações cadastradas e nenhuma solicitação explícita de atualização
- **WHEN** o sistema permanece em execução
- **THEN** nenhuma atualização de cotação é iniciada automaticamente

#### Scenario: Atualização individual
- **GIVEN** uma conta autenticada e uma ação selecionada
- **WHEN** a conta solicita sua atualização manual
- **THEN** o sistema consulta somente o provedor necessário para essa ação

### Requirement: Separação entre cotação global e preço de transação

O sistema SHALL manter a cotação global obtida do provedor separada do preço unitário real informado em compras e vendas, sem permitir que um desses valores sobrescreva o outro.

#### Scenario: Compra ou venda com preço de execução
- **GIVEN** uma ação com cotação global armazenada
- **WHEN** o usuário registra uma compra ou venda com o preço unitário real da operação
- **THEN** o sistema grava o preço exclusivamente na transação e não altera a cotação global da ação

#### Scenario: Atualização da cotação global
- **GIVEN** compras, vendas, posição e histórico existentes para uma ação
- **WHEN** uma conta autenticada atualiza manualmente a cotação pelo provedor
- **THEN** o sistema altera somente os dados globais de cotação da ação e preserva quantidades, preços de execução, preço médio ponderado, resultados financeiros, histórico e isolamento das carteiras
