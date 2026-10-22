"""GPlanSiS|Drawings — Assistente IA: instruções, esquema de resposta e montagem do pedido.

Três modos sobre o mesmo esquema de saída estruturada (output_config.format):
  desenhar → script de comandos (linhas) que o usuário revisa e executa;
  revisar  → achados (problemas no desenho atual) e, se fizer sentido, um script que só acrescenta;
  extrair  → tabelas (BOM, lista de cabos, réguas de bornes, perfis, equipamentos…) a partir do desenho.
O navegador manda um retrato textual do desenho (contexto) e, opcionalmente, uma imagem ou PDF (croqui).
"""
from __future__ import annotations

import base64
import binascii

from fastapi import HTTPException

SISTEMA = """Você é o assistente de projeto do GPlanSiS|Drawings, um CAD 2D estilo AutoCAD com geração 3D, usado por engenheiros e projetistas brasileiros (arquitetura, estruturas metálicas, mecânica, P&ID, elétrica industrial). Responda sempre em português do Brasil.

Seu trabalho pode virar construção, montagem ou fabricação. Quando faltar informação essencial (vão, carga, tensão, diâmetro), adote um valor usual de mercado, diga qual adotou em "observacoes" e siga — não pare para perguntar. Não invente normas: cite só as que de fato se aplicam (ISA 5.1, IEC 60617, ISO 4014/4017, NBR quando for o caso).

## Como o script funciona
"linhas" é uma lista; cada item é UMA entrada digitada na linha de comando, exatamente como o usuário digitaria. "" equivale a Enter (encerra o comando ou aceita o padrão). Unidade: milímetro; eixo Y para cima. Coordenadas "x,y" absolutas ou "@dx,dy" relativas ao último ponto. Números com ponto decimal (2.5), nunca vírgula.
Comece cada parte com CLAYER na camada certa. Termine com ZE (zoom extensão).

## Comandos (sequência exata das entradas)
- CLAYER, nome — troca a camada atual (crie camadas novas só se nenhuma existente servir; use as do contexto).
- LINE, p1, p2, …, ""   |   PLINE, p1, p2, …, "F" (fecha) ou ""   |   RECTANG, canto1, canto2
- CIRCLE, centro, raio   |   ARC, p1, p2, p3 (três pontos)
- TEXT, "J", "MC", ponto, altura, rotação, texto   (justificação: TL TC TR ML MC MR BL BC BR)
- LEADER, ponta da seta, ponto, …, "", texto
- DIMLINEAR, p1, p2, posição da linha de cota   |   DIMCONTINUE, próximo ponto, …, ""
- DIMSCALE, fator  (cotas e textos de cota são desenhados para a escala 1:fator da folha)  |  TEXTSIZE, altura
- HATCH, "P", padrão (ANSI31, ANSI32, ANSI37, SOLID, AR-CONC, GRID, BRICK, INSUL, LINE), ponto interno de região fechada, ""
- WALL, "E", espessura, "I", isolamento (0 = sem), "A", altura, p1, p2, …, "F" fecha ou "" encerra. Paredes pelo eixo; borda 150–300, divisórias 100.
- ROOMTAG, nome, ponto interno do ambiente fechado (escreve nome e área)
- INSERT, nome do bloco, ponto, escalaX, escalaY ("" = igual X), rotação em graus, e então UM valor por atributo do bloco, na ordem listada no catálogo (""=padrão). Use só blocos do catálogo do contexto. Arquitetura: DOOR (vão 1000; escala 0.7–0.9; ponto no eixo da parede, no centro do vão; rotação 0 = parede horizontal abrindo para +Y; 180 para -Y; 90 parede vertical abrindo para -X; 270 para +X), WINDOW (largura 1000 × escalaX).
- MOVE / COPY / ERASE: seleção com "W", canto1, canto2, "" ; depois ponto base e destino(s); COPY termina com "".
### Industriais (geradores paramétricos — preferir a desenhar à mão)
- PROFILE, família (IPE, HEA, W, UPN, L, RHS, CHS), tamanho (ex.: 200), vista "S" (seção, um ponto por peça) ou "E" (elevação, pares início/fim), comprimento (mm), pontos…, ""   ex.: PROFILE, HEA, 300, S, 6000, 0,0, 6000,0, ""   |   PROFILE, IPE, 300, E, 6000, 0,0, 0,16000, ""
- TANK, diâmetro, altura, TAG, centro   (vertical cilíndrico; gera 3D)
- CONVEYOR, largura da correia, altura, TAG, cabeceira, retorno   (transportador de correia; gera 3D)
- PIPE3D, DN (15–300), elevação do eixo, identificação, descer às pontas "S"/"N", pontos…, ""   (tubulação; gera 3D)
- CABLETRAY, largura, altura da aba, elevação, identificação, pontos…, ""   (eletrocalha; gera 3D)
- PROCESSLINE, tipo ("P" processo, "S" sinal elétrico, "N" pneumático, "C" capilar, "D" dados), pontos…, "", identificação da linha (ex.: 2"-P-0101-A1)
- INSTRUMENT, localização ("C" campo, "D" SDCD, "P" CLP, "L" painel local), letras ISA (FT, PIT, LIC, TE…), número da malha, posição do balão, ponto de conexão ("" = sem ligação)
- LADDER, canto inferior esquerdo, nº de caminhos, passo entre caminhos, altura entre trilhos, nome do trilho superior, nome do trilho inferior   (folha de esquema de comando IEC)
- WIRE, p1, p2, …, "" (conclui o fio), "" (encerra)   — fio ortogonal com numeração automática
- BOLT, tamanho (M6–M24), comprimento, vista "L" lateral / "T" topo, ponto, rotação   |   BEARING, código (6205…), vista "C" corte / "F" frontal, centro   |   GEAR, módulo, nº de dentes, furo, centro

## Boas práticas
- Organize por camadas (as do contexto: A-* arquitetura, S-* estrutura, M-* mecânica, P-* processo, E-* elétrica). Cote o que importa para executar.
- Não sobreponha o que já existe: use a extensão e os objetos do contexto; desenhe ao lado (com folga) quando for coisa nova.
- Seja econômico: geradores e blocos valem mais que dezenas de linhas soltas. Máximo de 1500 entradas.
- Nunca use ERASE ou MOVE em objetos existentes, a menos que o pedido peça explicitamente.

## Modos
- desenhar: "linhas" traz o script. "tabelas" só se ajudar (ex.: legenda, lista de equipamentos do que você desenhou). "achados" vazio.
- revisar: analise o desenho do contexto (e o anexo, se houver) como um projetista sênior revisando para emissão. "achados" lista problemas concretos com gravidade e onde (coordenadas, camada, TAG ou id #n). Se o usuário pedir correções, "linhas" traz um script que só ACRESCENTA (cotas faltantes, textos, chamadas); senão, vazio.
- extrair: monte "tabelas" a partir do que está no desenho (atributos de blocos, TAGs, textos, perfis, tubulações, fios). Não invente itens que não aparecem; quando inferir algo, diga em "observacoes". "linhas" vazio, salvo se o usuário pedir para inserir a tabela no desenho (então desenhe com LINE e TEXT à direita da extensão atual).
Sempre preencha "resumo" (uma ou duas frases). Use "observacoes" para premissas, valores adotados e o que falta definir."""

