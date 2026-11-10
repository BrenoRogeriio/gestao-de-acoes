package com.jeferson.gestaoacoes.controller;

import com.jeferson.gestaoacoes.dto.CorretoraRequestDTO;
import com.jeferson.gestaoacoes.dto.CorretoraResponseDTO;
import com.jeferson.gestaoacoes.mapper.CorretoraMapper;
import com.jeferson.gestaoacoes.repository.CorretoraRepository;
import com.jeferson.gestaoacoes.service.CorretoraService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/corretoras")
public class CorretoraController {

    private final CorretoraService service;
    private final CorretoraRepository repository;
    private final CorretoraMapper mapper;

    public CorretoraController(CorretoraService service, CorretoraRepository repository, CorretoraMapper mapper) {
        this.service = service;
        this.repository = repository;
        this.mapper = mapper;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CorretoraResponseDTO> cadastrar(@Valid @RequestBody CorretoraRequestDTO dto) {
        CorretoraResponseDTO response = service.cadastrar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Page<CorretoraResponseDTO>> listar(Pageable pageable) {
        Page<CorretoraResponseDTO> page = repository.findAll(pageable)
                .map(mapper::toResponseDTO);
        return ResponseEntity.ok(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CorretoraResponseDTO> buscarPorId(@PathVariable Long id) {
        return repository.findById(id)
                .map(mapper::toResponseDTO)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Corretora não encontrada."));
    }

    @GetMapping("/cnpj/{cnpj}")
    public ResponseEntity<CorretoraResponseDTO> buscarPorCnpj(@PathVariable String cnpj) {
        return repository.findByCnpj(cnpj)
                .map(mapper::toResponseDTO)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Corretora não encontrada com este CNPJ."));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
