"""Cota e contabilidade da IA (auditoria 2026-10, M5).

Precisa de um Postgres vazio de teste em DRAWINGS_TEST_DSN (ex.: postgresql://postgres@127.0.0.1:55431/drawings).
Nada chama a Anthropic: o cliente é trocado por um falso.

    cd server && DRAWINGS_TEST_DSN=... python -m pytest -q tests
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

DSN = os.environ.get("DRAWINGS_TEST_DSN")
if not DSN:
    pytest.skip("defina DRAWINGS_TEST_DSN para rodar estes testes", allow_module_level=True)

os.environ["DRAWINGS_DSN"] = DSN
os.environ["DRAWINGS_COOKIE_SEGURO"] = "0"
os.environ.pop("ANTHROPIC_API_KEY", None)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import anthropic  # noqa: E402
import httpx  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app as A  # noqa: E402
import ia_cota  # noqa: E402

H = {"x-drawings": "1"}


@pytest.fixture(scope="module")
def cli():
    with TestClient(A.app) as c:
        with A.db() as cn:
            cn.execute("truncate drawings.ia_uso, drawings.sessoes, drawings.acessos restart identity")
            cn.execute("delete from drawings.desenhos")
            cn.execute("delete from drawings.usuarios")
            cn.execute("delete from drawings.config")
            for login, papel in (("adm@teste.local", "ADMIN"), ("proj@teste.local", "PROJETISTA")):
                cn.execute("""insert into drawings.usuarios(login, nome, papel, senha_hash, trocar_senha)
                              values (%s, %s, %s, 'x', false)""", (login, login.split("@")[0], papel))
                uid = cn.execute("select id from drawings.usuarios where login=%s", (login,)).fetchone()["id"]
                cn.execute("insert into drawings.sessoes(token_hash, usuario_id, expira_em) values (%s,%s, now() + interval '1 day')",
                           (A.th("tok-" + papel), uid))
        yield c


def como(c: TestClient, papel: str) -> TestClient:
    c.cookies.set(A.COOKIE, "tok-" + papel)
    return c


def uid(login: str) -> int:
    with A.db() as cn:
        return cn.execute("select id from drawings.usuarios where login=%s", (login,)).fetchone()["id"]


def zera_uso():
    with A.db() as cn:
        cn.execute("truncate drawings.ia_uso")
        cn.execute("update drawings.usuarios set ia_cota = null")
    ia_cota._recentes.clear()
    ia_cota._em_curso.clear()


def com_chave(monkeypatch):
    monkeypatch.setattr(A, "IA_KEY_ENV", "sk-ant-teste-" + "x" * 30)
    A._IA_CACHE.update(t=0.0, v=None)


class FalsoStream:
    def __init__(self, msg=None, erro=None, textos=()):
        self.msg, self.erro, self.textos = msg, erro, textos
        self.current_message_snapshot = SimpleNamespace(model="claude-opus-5-5", usage=SimpleNamespace(input_tokens=10, output_tokens=5))

    async def __aenter__(self):
        if self.erro:
            raise self.erro
        return self

    async def __aexit__(self, *a):
        return False

    def __aiter__(self):
        async def gen():
            for t in self.textos:
                yield SimpleNamespace(type="text", text=t)
        return gen()

    async def get_final_message(self):
        return self.msg


def cliente_falso(monkeypatch, **kw):
    chamadas = []

    def stream(**params):
        chamadas.append(params)
        return FalsoStream(**kw)
    falso = SimpleNamespace(beta=SimpleNamespace(messages=SimpleNamespace(stream=stream)))
    monkeypatch.setattr(A, "cliente_ia", lambda chave: falso)
    return chamadas


def msg_ok(texto: str, tin=1000, tout=2000, modelo="claude-opus-5-5"):
    return SimpleNamespace(model=modelo, stop_reason="end_turn", stop_details=None,
                           content=[SimpleNamespace(type="text", text=texto)],
                           usage=SimpleNamespace(input_tokens=tin, output_tokens=tout, cache_read_input_tokens=0,
                                                 cache_creation_input_tokens=0))


def test_sem_chave_503_gracioso(cli, monkeypatch):
    zera_uso()
    monkeypatch.setattr(A, "IA_KEY_ENV", "")
    A._IA_CACHE.update(t=0.0, v=None)
    r = como(cli, "PROJETISTA").post("/api/ia/json", json={"prompt": "uma parede"}, headers=H)
    assert r.status_code == 503
    assert "não configurado" in r.json()["detail"]
    assert "Traceback" not in r.text


def test_cota_estourada_402_sem_chamar_anthropic(cli, monkeypatch):
    zera_uso()
    com_chave(monkeypatch)
    chamadas = cliente_falso(monkeypatch, msg=msg_ok("{}"))
    with A.db() as cn:
        cn.execute("insert into drawings.ia_uso(usuario_id, recurso, custo_usd, ok) values (%s, 'json', 25, true)",
                   (uid("proj@teste.local"),))
    r = como(cli, "PROJETISTA").post("/api/ia/json", json={"prompt": "uma parede"}, headers=H)
    assert r.status_code == 402
    assert "Cota de IA" in r.json()["detail"]
    r = cli.post("/api/ia/assistente", json={"modo": "desenhar", "pedido": "uma parede"}, headers=H)
    assert r.status_code == 402
    assert chamadas == []


def test_cota_propria_do_usuario_vale_sobre_o_padrao(cli, monkeypatch):
    zera_uso()
    com_chave(monkeypatch)
    cliente_falso(monkeypatch, msg=msg_ok('{"ok": 1}'))
    with A.db() as cn:
        cn.execute("insert into drawings.ia_uso(usuario_id, recurso, custo_usd, ok) values (%s, 'json', 1, true)",
                   (uid("proj@teste.local"),))
    r = como(cli, "ADMIN").put(f"/api/admin/ia/cota/{uid('proj@teste.local')}", json={"cotaUsd": 0.5}, headers=H)
    assert r.status_code == 200
    r = como(cli, "PROJETISTA").post("/api/ia/json", json={"prompt": "x"}, headers=H)
    assert r.status_code == 402


def test_uso_real_gravado_com_custo(cli, monkeypatch):
    zera_uso()
    com_chave(monkeypatch)
    chamadas = cliente_falso(monkeypatch, msg=msg_ok('{"linhas": ["LINE 0,0 1,1"]}'))
    r = como(cli, "PROJETISTA").post("/api/ia/json", json={"prompt": "Pedido: uma linha"}, headers=H)
    assert r.status_code == 200, r.text
    assert r.json() == {"linhas": ["LINE 0,0 1,1"]}
    assert chamadas[0]["max_tokens"] <= 16000
    with A.db() as cn:
        row = cn.execute("select * from drawings.ia_uso").fetchone()
    assert row["recurso"] == "json" and row["ok"] is True
    assert row["input_tokens"] == 1000 and row["output_tokens"] == 2000
    assert abs(float(row["custo_usd"]) - (1000 * 4 + 2000 * 20) / 1e6) < 1e-9
    r = cli.get("/api/ia/uso")
    assert r.status_code == 200 and abs(r.json()["gastoUsd"] - 0.044) < 1e-6 and r.json()["cotaUsd"] == 20.0


def test_assistente_sse_grava_uso(cli, monkeypatch):
    zera_uso()
    com_chave(monkeypatch)
    cliente_falso(monkeypatch, msg=msg_ok(json.dumps({"resumo": "ok", "linhas": []}), tin=300, tout=700), textos=["{", "}"])
    r = como(cli, "PROJETISTA").post("/api/ia/assistente", json={"modo": "desenhar", "pedido": "uma parede"}, headers=H)
    assert r.status_code == 200
    assert "event: final" in r.text
    with A.db() as cn:
        row = cn.execute("select * from drawings.ia_uso").fetchone()
    assert row["recurso"] == "assistente:desenhar" and row["output_tokens"] == 700 and row["ok"]
    assert ia_cota._em_curso[uid("proj@teste.local")] == []


def test_erro_da_anthropic_nao_vaza_detalhe(cli, monkeypatch):
    zera_uso()
    com_chave(monkeypatch)
    resp = httpx.Response(500, request=httpx.Request("POST", "https://api.anthropic.com/v1/messages"))
    cliente_falso(monkeypatch, erro=anthropic.InternalServerError("detalhe-interno-secreto", response=resp, body=None))
    r = como(cli, "PROJETISTA").post("/api/ia/json", json={"prompt": "x"}, headers=H)
    assert r.status_code == 502
    assert "detalhe-interno-secreto" not in r.text and "500" not in r.json()["detail"]
    r = cli.post("/api/ia/assistente", json={"modo": "desenhar", "pedido": "uma parede"}, headers=H)
    assert "event: erro" in r.text and "detalhe-interno-secreto" not in r.text
    with A.db() as cn:
        erros = [x["erro"] for x in cn.execute("select erro from drawings.ia_uso order by id").fetchall()]
    assert erros == ["status_500", "status_500"]


def test_corpo_grande_413(cli, monkeypatch):
    zera_uso()
    com_chave(monkeypatch)
    chamadas = cliente_falso(monkeypatch, msg=msg_ok("{}"))
    corpo = json.dumps({"prompt": "x" * (600 * 1024)})
    r = como(cli, "PROJETISTA").post("/api/ia/json", content=corpo, headers={**H, "content-type": "application/json"})
    assert r.status_code == 413

    def pedacos():  # sem content-length (chunked)
        for _ in range(40):
            yield b"x" * (32 * 1024)
    r = cli.post("/api/ia/json", content=pedacos(), headers={**H, "content-type": "application/json"})
    assert r.status_code == 413
    assert chamadas == []


def test_ritmo_429(cli, monkeypatch):
    zera_uso()
    com_chave(monkeypatch)
    cliente_falso(monkeypatch, msg=msg_ok("{}"))
    monkeypatch.setattr(ia_cota, "POR_MINUTO", 2)
    c = como(cli, "PROJETISTA")
    assert c.post("/api/ia/json", json={"prompt": "x"}, headers=H).status_code == 200
    assert c.post("/api/ia/json", json={"prompt": "x"}, headers=H).status_code == 200
    assert c.post("/api/ia/json", json={"prompt": "x"}, headers=H).status_code == 429


def test_so_admin_altera_cota(cli):
    zera_uso()
    c = como(cli, "PROJETISTA")
    assert c.put("/api/admin/ia/cota", json={"cotaUsd": 999}, headers=H).status_code == 403
    assert c.put(f"/api/admin/ia/cota/{uid('proj@teste.local')}", json={"cotaUsd": 999}, headers=H).status_code == 403
    assert c.get("/api/admin/ia/uso").status_code == 403
    c = como(cli, "ADMIN")
    assert c.put("/api/admin/ia/cota", json={"cotaUsd": -1}, headers=H).status_code == 422
    r = c.put("/api/admin/ia/cota", json={"cotaUsd": 7.5}, headers=H)
    assert r.status_code == 200 and r.json()["cotaPadraoUsd"] == 7.5
    d = c.get("/api/admin/ia/uso").json()
    assert d["cotaPadraoUsd"] == 7.5 and all(u["cotaUsd"] == 7.5 for u in d["usuarios"])
    # a configuração da chave/modelo continua intacta
    assert c.get("/api/admin/ia").status_code == 200
