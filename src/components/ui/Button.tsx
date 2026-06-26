import React, { forwardRef } from "react";
import { cn } from "@/src/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'glass' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isShimmer?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isShimmer = false, loading = false, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-white hover:bg-primary-dark shadow-[0_0_20px_rgba(37,99,235,0.2)]",
      outline: "border border-white/20 hover:bg-white/5",
      glass: "glass hover:bg-white/10",
      ghost: "hover:bg-white/5 text-white/70 hover:text-white"
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-6 py-2.5 text-sm",
      lg: "px-8 py-4 text-base"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none overflow-hidden",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Processando...</span>
          </div>
        ) : isShimmer ? (
          <span className="text-shimmer">{children}</span>
        ) : (
          // display:contents → texto e ícone entram direto no flex do botão,
          // respeitando items-center/justify-center/gap definidos no className.
          <span className="contents">{children}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
