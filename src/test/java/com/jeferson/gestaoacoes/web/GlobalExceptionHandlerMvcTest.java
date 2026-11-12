package com.jeferson.gestaoacoes.web;

import com.jeferson.gestaoacoes.controller.AcaoController;
import com.jeferson.gestaoacoes.exception.GlobalExceptionHandler;
import com.jeferson.gestaoacoes.mapper.AcaoMapper;
import com.jeferson.gestaoacoes.repository.AcaoRepository;
import com.jeferson.gestaoacoes.security.JwtAuthenticationFilter;
import com.jeferson.gestaoacoes.service.AcaoService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = {AcaoController.class, GlobalExceptionHandlerMvcTest.RequiredParameterTestController.class},
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = JwtAuthenticationFilter.class)
)
@Import({GlobalExceptionHandler.class, GlobalExceptionHandlerMvcTest.RequiredParameterTestController.class})
@WithMockUser
class GlobalExceptionHandlerMvcTest {

    @jakarta.annotation.Resource
    private MockMvc mockMvc;

    @MockBean
    private AcaoService acaoService;

    @MockBean
    private AcaoRepository acaoRepository;

    @MockBean
    private AcaoMapper acaoMapper;

    @Test
    void parametroDeTipoInvalidoDeveRetornarProblemDetailSeguro() throws Exception {
        // Arrange
        String valorInvalido = "MERCADO_INTERNO";

        // Act
        MvcResult resultado = mockMvc.perform(get("/acoes/ticker/PETR4")
                        .param("mercado", valorInvalido))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Parâmetro inválido"))
                .andExpect(jsonPath("$.detail").value("O parâmetro informado possui um valor inválido."))
                .andExpect(jsonPath("$.type")
                        .value("https://gestao-acoes.com/erros/parametro-invalido"))
                .andExpect(jsonPath("$.timestamp").isString())
                .andReturn();

        // Assert
        assertThat(resultado.getResponse().getContentAsString())
                .doesNotContain("MethodArgumentTypeMismatchException", "ConversionFailedException", "stackTrace");
    }

    @Test
    void parametroObrigatorioAusenteDeveRetornarProblemDetailPadronizado() throws Exception {
        // Arrange
        String endpoint = "/acoes/testes/parametro-obrigatorio";

        // Act
        MvcResult resultado = mockMvc.perform(get(endpoint))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Parâmetro obrigatório ausente"))
                .andExpect(jsonPath("$.detail")
                        .value("Um parâmetro obrigatório não foi informado."))
                .andExpect(jsonPath("$.type")
                        .value("https://gestao-acoes.com/erros/parametro-obrigatorio-ausente"))
                .andExpect(jsonPath("$.timestamp").isString())
                .andReturn();

        // Assert
        assertThat(resultado.getResponse().getContentAsString())
                .doesNotContain("MissingServletRequestParameterException", "Required request parameter", "stackTrace");
    }

    @Test
    void metodoHttpNaoPermitidoDeveRetornarProblemDetailSeguro() throws Exception {
        // Arrange
        String endpointSomenteLeitura = "/acoes/ticker/PETR4";

        // Act
        MvcResult resultado = mockMvc.perform(post(endpointSomenteLeitura).with(csrf()))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(405))
                .andExpect(jsonPath("$.title").value("Método não permitido"))
                .andExpect(jsonPath("$.detail")
                        .value("O método HTTP informado não é permitido para este recurso."))
                .andExpect(jsonPath("$.type")
                        .value("https://gestao-acoes.com/erros/metodo-nao-permitido"))
                .andExpect(jsonPath("$.timestamp").isString())
                .andReturn();

        // Assert
        assertThat(resultado.getResponse().getContentAsString())
                .doesNotContain("HttpRequestMethodNotSupportedException", "Request method", "stackTrace");
    }

    @RestController
    public static class RequiredParameterTestController {

        @GetMapping("/acoes/testes/parametro-obrigatorio")
        String consultar(@RequestParam String filtro) {
            return filtro;
        }
    }
}
