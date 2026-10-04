# ITSM: Sistema de Gestão de Chamados e Ativos de TI

Sistema web para registrar, acompanhar e resolver chamados de suporte de TI, controlar o parque de ativos (equipamentos) e medir o atendimento por SLA, com dashboard gerencial e trilha de auditoria.

> **Status: Fase 1 (fundação) em andamento.** Já existem no repositório: monorepo com npm workspaces, schema Prisma completo, API NestJS com configuração validada na inicialização, health check, rate limiting, Helmet, CORS restrito, `requestId` e resposta de erro padronizada, Docker Compose com PostgreSQL e CI no GitHub Actions. A **autenticação** (cadastro, login, refresh token rotativo com detecção de reuso, logout, troca de senha, guards globais de JWT e de perfil) está implementada e coberta por testes unitários. A **gestão de usuários** pelo administrador (criar, listar com busca e paginação, editar, ativar/desativar, lista de atendentes) também está implementada, com proteção contra o administrador alterar a si mesmo ou remover o último administrador ativo. As **regras puras de chamados e SLA** (fluxo de status, permissões de transição, vencimentos, pausa, primeira resposta, violação e fechamento automático) estão implementadas e testadas, mas ainda não expostas por endpoints. **Ainda não existem:** migration inicial versionada, seed, endpoints de chamados, categorias, SLA, ativos, dashboard e auditoria, frontend e Dockerfiles. O restante deste documento descreve o **planejado**, e cada seção será validada e ajustada durante a implementação. A [seção 17](#17-roadmap-de-implementação) mostra a ordem prevista de construção.

## Sumário

1. [Objetivo](#1-objetivo)
2. [Escopo](#2-escopo)
3. [Perfis e permissões](#3-perfis-e-permissões)
4. [Requisitos funcionais](#4-requisitos-funcionais)
5. [Requisitos não funcionais](#5-requisitos-não-funcionais)
6. [Regras de negócio](#6-regras-de-negócio)
7. [Casos de uso](#7-casos-de-uso)
8. [Fluxos críticos](#8-fluxos-críticos)
9. [Arquitetura](#9-arquitetura)
10. [Modelo de dados](#10-modelo-de-dados)
11. [API REST](#11-api-rest)
12. [Telas do frontend](#12-telas-do-frontend)
13. [Segurança](#13-segurança)
14. [Estratégia de testes e qualidade](#14-estratégia-de-testes-e-qualidade)
15. [Infraestrutura e CI](#15-infraestrutura-e-ci)
16. [Variáveis de ambiente](#16-variáveis-de-ambiente)
17. [Roadmap de implementação](#17-roadmap-de-implementação)
18. [Como rodar (previsto)](#18-como-rodar-previsto)
19. [Decisões em aberto](#19-decisões-em-aberto)
20. [Licença e autor](#20-licença-e-autor)

---

## 1. Objetivo

Construir um projeto de portfólio completo, orientado ao trabalho de **Analista de Sistemas**, que mostre no mesmo repositório:

- levantamento de requisitos e regras de negócio;
- modelagem de processos, de dados e de casos de uso;
- desenvolvimento de API e interface;
- integração entre as partes e banco de dados relacional;
- testes automatizados e documentação;
- pontos de sustentação (logs, auditoria, health check, deploy).

O domínio escolhido é o de **ITSM** (gerenciamento de serviços de TI), inspirado em ferramentas de service desk reais, porém com escopo reduzido e realista para um projeto individual.

## 2. Escopo

### Dentro do escopo

| Módulo | O que cobre |
|---|---|
| Autenticação | Cadastro, login, renovação de sessão e logout |
| Usuários | Gestão de contas e perfis de acesso |
| Chamados | Abertura, triagem, atendimento, comentários, anexos, histórico e encerramento |
| SLA | Políticas de prazo por prioridade, cálculo de vencimento e indicador de cumprimento |
| Ativos de TI | Cadastro do parque, situação, responsável e vínculo com chamados |
| Categorias | Classificação dos chamados |
| Dashboard | Indicadores gerenciais |
| Auditoria | Registro de ações relevantes, consultável por administradores |

### Fora do escopo (nesta versão)

- Calendário de horário comercial e feriados no SLA (o SLA usa tempo corrido; ver [decisões em aberto](#19-decisões-em-aberto)).
- Abertura de chamados por e-mail e notificações por e-mail ou push.
- Multiempresa (multi-tenant). O sistema atende uma única organização.
- Integrações externas (AD/LDAP, SSO, Slack, WhatsApp).
- Base de conhecimento e catálogo de serviços.
- Aplicativo mobile (a interface será responsiva).

## 3. Perfis e permissões

Quatro perfis, definidos por um campo `role` no usuário.

| Perfil | Descrição |
|---|---|
| `REQUESTER` | Solicitante. Funcionário que abre chamados. Perfil padrão no auto-cadastro |
| `AGENT` | Atendente de suporte. Trata os chamados |
| `MANAGER` | Gestor de TI. Acompanha indicadores, distribui chamados e gere ativos |
| `ADMIN` | Administrador do sistema. Gere usuários, categorias, SLA e consulta a auditoria |

Matriz de permissões:

| Ação | REQUESTER | AGENT | MANAGER | ADMIN |
|---|:-:|:-:|:-:|:-:|
| Abrir chamado | sim | sim | sim | sim |
| Ver chamados | só os próprios | todos | todos | todos |
| Comentar em chamado | nos próprios | em qualquer | em qualquer | em qualquer |
| Comentário interno (invisível ao solicitante) | não | sim | sim | sim |
| Anexar arquivo | nos próprios | em qualquer | em qualquer | em qualquer |
| Cancelar chamado | próprio, se `OPEN` | sim | sim | sim |
| Reabrir chamado `RESOLVED` | próprio | sim | sim | sim |
| Assumir chamado (atribuir a si) | não | sim | sim | sim |
| Atribuir chamado a outro atendente | não | não | sim | sim |
| Alterar status e prioridade | não | sim | sim | sim |
| Ver ativos | não | sim | sim | sim |
| Criar e editar ativos | não | não | sim | sim |
| Ver dashboard | não | não | sim | sim |
| Ver políticas de SLA | não | sim | sim | sim |
| Editar políticas de SLA | não | não | não | sim |
| Gerir categorias | não | não | não | sim |
| Gerir usuários e perfis | não | não | não | sim |
| Consultar auditoria | não | não | não | sim |

## 4. Requisitos funcionais

Prioridade: **A** (essencial), **M** (média), **B** (baixa).

### Autenticação e sessão

| ID | Requisito | Prio |
|---|---|:-:|
| RF-01 | O usuário pode se auto-cadastrar informando nome, e-mail e senha; o perfil inicial é `REQUESTER` | A |
| RF-02 | O usuário pode fazer login com e-mail e senha | A |
| RF-03 | A sessão é renovada sem novo login enquanto o refresh token for válido | A |
| RF-04 | O usuário pode fazer logout, o que invalida o refresh token | A |
| RF-05 | O usuário pode consultar os próprios dados e alterar a própria senha | M |

### Usuários

| ID | Requisito | Prio |
|---|---|:-:|
| RF-06 | O administrador cria usuários e define o perfil | A |
| RF-07 | O administrador lista, busca, edita, altera perfil e ativa/desativa usuários | A |
| RF-08 | Usuário desativado não consegue autenticar nem renovar sessão | A |

### Chamados

| ID | Requisito | Prio |
|---|---|:-:|
| RF-09 | Abrir chamado com título, descrição, categoria, prioridade e ativo relacionado (opcional) | A |
| RF-10 | Cada chamado recebe um número sequencial legível (por exemplo, #1042) | A |
| RF-11 | Listar chamados com filtros (status, prioridade, categoria, atendente, solicitante, período, SLA vencido), busca por texto e paginação | A |
| RF-12 | Ver o detalhe de um chamado com comentários, anexos e histórico | A |
| RF-13 | Atribuir ou reatribuir atendente | A |
| RF-14 | Alterar status seguindo o fluxo permitido (ver RN-02) | A |
| RF-15 | Alterar prioridade, recalculando os prazos de SLA | M |
| RF-16 | Comentar no chamado, com opção de comentário interno | A |
| RF-17 | Anexar e baixar arquivos do chamado | M |
| RF-18 | Registrar automaticamente cada alteração relevante no histórico do chamado | A |
| RF-19 | O solicitante pode cancelar o próprio chamado enquanto estiver aberto e reabrir um chamado resolvido | M |
| RF-20 | Fechar automaticamente chamados resolvidos sem resposta após o prazo de confirmação (RN-07) | M |

### SLA

| ID | Requisito | Prio |
|---|---|:-:|
| RF-21 | Manter uma política de SLA por prioridade (tempo de primeira resposta e de resolução) | A |
| RF-22 | Calcular, na abertura, o vencimento de resposta e de resolução do chamado | A |
| RF-23 | Indicar visualmente chamados próximos do vencimento e vencidos | A |
| RF-24 | Pausar o relógio de resolução enquanto o chamado aguarda o solicitante (RN-05) | M |

### Ativos de TI

| ID | Requisito | Prio |
|---|---|:-:|
| RF-25 | Cadastrar ativo com patrimônio (tag) único, nome, tipo, número de série, data de compra e observações | A |
| RF-26 | Controlar a situação do ativo e o responsável atual | A |
| RF-27 | Listar e filtrar ativos por tipo, situação e responsável | A |
| RF-28 | Ver o histórico de chamados vinculados a um ativo | M |

### Categorias

| ID | Requisito | Prio |
|---|---|:-:|
| RF-29 | O administrador cria, edita e desativa categorias de chamado | A |

### Dashboard

| ID | Requisito | Prio |
|---|---|:-:|
| RF-30 | Mostrar totais por status e por prioridade | A |
| RF-31 | Mostrar o percentual de chamados atendidos dentro do SLA no período | A |
| RF-32 | Mostrar o tempo médio de primeira resposta e de resolução | M |
| RF-33 | Mostrar chamados por categoria e carga de trabalho por atendente | M |
| RF-34 | Mostrar a evolução do volume de chamados nos últimos 30 dias | M |

### Auditoria

| ID | Requisito | Prio |
|---|---|:-:|
| RF-35 | Registrar as ações listadas em RN-10, com autor, data, entidade afetada e IP | A |
| RF-36 | O administrador consulta o log com filtros por ação, entidade, autor e período | M |

## 5. Requisitos não funcionais

| ID | Categoria | Requisito |
|---|---|---|
| RNF-01 | Segurança | Senhas com hash bcrypt (custo 12); nenhuma senha ou token em logs |
| RNF-02 | Segurança | Controle de acesso por perfil aplicado no servidor em toda rota protegida |
| RNF-03 | Segurança | Validação de entrada em todas as rotas (tipos, tamanhos, formatos) |
| RNF-04 | Segurança | Limite de requisições (rate limiting), mais restrito nas rotas de autenticação |
| RNF-05 | Desempenho | Listagens sempre paginadas; índices nas colunas de filtro mais usadas |
| RNF-06 | Confiabilidade | Alterações que tocam mais de uma tabela (por exemplo, mudar status e gravar histórico) ocorrem em uma única transação |
| RNF-07 | Manutenibilidade | Regras de negócio isoladas em funções puras, testáveis sem banco |
| RNF-08 | Manutenibilidade | Código tipado (TypeScript estrito), lint e formatação padronizados |
| RNF-09 | Observabilidade | Endpoint de health check e logs estruturados com identificador de requisição |
| RNF-10 | Portabilidade | Ambiente completo sobe com Docker Compose |
| RNF-11 | Usabilidade | Interface responsiva (desktop e celular) |
| RNF-12 | Documentação | A API é documentada via OpenAPI/Swagger, mantido desligado em produção por padrão |
| RNF-13 | Privacidade | Dados pessoais limitados ao necessário (nome e e-mail) |

## 6. Regras de negócio

**RN-01. Prioridades.** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. A prioridade inicial vem do solicitante, e apenas atendentes, gestores e administradores podem alterá-la depois.

**RN-02. Fluxo de status.** Apenas as transições abaixo são válidas; qualquer outra é rejeitada.

| De | Para |
|---|---|
| `OPEN` | `IN_PROGRESS`, `CANCELLED` |
| `IN_PROGRESS` | `WAITING_USER`, `RESOLVED`, `CANCELLED` |
| `WAITING_USER` | `IN_PROGRESS`, `CANCELLED` |
| `RESOLVED` | `CLOSED`, `IN_PROGRESS` (reabertura) |
| `CLOSED` | (final) |
| `CANCELLED` | (final) |

**RN-03. Atribuição.** Ao assumir um chamado `OPEN`, o atendente passa a ser o responsável e o status vai para `IN_PROGRESS`. Um chamado só pode ser atribuído a usuário ativo com perfil `AGENT`, `MANAGER` ou `ADMIN`.

**RN-04. Política de SLA padrão.** Tempos em minutos corridos, editáveis pelo administrador.

| Prioridade | Primeira resposta | Resolução |
|---|---|---|
| `CRITICAL` | 15 min | 4 h |
| `HIGH` | 1 h | 8 h |
| `MEDIUM` | 4 h | 24 h |
| `LOW` | 8 h | 72 h |

Na abertura: `vencimento_resposta = criado_em + primeira_resposta` e `vencimento_resolução = criado_em + resolução`. Se a prioridade mudar, os vencimentos são recalculados a partir da data de abertura, descontado o tempo pausado.

**RN-05. Pausa do SLA.** Enquanto o status for `WAITING_USER`, o relógio de resolução fica pausado. Ao sair desse status, o tempo parado é somado ao vencimento de resolução. O relógio de primeira resposta não pausa.

**RN-06. Primeira resposta.** Conta como primeira resposta o primeiro comentário público de um atendente, gestor ou administrador, ou a mudança do chamado para `IN_PROGRESS` por um deles, o que ocorrer primeiro. Comentários do solicitante e comentários internos não contam.

**RN-07. Fechamento automático.** Um chamado `RESOLVED` vai para `CLOSED` após 3 dias sem reabertura. Se o solicitante comentar ou reabrir nesse prazo, o chamado volta para `IN_PROGRESS`.

**RN-08. Violação de SLA.** O chamado está com resposta violada se `primeira_resposta` não ocorreu até `vencimento_resposta`. Está com resolução violada se `resolvido_em` for posterior a `vencimento_resolução` (ou, se ainda não resolvido, se o prazo já passou). O percentual de cumprimento do dashboard considera apenas chamados resolvidos no período.

**RN-09. Ativos.** O número de patrimônio (`tag`) é único. Situações: `IN_STOCK`, `IN_USE`, `MAINTENANCE`, `RETIRED`. Ativo `IN_USE` exige responsável. Ativo `RETIRED` não pode ser vinculado a novos chamados nem ter responsável. Ativos não são excluídos, apenas aposentados, para preservar o histórico.

**RN-10. Eventos auditados.** Login (sucesso e falha), logout, criação e alteração de usuário, mudança de perfil, ativação/desativação, alteração de política de SLA, criação e edição de categoria, criação e edição de ativo, atribuição, mudança de status e de prioridade de chamado, cancelamento e reabertura.

**RN-11. Comentários internos.** Visíveis apenas para `AGENT`, `MANAGER` e `ADMIN`. A API nunca os devolve ao solicitante.

**RN-12. Anexos.** Até 10 arquivos por chamado, máximo de 5 MB cada. Tipos aceitos: PNG, JPEG, PDF, TXT e LOG. O nome original é preservado apenas para exibição; o arquivo é guardado com nome aleatório, e o download passa por verificação de permissão.

**RN-13. Exclusão.** Chamados, comentários, histórico e logs de auditoria nunca são apagados pela aplicação. Usuários e categorias são desativados, não excluídos.

**RN-14. Histórico do chamado.** Registra criação, mudança de status, de prioridade, de atendente, de categoria e de ativo, sempre com autor, data, valor anterior e novo valor.

## 7. Casos de uso

| ID | Caso de uso | Ator principal | Resumo |
|---|---|---|---|
| UC-01 | Cadastrar-se | Visitante | Informa nome, e-mail e senha e passa a ter conta `REQUESTER` |
| UC-02 | Autenticar-se | Qualquer usuário | Faz login e recebe sessão |
| UC-03 | Abrir chamado | Solicitante | Descreve o problema, escolhe categoria e prioridade; o sistema calcula o SLA |
| UC-04 | Acompanhar chamado | Solicitante | Consulta o status, comenta e anexa arquivos |
| UC-05 | Assumir chamado | Atendente | Escolhe um chamado `OPEN` da fila e passa a ser o responsável |
| UC-06 | Atender chamado | Atendente | Comenta, anexa, altera status até resolver |
| UC-07 | Distribuir chamado | Gestor | Atribui ou reatribui chamados a atendentes |
| UC-08 | Confirmar ou reabrir resolução | Solicitante | Reabre um chamado resolvido que não foi solucionado |
| UC-09 | Gerir ativos | Gestor | Cadastra, atualiza situação e responsável |
| UC-10 | Vincular ativo a chamado | Solicitante/Atendente | Associa um equipamento ao chamado |
| UC-11 | Consultar indicadores | Gestor | Acompanha SLA, volume, tempos e carga |
| UC-12 | Gerir usuários | Administrador | Cria usuários, altera perfis, ativa/desativa |
| UC-13 | Configurar SLA e categorias | Administrador | Ajusta políticas e catálogo de categorias |
| UC-14 | Consultar auditoria | Administrador | Filtra o log de ações |

### Detalhe: UC-03 Abrir chamado

- **Pré-condição:** usuário autenticado e ativo.
- **Fluxo principal:** (1) o usuário informa título, descrição, categoria e prioridade; (2) opcionalmente seleciona um ativo; (3) o sistema valida os dados; (4) grava o chamado com status `OPEN`; (5) calcula `vencimento_resposta` e `vencimento_resolução` pela política da prioridade; (6) registra a criação no histórico e na auditoria; (7) devolve o chamado com seu número.
- **Fluxos alternativos:** dados inválidos (retorna erros por campo); categoria inativa (rejeita); ativo `RETIRED` (rejeita, RN-09); solicitante sem permissão sobre o ativo informado (não se aplica nesta versão, qualquer ativo ativo pode ser vinculado).
- **Pós-condição:** chamado visível ao solicitante e na fila dos atendentes.

### Detalhe: UC-06 Atender chamado

- **Pré-condição:** atendente autenticado; chamado em `OPEN`, `IN_PROGRESS` ou `WAITING_USER`.
- **Fluxo principal:** (1) abre o chamado; (2) assume, se ainda não tiver responsável; (3) registra comentários públicos ou internos; (4) muda o status conforme RN-02; (5) ao resolver, `resolvido_em` é gravado e o prazo de confirmação (RN-07) começa a contar.
- **Fluxos alternativos:** transição inválida (rejeitada com a lista de transições permitidas); aguardando usuário (SLA pausa, RN-05).

## 8. Fluxos críticos

### 8.1 Ciclo de vida do chamado

```mermaid
stateDiagram-v2
    [*] --> OPEN: abertura
    OPEN --> IN_PROGRESS: atendente assume
    OPEN --> CANCELLED: cancelado
    IN_PROGRESS --> WAITING_USER: aguarda solicitante
    IN_PROGRESS --> RESOLVED: solução aplicada
    IN_PROGRESS --> CANCELLED: cancelado
    WAITING_USER --> IN_PROGRESS: solicitante responde
    WAITING_USER --> CANCELLED: cancelado
    RESOLVED --> CLOSED: confirmação ou 3 dias sem resposta
    RESOLVED --> IN_PROGRESS: reabertura
    CLOSED --> [*]
    CANCELLED --> [*]
```

### 8.2 Abertura de chamado com cálculo de SLA

```mermaid
sequenceDiagram
    actor U as Solicitante
    participant W as Web
    participant A as API
    participant D as PostgreSQL
    U->>W: preenche formulário
    W->>A: POST /api/tickets
    A->>A: valida token, perfil e dados
    A->>D: busca política de SLA da prioridade
    A->>D: transação: cria chamado, histórico e auditoria
    D-->>A: chamado criado (número sequencial)
    A-->>W: 201 com chamado e prazos
    W-->>U: exibe chamado aberto
```

### 8.3 Sessão com refresh token rotativo

```mermaid
sequenceDiagram
    participant W as Web
    participant A as API
    participant D as PostgreSQL
    W->>A: POST /api/auth/login
    A->>D: valida credenciais, grava hash do refresh token
    A-->>W: access token (corpo) + refresh token (cookie httpOnly)
    W->>A: requisições com access token (15 min)
    A-->>W: 401 quando o access token expira
    W->>A: POST /api/auth/refresh (cookie)
    A->>D: confere hash, revoga o token usado, emite novo par
    A-->>W: novo access token + novo cookie
    Note over A,D: reuso de um refresh token já revogado<br/>revoga todas as sessões do usuário
```

### 8.4 Cálculo de SLA e pausa

```mermaid
flowchart TD
    A[Chamado criado] --> B[Busca política da prioridade]
    B --> C[vencimento_resposta = criado_em + primeira_resposta]
    B --> D[vencimento_resolucao = criado_em + resolucao]
    D --> E{Status mudou para WAITING_USER?}
    E -- sim --> F[Registra inicio da pausa]
    F --> G{Saiu de WAITING_USER?}
    G -- sim --> H[Soma tempo pausado ao vencimento_resolucao]
    E -- nao --> I{Prioridade mudou?}
    I -- sim --> J[Recalcula a partir de criado_em, descontando a pausa]
    I -- nao --> K[Mantem prazos]
```

## 9. Arquitetura

### 9.1 Visão geral

```mermaid
flowchart LR
    B[Navegador] -->|HTTPS| W[Web: Next.js]
    W -->|REST JSON| A[API: NestJS]
    A --> D[(PostgreSQL)]
    A --> F[(Armazenamento de anexos)]
```

- **Web (Next.js):** interface; não contém regra de negócio, apenas apresentação e chamadas à API.
- **API (NestJS):** autenticação, autorização por perfil, regras de negócio, acesso ao banco.
- **PostgreSQL:** dados relacionais, via Prisma.
- **Anexos:** disco local em desenvolvimento, atrás de uma interface de armazenamento que permite trocar por um storage S3-compatível.

### 9.2 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, Recharts |
| Backend | Node.js, NestJS, TypeScript, API REST |
| Banco | PostgreSQL com Prisma ORM e migrations versionadas |
| Autenticação | JWT de acesso (curta duração) + refresh token rotativo em cookie httpOnly |
| Validação | class-validator nos DTOs; Zod para variáveis de ambiente |
| Infra | Docker e Docker Compose |
| Documentação da API | Swagger/OpenAPI |
| Qualidade | Jest, Supertest, ESLint, Prettier |
| CI | GitHub Actions |

### 9.3 Organização do código (prevista)

```
ITSM/
├── apps/
│   ├── api/                  NestJS
│   │   ├── prisma/           schema, migrations, seed
│   │   ├── src/
│   │   │   ├── common/       guards, decorators, filtros, interceptors
│   │   │   ├── config/       validação de variáveis de ambiente
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       ├── users/
│   │   │       ├── categories/
│   │   │       ├── sla/
│   │   │       ├── tickets/  (comentários, anexos, histórico)
│   │   │       ├── assets/
│   │   │       ├── dashboard/
│   │   │       ├── audit/
│   │   │       └── health/
│   │   └── test/             testes e2e
│   └── web/                  Next.js
├── docker-compose.yml
├── .github/workflows/
├── .env.example
└── README.md
```

Cada módulo da API segue a mesma estrutura: `controller` (HTTP), `service` (casos de uso), `dto` (entrada/saída) e, quando houver regra pura, um arquivo de **regras** sem dependência de framework ou banco (por exemplo, transições de status e cálculo de SLA).

### 9.4 Padrões adotados

- Prefixo global `/api` e versionamento futuro por prefixo (`/api/v2`).
- Resposta de erro padronizada: `statusCode`, `message`, `errors` (por campo, quando houver) e `requestId`.
- Paginação padrão: `?page=1&perPage=25` (máximo 100); resposta com `data` e `meta` (`page`, `perPage`, `total`, `totalPages`).
- Datas em UTC (ISO 8601) na API; a interface converte para o fuso do navegador.
- Filtros montados somente com parâmetros do ORM; texto do usuário nunca é concatenado em consultas.

## 10. Modelo de dados

### 10.1 Diagrama entidade-relacionamento

```mermaid
erDiagram
    USER ||--o{ TICKET : abre
    USER |o--o{ TICKET : atende
    CATEGORY ||--o{ TICKET : classifica
    ASSET |o--o{ TICKET : relaciona
    USER |o--o{ ASSET : responsavel
    TICKET ||--o{ TICKET_COMMENT : possui
    TICKET ||--o{ TICKET_HISTORY : registra
    TICKET ||--o{ ATTACHMENT : possui
    USER ||--o{ TICKET_COMMENT : escreve
    USER ||--o{ TICKET_HISTORY : executa
    USER ||--o{ ATTACHMENT : envia
    USER ||--o{ REFRESH_TOKEN : possui
    USER |o--o{ AUDIT_LOG : gera

    USER {
        uuid id PK
        string email UK
        enum role
    }
    TICKET {
        uuid id PK
        int number UK
        enum status
        enum priority
    }
    ASSET {
        uuid id PK
        string tag UK
        enum status
    }
    SLA_POLICY {
        uuid id PK
        enum priority UK
    }
```

### 10.2 Entidades

**User**

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | PK |
| name | texto | obrigatório |
| email | texto | único, normalizado em minúsculas |
| passwordHash | texto | bcrypt |
| role | enum `Role` | padrão `REQUESTER` |
| active | booleano | padrão verdadeiro |
| createdAt, updatedAt | timestamp | |

**RefreshToken**

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK para User, exclusão em cascata |
| tokenHash | texto | único; guarda apenas o hash do token |
| expiresAt | timestamp | |
| revokedAt | timestamp | nulo enquanto válido |
| createdAt | timestamp | |

**Category**

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | PK |
| name | texto | único |
| description | texto | opcional |
| active | booleano | padrão verdadeiro |

**SlaPolicy**

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | PK |
| priority | enum `Priority` | único (uma política por prioridade) |
| firstResponseMinutes | inteiro | maior que zero |
| resolutionMinutes | inteiro | maior ou igual ao tempo de resposta |
| updatedAt | timestamp | |

**Ticket**

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | PK |
| number | inteiro | único, sequencial gerado pelo banco |
| title | texto | 5 a 150 caracteres |
| description | texto | 10 a 5000 caracteres |
| status | enum `TicketStatus` | padrão `OPEN` |
| priority | enum `Priority` | padrão `MEDIUM` |
| categoryId | UUID | FK para Category |
| requesterId | UUID | FK para User |
| assigneeId | UUID | FK para User, opcional |
| assetId | UUID | FK para Asset, opcional |
| responseDueAt | timestamp | calculado (RN-04) |
| resolutionDueAt | timestamp | calculado (RN-04, RN-05) |
| slaPausedAt | timestamp | preenchido enquanto em `WAITING_USER` |
| firstRespondedAt | timestamp | RN-06 |
| resolvedAt | timestamp | quando vai para `RESOLVED` |
| closedAt | timestamp | quando vai para `CLOSED` |
| createdAt, updatedAt | timestamp | |

Índices: `status`, `priority`, `requesterId`, `assigneeId`, `createdAt`.

**TicketComment:** `id`, `ticketId` (FK, cascata), `authorId` (FK), `body`, `internal` (booleano), `createdAt`. Índice em `ticketId`.

**TicketHistory:** `id`, `ticketId` (FK, cascata), `actorId` (FK), `action` (texto, por exemplo `STATUS_CHANGED`), `fromValue`, `toValue`, `createdAt`. Índice em `ticketId`.

**Attachment:** `id`, `ticketId` (FK, cascata), `uploaderId` (FK), `filename` (nome original), `mimeType`, `size`, `storageKey` (único, nome aleatório no armazenamento), `createdAt`.

**Asset**

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | PK |
| tag | texto | único (patrimônio) |
| name | texto | obrigatório |
| type | enum `AssetType` | `NOTEBOOK`, `DESKTOP`, `MONITOR`, `PRINTER`, `PHONE`, `NETWORK`, `SERVER`, `OTHER` |
| status | enum `AssetStatus` | `IN_STOCK`, `IN_USE`, `MAINTENANCE`, `RETIRED` |
| serialNumber | texto | opcional |
| purchaseDate | data | opcional |
| notes | texto | opcional |
| assignedToId | UUID | FK para User, opcional |
| createdAt, updatedAt | timestamp | |

**AuditLog:** `id`, `actorId` (FK opcional; vira nulo se o usuário for removido), `action`, `entity`, `entityId`, `metadata` (JSON), `ip`, `createdAt`. Índices em `(entity, entityId)`, `actorId` e `createdAt`.

### 10.3 Enums

- `Role`: `ADMIN`, `MANAGER`, `AGENT`, `REQUESTER`
- `TicketStatus`: `OPEN`, `IN_PROGRESS`, `WAITING_USER`, `RESOLVED`, `CLOSED`, `CANCELLED`
- `Priority`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `AssetType` e `AssetStatus`: conforme a tabela de Asset.

### 10.4 Dados iniciais (seed, somente desenvolvimento)

- Quatro políticas de SLA (RN-04).
- Categorias de exemplo: Hardware, Software, Rede, Acesso e Contas, Impressão, Outros.
- Um usuário por perfil, com senha definida por variável de ambiente (`SEED_ADMIN_PASSWORD`); nenhuma credencial fixa no repositório.
- O seed não pode ser executado com `NODE_ENV=production`.

## 11. API REST

Prefixo `/api`. Todas as rotas, exceto as marcadas como públicas, exigem `Authorization: Bearer <access token>`.

### Autenticação

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| POST | `/auth/register` | público | Auto-cadastro (`REQUESTER`) |
| POST | `/auth/login` | público | Login; devolve access token e define o cookie de refresh |
| POST | `/auth/refresh` | cookie | Renova a sessão com rotação do refresh token |
| POST | `/auth/logout` | autenticado | Revoga o refresh token atual |
| GET | `/auth/me` | autenticado | Dados do usuário logado |
| PATCH | `/auth/me/password` | autenticado | Altera a própria senha |

### Usuários

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/users` | ADMIN | Lista com busca e paginação |
| POST | `/users` | ADMIN | Cria usuário com perfil |
| GET | `/users/:id` | ADMIN | Detalhe |
| PATCH | `/users/:id` | ADMIN | Edita nome, perfil e situação |
| GET | `/users/agents` | AGENT, MANAGER, ADMIN | Lista atendentes ativos (para atribuição) |

### Categorias e SLA

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/categories` | autenticado | Lista categorias ativas |
| POST | `/categories` | ADMIN | Cria |
| PATCH | `/categories/:id` | ADMIN | Edita ou desativa |
| GET | `/sla-policies` | AGENT, MANAGER, ADMIN | Lista as políticas |
| PUT | `/sla-policies/:priority` | ADMIN | Atualiza a política da prioridade |

### Chamados

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| POST | `/tickets` | autenticado | Abre chamado |
| GET | `/tickets` | autenticado | Lista com filtros (solicitante vê só os seus) |
| GET | `/tickets/:id` | autenticado | Detalhe (respeita regra de visibilidade) |
| PATCH | `/tickets/:id` | AGENT, MANAGER, ADMIN | Altera título, categoria, prioridade e ativo |
| POST | `/tickets/:id/assign` | AGENT, MANAGER, ADMIN | Atribui (atendente só a si; gestor e admin a qualquer atendente) |
| POST | `/tickets/:id/status` | autenticado | Muda status conforme RN-02 e permissões |
| GET | `/tickets/:id/comments` | autenticado | Lista comentários (sem internos para solicitante) |
| POST | `/tickets/:id/comments` | autenticado | Cria comentário |
| GET | `/tickets/:id/history` | autenticado | Histórico do chamado |
| POST | `/tickets/:id/attachments` | autenticado | Envia arquivo (multipart) |
| GET | `/tickets/:id/attachments/:attachmentId` | autenticado | Baixa arquivo, com checagem de permissão |

Filtros de `GET /tickets`: `status`, `priority`, `categoryId`, `assigneeId`, `requesterId`, `assetId`, `from`, `to`, `slaBreached`, `q` (busca em título e número), `page`, `perPage`, `sort`.

### Ativos

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/assets` | AGENT, MANAGER, ADMIN | Lista com filtros (`type`, `status`, `assignedToId`, `q`) |
| POST | `/assets` | MANAGER, ADMIN | Cadastra |
| GET | `/assets/:id` | AGENT, MANAGER, ADMIN | Detalhe com chamados vinculados |
| PATCH | `/assets/:id` | MANAGER, ADMIN | Edita, altera situação e responsável |

### Dashboard e auditoria

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/dashboard/summary` | MANAGER, ADMIN | Totais por status e prioridade, SLA, tempos médios (`from`, `to`) |
| GET | `/dashboard/by-category` | MANAGER, ADMIN | Chamados por categoria |
| GET | `/dashboard/by-agent` | MANAGER, ADMIN | Carga por atendente |
| GET | `/dashboard/volume` | MANAGER, ADMIN | Volume diário dos últimos 30 dias |
| GET | `/audit` | ADMIN | Log filtrável e paginado |
| GET | `/health` | público | Estado da API e do banco |

### Códigos de resposta

`200` e `201` sucesso; `400` validação; `401` não autenticado ou token inválido; `403` sem permissão; `404` não encontrado (também usado quando o solicitante tenta ver chamado de outra pessoa, para não vazar a existência); `409` conflito (e-mail ou patrimônio duplicado, transição inválida); `413` arquivo grande demais; `429` limite de requisições.

## 12. Telas do frontend

| Tela | Perfis | Conteúdo |
|---|---|---|
| Login e cadastro | público | Formulários com validação e mensagens de erro da API |
| Meus chamados | todos | Lista do usuário com filtros e botão de novo chamado |
| Novo chamado | todos | Formulário com categoria, prioridade e ativo |
| Fila de chamados | AGENT, MANAGER, ADMIN | Todos os chamados, filtros, indicador de SLA, ação de assumir |
| Detalhe do chamado | todos | Dados, SLA, comentários, anexos, histórico, mudança de status e atribuição |
| Ativos | AGENT, MANAGER, ADMIN | Lista, filtros e formulário (edição só para MANAGER e ADMIN) |
| Dashboard | MANAGER, ADMIN | Cards e gráficos de SLA, status, categorias, carga e volume |
| Usuários | ADMIN | Lista, criação e edição |
| Categorias e SLA | ADMIN | Catálogo e políticas |
| Auditoria | ADMIN | Tabela filtrável |

Diretrizes: layout responsivo, estados de carregamento e de erro em todas as telas, confirmação antes de ações destrutivas (cancelar chamado, aposentar ativo, desativar usuário), e menus que mostram apenas o que o perfil pode acessar (a checagem real continua na API).

## 13. Segurança

| Tema | Decisão |
|---|---|
| Senhas | bcrypt com custo 12; política mínima de 10 caracteres |
| Sessão | Access token JWT de 15 minutos mantido em memória no navegador; refresh token de 7 dias em cookie `httpOnly`, `SameSite=Lax` e `Secure` em produção |
| Refresh token | Guardado apenas como hash; rotação a cada uso; reuso de token revogado derruba todas as sessões do usuário |
| Autorização | Guard de perfil em cada rota; regras de visibilidade (solicitante só vê o que abriu) aplicadas na consulta, não só na interface |
| Entrada | `ValidationPipe` global com `whitelist` e `forbidNonWhitelisted`; limites de tamanho em todos os campos de texto |
| Força bruta | Rate limiting global e limite mais baixo em login, cadastro e refresh |
| Cabeçalhos | Helmet; CORS restrito às origens configuradas |
| Anexos | Limite de tamanho, lista de tipos permitidos, nome aleatório, validação do tipo pelo conteúdo e não só pela extensão, download via rota autenticada |
| SQL | Apenas consultas parametrizadas via Prisma |
| Segredos | Somente por variáveis de ambiente; `.env` fora do Git; segredos de exemplo sem valor real; validação das variáveis na inicialização (a API não sobe com configuração incompleta) |
| Logs | Sem senhas, tokens ou corpo completo de requisições |
| Swagger | Desligado por padrão em produção |
| Auditoria | Eventos de RN-10 gravados com autor e IP |
| Dependências | Dependabot e `npm audit` no CI |

Riscos conhecidos e aceitos nesta versão: sem verificação de e-mail no cadastro, sem autenticação em dois fatores, sem bloqueio de conta por tentativas (há apenas rate limiting).

## 14. Estratégia de testes e qualidade

| Nível | Ferramenta | O que cobre |
|---|---|---|
| Unitário | Jest | Regras puras: transições de status, cálculo e recálculo de SLA, pausa, violação de SLA, permissões de visibilidade |
| Serviço | Jest | Serviços de módulo com o acesso a dados simulado: criação de chamado, atribuição, comentários internos |
| E2E | Jest + Supertest com PostgreSQL real | Fluxos completos de autenticação, ciclo do chamado, isolamento entre solicitantes, permissões por perfil, upload e download de anexo, dashboard |
| Estático | ESLint, Prettier, `tsc --noEmit` | Estilo e tipagem |

Meta inicial de cobertura: acima de 80% nas regras de negócio. O pipeline de CI executa tipos, lint, testes e build a cada push e pull request.

## 15. Infraestrutura e CI

- **Docker Compose:** `postgres` (16), `api` e `web`, com healthcheck no banco e a API aguardando o banco saudável. Portas de desenvolvimento ligadas somente a `127.0.0.1`.
- **Dockerfiles:** multi-stage (dependências, build, imagem final enxuta, usuário não-root).
- **GitHub Actions:** instala dependências com lockfile, roda checagem de tipos, lint, testes (com serviço PostgreSQL) e build. Versões atualizadas das actions oficiais.
- **Migrations:** versionadas no repositório e aplicadas com `prisma migrate deploy` na implantação.
- **Deploy alvo:** frontend na Vercel e API com banco gerenciado em um provedor de container (a definir). Para cookie de refresh funcionar entre domínios, web e API devem compartilhar o domínio pai, ou a API ficar atrás de um proxy reverso no mesmo domínio.

## 16. Variáveis de ambiente

| Variável | Uso | Exemplo (não é segredo real) |
|---|---|---|
| `DATABASE_URL` | Conexão com o PostgreSQL | `postgresql://usuario:senha@localhost:5432/itsm` |
| `NODE_ENV` | Ambiente | `development` |
| `PORT` | Porta da API | `3001` |
| `CORS_ORIGINS` | Origens permitidas, separadas por vírgula | `http://localhost:3000` |
| `JWT_ACCESS_SECRET` | Segredo do access token (mínimo 32 caracteres) | gerar com `openssl rand -base64 48` |
| `JWT_ACCESS_TTL` | Validade do access token | `15m` |
| `REFRESH_TTL_DAYS` | Validade do refresh token | `7` |
| `COOKIE_SECURE` | Cookie apenas em HTTPS | `true` em produção |
| `SWAGGER_ENABLED` | Liga a documentação em `/api/docs` | `false` em produção |
| `UPLOAD_DIR` | Pasta dos anexos | `./uploads` |
| `MAX_UPLOAD_MB` | Tamanho máximo de anexo | `5` |
| `SEED_ADMIN_PASSWORD` | Senha dos usuários do seed (só desenvolvimento) | definir localmente |
| `NEXT_PUBLIC_API_URL` | URL da API usada pelo frontend | `http://localhost:3001/api` |

Um arquivo `.env.example` com esses nomes (sem valores reais) será mantido no repositório.

## 17. Roadmap de implementação

| Fase | Entrega | Critério de pronto |
|---|---|---|
| 0 | Definição (este README) | Escopo, requisitos, regras, modelo e API revisados |
| 1 | Fundação (em andamento) | Monorepo, Docker Compose, schema Prisma com migration inicial, configuração validada, health check, CI verde |
| 2 | Autenticação e usuários | Cadastro, login, refresh rotativo, logout, perfis, gestão de usuários, testes |
| 3 | Chamados | Abertura, listagem com filtros, atribuição, status, comentários, histórico, anexos, testes das regras |
| 4 | SLA e ativos | Políticas, cálculo e pausa, violação; cadastro e vínculo de ativos |
| 5 | Dashboard e auditoria | Indicadores e log filtrável |
| 6 | Frontend | Telas da seção 12 consumindo a API real |
| 7 | Endurecimento | Revisão de segurança, cobertura, documentação Swagger, ajustes de desempenho |
| 8 | Publicação | Deploy, prints das telas e demonstração no README |

Ao final de cada fase, este README é atualizado para refletir o que realmente existe, mantendo a distinção entre "implementado" e "planejado".

## 18. Como rodar (previsto)

Pré-requisitos: Node.js 24.9 ou superior, Docker e Docker Compose.

```bash
git clone https://github.com/MatheusAnsel/ITSM.git
cd ITSM
cp .env.example .env          # preencher os segredos
docker compose up -d          # banco (e demais serviços)
npm install
npm run db:migrate            # aplica as migrations
npm run db:seed               # dados de exemplo (apenas desenvolvimento)
npm run dev:api               # API em http://localhost:3001
npm run dev:web               # Web em http://localhost:3000
```

Estes comandos ainda não funcionam: descrevem o fluxo alvo.

## 19. Decisões em aberto

| Tema | Pergunta | Direção inicial |
|---|---|---|
| SLA | Usar horário comercial e feriados? | Começar com tempo corrido; calendário em versão futura |
| Anexos em produção | Disco local ou storage S3-compatível? | Interface de armazenamento abstrata; escolher ao publicar |
| Gerenciador de pacotes | npm ou pnpm no monorepo? | npm workspaces, para reduzir dependências de ferramenta |
| Notificações | E-mail ao mudar o status? | Fora desta versão |
| Hospedagem da API | Qual provedor? | A definir na fase 8 |
| Cadastro aberto | Manter auto-cadastro em produção? | Manter apenas na demonstração; em uso real, só criação por administrador |

## 20. Licença e autor

Licença MIT (arquivo `LICENSE` será adicionado junto com o código).

Matheus Ansel, desenvolvedor full stack. [LinkedIn](https://linkedin.com/in/matheusansel) · [GitHub](https://github.com/MatheusAnsel) · [Portfólio](https://matheusansel-dev.vercel.app)
