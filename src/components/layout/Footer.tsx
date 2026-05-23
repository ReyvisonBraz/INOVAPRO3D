import { Link } from "react-router-dom";
import { Cpu, Github, Instagram, Linkedin, Mail, Twitter, Globe, Shield } from "lucide-react";
import { motion } from "framer-motion";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-surface pt-24 pb-12 px-6 lg:px-8 mt-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/2 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl w-full mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
          
          {/* Brand Identity */}
          <div className="lg:col-span-4 space-y-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-all duration-500">
                <Cpu className="text-primary w-5 h-5" />
              </div>
              <span className="font-display font-black text-xl uppercase tracking-tighter text-shimmer">
                ProtoDash
              </span>
            </Link>
            <p className="text-base text-white/30 font-medium leading-relaxed max-w-sm italic">
              Materializando o impossível através da manufatura descentralizada de alta precisão.
            </p>
            
            {/* Newsletter Integration */}
            <div className="space-y-3 pt-4">
               <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary">Stay Synced</p>
               <div className="flex gap-2">
                 <input 
                  type="email" 
                  placeholder="Seu e-mail..."
                  className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary/50 transition-all font-medium"
                 />
                 <button className="px-6 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all">
                   OK
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
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Plataforma</h4>
            <ul className="space-y-4">
              <FooterLink to="/catalogo">Inventário 3D</FooterLink>
              <FooterLink to="/upload">Upload STL</FooterLink>
              <FooterLink to="/calculadora">Maker Calculus</FooterLink>
              <FooterLink to="/meus-pedidos">Monitoramento</FooterLink>
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Ecossistema</h4>
            <ul className="space-y-4">
              <FooterLink to="#">Materiais</FooterLink>
              <FooterLink to="#">Engenharia</FooterLink>
              <FooterLink to="#">Segurança IP</FooterLink>
              <FooterLink to="#">Network</FooterLink>
            </ul>
          </div>

          {/* Factory Status Pulse */}
          <div className="lg:col-span-4 space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Network Status</h4>
            <div className="p-8 rounded-[32px] bg-white/[0.03] border border-white/5 space-y-6">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Cluster Global: Active</span>
                 </div>
                 <Globe className="w-4 h-4 text-white/20" />
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/30">
                    <span>Carga Operacional</span>
                    <span>88.4%</span>
                 </div>
                 <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                   <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: "88.4%" }}
                    transition={{ duration: 1, ease: "circOut" }}
                    className="h-full bg-primary" 
                   />
                 </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-xl">
                 <Shield className="w-3 h-3 text-primary" />
                 <span className="text-[8px] text-primary font-black uppercase tracking-widest">Protocolo de Sigilo Nível 4</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Strip */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[12px] text-white/20 font-black uppercase tracking-[0.2em] flex items-center gap-2">
            © 2026 ProtoDash Interactive <span className="opacity-50">|</span> <span className="text-white/10 italic">Industrial Grade Additive Solutions</span>
          </p>
          <div className="flex gap-12 text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">IP Rights</a>
            <a href="#" className="hover:text-white transition-colors">NDA Terms</a>
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
      className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-primary/20 hover:border-primary/50 text-white/40 hover:text-primary transition-all duration-300"
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
        className="text-[12px] font-black uppercase tracking-widest text-white/40 hover:text-primary hover:translate-x-1 inline-block transition-all duration-300"
      >
        {children}
      </Link>
    </li>
  );
}
