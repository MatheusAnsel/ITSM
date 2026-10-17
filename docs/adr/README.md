# Decisões de arquitetura (ADRs)

Registros curtos das decisões que moldam o projeto: o contexto, o que foi escolhido e o que se ganha e se perde com isso.

| # | Decisão |
|---|---|
| [0001](0001-repositorios-e-regras-puras.md) | Regras de negócio puras e acesso a dados atrás de repositórios |
| [0002](0002-sessao-com-refresh-rotativo.md) | Token de acesso em memória e refresh token rotativo em cookie |
| [0003](0003-404-para-chamados-de-outros.md) | Responder 404, e não 403, para chamados de outros usuários |
| [0004](0004-trava-otimista-por-status.md) | Concorrência no chamado por trava otimista sobre o status |
| [0005](0005-validacao-de-anexos-por-conteudo.md) | Validar anexos pelo conteúdo do arquivo, não pela extensão |
