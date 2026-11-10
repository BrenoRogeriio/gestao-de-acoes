package com.jeferson.gestaoacoes.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class HttpConfiguration implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public HttpConfiguration(@Value("${app.http.cors.allowed-origins:}") String configuredOrigins) {
        this.allowedOrigins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toArray(String[]::new);

        if (Arrays.asList(allowedOrigins).contains("*")) {
            throw new IllegalStateException(
                    "app.http.cors.allowed-origins nao aceita '*'; configure origens explicitas");
        }
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (allowedOrigins.length == 0) {
            return;
        }

        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "Authorization", "Idempotency-Key", "X-Request-Id")
                .exposedHeaders("X-Request-Id")
                .allowCredentials(false)
                .maxAge(3600);
    }
}
