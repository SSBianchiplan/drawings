"""GPlanSiS|Drawings — escrita de DXF (AutoCAD 2018 ou 2000) a partir do modelo intermediário do navegador.

O modelo (web/cadexport.js) já traz a geometria resolvida: entidades 't' = line, pline, circle, arc,
ellipse, point, text, attdef, xline, ray, hatch, insert, solid e 'grupo' (cotas, paredes e tipos
especiais, que viram um bloco anônimo inserido na origem, como o AutoCAD faz com cotas).
"""
from __future__ import annotations

import io
import math
import re

import ezdxf
from ezdxf.enums import TextEntityAlignment
from ezdxf.tools import pattern as padroes

NOME_RUIM = re.compile(r'[<>/\\":;?*|=`]')
# nome no CAD → (nome no AutoCAD, fator sobre a escala do CAD)
PADRAO = {"ANSI31": ("ANSI31", 1), "ANSI32": ("ANSI32", 1), "ANSI37": ("ANSI37", 1), "AR-CONC": ("AR-CONC", 1),
          "GRID": ("NET", 10 / 3.175), "BRICK": ("BRICK", 1), "INSUL": ("INSUL", 1), "LINE": ("LINE", 1)}
PESOS = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211]
ALINHA = {("l", "b"): TextEntityAlignment.LEFT, ("c", "b"): TextEntityAlignment.CENTER, ("r", "b"): TextEntityAlignment.RIGHT,
          ("l", "m"): TextEntityAlignment.MIDDLE_LEFT, ("c", "m"): TextEntityAlignment.MIDDLE_CENTER, ("r", "m"): TextEntityAlignment.MIDDLE_RIGHT,
          ("l", "t"): TextEntityAlignment.TOP_LEFT, ("c", "t"): TextEntityAlignment.TOP_CENTER, ("r", "t"): TextEntityAlignment.TOP_RIGHT}
ANEXO = {("l", "t"): 1, ("c", "t"): 2, ("r", "t"): 3, ("l", "m"): 4, ("c", "m"): 5, ("r", "m"): 6, ("l", "b"): 7, ("c", "b"): 8, ("r", "b"): 9}


def nome_ok(n: str, padrao: str = "_") -> str:
    n = NOME_RUIM.sub("_", str(n or padrao)).strip()
    return n[:255] or padrao


def peso(mm: float) -> int:
    if not mm or mm <= 0:
        return -1
    alvo = round(mm * 100)
    return min(PESOS, key=lambda p: abs(p - alvo))


def mtexto(s: str) -> str:
    return s.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}").replace("\n", "\\P")


