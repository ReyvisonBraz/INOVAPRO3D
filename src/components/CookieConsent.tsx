import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie } from "lucide-react";
import { getConsent, setConsent } from "../lib/consent";
import { analyticsConfigured, initAnalytics, trackPageView } from "../lib/analytics";
import { initWebPush } from "../lib/webPush";

/**
 * Banner de consentimento (LGPD). Aparece na 1ª visita. Só após "Aceitar" os
 * scripts de analytics/marketing são carregados. "Rejeitar" mantém tudo desligado.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (getConsent() === null) setVisible(true);
  }, []);

  const accept = () => {
    setConsent("accepted");
    setVisible(false);
    initAnalytics();
    initWebPush();
    trackPageView(location.pathname + location.search);
  };

  const reject = () => {
    setConsent("rejected");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-3 bottom-3 z-[150] mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#0b0c15]/95 backdrop-blur-xl p-4 sm:p-5 shadow-2xl shadow-black/60"
          role="dialog"
          aria-label="Aviso de cookies"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Cookie className="h-4 w-4" />
              </div>
              <p className="text-xs leading-relaxed text-white/55">
                Usamos cookies para melhorar sua experiência e entender como o site é
                usado. Você pode aceitar ou recusar.{" "}
                <Link to="/conhecimento#privacidade" className="font-semibold text-primary hover:underline">
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
            <div className="flex shrink-0 gap-2 sm:ml-auto">
              <button
                onClick={reject}
                className="h-10 rounded-xl border border-white/12 px-4 text-[11px] font-bold uppercase tracking-wide text-white/55 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                Recusar
              </button>
              <button
                onClick={accept}
                className="h-10 rounded-xl bg-primary px-5 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-primary-dark transition-all"
              >
                {analyticsConfigured() ? "Aceitar" : "Entendi"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
