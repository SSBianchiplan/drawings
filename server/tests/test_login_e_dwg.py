"""Login (contador que zera, master não trancável de fora, sem enumeração), IP do cliente e rota de
DWG pelo conversor isolado. Precisa de um PostgreSQL de teste:

    DRAWINGS_TESTE_DSN="postgresql://postgres@/drawings_teste?host=/tmp/pgsock&port=55441" \\
        python -m pytest tests/test_login_e_dwg.py -q
"""
from __future__ import annotations

import os
import sys
import textwrap
from pathlib import Path

import pytest

DSN = os.environ.get("DRAWINGS_TESTE_DSN")
if not DSN:
    pytest.skip("defina DRAWINGS_TESTE_DSN para rodar os testes com banco", allow_module_level=True)

AQUI = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AQUI))
os.environ["DRAWINGS_DSN"] = DSN
os.environ["DRAWINGS_MASTER"] = "master@exemplo.com"
os.environ["DRAWINGS_COOKIE_SEGURO"] = "0"
os.environ.pop("DRAWINGS_CONV_SOCKET", None)

import app as drw  # noqa: E402
import conversor  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

SENHA = "Senha-Boa-2026"
H = {"x-drawings": "1"}


def _usuario(cur, login: str, papel: str = "PROJETISTA", master: bool = False):
    cur.execute("""insert into drawings.usuarios(login, nome, papel, senha_hash, trocar_senha, master)
                   values (%s, %s, %s, %s, false, %s)
                   on conflict (lower(login)) do update set senha_hash = excluded.senha_hash, falhas = 0,
                       bloqueado_ate = null, ultima_falha = null, ativo = true, trocar_senha = false""",
                (login, login.split("@")[0], "ADMIN" if master else papel, drw.hash_senha(SENHA), master))


@pytest.fixture(scope="module")
def cli():
    with TestClient(drw.app, client=("198.51.100.7", 50000)) as c:
        with drw.db() as cn:
            cur = cn.cursor()
            _usuario(cur, "master@exemplo.com", master=True)
            _usuario(cur, "ana@exemplo.com")
        yield c


@pytest.fixture(autouse=True)
def limpa_memoria():
    drw.FALHAS_IP.clear()
    drw.FALHAS_PAR.clear()
    drw.FALHAS_INEXISTENTE.clear()
    with drw.db() as cn:
        cn.execute("update drawings.usuarios set falhas = 0, bloqueado_ate = null, ultima_falha = null")
    yield


def entra(c, login, senha, ip="198.51.100.7"):
    return c.post("/api/auth/login", json={"login": login, "senha": senha}, headers={**H, "x-forwarded-for": ip})


def test_ip_vem_do_cliente_e_nao_do_xff_forjado(cli):
    entra(cli, "ana@exemplo.com", "errada")
    with drw.db() as cn:
        ip = cn.execute("select ip from drawings.acessos where evento = 'LOGIN_FALHA' order by id desc limit 1").fetchone()["ip"]
    assert ip == "198.51.100.7"     # o TestClient é o "cliente"; o XFF enviado foi ignorado
    with drw.db() as cn:
        cn.execute("update drawings.usuarios set falhas = 0, ultima_falha = null")


def test_contador_zera_quando_a_falha_e_antiga(cli):
    for _ in range(4):
        assert entra(cli, "ana@exemplo.com", "errada").status_code == 401
    with drw.db() as cn:
        assert cn.execute("select falhas from drawings.usuarios where login = 'ana@exemplo.com'").fetchone()["falhas"] == 4
        cn.execute("update drawings.usuarios set ultima_falha = now() - interval '20 minutes' where login = 'ana@exemplo.com'")
    drw.FALHAS_PAR.clear()
    assert entra(cli, "ana@exemplo.com", "errada").status_code == 401
    with drw.db() as cn:
        assert cn.execute("select falhas from drawings.usuarios where login = 'ana@exemplo.com'").fetchone()["falhas"] == 1


