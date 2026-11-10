package com.jeferson.gestaoacoes.service;

import com.jeferson.gestaoacoes.dto.AdminUsuarioCriacaoRequestDTO;
import com.jeferson.gestaoacoes.dto.AdminUsuarioResponseDTO;
import com.jeferson.gestaoacoes.exception.EmailJaCadastradoException;
import com.jeferson.gestaoacoes.exception.RegraNegocioException;
import com.jeferson.gestaoacoes.model.PerfilUsuario;
import com.jeferson.gestaoacoes.model.Usuario;
import com.jeferson.gestaoacoes.repository.UsuarioRepository;
import com.jeferson.gestaoacoes.security.UsuarioAtualService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class AdminUsuarioService {

    private static final String USUARIO_NAO_ENCONTRADO = "Usuário não encontrado.";

    private final UsuarioRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final UsuarioAtualService usuarioAtualService;

    public AdminUsuarioService(UsuarioRepository repository, PasswordEncoder passwordEncoder,
                               UsuarioAtualService usuarioAtualService) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.usuarioAtualService = usuarioAtualService;
    }

    @Transactional
    public AdminUsuarioResponseDTO criar(AdminUsuarioCriacaoRequestDTO dto) {
        String email = AutenticacaoService.normalizarEmail(dto.email());
        if (repository.existsByEmail(email)) {
            throw new EmailJaCadastradoException();
        }

        Usuario usuario = new Usuario();
        usuario.setNome(dto.nome().trim());
        usuario.setEmail(email);
        usuario.setSenhaHash(passwordEncoder.encode(dto.senha()));
        usuario.setPerfil(dto.perfil() == null ? PerfilUsuario.USER : dto.perfil());
        usuario.setAtivo(true);

        try {
            return toResponse(repository.saveAndFlush(usuario));
        } catch (DataIntegrityViolationException ex) {
            throw new EmailJaCadastradoException();
        }
    }

    @Transactional(readOnly = true)
    public List<AdminUsuarioResponseDTO> listar() {
        return repository.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AdminUsuarioResponseDTO consultar(Long id) {
        return toResponse(buscar(id));
    }

    @Transactional
    public AdminUsuarioResponseDTO alterarPerfil(Long id, PerfilUsuario novoPerfil) {
        Usuario usuario = buscar(id);
        if (usuario.getPerfil() == PerfilUsuario.ADMIN && novoPerfil == PerfilUsuario.USER) {
            impedirAutobloqueio(id, "rebaixar o próprio perfil");
            usuario = bloquearEValidarReducaoDeAdmins(id);
        }
        usuario.setPerfil(novoPerfil);
        return toResponse(repository.save(usuario));
    }

    @Transactional
    public AdminUsuarioResponseDTO alterarStatus(Long id, boolean ativo) {
        Usuario usuario = buscar(id);
        if (usuario.isAtivo() && !ativo) {
            impedirAutobloqueio(id, "desativar a própria conta");
            if (usuario.getPerfil() == PerfilUsuario.ADMIN) {
                usuario = bloquearEValidarReducaoDeAdmins(id);
            }
        }
        usuario.setAtivo(ativo);
        return toResponse(repository.save(usuario));
    }

    @Transactional
    public void redefinirSenha(Long id, String novaSenha) {
        Usuario usuario = buscar(id);
        usuario.setSenhaHash(passwordEncoder.encode(novaSenha));
        repository.save(usuario);
    }

    private Usuario bloquearEValidarReducaoDeAdmins(Long idAlvo) {
        List<Usuario> adminsAtivos = repository.findAtivosByPerfilForUpdate(PerfilUsuario.ADMIN);
        Usuario alvoBloqueado = adminsAtivos.stream()
                .filter(usuario -> usuario.getId().equals(idAlvo))
                .findFirst()
                .orElseGet(() -> buscar(idAlvo));
        if (alvoBloqueado.isAtivo() && alvoBloqueado.getPerfil() == PerfilUsuario.ADMIN
                && adminsAtivos.size() <= 1) {
            throw new RegraNegocioException("O último administrador ativo não pode ser desativado ou rebaixado.");
        }
        return alvoBloqueado;
    }

    private void impedirAutobloqueio(Long idAlvo, String operacao) {
        if (usuarioAtualService.obterId().equals(idAlvo)) {
            throw new RegraNegocioException("O administrador não pode " + operacao + ".");
        }
    }

    private Usuario buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, USUARIO_NAO_ENCONTRADO));
    }

    private AdminUsuarioResponseDTO toResponse(Usuario usuario) {
        return new AdminUsuarioResponseDTO(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getPerfil(),
                usuario.isAtivo(),
                usuario.getDataHoraCadastro());
    }
}
