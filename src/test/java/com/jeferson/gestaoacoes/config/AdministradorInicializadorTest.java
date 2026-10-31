package com.jeferson.gestaoacoes.config;

import com.jeferson.gestaoacoes.model.PerfilUsuario;
import com.jeferson.gestaoacoes.model.Usuario;
import com.jeferson.gestaoacoes.repository.UsuarioRepository;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdministradorInicializadorTest {

    private static final String EMAIL_ADMIN = "admin@example.com";
    private static final String SENHA_FORTE = "Admin#Seguro123";

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @Mock
    private UsuarioRepository repository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @BeforeAll
    static void criarValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void fecharValidator() {
        validatorFactory.close();
    }

    @Test
    void deveCriarAdministradorAtivoComSenhaBCrypt() {
        when(repository.findByEmail(EMAIL_ADMIN)).thenReturn(Optional.empty());

        inicializador("  ADMIN@Example.COM  ", SENHA_FORTE).run(null);

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(repository).saveAndFlush(captor.capture());
        Usuario salvo = captor.getValue();
        assertEquals(EMAIL_ADMIN, salvo.getEmail());
        assertEquals(PerfilUsuario.ADMIN, salvo.getPerfil());
        assertTrue(salvo.isAtivo());
        assertFalse(SENHA_FORTE.equals(salvo.getSenhaHash()));
        assertTrue(passwordEncoder.matches(SENHA_FORTE, salvo.getSenhaHash()));
    }

    @Test
    void segundaInicializacaoNaoDeveCriarDuplicata() {
        AtomicReference<Usuario> usuarioSalvo = new AtomicReference<>();
        when(repository.findByEmail(EMAIL_ADMIN))
                .thenAnswer(invocation -> Optional.ofNullable(usuarioSalvo.get()));
        when(repository.saveAndFlush(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            usuarioSalvo.set(usuario);
            return usuario;
        });
        AdministradorInicializador inicializador = inicializador(EMAIL_ADMIN, SENHA_FORTE);

        inicializador.run(null);
        inicializador.run(null);

        verify(repository, times(1)).saveAndFlush(any(Usuario.class));
    }

    @Test
    void usuarioExistenteNaoDeveSerPromovidoNemAlterado() {
        Usuario usuario = new Usuario();
        usuario.setEmail(EMAIL_ADMIN);
        usuario.setPerfil(PerfilUsuario.USER);
        usuario.setSenhaHash("hash-existente");
        usuario.setAtivo(false);
        when(repository.findByEmail(EMAIL_ADMIN)).thenReturn(Optional.of(usuario));

        inicializador(EMAIL_ADMIN, SENHA_FORTE).run(null);

        verify(repository, never()).saveAndFlush(any(Usuario.class));
        assertEquals(PerfilUsuario.USER, usuario.getPerfil());
        assertEquals("hash-existente", usuario.getSenhaHash());
        assertFalse(usuario.isAtivo());
    }

    @Test
    void configuracaoAusenteDeveDesativarBootstrap() {
        inicializador("", "").run(null);

        verifyNoInteractions(repository);
    }

    @Test
    void configuracaoIncompletaNaoDeveCriarConta() {
        AdministradorInicializador inicializador = inicializador(EMAIL_ADMIN, "");

        IllegalStateException excecao = assertThrows(IllegalStateException.class, () -> inicializador.run(null));

        assertTrue(excecao.getMessage().contains("devem ser configurados em conjunto"));
        verifyNoInteractions(repository);
    }

    @Test
    void senhaFracaNaoDeveCriarConta() {
        AdministradorInicializador inicializador = inicializador(EMAIL_ADMIN, "senha-fraca");

        assertThrows(IllegalStateException.class, () -> inicializador.run(null));

        verifyNoInteractions(repository);
    }

    @Test
    void emailInvalidoNaoDeveCriarConta() {
        AdministradorInicializador inicializador = inicializador("email-invalido", SENHA_FORTE);

        assertThrows(IllegalStateException.class, () -> inicializador.run(null));

        verifyNoInteractions(repository);
    }

    @Test
    void concorrenciaComOutraCriacaoNaoDeveAlterarContaExistente() {
        when(repository.findByEmail(EMAIL_ADMIN))
                .thenReturn(Optional.empty(), Optional.of(new Usuario()));
        when(repository.saveAndFlush(any(Usuario.class)))
                .thenThrow(new DataIntegrityViolationException("concorrência simulada"));

        inicializador(EMAIL_ADMIN, SENHA_FORTE).run(null);

        verify(repository).saveAndFlush(any(Usuario.class));
    }

    private AdministradorInicializador inicializador(String username, String password) {
        return new AdministradorInicializador(
                repository,
                passwordEncoder,
                validator,
                username,
                password);
    }
}
