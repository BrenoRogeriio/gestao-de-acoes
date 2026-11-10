# Aula 14 — Controle de acesso baseado em papéis (RBAC)

## Conceitos e princípios

RBAC (*Role-Based Access Control*) concede permissões conforme o papel do usuário. Neste
projeto existem os perfis `USER` e `ADMIN`. A autenticação responde **quem** está fazendo a
requisição; a autorização decide **o que** esse usuário autenticado pode fazer.

O princípio do menor privilégio orienta a matriz: todo cadastro público recebe `USER`, e apenas
operações administrativas sobre cadastros globais ou usuários exigem `ADMIN`. O perfil mais
privilegiado deve ser atribuído somente por um administrador autenticado.

## Matriz de acesso

| Operação | Público | USER | ADMIN |
|---|:---:|:---:|:---:|
| `POST /auth/register` — cadastro sempre como USER | Sim | Sim | Sim |
| `POST /auth/login` | Sim | Sim | Sim |
| `OPTIONS /**` — preflight CORS | Sim | Sim | Sim |
| Swagger em dev/test e `GET /actuator/health` | Sim | Sim | Sim |
| `GET /actuator/info` | Não | Sim | Sim |
| Consultar ações e corretoras | Não | Sim | Sim |
| Comprar, vender e consultar a própria carteira | Não | Sim | Sim |
| `GET /auth/me` | Não | Sim | Sim |
| `POST /acoes` | Não | Não | Sim |
| `POST /corretoras` | Não | Não | Sim |
| `PUT /acoes/{id}/atualizar-cotacao` | Não | Não | Sim |
| `DELETE /corretoras/{id}` | Não | Não | Sim |
| `/admin/usuarios/**` | Não | Não | Sim |

As demais rotas Actuator e qualquer rota não declarada são negadas. A infraestrutura pública já
permitida pelo projeto é preservada; ela não concede acesso a operações de negócio.

## Segurança HTTP e segurança por método

`SecurityConfiguration` usa `@EnableMethodSecurity`, habilitando a avaliação de
`@PreAuthorize`. A `SecurityFilterChain` faz a primeira barreira por método HTTP e caminho; as
anotações fazem uma segunda barreira junto ao código protegido. Essa defesa em profundidade
evita que uma futura alteração de mapeamento HTTP exponha acidentalmente uma operação sensível.

As expressões e suas justificativas são:

- `@PreAuthorize("hasRole('ADMIN')")` em `POST /acoes`: ações são cadastros globais e sua
  criação afeta todos os usuários.
- `@PreAuthorize("hasRole('ADMIN')")` em `POST /corretoras`: corretoras também são cadastros
  globais e a criação aciona validações externas.
- `@PreAuthorize("hasRole('ADMIN')")` em
  `PUT /acoes/{id}/atualizar-cotacao`: a atualização altera a cotação global usada nos cálculos.
- `@PreAuthorize("hasRole('ADMIN')")` em `DELETE /corretoras/{id}`: a exclusão de cadastro
  global pode afetar referências históricas.
- `@PreAuthorize("hasRole('ADMIN')")` na classe `AdminUsuarioController`: todos os seis
  endpoints do controller administram identidades, perfis, status ou credenciais.

`hasRole('ADMIN')` procura a autoridade `ROLE_ADMIN`. A autorização efetiva usa o usuário
recarregado do banco a cada requisição; a claim `authorities` do JWT é informativa.

## Autorização horizontal da carteira

RBAC controla o tipo de operação, mas o isolamento entre usuários exige autorização horizontal.
O backend obtém o ID do usuário autenticado pelo `UsuarioAtualService`; os repositories filtram
posições por `usuarioId` e transações por `usuarioId`. Não existe `usuarioId` no body, no caminho
ou em header que permita escolher outra carteira.

Assim, cada `USER` ou `ADMIN` compra, vende e consulta somente a própria posição, resumo e
histórico. O papel `ADMIN` **não** dá acesso automático às carteiras privadas de outros usuários.
Os cadastros de ações e corretoras são globais; carteiras, posições e históricos são privados.

## API administrativa de usuários

Todos os endpoints abaixo exigem Bearer JWT de um `ADMIN` ativo.

| Método e caminho | Entrada real | Sucesso |
|---|---|---|
| `POST /admin/usuarios` | `nome`, `email`, `senha` e `perfil` opcional | `201` com usuário |
| `GET /admin/usuarios` | — | `200` com lista |
| `GET /admin/usuarios/{id}` | — | `200` com usuário |
| `PATCH /admin/usuarios/{id}/perfil` | `perfil`: `USER` ou `ADMIN` | `200` com usuário |
| `PATCH /admin/usuarios/{id}/status` | `ativo`: booleano | `200` com usuário |
| `PUT /admin/usuarios/{id}/senha` | `novaSenha` | `204` sem corpo |

