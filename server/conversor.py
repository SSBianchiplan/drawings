"""GPlanSiS|Drawings — conversão DWG <-> DXF pelo LibreDWG, isolada.

O LibreDWG é código C que lê arquivo enviado pelo usuário, e tem histórico de falhas de
memória achadas por fuzzing. Por isso a conversão nunca roda "solta" no processo da API:

  * ambiente vazio (env={}): o conversor não herda ANTHROPIC_API_KEY, DRAWINGS_SEGREDO,
    DRAWINGS_DOCS_SEGREDO nem nada do .env que o systemd carrega na API;
  * diretório temporário próprio (mkdtemp, 0700), que também é o cwd, apagado no fim;
  * limites de recurso no processo filho (memória, CPU, tamanho de arquivo, arquivos abertos,
    processos, core dump) e prazo de parede; no estouro o grupo de processos inteiro é morto;
  * uma conversão por vez no servidor inteiro (trava de arquivo, vale entre os workers);
  * com DRAWINGS_CONV_SOCKET definido, a conversão sai do processo da API: vai por um socket
    Unix para o serviço drawings-conv@ (systemd, DynamicUser, sem rede, sem acesso a
    /opt/drawings e ao .env, com MemoryMax e filtro de syscalls). Ver deploy/drawings-conv.*.

Sem o socket configurado, a API converte localmente com as mesmas proteções (exceto a troca
de usuário, que exige o serviço à parte, porque a API roda com NoNewPrivileges).

Este arquivo também é o processo do lado do serviço:  python3 -I conversor.py --servico
(lê um pedido na entrada padrão e escreve a resposta na saída padrão — o socket do systemd).
"""
from __future__ import annotations

import asyncio
import contextlib
import fcntl
import os
import shutil
import signal
import sys
import tempfile
import time

# ---------------------------------------------------------------- configuração
BIN_DIR = os.environ.get("DRAWINGS_LIBREDWG_BIN", "/opt/libredwg/bin")
BINARIOS = {
    "dwg2dxf": os.environ.get("DRAWINGS_DWG2DXF", os.path.join(BIN_DIR, "dwg2dxf")),
    "dxf2dwg": os.environ.get("DRAWINGS_DXF2DWG", os.path.join(BIN_DIR, "dxf2dwg")),
}
# operação -> (nome do arquivo de entrada, nome do de saída). O cliente só escolhe a operação.
OPS = {"dwg2dxf": ("in.dwg", "out.dxf"), "dxf2dwg": ("in.dxf", "out.dwg")}

SOCKET = os.environ.get("DRAWINGS_CONV_SOCKET", "").strip()
# trava entre os workers da API; no systemd da API o /tmp é privado e compartilhado só por eles
TRAVA = os.environ.get("DRAWINGS_CONV_TRAVA", "")
TMP_BASE = os.environ.get("DRAWINGS_CONV_TMPDIR") or None


def _int(nome: str, padrao: int) -> int:
    try:
        return max(1, int(os.environ.get(nome, padrao)))
    except ValueError:
        return padrao


TIMEOUT_S = _int("DRAWINGS_CONV_TIMEOUT_S", 120)        # prazo de parede
CPU_S = _int("DRAWINGS_CONV_CPU_S", 110)                # RLIMIT_CPU
MEM_MB = _int("DRAWINGS_CONV_MEM_MB", 1536)             # RLIMIT_AS
FSIZE_MB = _int("DRAWINGS_CONV_FSIZE_MB", 400)          # maior arquivo que o conversor grava
ESPERA_S = _int("DRAWINGS_CONV_ESPERA_S", 90)           # quanto um pedido espera na fila
ENTRADA_MAX = 64 * 1024 * 1024
MAGIC = b"DRWCONV1"


class ErroConversao(Exception):
    """Falha da conversão. `codigo`: 'ocupado', 'prazo', 'falhou', 'indisponivel', 'protocolo'."""

    def __init__(self, codigo: str, msg: str = ""):
        super().__init__(msg or codigo)
        self.codigo, self.msg = codigo, msg


