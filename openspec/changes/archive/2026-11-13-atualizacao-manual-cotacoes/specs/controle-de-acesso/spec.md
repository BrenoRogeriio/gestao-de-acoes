# Spec Delta

## MODIFIED Requirements

### Requirement: Operações globais exclusivas de administrador

O sistema SHALL restringir a `ADMIN` a criação de ações e corretoras, a exclusão de corretora e as demais operações administrativas, sem classificar a atualização manual de cotação por provedor como cadastro administrativo.

#### Scenario: Administrador altera cadastro global
- **GIVEN** uma conta ativa com perfil `ADMIN`
- **WHEN** ela executa uma operação global administrativa válida de cadastro ou exclusão
- **THEN** o sistema autoriza a operação

#### Scenario: Usuário comum tenta alterar cadastro global
- **GIVEN** uma conta ativa com perfil `USER`
- **WHEN** ela tenta criar uma ação ou corretora, excluir uma corretora ou executar outra operação exclusiva de administrador
- **THEN** o sistema responde `403`, não realiza a alteração e não chama integrações externas da operação

#### Scenario: Operação administrativa sem autenticação
- **GIVEN** uma requisição sem autenticação válida
- **WHEN** ela tenta executar uma operação global exclusiva de administrador
- **THEN** o sistema responde `401`

## ADDED Requirements

### Requirement: Atualização manual autenticada de cotação

O sistema SHALL autorizar contas ativas `USER` e `ADMIN` a solicitar a atualização manual da cotação de uma ação individual por meio do provedor externo.

#### Scenario: Usuário comum atualiza cotação
- **GIVEN** uma conta ativa com perfil `USER`
- **WHEN** ela solicita `PUT /acoes/{id}/atualizar-cotacao`
- **THEN** o sistema autoriza o processamento da atualização manual

#### Scenario: Administrador atualiza cotação
- **GIVEN** uma conta ativa com perfil `ADMIN`
- **WHEN** ela solicita `PUT /acoes/{id}/atualizar-cotacao`
- **THEN** o sistema autoriza o processamento da atualização manual

#### Scenario: Requisição de atualização sem autenticação
- **GIVEN** uma requisição sem autenticação válida
- **WHEN** ela solicita `PUT /acoes/{id}/atualizar-cotacao`
- **THEN** o sistema responde `401` sem chamar o provedor externo

#### Scenario: Permissões administrativas permanecem restritas
- **GIVEN** uma conta ativa com perfil `USER` autorizada a atualizar cotações
- **WHEN** ela tenta cadastrar ações, cadastrar ou excluir corretoras ou gerenciar usuários
- **THEN** o sistema continua respondendo `403` para essas operações administrativas