Não há `DELETE` de usuário. Desativar preserva carteira e histórico, mantendo rastreabilidade.
Campos desconhecidos nos DTOs administrativos são rejeitados.

### Criação de USER e ADMIN

O campo `perfil` aceita somente `USER` ou `ADMIN`; quando omitido, o padrão é `USER`. A conta
administrativa nova nasce ativa. Nome tem até 120 caracteres, e-mail até 254, e a senha deve ter
entre 8 e 72 caracteres.

```json
{
  "nome": "Usuário de teste",
  "email": "usuario@example.invalid",
  "senha": "<senha-de-8-a-72-caracteres>",
  "perfil": "USER"
}
```

Para criar um administrador, o mesmo contrato usa `"perfil": "ADMIN"`. O cadastro público
`POST /auth/register` não aceita elevação de privilégio e sempre persiste `USER` ativo.

### Alteração de perfil, status e senha

```json
{ "perfil": "ADMIN" }
```

```json
{ "ativo": false }
```

```json
{ "novaSenha": "<nova-senha-de-8-a-72-caracteres>" }
```

A API impede que o administrador autenticado desative a própria conta ou rebaixe o próprio
perfil. Também impede desativar ou rebaixar o último `ADMIN` ativo. Essas violações retornam
`422`; a verificação do último administrador usa bloqueio pessimista dentro da transação para
preservar ao menos um administrador ativo mesmo sob concorrência.

### Resposta sem credenciais

As respostas administrativas contêm exclusivamente:

```json
{
  "id": 42,
  "nome": "Usuário de teste",
  "email": "usuario@example.invalid",
  "perfil": "USER",
  "ativo": true,
  "dataHoraCadastro": "2026-11-09T20:00:00-03:00"
}
```

Senha, `senhaHash`, token e qualquer hash não fazem parte do DTO de resposta.

## Senhas e BCrypt

O bean `PasswordEncoder` usa `BCryptPasswordEncoder`. Senhas de cadastro e de redefinição são
transformadas em hash unidirecional com salt; texto puro não é persistido e não existe operação
para recuperar a senha original. O login compara a senha apresentada ao hash armazenado.

## Códigos HTTP usados

| Código | Uso na API |
|---:|---|
| `200 OK` | Login, consultas, alterações de perfil/status, cotação, compra e venda |
| `201 Created` | Cadastro público, criação administrativa, ação e corretora |
| `204 No Content` | Redefinição de senha e exclusão de corretora |
| `400 Bad Request` | JSON, enum, campos ou Bean Validation inválidos |
| `401 Unauthorized` | Token ausente/inválido/expirado, credenciais inválidas ou conta inativa |
| `403 Forbidden` | Usuário autenticado sem o papel exigido |
| `404 Not Found` | Recurso ou usuário inexistente |
| `409 Conflict` | E-mail duplicado ou corretora em uso |
| `422 Unprocessable Entity` | Regra de negócio, inclusive último ADMIN e própria conta |
| `502 Bad Gateway` | Resposta inválida de provedor externo |
| `503 Service Unavailable` | Provedor externo indisponível |
| `500 Internal Server Error` | Falha inesperada sanitizada |

Erros são retornados como `application/problem+json`, sem stack trace no cliente. Requisição sem
autenticação válida recebe `401`; usuário autenticado sem autorização recebe `403`.

## JWT: comportamento e limitações

O access token é assinado, possui expiração e identifica o usuário pelo e-mail. Em cada
requisição, o filtro valida o JWT e recarrega o usuário; portanto desativação e mudança de perfil
valem na requisição seguinte, inclusive para tokens antigos.

Não há refresh token, blacklist, revogação individual, versão de credencial, rotação automática
de chave ou MFA. Redefinir a senha impede novos logins com a senha anterior, mas não revoga um
JWT já emitido: ele continua estruturalmente válido até `exp`, salvo se a conta for desativada.
JWT é codificado, não criptografado; por isso seu payload nunca deve conter senhas ou segredos.

## Validação automatizada

A suíte backend usa H2 em testes compatíveis e um PostgreSQL descartável nos testes específicos.
`PostgresTestcontainersIntegrationTest` declara `postgres:17-alpine`, banco
`gestao_acoes_test`, credenciais exclusivas de teste e URL JDBC dinâmica. O container é removido
pelo Testcontainers/Ryuk ao final; o PostgreSQL compartilhado do Compose não é usado nem alterado.

A coleção `docs/postman/Gestao-Acoes-Aula-14.postman_collection.json` cobre a matriz RBAC e a
administração. Requisições mutáveis exigem que `ambienteIsolado` e `confirmarMutacoes` estejam
explicitamente definidos como `SIM`; seus valores padrão bloqueiam a execução.
