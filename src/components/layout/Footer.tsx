import { Link } from "react-router-dom";
import { Cpu, Github, Instagram, Linkedin, Mail, Twitter, Globe, Shield } from "lucide-react";
import { BrandLogo } from "../brand/BrandLogo";
import { motion } from "framer-motion";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#07080d] pt-24 pb-12 px-6 lg:px-8 mt-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/2 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl w-full mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
          
          {/* Brand Identity */}
          <div className="lg:col-span-4 space-y-6">
            <Link to="/" className="group flex items-center">
              <BrandLogo markClassName="h-10 w-10" wordmarkClassName="text-xl" />
            </Link>
            <p className="text-sm text-white/35 font-medium leading-relaxed max-w-sm">
              Tecnologia, precisão e inovação em impressão 3D. Do digital ao objeto real, com acabamento de alta definição.
            </p>
            
            {/* Newsletter Integration */}
            <div className="space-y-3 pt-4">
               <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Fique Conectado</p>
               <div className="flex gap-2">
                 <input
                  type="email"
                  placeholder="Seu e-mail..."
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-xs outline-none focus:border-white/20 transition-all font-medium text-white placeholder-white/20"
                 />
                 <button className="px-6 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all">
                    ENVIAR
                 </button>
               </div>
            </div>

            <div className="flex gap-3 pt-4">
              <SocialLink icon={<Instagram className="w-3.5 h-3.5" />} />
              <SocialLink icon={<Twitter className="w-3.5 h-3.5" />} />
              <SocialLink icon={<Linkedin className="w-3.5 h-3.5" />} />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-2 space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Plataforma</h4>
            <ul className="space-y-4">
              <FooterLink to="/catalogo">Inventário 3D</FooterLink>
              <FooterLink to="/upload">Upload STL</FooterLink>
              <FooterLink to="/calculadora">Cálculo Maker</FooterLink>
              <FooterLink to="/meus-pedidos">Monitoramento</FooterLink>
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Ecossistema</h4>
            <ul className="space-y-4">
              <FooterLink to="#">Materiais</FooterLink>
              <FooterLink to="#">Engenharia</FooterLink>
              <FooterLink to="#">Segurança IP</FooterLink>
              <FooterLink to="#">Rede</FooterLink>
            </ul>
          </div>

          {/* Factory Status Pulse */}
          <div className="lg:col-span-4 space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Status da Rede</h4>
            <div className="p-8 rounded-[32px] bg-white/[0.03] border border-white/[0.06] space-y-6">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <span className="flex h-2 w-2 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Cluster Global: Ativo</span>
                 </div>
                 <Globe className="w-4 h-4 text-white/20" />
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/30">
                    <span>Carga Operacional</span>
                    <span>88.4%</span>
                 </div>
                 <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                   <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "88.4%" }}
                    transition={{ duration: 1, ease: "circOut" }}
                    className="h-full bg-primary"
                   />
                 </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                 <Shield className="w-3 h-3 text-white/40" />
                 <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">Protocolo de Sigilo Nível 4</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Strip */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[12px] text-white/20 font-black uppercase tracking-[0.2em] flex items-center gap-2">
             © 2026 INOVAPRO3D <span className="opacity-50">|</span> <span className="text-white/10 italic">Soluções Aditivas de Grau Industrial</span>
          </p>
          <div className="flex gap-12 text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">
            <a href="#" className="hover:text-white/50 transition-colors">Política de Privacidade</a>
            <a href="#" className="hover:text-white/50 transition-colors">Direitos de PI</a>
            <a href="#" className="hover:text-white/50 transition-colors">Termos de NDA</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ icon }: { icon: React.ReactNode }) {
  return (
    <a
      href="#"
      className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] text-white/30 hover:text-white transition-all duration-300"
    >
      {icon}
    </a>
  );
}

function FooterLink({ to, children }: { to: string, children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="text-[12px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:translate-x-1 inline-block transition-all duration-300"
      >
        {children}
      </Link>
    </li>
  );
}
