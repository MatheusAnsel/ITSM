# 0003. Responder 404, e não 403, para chamados de outros usuários

**Status:** aceita

## Contexto
O solicitante só pode ver os próprios chamados. Se a API respondesse 403 ao acessar o chamado de outra pessoa, confirmaria que aquele identificador existe, o que permite enumerar chamados por tentativa.

## Decisão
Quando o ator não é equipe de atendimento e não é o dono do chamado, a API responde 404, com a mesma mensagem de um chamado inexistente. A checagem fica em um único ponto de carregamento do serviço de chamados, usado por todas as operações.

## Consequências
- Quem não pode ver um recurso não consegue distinguir "não existe" de "não é seu".
- A depuração fica um pouco menos direta, porque o erro não diz o motivo. O log de auditoria e o `requestId` presente em toda resposta de erro compensam isso.
- Os testes precisam afirmar 404 nesses casos, e não 403.
