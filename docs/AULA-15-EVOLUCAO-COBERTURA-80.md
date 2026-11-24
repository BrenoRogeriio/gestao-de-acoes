# Aula 15 — Evolução da cobertura de ramos

A avaliação exige cobertura global de pelo menos 80% dos ramos do backend. O relatório inicial continha 420 ramos. Para alcançar o mínimo, a suíte precisava passar de 259 para pelo menos 336 ramos cobertos.

## Medição

Os valores vêm dos contadores filhos diretos de `report` em `target/site/jacoco/jacoco.xml`. Cada percentual corresponde a cobertos divididos pela soma de cobertos e perdidos.

| Métrica | XML inicial | XML final com o portão de 80% | Ganho absoluto |
| --- | ---: | ---: | ---: |
| Instruções | 4.903 / 5.717 (85,76%) | 5.320 / 5.717 (93,06%) | 417 instruções |
| Linhas | 1.033 / 1.121 (92,15%) | 1.063 / 1.121 (94,83%) | 30 linhas |
| Ramos | 259 / 420 (61,67%) | 354 / 420 (84,29%) | 95 ramos |

Os ramos descobertos caíram de 161 para 66. A margem sobre o mínimo é de 18 ramos.

## Decisões exercitadas

| Teste | Novos casos executados | Comportamento observado |
| --- | ---: | --- |
| `IdentidadeEntidadeTest` | 5 | Uma instância recarregada com o mesmo ID ocupa a mesma entrada do conjunto. Outro ID e uma entidade transitória ocupam entradas distintas. O contrato é verificado para ação, corretora, posição, transação e usuário. |
| `CorretoraServiceTest` | 19 | CNPJ ausente, vazio, curto, repetido, com primeiro dígito verificador incorreto ou já cadastrado impede consultas externas. Dados contraditórios da Receita ou da CVM e CEP, bairro, cidade ou UF inválidos impedem a gravação. |
| `AcaoServiceTest` | 8 | Respostas de erro da Twelve Data distinguem ticker inexistente de rejeição do provedor. Timestamp zero, negativo ou fora da faixa representável impede salvar a cotação. |
| `RbacIntegrationTest` | 2 | Um USER consulta um ticker em minúsculas e recebe ID, mercado e moeda no JSON. Filtrar pelo outro mercado devolve HTTP 404. |

O XML inicial apontava 70 ramos descobertos nos métodos de identidade das cinco entidades. Os novos testes cobriram 60 deles. Entre os métodos de serviço, havia sete ramos descobertos em `consultarEValidarCep`, seis em `consultarEValidarCvm` e seis em `erroIndicaTickerInexistente`. Falhas nessas decisões podem associar dados de terceiros à corretora ou classificar incorretamente uma falha de cotação. A suíte completa também exercita os cenários existentes de compra, venda, idempotência, usuários desativados e autorização administrativa.

## Reprodução

Na raiz do projeto, com JDK 21 e Docker disponíveis, execute o comando abaixo e abra o relatório.

```powershell
.\mvnw.cmd clean verify
Start-Process .\target\site\jacoco\index.html
```

O JaCoCo 0.8.15 produz HTML, XML e CSV em `target/site/jacoco/`. No HTML, abra o pacote e a classe para inspecionar as decisões por linha. O teste de integração com PostgreSQL usa a imagem `postgres:17-alpine` em um container descartável. Outros testes de integração usam H2 em memória.

## Portão de qualidade

A primeira execução com os 34 casos adicionais passou com 263 testes, zero falhas, zero erros e zero ignorados. Após medir 84,29% de ramos, o mínimo de BRANCH no POM passou de 0,61 para 0,80. A regra global de LINE continua em 0,80.

A segunda execução de `.\mvnw.cmd clean verify`, com os dois limites em vigor, reproduziu todos os contadores da tabela. O Maven registrou `BUILD SUCCESS` e `All coverage checks have been met.` Os 263 testes passaram, incluindo os 17 da classe `PostgresTestcontainersIntegrationTest`. Os relatórios HTML, XML e CSV foram gerados novamente.

A change OpenSpec `melhoria-cobertura-branches-80` passou na validação estrita. Está pronta para arquivamento com `openspec archive melhoria-cobertura-branches-80 --skip-specs`, pois o escopo é o portão de qualidade e a suíte de testes.
