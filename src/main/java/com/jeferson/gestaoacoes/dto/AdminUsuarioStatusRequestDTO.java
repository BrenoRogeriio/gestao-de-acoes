package com.jeferson.gestaoacoes.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.NotNull;

public record AdminUsuarioStatusRequestDTO(
        @NotNull(message = "O status ativo é obrigatório")
        Boolean ativo
) {
    @JsonAnySetter
    public void rejeitarCampoDesconhecido(String campo, Object valor) {
        throw new IllegalArgumentException("Campo não permitido: " + campo);
    }
}
