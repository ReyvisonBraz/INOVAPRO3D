# 04 — Chaves e Variáveis de Ambiente

## O que são variáveis de ambiente?

São **configurações que ficam fora do código**, no arquivo `.env` na raiz do projeto.
Servem para duas coisas:

1. **Guardar segredos** (chaves de API, tokens) sem expô-los no GitHub
2. **Mudar configurações** sem mexer no código (ex: trocar o telefone do WhatsApp)

O arquivo `.env` está no `.gitignore` — ou seja, **nunca sobe pro GitHub**. ✅
O `.env.example` é o "modelo" público mostrando quais variáveis existem (sem os valores reais).

## A regra de ouro: prefixo VITE_

| Prefixo     | Onde a variável vai parar                                             | Pode ser secreta?         |
| ----------- | --------------------------------------------------------------------- | ------------------------- |
| `VITE_...`  | **Empacotada no site** — qualquer visitante consegue ver no navegador | ❌ NUNCA coloque segredos |
| sem prefixo | **Só no servidor** — invisível para visitantes                        | ✅ Segredos vão aqui      |

## Todas as variáveis do projeto

### 🔥 Firebase (frontend — públicas por design)

| Variável                            | O que é                                   |
| ----------------------------------- | ----------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | Identifica seu projeto Firebase           |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Domínio de login                          |
| `VITE_FIREBASE_PROJECT_ID`          | ID do projeto                             |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Onde ficam as imagens                     |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID de mensagens                           |
| `VITE_FIREBASE_APP_ID`              | ID do app                                 |
| `VITE_FIREBASE_DATABASE_ID`         | Qual banco usar (normalmente "(default)") |

> **"Mas a chave do Firebase não é secreta?"** — Não! Ela é tipo o "endereço" do seu
> projeto, feita para ser pública. A segurança de verdade vem das **regras** do
> Firestore/Storage (doc 03) e das restrições de domínio no console do Firebase.
> Usadas em: `src/services/firebase.ts`

### 📱 Telegram (notificações pra você)

| Variável             | Tipo            | Usada em                               |
| -------------------- | --------------- | -------------------------------------- |
| `TELEGRAM_BOT_TOKEN` | 🔒 **SECRETA**  | `server.ts` — o "crachá" do seu bot    |
| `TELEGRAM_CHAT_ID`   | 🔒 Semi-secreta | `server.ts` — pra qual conversa mandar |

### 📞 Contato e diversos

| Variável                     | O que faz                                                                                                   | Padrão se vazia                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `VITE_WHATSAPP_PHONE`        | Número dos botões de WhatsApp                                                                               | 5591993170497                             |
| `VITE_CONTACT_EMAIL`         | E-mail exibido no site                                                                                      | contato@inovapro3d.com.br                 |
| `MODEL_IMPORT_ALLOWED_HOSTS` | Sites permitidos na importação de modelos                                                                   | makerworld.com, bambulab.com, bambulab.cn |
| `GEMINI_API_KEY`             | ⚠️ Definida mas **não usada** no código atual — e está exposta no frontend pelo vite.config.ts. Veja doc 05 | —                                         |
| `DISABLE_HMR`                | Desliga recarregamento automático no dev                                                                    | false                                     |

## Onde configurar em produção (Vercel)

O `.env` só funciona no seu computador. Na Vercel, vá em:
**Settings → Environment Variables** e cadastre as mesmas variáveis lá.

Checklist para o site funcionar 100% em produção:

- [ ] As 7 variáveis `VITE_FIREBASE_*`
- [ ] `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (para receber avisos)
- [ ] `VITE_WHATSAPP_PHONE` + `VITE_CONTACT_EMAIL` (ou usa os padrões)

## Mapa: qual arquivo lê qual variável

```
src/services/firebase.ts  → todas as VITE_FIREBASE_*
src/lib/config.ts         → VITE_WHATSAPP_PHONE, VITE_CONTACT_EMAIL
server.ts                 → TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
api/_modelMetadata.ts     → MODEL_IMPORT_ALLOWED_HOSTS
vite.config.ts            → GEMINI_API_KEY (⚠️ remover), DISABLE_HMR
```
