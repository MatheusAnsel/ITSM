# 0005. Validar anexos pelo conteúdo do arquivo, não pela extensão

**Status:** aceita

## Contexto
Anexos enviados por usuários são a principal porta de entrada de conteúdo não confiável. Extensão e `Content-Type` vêm do cliente e podem ser forjados.

## Decisão
- O tipo é decidido pelos primeiros bytes do arquivo (PNG, JPEG, PDF, TXT e LOG); o que não casar é rejeitado.
- O arquivo é salvo em disco com nome aleatório, nunca com o nome enviado.
- O download só acontece por rota autenticada, sempre como `attachment` e sem cache.
- O armazenamento fica atrás de uma interface, para trocar o disco por um storage compatível com S3 sem mexer nas regras.

## Consequências
- Um executável renomeado para `.png` não passa.
- A lista de formatos é fechada; aceitar um novo formato exige uma regra nova e um teste.
- No plano gratuito da demonstração o disco não é persistente, por isso os anexos enviados lá não são permanentes.
