# 05 — Segurança: O que está protegido e o que precisa de atenção

## O panorama geral

| Área | Situação |
|---|---|
| Segredos no código | ✅ Nenhuma chave secreta vazada no código |
| Separação frontend/backend | ✅ Chaves secretas só no servidor |
| Regras do Storage (imagens) | ✅ Boas: só admin envia, só imagens, máx 10 MB |
| Regras do Firestore | ⚠️ Boas no geral, com 2 pontos a corrigir |
| Endpoints do servidor | ❌ 2 problemas importantes a corrigir |

## 🔴 Problemas IMPORTANTES (corrigir em breve)

### 1. Qualquer pessoa pode te mandar notificações falsas no Telegram

**Onde:** `server.ts` — endpoint `POST /api/notify/new-order`

**O problema:** esse endpoint não pede nenhuma comprovação de identidade.
Qualquer pessoa na internet que descubra o endereço pode disparar mensagens
de "pedido novo" falsas no seu Telegram, te enchendo de spam.

**A correção:** exigir que a requisição venha com o token de login do Firebase
e validar no servidor, ou pelo menos uma chave secreta compartilhada.

### 2. O proxy de imagens aceita qualquer endereço (risco SSRF)

**Onde:** `server.ts` — endpoint `GET /api/proxy-image?url=...`

**O problema:** criamos esse endpoint para a conversão de imagens em WebP
funcionar (os sites externos bloqueavam o navegador). Mas ele aceita
**qualquer URL**. Um atacante poderia usar o seu servidor para acessar
endereços internos da infraestrutura (ataque chamado SSRF).

**A correção:** permitir apenas os mesmos sites da importação de modelos
(makerworld.com, bambulab.com etc. — a lista já existe em
`MODEL_IMPORT_ALLOWED_HOSTS`).

### 3. Os cupons de desconto são públicos

**Onde:** `firestore.rules` — coleção `coupons`

**O problema:** hoje qualquer visitante consegue listar **todos os cupons
com seus percentuais de desconto** direto do banco. Alguém pode descobrir
cupons que você nem divulgou.

**A correção:** restringir a leitura a admin e validar o cupom no servidor
durante o checkout (o cliente digita o código, o servidor responde só
"válido/inválido").

### 4. GEMINI_API_KEY exposta no site (se preenchida)

**Onde:** `vite.config.ts`

**O problema:** o arquivo de configuração injeta a `GEMINI_API_KEY` no código
do site. Hoje ela não é usada em lugar nenhum, mas se um dia você colocar uma
chave real ali, **qualquer visitante poderá vê-la** e usar sua cota do Google.

**A correção:** remover essa linha do `vite.config.ts`. Se um dia usar Gemini,
chamar somente pelo servidor.

## 🟡 Pontos de atenção (menores)

| O quê | Onde | Risco |
|---|---|---|
| Endpoint de debug público | `GET /api/debug/markers` | Expõe versão e integrações. Remover ou proteger |
| Coleção `settings` pública | `firestore.rules` | OK se só tiver frete/banner; nunca guardar nada sensível ali |
| Sem cabeçalhos de segurança (CSP, HSTS) | `server.ts` / `vercel.json` | Proteção extra contra ataques de injeção; adicionar depois |
| Sem limite de requisições (rate limiting) | Todos os endpoints | Alguém pode martelar os endpoints; mitigar com Vercel/Cloudflare |

## ✅ O que JÁ está bem feito

1. **`.env` fora do GitHub** — segredos não vazam pelo repositório
2. **Webhook do Stripe valida assinatura** — ninguém consegue forjar "pagamento confirmado"
3. **Papéis de usuário no banco** — virar admin exige mudança manual no Firestore; o site sozinho não permite
4. **Regras de pedidos/orçamentos** — cliente só vê o que é dele
5. **Storage restrito** — só admin envia arquivos, só imagens, até 10 MB
6. **Importação de modelos com lista de sites permitidos** — não busca de qualquer lugar
7. **Falha silenciosa do Telegram** — se o Telegram cair, a venda NÃO falha junto

## Ordem sugerida de correção

1. Restringir o `proxy-image` à lista de hosts permitidos (rápido, ~10 linhas)
2. Remover `GEMINI_API_KEY` do `vite.config.ts` (1 linha)
3. Tornar `coupons` admin-only nas regras (3 linhas) — quando for usar cupons de verdade
4. Proteger `/api/notify/new-order` com verificação de token
5. Remover/proteger `/api/debug/markers`
