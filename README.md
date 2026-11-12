# Gestão de Ações

Aplicação web para cadastro de ativos e corretoras, registro de compras e vendas e acompanhamento de carteiras de ações em BRL e USD. O sistema possui autenticação JWT stateless e mantém posições, transações, histórico e resultados financeiros isolados por usuário.

## Funcionalidades

- cadastro e login de usuários com senha protegida por BCrypt;
- controle de acesso RBAC com perfis `USER` e `ADMIN`;
- gestão administrativa de usuários, perfis, status e redefinição de senha;
- sessão frontend com JWT Bearer armazenado em `sessionStorage`;
- cadastro global de ações brasileiras e norte-americanas;
- cadastro global de corretoras com validação de CEP, CNPJ e CVM;
- atualização de cotações por provedores externos;
- compra e venda com idempotência e controle de concorrência;
- posições, histórico e resumo financeiro exclusivos do usuário autenticado;
- resultados realizados e não realizados separados por BRL e USD;
- interface React responsiva com temas claro e escuro;
- OpenAPI/Swagger, health check e logs HTTP com `X-Request-Id`.

## Arquitetura e tecnologias

O frontend React/Vite consome a API HTTP/JSON Spring Boot. O backend organiza o fluxo em controllers, services e repositories, persiste em PostgreSQL e versiona o schema com Liquibase. Integrações externas são acessadas por clientes OpenFeign.

- Java 21 e Spring Boot 3.3.0;
- Spring Web, Validation, Data JPA, Security e Actuator;
- JWT com JJWT e BCrypt;
- PostgreSQL 17, H2 para testes e Liquibase;
- Spring Cloud OpenFeign;
- Springdoc OpenAPI/Swagger UI;
- React 19 e Vite;
- JUnit 5, Mockito e Testcontainers;
- Docker e Docker Compose.

As integrações externas usam timeouts explícitos de conexão e leitura (3 s e 5 s por padrão),
configuráveis por `EXTERNAL_API_CONNECT_TIMEOUT_MS` e `EXTERNAL_API_READ_TIMEOUT_MS`.

Detalhes estão em [Arquitetura](docs/ARQUITETURA.md), [API](docs/API.md),
[Aula 13 — autenticação e autorização JWT](docs/AULA-13-JWT.md) e
[Aula 14 — RBAC](docs/AULA-14-RBAC.md). Para testes manuais da Aula 14, importe a
[coleção Postman RBAC](docs/postman/Gestao-Acoes-Aula-14.postman_collection.json) e reutilize o
[ambiente de exemplo da Aula 13](docs/postman/Gestao-Acoes-Aula-13.postman_environment.json).
As requisições mutáveis da coleção permanecem bloqueadas até a confirmação explícita de um
ambiente isolado.

## Requisitos

Para a execução completa com containers:

- Docker Desktop com Docker Compose;
- portas 5173, 8080 e 5432 livres, ou portas alternativas no `.env`.

Para desenvolvimento sem container:

- JDK 21 ou superior;
- Node.js compatível com Vite 8 e npm;
- PostgreSQL 17 acessível ao backend.

O Maven Wrapper está versionado; não é necessário instalar Maven globalmente.

## Configuração

Copie `.env.example` para `.env` apenas no ambiente local e substitua os placeholders. O `.env` real não deve ser versionado.

Variáveis principais:

| Variável | Finalidade |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | Profile Spring, normalmente `dev` localmente ou `prod` em produção |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Conexão direta do backend ao PostgreSQL |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Inicialização do PostgreSQL no Compose |
| `BRAPI_TOKEN` | Token da Brapi |
| `TWELVE_DATA_API_KEY` | Chave da Twelve Data |
| `JWT_SECRET` | Segredo externo de pelo menos 32 bytes para assinatura JWT |
| `JWT_ISSUER` | Emissor obrigatório dos JWTs; padrão local `gestao-acoes` |
| `JWT_EXPIRATION_MINUTES` | Duração do access token em minutos |
| `APP_ADMIN_USERNAME`, `APP_ADMIN_PASSWORD` | Bootstrap opcional do ADMIN no profile `dev`; username representa um e-mail válido |
| `CORS_ALLOWED_ORIGINS` | Origens permitidas, separadas por vírgula; `*` não é aceito |
| `SWAGGER_ENABLED` | Habilita Swagger no profile `prod`; padrão seguro `false` |
| `APP_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT` | Portas publicadas pelo Compose |

Não reutilize os placeholders do exemplo em produção e nunca coloque segredos em `application.yml`, código-fonte ou documentação.

## Execução com Docker Compose

### 1. Pré-requisitos

Instale o Docker Desktop no Windows ou macOS. No Linux, instale o Docker Engine e o plugin Docker Compose. Confirme a instalação:

```bash
docker --version
docker compose version
```

### 2. Entrar na raiz do projeto

Execute todos os comandos Docker na raiz deste repositório, na pasta que contém o arquivo `compose.yaml`.

