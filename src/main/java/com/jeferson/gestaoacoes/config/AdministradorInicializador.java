package com.jeferson.gestaoacoes.config;

import com.jeferson.gestaoacoes.dto.CadastroRequestDTO;
import com.jeferson.gestaoacoes.model.PerfilUsuario;
import com.jeferson.gestaoacoes.model.Usuario;
import com.jeferson.gestaoacoes.repository.UsuarioRepository;
import jakarta.validation.Validator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@Profile("dev")
public class AdministradorInicializador implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(AdministradorInicializador.class);
    private static final String NOME_ADMINISTRADOR = "Administrador";
    private static final int TAMANHO_MINIMO_SENHA_FORTE = 12;

    private final UsuarioRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final Validator validator;
    private final String username;
    private final String password;

    public AdministradorInicializador(
            UsuarioRepository repository,
            PasswordEncoder passwordEncoder,
            Validator validator,
            @Value("${app.admin.username:}") String username,
            @Value("${app.admin.password:}") String password) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.validator = validator;
        this.username = username;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean usernameConfigurado = StringUtils.hasText(username);
        boolean passwordConfigurado = StringUtils.hasText(password);

        if (!usernameConfigurado && !passwordConfigurado) {
            LOGGER.info("Bootstrap do administrador inicial desativado.");
            return;
        }
        if (usernameConfigurado != passwordConfigurado) {
            throw new IllegalStateException(
                    "APP_ADMIN_USERNAME e APP_ADMIN_PASSWORD devem ser configurados em conjunto.");
        }

        CadastroRequestDTO dados = new CadastroRequestDTO(NOME_ADMINISTRADOR, username, password);
        if (!validator.validate(dados).isEmpty()) {
            throw new IllegalStateException(
                    "APP_ADMIN_USERNAME deve ser um e-mail válido e APP_ADMIN_PASSWORD deve ter entre 8 e 72 caracteres.");
        }
        validarSenhaForte(password);

        if (repository.findByEmail(dados.email()).isPresent()) {
            LOGGER.info("Conta do administrador inicial já existe; nenhuma alteração foi realizada.");
            return;
        }

        Usuario administrador = new Usuario();
        administrador.setNome(NOME_ADMINISTRADOR);
        administrador.setEmail(dados.email());
        administrador.setSenhaHash(passwordEncoder.encode(password));
        administrador.setPerfil(PerfilUsuario.ADMIN);
        administrador.setAtivo(true);

        try {
            repository.saveAndFlush(administrador);
            LOGGER.info("Administrador inicial criado com sucesso.");
        } catch (DataIntegrityViolationException ex) {
            if (repository.findByEmail(dados.email()).isEmpty()) {
                throw ex;
            }
            LOGGER.info("Conta do administrador inicial já existe; nenhuma alteração foi realizada.");
        }
    }

    private void validarSenhaForte(String senha) {
        boolean possuiMaiuscula = senha.chars().anyMatch(Character::isUpperCase);
        boolean possuiMinuscula = senha.chars().anyMatch(Character::isLowerCase);
        boolean possuiDigito = senha.chars().anyMatch(Character::isDigit);
        boolean possuiEspecial = senha.chars().anyMatch(caractere ->
                !Character.isLetterOrDigit(caractere) && !Character.isWhitespace(caractere));
        boolean possuiEspaco = senha.chars().anyMatch(Character::isWhitespace);

        if (senha.length() < TAMANHO_MINIMO_SENHA_FORTE
                || !possuiMaiuscula
                || !possuiMinuscula
                || !possuiDigito
                || !possuiEspecial
                || possuiEspaco) {
            throw new IllegalStateException(
                    "APP_ADMIN_PASSWORD deve ter de 12 a 72 caracteres, sem espaços, com letras maiúsculas e minúsculas, número e caractere especial.");
        }
    }
}
