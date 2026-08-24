import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { PageSEO } from "../../components/seo/PageSEO";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { categoryNameToSlug } from "../../lib/categoryTree";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Weight,
  ShoppingCart,
  CheckCircle2,
  Box,
  X,
  Share2,
  Copy,
  Check,
  Zap,
  CreditCard,
  QrCode,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../services/firebase";
import { DEFAULT_PRICING_SETTINGS, formatBRL } from "../../lib/pricing";
import { trackAddToCart } from "../../lib/analytics";
import { ProductReviews } from "../../components/product/ProductReviews";
import { ErrorBoundary } from "../../components/layout/ErrorBoundary";
const STLViewer = lazy(() =>
  import("../../components/ui/STLViewer").then((m) => ({ default: m.STLViewer })),
);
import { Button } from "../../components/ui/Button";
import { useCart } from "../../contexts/CartContext";
import { toast } from "sonner";
import type { Product } from "../../types/domain";
import { waLink } from "../../lib/config";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeMediaTab, setActiveMediaTab] = useState<"3d" | number>("3d");
  const [showAddedModal, setShowAddedModal] = useState(false);
  const addToCartRef = useRef<HTMLButtonElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const shareRef = useRef<HTMLDivElement>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [pricing, setPricing] = useState({
    pixDiscountPct: DEFAULT_PRICING_SETTINGS.pixDiscountPct,
    maxInstallments: DEFAULT_PRICING_SETTINGS.maxInstallments,
  });

  // Parâmetros de PIX/parcelamento (configuráveis no painel → Ajustes)
  useEffect(() => {
    getDoc(doc(db, "settings", "storefront"))
      .then((snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setPricing({
          pixDiscountPct: Number.isFinite(data.pixDiscountPct)
            ? data.pixDiscountPct
            : DEFAULT_PRICING_SETTINGS.pixDiscountPct,
          maxInstallments: Number.isFinite(data.maxInstallments)
            ? data.maxInstallments
            : DEFAULT_PRICING_SETTINGS.maxInstallments,
        });
      })
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    if (!imageZoomOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setImageZoomOpen(false);
      if (event.key === "ArrowLeft" && typeof activeMediaTab === "number") {
        setActiveMediaTab((index) => (typeof index === "number" ? Math.max(0, index - 1) : index));
      }
      if (event.key === "ArrowRight" && typeof activeMediaTab === "number") {
        setActiveMediaTab((index) =>
          typeof index === "number"
            ? Math.min((product?.images?.length ?? 1) - 1, index + 1)
            : index,
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [imageZoomOpen, activeMediaTab, product?.images?.length]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = product?.name ?? "Produto INOVAPRO3D";
    const text = `Olha esse produto incrível da INOVAPRO3D: ${title}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        /* user cancelled */
      }
    } else {
      setShowShareMenu((v) => !v);
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
      { threshold: 0.5 },
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
    // reset da aba só quando troca de produto; reagir a images.length
    // re-selecionaria a aba no meio da navegação do usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const prodSnap = await getDoc(doc(db, "products", id));
        if (prodSnap.exists()) {
          const prod = { id: prodSnap.id, ...prodSnap.data() } as Product;
          setProduct(prod);
          // Relacionados da mesma categoria. Com `categoryId` a busca e pelo
          // vinculo real; sem ele, cai no nome como sempre foi.
          if (prod.categoryId || prod.category) {
            const sameCategory = prod.categoryId
              ? where("categoryId", "==", prod.categoryId)
              : where("category", "==", prod.category);
            const relSnap = await getDocs(
              query(collection(db, "products"), sameCategory, limit(7)),
            );
            setRelatedProducts(
              relSnap.docs
                .map((d) => ({ id: d.id, ...d.data() }) as Product)
                .filter((p) => p.id !== prod.id)
                .slice(0, 6),
            );
          }
        }
      } catch (error) {
        console.error("Error product detail:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const totalPrice = product ? product.basePrice * quantity : 0;
  const pixPrice = totalPrice * (1 - Math.min(100, Math.max(0, pricing.pixDiscountPct)) / 100);
  const installments = Math.max(1, Math.floor(pricing.maxInstallments));
  const installmentValue = totalPrice / installments;

  const addCurrentToCart = () => {
    if (!product) return false;
    addItem({
      id: product.id,
      name: product.name,
      price: totalPrice / quantity,
      quantity: quantity,
      image: product.images?.[0] ?? "",
      type: "PRODUCT",
      productId: product.id,
    });
    trackAddToCart(totalPrice, product.name);
    return true;
  };

  const handleAddToCart = () => {
    if (!addCurrentToCart()) return;
    toast.success(`${product?.name} adicionado!`, {
      description: `Quantidade: ${quantity}`,
    });
    setShowAddedModal(true);
  };

  // Comprar agora: adiciona e vai direto ao checkout (máxima velocidade)
  const handleBuyNow = () => {
    if (!product) return;
    if (product.stock === 0) {
      window.open(
        waLink(
          `Olá INOVAPRO3D! Tenho interesse em encomendar sob demanda o modelo: ${product.name}.`,
        ),
      );
      return;
    }
    if (!addCurrentToCart()) return;
    navigate("/checkout");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!product)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Produto não encontrado</h2>
        <Link to="/catalogo">
          <Button variant="outline">Voltar ao Catálogo</Button>
        </Link>
      </div>
    );

  return (
    <div className="container-section py-8 sm:py-12">
      <PageSEO
        title={product?.name ?? "Produto"}
        description={`${product?.name ?? "Peça"} em impressão 3D${product?.category ? ` — ${product.category}` : ""}. Precisão ±0,2mm, material premium, entrega nacional.`}
        path={`/produto/${product?.id ?? ""}`}
        image={product?.images?.[0]}
      />
      <nav aria-label="Breadcrumb" className="mb-4 sm:mb-8">
        <button
          type="button"
          onClick={() => {
            const origin = location.state as { from?: string; fromKey?: string } | null;
            if (origin?.fromKey) navigate(-1);
            else if (origin?.from) navigate(origin.from, { replace: true });
            else navigate("/catalogo", { replace: true });
          }}
          className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FAFAFA]/40 group-hover:text-white transition-colors">
            Voltar
          </span>
        </button>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-start">
        {/* VIEW AREA */}
        <div className="lg:sticky lg:top-28 space-y-6">
          {/* MAIN IMAGE / 3D — with swipe support */}
          <div
            className={`aspect-[4/3] lg:aspect-square w-full rounded-3xl overflow-hidden glass-card relative bg-black/25 select-none ${
              typeof activeMediaTab === "number" ? "cursor-zoom-in" : ""
            }`}
            onClick={() => {
              if (typeof activeMediaTab === "number") {
                setImageZoom(1);
                setImageZoomOpen(true);
              }
            }}
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStartX === null || typeof activeMediaTab !== "number") return;
              const dx = e.changedTouches[0].clientX - touchStartX;
              if (Math.abs(dx) > 44) {
                const imgs = product.images?.filter(Boolean) ?? [];
                setActiveMediaTab(
                  dx < 0
                    ? Math.min(activeMediaTab + 1, imgs.length - 1)
                    : Math.max(activeMediaTab - 1, 0),
                );
              }
              setTouchStartX(null);
            }}
          >
            {activeMediaTab === "3d" && hasModelUrl ? (
              <ErrorBoundary
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center px-6">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-3">
                        <Box className="w-6 h-6 text-dim" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-secondary">
                        Visualização 3D
                      </p>
                      <p className="text-xs text-subtle font-medium mt-1">
                        Não foi possível carregar o modelo
                      </p>
                    </div>
                  </div>
                }
              >
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    </div>
                  }
                >
                  <STLViewer url={hasModelUrl} color="#2563EB" scale={1} />
                </Suspense>
              </ErrorBoundary>
            ) : activeMediaTab === "3d" ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-3">
                    <Box className="w-6 h-6 text-dim" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">
                    Visualização 3D
                  </p>
                  <p className="text-xs text-subtle font-medium mt-1">Modelo não disponível</p>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                <motion.img
                  key={activeMediaTab}
                  src={product.images[activeMediaTab as number]}
                  alt={`${product.name} - Foto Real ${(activeMediaTab as number) + 1}`}
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              </AnimatePresence>
            )}

            {/* Arrow navigation — visible on desktop, complements swipe on mobile */}
            {typeof activeMediaTab === "number" && (product.images?.length ?? 0) > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Foto anterior"
                  disabled={activeMediaTab === 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveMediaTab(Math.max(0, (activeMediaTab as number) - 1));
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white transition-all disabled:opacity-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Próxima foto"
                  disabled={activeMediaTab === (product.images?.length ?? 1) - 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveMediaTab(
                      Math.min((product.images?.length ?? 1) - 1, (activeMediaTab as number) + 1),
                    );
                  }}
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
            {typeof activeMediaTab === "number" && (
              <button
                type="button"
                aria-label="Ampliar imagem"
                onClick={(event) => {
                  event.stopPropagation();
                  setImageZoom(1);
                  setImageZoomOpen(true);
                }}
                className="absolute right-3 top-3 flex h-10 items-center gap-2 rounded-full border border-white/15 bg-black/65 px-3 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md transition-colors hover:bg-black/85"
              >
                <Maximize2 className="h-4 w-4" /> Ampliar
              </button>
            )}
          </div>

          {/* THUMBNAIL STRIP — square click targets, scrollable */}
          {((product.images?.length ?? 0) > 0 || hasModelUrl) && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {hasModelUrl && (
                <button
                  type="button"
                  onClick={() => setActiveMediaTab("3d")}
                  className={`flex-shrink-0 w-14 h-14 rounded-2xl border-2 transition-all flex items-center justify-center text-xs font-black uppercase tracking-widest ${
                    activeMediaTab === "3d"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/10 bg-white/[0.04] text-secondary hover:border-white/25 hover:bg-white/[0.08]"
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
                      ? "border-primary shadow-md shadow-primary/20 opacity-100"
                      : "border-white/10 opacity-50 hover:opacity-80 hover:border-white/25"
                  }`}
                >
                  <img
                    src={img}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    width={56}
                    height={56}
                  />
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
              <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary uppercase tracking-widest">
                {product.category}
              </span>
              {product.stock === 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-black text-red-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Esgotado • Encomenda sob demanda
                </span>
              ) : typeof product.stock === "number" && product.stock <= 3 && product.stock > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-black text-amber-400 uppercase tracking-widest animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Apenas {product.stock} em estoque!
                </span>
              ) : null}
            </div>
            <h1 className="text-[clamp(1.5rem,1.3rem+1vw,1.875rem)] font-black uppercase leading-tight tracking-tight mb-2 break-words">
              {product.name}
            </h1>
            <p className="text-sm text-white/45 leading-relaxed max-w-md">{product.description}</p>
          </div>

          {/* BUY BLOCK — estilo ML: preço, PIX à vista, parcelas e ações */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-4">
            {product.stock === 0 ? (
              <div>
                <p className="text-[11px] text-secondary uppercase font-black tracking-widest">
                  Produção sob demanda
                </p>
                <p className="text-2xl font-black text-white mt-1">Faça sua encomenda</p>
                <p className="text-xs text-white/40 mt-1">
                  Orçamento personalizado pelo WhatsApp, sem compromisso.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-4xl sm:text-[2.75rem] font-black text-white leading-none tracking-tight">
                  {formatBRL(totalPrice)}
                </p>
                {pricing.pixDiscountPct > 0 && (
                  <p className="mt-2.5 flex items-center gap-2 text-sm font-bold text-green-400">
                    <QrCode className="w-4 h-4 shrink-0" />
                    <span>{formatBRL(pixPrice)} à vista no Pix</span>
                    <span className="text-[10px] font-black uppercase bg-green-500/15 text-green-300 px-1.5 py-0.5 rounded">
                      {pricing.pixDiscountPct}% off
                    </span>
                  </p>
                )}
                <p className="mt-1 text-xs text-white/45">
                  ou em até{" "}
                  <span className="font-bold text-white/75">
                    {installments}x de {formatBRL(installmentValue)}
                  </span>{" "}
                  sem juros no cartão
                </p>
              </div>
            )}

            {/* Quantidade */}
            {product.stock !== 0 && (
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-secondary">
                  Quantidade
                </span>
                <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3.5 py-2 hover:bg-white/5 transition-colors font-black text-white/40 text-xl leading-none"
                    aria-label="Diminuir"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-display font-black text-lg">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3.5 py-2 hover:bg-white/5 transition-colors font-black text-white/40 text-xl leading-none"
                    aria-label="Aumentar"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="space-y-2.5">
              <button
                ref={addToCartRef}
                type="button"
                onClick={handleBuyNow}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-green-500 text-white font-black text-sm uppercase tracking-wide shadow-lg shadow-green-500/25 hover:bg-green-400 active:scale-[0.99] transition-all"
              >
                <Zap className="w-5 h-5" />
                {product.stock === 0 ? "Encomendar agora" : "Comprar agora"}
              </button>
              {product.stock !== 0 && (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-wide shadow-lg shadow-primary/25 hover:bg-primary-dark active:scale-[0.99] transition-all"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Adicionar ao carrinho
                </button>
              )}
            </div>

            {/* Formas de pagamento */}
            {product.stock !== 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  Pague com
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 border border-green-500/20 px-2 py-1 text-[10px] font-bold text-green-300">
                  <QrCode className="w-3 h-3" /> Pix
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] px-2 py-1 text-[10px] font-bold text-white/55">
                  <CreditCard className="w-3 h-3" /> Cartão até {installments}x
                </span>
              </div>
            )}
          </div>

          {/* SPEC CHIPS + SHARE */}
          <div className="flex items-center gap-2 flex-wrap">
            {!!product.technical?.weight && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                <Weight className="w-3 h-3 text-primary/60 shrink-0" />
                <span className="text-[10px] font-bold text-white/50">
                  ~{product.technical.weight}g
                </span>
              </div>
            )}

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
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
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
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                        <span className="text-xs font-bold text-white/70">Telegram</span>
                      </a>

                      <div className="h-px bg-white/[0.06] mx-2 my-1" />

                      {/* Copy link */}
                      <button
                        type="button"
                        onClick={() => {
                          handleCopyLink();
                          setShowShareMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors"
                      >
                        {linkCopied ? (
                          <Check className="w-4 h-4 shrink-0 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 shrink-0 text-white/40" />
                        )}
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

          {/* DIMENSIONS — quando há medidas reais e não estiver oculto pelo admin */}
          {!product.hideDimensions &&
            product.baseDimensions &&
            (product.baseDimensions.x || product.baseDimensions.y || product.baseDimensions.z) && (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 space-y-2.5">
                <p className="text-xs text-secondary uppercase font-black tracking-widest">
                  Dimensões do Modelo
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: "L", value: product.baseDimensions.x },
                    { label: "C", value: product.baseDimensions.y },
                    { label: "A", value: product.baseDimensions.z },
                  ]
                    .filter((dim) => !!dim.value)
                    .map((dim) => (
                      <div
                        key={dim.label}
                        className="flex items-baseline gap-0.5 rounded-lg bg-white/[0.04] border border-white/[0.04] px-2.5 py-1.5"
                      >
                        <span className="text-[11px] font-black uppercase text-secondary">
                          {dim.label}
                        </span>
                        <span className="text-sm font-mono font-black text-white ml-0.5">
                          {dim.value}
                        </span>
                        <span className="text-[11px] text-secondary ml-0.5">mm</span>
                      </div>
                    ))}
                </div>
                <a
                  href={waLink(
                    "Olá INOVAPRO3D! Tenho interesse em um tamanho personalizado para o modelo: " +
                      (product?.name || ""),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
                >
                  Tamanho personalizado? Solicite →
                </a>
              </div>
            )}
        </div>
      </div>

      {/* Avaliações / prova social */}
      <ProductReviews productId={product.id} />

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 sm:mt-24"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">
                Mesma Categoria
              </p>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                Você também pode gostar
              </h2>
            </div>
            <Link
              to={`/catalogo?categoria=${categoryNameToSlug(product.category)}`}
              className="text-xs font-black uppercase tracking-widest text-white/30 hover:text-primary transition-colors flex items-center gap-1"
            >
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.map((rel, i) => (
              <motion.div
                key={rel.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.4, ease: "easeOut" }}
              >
                <Link
                  to={`/produto/${rel.id}`}
                  state={{ from: location.pathname }}
                  className="block group rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-primary/30 hover:bg-primary/[0.03] transition-all"
                >
                  <div className="aspect-square overflow-hidden bg-black/30">
                    {rel.images?.[0] ? (
                      <img
                        src={rel.images[0]}
                        alt={rel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Box className="w-8 h-8 text-white/10" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-black uppercase tracking-tight leading-tight line-clamp-2 text-white/70 group-hover:text-white transition-colors">
                      {rel.name}
                    </p>
                    <p className="text-xs font-mono font-black text-primary mt-1.5">
                      R$ {rel.basePrice?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      <AnimatePresence>
        {showAddedModal && product && (
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
                className="absolute right-4 top-4 rounded-full p-2 text-secondary transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6 flex items-start gap-4 pr-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-500/15 text-green-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">
                    Produto no carrinho
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-white/45">
                    Agora você pode finalizar o pedido ou continuar escolhendo outras peças.
                  </p>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="text-sm font-black uppercase text-white">{product.name}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Qtd. {quantity}
                </p>
                <p className="mt-3 font-mono text-lg font-black text-primary">
                  R$ {totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
                  onClick={() => navigate("/checkout")}
                >
                  Finalizar pedido <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Galeria ampliada */}
      <AnimatePresence>
        {imageZoomOpen &&
          typeof activeMediaTab === "number" &&
          product.images?.[activeMediaTab] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex flex-col bg-black/95 backdrop-blur-xl"
              role="dialog"
              aria-modal="true"
              aria-label={`Imagem ampliada de ${product.name}`}
              onClick={() => setImageZoomOpen(false)}
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
                <p className="truncate text-xs font-black uppercase tracking-widest text-white/60">
                  {product.name} · {activeMediaTab + 1} de {product.images.filter(Boolean).length}
                </p>
                <button
                  type="button"
                  onClick={() => setImageZoomOpen(false)}
                  aria-label="Fechar imagem ampliada"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div
                className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 sm:p-8"
                onClick={(event) => event.stopPropagation()}
                onWheel={(event) => {
                  event.preventDefault();
                  setImageZoom((current) =>
                    Math.min(4, Math.max(1, current + (event.deltaY < 0 ? 0.25 : -0.25))),
                  );
                }}
              >
                <motion.img
                  key={activeMediaTab}
                  src={product.images[activeMediaTab]}
                  alt={`${product.name} ampliado`}
                  className="max-h-full max-w-full select-none object-contain"
                  style={{ scale: imageZoom }}
                  drag={imageZoom > 1}
                  dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
                  dragElastic={0.08}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  onDoubleClick={() => setImageZoom((current) => (current > 1 ? 1 : 2))}
                />

                {activeMediaTab > 0 && (
                  <button
                    type="button"
                    aria-label="Imagem anterior"
                    onClick={() => {
                      setActiveMediaTab(activeMediaTab - 1);
                      setImageZoom(1);
                    }}
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white hover:bg-black/85 sm:left-6"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {activeMediaTab < product.images.filter(Boolean).length - 1 && (
                  <button
                    type="button"
                    aria-label="Próxima imagem"
                    onClick={() => {
                      setActiveMediaTab(activeMediaTab + 1);
                      setImageZoom(1);
                    }}
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white hover:bg-black/85 sm:right-6"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 border-t border-white/10 px-4 py-3">
                <button
                  type="button"
                  aria-label="Diminuir zoom"
                  disabled={imageZoom <= 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    setImageZoom((current) => Math.max(1, current - 0.25));
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white disabled:opacity-30"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="min-w-16 text-center font-mono text-xs font-black text-white/70">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  type="button"
                  aria-label="Aumentar zoom"
                  disabled={imageZoom >= 4}
                  onClick={(event) => {
                    event.stopPropagation();
                    setImageZoom((current) => Math.min(4, current + 0.25));
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white disabled:opacity-30"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <span className="hidden text-[10px] font-bold uppercase tracking-widest text-white/35 sm:inline">
                  Scroll ou duplo clique para ampliar
                </span>
              </div>
            </motion.div>
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
            className="fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.07] bg-black/90 backdrop-blur-md pb-safe"
          >
            <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
              {product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-xl border border-white/10 object-cover"
                  loading="lazy"
                  decoding="async"
                  width={40}
                  height={40}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-black uppercase tracking-tight text-white">
                  {product.name}
                </p>
                {product.stock === 0 ? (
                  <p className="text-sm font-black text-white/60">Sob demanda</p>
                ) : (
                  <p className="text-sm font-black text-white leading-tight">
                    {formatBRL(totalPrice)}
                    {pricing.pixDiscountPct > 0 && (
                      <span className="ml-1.5 text-[11px] font-bold text-green-400">
                        · {formatBRL(pixPrice)} no Pix
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleBuyNow}
                className="flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-green-500 px-5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-green-400 active:scale-95 transition-all"
              >
                <Zap className="h-4 w-4" />
                {product.stock === 0 ? "Encomendar" : "Comprar"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
