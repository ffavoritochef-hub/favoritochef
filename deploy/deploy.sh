#!/usr/bin/env bash
# Atualiza e reinicia o app na VPS. Uso (na VPS): bash /var/www/agendabuffet/deploy/deploy.sh
set -euo pipefail

APP_DIR=/var/www/agendabuffet
APP_NAME=agendabuffet
PORT=3000

cd "$APP_DIR"

if [ "${SKIP_GIT:-0}" != "1" ]; then
  echo "==> Atualizando código"
  git fetch --quiet origin
  git reset --hard origin/master
fi

echo "==> Instalando dependências"
npm ci --no-audit --no-fund

echo "==> Build"
# NEXT_PUBLIC_* são embutidas no build, então o .env.local precisa existir aqui
npm run build

echo "==> Montando pacote standalone"
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
cp .env.local .next/standalone/.env.local

echo "==> Reiniciando com PM2"
cd .next/standalone
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 delete "$APP_NAME" >/dev/null
fi
PORT=$PORT HOSTNAME=127.0.0.1 pm2 start server.js --name "$APP_NAME" \
  --node-args="--env-file=.env.local" --update-env
pm2 save >/dev/null

echo "==> Pronto: $(git -C "$APP_DIR" log -1 --format='%h %s')"
