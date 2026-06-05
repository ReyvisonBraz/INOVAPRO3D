import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { 
  ArrowRight,
  ChevronLeft, 
  Layers, 
  Weight, 
  Clock, 
  Settings2,
  ShoppingCart,
  CheckCircle2,
  Zap,
  Shield,
  Info,
  Maximize2,
  Box,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../services/firebase";
import { STLViewer } from "../../components/ui/STLViewer";
import { Button } from "../../components/ui/Button";
import { useCart } from "../../contexts/CartContext";
import { toast } from "sonner";
import type { Material, Product } from "../../types/domain";
import { waLink } from "../../lib/config";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [productionTime, setProductionTime] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeMediaTab, setActiveMediaTab] = useState<'3d' | number>('3d');
  const [showAddedModal, setShowAddedModal] = useState(false);
  const addToCartRef = useRef<HTMLButtonElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const el = addToCartRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product]);

  const hasModelUrl = product?.modelUrl;

  // Default to first image tab if available, avoiding 3D viewer crash on invalid models
  useEffect(() => {
    if (product?.images?.length) {
      setActiveMediaTab(0);
    }
  }, [product?.id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "products", id);
        const [prodSnap, matSnap, settingsSnap] = await Promise.all([
          getDoc(docRef),
          getDocs(collection(db, "materials")),
          getDoc(doc(db, "settings", "production"))
        ]);

        if (prodSnap.exists()) {
          setProduct({ id: prodSnap.id, ...prodSnap.data() } as Product);
        }

        if (settingsSnap.exists()) {
          setProductionTime(settingsSnap.data().avgDays || 7);
        }

        const matList = matSnap.docs.map(d => ({ id: d.id, ...d.data() } as Material));
        if (matList.length > 0) {
          setMaterials(matList);
          setSelectedMaterial(matList[0]);
        } else {
          const fallback = [
            { id: 'pla', name: 'PLA Pro', color: '#2563EB', priceMult: 1, desc: 'Superior estético.' },
            { id: 'petg', name: 'PETG', color: '#0066FF', priceMult: 1.3, desc: 'Resistente.' }
          ];
          setMaterials(fallback);
          setSelectedMaterial(fallback[0]);
        }
      } catch (error) {
        console.error("Error product detail:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const totalPrice = product && selectedMaterial ? (product.basePrice * (selectedMaterial.priceMult ?? 1) * quantity) : 0;

  const handleAddToCart = () => {
    if (!product || !selectedMaterial) return;
    addItem({
      id: `${product.id}-${selectedMaterial.id}`,
      name: `${product.name} (${selectedMaterial.name})`,
      price: totalPrice / quantity,
      quantity: quantity,
      image: product.images[0],
      type: 'PRODUCT'
    });
    toast.success(`${product.name} adicionado!`, {
      description: `Material: ${selectedMaterial.name}`,
    });
    setShowAddedModal(true);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-4">Produto não encontrado</h2>
      <Link to="/catalogo">
        <Button variant="outline">Voltar ao Catálogo</Button>
      </Link>
    </div>
  );

  return (
    <div className="container-section py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-8 sm:mb-12">
        <Link to="/catalogo" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FAFAFA]/40 group-hover:text-white transition-colors">Voltar ao Catálogo</span>
        </Link>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-start">
        {/* VIEW AREA */}
        <div className="lg:sticky lg:top-28 space-y-6">
          <div className="aspect-square w-full rounded-3xl overflow-hidden glass-card relative bg-black/25">
            {activeMediaTab === '3d' && hasModelUrl ? (
              <STLViewer url={hasModelUrl} color={selectedMaterial?.color || '#2563EB'} scale={1} />
            ) : activeMediaTab === '3d' ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-3">
                    <Box className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/25">Visualização 3D</p>
                  <p className="text-[9px] text-white/10 font-medium mt-1">Modelo não disponível</p>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.img 
                  key={activeMediaTab}
                  src={product.images[activeMediaTab as number]} 
                  alt={`${product.name} - Foto Real ${(activeMediaTab as number) + 1}`}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </AnimatePresence>
            )}
          </div>

          {/* MEDIA HUB SELECTION TABS */}
          {(product.images && product.images.length > 0 || hasModelUrl) && (
            <div className="flex gap-2 justify-center overflow-x-auto py-1 no-scrollbar">
              {hasModelUrl && (
              <button
                type="button"
                onClick={() => setActiveMediaTab('3d')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeMediaTab === '3d'
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/10 animate-pulse-subtle'
                    : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                }`}
              >
                📐 MODELO 3D
              </button>
              )}
              {product.images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveMediaTab(idx)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeMediaTab === idx
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/10'
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <img src={img} className="w-4 h-4 rounded-md object-cover border border-white/10 shrink-0" alt="" referrerPolicy="no-referrer" />
                  FOTO {idx + 1}
                </button>
              ))}
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
             <div className="p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 text-center transition-all hover:bg-white/10 flex flex-col items-center justify-center">
                <Layers className="w-4 h-4 text-primary mb-2" />
                <p className="text-[8px] sm:text-[10px] text-white/30 uppercase font-bold">Camada</p>
                <p className="text-[10px] sm:text-xs font-mono font-bold">{product.technical?.resolution || '0.12mm'}</p>
             </div>
             <div className="p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 text-center transition-all hover:bg-white/10 flex flex-col items-center justify-center">
                <Zap className="w-4 h-4 text-primary mb-2" />
                <p className="text-[8px] sm:text-[10px] text-white/30 uppercase font-bold">Infill</p>
                <p className="text-[10px] sm:text-xs font-mono font-bold">{product.technical?.infill || 20}%</p>
             </div>
             <div className="p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 text-center transition-all hover:bg-white/10 flex flex-col items-center justify-center">
                <Clock className="w-4 h-4 text-primary mb-2" />
                <p className="text-[8px] sm:text-[10px] text-white/30 uppercase font-bold">Tempo</p>
                <p className="text-[10px] sm:text-xs font-mono font-bold">{product.technical?.printTime || '2h'}</p>
             </div>
             <div className="p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 text-center transition-all hover:bg-white/10 flex flex-col items-center justify-center">
                <Weight className="w-4 h-4 text-primary mb-2" />
                <p className="text-[8px] sm:text-[10px] text-white/30 uppercase font-bold">Peso Est.</p>
                <p className="text-[10px] sm:text-xs font-mono font-bold">~{product.technical?.weight || 80}g</p>
             </div>
          </div>
        </div>

        {/* INFO AREA */}
        <div className="space-y-10 sm:space-y-12">
          <header>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest">
                {product.category}
              </span>
              <span className="text-[10px] text-white/20 font-mono mr-2">REF: {product.id.slice(0, 8)}</span>
              {product.stock === 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Esgotado • Encomenda sob demanda
                </span>
              ) : typeof product.stock === 'number' && product.stock <= 3 && product.stock > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-400 uppercase tracking-widest animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Apenas {product.stock} em estoque!
                </span>
              ) : null}
            </div>
            <h1 className="heading-lg mb-6 leading-none break-words">
              {product.name}
            </h1>
            <p className="text-lg sm:text-xl text-white/50 leading-relaxed max-w-lg font-medium italic">
              {product.description}
            </p>
          </header>

          <div className="space-y-10">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
               <Info className="w-3 h-3" />
               Configurar Fabricação
            </h3>
            
            {/* MATERIAL SELECTION */}
            <div className="space-y-4">
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Material</p>
              <div className="grid grid-cols-1 gap-3">
                {materials.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMaterial(m)}
                    className={`p-5 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                      selectedMaterial?.id === m.id 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: m.color }} />
                      <div>
                        <p className="font-bold text-sm uppercase tracking-tight">{m.name}</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wide">{m.desc || 'Acabamento de alta qualidade'}</p>
                      </div>
                    </div>
                    {selectedMaterial?.id === m.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimensões fixas do produto */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-3">
              <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Dimensões do Modelo</p>
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: "L", value: product.baseDimensions?.x || 120 },
                  { label: "C", value: product.baseDimensions?.y || 120 },
                  { label: "A", value: product.baseDimensions?.z || 150 },
                ].map(dim => (
                  <div key={dim.label} className="flex items-baseline gap-1 rounded-xl bg-white/[0.04] border border-white/[0.05] px-3 py-2">
                    <span className="text-[8px] font-black uppercase text-white/30">{dim.label}</span>
                    <span className="text-sm font-mono font-black text-white">{dim.value}</span>
                    <span className="text-[8px] text-white/30">mm</span>
                  </div>
                ))}
              </div>
              <a
                href={waLink("Olá INOVAPRO3D! Tenho interesse em um tamanho personalizado para o modelo: " + (product?.name || ""))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/70 hover:text-primary transition-colors"
              >
                Precisa de outro tamanho? Solicite orçamento →
              </a>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between py-10 border-y border-white/5 gap-6">
              <div>
                <p className="text-[10px] text-white/30 uppercase font-black mb-2 tracking-widest">Orçamento Estimado</p>
                <div className="flex items-baseline gap-2">
                   <span className="text-lg font-mono text-white/40">R$</span>
                   <p className="text-5xl sm:text-6xl font-display font-black text-shimmer leading-none">
                     {(product?.stock === 0 ? 0 : totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </p>
                </div>
              </div>
              
              <div className={`flex items-center bg-white/5 rounded-2xl border border-white/10 overflow-hidden h-14 sm:h-16 w-full md:w-auto ${product?.stock === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <button 
                  disabled={product?.stock === 0}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-8 hover:bg-white/5 transition-colors font-black text-white/40 text-xl disabled:pointer-events-none"
                >
                  -
                </button>
                <span className="w-16 text-center font-display font-black text-2xl">{product?.stock === 0 ? 0 : quantity}</span>
                <button 
                  disabled={product?.stock === 0}
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-8 hover:bg-white/5 transition-colors font-black text-white/40 text-xl disabled:pointer-events-none"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="md:col-span-3">
                 <Button
                    ref={addToCartRef}
                    size="lg"
                    className={`w-full h-20 rounded-3xl gap-4 text-xl font-display font-black uppercase tracking-tight ${
                      product?.stock === 0 ? 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20' : ''
                    }`}
                    onClick={() => {
                       if (product?.stock === 0) {
                          window.open(waLink(`Olá INOVAPRO3D! Tenho interesse em encomendar sob demanda o modelo: ${product.name}.`));
                       } else {
                          handleAddToCart();
                       }
                    }}
                    isShimmer={product?.stock !== 0}
                  >
                    <ShoppingCart className="w-6 h-6" />
                    {product?.stock === 0 ? "ENCOMENDAR SOB DEMANDA" : "ADICIONAR AO CARRINHO"}
                  </Button>
               </div>
               <div className="flex items-center justify-center px-6 py-4 bg-white/5 border border-white/10 rounded-3xl text-center">
                  <div className="text-center">
                     <p className="text-[8px] text-white/30 uppercase font-bold">Produção</p>
                     <p className="text-xs font-mono font-bold text-primary">~{productionTime} DIAS</p>
                  </div>
               </div>
            </div>
            
            <div className="flex items-center justify-center gap-3 text-[10px] text-white/20 uppercase font-black tracking-widest py-6 bg-white/[0.01] rounded-[32px] border border-white/[0.02]">
               <Maximize2 className="w-4 h-4 opacity-50" />
               Volume Máximo de Trabalho: 300 x 300 x 350 mm
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddedModal && product && selectedMaterial && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm"
              onClick={() => setShowAddedModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              className="fixed inset-x-4 top-1/2 z-[121] mx-auto max-w-lg -translate-y-1/2 rounded-[32px] border border-white/10 bg-[#0a0f1d] p-6 shadow-2xl shadow-black/40 sm:p-8"
            >
              <button
                type="button"
                onClick={() => setShowAddedModal(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-white/30 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6 flex items-start gap-4 pr-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-500/15 text-green-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">Produto no carrinho</h2>
                  <p className="mt-1 text-sm leading-relaxed text-white/45">
                    Agora você pode finalizar o pedido ou continuar escolhendo outras peças.
                  </p>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="text-sm font-black uppercase text-white">{product.name}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  {selectedMaterial.name} | Qtd. {quantity}
                </p>
                <p className="mt-3 font-mono text-lg font-black text-primary">
                  R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 rounded-2xl border-white/10 text-[10px] font-black uppercase tracking-widest"
                  onClick={() => setShowAddedModal(false)}
                >
                  Continuar vendo
                </Button>
                <Button
                  type="button"
                  className="h-14 rounded-2xl gap-2 text-[10px] font-black uppercase tracking-widest"
                  onClick={() => navigate('/checkout')}
                >
                  Finalizar pedido <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Sticky buy bar ── */}
      <AnimatePresence>
        {showStickyBar && product && (
          <motion.div
            initial={{ y: 72, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 72, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.07] bg-black/90 backdrop-blur-xl pb-safe"
          >
            <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
              {product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-xl border border-white/10 object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-black uppercase tracking-tight text-white">
                  {product.name}
                </p>
                <p className="font-mono text-sm font-black text-primary">
                  R$ {(product.stock === 0 ? 0 : totalPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Button
                type="button"
                className="h-11 shrink-0 gap-2 rounded-2xl px-5 text-[10px] font-black uppercase tracking-widest"
                disabled={false}
                onClick={() => {
                  if (product.stock === 0) {
                    window.open(waLink(`Olá INOVAPRO3D! Tenho interesse em encomendar: ${product.name}.`));
                  } else {
                    handleAddToCart();
                  }
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                {product.stock === 0 ? "Encomendar" : "Adicionar"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
