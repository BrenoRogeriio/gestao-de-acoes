package com.jeferson.gestaoacoes.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jeferson.gestaoacoes.model.PerfilUsuario;
import com.jeferson.gestaoacoes.model.Usuario;
import com.jeferson.gestaoacoes.repository.UsuarioRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Date;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AutenticacaoIntegrationTest {

    private static final String ISSUER_TESTE = "gestao-acoes";
    private static final String SENHA = "senha-segura-123";
    private static final String SEGREDO_TESTE = "test-only-jwt-secret-with-at-least-32-bytes-long";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void limparUsuarios() {
        usuarioRepository.deleteAll();
    }

    @Test
    void deveCadastrarNormalizarEmailEArmazenarSenhaComBCrypt() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cadastroJson("  USUARIO@Example.COM  ")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", startsWith("eyJ")))
                .andExpect(jsonPath("$.tipo").value("Bearer"))
                .andExpect(jsonPath("$.usuario.email").value("usuario@example.com"))
                .andExpect(jsonPath("$.usuario.perfil").value("USER"));

        Usuario salvo = usuarioRepository.findByEmail("usuario@example.com").orElseThrow();
        assertFalse(SENHA.equals(salvo.getSenhaHash()));
        assertTrue(salvo.getSenhaHash().matches("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}"));
        assertTrue(passwordEncoder.matches(SENHA, salvo.getSenhaHash()));
        assertEquals(PerfilUsuario.USER, salvo.getPerfil());
        assertTrue(salvo.isAtivo());
    }

    @Test
    void cadastroPublicoDeveIgnorarPerfilEnviadoPeloCliente() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Usuario","email":"usuario@example.com",
                                 "senha":"senha-segura-123","perfil":"ADMIN","ativo":false}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario.perfil").value("USER"));

        Usuario salvo = usuarioRepository.findByEmail("usuario@example.com").orElseThrow();
        assertEquals(PerfilUsuario.USER, salvo.getPerfil());
        assertTrue(salvo.isAtivo());
    }

    @Test
    void deveRejeitarEmailDuplicado() throws Exception {
        cadastrarUsuario();

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cadastroJson("USUARIO@EXAMPLE.COM")))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("E-mail já cadastrado."));
    }

    @Test
    void deveRejeitarCadastroInvalido() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"\",\"email\":\"invalido\",\"senha\":\"curta\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros.nome").isString())
                .andExpect(jsonPath("$.erros.email").isString())
                .andExpect(jsonPath("$.erros.senha").isString());
    }

    @Test
    void deveAutenticarCredenciaisValidas() throws Exception {
        cadastrarUsuario();

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(" USUARIO@example.com ", SENHA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", startsWith("eyJ")))
                .andExpect(jsonPath("$.usuario.email").value("usuario@example.com"));
    }

    @Test
    void senhaIncorretaDeveRetornar401Generico() throws Exception {
        cadastrarUsuario();

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("usuario@example.com", "senha-incorreta")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("E-mail ou senha inválidos."));
    }

    @Test
    void usuarioInexistenteDeveRetornarMesmaRespostaGenerica() throws Exception {
        cadastrarUsuario();

        String detalheSenhaIncorreta = detalheLogin("usuario@example.com", "senha-incorreta");
        String detalheUsuarioInexistente = detalheLogin("inexistente@example.com", SENHA);

        assertEquals(detalheSenhaIncorreta, detalheUsuarioInexistente);
        assertEquals("E-mail ou senha inválidos.", detalheUsuarioInexistente);
    }

    @Test
    void usuarioInativoNaoDeveAutenticar() throws Exception {
        Usuario usuario = novoUsuario("inativo@example.com", false);
        usuarioRepository.saveAndFlush(usuario);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("inativo@example.com", SENHA)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("E-mail ou senha inválidos."));
    }

    @Test
    void endpointsProtegidosSemTokenDevemRetornarProblemDetail401() throws Exception {
        for (String rota : new String[]{"/acoes", "/corretoras", "/carteira/posicao", "/auth/me"}) {
            mockMvc.perform(get(rota))
                    .andExpect(status().isUnauthorized())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.title").value("Não autorizado"))
                    .andExpect(header().string("X-Content-Type-Options", "nosniff"));
        }
    }

    @Test
    void rotaNaoListadaDeveSerNegadaPorPadrao() throws Exception {
        mockMvc.perform(get("/rota-nao-publica"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void corsDeveContinuarAceitandoAuthorizationEIdempotencyKey() throws Exception {
        mockMvc.perform(options("/carteira/comprar")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS,
                                "Content-Type, Authorization, Idempotency-Key"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN,
                        "http://localhost:5173"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,
                        org.hamcrest.Matchers.containsString("Authorization")))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,
                        org.hamcrest.Matchers.containsString("Idempotency-Key")));
    }

    @Test
    void jwtValidoDevePermitirEndpointProtegido() throws Exception {
        String token = cadastrarEObterToken();

        var resultado = mockMvc.perform(get("/acoes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andReturn();

        assertNull(resultado.getRequest().getSession(false));
    }

    @Test
    void jwtInvalidoDeveRetornar401SemVazarToken() throws Exception {
        mockMvc.perform(get("/acoes").header(HttpHeaders.AUTHORIZATION, "Bearer token-invalido"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Autenticação ausente ou inválida."))
                .andExpect(content().string(not(org.hamcrest.Matchers.containsString("token-invalido"))));
    }

    @Test
    void jwtExpiradoDeveRetornar401() throws Exception {
        Usuario usuario = usuarioRepository.saveAndFlush(novoUsuario("usuario@example.com", true));
        Instant agora = Instant.now();
        String tokenExpirado = Jwts.builder()
                .issuer(ISSUER_TESTE)
                .subject(usuario.getEmail())
                .issuedAt(Date.from(agora.minusSeconds(120)))
                .expiration(Date.from(agora.minusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(SEGREDO_TESTE.getBytes(StandardCharsets.UTF_8)), Jwts.SIG.HS256)
                .compact();

        mockMvc.perform(get("/acoes").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenExpirado))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void jwtSemIssuerDeveRetornar401() throws Exception {
        Usuario usuario = usuarioRepository.saveAndFlush(novoUsuario("usuario@example.com", true));
        Instant agora = Instant.now();
        String tokenSemIssuer = Jwts.builder()
                .subject(usuario.getEmail())
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(SEGREDO_TESTE.getBytes(StandardCharsets.UTF_8)), Jwts.SIG.HS256)
                .compact();

        mockMvc.perform(get("/acoes").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenSemIssuer))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void jwtComIssuerIncorretoDeveRetornar401() throws Exception {
        Usuario usuario = usuarioRepository.saveAndFlush(novoUsuario("usuario@example.com", true));
        Instant agora = Instant.now();
        String tokenComIssuerIncorreto = Jwts.builder()
                .issuer("outro-issuer")
                .subject(usuario.getEmail())
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(SEGREDO_TESTE.getBytes(StandardCharsets.UTF_8)), Jwts.SIG.HS256)
                .compact();

        mockMvc.perform(get("/acoes").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenComIssuerIncorreto))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void jwtAssinadoComOutraChaveDeveRetornarProblemDetail401() throws Exception {
        Usuario usuario = usuarioRepository.saveAndFlush(novoUsuario("usuario@example.com", true));
        Instant agora = Instant.now();
        String tokenComOutraChave = Jwts.builder()
                .issuer(ISSUER_TESTE)
                .subject(usuario.getEmail())
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(
                        "another-test-only-secret-with-at-least-32-bytes".getBytes(StandardCharsets.UTF_8)),
                        Jwts.SIG.HS256)
                .compact();

        mockMvc.perform(get("/acoes").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenComOutraChave))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Autenticação ausente ou inválida."));
    }

    @Test
    void tokenDeUsuarioDesativadoDeveSerRejeitado() throws Exception {
        String token = cadastrarEObterToken();
        Usuario usuario = usuarioRepository.findByEmail("usuario@example.com").orElseThrow();
        usuario.setAtivo(false);
        usuarioRepository.saveAndFlush(usuario);

        mockMvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void authMeDeveRetornarUsuarioDoToken() throws Exception {
        String token = cadastrarEObterToken();

        mockMvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Usuario Teste"))
                .andExpect(jsonPath("$.email").value("usuario@example.com"))
                .andExpect(jsonPath("$.perfil").value("USER"));
    }

    @Test
    void respostasNuncaDevemExporSenhaOuHash() throws Exception {
        String cadastro = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cadastroJson("usuario@example.com")))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        JsonNode json = objectMapper.readTree(cadastro);
        String token = json.get("token").asText();
        String login = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("usuario@example.com", SENHA)))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String me = mockMvc.perform(get("/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        for (String resposta : new String[]{cadastro, login, me}) {
            assertFalse(resposta.contains("senha"));
            assertFalse(resposta.contains("hash"));
            assertFalse(resposta.contains(SENHA));
        }
    }

    private void cadastrarUsuario() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cadastroJson("usuario@example.com")))
                .andExpect(status().isCreated());
    }

    private String cadastrarEObterToken() throws Exception {
        String resposta = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cadastroJson("usuario@example.com")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(resposta).get("token").asText();
    }

    private String detalheLogin(String email, String senha) throws Exception {
        String resposta = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(email, senha)))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(resposta).get("detail").asText();
    }

    private Usuario novoUsuario(String email, boolean ativo) {
        Usuario usuario = new Usuario();
        usuario.setNome("Usuario Teste");
        usuario.setEmail(email);
        usuario.setSenhaHash(passwordEncoder.encode(SENHA));
        usuario.setPerfil(PerfilUsuario.USER);
        usuario.setAtivo(ativo);
        usuario.setDataHoraCadastro(OffsetDateTime.now(ZoneOffset.UTC));
        return usuario;
    }

    private String cadastroJson(String email) {
        return """
                {"nome":"Usuario Teste","email":"%s","senha":"%s"}
                """.formatted(email, SENHA);
    }

    private String loginJson(String email, String senha) {
        return """
                {"email":"%s","senha":"%s"}
                """.formatted(email, senha);
    }
}
