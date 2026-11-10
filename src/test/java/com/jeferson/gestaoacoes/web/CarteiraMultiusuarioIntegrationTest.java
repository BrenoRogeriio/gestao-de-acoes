package com.jeferson.gestaoacoes.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:carteira-multiusuario;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000")
@AutoConfigureMockMvc
class CarteiraMultiusuarioIntegrationTest {

    private static final String SENHA = "senha-segura-123";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private JdbcTemplate jdbc;

    private Long acaoBrlId;
    private Long acaoUsdId;
    private Long corretoraId;
    private String tokenA;
    private String tokenB;

    @BeforeEach
    void prepararCenario() throws Exception {
        jdbc.update("DELETE FROM transacoes");
        jdbc.update("DELETE FROM posicoes");
        jdbc.update("DELETE FROM acoes");
        jdbc.update("DELETE FROM corretoras");
        jdbc.update("DELETE FROM usuarios");

        jdbc.update("""
                INSERT INTO corretoras (cnpj, razao_social, cep, logradouro, bairro, cidade, uf,
                                         situacao_cadastral, status_cvm, data_hora_cadastro)
                VALUES ('02332886000104', 'Corretora compartilhada', '04538133', 'Rua do teste',
                        'Bairro', 'Sao Paulo', 'SP', 'ATIVA', 'REGULAR', CURRENT_TIMESTAMP)
                """);
        corretoraId = jdbc.queryForObject("SELECT id FROM corretoras", Long.class);
        acaoBrlId = inserirAcao("MULT3", "BRASIL", "BRL", "12.0000");
        acaoUsdId = inserirAcao("MULTUSD", "ESTADOS_UNIDOS", "USD", "25.0000");
        tokenA = cadastrar("a@example.com", "Usuario A");
        cadastrar("b@example.com", "Administrador B");
        jdbc.update("UPDATE usuarios SET perfil = 'ADMIN' WHERE email = 'b@example.com'");
        tokenB = autenticar("b@example.com");
    }

    @Test
    void usuariosNovosComecamVaziosERegistrosLegadosPermanecemInvisiveis() throws Exception {
        inserirLegado();

        for (String token : new String[]{tokenA, tokenB}) {
            assertEquals(0, consultar("/carteira/posicao", token).size());
            assertEquals(0, consultar("/carteira/historico", token).size());
            assertEquals(0, consultar("/carteira/resumo", token).size());
        }

        assertEquals(1, contar("SELECT COUNT(*) FROM posicoes WHERE usuario_id IS NULL"));
        assertEquals(1, contar("SELECT COUNT(*) FROM transacoes WHERE usuario_id IS NULL"));
    }

    @Test
    void compraEVendaUsamSomenteAPosicaoDoUsuarioAutenticado() throws Exception {
        comprar(tokenA, acaoBrlId, 10, "10.0000", "chave-compartilhada");

        assertEquals(10, consultar("/carteira/posicao", tokenA).get(0).get("quantidade").asInt());
        assertEquals(1, consultar("/carteira/historico", tokenA).size());
        assertEquals(0, consultar("/carteira/posicao", tokenB).size());
        assertEquals(0, consultar("/carteira/historico", tokenB).size());

        vender(tokenB, acaoBrlId, 1, "12.0000", "venda-sem-saldo", 422);
        assertEquals(10, consultar("/carteira/posicao", tokenA).get(0).get("quantidade").asInt());

        comprar(tokenB, acaoBrlId, 5, "11.0000", "chave-compartilhada");
        vender(tokenA, acaoBrlId, 4, "12.0000", "venda-a", 200);

        assertEquals(6, consultar("/carteira/posicao", tokenA).get(0).get("quantidade").asInt());
        assertEquals(5, consultar("/carteira/posicao", tokenB).get(0).get("quantidade").asInt());
        assertEquals(2, consultar("/carteira/historico", tokenA).size());
        assertEquals(1, consultar("/carteira/historico", tokenB).size());
        assertEquals(0, new BigDecimal("8.0000").compareTo(
                consultar("/carteira/historico", tokenA).get(0).get("resultadoRealizado").decimalValue()));
        assertTrue(consultar("/carteira/historico", tokenB).get(0).get("resultadoRealizado").isNull());
    }

    @Test
    void resumoEResultadosSaoIsoladosTambémPorMoeda() throws Exception {
        comprar(tokenA, acaoBrlId, 10, "10.0000", "a-brl");
        comprar(tokenA, acaoUsdId, 2, "20.0000", "a-usd");
        vender(tokenA, acaoBrlId, 2, "12.0000", "a-venda", 200);
        comprar(tokenB, acaoBrlId, 3, "11.0000", "b-brl");

        JsonNode resumoA = consultar("/carteira/resumo", tokenA);
        JsonNode resumoB = consultar("/carteira/resumo", tokenB);
        assertEquals(2, resumoA.size());
        assertEquals(1, resumoB.size());
        assertEquals("BRL", resumoB.get(0).get("moeda").asText());
        assertEquals(0, resumoB.get(0).get("resultadoRealizadoTotal").decimalValue().signum());
        assertEquals(0, resumoPorMoeda(resumoA, "BRL").get("resultadoRealizadoTotal")
                .decimalValue().compareTo(new BigDecimal("4.0000")));
        assertEquals("USD", resumoPorMoeda(resumoA, "USD").get("moeda").asText());
    }

