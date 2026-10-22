"""Isolamento do conversor DWG (achado A9): ambiente vazio, diretório próprio, limites, prazo,
uma conversão por vez e o modo serviço (socket do systemd).

Roda sem banco:  cd server && python -m pytest tests/test_conversor.py -q
Se o LibreDWG estiver instalado (dwg2dxf/dxf2dwg no PATH ou em /opt/libredwg/bin), há também
uma conversão real de ida e volta.
"""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import textwrap
import threading
import time
from pathlib import Path

import pytest

AQUI = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AQUI))
import conversor  # noqa: E402

SEGREDOS = {"ANTHROPIC_API_KEY": "sk-ant-teste-nao-vaza", "DRAWINGS_SEGREDO": "segredo-fernet",
            "DRAWINGS_DOCS_SEGREDO": "segredo-docs", "DRAWINGS_DSN": "postgresql:///x"}
# o próprio Python (macOS/Linux) pode criar estas ao iniciar; nada herdado da API
PERMITIDAS = {"LC_CTYPE", "__CF_USER_TEXT_ENCODING"}


def _falso(tmp: Path, corpo: str) -> str:
    """Cria um 'dwg2dxf' falso (script Python com shebang absoluto, pois o PATH vem vazio)."""
    p = tmp / "falso-conversor"
    p.write_text(f"#!{sys.executable}\n" + textwrap.dedent(corpo))
    p.chmod(0o755)
    return str(p)


ESPIAO = """
import json, os, resource, sys
args = sys.argv[1:]
saida = args[args.index("-o") + 1]
lim = {n: resource.getrlimit(getattr(resource, n))[0] for n in
       ("RLIMIT_CPU", "RLIMIT_FSIZE", "RLIMIT_NOFILE", "RLIMIT_CORE", "RLIMIT_AS") if hasattr(resource, n)}
info = {"env": dict(os.environ), "cwd": os.getcwd(), "args": args, "lim": lim,
        "modo": oct(os.stat(".").st_mode & 0o777), "entrada": open(args[-1], "rb").read().decode("latin-1"),
        "pgid_proprio": os.getpgid(0) == os.getpid()}
open(saida, "w").write(json.dumps(info) + " " * 200)
"""


@pytest.fixture()
def tmp(tmp_path, monkeypatch):
    monkeypatch.setattr(conversor, "TRAVA", str(tmp_path / "trava.lock"))
    monkeypatch.setattr(conversor, "TMP_BASE", str(tmp_path))
    monkeypatch.setattr(conversor, "SOCKET", "")
    for k, v in SEGREDOS.items():
        monkeypatch.setenv(k, v)
    return tmp_path


def roda(coro):
    return asyncio.run(coro)


def test_ambiente_vazio_diretorio_proprio_e_limites(tmp, monkeypatch):
    monkeypatch.setitem(conversor.BINARIOS, "dwg2dxf", _falso(tmp, ESPIAO))
    out = roda(conversor.converte("dwg2dxf", b"AC1032 conteudo"))
    info = json.loads(out.decode().strip())
    # nada do ambiente da API (segredos do .env) chega ao conversor
    assert set(info["env"]) <= PERMITIDAS, info["env"]
    for v in SEGREDOS.values():
        assert v not in json.dumps(info["env"])
    # diretório temporário próprio (0700), usado como cwd, com nomes fixos (nada vindo do usuário)
    assert Path(info["cwd"]).name.startswith("drwconv-")
    assert Path(info["cwd"]).parent == Path(tmp).resolve() or Path(info["cwd"]).parent == Path(tmp)
    assert info["modo"] == "0o700"
    assert info["args"] == ["-y", "-o", "out.dxf", "in.dwg"]
    assert info["entrada"] == "AC1032 conteudo"
    assert info["pgid_proprio"] is True
    # o diretório some no fim
    assert not Path(info["cwd"]).exists()
    assert not list(Path(tmp).glob("drwconv-*"))
    # limites de recurso aplicados no processo do conversor
    lim = info["lim"]
    assert lim["RLIMIT_CPU"] == conversor.CPU_S
    assert lim["RLIMIT_FSIZE"] == conversor.FSIZE_MB * 1024 * 1024
    assert lim["RLIMIT_NOFILE"] == 32
    assert lim["RLIMIT_CORE"] == 0
    if sys.platform.startswith("linux"):
        assert lim["RLIMIT_AS"] == conversor.MEM_MB * 1024 * 1024


