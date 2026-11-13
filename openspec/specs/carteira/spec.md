## Purpose

Definir o comportamento de referência das operações e consultas da carteira de ações, seus cálculos financeiros, validações, idempotência e isolamento por usuário.

## Requirements

### Requirement: Operações vinculadas ao usuário autenticado

O sistema SHALL registrar compras e vendas exclusivamente na carteira da conta autenticada, sem aceitar a escolha de outro usuário na requisição.

#### Scenario: Registro de compra autenticada
- **GIVEN** uma conta autenticada e uma compra válida para ação e corretora existentes
- **WHEN** a compra é registrada
- **THEN** o sistema grava a transação e atualiza a posição pertencente à conta autenticada

#### Scenario: Registro de venda autenticada
- **GIVEN** uma conta autenticada com posição própria suficiente e uma venda válida
- **WHEN** a venda é registrada
- **THEN** o sistema grava a transação e reduz a posição pertencente à conta autenticada

### Requirement: Formação do preço médio nas compras

O sistema SHALL calcular o preço médio da posição por média ponderada das compras, usando os valores e quantidades de execução e mantendo quatro casas decimais.

#### Scenario: Primeira compra
- **GIVEN** que o usuário não possui posição na ação
- **WHEN** ele registra uma compra
- **THEN** a quantidade da posição corresponde à quantidade comprada e o preço médio corresponde ao preço da compra

#### Scenario: Compra adicional
- **GIVEN** uma posição aberta com quantidade e preço médio existentes
- **WHEN** o usuário registra outra compra da mesma ação
- **THEN** o novo preço médio corresponde à soma do custo anterior e do custo da nova compra dividida pela quantidade total

#### Scenario: Soma de quantidade fora do limite numérico
- **GIVEN** uma posição cuja quantidade não pode ser somada à nova compra sem exceder o limite numérico suportado
- **WHEN** a compra é solicitada
- **THEN** o sistema rejeita a operação sem gravar transação nem posição alterada

### Requirement: Apuração financeira nas vendas

O sistema SHALL manter o preço médio da posição durante venda parcial e calcular o resultado realizado como `(preço de venda - preço médio) × quantidade vendida`.

#### Scenario: Venda parcial com lucro
- **GIVEN** uma posição cujo preço de venda é superior ao preço médio
- **WHEN** parte da quantidade é vendida
- **THEN** o sistema reduz a quantidade, preserva o preço médio e registra resultado realizado positivo

#### Scenario: Venda com prejuízo
- **GIVEN** uma posição cujo preço de venda é inferior ao preço médio
- **WHEN** uma quantidade é vendida
- **THEN** o sistema registra resultado realizado negativo

#### Scenario: Venda total
- **GIVEN** uma posição cuja quantidade inteira é vendida
- **WHEN** a venda é concluída
- **THEN** o sistema zera a quantidade e o preço médio da posição

#### Scenario: Venda acima da posição própria
- **GIVEN** uma posição própria ausente ou com quantidade inferior à venda solicitada
- **WHEN** o usuário tenta registrar a venda
- **THEN** o sistema rejeita a operação como regra de negócio sem consumir posição de outro usuário

### Requirement: Validações financeiras da transação

O sistema SHALL aceitar somente transações com quantidade positiva, preço de execução positivo, no máximo quatro casas decimais e no máximo quinze dígitos inteiros no preço.

#### Scenario: Quantidade inválida
- **GIVEN** uma compra ou venda com quantidade ausente, zero ou negativa
- **WHEN** a transação é solicitada
- **THEN** o sistema rejeita a operação

#### Scenario: Preço inválido
- **GIVEN** uma compra ou venda com preço ausente, zero ou negativo
- **WHEN** a transação é solicitada
- **THEN** o sistema rejeita a operação

#### Scenario: Precisão excessiva
- **GIVEN** um preço de execução com mais de quatro casas decimais
- **WHEN** a transação é solicitada
- **THEN** o sistema rejeita a operação

#### Scenario: Magnitude excessiva
- **GIVEN** um preço de execução com mais de quinze dígitos inteiros
- **WHEN** a transação é solicitada
- **THEN** o sistema rejeita a operação

### Requirement: Consulta de posições abertas

O sistema SHALL listar somente posições abertas da conta autenticada e calcular valor investido, valor atual, resultado não realizado e rentabilidade a partir da quantidade, preço médio e cotação disponível.

#### Scenario: Posição com cotação
- **GIVEN** uma posição aberta cuja ação possui cotação atual
- **WHEN** o usuário consulta suas posições
- **THEN** o sistema informa o valor investido, o valor atual, o resultado não realizado, a rentabilidade percentual e o saldo total atual igual ao valor atual

#### Scenario: Posição sem cotação
- **GIVEN** uma posição aberta cuja ação não possui cotação atual
- **WHEN** o usuário consulta suas posições
- **THEN** o sistema informa o valor investido e mantém indisponíveis o valor atual, o resultado não realizado e a rentabilidade

