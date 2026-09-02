# Auditoria de segurança — INOVAPRO3D

Relatório: [`relatorio-auditoria-seguranca.pdf`](relatorio-auditoria-seguranca.pdf) (19 páginas, pt-BR).

Auditoria de caixa-branca do repositório no commit `e099126` (branch `main`), cobrindo
isolamento de dados, autorização, IDOR, segredos e XSS. O PDF traz, ao final, o texto
completo de 7 issues do GitHub prontas para copiar e colar.

## Como regerar o relatório

Os achados ficam em `dados_auditoria.py`; `gerar_relatorio.py` cuida só do layout.
Depois de corrigir uma falha, edite o achado correspondente naquele arquivo e rode:

```bash
DOCS/security-audit/.venv/bin/python DOCS/security-audit/gerar_relatorio.py
```

## Se o ambiente não existir

O `.venv/` não é versionado. Para recriá-lo:

```bash
python3 -m venv DOCS/security-audit/.venv
DOCS/security-audit/.venv/bin/pip install reportlab matplotlib
```

Nada é instalado globalmente.

## Conferir o resultado

```bash
pdftoppm -png -r 92 DOCS/security-audit/relatorio-auditoria-seguranca.pdf /tmp/p
```

## Sobre o caminho

A auditoria foi pedida em `docs/security-audit/`. Como o repositório já tem `DOCS/`
em maiúsculas e o macOS usa filesystem case-insensitive, os arquivos ficaram em
`DOCS/security-audit/` — o mesmo diretório localmente, mas é esse o caminho que o git
registra e o que funciona em Linux (CI, deploy).
