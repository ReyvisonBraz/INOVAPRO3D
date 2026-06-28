# ⚙️ Configuração & Go-Live — INOVAPRO3D

Checklist do que precisa ser preenchido para o site funcionar 100% em produção.
As variáveis vão no painel da **Vercel** (Project → Settings → Environment Variables)
e, para rodar local, no arquivo **`.env`** na raiz.

> Regra geral: variável que começa com `VITE_` é lida pelo site (navegador).
> As demais são só do servidor (não aparecem no navegador).

---

## 1. 📱 Contato (✅ já configurado, confirmar na Vercel)

| Variável | Valor | Onde pega |
|---|---|---|
| `VITE_WHATSAPP_PHONE` | `5591980774776` | número da loja, formato `55` + DDD + número |
| `VITE_CONTACT_EMAIL` | `contato@inovapro3d.com.br` | e-mail oficial |

> ⚠️ Atualizar `VITE_WHATSAPP_PHONE` **na Vercel** — senão o site no ar usa o número antigo.

**Redes sociais** ficam em [`src/lib/config.ts`](src/lib/config.ts) (não são env):
- Instagram e Facebook ✅ já preenchidos.
- **TikTok / Kwai**: quando tiver, cole a URL em `SOCIAL.tiktok` / `SOCIAL.kwai` — o ícone aparece sozinho no rodapé e no botão flutuante.

---

## 2. 📊 Analytics & Pixels (opcional, mas recomendado)

Sem IDs, o site funciona normal — o rastreamento só fica dormindo. Carrega só após o cliente aceitar os cookies.

| Variável | Exemplo | Onde pega |
|---|---|---|
| `VITE_GA4_ID` | `G-XXXXXXXXXX` | analytics.google.com → Admin → Fluxos de dados → ID de métricas |
| `VITE_META_PIXEL_ID` | `123456789012345` | business.facebook.com → Gerenciador de Eventos → Pixel → ID |
| `VITE_TIKTOK_PIXEL_ID` | `CXXXXXXXXXXXXXXX` | ads.tiktok.com → Ferramentas → Eventos → Pixel da Web |

Eventos já enviados automaticamente: `page_view`, `add_to_cart`, `begin_checkout`, `purchase`.

---

## 3. 🌐 SEO

| Item | Status | Ação |
|---|---|---|
| `robots.txt` | ✅ pronto | nenhuma |
| `sitemap.xml` (com produtos) | ✅ pronto | precisa de `APP_URL` + Admin SDK (item 4) |
| Google Search Console | ⏳ pendente | após o deploy, cadastrar `https://www.inovapro3d.com.br/sitemap.xml` em search.google.com/search-console |

| Variável | Valor | Para quê |
|---|---|---|
| `APP_URL` | `https://www.inovapro3d.com.br` | gerar os links corretos no sitemap |

---

## 4. 🔥 Firebase (servidor / Admin SDK)

Necessário para: gravar relatos de erro, listar produtos no sitemap, validar pedidos no Stripe.

| Variável | Onde pega |
|---|---|
| `FIREBASE_CLIENT_EMAIL` | console Firebase → Configurações do projeto → Contas de serviço → Gerar nova chave privada (JSON) → campo `client_email` |
| `FIREBASE_PRIVATE_KEY` | mesmo JSON → campo `private_key` (cole inteiro, com as `\n`) |

**Regras do Firestore/Storage** — sempre que mudar `firestore.rules` ou `storage.rules`:
```bash
firebase deploy --only firestore:rules,storage --project inovapro3d
```

---

## 5. 💳 Stripe (pagamentos)

| Variável | Onde pega |
|---|---|
| `VITE_STRIPE_PUBLIC_KEY` | dashboard.stripe.com → Desenvolvedores → Chaves de API → Publicável |
| `STRIPE_SECRET_KEY` | mesma tela → Secreta |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → endpoint `/api/stripe/webhook` → Signing secret |

> Para testar sem cobrar de verdade, use as chaves de **teste** (modo Test) e os cartões de teste do Stripe.

---

## 6. 🔔 Telegram (avisos automáticos)

Usado para: aviso de **novo pedido**, **pagamento confirmado** e **erro no site**.

| Variável | Onde pega |
|---|---|
| `TELEGRAM_BOT_TOKEN` | crie um bot com o @BotFather no Telegram → ele te dá o token |
| `TELEGRAM_CHAT_ID` | mande uma msg pro bot e acesse `https://api.telegram.org/bot<TOKEN>/getUpdates` → campo `chat.id` |

---

## 7. 📝 Conteúdo / Jurídico (pendente)

- **Política de Privacidade (LGPD)**: o link do banner de cookies aponta para `/conhecimento#privacidade`, mas o texto ainda é um rascunho. Preencher com uma política real (ideal revisar com alguém de jurídico).
- **Página "Sobre / Quem somos"**: recomendada para passar confiança (ainda não existe).

---

## Resumo do que falta antes do go-live

- [ ] `VITE_WHATSAPP_PHONE` atualizado na Vercel
- [ ] IDs de Analytics/Pixels (GA4, Meta, TikTok) — quando tiver as contas
- [ ] `APP_URL` na Vercel
- [ ] `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` na Vercel
- [ ] Stripe (chaves + webhook) na Vercel
- [ ] Telegram (token + chat id) na Vercel
- [ ] Sitemap cadastrado no Google Search Console
- [ ] Política de Privacidade preenchida
- [ ] TikTok/Kwai em `src/lib/config.ts` quando tiver
