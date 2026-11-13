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

O sistema SHALL restringir a `ADMIN` a criação de ações e corretoras, a atualização de cotação de ação e a exclusão de corretora.

#### Scenario: Administrador altera cadastro global
- **GIVEN** uma conta ativa com perfil `ADMIN`
- **WHEN** ela executa uma operação global administrativa válida
- **THEN** o sistema autoriza a operação

#### Scenario: Usuário comum tenta alterar cadastro global
- **GIVEN** uma conta ativa com perfil `USER`
- **WHEN** ela tenta executar uma operação global exclusiva de administrador
- **THEN** o sistema responde `403` e não realiza a alteração nem chama integrações externas da operação

#### Scenario: Operação administrativa sem autenticação
- **GIVEN** uma requisição sem autenticação válida
- **WHEN** ela tenta executar uma operação global exclusiva de administrador
- **THEN** o sistema responde `401`

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