#### Scenario: Posição zerada
- **GIVEN** uma posição com quantidade zero
- **WHEN** o usuário consulta suas posições abertas
- **THEN** o sistema não inclui essa posição no resultado

### Requirement: Resumo financeiro por moeda

O sistema SHALL consolidar o resumo da carteira separadamente por moeda, incluindo valores investido e atual, resultados realizado e não realizado, rentabilidade não realizada e resultado total.

#### Scenario: Consolidação de moedas distintas
- **GIVEN** posições ou resultados realizados em BRL e USD
- **WHEN** o usuário consulta o resumo
- **THEN** o sistema retorna consolidações independentes para cada moeda

#### Scenario: Resultado total
- **GIVEN** resultado realizado em vendas e resultado não realizado em posições abertas da mesma moeda
- **WHEN** o resumo é calculado
- **THEN** o resultado total corresponde à soma do resultado realizado com o resultado não realizado

#### Scenario: Resultado realizado sem posição aberta
- **GIVEN** vendas com resultado realizado em uma moeda e nenhuma posição aberta nessa moeda
- **WHEN** o resumo é consultado
- **THEN** o sistema mantém a moeda no resumo com o resultado realizado acumulado

#### Scenario: Cotação ausente no resumo
- **GIVEN** ao menos uma posição de uma moeda sem cotação atual
- **WHEN** o resumo dessa moeda é calculado
- **THEN** o sistema mantém o valor investido e deixa indisponíveis o valor atual, o resultado não realizado, a rentabilidade e o resultado total

### Requirement: Histórico de transações

O sistema SHALL listar o histórico da conta autenticada em ordem cronológica decrescente, preservando tipo, ação, corretora, moeda, quantidade, preço e data da operação.

#### Scenario: Histórico com compra e venda
- **GIVEN** compras e vendas registradas para o usuário
- **WHEN** ele consulta o histórico
- **THEN** o sistema retorna primeiro as transações mais recentes e identifica seus dados de execução

#### Scenario: Resultado financeiro no histórico
- **GIVEN** uma compra e uma venda registradas
- **WHEN** o histórico é consultado
- **THEN** preço médio da operação, resultado realizado e rentabilidade realizada são informados para a venda e permanecem ausentes para a compra

### Requirement: Idempotência de compra e venda

O sistema SHALL aceitar uma chave de idempotência opcional, não vazia e com até 100 caracteres, isolada por usuário nas operações de compra e venda.

#### Scenario: Repetição da mesma operação
- **GIVEN** uma compra ou venda já processada com determinada chave
- **WHEN** o mesmo usuário repete a mesma operação com a mesma chave e os mesmos dados
- **THEN** o sistema considera a requisição já processada e não duplica transação nem alteração de posição

#### Scenario: Reutilização incompatível da chave
- **GIVEN** uma chave já usada pelo usuário
- **WHEN** ela é reutilizada com tipo, ação, corretora, quantidade ou preço diferente, ou com uma data explicitamente informada diferente da registrada
- **THEN** o sistema rejeita a nova operação como regra de negócio

#### Scenario: Mesma chave para usuários diferentes
- **GIVEN** duas contas autenticadas distintas
- **WHEN** ambas usam a mesma chave em operações próprias válidas
- **THEN** o sistema processa uma operação para cada usuário

#### Scenario: Chave inválida
- **GIVEN** uma chave vazia após remoção de espaços ou com mais de 100 caracteres
- **WHEN** uma compra ou venda é solicitada
- **THEN** o sistema rejeita a operação

### Requirement: Isolamento dos dados da carteira

O sistema SHALL filtrar posições, histórico, resumo, resultados realizados e chaves de idempotência pela conta autenticada.

#### Scenario: Consulta por usuários distintos
- **GIVEN** duas contas com posições e transações próprias
- **WHEN** cada conta consulta posição, histórico ou resumo
- **THEN** cada resposta contém somente dados pertencentes à conta solicitante

#### Scenario: Venda por usuário sem saldo próprio
- **GIVEN** que outro usuário possui posição na ação, mas o solicitante não possui saldo próprio suficiente
- **WHEN** o solicitante tenta vender a ação
- **THEN** o sistema rejeita a venda e não altera a posição do outro usuário

#### Scenario: Conta administrativa com carteira
- **GIVEN** uma conta `ADMIN` e uma conta `USER` com operações próprias
- **WHEN** ambas operam e consultam a carteira
- **THEN** cada conta permanece limitada aos próprios dados

### Requirement: Estado inicial e registros sem proprietário

O sistema SHALL apresentar carteira vazia para uma conta nova e não deverá associar automaticamente registros legados sem proprietário a usuários autenticados.

#### Scenario: Conta nova com registros legados existentes
- **GIVEN** uma conta sem operações próprias e registros legados sem usuário associado
- **WHEN** a conta consulta posição, histórico e resumo
- **THEN** o sistema retorna listas vazias e mantém os registros legados invisíveis
