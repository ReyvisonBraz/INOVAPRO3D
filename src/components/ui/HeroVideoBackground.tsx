import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

/**
 * Fundo do hero: vídeo em loop (impressão 3D em ação) com fallback
 * gracioso enquanto o arquivo não existe (ou falha ao carregar) —
 * um gradiente escuro neutro, sem o azul/ciano "futurista" anterior.
 *
 * Para ativar o vídeo real, basta colocar o arquivo em `public/hero-loop.mp4`
 * (ou ajustar a prop `src` em Home.tsx) — nenhuma outra mudança de código
 * é necessária.
 */
export function HeroVideoBackground({
  src,
  poster,
  className,
}: {
  src?: string;
  poster?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const showVideo = Boolean(src) && !videoFailed && !reducedMotion;

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden bg-[#05060a]", className)}
      aria-hidden="true"
    >
      {showVideo && (
        <video
          ref={videoRef}
          className="h-full w-full object-cover opacity-70"
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
        />
      )}

      {!showVideo && poster && (
        <img
          src={poster}
          alt=""
          className="h-full w-full object-cover opacity-60"
          loading="eager"
          decoding="async"
        />
      )}

      {/* Vinheta escura neutra — substitui o antigo radial-gradient ciano e garante
          legibilidade do texto por cima, com ou sem vídeo/poster. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/65 to-surface" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface to-transparent" />
    </div>
  );
}

export default HeroVideoBackground;
