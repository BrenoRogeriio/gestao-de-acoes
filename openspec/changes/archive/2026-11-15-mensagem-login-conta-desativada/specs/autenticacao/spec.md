# Spec Delta

## MODIFIED Requirements

### Requirement: Login e emissão de token

O sistema SHALL autenticar uma conta ativa por e-mail e senha e, quando as credenciais forem válidas, retornar um JWT do tipo Bearer com prazo de expiração e os dados públicos do usuário; para uma conta inativa, o sistema SHALL informar o estado somente depois de validar a senha correta e nunca emitir JWT.

#### Scenario: Login válido
- **GIVEN** uma conta ativa e credenciais corretas
- **WHEN** o usuário realiza o login
- **THEN** o sistema retorna um JWT Bearer, seu prazo de expiração e os dados públicos da conta

#### Scenario: Senha incorreta ou usuário inexistente
- **GIVEN** uma senha incorreta ou um e-mail sem conta correspondente
- **WHEN** o cliente tenta realizar o login
- **THEN** o sistema responde `401` com a mesma mensagem genérica de credenciais inválidas nos dois casos
- **AND** não emite JWT nem revela se a conta existe

#### Scenario: Login de usuário inativo
- **GIVEN** uma conta desativada e sua senha correta
- **WHEN** o cliente tenta realizar o login
- **THEN** o sistema responde `403` com tipo de erro estável `https://gestao-acoes.com/erros/conta-desativada` e código `CONTA_DESATIVADA`
- **AND** não emite JWT
- **AND** o frontend exibe "Sua conta está desativada. Entre em contato com o administrador."

#### Scenario: Conta inativa com senha incorreta
- **GIVEN** uma conta desativada e uma senha incorreta
- **WHEN** o cliente tenta realizar o login
- **THEN** o sistema responde `401` com a mensagem genérica de credenciais inválidas
- **AND** não emite JWT nem revela o estado da conta

#### Scenario: Senha redefinida antes da desativação
- **GIVEN** uma conta cuja senha foi redefinida e que depois foi desativada
- **WHEN** o cliente realiza o login com a nova senha correta
- **THEN** o sistema responde com o erro tipado de conta desativada
- **AND** não aceita a senha anterior nem emite JWT
