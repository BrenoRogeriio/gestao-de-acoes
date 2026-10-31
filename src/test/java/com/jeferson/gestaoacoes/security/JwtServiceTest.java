package com.jeferson.gestaoacoes.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    private static final String ISSUER_TESTE = "gestao-acoes";
    private static final String SEGREDO_TESTE = "chave-jwt-apenas-para-testes-32-bytes";

    @Test
    void deveGerarEValidarJwtAssinadoComIssuerEAuthorities() {
        JwtService service = new JwtService(SEGREDO_TESTE, ISSUER_TESTE, 480);
        var usuario = User.withUsername("usuario@example.com").password("hash").roles("USER").build();

        String token = service.gerarToken(usuario);
        Claims claims = Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(SEGREDO_TESTE.getBytes(StandardCharsets.UTF_8)))
                .requireIssuer(ISSUER_TESTE)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        assertEquals("usuario@example.com", service.extrairEmail(token));
        assertTrue(service.tokenValido(token, usuario));
        assertEquals(28_800, service.getExpiracaoSegundos());
        assertEquals(ISSUER_TESTE, claims.getIssuer());
        assertEquals(List.of("ROLE_USER"), claims.get("authorities", List.class));
    }

    @Test
    void deveRejeitarTokenSemIssuer() {
        JwtService service = new JwtService(SEGREDO_TESTE, ISSUER_TESTE, 480);

        assertThrows(JwtException.class, () -> service.extrairEmail(criarTokenAssinado(null)));
    }

    @Test
    void deveRejeitarTokenComIssuerIncorreto() {
        JwtService service = new JwtService(SEGREDO_TESTE, ISSUER_TESTE, 480);

        assertThrows(JwtException.class, () -> service.extrairEmail(criarTokenAssinado("outro-issuer")));
    }

    @Test
    void deveRejeitarSegredoCurto() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class, () -> new JwtService("segredo-curto", ISSUER_TESTE, 480));

        assertEquals("JWT_SECRET deve possuir pelo menos 32 bytes.", exception.getMessage());
    }

    @Test
    void deveRejeitarSegredoEmBrancoMesmoComTamanhoSuficiente() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class, () -> new JwtService(" ".repeat(32), ISSUER_TESTE, 480));

        assertEquals("JWT_SECRET deve possuir pelo menos 32 bytes.", exception.getMessage());
    }

    @Test
    void deveRejeitarExpiracaoInvalida() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class, () -> new JwtService(SEGREDO_TESTE, ISSUER_TESTE, 0));

        assertEquals("JWT_EXPIRATION_MINUTES deve ser maior que zero.", exception.getMessage());
    }

    @Test
    void deveRejeitarIssuerEmBranco() {
        IllegalStateException exception = assertThrows(
                IllegalStateException.class, () -> new JwtService(SEGREDO_TESTE, " ", 480));

        assertEquals("JWT_ISSUER deve ser informado.", exception.getMessage());
    }

    private String criarTokenAssinado(String issuer) {
        Instant agora = Instant.now();
        var builder = Jwts.builder()
                .subject("usuario@example.com")
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plusSeconds(60)));
        if (issuer != null) {
            builder.issuer(issuer);
        }
        return builder
                .signWith(Keys.hmacShaKeyFor(SEGREDO_TESTE.getBytes(StandardCharsets.UTF_8)), Jwts.SIG.HS256)
                .compact();
    }
}
