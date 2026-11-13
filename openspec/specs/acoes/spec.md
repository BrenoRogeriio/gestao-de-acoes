## Purpose

Definir o comportamento de referência do catálogo global de ações, suas consultas, cadastro administrativo e atualização de cotações por provedores externos.

## Requirements

### Requirement: Catálogo global de ações

O sistema SHALL manter um catálogo global de ações compartilhado entre todas as contas autenticadas.

#### Scenario: Consulta do mesmo catálogo por perfis distintos
- **GIVEN** contas ativas com perfil `USER` e `ADMIN`
- **WHEN** cada conta consulta o catálogo de ações
- **THEN** o sistema permite as consultas sobre o mesmo conjunto global de ações

#### Scenario: Consulta sem autenticação
- **GIVEN** uma requisição sem autenticação válida
- **WHEN** ela consulta o catálogo de ações
- **THEN** o sistema responde `401`

### Requirement: Cadastro administrativo de ação

O sistema SHALL permitir o cadastro de ação somente a `ADMIN`, normalizando o ticker e preenchendo os dados de mercado a partir do provedor externo correspondente.

#### Scenario: Cadastro por administrador
- **GIVEN** uma conta `ADMIN`, ticker e mercado válidos e uma resposta externa válida
- **WHEN** a conta envia `POST /acoes`
- **THEN** o sistema retorna `201` com a ação, o ticker normalizado em maiúsculas, a moeda, a cotação, o instante da cotação e o provedor de origem

#### Scenario: Cadastro por usuário comum
- **GIVEN** uma conta `USER` autenticada
- **WHEN** ela envia `POST /acoes`
- **THEN** o sistema responde `403`, não consulta o provedor externo e não cria a ação

### Requirement: Validação do cadastro de ação

O sistema SHALL exigir ticker não vazio com até 20 caracteres e mercado `BRASIL` ou `ESTADOS_UNIDOS`, e SHALL impedir duplicidade da combinação entre ticker normalizado e mercado.

#### Scenario: Corpo de cadastro inválido
- **GIVEN** ticker vazio ou acima do limite, mercado ausente ou valor de mercado desconhecido
- **WHEN** um administrador tenta cadastrar a ação
- **THEN** o sistema responde `400` e não cria a ação

#### Scenario: Ticker repetido no mesmo mercado
- **GIVEN** uma ação já cadastrada com o mesmo ticker normalizado e mercado
- **WHEN** um administrador tenta repetir o cadastro
- **THEN** o sistema responde `422` sem consultar provedores externos

#### Scenario: Mesmo ticker em mercados diferentes
- **GIVEN** uma ação cadastrada em um mercado
- **WHEN** um administrador cadastra o mesmo ticker em outro mercado válido
- **THEN** a verificação de duplicidade considera separadamente cada mercado

### Requirement: Provedor de cotação por mercado

O sistema SHALL consultar a Brapi para ações do mercado `BRASIL` e a Twelve Data, com país `United States`, para ações do mercado `ESTADOS_UNIDOS`.

#### Scenario: Cotação de ação brasileira
- **GIVEN** uma ação do mercado `BRASIL`
- **WHEN** seus dados são obtidos para cadastro ou atualização
- **THEN** o sistema consulta a Brapi e exige ticker correspondente, moeda `BRL`, nome da empresa e cotação positiva

#### Scenario: Cotação de ação dos Estados Unidos
- **GIVEN** uma ação do mercado `ESTADOS_UNIDOS`
- **WHEN** seus dados são obtidos para cadastro ou atualização
- **THEN** o sistema consulta a Twelve Data para `United States` e exige símbolo correspondente, moeda `USD`, nome da empresa e cotação positiva

### Requirement: Tratamento de falhas do provedor de cotação

O sistema SHALL distinguir ticker inexistente, resposta externa inválida e indisponibilidade do provedor sem expor detalhes internos ao cliente.

#### Scenario: Ticker não encontrado pelo provedor
- **GIVEN** que o provedor informa inexistência do ticker no mercado solicitado
- **WHEN** o cadastro ou a atualização de cotação é processado
- **THEN** o sistema responde `422`

#### Scenario: Resposta externa incompatível
- **GIVEN** resposta vazia, ticker divergente, moeda incompatível, nome ausente, cotação não positiva ou timestamp inválido
- **WHEN** o sistema processa os dados do provedor
- **THEN** o sistema responde `502` com mensagem externa sanitizada e não persiste dados inválidos

#### Scenario: Provedor indisponível
- **GIVEN** uma falha externa diferente de ticker inexistente
- **WHEN** o sistema tenta consultar a cotação
- **THEN** o sistema responde `503` com mensagem sanitizada e não persiste a operação incompleta

### Requirement: Consultas de ações

O sistema SHALL permitir a contas autenticadas listar ações de forma paginada, consultar uma ação por ID e pesquisar pelo ticker, opcionalmente limitado a um mercado.

#### Scenario: Listagem paginada
- **GIVEN** uma conta autenticada
- **WHEN** ela envia `GET /acoes` com parâmetros de paginação e ordenação
- **THEN** o sistema retorna `200` com uma página do catálogo global

#### Scenario: Consulta por ID existente
- **GIVEN** uma ação cadastrada
- **WHEN** uma conta autenticada envia `GET /acoes/{id}`
- **THEN** o sistema retorna `200` com a ação

#### Scenario: Pesquisa por ticker
- **GIVEN** ações cadastradas com um ticker
- **WHEN** uma conta autenticada envia `GET /acoes/ticker/{ticker}` com ou sem o parâmetro `mercado`
- **THEN** o sistema normaliza o ticker e retorna `200` com as correspondências, restringindo pelo mercado quando informado

#### Scenario: Ação não encontrada em consulta
- **GIVEN** um ID inexistente ou nenhuma correspondência para ticker e mercado
- **WHEN** uma conta autenticada realiza a consulta correspondente
- **THEN** o sistema responde `404`

#### Scenario: Mercado inválido na pesquisa
- **GIVEN** um valor de mercado diferente dos valores aceitos
- **WHEN** ele é enviado como parâmetro da pesquisa por ticker
- **THEN** o sistema responde `400`

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
