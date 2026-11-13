# Design

## Context

O backend já expõe `PUT /acoes/{id}/atualizar-cotacao`, seleciona Brapi para `BRASIL` e Twelve Data para `ESTADOS_UNIDOS`, valida a resposta externa e persiste a ação dentro de uma transação. A autorização está duplicada de forma defensiva no filtro HTTP e em `@PreAuthorize`, ambos hoje restritos a `ADMIN`.

O frontend já possui serviço para esse PUT, botão responsivo, feedback e proteção por ID em andamento na tela Ações. A permissão compartilhada oculta a operação de `USER`; o mesmo predicado também é consumido pela tela Minha Carteira. Consulte [proposal.md](./proposal.md) para a motivação e os deltas de `acoes` e `controle-de-acesso` para o contrato comportamental.

## Goals / Non-Goals

**Goals:**

- Alinhar filtro HTTP, segurança de método e interface para autorizar somente contas autenticadas `USER` e `ADMIN` na atualização manual.
- Reutilizar o endpoint, os provedores, as validações e a transação existentes.
- Manter uma única requisição em andamento por ação em cada sessão da interface e atualizar somente o item retornado.
- Demonstrar por testes que falhas externas preservam a última cotação e que operações financeiras permanecem independentes.

**Non-Goals:**

- Criar endpoint, payload de preço, migration, tabela de auditoria, cache distribuído ou nova dependência.
- Implementar scheduler, `@Scheduled`, cron, job, processo em background, atualização automática ou em massa.
- Introduzir cooldown temporal, rate limiting global ou coordenação entre múltiplas instâncias.
- Alterar cadastro de ações, transações, quantidade, preço médio, resultados, histórico ou isolamento de carteiras.

## Decisions

### 1. Manter o endpoint PUT sem corpo

`PUT /acoes/{id}/atualizar-cotacao` continuará sendo a única operação de atualização. O ID identifica uma ação do catálogo global e o preço vem exclusivamente do provedor selecionado pelo mercado já cadastrado.

**Alternativas consideradas:** criar endpoint novo para `USER` ou aceitar preço no corpo. Um endpoint paralelo duplicaria regras e testes; aceitar preço confundiria cotação de mercado com preço de execução e violaria a regra financeira.

### 2. Ampliar somente a autorização da atualização, em duas camadas

O matcher específico de `PUT /acoes/*/atualizar-cotacao` passará de `hasRole("ADMIN")` para autenticação válida. O método continuará protegido explicitamente, enumerando `USER` e `ADMIN`, para que alterações futuras na ordem dos matchers não tornem a operação pública. `POST /acoes` e os demais matchers administrativos permanecem inalterados.

**Alternativas consideradas:** remover o matcher específico e depender do matcher genérico `/acoes/**`, ou remover `@PreAuthorize`. Ambas reduzem clareza e defesa em profundidade.

### 3. Reutilizar o fluxo transacional do serviço

A atualização continuará carregando a ação, consultando um único provedor, validando ticker, moeda, nome, preço e timestamp e somente então salvando o resultado. Exceções de negócio, resposta inválida ou indisponibilidade permanecem não tratadas dentro da transação para provocar rollback. Testes devem comparar cotação, instante e provedor antes e depois de uma falha.

**Alternativa considerada:** restaurar manualmente os campos no `catch`. Isso duplicaria estado e seria mais sujeito a erro que o rollback transacional já existente.

### 4. Refletir a permissão da operação no predicado central do frontend

O predicado de atualização de cotação deverá aceitar perfis carregados `USER` e `ADMIN`, continuar negando usuário ausente ou perfil em carregamento e permanecer separado dos predicados de cadastro e administração. Como o predicado já é compartilhado entre Ações e Minha Carteira, os controles existentes nessas superfícies ficarão coerentes com a autorização do backend; a aceitação obrigatória será exercitada na tela Ações.

**Alternativa considerada:** liberar somente o componente Ações e manter o predicado compartilhado como administrativo. Isso deixaria a matriz de permissões com significado incorreto e produziria interfaces contraditórias para a mesma operação.

### 5. Usar proteção local por ação, sem bloqueio global

A tela Ações manterá um `Set` em referência para rejeitar sincronamente um segundo clique no mesmo ID antes que uma nova renderização ocorra. O estado derivado desse conjunto desabilita os botões desktop e mobile e exibe carregamento. A resposta de sucesso substitui somente a ação correspondente; a falha mantém a lista atual e remove o ID do conjunto no `finally`.

Chamadas para ações diferentes podem ocorrer em paralelo. Não haverá lock no backend nem cooldown, pois a regra solicitada é impedir cliques simultâneos repetidos, e uma política global exigiria decisões adicionais sobre tempo, múltiplas instâncias e resposta HTTP.

### 6. Preservar a fronteira financeira existente

Nenhum código de compra, venda ou cálculo receberá dados do fluxo de cotação. `valorUnitario` permanece na transação; `precoMedio` permanece na posição; `cotacaoAtual` permanece na ação e é usada apenas para avaliação de mercado. Testes de regressão devem provar que uma atualização de cotação não muda transações, quantidade, preço médio, resultado realizado ou histórico.

## Risks / Trade-offs

- **[Mais contas podem consumir a cota do provedor]** → A operação continua individual, explícita e protegida contra repetição durante a requisição; rate limiting exigirá proposta própria se métricas demonstrarem necessidade.
- **[Duas sessões podem atualizar a mesma ação simultaneamente]** → Cada resposta válida pode atualizar o catálogo global; prevalece a última transação concluída. Não será introduzida coordenação distribuída nesta mudança.
- **[Divergência entre filtro HTTP e segurança de método]** → Manter testes de integração para `USER`, `ADMIN` e requisição sem token, além de preservar as duas camadas com a mesma intenção.
- **[Atualização global feita por USER afeta a visualização de outras contas]** → Esse efeito é intencional porque ações e cotações pertencem ao catálogo global; posições e transações continuam isoladas.
- **[Falha externa após estado parcialmente preenchido em memória]** → A transação realiza rollback e testes verificam todos os campos persistidos da cotação anterior.

## Migration Plan

1. Atualizar e testar primeiro a autorização e as regressões do backend, mantendo o mesmo endpoint.
2. Atualizar a matriz de permissões e os testes do frontend, preservando a proteção por ação e os predicados administrativos.
3. Executar a suíte backend completa, incluindo integração/RBAC e Testcontainers, e os scripts frontend de teste, lint e build.
4. Publicar backend antes ou junto do frontend; versões antigas do frontend continuam compatíveis com o endpoint.
5. Em rollback, restaurar as duas regras de autorização e o predicado frontend anterior. Nenhuma reversão de banco é necessária.
