import { useState, useEffect, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Box, Folder, ShoppingBag, Images } from "lucide-react";
import type { Product } from "../../types/domain";
import { cn } from "../../lib/utils";
import { formatBRL as brl } from "../../lib/pricing";
import { categoryNameToSlug } from "../../lib/categoryTree";

// ─────────────────────────────────────────────────────────────
// CARD DO PRODUTO (catálogo) — clique vai direto à página do produto
// ─────────────────────────────────────────────────────────────
export const ProductCard = memo(function ProductCard({
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
  const navigate = useNavigate();
  const location = useLocation();

  const lowStock =
    typeof product.stock === "number" && product.stock > 0 && product.stock <= 3;
  const outOfStock = product.stock === 0;

  const openProduct = () =>
    navigate(`/produto/${product.id}`, { state: { from: location.pathname } });

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
      onClick={openProduct}
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
            <Box className="h-8 w-8 text-dim" />
          </div>
        )}

        {/* Vinheta inferior */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Badge de múltiplas imagens */}
        {hasMultiple && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur-sm border border-white/10">
            <Images className="w-2.5 h-2.5 text-white/55" />
            <span className="text-[10px] font-black text-white/55">{images.length}</span>
          </div>
        )}

        {/* Chip de categoria */}
        {product.category && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/catalogo?categoria=${categoryNameToSlug(product.category)}`);
            }}
            className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white/60 backdrop-blur-sm opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 hover:text-primary hover:bg-black/90 cursor-pointer border border-transparent hover:border-primary/30"
            title={`Ver todos em ${product.category}`}
          >
            <Folder className="w-3 h-3" />
            {product.category}
          </button>
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
          <span className="absolute right-2 top-2 rounded-full bg-amber-500/80 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white">
            Últimas {product.stock}
          </span>
        )}

        {/* Overlay "Comprar" no hover */}
        <div className="absolute inset-0 flex items-end justify-center pb-9 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-primary/90 backdrop-blur-md border border-white/15 text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap">
            Ver e comprar
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="mb-2 min-h-[2.2rem] text-xs sm:text-[13px] font-bold leading-snug tracking-tight text-white/90 line-clamp-2">
          {product.name}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-secondary">
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
  );
});

export default ProductCard;
