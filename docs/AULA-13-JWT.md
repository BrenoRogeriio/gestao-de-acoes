# Aula 13 — Login e proteção da API com JWT

## Resumo

O Gestão de Ações usa Spring Security em modo stateless, usuários persistidos no PostgreSQL,
senhas protegidas por BCrypt e access tokens JWT assinados com HS256. O cadastro público cria
somente usuários `USER`; o perfil `ADMIN` pode ser criado pelo bootstrap controlado do profile
`dev`. As rotas de negócio exigem autenticação e as operações HTTP `DELETE` exigem
`ROLE_ADMIN`.

O frontend usa o perfil retornado pela API para adaptar a interface, mas isso é apenas uma
conveniência visual. A proteção efetiva permanece no backend.

## Autenticação e autorização

- **Autenticação** responde quem fez a requisição. Login, senha e validação do JWT pertencem a
  essa etapa. Falhas produzem HTTP `401 Unauthorized`.
- **Autorização** decide o que um usuário já autenticado pode fazer. Um `USER` autenticado que
  tenta excluir uma corretora falha nessa etapa e recebe HTTP `403 Forbidden`.

O JWT contém uma claim informativa `authorities`, porém ela não é a fonte efetiva das
permissões. Em cada requisição autenticada, o filtro JWT extrai o e-mail e o usuário é
recarregado do banco. Assim, perfil e estado ativo atuais no PostgreSQL controlam a autorização.

## Senhas e BCrypt

A senha recebida no cadastro nunca é persistida em texto puro. O `PasswordEncoder` usa
`BCryptPasswordEncoder`, que gera um hash unidirecional com salt próprio. No login, o Spring
Security compara a senha apresentada com o hash armazenado; não existe operação para recuperar
a senha original.

Respostas de cadastro, login e `GET /auth/me` não retornam senha nem hash.

## Fluxo de autenticação

1. O cliente envia `email` e `senha` para `POST /auth/login`.
2. O backend normaliza o e-mail e valida as credenciais BCrypt e o estado ativo do usuário.
3. Em caso de sucesso, retorna um JWT e o objeto público do usuário.
4. O cliente envia o token nas rotas protegidas:

   ```http
   Authorization: Bearer <JWT>
   ```

5. O backend valida assinatura, issuer e expiração, extrai o `sub`, recarrega o usuário do banco
   e monta o `SecurityContext` sem criar sessão HTTP.
6. A regra de autorização da rota é aplicada. Para `DELETE` de negócio, o perfil atual precisa
   produzir `ROLE_ADMIN`.

## Estrutura do JWT

O token é assinado com **HS256** e contém:

| Claim | Conteúdo |
|---|---|
| `iss` | Emissor configurado por `JWT_ISSUER`; padrão local `gestao-acoes` |
| `sub` | E-mail usado como identificador de autenticação |
| `iat` | Instante de emissão |
| `exp` | Instante de expiração |
| `authorities` | Lista informativa, como `ROLE_USER` ou `ROLE_ADMIN` |

A assinatura usa `JWT_SECRET`, que deve ter pelo menos 32 bytes. Tokens sem issuer, com issuer
incorreto, assinatura adulterada ou expiração vencida são rejeitados.

JWT é codificado, não criptografado. Seu payload pode ser lido por quem obtiver o token; por isso
ele não deve conter senha, hash, segredo de assinatura, token de provedor, credencial de banco ou
outra informação sigilosa.

## Perfis e DELETE administrativo

- `USER`: perfil atribuído exclusivamente pelo cadastro público. Pode usar as operações normais
  autenticadas da aplicação.
- `ADMIN`: perfil administrativo. Pode executar operações HTTP `DELETE` de negócio.

Atualmente o único endpoint `DELETE` implementado é `DELETE /corretoras/{id}`. A restrição a
ADMIN reduz o risco de remoção acidental de cadastros globais. A regra de integridade continua
ativa: uma corretora com transações vinculadas não é removida e retorna `409 Conflict`.

Resultados relevantes:

| Situação | Status |
|---|---|
| Sem token, token inválido ou expirado | `401` |
| `USER` autenticado tentando excluir | `403` |
| `ADMIN` excluindo corretora livre | `204` |
| `ADMIN` informando ID inexistente | `404` |
| `ADMIN` excluindo corretora em uso | `409` |

## Usuário autenticado

`GET /auth/me` exige Bearer JWT e retorna o usuário atualmente autenticado:

```json
{
  "id": 1,
  "nome": "Nome do usuário",
  "email": "usuario@example.com",
  "perfil": "USER",
  "dataHoraCadastro": "2026-10-30T12:00:00Z"
}
```

O endpoint não recebe `usuarioId` e não retorna senha ou hash. O frontend o utiliza para restaurar
e revalidar a sessão, inclusive após uma resposta `403`.

## Configuração por ambiente

