export const PERFIS_USUARIO = Object.freeze(['USER', 'ADMIN']);

export function criarFormularioUsuario() {
    return { nome: '', email: '', senha: '', confirmacaoSenha: '', perfil: 'USER' };
}

export function validarSenha(novaSenha = '', confirmacaoSenha = '') {
    const erros = {};
    if (!novaSenha) erros.novaSenha = 'Informe a nova senha.';
    else if (novaSenha.length < 8 || novaSenha.length > 72) erros.novaSenha = 'A senha deve ter entre 8 e 72 caracteres.';
    if (!confirmacaoSenha) erros.confirmacaoSenha = 'Confirme a nova senha.';
    else if (novaSenha !== confirmacaoSenha) erros.confirmacaoSenha = 'As senhas não coincidem.';
    return erros;
}

export function validarFormularioUsuario({ nome = '', email = '', senha = '', confirmacaoSenha = '', perfil = '' } = {}) {
    const erros = {};
    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim();
    if (!nomeLimpo) erros.nome = 'Informe o nome.';
    else if (nome.length > 120) erros.nome = 'O nome deve ter no máximo 120 caracteres.';
    if (!emailLimpo) erros.email = 'Informe o e-mail.';
    else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) erros.email = 'Informe um e-mail válido.';
    if (!senha) erros.senha = 'Informe a senha.';
    else if (senha.length < 8 || senha.length > 72) erros.senha = 'A senha deve ter entre 8 e 72 caracteres.';
    if (!confirmacaoSenha) erros.confirmacaoSenha = 'Confirme a senha.';
    else if (senha !== confirmacaoSenha) erros.confirmacaoSenha = 'As senhas não coincidem.';
    if (!PERFIS_USUARIO.includes(perfil)) erros.perfil = 'Selecione um perfil válido.';
    return erros;
}

export function prepararCadastroUsuario({ nome, email, senha, perfil }) {
    return { nome: nome.trim(), email: email.trim().toLowerCase(), senha, perfil };
}

export function formatarDataCadastro(valor) {
    if (!valor) return 'Não informada';
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return 'Não informada';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data);
}

export function mensagemFalhaUsuario(falha, fallback) {
    if (falha?.name === 'AbortError') return '';
    if (!falha?.status) return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    return falha.message || fallback;
}