### 3. Criar e configurar o `.env`

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

No Linux ou macOS:

```bash
cp .env.example .env
```

Preencha o `.env` com valores próprios para as variáveis existentes em `.env.example`, incluindo credenciais do PostgreSQL, chaves das APIs externas, segredo JWT, portas e origens CORS. Não coloque segredos no README e nunca envie o arquivo `.env` ao GitHub.

### 4. Subir o projeto

```bash
docker compose up -d --build
```

O comando constrói e inicia o PostgreSQL 17, o backend Spring Boot/Java 21 e o frontend React/Vite servido pelo Nginx. Na primeira execução, downloads de imagens, dependências e builds podem levar alguns minutos.

### 5. Conferir os containers

```bash
docker compose ps
```

Resultado esperado:

- `postgres`: `healthy`;
- `aplicacao`: `healthy`;
- `frontend`: `up`.

### 6. Acompanhar os logs do backend

```bash
docker compose logs -f aplicacao
```

Pressione `Ctrl+C` para encerrar somente o acompanhamento dos logs. Os containers continuarão em execução.

### 7. Verificar o health check

Abra http://localhost:8080/actuator/health ou execute no PowerShell:

```powershell
Invoke-RestMethod http://localhost:8080/actuator/health
```

O resultado esperado contém `status` igual a `UP`.

### 8. Acessar o sistema

| Serviço | URL |
| --- | --- |
| Frontend React/Nginx | http://localhost:5173 |
| Backend Spring Boot | http://localhost:8080 |
| Swagger UI (`dev`; `prod` quando habilitado) | http://localhost:8080/swagger-ui/index.html |

Frontend e backend são publicados em portas diferentes. O Compose usa o profile `dev` por padrão, no qual Swagger UI e OpenAPI ficam habilitados. No profile `prod`, ambos dependem de `SWAGGER_ENABLED=true` e permanecem desabilitados por padrão.

### 9. Operação do dia a dia

Parar os containers sem removê-los:

```bash
docker compose stop
```

Retomar os containers parados:

```bash
docker compose start
```

Remover os containers e a rede, mantendo o volume e os dados do PostgreSQL:

```bash
docker compose down
```

Reconstruir e iniciar todo o ambiente:

```bash
docker compose up -d --build
```

Reconstruir o backend:

```bash
docker compose up -d --build aplicacao
```

Reconstruir o frontend:

```bash
docker compose up -d --build frontend
```

Consultar os logs de cada serviço:

```bash
docker compose logs aplicacao
docker compose logs frontend
docker compose logs postgres
```

### 10. Atenção com os dados do banco

Os comandos abaixo removem também o volume persistente do PostgreSQL e podem apagar os dados armazenados:

```bash
docker compose down -v
docker compose down --volumes
```

> ⚠️ Não utilize `docker compose down -v` se quiser preservar os dados do banco.

### 11. Executar somente o PostgreSQL

Para iniciar apenas o banco, por exemplo quando o backend for executado pelo IntelliJ:

```bash
docker compose up -d postgres
```

Fora da rede interna do Docker, conecte o backend ao PostgreSQL por `localhost` e pela porta definida em `POSTGRES_PORT`. O hostname `postgres` é o nome do serviço dentro da rede do Compose e não deve ser usado pelo backend executado diretamente no computador host.

### 12. Acesso pela rede local

No Windows, execute `ipconfig` e identifique o endereço IPv4 atual do computador host. Não fixe esse endereço na documentação, pois ele pode mudar.

Para acessar o sistema por outro dispositivo da rede:

- libere as portas `5173` e `8080` no firewall do computador host;
- configure `CORS_ALLOWED_ORIGINS` no `.env` com a origem exata do frontend, por exemplo `http://<IP_DO_HOST>:5173`;
- configure `VITE_API_URL=http://<IP_DO_HOST>:8080` no ambiente de build do frontend;
- reconstrua o frontend com `docker compose up -d --build frontend` após alterar `VITE_API_URL`.

`VITE_API_URL` é incorporada ao bundle durante o build do Vite. Não basta reiniciar o container depois de alterar esse valor, e o backend não deve usar uma origem CORS genérica com `*`.

## Backend sem Docker

Com PostgreSQL disponível, configure `SPRING_PROFILES_ACTIVE=dev`, `DB_PASSWORD`, `BRAPI_TOKEN`, `TWELVE_DATA_API_KEY` e `JWT_SECRET`. `DB_URL`, `DB_USERNAME`, `JWT_EXPIRATION_MINUTES` e `CORS_ALLOWED_ORIGINS` possuem configurações locais ajustáveis.

Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

Linux/macOS:

```bash
./mvnw spring-boot:run
```

O Spring Boot não lê `.env` automaticamente quando executado diretamente; exporte as variáveis no terminal ou configure-as na IDE.

## Frontend em desenvolvimento

```bash
cd front-carteira
npm install
npm run dev
```

