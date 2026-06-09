import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Box, Home } from "lucide-react";
import { Button } from "../../components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-lg mx-auto"
      >
        <div className="w-20 h-20 mx-auto mb-8 rounded-[24px] border border-white/10 bg-white/[0.03] flex items-center justify-center">
          <Box className="w-9 h-9 text-white/20" />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
          Erro 404
        </p>

        <h1 className="font-display text-5xl sm:text-7xl font-black uppercase leading-[0.9] tracking-tight text-white mb-6">
          Página não<br />
          <span className="text-shimmer italic">encontrada.</span>
        </h1>

        <p className="text-white/40 font-medium text-base mb-12 max-w-sm mx-auto">
          Essa página não existe ou foi movida. Comece pelo catálogo e encontre o que procura.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/catalogo">
            <Button className="h-14 px-8 rounded-2xl gap-2 text-[10px] font-black uppercase tracking-widest w-full sm:w-auto">
              Ver catálogo <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="h-14 px-8 rounded-2xl gap-2 text-[10px] font-black uppercase tracking-widest w-full sm:w-auto">
              <Home className="w-4 h-4" /> Início
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
