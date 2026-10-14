#!/bin/sh
# Aplica as migrações pendentes antes de subir a API; se falharem, o contêiner não sobe.
set -e

npx prisma migrate deploy

# Opcional: cria categorias, SLA e o administrador (e, fora de produção, os dados de demonstração).
# É idempotente: rodar de novo não duplica nada.
if [ "$SEED_ON_START" = "true" ]; then
  node dist/prisma/seed.js
fi

# `exec` faz a API receber o SIGTERM do Docker e encerrar com limpeza.
exec node dist/main
