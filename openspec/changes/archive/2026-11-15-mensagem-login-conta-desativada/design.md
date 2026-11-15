# Design

## Contexto

Consulte `proposal.md` para a motivação. Hoje o `AuthenticationManager` usa o `UsuarioDetailsService`, cujo principal retorna `ativo` em `isEnabled()`. O provedor padrão do Spring rejeita uma conta inativa antes da comparação BCrypt, e `AutenticacaoService` converte toda `AuthenticationException` em credenciais inválidas. O frontend também transforma qualquer `401` do login em mensagem genérica.

## Objetivos / Não objetivos

**Objetivos:**

- Validar BCrypt antes de revelar o estado inativo.
- Manter resposta indistinguível entre e-mail inexistente, senha errada de conta ativa e senha errada de conta inativa.
- Fornecer contrato estável por status, `type` e `codigo`, sem depender de texto.
- Preservar a segunda validação do Spring Security para contas ativas e impedir emissão/uso de JWT por contas desativadas.

**Não objetivos:**

- Alterar cadastro, redefinição de senha, RBAC, formato do JWT, migrations ou dados.
- Desabilitar verificações globais de estado do Spring Security.
- Modificar telas além do tratamento de erro no login.

## Decisões

### 1. Pré-validar a credencial no serviço e manter o AuthenticationManager para contas ativas

O serviço buscará o e-mail normalizado e executará `PasswordEncoder.matches` antes de consultar `ativo`. E-mail inexistente executará a mesma operação BCrypt contra um hash sintético criado na inicialização, reduzindo diferença temporal e mantendo a resposta genérica. Senha incorreta sempre produzirá `CredenciaisInvalidasException`, inclusive para conta inativa.

Somente após senha válida a conta inativa produzirá `ContaDesativadaException`. Contas ativas continuarão passando pelo `AuthenticationManager`, preservando as verificações do Spring. Essa segunda etapa também impede JWT caso a conta seja desativada concorrentemente entre a pré-validação e a autenticação.

Alternativa descartada: desabilitar `isEnabled()` no principal ou no provedor, pois enfraqueceria globalmente o filtro JWT e outras autenticações. Alternativa descartada: emitir JWT diretamente após BCrypt, pois eliminaria a validação redundante do Spring para contas ativas.

### 2. Usar Problem Details tipado

`ContaDesativadaException` será tratada como `403 Forbidden`, com `type` `https://gestao-acoes.com/erros/conta-desativada`, propriedade `codigo` igual a `CONTA_DESATIVADA` e detalhe amigável. Credenciais inválidas permanecem `401` e usam o tipo genérico atual. O frontend selecionará a mensagem pelo `type`, não por texto de exceção.

### 3. Preservar armazenamento de sessão somente após sucesso

O serviço frontend continuará retornando dados somente quando houver token e usuário. O `AuthProvider` só grava o token após `autenticar` resolver com sucesso; erros tipados ou genéricos não passam por `aplicarAutenticacao`.

## Riscos / Trade-offs

- [BCrypt é executado duas vezes em login ativo bem-sucedido] → aceitar o custo limitado para preservar as verificações do `AuthenticationManager`; medir pelos testes e não alterar o fator de custo.
- [Diferença temporal pode permitir enumeração] → executar BCrypt também para e-mail inexistente e nunca distinguir senha errada de conta ativa/inativa.
- [Desativação concorrente após a primeira leitura] → manter a autenticação final pelo Spring e a validação de `isEnabled()` no filtro JWT.
- [Frontend usar texto acidentalmente] → testar o roteamento pelo `type` estável e manter mensagem genérica para os demais erros.

## Plano de migração

1. Adicionar exceção e resposta HTTP tipada.
2. Ajustar o fluxo de login e seus testes de integração.
3. Ajustar exclusivamente a mensagem de erro da tela de login e testes frontend.
4. Executar verificações completas, sincronizar a baseline e reconstruir apenas aplicação/frontend.
5. Em rollback, reverter código, testes e spec; não há migração de dados.
