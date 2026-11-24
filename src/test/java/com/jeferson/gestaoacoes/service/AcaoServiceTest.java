package com.jeferson.gestaoacoes.service;

import com.jeferson.gestaoacoes.dto.AcaoRequestDTO;
import com.jeferson.gestaoacoes.exception.ProvedorExternoIndisponivelException;
import com.jeferson.gestaoacoes.exception.RegraNegocioException;
import com.jeferson.gestaoacoes.exception.RespostaExternaInvalidaException;
import com.jeferson.gestaoacoes.infrastructure.client.BrapiClient;
import com.jeferson.gestaoacoes.infrastructure.client.BrapiResponse;
import com.jeferson.gestaoacoes.infrastructure.client.BrapiResult;
import com.jeferson.gestaoacoes.infrastructure.client.TwelveDataClient;
import com.jeferson.gestaoacoes.infrastructure.client.TwelveDataResponse;
import com.jeferson.gestaoacoes.mapper.AcaoMapper;
import com.jeferson.gestaoacoes.model.Acao;
import com.jeferson.gestaoacoes.model.Mercado;
import com.jeferson.gestaoacoes.model.Moeda;
import com.jeferson.gestaoacoes.repository.AcaoRepository;
import feign.FeignException;
import feign.Request;
import feign.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AcaoServiceTest {

    @Mock
    private AcaoRepository repository;

    @Mock
    private AcaoMapper mapper;

    @Mock
    private BrapiClient brapiClient;

    @Mock
    private TwelveDataClient twelveDataClient;

    @InjectMocks
    private AcaoService acaoService;

    @BeforeEach
    void configurarTokens() {
        ReflectionTestUtils.setField(acaoService, "brapiToken", "");
        ReflectionTestUtils.setField(acaoService, "twelveDataApiKey", "");
    }

    @Test
    void deveLancarExcecaoQuandoAcaoJaExistir() {
        // GIVEN (Dado que...)
        AcaoRequestDTO dto = new AcaoRequestDTO("PETR4", Mercado.BRASIL);

        // Simulamos que o banco de dados vai responder "true" para a verificação de existência
        when(repository.existsByTickerAndMercado("PETR4", Mercado.BRASIL)).thenReturn(true);

        // WHEN & THEN (Quando tentarmos cadastrar, Então deve dar erro)
        RegraNegocioException exception = assertThrows(RegraNegocioException.class, () -> {
            acaoService.cadastrar(dto);
        });

        // Verificamos se a mensagem de erro é exatamente a que definimos na Regra de Negócio
        assertEquals("Ação já cadastrada para este mercado.", exception.getMessage());

        // Garantimos que nenhuma API externa foi chamada por acidente
        verifyNoInteractions(brapiClient, twelveDataClient);
    }

    @Test
    void deveCadastrarAcaoBrasileiraComDadosSemanticosValidosETimestampUtc() {
        when(brapiClient.consultarCotacao("PETR4", "")).thenReturn(brapi(
                "PETR4", "PETROBRAS PN", "BRL", new BigDecimal("36.65"), "2026-02-08T13:24:54-03:00"));
        when(repository.save(any())).thenAnswer(invocacao -> invocacao.getArgument(0));

        acaoService.cadastrar(new AcaoRequestDTO(" petr4 ", Mercado.BRASIL));

        ArgumentCaptor<Acao> captor = ArgumentCaptor.forClass(Acao.class);
        verify(repository).save(captor.capture());
        Acao acao = captor.getValue();
        assertEquals("PETR4", acao.getTicker());
        assertEquals(Moeda.BRL, acao.getMoeda());
        assertEquals(new BigDecimal("36.65"), acao.getCotacaoAtual());
        assertEquals(OffsetDateTime.parse("2026-02-08T16:24:54Z"), acao.getDataHoraCotacao());
    }

    @Test
    void deveTratarRespostaBrapiNulaComoInvalida() {
        when(brapiClient.consultarCotacao("PETR4", "")).thenReturn(null);
        assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarBrasil("PETR4"));
    }

    @Test
    void deveTratarResultadoBrapiVazioComoTickerInexistente() {
        when(brapiClient.consultarCotacao("PETR4", "")).thenReturn(new BrapiResponse(List.of()));
        assertThrows(RegraNegocioException.class, () -> cadastrarBrasil("PETR4"));
    }

    @Test
    void deveRejeitarCotacaoBrapiNula() {
        when(brapiClient.consultarCotacao("PETR4", ""))
                .thenReturn(brapi("PETR4", "PETROBRAS", "BRL", null, null));
        assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarBrasil("PETR4"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-0.01"})
    void deveRejeitarCotacaoBrapiNaoPositiva(String valor) {
        when(brapiClient.consultarCotacao("PETR4", ""))
                .thenReturn(brapi("PETR4", "PETROBRAS", "BRL", new BigDecimal(valor), null));
        assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarBrasil("PETR4"));
    }

    @Test
    void deveRejeitarTickerBrapiDiferente() {
        when(brapiClient.consultarCotacao("PETR4", ""))
                .thenReturn(brapi("VALE3", "VALE", "BRL", BigDecimal.TEN, null));
        assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarBrasil("PETR4"));
    }

    @Test
    void deveRejeitarMoedaBrapiIncompativel() {
        when(brapiClient.consultarCotacao("PETR4", ""))
                .thenReturn(brapi("PETR4", "PETROBRAS", "USD", BigDecimal.TEN, null));
        assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarBrasil("PETR4"));
    }

    @Test
    void deveRejeitarNomeAusenteNaBrapi() {
        when(brapiClient.consultarCotacao("PETR4", ""))
                .thenReturn(brapi("PETR4", " ", "BRL", BigDecimal.TEN, null));
        assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarBrasil("PETR4"));
    }

    @Test
    void devePreservarIndisponibilidadeDaBrapi() {
        when(brapiClient.consultarCotacao("PETR4", "")).thenThrow(feignException(503));
        assertThrows(ProvedorExternoIndisponivelException.class, () -> cadastrarBrasil("PETR4"));
        verify(repository, never()).save(any());
    }

    @Test
    void deveCadastrarAcaoAmericanaComFiltroDePaisETimestampUnixUtc() {
        when(twelveDataClient.consultarCotacao("AAPL", "United States", ""))
                .thenReturn(twelve("AAPL", "Apple Inc", "USD", new BigDecimal("187.38"), 1768204680L));
        when(repository.save(any())).thenAnswer(invocacao -> invocacao.getArgument(0));

        acaoService.cadastrar(new AcaoRequestDTO("aapl", Mercado.ESTADOS_UNIDOS));

        ArgumentCaptor<Acao> captor = ArgumentCaptor.forClass(Acao.class);
        verify(repository).save(captor.capture());
        assertEquals(Moeda.USD, captor.getValue().getMoeda());
        assertEquals(OffsetDateTime.ofInstant(
                java.time.Instant.ofEpochSecond(1768204680L), ZoneOffset.UTC),
                captor.getValue().getDataHoraCotacao());
    }

    @Test
    void deveTratarErroHttp200DaTwelveDataComoTickerInexistente() {
        when(twelveDataClient.consultarCotacao("INVALID", "United States", ""))
                .thenReturn(new TwelveDataResponse(
                        null, null, null, null, null, null, 400, "Invalid symbol", "error"));
        assertThrows(RegraNegocioException.class, () -> cadastrarEstadosUnidos("INVALID"));
    }

    @Test
    void deveTratarRespostaTwelveDataNulaComoInvalida() {
        when(twelveDataClient.consultarCotacao("AAPL", "United States", "")).thenReturn(null);
        assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarEstadosUnidos("AAPL"));
    }

    @Test
    void deveRejeitarPrecoAusenteNaTwelveData() {
        when(twelveDataClient.consultarCotacao("AAPL", "United States", ""))
                .thenReturn(twelve("AAPL", "Apple Inc", "USD", null, null));
        assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarEstadosUnidos("AAPL"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1"})
    void deveRejeitarPrecoTwelveDataNaoPositivo(String valor) {
        when(twelveDataClient.consultarCotacao("AAPL", "United States", ""))
                .thenReturn(twelve("AAPL", "Apple Inc", "USD", new BigDecimal(valor), null));
        assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarEstadosUnidos("AAPL"));
    }

    @Test
    void deveRejeitarSimboloTwelveDataIncompativel() {
        when(twelveDataClient.consultarCotacao("AAPL", "United States", ""))
                .thenReturn(twelve("MSFT", "Microsoft", "USD", BigDecimal.TEN, null));
        assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarEstadosUnidos("AAPL"));
    }

    @Test
    void deveRejeitarMoedaTwelveDataIncompativel() {
        when(twelveDataClient.consultarCotacao("AAPL", "United States", ""))
                .thenReturn(twelve("AAPL", "Apple Inc", "EUR", BigDecimal.TEN, null));
        assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarEstadosUnidos("AAPL"));
    }

    @Test
    void deveRejeitarNomeAusenteNaTwelveData() {
        when(twelveDataClient.consultarCotacao("AAPL", "United States", ""))
                .thenReturn(twelve("AAPL", " ", "USD", BigDecimal.TEN, null));
        assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarEstadosUnidos("AAPL"));
    }

    @Test
    void devePreservarIndisponibilidadeDaTwelveData() {
        when(twelveDataClient.consultarCotacao("AAPL", "United States", ""))
                .thenThrow(feignException(503));
        assertThrows(ProvedorExternoIndisponivelException.class, () -> cadastrarEstadosUnidos("AAPL"));
    }

    @ParameterizedTest
    @CsvSource({"404, ", "400, symbol not found", "400, NO DATA"})
    void erroDeSimboloImpedeCadastro(int codigo, String mensagem) {
        when(twelveDataClient.consultarCotacao("AAPL", "United States", ""))
                .thenReturn(new TwelveDataResponse(null, null, null, null, null, null, codigo, mensagem, null));

        var erro = assertThrows(RegraNegocioException.class, () -> cadastrarEstadosUnidos("AAPL"));

        assertEquals("Ticker não encontrado no mercado americano (Twelve Data).", erro.getMessage());
        verify(repository, never()).save(any());
    }

    @ParameterizedTest
    @CsvSource({"400, , erro sem mensagem", "429, rate limit, rate limit"})
    void preservaDiagnosticoDaRejeicaoDoProvedor(int codigo, String mensagem, String diagnostico) {
        when(twelveDataClient.consultarCotacao("AAPL", "United States", ""))
                .thenReturn(new TwelveDataResponse(null, null, null, null, null, null, codigo, mensagem, null));

        var erro = assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarEstadosUnidos("AAPL"));

        assertEquals("A Twelve Data rejeitou a consulta: " + diagnostico, erro.getMessage());
        verify(repository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(longs = {-1L, 0L, Long.MAX_VALUE})
    void rejeitaTimestampInvalidoAntesDeSalvar(long timestamp) {
        when(twelveDataClient.consultarCotacao("AAPL", "United States", ""))
                .thenReturn(twelve("AAPL", "Apple", "USD", BigDecimal.TEN, timestamp));

        var erro = assertThrows(RespostaExternaInvalidaException.class, () -> cadastrarEstadosUnidos("AAPL"));

        assertEquals("A Twelve Data retornou um timestamp inválido.", erro.getMessage());
        verify(repository, never()).save(any());
    }

    private void cadastrarBrasil(String ticker) {
        acaoService.cadastrar(new AcaoRequestDTO(ticker, Mercado.BRASIL));
    }

    private void cadastrarEstadosUnidos(String ticker) {
        acaoService.cadastrar(new AcaoRequestDTO(ticker, Mercado.ESTADOS_UNIDOS));
    }

    private static BrapiResponse brapi(
            String symbol, String name, String currency, BigDecimal price, String timestamp) {
        return new BrapiResponse(List.of(new BrapiResult(symbol, name, currency, price, timestamp)));
    }

    private static TwelveDataResponse twelve(
            String symbol, String name, String currency, BigDecimal price, Long timestamp) {
        return new TwelveDataResponse(
                symbol, name, currency, price, timestamp, "NASDAQ", null, null, null);
    }

    private static FeignException feignException(int status) {
        Request request = Request.create(
                Request.HttpMethod.GET, "/teste", Map.of(), null, StandardCharsets.UTF_8, null);
        Response response = Response.builder().status(status).reason("teste")
                .request(request).headers(Map.of()).build();
        return FeignException.errorStatus("teste", response);
    }
}
