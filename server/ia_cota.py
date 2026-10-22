"""GPlanSiS|Drawings — cota e contabilidade de uso da IA (modelo do GPlanSiS|Studio).

* Cada chamada à Anthropic grava tokens reais e custo em drawings.ia_uso (também quando falha).
* Cota mensal em US$ por pessoa: drawings.usuarios.ia_cota (NULL = padrão global), padrão global
  em drawings.config['ia'].cota_usd (20,00 se ausente). Só administradores alteram.
* Gasto do mês >= cota → 402. Mais de 30 chamadas por minuto ou 3 simultâneas → 429 (memória do
  processo; com N workers o teto efetivo é N vezes isso — a cota em US$ é global, no banco).
* Corpo das rotas /api/ia/* limitado antes do parse (413).
* Mensagens ao navegador sem detalhe interno; no registro vai só o tipo do erro.
"""
from __future__ import annotations

import json
import time
from collections import defaultdict
from datetime import datetime, timezone

import anthropic
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

COTA_PADRAO = 20.0
POR_MINUTO = 30
SIMULTANEAS = 3
# limite do corpo por rota (bytes); /api/ia/assistente aceita anexo de até 12 MB (≈16 MB em base64)
LIMITES = {"/api/ia/json": 512 * 1024, "/api/ia/assistente": 18 * 1024 * 1024}
LIMITE_PADRAO = 512 * 1024

# US$ por milhão de tokens (entrada, saída)
PRECOS = {
    "claude-fable-5": (10.0, 50.0),
    "claude-mythos-5": (10.0, 50.0),
    "claude-opus-5-5": (4.0, 20.0),
    "claude-opus-5": (5.0, 25.0),
    "claude-opus-4": (5.0, 25.0),
    "claude-sonnet-5": (2.0, 10.0),
    "claude-sonnet-4": (3.0, 15.0),
    "claude-haiku-5-5": (0.10, 0.50),
    "claude-haiku-4": (1.0, 5.0),
}

# Tabela drawings.ia_uso e coluna drawings.usuarios.ia_cota: criadas pelo schema.sql (idempotente, roda a cada início).

_db = None
_em_curso: dict[int, list[float]] = defaultdict(list)   # início de cada chamada em curso
VAGA_MAX_S = 600  # vaga não liberada (conexão caída antes de começar) expira sozinha
_recentes: dict[int, list[float]] = defaultdict(list)


def configura(db_fn) -> None:
    global _db
    _db = db_fn


# ---------------------------------------------------------------- custo
def preco(modelo: str | None) -> tuple[float, float]:
    m = modelo or ""
    for k in sorted(PRECOS, key=len, reverse=True):   # o prefixo mais específico ganha
        if m.startswith(k):
            return PRECOS[k]
    return 5.0, 25.0  # conservador


def custo(modelo: str | None, u) -> float:
    if u is None:
        return 0.0
    pin, pout = preco(modelo)
    cw = getattr(u, "cache_creation_input_tokens", 0) or 0
    cr = getattr(u, "cache_read_input_tokens", 0) or 0
    return ((getattr(u, "input_tokens", 0) or 0) * pin + cw * pin * 1.25 + cr * pin * 0.1
            + (getattr(u, "output_tokens", 0) or 0) * pout) / 1e6


def inicio_mes() -> datetime:
    n = datetime.now(timezone.utc)
    return n.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def cota_padrao() -> float:
    with _db() as c:
        r = c.execute("select valor from drawings.config where chave = 'ia'").fetchone()
    v = (r and r["valor"]) or {}
    try:
        return float(v.get("cota_usd", COTA_PADRAO))
    except (TypeError, ValueError):
        return COTA_PADRAO


def cota_de(u: dict) -> float:
    q = u.get("ia_cota")
    return float(q) if q is not None else cota_padrao()


def gasto_mes(uid: int) -> float:
    with _db() as c:
        r = c.execute("select coalesce(sum(custo_usd), 0) s from drawings.ia_uso where usuario_id = %s and ts >= %s",
                      (uid, inicio_mes())).fetchone()
    return float(r["s"])


