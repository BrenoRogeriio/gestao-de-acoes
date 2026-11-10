package com.jeferson.gestaoacoes.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jeferson.gestaoacoes.exception.RegraNegocioException;
import com.jeferson.gestaoacoes.model.PerfilUsuario;
import com.jeferson.gestaoacoes.model.Usuario;
import com.jeferson.gestaoacoes.repository.UsuarioRepository;
import com.jeferson.gestaoacoes.security.UsuarioPrincipal;
import com.jeferson.gestaoacoes.service.AdminUsuarioService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:admin-usuarios;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000")
@AutoConfigureMockMvc
class AdminUsuarioIntegrationTest {

    private static final String SENHA = "senha-segura-123";
    private static final String NOVA_SENHA = "nova-senha-segura-456";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AdminUsuarioService adminUsuarioService;
    @Autowired private JdbcTemplate jdbc;

    private Usuario administrador;
    private String tokenAdmin;

    @BeforeEach
    void prepararCenario() throws Exception {
        jdbc.update("DELETE FROM transacoes");
        jdbc.update("DELETE FROM posicoes");
        jdbc.update("DELETE FROM acoes");
        jdbc.update("DELETE FROM corretoras");
        jdbc.update("DELETE FROM usuarios");
        administrador = salvarUsuario("Administrador", "admin.usuarios@example.com", PerfilUsuario.ADMIN, true);
        tokenAdmin = autenticar("admin.usuarios@example.com", SENHA, 200);
    }

