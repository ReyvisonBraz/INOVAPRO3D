import { toast } from "sonner";

/**
 * Gerenciador de instalação do PWA INOVAPRO3D.
 *
 * Captura o evento `beforeinstallprompt` (Chrome/Edge/Android) assim que o
 * módulo é importado, guardando-o para disparar o prompt nativo quando o
 * usuário quiser. No iOS/Safari, que não suporta esse evento, mostramos
 * instruções manuais ("Adicionar à Tela de Início").
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
  });
}

/** Já está rodando como app instalado? */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window);
}

/** Há um prompt nativo de instalação disponível? */
export function canInstall(): boolean {
  return deferredPrompt !== null;
}

/** Dispara o prompt nativo de instalação. Retorna true se o usuário aceitou. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice.outcome === "accepted";
}

/**
 * Mostra um toast sugerindo instalar o app. Não faz nada se já estiver
 * instalado. No iOS instrui manualmente; nos demais, oferece o botão "Instalar".
 */
export function showInstallToast() {
  if (isStandalone()) return;

  if (isIOS()) {
    toast("📲 Instale o app INOVAPRO3D", {
      description: "Toque em Compartilhar e depois em “Adicionar à Tela de Início”.",
      duration: 9000,
    });
    return;
  }

  if (!canInstall()) return;

  toast("📲 Instale o app INOVAPRO3D", {
    description: "Acesso rápido na sua tela inicial, como um aplicativo.",
    duration: 12000,
    action: {
      label: "Instalar",
      onClick: () => {
        void promptInstall().then((accepted) => {
          if (accepted) toast.success("App instalado! Bem-vindo(a). 🚀");
        });
      },
    },
  });
}
