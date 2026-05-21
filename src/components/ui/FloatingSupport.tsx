import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Phone, Mail, HelpCircle, ArrowUpRight } from "lucide-react";

export default function FloatingSupport() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-72 glass-card rounded-[32px] p-6 border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
            <h4 className="text-sm font-black uppercase tracking-widest mb-6">Central de Atendimento</h4>
            
            <div className="space-y-4">
              <a 
                href="#" 
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-primary/10 hover:text-primary transition-all group border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp Direto</span>
                </div>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              
              <a 
                href="#" 
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">E-mail Técnico</span>
                </div>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>

              <div className="pt-4 border-t border-white/5 mt-2">
                <div className="flex items-center gap-3 text-white/30 px-3">
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">FAQ / Ajuda</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 border border-white/10 backdrop-blur-xl ${
          isOpen ? 'bg-white text-surface' : 'bg-primary text-white'
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
