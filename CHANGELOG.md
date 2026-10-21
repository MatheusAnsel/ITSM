# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.2.1] - 2026-10-21

### Alterado

- Atualiza dependências: Next.js 16.4.2, @nestjs/common 12.1.3, ts-jest 29.4.15 e typescript-eslint 8.71.2
- Atualiza actions do CI: setup-node v7, upload-artifact v7 e docker/build-push-action v7
- Remove a configuração do Dependabot

### Documentação

- CHANGELOG com o histórico de versões

## [1.2.0] - 2026-10-16

### Adicionado

- Logs estruturados em JSON, log de acesso e commit no health check
- Verificação pós-deploy (smoke test) no CI
- Testes do frontend com Vitest e Testing Library, com cobertura no CI
- Testes em navegador com Playwright e job no CI
- Diagrama de arquitetura e ADRs
- Favicon e ícone para iOS

### Corrigido

- Renovação de sessão devolvia null depois de um carregamento sem login
- Cadastro explica o motivo do erro em vez de ficar parado

### Documentação

- README voltado a recrutadores e especificação completa em docs/ESPECIFICACAO.md

## [1.1.0] - 2026-10-15

### Adicionado

- Demonstração online (Render, Vercel e Supabase)
- Botões de entrada com um clique na demonstração

### Alterado

- Tema claro e sóbrio no frontend
- Remove botão duplicado de novo chamado na lista

### Corrigido

- Trava otimista do chamado passa a atualizar updatedAt (nota interna gerava 409 falso)
- CI roda o seed antes do e2e

## [1.0.0] - 2026-10-14

### Adicionado

- Módulo de anexos com validação pelo conteúdo, limites e download autenticado
- Diretório de usuários ativos para gestores
- Seed de demonstração determinístico com 48 chamados coerentes
- Telas de ativos, SLA, categorias, usuários e auditoria ligadas à API, com cabeçalhos de segurança
- Testes e2e contra PostgreSQL real
- Dockerfiles multi-stage, Compose completo e jobs de e2e e Docker no CI

### Documentação

- README com status real, capturas de tela, testes e como rodar

## [0.2.0] - 2026-10-09

### Adicionado

- Ativos com regras de situação e responsável (RN-09)
- Políticas de SLA por prioridade, com validação
- Trilha de auditoria por interceptor global e GET /audit com filtros
- Migration inicial, seed, fechamento automático de chamados (RN-07) e endpoints do dashboard

## [0.1.0] - 2026-10-04

### Adicionado

- Especificação do projeto: escopo, requisitos, regras de negócio, modelo de dados e API
- Monorepo com API NestJS e Prisma, configuração validada, health check e CI
- Autenticação: cadastro, login, refresh token rotativo, logout, guards globais e perfis
- Gestão de usuários pelo administrador
- Regras puras de status e SLA dos chamados, com testes
- Endpoints de chamados e categorias com visibilidade por perfil, SLA e histórico
- Base do frontend Next.js: shell, login, painel, chamados e ativos

### Segurança

- Força deepmerge-ts 8.0.2 (vulnerabilidade alta apontada pelo npm audit)

[1.2.1]: https://github.com/MatheusAnsel/ITSM/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/MatheusAnsel/ITSM/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/MatheusAnsel/ITSM/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/MatheusAnsel/ITSM/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/MatheusAnsel/ITSM/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/MatheusAnsel/ITSM/releases/tag/v0.1.0