def test_prazo_mata_o_grupo_inteiro(tmp, monkeypatch):
    marca = tmp / "neto.pid"
    lento = _falso(tmp, f"""
        import os, subprocess, sys, time
        try:
            p = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"])
            open({str(marca)!r}, "w").write(str(p.pid))
        except OSError:
            open({str(marca)!r} + ".bloqueado", "w").write("RLIMIT_NPROC")
        time.sleep(60)
    """)
    monkeypatch.setitem(conversor.BINARIOS, "dwg2dxf", lento)
    monkeypatch.setattr(conversor, "TIMEOUT_S", 2)
    t0 = time.monotonic()
    with pytest.raises(conversor.ErroConversao) as e:
        roda(conversor.converte("dwg2dxf", b"AC1032"))
    assert e.value.codigo == "prazo"
    assert time.monotonic() - t0 < 10
    time.sleep(0.5)
    if sys.platform.startswith("linux") and os.getuid() != 0:
        # no Linux o conversor não consegue nem criar processo filho (RLIMIT_NPROC)
        assert Path(str(marca) + ".bloqueado").exists()
    if marca.exists():  # o neto (outro processo do grupo) também morreu
        pid = int(marca.read_text())
        with pytest.raises(ProcessLookupError):
            for _ in range(20):
                os.kill(pid, 0)
                time.sleep(0.1)
            os.kill(pid, 0)
    assert not list(Path(tmp).glob("drwconv-*"))


def test_falha_devolve_ultima_linha_e_limpa(tmp, monkeypatch):
    ruim = _falso(tmp, """
        import sys
        sys.stderr.write("linha 1\\nERRO: formato estranho\\n")
        sys.exit(1)
    """)
    monkeypatch.setitem(conversor.BINARIOS, "dwg2dxf", ruim)
    with pytest.raises(conversor.ErroConversao) as e:
        roda(conversor.converte("dwg2dxf", b"AC1032"))
    assert e.value.codigo == "falhou" and "formato estranho" in e.value.msg
    assert not list(Path(tmp).glob("drwconv-*"))


@pytest.mark.skipif(not sys.platform.startswith("linux"), reason="RLIMIT_AS só é aplicado no Linux")
def test_memoria_estourada_vira_erro(tmp, monkeypatch):
    guloso = _falso(tmp, """
        import sys
        args = sys.argv[1:]
        x = bytearray(3 * 1024 * 1024 * 1024)
        open(args[args.index("-o") + 1], "w").write("x" * 500)
    """)
    monkeypatch.setitem(conversor.BINARIOS, "dwg2dxf", guloso)
    monkeypatch.setattr(conversor, "MEM_MB", 256)
    with pytest.raises(conversor.ErroConversao) as e:
        roda(conversor.converte("dwg2dxf", b"AC1032"))
    assert e.value.codigo == "falhou"


def test_operacao_desconhecida_recusada(tmp):
    with pytest.raises(conversor.ErroConversao) as e:
        roda(conversor.converte("../../bin/sh", b"x"))
    assert e.value.codigo == "protocolo"


def test_uma_conversao_por_vez(tmp, monkeypatch):
    registro = tmp / "registro.txt"
    devagar = _falso(tmp, f"""
        import sys, time
        args = sys.argv[1:]
        open({str(registro)!r}, "a").write("ini %f\\n" % time.time())
        time.sleep(0.6)
        open({str(registro)!r}, "a").write("fim %f\\n" % time.time())
        open(args[args.index("-o") + 1], "w").write("x" * 500)
    """)
    monkeypatch.setitem(conversor.BINARIOS, "dwg2dxf", devagar)

    async def duas():
        return await asyncio.gather(conversor.converte("dwg2dxf", b"AC1"), conversor.converte("dwg2dxf", b"AC2"))
    roda(duas())
    ev = [ln.split()[0] for ln in registro.read_text().splitlines()]
    assert ev == ["ini", "fim", "ini", "fim"]


def test_fila_cheia_responde_ocupado(tmp, monkeypatch):
    import fcntl
    monkeypatch.setattr(conversor, "ESPERA_S", 1)
    fd = os.open(conversor.TRAVA, os.O_RDWR | os.O_CREAT, 0o600)
    fcntl.flock(fd, fcntl.LOCK_EX)
    try:
        with pytest.raises(conversor.ErroConversao) as e:
            roda(conversor.converte("dwg2dxf", b"AC1032"))
        assert e.value.codigo == "ocupado"
    finally:
        os.close(fd)


# ---------------------------------------------------------------- modo serviço (socket do systemd)
def _servico_env(tmp: Path, binario: str) -> dict:
    return {"DRAWINGS_DWG2DXF": binario, "DRAWINGS_CONV_TRAVA": str(tmp / "srv.lock"), "DRAWINGS_CONV_TMPDIR": str(tmp)}


