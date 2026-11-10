package com.jeferson.gestaoacoes.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.jeferson.gestaoacoes.model.PerfilUsuario;
import jakarta.validation.constraints.NotNull;

public record AdminUsuarioPerfilRequestDTO(
        @NotNull(message = "O perfil é obrigatório")
        PerfilUsuario perfil
) {
    @JsonAnySetter
    public void rejeitarCampoDesconhecido(String campo, Object valor) {
        throw new IllegalArgumentException("Campo não permitido: " + campo);
    }
}
