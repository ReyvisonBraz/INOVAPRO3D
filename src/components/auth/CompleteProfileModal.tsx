import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Smartphone, User, ChevronRight, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/Button";
import { toast } from "sonner";

interface Props {
  onDismiss: () => void;
}

function splitDisplayName(name: string | null): { first: string; last: string } {
  if (!name) return { first: "", last: "" };
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

export default function CompleteProfileModal({ onDismiss }: Props) {
  const { profile, updateProfile } = useAuth();
  const initial = splitDisplayName(profile?.name ?? null);

  const [firstName, setFirstName] = useState(profile?.firstName ?? initial.first);
  const [lastName, setLastName] = useState(profile?.lastName ?? initial.last);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    return v;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const phoneClean = phone.replace(/\D/g, "");
    if (phoneClean.length < 10) {
      toast.error("Informe um celular válido com DDD.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phoneClean,
      });
      toast.success("Perfil salvo! Bem-vindo(a) à INOVAPRO3D.");
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-surface border border-white/10 rounded-[40px] p-8 sm:p-10 relative overflow-hidden"
      >
        {/* decorative glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

        <button
          onClick={onDismiss}
          className="absolute top-6 right-6 p-2 rounded-2xl hover:bg-white/5 transition-all group"
          aria-label="Fechar"
        >
          <X className="w-5 h-5 text-dim group-hover:text-white transition-colors" />
        </button>

        {/* avatar from Google */}
        {profile?.photoURL && (
          <img
            src={profile.photoURL}
            alt=""
            className="w-16 h-16 rounded-full border-2 border-primary/30 mb-6 object-cover"
          />
        )}

        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Bem-vindo(a)</p>
        <h2 className="text-2xl sm:text-3xl font-display font-black italic tracking-tight mb-2">
          Complete seu perfil
        </h2>
        <p className="text-white/40 text-sm mb-8 leading-relaxed">
          Para receber atualizações do seu pedido via WhatsApp, preencha seus dados abaixo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Nome
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="João"
                  className="w-full pl-10 pr-4 py-3.5 bg-white/[0.04] border border-white/10 rounded-2xl text-sm font-medium outline-none focus:border-primary/50 transition-all placeholder:text-white/20"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Sobrenome
              </label>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Silva"
                className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/10 rounded-2xl text-sm font-medium outline-none focus:border-primary/50 transition-all placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
              WhatsApp (com DDD)
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              <input
                required
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(91) 99999-9999"
                className="w-full pl-10 pr-4 py-3.5 bg-white/[0.04] border border-white/10 rounded-2xl text-sm font-medium outline-none focus:border-primary/50 transition-all placeholder:text-white/20"
              />
            </div>
            <p className="text-[10px] text-white/20 font-medium pl-1">
              Usado apenas para avisos do seu pedido — nunca para spam.
            </p>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest gap-2 mt-2"
          >
            {saving ? "Salvando..." : "Salvar e Continuar"}
            {!saving && <ChevronRight className="w-4 h-4" />}
          </Button>

          <button
            type="button"
            onClick={onDismiss}
            className="w-full text-center text-[11px] text-white/25 hover:text-white/50 transition-colors py-2 font-medium"
          >
            Completar mais tarde
          </button>
        </form>
      </motion.div>
    </div>
  );
}
