## Purpose

Definir o comportamento de referência da administração de contas de usuário, incluindo criação, consulta, perfil, status e redefinição de senha.

## Requirements

### Requirement: Acesso à administração de usuários

O sistema SHALL permitir acesso às operações de `/admin/usuarios` somente a uma conta `ADMIN` ativa e autenticada.

#### Scenario: Acesso administrativo autorizado
- **GIVEN** uma conta `ADMIN` ativa com autenticação válida
- **WHEN** ela acessa uma operação de administração de usuários
- **THEN** o sistema avalia e processa a operação solicitada

#### Scenario: Acesso por usuário comum
- **GIVEN** uma conta `USER` autenticada
- **WHEN** ela acessa qualquer operação de `/admin/usuarios`
- **THEN** o sistema responde `403`

#### Scenario: Acesso sem autenticação
- **GIVEN** uma requisição sem autenticação válida
- **WHEN** ela acessa qualquer operação de `/admin/usuarios`
- **THEN** o sistema responde `401`

### Requirement: Criação administrativa de usuário

O sistema SHALL permitir a `ADMIN` criar uma conta ativa com perfil `USER` por padrão ou com perfil explícito `USER` ou `ADMIN`, normalizando o e-mail e armazenando a senha de forma não reversível.

#### Scenario: Criação com perfil padrão
- **GIVEN** nome, e-mail e senha válidos sem perfil informado
- **WHEN** um administrador envia `POST /admin/usuarios`
- **THEN** o sistema cria uma conta ativa com perfil `USER` e responde `201`

#### Scenario: Criação de outro administrador
- **GIVEN** dados válidos com perfil `ADMIN`
- **WHEN** um administrador cria a conta
- **THEN** o sistema cria uma conta ativa com perfil `ADMIN` e responde `201`

#### Scenario: Dados de criação inválidos
- **GIVEN** nome vazio ou acima de 120 caracteres, e-mail inválido ou acima de 254 caracteres, senha fora de 8 a 72 caracteres ou perfil desconhecido
- **WHEN** um administrador tenta criar a conta
- **THEN** o sistema responde `400`

#### Scenario: Campo não permitido
- **GIVEN** uma requisição administrativa de criação com campo não definido no contrato
- **WHEN** o sistema processa o corpo
- **THEN** o sistema responde `400` e não cria a conta

#### Scenario: E-mail duplicado
- **GIVEN** uma conta existente com o mesmo e-mail normalizado
- **WHEN** um administrador tenta criar outra conta
- **THEN** o sistema responde `409`

### Requirement: Listagem e consulta administrativa

O sistema SHALL permitir a `ADMIN` listar usuários em ordem crescente de ID e consultar uma conta individual por ID.

#### Scenario: Listagem de usuários
- **GIVEN** uma conta `ADMIN` autenticada
- **WHEN** ela envia `GET /admin/usuarios`
- **THEN** o sistema responde `200` com a lista ordenada por ID

#### Scenario: Consulta de usuário existente
- **GIVEN** uma conta de usuário existente
- **WHEN** um administrador envia `GET /admin/usuarios/{id}`
- **THEN** o sistema responde `200` com os dados administrativos da conta

#### Scenario: Consulta de usuário inexistente
- **GIVEN** um ID sem usuário correspondente
- **WHEN** um administrador consulta esse ID
- **THEN** o sistema responde `404`

### Requirement: Alteração administrativa de perfil

O sistema SHALL permitir a `ADMIN` alterar outra conta entre os perfis `USER` e `ADMIN` quando as proteções administrativas forem preservadas.

#### Scenario: Promoção para administrador
- **GIVEN** uma conta `USER` existente
- **WHEN** um administrador envia perfil `ADMIN` para essa conta
- **THEN** o sistema atualiza o perfil e responde `200`

#### Scenario: Rebaixamento permitido
- **GIVEN** outra conta `ADMIN` que não é o último administrador ativo
- **WHEN** um administrador envia perfil `USER` para essa conta
- **THEN** o sistema atualiza o perfil e responde `200`

#### Scenario: Perfil ausente ou inválido
- **GIVEN** uma alteração sem perfil ou com valor diferente de `USER` e `ADMIN`
- **WHEN** um administrador solicita a alteração
- **THEN** o sistema responde `400`

