import React, { useState, useMemo } from "react";
import { PageSEO } from "../../components/seo/PageSEO";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { limit } from "firebase/firestore";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { Button } from "../../components/ui/Button";
import {
  Search, X, Box, HelpCircle, Settings, Atom,
  ChevronDown, ChevronUp, ArrowRight,
  Ruler, Clock, Shield, Package, CheckCircle2, Layers, Zap,
  MessageCircle
} from "lucide-react";
import { waLink } from "../../lib/config";
import type { Product } from "../../types/domain";

/* ─── FAQ DATA ─────────────────────────────────────────────── */
const faqs = [
  {
    category: "Básico",
    icon: Box,
    items: [
      { q: "O que é impressão 3D?", a: "É uma tecnologia que transforma um arquivo digital em um objeto físico real. A máquina deposita plástico derretido camada por camada até formar a peça completa — como construir uma parede tijolo por tijolo, mas de forma automatizada." },
      { q: "O que é PLA?", a: "PLA (Ácido Poliláctico) é um plástico feito de fontes vegetais como milho ou cana-de-açúcar. É o material mais popular para impressão 3D por ter ótima qualidade visual, ser firme e vir em centenas de cores." },
      { q: "Quanto tempo leva para ficar pronto?", a: "Em média de 3 a 7 dias úteis, dependendo do tamanho e complexidade da peça. Peças pequenas podem ficar prontas em 24h. Você acompanha o status em tempo real na sua conta." },
      { q: "Vocês entregam para todo o Brasil?", a: "Sim! Enviamos para qualquer estado via Correios (PAC ou SEDEX). O frete é calculado no checkout antes de você confirmar." },
      { q: "Posso pedir um tamanho diferente?", a: "Sim! Trabalhamos com tamanhos personalizados dentro do limite da impressora (300×300×350mm). Entre em contato pelo WhatsApp com as dimensões desejadas." },
    ]
  },
  {
    category: "Materiais",
    icon: Atom,
    items: [
      { q: "Qual a diferença entre PLA Pro, Silk e Matte?", a: "PLA Pro: acabamento brilhante padrão, ótima precisão. PLA Silk: superfície com efeito metálico/sedoso que disfarça as camadas. PLA Matte: acabamento fosco e opaco, aparência mais profissional. Todos têm a mesma durabilidade." },
      { q: "As peças são resistentes?", a: "PLA é firme e rígido, resistente ao uso cotidiano. Para peças funcionais que sofrem impacto intenso ou calor acima de 60°C, fale com a equipe para avaliar o material mais indicado." },
      { q: "A cor fica exatamente igual à imagem?", a: "As cores podem ter pequenas variações de lote para lote, assim como qualquer produto físico. Fazemos o possível para manter consistência, mas pequenas diferenças de tonalidade são normais." },
    ]
  },
  {
    category: "Pedidos",
    icon: Zap,
    items: [
      { q: "Quais formas de pagamento aceitam?", a: "Atualmente aceitamos Pix. O código é gerado automaticamente após confirmar o pedido — é só pagar pelo app do banco. Em breve teremos cartão de crédito e débito." },
      { q: "Posso cancelar meu pedido?", a: "Sim, desde que a impressão não tenha começado (status 'Em Fila' ou 'Aguardando Pagamento'). Após início da produção não é possível cancelar. Entre em contato pelo WhatsApp o quanto antes." },
      { q: "O que acontece se a peça chegar danificada?", a: "Reimprimos e reenviamos sem custo. Envie uma foto pelo WhatsApp mostrando o dano dentro de 7 dias após o recebimento." },
      { q: "Posso acompanhar meu pedido?", a: "Sim! Na página 'Meus Pedidos' você acompanha cada etapa em tempo real: da fila de impressão até o envio com código de rastreamento dos Correios." },
    ]
  },
  {
    category: "Arquivos",
    icon: Settings,
    items: [
      { q: "Que tipo de arquivo preciso enviar?", a: "Aceitamos arquivos STL e OBJ, formatos padrão para impressão 3D. Se tiver outro formato (STEP, Fusion 360, SolidWorks), entre em contato — geralmente conseguimos converter." },
      { q: "Não tenho arquivo 3D. Posso encomendar assim mesmo?", a: "Sim! Nosso catálogo tem dezenas de modelos prontos. Escolha, configure o material e finalize. Para algo exclusivo, fale pelo WhatsApp sobre modelagem sob medida." },
      { q: "Qual o tamanho máximo que vocês imprimem?", a: "Até 300×300×350mm. Para peças maiores, podemos dividir em partes e montar. Consulte pelo WhatsApp." },
    ]
  },
];

