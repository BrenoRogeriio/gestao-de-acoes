# Tasks

## 1. Autorizar atualização manual no backend

- [x] 1.1 Alterar somente o matcher de `PUT /acoes/*/atualizar-cotacao` em `SecurityConfiguration` e o `@PreAuthorize` do método correspondente em `AcaoController` para aceitar contas autenticadas `USER` e `ADMIN`; verificar que `POST /acoes`, corretoras e administração de usuários continuam restritos nos testes de segurança.
- [x] 1.2 Atualizar `RbacIntegrationTest` para provar `200` e uma única chamada ao provedor simulado para `USER` e `ADMIN`, `401` sem token e manutenção de `403` nas operações administrativas; executar a classe de teste e confirmar todos os cenários aprovados sem acessar o provedor real.
- [x] 1.3 Adicionar regressões do fluxo transacional para falha, resposta inválida e ação inexistente, verificando que cotação, instante e provedor anteriores são preservados e que o provedor não é chamado para ID inexistente; executar os testes de serviço/integração correspondentes.
- [x] 1.4 Adicionar regressão financeira com dados de teste isolados para confirmar que atualizar a cotação não altera transações, quantidade, preço médio ponderado, resultado realizado, histórico nem proprietário da carteira; executar o teste com H2 ou Testcontainers, nunca com o banco real.

## 2. Disponibilizar a ação manual no frontend

- [x] 2.1 Ajustar o predicado central de atualização para aceitar perfis carregados `USER` e `ADMIN`, mantendo os predicados de cadastro e administração exclusivos de `ADMIN`; atualizar `auth.test.js` e executar o teste para verificar a nova matriz, usuário ausente e perfil em carregamento.
- [x] 2.2 Manter `Acoes.jsx` e `AcoesLista.jsx` com proteção síncrona por ID, botão desabilitado e indicador de carregamento durante a chamada, substituição somente da ação retornada e preservação da cotação exibida em erro; atualizar `acoes.test.js` para verificar visibilidade a `USER`/`ADMIN`, clique único, sucesso e falha segura.
- [x] 2.3 Revisar os demais consumidores do predicado compartilhado, especialmente `MinhaCarteira.jsx`, para que os controles existentes reflitam a mesma permissão sem liberar cadastro ou gerenciamento; executar os testes de carteira e autenticação para confirmar comportamento consistente.
- [x] 2.4 Preservar `atualizarCotacaoAcao` como `PUT` sem corpo de preço e com tratamento sanitizado de erros; executar o teste do serviço frontend confirmando caminho, método, ausência de payload e resposta atualizada.

## 3. Verificação integrada

- [x] 3.1 Executar `./mvnw.cmd clean verify` com JDK 21 e Docker, confirmando sucesso de toda a suíte, Testcontainers e portão JaCoCo sem usar o PostgreSQL real.
- [x] 3.2 Executar no frontend os scripts existentes `npm test`, `npm run lint` e `npm run build`, confirmando sucesso sem adicionar dependências.
- [x] 3.3 Revisar o diff final e buscar `@Scheduled`, scheduler, cron, job, atualização em massa, alteração de migrations e escrita de preço de transação em cotação global; confirmar que nenhum desses itens foi introduzido e que somente arquivos previstos pela mudança foram alterados.

## Workflow follow-up

- Após implementação, revisão e validação, sincronizar os deltas com as specs baseline e arquivar a mudança usando os fluxos OpenSpec apropriados.