#### Scenario: Usuário inexistente na alteração
- **GIVEN** um ID sem usuário correspondente
- **WHEN** um administrador solicita a alteração de perfil
- **THEN** o sistema responde `404`

### Requirement: Ativação e desativação de usuário

O sistema SHALL permitir a `ADMIN` ativar ou desativar outra conta, preservando suas posições e transações quando ela for desativada.

#### Scenario: Desativação de usuário
- **GIVEN** outra conta ativa cuja desativação é permitida
- **WHEN** um administrador altera seu status para inativo
- **THEN** o sistema responde `200`, invalida o uso de seus tokens e preserva carteira e histórico

#### Scenario: Reativação de usuário
- **GIVEN** uma conta inativa
- **WHEN** um administrador altera seu status para ativo
- **THEN** o sistema responde `200` e a conta volta a poder se autenticar

#### Scenario: Status ausente
- **GIVEN** uma alteração sem o valor booleano de status
- **WHEN** um administrador solicita a alteração
- **THEN** o sistema responde `400`

#### Scenario: Usuário inexistente na alteração de status
- **GIVEN** um ID sem usuário correspondente
- **WHEN** um administrador solicita a alteração de status
- **THEN** o sistema responde `404`

### Requirement: Redefinição administrativa de senha

O sistema SHALL permitir a `ADMIN` substituir a senha de uma conta existente por uma nova senha entre 8 e 72 caracteres, armazenada como hash.

#### Scenario: Redefinição válida
- **GIVEN** uma conta existente e uma nova senha válida
- **WHEN** um administrador envia `PUT /admin/usuarios/{id}/senha`
- **THEN** o sistema responde `204`, rejeita a senha anterior em novos logins e aceita a nova senha

#### Scenario: Nova senha inválida
- **GIVEN** uma nova senha vazia ou fora do intervalo de 8 a 72 caracteres
- **WHEN** um administrador solicita a redefinição
- **THEN** o sistema responde `400`

#### Scenario: Usuário inexistente na redefinição
- **GIVEN** um ID sem usuário correspondente
- **WHEN** um administrador solicita a redefinição de senha
- **THEN** o sistema responde `404`

#### Scenario: Token emitido antes da redefinição
- **GIVEN** um token válido emitido antes da troca de senha
- **WHEN** a senha é redefinida e o token é reutilizado enquanto a conta permanece ativa
- **THEN** o token continua válido até sua expiração

### Requirement: Proteção do último administrador ativo

O sistema SHALL impedir a desativação ou o rebaixamento do último `ADMIN` ativo, inclusive sob alterações concorrentes.

#### Scenario: Alteração do único administrador ativo
- **GIVEN** uma conta que é o único `ADMIN` ativo
- **WHEN** é solicitada sua desativação ou alteração para `USER`
- **THEN** o sistema responde `422` e preserva a conta ativa com perfil `ADMIN`

#### Scenario: Rebaixamentos concorrentes
- **GIVEN** duas contas `ADMIN` ativas
- **WHEN** solicitações concorrentes tentam rebaixar cada uma delas
- **THEN** o sistema permite no máximo uma redução e preserva ao menos um `ADMIN` ativo

### Requirement: Proteção contra autobloqueio administrativo

O sistema SHALL impedir que o administrador autenticado desative a própria conta ou rebaixe o próprio perfil.

#### Scenario: Autodesativação
- **GIVEN** uma conta `ADMIN` autenticada
- **WHEN** ela tenta alterar o próprio status para inativo
- **THEN** o sistema responde `422` e mantém a conta ativa

#### Scenario: Autorrebaixamento
- **GIVEN** uma conta `ADMIN` autenticada
- **WHEN** ela tenta alterar o próprio perfil para `USER`
- **THEN** o sistema responde `422` e mantém o perfil `ADMIN`

### Requirement: Respostas administrativas sem credenciais

O sistema SHALL limitar as respostas administrativas a ID, nome, e-mail, perfil, status ativo e data de cadastro, sem expor senha, hash ou token.

#### Scenario: Criação, listagem, consulta ou alteração
- **GIVEN** uma operação administrativa bem-sucedida que retorna dados de usuário
- **WHEN** o cliente recebe a resposta
- **THEN** a resposta não contém senha, hash de senha nem token
