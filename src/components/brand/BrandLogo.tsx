import { cn } from "../../lib/utils";

/**
 * Marca INOVA PRO 3D — cubo isométrico (mark) + wordmark.
 * O mark é SVG inline (crisp em qualquer tamanho, adapta ao tema).
 */

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-9 w-9", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bm-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0b1220" />
          <stop offset="1" stopColor="#05070d" />
        </linearGradient>
        <linearGradient id="bm-blue" x1="15" y1="22" x2="32" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#bm-bg)" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="14.5" stroke="#1e293b" strokeOpacity="0.7" />
      <path d="M32 12 L49 22 L32 32 L15 22 Z" fill="#3a4456" />
      <path d="M49 22 L49 42 L32 52 L32 32 Z" fill="#222b3a" />
      <path d="M15 22 L32 32 L32 52 L15 42 Z" fill="url(#bm-blue)" />
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-black uppercase leading-none tracking-tight", className)}>
      <span className="text-foreground">INOVA</span>
      <span className="text-foreground/55"> PRO </span>
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
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="transition-transform duration-500 group-hover:rotate-[10deg] group-hover:scale-105">
        <BrandMark className={markClassName} />
      </span>
      {showWordmark && <BrandWordmark className={cn("text-lg", wordmarkClassName)} />}
    </span>
  );
}

export default BrandLogo;
