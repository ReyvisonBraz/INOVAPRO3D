import React, { useEffect, useState, useRef, useCallback } from "react";
import { collection, query, where, getDocs, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { Search, Filter, ShoppingCart, Box, Check, Sparkles, TrendingUp, Zap, ChevronRight, Heart } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../../services/firebase";
import { modelCache } from "../../lib/modelCache";
import { Button } from "../../components/ui/Button";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useCart } from "../../contexts/CartContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Product, ShowcaseItem } from "../../types/domain";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const SHOWCASE_ITEMS = [
  { id: 1, image: "https://images.unsplash.com/photo-1631551351111-209f8742d131?q=80&w=2070", title: "Dragão Flexível", category: "DECORAÇÃO" },
  { id: 2, image: "https://images.unsplash.com/photo-1616803689943-5601631c7fec?q=80&w=2070", title: "Vasos Geométricos", category: "UTILITÁRIOS" },
];

export default function Catalog() {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMoreData();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch Showcase once
      const sSnap = await getDocs(collection(db, "showcase"));
      setShowcase(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShowcaseItem)));

      // Fetch first batch of products
      let q = query(
        collection(db, "products"), 
        where("active", "==", true),
        orderBy("name"),
        limit(12)
      );

      if (selectedCategory !== "TODOS") {
        q = query(q, where("category", "==", selectedCategory));
      }

      const pSnap = await getDocs(q);
      const newProducts = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      
      setProducts(newProducts);

      // Prefetch models
      const modelUrls = newProducts
        .map(p => p.modelUrl)
        .filter((url): url is string => !!url);
      if (modelUrls.length > 0) {
        modelCache.prefetch(modelUrls);
      }
      
      setLastDoc(pSnap.docs[pSnap.docs.length - 1] || null);
      setHasMore(pSnap.docs.length === 12);
    } catch (err) {
      console.error("Catalog Initial Fetch Error:", err);
      handleFirestoreError(err, OperationType.LIST, "products/showcase");
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreData = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      let q = query(
        collection(db, "products"), 
        where("active", "==", true),
        orderBy("name"),
        startAfter(lastDoc),
        limit(12)
      );

      if (selectedCategory !== "TODOS") {
        q = query(q, where("category", "==", selectedCategory));
      }

      const pSnap = await getDocs(q);
      const newProducts = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      
      setProducts(prev => [...prev, ...newProducts]);

      // Prefetch more models
      const modelUrls = newProducts
        .map(p => p.modelUrl)
        .filter((url): url is string => !!url);
      if (modelUrls.length > 0) {
        modelCache.prefetch(modelUrls);
      }

      setLastDoc(pSnap.docs[pSnap.docs.length - 1] || null);
      setHasMore(pSnap.docs.length === 12);
    } catch (err) {
      console.error("Catalog Pagination Error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [selectedCategory]);

  useEffect(() => {
    if (showcase.length === 0) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % showcase.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [showcase.length]);

  const categories = ["TODOS", "DECORAÇÃO", "FANTASIA", "TOOLING", "UTILITÁRIOS"];

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.basePrice,
      quantity: 1,
      image: product.images[0],
      type: 'PRODUCT'
    });
    setAddedId(product.id);
    toast.success(`${product.name} adicionado!`, {
      icon: <ShoppingCart className="w-4 h-4" />,
    });
    setTimeout(() => setAddedId(null), 2000);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "TODOS" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container-section py-8 min-h-screen">
      {/* SHOWCASE SECTION */}
      {showcase.length > 0 && (
        <section className="mb-12 sm:mb-16 overflow-hidden" aria-label="Produtos em Destaque">
          <div className="relative h-[220px] sm:h-[300px] lg:h-[400px] rounded-[24px] sm:rounded-[32px] overflow-hidden group">
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
                    <span className="inline-block px-2 py-0.5 sm:px-2.5 sm:py-1 bg-primary text-white text-[6px] sm:text-[7px] font-black uppercase tracking-widest rounded-md mb-2 sm:mb-3">
                      {showcase[activeSlide].category}
                    </span>
                    <h2 className="text-xl sm:text-2xl lg:text-4xl font-black font-display uppercase tracking-tight text-white mb-1 leading-none">
                      {showcase[activeSlide].title}
                    </h2>
                    <p className="text-white/60 text-[10px] sm:text-xs font-medium italic">Trabalho real • Inovalt3D</p>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="absolute bottom-6 right-6 lg:bottom-8 lg:right-8 z-20 flex gap-2">
               <button 
                onClick={(e) => { e.stopPropagation(); setActiveSlide(prev => (prev - 1 + showcase.length) % showcase.length); }}
                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                aria-label="Slide anterior"
               >
                 <ChevronRight className="w-4 h-4 rotate-180" />
               </button>
               <button 
                onClick={(e) => { e.stopPropagation(); setActiveSlide(prev => (prev + 1) % showcase.length); }}
                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                aria-label="Próximo slide"
               >
                 <ChevronRight className="w-4 h-4" />
               </button>
            </div>
            
            <div className="absolute top-8 right-8 z-20 flex gap-1">
              {showcase.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all duration-300 ${activeSlide === i ? 'w-6 bg-primary' : 'w-1.5 bg-white/10'}`} 
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10 relative">
        <header>
          <div className="flex items-center gap-2 mb-2">
             <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
             <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary">Projetos em Destaque</span>
          </div>
          <h1 className="heading-md sm:heading-lg uppercase mb-1">
            Catálogo <span className="text-shimmer italic">Inovalt3D.</span>
          </h1>
          <p className="text-xs text-white/40 font-medium max-w-sm italic">Modelos exclusivos otimizados para PLA.</p>
        </header>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <nav className="flex gap-2 overflow-x-auto pb-4 md:pb-0 no-scrollbar w-full md:w-auto" aria-label="Categorias">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >
                {cat}
              </button>
            ))}
          </nav>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text"
              placeholder="Buscar modelos..."
              aria-label="Buscar modelos"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3].map(i => (
            <div key={i} className="h-96 rounded-3xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {filteredProducts.map((product, index) => (
            <Link 
              key={product.id} 
              to={`/produto/${product.id}`}
              ref={index === filteredProducts.length - 1 ? lastElementRef : null}
            >
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -10, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="glass-card rounded-[40px] overflow-hidden group cursor-pointer border border-white/5 hover:border-primary/20 transition-all shadow-xl hover:shadow-primary/5"
              >
                <div className="relative aspect-square overflow-hidden bg-black/20">
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-4 left-4 flex flex-col items-start gap-1.5 z-10">
                    <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase text-white/80">
                      {product.category}
                    </span>
                    {product.stock === 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[8px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20">
                        Esgotado
                      </span>
                    ) : (typeof product.stock === 'number' && product.stock <= 3 && product.stock > 0) ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[8px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 animate-pulse-subtle">
                        Poucas Unidades ({product.stock})
                      </span>
                    ) : null}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toast.success("Adicionado aos favoritos!");
                    }}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-red-500 hover:border-red-500/50 transition-all z-10"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-display font-bold mb-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-white/50 mb-6 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">A partir de</p>
                      <p className="text-xl font-display font-bold">R$ {product.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    
                    {product.stock === 0 ? (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="gap-2 rounded-xl border border-white/5 bg-white/5 text-white/30 cursor-not-allowed hover:bg-white/5 hover:text-white/30"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toast.error("Este produto encontra-se temporariamente esgotado.", {
                            description: "Disponível sob encomenda na tela de detalhes."
                          });
                        }}
                      >
                        Indisponível
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="gap-2 rounded-xl transition-all"
                        onClick={(e) => handleAddToCart(e, product)}
                      >
                        <AnimatePresence mode="wait">
                          {addedId === product.id ? (
                            <motion.div
                              key="check"
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.5, opacity: 0 }}
                              className="flex items-center gap-2"
                            >
                              <Check className="w-4 h-4 text-green-400" />
                              <span>Ok</span>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="cart"
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.5, opacity: 0 }}
                              className="flex items-center gap-2"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              <span>Adicionar</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      )}

      {loadingMore && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* ... footer ... */}
      {!loading && filteredProducts.length === 0 && (
        <div className="py-32 text-center">
          <Box className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 italic">Nenhum modelo encontrado para sua busca.</p>
        </div>
      )}
    </div>
  );
}
