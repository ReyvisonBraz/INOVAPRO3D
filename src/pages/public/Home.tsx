import { motion, Variants, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  ShieldCheck, 
  Layers, 
  Clock, 
  ArrowRight,
  Printer,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Plus,
  Box,
  Cpu,
  Monitor,
  Maximize2,
  Filter
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import type { ShowcaseItem } from "../../types/domain";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" }
  }
};

export default function Home() {
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchShowcase = async () => {
      try {
        const snap = await getDocs(query(collection(db, "showcase"), orderBy("createdAt", "desc")));
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ShowcaseItem));
        setShowcase(items);
        
        const cats = Array.from(new Set(items.map(i => i.category).filter(Boolean)));
        setCategories(cats as string[]);
      } catch (err) {
        console.error("Error fetching showcase:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchShowcase();
  }, []);

  const filteredItems = filter === 'ALL' 
    ? showcase 
    : showcase.filter(i => i.category === filter);

  const navigateLightbox = (direction: number) => {
    if (selectedIndex === null) return;
    const nextIndex = (selectedIndex + direction + filteredItems.length) % filteredItems.length;
    setSelectedIndex(nextIndex);
  };

  return (
    <div className="relative overflow-hidden">
      {/* HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center justify-center pt-20 pb-20 sm:pb-32 px-6 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] aspect-square bg-primary/5 rounded-full blur-[100px] sm:blur-[160px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] sm:bg-[size:40px_40px] pointer-events-none" />

        <div className="container-section relative z-10">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[8px] sm:text-[9px] font-black tracking-[0.2em] uppercase mb-6 sm:mb-8">
              <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
              Inovalt3D — Impressão 3D de Alta Definição
            </motion.div>

            <motion.h1 variants={itemVariants} className="heading-lg sm:heading-xl mb-6 text-white">
              Sua Ideia <br/>
              Materializada em <span className="text-shimmer italic">Objetos Reais.</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-sm sm:text-base text-white/40 max-w-sm sm:max-w-md mx-auto mb-8 sm:mb-10 font-medium leading-relaxed italic">
              Transformamos sonhos digitais em realidade física com acabamento premium. 
              Decorações e protótipos com a melhor tecnologia do mercado.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
              <Link to="/catalogo" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto group relative px-8 sm:px-10 py-4 sm:py-5 bg-white rounded-2xl overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95 shadow-[0_20px_50px_-15px_rgba(255,255,255,0.3)]">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center justify-center gap-3">
                    <Box className="w-4 h-4 sm:w-5 sm:h-5 text-surface group-hover:rotate-12 transition-transform" />
                    <span className="text-surface font-display font-black uppercase tracking-tight text-sm sm:text-base">Ver Catálogo</span>
                  </div>
                </button>
              </Link>
              <Link to="/upload" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto group relative px-8 sm:px-10 py-4 sm:py-5 bg-surface border-2 border-white/10 rounded-2xl overflow-hidden transition-all duration-500 hover:border-primary/50 hover:bg-white/5 active:scale-95">
                  <div className="relative flex items-center justify-center gap-3 text-white/50 group-hover:text-white transition-colors">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-primary transition-colors" />
                    <span className="font-display font-black uppercase tracking-tight text-sm sm:text-base">Orçamento Instantâneo</span>
                  </div>
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="bg-white/[0.02] border-y border-white/5 py-12 sm:py-16">
        <div className="container-section grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
          {[
            { val: "48h", label: "ENTREGA RÁPIDA" },
            { val: "20+", label: "CORES DISPONÍVEIS" },
            { val: "PREMIUM", label: "ALTA DEFINIÇÃO" },
            { val: "500+", label: "CLIENTES FELIZES" },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl sm:text-4xl lg:text-6xl font-display font-black text-white mb-2">{stat.val}</p>
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-primary">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="container-section py-20 sm:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-8 text-center md:text-left">
           <div className="max-w-xl">
             <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-3">Por que a Inovalt3D?</h2>
             <p className="heading-md sm:heading-lg text-white">
               Transformamos arquivos <br className="hidden sm:block" /> em objetos surpreendentes.
             </p>
           </div>
           <p className="text-sm sm:text-base text-white/30 max-w-xs font-medium leading-relaxed italic mx-auto md:mx-0">
             Focamos no acabamento final para que sua peça pareça tudo, menos "feita em casa".
           </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {[
            { icon: Zap, title: "Rapidez", desc: "Seu orçamento e a produção começam quase que instantaneamente.", color: "text-primary", delay: 0 },
            { icon: ShieldCheck, title: "Qualidade", desc: "Peças resistentes e com cores vivas para qualquer finalidade.", color: "text-green-400", delay: 0.1 },
            { icon: Clock, title: "Confiança", desc: "Acompanhamos seu projeto do início ao fim, garantindo satisfação.", color: "text-blue-400", delay: 0.2 }
          ].map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: f.delay }}
              className="p-8 sm:p-10 rounded-[32px] bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all group flex flex-col h-full shadow-lg"
            >
              <div className={`w-12 h-12 bg-black/20 rounded-xl flex items-center justify-center mb-8 group-hover:bg-primary/20 transition-colors ${f.color}`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black font-display uppercase tracking-tight mb-4">{f.title}</h3>
              <p className="text-base text-white/30 font-medium leading-relaxed flex-1">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-24 sm:py-32 bg-white/[0.01]">
        <div className="container-section">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
            <header className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
                 <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                 <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary">Galeria Inovalt3D</span>
              </div>
              <h2 className="heading-md sm:heading-lg text-white font-black uppercase tracking-tighter">
                Nossas <span className="text-shimmer italic">Impressões Privadas.</span>
              </h2>
            </header>

            {/* FILTER DROPDOWN/LIST */}
            <div className="flex flex-wrap justify-center sm:justify-end gap-3">
              <button 
                onClick={() => setFilter('ALL')}
                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all border ${
                  filter === 'ALL' ? 'bg-primary border-primary text-surface' : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all border ${
                    filter === cat ? 'bg-primary border-primary text-surface' : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          {loading ? (
             <div className="h-96 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
             </div>
          ) : (
            <div className="relative">
              <motion.div 
                layout
                className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6"
              >
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, idx) => (
                    <motion.div 
                      layout
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4, delay: (idx % 4) * 0.1 }}
                      onClick={() => setSelectedIndex(idx)}
                      className="break-inside-avoid group relative rounded-[32px] overflow-hidden border border-white/5 bg-surface cursor-pointer shadow-lg hover:shadow-primary/5 transition-all hover:border-primary/20"
                    >
                      <div className="relative aspect-auto">
                        <img 
                          src={item.image} 
                          loading="lazy"
                          decoding="async"
                          className="w-full h-auto object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" 
                          alt={item.title} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-x-0 bottom-0 p-8 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest">{item.category}</span>
                          </div>
                          <h4 className="text-lg font-display font-black uppercase tracking-tight text-white mb-2">{item.title}</h4>
                          <p className="text-xs text-white/40 font-medium line-clamp-2 italic">{item.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* LIGHTBOX MODAL */}
              <AnimatePresence>
                {selectedIndex !== null && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-surface/95 backdrop-blur-2xl flex items-center justify-center p-6 sm:p-12"
                  >
                    <button 
                      onClick={() => setSelectedIndex(null)}
                      className="absolute top-8 right-8 z-[110] p-4 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Plus className="w-8 h-8 rotate-45" />
                    </button>

                    <button 
                      onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
                      className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-4 sm:p-6 rounded-full bg-white/5 border border-white/10 text-white/20 hover:text-white hover:bg-primary transition-all z-[110]"
                    >
                      <ChevronLeft className="w-6 h-6 sm:w-10 sm:h-10" />
                    </button>

                    <button 
                      onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
                      className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-4 sm:p-6 rounded-full bg-white/5 border border-white/10 text-white/20 hover:text-white hover:bg-primary transition-all z-[110]"
                    >
                      <ChevronRight className="w-6 h-6 sm:w-10 sm:h-10" />
                    </button>

                    <motion.div 
                      key={selectedIndex}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="relative max-w-5xl w-full aspect-[4/3] sm:aspect-video rounded-[40px] overflow-hidden shadow-2xl border border-white/10"
                    >
                      <img 
                        src={filteredItems[selectedIndex].image} 
                        className="w-full h-full object-cover"
                        alt={filteredItems[selectedIndex].title}
                      />
                      <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12 bg-gradient-to-t from-black via-black/40 to-transparent">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="px-3 py-1 rounded-full bg-primary text-surface text-[10px] font-black uppercase tracking-widest">{filteredItems[selectedIndex].category}</span>
                          <span className="text-white/40 text-[10px] font-black uppercase tracking-widest font-mono">Item {selectedIndex + 1} de {filteredItems.length}</span>
                        </div>
                        <h3 className="text-3xl sm:text-5xl font-display font-black uppercase tracking-tight text-white mb-4">{filteredItems[selectedIndex].title}</h3>
                        <p className="text-lg text-white/60 font-medium max-w-2xl italic leading-relaxed">{filteredItems[selectedIndex].description}</p>
                      </div>
                    </motion.div>

                    {/* INDICATORS */}
                    <div className="absolute bottom-8 sm:bottom-12 flex justify-center gap-2 sm:gap-3 z-[110]">
                      {filteredItems.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedIndex(idx)}
                          className={`h-1.5 transition-all duration-500 rounded-full ${
                            idx === selectedIndex ? "w-8 sm:w-12 bg-primary" : "w-1.5 sm:w-3 bg-white/10 hover:bg-white/20"
                          }`}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {filteredItems.length === 0 && !loading && (
             <div className="text-center py-20 bg-white/[0.02] rounded-[40px] border border-dashed border-white/10">
                <p className="text-white/20 italic font-medium">Nenhuma peça encontrada nesta categoria.</p>
             </div>
          )}

          <div className="mt-16 text-center">
            <Link to="/catalogo">
              <button className="group px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white text-white hover:text-surface transition-all">
                Explorar Catálogo Completo
              </button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container-section pb-32">
        <div className="rounded-[48px] sm:rounded-[64px] bg-primary p-8 sm:p-12 lg:px-24 lg:py-24 flex flex-col lg:flex-row items-center justify-between gap-12 sm:gap-16 overflow-hidden relative selection:bg-white/30">
          <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          <div className="absolute inset-x-0 inset-y-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex-1 text-center lg:text-left">
            <h2 className="heading-lg sm:heading-xl text-white mb-6 uppercase tracking-tight">
              TRANSFORME <br/> SUA <span className="italic opacity-80 underline underline-offset-[12px] sm:underline-offset-[16px]">IDÉIA EM REALIDADE.</span>
            </h2>
            <p className="text-white text-base sm:text-lg max-w-xl mb-10 font-medium leading-relaxed italic opacity-90 mx-auto lg:mx-0">
              Pronto para imprimir seu primeiro projeto em 3D? Comece agora com a Inovalt3D.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/upload" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-16 px-10 rounded-2xl gap-3 text-base font-display font-black uppercase tracking-tight bg-white text-primary hover:scale-105 transition-transform shadow-2xl">
                  SOLICITAR ORÇAMENTO <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative z-10 hidden xl:block">
             <div className="w-[450px] h-[450px] rounded-[60px] bg-black/20 border border-white/10 backdrop-blur-xl p-10 flex flex-col justify-between">
                <div>
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-widest text-white/60">Node Online: SPO-01</span>
                   </div>
                   <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "78%" }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                        className="h-full bg-white"
                      />
                   </div>
                </div>
                
                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <div>
                         <p className="text-[10px] text-white/40 uppercase font-black mb-1">Peça Atual</p>
                         <p className="font-display font-black text-xl uppercase tracking-tight">COLECIONAVEL-PLA</p>
                      </div>
                      <Monitor className="w-8 h-8 text-white/20" />
                   </div>
                   <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                      <div>
                         <p className="text-[8px] text-white/30 uppercase font-bold">Material</p>
                         <p className="text-xs font-mono font-bold">PLA-SILK-ROSA</p>
                      </div>
                      <div>
                         <p className="text-[8px] text-white/30 uppercase font-bold">Progresso</p>
                         <p className="text-xs font-mono font-bold">78.4%</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