# ---------------------------------------------------------------- execução isolada
def _limites() -> None:
    """Roda no processo filho, entre o fork e o exec."""
    import resource
    mb = 1024 * 1024
    pedidos = [
        (resource.RLIMIT_CPU, CPU_S),
        (resource.RLIMIT_FSIZE, FSIZE_MB * mb),
        (resource.RLIMIT_NOFILE, 32),
        (resource.RLIMIT_CORE, 0),
    ]
    if hasattr(resource, "RLIMIT_AS"):
        pedidos.append((resource.RLIMIT_AS, MEM_MB * mb))
    if hasattr(resource, "RLIMIT_NPROC") and sys.platform.startswith("linux"):
        # conta por usuário: no serviço dedicado (DynamicUser) isto impede qualquer fork/thread extra
        pedidos.append((resource.RLIMIT_NPROC, 1 if os.getuid() != 0 else 64))
    for rec, v in pedidos:
        try:
            _, duro = resource.getrlimit(rec)
            if duro != resource.RLIM_INFINITY:
                v = min(v, duro)
            resource.setrlimit(rec, (v, v))
        except (ValueError, OSError):
            # macOS não aceita RLIMIT_AS; no Linux todos valem
            if sys.platform.startswith("linux"):
                raise
    # o conversor nunca lê da entrada padrão; FSIZE estourado vira erro e não morte silenciosa
    signal.signal(signal.SIGXFSZ, signal.SIG_DFL)


async def executa_local(op: str, dados: bytes) -> bytes:
    """Converte `dados` com o binário de `op`, isolado. Devolve os bytes de saída."""
    if op not in OPS:
        raise ErroConversao("protocolo", "operação desconhecida")
    binario = BINARIOS[op]
    if not os.access(binario, os.X_OK):
        raise ErroConversao("indisponivel", "conversor não instalado")
    if len(dados) > ENTRADA_MAX:
        raise ErroConversao("protocolo", "arquivo grande demais")
    nome_ent, nome_sai = OPS[op]
    tmp = tempfile.mkdtemp(prefix="drwconv-", dir=TMP_BASE)
    try:
        os.chmod(tmp, 0o700)
        ent, sai = os.path.join(tmp, nome_ent), os.path.join(tmp, nome_sai)
        with open(ent, "wb") as f:
            f.write(dados)
        proc = await asyncio.create_subprocess_exec(
            binario, "-y", "-o", nome_sai, nome_ent,
            cwd=tmp, env={}, stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
            preexec_fn=_limites, start_new_session=True, close_fds=True,
        )
        try:
            _, err = await asyncio.wait_for(proc.communicate(), timeout=TIMEOUT_S)
        except asyncio.TimeoutError:
            with contextlib.suppress(ProcessLookupError):
                os.killpg(proc.pid, signal.SIGKILL)
            with contextlib.suppress(Exception):
                await asyncio.wait_for(proc.wait(), timeout=5)
            raise ErroConversao("prazo", "a conversão excedeu o prazo")
        finally:
            # nada do grupo sobrevive à conversão
            with contextlib.suppress(ProcessLookupError, PermissionError):
                os.killpg(proc.pid, signal.SIGKILL)
        minimo = 100 if op == "dwg2dxf" else 1000
        if not os.path.exists(sai) or os.path.getsize(sai) < minimo:
            linhas = err.decode("utf-8", "replace").strip().splitlines()
            motivo = "morto por limite de recurso" if proc.returncode and proc.returncode < 0 else (linhas[-1][:200] if linhas else "formato não suportado")
            raise ErroConversao("falhou", motivo)
        with open(sai, "rb") as f:
            return f.read()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ---------------------------------------------------------------- uma conversão por vez
@contextlib.asynccontextmanager
async def _vez():
    fd = os.open(TRAVA or os.path.join(tempfile.gettempdir(), "drawings-conv.lock"), os.O_RDWR | os.O_CREAT, 0o600)
    try:
        limite = time.monotonic() + ESPERA_S
        while True:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() > limite:
                    raise ErroConversao("ocupado", "conversor ocupado")
                await asyncio.sleep(0.25)
        try:
            yield
        finally:
            fcntl.flock(fd, fcntl.LOCK_UN)
    finally:
        os.close(fd)


