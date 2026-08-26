import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageOff, MousePointerClick } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/src/lib/utils";

/**
 * Explorador de categorias.
 *
 * Desktop (lg+): lista à esquerda, mídia parada à direita — clique troca a
 * foto ao lado, 2 cliques abre o catálogo já filtrado.
 *
 * Mobile: nada de painel flutuando/grudado na tela. Cada categoria vira o
 * seu próprio bloco (nome + descrição + fotos), empilhado — conforme o
 * cliente desce a página, o próximo bloco/categoria simplesmente aparece,
 * sem truque de scroll-linking.
 *
 * Pra trocar/adicionar fotos depois: coloque os arquivos em
 * public/catalogo/<slug-da-categoria>/ e liste-os no array `images` do item
 * correspondente abaixo.
 */
type ExploredCategory = {
  id: string;
  title: string;
  description: string;
  images: string[];
  /** Termo usado no link "Ver mais" (?q=), que cai no catálogo já filtrado. */
  searchTerm: string;
};

const CATEGORIES: ExploredCategory[] = [
  {
    id: "articulados-fidgets",
    title: "Articulados & Fidgets",
    description: "Peças com movimento real — dragões, animais e fidgets que se mexem de verdade.",
    searchTerm: "articulado",
    images: [
      "/catalogo/articulados-fidgets/articulados-fidgets-01.webp",
      "/catalogo/articulados-fidgets/articulados-fidgets-02.webp",
    ],
  },
  {
    id: "utilidades-organizacao",
    title: "Utilidades & Organização",
    description: "Organizadores, suportes e utilidades pra casa e escritório, sob medida.",
    searchTerm: "organizador",
    images: [
      "/catalogo/utilidades-organizacao/utilidades-organizacao-01.webp",
      "/catalogo/utilidades-organizacao/utilidades-organizacao-02.webp",
    ],
  },
  {
    id: "action-figures-colecionaveis",
    title: "Action Figures & Colecionáveis",
    description:
      "Bustos, estátuas e figures de anime/cultura pop, pintados com riqueza de detalhe.",
    searchTerm: "colecionável",
    images: [
      "/catalogo/action-figures-colecionaveis/action-figures-colecionaveis-01.webp",
      "/catalogo/action-figures-colecionaveis/action-figures-colecionaveis-02.webp",
      "/catalogo/action-figures-colecionaveis/action-figures-colecionaveis-03.webp",
      "/catalogo/action-figures-colecionaveis/action-figures-colecionaveis-04.webp",
    ],
  },
  {
    id: "games",
    title: "Games",
    description: "Troféus, ícones e peças inspiradas nos seus jogos favoritos.",
    searchTerm: "game",
    images: ["/catalogo/games/games-01.webp", "/catalogo/games/games-02.webp"],
  },
  {
    id: "fantasia-super-herois",
    title: "Fantasia & Super-heróis",
    description: "Heróis, dragões e guerreiros — do busto de colecionador ao diorama de mesa.",
    searchTerm: "herói",
    images: [
      "/catalogo/fantasia-super-herois/fantasia-super-herois-01.webp",
      "/catalogo/fantasia-super-herois/fantasia-super-herois-02.webp",
    ],
  },
  {
    id: "decoracao-iluminacao",
    title: "Decoração & Iluminação",
    description: "Vasos, luminárias e objetos de decoração com acabamento premium.",
    searchTerm: "decoração",
    images: [
      "/catalogo/decoracao-iluminacao/decoracao-iluminacao-01.webp",
      "/catalogo/decoracao-iluminacao/decoracao-iluminacao-02.webp",
      "/catalogo/decoracao-iluminacao/decoracao-iluminacao-03.webp",
      "/catalogo/decoracao-iluminacao/decoracao-iluminacao-04.webp",
    ],
  },
];

const PHOTO_CYCLE_DURATION = 3600;
const SWIPE_THRESHOLD = 60;
const imageVariant = (src: string, width: 360 | 640) => src.replace(/\.webp$/, `-${width}.webp`);

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reducedMotion;
}

