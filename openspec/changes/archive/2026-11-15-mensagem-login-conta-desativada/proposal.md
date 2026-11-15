# Proposta

## Por quê

O login atual converte a rejeição de uma conta desativada na mesma resposta de credenciais inválidas, mesmo quando a senha informada está correta. A correção deve orientar o titular da conta sem revelar a existência ou o estado dela quando a senha estiver incorreta.

## O que muda

- Validar a senha com BCrypt antes de revelar o estado inativo da conta, preservando a resposta genérica para e-mail inexistente ou senha incorreta.
- Retornar um erro HTTP estável e identificável por código/tipo quando uma conta inativa apresenta a senha correta, sem emitir JWT.
- Exibir no login a mensagem "Sua conta está desativada. Entre em contato com o administrador." somente para esse erro tipado.
- Manter o fluxo normal de contas ativas, a rejeição de tokens antigos de contas desativadas e as proteções JWT/RBAC existentes.
- Cobrir os cenários de conta ativa, credenciais inválidas, senha redefinida antes da desativação e reutilização de JWT anterior.

## Capacidades

### Novas capacidades

Nenhuma.

### Capacidades modificadas

- `autenticacao`: diferenciar com segurança a conta inativa com senha correta das credenciais inválidas, mantendo proteção contra enumeração e ausência de token em falhas.

## Impacto

- Backend: serviço de autenticação, exceção tipada e tratamento HTTP do login.
- Frontend: interpretação do tipo estável do erro e mensagem apresentada exclusivamente na tela de login.
- Testes: integração de autenticação e testes frontend do contrato de erro e armazenamento de token.
- Não afeta regras financeiras, perfis `USER`/`ADMIN`, migrations, banco, `.env`, dados reais ou outras telas.
