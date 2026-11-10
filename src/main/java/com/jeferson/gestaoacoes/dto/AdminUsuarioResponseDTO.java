package com.jeferson.gestaoacoes.dto;

import com.jeferson.gestaoacoes.model.PerfilUsuario;

import java.time.OffsetDateTime;

public record AdminUsuarioResponseDTO(
        Long id,
        String nome,
        String email,
        PerfilUsuario perfil,
        boolean ativo,
        OffsetDateTime dataHoraCadastro
) {}
