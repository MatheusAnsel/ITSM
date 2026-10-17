# 0001. Regras de negócio puras e acesso a dados atrás de repositórios

**Status:** aceita

## Contexto
O núcleo do sistema é regra de negócio: transições de status, cálculo e pausa de SLA, visibilidade de comentários, validação de anexos. Se essas regras ficarem misturadas com Prisma e HTTP, cada teste precisa de banco e o custo de mudar uma regra sobe.

## Decisão
- Regras sem dependência de framework ou banco ficam em arquivos `*.rules.ts`, como funções puras.
- Cada módulo acessa dados por uma interface de repositório. Em produção a implementação usa Prisma (`*.prisma.repository.ts`); nos testes de serviço entra uma implementação em memória.
- Os testes de ponta a ponta sobem o `AppModule` inteiro contra um PostgreSQL real, o que cobre o que os repositórios em memória não enxergam (queries, constraints, transações).

## Consequências
- Os testes unitários são rápidos e não precisam de banco.
- Há duas implementações por repositório para manter alinhadas; o e2e é o que garante que elas se comportam do mesmo jeito.
- Trocar o ORM ou o banco fica restrito aos arquivos `*.prisma.repository.ts`.
