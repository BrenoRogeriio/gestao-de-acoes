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

O sistema SHALL permitir somente a `ADMIN` atualizar a cotação global de uma ação existente por meio do provedor correspondente ao mercado cadastrado.

#### Scenario: Atualização bem-sucedida
- **GIVEN** uma ação existente, uma conta `ADMIN` e resposta externa válida
- **WHEN** a conta envia `PUT /acoes/{id}/atualizar-cotacao`
- **THEN** o sistema retorna `200` com cotação, instante e provedor atualizados

#### Scenario: Atualização por usuário comum
- **GIVEN** uma conta `USER` autenticada
- **WHEN** ela tenta atualizar a cotação
- **THEN** o sistema responde `403`, não consulta o provedor e preserva a cotação existente

#### Scenario: Atualização de ação inexistente
- **GIVEN** um ID sem ação correspondente
- **WHEN** uma conta `ADMIN` solicita a atualização da cotação
- **THEN** o sistema responde `422`
