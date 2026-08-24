import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/src/lib/utils";

/**
 * Vitrine "Tipos de impressão" — lista à esquerda (troca sozinha, com barra de
 * progresso), painel de mídia à direita. Cada item aceita `image` e,
 * opcionalmente, `video` (loop, sem áudio) — é aqui que entra o vídeo do lado
 * direito quando você tiver o arquivo. Se a mídia ainda não existir/falhar,
 * cai num placeholder de marca em vez de quebrar a página.
 *
 * Pra trocar as fotos/vídeos depois: é só substituir os arquivos em
 * public/tipos-impressao/ pelos nomes já referenciados abaixo, ou editar os
 * campos `image`/`video` de cada item.
 */
type PrintType = {
  id: string;
  title: string;
  description: string;
  image: string;
  video?: string;
};

const PRINT_TYPES: PrintType[] = [
  {
    id: "01",
    title: "Cor única",
    description:
      "Impressão limpa em uma cor só — acabamento liso e discreto, ideal pra peças do dia a dia.",
    image: "/tipos-impressao/cor-unica.jpg",
  },
  {
    id: "02",
    title: "Multicor",
    description:
      "Várias cores na mesma peça, sem precisar pintar depois — ótimo pra logos, personagens e detalhes.",
    image: "/tipos-impressao/multicor.jpg",
  },
  {
    id: "03",
    title: "Pintura realista",
    description:
      "Peça impressa e depois pintada à mão, com sombra e brilho de verdade — parece produto de loja.",
    image: "/tipos-impressao/pintura-realista.jpg",
  },
  {
    id: "04",
    title: "Objetos & decoração",
    description:
      "Bonecos, bustos, enfeites e presentes personalizados — do jeitinho que você imaginou.",
    image: "/tipos-impressao/objetos-decoracao.jpg",
  },
];

const AUTO_PLAY_DURATION = 5000;

export function PrintTypesShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const handleNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % PRINT_TYPES.length);
  }, []);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + PRINT_TYPES.length) % PRINT_TYPES.length);
  }, []);

  const handleSelect = (index: number) => {
    if (index === activeIndex) return;
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = window.setInterval(handleNext, AUTO_PLAY_DURATION);
    return () => window.clearInterval(interval);
  }, [isPaused, handleNext]);

  const active = PRINT_TYPES[activeIndex];

  return (
    <section className="scroll-smooth pb-14 pt-4 sm:pb-20 sm:pt-6">
      <div className="container-section">
        <div className="mb-10 sm:mb-12">
          <p className="section-label-accent mb-4">O que fazemos</p>
          <h2 className="heading-lg justify-start text-white">
            Tipos de impressão pra cada ideia.
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-10">
          {/* Mídia — no mobile fica em cima (mais fácil de rolar até o texto), no
              desktop fica do lado direito. */}
          <div
            className="order-1 lg:order-2 lg:col-span-7"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="relative aspect-video overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.03] sm:aspect-[16/10]">
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={active.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction >= 0 ? 24 : -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction >= 0 ? -24 : 24 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  <PrintTypeMedia item={active} />
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
                </motion.div>
              </AnimatePresence>

              <div className="absolute bottom-5 right-5 z-20 flex gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-white active:scale-90"
                  aria-label="Tipo anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-white active:scale-90"
                  aria-label="Próximo tipo"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Lista de tipos */}
          <div className="order-2 flex flex-col lg:order-1 lg:col-span-5">
            {PRINT_TYPES.map((item, index) => {
              const isActive = activeIndex === index;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(index)}
                  className={cn(
                    "group relative flex items-start gap-4 border-t border-white/[0.08] py-5 pl-4 text-left transition-colors duration-500 first:border-0 sm:py-6",
                    isActive ? "text-white" : "text-white/40 hover:text-white/70",
                  )}
                >
                  <div className="absolute inset-y-0 left-0 w-[2px] bg-white/[0.06]">
                    {isActive && (
                      <motion.div
                        key={`progress-${item.id}-${isPaused}`}
                        className="absolute left-0 top-0 w-full origin-top bg-white"
                        initial={{ height: "0%" }}
                        animate={isPaused ? { height: "0%" } : { height: "100%" }}
                        transition={{ duration: AUTO_PLAY_DURATION / 1000, ease: "linear" }}
                      />
                    )}
                  </div>

                  <span className="mt-1 shrink-0 font-mono text-[10px] font-black tabular-nums opacity-40">
                    /{item.id}
                  </span>

                  <div className="flex-1">
                    <span className="font-display text-xl font-black uppercase leading-tight sm:text-2xl">
                      {item.title}
                    </span>
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-md pt-2 text-sm font-medium leading-relaxed text-white/50">
                            {item.description}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function PrintTypeMedia({ item }: { item: PrintType }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/[0.03] text-white/25">
        <ImageOff className="h-8 w-8" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Foto em breve</span>
      </div>
    );
  }

  if (item.video) {
    return (
      <video
        className="h-full w-full object-cover"
        src={item.video}
        poster={item.image}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      src={item.image}
      alt={item.title}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export default PrintTypesShowcase;