/* ─── FAQ ITEM ──────────────────────────────────────────────── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div layout className="border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.01] hover:border-primary/20 transition-colors">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left">
        <span className="text-sm font-bold text-white/80 leading-snug pr-2">{q}</span>
        <span className="shrink-0 text-white/30">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} className="overflow-hidden">
            <p className="px-5 pb-5 text-sm text-white/45 leading-relaxed font-medium">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── STEP CARD ─────────────────────────────────────────────── */
function StepCard({ num, icon, title, desc }: { num: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative p-6 rounded-3xl bg-white/[0.03] border border-white/[0.06] hover:border-primary/20 transition-colors group"
    >
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/15 mb-4 block">{num}</span>
      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <h3 className="font-black text-base uppercase tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-white/40 font-medium leading-relaxed">{desc}</p>
    </motion.div>
  );
}

/* ─── MATERIAL CARD ─────────────────────────────────────────── */
function MaterialCard({ color, name, tag, desc, best }: { color: string; name: string; tag: string; desc: string; best: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.06] hover:border-primary/20 transition-colors"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl border border-white/10 shrink-0" style={{ backgroundColor: color }} />
        <div>
          <p className="font-black text-sm uppercase tracking-tight">{name}</p>
          <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{tag}</span>
        </div>
      </div>
      <p className="text-xs text-white/40 font-medium leading-relaxed mb-3">{desc}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-primary/70">Ideal para: {best}</p>
    </motion.div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────────── */
export default function HowItWorks() {
  const [search, setSearch] = useState("");
  const { data: exampleProducts } = useFirestoreCollection<Product>("products", {
    constraints: [limit(8)],
    transform: (items) => items.filter(p => p.images?.[0]).slice(0, 6),
    silent: true,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return faqs;
    return faqs
      .map(cat => ({ ...cat, items: cat.items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)) }))
      .filter(cat => cat.items.length > 0);
  }, [search]);

  const totalResults = filtered.reduce((acc, cat) => acc + cat.items.length, 0);

  return (
    <div className="pb-12 min-h-screen">
      <PageSEO
        title="Como Funciona"
        description="Entenda a impressão 3D: materiais, processo de produção, especificações da Bambu Lab P2S, perguntas frequentes e muito mais."
        path="/conhecimento"
      />

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="container-section pt-12 pb-16 sm:pt-16 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Impressão 3D descomplicada</span>
          </div>
          <h1 className="font-display text-5xl sm:text-7xl font-black uppercase leading-[0.9] tracking-tight mb-6">
            Do arquivo<br />
            <span className="text-shimmer italic">à sua mão.</span>
          </h1>
          <p className="text-lg text-white/45 font-medium leading-relaxed max-w-xl mb-10">
            A INOVAPRO3D transforma arquivos digitais em objetos reais com precisão industrial. Catálogo pronto, produção no Pará, entrega em todo o Brasil.
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { icon: <Ruler className="w-3.5 h-3.5" />, text: "Precisão ±0.2mm" },
              { icon: <Clock className="w-3.5 h-3.5" />, text: "Produção em até 48h" },
              { icon: <Package className="w-3.5 h-3.5" />, text: "Entrega nacional" },
              { icon: <Shield className="w-3.5 h-3.5" />, text: "Garantia de qualidade" },
            ].map(chip => (
              <div key={chip.text} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-wider text-white/50">
                <span className="text-primary">{chip.icon}</span>
                {chip.text}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── WHAT IS 3D PRINTING ──────────────────────────────── */}
      <section className="container-section pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60 mb-4">O que é isso?</p>
            <h2 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight leading-tight mb-6">
              Uma impressora que faz <span className="text-shimmer italic">objetos reais.</span>
            </h2>
            <div className="space-y-4 text-sm text-white/45 font-medium leading-relaxed">
              <p>
                Imagine uma impressora comum — mas em vez de tinta no papel, ela deposita plástico derretido camada por camada, construindo um objeto tridimensional do zero.
              </p>
              <p>
                Você escolhe o modelo (do nosso catálogo ou um personalizado), o material e a cor. Nós configuramos a máquina, imprimimos, embalamos e entregamos na sua porta.
              </p>
              <p>
                O resultado? Um objeto real, resistente e com acabamento de alta qualidade — seja uma miniatura, uma peça funcional, um presente único ou um protótipo.
              </p>
            </div>
          </motion.div>

          {/* Placeholder para foto da impressora */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="aspect-[4/3] w-full rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 flex flex-col items-center justify-center gap-3">
              <Box className="w-10 h-10 text-primary/25" />
              <span className="text-xs font-black uppercase tracking-widest text-primary/30 text-center px-6">Bambu Lab P2S</span>
              <span className="text-[10px] text-white/20 font-medium text-center px-8 leading-relaxed">Impressora de alta velocidade — adicione uma foto real aqui no admin</span>
            </div>
            <p className="text-[10px] text-white/20 font-medium mt-3 text-center italic">Bambu Lab P2S — Impressora de alta velocidade e precisão industrial</p>
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS STEPS ───────────────────────────────── */}
      <section className="container-section pb-20">
        <div className="mb-10">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60 mb-3">Passo a passo</p>
          <h2 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight leading-tight">
            Como fazer um pedido
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StepCard num="01" icon={<Layers className="w-5 h-5" />} title="Escolha o modelo" desc="Navegue pelo catálogo e encontre a peça que quer. Miniaturas, decoração, funcional, games — dezenas de opções." />
          <StepCard num="02" icon={<Settings className="w-5 h-5" />} title="Configure" desc="Escolha o material (PLA Pro, Silk ou Matte), a cor e a quantidade. O preço atualiza na hora." />
          <StepCard num="03" icon={<Zap className="w-5 h-5" />} title="Produzimos" desc="Sua peça entra na fila de impressão. Você acompanha cada etapa em tempo real pelo painel." />
          <StepCard num="04" icon={<Package className="w-5 h-5" />} title="Entregamos" desc="Embalada com cuidado e enviada pelos Correios com código de rastreamento. Entrega em todo o Brasil." />
        </div>
      </section>

      {/* ─── MATERIALS ────────────────────────────────────────── */}
      <section className="container-section pb-20">
        <div className="mb-10">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60 mb-3">Opções disponíveis</p>
          <h2 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight leading-tight">
            Nossos materiais
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MaterialCard color="#2563EB" name="PLA Pro" tag="Padrão Premium" desc="Acabamento brilhante, alta precisão de detalhes. O melhor custo-benefício para a maioria das peças." best="Protótipos, decoração e uso geral" />
          <MaterialCard color="#C0A080" name="PLA Silk" tag="Efeito Metálico" desc="Superfície sedosa que reflete a luz e disfarça as camadas de impressão. Aspecto premium e sofisticado." best="Presentes, miniaturas colecionáveis" />
          <MaterialCard color="#888888" name="PLA Matte" tag="Acabamento Fosco" desc="Visual opaco e sóbrio que esconde as linhas de impressão. Aparência mais profissional e moderna." best="Objetos funcionais, decoração moderna" />
        </div>
      </section>

      {/* ─── MACHINE SPECS ────────────────────────────────────── */}
      <section className="container-section pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Placeholder para foto de detalhe de peça impressa */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="aspect-[4/3] w-full rounded-3xl bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent border border-white/[0.08] flex flex-col items-center justify-center gap-3">
              <Box className="w-10 h-10 text-white/10" />
              <span className="text-xs font-black uppercase tracking-widest text-white/15 text-center px-6">Close-up de peça impressa</span>
              <span className="text-[10px] text-white/10 font-medium text-center px-8 leading-relaxed">Adicione uma foto de detalhe aqui no admin</span>
            </div>
            <p className="text-[10px] text-white/20 font-medium mt-3 text-center italic">Detalhe de impressão — resolução de camada 0.1mm</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60 mb-4">Nossa máquina</p>
            <h2 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight leading-tight mb-8">
              Bambu Lab P2S<br />
              <span className="text-shimmer italic">Grau industrial.</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Volume máximo", value: "300×300×350mm" },
                { label: "Precisão", value: "±0.2mm" },
                { label: "Resolução", value: "até 0.05mm" },
                { label: "Velocidade", value: "até 500mm/s" },
                { label: "Temperatura max.", value: "320°C" },
                { label: "Material", value: "PLA / PLA+" },
              ].map(spec => (
                <div key={spec.label} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/25 mb-1">{spec.label}</p>
                  <p className="text-sm font-black text-white font-mono">{spec.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── PRODUCT EXAMPLES ─────────────────────────────────── */}
      {exampleProducts.length > 0 && (
        <section className="container-section pb-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60 mb-3">Exemplos reais</p>
              <h2 className="font-display text-3xl font-black uppercase tracking-tight">Do catálogo para as suas mãos</h2>
            </div>
            <Link to="/catalogo" className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-primary transition-colors flex items-center gap-1 shrink-0">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {exampleProducts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
              >
                <Link to={`/produto/${p.id}`} className="block group rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-primary/30 transition-all">
                  <div className="aspect-square overflow-hidden bg-black/30">
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-black uppercase tracking-tight leading-tight line-clamp-2 text-white/60 group-hover:text-white transition-colors">{p.name}</p>
                    <p className="text-xs font-mono font-black text-primary mt-1.5">R$ {p.basePrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ─── QUALITY / GUARANTEE ─────────────────────────────── */}
      <section className="container-section pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <CheckCircle2 className="w-5 h-5" />, title: "Qualidade garantida", desc: "Cada peça passa por inspeção visual antes de ser embalada. Se não atender ao padrão, reimprimimos." },
            { icon: <Shield className="w-5 h-5" />, title: "Embalagem reforçada", desc: "Protegemos com espuma e caixa rígida para que sua peça chegue sem danos, seja qual for a distância." },
            { icon: <Package className="w-5 h-5" />, title: "Rastreamento incluso", desc: "Código de rastreamento dos Correios enviado automaticamente quando seu pedido é despachado." },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex gap-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                {item.icon}
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-tight mb-1.5">{item.title}</h3>
                <p className="text-xs text-white/35 font-medium leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────── */}
      <section className="container-section pb-20">
        <div className="mb-10">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60 mb-3">Tire suas dúvidas</p>
          <h2 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight">Perguntas frequentes</h2>
        </div>

        {/* Search */}
        <div className="max-w-xl mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
            <input
              type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar dúvida..."
              className="w-full h-12 pl-10 pr-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-sm font-medium text-white placeholder-white/20 outline-none focus:border-primary/40 transition-colors"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {search && (
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-white/25">
              {totalResults === 0 ? "Nenhum resultado" : `${totalResults} resultado${totalResults !== 1 ? "s" : ""} encontrado${totalResults !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center">
              <HelpCircle className="w-10 h-10 text-white/10 mx-auto mb-4" />
              <p className="text-white/30 font-bold text-sm mb-6">Nenhuma dúvida encontrada para "{search}"</p>
              <a href={waLink(`Olá INOVAPRO3D! Tenho uma dúvida: ${search}`)} target="_blank" rel="noreferrer"
                className="inline-block px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors">
                Perguntar pelo WhatsApp
              </a>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {filtered.map((cat, i) => (
                <motion.div key={cat.category} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/[0.05]">
                    <cat.icon className="w-4 h-4 text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{cat.category}</h3>
                    <span className="text-[9px] font-black text-white/15 bg-white/5 px-2 py-0.5 rounded-full">{cat.items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {cat.items.map((item, j) => <FAQItem key={j} q={item.q} a={item.a} />)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section className="container-section pb-12">
        <div className="p-8 lg:p-12 rounded-[40px] bg-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
            <div className="max-w-xl text-center lg:text-left">
              <h2 className="text-2xl lg:text-4xl font-black font-display mb-4 text-white uppercase tracking-tighter leading-tight">
                PRONTO PARA CRIAR<br />
                <span className="italic opacity-80 underline underline-offset-8">SEU OBJETO?</span>
              </h2>
              <p className="text-white text-sm font-medium mb-8 opacity-90">
                Explore o catálogo e faça seu pedido agora. Qualquer dúvida, nossa equipe responde em minutos pelo WhatsApp.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link to="/catalogo">
                  <Button className="bg-white text-primary rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px]">
                    VER CATÁLOGO <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <a href={waLink("Olá INOVAPRO3D! Preciso de ajuda.")} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px]">
                    <MessageCircle className="w-4 h-4 mr-2" /> FALAR NO WHATSAPP
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