    @Test
    void idempotenciaEhMantidaPorUsuarioENaoGlobalmente() throws Exception {
        comprar(tokenA, acaoBrlId, 2, "10.0000", "mesma-chave");
        comprar(tokenA, acaoBrlId, 2, "10.0000", "mesma-chave");
        vender(tokenA, acaoBrlId, 1, "12.0000", "mesma-chave", 422);
        comprar(tokenB, acaoBrlId, 3, "11.0000", "mesma-chave");

        Long usuarioA = usuarioId("a@example.com");
        Long usuarioB = usuarioId("b@example.com");
        assertEquals(1, contar("SELECT COUNT(*) FROM transacoes WHERE usuario_id = ? AND idempotency_key = 'mesma-chave'", usuarioA));
        assertEquals(1, contar("SELECT COUNT(*) FROM transacoes WHERE usuario_id = ? AND idempotency_key = 'mesma-chave'", usuarioB));
        assertEquals(2, contar("SELECT COUNT(*) FROM transacoes WHERE idempotency_key = 'mesma-chave'"));
    }

    @Test
    void userEAdminCompramEVendemSomenteNasPropriasCarteiras() throws Exception {
        comprar(tokenA, acaoBrlId, 3, "10.0000", "user-compra");
        vender(tokenA, acaoBrlId, 1, "12.0000", "user-venda", 200);
        comprar(tokenB, acaoBrlId, 4, "11.0000", "admin-compra");
        vender(tokenB, acaoBrlId, 2, "13.0000", "admin-venda", 200);

        assertEquals(2, consultar("/carteira/posicao", tokenA).get(0).get("quantidade").asInt());
        assertEquals(2, consultar("/carteira/posicao", tokenB).get(0).get("quantidade").asInt());
        assertEquals(2, consultar("/carteira/historico", tokenA).size());
        assertEquals(2, consultar("/carteira/historico", tokenB).size());

        Long usuarioA = usuarioId("a@example.com");
        Long usuarioB = usuarioId("b@example.com");
        assertEquals(2, contar("SELECT COUNT(*) FROM transacoes WHERE usuario_id = ?", usuarioA));
        assertEquals(2, contar("SELECT COUNT(*) FROM transacoes WHERE usuario_id = ?", usuarioB));
        assertEquals(1, contar("SELECT COUNT(*) FROM posicoes WHERE usuario_id = ?", usuarioA));
        assertEquals(1, contar("SELECT COUNT(*) FROM posicoes WHERE usuario_id = ?", usuarioB));
    }

    private String cadastrar(String email, String nome) throws Exception {
        String resposta = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"%s","email":"%s","senha":"%s"}
                                """.formatted(nome, email, SENHA)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(resposta).get("token").asText();
    }

    private String autenticar(String email) throws Exception {
        String resposta = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","senha":"%s"}
                                """.formatted(email, SENHA)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(resposta).get("token").asText();
    }

    private void comprar(String token, Long acaoId, int quantidade, String valor, String chave) throws Exception {
        operar("/carteira/comprar", token, acaoId, quantidade, valor, chave, 200);
    }

    private void vender(String token, Long acaoId, int quantidade, String valor, String chave, int statusEsperado) throws Exception {
        operar("/carteira/vender", token, acaoId, quantidade, valor, chave, statusEsperado);
    }

    private void operar(String endpoint, String token, Long acaoId, int quantidade, String valor,
                        String chave, int statusEsperado) throws Exception {
        mockMvc.perform(post(endpoint)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .header("Idempotency-Key", chave)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"acaoId":%d,"corretoraId":%d,"quantidade":%d,"valorUnitario":%s}
                                """.formatted(acaoId, corretoraId, quantidade, valor)))
                .andExpect(status().is(statusEsperado));
    }

    private JsonNode consultar(String endpoint, String token) throws Exception {
        String resposta = mockMvc.perform(get(endpoint)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(resposta);
    }

    private JsonNode resumoPorMoeda(JsonNode resumo, String moeda) {
        for (JsonNode item : resumo) {
            if (moeda.equals(item.get("moeda").asText())) {
                return item;
            }
        }
        throw new AssertionError("Resumo ausente para a moeda " + moeda);
    }

    private Long inserirAcao(String ticker, String mercado, String moeda, String cotacao) {
        jdbc.update("""
                INSERT INTO acoes (ticker, nome_empresa, mercado, moeda, cotacao_atual,
                                   data_hora_cotacao, provedor_origem)
                VALUES (?, 'Empresa', ?, ?, ?, CURRENT_TIMESTAMP, 'teste')
                """, ticker, mercado, moeda, cotacao);
        return jdbc.queryForObject("SELECT id FROM acoes WHERE ticker = ?", Long.class, ticker);
    }

    private void inserirLegado() {
        jdbc.update("INSERT INTO posicoes (acao_id, quantidade, preco_medio) VALUES (?, 99, 1.0000)", acaoBrlId);
        jdbc.update("""
                INSERT INTO transacoes (acao_id, corretora_id, tipo_transacao, quantidade,
                                        valor_unitario, resultado_realizado, data_hora_transacao)
                VALUES (?, ?, 'VENDA', 99, 2.0000, 99.0000, CURRENT_TIMESTAMP)
                """, acaoBrlId, corretoraId);
    }

    private Long usuarioId(String email) {
        return jdbc.queryForObject("SELECT id FROM usuarios WHERE email = ?", Long.class, email);
    }

    private int contar(String sql, Object... parametros) {
        return jdbc.queryForObject(sql, Integer.class, parametros);
    }
}