    @AfterEach
    void limparContextoSeguranca() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void adminDeveCriarUserPorPadraoComSenhaBCryptESemExporHash() throws Exception {
        String resposta = mockMvc.perform(post("/admin/usuarios")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(criacaoJson("Novo User", " NOVO.USER@Example.com ", null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Novo User"))
                .andExpect(jsonPath("$.email").value("novo.user@example.com"))
                .andExpect(jsonPath("$.perfil").value("USER"))
                .andExpect(jsonPath("$.ativo").value(true))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        Usuario salvo = usuarioRepository.findByEmail("novo.user@example.com").orElseThrow();
        assertTrue(passwordEncoder.matches(SENHA, salvo.getSenhaHash()));
        assertTrue(salvo.getSenhaHash().matches("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}"));
        assertSemSenhaOuHash(resposta);
    }

    @Test
    void adminDeveCriarOutroAdmin() throws Exception {
        mockMvc.perform(post("/admin/usuarios")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(criacaoJson("Novo Admin", "novo.admin@example.com", "ADMIN")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.perfil").value("ADMIN"));

        assertEquals(PerfilUsuario.ADMIN,
                usuarioRepository.findByEmail("novo.admin@example.com").orElseThrow().getPerfil());
    }

    @Test
    void adminDeveListarEConsultarUsuariosSemDadosSensiveis() throws Exception {
        Usuario user = salvarUsuario("Usuario", "user@example.com", PerfilUsuario.USER, true);

        String lista = mockMvc.perform(get("/admin/usuarios")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String consulta = mockMvc.perform(get("/admin/usuarios/{id}", user.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId()))
                .andExpect(jsonPath("$.email").value("user@example.com"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertSemSenhaOuHash(lista);
        assertSemSenhaOuHash(consulta);
    }

    @Test
    void consultaDeUsuarioInexistenteDeveRetornar404() throws Exception {
        mockMvc.perform(get("/admin/usuarios/{id}", 999999)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
                .andExpect(status().isNotFound());
    }

    @Test
    void userDeveReceber403EmTodosOsEndpointsAdministrativos() throws Exception {
        Usuario user = salvarUsuario("User", "user.negado@example.com", PerfilUsuario.USER, true);
        String tokenUser = autenticar(user.getEmail(), SENHA, 200);

        for (MockHttpServletRequestBuilder requisicao : requisicoesAdministrativas(user.getId())) {
            mockMvc.perform(requisicao.header(HttpHeaders.AUTHORIZATION, bearer(tokenUser)))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void requisicaoSemJwtDeveReceber401EmTodosOsEndpointsAdministrativos() throws Exception {
        for (MockHttpServletRequestBuilder requisicao : requisicoesAdministrativas(administrador.getId())) {
            mockMvc.perform(requisicao).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void preflightPatchAdministrativoDeveSerPublicoEAutorizarOrigemEHeaders() throws Exception {
        mockMvc.perform(options("/admin/usuarios/{id}/perfil", administrador.getId())
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "PATCH")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS,
                                "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN,
                        "http://localhost:5173"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS,
                        containsString("PATCH")))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,
                        containsString("authorization")))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,
                        containsString("content-type")));
    }

    @Test
    void emailDuplicadoDeveRetornar409EPerfilInvalidoDeveRetornar400() throws Exception {
        mockMvc.perform(post("/admin/usuarios")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(criacaoJson("Duplicado", administrador.getEmail().toUpperCase(), "USER")))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/admin/usuarios")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(criacaoJson("Perfil Invalido", "perfil@example.com", "SUPERADMIN")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void dtoAdministrativoDeveRejeitarCamposExtras() throws Exception {
        mockMvc.perform(post("/admin/usuarios")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Campo Extra","email":"extra@example.com",
                                 "senha":"senha-segura-123","perfil":"USER","ativo":false}
                                """))
                .andExpect(status().isBadRequest());

        assertTrue(usuarioRepository.findByEmail("extra@example.com").isEmpty());
    }

    @Test
    void devePromoverUserEDesrebaixarOutroAdmin() throws Exception {
        Usuario user = salvarUsuario("User", "promover@example.com", PerfilUsuario.USER, true);
        Usuario outroAdmin = salvarUsuario("Outro Admin", "rebaixar@example.com", PerfilUsuario.ADMIN, true);

        mockMvc.perform(patch("/admin/usuarios/{id}/perfil", user.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"perfil\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("ADMIN"));
        mockMvc.perform(patch("/admin/usuarios/{id}/perfil", outroAdmin.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"perfil\":\"USER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("USER"));
    }

    @Test
    void deveAtivarEDesativarUsuario() throws Exception {
        Usuario user = salvarUsuario("User", "status@example.com", PerfilUsuario.USER, true);

        alterarStatus(user.getId(), false, 200);
        assertFalse(usuarioRepository.findById(user.getId()).orElseThrow().isAtivo());
        alterarStatus(user.getId(), true, 200);
        assertTrue(usuarioRepository.findById(user.getId()).orElseThrow().isAtivo());
    }

    @Test
    void ultimoAdminNaoPodeSerDesativadoNemRebaixadoMesmoForaDoController() {
        autenticarContextoComoAdminExterno();

        RegraNegocioException desativacao = assertThrows(RegraNegocioException.class,
                () -> adminUsuarioService.alterarStatus(administrador.getId(), false));
        RegraNegocioException rebaixamento = assertThrows(RegraNegocioException.class,
                () -> adminUsuarioService.alterarPerfil(administrador.getId(), PerfilUsuario.USER));

        assertTrue(desativacao.getMessage().contains("último administrador ativo"));
        assertTrue(rebaixamento.getMessage().contains("último administrador ativo"));
        Usuario preservado = usuarioRepository.findById(administrador.getId()).orElseThrow();
        assertTrue(preservado.isAtivo());
        assertEquals(PerfilUsuario.ADMIN, preservado.getPerfil());
    }

    @Test
    void rebaixamentosConcorrentesDevemPreservarUmAdminAtivo() throws Exception {
        Usuario segundoAdmin = salvarUsuario(
                "Segundo Admin", "segundo.concorrente@example.com", PerfilUsuario.ADMIN, true);
        CountDownLatch prontas = new CountDownLatch(2);
        CountDownLatch iniciar = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<Throwable> primeira = executor.submit(rebaixarConcorrentemente(
                    administrador, segundoAdmin.getId(), prontas, iniciar));
            Future<Throwable> segunda = executor.submit(rebaixarConcorrentemente(
                    segundoAdmin, administrador.getId(), prontas, iniciar));
            assertTrue(prontas.await(5, TimeUnit.SECONDS));
            iniciar.countDown();

            List<Throwable> resultados = Arrays.asList(
                    primeira.get(15, TimeUnit.SECONDS), segunda.get(15, TimeUnit.SECONDS));
            assertEquals(1, resultados.stream().filter(resultado -> resultado == null).count());
            assertEquals(1, resultados.stream().filter(RegraNegocioException.class::isInstance).count());
            assertEquals(1, contar("SELECT COUNT(*) FROM usuarios WHERE perfil = 'ADMIN' AND ativo = TRUE"));
        } finally {
            iniciar.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void administradorNaoPodeDesativarNemRebaixarAPropriaConta() throws Exception {
        alterarStatus(administrador.getId(), false, 422);
        mockMvc.perform(patch("/admin/usuarios/{id}/perfil", administrador.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"perfil\":\"USER\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void redefinicaoDeSenhaDevePermitirNovaSenhaERejeitarAntigaSemExporHash() throws Exception {
        Usuario user = salvarUsuario("User", "senha@example.com", PerfilUsuario.USER, true);

        String resposta = mockMvc.perform(put("/admin/usuarios/{id}/senha", user.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"novaSenha\":\"" + NOVA_SENHA + "\"}"))
                .andExpect(status().isNoContent())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        autenticar(user.getEmail(), SENHA, 401);
        autenticar(user.getEmail(), NOVA_SENHA, 200);
        assertTrue(passwordEncoder.matches(NOVA_SENHA,
                usuarioRepository.findById(user.getId()).orElseThrow().getSenhaHash()));
        assertSemSenhaOuHash(resposta);
    }

    @Test
    void tokenEmitidoAntesDaTrocaDeSenhaContinuaValidoConformeArquiteturaAtual() throws Exception {
        Usuario user = salvarUsuario("User", "token.senha@example.com", PerfilUsuario.USER, true);
        String tokenAnterior = autenticar(user.getEmail(), SENHA, 200);

        mockMvc.perform(put("/admin/usuarios/{id}/senha", user.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"novaSenha\":\"" + NOVA_SENHA + "\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(tokenAnterior)))
                .andExpect(status().isOk());
    }

    @Test
    void perfilDoBancoDeveValerImediatamenteEClaimDoTokenSerApenasInformativa() throws Exception {
        Usuario user = salvarUsuario("User", "claim@example.com", PerfilUsuario.USER, true);
        String tokenComoUser = autenticar(user.getEmail(), SENHA, 200);

        mockMvc.perform(patch("/admin/usuarios/{id}/perfil", user.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"perfil\":\"ADMIN\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/admin/usuarios").header(HttpHeaders.AUTHORIZATION, bearer(tokenComoUser)))
                .andExpect(status().isOk());
    }

    @Test
    void desativacaoDeveInvalidarTokenEPreservarCarteiraEHistorico() throws Exception {
        Usuario user = salvarUsuario("User", "carteira@example.com", PerfilUsuario.USER, true);
        String tokenUser = autenticar(user.getEmail(), SENHA, 200);
        inserirCarteiraEHistorico(user.getId());

        alterarStatus(user.getId(), false, 200);

        mockMvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(tokenUser)))
                .andExpect(status().isUnauthorized());
        assertEquals(1, contar("SELECT COUNT(*) FROM posicoes WHERE usuario_id = ?", user.getId()));
        assertEquals(1, contar("SELECT COUNT(*) FROM transacoes WHERE usuario_id = ?", user.getId()));
    }

    @Test
    void cadastroPublicoDeveContinuarCriandoSomenteUser() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Publico","email":"publico@example.com",
                                 "senha":"senha-segura-123","perfil":"ADMIN","ativo":false}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario.perfil").value("USER"));

        Usuario publico = usuarioRepository.findByEmail("publico@example.com").orElseThrow();
        assertEquals(PerfilUsuario.USER, publico.getPerfil());
        assertTrue(publico.isAtivo());
    }

    private Usuario salvarUsuario(String nome, String email, PerfilUsuario perfil, boolean ativo) {
        Usuario usuario = new Usuario();
        usuario.setNome(nome);
        usuario.setEmail(email);
        usuario.setSenhaHash(passwordEncoder.encode(SENHA));
        usuario.setPerfil(perfil);
        usuario.setAtivo(ativo);
        return usuarioRepository.saveAndFlush(usuario);
    }

    private String autenticar(String email, String senha, int statusEsperado) throws Exception {
        var resultado = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","senha":"%s"}
                                """.formatted(email, senha)))
                .andExpect(status().is(statusEsperado))
                .andReturn();
        if (statusEsperado != 200) {
            return null;
        }
        return objectMapper.readTree(resultado.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .get("token").asText();
    }

    private void alterarStatus(Long id, boolean ativo, int statusEsperado) throws Exception {
        mockMvc.perform(patch("/admin/usuarios/{id}/status", id)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ativo\":" + ativo + "}"))
                .andExpect(status().is(statusEsperado));
    }

    private MockHttpServletRequestBuilder[] requisicoesAdministrativas(Long id) {
        return new MockHttpServletRequestBuilder[]{
                post("/admin/usuarios").contentType(MediaType.APPLICATION_JSON)
                        .content(criacaoJson("Criado", "criado@example.com", "USER")),
                get("/admin/usuarios"),
                get("/admin/usuarios/{id}", id),
                patch("/admin/usuarios/{id}/perfil", id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"perfil\":\"ADMIN\"}"),
                patch("/admin/usuarios/{id}/status", id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ativo\":false}"),
                put("/admin/usuarios/{id}/senha", id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"novaSenha\":\"" + NOVA_SENHA + "\"}")
        };
    }

    private String criacaoJson(String nome, String email, String perfil) {
        String campoPerfil = perfil == null ? "" : ",\"perfil\":\"" + perfil + "\"";
        return """
                {"nome":"%s","email":"%s","senha":"%s"%s}
                """.formatted(nome, email, SENHA, campoPerfil);
    }

    private void autenticarContextoComoAdminExterno() {
        Usuario ator = new Usuario();
        ator.setId(Long.MAX_VALUE);
        ator.setNome("Ator externo");
        ator.setEmail("ator.externo@example.com");
        ator.setSenhaHash(passwordEncoder.encode(SENHA));
        ator.setPerfil(PerfilUsuario.ADMIN);
        ator.setAtivo(true);
        UsuarioPrincipal principal = UsuarioPrincipal.from(ator);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private Callable<Throwable> rebaixarConcorrentemente(Usuario ator, Long alvoId,
                                                          CountDownLatch prontas,
                                                          CountDownLatch iniciar) {
        return () -> {
            UsuarioPrincipal principal = UsuarioPrincipal.from(ator);
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
            prontas.countDown();
            iniciar.await();
            try {
                adminUsuarioService.alterarPerfil(alvoId, PerfilUsuario.USER);
                return null;
            } catch (Throwable throwable) {
                return throwable;
            } finally {
                SecurityContextHolder.clearContext();
            }
        };
    }

    private void inserirCarteiraEHistorico(Long usuarioId) {
        jdbc.update("""
                INSERT INTO acoes (ticker, nome_empresa, mercado, moeda, cotacao_atual,
                                   data_hora_cotacao, provedor_origem)
                VALUES ('HIST3', 'Empresa Historico', 'BRASIL', 'BRL', 10.0000,
                        CURRENT_TIMESTAMP, 'teste')
                """);
        jdbc.update("""
                INSERT INTO corretoras (cnpj, razao_social, cep, logradouro, bairro, cidade, uf,
                                         situacao_cadastral, status_cvm, data_hora_cadastro)
                VALUES ('02332886000104', 'Corretora Historico', '01001000', 'Rua', 'Bairro',
                        'Sao Paulo', 'SP', 'ATIVA', 'REGULAR', CURRENT_TIMESTAMP)
                """);
        Long acaoId = jdbc.queryForObject("SELECT id FROM acoes WHERE ticker = 'HIST3'", Long.class);
        Long corretoraId = jdbc.queryForObject("SELECT id FROM corretoras WHERE cnpj = '02332886000104'", Long.class);
        jdbc.update("INSERT INTO posicoes (usuario_id, acao_id, quantidade, preco_medio) VALUES (?, ?, 2, 10.0000)",
                usuarioId, acaoId);
        jdbc.update("""
                INSERT INTO transacoes (usuario_id, acao_id, corretora_id, tipo_transacao,
                                        quantidade, valor_unitario, data_hora_transacao, idempotency_key)
                VALUES (?, ?, ?, 'COMPRA', 2, 10.0000, CURRENT_TIMESTAMP, 'historico-admin-14c')
                """, usuarioId, acaoId, corretoraId);
    }

    private int contar(String sql, Object... parametros) {
        return jdbc.queryForObject(sql, Integer.class, parametros);
    }

    private void assertSemSenhaOuHash(String resposta) throws Exception {
        JsonNode json = resposta.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(resposta);
        String serializado = json.toString().toLowerCase();
        assertFalse(serializado.contains("senha"));
        assertFalse(serializado.contains("hash"));
        assertFalse(serializado.contains(SENHA));
        assertFalse(serializado.contains(NOVA_SENHA));
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
