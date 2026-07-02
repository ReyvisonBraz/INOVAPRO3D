import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, BellRing, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { usePushSubscription } from "../../hooks/usePushSubscription";

const NUDGE_KEY = "inovapro3d:push-nudge-seen";

/**
 * Sino de notificações no cabeçalho. Reflete o estado real do navegador e
 * permite ativar/desativar.
 *
 * - ATIVAR: a classe `sp_notify_prompt` (aplicada só quando `status==='default'`)
 *   faz o script do SendPulse disparar a inscrição ao clicar. Por isso o clique
 *   nesse estado NÃO faz preventDefault.
 * - DESATIVAR / estado BLOQUEADO: abrem um popover próprio (sem a classe, o
 *   SendPulse não é acionado).
 */
export function PushBell() {
  const { status, refresh, unsubscribe } = usePushSubscription();
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Pontinho pulsante convidando a ativar — só na 1ª vez (nunca clicou).
  useEffect(() => {
    if (status !== "default") {
      setNudge(false);
      return;
    }
    try {
      setNudge(localStorage.getItem(NUDGE_KEY) !== "1");
    } catch {
      setNudge(false);
    }
  }, [status]);

  // Fecha o popover ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (status === "unsupported") return null;

  const markNudgeSeen = () => {
    try {
      localStorage.setItem(NUDGE_KEY, "1");
    } catch {
      /* modo privado / quota — ignora */
    }
    setNudge(false);
  };

  const handleClick = () => {
    if (status === "subscribed" || status === "blocked") {
      setOpen((v) => !v);
      return;
    }
    // status === "default": deixa o SendPulse assinar (classe sp_notify_prompt).
    // Reavalia o estado depois que o prompt nativo for respondido.
    markNudgeSeen();
    window.setTimeout(() => void refresh(), 1500);
    window.setTimeout(() => void refresh(), 4000);
  };

  const Icon = status === "subscribed" ? BellRing : status === "blocked" ? BellOff : Bell;
  const title =
    status === "subscribed"
      ? "Notificações ativas"
      : status === "blocked"
        ? "Notificações bloqueadas"
        : "Ativar notificações";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-label={title}
        title={title}
        className={cn(
          "relative rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 transition-colors hover:bg-white/10",
          status === "default" && "sp_notify_prompt",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            status === "subscribed"
              ? "text-primary"
              : status === "blocked"
                ? "text-white/40"
                : "text-white",
          )}
        />
        {status === "subscribed" && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#020617] bg-emerald-400" />
        )}
        {nudge && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (status === "subscribed" || status === "blocked") && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right"
          >
            <div className="rounded-2xl border border-white/10 bg-[#0c0d14] p-3 shadow-xl shadow-black/50 backdrop-blur-2xl">
              {status === "subscribed" ? (
                <>
                  <div className="mb-2 flex items-center gap-2 px-2 py-2 text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                    <Check className="h-4 w-4" />
                    Notificações ativas
                  </div>
                  <p className="mb-3 px-2 text-[11px] leading-relaxed text-white/45">
                    Você recebe novidades, cupons e o status dos seus pedidos.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void unsubscribe();
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <BellOff className="h-4 w-4" />
                    Desativar notificações
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-2 flex items-center gap-2 px-2 py-2 text-[11px] font-bold uppercase tracking-widest text-white/60">
                    <BellOff className="h-4 w-4" />
                    Notificações bloqueadas
                  </div>
                  <p className="px-2 text-[11px] leading-relaxed text-white/45">
                    Você bloqueou as notificações no navegador. Para reativar, clique
                    no cadeado 🔒 ao lado do endereço, vá em <b>Notificações</b> →{" "}
                    <b>Permitir</b> e recarregue a página.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
