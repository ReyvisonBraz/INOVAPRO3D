import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  ShieldCheck,
  Package,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Box,
  Filter,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import type { ShowcaseItem, Product } from "../../types/domain";
import { FloatingBackground } from "../../components/ui/FloatingBackground";
import { Reveal, RevealGroup, RevealItem, RevealText } from "../../components/ui/Reveal";
import { ProductCard } from "../../components/ui/ProductCard";
import { useCart } from "../../contexts/CartContext";
import { toast } from "sonner";

export default function Home() {
  /* ── data state (unchanged) ── */
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { addItem } = useCart();

  /* ── Firebase fetch (unchanged) ── */
  useEffect(() => {
    const fetchShowcase = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "showcase"), orderBy("createdAt", "desc"))
        );
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShowcaseItem));
        setShowcase(items);
        const cats = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
        setCategories(cats as string[]);
      } catch (err) {
        console.error("Error fetching showcase:", err);
      }
    };

    const fetchProducts = async () => {
      try {
        const snap = await getDocs(collection(db, "products"));
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Product))
          .filter((p) => p.active !== false)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        setProducts(items);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };

    Promise.all([fetchShowcase(), fetchProducts()]).finally(() => setLoading(false));
  }, []);

  /* ── derived state (unchanged logic) ── */
  const filteredItems =
    filter === "ALL" ? showcase : showcase.filter((i) => i.category === filter);

  const navigateLightbox = (direction: number) => {
    if (selectedIndex === null) return;
    const nextIndex =
      (selectedIndex + direction + filteredItems.length) % filteredItems.length;
    setSelectedIndex(nextIndex);
  };

  /* ── cart handler ── */
  const handleAdd = (p: Product) => {
    addItem({
      id: p.id,
      name: p.name,
      price: p.basePrice,
      quantity: 1,
      image: p.images?.[0],
      type: "PRODUCT",
    });
    toast.success(`${p.name} adicionado ao carrinho`);
  };

  /* ── featured slice (first 8 active products) ── */
  const featuredProducts = products.slice(0, 8);

  return (
    <div className="relative overflow-hidden bg-surface">

      {/* ═══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center pt-24 pb-20 px-6 overflow-hidden">
        <FloatingBackground variant="grid" />

        <div className="relative z-10 container-section w-full">
          {/* Badge */}
          <Reveal direction="up" delay={0}>
            <div className="flex justify-center mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-[9px] font-black tracking-[0.22em] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                INOVAPRO3D — Impressão 3D · Pará · Brasil
              </span>
            </div>
          </Reveal>

          {/* Main headline */}
          <RevealText
            text="Impressão 3D de Alta Performance"
            highlightFrom={3}
            as="h1"
            className="heading-xl text-center justify-center gap-x-[0.28em] mb-6 text-white"
          />

          {/* Sub-headline */}
          <Reveal direction="up" delay={0.2}>
            <p className="text-sm sm:text-base text-white/50 max-w-lg mx-auto mb-10 font-medium leading-relaxed text-center italic">
              Transformamos arquivos digitais em objetos reais com tecnologia Bambu Lab P2S.
              Acabamento premium, entrega rápida — do protótipo ao produto final.
            </p>
          </Reveal>

          {/* CTA buttons */}
          <Reveal direction="up" delay={0.4}>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
              <Link to="/catalogo" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto group relative px-8 sm:px-10 py-4 sm:py-5 bg-primary rounded-2xl overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95 shadow-[0_20px_50px_-12px_rgba(37,99,235,0.55)] font-display font-black uppercase tracking-tight text-sm sm:text-base text-white flex items-center justify-center gap-3">
                  <Box className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  Ver Catálogo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/upload" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto group relative px-8 sm:px-10 py-4 sm:py-5 bg-transparent border border-white/15 rounded-2xl overflow-hidden transition-all duration-500 hover:border-primary/50 hover:bg-white/[0.04] active:scale-95 font-display font-black uppercase tracking-tight text-sm sm:text-base text-white/60 group-hover:text-white flex items-center justify-center gap-3">
                  <Zap className="w-4 h-4 group-hover:text-primary transition-colors" />
                  Orçamento Instantâneo
                </button>
              </Link>
            </div>
          </Reveal>

          {/* Stats chips */}
          <RevealGroup className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {[
              { label: "48h Entrega" },
              { label: "Bambu Lab P2S" },
              { label: "PLA & PETG" },
              { label: "100% Nacional" },
              { label: "B2B + Varejo" },
            ].map((chip) => (
              <RevealItem key={chip.label}>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 backdrop-blur-sm">
                  <span className="w-1 h-1 rounded-full bg-primary/60" />
                  {chip.label}
                </span>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          NUMBERS STRIP
      ══════════════════════════════════════════════ */}
      <section className="border-y border-white/[0.05] bg-white/[0.015] py-14 sm:py-16">
        <div className="container-section">
          <RevealGroup className="grid grid-cols-2 md:grid-cols-4 gap-10 sm:gap-16">
            {[
              { val: "48h", label: "Entrega Rápida" },
              { val: "20+", label: "Cores Disponíveis" },
              { val: "P2S", label: "Bambu Lab Tech" },
              { val: "500+", label: "Clientes Felizes" },
            ].map((stat) => (
              <RevealItem key={stat.label} className="text-center">
                <p className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-white mb-1.5 brand-gradient-text">
                  {stat.val}
                </p>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                  {stat.label}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FEATURED PRODUCTS
      ══════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 container-section">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6">
          <div>
            <Reveal direction="up">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-3">
                Produtos em Destaque
              </p>
            </Reveal>
            <RevealText
              text="Nosso Catálogo"
              highlightFrom={1}
              as="h2"
              className="heading-lg text-white justify-start gap-x-[0.28em]"
            />
          </div>
          <Reveal direction="up" delay={0.2}>
            <Link to="/catalogo">
              <button className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                Ver todos
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </Reveal>
        </div>

        {/* Products grid */}
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : featuredProducts.length > 0 ? (
          <RevealGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredProducts.map((p) => (
              <RevealItem key={p.id}>
                <ProductCard product={p} onAdd={handleAdd} />
              </RevealItem>
            ))}
          </RevealGroup>
        ) : (
          <div className="h-48 flex items-center justify-center rounded-[32px] border border-dashed border-white/10 bg-white/[0.01]">
            <p className="text-white/20 italic text-sm font-medium">
              Nenhum produto disponível no momento.
            </p>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════
          TECHNOLOGY / WHY US
      ══════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 bg-white/[0.01] border-t border-white/[0.04]">
        <div className="container-section">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-8">
            <div>
              <Reveal direction="up">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-3">
                  Por que a INOVAPRO3D?
                </p>
              </Reveal>
              <RevealText
                text="Tecnologia que Faz a Diferença"
                highlightFrom={3}
                as="h2"
                className="heading-lg text-white justify-start gap-x-[0.28em]"
              />
            </div>
            <Reveal direction="up" delay={0.2}>
              <p className="text-sm text-white/30 max-w-xs font-medium leading-relaxed italic">
                Focamos no acabamento final para que sua peça pareça tudo, menos "feita em casa".
              </p>
            </Reveal>
          </div>

          <RevealGroup className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: Zap,
                title: "Velocidade",
                desc: "Seu orçamento é processado quase que instantaneamente. Produção inicia em até 24h após a aprovação.",
                color: "text-primary",
                glow: "shadow-primary/10",
              },
              {
                icon: ShieldCheck,
                title: "Qualidade",
                desc: "Impressora Bambu Lab P2S com precisão de 0.05mm. Cores vivas, peças resistentes e acabamento premium.",
                color: "text-cyan-400",
                glow: "shadow-cyan-400/10",
              },
              {
                icon: Package,
                title: "Entrega",
                desc: "Entregamos em todo o Brasil. Embalagem projetada para proteger sua peça durante todo o transporte.",
                color: "text-indigo-400",
                glow: "shadow-indigo-400/10",
              },
            ].map((f, i) => (
              <RevealItem key={f.title}>
                <Reveal direction="up" delay={i * 0.1}>
                  <div
                    className={`h-full p-8 rounded-[28px] bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-all duration-500 flex flex-col shadow-xl ${f.glow} group`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-8 bg-white/[0.04] border border-white/[0.08] group-hover:border-white/15 transition-colors ${f.color}`}
                    >
                      <f.icon className="w-5 h-5" />
                    </div>
                    <h3
                      className={`text-xl font-display font-black uppercase tracking-tight mb-4 brand-gradient-text`}
                    >
                      {f.title}
                    </h3>
                    <p className="text-sm text-white/35 font-medium leading-relaxed flex-1">
                      {f.desc}
                    </p>
                  </div>
                </Reveal>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SHOWCASE GALLERY
      ══════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 border-t border-white/[0.04]">
        <div className="container-section">
          {/* Header + filter */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-8">
            <header>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">
                  Galeria INOVAPRO3D
                </span>
              </div>
              <RevealText
                text="Nossas Impressões Privadas"
                highlightFrom={2}
                as="h2"
                className="heading-lg text-white justify-start gap-x-[0.28em]"
              />
            </header>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border transition-all ${
                  filter === "ALL"
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                    : "bg-white/[0.03] border-white/[0.07] text-white/35 hover:text-white hover:border-white/15"
                }`}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border transition-all ${
                    filter === cat
                      ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                      : "bg-white/[0.03] border-white/[0.07] text-white/35 hover:text-white hover:border-white/15"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Gallery masonry */}
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="relative">
              <motion.div
                layout
                className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6"
              >
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, idx) => (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4, delay: (idx % 4) * 0.08 }}
                      onClick={() => setSelectedIndex(idx)}
                      className="break-inside-avoid group relative rounded-[28px] overflow-hidden border border-white/[0.06] bg-surface cursor-pointer shadow-lg hover:shadow-primary/10 hover:border-primary/20 transition-all duration-500"
                    >
                      <div className="relative aspect-auto">
                        <img
                          src={item.image}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-auto object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                          alt={item.title}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute inset-x-0 bottom-0 p-6 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                          {item.category && (
                            <span className="inline-block px-2 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest mb-2">
                              {item.category}
                            </span>
                          )}
                          <h4 className="text-base font-display font-black uppercase tracking-tight text-white mb-1">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-white/40 font-medium line-clamp-2 italic">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Lightbox modal (unchanged logic) */}
              <AnimatePresence>
                {selectedIndex !== null && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-surface/95 backdrop-blur-2xl flex items-center justify-center p-6 sm:p-12"
                  >
                    <button
                      onClick={() => setSelectedIndex(null)}
                      className="absolute top-8 right-8 z-[110] p-4 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Plus className="w-6 h-6 rotate-45" />
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
                      className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-4 sm:p-5 rounded-full bg-white/5 border border-white/10 text-white/20 hover:text-white hover:bg-primary transition-all z-[110]"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
                      className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-4 sm:p-5 rounded-full bg-white/5 border border-white/10 text-white/20 hover:text-white hover:bg-primary transition-all z-[110]"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>

                    <motion.div
                      key={selectedIndex}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="relative max-w-5xl w-full aspect-[4/3] sm:aspect-video rounded-[36px] overflow-hidden shadow-2xl border border-white/10"
                    >
                      <img
                        src={filteredItems[selectedIndex].image}
                        className="w-full h-full object-cover"
                        alt={filteredItems[selectedIndex].title}
                      />
                      <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12 bg-gradient-to-t from-black via-black/40 to-transparent">
                        <div className="flex items-center gap-3 mb-4">
                          {filteredItems[selectedIndex].category && (
                            <span className="px-3 py-1 rounded-full bg-primary text-white text-[9px] font-black uppercase tracking-widest">
                              {filteredItems[selectedIndex].category}
                            </span>
                          )}
                          <span className="text-white/40 text-[9px] font-black uppercase tracking-widest font-mono">
                            {selectedIndex + 1} / {filteredItems.length}
                          </span>
                        </div>
                        <h3 className="text-2xl sm:text-4xl font-display font-black uppercase tracking-tight text-white mb-3">
                          {filteredItems[selectedIndex].title}
                        </h3>
                        {filteredItems[selectedIndex].description && (
                          <p className="text-base text-white/50 font-medium max-w-2xl italic leading-relaxed">
                            {filteredItems[selectedIndex].description}
                          </p>
                        )}
                      </div>
                    </motion.div>

                    {/* Indicators */}
                    <div className="absolute bottom-8 sm:bottom-12 flex justify-center gap-2 z-[110]">
                      {filteredItems.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedIndex(idx)}
                          className={`h-1.5 transition-all duration-500 rounded-full ${
                            idx === selectedIndex
                              ? "w-8 sm:w-10 bg-primary"
                              : "w-1.5 sm:w-2.5 bg-white/10 hover:bg-white/25"
                          }`}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {filteredItems.length === 0 && !loading && (
            <div className="text-center py-20 bg-white/[0.02] rounded-[36px] border border-dashed border-white/10">
              <p className="text-white/20 italic font-medium text-sm">
                Nenhuma peça encontrada nesta categoria.
              </p>
            </div>
          )}

          <div className="mt-14 text-center">
            <Reveal direction="up">
              <Link to="/catalogo">
                <button className="group inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-white/[0.04] border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white hover:text-surface hover:border-white transition-all duration-300">
                  Explorar Catálogo Completo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════ */}
      <section className="pb-28 sm:pb-36 container-section">
        <div className="relative rounded-[48px] sm:rounded-[56px] overflow-hidden border border-white/[0.07]">
          <FloatingBackground subtle />

          <div className="relative z-10 px-8 sm:px-16 lg:px-24 py-20 sm:py-28 flex flex-col lg:flex-row items-center justify-between gap-12 sm:gap-16">
            {/* Copy */}
            <div className="flex-1 text-center lg:text-left">
              <Reveal direction="up">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-4">
                  Pronto para Imprimir?
                </p>
              </Reveal>
              <RevealText
                text="Transforme Sua Ideia em Realidade"
                highlightFrom={3}
                as="h2"
                className="heading-lg text-white justify-center lg:justify-start gap-x-[0.28em] mb-6"
              />
              <Reveal direction="up" delay={0.2}>
                <p className="text-sm sm:text-base text-white/40 max-w-md font-medium leading-relaxed italic mb-10 mx-auto lg:mx-0">
                  Faça upload do seu modelo 3D agora e receba um orçamento em minutos.
                  A melhor tecnologia de impressão do Pará.
                </p>
              </Reveal>
              <Reveal direction="up" delay={0.35}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link to="/upload">
                    <Button
                      size="lg"
                      className="h-14 px-8 rounded-2xl gap-3 font-display font-black uppercase tracking-tight text-sm bg-primary text-white hover:scale-105 transition-transform shadow-2xl shadow-primary/25"
                    >
                      Solicitar Orçamento
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/calculadora">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 px-8 rounded-2xl gap-3 font-display font-black uppercase tracking-tight text-sm border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all"
                    >
                      Calculadora de Filamento
                    </Button>
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* Decorative card — desktop only */}
            <Reveal direction="left" delay={0.3} className="relative z-10 hidden xl:block shrink-0">
              <div className="w-[420px] h-[320px] rounded-[40px] bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/30" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                      Node Online: SPO-01
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.08] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "78%" }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                      className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] text-white/30 uppercase font-black mb-1">Peça Atual</p>
                      <p className="font-display font-black text-lg uppercase tracking-tight text-white">
                        COLECIONAVEL-PLA
                      </p>
                    </div>
                    <Monitor className="w-7 h-7 text-white/15" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
                    <div>
                      <p className="text-[8px] text-white/25 uppercase font-bold mb-0.5">Material</p>
                      <p className="text-xs font-mono font-bold text-white/70">PLA-SILK</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-white/25 uppercase font-bold mb-0.5">Progresso</p>
                      <p className="text-xs font-mono font-bold text-white/70">78.4%</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-white/25 uppercase font-bold mb-0.5">Resolução</p>
                      <p className="text-xs font-mono font-bold text-white/70">0.05mm</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
