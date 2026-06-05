import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Search, ShoppingCart, Box, ChevronRight, ChevronLeft, SlidersHorizontal } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../../services/firebase";
import { modelCache } from "../../lib/modelCache";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../contexts/CartContext";
import { toast } from "sonner";
import { FloatingBackground } from "../../components/ui/FloatingBackground";
import { Reveal, RevealGroup, RevealItem } from "../../components/ui/Reveal";
import { ProductCard } from "../../components/ui/ProductCard";
import type { Product, ShowcaseItem } from "../../types/domain";

export default function Catalog() {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [sortBy, setSortBy] = useState<"name" | "price-asc" | "price-desc" | "newest">("name");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const sSnap = await getDocs(collection(db, "showcase"));
      setShowcase(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShowcaseItem)));

      const pSnap = await getDocs(collection(db, "products"));
      // Keep Firestore insertion order here so "newest" sort works correctly.
      // Alphabetical sort happens inside filteredProducts useMemo.
      const newProducts = pSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Product))
        .filter(product => product.active !== false);

      setProducts(newProducts);

      const modelUrls = newProducts.map(p => p.modelUrl).filter((url): url is string => !!url);
      if (modelUrls.length > 0) modelCache.prefetch(modelUrls);
    } catch (err) {
      console.error("Catalog Fetch Error:", err);
      handleFirestoreError(err, OperationType.LIST, "products/showcase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInitialData(); }, []);

  useEffect(() => {
    if (showcase.length === 0) return;
    const timer = setInterval(() => setActiveSlide(prev => (prev + 1) % showcase.length), 6000);
    return () => clearInterval(timer);
  }, [showcase.length]);

  const categories = useMemo(
    () => ["TODOS", ...Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c))).sort()],
    [products]
  );

  const handleAddToCart = (product: Product) => {
    addItem({ id: product.id, name: product.name, price: product.basePrice, quantity: 1, image: product.images[0], type: 'PRODUCT' });
    setAddedId(product.id);
    toast.success(`${product.name} adicionado!`, { icon: <ShoppingCart className="w-4 h-4" /> });
    setTimeout(() => setAddedId(null), 2000);
  };

  const filteredProducts = useMemo(() => {
    let list = products
      .filter(p => selectedCategory === "TODOS" || p.category === selectedCategory)
      .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase()));

    if (sortBy === "price-asc") list = [...list].sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    else if (sortBy === "price-desc") list = [...list].sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    else if (sortBy === "newest") list = [...list]; // Firestore insertion order — not re-sorted
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    return list;
  }, [products, selectedCategory, searchTerm, sortBy]);

  return (
    <div className="min-h-screen bg-surface">

      {/* HEADER */}
      <div className="relative overflow-hidden pt-20 pb-8 sm:pt-24 sm:pb-10">
        <FloatingBackground variant="grid" subtle />
        <div className="container-section relative z-10">
          <Reveal direction="up" delay={0}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.35em] text-primary">Catálogo Oficial</span>
            </div>
          </Reveal>
          <Reveal direction="up" delay={0.1}>
            <h1 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-white mb-2">
              Inventário 3D
            </h1>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
            <p className="text-xs text-white/40 max-w-md leading-relaxed">
              Modelos exclusivos impressos na Bambu Lab P2S · Pará · Brasil
            </p>
          </Reveal>
          <Reveal direction="up" delay={0.28}>
            <div className="mt-4 flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-white/20">
              <span>{products.length} modelos</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span>{Math.max(0, categories.length - 1)} categorias</span>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="container-section pb-16">

        {/* SHOWCASE */}
        {showcase.length > 0 && (
          <section className="mb-8 sm:mb-12" aria-label="Produtos em Destaque">
            <div className="relative h-[160px] sm:h-[240px] lg:h-[320px] rounded-2xl overflow-hidden border border-white/8">
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
                  <img src={showcase[activeSlide].image} className="w-full h-full object-cover" alt={showcase[activeSlide].title} />
                  <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 z-20 max-w-xl">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <span className="inline-block px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded mb-2">
                        {showcase[activeSlide].category}
                      </span>
                      <h2 className="text-lg sm:text-2xl lg:text-3xl font-black font-display uppercase tracking-tight text-white leading-none">
                        {showcase[activeSlide].title}
                      </h2>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                {showcase.map((_, i) => (
                  <button key={i} aria-label={`Slide ${i + 1}`} onClick={() => setActiveSlide(i)}
                    className={`h-1 rounded-full transition-all duration-300 ${activeSlide === i ? "w-5 bg-primary" : "w-1.5 bg-white/20 hover:bg-white/40"}`} />
                ))}
              </div>

              <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 z-20 flex gap-1.5">
                <button onClick={() => setActiveSlide(prev => (prev - 1 + showcase.length) % showcase.length)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10" aria-label="Slide anterior">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setActiveSlide(prev => (prev + 1) % showcase.length)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10" aria-label="Próximo slide">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SEARCH + FILTER */}
        <Reveal direction="up" delay={0}>
          <div className="flex flex-col gap-3 mb-6 sm:mb-8">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar modelos…"
                  aria-label="Buscar modelos"
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 pl-10 text-xs outline-none focus:border-primary/50 transition-all placeholder:text-white/25 text-white"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/8 rounded-xl text-white/40 hover:text-white hover:border-white/15 transition-all text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
                aria-label="Filtros"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filtrar</span>
              </button>
            </div>

            <nav className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar" aria-label="Filtrar por categoria">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                    selectedCategory === cat
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                      : "bg-white/5 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/70"
                  }`}
                >
                  {cat}
                </button>
              ))}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="ml-auto shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/50 focus:border-primary outline-none cursor-pointer"
              >
                <option value="name">A–Z</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="newest">Mais recentes</option>
              </select>
              {!loading && (
                <span className="flex-shrink-0 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-white/20 self-center">
                  {filteredProducts.length} resultado{filteredProducts.length !== 1 ? "s" : ""}
                </span>
              )}
            </nav>
          </div>
        </Reveal>

        {/* LOADING SKELETON */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-white/5 bg-white/[0.02] animate-pulse">
                <div className="aspect-square bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-4 bg-white/5 rounded w-16" />
                    <div className="h-7 w-12 bg-white/5 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PRODUCTS GRID */}
        {!loading && filteredProducts.length > 0 && (
          <RevealGroup
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
            stagger={0.05}
          >
            {filteredProducts.map(product => (
              <RevealItem key={product.id}>
                <ProductCard product={product} onAdd={handleAddToCart} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}

        {/* EMPTY STATE */}
        {!loading && filteredProducts.length === 0 && (
          <Reveal direction="up" delay={0.1}>
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" />
                <div className="relative w-16 h-16 rounded-full border border-white/8 bg-white/[0.03] flex items-center justify-center">
                  <Box className="w-6 h-6 text-white/20" />
                </div>
              </div>
              <h3 className="text-sm font-black font-display uppercase tracking-tight text-white/50 mb-1">
                Nenhum modelo encontrado
              </h3>
              <p className="text-xs text-white/25 max-w-xs leading-relaxed">
                Tente ajustar os filtros ou a busca.
              </p>
              {(searchTerm || selectedCategory !== "TODOS") && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(""); setSelectedCategory("TODOS"); }}
                  className="mt-4 px-4 py-2 rounded-lg bg-white/5 border border-white/8 text-[9px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white/80 transition-all"
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
