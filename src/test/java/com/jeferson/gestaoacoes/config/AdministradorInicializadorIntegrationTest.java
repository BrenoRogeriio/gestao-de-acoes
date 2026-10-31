package com.jeferson.gestaoacoes.config;

import com.jeferson.gestaoacoes.model.PerfilUsuario;
import com.jeferson.gestaoacoes.model.Usuario;
import com.jeferson.gestaoacoes.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:administrador-inicializador;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.liquibase.contexts=test",
        "app.market-data.brapi.token=",
        "app.market-data.twelve-data.apikey=",
        "app.jwt.secret=test-only-jwt-secret-with-at-least-32-bytes-long",
        "app.jwt.issuer=gestao-acoes",
        "app.admin.username=admin.integration@example.com",
        "app.admin.password=Admin#Integration123"
})
@ActiveProfiles("dev")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdministradorInicializadorIntegrationTest {

    private static final String EMAIL_ADMIN = "admin.integration@example.com";
    private static final String SENHA_ADMIN = "Admin#Integration123";

    @Autowired
    private UsuarioRepository repository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void profileDevDeveCriarAdministradorDepoisDoLiquibase() {
        Usuario administrador = repository.findByEmail(EMAIL_ADMIN).orElseThrow();

        assertEquals(PerfilUsuario.ADMIN, administrador.getPerfil());
        assertTrue(administrador.isAtivo());
        assertFalse(SENHA_ADMIN.equals(administrador.getSenhaHash()));
        assertTrue(passwordEncoder.matches(SENHA_ADMIN, administrador.getSenhaHash()));
    }
}
