# Tarefas

## 1. Backend e contrato de erro

- [x] 1.1 Adicionar a exceção de conta desativada e seu Problem Details `403` com `type` e `codigo` estáveis; verificar com teste MVC que o contrato não depende do texto da exceção.
- [x] 1.2 Pré-validar e-mail/senha com BCrypt antes do estado da conta, executar BCrypt sintético para e-mail inexistente e preservar o `AuthenticationManager` para contas ativas; verificar por testes de integração os cinco cenários de login, redefinição seguida de desativação e ausência de JWT nas falhas.
- [x] 1.3 Confirmar que JWT anterior de conta desativada continua rejeitado e executar os testes backend direcionados de autenticação e segurança.

## 2. Frontend de login

- [x] 2.1 Mapear o `type` estável de conta desativada para a mensagem aprovada exclusivamente no login, preservando mensagem genérica nos demais `401`; verificar testes do login normal, erros e contrato sem comparação de textos backend.
- [x] 2.2 Verificar por teste que falhas de login não armazenam token e que o layout, temas e demais telas permanecem inalterados.

## 3. Validação integral e integração

- [x] 3.1 Executar `./mvnw.cmd clean verify` com Testcontainers e portão JaCoCo, sem reduzir cobertura; verificar sucesso completo do Maven.
- [x] 3.2 Executar testes, lint e build do frontend; verificar todos os comandos aprovados sem regressões.
- [x] 3.3 Executar `graphify update .`, OpenSpec strict, `git diff --check` e auditoria de escopo; verificar ausência de migrations, `.env`, regras financeiras, RBAC ou dados reais no diff.
- [x] 3.4 Reconstruir somente `aplicacao` e `frontend`, preservando PostgreSQL e volumes; verificar IDs/health dos serviços, logs sem erro e carregamento de `/login`.

## Acompanhamento do workflow

- Sincronizar o delta de `autenticacao` com a baseline após todas as tarefas concluídas.
- Arquivar a change pelo workflow oficial e validar novamente.
- Criar o commit e publicar em `origin/main` somente com todas as verificações aprovadas.
