import { useCallback, useEffect, useState } from "react";

/**
 * Estado das notificações push, lido direto do navegador (Web Push API).
 *
 * - `unsupported`: navegador sem service worker / Push API (ex.: iOS antigo).
 * - `blocked`: o usuário bloqueou notificações para este site.
 * - `subscribed`: permissão concedida E existe uma inscrição ativa.
 * - `default`: ainda não pediu, ou concedeu mas sem inscrição (raro).
 *
 * A ação de ASSINAR não vive aqui — quem cria o assinante é o script do
 * SendPulse (via a classe `sp_notify_prompt` no sino). Este hook só lê o
 * estado e sabe DESASSINAR (que é padrão do navegador, sem depender do
 * SendPulse). Ver DOCS/superpowers/specs/2026-07-02-...-design.md.
 */
export type PushStatus = "unsupported" | "default" | "subscribed" | "blocked";

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Procura uma inscrição ativa em qualquer service worker registrado. */
async function getActiveSubscription(): Promise<PushSubscription | null> {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) return sub;
    }
  } catch {
    /* ignora — tratado como sem inscrição */
  }
  return null;
}

async function computeStatus(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission === "granted") {
    return (await getActiveSubscription()) ? "subscribed" : "default";
  }
  return "default";
}

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>(() =>
    pushSupported() ? "default" : "unsupported",
  );

  const refresh = useCallback(async () => {
    setStatus(await computeStatus());
  }, []);

  useEffect(() => {
    void refresh();
    // Ao voltar o foco à aba, o prompt nativo pode ter sido respondido.
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  /** Cancela a inscrição no navegador (desativa as notificações de verdade). */
  const unsubscribe = useCallback(async () => {
    const sub = await getActiveSubscription();
    if (sub) {
      try {
        await sub.unsubscribe();
      } catch {
        /* ignora — refresh reflete o estado real */
      }
    }
    await refresh();
  }, [refresh]);

  return { status, refresh, unsubscribe };
}
