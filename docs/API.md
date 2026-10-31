# API HTTP

Base local: `http://localhost:8080`

Endpoints protegidos usam:

```http
Authorization: Bearer <JWT>
```

O Swagger UI, quando habilitado, permite informar esse token em **Authorize**. Erros usam `application/problem+json`. Todas as respostas incluem `X-Request-Id`; um cliente pode enviar um identificador seguro com até 64 caracteres.

O cadastro público atribui `USER`. As operações HTTP `DELETE` nas rotas de negócio exigem
`ROLE_ADMIN`. A autorização efetiva usa o perfil atual recarregado do banco; a claim
`authorities` do JWT é informativa e não substitui essa consulta.

## Autenticação

| Método e caminho | Autenticação | Entrada | Resposta e erros principais |
|---|---|---|---|
| `POST /auth/register` | Pública | `nome`, `email`, `senha` (8–72 caracteres) | 201 com JWT e usuário; 400 para validação; 409 para e-mail existente |
| `POST /auth/login` | Pública | `email`, `senha` | 200 com JWT e usuário; 400 para validação; 401 para credenciais inválidas/inatividade |
| `GET /auth/me` | Bearer JWT | — | 200 com usuário autenticado; 401 para sessão inválida/expirada |

O e-mail é normalizado e o cadastro cria perfil `USER`. A resposta nunca contém `senhaHash`.

## Ações

Ações são cadastros globais compartilhados, mas todos os endpoints exigem JWT.

| Método e caminho | Finalidade | Entrada/resposta |
|---|---|---|
| `POST /acoes` | Cadastrar ação e buscar seus dados externos | Body com `ticker` e `mercado`; retorna 201 com a ação |
| `GET /acoes` | Listar ações paginadas | Parâmetros Spring `page`, `size` e `sort`; retorna página |
| `GET /acoes/{id}` | Buscar por ID | Retorna ação ou 404 |
| `GET /acoes/ticker/{ticker}` | Buscar por ticker | `mercado` opcional; retorna lista ou 404 |
| `PUT /acoes/{id}/atualizar-cotacao` | Atualizar cotação no provedor correspondente | Retorna ação atualizada ou erro externo seguro |

Mercados aceitos pelo contrato atual: `BRASIL` e `EUA`. A moeda é definida pelo mercado.

## Corretoras

Corretoras são cadastros globais compartilhados e exigem JWT.

| Método e caminho | Finalidade | Entrada/resposta |
|---|---|---|
| `POST /corretoras` | Cadastrar e validar corretora | Body com `cnpj`, `cep` e campos opcionais de contato/endereço; retorna 201 |
| `GET /corretoras` | Listar corretoras paginadas | `page`, `size` e `sort`; retorna página |
| `GET /corretoras/{id}` | Buscar por ID | Retorna corretora ou 404 |
| `GET /corretoras/cnpj/{cnpj}` | Buscar por CNPJ | Retorna corretora ou 404 |
| `DELETE /corretoras/{id}` | Excluir corretora; exige Bearer JWT de `ADMIN` | 204 sem body; 401 sem autenticação válida; 403 para `USER`; 404 para ID inexistente; 409 quando há operações vinculadas |

O cadastro consulta ViaCEP e BrasilAPI/CVM. Indisponibilidade externa pode retornar 502 ou 503 com mensagem sanitizada.

## Carteira

Todas as operações usam implicitamente o usuário do JWT. Não existe parâmetro, body ou header para escolher `usuarioId`.

### Registrar compra ou venda

`POST /carteira/comprar` e `POST /carteira/vender` recebem:

```json
{
  "acaoId": 1,
  "corretoraId": 1,
  "quantidade": 10,
  "valorUnitario": 25.50,
  "data": "2026-09-10"
}
```

`data` é opcional. Quantidade e valor devem ser positivos; o valor aceita até quatro casas decimais. Sucesso retorna 200 sem body. Venda sem saldo próprio suficiente retorna 422.

Somente nesses dois endpoints pode ser enviado:

```http
Idempotency-Key: identificador-da-operacao
```

A chave é opcional, tem no máximo 100 caracteres e é isolada por usuário. Repetir a mesma chave com a mesma operação é seguro; reutilizá-la com operação diferente retorna 422.

### Consultas

| Método e caminho | Finalidade | Resposta |
|---|---|---|
| `GET /carteira/posicao` | Posições abertas do usuário | Lista com quantidade, preço médio, cotação, valores e rentabilidade |
| `GET /carteira/historico` | Compras e vendas do usuário | Lista cronológica com corretora, moeda e resultados realizados |
| `GET /carteira/resumo` | Resumo financeiro do usuário | Lista agregada separadamente por BRL e USD |

Conta nova recebe listas vazias. Registros legados com `usuario_id NULL` não são retornados.

## Observabilidade

| Método e caminho | Autenticação | Política |
|---|---|---|
| `GET /actuator/health` | Pública | Estado geral `UP`/`DOWN`, sem detalhes de banco/configuração |
| `GET /actuator/info` | Bearer JWT | Metadados mínimos da aplicação |

Nenhum outro endpoint Actuator é exposto; rotas como `/actuator/env`, `/actuator/beans`, `/actuator/configprops`, `/actuator/heapdump`, `/actuator/threaddump` e `/actuator/mappings` são negadas.

## Status e Problem Details

- `400`: JSON ou campos inválidos;
- `401`: autenticação ausente, inválida, expirada ou credenciais inválidas;
- `403`: usuário autenticado sem a permissão exigida, inclusive `USER` tentando executar `DELETE`;
- `404`: recurso não encontrado;
- `409`: conflito, como e-mail já cadastrado ou corretora com operações vinculadas;
- `422`: regra de negócio ou idempotência incompatível;
- `502`/`503`: falha sanitizada de provedor externo;
- `500`: erro interno genérico, sem stack trace no cliente.

Swagger/OpenAPI fica habilitado em `dev/test`. Em `prod`, permanece desabilitado salvo configuração externa explícita.
