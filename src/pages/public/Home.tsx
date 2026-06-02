import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  ShieldCheck,
  Package,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
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
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center pt-28 pb-16 px-6 overflow-hidden">
        <FloatingBackground variant="grid" />

        {/* Strong radial spotlight behind content */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 container-section w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* LEFT — Copy */}
            <div>
              {/* Badge */}
              <Reveal direction="up" delay={0}>
                <div className="mb-8">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-[9px] font-black tracking-[0.22em] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Bambu Lab P2S · Pará · Brasil
                  </span>
                </div>
              </Reveal>

              {/* Headline */}
              <RevealText
                text="Impressão 3D de Alta Performance"
                highlightFrom={3}
                as="h1"
                className="text-5xl sm:text-6xl lg:text-7xl font-display font-black uppercase tracking-tight leading-[0.9] justify-start gap-x-[0.2em] mb-6 text-white flex-wrap"
              />

              {/* Sub-headline */}
              <Reveal direction="up" delay={0.25}>
                <p className="text-base sm:text-lg text-white/45 max-w-md mb-10 font-medium leading-relaxed">
                  Transformamos seus arquivos STL em objetos reais com acabamento premium.
                  Do protótipo ao produto final — rápido, preciso e confiável.
                </p>
              </Reveal>

              {/* CTAs */}
              <Reveal direction="up" delay={0.4}>
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <Link to="/catalogo">
                    <button className="group w-full sm:w-auto relative px-8 py-4 bg-primary rounded-2xl font-display font-black uppercase tracking-tight text-base text-white flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_20px_60px_-12px_rgba(37,99,235,0.7)]">
                      Ver Catálogo
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                  <Link to="/calculadora">
                    <button className="group w-full sm:w-auto px-8 py-4 border border-white/15 rounded-2xl font-display font-black uppercase tracking-tight text-base text-white/60 hover:text-white hover:border-white/30 hover:bg-white/5 flex items-center justify-center gap-3 transition-all duration-300">
                      <Zap className="w-5 h-5 group-hover:text-primary transition-colors" />
                      Calcular Preço
                    </button>
                  </Link>
                </div>
              </Reveal>

              {/* Stats chips */}
              <RevealGroup className="flex flex-wrap gap-3">
                {["48h Entrega", "PLA & PETG", "B2B + Varejo", "100% Nacional"].map((chip) => (
                  <RevealItem key={chip}>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
                      <span className="w-1 h-1 rounded-full bg-primary/70" />
                      {chip}
                    </span>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>

            {/* RIGHT — Floating product highlight banners */}
            <div className="relative hidden lg:flex items-center justify-center min-h-[520px]">
              {/* Ambient glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-72 h-72 bg-primary/15 rounded-full blur-[100px]" />
              </div>

              {/* Card 1 — top right */}
              <FloatingCard
                product={featuredProducts[0]}
                loading={loading}
                style="absolute top-4 right-0"
                delay={0}
                amplitude={-14}
                duration={5.5}
                badge="Popular"
                badgeColor="bg-primary/20 text-primary border-primary/30"
              />

              {/* Card 2 — center left */}
              <FloatingCard
                product={featuredProducts[1]}
                loading={loading}
                style="absolute top-1/2 -translate-y-1/2 left-0"
                delay={1.2}
                amplitude={12}
                duration={7}
                badge="Novo"
                badgeColor="bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
              />

              {/* Card 3 — bottom right */}
              <FloatingCard
                product={featuredProducts[2]}
                loading={loading}
                style="absolute bottom-4 right-8"
                delay={0.6}
                amplitude={-10}
                duration={6.2}
                badge="Destaque"
                badgeColor="bg-cyan-500/15 text-cyan-400 border-cyan-500/25"
              />

              {/* Live indicator pill */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                  Impressora Online — P2S
                </span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border border-white/20 flex items-start justify-center pt-2"
          >
            <div className="w-1 h-2.5 rounded-full bg-white/40" />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          NUMBERS STRIP
      ══════════════════════════════════════════════ */}
      <section className="border-y border-white/[0.06] bg-white/[0.02] py-16 sm:py-20">
        <div className="container-section">
          <RevealGroup className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
            {[
              { val: "48h", label: "Entrega Rápida" },
              { val: "20+", label: "Cores Disponíveis" },
              { val: "P2S", label: "Bambu Lab Tech" },
              { val: "100%", label: "Made in Pará" },
            ].map((stat) => (
              <RevealItem key={stat.label} className="text-center">
                <p className="text-5xl sm:text-6xl lg:text-7xl font-display font-black mb-2 brand-gradient-text">
                  {stat.val}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
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

            {/* Stats block — desktop only */}
            <Reveal direction="left" delay={0.3} className="relative z-10 hidden lg:block shrink-0">
              <div className="grid grid-cols-2 gap-4 w-[320px]">
                {[
                  { val: "48h", label: "Entrega média" },
                  { val: "0.05mm", label: "Precisão P2S" },
                  { val: "PLA + PETG", label: "Materiais" },
                  { val: "B2B", label: "Atendimento" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="p-5 rounded-[20px] bg-white/[0.04] border border-white/[0.07] hover:border-primary/20 transition-colors"
                  >
                    <p className="text-xl font-display font-black brand-gradient-text mb-1">{s.val}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{s.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Floating product highlight card ─────────────────────────── */
function FloatingCard({
  product,
  loading,
  style,
  delay,
  amplitude,
  duration,
  badge,
  badgeColor,
}: {
  product?: Product;
  loading: boolean;
  style: string;
  delay: number;
  amplitude: number;
  duration: number;
  badge: string;
  badgeColor: string;
}) {
  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <motion.div
      animate={{ y: [0, amplitude, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
      className={`${style} z-10 w-[220px]`}
    >
      <div className="rounded-[20px] bg-white/[0.06] border border-white/10 backdrop-blur-xl p-3 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] hover:border-white/20 transition-colors duration-300">
        {loading || !product ? (
          /* Skeleton */
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-xl bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-24 rounded bg-white/10" />
              <div className="h-2 w-16 rounded bg-white/[0.07]" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20 text-lg">
                  ◻
                </div>
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-tight text-white leading-tight truncate">
                {product.name}
              </p>
              <p className="text-[10px] font-bold text-white/40 mt-0.5">
                {brl(product.basePrice)}
              </p>
            </div>
            {/* Badge */}
            <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wide ${badgeColor}`}>
              {badge}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
