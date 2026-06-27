import { useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Mail, HelpCircle, ArrowUpRight } from "lucide-react";
import { waLink, CONTACT } from "../../lib/config";
import { SocialLinks } from "./SocialLinks";

export default function FloatingSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  // Pages with a sticky bottom bar need extra vertical offset
  const hasStickyBar = ["/checkout", "/produto/"].some(p => pathname.startsWith(p));

  return (
    <div className={`fixed right-4 z-[100] transition-all duration-300 ${hasStickyBar ? "bottom-20 sm:bottom-24" : "bottom-4 sm:bottom-6"}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-14 right-0 w-60 sm:w-72 bg-[#0b0c15] rounded-[24px] p-5 border border-white/15 shadow-2xl shadow-black/60 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
            <h4 className="text-sm font-black uppercase tracking-widest mb-5">Central de Atendimento</h4>

            <div className="space-y-3">
              <a
                href={waLink("Olá INOVAPRO3D!")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-primary/10 hover:text-primary transition-all group border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp Direto</span>
                </div>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>

              <a
                href={`mailto:${CONTACT.email}`}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">E-mail Técnico</span>
                </div>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>

              <a
                href="/conhecimento"
                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-white/30" />
                  <span className="text-[10px] font-black uppercase tracking-widest">FAQ / Ajuda</span>
                </div>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>

            {/* Siga a gente — destaque das redes */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">Siga a gente</p>
              <SocialLinks showWhatsapp={false} itemClassName="h-9 w-9" iconClassName="w-3.5 h-3.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 border border-white/10 backdrop-blur-xl ${
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
              <X className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageCircle className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
