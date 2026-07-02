# Sininho de notificações + orquestração de avisos — Design

Data: 2026-07-02
Status: aprovado o rumo geral; aguardando revisão do spec

## Problema

Hoje, um visitante novo (1ª visita, não logado, fora do admin) leva até **4
interrupções quase simultâneas**:

1. Modal de boas-vindas (tela cheia)
2. Banner de cookies (LGPD, embaixo) — aparece junto do modal
3. Toast "Instalar app" — 1,4s depois de fechar o modal
4. Popup de notificações do SendPulse — automático, por conta própria

Além da fadiga, o push é um popup intrusivo e não há um lugar fixo para o
usuário **ligar/desligar** notificações depois.

## Objetivos

1. Um **sininho** fixo no cabeçalho (desktop + mobile) que reflete o estado real
   e permite **ativar/desativar** notificações sob demanda.
2. **Tirar o push do modo popup automático** → vira on-demand pelo sino.
3. **Orquestrar** os avisos restantes para no máximo **um por vez**.

Fora de escopo (YAGNI): segmentação de assinantes, campanhas automáticas,
push próprio sem SendPulse, A/B de copy.

## Restrição técnica central (decisão de arquitetura)

Quem cria o **assinante** é o script hospedado do SendPulse. Se o site chamar
`Notification.requestPermission()` por conta própria, a permissão vira
`granted` mas **nenhuma inscrição** é registrada no SendPulse (bug já observado
e documentado em `memory/web-push-sendpulse.md`).

Portanto, **assinar** deve passar pelo fluxo do SendPulse. O caminho suportado
e confiável é o modo **"Ao clicar em um elemento"**: configura-se no painel um
seletor CSS, e o clique nesse elemento dispara a inscrição do SendPulse (prompt
nativo do navegador). Isso **também desliga o popup automático**.

- **Assinar** → responsabilidade do SendPulse (element-click no seletor do sino).
- **Desassinar** e **ler estado** → responsabilidade nossa, via Web Push API do
  navegador (`pushManager.getSubscription()` / `subscription.unsubscribe()`),
  independente do SendPulse.

Alternativas descartadas:
- Push 100% próprio (gerenciar VAPID + API REST do SendPulse no servidor):
  frágil, quebra o registro de assinante. ❌
- Manter popup automático e só somar o sino: não resolve a fadiga. ❌

### Passo manual no SendPulse (pré-requisito, uma vez)

Em *Sites → www.inovapro3d.com.br → Configurações do site → Solicitação de
inscrição*: trocar para **"Ao clicar em um elemento"** e informar o seletor
**`#sp-push-bell`**. Isso desativa o popup automático. Documentar em
`memory/web-push-sendpulse.md`.

## Componentes

### 1. `usePushSubscription` (hook) — `src/hooks/usePushSubscription.ts`

Encapsula a detecção de estado e a ação de desassinar. Não conhece o SendPulse.

Retorno:
- `status`: `'unsupported' | 'default' | 'subscribed' | 'blocked'`
- `refresh()`: recalcula o estado (permissão + `getSubscription()`)
- `unsubscribe()`: `getSubscription()` → `.unsubscribe()` → `refresh()`

Regras de `status`:
- `unsupported`: sem `serviceWorker` ou sem `PushManager` → o sino não renderiza.
- `blocked`: `Notification.permission === 'denied'`.
- `subscribed`: permissão `granted` **e** existe `pushManager.getSubscription()`.
- `default`: qualquer outro caso (inclui "granted mas sem inscrição" — clicar
  reengata o fluxo do SendPulse).

Recalcula em: mount, `window` `focus`, e após clique (com pequeno atraso, pois a
inscrição do SendPulse é assíncrona).

### 2. `PushBell` (componente) — `src/components/notifications/PushBell.tsx`

Botão no cabeçalho com `id="sp-push-bell"` (seletor que o SendPulse observa).
Mesmo estilo visual do botão do carrinho.

| status | aparência | clique |
|---|---|---|
| `default` | 🔔 contorno (+ pontinho pulsante se nunca interagiu) | deixa o SendPulse assinar (element-click); reavalia estado depois |
| `subscribed` | 🔔 preenchido + pontinho verde | abre popover "Notificações ativas ✓ / **Desativar**" → `unsubscribe()` |
| `blocked` | 🔔 com risco, apagado | abre popover "como reativar no cadeado 🔒 do navegador" |
| `unsupported` | não renderiza | — |