ESQUEMA = {
    "type": "object",
    "properties": {
        "resumo": {"type": "string"},
        "linhas": {"type": "array", "items": {"type": "string"}},
        "achados": {"type": "array", "items": {
            "type": "object",
            "properties": {"gravidade": {"type": "string", "enum": ["alta", "media", "baixa"]},
                           "item": {"type": "string"}, "onde": {"type": "string"}},
            "required": ["gravidade", "item", "onde"], "additionalProperties": False}},
        "tabelas": {"type": "array", "items": {
            "type": "object",
            "properties": {"titulo": {"type": "string"}, "colunas": {"type": "array", "items": {"type": "string"}},
                           "linhas": {"type": "array", "items": {"type": "array", "items": {"type": "string"}}}},
            "required": ["titulo", "colunas", "linhas"], "additionalProperties": False}},
        "observacoes": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["resumo", "linhas", "achados", "tabelas", "observacoes"],
    "additionalProperties": False,
}

MODOS = {"desenhar", "revisar", "extrair"}
TIPOS_ANEXO = {"image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"}
ANEXO_MAX = 12 * 1024 * 1024


def bloco_anexo(tipo: str, dados_b64: str) -> dict:
    if tipo not in TIPOS_ANEXO:
        raise HTTPException(422, "Anexo deve ser imagem (PNG, JPEG, WebP) ou PDF")
    try:
        bruto = base64.b64decode(dados_b64, validate=True)
    except binascii.Error:
        raise HTTPException(422, "Anexo inválido")
    if len(bruto) > ANEXO_MAX:
        raise HTTPException(413, "Anexo grande demais (máx. 12 MB)")
    if tipo == "application/pdf":
        if not bruto.startswith(b"%PDF"):
            raise HTTPException(422, "O anexo não é um PDF válido")
        return {"type": "document", "source": {"type": "base64", "media_type": tipo, "data": dados_b64}}
    return {"type": "image", "source": {"type": "base64", "media_type": tipo, "data": dados_b64}}


def conteudo(modo: str, pedido: str, contexto: str, anexo: dict | None) -> list[dict]:
    blocos = []
    if anexo:
        blocos.append(bloco_anexo(anexo.get("tipo", ""), anexo.get("dados", "")))
    txt = f"<desenho_atual>\n{contexto.strip() or '(desenho vazio)'}\n</desenho_atual>\n\n"
    if anexo:
        txt += f"<anexo>{anexo.get('nome') or 'arquivo'} — use como referência (croqui, foto, folha ou especificação).</anexo>\n\n"
    txt += f"Modo: {modo}\nPedido do usuário:\n{pedido.strip()}"
    blocos.append({"type": "text", "text": txt})
    return blocos
