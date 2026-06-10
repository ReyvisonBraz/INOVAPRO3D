import { useEffect, useMemo, useState, useCallback, memo } from "react";
import { PageSEO } from "../../components/seo/PageSEO";
import { collection, getDocs } from "firebase/firestore";
import { Search, ShoppingCart, Box, ChevronRight, ChevronLeft, SlidersHorizontal } from "lucide-react";
import { db } from "../../services/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../contexts/CartContext";
import { toast } from "sonner";
import { FloatingBackground } from "../../components/ui/FloatingBackground";
import { Reveal } from "../../components/ui/Reveal";
import { ProductCard } from "../../components/ui/ProductCard";
import type { Product, ShowcaseItem } from "../../types/domain";

// ── Category section with auto-cycling image banner ──────────────────────────

const CategorySection = memo(function CategorySection({
  category,
  products,
  onAdd,
}: {
  category: string;
  products: Product[];
  onAdd: (p: Product) => void;
}) {
  const images = useMemo(
    () => products.flatMap(p => p.images?.filter(Boolean) ?? []).slice(0, 20),
    [products],
  );
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => setImgIdx(i => (i + 1) % images.length), 2800);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <section className="mb-12 sm:mb-16">
      {/* Banner */}
      <div className="relative h-[110px] sm:h-[150px] rounded-2xl overflow-hidden mb-5 border border-white/[0.07]">
        {images.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={imgIdx}
              src={images[imgIdx]}
              alt={category}
              loading="lazy"
              decoding="async"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0 bg-white/[0.03]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20" />

        <div className="absolute inset-0 flex items-center justify-between px-5 sm:px-7">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary mb-1">Categoria</p>
            <h2 className="text-xl sm:text-2xl font-black font-display uppercase tracking-tight text-white leading-none">
              {category}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-2xl sm:text-3xl font-black font-display text-dim">{products.length}</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-secondary">
              {products.length === 1 ? "produto" : "produtos"}
            </p>
          </div>
        </div>

        {/* Image dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2.5 right-3 flex gap-1">
            {images.slice(0, 8).map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                aria-label={`Imagem ${i + 1}`}
                className={`h-1 rounded-full transition-all duration-300 ${
                  imgIdx % Math.min(images.length, 8) === i
                    ? "w-4 bg-primary"
                    : "w-1 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Products */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
});

// ── Main Catalog ──────────────────────────────────────────────────────────────

export default function Catalog() {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [sortBy, setSortBy] = useState<"name" | "price-asc" | "price-desc" | "newest">("name");
  const [activeSlide, setActiveSlide] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const [sResult, pResult] = await Promise.allSettled([
      getDocs(collection(db, "showcase")),
      getDocs(collection(db, "products")),
    ]);
    if (sResult.status === "fulfilled") {
      setShowcase(sResult.value.docs.map(d => ({ id: d.id, ...d.data() } as ShowcaseItem)));
    }
    if (pResult.status === "fulfilled") {
      setProducts(
        pResult.value.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => p.active !== false)
      );
    } else {
      console.error("[Catalog] products fetch failed:", pResult.reason);
      setFetchError("Falha ao carregar produtos.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (showcase.length === 0) return;
    const timer = setInterval(() => setActiveSlide(p => (p + 1) % showcase.length), 6000);
    return () => clearInterval(timer);
  }, [showcase.length]);

  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c))).sort(),
    [products],
  );

  const handleAddToCart = useCallback((product: Product) => {
    addItem({ id: product.id, name: product.name, price: product.basePrice, quantity: 1, image: product.images[0], type: "PRODUCT" });
    toast.success(`${product.name} adicionado!`, { icon: <ShoppingCart className="w-4 h-4" /> });
  }, [addItem]);

  // Sort helper — applied within each category
  const sortProducts = (list: Product[]) => {
    if (sortBy === "price-asc") return [...list].sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    if (sortBy === "price-desc") return [...list].sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    if (sortBy === "newest") return list;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  };

  // Groups: { category → sorted+filtered products }
  const groups = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const activeCats = selectedCategory === "TODOS" ? categories : [selectedCategory];
    return activeCats
      .map(cat => ({
        category: cat,
        products: sortProducts(
          products.filter(
            p =>
              p.category === cat &&
              (!term ||
                p.name.toLowerCase().includes(term) ||
                p.description?.toLowerCase().includes(term)),
          ),
        ),
      }))
      .filter(g => g.products.length > 0);
  }, [products, categories, selectedCategory, searchTerm, sortBy]);

  const totalVisible = groups.reduce((s, g) => s + g.products.length, 0);

  return (
    <div className="min-h-screen bg-surface">
      <PageSEO
        title="Catálogo"
        description="Explore centenas de peças impressas em 3D: miniaturas, decoração, funcional, educacional e muito mais. Produção na Bambu Lab P2S com entrega nacional."
        path="/catalogo"
      />

      {/* HEADER */}
      <div className="relative overflow-hidden pt-20 pb-8 sm:pt-24 sm:pb-10">
        <FloatingBackground variant="grid" subtle />
        <div className="container-section relative z-10">
          <Reveal direction="up" delay={0}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-black uppercase tracking-[0.35em] text-primary">Catálogo Oficial</span>
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
            <div className="mt-4 flex items-center gap-4 text-xs font-black uppercase tracking-widest text-dim">
              <span>{products.length} modelos</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span>{categories.length} categorias</span>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="container-section pb-16">

        {/* SHOWCASE BANNER */}
        {showcase.length > 0 && (
          <section className="mb-8 sm:mb-12" aria-label="Destaques">
            <div className="relative h-[160px] sm:h-[240px] lg:h-[320px] rounded-2xl overflow-hidden border border-white/[0.07]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.7 }}
                  className="absolute inset-0"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10" />
                  <img src={showcase[activeSlide].image} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={showcase[activeSlide].title} />
                  <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 z-20 max-w-xl">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <span className="inline-block px-2 py-0.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded mb-2">
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
                <button onClick={() => setActiveSlide(p => (p - 1 + showcase.length) % showcase.length)}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10" aria-label="Anterior">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setActiveSlide(p => (p + 1) % showcase.length)}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10" aria-label="Próximo">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SEARCH + SORT */}
        <Reveal direction="up" delay={0}>
          <div className="flex flex-col gap-3 mb-6 sm:mb-8">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar modelos…"
                  aria-label="Buscar modelos"
                  className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-2.5 pl-10 text-xs outline-none focus:border-primary/50 transition-all placeholder:text-secondary text-white"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs font-black uppercase tracking-widest text-white/50 focus:border-primary outline-none cursor-pointer"
                aria-label="Ordenar"
              >
                <option value="name">A–Z</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="newest">Recentes</option>
              </select>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/[0.08] rounded-xl text-white/40 hover:text-white hover:border-white/15 transition-all"
                aria-label="Filtros"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Category tabs */}
            <nav className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar" aria-label="Filtrar por categoria">
              <button
                onClick={() => setSelectedCategory("TODOS")}
                className={`px-3 py-2.5 rounded-lg text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                  selectedCategory === "TODOS"
                    ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                    : "bg-white/5 border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white/70"
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2.5 rounded-lg text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                    selectedCategory === cat
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                      : "bg-white/5 border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white/70"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </nav>

            {!loading && (
              <p className="text-[11px] font-black uppercase tracking-widest text-dim self-end">
                {totalVisible} resultado{totalVisible !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </Reveal>

        {/* LOADING SKELETON */}
        {loading && (
          <div className="space-y-12">
            {[1, 2].map(i => (
              <div key={i}>
                <div className="h-[110px] sm:h-[150px] rounded-2xl bg-white/[0.04] animate-pulse mb-5" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="rounded-xl overflow-hidden border border-white/5 bg-white/[0.02] animate-pulse">
                      <div className="aspect-square bg-white/5" />
                      <div className="p-3 space-y-2">
                        <div className="h-3 bg-white/5 rounded w-3/4" />
                        <div className="h-3 bg-white/5 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CATEGORY GROUPS */}
        {!loading && groups.length > 0 && (
          <AnimatePresence mode="popLayout">
            {groups.map(({ category, products: catProducts }) => (
              <motion.div
                key={category}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <CategorySection
                  category={category}
                  products={catProducts}
                  onAdd={handleAddToCart}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* ERROR STATE */}
        {!loading && fetchError && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <p className="text-sm text-white/40 font-medium">Não foi possível carregar os produtos.</p>
            <button
              type="button"
              onClick={fetchData}
              className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/80 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !fetchError && groups.length === 0 && (
          <Reveal direction="up" delay={0.1}>
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" />
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-white/[0.08] bg-white/[0.03] flex items-center justify-center">
                  <Box className="w-6 h-6 text-dim" />
                </div>
              </div>
              <h3 className="text-sm font-black font-display uppercase tracking-tight text-white/50 mb-1">
                Nenhum modelo encontrado
              </h3>
              <p className="text-xs text-secondary max-w-xs leading-relaxed">
                Tente ajustar os filtros ou a busca.
              </p>
              {(searchTerm || selectedCategory !== "TODOS") && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(""); setSelectedCategory("TODOS"); }}
                  className="mt-4 px-4 py-2 rounded-lg bg-white/5 border border-white/[0.08] text-xs font-black uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white/80 transition-all"
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
