import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Box, ShoppingBag } from "lucide-react";
import type { Product } from "../../types/domain";
import { cn } from "../../lib/utils";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ProductCard({
  product,
  onAdd,
  className,
}: {
  product: Product;
  onAdd?: (p: Product) => void;
  className?: string;
}) {
  const image = product.images?.[0];
  const lowStock = typeof product.stock === "number" && product.stock > 0 && product.stock <= 3;
  const outOfStock = product.stock === 0;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "group/card relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] hover:border-white/12 transition-colors",
        className,
      )}
    >
      <Link to={`/produto/${product.id}`} className="block">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-white/[0.03]">
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Box className="h-8 w-8 text-white/15" />
            </div>
          )}

          {/* Vinheta inferior suave */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Category chip */}
          {product.category && (
            <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white/60 backdrop-blur-sm">
              {product.category}
            </span>
          )}

          {/* Stock badges */}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Esgotado</span>
            </div>
          )}
          {lowStock && !outOfStock && (
            <span className="absolute right-2 top-2 rounded-full bg-amber-500/80 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
              Últimas {product.stock}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="mb-2 min-h-[2rem] text-[10px] sm:text-[11px] font-black uppercase leading-snug tracking-tight text-white/90 line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[8px] font-black uppercase tracking-wider text-white/30">A partir de</p>
              <p className="text-sm font-black text-white">{brl(product.basePrice)}</p>
            </div>
            {onAdd && !outOfStock && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onAdd(product);
                }}
                className="flex h-8 shrink-0 items-center gap-1 rounded-xl bg-primary px-2.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
              >
                <ShoppingBag className="h-3 w-3" />
                <span className="hidden sm:inline">Add</span>
              </button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default ProductCard;
