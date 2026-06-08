import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../components/ui/Button";
import { Search, X, Box, Zap, HelpCircle, Settings, Atom, ChevronDown, ChevronUp } from "lucide-react";
import { waLink } from "../../lib/config";

const faqs = [
  {
    category: "Básico",
    icon: Box,
    items: [
      {
        q: "O que é impressão 3D?",
        a: "É uma tecnologia que transforma um arquivo digital (desenho no computador) em um objeto físico real. A máquina deposita plástico derretido camada por camada até formar a peça completa — como construir uma parede tijolo por tijolo, mas de forma automatizada."
      },
      {
        q: "O que é PLA?",
        a: "PLA (Ácido Poliláctico) é um plástico feito de fontes vegetais como milho ou cana-de-açúcar. É o material mais popular para impressão 3D por ter ótima qualidade visual, ser firme e vir em centenas de cores. Ideal para peças decorativas, miniaturas e presentes."
      },
      {
        q: "Quanto tempo leva para ficar pronto?",
        a: "Em média de 3 a 7 dias úteis, dependendo do tamanho e complexidade da peça. Peças pequenas podem ficar em 24h. Assim que seu pedido entrar na fila de produção, você recebe atualizações pelo status do pedido."
      },
      {
        q: "Vocês entregam para todo o Brasil?",
        a: "Sim! Enviamos para qualquer estado via Correios (PAC ou SEDEX). O prazo de entrega varia por região. Frete calculado no checkout antes de você confirmar o pedido."
      },
      {
        q: "Posso pedir um tamanho diferente?",
        a: "Sim! Trabalhamos com tamanhos personalizados dentro do limite da nossa impressora (300 × 300 × 350 mm). Entre em contato pelo WhatsApp com o modelo desejado e as dimensões que precisa."
      },
    ]
  },
  {
    category: "Materiais",
    icon: Atom,
    items: [
      {
        q: "Qual a diferença entre PLA Pro, Silk e Matte?",
        a: "PLA Pro: acabamento brilhante padrão, ótima precisão, melhor custo-benefício. PLA Silk: superfície com efeito metálico/sedoso que disfarça as camadas — ótimo para presentes. PLA Matte: acabamento fosco e opaco, aparência mais profissional e sóbria. Todos têm a mesma durabilidade."
      },
      {
        q: "As peças são resistentes?",
        a: "PLA é firme e rígido, resistente ao uso cotidiano. Para peças decorativas e miniaturas é perfeito. Para peças funcionais que sofrem impacto ou calor acima de 60°C, recomendamos conversar com a equipe para avaliar o material mais indicado."
      },
      {
        q: "A cor fica exatamente igual à imagem?",
        a: "As cores podem ter pequenas variações de lote para lote, assim como acontece com qualquer produto físico. Fazemos o possível para manter consistência, mas pequenas diferenças de tonalidade são normais e não constituem defeito."
      },
    ]
  },
  {
    category: "Pedidos e Pagamento",
    icon: Zap,
    items: [
      {
        q: "Quais formas de pagamento aceitam?",
        a: "Atualmente aceitamos Pix. O código de pagamento é gerado automaticamente após você confirmar o pedido — é só copiar e pagar pelo app do seu banco. Em breve teremos cartão de crédito e débito."
      },
      {
        q: "Posso cancelar meu pedido?",
        a: "Sim, desde que a impressão ainda não tenha começado (status 'Aguardando Pagamento' ou 'Em Fila'). Após início da produção não é possível cancelar. Entre em contato pelo WhatsApp o quanto antes."
      },
      {
        q: "O que acontece se a peça chegar danificada?",
        a: "Reimprimos e reenviamos sem custo. Basta nos enviar uma foto pelo WhatsApp mostrando o dano dentro de 7 dias após o recebimento. Sua satisfação é nossa prioridade."
      },
      {
        q: "Posso acompanhar meu pedido?",
        a: "Sim! Na página 'Meus Pedidos' você acompanha cada etapa em tempo real: da fila de impressão até o envio com código de rastreamento dos Correios."
      },
    ]
  },
  {
    category: "Arquivos e Técnico",
    icon: Settings,
    items: [
      {
        q: "Que tipo de arquivo preciso enviar?",
        a: "Aceitamos arquivos STL e OBJ, que são os formatos padrão para impressão 3D. Se você tiver um arquivo em outro formato (STEP, SolidWorks, Fusion 360, etc.) entre em contato — geralmente conseguimos converter."
      },
      {
        q: "Não tenho arquivo 3D. Posso encomendar assim mesmo?",
        a: "Sim! Nosso catálogo tem dezenas de modelos prontos para você escolher e personalizar o material/cor. Se precisar de um modelo exclusivo, fale pelo WhatsApp sobre orçamento de modelagem 3D."
      },
      {
        q: "Como faço para criar meu próprio arquivo 3D?",
        a: "Programas gratuitos para iniciantes: Tinkercad (web, muito fácil), Fusion 360 (gratuito para estudantes/hobbyistas), Blender (avançado, curva de aprendizado maior). Se precisar de ajuda, nossa equipe pode orientar."
      },
      {
        q: "Qual o tamanho máximo que vocês imprimem?",
        a: "Nossa impressora comporta peças de até 300 × 300 × 350 mm (largura × comprimento × altura). Para peças maiores, podemos dividir em partes e montar. Consulte pelo WhatsApp."
      },
    ]
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      layout
      className="border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.01] hover:border-primary/20 transition-colors"
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left"
      >
        <span className="text-sm font-bold text-white/80 leading-snug pr-2">{q}</span>
        <span className="shrink-0 text-white/30">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm text-white/45 leading-relaxed font-medium">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function KnowledgeBase() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return faqs;
    return faqs
      .map(cat => ({
        ...cat,
        items: cat.items.filter(
          item =>
            item.q.toLowerCase().includes(q) ||
            item.a.toLowerCase().includes(q)
        ),
      }))
      .filter(cat => cat.items.length > 0);
  }, [search]);

  const totalResults = filtered.reduce((acc, cat) => acc + cat.items.length, 0);

  return (
    <div className="container-section py-12 min-h-screen">
      {/* Header */}
      <header className="max-w-2xl mb-12 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
          <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Central de Ajuda</span>
        </div>
        <h1 className="heading-md sm:heading-lg uppercase mb-4">
          Dúvidas <span className="text-shimmer italic">Frequentes</span>
        </h1>
        <p className="text-base text-white/40 font-medium max-w-xl italic">
          Tudo que você precisa saber sobre impressão 3D, materiais, pedidos e entregas.
        </p>
      </header>

      {/* Search */}
      <div className="max-w-xl mb-12">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar dúvida..."
            className="w-full h-12 pl-10 pr-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-sm font-medium text-white placeholder-white/20 outline-none focus:border-primary/40 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {search && (
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-white/25">
            {totalResults === 0 ? "Nenhum resultado" : `${totalResults} resultado${totalResults !== 1 ? "s" : ""} encontrado${totalResults !== 1 ? "s" : ""}`}
          </p>
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="py-20 text-center"
          >
            <HelpCircle className="w-10 h-10 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 font-bold text-sm mb-2">Nenhuma dúvida encontrada para "{search}"</p>
            <p className="text-white/20 text-xs">Tente outras palavras ou fale diretamente com a gente.</p>
            <a
              href={waLink(`Olá INOVAPRO3D! Tenho uma dúvida: ${search}`)}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-6 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors"
            >
              Perguntar pelo WhatsApp
            </a>
          </motion.div>
        ) : (
          <div className="space-y-10">
            {filtered.map((cat, i) => (
              <motion.section
                key={cat.category}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
                  <cat.icon className="w-4 h-4 text-primary" />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50">{cat.category}</h2>
                  <span className="text-[9px] font-black text-white/20 bg-white/5 px-2 py-0.5 rounded-full">
                    {cat.items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {cat.items.map((item, j) => (
                    <FAQItem key={j} q={item.q} a={item.a} />
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* CTA Banner */}
      <section className="mt-20 p-8 lg:p-12 rounded-[40px] bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
          <div className="max-w-xl text-center lg:text-left">
            <h2 className="text-2xl lg:text-4xl font-black font-display mb-4 text-white uppercase tracking-tighter leading-tight">
              AINDA TEM DÚVIDAS?<br />
              <span className="italic opacity-80 underline underline-offset-8">FALE COM A GENTE.</span>
            </h2>
            <p className="text-white text-sm font-medium mb-8 opacity-90 italic">
              Nossa equipe responde em minutos pelo WhatsApp — sem robôs, sem espera.
            </p>
            <a href={waLink("Olá INOVAPRO3D! Preciso de ajuda com meu projeto.")} target="_blank" rel="noreferrer">
              <Button className="bg-white text-primary rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px]">
                CONTATO WHATSAPP
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
