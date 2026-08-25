import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { PageSEO } from "../../components/seo/PageSEO";
import {
  ArrowDown,
  ArrowRight,
  Box,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Layers3,
  MapPin,
  PackageCheck,
  Plus,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { orderBy } from "firebase/firestore";
import { Button } from "../../components/ui/Button";
import { FloatingBackground } from "../../components/ui/FloatingBackground";
import { CategoryExplorer } from "../../components/ui/CategoryExplorer";
import { Reveal, RevealGroup, RevealItem, RevealText } from "../../components/ui/Reveal";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { categorySlug } from "../../lib/categoryTree";
import { filterProductsByCategory } from "../../lib/productCategory";
import type { Category, Product, ShowcaseItem } from "../../types/domain";

const heroCopyOptions = [
  {
    lines: [
      { text: "Você imagina.", accent: false },
      { text: "A gente imprime.", accent: true },
    ],
    body: "Da ideia à peça na sua mesa. Escolha no catálogo ou envie seu projeto — a gente cuida do resto.",
  },
  {
    lines: [
      { text: "Não é só um modelo.", accent: false },
      { text: "É peça de verdade.", accent: true },
    ],
    body: "Sai da impressora calibrada, embalada e pronta pra usar. Sem 'quase perfeito' — perfeito.",
  },
  {
    lines: [
      { text: "Do Pará", accent: false },
      { text: "pro Brasil inteiro.", accent: true },
    ],
    body: "Impressa em Santa Maria do Pará, embalada com capricho e enviada pra qualquer canto do país.",
  },
  {
    lines: [
      { text: "Sua ideia", accent: false },
      { text: "vira objeto real.", accent: true },
    ],
    body: "De arquivo digital a peça física em 48h. Escolha, pague, receba — sem enrolação.",
  },
];

export default function Home() {
  const { data: showcase, loading: showcaseLoading } = useFirestoreCollection<ShowcaseItem>(
    "showcase",
    {
      constraints: [orderBy("createdAt", "desc")],
    },
  );
  const { data: products, loading: productsLoading } = useFirestoreCollection<Product>("products", {
    transform: (items) =>
      items
        .filter((product) => product.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  });
  const { data: categoriesData, loading: categoriesLoading } = useFirestoreCollection<Category>(
    "categories",
    {
      transform: (items) => items.filter((c) => c.active !== false),
      silent: true,
    },
  );
  const loading = showcaseLoading || productsLoading;
  const categories = useMemo(
    () => Array.from(new Set(showcase.map((item) => item.category).filter(Boolean))) as string[],
    [showcase],
  );

  const rootCategoryCards = useMemo(() => {
    const byOrder = (a: Category, b: Category) => (a.order ?? 999) - (b.order ?? 999);
    return categoriesData
      .filter((c) => !c.parentId)
      .sort(byOrder)
      .map((category) => {
        const categoryProducts = filterProductsByCategory(categoriesData, products, category.id, {
          includeDescendants: true,
        });
        const cover = category.image || categoryProducts[0]?.images?.[0];
        return {
          category,
          cover,
          count: categoryProducts.length,
          href: `/catalogo?categoria=${categorySlug(categoriesData, category.id)}`,
        };
      });
  }, [categoriesData, products]);
  const categoriesReady = !categoriesLoading && !productsLoading;
  const [filter, setFilter] = useState("ALL");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Trap browser-back while lightbox is open
  const lightboxOpen = selectedIndex !== null;
  useEffect(() => {
    if (!lightboxOpen) return;
    const base = window.location.pathname + window.location.search;
    window.history.pushState({ inovapro3dOverlay: "preview" }, "", base + "#preview");
    const handler = () => setSelectedIndex(null);
    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("popstate", handler);
    };
  }, [lightboxOpen]);

  const closeLightbox = () => {
    if (window.location.hash === "#preview") {
      window.history.back();
    } else {
      setSelectedIndex(null);
    }
  };
  // Escopado à seção do hero (em vez do documento inteiro) — evita recalcular
  // esse scroll-tracking pela página toda enquanto o usuário rola qualquer
  // outra seção, que era uma das causas do "piscar" ao rolar.
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.2]);

  const filteredItems =
    filter === "ALL" ? showcase : showcase.filter((item) => item.category === filter);

  const navigateLightbox = (direction: number) => {
    if (selectedIndex === null || filteredItems.length === 0) return;
    setSelectedIndex((selectedIndex + direction + filteredItems.length) % filteredItems.length);
  };

  const scrollToCatalog = () => {
    document
      .getElementById("catalogo-preview")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative overflow-hidden">
      <PageSEO
        title="INOVAPRO3D"
        description="Impressão 3D com acabamento profissional. Catálogo com centenas de peças prontas, produção em 48h e entrega para todo o Brasil."
        path="/"
      />
      <section
        ref={heroRef}
        className="relative overflow-hidden px-4 pb-8 pt-14 sm:px-6 sm:pb-10 sm:pt-20 lg:px-8"
      >
        {/* Brilho sutil único — o body já é escuro (#020617), então aqui só um
            glow leve no topo, sem empilhar outra camada escura por cima
            (era isso que deixava o topo pesado/turvo). */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,179,237,0.10),transparent_55%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="container-section relative z-10 flex flex-col items-start py-10 lg:py-16"
        >
          <Reveal direction="up" delay={0.08}>
            <AnimatedHeroCopy />
          </Reveal>

          <Reveal direction="up" delay={0.42}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/catalogo" className="relative w-full sm:w-auto">
                {products.length > 0 && (
                  <span className="catalog-cta-badge inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-[0_6px_18px_-4px_rgba(37,99,235,0.65)]">
                    +{products.length} modelos
                  </span>
                )}
                <button className="catalog-cta group relative flex h-[3.75rem] w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white px-8 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_24px_80px_-18px_rgba(255,255,255,0.55)] transition-transform duration-300 hover:-translate-y-1 active:translate-y-0 sm:w-auto">
                  Ver o catálogo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
              <button
                type="button"
                onClick={scrollToCatalog}
                className="group flex h-[3.75rem] w-full items-center justify-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-7 text-sm font-black uppercase tracking-[0.12em] text-white/70 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.24] hover:bg-white/[0.08] hover:text-white sm:w-auto"
              >
                Explorar peças
                <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-1" />
              </button>
            </div>
          </Reveal>

          <Reveal direction="up" delay={0.56}>
            <div className="mt-10 inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.035] px-5 py-3 backdrop-blur-xl">
              <MapPin className="h-4 w-4 shrink-0 text-secondary" />
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white/[0.55]">
                Sai daqui, <span className="text-white">Santa Maria do Pará — PA</span>, e chega em
                qualquer canto do Brasil
              </p>
            </div>
          </Reveal>
        </motion.div>
      </section>

      <CategoryExplorer />

      <section className="relative border-y border-white/[0.06] bg-white/[0.025] py-4">
        <div className="homepage-marquee flex gap-8 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.24em] text-white/[0.28]">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex min-w-full items-center justify-around gap-8">
              <span>acabamento impecável</span>
              <span>acabamento profissional</span>
              <span>impressoras de última geração</span>
              <span>entrega nacional</span>
              <span>materiais de alta qualidade</span>
              <span>peças únicas</span>
              <span>qualidade garantida</span>
            </div>
          ))}
        </div>
      </section>

      <section id="catalogo-preview" className="scroll-mt-28 py-14 sm:py-20">
        <div className="container-section">
          <div className="mb-10 flex flex-col gap-6 sm:mb-12 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Reveal direction="up">
                <p className="section-label-accent mb-4">Catálogo</p>
              </Reveal>
              <RevealText
                text="Escolha por categoria."
                highlightFrom={2}
                as="h2"
                className="heading-lg justify-start text-white"
              />
            </div>
            <Reveal direction="up" delay={0.16}>
              <Link
                to="/catalogo"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-[10px] font-black uppercase tracking-[0.18em] text-white/[0.55] transition-all hover:border-white/20 hover:bg-white hover:text-slate-950"
              >
                Ver catálogo completo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>

          {!categoriesReady ? (
            <CategorySkeletonGrid />
          ) : rootCategoryCards.length > 0 ? (
            <RevealGroup className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {rootCategoryCards.map(({ category, cover, count, href }) => (
                <RevealItem key={category.id}>
                  <Link
                    to={href}
                    className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.03] shadow-xl shadow-black/20 transition-all duration-500 hover:-translate-y-1 hover:border-white/[0.18]"
                  >
                    {cover ? (
                      <img
                        src={cover}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover opacity-80 saturate-[0.9] transition-all duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:saturate-100"
                        alt={category.name}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
                        <Box className="h-9 w-9 text-dim" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent opacity-85" />
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                      <h3 className="font-display text-base font-black uppercase leading-tight text-white sm:text-lg">
                        {category.name}
                      </h3>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-widest text-white/[0.5]">
                        {count} modelo{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
              <Box className="mx-auto mb-4 h-9 w-9 text-dim" />
              <p className="text-sm font-medium text-white/[0.35]">
                Nenhuma categoria disponivel no momento.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="container-section">
          <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="section-label-accent">Galeria real</span>
              </div>
              <RevealText
                text="Prints reais. Da máquina às suas mãos."
                highlightFrom={2}
                as="h2"
                className="heading-lg justify-start text-white"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter("ALL")}
                className={`rounded-full border px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition-all ${
                  filter === "ALL"
                    ? "border-white bg-white text-slate-950"
                    : "border-white/10 bg-white/[0.04] text-white/40 hover:text-white"
                }`}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`rounded-full border px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition-all ${
                    filter === cat
                      ? "border-white bg-white text-slate-950"
                      : "border-white/10 bg-white/[0.04] text-white/40 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
          ) : filteredItems.length > 0 ? (
            <motion.div className="columns-1 gap-5 space-y-5 sm:columns-2 lg:columns-3">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, idx) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    initial={{ opacity: 0, scale: 0.96, y: 18 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.45, delay: (idx % 3) * 0.06 }}
                    onClick={() => setSelectedIndex(idx)}
                    className="group relative w-full break-inside-avoid overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.03] text-left shadow-xl shadow-black/20"
                  >
                    <img
                      src={item.image}
                      loading="lazy"
                      decoding="async"
                      className="h-auto w-full object-cover opacity-75 saturate-[0.85] transition-all duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:saturate-100"
                      alt={item.title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-80" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      {item.category && (
                        <span className="mb-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-slate-950">
                          {item.category}
                        </span>
                      )}
                      <h3 className="font-display text-lg font-black uppercase leading-tight text-white">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-white/[0.45]">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
              <p className="text-sm font-medium text-white/[0.35]">
                Nenhuma peça encontrada nesta categoria.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="container-section py-20 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <Reveal direction="up">
              <p className="section-label-accent mb-4">Por que a INOVAPRO3D?</p>
            </Reveal>
            <RevealText
              text="Experiência de loja. Sem a loja física."
              highlightFrom={2}
              as="h2"
              className="heading-lg justify-start text-white"
            />
          </div>
          <Reveal direction="up" delay={0.18}>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-white/[0.44] sm:text-base">
              Do valor inicial ao acabamento, cada detalhe foi pensado para você escolher com
              confiança — sem precisar mandar mensagem antes de decidir. Quando precisar de algo
              único, o orçamento personalizado entra no mesmo padrão de qualidade.
            </p>
          </Reveal>
        </div>

        <RevealGroup className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Escolha. Pague. Receba.",
              text: "Catálogo visual com fotos reais, preço inicial e botão de compra. Sem negociação demorada, sem surpresa no final.",
            },
            {
              icon: Ruler,
              title: "Especificações honestas",
              text: "Dimensões, peso e material de cada peça exibidos com clareza — para você saber exatamente o que está comprando.",
            },
            {
              icon: ShieldCheck,
              title: "Qualidade que se vê",
              text: "Equipamentos de última geração. Materiais de alta qualidade. Resultado que parece produto de loja — porque é produto de loja.",
            },
          ].map((item) => (
            <RevealItem key={item.title}>
              <div className="spotlight-card group h-full rounded-[24px] border border-white/[0.08] bg-white/[0.035] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-white/[0.16]">
                <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-cyan-300">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl font-black leading-tight text-white">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm font-medium leading-relaxed text-white/40">
                  {item.text}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section className="container-section py-20 sm:py-28">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal direction="right" className="min-h-[420px]">
            <div className="relative h-full overflow-hidden rounded-[32px] border border-white/[0.08] bg-white/[0.03]">
              <FloatingBackground subtle />
              <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/70" />
              <div className="relative z-10 flex h-full flex-col justify-between p-7 sm:p-10">
                <div>
                  <p className="section-label-accent mb-5">Como funciona</p>
                  <h2 className="max-w-xl font-display text-[clamp(1.875rem,1.5rem+1.6vw,3rem)] font-black uppercase leading-[0.95] text-white">
                    Do clique ao objeto real, sem complicação.
                  </h2>
                </div>
                <Link to="/catalogo">
                  <Button className="h-[3.25rem] rounded-2xl px-6 text-[10px] font-black uppercase tracking-[0.18em]">
                    Escolher no catálogo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>

          <RevealGroup className="grid gap-5">
            {[
              {
                icon: Layers3,
                title: "Escolha no catálogo",
                text: "Dezenas de modelos prontos para pedir agora mesmo. Escolha o material, a cor e a quantidade — tudo em poucos cliques.",
              },
              {
                icon: Clock3,
                title: "Validação e produção",
                text: "Avaliamos o modelo, a resistência e o acabamento. Sua peça entra em produção com equipamento calibrado.",
              },
              {
                icon: PackageCheck,
                title: "Embalado e entregue",
                text: "Sai protegida, pronta para usar, presentear ou revender. Entrega nacional com rastreio.",
              },
            ].map((step, index) => (
              <RevealItem key={step.title}>
                <div className="grid grid-cols-[auto_1fr] gap-5 rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-white/[0.28]">
                      Etapa 0{index + 1}
                    </p>
                    <h3 className="font-display text-xl font-black leading-tight text-white">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-white/[0.42]">
                      {step.text}
                    </p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="container-section pb-28 pt-8 sm:pb-36">
        <div className="relative overflow-hidden rounded-[36px] border border-white/[0.08] bg-white/[0.04] px-6 py-12 sm:px-10 sm:py-16 lg:px-16">
          <FloatingBackground subtle />
          <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="section-label-accent mb-4">Comece agora</p>
              <h2 className="max-w-3xl font-display text-[clamp(1.875rem,1.35rem+2.4vw,3.75rem)] font-black uppercase leading-[0.92] text-white">
                Sua próxima peça está a um clique de distância.
              </h2>
              <p className="mt-5 max-w-2xl text-sm font-medium leading-relaxed text-white/[0.45] sm:text-base">
                Escolha entre dezenas de modelos prontos no catálogo e receba em casa. Acabamento
                profissional, materiais de qualidade e entrega para todo o Brasil.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link to="/catalogo">
                <button className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white px-7 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 transition-transform hover:-translate-y-1 lg:w-64">
                  Abrir catálogo
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link to="/conhecimento">
                <button className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-7 text-[10px] font-black uppercase tracking-[0.18em] text-white/[0.64] transition-all hover:border-white/[0.24] hover:text-white lg:w-64">
                  Como funciona
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Lightbox
        items={filteredItems}
        selectedIndex={selectedIndex}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
        onSelect={setSelectedIndex}
      />
    </div>
  );
}

function AnimatedHeroCopy() {
  const [activeCopy, setActiveCopy] = useState(0);
  const copy = heroCopyOptions[activeCopy];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveCopy((current) => (current + 1) % heroCopyOptions.length);
    }, 6800);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div>
      <motion.div
        layout
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative min-h-[7.5rem] sm:min-h-[9rem] lg:min-h-[10.5rem]"
      >
        <AnimatePresence mode="wait">
          <motion.h1
            key={activeCopy}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl font-display font-black uppercase text-white [text-wrap:balance]"
          >
            {copy.lines.map((line, index) =>
              line.accent ? (
                <span
                  key={`${line.text}-${index}`}
                  className="brand-gradient-text mt-1 block max-w-full text-balance text-[clamp(2.4rem,6vw,6rem)] leading-[1.02]"
                >
                  {line.text}
                </span>
              ) : (
                <span
                  key={`${line.text}-${index}`}
                  className="mb-1 block max-w-full text-balance text-[clamp(1.4rem,3.4vw,2.5rem)] font-bold leading-[1.15] tracking-wide text-white/55"
                >
                  {line.text}
                </span>
              ),
            )}
          </motion.h1>
        </AnimatePresence>
      </motion.div>

      <div className="relative mt-6 min-h-[4.5rem] max-w-2xl sm:min-h-[3.75rem]">
        <AnimatePresence mode="wait">
          <motion.p
            key={copy.body}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            className="text-base font-medium leading-relaxed text-white/[0.58] sm:text-lg"
          >
            {copy.body}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-5 flex max-w-2xl flex-wrap items-center gap-x-4 gap-y-2 border-l border-cyan-300/45 pl-4 text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
        <span>Catálogo</span>
        <span className="hidden h-px w-8 bg-white/16 sm:inline-block" />
        <span>Sob encomenda</span>
        <span className="hidden h-px w-8 bg-white/16 sm:inline-block" />
        <span>Envio Brasil</span>
      </div>
    </div>
  );
}

function CategorySkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="aspect-[4/5] animate-pulse overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

function Lightbox({
  items,
  selectedIndex,
  onClose,
  onNavigate,
  onSelect,
}: {
  items: ShowcaseItem[];
  selectedIndex: number | null;
  onClose: () => void;
  onNavigate: (direction: number) => void;
  onSelect: (index: number) => void;
}) {
  if (selectedIndex === null || !items[selectedIndex]) return null;
  const item = items[selectedIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-surface/96 p-4 backdrop-blur-2xl sm:p-10"
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-[110] rounded-full border border-white/10 bg-white/[0.06] p-4 text-white/[0.45] transition-all hover:bg-white/10 hover:text-white"
          aria-label="Fechar galeria"
        >
          <Plus className="h-6 w-6 rotate-45" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onNavigate(-1);
          }}
          className="absolute left-4 top-1/2 z-[110] -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.06] p-4 text-white/[0.35] transition-all hover:bg-white hover:text-slate-950 sm:left-8"
          aria-label="Imagem anterior"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onNavigate(1);
          }}
          className="absolute right-4 top-1/2 z-[110] -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.06] p-4 text-white/[0.35] transition-all hover:bg-white hover:text-slate-950 sm:right-8"
          aria-label="Proxima imagem"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <motion.div
          key={item.id}
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="relative aspect-[4/3] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 shadow-2xl sm:aspect-video"
        >
          <img
            src={item.image}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
            alt={item.title}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/45 to-transparent p-6 sm:p-10">
            <div className="mb-3 flex items-center gap-3">
              {item.category && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-950">
                  {item.category}
                </span>
              )}
              <span className="font-mono text-xs font-black uppercase tracking-widest text-white/[0.42]">
                {selectedIndex + 1} / {items.length}
              </span>
            </div>
            <h3 className="font-display text-2xl font-black uppercase leading-none text-white sm:text-4xl">
              {item.title}
            </h3>
            {item.description && (
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-white/[0.55] sm:text-base">
                {item.description}
              </p>
            )}
          </div>
        </motion.div>

        <div className="absolute bottom-6 z-[110] flex justify-center gap-2 sm:bottom-10">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => onSelect(index)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === selectedIndex
                  ? "w-9 bg-white"
                  : "w-2 bg-white/[0.16] hover:bg-white/[0.32]"
              }`}
              aria-label={`Abrir imagem ${index + 1}`}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
