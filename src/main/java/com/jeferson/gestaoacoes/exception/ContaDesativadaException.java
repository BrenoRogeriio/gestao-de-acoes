package com.jeferson.gestaoacoes.exception;

public class ContaDesativadaException extends RuntimeException {

    public static final String CODIGO = "CONTA_DESATIVADA";
    public static final String MENSAGEM =
            "Sua conta está desativada. Entre em contato com o administrador.";

    public ContaDesativadaException() {
        super(MENSAGEM);
    }
}