def registra_uso(uid: int | None, recurso: str, modelo: str | None, u, ok: bool, erro: str | None, ms: int) -> float:
    c_usd = custo(modelo, u)
    try:
        with _db() as c:
            c.execute("""insert into drawings.ia_uso(usuario_id, recurso, modelo, input_tokens, output_tokens, cache_read,
                                                   cache_write, custo_usd, ok, erro, ms)
                         values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                      (uid, recurso, modelo, getattr(u, "input_tokens", 0) or 0, getattr(u, "output_tokens", 0) or 0,
                       getattr(u, "cache_read_input_tokens", 0) or 0, getattr(u, "cache_creation_input_tokens", 0) or 0,
                       round(c_usd, 6), ok, (erro or None) and erro[:80], ms))
    except Exception:  # noqa: BLE001 — falha ao contabilizar não derruba a resposta
        pass
    return c_usd


# ---------------------------------------------------------------- portão antes da chamada
class Vaga:
    """Reserva uma vaga de chamada da pessoa: confere cota e ritmo; libera no fim."""

    def __init__(self, u: dict, recurso: str):
        self.u, self.recurso, self.t0 = u, recurso, time.time()
        self.modelo: str | None = None
        self.uso = None
        self.erro: str | None = None
        self._fechada = False
        uid = u["id"]
        gasto, cota = gasto_mes(uid), cota_de(u)
        if gasto >= cota:
            raise HTTPException(402, f"Cota de IA do mês atingida (US$ {gasto:.2f} de US$ {cota:.2f}). "
                                     "Fale com um administrador para ampliar a sua cota.")
        agora = time.time()
        _recentes[uid] = [t for t in _recentes[uid] if agora - t < 60]
        _em_curso[uid] = [t for t in _em_curso[uid] if agora - t < VAGA_MAX_S]
        if len(_recentes[uid]) >= POR_MINUTO or len(_em_curso[uid]) >= SIMULTANEAS:
            raise HTTPException(429, "Muitas chamadas de IA seguidas — aguarde alguns segundos.")
        _recentes[uid].append(agora)
        _em_curso[uid].append(agora)
        self._marca = agora

    def resultado(self, msg) -> None:
        self.modelo = getattr(msg, "model", None) or self.modelo
        self.uso = getattr(msg, "usage", None)

    def fecha(self, erro: str | None = None) -> float:
        if self._fechada:
            return 0.0
        self._fechada = True
        try:
            _em_curso[self.u["id"]].remove(self._marca)
        except ValueError:
            pass
        e = erro if erro is not None else self.erro
        return registra_uso(self.u["id"], self.recurso, self.modelo, self.uso, e is None, e, int((time.time() - self.t0) * 1000))


def tipo_erro(e: BaseException) -> str:
    if isinstance(e, anthropic.APIStatusError):
        return f"status_{e.status_code}"
    if isinstance(e, HTTPException):
        return f"http_{e.status_code}"
    return type(e).__name__[:40]


def erro_generico(e: BaseException) -> HTTPException:
    """Mensagem para o navegador, sem o texto devolvido pela Anthropic nem detalhes internos."""
    if isinstance(e, HTTPException):
        return e
    if isinstance(e, anthropic.AuthenticationError):
        return HTTPException(502, "Chave da Anthropic recusada — um administrador precisa revisá-la em Configurações › Assistente IA")
    if isinstance(e, anthropic.PermissionDeniedError):
        return HTTPException(502, "A chave não tem permissão para este modelo")
    if isinstance(e, anthropic.NotFoundError):
        return HTTPException(502, "Modelo não encontrado para esta chave — escolha outro em Configurações › Assistente IA")
    if isinstance(e, anthropic.RateLimitError):
        return HTTPException(429, "Limite de uso da Anthropic atingido — tente em instantes")
    if isinstance(e, anthropic.BadRequestError):
        return HTTPException(400, "A IA não aceitou o pedido — reduza o tamanho ou reformule")
    if isinstance(e, anthropic.APIStatusError):
        return HTTPException(502, "O serviço da Anthropic está instável — tente de novo em instantes")
    if isinstance(e, anthropic.APIConnectionError):
        return HTTPException(502, "Sem conexão com a Anthropic a partir do servidor")
    return HTTPException(502, "Falha inesperada ao chamar a IA — tente de novo")


# ---------------------------------------------------------------- limite do corpo (ASGI)
class LimiteCorpoIA:
    """Recusa com 413 corpos acima do limite nas rotas /api/ia/*, antes de o FastAPI ler tudo na memória."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not scope["path"].startswith("/api/ia/"):
            return await self.app(scope, receive, send)
        limite = LIMITES.get(scope["path"], LIMITE_PADRAO)

        async def recusa():
            corpo = json.dumps({"detail": "Pedido grande demais para a IA."}).encode()
            await send({"type": "http.response.start", "status": 413,
                        "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(corpo)).encode())]})
            await send({"type": "http.response.body", "body": corpo})

        for k, v in scope.get("headers", []):
            if k == b"content-length":
                try:
                    if int(v) > limite:
                        return await recusa()
                except ValueError:
                    return await recusa()
        lido = 0
        estourou = False
        respondeu = False

        async def receive_limitado():
            nonlocal lido, estourou
            m = await receive()
            if m["type"] == "http.request":
                lido += len(m.get("body", b""))
                if lido > limite:
                    estourou = True
                    raise _CorpoGrande()
            return m

        async def send_filtrado(m):
            # se o corpo estourou, o FastAPI pode transformar a exceção em 400/500: troca por 413
            nonlocal respondeu
            if estourou:
                if not respondeu:
                    respondeu = True
                    await recusa()
                return
            respondeu = True
            await send(m)

        try:
            await self.app(scope, receive_limitado, send_filtrado)
        except _CorpoGrande:
            if not respondeu:
                await recusa()
        except Exception:
            if estourou and not respondeu:
                await recusa()
            else:
                raise


class _CorpoGrande(Exception):
    pass


# ---------------------------------------------------------------- rotas de administração
class CotaPadraoIn(BaseModel):
    cotaUsd: float = Field(ge=0, le=10000)


class CotaUsuarioIn(BaseModel):
    cotaUsd: float | None = Field(default=None, ge=0, le=10000)   # None = volta ao padrão


def rotas(exige_admin, usuario_atual, registra) -> APIRouter:
    r = APIRouter()

    @r.get("/api/ia/uso")
    def meu_uso(u: dict = Depends(usuario_atual)):
        return {"gastoUsd": round(gasto_mes(u["id"]), 4), "cotaUsd": cota_de(u), "inicioMes": inicio_mes().isoformat()}

    @r.get("/api/admin/ia/uso")
    def uso_geral(u: dict = Depends(exige_admin)):
        ini = inicio_mes()
        with _db() as c:
            por_usuario = c.execute(
                """select u.id, u.login, u.nome, u.ia_cota, count(a.id) n, coalesce(sum(a.custo_usd), 0) custo,
                          coalesce(sum(a.input_tokens), 0) tin, coalesce(sum(a.output_tokens), 0) tout
                   from drawings.usuarios u left join drawings.ia_uso a on a.usuario_id = u.id and a.ts >= %s
                   group by u.id order by custo desc, u.nome""", (ini,)).fetchall()
        padrao = cota_padrao()
        return {"inicioMes": ini.isoformat(), "cotaPadraoUsd": padrao,
                "usuarios": [{"id": x["id"], "login": x["login"], "nome": x["nome"], "chamadas": x["n"],
                              "gastoUsd": round(float(x["custo"]), 4), "tokensEntrada": x["tin"], "tokensSaida": x["tout"],
                              "cotaUsd": float(x["ia_cota"]) if x["ia_cota"] is not None else padrao,
                              "cotaPropria": x["ia_cota"] is not None} for x in por_usuario]}

    @r.put("/api/admin/ia/cota")
    def define_cota_padrao(body: CotaPadraoIn, request: Request, u: dict = Depends(exige_admin)):
        with _db() as c:
            cur = c.cursor()
            cur.execute("""insert into drawings.config(chave, valor, atualizado_em, atualizado_por)
                           values ('ia', jsonb_build_object('cota_usd', %s::numeric), now(), %s)
                           on conflict (chave) do update set valor = drawings.config.valor || jsonb_build_object('cota_usd', %s::numeric),
                             atualizado_em = now(), atualizado_por = excluded.atualizado_por""",
                        (body.cotaUsd, u["login"], body.cotaUsd))
            registra(cur, "IA_COTA", request, u, detalhe=f"cota padrão US$ {body.cotaUsd:.2f}")
        return {"cotaPadraoUsd": cota_padrao()}

    @r.put("/api/admin/ia/cota/{uid}")
    def define_cota_usuario(uid: int, body: CotaUsuarioIn, request: Request, u: dict = Depends(exige_admin)):
        with _db() as c:
            cur = c.cursor()
            cur.execute("update drawings.usuarios set ia_cota = %s where id = %s returning login", (body.cotaUsd, uid))
            alvo = cur.fetchone()
            if not alvo:
                raise HTTPException(404, "Usuário não encontrado")
            registra(cur, "IA_COTA", request, u,
                     detalhe=f"{alvo['login']}: " + ("padrão" if body.cotaUsd is None else f"US$ {body.cotaUsd:.2f}"))
        return {"id": uid, "cotaUsd": body.cotaUsd}

    return r
