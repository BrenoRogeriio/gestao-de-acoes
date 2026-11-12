# Aula 15 — Evidências TDD: Red, Green, Refactor

Esta etapa aplicou três ciclos TDD reais ao contrato HTTP do `GlobalExceptionHandler`.
Os testes usam JUnit 5, MockMvc e AssertJ, seguem Arrange, Act, Assert e validam status,
`application/problem+json`, campos do `ProblemDetail` e ausência de detalhes internos.

## Ciclo 1 — Parâmetro de tipo inválido

1. **Comportamento especificado:** `GET /acoes/ticker/PETR4?mercado=MERCADO_INTERNO`
   deve responder HTTP 400 com título, detalhe, tipo e timestamp seguros, sem nomes de
   exceções ou stack trace.
2. **Teste escrito primeiro:**
   `GlobalExceptionHandlerMvcTest#parametroDeTipoInvalidoDeveRetornarProblemDetailSeguro`.
   O endpoint é real e o usuário está autenticado com `@WithMockUser`.
3. **Comando RED:**

   ```powershell
   .\mvnw.cmd "-Dtest=GlobalExceptionHandlerMvcTest#parametroDeTipoInvalidoDeveRetornarProblemDetailSeguro" test
   ```

4. **Falha RED real:** a exceção resolvida foi
   `MethodArgumentTypeMismatchException`; o fallback genérico respondeu 500.

   ```text
   Status expected:<400> but was:<500>
   Tests run: 1, Failures: 1, Errors: 0, Skipped: 0
   BUILD FAILURE
   ```

5. **Mudança mínima GREEN:** inclusão de um `@ExceptionHandler` específico, retornando
   HTTP 400 e mensagem pública fixa, sem refletir a mensagem interna de conversão.
6. **Resultado GREEN:** mesmo comando; 1 teste executado, nenhuma falha, `BUILD SUCCESS`.
7. **REFACTOR:** extração do método privado `criarProblemDetail` para centralizar a
   criação dos novos erros sem alterar o contrato.
8. **Resultado REFACTOR:** mesmo comando; 1 teste executado, nenhuma falha,
   `BUILD SUCCESS`.
9. **Mocks:** `AcaoService`, `AcaoRepository` e `AcaoMapper` são mocks do slice
   `@WebMvcTest` apenas para construir o `AcaoController`. A conversão do parâmetro
   falha antes de qualquer chamada a essas dependências.

## Ciclo 2 — Parâmetro obrigatório ausente

1. **Comportamento especificado:** uma requisição sem o `@RequestParam` obrigatório
   deve responder HTTP 400 com `ProblemDetail` padronizado e seguro.
2. **Teste escrito primeiro:**
   `GlobalExceptionHandlerMvcTest#parametroObrigatorioAusenteDeveRetornarProblemDetailPadronizado`.
   Como não existe `@RequestParam` obrigatório no domínio, foi criado o controller mínimo
   `RequiredParameterTestController` exclusivamente como classe aninhada do teste, sob
   `/acoes/testes/parametro-obrigatorio`.
3. **Comando RED:**

   ```powershell
   .\mvnw.cmd "-Dtest=GlobalExceptionHandlerMvcTest#parametroObrigatorioAusenteDeveRetornarProblemDetailPadronizado" test
   ```

4. **Falha RED real:** após confirmar que o controller de teste estava registrado, a
   exceção resolvida foi `MissingServletRequestParameterException`; o fallback respondeu 500.

   ```text
   Status expected:<400> but was:<500>
   Tests run: 1, Failures: 1, Errors: 0, Skipped: 0
   BUILD FAILURE
   ```

   A primeira tentativa de execução encontrou `NoResourceFoundException` porque o
   controller aninhado ainda não estava importado. Essa tentativa serviu apenas para
   corrigir o scaffolding do teste e **não** foi contabilizada como evidência RED.
5. **Mudança mínima GREEN:** inclusão do tratamento específico de
   `MissingServletRequestParameterException`, reutilizando o helper existente.
6. **Resultado GREEN:** mesmo comando; 1 teste executado, nenhuma falha, `BUILD SUCCESS`.
7. **REFACTOR:** centralização do prefixo das URIs de erro e criação do helper
   `criarBadRequest`, removendo repetição entre os dois handlers de HTTP 400.
8. **Resultado REFACTOR:** mesmo comando; 1 teste executado, nenhuma falha,
   `BUILD SUCCESS`.
9. **Mocks:** o controller mínimo não possui dependências. Os mocks do `AcaoController`
   continuam limitados à inicialização do slice MVC e não participam desse cenário.

