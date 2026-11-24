package com.jeferson.gestaoacoes.model;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.HashSet;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.Supplier;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class IdentidadeEntidadeTest {

    static Stream<Arguments> entidades() {
        return Stream.of(
                identidades(Acao::new, Acao::setId),
                identidades(Corretora::new, Corretora::setId),
                identidades(Posicao::new, Posicao::setId),
                identidades(Transacao::new, Transacao::setId),
                identidades(Usuario::new, Usuario::setId));
    }

    private static <T> Arguments identidades(Supplier<T> criar, BiConsumer<T, Long> definirId) {
        T original = criar.get();
        T recarregada = criar.get();
        T outra = criar.get();
        definirId.accept(original, 1001L);
        definirId.accept(recarregada, 1001L);
        definirId.accept(outra, 1002L);
        return Arguments.of(original.getClass().getSimpleName(), original, recarregada, outra, criar.get());
    }

    @ParameterizedTest(name = "{0} mantém a identidade entre carregamentos")
    @MethodSource("entidades")
    void identificaPeloId(String tipo, Object original, Object recarregada, Object outra, Object nova) {
        Set<Object> entidades = new HashSet<>();
        entidades.add(original);

        assertThat(entidades.add(recarregada)).isFalse();
        assertThat(entidades.add(outra)).isTrue();
        assertThat(entidades.add(nova)).isTrue();
        assertThat(entidades).hasSize(3);
        assertThat(original.equals(original)).isTrue();
        assertThat(original.equals(null)).isFalse();
        assertThat(original).isNotEqualTo(nova);
        assertThat(nova).isNotEqualTo(original);
    }
}
