import { useEffect, useMemo, useState, useCallback } from "react";
import { PageSEO } from "../../components/seo/PageSEO";
import { Search, ShoppingCart, Box, ChevronRight, ChevronLeft } from "lucide-react";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../contexts/CartContext";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { Reveal } from "../../components/ui/Reveal";
import { ProductCard } from "../../components/ui/ProductCard";
import {
  getCategoryPath,
  getAllDescendantIds,
  categorySlug,
  findCategoryBySlug,
} from "../../lib/categoryTree";
import { filterProductsByCategory } from "../../lib/productCategory";
import type { Product, ShowcaseItem, Category } from "../../types/domain";

// ── Main Catalog ──────────────────────────────────────────────────────────────

export default function Catalog() {
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: showcase } = useFirestoreCollection<ShowcaseItem>("showcase", { silent: true });
  const {
    data: products,
    loading: productsLoading,
    error: fetchError,
    refetch: fetchData,
  } = useFirestoreCollection<Product>("products", {
    transform: (items) => items.filter((p) => p.active !== false),
  });
  const { data: categoriesData } = useFirestoreCollection<Category>("categories", {
    transform: (items) => items.filter((c) => c.active !== false),
    silent: true,
  });
  const loading = productsLoading;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [sortBy, setSortBy] = useState<"name" | "price-asc" | "price-desc" | "newest">("name");
  const [activeSlide, setActiveSlide] = useState(0);

  const urlCategory = searchParams.get("categoria") || "";

  useEffect(() => {
    if (showcase.length === 0) return;
    const timer = setInterval(() => setActiveSlide((p) => (p + 1) % showcase.length), 6000);
    return () => clearInterval(timer);
  }, [showcase.length]);

  const byOrder = (a: Category, b: Category) => (a.order ?? 999) - (b.order ?? 999);

  const rootCategories = useMemo(
    () => categoriesData.filter((c) => !c.parentId).sort(byOrder),
    [categoriesData],
  );

  const childrenOf = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const cat of categoriesData) {
      if (!cat.parentId) continue;
      const list = map.get(cat.parentId);
      if (list) list.push(cat);
      else map.set(cat.parentId, [cat]);
    }
    for (const list of map.values()) list.sort(byOrder);
    return map;
  }, [categoriesData]);

  /**
   * Nomes gravados em produtos que nao existem na colecao de categorias.
   *
   * Nao viram aba (aba sem id nao filtra nada), mas os produtos continuam
   * aparecendo na vitrine: produto escondido nao vende.
   */
  const orphanNames = useMemo(() => {
    const known = new Set(categoriesData.map((c) => c.name.trim().toUpperCase()));
    const seen = new Set<string>();
    const names: string[] = [];
    for (const product of products) {
      const name = product.category?.trim().toUpperCase();
      if (!name || product.categoryId || known.has(name) || seen.has(name)) continue;
      seen.add(name);
      names.push(product.category);
    }
    return names;
  }, [products, categoriesData]);

  const categoryCount = categoriesData.length + orphanNames.length;

  const breadcrumb = useMemo(
    () => (selectedCategory === "TODOS" ? [] : getCategoryPath(categoriesData, selectedCategory)),
    [selectedCategory, categoriesData],
  );

  useEffect(() => {
    if (!urlCategory) {
      setSelectedCategory("TODOS");
      return;
    }
    const cat = findCategoryBySlug(categoriesData, urlCategory);
    if (cat) setSelectedCategory(cat.id);
  }, [urlCategory, categoriesData]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === "TODOS") setSearchParams({});
    else setSearchParams({ categoria: categorySlug(categoriesData, categoryId) });
  };

  const handleAddToCart = useCallback(
    (product: Product) => {
      addItem({
        id: product.id,
        name: product.name,
        price: product.basePrice,
        quantity: 1,
        image: product.images[0],
        type: "PRODUCT",
        productId: product.id,
      });
      toast.success(`${product.name} adicionado!`, { icon: <ShoppingCart className="w-4 h-4" /> });
    },
    [addItem],
  );

  const groups = useMemo(() => {
    const sortProducts = (list: Product[]) => {
      if (sortBy === "price-asc")
        return [...list].sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
      if (sortBy === "price-desc")
        return [...list].sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
      if (sortBy === "newest") return list;
      return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    };

    const term = searchTerm.toLowerCase();
    const matchesTerm = (p: Product) =>
      !term || p.name.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term);

    /** Produtos vinculados diretamente a categoria, sem descer na arvore. */
    const directOf = (categoryId: string) =>
      sortProducts(
        filterProductsByCategory(categoriesData, products, categoryId, {
          includeDescendants: false,
        }).filter(matchesTerm),
      );

    const groupsList: { category: string; products: Product[] }[] = [];

    if (selectedCategory === "TODOS") {
      for (const cat of rootCategories) {
        groupsList.push({ category: cat.name, products: directOf(cat.id) });
      }
      for (const name of orphanNames) {
        const normalized = name.trim().toUpperCase();
        groupsList.push({
          category: name,
          products: sortProducts(
            products.filter(
              (p) =>
                !p.categoryId &&
                (p.category?.trim().toUpperCase() ?? "") === normalized &&
                matchesTerm(p),
            ),
          ),
        });
      }
      return groupsList;
    }

    for (const id of getAllDescendantIds(categoriesData, selectedCategory)) {
      const catProducts = directOf(id);
      if (catProducts.length === 0) continue;
      groupsList.push({
        category: categoriesData.find((c) => c.id === id)?.name ?? "",
        products: catProducts,
      });
    }
    return groupsList;
  }, [products, categoriesData, rootCategories, orphanNames, selectedCategory, searchTerm, sortBy]);

  /**
   * Produtos da vitrine, na ordem dos grupos.
   *
   * Deduplicado por id: um produto legado, de nome que existe em mais de um
   * ramo, cai em cada grupo homonimo e apareceria repetido na grade.
   */
  const visibleProducts = useMemo(() => {
    const seen = new Set<string>();
    return groups
      .flatMap((group) => group.products)
      .filter((product) => !seen.has(product.id) && seen.add(product.id));
  }, [groups]);

  const totalVisible = visibleProducts.length;

  const tabCategories = useMemo(() => {
    const selected =
      selectedCategory === "TODOS"
        ? undefined
        : categoriesData.find((c) => c.id === selectedCategory);
    // Sem categoria escolhida a barra lista tudo, como sempre listou; dentro de
    // uma categoria ela vira "a atual + as filhas".
    if (!selected) return [...categoriesData].sort(byOrder);
    return [selected, ...(childrenOf.get(selected.id) ?? [])];
  }, [selectedCategory, categoriesData, childrenOf]);

  return (
    <div className="min-h-screen">
      <PageSEO
        title="Catálogo"
        description="Explore centenas de peças impressas em 3D: miniaturas, decoração, funcional, educacional e muito mais. Produção na Bambu Lab P2S com entrega nacional."
        path="/catalogo"
      />

      <div className="relative overflow-hidden pt-20 pb-5 sm:pt-24 sm:pb-7">
        <div className="container-section relative z-10">
          <Reveal direction="up" delay={0}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-black uppercase tracking-[0.35em] text-primary">
                Catálogo Oficial
              </span>
            </div>
          </Reveal>
          <Reveal direction="up" delay={0.1}>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display uppercase tracking-tight text-white mb-2 leading-none">
              Encontre sua próxima peça
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
              <span>{categoryCount} categorias</span>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="container-section pb-16">
        {showcase.length > 0 && (
          <section className="mb-6 sm:mb-8" aria-label="Destaques">
            <div className="relative h-[130px] sm:h-[180px] rounded-2xl overflow-hidden border border-white/[0.07]">
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
                  <img
                    src={showcase[activeSlide].image}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    alt={showcase[activeSlide].title}
                  />
                  <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 z-20 max-w-xl">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
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
                  <button
                    key={i}
                    aria-label={`Slide ${i + 1}`}
                    onClick={() => setActiveSlide(i)}
                    className={`h-1 rounded-full transition-all duration-300 ${activeSlide === i ? "w-5 bg-primary" : "w-1.5 bg-white/20 hover:bg-white/40"}`}
                  />
                ))}
              </div>
              <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 z-20 flex gap-1.5">
                <button
                  onClick={() => setActiveSlide((p) => (p - 1 + showcase.length) % showcase.length)}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveSlide((p) => (p + 1) % showcase.length)}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                  aria-label="Próximo"
                >
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs font-black uppercase tracking-widest text-white/50 focus:border-primary outline-none cursor-pointer"
                aria-label="Ordenar"
              >
                <option value="name">Mais relevantes</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="newest">Recentes</option>
              </select>
            </div>

            {breadcrumb.length > 1 && (
              <nav
                className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest"
                aria-label="Caminho de categorias"
              >
                <button
                  onClick={() => handleCategorySelect("TODOS")}
                  className="text-dim hover:text-white transition-colors"
                >
                  Catálogo
                </button>
                {breadcrumb.map((cat, idx) => (
                  <span key={cat.id} className="flex items-center gap-1.5">
                    <ChevronRight className="h-3 w-3 text-white/20" />
                    {idx === breadcrumb.length - 1 ? (
                      <span className="text-primary">{cat.name}</span>
                    ) : (
                      <button
                        onClick={() => handleCategorySelect(cat.id)}
                        className="text-white/50 hover:text-white transition-colors"
                      >
                        {cat.name}
                      </button>
                    )}
                  </span>
                ))}
              </nav>
            )}

            <nav
              className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
              aria-label="Filtrar por categoria"
            >
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
              {tabCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`px-3 py-2.5 rounded-lg text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                    selectedCategory === cat.id
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                      : "bg-white/5 border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white/70"
                  }`}
                >
                  {cat.name}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, j) => (
              <div
                key={j}
                className="rounded-xl overflow-hidden border border-white/5 bg-white/[0.02] animate-pulse"
              >
                <div className="aspect-square bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && visibleProducts.length > 0 && (
          <motion.section
            key={`${selectedCategory}-${searchTerm}-${sortBy}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
          >
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
            ))}
          </motion.section>
        )}

        {!loading && fetchError && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <p className="text-sm text-white/40 font-medium">
              Não foi possível carregar os produtos.
            </p>
            <button
              type="button"
              onClick={fetchData}
              className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/80 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !fetchError && visibleProducts.length === 0 && (
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
                  onClick={() => {
                    setSearchTerm("");
                    handleCategorySelect("TODOS");
                  }}
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
