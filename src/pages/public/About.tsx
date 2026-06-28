import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  MessageCircle,
  Boxes,
  Cpu,
  ShieldCheck,
  Truck,
  Sparkles,
  Target,
  HeartHandshake,
  Gauge,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { PageSEO } from "../../components/seo/PageSEO";
import { BrandMark, BrandWordmark } from "../../components/brand/BrandLogo";
import { FloatingBackground } from "../../components/ui/FloatingBackground";
import { SocialLinks } from "../../components/ui/SocialLinks";
import { waLink } from "../../lib/config";

const STATS = [
  { icon: Gauge, value: "±0,2 mm", label: "Precisão de camada" },
  { icon: Cpu, value: "Bambu Lab P2S", label: "Equipamento + AMS" },
  { icon: Truck, value: "Brasil todo", label: "Entrega rastreada" },
  { icon: ShieldCheck, value: "Garantida", label: "Reimpressão sem custo" },
];

const WHAT = [
  { icon: Boxes, title: "Catálogo pronto", text: "Dezenas de peças prontas para imprimir — escolha a cor do material e finalize em minutos." },
  { icon: Cpu, title: "Sob demanda", text: "Tem seu próprio arquivo 3D (STL/OBJ)? Envie e receba um orçamento técnico justo e transparente." },
  { icon: Target, title: "Precisão real", text: "Cada peça é calibrada e revisada antes de sair — material, resistência e acabamento conferidos." },
];

const STEPS = [
  { n: "01", title: "Escolha ou envie", text: "Selecione um produto do catálogo ou envie seu modelo para orçamento." },
  { n: "02", title: "Produção calibrada", text: "Imprimimos na Bambu Lab P2S com o material e a configuração certos para a peça." },
  { n: "03", title: "Acabamento", text: "Revisão de qualidade, limpeza de suportes e finalização caprichada." },
  { n: "04", title: "Entrega rastreada", text: "Embalamos com cuidado e enviamos com código de rastreio para todo o Brasil." },
];

const VALUES = [
  { icon: Target, title: "Precisão", text: "Tecnologia e calibração para um acabamento de alta definição, peça após peça." },
  { icon: HeartHandshake, title: "Transparência", text: "Preço claro, prazos reais e comunicação direta — sem surpresas." },
  { icon: ShieldCheck, title: "Confiança", text: "Chegou com defeito? Reimprimimos e reenviamos sem custo. Simples assim." },
];

function SectionTitle({ kicker, title, center }: { kicker: string; title: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : ""}>
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary/70">{kicker}</p>
      <h2 className="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">{title}</h2>
    </div>
  );
}

export default function About() {
  return (
    <>
      <PageSEO
        title="Sobre Nós"
        description="Conheça a INOVAPRO3D — tecnologia, precisão e inovação em impressão 3D. Do arquivo digital ao objeto real, com acabamento de alta definição e entrega para todo o Brasil."
        path="/sobre"
      />

      <div className="relative overflow-hidden">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <FloatingBackground subtle variant="grid" />
          <div className="container-section relative z-10 py-16 sm:py-24 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto mb-6 w-fit"
            >
              <div className="absolute inset-0 -z-10 rounded-full bg-primary/30 blur-2xl" />
              <BrandMark className="h-16 w-16 rounded-2xl mx-auto" />
            </motion.div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3 w-3" /> Quem somos
            </span>

            <h1 className="mt-4 text-3xl sm:text-5xl font-black uppercase tracking-tight leading-[1.05]">
              Do digital ao <span className="brand-gradient-text">objeto real</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm sm:text-base leading-relaxed text-white/50">
              A <BrandWordmark className="text-sm sm:text-base align-middle" /> nasceu para tornar a impressão 3D
              acessível, confiável e profissional. Unimos tecnologia de ponta, precisão de maker e atendimento
              humano — transformando ideias e arquivos em peças reais com acabamento de alta definição.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/catalogo"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all"
              >
                Ver catálogo <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={waLink("Olá INOVAPRO3D! Vim pela página Sobre e quero saber mais.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.03] px-7 py-3.5 text-xs font-black uppercase tracking-widest text-white/70 hover:bg-white/[0.07] hover:text-white transition-all"
              >
                <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="container-section pb-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-center">
                <s.icon className="mx-auto mb-3 h-5 w-5 text-primary" />
                <p className="font-display text-lg sm:text-xl font-black text-white leading-tight">{s.value}</p>
                <p className="mt-1 text-[11px] text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MISSÃO */}
        <section className="container-section py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <SectionTitle kicker="Nossa missão" title="Tecnologia que vira coisa de verdade" />
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-white/50">
                <p>
                  Acreditamos que a fabricação digital deixou de ser coisa de indústria gigante. Hoje, qualquer
                  pessoa pode ter uma peça única, um reparo, um presente ou um produto sob medida — com qualidade
                  profissional e preço justo.
                </p>
                <p>
                  Por isso construímos uma operação enxuta e transparente: você vê o preço real, acompanha cada
                  etapa do pedido e fala direto com quem produz. Sem intermediários, sem letra miúda.
                </p>
                <p>
                  Cada impressão passa por calibração e revisão — porque o que sai daqui carrega o nome da
                  INOVAPRO3D.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {VALUES.map((v) => (
                <div key={v.title} className="flex gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide text-white/90">{v.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/45">{v.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* O QUE FAZEMOS */}
        <section className="container-section py-4">
          <SectionTitle kicker="O que fazemos" title="Da peça pronta ao projeto exclusivo" center />
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {WHAT.map((w) => (
              <div key={w.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary">
                  <w.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-black uppercase tracking-wide text-white/90">{w.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{w.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* COMO TRABALHAMOS */}
        <section className="container-section py-16 sm:py-20">
          <SectionTitle kicker="Como trabalhamos" title="Do pedido à sua porta" center />
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
                <span className="font-display text-3xl font-black text-primary/30">{s.n}</span>
                <h3 className="mt-2 text-sm font-black uppercase tracking-wide text-white/90">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* LOCAL + CTA */}
        <section className="container-section pb-20">
          <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-primary/[0.12] to-transparent p-8 sm:p-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/60">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Do Pará para todo o Brasil
            </div>
            <h2 className="mt-5 text-2xl sm:text-4xl font-black uppercase tracking-tight">
              Pronto para tirar sua ideia do papel?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/50">
              Explore o catálogo ou fale com a gente — respondemos rápido e adoramos um bom projeto.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/catalogo"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all"
              >
                Explorar catálogo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/calculadora"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.03] px-7 py-3.5 text-xs font-black uppercase tracking-widest text-white/70 hover:bg-white/[0.07] hover:text-white transition-all"
              >
                <CheckCircle2 className="h-4 w-4" /> Calcular um orçamento
              </Link>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Acompanhe a gente</p>
              <SocialLinks className="justify-center" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
