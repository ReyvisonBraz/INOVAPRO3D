import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Search, ShoppingCart, Box, ChevronRight, ChevronLeft, SlidersHorizontal } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../../services/firebase";
import { modelCache } from "../../lib/modelCache";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../contexts/CartContext";
import { toast } from "sonner";
import { FloatingBackground } from "../../components/ui/FloatingBackground";
import { Reveal, RevealGroup, RevealItem, RevealText } from "../../components/ui/Reveal";
import { ProductCard } from "../../components/ui/ProductCard";
import type { Product, ShowcaseItem } from "../../types/domain";

export default function Catalog() {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [activeSlide, setActiveSlide] = useState(0);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch Showcase once
      const sSnap = await getDocs(collection(db, "showcase"));
      setShowcase(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShowcaseItem)));

      // Keep this query index-free so newly created Firebase projects show products immediately.
      const pSnap = await getDocs(collection(db, "products"));
      const newProducts = pSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Product))
        .filter(product => product.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

      setProducts(newProducts);

      // Prefetch models
      const modelUrls = newProducts
        .map(p => p.modelUrl)
        .filter((url): url is string => !!url);
      if (modelUrls.length > 0) {
        modelCache.prefetch(modelUrls);
      }

    } catch (err) {
      console.error("Catalog Initial Fetch Error:", err);
      handleFirestoreError(err, OperationType.LIST, "products/showcase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (showcase.length === 0) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % showcase.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [showcase.length]);

  const categories = ["TODOS", "DECORAÇÃO", "FANTASIA", "TOOLING", "UTILITÁRIOS"];

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.basePrice,
      quantity: 1,
      image: product.images[0],
      type: 'PRODUCT'
    });
    toast.success(`${product.name} adicionado!`, {
      icon: <ShoppingCart className="w-4 h-4" />,
    });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "TODOS" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-surface">

      {/* ================================================================ */}
      {/* PAGE HEADER — aurora bg + reveal text                            */}
      {/* ================================================================ */}
      <div className="relative overflow-hidden pt-20 pb-14 sm:pt-28 sm:pb-16">
        <FloatingBackground variant="grid" subtle />

        <div className="container-section relative z-10">
          {/* Eyebrow */}
          <Reveal direction="up" delay={0}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.35em] text-primary">
                Catálogo Oficial
              </span>
            </div>
          </Reveal>

          {/* Main headline */}
          <RevealText
            text="Inventário 3D"
            highlightFrom={1}
            as="h1"
            className="heading-xl mb-4 gap-x-3"
          />

          <Reveal direction="up" delay={0.25}>
            <p className="text-sm sm:text-base text-white/45 max-w-lg leading-relaxed font-medium">
              Modelos exclusivos otimizados para PLA · impressos na Bambu Lab P2S
              com a precisão que o seu projeto merece.
            </p>
          </Reveal>

          {/* Stats row */}
          <Reveal direction="up" delay={0.38}>
            <div className="mt-8 flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-white/25">
              <span>{products.length} modelos</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span>{categories.length - 1} categorias</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span>Pará · Brasil</span>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="container-section pb-24">

        {/* ============================================================== */}
        {/* SHOWCASE CAROUSEL                                               */}
        {/* ============================================================== */}
        {showcase.length > 0 && (
          <section className="mb-14 sm:mb-20" aria-label="Produtos em Destaque">
            <Reveal direction="up" delay={0}>
              <div className="relative h-[200px] sm:h-[300px] lg:h-[400px] rounded-[24px] sm:rounded-[32px] overflow-hidden border border-white/8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10" />
                    <img
                      src={showcase[activeSlide].image}
                      className="w-full h-full object-cover"
                      alt={showcase[activeSlide].title}
                    />
                    <div className="absolute bottom-6 left-6 lg:bottom-12 lg:left-12 z-20 max-w-xl">
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <span className="inline-block px-2.5 py-1 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-md mb-3 shadow-lg shadow-primary/30">
                          {showcase[activeSlide].category}
                        </span>
                        <h2 className="text-xl sm:text-2xl lg:text-4xl font-black font-display uppercase tracking-tight text-white mb-1 leading-none">
                          {showcase[activeSlide].title}
                        </h2>
                        <p className="text-white/50 text-[10px] sm:text-xs font-medium">
                          Trabalho real · INOVAPRO3D
                        </p>
                      </motion.div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Dot indicators */}
                <div className="absolute top-5 right-5 z-20 flex gap-1.5">
                  {showcase.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => setActiveSlide(i)}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        activeSlide === i ? "w-6 bg-primary" : "w-2 bg-white/20 hover:bg-white/40"
                      }`}
                    />
                  ))}
                </div>

                {/* Nav arrows */}
                <div className="absolute bottom-6 right-6 lg:bottom-8 lg:right-8 z-20 flex gap-2">
                  <button
                    onClick={() => setActiveSlide(prev => (prev - 1 + showcase.length) % showcase.length)}
                    className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                    aria-label="Slide anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveSlide(prev => (prev + 1) % showcase.length)}
                    className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                    aria-label="Próximo slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* ============================================================== */}
        {/* SEARCH + CATEGORY FILTER BAR                                   */}
        {/* ============================================================== */}
        <Reveal direction="up" delay={0}>
          <div className="flex flex-col gap-4 mb-10">
            {/* Search row */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar modelos…"
                  aria-label="Buscar modelos"
                  className="w-full bg-white/5 border border-white/8 rounded-2xl px-5 py-3 pl-12 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-white/25 text-white"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {/* Filter icon button */}
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/8 rounded-2xl text-white/40 hover:text-white hover:border-white/15 transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                aria-label="Filtros adicionais"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filtrar</span>
              </button>
            </div>

            {/* Category chips */}
            <nav
              className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
              aria-label="Filtrar por categoria"
            >
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                    selectedCategory === cat
                      ? "bg-primary border-primary text-white shadow-lg shadow-primary/25"
                      : "bg-white/5 border-white/8 text-white/40 hover:bg-white/10 hover:text-white/70 hover:border-white/15"
                  }`}
                >
                  {cat}
                </button>
              ))}
              {/* Result count */}
              {!loading && (
                <span className="ml-auto flex-shrink-0 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/20 self-center">
                  {filteredProducts.length} resultado{filteredProducts.length !== 1 ? "s" : ""}
                </span>
              )}
            </nav>
          </div>
        </Reveal>

        {/* ============================================================== */}
        {/* LOADING — skeleton grid                                         */}
        {/* ============================================================== */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[28px] overflow-hidden border border-white/5 bg-white/[0.02] animate-pulse"
              >
                <div className="aspect-[4/5] bg-white/5" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-white/5 rounded-lg w-3/4" />
                  <div className="h-3 bg-white/5 rounded-lg w-full" />
                  <div className="h-3 bg-white/5 rounded-lg w-2/3" />
                  <div className="pt-2 flex items-end justify-between border-t border-white/5">
                    <div className="space-y-1.5">
                      <div className="h-2.5 bg-white/5 rounded w-16" />
                      <div className="h-6 bg-white/5 rounded w-24" />
                    </div>
                    <div className="h-11 w-28 bg-white/5 rounded-2xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* PRODUCTS GRID                                                   */}
        {/* ============================================================== */}
        {!loading && filteredProducts.length > 0 && (
          <RevealGroup
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            stagger={0.07}
          >
            {filteredProducts.map(product => (
              <RevealItem key={product.id}>
                <ProductCard
                  product={product}
                  onAdd={handleAddToCart}
                />
              </RevealItem>
            ))}
          </RevealGroup>
        )}

        {/* ============================================================== */}
        {/* EMPTY STATE                                                     */}
        {/* ============================================================== */}
        {!loading && filteredProducts.length === 0 && (
          <Reveal direction="up" delay={0.1}>
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" />
                <div className="relative w-20 h-20 rounded-full border border-white/8 bg-white/[0.03] flex items-center justify-center">
                  <Box className="w-8 h-8 text-white/20" />
                </div>
              </div>
              <h3 className="text-lg font-black font-display uppercase tracking-tight text-white/50 mb-2">
                Nenhum modelo encontrado
              </h3>
              <p className="text-sm text-white/25 max-w-xs leading-relaxed">
                Tente ajustar os filtros ou a busca para encontrar o que procura.
              </p>
              {(searchTerm || selectedCategory !== "TODOS") && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(""); setSelectedCategory("TODOS"); }}
                  className="mt-6 px-5 py-2.5 rounded-xl bg-white/5 border border-white/8 text-[10px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white/80 transition-all"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </Reveal>
        )}

      </div>
    </div>
  );
}