class Escritor:
    def __init__(self, m: dict, versao: str):
        self.d = ezdxf.new(versao, setup=True)
        self.d.units = ezdxf.units.MM
        self.d.header["$INSUNITS"] = 4
        self.d.header["$MEASUREMENT"] = 1
        self.d.header["$LTSCALE"] = float(m.get("ltscale") or 1)
        self.camadas: set[str] = {"0"}
        self.blocos: dict[str, str] = {}
        self.contagem: dict[str, int] = {}
        for L in m.get("layers", []):
            nm = nome_ok(L.get("name"), "0")
            lt = str(L.get("lt") or "CONTINUOUS").upper()
            lt = lt if lt in self.d.linetypes else "Continuous"
            if nm.upper() in {c.upper() for c in self.camadas} and nm != "0":
                continue
            # nomes de camada não diferenciam maiúsculas (ex.: DEFPOINTS × Defpoints já criada pelo ezdxf)
            ly = self.d.layers.get(nm) if nm in self.d.layers else self.d.layers.add(nm)
            ly.color = int(L.get("color") or 7) if 1 <= int(L.get("color") or 7) <= 255 else 7
            ly.dxf.linetype = lt
            ly.dxf.lineweight = peso(float(L.get("lw") or 0.25))
            if not L.get("on", True):
                ly.off()
            if L.get("frozen"):
                ly.freeze()
            if L.get("locked"):
                ly.lock()
            self.camadas.add(nm)
        # blocos primeiro (nomes saneados), depois o conteúdo, para permitir blocos aninhados
        for nm, B in (m.get("blocks") or {}).items():
            self.blocos[nm] = self._nome_bloco(nm)
            bx, by = B.get("base") or [0, 0]
            self.d.blocks.new(name=self.blocos[nm], base_point=(bx, by))
        for nm, B in (m.get("blocks") or {}).items():
            blk = self.d.blocks.get(self.blocos[nm])
            for e in B.get("ents", []):
                self.add(blk, e)
        msp = self.d.modelspace()
        for e in m.get("ents", []):
            self.add(msp, e)

    def _nome_bloco(self, nm: str) -> str:
        base = nome_ok(nm, "BLOCO").lstrip("*") or "BLOCO"
        novo, i = base, 1
        while novo.upper() in {n.upper() for n in self.blocos.values()} or novo in self.d.blocks:
            novo, i = f"{base}_{i}", i + 1
        return novo

    def attrs(self, e: dict) -> dict:
        lay = nome_ok(e.get("layer"), "0")
        if lay not in self.camadas:
            if lay not in self.d.layers:
                self.d.layers.add(lay)
            self.camadas.add(lay)
        a = {"layer": lay}
        c = e.get("color", "BL")
        if c == "BB":
            a["color"] = 0
        elif isinstance(c, (int, float)) and 1 <= int(c) <= 255:
            a["color"] = int(c)
        elif isinstance(c, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", c):
            a["true_color"] = ezdxf.colors.rgb2int(tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)))
        lt = str(e.get("lt") or "BL").upper()
        if lt != "BL" and lt in self.d.linetypes:
            a["linetype"] = lt
        lw = e.get("lw", -1)
        if isinstance(lw, (int, float)) and lw > 0:
            a["lineweight"] = peso(lw)
        return a

    def add(self, lay, e: dict):
        t = e.get("t")
        self.contagem[t] = self.contagem.get(t, 0) + 1
        try:
            getattr(self, "e_" + t)(lay, e, self.attrs(e))
        except (AttributeError, KeyError, ValueError, TypeError, ezdxf.DXFError):
            self.contagem["_falhas"] = self.contagem.get("_falhas", 0) + 1

    def e_line(self, l, e, a):
        l.add_line(e["a"], e["b"], dxfattribs=a)

    def e_pline(self, l, e, a):
        if len(e["pts"]) > 1:
            l.add_lwpolyline(e["pts"], close=bool(e.get("closed")), dxfattribs=a)

    def e_circle(self, l, e, a):
        l.add_circle(e["c"], e["r"], dxfattribs=a)

    def e_arc(self, l, e, a):
        l.add_arc(e["c"], e["r"], e["a0"], e["a1"], dxfattribs=a)

    def e_ellipse(self, l, e, a):
        rx, ry, r = float(e["rx"]), float(e["ry"]), math.radians(e.get("rot", 0))
        if rx >= ry:
            maior, razao = (rx * math.cos(r), rx * math.sin(r)), ry / rx
        else:
            maior, razao = (-ry * math.sin(r), ry * math.cos(r)), rx / ry
        l.add_ellipse(e["c"], major_axis=maior, ratio=max(min(razao, 1.0), 1e-6), dxfattribs=a)

    def e_point(self, l, e, a):
        l.add_point(e["p"], dxfattribs=a)

    def e_solid(self, l, e, a):
        l.add_solid(e["pts"], dxfattribs=a)

    def e_xline(self, l, e, a):
        l.add_xline(e["p"], e["d"], dxfattribs=a)

    def e_ray(self, l, e, a):
        l.add_ray(e["p"], e["d"], dxfattribs=a)

    def e_text(self, l, e, a):
        s, al, vb = str(e.get("s", "")), e.get("al", "l"), e.get("vb", "b")
        if not s.strip():
            return
        if "\n" in s:
            l.add_mtext(mtexto(s), dxfattribs={**a, "char_height": e["h"], "insert": e["p"], "rotation": e.get("rot", 0),
                                                "attachment_point": ANEXO.get((al, vb), 7)})
        else:
            l.add_text(s, height=e["h"], rotation=e.get("rot", 0), dxfattribs=a).set_placement(e["p"], align=ALINHA.get((al, vb), TextEntityAlignment.LEFT))

    def e_attdef(self, l, e, a):
        ad = l.add_attdef(nome_ok(e["tag"], "TAG").replace(" ", "_"), e["p"], text=e.get("def", ""),
                          dxfattribs={**a, "height": e["h"], "rotation": e.get("rot", 0), "prompt": e.get("prompt", "")})
        ad.set_placement(e["p"], align=ALINHA.get((e.get("al", "l"), e.get("vb", "b")), TextEntityAlignment.LEFT))

    def e_hatch(self, l, e, a):
        loops = [p for p in e.get("loops", []) if len(p) > 2]
        if not loops:
            return
        h = l.add_hatch(dxfattribs=a)
        for p in loops:
            h.paths.add_polyline_path(p, is_closed=True)
        nome = str(e.get("pat") or "SOLID").upper()
        if nome == "SOLID":
            h.set_solid_fill(color=a.get("color", 256))
            return
        acad, fator = PADRAO.get(nome, ("ANSI31", 1))
        if acad not in padroes.ISO_PATTERN:
            acad, fator = "ANSI31", 1
        h.set_pattern_fill(acad, color=a.get("color", 256), scale=float(e.get("sc") or 1) * fator, angle=float(e.get("ang") or 0))

    def e_insert(self, l, e, a):
        nm = self.blocos.get(e["name"])
        if not nm:
            return
        ref = l.add_blockref(nm, e["p"], dxfattribs={**a, "xscale": e.get("sx", 1), "yscale": e.get("sy", 1), "rotation": e.get("rot", 0)})
        blk = self.d.blocks.get(nm)
        if any(x.dxftype() == "ATTDEF" for x in blk):
            valores = {str(k).replace(" ", "_"): str(v) for k, v in (e.get("attrs") or {}).items()}
            ref.add_auto_attribs(valores)

    def e_grupo(self, l, e, a):
        blk = self.d.blocks.new_anonymous_block("U")
        for x in e.get("ents", []):
            self.add(blk, x)
        l.add_blockref(blk.name, (0, 0), dxfattribs={"layer": a["layer"]})

    def bytes(self) -> bytes:
        s = io.StringIO()
        self.d.write(s)
        # R2018 sai em UTF-8; R2000 na página de código do arquivo, com \U+XXXX para o resto
        return s.getvalue().encode(self.d.output_encoding, errors="dxfreplace")


def gera_dxf(modelo: dict, versao: str = "R2018") -> tuple[bytes, dict]:
    w = Escritor(modelo, versao)
    return w.bytes(), w.contagem