def test_protocolo_do_servico_pela_entrada_padrao(tmp):
    binario = _falso(tmp, ESPIAO)
    pedido = b"DRWCONV1 dwg2dxf 6\nAC1032"
    r = subprocess.run([sys.executable, "-I", "-S", str(AQUI / "conversor.py"), "--servico"], input=pedido,
                       capture_output=True, env=_servico_env(tmp, binario), timeout=60)
    cab, _, corpo = r.stdout.partition(b"\n")
    assert cab.startswith(b"OK "), r.stdout[:200] + r.stderr[-500:]
    assert int(cab.split()[1]) == len(corpo)
    assert json.loads(corpo.decode().strip())["entrada"] == "AC1032"
    ruim = subprocess.run([sys.executable, "-I", "-S", str(AQUI / "conversor.py"), "--servico"],
                          input=b"DRWCONV1 /bin/sh 2\nxx", capture_output=True, env=_servico_env(tmp, binario), timeout=60)
    assert ruim.stdout.startswith(b"ERR protocolo")


def _servidor_tipo_systemd(caminho: str, env: dict):
    """Imita drawings-conv.socket com Accept=yes: cada conexão vira um processo com stdin/stdout = socket."""
    srv = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    srv.bind(caminho)
    srv.listen(4)
    parar = threading.Event()

    def laco():
        srv.settimeout(0.2)
        while not parar.is_set():
            try:
                c, _ = srv.accept()
            except (socket.timeout, OSError):
                continue
            c.setblocking(True)
            subprocess.Popen([sys.executable, "-I", "-S", str(AQUI / "conversor.py"), "--servico"],
                             stdin=c.fileno(), stdout=c.fileno(), env=env).wait()
            c.close()
    t = threading.Thread(target=laco, daemon=True)
    t.start()
    return srv, parar


def test_api_usa_o_servico_quando_configurado(tmp, monkeypatch):
    d = Path(tempfile.mkdtemp(prefix="drw", dir="/tmp"))  # caminho curto: socket Unix tem limite de ~100 bytes
    try:
        sock = str(d / "c.sock")
        binario = _falso(tmp, ESPIAO)
        srv, parar = _servidor_tipo_systemd(sock, _servico_env(tmp, binario))
        monkeypatch.setattr(conversor, "SOCKET", sock)
        # no processo da API o binário nem precisa existir: quem converte é o serviço
        monkeypatch.setitem(conversor.BINARIOS, "dwg2dxf", "/nao/existe")
        assert conversor.disponivel() and conversor.modo() == "servico"
        out = roda(conversor.converte("dwg2dxf", b"AC1032 via socket"))
        info = json.loads(out.decode().strip())
        assert info["entrada"] == "AC1032 via socket"
        assert set(info["env"]) <= PERMITIDAS
        parar.set()
        srv.close()
    finally:
        shutil.rmtree(d, ignore_errors=True)


def test_servico_fora_do_ar(tmp, monkeypatch):
    monkeypatch.setattr(conversor, "SOCKET", "/tmp/nao-existe-drwconv.sock")
    assert not conversor.disponivel()
    with pytest.raises(conversor.ErroConversao) as e:
        roda(conversor.converte("dwg2dxf", b"AC1032"))
    assert e.value.codigo == "indisponivel"


# ---------------------------------------------------------------- LibreDWG de verdade (se instalado)
def _libredwg():
    for d in ("/opt/libredwg/bin", "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"):
        if os.access(f"{d}/dwg2dxf", os.X_OK) and os.access(f"{d}/dxf2dwg", os.X_OK):
            return d
    return None


@pytest.mark.skipif(_libredwg() is None, reason="LibreDWG não instalado")
def test_libredwg_ida_e_volta(tmp, monkeypatch):
    import ezdxf
    d = _libredwg()
    monkeypatch.setitem(conversor.BINARIOS, "dwg2dxf", f"{d}/dwg2dxf")
    monkeypatch.setitem(conversor.BINARIOS, "dxf2dwg", f"{d}/dxf2dwg")
    doc = ezdxf.new("R2000")
    msp = doc.modelspace()
    msp.add_line((0, 0), (5000, 0))
    msp.add_circle((2500, 2000), 800)
    msp.add_text("SALA", dxfattribs={"height": 250}).set_placement((2500, 2000))
    arq = tmp / "a.dxf"
    doc.saveas(arq)
    dwg = roda(conversor.converte("dxf2dwg", arq.read_bytes()))
    assert dwg.startswith(b"AC10")
    dxf = roda(conversor.converte("dwg2dxf", dwg))
    assert b"SECTION" in dxf and b"ENTITIES" in dxf
    assert not list(Path(tmp).glob("drwconv-*"))
