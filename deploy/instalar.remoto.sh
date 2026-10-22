#!/usr/bin/env bash
# Roda NO servidor como root (chamado por deploy/publicar.sh). Idempotente.
set -euo pipefail
APP=/opt/drawings; SRC=/tmp/drawings-pacote
# e-mail do administrador master: passe DRAWINGS_MASTER no ambiente (ex.: DRAWINGS_MASTER=admin@exemplo.com)
MASTER=${DRAWINGS_MASTER:?defina DRAWINGS_MASTER com o e-mail do administrador master}
MASTER_NOME=${DRAWINGS_MASTER_NOME:-Administrador}
id drawings >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin drawings
mkdir -p "$APP/web" "$APP/server"
CARIMBO=$(date +%Y%m%d-%H%M%S)
[ "$(ls -A $APP/web 2>/dev/null)" ] && cp -a "$APP/web" "$APP/web.bak-$CARIMBO" && cp -a "$APP/server" "$APP/server.bak-$CARIMBO"
rsync -a --delete "$SRC/web/" "$APP/web/"
rsync -a --delete "$SRC/server/" "$APP/server/"
# banco: papel e base próprios, autenticação peer pelo socket (sem senha em arquivo)
sudo -u postgres psql -tAc "select 1 from pg_roles where rolname='drawings'" | grep -q 1 || sudo -u postgres psql -qc "create role drawings login"
sudo -u postgres psql -tAc "select 1 from pg_database where datname='drawings'" | grep -q 1 || sudo -u postgres psql -qc "create database drawings owner drawings"
# venv
[ -x "$APP/.venv/bin/python" ] || python3 -m venv "$APP/.venv"
"$APP/.venv/bin/pip" -q install --upgrade pip >/dev/null
"$APP/.venv/bin/pip" -q install -r "$APP/server/requirements.txt"
# .env (preserva o existente; segredos são preenchidos à mão)
if [ ! -f "$APP/.env" ]; then
  cat > "$APP/.env" <<ENV
DRAWINGS_DSN=postgresql:///drawings?host=/var/run/postgresql
DRAWINGS_MASTER=$MASTER
DRAWINGS_SESSAO_HORAS=12
# IA: cole a chave da Anthropic para ligar o Assistente no servidor e reinicie o serviço
ANTHROPIC_API_KEY=
DRAWINGS_IA_MODELO=claude-opus-5-5
ENV
fi
# segredo que cifra a chave da IA guardada pelo painel (gerado uma vez; perdê-lo exige recolar a chave)
grep -q '^DRAWINGS_SEGREDO=' "$APP/.env" || echo "DRAWINGS_SEGREDO=$("$APP/.venv/bin/python" -c 'from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())')" >> "$APP/.env"
sed -i 's/^DRAWINGS_IA_MODELO=claude-sonnet-5-5$/DRAWINGS_IA_MODELO=claude-opus-5-5/' "$APP/.env"
# conversor de DWG (LibreDWG em /opt/libredwg, compilado uma vez no servidor)
[ -x /opt/libredwg/bin/dwg2dxf ] && echo "dwg2dxf: $(/opt/libredwg/bin/dwg2dxf --version | head -1)" || echo "AVISO: /opt/libredwg/bin/dwg2dxf ausente — leitura de DWG desligada"
chown -R root:drawings "$APP"; chmod 751 "$APP"; chmod 640 "$APP/.env"; chmod -R a+rX "$APP/web"
# administrador master: criado uma única vez (senha temporária impressa abaixo, troca obrigatória)
( cd "$APP/server" && sudo -u drawings env DRAWINGS_DSN="postgresql:///drawings?host=/var/run/postgresql" DRAWINGS_MASTER="$MASTER" "$APP/.venv/bin/python" app.py criar-admin "$MASTER" --nome "$MASTER_NOME" --se-nao-existir )
install -m 644 "$SRC/deploy/drawings.service" /etc/systemd/system/drawings.service
systemctl daemon-reload
systemctl enable drawings >/dev/null 2>&1
systemctl restart drawings
# Caddy: bloco próprio + import único no Caddyfile, validado antes do reload
cp -a /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.bak-drawings-$CARIMBO"
[ -f /etc/caddy/drawings.caddy ] && cp -a /etc/caddy/drawings.caddy "/etc/caddy/drawings.caddy.bak-$CARIMBO"
install -m 644 "$SRC/deploy/drawings.caddy" /etc/caddy/drawings.caddy
touch /var/log/caddy/drawings.log; chown caddy:caddy /var/log/caddy/drawings.log
grep -q 'import /etc/caddy/drawings.caddy' /etc/caddy/Caddyfile || printf '\n# GPlanSiS|Drawings (deploy separado — ver /etc/caddy/drawings.caddy)\nimport /etc/caddy/drawings.caddy\n' >> /etc/caddy/Caddyfile
if caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then systemctl reload caddy; echo "caddy recarregado"
else echo "CADDY INVALIDO — restaurando"; cp -a "/etc/caddy/Caddyfile.bak-drawings-$CARIMBO" /etc/caddy/Caddyfile; rm -f /etc/caddy/drawings.caddy; caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1 | tail -3; exit 1; fi
# espera os workers terminarem de subir: uma falha na partida só aparece depois de alguns segundos
sleep 15
systemctl is-active --quiet drawings || { echo "SERVIÇO PAROU NA PARTIDA"; journalctl -u drawings -n 30 --no-pager; exit 1; }
for i in 1 2 3; do curl -fsS -m 5 http://127.0.0.1:8930/api/saude && break || sleep 3; done; echo
systemctl is-active drawings
# mantém só os 5 backups mais recentes do pacote
ls -dt $APP/web.bak-* 2>/dev/null | tail -n +6 | xargs -r rm -rf; ls -dt $APP/server.bak-* 2>/dev/null | tail -n +6 | xargs -r rm -rf
