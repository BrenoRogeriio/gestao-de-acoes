package com.jeferson.gestaoacoes.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.jeferson.gestaoacoes.model.PerfilUsuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Locale;

public record AdminUsuarioCriacaoRequestDTO(
        @NotBlank(message = "O nome é obrigatório")
        @Size(max = 120, message = "O nome deve ter no máximo 120 caracteres")
        String nome,

        @NotBlank(message = "O e-mail é obrigatório")
        @Email(message = "O e-mail deve ser válido")
        @Size(max = 254, message = "O e-mail deve ter no máximo 254 caracteres")
        String email,

        @NotBlank(message = "A senha é obrigatória")
        @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres")
        String senha,

        PerfilUsuario perfil
) {
    public AdminUsuarioCriacaoRequestDTO {
        email = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    @JsonAnySetter
    public void rejeitarCampoDesconhecido(String campo, Object valor) {
        throw new IllegalArgumentException("Campo não permitido: " + campo);
    }
}
