import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  MessageCircle,
  Instagram,
  Mail,
  Boxes,
  FileText,
  Calculator,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { BrandMark, BrandWordmark } from "../brand/BrandLogo";
import { FloatingBackground } from "../ui/FloatingBackground";
import { useAuth } from "../../contexts/AuthContext";
import { CONTACT, waLink } from "../../lib/config";

const INSTAGRAM_URL = "https://www.instagram.com/inovapro3d";

interface Props {
  /** Chamado quando o usuário fecha/continua (com flag de "logou" ou não). */
  onClose: () => void;
}

const FEATURES = [
  { icon: Boxes, title: "Catálogo 3D", desc: "Peças prontas para imprimir" },
  { icon: FileText, title: "Orçamento", desc: "Envie seu modelo, receba o preço" },
  { icon: Calculator, title: "Calculadora", desc: "Custo real de cada impressão" },
];

export default function WelcomeModal({ onClose }: Props) {
  const { loginWithGoogle } = useAuth();
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch {
      setLoggingIn(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Boas-vindas à INOVAPRO3D"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg overflow-hidden rounded-[34px] border border-white/[0.08] bg-[#0a0b12] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]"
      >
        <FloatingBackground subtle />

        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-5 top-5 z-20 rounded-xl p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10 px-7 pb-8 pt-10 sm:px-10 sm:pb-10">
          {/* Marca */}
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-5"
            >
              <div className="absolute inset-0 -z-10 rounded-full bg-primary/30 blur-2xl" />
              <BrandMark className="h-16 w-16 rounded-2xl" />
            </motion.div>

            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3 w-3" />
              Bem-vindo
            </span>

            <BrandWordmark className="text-3xl sm:text-4xl" />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/45">
              Tecnologia, precisão e inovação em impressão 3D. Do arquivo digital
              ao objeto real, com acabamento de alta definição.
            </p>
          </div>

          {/* Features */}
          <div className="mt-7 grid grid-cols-3 gap-2.5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 text-center"
              >
                <f.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
                <p className="text-[11px] font-bold text-white/90 leading-tight">{f.title}</p>
                <p className="mt-0.5 text-[9px] leading-tight text-white/35">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Login CTA */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46, duration: 0.4 }}
            onClick={handleLogin}
            disabled={loggingIn}
            className="group relative mt-7 flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white px-5 text-sm font-bold text-[#0a0b12] transition-all hover:shadow-[0_0_36px_rgba(255,255,255,0.25)] active:scale-[0.99] disabled:opacity-70"
          >
            {loggingIn ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0a0b12]/30 border-t-[#0a0b12]" />
            ) : (
              <>
                <GoogleIcon />
                Entrar com Google
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </motion.button>
          <button
            onClick={onClose}
            className="mt-2.5 w-full py-2 text-center text-[12px] font-medium text-white/35 transition-colors hover:text-white/70"
          >
            Explorar sem entrar →
          </button>

          {/* Contato + Instagram */}
          <div className="mt-7 border-t border-white/[0.06] pt-6">
            <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              Fale com a gente
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <ContactLink
                href={waLink("Olá INOVAPRO3D! Vim pelo site e quero saber mais.")}
                icon={<MessageCircle className="h-4 w-4" />}
                label="WhatsApp"
                className="hover:border-green-400/30 hover:bg-green-400/10 hover:text-green-300"
              />
              <ContactLink
                href={INSTAGRAM_URL}
                icon={<Instagram className="h-4 w-4" />}
                label="Instagram"
                className="hover:border-pink-400/30 hover:bg-pink-400/10 hover:text-pink-300"
              />
              <ContactLink
                href={`mailto:${CONTACT.email}`}
                icon={<Mail className="h-4 w-4" />}
                label="E-mail"
                className="hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ContactLink({
  href,
  icon,
  label,
  className,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] py-3.5 text-white/55 transition-all ${className ?? ""}`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
    </a>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

/** Wrapper que garante a presença do AnimatePresence ao desmontar. */
export function WelcomeModalPresence({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && <WelcomeModal onClose={onClose} />}</AnimatePresence>;
}
