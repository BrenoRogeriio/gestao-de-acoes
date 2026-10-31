package com.jeferson.gestaoacoes.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

    private static final int TAMANHO_MINIMO_SEGREDO_BYTES = 32;
    private static final String CLAIM_AUTHORITIES = "authorities";

    private final SecretKey chave;
    private final String issuer;
    private final Duration expiracao;

    public JwtService(
            @Value("${app.jwt.secret}") String segredo,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.expiration-minutes:480}") long expiracaoMinutos) {
        byte[] segredoBytes = segredo == null ? new byte[0] : segredo.getBytes(StandardCharsets.UTF_8);
        if (segredo == null || segredo.isBlank() || segredoBytes.length < TAMANHO_MINIMO_SEGREDO_BYTES) {
            throw new IllegalStateException("JWT_SECRET deve possuir pelo menos 32 bytes.");
        }
        if (expiracaoMinutos <= 0) {
            throw new IllegalStateException("JWT_EXPIRATION_MINUTES deve ser maior que zero.");
        }
        if (issuer == null || issuer.isBlank()) {
            throw new IllegalStateException("JWT_ISSUER deve ser informado.");
        }
        this.chave = Keys.hmacShaKeyFor(segredoBytes);
        this.issuer = issuer;
        this.expiracao = Duration.ofMinutes(expiracaoMinutos);
    }

    public String gerarToken(UserDetails usuario) {
        Instant agora = Instant.now();
        return Jwts.builder()
                .issuer(issuer)
                .subject(usuario.getUsername())
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plus(expiracao)))
                .claim(CLAIM_AUTHORITIES, usuario.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .sorted()
                        .toList())
                .signWith(chave, Jwts.SIG.HS256)
                .compact();
    }

    public String extrairEmail(String token) throws JwtException {
        return extrairClaims(token).getSubject();
    }

    public boolean tokenValido(String token, UserDetails usuario) {
        Claims claims = extrairClaims(token);
        return usuario.isEnabled()
                && usuario.getUsername().equals(claims.getSubject())
                && claims.getExpiration().after(new Date());
    }

    public long getExpiracaoSegundos() {
        return expiracao.toSeconds();
    }

    private Claims extrairClaims(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(chave)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