## Ciclo 3 — Método HTTP não permitido

1. **Comportamento especificado:** `POST /acoes/ticker/PETR4`, em recurso que aceita
   `GET`, deve responder HTTP 405 com `ProblemDetail` seguro, sem expor a mensagem
   interna do Spring.
2. **Teste escrito primeiro:**
   `GlobalExceptionHandlerMvcTest#metodoHttpNaoPermitidoDeveRetornarProblemDetailSeguro`.
   A requisição usa usuário autenticado e token CSRF do suporte de testes do Spring Security.
3. **Comando RED:**

   ```powershell
   .\mvnw.cmd "-Dtest=GlobalExceptionHandlerMvcTest#metodoHttpNaoPermitidoDeveRetornarProblemDetailSeguro" test
   ```

4. **Falha RED real:** a exceção resolvida foi
   `HttpRequestMethodNotSupportedException`; o fallback genérico respondeu 500.

   ```text
   Status expected:<405> but was:<500>
   Tests run: 1, Failures: 1, Errors: 0, Skipped: 0
   BUILD FAILURE
   ```

5. **Mudança mínima GREEN:** inclusão do handler específico que retorna HTTP 405,
   título, detalhe e URI de tipo fixos e seguros.
6. **Resultado GREEN:** mesmo comando; 1 teste executado, nenhuma falha, `BUILD SUCCESS`.
7. **REFACTOR:** padronização do nome `BASE_URI_ERROS` e alteração do helper para receber
   apenas o sufixo da URI, evitando concatenação nos handlers.
8. **Resultado REFACTOR:** execução da classe completa abaixo; 3 testes executados,
   nenhuma falha, `BUILD SUCCESS`.

   ```powershell
   .\mvnw.cmd "-Dtest=GlobalExceptionHandlerMvcTest" test
   ```

9. **Mocks:** as dependências do `AcaoController` são mocks porque o objetivo é o
   contrato MVC. O erro de método é resolvido antes da invocação do controller, portanto
   nenhum comportamento de domínio foi simulado.

## Validação consolidada dos ciclos

Após o último REFACTOR, os três cenários retornaram respectivamente 400, 400 e 405,
com 3 testes aprovados.

O comando final foi:

```powershell
.\mvnw.cmd clean verify
```

Resultado: `BUILD SUCCESS`, 213 testes aprovados, nenhuma falha, erro ou teste ignorado.
Os 17 testes de `PostgresTestcontainersIntegrationTest` também foram aprovados.

| Métrica | Antes (15B) | Depois (15C) | Variação exata |
|---|---:|---:|---:|
| Linhas | 1002/1093 (91,67%) | 1011/1102 (91,74%) | +0,0680 p.p. |
| Ramos | 247/414 (59,66%) | 247/414 (59,66%) | 0,0000 p.p. |

Os novos handlers são lineares e não criam decisões condicionais. Por isso, aumentaram
as linhas cobertas, mas não alteraram os contadores globais de ramos.

## Verificação controlada por mutação

Para demonstrar que o teste do contrato HTTP detecta uma regressão real, foi preservada
uma cópia exata do `GlobalExceptionHandler.java` e aplicada temporariamente uma única
mutação no handler de `HttpRequestMethodNotSupportedException`: o status retornado foi
alterado de `HttpStatus.METHOD_NOT_ALLOWED` (405) para `HttpStatus.BAD_REQUEST` (400).

Foi executado somente o teste responsável por esse contrato:

```powershell
.\mvnw.cmd "-Dtest=GlobalExceptionHandlerMvcTest#metodoHttpNaoPermitidoDeveRetornarProblemDetailSeguro" test
```

O teste detectou a mutação e falhou pela divergência observável do status HTTP:

```text
Status expected:<405> but was:<400>
Tests run: 1, Failures: 1, Errors: 0, Skipped: 0
BUILD FAILURE
```

Em seguida, o conteúdo original foi restaurado sem `git restore`. A identidade exata
entre o arquivo restaurado e a cópia preservada foi confirmada pelo mesmo SHA-256:
`2B8C4DFD5BCA223140D99C15337EC9E4BD8E45293D56D216BD94BE05E97EFC75`.

O mesmo teste direcionado foi executado novamente após a restauração e voltou a
responder 405: 1 teste executado, nenhuma falha, erro ou teste ignorado, com
`BUILD SUCCESS`. Portanto, a asserção não apenas percorre o handler; ela rejeita uma
mudança indevida no comportamento público da API.
