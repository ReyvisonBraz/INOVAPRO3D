#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera o relatório de auditoria de segurança em PDF.

Uso:
    docs/security-audit/.venv/bin/python docs/security-audit/gerar_relatorio.py

Os achados ficam em `dados_auditoria.py`; este arquivo cuida só do layout.
Regerar o relatório depois de corrigir algo é editar aquele arquivo e rodar
este de novo — nada aqui precisa mudar.
"""

import os
import re
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    XPreformatted,
)

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

from dados_auditoria import (  # noqa: E402
    ACHADOS,
    COMMIT,
    CORES,
    DATA_AUDITORIA,
    ISSUES,
    METODOLOGIA,
    PONTOS_FORTES,
    PONTOS_FRACOS,
    PROJETO,
    RECOMENDACOES,
    ROTULO_SEVERIDADE,
    STACK,
)

SAIDA = os.path.join(AQUI, "relatorio-auditoria-seguranca.pdf")
TITULO = f"Relatório de Auditoria de Segurança — {PROJETO}"

TINTA = colors.HexColor("#0F172A")
TINTA_SUAVE = colors.HexColor("#475569")
TINTA_TENUE = colors.HexColor("#94A3B8")
LINHA = colors.HexColor("#E2E8F0")
FUNDO_CODIGO = colors.HexColor("#F8FAFC")
ACENTO = colors.HexColor("#2563EB")


# ─────────────────────────────────────────────────────────────────────────────
# Utilidades de texto
# ─────────────────────────────────────────────────────────────────────────────


def esc(txt):
    """Escapa código para caber num Paragraph/XPreformatted do reportlab."""
    return txt.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def to_md(txt):
    """Converte o mini-HTML dos dados para Markdown (usado nas issues)."""
    txt = txt.replace("<b>", "**").replace("</b>", "**")
    txt = txt.replace("<i>", "_").replace("</i>", "_")
    txt = txt.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
    return txt


def caminho_tabela(achado):
    """Caminho para a coluna estreita da tabela-resumo.

    Achados que apontam para vários arquivos trazem um `arquivo_resumo` com as
    quebras já postas nos limites certos; sem ele o Courier quebraria no meio
    de um nome de arquivo.
    """
    return esc(achado.get("arquivo_resumo", achado["arquivo"])).replace(
        "&lt;br/&gt;", "<br/>"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Estilos
# ─────────────────────────────────────────────────────────────────────────────

base = getSampleStyleSheet()

S = {
    "capa_titulo": ParagraphStyle(
        "capa_titulo", parent=base["Title"], fontName="Helvetica-Bold",
        fontSize=27, leading=33, textColor=TINTA, alignment=TA_CENTER, spaceAfter=0,
    ),
    "capa_sub": ParagraphStyle(
        "capa_sub", parent=base["Normal"], fontSize=12.5, leading=18,
        textColor=TINTA_SUAVE, alignment=TA_CENTER,
    ),
    "capa_meta": ParagraphStyle(
        "capa_meta", parent=base["Normal"], fontSize=9.5, leading=15,
        textColor=TINTA_TENUE, alignment=TA_CENTER,
    ),
    "h1": ParagraphStyle(
        "h1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=17,
        leading=22, textColor=TINTA, spaceBefore=2, spaceAfter=9,
    ),
    "h2": ParagraphStyle(
        "h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=12,
        leading=16, textColor=TINTA, spaceBefore=13, spaceAfter=5,
    ),
    "h3": ParagraphStyle(
        "h3", parent=base["Heading3"], fontName="Helvetica-Bold", fontSize=10,
        leading=14, textColor=ACENTO, spaceBefore=8, spaceAfter=3,
    ),
    "corpo": ParagraphStyle(
        "corpo", parent=base["Normal"], fontSize=9.3, leading=14.2,
        textColor=TINTA_SUAVE, alignment=TA_JUSTIFY, spaceAfter=6,
    ),
    # Alinhado à esquerda, não justificado: estes blocos carregam identificadores
    # longos e sem hífen (hasOnly([...]), resolveTrustedIdentity()) que o
    # justificado transforma em rios de espaço branco.
    "corpo_compacto": ParagraphStyle(
        "corpo_compacto", parent=base["Normal"], fontSize=8.8, leading=13,
        textColor=TINTA_SUAVE, spaceAfter=3,
    ),
    "celula": ParagraphStyle(
        "celula", parent=base["Normal"], fontSize=8.2, leading=11.6, textColor=TINTA_SUAVE,
    ),
    "celula_mono": ParagraphStyle(
        "celula_mono", parent=base["Normal"], fontName="Courier-Bold", fontSize=7.3,
        leading=10.5, textColor=TINTA,
    ),
    "chip": ParagraphStyle(
        "chip", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=7.2,
        leading=9.5, textColor=colors.white, alignment=TA_CENTER,
    ),
    "codigo": ParagraphStyle(
        "codigo", parent=base["Code"], fontName="Courier", fontSize=7.0, leading=9.6,
        textColor=TINTA, leftIndent=7, rightIndent=5, spaceBefore=3, spaceAfter=3,
    ),
    # backColor/border no próprio estilo, em vez de embrulhar numa Table: uma
    # tabela de célula única não quebra entre páginas, e as issues são longas.
    "issue": ParagraphStyle(
        "issue", parent=base["Code"], fontName="Courier", fontSize=6.9, leading=9.5,
        textColor=TINTA, leftIndent=8, rightIndent=6, spaceBefore=2, spaceAfter=2,
        backColor=FUNDO_CODIGO, borderColor=LINHA, borderWidth=0.5, borderPadding=7,
    ),
    "legenda": ParagraphStyle(
        "legenda", parent=base["Normal"], fontSize=7.8, leading=11,
        textColor=TINTA_TENUE, alignment=TA_CENTER, spaceBefore=3,
    ),
    "ficha_titulo": ParagraphStyle(
        "ficha_titulo", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=11,
        leading=15, textColor=TINTA, spaceAfter=2,
    ),
    "ficha_local": ParagraphStyle(
        "ficha_local", parent=base["Normal"], fontName="Courier-Bold", fontSize=8,
        leading=11.5, textColor=ACENTO, spaceAfter=5,
    ),
}


def rotulo_valor(rotulo, valor):
    """Parágrafo no formato `RÓTULO — texto`, usado dentro das fichas."""
    return Paragraph(
        f'<font name="Helvetica-Bold" color="#0F172A">{rotulo}</font>  {valor}',
        S["corpo_compacto"],
    )


def bloco_codigo(codigo, largura):
    """Bloco de código com fundo, borda e filete colorido à esquerda."""
    interno = XPreformatted(esc(codigo.rstrip()), S["codigo"])
    t = Table([[interno]], colWidths=[largura])
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), FUNDO_CODIGO),
            ("BOX", (0, 0), (-1, -1), 0.5, LINHA),
            ("LINEBEFORE", (0, 0), (0, -1), 2.2, colors.HexColor("#CBD5E1")),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    return t


def chip(severidade):
    """Etiqueta colorida de severidade, dimensionada para caber na coluna."""
    t = Table(
        [[Paragraph(ROTULO_SEVERIDADE[severidade], S["chip"])]],
        colWidths=[1.75 * cm], rowHeights=[0.52 * cm],
    )
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(CORES[severidade])),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 1),
            ("RIGHTPADDING", (0, 0), (-1, -1), 1),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ("ROUNDEDCORNERS", [3, 3, 3, 3]),
        ])
    )
    return t


# ─────────────────────────────────────────────────────────────────────────────
# Gráficos
# ─────────────────────────────────────────────────────────────────────────────

ORDEM_SEV = ["critica", "alta", "media", "baixa", "informativa"]


def contagem_severidade():
    return {s: sum(1 for a in ACHADOS if a["severidade"] == s) for s in ORDEM_SEV}


def grafico_rosca(caminho):
    cont = contagem_severidade()
    presentes = [(s, n) for s, n in cont.items() if n > 0]
    valores = [n for _, n in presentes]
    cores = [CORES[s] for s, _ in presentes]
    rotulos = [f"{ROTULO_SEVERIDADE[s].title()}  ({n})" for s, n in presentes]

    fig, ax = plt.subplots(figsize=(4.05, 3.05), dpi=260)
    wedges, _ = ax.pie(
        valores, colors=cores, startangle=90, counterclock=False,
        wedgeprops={"width": 0.42, "edgecolor": "white", "linewidth": 2.2},
    )
    total = sum(valores)
    ax.text(0, 0.12, str(total), ha="center", va="center",
            fontsize=26, fontweight="bold", color="#0F172A")
    ax.text(0, -0.22, "achados", ha="center", va="center", fontsize=8.5, color="#94A3B8")
    ax.legend(
        wedges, rotulos, loc="center left", bbox_to_anchor=(1.0, 0.5),
        frameon=False, fontsize=8.2, labelcolor="#475569", handlelength=0.9,
        handleheight=0.9, borderpad=0, labelspacing=0.62,
    )
    ax.set(aspect="equal")
    fig.subplots_adjust(left=0.0, right=0.62, top=0.98, bottom=0.02)
    fig.savefig(caminho, transparent=True)
    plt.close(fig)


# Rótulos curtos para o eixo do gráfico de barras.
ROTULO_CATEGORIA = {
    "1. Banco sem tranca (isolamento de dono)": "Isolamento\nde dono",
    "1. Banco sem tranca (integridade de identidade)": "Integridade\nde identidade",
    "3. Confiança em entrada externa (SSRF)": "SSRF",
    "3. Verificação de posse / integridade de pagamento": "Integridade\nde pagamento",
    "4. Superfície de abuso / configuração de deploy": "Abuso /\nrate limit",
    "4. Configuração de CI/CD": "CI/CD",
    "5. Inputs sem tratamento (XSS)": "XSS /\ndefesa CSP",
}


def grafico_barras(caminho):
    agrupado = {}
    for a in ACHADOS:
        rot = ROTULO_CATEGORIA.get(a["categoria"], a["categoria"])
        agrupado.setdefault(rot, []).append(a["severidade"])

    itens = sorted(agrupado.items(), key=lambda kv: -len(kv[1]))
    rotulos = [k for k, _ in itens]
    valores = [len(v) for _, v in itens]
    # Cada barra recebe a cor da severidade mais alta daquela categoria.
    cores = [CORES[min(v, key=ORDEM_SEV.index)] for _, v in itens]

    fig, ax = plt.subplots(figsize=(4.35, 3.05), dpi=260)
    y = range(len(rotulos))
    ax.barh(list(y), valores, color=cores, height=0.6, zorder=3)
    ax.set_yticks(list(y))
    ax.set_yticklabels(rotulos, fontsize=7.6, color="#475569")
    ax.invert_yaxis()
    ax.set_xlim(0, max(valores) + 0.75)
    ax.set_xticks(range(0, max(valores) + 1))
    ax.tick_params(axis="x", labelsize=7.6, colors="#94A3B8", length=0)
    ax.tick_params(axis="y", length=0)
    for sp in ("top", "right", "left", "bottom"):
        ax.spines[sp].set_visible(False)
    ax.xaxis.grid(True, color="#E2E8F0", linewidth=0.7, zorder=0)
    for i, v in zip(y, valores):
        ax.text(v + 0.13, i, str(v), va="center", fontsize=8.2,
                fontweight="bold", color="#0F172A")
    fig.tight_layout(pad=0.35)
    fig.savefig(caminho, transparent=True)
    plt.close(fig)


# ─────────────────────────────────────────────────────────────────────────────
# Cabeçalho e rodapé
# ─────────────────────────────────────────────────────────────────────────────


def decorar(canvas, doc):
    canvas.saveState()
    largura, altura = A4

    canvas.setFont("Helvetica", 7.4)
    canvas.setFillColor(TINTA_TENUE)
    canvas.drawString(2 * cm, altura - 1.28 * cm, TITULO)
    canvas.setStrokeColor(LINHA)
    canvas.setLineWidth(0.5)
    canvas.line(2 * cm, altura - 1.45 * cm, largura - 2 * cm, altura - 1.45 * cm)

    canvas.line(2 * cm, 1.5 * cm, largura - 2 * cm, 1.5 * cm)
    canvas.setFont("Helvetica", 7.4)
    canvas.drawString(2 * cm, 1.15 * cm, f"{PROJETO} · auditoria interna · {DATA_AUDITORIA}")
    canvas.drawRightString(largura - 2 * cm, 1.15 * cm, f"Página {doc.page - 1}")
    canvas.restoreState()


def decorar_capa(canvas, doc):
    canvas.saveState()
    largura, altura = A4
    canvas.setFillColor(colors.HexColor("#0B0C15"))
    canvas.rect(0, altura - 4.6 * cm, largura, 4.6 * cm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 21)
    canvas.drawCentredString(largura / 2, altura - 2.62 * cm, "INOVAPRO3D")
    canvas.setFillColor(colors.HexColor("#3B82F6"))
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawCentredString(largura / 2, altura - 3.35 * cm, "SEGURANÇA DA APLICAÇÃO")

    canvas.setFillColor(colors.HexColor("#3B82F6"))
    canvas.rect(0, 0, largura, 0.42 * cm, fill=1, stroke=0)
    canvas.restoreState()


# ─────────────────────────────────────────────────────────────────────────────
# Seções
# ─────────────────────────────────────────────────────────────────────────────


def secao_capa(L):
    e = []
    e.append(Spacer(1, 3.4 * cm))
    e.append(Paragraph("Relatório de Auditoria<br/>de Segurança", S["capa_titulo"]))
    e.append(Spacer(1, 0.45 * cm))
    e.append(Paragraph(
        f'<font color="#2563EB"><b>{PROJETO}</b></font> · loja e calculadora de impressão 3D',
        S["capa_sub"]))
    e.append(Spacer(1, 0.2 * cm))
    e.append(Paragraph(
        f"{DATA_AUDITORIA} &nbsp;·&nbsp; branch <b>main</b> &nbsp;·&nbsp; commit <b>{COMMIT}</b>",
        S["capa_meta"]))

    e.append(Spacer(1, 1.0 * cm))
    cont = contagem_severidade()
    linha = [[chip(s), Paragraph(f"<b>{cont[s]}</b>", ParagraphStyle(
        "n", parent=S["corpo"], fontSize=15, textColor=TINTA, alignment=TA_CENTER))]
        for s in ORDEM_SEV if cont[s] > 0]
    plana = [c for par in linha for c in par]
    t = Table([plana], colWidths=[2.05 * cm] * len(plana))
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    e.append(t)

    e.append(Spacer(1, 0.9 * cm))
    e.append(Paragraph("Escopo auditado", S["h2"]))
    e.append(Paragraph(
        "Auditoria de caixa-branca do repositório completo: <b>frontend</b> (216 arquivos "
        "TypeScript/TSX em <b>src/</b>), <b>backend</b> (11 funções serverless em <b>api/</b>, 12 rotas "
        "Express em <b>server.ts</b>, 20 módulos em <b>server/</b>), <b>regras de autorização</b> "
        "(<b>firestore.rules</b>, <b>storage.rules</b>), <b>configuração de deploy</b> (<b>vercel.json</b>, "
        "<b>firebase.json</b>, GitHub Actions), <b>scripts de build</b> e <b>todo o histórico do git</b>. "
        "Não houve teste dinâmico contra ambiente em execução: as conclusões vêm da leitura do "
        "código no commit indicado.", S["corpo"]))

    e.append(Paragraph("Stack detectada", S["h2"]))
    dados = [[Paragraph(f"<b>{k}</b>", S["celula"]), Paragraph(v, S["celula"])] for k, v in STACK]
    t = Table(dados, colWidths=[3.3 * cm, L - 3.3 * cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINHA),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (0, -1), 0),
    ]))
    e.append(t)
    return e


def secao_metodologia(L):
    e = [Paragraph("Nota metodológica", S["h1"])]
    e.append(Paragraph(
        "As cinco categorias do roteiro foram traduzidas para os equivalentes desta stack antes "
        "da busca. Como o projeto <b>não usa ORM nem camada de query no servidor</b> — o navegador "
        "conversa direto com o Firestore —, o mecanismo de isolamento de dados é o arquivo de "
        "regras, e não um filtro <b>WHERE</b> em código. Isso muda onde cada categoria é procurada:",
        S["corpo"]))
    for titulo, texto in METODOLOGIA:
        e.append(Paragraph(titulo, S["h3"]))
        e.append(Paragraph(texto, S["corpo"]))

    e.append(Paragraph("Categorias sem aplicação nesta stack", S["h2"]))
    e.append(Paragraph(
        "<b>Injeção de SQL e isolamento multi-tenant por organização</b> não se aplicam: não há "
        "banco relacional nem <i>query builder</i>, e o modelo de dados é de dono individual "
        "(<b>userId</b>), sem conceito de organização, workspace ou tenant. <b>Segredos em Docker, "
        "Helm ou Terraform</b> não se aplicam: o deploy é serverless na Vercel e não há nenhum "
        "desses arquivos no repositório. <b>Sanitização de HTML no frontend</b> foi verificada e "
        "não se aplica na prática — não existe ponto de renderização de HTML bruto onde uma "
        "biblioteca de sanitização seria instalada (detalhado nos Pontos Fortes).", S["corpo"]))
    return e


def secao_resumo(L, img_rosca, img_barras):
    e = [Paragraph("Resumo executivo", S["h1"])]
    cont = contagem_severidade()
    e.append(Paragraph(
        f"Foram identificados <b>{len(ACHADOS)} achados</b>: "
        f"<b>nenhum crítico</b>, <b>{cont['alta']} de severidade alta</b>, "
        f"<b>{cont['media']} médios</b>, <b>{cont['baixa']} baixos</b> e "
        f"<b>{cont['informativa']} informativo</b>. O projeto chega a esta auditoria com um "
        "trabalho de endurecimento já feito e visível: as regras do Firestore fecham por padrão e "
        "são testadas automaticamente, o preço do pedido é recalculado no servidor, todo handler "
        "que recebe um ID de pedido confere a posse, e não há um único ponto de injeção de HTML "
        "no frontend. Os achados restantes concentram-se em três frentes: um anexo que não herdou "
        "a proteção do seu documento, defesas presentes no runtime Express que não foram portadas "
        "para o runtime serverless de produção, e camadas de contenção construídas mas ainda não "
        "acionadas.", S["corpo"]))

    e.append(Spacer(1, 0.25 * cm))
    tg = Table(
        [[Image(img_rosca, width=8.05 * cm, height=6.06 * cm),
          Image(img_barras, width=8.05 * cm, height=5.64 * cm)],
         [Paragraph("Distribuição por severidade", S["legenda"]),
          Paragraph("Achados por categoria (cor = maior severidade da categoria)", S["legenda"])]],
        colWidths=[L / 2, L / 2],
    )
    tg.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
    ]))
    e.append(tg)

    e.append(Spacer(1, 0.35 * cm))
    e.append(Paragraph("Achados em uma tabela", S["h2"]))
    linhas = [[
        Paragraph('<font color="white"><b>SEV.</b></font>', S["celula"]),
        Paragraph('<font color="white"><b>ID</b></font>', S["celula"]),
        Paragraph('<font color="white"><b>ARQUIVO : LINHA</b></font>', S["celula"]),
        Paragraph('<font color="white"><b>DESCRIÇÃO</b></font>', S["celula"]),
    ]]
    for a in ACHADOS:
        linhas.append([
            chip(a["severidade"]),
            Paragraph(f'<b>{a["id"]}</b>', S["celula"]),
            Paragraph(caminho_tabela(a), S["celula_mono"]),
            Paragraph(a["titulo"], S["celula"]),
        ])
    larguras = [2.0 * cm, 0.95 * cm, 4.75 * cm, L - 7.7 * cm]
    t = Table(linhas, colWidths=larguras, repeatRows=1)
    estilo = [
        ("BACKGROUND", (0, 0), (-1, 0), TINTA),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINHA),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 1), (-1, -1), 5),
    ]
    for i in range(1, len(linhas)):
        if i % 2 == 0:
            estilo.append(("BACKGROUND", (1, i), (-1, i), colors.HexColor("#F8FAFC")))
    t.setStyle(TableStyle(estilo))
    e.append(t)
    return e


def secao_fortes_fracos(L):
    e = [Paragraph("Pontos fortes", S["h1"])]
    e.append(Paragraph(
        "Esta seção existe para provar a cobertura da auditoria: registra o que foi efetivamente "
        "verificado e está correto, com a evidência no código. Um achado ausente aqui é um lugar "
        "onde não se olhou; tudo abaixo foi olhado.", S["corpo"]))

    for p in PONTOS_FORTES:
        cabecalho = Paragraph(
            f'<font color="#059669"><b>&#10003;</b></font>&nbsp;&nbsp;<b>{p["titulo"]}</b>',
            ParagraphStyle("pf", parent=S["corpo"], fontSize=9.6, textColor=TINTA,
                           spaceAfter=1, alignment=0))
        ev = Paragraph(
            f'<font name="Courier" size="7.2" color="#059669">{esc(p["evidencia"])}</font>',
            ParagraphStyle("ev", parent=S["corpo_compacto"], spaceAfter=3, alignment=0))
        corpo = Paragraph(p["texto"], S["corpo_compacto"])
        bloco = Table([[cabecalho], [ev], [corpo]], colWidths=[L])
        bloco.setStyle(TableStyle([
            ("LINEBEFORE", (0, 0), (0, -1), 2.0, colors.HexColor("#059669")),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        e.append(KeepTogether([bloco, Spacer(1, 0.32 * cm)]))

    e.append(PageBreak())
    e.append(Paragraph("Pontos fracos", S["h1"]))
    e.append(Paragraph(
        "Os riscos centrais, na ordem em que importam. Cada um está detalhado adiante com "
        "arquivo, linha e trecho de código.", S["corpo"]))
    for i, (titulo, texto) in enumerate(PONTOS_FRACOS, 1):
        cabecalho = Paragraph(
            f'<font color="#B91C1C"><b>{i}.</b></font>&nbsp;&nbsp;<b>{titulo}</b>',
            ParagraphStyle("pw", parent=S["corpo"], fontSize=9.6, textColor=TINTA,
                           spaceAfter=1, alignment=0))
        bloco = Table([[cabecalho], [Paragraph(texto, S["corpo_compacto"])]], colWidths=[L])
        bloco.setStyle(TableStyle([
            ("LINEBEFORE", (0, 0), (0, -1), 2.0, colors.HexColor("#EA580C")),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        e.append(KeepTogether([bloco, Spacer(1, 0.32 * cm)]))
    return e


def secao_achados(L):
    e = [Paragraph("Achados detalhados", S["h1"])]
    e.append(Paragraph(
        "Cada ficha traz a categoria, a localização exata, o trecho de código, por que é "
        "explorável, o impacto e a correção sugerida. Nenhum achado abaixo é especulativo: todos "
        "foram lidos no código no commit auditado.", S["corpo"]))

    categoria_atual = None
    for a in ACHADOS:
        if a["categoria"] != categoria_atual:
            categoria_atual = a["categoria"]
            e.append(Paragraph(categoria_atual, S["h2"]))

        cab = Table(
            [[chip(a["severidade"]),
              Paragraph(f'<b>{a["id"]}</b> · {a["titulo"]}', S["ficha_titulo"])]],
            colWidths=[2.0 * cm, L - 2.0 * cm],
        )
        cab.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (0, -1), 0),
            ("LEFTPADDING", (1, 0), (1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))

        partes = [
            cab,
            Paragraph(esc(a["arquivo"]), S["ficha_local"]),
            bloco_codigo(a["codigo"], L),
            Spacer(1, 0.14 * cm),
            rotulo_valor("O que é.", a["descricao"]),
            rotulo_valor("Por que é explorável.", a["explorabilidade"]),
            rotulo_valor("Impacto.", a["impacto"]),
            rotulo_valor("Correção.", a["correcao"]),
        ]
        # O cabeçalho não pode ficar órfão no fim da página; o resto pode fluir.
        e.append(KeepTogether(partes[:3]))
        e.extend(partes[3:])
        e.append(Spacer(1, 0.16 * cm))
        sep = Table([[""]], colWidths=[L], rowHeights=[1])
        sep.setStyle(TableStyle([("LINEABOVE", (0, 0), (-1, 0), 0.5, LINHA)]))
        e.append(sep)
        e.append(Spacer(1, 0.3 * cm))
    return e


def secao_recomendacoes(L):
    e = [Paragraph("Recomendações priorizadas", S["h1"])]
    e.append(Paragraph(
        "<b>P1</b> — interrompe exposição ativa de dado ou abuso trivial; fazer primeiro. "
        "<b>P2</b> — fecha uma superfície explorável sob condição; fazer na sequência. "
        "<b>P3</b> — endurecimento e defesa em profundidade; planejar.", S["corpo"]))

    cor_p = {"P1": "#B91C1C", "P2": "#D97706", "P3": "#2563EB"}
    linhas = [[
        Paragraph('<font color="white"><b>PRIO.</b></font>', S["celula"]),
        Paragraph('<font color="white"><b>AÇÃO</b></font>', S["celula"]),
        Paragraph('<font color="white"><b>COMO</b></font>', S["celula"]),
        Paragraph('<font color="white"><b>REF.</b></font>', S["celula"]),
    ]]
    for prio, acao, como, ref in RECOMENDACOES:
        linhas.append([
            Paragraph(
                f'<font color="{cor_p[prio]}"><b>{prio}</b></font>',
                ParagraphStyle("p", parent=S["celula"], fontSize=9.5, alignment=TA_CENTER)),
            Paragraph(f"<b>{acao}</b>", S["celula"]),
            Paragraph(como, S["celula"]),
            Paragraph(f'<font color="#94A3B8">{ref}</font>', S["celula"]),
        ])
    t = Table(linhas, colWidths=[1.3 * cm, 4.4 * cm, L - 7.0 * cm, 1.3 * cm], repeatRows=1)
    estilo = [
        ("BACKGROUND", (0, 0), (-1, 0), TINTA),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINHA),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(linhas)):
        if i % 2 == 0:
            estilo.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F8FAFC")))
    t.setStyle(TableStyle(estilo))
    e.append(t)
    return e


def texto_issue(numero, issue):
    """Monta o Markdown completo e copiável de uma issue do GitHub."""
    achados = [a for a in ACHADOS if a["id"] in issue["achados"]]
    sev = min((a["severidade"] for a in achados), key=ORDEM_SEV.index)

    linhas = [
        f'## [Segurança] {issue["titulo"]}',
        "",
        f'**Labels:** `{issue["labels"]}`',
        f'**Severidade:** {ROTULO_SEVERIDADE[sev].title()}'
        f'{"  ·  **Achados:** " + ", ".join(a["id"] for a in achados) if len(achados) > 1 else ""}',
        "",
        "### Problema",
        "",
    ]
    for a in achados:
        if len(achados) > 1:
            linhas += [f'#### {a["id"]} — {a["titulo"]}', ""]
        linhas += [to_md(a["descricao"]), ""]
        linhas += ["**Por que é explorável**", "", to_md(a["explorabilidade"]), ""]

    linhas += ["### Evidência", ""]
    for a in achados:
        linhas += [f'`{a["arquivo"]}`', "", "```ts"]
        linhas += a["codigo"].rstrip().split("\n")
        linhas += ["```", ""]

    linhas += ["### Impacto", ""]
    for a in achados:
        prefixo = f'{a["id"]}: ' if len(achados) > 1 else ""
        linhas += [f'{prefixo}{to_md(a["impacto"])}', ""]

    linhas += ["### Sugestão de correção", ""]
    for a in achados:
        prefixo = f'{a["id"]}: ' if len(achados) > 1 else ""
        linhas += [f'{prefixo}{to_md(a["correcao"])}', ""]

    linhas += ["### Critérios de aceite", ""]
    for a in achados:
        for c in a["aceite"]:
            linhas.append(f"- [ ] {to_md(c)}")
    linhas += ["- [ ] Correção coberta por teste automatizado que falha sem o patch",
               "", f"_Origem: auditoria de segurança de {DATA_AUDITORIA} · commit {COMMIT}._"]
    return "\n".join(linhas)


def quebrar_linhas(texto, largura=96):
    """Quebra linhas longas para o Markdown caber na largura do PDF."""
    saida = []
    for linha in texto.split("\n"):
        if len(linha) <= largura:
            saida.append(linha)
            continue
        if linha.startswith("    ") or linha.lstrip().startswith(("//", "match", "allow")):
            saida.append(linha[:largura])
            resto = linha[largura:]
            while resto:
                saida.append("  " + resto[: largura - 2])
                resto = resto[largura - 2:]
            continue
        atual = ""
        for palavra in linha.split(" "):
            if len(atual) + len(palavra) + 1 > largura:
                saida.append(atual)
                atual = palavra
            else:
                atual = f"{atual} {palavra}".strip()
        saida.append(atual)
    return "\n".join(saida)


def secao_issues(L):
    e = [Paragraph("Issues para o GitHub", S["h1"])]
    e.append(Paragraph(
        f"Texto pronto para copiar e colar. São <b>{len(ISSUES)} issues</b> para "
        f"<b>{len(ACHADOS)} achados</b> — os itens de endurecimento relacionados foram agrupados "
        "para não inflar o board. Cada bloco começa em <b>--- ISSUE n ---</b> e termina em "
        "<b>--- FIM ISSUE n ---</b>; copie tudo entre os dois delimitadores.", S["corpo"]))

    for n, issue in enumerate(ISSUES, 1):
        abre = Paragraph(
            f'<font name="Courier-Bold" size="8" color="#2563EB">--- ISSUE {n} ---</font>',
            ParagraphStyle("d", parent=S["corpo"], spaceAfter=2, spaceBefore=4, alignment=0))
        md = quebrar_linhas(texto_issue(n, issue))
        corpo = XPreformatted(esc(md), S["issue"])
        fecha = Paragraph(
            f'<font name="Courier-Bold" size="8" color="#2563EB">--- FIM ISSUE {n} ---</font>',
            ParagraphStyle("d2", parent=S["corpo"], spaceBefore=6, spaceAfter=12, alignment=0))
        # Sem KeepTogether: uma issue pode ser mais alta que a página e precisa
        # fluir entre elas. O XPreformatted quebra sozinho, preservando o fundo.
        e.extend([abre, corpo, fecha])
    return e


# ─────────────────────────────────────────────────────────────────────────────
# Montagem
# ─────────────────────────────────────────────────────────────────────────────


def main():
    img_rosca = os.path.join(AQUI, "_grafico-severidade.png")
    img_barras = os.path.join(AQUI, "_grafico-categorias.png")
    grafico_rosca(img_rosca)
    grafico_barras(img_barras)

    doc = BaseDocTemplate(
        SAIDA, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
        title=TITULO, author="Auditoria interna", subject="Segurança da aplicação",
    )
    L = doc.width

    frame_capa = Frame(2 * cm, 2 * cm, doc.width, A4[1] - 4 * cm, id="capa")
    frame_corpo = Frame(2 * cm, 2 * cm, doc.width, A4[1] - 4.15 * cm, id="corpo")
    doc.addPageTemplates([
        PageTemplate(id="Capa", frames=[frame_capa], onPage=decorar_capa),
        PageTemplate(id="Corpo", frames=[frame_corpo], onPage=decorar),
    ])

    e = []
    e += secao_capa(L)
    e.append(NextPageTemplate("Corpo"))
    e.append(PageBreak())
    e += secao_metodologia(L)
    e.append(PageBreak())
    e += secao_resumo(L, img_rosca, img_barras)
    e.append(PageBreak())
    e += secao_fortes_fracos(L)
    e.append(PageBreak())
    e += secao_achados(L)
    e.append(PageBreak())
    e += secao_recomendacoes(L)
    e.append(PageBreak())
    e += secao_issues(L)

    doc.build(e)
    print(f"PDF gerado: {SAIDA}")

    for f in (img_rosca, img_barras):
        if os.path.exists(f):
            os.remove(f)


if __name__ == "__main__":
    main()