`VITE_API_URL` pode apontar para outra URL do backend. Sem configuração, o frontend usa `http://localhost:8080`.

## Autenticação e isolamento

Crie uma conta pela tela `/cadastro` ou por `POST /auth/register`. Cadastro e login devolvem um access token JWT; o frontend o mantém somente na sessão do navegador. Não há refresh token nem logout server-side.

Todas as APIs de ações, corretoras e carteira exigem `Authorization: Bearer <token>`. Ações e corretoras são referências globais. Posições, transações, histórico, resumo e resultados pertencem ao usuário obtido do JWT/SecurityContext. A API nunca aceita `usuarioId` do cliente para escolher o proprietário da carteira.

O cadastro público sempre cria perfil `USER`. Operações HTTP `DELETE` de negócio exigem
`ROLE_ADMIN`; atualmente a operação disponível é `DELETE /corretoras/{id}`. As permissões
efetivas são recarregadas do banco em cada requisição e não dependem exclusivamente da claim
informativa `authorities` presente no JWT.

Registros financeiros anteriores ao isolamento permanecem no banco com `usuario_id NULL`, não foram atribuídos automaticamente e não aparecem nas consultas autenticadas.

## Regras financeiras

- compra: preço médio ponderado pela quantidade;
- venda parcial: o preço médio da posição restante não muda;
- resultado realizado: `(preço de venda - preço médio anterior) × quantidade vendida`;
- resultado não realizado: `valor atual - valor investido`;
- rentabilidade: `(resultado não realizado × 100) / valor investido`, retornando zero quando o valor investido é zero;
- rentabilidade realizada de uma venda: `(preço de venda - preço médio anterior) × 100 / preço médio anterior`;
- valores BRL e USD são resumidos separadamente e não são somados entre moedas.

## APIs externas

| Provedor | Uso | Credencial |
| --- | --- | --- |
| ViaCEP | endereço por CEP | não exige |
| BrasilAPI | CNPJ e situação de corretora na CVM | não exige |
| Brapi | ações e cotações brasileiras | `BRAPI_TOKEN` |
| Twelve Data | ações e cotações norte-americanas | `TWELVE_DATA_API_KEY` |

Falhas externas são convertidas em Problem Details seguros, sem refletir URLs, tokens ou detalhes internos.

## Banco e migrations

O Liquibase executa os changeSets de `src/main/resources/db/changelog`. O profile `dev` pode carregar dados de demonstração pelo contexto `demo`; `prod` não carrega esse seed. O Hibernate usa `ddl-auto=validate` e não substitui as migrations.

## OpenAPI e observabilidade

O Swagger declara autenticação HTTP Bearer JWT e oferece o botão **Authorize**. `/auth/register` e `/auth/login` continuam públicos. Os profiles `dev` e `test` habilitam Swagger UI e OpenAPI. No profile `prod`, ambos seguem `SWAGGER_ENABLED` e ficam desabilitados por padrão.

- `GET /actuator/health`: público, retorna apenas o estado geral;
- `GET /actuator/info`: exige autenticação e fornece metadados mínimos;
- outros endpoints Actuator não são expostos e são negados pela segurança;
- toda resposta recebe `X-Request-Id`;
- cada requisição gera um log com request ID, método, path sem query string, status e duração.

Authorization, JWT, cookies, senhas, corpos de autenticação e segredos não são registrados.

## Testes

Backend, com JDK 21:

```powershell
.\mvnw.cmd test
```

No Windows, a validação completa limpa os artefatos anteriores, executa a suíte e aplica o portão JaCoCo:

```powershell
.\mvnw.cmd clean verify
```

Os testes PostgreSQL usam Testcontainers e, portanto, exigem o Docker Desktop (ou outro daemon Docker compatível) em execução. Os limites mínimos versionados são 80% de linhas e 61% de ramos. Após o `verify`, abra o relatório HTML no Windows com:

```powershell
Start-Process .\target\site\jacoco\index.html
```

```bash
./mvnw test
```

A suíte inclui testes unitários, HTTP, migrations, segurança, isolamento multiusuário e PostgreSQL real via Testcontainers.

Frontend:

```bash
cd front-carteira
npm test
npm run lint
npm run build
```

## Estrutura principal

```text
src/main/java/...        controllers, services, repositories, segurança e integrações
src/main/resources/      configurações e changelogs Liquibase
src/test/                testes backend e Testcontainers
front-carteira/          frontend React/Vite
docs/                    arquitetura e referência da API
graphify-out/            artefato gerado localmente pelo Graphify e ignorado pelo Git
compose.yaml             stack local PostgreSQL, backend e frontend
```

## Limitações atuais

O sistema não implementa impostos, taxas, dividendos/proventos, conversão cambial, refresh token, recuperação de senha, MFA, revogação antecipada de JWT, auditoria completa de banco ou tracing distribuído. A disponibilidade e os limites dos provedores externos também afetam atualizações cadastrais e de cotação.