/**
 * Painel de fotos de UMA categoria: passa sozinho, arrasta/clica pra ver
 * mais, e tem o botão "Ver mais" pro catálogo filtrado. Usado tanto no
 * painel fixo do desktop quanto em cada bloco empilhado do mobile — cada
 * instância cuida do próprio índice de foto, então os blocos do mobile
 * ciclam de forma independente uns dos outros.
 */
function CategoryPhotoPanel({
  category,
  priority = false,
}: {
  category: ExploredCategory;
  /** Painel visível já no primeiro paint (desktop ativo / 1º bloco mobile) — evita `loading="lazy"` atrasando o LCP. */
  priority?: boolean;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoDirection, setPhotoDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const reducedMotion = useReducedMotion();
  const photoCount = category.images.length;

  const goToPhoto = useCallback(
    (nextIndex: number, direction: number) => {
      setPhotoDirection(direction);
      setPhotoIndex(((nextIndex % photoCount) + photoCount) % photoCount);
    },
    [photoCount],
  );

  const handleNextPhoto = useCallback(() => goToPhoto(photoIndex + 1, 1), [goToPhoto, photoIndex]);
  const handlePrevPhoto = useCallback(() => goToPhoto(photoIndex - 1, -1), [goToPhoto, photoIndex]);

  // Fotos passam sozinhas; pausa no hover/foco e some completamente com
  // prefers-reduced-motion.
  useEffect(() => {
    if (isPaused || reducedMotion || photoCount <= 1) return;
    const interval = window.setInterval(handleNextPhoto, PHOTO_CYCLE_DURATION);
    return () => window.clearInterval(interval);
  }, [isPaused, reducedMotion, photoCount, handleNextPhoto]);

  const photoKey = `${category.id}-${photoIndex}`;
  const activeSrc = category.images[photoIndex];
  const activeFailed = failed[photoKey];
  // Só a foto visível de cara (primeiro índice do painel prioritário) entra
  // eager/high — trocas seguintes (clique, autoplay) seguem lazy normalmente.
  const isPriorityPhoto = priority && photoIndex === 0;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="relative aspect-video overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.03] sm:aspect-[16/10]">
        {activeFailed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/[0.03] text-white/25">
            <ImageOff className="h-8 w-8" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Foto em breve</span>
          </div>
        ) : (
          <AnimatePresence initial={false} custom={photoDirection} mode="popLayout">
            <motion.img
              key={photoKey}
              src={activeSrc}
              srcSet={`${imageVariant(activeSrc, 360)} 360w, ${imageVariant(activeSrc, 640)} 640w, ${activeSrc} 1000w`}
              sizes="(max-width: 1023px) calc(100vw - 48px), min(58vw, 740px)"
              width="1000"
              height="1000"
              alt={`${category.title} — peça impressa em 3D pela INOVAPRO3D (foto ${photoIndex + 1} de ${photoCount})`}
              loading={isPriorityPhoto ? "eager" : "lazy"}
              fetchPriority={isPriorityPhoto ? "high" : "auto"}
              decoding="async"
              custom={photoDirection}
              initial={{ opacity: 0, x: photoDirection >= 0 ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: photoDirection >= 0 ? -24 : 24 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 h-full w-full object-cover"
              drag={photoCount > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_event, info) => {
                if (info.offset.x <= -SWIPE_THRESHOLD) handleNextPhoto();
                else if (info.offset.x >= SWIPE_THRESHOLD) handlePrevPhoto();
              }}
              onError={() => setFailed((prev) => ({ ...prev, [photoKey]: true }))}
            />
          </AnimatePresence>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

        {photoCount > 1 && (
          <div
            className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 gap-1.5"
            aria-hidden="true"
          >
            {category.images.map((image, index) => (
              <span
                key={image}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors duration-500",
                  index === photoIndex ? "bg-white" : "bg-white/30",
                )}
              />
            ))}
          </div>
        )}

        <div className="absolute bottom-5 left-5 z-20">
          <Link
            to={`/catalogo?q=${encodeURIComponent(category.searchTerm)}`}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[0_0_24px_rgba(34,211,238,0.45)] transition-all hover:bg-cyan-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.65)] active:scale-95"
          >
            Ver mais
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {photoCount > 1 && (
          <div className="absolute bottom-5 right-5 z-20 flex gap-2">
            <button
              type="button"
              onClick={handlePrevPhoto}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-white active:scale-90"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNextPhoto}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-white active:scale-90"
              aria-label="Próxima foto"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryExplorer() {
  const navigate = useNavigate();
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const activeCategory = CATEGORIES[activeCategoryIndex];

  const handleSelectCategory = (index: number) => {
    setActiveCategoryIndex(index);
  };

  /** 2 cliques/toques na categoria já leva pro catálogo filtrado, sem esperar o "Ver mais". */
  const handleOpenCategoryCatalog = (category: ExploredCategory) => {
    navigate(`/catalogo?q=${encodeURIComponent(category.searchTerm)}`);
  };

  return (
    <section className="pb-14 pt-4 sm:pb-20 sm:pt-6">
      <div className="container-section">
        <div className="mb-10 sm:mb-12">
          <p className="section-label-accent mb-4">Especialidades</p>
          <h2 className="heading-lg justify-start text-white">
            Um pouco de tudo que a gente imprime.
          </h2>
        </div>

        {/* Desktop — lista à esquerda, mídia parada à direita. */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:items-center lg:gap-10">
          <div className="lg:col-span-7 lg:order-2">
            <CategoryPhotoPanel key={activeCategory.id} category={activeCategory} priority />
          </div>

          <div className="flex flex-col lg:order-1 lg:col-span-5">
            {CATEGORIES.map((category, index) => {
              const isActive = activeCategoryIndex === index;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelectCategory(index)}
                  onDoubleClick={() => handleOpenCategoryCatalog(category)}
                  title="Clique 2x para ver os produtos desta categoria"
                  className={cn(
                    "group relative flex items-start gap-4 border-t border-white/[0.08] py-5 pl-4 text-left transition-colors duration-300 first:border-0 sm:py-6",
                    isActive ? "text-white" : "text-white/60 hover:text-white",
                  )}
                >
                  <div className="absolute inset-y-0 left-0 w-[3px] bg-white/[0.08]">
                    {isActive && (
                      <span className="absolute left-0 top-0 h-full w-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
                    )}
                  </div>

                  <span
                    className={cn(
                      "mt-1 shrink-0 font-mono text-[10px] font-black tabular-nums transition-colors duration-300",
                      isActive ? "text-cyan-400" : "opacity-40",
                    )}
                  >
                    /{String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="flex-1">
                    <span
                      className={cn(
                        "font-display font-black uppercase leading-tight transition-all duration-300",
                        isActive
                          ? "text-2xl text-white sm:text-3xl"
                          : "text-xl text-white/60 group-hover:text-white/85 sm:text-2xl",
                      )}
                    >
                      {category.title}
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
                            {category.description}
                          </p>
                          <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-400/80">
                            <MousePointerClick className="h-3 w-3" />
                            Clique 2x pra ver os produtos
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile — cada categoria é o seu próprio bloco, empilhado. Nada
            flutua nem gruda na tela: rolou, o próximo bloco aparece. */}
        <div className="flex flex-col gap-12 lg:hidden">
          {CATEGORIES.map((category, index) => (
            <div key={category.id}>
              <div className="mb-4 flex items-start gap-3 pl-4">
                <span className="mt-1.5 shrink-0 font-mono text-[10px] font-black tabular-nums text-cyan-400">
                  /{String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-2xl font-black uppercase leading-tight text-white">
                    {category.title}
                  </h3>
                  <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-white/50">
                    {category.description}
                  </p>
                </div>
              </div>
              <div
                onDoubleClick={() => handleOpenCategoryCatalog(category)}
                title="Toque 2x para ver os produtos desta categoria"
              >
                <CategoryPhotoPanel category={category} priority={index === 0} />
              </div>
              <span className="mt-3 inline-flex items-center gap-1.5 pl-4 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-400/80">
                <MousePointerClick className="h-3 w-3" />
                Toque 2x na foto pra ver os produtos
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CategoryExplorer;
