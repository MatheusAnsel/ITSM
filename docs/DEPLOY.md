# Publicação em modo demonstração

Arquitetura escolhida, toda em planos gratuitos:

| Peça | Serviço | Por quê |
|---|---|---|
| Banco PostgreSQL | Render (plano gratuito) | Fica na mesma rede da API. Atenção: o banco gratuito do Render é apagado 30 dias após a criação (a demonstração atual expira em 14/11/2026) |
| API (NestJS) | Render, imagem Docker | Roda o `apps/api/Dockerfile`, aplica as migrations e o seed ao iniciar |
| Frontend (Next.js) | Vercel | Hospedagem nativa do Next; repassa `/api` para a API |

A Vercel repassa as chamadas de `/api` para o Render. Assim o navegador conversa só com o domínio do site e o cookie de refresh (`SameSite=Strict`) continua valendo, sem CORS entre domínios.

```
Navegador -> Vercel (site + /api) -> Render (API) -> Render (PostgreSQL)
```

## 1. Render (banco)

1. Em **New > PostgreSQL**, crie uma instância no plano gratuito, na mesma região da API.
2. Ao criar o serviço da API, em `DATABASE_URL` use **Add from Database** para ligar a URL interna do banco.
3. Para manter a demonstração no ar depois dos 30 dias, crie um novo banco, religue `DATABASE_URL` e reinicie a API (o seed recria os dados). Quem quiser um banco que não expira pode usar o plano gratuito do Supabase com a string do **Session pooler** (porta 5432).

## 2. Render (API)

1. Em **New > Blueprint**, aponte para este repositório. O arquivo `render.yaml` cria o serviço `itsm-api`.
2. Preencha as variáveis marcadas como manuais:
   - `DATABASE_URL`: a URL do banco (ligada pelo painel do Render).
   - `CORS_ORIGINS`: a URL do site na Vercel (preencha depois do passo 3; com o repasse de `/api` da Vercel o navegador não faz chamadas entre domínios, então o valor serve só como segurança).
   - `DEMO_PASSWORD`: a senha pública dos usuários de demonstração. Escolha uma e divulgue no README ou na tela de login.
3. O primeiro deploy aplica as migrations e executa o seed (categorias, políticas de SLA, administrador e 48 chamados de demonstração). O seed é idempotente: reiniciar não duplica nada.
4. A senha do administrador é gerada pelo Render (`SEED_ADMIN_PASSWORD`) e fica só no painel; não faz parte da demonstração pública.

Confira `https://<sua-api>.onrender.com/api/health`.

## 3. Vercel (frontend)

1. Importe o repositório e defina **Root Directory** como `apps/web`.
2. Variáveis de ambiente (valem para o build):
   - `NEXT_PUBLIC_API_URL` = `/api`
   - `API_PROXY_TARGET` = `https://<sua-api>.onrender.com`
   - `NEXT_PUBLIC_DEMO_MODE` = `true` (mostra na tela de login os botões "Entrar como Gestor, Atendente ou Solicitante"; use `NEXT_PUBLIC_DEMO_PASSWORD` se a `DEMO_PASSWORD` da API não for a senha do README)
3. Faça o deploy e volte ao Render para colocar a URL final da Vercel em `CORS_ORIGINS`.

## Usuários de demonstração

Todos usam `DEMO_PASSWORD`.

| Perfil | E-mail |
|---|---|
| Gestor | `gestor@itsm.local` |
| Atendente | `atendente@itsm.local` |
| Solicitante | `solicitante@itsm.local` |

O cadastro aberto também fica ligado na demonstração.

## Limitações do plano gratuito

- **Hibernação:** a API do Render dorme após cerca de 15 minutos sem acesso e leva em torno de um minuto para acordar. Como a Vercel desiste de repassar a requisição em 30 segundos, a primeira chamada depois de um período parado pode falhar. Um monitor gratuito (por exemplo, UptimeRobot) chamando `/api/health` a cada 5 minutos evita isso.
- **Anexos:** o disco do Render gratuito não persiste. Anexos enviados somem quando o serviço reinicia; os dados do banco permanecem.
- **Banco do Render:** o plano gratuito é apagado 30 dias após a criação; veja a seção 1 para renovar.
- **IP do visitante:** `TRUST_PROXY=1` considera apenas o balanceador do Render como proxy confiável. Se o log de auditoria mostrar o mesmo IP para todos os visitantes, aumente o valor para 2 e confira de novo.

## Segurança da demonstração

- `DEMO_MODE=true` é a única forma de o seed de demonstração rodar com `NODE_ENV=production`; fora dessa instância, a API recusa `SEED_DEMO`.
- A senha de `DEMO_PASSWORD` é pública por definição. Não reutilize uma senha real e não coloque dados reais no banco da demonstração.
- Para restaurar o estado inicial, apague os dados do banco e reinicie a API (o seed recria tudo).
