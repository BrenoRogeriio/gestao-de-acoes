package com.jeferson.gestaoacoes.controller;

import com.jeferson.gestaoacoes.dto.AcaoRequestDTO;
import com.jeferson.gestaoacoes.dto.AcaoResponseDTO;
import com.jeferson.gestaoacoes.mapper.AcaoMapper;
import com.jeferson.gestaoacoes.model.Mercado;
import com.jeferson.gestaoacoes.repository.AcaoRepository;
import com.jeferson.gestaoacoes.service.AcaoService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/acoes")
public class AcaoController {

    private final AcaoService service;
    private final AcaoRepository repository;
    private final AcaoMapper mapper;

    public AcaoController(AcaoService service, AcaoRepository repository, AcaoMapper mapper) {
        this.service = service;
        this.repository = repository;
        this.mapper = mapper;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AcaoResponseDTO> cadastrar(@Valid @RequestBody AcaoRequestDTO dto) {
        AcaoResponseDTO response = service.cadastrar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Page<AcaoResponseDTO>> listar(Pageable pageable) {
        Page<AcaoResponseDTO> page = repository.findAll(pageable).map(mapper::toResponseDTO);
        return ResponseEntity.ok(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AcaoResponseDTO> buscarPorId(@PathVariable Long id) {
        return repository.findById(id)
                .map(mapper::toResponseDTO)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ação não encontrada."));
    }

    @GetMapping("/ticker/{ticker}")
    public ResponseEntity<List<AcaoResponseDTO>> buscarPorTicker(
            @PathVariable String ticker,
            @RequestParam(required = false) Mercado mercado) {

        List<AcaoResponseDTO> resultados = service.buscarPorTicker(ticker, mercado);
        if (resultados.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Nenhuma ação encontrada com este ticker.");
        }
        return ResponseEntity.ok(resultados);
    }

    @PutMapping("/{id}/atualizar-cotacao")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AcaoResponseDTO> atualizarCotacao(@PathVariable Long id) {
        AcaoResponseDTO response = service.atualizarCotacao(id);
        return ResponseEntity.ok(response);
    }
}
