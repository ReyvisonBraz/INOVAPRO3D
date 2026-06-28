import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Estrelas de avaliação. Sem `onChange` é só leitura; com `onChange` vira input.
 */
export function Stars({
  value,
  onChange,
  size = "w-4 h-4",
  className,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
  className?: string;
}) {
  const [hover, setHover] = useState(0);
  const interactive = !!onChange;
  const display = hover || value;

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => onChange?.(i)}
          aria-label={`${i} estrela${i > 1 ? "s" : ""}`}
          className={cn(interactive ? "cursor-pointer transition-transform hover:scale-110 active:scale-95" : "cursor-default")}
        >
          <Star className={cn(size, i <= Math.round(display) ? "fill-amber-400 text-amber-400" : "text-white/20")} />
        </button>
      ))}
    </div>
  );
}

export default Stars;
