# Desenho dos testes

## Contexto

O relatório inicial aponta 12 decisões sem cobertura em equals e duas em hashCode de cada entidade. Em CorretoraService, a validação de CEP concentra sete ramos descobertos. Em AcaoService, a classificação de ticker inexistente concentra seis.

## Decisões

- Exercitar a identidade com instâncias do mesmo tipo e ID, IDs diferentes e entidades transitórias. Verificar o efeito em coleções.
- Usar Mockito para simular respostas incompletas, inconsistentes e erros de provedor. Observar a exceção e a ausência de gravação.
- Usar MockMvc para verificar a busca com e sem mercado, o DTO e o 404.
- Preservar os testes existentes de compra, venda, idempotência e autorização. Executar a suíte completa com bancos descartáveis.
- Medir os contadores globais do XML após clean verify. Somente elevar o portão após atingir 336 ramos e repetir a verificação.

## Riscos

O percentual agregado pode esconder lacunas em integrações. Por isso os testes de contrato das entidades são acompanhados por casos de falha que afetam a integridade do cadastro.
