# 0002. Token de acesso em memória e refresh token rotativo em cookie

**Status:** aceita

## Contexto
A interface é uma SPA que fala com a API por REST. Guardar o token de sessão em `localStorage` o expõe a qualquer script injetado (XSS); um token de longa duração em cookie simples facilita CSRF e é difícil de revogar.

## Decisão
- Token de acesso (JWT) com validade de 15 minutos, mantido apenas em memória no navegador.
- Refresh token opaco em cookie `httpOnly` e `SameSite=Strict`, restrito ao caminho `/api/auth`.
- O refresh é guardado no banco só como hash e é rotativo: cada uso gera um novo e invalida o anterior.
- Se um refresh já usado for apresentado de novo, a API trata como roubo e revoga todas as sessões do usuário.

## Consequências
- Um XSS não consegue ler o refresh token, e o dano de um token de acesso vazado é limitado a 15 minutos.
- Recarregar a página exige uma chamada de refresh para recuperar a sessão.
- Dois refreshes simultâneos poderiam ser lidos como reuso; por isso o cliente compartilha uma única chamada de refresh em andamento (`apps/web/src/lib/api.ts`).
- O custo é manter estado de sessão no banco, em troca de poder revogar sessões.
