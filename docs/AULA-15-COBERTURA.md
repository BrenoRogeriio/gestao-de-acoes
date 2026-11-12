# Aula 15 — Cobertura e portão de qualidade

## Evolução da cobertura

Os valores abaixo foram extraídos dos contadores reais de `target/site/jacoco/jacoco.xml`. Quantidade de testes e cobertura são medidas diferentes: um teste pode percorrer muitas linhas sem validar decisões importantes, enquanto um teste pequeno pode cobrir um ramo crítico.

| Etapa | Linhas | Ramos | Observação |
|---|---:|---:|---|
| 15B — medição inicial | 1002/1093 (91,67%) | 247/414 (59,66%) | JaCoCo 0.8.15, ainda sem portão |
| 15C — ciclos TDD | 1011/1102 (91,74%) | 247/414 (59,66%) | Três contratos `ProblemDetail` adicionados |
| 15D — testes de ramos | 1014/1102 (92,01%) | 253/414 (61,11%) | Sete testes novos, sem alteração na produção |

Da 15C para a 15D, a cobertura global aumentou 0,27 ponto percentual em linhas e 1,45 ponto percentual em ramos. Os denominadores não mudaram nesta etapa.

## Cenários adicionados na 15D

Foram escolhidas no máximo duas classes de produção, a partir dos ramos descobertos indicados pelo relatório JaCoCo:

- `CarteiraService`: aceita e normaliza uma chave de idempotência com exatamente 100 caracteres; rejeita 101 caracteres; rejeita chave composta somente por espaços.
- `JwtService`: rejeita segredo nulo; rejeita issuer nulo; invalida token de usuário desabilitado; invalida token cujo subject diverge do username atual.

Todos os testes seguem Arrange, Act, Assert e verificam resultados observáveis. Não houve chamada artificial de métodos, remoção de testes, exclusão de código do JaCoCo nem mudança em regra financeira, JWT ou RBAC.

Cobertura de ramos nas classes escolhidas:

| Classe | Antes da 15D | Depois da 15D | Variação |
|---|---:|---:|---:|
| `CarteiraService` | 60/74 (81,08%) | 62/74 (83,78%) | +2,70 p.p. |
| `JwtService` | 15/20 (75,00%) | 19/20 (95,00%) | +20,00 p.p. |

## Justificativa dos mocks

Em `CarteiraServiceTest`, os repositórios e `UsuarioAtualService` são mocks porque o objetivo é isolar as decisões da camada de serviço de banco, autenticação e concorrência. Nos casos inválidos, `verifyNoInteractions` comprova que a rejeição ocorre antes de qualquer persistência. No limite válido, o `ArgumentCaptor<Transacao>` verifica a chave efetivamente enviada ao repositório, sem depender da implementação interna do método.

Em `JwtServiceTest` não há mocks. O serviço pode ser exercitado diretamente com uma chave exclusiva de teste e com a implementação `User` do Spring Security; isso torna as asserções independentes de repositório ou contexto Spring.

## Portão JaCoCo

O `jacoco-maven-plugin` 0.8.15 executa `prepare-agent`, gera HTML, XML e CSV na fase `verify` e agora também executa `check` nessa fase. As regras são aplicadas ao `BUNDLE`, sem exclusões:

- `LINE / COVEREDRATIO`: `${jacoco.minimum.line.coverage}`, valor versionado `0.80`;
- `BRANCH / COVEREDRATIO`: `${jacoco.minimum.branch.coverage}`, valor versionado `0.61`.

Os pisos são propriedades Maven e refletem resultados reais do próprio Gestão de Ações. Após os testes de fronteira da 15D, o limite de ramos foi elevado de 0,59 para 0,61, abaixo da cobertura medida de 61,11%; ele não foi reduzido para acomodar falhas.

### Evidência de aprovação

Comando:

```powershell
.\mvnw.cmd clean verify
```

Resultado: 220 testes, 0 falhas, 0 erros e 0 ignorados; 17 testes de `PostgresTestcontainersIntegrationTest`; mensagem `All coverage checks have been met`; `BUILD SUCCESS`.

### Evidência de reprovação controlada

Comando, sem modificar permanentemente o `pom.xml`:

```powershell
.\mvnw.cmd "-Djacoco.minimum.branch.coverage=0.99" verify
```

Resultado dos testes: 220 testes, 0 falhas, 0 erros e 0 ignorados. A falha ocorreu exclusivamente no objetivo `jacoco:check`, após todos os testes e a geração do relatório:

```text
Rule violated for bundle gestao-acoes: branches covered ratio is 0.61, but expected minimum is 0.99
Failed to execute goal org.jacoco:jacoco-maven-plugin:0.8.15:check
```

## Por que cobertura alta não garante bons testes

Cobertura prova execução, não correção. Um teste pode alcançar uma linha sem conferir seu resultado, usar expectativas derivadas da própria implementação ou ignorar efeitos de segurança e persistência. Por isso, a suíte deve combinar asserções de comportamento, valores de fronteira, erros relevantes, integração com infraestrutura descartável e revisão da qualidade dos testes. O portão impede regressões quantitativas, mas não substitui essas práticas.

## Estratégia para aproximar ramos de 80%

1. Usar o relatório HTML por linha para escolher decisões de domínio e segurança ainda descobertas, evitando metas por contagem de testes.
2. Priorizar erros e fronteiras de `AcaoService`, `AdminUsuarioService`, ramos restantes de `CarteiraService`, filtros de segurança e tratamento de exceções.
3. Adicionar cenários pequenos com resultado observável, incluindo inexistência de entidade, conflitos, limites numéricos e combinações de autorização.
4. Medir novamente após cada grupo, elevar o piso apenas quando a cobertura estiver estável e manter margem para execução reproduzível.
5. Revisar duplicações e considerar testes de mutação em etapa futura para descobrir asserções incapazes de detectar defeitos.

O objetivo de 80% de ramos deve ser alcançado por cenários úteis, sem exclusões, métodos artificiais ou testes sem asserções.
