import { motion } from "framer-motion";
import { Button } from "../../components/ui/Button";
import { 
  BookOpen, 
  Layers, 
  Zap, 
  Shield, 
  HelpCircle, 
  ChevronRight,
  Info,
  Box,
  Settings,
  Minimize2,
  Atom,
  Thermometer
} from "lucide-react";

export default function KnowledgeBase() {
  const categories = [
    {
      title: "Cores e Acabamentos",
      icon: Atom,
      topics: [
        { name: "PLA Pro", desc: "A melhor escolha para protótipos e peças decorativas. Alta precisão e brilho natural.", tags: ["Estético", "Eco"] },
        { name: "PLA Silk", desc: "Acabamento sedoso que disfarça as camadas de impressão. Ideal para presentes.", tags: ["Premium", "Brilho"] },
        { name: "PLA Matte", desc: "Visual fosco que traz um aspecto mais profissional e sóbrio à peça.", tags: ["Fosco", "Elegante"] }
      ]
    },
    {
      title: "Dicas de Design",
      icon: Settings,
      topics: [
        { name: "Qualidade Visual", desc: "Nossas máquinas são configuradas para o melhor acabamento possível, minimizando as linhas de impressão.", tags: ["Premium"] },
        { name: "Resistência (Dureza)", desc: "Peças decorativas são leves, enquanto peças funcionais são preenchidas para suportar impacto.", tags: ["Força"] },
        { name: "Formatos Aceitos", desc: "Trabalhamos com arquivos STL e OBJ. Se o seu for diferente, nos chame no WhatsApp.", tags: ["Arquivo"] }
      ]
    }
  ];

  return (
    <div className="container-section py-12 min-h-screen">
      <header className="max-w-2xl mb-16 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
           <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Para Iniciantes</span>
        </div>
        <h1 className="heading-md sm:heading-lg uppercase mb-4">
          O que é <span className="text-shimmer italic">Impressão 3D?</span>
        </h1>
        <p className="text-base text-white/40 font-medium max-w-xl italic">
          Imagine uma "impressora" que em vez de tinta, usa plástico derretido para construir objetos camada por camada, do zero. 
          É assim que transformamos um desenho no computador em algo que você pode segurar na mão.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20" aria-label="Perguntas Frequentes">
        {[
          { title: "O que é PLA?", desc: "É um plástico feito de milho ou cana-de-açúcar. É o melhor material para peças decorativas por ser firme e ter cores lindas.", icon: Box },
          { title: "Como enviar?", desc: "Você só precisa do arquivo 3D (STL ou OBJ). Se não tiver, pode escolher um modelo pronto no nosso catálogo.", icon: Zap },
          { title: "Quanto custa?", desc: "O preço depende do peso da peça e do tempo que ela leva para ser impressa. Nosso orçamento calcula isso na hora.", icon: HelpCircle }
        ].map((item, i) => (
          <div key={i} className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors shadow-lg">
            <item.icon className="w-6 h-6 text-primary mb-4" />
            <h3 className="text-sm font-black uppercase tracking-tight mb-2">{item.title}</h3>
            <p className="text-xs text-white/40 font-medium leading-relaxed italic">{item.desc}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {categories.map((cat, i) => (
          <section key={i} className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <cat.icon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-black font-display uppercase tracking-tight">{cat.title}</h2>
            </div>

            <div className="space-y-4">
              {cat.topics.map((topic, j) => (
                <motion.div 
                  key={j}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: j * 0.1 }}
                  className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-primary/20 transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors">{topic.name}</h3>
                    <div className="flex gap-1">
                      {topic.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-white/5 rounded-md text-[7px] font-black uppercase text-white/30">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-white/40 font-medium leading-relaxed italic">{topic.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Interactive FAQ Banner */}
      <section className="mt-20 p-8 lg:p-12 rounded-[40px] bg-primary relative overflow-hidden group">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
          <div className="max-w-xl text-center lg:text-left">
            <h2 className="text-2xl lg:text-4xl font-black font-display mb-4 text-white uppercase tracking-tighter leading-tight">
              PRECISA DE AJUDA COM <br /> SEU <span className="italic opacity-80 underline underline-offset-8">PROJETO?</span>
            </h2>
            <p className="text-white text-sm font-medium mb-8 opacity-90 italic">
              Nossa equipe técnica pode orientar sobre as melhores configurações para seu modelo.
            </p>
            <div className="flex gap-4 justify-center lg:justify-start">
               <a href="https://wa.me/seu-numero" target="_blank" rel="noreferrer">
                 <Button className="bg-white text-primary rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px]">
                   CONTATO WHATSAPP
                 </Button>
               </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
