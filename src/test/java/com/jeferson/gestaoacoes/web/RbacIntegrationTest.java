package com.jeferson.gestaoacoes.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jeferson.gestaoacoes.infrastructure.client.BrapiClient;
import com.jeferson.gestaoacoes.infrastructure.client.BrapiResponse;
import com.jeferson.gestaoacoes.infrastructure.client.BrapiResult;
import com.jeferson.gestaoacoes.infrastructure.client.BrasilApiClient;
import com.jeferson.gestaoacoes.infrastructure.client.BrasilApiCnpjResponse;
import com.jeferson.gestaoacoes.infrastructure.client.BrasilApiCvmResponse;
import com.jeferson.gestaoacoes.infrastructure.client.TwelveDataClient;
import com.jeferson.gestaoacoes.infrastructure.client.ViaCepClient;
import com.jeferson.gestaoacoes.infrastructure.client.ViaCepResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:rbac;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000")
@AutoConfigureMockMvc
class RbacIntegrationTest {

    private static final String SENHA = "senha-segura-123";
    private static final String EMAIL_USER = "user.rbac@example.com";
    private static final String EMAIL_ADMIN = "admin.rbac@example.com";
    private static final String CNPJ = "02332886000104";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JdbcTemplate jdbc;

    @MockBean private BrapiClient brapiClient;
    @MockBean private TwelveDataClient twelveDataClient;
    @MockBean private BrasilApiClient brasilApiClient;
    @MockBean private ViaCepClient viaCepClient;

    private String tokenUser;
    private String tokenAdmin;

    @BeforeEach
    void prepararCenario() throws Exception {
        jdbc.update("DELETE FROM transacoes");
        jdbc.update("DELETE FROM posicoes");
        jdbc.update("DELETE FROM acoes");
        jdbc.update("DELETE FROM corretoras");
        jdbc.update("DELETE FROM usuarios");

        when(brapiClient.consultarCotacao(anyString(), anyString())).thenAnswer(invocacao -> {
            String ticker = invocacao.getArgument(0);
            return new BrapiResponse(List.of(new BrapiResult(
                    ticker, "Empresa RBAC", "BRL", new BigDecimal("25.0000"),
                    "2026-10-31T12:00:00Z")));
        });
        when(brasilApiClient.consultarCnpj(CNPJ)).thenReturn(new BrasilApiCnpjResponse(
                CNPJ, "Corretora RBAC SA", "Corretora RBAC", "ATIVA"));
        when(brasilApiClient.validarCorretoraCvm(CNPJ)).thenReturn(new BrasilApiCvmResponse(
                CNPJ, "EM FUNCIONAMENTO NORMAL", "CORRETORA", "12345"));
        when(viaCepClient.consultarCep("01001000")).thenReturn(new ViaCepResponse(
                "01001-000", "Praca da Se", "", "Se", "Sao Paulo", "SP", false));

        tokenUser = cadastrarEObterToken("Usuario RBAC", EMAIL_USER);
        cadastrarEObterToken("Admin RBAC", EMAIL_ADMIN);
        jdbc.update("UPDATE usuarios SET perfil = 'ADMIN' WHERE email = ?", EMAIL_ADMIN);
        tokenAdmin = autenticarEObterToken(EMAIL_ADMIN);
    }