| Variável | Uso |
|---|---|
| `JWT_SECRET` | Segredo de assinatura HS256, obrigatório e com pelo menos 32 bytes |
| `JWT_ISSUER` | Emissor obrigatório; padrão do projeto: `gestao-acoes` |
| `JWT_EXPIRATION_MINUTES` | Duração do access token; deve ser maior que zero |
| `APP_ADMIN_USERNAME` | E-mail do administrador inicial no profile `dev` |
| `APP_ADMIN_PASSWORD` | Senha do administrador inicial no profile `dev` |
| `SPRING_PROFILES_ACTIVE` | Seleciona o profile; o bootstrap existe somente em `dev` |

Segredos devem ser fornecidos pelo ambiente ou pelo `.env` local ignorado pelo Git. Não coloque
valores reais em YAML, documentação, coleção Postman, logs ou commits.

## Administrador inicial no profile dev

O `AdministradorInicializador` é um `ApplicationRunner` com `@Profile("dev")` e roda depois da
inicialização da aplicação e do Liquibase. Seu comportamento é:

- sem as duas variáveis, não cria conta nem gera credenciais padrão;
- com apenas uma variável, encerra a inicialização com erro de configuração claro;
- `APP_ADMIN_USERNAME` deve ser um e-mail válido, pois o sistema autentica por e-mail;
- a senha deve ter 12 a 72 caracteres, sem espaços, com maiúscula, minúscula, número e caractere
  especial;
- a senha é codificada com o mesmo BCrypt da autenticação;
- a conta criada fica ativa e com perfil `ADMIN`;
- se o e-mail já existir, nenhuma senha ou perfil é alterado e nenhum `USER` é promovido.

Em profiles diferentes de `dev`, o inicializador não é registrado.

## Teste manual com Postman

Arquivos importáveis:

- `docs/postman/Gestao-Acoes-Aula-13.postman_collection.json`;
- `docs/postman/Gestao-Acoes-Aula-13.postman_environment.json`.

Procedimento recomendado:

1. Use uma instância local ou outro ambiente isolado; não experimente no PostgreSQL
   compartilhado.
2. Importe a coleção e o ambiente e selecione o ambiente.
3. Preencha localmente `userEmail`, `userPassword`, `adminEmail` e `adminPassword`.
4. Execute **Cadastro de USER** se a conta ainda não existir.
5. Execute **Login de USER** e **Login de ADMIN**. Os scripts salvam `userToken` e `adminToken`.
6. Execute `GET /auth/me`, a consulta autenticada e os cenários `401`/`403`.
7. Para o `409`, informe em `corretoraEmUsoId` uma corretora que possua transações e defina
   `confirmDeleteTests` como `SIM` somente durante o teste no ambiente isolado.
8. Para o `404`, mantenha `corretoraInexistenteId` apontando para um ID sabidamente inexistente.

O teste `204` é destrutivo e possui uma trava. Para preparar uma corretora descartável, use
somente um banco isolado e envie `POST /corretoras` com um JWT válido e o contrato real:

```json
{
  "cnpj": "<CNPJ válido de corretora ativa, com 14 dígitos>",
  "cep": "<CEP válido, com 8 dígitos>",
  "numero": "<opcional>",
  "complemento": null,
  "email": null,
  "telefone": null
}
```

O cadastro consulta ViaCEP e BrasilAPI/CVM, portanto os dados precisam existir nos provedores e o
CNPJ não pode estar cadastrado nesse banco. Não registre compras ou vendas usando essa corretora.
Copie o `id` da resposta `201` para `corretoraLivreId` e defina `confirmDelete` como `SIM` somente
imediatamente antes de enviar manualmente o DELETE. Depois, limpe ambas as variáveis e também
`confirmDeleteTests`. A coleção não cria nem exclui corretoras automaticamente.

Para testar expiração sem conhecer o segredo, use um ambiente isolado com
`JWT_EXPIRATION_MINUTES=1`, reinicie a aplicação, faça login, aguarde o vencimento e copie o token
para `expiredToken`. Restaure a configuração normal depois do teste. Nunca coloque esse token em
arquivo versionado.

## Testes automatizados

Backend com JDK 21:

```powershell
.\mvnw.cmd test
```

Linux/macOS:

```bash
./mvnw test
```

A suíte cobre BCrypt, cadastro público `USER`, login válido e inválido, endpoint sem token, JWT
válido, inválido, expirado, issuer e assinatura, `/auth/me`, `USER` bloqueado no DELETE e ADMIN
nos cenários `204`, `404` e `409`. Os testes de exclusão usam banco H2 isolado; testes que exigem
PostgreSQL usam Testcontainers.

Frontend:

```bash
cd front-carteira
npm test
npm run lint
npm run build
```

## Limitações atuais

- O access token expira e precisa de novo login; não há refresh token.
- Não existe blacklist nem revogação server-side individual de tokens antes da expiração.
- O logout remove o token no cliente, mas não invalida uma cópia já emitida no servidor.
- Não há rotação automática de segredo, múltiplas chaves (`kid`), MFA, recuperação de senha ou
  gestão pública de administradores.
- Alterar perfil ou desativar um usuário passa a valer nas requisições seguintes porque o banco é
  consultado, mas o JWT emitido permanece estruturalmente válido até `exp`.
