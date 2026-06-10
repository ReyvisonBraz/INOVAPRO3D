import { useEffect, useMemo, useState, useCallback, memo } from "react";
import { PageSEO } from "../../components/seo/PageSEO";
import { collection, getDocs } from "firebase/firestore";
import { Search, ShoppingCart, Box, ChevronRight, ChevronLeft } from "lucide-react";
import { db } from "../../services/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../contexts/CartContext";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { FloatingBackground } from "../../components/ui/FloatingBackground";
import { Reveal } from "../../components/ui/Reveal";
import { ProductCard } from "../../components/ui/ProductCard";
import { buildCategoryTree, getCategoryPath, categoryNameToSlug } from "../../lib/categoryTree";
import type { Product, ShowcaseItem, Category } from "../../types/domain";

// ── Category section with auto-cycling image banner ──────────────────────────

const CategorySection = memo(function CategorySection({
  category,
  products,
  coverImage,
  isSubcategory,
  onAdd,
}: {
  category: string;
  products: Product[];
  coverImage?: string;
  isSubcategory?: boolean;
  onAdd: (p: Product) => void;
}) {
  const images = useMemo(() => {
    if (coverImage) return [coverImage];
    return products.flatMap(p => p.images?.filter(Boolean) ?? []).slice(0, 20);
  }, [products, coverImage]);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => setImgIdx(i => (i + 1) % images.length), 2800);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <section className="mb-10 sm:mb-14">
      <div className={`relative rounded-2xl overflow-hidden mb-5 border border-white/[0.07] ${isSubcategory ? "h-[90px] sm:h-[110px]" : "h-[110px] sm:h-[150px]"}`}>
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
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary mb-1">
              {isSubcategory ? "Subcategoria" : "Categoria"}
            </p>
            <h2 className={`font-black font-display uppercase tracking-tight text-white leading-none ${isSubcategory ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"}`}>
              {category}
            </h2>
          </div>
          <div className="text-right">
            <p className={`font-black font-display text-dim ${isSubcategory ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>{products.length}</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-secondary">
              {products.length === 1 ? "produto" : "produtos"}
            </p>
          </div>
        </div>

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [categoriesData, setCategoriesData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [sortBy, setSortBy] = useState<"name" | "price-asc" | "price-desc" | "newest">("name");
  const [activeSlide, setActiveSlide] = useState(0);

  const urlCategory = searchParams.get("categoria") || "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const [sResult, pResult, cResult] = await Promise.allSettled([
      getDocs(collection(db, "showcase")),
      getDocs(collection(db, "products")),
      getDocs(collection(db, "categories")),
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
    if (cResult.status === "fulfilled") {
      setCategoriesData(cResult.value.docs.map(d => ({ id: d.id, ...d.data() } as Category)).filter(c => c.active !== false));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (showcase.length === 0) return;
    const timer = setInterval(() => setActiveSlide(p => (p + 1) % showcase.length), 6000);
    return () => clearInterval(timer);
  }, [showcase.length]);

  const categoryTree = useMemo(() => buildCategoryTree(categoriesData), [categoriesData]);

  const catByName = useMemo(() => {
    const map = new Map<string, Category>();
    categoriesData.forEach(c => map.set(c.name, c));
    return map;
  }, [categoriesData]);

  const catBySlug = useMemo(() => {
    const map = new Map<string, Category>();
    categoriesData.forEach(c => {
      const slug = c.slug || categoryNameToSlug(c.name);
      map.set(slug, c);
    });
    return map;
  }, [categoriesData]);

  const childNamesByParent = useMemo(() => {
    const map = new Map<string, string[]>();
    categoriesData.forEach(c => {
      if (c.parentId) {
        const parent = categoriesData.find(p => p.id === c.parentId);
        if (parent) {
          if (!map.has(parent.name)) map.set(parent.name, []);
          map.get(parent.name)!.push(c.name);
        }
      }
    });
    return map;
  }, [categoriesData]);

  const descendantNames = useMemo(() => {
    const map = new Map<string, string[]>();
    const collect = (parentName: string): string[] => {
      const children = childNamesByParent.get(parentName) || [];
      const all: string[] = [...children];
      children.forEach(c => all.push(...collect(c)));
      return all;
    };
    catByName.forEach((_, name) => {
      map.set(name, collect(name));
    });
    return map;
  }, [childNamesByParent, catByName]);

  const rootCategoryNames = useMemo(() => {
    const names = new Set<string>();
    categoryTree.forEach(node => {
      names.add(node.category.name);
      node.children.forEach(child => names.add(child.category.name));
    });
    return names;
  }, [categoryTree]);

  const categories = useMemo(() => {
    const orderMap = new Map(categoriesData.map(c => [c.name, c.order ?? 999]));
    return Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c)))
      .sort((a, b) => (orderMap.get(a) ?? 999) - (orderMap.get(b) ?? 999));
  }, [products, categoriesData]);

  const categoryCover = useMemo(() => {
    const map = new Map<string, string>();
    categoriesData.forEach(c => { if (c.image) map.set(c.name, c.image); });
    return map;
  }, [categoriesData]);

  const breadcrumb = useMemo(() => {
    if (selectedCategory === "TODOS") return [];
    const cat = catByName.get(selectedCategory);
    if (!cat) return [selectedCategory];
    const path = getCategoryPath(categoriesData, cat.id);
    return path.map(c => c.name);
  }, [selectedCategory, catByName, categoriesData]);

  useEffect(() => {
    if (urlCategory && catBySlug.has(urlCategory)) {
      const cat = catBySlug.get(urlCategory)!;
      setSelectedCategory(cat.name);
    } else if (urlCategory === "") {
      setSelectedCategory("TODOS");
    }
  }, [urlCategory, catBySlug]);

  const handleCategorySelect = (catName: string) => {
    setSelectedCategory(catName);
    if (catName === "TODOS") {
      setSearchParams({});
    } else {
      const cat = catByName.get(catName);
      const slug = cat?.slug || categoryNameToSlug(catName);
      setSearchParams({ categoria: slug });
    }
  };

  const handleAddToCart = useCallback((product: Product) => {
    addItem({ id: product.id, name: product.name, price: product.basePrice, quantity: 1, image: product.images[0], type: "PRODUCT" });
    toast.success(`${product.name} adicionado!`, { icon: <ShoppingCart className="w-4 h-4" /> });
  }, [addItem]);

  const sortProducts = (list: Product[]) => {
    if (sortBy === "price-asc") return [...list].sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    if (sortBy === "price-desc") return [...list].sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    if (sortBy === "newest") return list;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  };

  const groups = useMemo(() => {
    const term = searchTerm.toLowerCase();

    if (selectedCategory === "TODOS") {
      const groupsList: { category: string; products: Product[]; isSub: boolean }[] = [];
      for (const cat of categories) {
        const catProducts = sortProducts(
          products.filter(
            p => p.category === cat &&
            (!term || p.name.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term)),
          ),
        );
        if (catProducts.length > 0) {
          groupsList.push({ category: cat, products: catProducts, isSub: false });
        }
      }
      return groupsList;
    }

    const selectedCat = catByName.get(selectedCategory);
    if (!selectedCat) return [];

    const descendants = descendantNames.get(selectedCategory) || [];
    const allNames = [selectedCategory, ...descendants];

    const groupsList: { category: string; products: Product[]; isSub: boolean }[] = [];

    for (const name of allNames) {
      const catProducts = sortProducts(
        products.filter(
          p => p.category === name &&
          (!term || p.name.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term)),
        ),
      );
      if (catProducts.length > 0) {
        groupsList.push({
          category: name,
          products: catProducts,
          isSub: name !== selectedCategory,
        });
      }
    }

    return groupsList;
  }, [products, categories, selectedCategory, searchTerm, sortBy, catByName, descendantNames]);

  const totalVisible = groups.reduce((s, g) => s + g.products.length, 0);

  const tabCategories = useMemo(() => {
    if (selectedCategory === "TODOS") return rootCategoryNames;
    const childNames = childNamesByParent.get(selectedCategory) || [];
    return [selectedCategory, ...childNames];
  }, [selectedCategory, rootCategoryNames, childNamesByParent]);

  return (
    <div className="min-h-screen bg-surface">
      <PageSEO
        title="Catálogo"
        description="Explore centenas de peças impressas em 3D: miniaturas, decoração, funcional, educacional e muito mais. Produção na Bambu Lab P2S com entrega nacional."
        path="/catalogo"
      />

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
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display uppercase tracking-tight text-white mb-2 leading-none">
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
                      {showcase[activeSlide].category && (
                        <span className="inline-block px-2 py-0.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded mb-2">
                          {showcase[activeSlide].category}
                        </span>
                      )}
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

        <Reveal direction="up" delay={0}>
          <div className="flex flex-col gap-3 mb-6 sm:mb-8">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar modelos..."
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
            </div>

            {breadcrumb.length > 1 && (
              <nav className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest" aria-label="Caminho de categorias">
                <button
                  onClick={() => handleCategorySelect("TODOS")}
                  className="text-dim hover:text-white transition-colors"
                >
                  Catálogo
                </button>
                {breadcrumb.map((name, idx) => (
                  <span key={name} className="flex items-center gap-1.5">
                    <ChevronRight className="h-3 w-3 text-white/20" />
                    {idx === breadcrumb.length - 1 ? (
                      <span className="text-primary">{name}</span>
                    ) : (
                      <button
                        onClick={() => handleCategorySelect(name)}
                        className="text-white/50 hover:text-white transition-colors"
                      >
                        {name}
                      </button>
                    )}
                  </span>
                ))}
              </nav>
            )}

            <nav className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar" aria-label="Filtrar por categoria">
              <button
                onClick={() => handleCategorySelect("TODOS")}
                className={`px-3 py-2.5 rounded-lg text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                  selectedCategory === "TODOS"
                    ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                    : "bg-white/5 border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white/70"
                }`}
              >
                Todos
              </button>
              {Array.from(tabCategories).map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
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

        {!loading && groups.length > 0 && (
          <AnimatePresence mode="popLayout">
            {groups.map(({ category, products: catProducts, isSub }) => (
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
                  coverImage={categoryCover.get(category)}
                  isSubcategory={isSub}
                  onAdd={handleAddToCart}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

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
                  onClick={() => { setSearchTerm(""); handleCategorySelect("TODOS"); }}
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
