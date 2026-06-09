import React from "react";
import { PageSEO } from "../../components/seo/PageSEO";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Box, Home, HelpCircle, MessageCircle } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { waLink } from "../../lib/config";

const quickLinks = [
  { label: "Miniaturas", to: "/catalogo?categoria=Miniaturas" },
  { label: "Decoração", to: "/catalogo?categoria=Decoração" },
  { label: "Funcional", to: "/catalogo?categoria=Funcional" },
  { label: "Educacional", to: "/catalogo?categoria=Educacional" },
  { label: "Games", to: "/catalogo?categoria=Games" },
];


export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-16">
      <PageSEO
        title="Página não encontrada"
        description="A página que você procura não existe. Explore o catálogo de peças impressas em 3D ou fale com nosso suporte."
        path="/404"
        noindex
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-lg mx-auto w-full"
      >
        <div className="w-20 h-20 mx-auto mb-8 rounded-[24px] border border-white/10 bg-white/[0.03] flex items-center justify-center">
          <Box className="w-9 h-9 text-white/20" />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">Erro 404</p>

        <h1 className="font-display text-5xl sm:text-7xl font-black uppercase leading-[0.9] tracking-tight text-white mb-6">
          Página não<br />
          <span className="text-shimmer italic">encontrada.</span>
        </h1>

        <p className="text-white/40 font-medium text-base mb-10 max-w-sm mx-auto">
          Essa página não existe ou foi movida. Explore nosso catálogo ou use os atalhos abaixo.
        </p>

        {/* Quick category chips */}
        <div className="mb-10">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-4">Categorias populares</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {quickLinks.map(link => (
              <Link
                key={link.label}
                to={link.to}
                className="px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Main actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
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

        {/* Help link */}
        <a
          href={waLink("Olá INOVAPRO3D! Estava navegando e encontrei uma página que não existe. Podem me ajudar?")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/25 hover:text-primary transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Falar com suporte
        </a>
      </motion.div>
    </div>
  );
}
