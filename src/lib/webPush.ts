// SendPulse Web Push. Assim como os pixels de analytics, o script SÓ é injetado
// após o consentimento de cookies (LGPD) — antes disso nada é carregado e o
// navegador não pede permissão de notificação.
//
// O service worker (sp-push-worker-fb.js) é servido como arquivo estático na
// raiz do site (public/ → dist/). O script abaixo é quem registra o worker,
// cria a subscription e dispara o prompt "Permitir notificações?".
const SENDPULSE_PUSH_SRC =
  "https://web.webpushs.com/js/push/c645b41ef74d093572934565b95d5a28_1.js";

let initialized = false;

/** Injeta o script do SendPulse Web Push uma única vez. Idempotente. */
export function initWebPush(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const s = document.createElement("script");
  s.async = true;
  s.charset = "UTF-8";
  s.src = SENDPULSE_PUSH_SRC;
  document.head.appendChild(s);
}
