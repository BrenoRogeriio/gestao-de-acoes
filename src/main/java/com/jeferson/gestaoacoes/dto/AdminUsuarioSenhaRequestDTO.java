package com.jeferson.gestaoacoes.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminUsuarioSenhaRequestDTO(
        @NotBlank(message = "A nova senha é obrigatória")
        @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres")
        String novaSenha
) {
    @JsonAnySetter
    public void rejeitarCampoDesconhecido(String campo, Object valor) {
        throw new IllegalArgumentException("Campo não permitido: " + campo);
    }
}
