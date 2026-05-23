# 02 - Encoding, Textos e Conteudo da Interface

## Prioridade

Prioridade 1. Afeta percepcao de qualidade imediatamente.

## Arquivos Envolvidos

- `README.md`
- `server.ts`
- `src/services/firebase.ts`
- `src/services/seed.ts`
- `src/pages/public/Home.tsx`
- `src/pages/public/Checkout.tsx`
- `src/pages/admin/AdminDashboard.tsx`
- Demais paginas com textos em portugues

## Diagnostico Inicial

Ha varios textos com encoding quebrado, exemplos:

- `OrÃ§amento`
- `ImpressÃ£o`
- `ConfiguraÃ§Ãµes`
- `ðŸš€`

Isso indica que em algum momento textos UTF-8 foram lidos ou salvos como outro charset. O problema aparece em arquivos de UI, README e logs.

## Risco Principal

O usuario final ve textos quebrados, o que passa uma impressao de baixa confiabilidade. Em um ecommerce/orcamento, isso reduz conversao e aumenta desconfiana.

Tambem dificulta manutencao, busca textual e revisao de conteudo.

## Analise Necessaria

Verificar:

- Quantos arquivos possuem mojibake.
- Se o problema esta apenas no conteudo ou tambem em nomes de categorias gravados no Firestore.
- Se ha textos duplicados em seed e interface.
- Se os arquivos estao salvos em UTF-8.
- Se a IDE/ambiente esta regravando com encoding incorreto.

## Resultado Esperado

- Todos os textos em portugues aparecem corretamente.
- Emojis quebrados sao removidos ou corrigidos.
- README e documentacao ficam legiveis.
- Conteudo de seed fica coerente com a marca.
- O app nao mistura textos futuristas em excesso com termos reais de compra quando isso prejudicar clareza.

## Plano de Execucao

- [ ] Rodar busca por padroes comuns: `Ã`, `ðŸ`, `â€”`, `â€¢`, `Ã§`, `Ã£`.
- [ ] Corrigir textos por arquivo, com revisao visual depois.
- [ ] Preferir textos claros em pontos de conversao: checkout, pedido, orcamento.
- [ ] Padronizar nome da marca: Inovalt3D, Inovapro3D ou outro definitivo.
- [ ] Verificar se os dados seedados no Firestore precisam ser recriados.
- [ ] Rodar build/typecheck apos correcoes.

## Criterios de Aceite

- Nenhum texto visivel ao usuario aparece com caracteres quebrados.
- README principal abre legivel.
- Logs de console nao exibem caracteres corrompidos.
- Categorias e status principais ficam padronizados.

