import { cn } from "../../lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/app-icon.png"
      alt="INOVA PRO 3D"
      className={cn("object-contain", className)}
      draggable={false}
    />
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <img
      src="/logo-wordmark.png"
      alt="INOVA PRO 3D"
      className={cn("object-contain h-7", className)}
      draggable={false}
    />
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
      <BrandWordmark className={wordmarkClassName} />
    </span>
  );
}

export default BrandLogo;
