package com.jeferson.gestaoacoes.service;

import com.jeferson.gestaoacoes.dto.CorretoraRequestDTO;
import com.jeferson.gestaoacoes.exception.ProvedorExternoIndisponivelException;
import com.jeferson.gestaoacoes.exception.CorretoraEmUsoException;
import com.jeferson.gestaoacoes.exception.RegraNegocioException;
import com.jeferson.gestaoacoes.exception.RespostaExternaInvalidaException;
import com.jeferson.gestaoacoes.infrastructure.client.BrasilApiClient;
import com.jeferson.gestaoacoes.infrastructure.client.BrasilApiCnpjResponse;
import com.jeferson.gestaoacoes.infrastructure.client.BrasilApiCvmResponse;
import com.jeferson.gestaoacoes.infrastructure.client.ViaCepClient;
import com.jeferson.gestaoacoes.infrastructure.client.ViaCepResponse;
import com.jeferson.gestaoacoes.mapper.CorretoraMapper;
import com.jeferson.gestaoacoes.model.Corretora;
import com.jeferson.gestaoacoes.repository.CorretoraRepository;
import com.jeferson.gestaoacoes.repository.TransacaoRepository;
import feign.FeignException;
import feign.Request;
import feign.Response;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CorretoraServiceTest {

    private static final String CNPJ = "02332886000104";
    private static final String CEP = "22440032";

    @Mock private CorretoraRepository repository;
    @Mock private TransacaoRepository transacaoRepository;
    @Mock private CorretoraMapper mapper;
    @Mock private BrasilApiClient brasilApiClient;
    @Mock private ViaCepClient viaCepClient;
    @InjectMocks private CorretoraService service;

    @Test
    void deveExcluirCorretoraSemTransacoes() {
        Corretora corretora = new Corretora();
        corretora.setId(7L);
        when(repository.findById(7L)).thenReturn(Optional.of(corretora));

        service.excluir(7L);

        verify(transacaoRepository).existsByCorretoraId(7L);
        verify(repository).delete(corretora);
    }

    @Test
    void naoDeveExcluirCorretoraComTransacoes() {
        Corretora corretora = new Corretora();
        corretora.setId(7L);
        when(repository.findById(7L)).thenReturn(Optional.of(corretora));
        when(transacaoRepository.existsByCorretoraId(7L)).thenReturn(true);

        CorretoraEmUsoException excecao = assertThrows(CorretoraEmUsoException.class,
                () -> service.excluir(7L));

        assertEquals("Não é possível excluir a corretora porque existem operações vinculadas.",
                excecao.getMessage());
        verify(repository, never()).delete(any());
    }

    @Test
    void deveCadastrarCorretoraComCnpjNormalizadoERespostasValidas() {
        prepararCnpjValido();
        prepararCvmValida(" em   funcionamento normal ");
        prepararCepValido();
        when(repository.save(any())).thenAnswer(invocacao -> invocacao.getArgument(0));

        service.cadastrar(dto("02.332.886/0001-04"));

        ArgumentCaptor<Corretora> captor = ArgumentCaptor.forClass(Corretora.class);
        verify(repository).save(captor.capture());
        assertEquals(CNPJ, captor.getValue().getCnpj());
        assertEquals("XP INVESTIMENTOS CCTVM S.A.", captor.getValue().getRazaoSocial());
        assertEquals("ATIVA", captor.getValue().getSituacaoCadastral());
        assertEquals("em   funcionamento normal", captor.getValue().getStatusCvm());
    }

    @Test
    void deveRejeitarCnpjComChecksumInvalidoAntesDasIntegracoes() {
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dto("02332886000105")));
        verifyNoInteractions(brasilApiClient, viaCepClient);
        verify(repository, never()).save(any());
    }

    @Test
    void deveTratarCnpjInexistenteComoRegraDeNegocio() {
        when(brasilApiClient.consultarCnpj(CNPJ)).thenThrow(feignException(404));
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @Test
    void deveTratarRespostaCnpjNulaComoRespostaExternaInvalida() {
        when(brasilApiClient.consultarCnpj(CNPJ)).thenReturn(null);
        assertThrows(RespostaExternaInvalidaException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @Test
    void deveTratarRespostaCnpjIncompletaComoRespostaExternaInvalida() {
        when(brasilApiClient.consultarCnpj(CNPJ))
                .thenReturn(new BrasilApiCnpjResponse(CNPJ, null, null, "ATIVA"));
        assertThrows(RespostaExternaInvalidaException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @Test
    void deveRejeitarCnpjComSituacaoInativa() {
        when(brasilApiClient.consultarCnpj(CNPJ))
                .thenReturn(new BrasilApiCnpjResponse(CNPJ, "XP", "XP", "BAIXADA"));
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @Test
    void devePreservarIndisponibilidadeNaConsultaCnpj() {
        when(brasilApiClient.consultarCnpj(CNPJ)).thenThrow(feignException(503));
        assertThrows(ProvedorExternoIndisponivelException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @Test
    void deveTratarRegistroCvmInexistenteComoRegraDeNegocio() {
        prepararCnpjValido();
        when(brasilApiClient.validarCorretoraCvm(CNPJ)).thenThrow(feignException(404));
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @Test
    void deveTratarRespostaCvmVaziaComoRespostaExternaInvalida() {
        prepararCnpjValido();
        when(brasilApiClient.validarCorretoraCvm(CNPJ)).thenReturn(null);
        assertThrows(RespostaExternaInvalidaException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @Test
    void deveRejeitarStatusCvmIncompativel() {
        prepararCnpjValido();
        prepararCvmValida("CANCELADA");
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @Test
    void devePreservarIndisponibilidadeNaConsultaCvm() {
        prepararCnpjValido();
        when(brasilApiClient.validarCorretoraCvm(CNPJ)).thenThrow(feignException(503));
        assertThrows(ProvedorExternoIndisponivelException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @Test
    void deveRejeitarCepInexistenteSinalizadoNoCorpo() {
        prepararCnpjValido();
        prepararCvmValida("EM FUNCIONAMENTO NORMAL");
        when(viaCepClient.consultarCep(CEP)).thenReturn(new ViaCepResponse(null, null, null, null, null, null, true));
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @Test
    void deveTratarRespostaCepNulaComoRespostaExternaInvalida() {
        prepararCnpjValido();
        prepararCvmValida("EM FUNCIONAMENTO NORMAL");
        when(viaCepClient.consultarCep(CEP)).thenReturn(null);
        assertThrows(RespostaExternaInvalidaException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @Test
    void deveTratarRespostaCepIncompletaComoRespostaExternaInvalida() {
        prepararCnpjValido();
        prepararCvmValida("EM FUNCIONAMENTO NORMAL");
        when(viaCepClient.consultarCep(CEP))
                .thenReturn(new ViaCepResponse("22440-032", null, "", "Leblon", "Rio de Janeiro", "RJ", false));
        assertThrows(RespostaExternaInvalidaException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @Test
    void devePreservarIndisponibilidadeDoViaCep() {
        prepararCnpjValido();
        prepararCvmValida("EM FUNCIONAMENTO NORMAL");
        when(viaCepClient.consultarCep(CEP)).thenThrow(feignException(503));
        assertThrows(ProvedorExternoIndisponivelException.class, () -> service.cadastrar(dto(CNPJ)));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"123", "11111111111111", "02332886000114"})
    void cnpjInvalidoImpedeConsultasEGravacao(String cnpj) {
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dto(cnpj)));
        verifyNoInteractions(repository, brasilApiClient, viaCepClient);
    }

    @Test
    void cnpjJaCadastradoImpedeNovaConsulta() {
        when(repository.existsByCnpj(CNPJ)).thenReturn(true);

        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dto(CNPJ)));
        verifyNoInteractions(brasilApiClient, viaCepClient);
        verify(repository, never()).save(any());
    }

    @ParameterizedTest
    @CsvSource({
            ", ATIVA",
            "02332886000104,",
            "02332886000105, ATIVA"
    })
    void rejeitaRespostaDaReceitaIncompativel(String cnpj, String situacao) {
        when(brasilApiClient.consultarCnpj(CNPJ))
                .thenReturn(new BrasilApiCnpjResponse(cnpj, "Corretora", null, situacao));

        assertThrows(RespostaExternaInvalidaException.class, () -> service.cadastrar(dto(CNPJ)));
        verify(brasilApiClient, never()).validarCorretoraCvm(any());
        verify(repository, never()).save(any());
    }

    @ParameterizedTest
    @CsvSource({
            ", NORMAL, 123",
            "02332886000104, , 123",
            "02332886000104, NORMAL,",
            "02332886000105, NORMAL, 123"
    })
    void rejeitaRegistroCvmInconsistente(String cnpj, String status, String codigo) {
        prepararCnpjValido();
        when(brasilApiClient.validarCorretoraCvm(CNPJ))
                .thenReturn(new BrasilApiCvmResponse(cnpj, status, "CORRETORA", codigo));

        assertThrows(RespostaExternaInvalidaException.class, () -> service.cadastrar(dto(CNPJ)));
        verifyNoInteractions(viaCepClient);
        verify(repository, never()).save(any());
    }

    @ParameterizedTest
    @CsvSource({
            ", Leblon, Rio, RJ",
            "22440031, Leblon, Rio, RJ",
            "22440032, , Rio, RJ",
            "22440032, Leblon, , RJ",
            "22440032, Leblon, Rio,",
            "22440032, Leblon, Rio, R"
    })
    void enderecoIncompativelImpedeCadastro(String cep, String bairro, String cidade, String uf) {
        prepararCnpjValido();
        prepararCvmValida("EM FUNCIONAMENTO NORMAL");
        when(viaCepClient.consultarCep(CEP))
                .thenReturn(new ViaCepResponse(cep, "Rua A", "", bairro, cidade, uf, false));

        assertThrows(RespostaExternaInvalidaException.class, () -> service.cadastrar(dto(CNPJ)));
        verify(repository, never()).save(any());
    }

    private void prepararCnpjValido() {
        when(brasilApiClient.consultarCnpj(CNPJ)).thenReturn(new BrasilApiCnpjResponse(
                CNPJ, "XP INVESTIMENTOS CCTVM S.A.", "XP INVESTIMENTOS", "ATIVA"));
    }

    private void prepararCvmValida(String status) {
        when(brasilApiClient.validarCorretoraCvm(CNPJ))
                .thenReturn(new BrasilApiCvmResponse(CNPJ, status, "CORRETORAS", "3247"));
    }

    private void prepararCepValido() {
        when(viaCepClient.consultarCep(CEP)).thenReturn(new ViaCepResponse(
                "22440-032", "Avenida Ataulfo de Paiva", "", "Leblon", "Rio de Janeiro", "RJ", false));
    }

    private CorretoraRequestDTO dto(String cnpj) {
        return new CorretoraRequestDTO(cnpj, CEP, "153", null, null, null);
    }

    private static FeignException feignException(int status) {
        Request request = Request.create(
                Request.HttpMethod.GET, "/teste", Map.of(), null, StandardCharsets.UTF_8, null);
        Response response = Response.builder().status(status).reason("teste")
                .request(request).headers(Map.of()).build();
        return FeignException.errorStatus("teste", response);
    }
}
