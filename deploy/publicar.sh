#!/usr/bin/env bash
# Publica o GPlanSiS|Drawings num servidor via SSH. Uso: DRAWINGS_HOST=meu-servidor DRAWINGS_MASTER=admin@exemplo.com bash deploy/publicar.sh
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=${DRAWINGS_HOST:?defina DRAWINGS_HOST (alias SSH do servidor)}
node --check web/cad.js; node --check web/plataforma.js; node --check web/sw.js; node --check web/pwa.js
python3 -c "import json; json.load(open('web/manifest.webmanifest'))"
python3 -c "import ast; ast.parse(open('server/app.py').read())"
STG=$(mktemp -d); mkdir -p "$STG/web" "$STG/server" "$STG/deploy"
cp web/index.html web/cad.js web/cadimport.js web/cadexport.js web/cad.css web/plataforma.js web/plataforma.css web/tema.js web/icon.svg \
   web/celular.css web/pwa.js web/sw.js web/manifest.webmanifest "$STG/web/"; cp -R web/vendor web/icones "$STG/web/"
cp server/app.py server/assistente.py server/exporta.py server/schema.sql server/requirements.txt "$STG/server/"
cp deploy/drawings.service deploy/drawings.caddy deploy/instalar.remoto.sh "$STG/deploy/"
# versão nos links de CSS/JS muda a cada publicação (cache imutável no navegador)
# o mesmo carimbo vira a VERSION do service worker (cache novo a cada publicação; o antigo é apagado no activate)
V=$(date +%Y%m%d%H%M%S); sed -i '' "s/__V__/$V/g" "$STG/web/index.html" "$STG/web/sw.js"
grep -q "__V__" "$STG/web/index.html" "$STG/web/sw.js" && { echo "carimbo de versão não aplicado"; exit 1; }
rsync -a --delete "$STG/" "$HOST:/tmp/drawings-pacote/"
ssh "$HOST" "DRAWINGS_MASTER='${DRAWINGS_MASTER:?defina DRAWINGS_MASTER}' DRAWINGS_MASTER_NOME='${DRAWINGS_MASTER_NOME:-Administrador}' bash /tmp/drawings-pacote/deploy/instalar.remoto.sh"
rm -rf "$STG"
echo "publicado em https://drawings.gplansis.com"
