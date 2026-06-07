import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  ShoppingBag,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Images,
} from "lucide-react";
import type { Product } from "../../types/domain";
import { cn } from "../../lib/utils";
import { formatBRL as brl } from "../../lib/pricing";

// ─────────────────────────────────────────────────────────────
// MODAL DE PRÉVIA DO PRODUTO
// ─────────────────────────────────────────────────────────────
function ProductModal({
  product,
  startIndex,
  onClose,
  onAdd,
  onViewFull,
}: {
  product: Product;
  startIndex: number;
  onClose: () => void;
  onAdd?: (p: Product) => void;
  onViewFull: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(startIndex);
  const images = product.images?.filter(Boolean) ?? [];
  const hasMultiple = images.length > 1;
  const lowStock =
    typeof product.stock === "number" && product.stock > 0 && product.stock <= 3;
  const outOfStock = product.stock === 0;

  const prev = () => setImgIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setImgIdx(i => (i + 1) % images.length);

  // Teclado: Esc fecha, setas navegam
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  // Ref-counted scroll lock so concurrent overlays (CartSheet + ProductModal) don't fight each other
  useEffect(() => {
    const prev = parseInt(document.body.dataset.overflowLocks ?? "0", 10);
    document.body.dataset.overflowLocks = String(prev + 1);
    if (prev === 0) document.body.style.overflow = "hidden";
    return () => {
      const next = Math.max(0, parseInt(document.body.dataset.overflowLocks ?? "1", 10) - 1);
      document.body.dataset.overflowLocks = String(next);
      if (next === 0) document.body.style.overflow = "";
    };
  }, []);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full sm:max-w-2xl max-h-[88dvh] sm:max-h-[85vh] overflow-y-auto rounded-t-[28px] sm:rounded-[24px] bg-[#0b0c15] border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Botão fechar */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-20 w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white/50 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 min-h-[380px]">

          {/* ── Galeria de imagens ── */}
          <div className="relative bg-black/40 overflow-hidden rounded-t-[28px] sm:rounded-l-[24px] sm:rounded-tr-none">
            {/* Imagem principal com transição */}
            <div className="relative aspect-square sm:h-full sm:aspect-auto">
              <AnimatePresence mode="wait">
                <motion.img
                  key={imgIdx}
                  src={images[imgIdx] ?? ""}
                  alt={`${product.name} — foto ${imgIdx + 1}`}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.22 }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Setas de navegação */}
              {hasMultiple && (
                <>
                  <button
                    onClick={prev}
                    aria-label="Foto anterior"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white transition-all hover:scale-105 active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={next}
                    aria-label="Próxima foto"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white transition-all hover:scale-105 active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Indicadores + dica */}
              <div className="absolute bottom-3 inset-x-0 flex flex-col items-center gap-2 px-4">
                {hasMultiple && (
                  <p className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-white/50">
                    <Images className="w-2.5 h-2.5" />
                    {imgIdx + 1} / {images.length} · use as setas ou teclas ← →
                  </p>
                )}
                {hasMultiple && (
                  <div className="flex gap-1">
                    {images.map((_, i) => (
                      <div key={i} className="min-h-[32px] min-w-[32px] flex items-center justify-center">
                        <button
                          onClick={() => setImgIdx(i)}
                          aria-label={`Foto ${i + 1}`}
                          className={cn(
                            "h-1 rounded-full transition-all duration-300",
                            i === imgIdx
                              ? "w-5 bg-white"
                              : "w-1.5 bg-white/30 hover:bg-white/60"
                          )}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Miniaturas (se 3+ imagens) */}
            {images.length >= 3 && (
              <div className="flex gap-1.5 p-2 bg-black/50 backdrop-blur-sm overflow-x-auto no-scrollbar">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={cn(
                      "flex-shrink-0 w-11 h-11 rounded-lg overflow-hidden border-2 transition-all",
                      i === imgIdx
                        ? "border-primary opacity-100"
                        : "border-white/10 opacity-45 hover:opacity-75"
                    )}
                  >
                    <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info do produto ── */}
          <div className="flex flex-col p-6">
            {/* Categoria + estoque */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {product.category && (
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/50">
                  {product.category}
                </span>
              )}
              {outOfStock && (
                <span className="text-[9px] font-black uppercase tracking-wider text-red-400">
                  Esgotado
                </span>
              )}
              {lowStock && !outOfStock && (
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">
                  Últimas {product.stock}
                </span>
              )}
            </div>

            {/* Nome */}
            <h2 className="text-xl sm:text-2xl font-black font-display uppercase leading-tight tracking-tight text-white mb-2">
              {product.name}
            </h2>

            {/* Descrição */}
            {product.description && (
              <p className="text-xs text-white/50 leading-relaxed mb-4 line-clamp-4">
                {product.description}
              </p>
            )}

            {/* Specs técnicos */}
            {product.technical && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {product.technical.printTime && (
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-[7px] font-black uppercase tracking-wider text-white/30 mb-0.5">Tempo</p>
                    <p className="text-[10px] font-black text-white/80">{product.technical.printTime}</p>
                  </div>
                )}
                {product.technical.resolution && (
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-[7px] font-black uppercase tracking-wider text-white/30 mb-0.5">Resolução</p>
                    <p className="text-[10px] font-black text-white/80">{product.technical.resolution}</p>
                  </div>
                )}
                {!!product.technical.infill && (
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-[7px] font-black uppercase tracking-wider text-white/30 mb-0.5">Preenchimento</p>
                    <p className="text-[10px] font-black text-white/80">{product.technical.infill}%</p>
                  </div>
                )}
                {!!product.technical.weight && (
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-[7px] font-black uppercase tracking-wider text-white/30 mb-0.5">Peso</p>
                    <p className="text-[10px] font-black text-white/80">{product.technical.weight}g</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1" />

            {/* Preço */}
            <div className="mb-5">
              <p className="text-[8px] font-black uppercase tracking-wider text-white/30 mb-0.5">A partir de</p>
              <p className="text-3xl font-black text-white">{brl(product.basePrice)}</p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2">
              {onAdd && !outOfStock && (
                <button
                  type="button"
                  onClick={() => { onAdd(product); onClose(); }}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Adicionar ao carrinho
                </button>
              )}
              <button
                type="button"
                onClick={onViewFull}
                className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.03] text-white/60 font-black text-[11px] uppercase tracking-widest hover:bg-white/[0.07] hover:text-white transition-all"
              >
                Ver produto completo
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────
// CARD DO PRODUTO (catálogo)
// ─────────────────────────────────────────────────────────────
export function ProductCard({
  product,
  onAdd,
  className,
}: {
  product: Product;
  onAdd?: (p: Product) => void;
  className?: string;
}) {
  const images = product.images?.filter(Boolean) ?? [];
  const hasMultiple = images.length > 1;
  const [imgIdx, setImgIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Trap browser-back inside modal: push a hash entry so back closes modal instead of leaving the page
  useEffect(() => {
    if (!modalOpen) return;
    const base = window.location.pathname + window.location.search;
    window.history.pushState(null, '', base + '#preview');
    const handler = () => setModalOpen(false);
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      if (window.location.hash === '#preview') {
        window.history.replaceState(null, '', base);
      }
    };
  }, [modalOpen]);

  const lowStock =
    typeof product.stock === "number" && product.stock > 0 && product.stock <= 3;
  const outOfStock = product.stock === 0;

  // Cicla imagens automaticamente no hover
  useEffect(() => {
    if (!hovered || !hasMultiple) {
      if (!hovered) setImgIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setImgIdx(i => (i + 1) % images.length);
    }, 1400);
    return () => clearInterval(timer);
  }, [hovered, hasMultiple, images.length]);

  return (
    <>
      <motion.div
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={cn(
          "group/card relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]",
          "hover:border-white/12 transition-colors cursor-pointer",
          className,
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setModalOpen(true)}
      >
        {/* Imagem */}
        <div className="relative aspect-square overflow-hidden bg-white/[0.03]">
          {images.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.img
                key={imgIdx}
                src={images[imgIdx]}
                alt={product.name}
                loading="lazy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
              />
            </AnimatePresence>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Box className="h-8 w-8 text-white/15" />
            </div>
          )}

          {/* Vinheta inferior */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Badge de múltiplas imagens */}
          {hasMultiple && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur-sm border border-white/10">
              <Images className="w-2.5 h-2.5 text-white/55" />
              <span className="text-[7px] font-black text-white/55">{images.length}</span>
            </div>
          )}

          {/* Chip de categoria */}
          {product.category && (
            <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white/60 backdrop-blur-sm">
              {product.category}
            </span>
          )}

          {/* Dots de progresso das imagens */}
          {hasMultiple && (
            <div className="absolute bottom-2 right-2 flex gap-1">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "block h-1 rounded-full transition-all duration-400",
                    i === imgIdx ? "w-3 bg-white" : "w-1 bg-white/30"
                  )}
                />
              ))}
            </div>
          )}

          {/* Esgotado */}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
                Esgotado
              </span>
            </div>
          )}
          {lowStock && !outOfStock && (
            <span className="absolute right-2 top-2 rounded-full bg-amber-500/80 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
              Últimas {product.stock}
            </span>
          )}

          {/* Overlay "Clique para ver" no hover */}
          <div className="absolute inset-0 flex items-end justify-center pb-9 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none">
            <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[7px] font-black uppercase tracking-wider text-white/90 whitespace-nowrap">
              {hasMultiple ? "↔ fotos · toque para ver" : "toque para ver"}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="mb-2 min-h-[2rem] text-[10px] sm:text-[11px] font-black uppercase leading-snug tracking-tight text-white/90 line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[8px] font-black uppercase tracking-wider text-white/30">
                A partir de
              </p>
              <p className="text-sm font-black text-white">{brl(product.basePrice)}</p>
            </div>
            {onAdd && !outOfStock && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onAdd(product);
                }}
                aria-label="Adicionar ao carrinho"
                className="flex h-10 sm:h-8 shrink-0 items-center gap-1 rounded-xl bg-primary px-2.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
              >
                <ShoppingBag className="h-4 w-4 sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">Add</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modal de prévia */}
      <AnimatePresence>
        {modalOpen && (
          <ProductModal
            product={product}
            startIndex={imgIdx}
            onClose={() => setModalOpen(false)}
            onAdd={onAdd}
            onViewFull={() => {
              const base = window.location.pathname + window.location.search;
              if (window.location.hash === '#preview') {
                window.history.replaceState(null, '', base);
              }
              setModalOpen(false);
              window.scrollTo({ top: 0, behavior: 'instant' });
              navigate(`/produto/${product.id}`, { state: { from: location.pathname } });
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default ProductCard;
