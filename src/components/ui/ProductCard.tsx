import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Box, ShoppingBag } from "lucide-react";
import type { Product } from "../../types/domain";
import { cn } from "../../lib/utils";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Card de produto premium — para o catálogo e vitrines de lançamento.
 * Hover com elevação + glow, chip de categoria, selo de estoque, CTA.
 */
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
  const lowStock =
    typeof product.stock === "number" && product.stock > 0 && product.stock <= 3;
  const outOfStock = product.stock === 0;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "group/card card-glow relative overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.02]",
        className,
      )}
    >
      <Link to={`/produto/${product.id}`} className="block">
        {/* Imagem */}
        <div className="relative aspect-[4/5] overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
              <Box className="h-12 w-12 text-white/15" />
            </div>
          )}

          {/* Vinheta inferior */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070d] via-[#05070d]/20 to-transparent opacity-90" />

          {/* Chip de categoria */}
          {product.category && (
            <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/80 backdrop-blur-md">
              {product.category}
            </span>
          )}

          {/* Selo de estoque */}
          {outOfStock ? (
            <span className="absolute right-4 top-4 rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-red-300 backdrop-blur-md">
              Esgotado
            </span>
          ) : lowStock ? (
            <span className="absolute right-4 top-4 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-300 backdrop-blur-md">
              Últimas {product.stock}
            </span>
          ) : null}

          {/* Seta hover */}
          <span className="absolute right-4 bottom-4 flex h-10 w-10 translate-y-3 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white opacity-0 backdrop-blur-md transition-all duration-500 group-hover/card:translate-y-0 group-hover/card:opacity-100">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        {/* Conteúdo */}
        <div className="space-y-3 p-5">
          <div className="min-h-[2.5rem]">
            <h3 className="font-display text-lg font-black uppercase leading-tight tracking-tight text-white line-clamp-1">
              {product.name}
            </h3>
            {product.description && (
              <p className="mt-1 text-xs leading-relaxed text-white/40 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-white/5 pt-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
                A partir de
              </p>
              <p className="font-display text-xl font-black text-white">
                {brl(product.basePrice)}
              </p>
            </div>
            {onAdd && !outOfStock && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onAdd(product);
                }}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:bg-primary-dark active:scale-95"
              >
                <ShoppingBag className="h-4 w-4" />
                Adicionar
              </button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default ProductCard;
