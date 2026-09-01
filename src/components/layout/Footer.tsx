import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MessageCircle, ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react";
import { BrandLogo } from "../brand/BrandLogo";
import { SocialLinks } from "../ui/SocialLinks";
import { toast } from "sonner";
import { waLink, CONTACT } from "../../lib/config";

export function Footer() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // O e-mail normalizado é o ID do documento: quem decide a duplicidade é o
  // Firestore, não uma consulta prévia. A checagem anterior lia a coleção
  // `newsletter`, cuja leitura é reservada ao admin — negada, o `catch` engolia
  // a exceção e todo visitante recebia "não foi possível concluir".
  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    // `/` quebraria o caminho do documento; o limite de 254 é o mesmo da regra,
    // e sem ele a recusa chegaria aqui disfarçada de "já inscrito".
    if (!trimmed || trimmed.length > 254 || !/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(trimmed)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setSubmitting(true);
    try {
      const [{ doc, setDoc, serverTimestamp }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("../../services/firebase"),
      ]);
      await setDoc(doc(db, "newsletter", trimmed), {
        email: trimmed,
        createdAt: serverTimestamp(),
      });
      setSubscribed(true);
      setEmail("");
      toast.success("Inscrito com sucesso!", {
        description: "Você receberá nossas novidades em breve.",
      });
    } catch (err) {
      // A regra concede `create` e não `update`: reinscrever esbarra na
      // permissão em vez de sobrescrever a data da inscrição original.
      if ((err as { code?: string } | null)?.code === "permission-denied") {
        setSubscribed(true);
        toast.info("Esse e-mail já está inscrito!");
      } else {
        toast.error("Não foi possível concluir. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="border-t border-white/[0.06] bg-[#07080d] pt-12 sm:pt-24 pb-8 sm:pb-12 px-6 lg:px-8 mt-24 relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/2 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl w-full mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-16">
          {/* Brand Identity */}
          <div className="lg:col-span-4 space-y-6">
            <Link to="/" className="group flex items-center">
              <BrandLogo markClassName="h-10 w-10" wordmarkClassName="text-xl" />
            </Link>
            <p className="text-sm text-white/35 font-medium leading-relaxed max-w-sm">
              Tecnologia, precisão e inovação em impressão 3D. Do digital ao objeto real, com
              acabamento de alta definição.
            </p>

            {/* Newsletter */}
            <div className="space-y-3 pt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                Receba novidades
              </p>
              {subscribed ? (
                <div className="flex items-center gap-2 py-3 text-green-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold">Inscrito! Fique de olho no seu e-mail.</span>
                </div>
              ) : (
                <form onSubmit={handleNewsletter} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu e-mail..."
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-xs outline-none focus:border-primary/40 transition-all font-medium text-white placeholder-white/20"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-10 px-5 rounded-xl bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "ENVIAR"}
                  </button>
                </form>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <SocialLinks iconClassName="w-3.5 h-3.5" />
              <a
                href={`mailto:${CONTACT.email}`}
                aria-label="E-mail"
                title="E-mail"
                className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] text-white/30 hover:text-white transition-all duration-300"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
              Plataforma
            </h2>
            <ul className="space-y-4">
              <FooterLink to="/">Início</FooterLink>
              <FooterLink to="/catalogo">Catálogo 3D</FooterLink>
              <FooterLink to="/calculadora">Calculadora</FooterLink>
              <FooterLink to="/meus-pedidos">Meus Pedidos</FooterLink>
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
              Saiba Mais
            </h2>
            <ul className="space-y-4">
              <FooterLink to="/sobre">Sobre Nós</FooterLink>
              <FooterLink to="/conhecimento">Como Funciona</FooterLink>
              <FooterLink to="/conhecimento">Central de Ajuda</FooterLink>
              <FooterLink to="/catalogo">Ver Produtos</FooterLink>
            </ul>
          </div>

          {/* Atendimento */}
          <div className="lg:col-span-4 space-y-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
              Atendimento
            </h2>
            <div className="p-5 sm:p-8 rounded-[32px] bg-white/[0.03] border border-white/[0.06] space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  Online — Resposta rápida
                </span>
              </div>

              <a
                href={waLink("Olá INOVAPRO3D! Preciso de ajuda.")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-primary/10 hover:border-primary/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">
                    WhatsApp Direto
                  </span>
                </div>
                <ArrowUpRight className="w-3 h-3 text-white/20 group-hover:text-primary transition-colors" />
              </a>

              <a
                href={`mailto:${CONTACT.email}`}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-white/40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">
                    {CONTACT.email}
                  </span>
                </div>
                <ArrowUpRight className="w-3 h-3 text-white/20 group-hover:text-white/60 transition-colors" />
              </a>

              <Link
                to="/conhecimento"
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all group"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">
                  Central de Ajuda / FAQ
                </span>
                <ArrowUpRight className="w-3 h-3 text-white/20 group-hover:text-white/60 transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* Legal Strip */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[12px] text-white/20 font-black uppercase tracking-[0.2em] flex items-center gap-2">
            © {new Date().getFullYear()} INOVAPRO3D <span className="opacity-50">|</span>
            <span className="text-white/10 italic">Soluções em Impressão 3D</span>
          </p>
          <div className="flex flex-wrap gap-4 sm:gap-8 lg:gap-12 text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">
            <Link to="/conhecimento#privacidade" className="hover:text-white/50 transition-colors">
              Política de Privacidade
            </Link>
            <Link to="/conhecimento#termos" className="hover:text-white/50 transition-colors">
              Termos de Uso
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="text-[12px] font-black uppercase tracking-widest text-white/70 hover:text-white hover:translate-x-1 inline-block transition-all duration-300"
      >
        {children}
      </Link>
    </li>
  );
}
