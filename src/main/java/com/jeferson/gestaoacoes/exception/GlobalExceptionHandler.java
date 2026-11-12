package com.jeferson.gestaoacoes.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String BASE_URI_ERROS = "https://gestao-acoes.com/erros/";

    @ExceptionHandler(CredenciaisInvalidasException.class)
    public ProblemDetail handleCredenciaisInvalidasException(CredenciaisInvalidasException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problemDetail.setTitle("Não autorizado");
        problemDetail.setType(URI.create("https://gestao-acoes.com/erros/nao-autorizado"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    @ExceptionHandler(EmailJaCadastradoException.class)
    public ProblemDetail handleEmailJaCadastradoException(EmailJaCadastradoException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problemDetail.setTitle("Conflito");
        problemDetail.setType(URI.create("https://gestao-acoes.com/erros/email-ja-cadastrado"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    @ExceptionHandler(CorretoraEmUsoException.class)
    public ProblemDetail handleCorretoraEmUsoException(CorretoraEmUsoException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problemDetail.setTitle("Conflito");
        problemDetail.setType(URI.create("https://gestao-acoes.com/erros/corretora-em-uso"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    // Trata as nossas regras de negócio customizadas (Ex: Ticker já existe, CEP inválido)
    @ExceptionHandler(RegraNegocioException.class)
    public ProblemDetail handleRegraNegocioException(RegraNegocioException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        problemDetail.setTitle("Violação de Regra de Negócio");
        problemDetail.setType(URI.create("https://gestao-acoes.com/erros/regra-de-negocio"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    @ExceptionHandler(RespostaExternaInvalidaException.class)
    public ProblemDetail handleRespostaExternaInvalidaException(RespostaExternaInvalidaException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_GATEWAY, "O provedor externo retornou uma resposta inválida.");
        problemDetail.setTitle("Resposta Inválida de Provedor Externo");
        problemDetail.setType(URI.create("https://gestao-acoes.com/erros/resposta-externa-invalida"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    @ExceptionHandler(ProvedorExternoIndisponivelException.class)
    public ProblemDetail handleProvedorExternoIndisponivelException(ProvedorExternoIndisponivelException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.SERVICE_UNAVAILABLE, "O provedor externo está temporariamente indisponível.");
        problemDetail.setTitle("Provedor Externo Indisponível");
        problemDetail.setType(URI.create("https://gestao-acoes.com/erros/provedor-externo-indisponivel"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    // Trata os erros de validação do Bean Validation (@NotBlank, @Pattern, etc nos DTOs)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationExceptions(MethodArgumentNotValidException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Um ou mais campos estão inválidos.");
        problemDetail.setTitle("Dados inválidos");
        problemDetail.setType(URI.create("https://gestao-acoes.com/erros/validacao-invalida"));
        problemDetail.setProperty("timestamp", Instant.now());

        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        // Adiciona a lista de campos que falharam na resposta
        problemDetail.setProperty("erros", fieldErrors);

        return problemDetail;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleHttpMessageNotReadableException(HttpMessageNotReadableException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "O corpo da requisição está inválido.");
        problemDetail.setTitle("Dados inválidos");
        problemDetail.setType(URI.create("https://gestao-acoes.com/erros/requisicao-invalida"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleMethodArgumentTypeMismatchException(MethodArgumentTypeMismatchException ex) {
        return criarBadRequest(
                "Parâmetro inválido",
                "O parâmetro informado possui um valor inválido.",
                "parametro-invalido");
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ProblemDetail handleMissingServletRequestParameterException(MissingServletRequestParameterException ex) {
        return criarBadRequest(
                "Parâmetro obrigatório ausente",
                "Um parâmetro obrigatório não foi informado.",
                "parametro-obrigatorio-ausente");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ProblemDetail handleHttpRequestMethodNotSupportedException(HttpRequestMethodNotSupportedException ex) {
        return criarProblemDetail(
                HttpStatus.METHOD_NOT_ALLOWED,
                "Método não permitido",
                "O método HTTP informado não é permitido para este recurso.",
                "metodo-nao-permitido");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail handleResponseStatusException(ResponseStatusException ex) {
        String detail = ex.getReason() == null ? "A requisição não pode ser atendida." : ex.getReason();
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(ex.getStatusCode(), detail);
        problemDetail.setTitle(HttpStatus.valueOf(ex.getStatusCode().value()).getReasonPhrase());
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpectedException(Exception ex) {
        LOGGER.error("Erro interno não tratado durante o processamento da requisição exceptionType={}",
                ex.getClass().getSimpleName());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "Ocorreu um erro interno. Tente novamente mais tarde.");
        problemDetail.setTitle("Erro interno");
        problemDetail.setType(URI.create("https://gestao-acoes.com/erros/erro-interno"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    private ProblemDetail criarProblemDetail(HttpStatus status, String title, String detail, String typeSuffix) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(status, detail);
        problemDetail.setTitle(title);
        problemDetail.setType(URI.create(BASE_URI_ERROS + typeSuffix));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    private ProblemDetail criarBadRequest(String title, String detail, String typeSuffix) {
        return criarProblemDetail(HttpStatus.BAD_REQUEST, title, detail, typeSuffix);
    }
}