def test_bloqueio_vencido_nao_retrava_na_primeira_falha(cli):
    with drw.db() as cn:
        cn.execute("""update drawings.usuarios set falhas = 5, ultima_falha = now() - interval '1 minute',
                      bloqueado_ate = now() - interval '1 second' where login = 'ana@exemplo.com'""")
    assert entra(cli, "ana@exemplo.com", "errada").status_code == 401   # antes: 6ª falha → travava de novo
    with drw.db() as cn:
        r = cn.execute("select falhas, bloqueado_ate from drawings.usuarios where login = 'ana@exemplo.com'").fetchone()
    assert r["falhas"] == 1 and r["bloqueado_ate"] is None
    assert entra(cli, "ana@exemplo.com", SENHA).status_code == 200


def test_conta_comum_trava_apos_5_falhas(cli):
    for _ in range(5):
        assert entra(cli, "ana@exemplo.com", "errada").status_code == 401
    assert entra(cli, "ana@exemplo.com", SENHA).status_code == 423


def test_master_nao_e_trancado_por_quem_erra_de_outro_endereco(cli):
    atacante = TestClient(drw.app, client=("203.0.113.66", 40000))   # sem "with": não reabre o ciclo de vida
    cods = [entra(atacante, "master@exemplo.com", "chute").status_code for _ in range(6)]
    assert cods == [401] * 5 + [423], cods   # o par (master, IP do atacante) travou
    with drw.db() as cn:
        assert cn.execute("select bloqueado_ate from drawings.usuarios where master").fetchone()["bloqueado_ate"] is None
    assert entra(cli, "master@exemplo.com", SENHA).status_code == 200   # de outro IP o master entra


def test_sem_enumeracao_de_email(cli):
    real = [entra(cli, "ana@exemplo.com", "errada").status_code for _ in range(6)]
    drw.FALHAS_IP.clear()
    falso = [entra(cli, "ninguem@exemplo.com", "errada").status_code for _ in range(6)]
    assert real == falso == [401] * 5 + [423]


# ---------------------------------------------------------------- DWG pela rota
def _token_admin(c):
    r = entra(c, "master@exemplo.com", SENHA)
    assert r.status_code == 200
    return r


def test_rota_dwg_usa_conversor_isolado(cli, tmp_path, monkeypatch):
    espiao = tmp_path / "dwg2dxf"
    espiao.write_text(f"#!{sys.executable}\n" + textwrap.dedent("""
        import json, os, sys
        a = sys.argv[1:]
        open(a[a.index("-o") + 1], "w").write("0\\nSECTION\\n" + json.dumps(dict(os.environ)) + " " * 200)
    """))
    espiao.chmod(0o755)
    monkeypatch.setitem(conversor.BINARIOS, "dwg2dxf", str(espiao))
    monkeypatch.setattr(conversor, "TRAVA", str(tmp_path / "t.lock"))
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-nao-pode-vazar")
    _token_admin(cli)
    r = cli.post("/api/cad/dwg2dxf", content=b"AC1032" + b"\0" * 200, headers={**H, "x-arquivo": "planta.dwg"})
    assert r.status_code == 200, r.text
    assert b"SECTION" in r.content and b"sk-ant-nao-pode-vazar" not in r.content and b"DRAWINGS_" not in r.content
    # conversor ocupado → 503 claro
    import fcntl
    fd = os.open(conversor.TRAVA, os.O_RDWR | os.O_CREAT, 0o600)
    fcntl.flock(fd, fcntl.LOCK_EX)
    monkeypatch.setattr(conversor, "ESPERA_S", 1)
    try:
        r = cli.post("/api/cad/dwg2dxf", content=b"AC1032" + b"\0" * 200, headers=H)
        assert r.status_code == 503 and "ocupado" in r.json()["detail"]
    finally:
        os.close(fd)
    # prazo → 504
    lento = tmp_path / "lento"
    lento.write_text(f"#!{sys.executable}\nimport time\ntime.sleep(30)\n")
    lento.chmod(0o755)
    monkeypatch.setitem(conversor.BINARIOS, "dwg2dxf", str(lento))
    monkeypatch.setattr(conversor, "TIMEOUT_S", 1)
    r = cli.post("/api/cad/dwg2dxf", content=b"AC1032" + b"\0" * 200, headers=H)
    assert r.status_code == 504


def test_rota_dwg_exige_permissao_e_formato(cli):
    cli.cookies.clear()
    assert cli.post("/api/cad/dwg2dxf", content=b"AC1032", headers=H).status_code == 401
    _token_admin(cli)
    r = cli.post("/api/cad/dwg2dxf", content=b"%PDF-1.7", headers=H)
    assert r.status_code in (422, 503)
