import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilitário para mesclar classes Tailwind de forma inteligente,
 * essencial para componentes de UI refinados que recebem props de estilo.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
