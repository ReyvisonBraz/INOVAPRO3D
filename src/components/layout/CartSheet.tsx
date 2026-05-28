import React from "react";
import { X, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../contexts/CartContext";
import { Button } from "../ui/Button";

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartSheet({ isOpen, onClose }: CartSheetProps) {
  const { items, removeItem, total } = useCart();
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
            className="fixed top-0 right-0 h-full w-full max-w-md bg-surface z-[101] shadow-2xl border-l border-white/10 flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-display font-bold">Seu Carrinho</h2>
                <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {items.length} itens
                </span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <ShoppingBag className="w-8 h-8 text-white/10" />
                  </div>
                  <p className="text-white/30 italic">Seu carrinho está vazio.</p>
                  <p className="mt-2 max-w-xs text-xs text-white/20">Escolha um produto no catálogo para iniciar seu pedido.</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 group">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm truncate pr-4">{item.name}</h4>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-white/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Qtd: {item.quantity}</p>
                      <p className="text-sm font-display font-bold text-primary">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 glass border-t border-white/10">
              <div className="flex justify-between items-end mb-6">
                <span className="text-white/40 text-sm font-medium">Subtotal</span>
                <span className="text-2xl font-display font-bold">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="mb-4 text-[10px] leading-relaxed text-white/35">
                Na próxima etapa você revisa entrega, entra com sua conta e acompanha o andamento em Meus Pedidos.
              </p>
              
              <Button 
                className="w-full h-14 rounded-2xl group" 
                disabled={items.length === 0}
                onClick={() => {
                  onClose();
                  navigate('/checkout');
                }}
              >
                FINALIZAR PEDIDO
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
