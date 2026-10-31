package com.jeferson.gestaoacoes.config;

import com.jeferson.gestaoacoes.repository.UsuarioRepository;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AdministradorInicializadorProfileTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean(UsuarioRepository.class, () -> mock(UsuarioRepository.class))
            .withBean(PasswordEncoder.class, BCryptPasswordEncoder::new)
            .withBean(Validator.class, () -> mock(Validator.class))
            .withUserConfiguration(AdministradorInicializador.class);

    @Test
    void inicializadorDeveExistirSomenteNoProfileDev() {
        contextRunner.run(contexto ->
                assertThat(contexto).doesNotHaveBean(AdministradorInicializador.class));

        contextRunner
                .withPropertyValues("spring.profiles.active=dev")
                .run(contexto ->
                        assertThat(contexto).hasSingleBean(AdministradorInicializador.class));
    }
}
