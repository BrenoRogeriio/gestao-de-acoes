## Purpose

Definir o comportamento de referência da autorização por perfil e do isolamento entre usuários nas operações protegidas do sistema.

## Requirements

### Requirement: Perfis de acesso

O sistema SHALL reconhecer os perfis `USER` e `ADMIN` e aplicar o perfil atual da conta ao autorizar cada requisição autenticada.

#### Scenario: Autoridade de usuário comum
- **GIVEN** uma conta ativa com perfil `USER`
- **WHEN** ela realiza uma requisição autenticada
- **THEN** o sistema aplica as permissões de `USER`

#### Scenario: Alteração administrativa de perfil
- **GIVEN** um token emitido para uma conta cujo perfil foi alterado no cadastro de usuários
- **WHEN** o token é usado em uma nova requisição
- **THEN** o sistema aplica imediatamente o perfil atual da conta, independentemente do perfil informado no token

### Requirement: Consulta aos catálogos globais

O sistema SHALL permitir que contas autenticadas `USER` e `ADMIN` consultem os catálogos globais de ações e corretoras.

#### Scenario: Consulta autenticada aos catálogos
- **GIVEN** uma conta ativa com perfil `USER` ou `ADMIN`
- **WHEN** ela consulta ações ou corretoras
- **THEN** o sistema permite a consulta

#### Scenario: Consulta pública aos catálogos
- **GIVEN** uma requisição sem autenticação válida
- **WHEN** ela consulta ações ou corretoras
- **THEN** o sistema responde `401`

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

### Requirement: Gestão administrativa de usuários

O sistema SHALL permitir somente a `ADMIN` criar, listar, consultar, alterar perfil, ativar ou desativar contas e redefinir senhas de usuários.

#### Scenario: Administrador gerencia usuários
- **GIVEN** uma conta ativa com perfil `ADMIN`
- **WHEN** ela executa uma operação administrativa válida sobre usuários
- **THEN** o sistema realiza a operação e não expõe senha nem hash nas respostas

#### Scenario: Usuário comum acessa administração de usuários
- **GIVEN** uma conta ativa com perfil `USER`
- **WHEN** ela acessa qualquer operação administrativa de usuários
- **THEN** o sistema responde `403`

#### Scenario: Administração de usuários sem autenticação
- **GIVEN** uma requisição sem autenticação válida
- **WHEN** ela acessa qualquer operação administrativa de usuários
- **THEN** o sistema responde `401`

### Requirement: Preservação de acesso administrativo

O sistema SHALL impedir que o administrador autenticado desative ou rebaixe a própria conta e SHALL preservar ao menos um `ADMIN` ativo.

#### Scenario: Administrador tenta bloquear a própria conta
- **GIVEN** uma conta `ADMIN` autenticada
- **WHEN** ela tenta desativar a própria conta ou alterar o próprio perfil para `USER`
- **THEN** o sistema rejeita a operação como regra de negócio

#### Scenario: Alteração do último administrador ativo
- **GIVEN** uma conta que é o último `ADMIN` ativo
- **WHEN** é solicitada sua desativação ou alteração para `USER`
- **THEN** o sistema rejeita a operação e preserva a conta como `ADMIN` ativa

### Requirement: Isolamento horizontal da carteira

O sistema SHALL limitar compra, venda, posição, resumo e histórico à carteira da conta autenticada, sem conceder a `ADMIN` acesso automático à carteira de outra conta.

#### Scenario: Usuários operam carteiras próprias
- **GIVEN** duas contas autenticadas que operam a mesma ação
- **WHEN** cada conta compra, vende ou consulta a carteira
- **THEN** cada operação usa somente posições e transações pertencentes à conta que fez a requisição

#### Scenario: Administrador opera carteira
- **GIVEN** uma conta `ADMIN` autenticada
- **WHEN** ela compra, vende ou consulta uma carteira
- **THEN** o sistema usa a carteira própria dessa conta e não a carteira de outro usuário

### Requirement: Distinção entre falta de autenticação e falta de permissão

O sistema SHALL responder `401` quando a autenticação estiver ausente ou inválida e SHALL responder `403` quando uma conta autenticada não possuir o perfil exigido.

#### Scenario: Autenticação ausente ou inválida
- **GIVEN** uma requisição a recurso protegido sem credencial válida
- **WHEN** a autorização é avaliada
- **THEN** o sistema responde `401`

#### Scenario: Perfil insuficiente
- **GIVEN** uma conta `USER` autenticada
- **WHEN** ela solicita uma operação exclusiva de `ADMIN`
- **THEN** o sistema responde `403`
