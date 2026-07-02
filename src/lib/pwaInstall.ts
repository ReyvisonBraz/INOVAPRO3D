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

// ── Contador de visitas + gate do convite de instalação ────────────────────
const VISITS_KEY = "inovapro3d:visits";
const INSTALL_NUDGED_KEY = "inovapro3d:install-dismissed";

/** Incrementa e retorna o nº de visitas (chamar uma vez no boot). */
export function recordVisit(): number {
  try {
    const n = Number(localStorage.getItem(VISITS_KEY) || 0) + 1;
    localStorage.setItem(VISITS_KEY, String(n));
    return n;
  } catch {
    return 1;
  }
}

function getVisits(): number {
  try {
    return Number(localStorage.getItem(VISITS_KEY) || 0);
  } catch {
    return 0;
  }
}

function installNudged(): boolean {
  try {
    return localStorage.getItem(INSTALL_NUDGED_KEY) === "1";
  } catch {
    return false;
  }
}

function markInstallNudged(): void {
  try {
    localStorage.setItem(INSTALL_NUDGED_KEY, "1");
  } catch {
    /* modo privado / quota — ignora */
  }
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

/**
 * Convite de instalação com bom senso: só a partir da 2ª visita, uma única vez,
 * e nunca quando já instalado. Usado pela orquestração de onboarding para o
 * "instalar" não pesar na 1ª visita nem se repetir.
 */
export function maybeShowInstallToast(): void {
  if (isStandalone()) return;
  if (installNudged()) return;
  if (getVisits() < 2) return;
  if (!isIOS() && !canInstall()) return;
  markInstallNudged();
  showInstallToast();
}
