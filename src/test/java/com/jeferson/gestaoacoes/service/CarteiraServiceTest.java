package com.jeferson.gestaoacoes.service;

import com.jeferson.gestaoacoes.dto.TransacaoRequestDTO;
import com.jeferson.gestaoacoes.exception.RegraNegocioException;
import com.jeferson.gestaoacoes.model.Acao;
import com.jeferson.gestaoacoes.model.Corretora;
import com.jeferson.gestaoacoes.model.Mercado;
import com.jeferson.gestaoacoes.model.Moeda;
import com.jeferson.gestaoacoes.model.Posicao;
import com.jeferson.gestaoacoes.model.TipoTransacao;
import com.jeferson.gestaoacoes.model.Transacao;
import com.jeferson.gestaoacoes.model.Usuario;
import com.jeferson.gestaoacoes.repository.AcaoRepository;
import com.jeferson.gestaoacoes.repository.CorretoraRepository;
import com.jeferson.gestaoacoes.repository.PosicaoRepository;
import com.jeferson.gestaoacoes.repository.TransacaoRepository;
import com.jeferson.gestaoacoes.security.UsuarioAtualService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CarteiraServiceTest {

    private static final long USUARIO_ID = 10L;

    @Mock
    private PosicaoRepository posicaoRepository;
    @Mock
    private TransacaoRepository transacaoRepository;
    @Mock
    private AcaoRepository acaoRepository;
    @Mock
    private CorretoraRepository corretoraRepository;
    @Mock
    private UsuarioAtualService usuarioAtualService;

    @InjectMocks
    private CarteiraService service;

    private Acao acao;
    private Corretora corretora;

    @BeforeEach
    void prepararEntidades() {
        Usuario usuario = new Usuario();
        usuario.setId(USUARIO_ID);
        lenient().when(usuarioAtualService.obterReferencia()).thenReturn(usuario);
        lenient().when(usuarioAtualService.obterId()).thenReturn(USUARIO_ID);
        acao = new Acao();
        acao.setId(1L);
        corretora = new Corretora();
        corretora.setId(2L);
    }

    @Test
    void deveRejeitarCompraComQuantidadeZero() {
        assertDadosInvalidos(() -> service.registrarCompra(dto(0, "10.00")),
                "A quantidade deve ser maior que zero.");
    }

    @Test
    void deveRejeitarCompraComQuantidadeNegativa() {
        assertDadosInvalidos(() -> service.registrarCompra(dto(-1, "10.00")),
                "A quantidade deve ser maior que zero.");
    }

    @Test
    void deveRejeitarVendaComQuantidadeZero() {
        assertDadosInvalidos(() -> service.registrarVenda(dto(0, "10.00")),
                "A quantidade deve ser maior que zero.");
    }

    @Test
    void deveRejeitarVendaComQuantidadeNegativa() {
        assertDadosInvalidos(() -> service.registrarVenda(dto(-1, "10.00")),
                "A quantidade deve ser maior que zero.");
    }

    @Test
    void deveRejeitarQuantidadeNula() {
        assertDadosInvalidos(() -> service.registrarCompra(dto(null, "10.00")),
                "A quantidade é obrigatória.");
    }

    @Test
    void deveRejeitarValorUnitarioZero() {
        assertDadosInvalidos(() -> service.registrarCompra(dto(1, "0")),
                "O preço de execução deve ser maior que zero.");
    }

    @Test
    void deveRejeitarValorUnitarioNegativo() {
        assertDadosInvalidos(() -> service.registrarCompra(dto(1, "-0.01")),
                "O preço de execução deve ser maior que zero.");
    }

    @Test
    void deveRejeitarValorUnitarioNulo() {
        TransacaoRequestDTO dto = new TransacaoRequestDTO(1L, 2L, 1, null);
        assertDadosInvalidos(() -> service.registrarCompra(dto),
                "O preço de execução é obrigatório.");
    }

    @Test
    void deveRejeitarValorComMaisDeQuatroCasasDecimais() {
        assertDadosInvalidos(() -> service.registrarCompra(dto(1, "10.00001")),
                "O preço de execução deve ter no máximo 4 casas decimais.");
    }

    @Test
    void deveRejeitarValorComMaisDeQuinzeDigitosInteiros() {
        assertDadosInvalidos(() -> service.registrarCompra(dto(1, "1000000000000000.0000")),
                "O preço de execução deve ter no máximo 15 dígitos inteiros.");
    }

    @Test
    void deveRejeitarOverflowDaQuantidadeTotalNaCompra() {
        prepararReferencias();
        Posicao posicao = posicao(Integer.MAX_VALUE, "10.0000");
        when(posicaoRepository.findByUsuarioIdAndAcaoId(USUARIO_ID, acao.getId())).thenReturn(Optional.of(posicao));

        RegraNegocioException exception = assertThrows(RegraNegocioException.class,
                () -> service.registrarCompra(dto(1, "20.0000")));

        assertEquals("A quantidade total da posição excede o limite permitido.", exception.getMessage());
        verify(transacaoRepository, never()).saveAndFlush(any());
        verify(posicaoRepository, never()).save(any());
    }

    @Test
    void devePreservarRegraQueImpedeVendaAcimaDaPosicao() {
        prepararReferencias();
        when(posicaoRepository.findByUsuarioIdAndAcaoId(USUARIO_ID, acao.getId())).thenReturn(Optional.of(posicao(5, "10.0000")));

        RegraNegocioException exception = assertThrows(RegraNegocioException.class,
                () -> service.registrarVenda(dto(6, "12.0000")));

        assertEquals("Quantidade insuficiente. Você possui apenas 5 ações.", exception.getMessage());
        verify(transacaoRepository, never()).saveAndFlush(any());
        verify(posicaoRepository, never()).save(any());
    }

    @Test
    void deveRegistrarCompraValida() {
        prepararReferencias();
        when(posicaoRepository.findByUsuarioIdAndAcaoId(USUARIO_ID, acao.getId())).thenReturn(Optional.empty());

        service.registrarCompra(dto(3, "10.1234"));

        ArgumentCaptor<Transacao> transacao = ArgumentCaptor.forClass(Transacao.class);
        ArgumentCaptor<Posicao> posicao = ArgumentCaptor.forClass(Posicao.class);
        verify(transacaoRepository).saveAndFlush(transacao.capture());
        verify(posicaoRepository).save(posicao.capture());
        assertEquals(TipoTransacao.COMPRA, transacao.getValue().getTipoTransacao());
        assertEquals(3, posicao.getValue().getQuantidade());
        assertEquals(new BigDecimal("10.1234"), posicao.getValue().getPrecoMedio());
    }

    @Test
    void deveRegistrarVendaValida() {
        prepararReferencias();
        Posicao posicao = posicao(5, "10.0000");
        when(posicaoRepository.findByUsuarioIdAndAcaoId(USUARIO_ID, acao.getId())).thenReturn(Optional.of(posicao));

        service.registrarVenda(dto(2, "12.3456"));

        ArgumentCaptor<Transacao> transacao = ArgumentCaptor.forClass(Transacao.class);
        verify(transacaoRepository).saveAndFlush(transacao.capture());
        verify(posicaoRepository).save(posicao);
        assertEquals(TipoTransacao.VENDA, transacao.getValue().getTipoTransacao());
        assertEquals(3, posicao.getQuantidade());
        assertEquals(new BigDecimal("10.0000"), posicao.getPrecoMedio());
    }

    @Test
    void deveSalvarDataInformadaPeloCliente() {
        prepararReferencias();
        when(posicaoRepository.findByUsuarioIdAndAcaoId(USUARIO_ID, acao.getId())).thenReturn(Optional.empty());

        service.registrarCompra(dto(3, "10.1234", LocalDate.of(2026, 9, 5)));

        ArgumentCaptor<Transacao> transacao = ArgumentCaptor.forClass(Transacao.class);
        verify(transacaoRepository).saveAndFlush(transacao.capture());
        assertEquals(
                OffsetDateTime.of(2026, 9, 5, 0, 0, 0, 0, ZoneOffset.ofHours(-3)),
                transacao.getValue().getDataHoraTransacao()
        );
    }

    @Test
    void deveUsarDataHoraAtualQuandoDataNaoForInformada() {
        prepararReferencias();
        when(posicaoRepository.findByUsuarioIdAndAcaoId(USUARIO_ID, acao.getId())).thenReturn(Optional.empty());
        Instant antes = Instant.now();

        service.registrarCompra(dto(3, "10.1234"));

        Instant depois = Instant.now();
        ArgumentCaptor<Transacao> transacao = ArgumentCaptor.forClass(Transacao.class);
        verify(transacaoRepository).saveAndFlush(transacao.capture());
        Instant dataSalva = transacao.getValue().getDataHoraTransacao().toInstant();
        org.junit.jupiter.api.Assertions.assertFalse(dataSalva.isBefore(antes));
        org.junit.jupiter.api.Assertions.assertFalse(dataSalva.isAfter(depois));
    }

    @Test
    void deveRetornarMoedaCorretaNasPosicoesBrlEUsd() {
        Acao acaoBrl = acao(1L, "PETR4", Mercado.BRASIL, Moeda.BRL, "40.0000");
        Acao acaoUsd = acao(2L, "AAPL", Mercado.ESTADOS_UNIDOS, Moeda.USD, "200.0000");
        Posicao posicaoBrl = posicao(acaoBrl, 2, "30.0000");
        Posicao posicaoUsd = posicao(acaoUsd, 3, "150.0000");
        when(posicaoRepository.findAllByUsuarioIdAndQuantidadeGreaterThan(USUARIO_ID, 0)).thenReturn(List.of(posicaoBrl, posicaoUsd));

        var resposta = service.listarPosicoes();

        assertEquals(Moeda.BRL, resposta.get(0).moeda());
        assertEquals(Mercado.BRASIL, resposta.get(0).mercado());
        assertEquals(1L, resposta.get(0).acaoId());
        assertEquals(Moeda.USD, resposta.get(1).moeda());
        assertEquals(Mercado.ESTADOS_UNIDOS, resposta.get(1).mercado());
        assertEquals(2L, resposta.get(1).acaoId());
    }

    @Test
    void devePreservarMoedaNoHistorico() {
        Acao acaoUsd = acao(2L, "AAPL", Mercado.ESTADOS_UNIDOS, Moeda.USD, "200.0000");
        Transacao transacao = new Transacao();
        transacao.setAcao(acaoUsd);
        transacao.setCorretora(corretora);
        transacao.setTipoTransacao(TipoTransacao.COMPRA);
        transacao.setQuantidade(2);
        transacao.setValorUnitario(new BigDecimal("150.0000"));
        transacao.setDataHoraTransacao(OffsetDateTime.of(2026, 9, 5, 0, 0, 0, 0, ZoneOffset.ofHours(-3)));
        when(transacaoRepository.findAllByUsuarioIdOrderByDataHoraTransacaoDesc(USUARIO_ID)).thenReturn(List.of(transacao));

        var resposta = service.listarHistorico().getFirst();

        assertEquals(Moeda.USD, resposta.moeda());
        assertEquals(Mercado.ESTADOS_UNIDOS, resposta.mercado());
        assertEquals(LocalDate.of(2026, 9, 5), resposta.dataOperacao());
    }

    @Test
    void deveIgnorarRepeticaoDaMesmaOperacaoComMesmaChave() {
        prepararReferencias();
        Transacao existente = transacaoExistente(TipoTransacao.COMPRA, 3, "10.1234", "operacao-1");
        when(transacaoRepository.findByUsuarioIdAndIdempotencyKey(USUARIO_ID, "operacao-1")).thenReturn(Optional.of(existente));

        service.registrarCompra(dto(3, "10.1234"), " operacao-1 ");

        verify(posicaoRepository, never()).findByUsuarioIdAndAcaoId(eq(USUARIO_ID), any());
        verify(posicaoRepository, never()).save(any());
        verify(transacaoRepository, never()).saveAndFlush(any());
    }

    @Test
    void deveIgnorarRepeticaoComMesmaChaveEMesmaData() {
        prepararReferencias();
        Transacao existente = transacaoExistente(TipoTransacao.COMPRA, 3, "10.1234", "operacao-1");
        existente.setDataHoraTransacao(
                OffsetDateTime.of(2026, 9, 5, 0, 0, 0, 0, ZoneOffset.ofHours(-3))
        );
        when(transacaoRepository.findByUsuarioIdAndIdempotencyKey(USUARIO_ID, "operacao-1")).thenReturn(Optional.of(existente));

        service.registrarCompra(dto(3, "10.1234", LocalDate.of(2026, 9, 5)), "operacao-1");

        verify(posicaoRepository, never()).findByUsuarioIdAndAcaoId(eq(USUARIO_ID), any());
        verify(posicaoRepository, never()).save(any());
        verify(transacaoRepository, never()).saveAndFlush(any());
    }

    @Test
    void deveRejeitarReutilizacaoDaChaveEmOperacaoDiferente() {
        prepararReferencias();
        Transacao existente = transacaoExistente(TipoTransacao.COMPRA, 3, "10.1234", "operacao-1");
        when(transacaoRepository.findByUsuarioIdAndIdempotencyKey(USUARIO_ID, "operacao-1")).thenReturn(Optional.of(existente));

        RegraNegocioException exception = assertThrows(RegraNegocioException.class,
                () -> service.registrarVenda(dto(2, "12.0000"), "operacao-1"));

        assertEquals("A chave de idempotência já foi utilizada em outra operação.", exception.getMessage());
        verify(posicaoRepository, never()).findByUsuarioIdAndAcaoId(eq(USUARIO_ID), any());
        verify(transacaoRepository, never()).saveAndFlush(any());
    }

    @Test
    void deveRejeitarMesmaChaveComDataDiferente() {
        prepararReferencias();
        Transacao existente = transacaoExistente(TipoTransacao.COMPRA, 3, "10.1234", "operacao-1");
        existente.setDataHoraTransacao(
                OffsetDateTime.of(2026, 9, 5, 0, 0, 0, 0, ZoneOffset.ofHours(-3))
        );
        when(transacaoRepository.findByUsuarioIdAndIdempotencyKey(USUARIO_ID, "operacao-1")).thenReturn(Optional.of(existente));

        RegraNegocioException exception = assertThrows(RegraNegocioException.class,
                () -> service.registrarCompra(dto(3, "10.1234", LocalDate.of(2026, 9, 6)), "operacao-1"));

        assertEquals("A chave de idempotência já foi utilizada em outra operação.", exception.getMessage());
        verify(posicaoRepository, never()).findByUsuarioIdAndAcaoId(eq(USUARIO_ID), any());
        verify(transacaoRepository, never()).saveAndFlush(any());
    }

    @Test
    void deveAceitarChaveDeIdempotenciaComExatamenteCemCaracteres() {
        // Arrange
        String chaveNoLimite = "a".repeat(100);
        prepararReferencias();
        when(transacaoRepository.findByUsuarioIdAndIdempotencyKey(USUARIO_ID, chaveNoLimite))
                .thenReturn(Optional.empty());
        when(posicaoRepository.findByUsuarioIdAndAcaoId(USUARIO_ID, acao.getId()))
                .thenReturn(Optional.empty());

        // Act
        service.registrarCompra(dto(1, "10.0000"), " " + chaveNoLimite + " ");

        // Assert
        ArgumentCaptor<Transacao> transacao = ArgumentCaptor.forClass(Transacao.class);
        verify(transacaoRepository).findByUsuarioIdAndIdempotencyKey(USUARIO_ID, chaveNoLimite);
        verify(transacaoRepository).saveAndFlush(transacao.capture());
        assertThat(transacao.getValue().getIdempotencyKey()).isEqualTo(chaveNoLimite);
    }

    @Test
    void deveRejeitarChaveDeIdempotenciaAcimaDeCemCaracteres() {
        // Arrange
        String chaveAcimaDoLimite = "a".repeat(101);

        // Act e Assert
        assertThatThrownBy(() -> service.registrarCompra(dto(1, "10.0000"), chaveAcimaDoLimite))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessage("A chave de idempotência deve ter no máximo 100 caracteres.");
        verifyNoInteractions(acaoRepository, corretoraRepository, posicaoRepository, transacaoRepository);
    }

    @Test
    void deveRejeitarChaveDeIdempotenciaComApenasEspacos() {
        // Arrange
        String chaveSemConteudo = "   ";

        // Act e Assert
        assertThatThrownBy(() -> service.registrarCompra(dto(1, "10.0000"), chaveSemConteudo))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessage("A chave de idempotência não pode estar vazia.");
        verifyNoInteractions(acaoRepository, corretoraRepository, posicaoRepository, transacaoRepository);
    }

    private void prepararReferencias() {
        when(acaoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(acao));
        when(corretoraRepository.findById(2L)).thenReturn(Optional.of(corretora));
    }

    private Transacao transacaoExistente(TipoTransacao tipo, int quantidade, String valor, String chave) {
        Transacao transacao = new Transacao();
        transacao.setAcao(acao);
        transacao.setCorretora(corretora);
        transacao.setTipoTransacao(tipo);
        transacao.setQuantidade(quantidade);
        transacao.setValorUnitario(new BigDecimal(valor));
        transacao.setIdempotencyKey(chave);
        return transacao;
    }

    private TransacaoRequestDTO dto(Integer quantidade, String valorUnitario) {
        return new TransacaoRequestDTO(1L, 2L, quantidade, new BigDecimal(valorUnitario));
    }

    private TransacaoRequestDTO dto(Integer quantidade, String valorUnitario, LocalDate data) {
        return new TransacaoRequestDTO(1L, 2L, quantidade, new BigDecimal(valorUnitario), data);
    }

    private Acao acao(Long id, String ticker, Mercado mercado, Moeda moeda, String cotacao) {
        Acao novaAcao = new Acao();
        novaAcao.setId(id);
        novaAcao.setTicker(ticker);
        novaAcao.setNomeEmpresa(ticker);
        novaAcao.setMercado(mercado);
        novaAcao.setMoeda(moeda);
        novaAcao.setCotacaoAtual(new BigDecimal(cotacao));
        return novaAcao;
    }

    private Posicao posicao(int quantidade, String precoMedio) {
        return posicao(acao, quantidade, precoMedio);
    }

    private Posicao posicao(Acao acaoDaPosicao, int quantidade, String precoMedio) {
        Posicao posicao = new Posicao();
        posicao.setId(3L);
        posicao.setAcao(acaoDaPosicao);
        posicao.setQuantidade(quantidade);
        posicao.setPrecoMedio(new BigDecimal(precoMedio));
        return posicao;
    }

    private void assertDadosInvalidos(Runnable operacao, String mensagem) {
        RegraNegocioException exception = assertThrows(RegraNegocioException.class, operacao::run);
        assertEquals(mensagem, exception.getMessage());
        verifyNoInteractions(acaoRepository, corretoraRepository, posicaoRepository, transacaoRepository);
    }
}