    @Test
    void endpointAdministrativoSemTokenDeveRetornar401() throws Exception {
        mockMvc.perform(post("/acoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(acaoJson("SEMT3")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void userCadastrandoAcaoDeveRetornar403SemChamarProvedor() throws Exception {
        mockMvc.perform(post("/acoes")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(acaoJson("USER3")))
                .andExpect(status().isForbidden());

        verify(brapiClient, never()).consultarCotacao(anyString(), anyString());
        assertEquals(0, contar("SELECT COUNT(*) FROM acoes"));
    }

    @Test
    void adminCadastrandoAcaoDeveRetornar201() throws Exception {
        mockMvc.perform(post("/acoes")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(acaoJson("ADM3")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ticker").value("ADM3"));

        assertEquals(1, contar("SELECT COUNT(*) FROM acoes WHERE ticker = 'ADM3'"));
    }

    @Test
    void userCadastrandoCorretoraDeveRetornar403SemChamarProvedores() throws Exception {
        mockMvc.perform(post("/corretoras")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corretoraJson()))
                .andExpect(status().isForbidden());

        verify(brasilApiClient, never()).consultarCnpj(anyString());
        verify(viaCepClient, never()).consultarCep(anyString());
        assertEquals(0, contar("SELECT COUNT(*) FROM corretoras"));
    }

    @Test
    void adminCadastrandoCorretoraDeveRetornar201() throws Exception {
        mockMvc.perform(post("/corretoras")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corretoraJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cnpj").value(CNPJ));

        assertEquals(1, contar("SELECT COUNT(*) FROM corretoras WHERE cnpj = ?", CNPJ));
    }

    @Test
    void userAtualizandoCotacaoDeveRetornar403SemChamarProvedor() throws Exception {
        Long acaoId = inserirAcao("COT3", "10.0000");

        mockMvc.perform(put("/acoes/{id}/atualizar-cotacao", acaoId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenUser)))
                .andExpect(status().isForbidden());

        verify(brapiClient, never()).consultarCotacao(anyString(), anyString());
        assertEquals(0, new BigDecimal("10.0000").compareTo(cotacao(acaoId)));
    }

    @Test
    void adminAtualizandoCotacaoDeveRetornar200ComProvedorSimulado() throws Exception {
        Long acaoId = inserirAcao("COT3", "10.0000");

        mockMvc.perform(put("/acoes/{id}/atualizar-cotacao", acaoId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cotacaoAtual").value(25.0));

        assertEquals(0, new BigDecimal("25.0000").compareTo(cotacao(acaoId)));
    }

    @Test
    void userEAdminPodemConsultarCadastrosGlobaisEProprioPerfil() throws Exception {
        for (String token : new String[]{tokenUser, tokenAdmin}) {
            mockMvc.perform(get("/acoes").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                    .andExpect(status().isOk());
            mockMvc.perform(get("/corretoras").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                    .andExpect(status().isOk());
            mockMvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                    .andExpect(status().isOk());
        }
    }

    private String cadastrarEObterToken(String nome, String email) throws Exception {
        String resposta = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"%s","email":"%s","senha":"%s"}
                                """.formatted(nome, email, SENHA)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario.perfil").value("USER"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(resposta).get("token").asText();
    }

    private String autenticarEObterToken(String email) throws Exception {
        String resposta = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","senha":"%s"}
                                """.formatted(email, SENHA)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(resposta).get("token").asText();
    }

    private Long inserirAcao(String ticker, String cotacao) {
        jdbc.update("""
                INSERT INTO acoes (ticker, nome_empresa, mercado, moeda, cotacao_atual,
                                   data_hora_cotacao, provedor_origem)
                VALUES (?, 'Empresa RBAC', 'BRASIL', 'BRL', ?, CURRENT_TIMESTAMP, 'teste')
                """, ticker, cotacao);
        return jdbc.queryForObject("SELECT id FROM acoes WHERE ticker = ?", Long.class, ticker);
    }

    private BigDecimal cotacao(Long acaoId) {
        return jdbc.queryForObject("SELECT cotacao_atual FROM acoes WHERE id = ?", BigDecimal.class, acaoId);
    }

    private int contar(String sql, Object... parametros) {
        return jdbc.queryForObject(sql, Integer.class, parametros);
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String acaoJson(String ticker) {
        return """
                {"ticker":"%s","mercado":"BRASIL"}
                """.formatted(ticker);
    }

    private String corretoraJson() {
        return """
                {"cnpj":"%s","cep":"01001000","numero":"100"}
                """.formatted(CNPJ);
    }
}
