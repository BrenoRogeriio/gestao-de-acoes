## Purpose

Definir o comportamento de referência da autenticação de usuários, incluindo cadastro público, login, emissão e validação de JWT e identificação da conta autenticada.

## Requirements

### Requirement: Cadastro público de usuário

O sistema SHALL permitir o cadastro público de uma conta ativa com perfil `USER`, normalizando o e-mail informado e sem aceitar elevação de privilégio pelo cliente.

#### Scenario: Cadastro público bem-sucedido
- **GIVEN** dados válidos de nome, e-mail e senha para um e-mail ainda não cadastrado
- **WHEN** o cliente realiza o cadastro público
- **THEN** o sistema cria uma conta ativa com perfil `USER`, normaliza o e-mail e retorna o usuário com um token Bearer

#### Scenario: Tentativa de escolher perfil administrativo
- **GIVEN** uma requisição pública de cadastro que inclui perfil `ADMIN` ou estado inativo
- **WHEN** o cadastro é processado
- **THEN** o sistema ignora esses campos e cria a conta ativa com perfil `USER`

#### Scenario: E-mail duplicado
- **GIVEN** uma conta já cadastrada com o mesmo e-mail, desconsiderando maiúsculas e espaços externos
- **WHEN** outro cadastro público usa esse e-mail
- **THEN** o sistema rejeita o cadastro com conflito e não cria outra conta

#### Scenario: Dados de cadastro inválidos
- **GIVEN** nome, e-mail ou senha em formato inválido
- **WHEN** o cliente tenta realizar o cadastro público
- **THEN** o sistema rejeita a requisição como inválida e informa os campos inconsistentes

### Requirement: Login e emissão de token

O sistema SHALL autenticar uma conta ativa por e-mail e senha e, quando as credenciais forem válidas, retornar um JWT do tipo Bearer com prazo de expiração e os dados públicos do usuário.

#### Scenario: Login válido
- **GIVEN** uma conta ativa e credenciais corretas
- **WHEN** o usuário realiza o login
- **THEN** o sistema retorna um JWT Bearer, seu prazo de expiração e os dados públicos da conta

#### Scenario: Senha incorreta ou usuário inexistente
- **GIVEN** uma senha incorreta ou um e-mail sem conta correspondente
- **WHEN** o cliente tenta realizar o login
- **THEN** o sistema responde `401` com a mesma mensagem genérica de credenciais inválidas nos dois casos

#### Scenario: Login de usuário inativo
- **GIVEN** uma conta desativada
- **WHEN** suas credenciais são apresentadas no login
- **THEN** o sistema responde `401` e não emite uma sessão autenticada

### Requirement: Identificação do usuário autenticado

O sistema SHALL identificar a conta corrente a partir do JWT válido e retornar seus dados públicos, incluindo nome, e-mail e perfil.

#### Scenario: Consulta da própria identidade
- **GIVEN** um JWT válido de uma conta ativa
- **WHEN** o usuário consulta sua identidade autenticada
- **THEN** o sistema retorna os dados da conta identificada pelo token

#### Scenario: Consulta sem autenticação válida
- **GIVEN** uma requisição sem JWT válido
- **WHEN** o cliente consulta a identidade autenticada
- **THEN** o sistema responde `401`

### Requirement: Validação do JWT

O sistema SHALL aceitar somente JWT assinado com a chave configurada, emitido pelo emissor esperado, não expirado e associado a uma conta ativa existente.

#### Scenario: Token expirado
- **GIVEN** um JWT cuja expiração já ocorreu
- **WHEN** ele é usado em um recurso protegido
- **THEN** o sistema responde `401`

#### Scenario: Token inválido
- **GIVEN** um JWT malformado, assinado por outra chave, sem emissor ou com emissor incorreto
- **WHEN** ele é usado em um recurso protegido
- **THEN** o sistema responde `401` sem expor o token na resposta

### Requirement: Efeito da desativação sobre tokens existentes

O sistema SHALL rejeitar tokens anteriormente emitidos quando a conta correspondente estiver desativada.

#### Scenario: Uso de token após desativação
- **GIVEN** um JWT emitido enquanto a conta estava ativa
- **WHEN** a conta é desativada e o token é reutilizado
- **THEN** o sistema responde `401`

### Requirement: Proteção de credenciais nas respostas

O sistema SHALL omitir senha e hash de senha das respostas de cadastro, login e identificação do usuário.

#### Scenario: Respostas de autenticação
- **GIVEN** uma operação bem-sucedida de cadastro, login ou consulta da identidade
- **WHEN** o cliente recebe a resposta
- **THEN** a resposta não contém senha nem hash de senha
