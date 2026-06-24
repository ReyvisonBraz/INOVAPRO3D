import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

/**
 * Fundo flutuante (aurora) — blobs de gradiente que derivam e mudam de
 * posição/escala continuamente. CSS puro (GPU), respeita reduced-motion.
 *
 * As animações são PAUSADAS automaticamente quando o fundo sai da viewport
 * (IntersectionObserver) — em páginas longas isso evita gastar GPU à toa
 * renderizando blobs que ninguém está vendo.
 *
 * Uso: coloque como primeiro filho de um container `relative overflow-hidden`.
 * O conteúdo real deve ter `relative z-10` para ficar acima.
 *
 *   variant="grid"  → adiciona a grade técnica sutil
 *   subtle          → reduz a opacidade (ideal para painéis/calculadora)
 */
export function FloatingBackground({
  className,
  variant = "plain",
  subtle = false,
}: {
  className?: string;
  variant?: "plain" | "grid";
  subtle?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("aurora-wrap", subtle && "opacity-60", !visible && "is-paused", className)}
      aria-hidden="true"
    >
      <div className="aurora-blob aurora-1" />
      <div className="aurora-blob aurora-2" />
      <div className="aurora-blob aurora-3" />
      {variant === "grid" && <div className="absolute inset-0 brand-grid" />}
      {/* vinheta para fundir os blobs no fundo escuro */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#07080d]/90" />
    </div>
  );
}

export default FloatingBackground;
