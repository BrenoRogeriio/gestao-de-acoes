## Purpose

Definir o comportamento de referência do catálogo global de corretoras, incluindo cadastro validado por fontes externas, consultas e exclusão administrativa segura.

## Requirements

### Requirement: Catálogo global de corretoras

O sistema SHALL manter um catálogo global de corretoras compartilhado e consultável por contas autenticadas `USER` e `ADMIN`.

#### Scenario: Consulta por usuário autenticado
- **GIVEN** uma conta ativa com perfil `USER` ou `ADMIN`
- **WHEN** ela consulta o catálogo de corretoras
- **THEN** o sistema permite a consulta ao catálogo global

#### Scenario: Consulta sem autenticação
- **GIVEN** uma requisição sem autenticação válida
- **WHEN** ela consulta o catálogo de corretoras
- **THEN** o sistema responde `401`

### Requirement: Cadastro administrativo de corretora

O sistema SHALL permitir o cadastro de corretora somente a `ADMIN` e SHALL combinar os dados informados com dados válidos de CNPJ, CVM e endereço obtidos externamente.

#### Scenario: Cadastro válido por administrador
- **GIVEN** uma conta `ADMIN`, dados de entrada válidos, CNPJ ativo, registro CVM em funcionamento normal e CEP válido
- **WHEN** a conta envia `POST /corretoras`
- **THEN** o sistema retorna `201`, persiste o CNPJ sem formatação e preenche identificação, endereço e estados cadastrais confirmados pelos provedores

#### Scenario: Cadastro por usuário comum
- **GIVEN** uma conta `USER` autenticada
- **WHEN** ela envia `POST /corretoras`
- **THEN** o sistema responde `403`, não chama os provedores externos e não cria a corretora

### Requirement: Validação da entrada da corretora

O sistema SHALL exigir CNPJ com 14 dígitos, com ou sem formatação, CEP com exatamente 8 dígitos e SHALL validar os limites dos campos opcionais de endereço e contato.

#### Scenario: Formato de entrada inválido
- **GIVEN** CNPJ ou CEP fora do formato aceito, e-mail inválido ou campo opcional acima do limite
- **WHEN** um administrador solicita o cadastro
- **THEN** o sistema responde `400`

#### Scenario: CNPJ com dígitos verificadores inválidos
- **GIVEN** um CNPJ com formato aceito, mas checksum inválido
- **WHEN** um administrador solicita o cadastro
- **THEN** o sistema responde `422` antes de consultar BrasilAPI ou ViaCEP

#### Scenario: CNPJ duplicado
- **GIVEN** uma corretora já cadastrada com o mesmo CNPJ normalizado
- **WHEN** um administrador tenta repetir o cadastro
- **THEN** o sistema responde `422`

### Requirement: Validação externa da corretora

O sistema SHALL cadastrar somente CNPJ ativo na Receita Federal, correspondente ao solicitado, com registro de corretora na CVM em funcionamento normal e CEP compatível com endereço completo.

#### Scenario: Validações externas aprovadas
- **GIVEN** respostas da BrasilAPI e do ViaCEP completas e correspondentes aos dados solicitados
- **WHEN** o cadastro é processado
- **THEN** o sistema usa razão social, nome fantasia, situação cadastral, estado CVM e endereço validados para criar a corretora

#### Scenario: CNPJ inexistente ou inativo
- **GIVEN** que o CNPJ não existe na Receita Federal ou não possui situação ativa
- **WHEN** o cadastro é processado
- **THEN** o sistema responde `422`

#### Scenario: Registro CVM inválido
- **GIVEN** que o CNPJ não está cadastrado como corretora na CVM ou não está em funcionamento normal
- **WHEN** o cadastro é processado
- **THEN** o sistema responde `422`

#### Scenario: CEP inexistente
- **GIVEN** que o ViaCEP informa inexistência do CEP
- **WHEN** o cadastro é processado
- **THEN** o sistema responde `422`

### Requirement: Tratamento de falhas dos provedores de corretora

O sistema SHALL rejeitar respostas externas vazias, incompletas ou incompatíveis e SHALL tratar indisponibilidade externa sem persistir cadastro parcial.

#### Scenario: Resposta externa inválida
- **GIVEN** resposta incompleta ou divergente da BrasilAPI ou do ViaCEP
- **WHEN** o cadastro é processado
- **THEN** o sistema responde `502` com mensagem sanitizada e não cria a corretora

#### Scenario: Provedor indisponível
- **GIVEN** indisponibilidade da BrasilAPI ou do ViaCEP
- **WHEN** o cadastro é processado
- **THEN** o sistema responde `503` com mensagem sanitizada e não cria a corretora

### Requirement: Consultas de corretoras

O sistema SHALL permitir a contas autenticadas listar corretoras de forma paginada e consultar uma corretora por ID ou pelo CNPJ exatamente como armazenado, sem normalizar o parâmetro de busca.

#### Scenario: Listagem paginada
- **GIVEN** uma conta autenticada
- **WHEN** ela envia `GET /corretoras` com paginação e ordenação
- **THEN** o sistema retorna `200` com uma página do catálogo global

#### Scenario: Consulta individual existente
- **GIVEN** uma corretora cadastrada
- **WHEN** uma conta autenticada consulta seu ID ou o CNPJ exatamente como armazenado
- **THEN** o sistema retorna `200` com os dados da corretora

#### Scenario: Corretora não encontrada
- **GIVEN** um ID ou um valor de CNPJ diferente do texto armazenado, ainda que contenha os mesmos dígitos com outra formatação
- **WHEN** uma conta autenticada realiza a consulta individual
- **THEN** o sistema responde `404`

### Requirement: Exclusão administrativa de corretora

O sistema SHALL permitir somente a `ADMIN` excluir uma corretora sem transações vinculadas e SHALL preservar corretoras usadas pelo histórico financeiro.

#### Scenario: Exclusão permitida
- **GIVEN** uma corretora existente sem transações vinculadas e uma conta `ADMIN`
- **WHEN** a conta envia `DELETE /corretoras/{id}`
- **THEN** o sistema remove a corretora e responde `204` sem corpo

#### Scenario: Corretora inexistente
- **GIVEN** um ID sem corretora correspondente
- **WHEN** uma conta `ADMIN` solicita sua exclusão
- **THEN** o sistema responde `404`

#### Scenario: Corretora com transações
- **GIVEN** uma corretora referenciada por ao menos uma transação
- **WHEN** uma conta `ADMIN` solicita sua exclusão
- **THEN** o sistema responde `409` e preserva a corretora e o histórico associado

#### Scenario: Exclusão por usuário comum
- **GIVEN** uma conta `USER` autenticada
- **WHEN** ela tenta excluir uma corretora
- **THEN** o sistema responde `403` e preserva o cadastro

#### Scenario: Exclusão sem autenticação
- **GIVEN** uma requisição sem autenticação válida
- **WHEN** ela tenta excluir uma corretora
- **THEN** o sistema responde `401`