- O clique em `default` **não** faz `preventDefault` — o listener delegado do
  SendPulse precisa disparar. Nosso `onClick` só agenda o `refresh()`.
- Popover ancorado ao sino, mesmo padrão visual do menu de perfil.
- O "pontinho pulsante" é o único convite (nudge) — **sem modal**. Mostrado
  só quando `status === 'default'` e o usuário nunca clicou no sino
  (flag `inovapro3d:push-nudge-seen`). Some após o primeiro clique.

### 3. Orquestração de avisos — `src/contexts/OnboardingContext.tsx`

Um provider leve que garante **um aviso por vez**, em ordem de prioridade.

Passos: `welcome` → `cookies` → `install` → `done`.

- Expõe `activeStep` e `advance()`.
- Cada prompt só renderiza quando é o passo ativo **e** suas próprias condições
  batem (ex.: cookies só se `getConsent() === null`).
- O push **não** participa desse fluxo (agora é on-demand no sino).

Regras dos passos:
- **welcome**: 1ª visita, não logado, fora do admin (mantém a regra atual). Ao
  fechar → `advance()`.
- **cookies**: renderiza quando ativo e `getConsent() === null`. Ao escolher →
  `advance()`. Se o welcome não for exibir (visitante recorrente/logado), o
  fluxo começa direto em cookies.
- **install**: só dispara quando ativo, **e** em visita ≥ 2
  (contador `inovapro3d:visits`), **e** não instalado, **e** não descartado
  antes (`inovapro3d:install-dismissed`). Assim o "instalar" não pesa na 1ª
  visita. Continua sendo um toast (sonner), não modal.

Contadores/flags em `localStorage`:
- `inovapro3d:welcomed` (já existe)
- `inovapro3d:visits` (novo, incrementa no boot)
- `inovapro3d:install-dismissed` (novo)
- `inovapro3d:push-nudge-seen` (novo)

## Arquivos

Novos:
- `src/hooks/usePushSubscription.ts`
- `src/components/notifications/PushBell.tsx`
- `src/contexts/OnboardingContext.tsx`

Modificados:
- `src/components/layout/Navbar.tsx` — sino no grupo de ações (desktop) e no
  menu mobile.
- `src/App.tsx` — envolver com `OnboardingProvider`; `WelcomeGate` e
  `CookieConsent` passam a respeitar `activeStep`.
- `src/components/CookieConsent.tsx` — renderiza só quando o passo ativo é
  `cookies`.
- `src/lib/pwaInstall.ts` — helpers de contador de visita e gate de exibição do
  toast (visita ≥ 2, dismiss).
- `memory/web-push-sendpulse.md` — documentar o modo element-click + seletor.

## Casos de borda

- **iOS/Safari** e navegadores sem Push API → `unsupported`, sino escondido.
- **PWA instalado (standalone)** → push funciona normal; sino aparece.
- **Permissão `denied`** → sino em `blocked`, popover explica reativação; nunca
  tentamos re-perguntar (o navegador ignoraria).
- **SendPulse ainda no modo popup** (antes do passo manual) → o sino mostra
  estado e desassina, mas **assinar pelo sino só funciona após** trocar para
  element-click. Risco documentado; validar durante a implementação se o
  listener do SendPulse é delegado (pega elemento montado depois pelo React).

## Critérios de sucesso

1. Sino visível no cabeçalho (desktop + mobile) refletindo o estado real.
2. Clicar assina (via SendPulse) e desativa (local) de verdade.
3. No máximo **um** aviso de onboarding por vez; "instalar" fora da 1ª visita.
4. Push deixa de ser popup automático (on-demand pelo sino).
5. Sem regressões: `tsc --noEmit` e `vite build` passam.

## Validação

- Typecheck + build.
- Manual (DevTools): forçar cada `status` e conferir aparência/ação; confirmar
  `unsubscribe()`; confirmar SendPulse registrando assinante ao clicar no sino
  (contador no painel); confirmar sequência dos avisos (um por vez).
