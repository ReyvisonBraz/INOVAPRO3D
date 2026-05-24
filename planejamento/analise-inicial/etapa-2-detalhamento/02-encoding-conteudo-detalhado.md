# 02 - Encoding e Conteudo - Subplano Detalhado

## Escopo

Separar problemas reais de encoding dos problemas de exibicao do terminal, e revisar textos que impactam confianca, clareza e conversao.

## Evidencias no Codigo

- `rg` encontrou textos UTF-8 corretos em varios arquivos, por exemplo `README.md` e paginas publicas.
- `Get-Content` exibiu mojibake em alguns outputs do PowerShell, o que pode ser apenas renderizacao do terminal.
- `vite.config.ts` contem comentario com trecho quebrado: `Do not modifyÃ¢Â€Â”file`.
- Alguns logs com emojis em `server.ts` e `firebase.ts` podem quebrar dependendo do encoding do console.

## Risco Real

Corrigir encoding sem validar bytes reais pode quebrar textos que ja estao corretos. Esta frente precisa de verificacao visual e tecnica antes de alteracao em massa.

## Frentes de Conteudo

### Textos de confianca

Precisam estar claros e sem tom excessivamente ficticio:

- checkout;
- pagamento Pix;
- meus pedidos;
- orcamento;
- area administrativa.

### Textos comerciais

Devem evitar promessas nao validadas:

- "48h";
- "500+ clientes";
- "PCI-DSS";
- "cashback";
- "alta definicao";
- "Q3 2024".

### Textos tecnicos

Precisam ser consistentes:

- pedido;
- ordem;
- projeto;
- quote/orcamento;
- producao;
- impressao;
- fila.

## Plano de Investigacao

- [ ] Abrir os arquivos no editor e confirmar encoding UTF-8.
- [ ] Rodar busca por padroes reais de mojibake.
- [ ] Validar a tela no navegador depois que o dev server subir.
- [ ] Separar lista de ocorrencias reais e falsos positivos de terminal.
- [ ] Definir nome oficial da marca.
- [ ] Definir tom de voz: tecnico, industrial, simples, premium ou hibrido.

## Plano de Correcao

- [ ] Corrigir apenas ocorrencias confirmadas no arquivo.
- [ ] Remover emojis de logs de servidor se eles atrapalharem console Windows.
- [ ] Corrigir comentario quebrado em `vite.config.ts`.
- [ ] Substituir datas antigas como `Q3 2024`.
- [ ] Revisar textos sensiveis de pagamento e seguranca.
- [ ] Padronizar status e labels com a tipagem de dominio.

## Criterios de Aceite

- Browser mostra acentos corretamente.
- Terminal nao exibe logs essenciais ilegíveis.
- Textos de pagamento nao prometem integracao inexistente.
- README e documentacao continuam legiveis.
- Nenhuma substituicao em massa introduz regressao.

## Checklist Visual

- [ ] Home.
- [ ] Catalogo.
- [ ] Produto.
- [ ] Orcamento customizado.
- [ ] Checkout.
- [ ] Meus pedidos.
- [ ] Admin.
- [ ] Mobile menu.

## Execucao Parcial - 2026-05-24

### Alteracoes Aplicadas

- Comentario com mojibake em `vite.config.ts` foi corrigido.
- Logs e comentarios com caracteres quebrados em `server.ts` foram trocados por texto ASCII.
- Endpoint `/api/debug/markers` deixou de listar `Mercado Pago (Sandbox)` como integracao ativa e passou a marcar `Mercado Pago Pix/Webhook` como pendente.
- Texto antigo `Expansao em Q3 2024` no checkout foi trocado por `Em planejamento`.
- Texto de confianca sobre PCI-DSS no checkout foi substituido por uma frase alinhada ao estado real: pagamento ainda depende de confirmacao operacional.
- Titulo HTML padrao `My Google AI Studio App` foi trocado por `INOVAPRO3D`.

### Validacao

- Busca por `Q3 2024`, `Mercado Pago (Sandbox)`, `My Google AI Studio App`, `Do not modify`, `AI Studio automatically`, `Next.js 14`, `Supabase`, `Prisma` e `NextAuth` nao retornou ocorrencias em `README.md`, `.env.example`, `index.html`, `vite.config.ts`, `server.ts` e `src`.
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.

### Pendencias

- Rodar validacao visual no navegador.
- Definir nome final da marca entre Inovalt3D/Inovapro3D/INOVAPRO3D.
- Revisar promessas comerciais restantes como cashback, prazos e numeros de prova social.
