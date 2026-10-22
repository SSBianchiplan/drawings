"""GPlanSiS|Drawings — servidor de desenvolvimento local (API + front num único processo).

Em produção o Caddy serve `web/` e encaminha só `/api/*` para o uvicorn. Para rodar no seu
computador sem Caddy, este arquivo reaproveita a mesma API (`app.py`) e acrescenta os estáticos.

    cd server
    export DRAWINGS_DSN="postgresql://postgres@127.0.0.1:5432/drawings"
    export DRAWINGS_COOKIE_SEGURO=0          # cookie sem "Secure", porque aqui é http://
    python app.py criar-admin admin@exemplo.com   # imprime a senha temporária
    uvicorn dev_local:app --port 8930 --reload
    # abra http://127.0.0.1:8930

Não use este arquivo em produção (não envia os cabeçalhos de segurança nem a CSP do Caddy).
"""
from pathlib import Path

from fastapi.staticfiles import StaticFiles

from app import app

WEB = Path(__file__).resolve().parent.parent / "web"
app.mount("/", StaticFiles(directory=WEB, html=True), name="web")
