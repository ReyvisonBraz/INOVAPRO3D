import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
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
  X,
  Share2,
  Copy,
  Check
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
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Close share menu when clicking outside
  useEffect(() => {
    if (!showShareMenu) return;
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showShareMenu]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = product?.name ?? "Produto INOVAPRO3D";
    const text = `Olha esse produto incrível da INOVAPRO3D: ${title}`;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch { /* user cancelled */ }
    } else {
      setShowShareMenu(v => !v);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

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
      image: product.images?.[0] ?? "",
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-start">
        {/* VIEW AREA */}
        <div className="lg:sticky lg:top-28 space-y-6">
          {/* MAIN IMAGE / 3D — with swipe support */}
          <div
            className="aspect-square w-full rounded-3xl overflow-hidden glass-card relative bg-black/25 select-none"
            onTouchStart={e => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={e => {
              if (touchStartX === null || typeof activeMediaTab !== 'number') return;
              const dx = e.changedTouches[0].clientX - touchStartX;
              if (Math.abs(dx) > 44) {
                const imgs = product.images?.filter(Boolean) ?? [];
                setActiveMediaTab(dx < 0
                  ? Math.min(activeMediaTab + 1, imgs.length - 1)
                  : Math.max(activeMediaTab - 1, 0));
              }
              setTouchStartX(null);
            }}
          >
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
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              </AnimatePresence>
            )}

            {/* Arrow navigation — visible on desktop, complements swipe on mobile */}
            {typeof activeMediaTab === 'number' && (product.images?.length ?? 0) > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Foto anterior"
                  disabled={activeMediaTab === 0}
                  onClick={() => setActiveMediaTab(Math.max(0, (activeMediaTab as number) - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white transition-all disabled:opacity-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Próxima foto"
                  disabled={activeMediaTab === (product.images?.length ?? 1) - 1}
                  onClick={() => setActiveMediaTab(Math.min((product.images?.length ?? 1) - 1, (activeMediaTab as number) + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white transition-all disabled:opacity-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {/* Dot indicators */}
                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
                  {product.images.filter(Boolean).map((_: string, i: number) => (
                    <span
                      key={i}
                      className={`block rounded-full transition-all duration-300 ${
                        i === activeMediaTab ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/35"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* THUMBNAIL STRIP — square click targets, scrollable */}
          {((product.images?.length ?? 0) > 0 || hasModelUrl) && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {hasModelUrl && (
                <button
                  type="button"
                  onClick={() => setActiveMediaTab('3d')}
                  className={`flex-shrink-0 w-14 h-14 rounded-2xl border-2 transition-all flex items-center justify-center text-[9px] font-black uppercase tracking-widest ${
                    activeMediaTab === '3d'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/10 bg-white/[0.04] text-white/30 hover:border-white/25 hover:bg-white/[0.08]'
                  }`}
                >
                  3D
                </button>
              )}
              {product.images.filter(Boolean).map((img: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveMediaTab(idx)}
                  className={`flex-shrink-0 w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all ${
                    activeMediaTab === idx
                      ? 'border-primary shadow-md shadow-primary/20 opacity-100'
                      : 'border-white/10 opacity-50 hover:opacity-80 hover:border-white/25'
                  }`}
                >
                  <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
          
        </div>

        {/* INFO AREA */}
        <div className="space-y-5">
          {/* HEADER */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest">
                {product.category}
              </span>
              <span className="text-[9px] text-white/20 font-mono">REF: {product.id.slice(0, 8)}</span>
              {product.stock === 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[9px] font-black text-red-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Esgotado • Encomenda sob demanda
                </span>
              ) : typeof product.stock === 'number' && product.stock <= 3 && product.stock > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-400 uppercase tracking-widest animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Apenas {product.stock} em estoque!
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase leading-tight tracking-tight mb-2 break-words">
              {product.name}
            </h1>
            <p className="text-sm text-white/45 leading-relaxed max-w-md">
              {product.description}
            </p>
          </div>

          {/* MATERIAL SELECTION */}
          <div className="space-y-2.5">
            <p className="text-[9px] text-primary/60 uppercase font-black tracking-widest flex items-center gap-1.5">
              <Settings2 className="w-3 h-3" />
              Configurar Fabricação
            </p>
            <p className="text-[9px] text-white/25 uppercase font-bold tracking-wider">Material</p>
            <div className="grid grid-cols-1 gap-2">
              {materials.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMaterial(m)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedMaterial?.id === m.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-white/[0.07] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: m.color }} />
                    <div>
                      <p className="font-bold text-xs uppercase tracking-tight">{m.name}</p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wide">{m.desc || 'Acabamento de alta qualidade'}</p>
                    </div>
                  </div>
                  {selectedMaterial?.id === m.id && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* BUY BLOCK — price + qty + button all together */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-4">
            <div>
              <p className="text-[9px] text-white/25 uppercase font-black tracking-widest">Orçamento estimado</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-base font-mono text-white/35">R$</span>
                <span className="text-3xl sm:text-4xl font-black text-white leading-none">
                  {(product?.stock === 0 ? 0 : totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="flex items-stretch gap-3">
              <div className={`flex items-center rounded-xl border border-white/10 bg-white/[0.04] shrink-0 ${product?.stock === 0 ? 'opacity-40' : ''}`}>
                <button
                  disabled={product?.stock === 0}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 h-full hover:bg-white/5 transition-colors font-black text-white/40 text-xl disabled:pointer-events-none"
                >-</button>
                <span className="w-9 text-center font-display font-black text-lg">{product?.stock === 0 ? 0 : quantity}</span>
                <button
                  disabled={product?.stock === 0}
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 h-full hover:bg-white/5 transition-colors font-black text-white/40 text-xl disabled:pointer-events-none"
                >+</button>
              </div>
              <Button
                ref={addToCartRef}
                size="lg"
                className={`flex-1 h-14 rounded-2xl gap-2 text-xs font-black uppercase tracking-tight ${
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
                <ShoppingCart className="w-5 h-5" />
                {product?.stock === 0 ? "Encomendar sob demanda" : "Adicionar ao carrinho"}
              </Button>
            </div>
          </div>

          {/* SPEC CHIPS + SHARE */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.05]">
              <Weight className="w-3 h-3 text-primary/60 shrink-0" />
              <span className="text-[10px] font-bold text-white/50">~{product.technical?.weight || 80}g</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.05]">
              <Clock className="w-3 h-3 text-primary/60 shrink-0" />
              <span className="text-[10px] font-bold text-white/50">até 5 dias</span>
            </div>

            {/* Share button */}
            <div ref={shareRef} className="relative ml-auto">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.05] hover:bg-white/[0.08] hover:border-primary/20 transition-all text-white/40 hover:text-white/70"
                aria-label="Compartilhar produto"
              >
                <Share2 className="w-3 h-3 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Compartilhar</span>
              </button>

              <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl bg-[#0d1425] border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
                  >
                    <div className="p-1.5 space-y-0.5">
                      {/* WhatsApp */}
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${product.name} — INOVAPRO3D\n${window.location.href}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowShareMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#25D366">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                        </svg>
                        <span className="text-xs font-bold text-white/70">WhatsApp</span>
                      </a>

                      {/* Telegram */}
                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(product.name + " — INOVAPRO3D")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowShareMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#26A5E4">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                        </svg>
                        <span className="text-xs font-bold text-white/70">Telegram</span>
                      </a>

                      <div className="h-px bg-white/[0.06] mx-2 my-1" />

                      {/* Copy link */}
                      <button
                        type="button"
                        onClick={() => { handleCopyLink(); setShowShareMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                      >
                        {linkCopied
                          ? <Check className="w-4 h-4 shrink-0 text-green-400" />
                          : <Copy className="w-4 h-4 shrink-0 text-white/40" />}
                        <span className="text-xs font-bold text-white/70">
                          {linkCopied ? "Link copiado!" : "Copiar link"}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* DIMENSIONS */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 space-y-2.5">
            <p className="text-[9px] text-white/25 uppercase font-black tracking-widest">Dimensões do Modelo</p>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: "L", value: product.baseDimensions?.x || 120 },
                { label: "C", value: product.baseDimensions?.y || 120 },
                { label: "A", value: product.baseDimensions?.z || 150 },
              ].map(dim => (
                <div key={dim.label} className="flex items-baseline gap-0.5 rounded-lg bg-white/[0.04] border border-white/[0.04] px-2.5 py-1.5">
                  <span className="text-[8px] font-black uppercase text-white/30">{dim.label}</span>
                  <span className="text-sm font-mono font-black text-white ml-0.5">{dim.value}</span>
                  <span className="text-[8px] text-white/30 ml-0.5">mm</span>
                </div>
              ))}
            </div>
            <a
              href={waLink("Olá INOVAPRO3D! Tenho interesse em um tamanho personalizado para o modelo: " + (product?.name || ""))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
            >
              Tamanho personalizado? Solicite →
            </a>
          </div>

          <div className="flex items-center gap-2 text-[9px] text-white/15 uppercase font-black tracking-wider px-3 py-2 bg-white/[0.01] rounded-xl border border-white/[0.02]">
            <Maximize2 className="w-3 h-3 opacity-50 shrink-0" />
            Vol. Máx.: 300 × 300 × 350 mm
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
