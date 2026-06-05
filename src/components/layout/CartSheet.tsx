import React from "react";
import { X, ShoppingBag, Trash2, ArrowRight, Minus, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../contexts/CartContext";
import { Button } from "../ui/Button";
import { formatBRL as brl } from "../../lib/pricing";

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartSheet({ isOpen, onClose }: CartSheetProps) {
  const { items, removeItem, updateQuantity, total } = useCart();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* PANEL */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-surface z-[101] shadow-2xl border-l border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-primary" />
                <h2 className="text-base font-black uppercase tracking-tight">Carrinho</h2>
                {items.length > 0 && (
                  <span className="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                    {items.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar carrinho"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
                    <ShoppingBag className="w-6 h-6 text-white/15" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest text-white/25">Carrinho vazio</p>
                  <p className="mt-2 text-xs text-white/15 max-w-[200px] leading-relaxed">
                    Escolha um produto no catálogo para começar.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    className="flex gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-white/15" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-black uppercase leading-tight tracking-tight text-white/90 line-clamp-2 flex-1">
                          {item.name}
                        </p>
                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label="Remover item"
                          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity control */}
                        <div className="flex items-center gap-1 rounded-xl bg-white/[0.05] border border-white/[0.07] p-0.5">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            aria-label="Diminuir quantidade"
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.07] transition-all active:scale-90"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-[11px] font-black text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, +1)}
                            aria-label="Aumentar quantidade"
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.07] transition-all active:scale-90"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          {item.quantity > 1 && (
                            <p className="text-[8px] text-white/30 font-bold">
                              {item.quantity} × {brl(item.price)}
                            </p>
                          )}
                          <p className="text-sm font-black font-mono text-primary leading-none">
                            {brl(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-white/[0.07] bg-white/[0.01] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40 font-bold uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black font-mono">{brl(total)}</span>
              </div>
              <p className="text-[9px] leading-relaxed text-white/25 font-medium">
                Frete e impostos calculados na próxima etapa.
              </p>
              <Button
                className="w-full h-12 rounded-2xl gap-2 text-[11px] font-black uppercase tracking-widest group"
                disabled={items.length === 0}
                onClick={() => { onClose(); navigate("/checkout"); }}
              >
                Finalizar pedido
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
