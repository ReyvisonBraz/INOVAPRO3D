import { cn } from "../../lib/utils";

/** Ícone 3D da marca — usa o app-icon.png que já tem fundo escuro */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/app-icon.png"
      alt=""
      aria-hidden="true"
      className={cn("object-contain", className)}
      draggable={false}
    />
  );
}

/**
 * Wordmark "INOVA PRO 3D" em CSS puro.
 * Não usa PNG para evitar problema de fundo — adaptado ao tema escuro.
 * "INOVA" branco forte · "PRO" branco/50 · "3D" gradiente azul→ciano
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display font-black uppercase leading-none tracking-tight select-none",
        className,
      )}
    >
      <span className="text-white">INOVA</span>
      <span className="text-white/40"> PRO </span>
      <span className="brand-gradient-text">3D</span>
    </span>
  );
}

export function BrandLogo({
  className,
  markClassName,
  wordmarkClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
}) {
  if (!showWordmark) {
    return <BrandMark className={cn("h-9 w-9", markClassName)} />;
  }
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="transition-transform duration-500 group-hover:scale-105">
        <BrandMark className={cn("h-9 w-9", markClassName)} />
      </span>
      <BrandWordmark className={cn("text-lg", wordmarkClassName)} />
    </span>
  );
}

export default BrandLogo;
