# 0004. Concorrência no chamado por trava otimista sobre o status

**Status:** aceita

## Contexto
Atendentes e gestor podem mexer no mesmo chamado ao mesmo tempo. Sem controle, a última gravação sobrescreve a anterior em silêncio e o histórico deixa de refletir a realidade.

## Decisão
A atualização é condicional: o `UPDATE` só se aplica se o status do chamado ainda for o que foi lido (`WHERE id = ? AND status = ?`). Se nenhuma linha for afetada, a API responde 409 pedindo que a pessoa recarregue. A mudança e as linhas de histórico são gravadas na mesma transação.

## Consequências
- Sem lock de linha e sem coluna de versão: simples, e suficiente porque a corrida que importa é a de mudança de status.
- A trava protege o status, não todos os campos; duas edições concorrentes de campos que não mudam o status não geram conflito.
- Se no futuro for preciso proteger qualquer campo, o caminho natural é uma coluna de versão incrementada a cada gravação.