# ---------------------------------------------------------------- cliente do serviço isolado
async def _via_socket(op: str, dados: bytes) -> bytes:
    try:
        r, w = await asyncio.wait_for(asyncio.open_unix_connection(SOCKET, limit=2 ** 20), timeout=10)
    except (OSError, asyncio.TimeoutError):
        raise ErroConversao("indisponivel", "serviço de conversão fora do ar")
    try:
        w.write(b"%s %s %d\n" % (MAGIC, op.encode(), len(dados)))
        w.write(dados)
        await w.drain()
        cab = await asyncio.wait_for(r.readline(), timeout=TIMEOUT_S + 15)
        partes = cab.decode("ascii", "replace").strip().split(" ", 2)
        if len(partes) >= 2 and partes[0] == "OK":
            n = int(partes[1])
            if n < 0 or n > FSIZE_MB * 1024 * 1024:
                raise ErroConversao("protocolo", "resposta inválida do conversor")
            return await asyncio.wait_for(r.readexactly(n), timeout=60)
        if len(partes) >= 2 and partes[0] == "ERR":
            raise ErroConversao(partes[1], partes[2] if len(partes) > 2 else "")
        raise ErroConversao("falhou", "o conversor encerrou sem resposta (possível estouro de memória)")
    except asyncio.TimeoutError:
        raise ErroConversao("prazo", "a conversão excedeu o prazo")
    except (asyncio.IncompleteReadError, ValueError, ConnectionError):
        raise ErroConversao("falhou", "resposta incompleta do conversor")
    finally:
        w.close()
        with contextlib.suppress(Exception):
            await w.wait_closed()


def disponivel(op: str = "dwg2dxf") -> bool:
    if SOCKET:
        return os.path.exists(SOCKET)
    return os.access(BINARIOS[op], os.X_OK)


def modo() -> str:
    return "servico" if SOCKET else "local"


async def converte(op: str, dados: bytes) -> bytes:
    """Ponto de entrada da API."""
    if op not in OPS:
        raise ErroConversao("protocolo", "operação desconhecida")
    async with _vez():
        if SOCKET:
            return await _via_socket(op, dados)
        return await executa_local(op, dados)


# ---------------------------------------------------------------- lado do serviço (systemd)
def _servico() -> int:
    """Um pedido por conexão: '<MAGIC> <op> <tamanho>\\n' + bytes  ->  'OK <n>\\n' + bytes | 'ERR <codigo> <msg>\\n'."""
    ent, sai = sys.stdin.buffer, sys.stdout.buffer

    def responde_erro(codigo: str, msg: str) -> int:
        sai.write(f"ERR {codigo} {msg[:200]}\n".encode("utf-8", "replace"))
        sai.flush()
        return 1

    cab = ent.readline(200).decode("ascii", "replace").strip().split(" ")
    if len(cab) != 3 or cab[0] != MAGIC.decode() or cab[1] not in OPS or not cab[2].isdigit():
        return responde_erro("protocolo", "pedido inválido")
    n = int(cab[2])
    if n > ENTRADA_MAX:
        return responde_erro("protocolo", "arquivo grande demais")
    dados = ent.read(n)
    if len(dados) != n:
        return responde_erro("protocolo", "pedido incompleto")
    try:
        out = asyncio.run(executa_local(cab[1], dados))
    except ErroConversao as e:
        return responde_erro(e.codigo, e.msg)
    sai.write(b"OK %d\n" % len(out))
    sai.write(out)
    sai.flush()
    return 0


if __name__ == "__main__":
    if sys.argv[1:] == ["--servico"]:
        sys.exit(_servico())
    print("uso: python3 -I conversor.py --servico   (chamado pelo drawings-conv@.service)", file=sys.stderr)
    sys.exit(2)
