package com.jeferson.gestaoacoes.controller;

import com.jeferson.gestaoacoes.dto.AdminUsuarioCriacaoRequestDTO;
import com.jeferson.gestaoacoes.dto.AdminUsuarioPerfilRequestDTO;
import com.jeferson.gestaoacoes.dto.AdminUsuarioResponseDTO;
import com.jeferson.gestaoacoes.dto.AdminUsuarioSenhaRequestDTO;
import com.jeferson.gestaoacoes.dto.AdminUsuarioStatusRequestDTO;
import com.jeferson.gestaoacoes.service.AdminUsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/usuarios")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUsuarioController {

    private final AdminUsuarioService service;

    public AdminUsuarioController(AdminUsuarioService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<AdminUsuarioResponseDTO> criar(
            @Valid @RequestBody AdminUsuarioCriacaoRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(dto));
    }

    @GetMapping
    public ResponseEntity<List<AdminUsuarioResponseDTO>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminUsuarioResponseDTO> consultar(@PathVariable Long id) {
        return ResponseEntity.ok(service.consultar(id));
    }

    @PatchMapping("/{id}/perfil")
    public ResponseEntity<AdminUsuarioResponseDTO> alterarPerfil(
            @PathVariable Long id, @Valid @RequestBody AdminUsuarioPerfilRequestDTO dto) {
        return ResponseEntity.ok(service.alterarPerfil(id, dto.perfil()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AdminUsuarioResponseDTO> alterarStatus(
            @PathVariable Long id, @Valid @RequestBody AdminUsuarioStatusRequestDTO dto) {
        return ResponseEntity.ok(service.alterarStatus(id, dto.ativo()));
    }

    @PutMapping("/{id}/senha")
    public ResponseEntity<Void> redefinirSenha(
            @PathVariable Long id, @Valid @RequestBody AdminUsuarioSenhaRequestDTO dto) {
        service.redefinirSenha(id, dto.novaSenha());
        return ResponseEntity.noContent().build();
    }
}
