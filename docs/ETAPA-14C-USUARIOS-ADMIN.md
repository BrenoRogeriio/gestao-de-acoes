# Etapa 14C — gerenciamento administrativo de usuários

Os endpoints administrativos ficam em `/admin/usuarios` e exigem `ROLE_ADMIN` tanto na
`SecurityFilterChain` quanto por `@PreAuthorize` no controller.

As respostas contêm somente ID, nome, e-mail, perfil, status e data de cadastro. Senhas,
hashes e tokens não fazem parte dos DTOs administrativos.

## Tokens emitidos antes de alterações administrativas

O JWT atual identifica o usuário pelo e-mail. A claim `authorities` é informativa: em cada
requisição, o filtro valida o token e recarrega perfil, status e authorities do banco.
Assim, desativação e mudança de perfil têm efeito na requisição seguinte, inclusive para
tokens emitidos anteriormente.

A troca de senha não invalida JWTs já emitidos. A arquitetura atual não possui refresh
token, versão de credencial nem lista de revogação, e o hash da senha não participa da
validação do JWT. Os tokens anteriores continuam válidos até a expiração, salvo se a conta
for desativada. Novos logins exigem a nova senha.

## Proteção do último administrador

Desativação e rebaixamento de ADMIN ativo bloqueiam pessimisticamente, em ordem de ID,
todos os administradores ativos dentro da mesma transação. A operação é recusada quando
restaria nenhum ADMIN ativo. A própria conta do administrador autenticado também não pode
ser desativada nem rebaixada por essa API.
