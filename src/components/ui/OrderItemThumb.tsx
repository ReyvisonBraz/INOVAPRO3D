import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface OrderItemThumbProps {
  /** URL da imagem do item. Vazio ou ausente cai no placeholder neutro. */
  src?: string | null;
  /** Nome do produto, usado no texto alternativo e no título do placeholder. */
  name?: string | null;
  /** Classes do contêiner. Quem chama define o tamanho; as dimensões ficam reservadas. */
  className?: string;
  /** Classes extras da imagem, para efeitos já usados na tela de origem. */
  imgClassName?: string;
  /** `true` quando a miniatura só acompanha um texto que já identifica o item. */
  decorative?: boolean;
}

/**
 * Miniatura de item de pedido com placeholder neutro.
 *
 * Sem imagem — ou quando o carregamento falha — mostra "Sem imagem" em vez de
 * uma foto qualquer. Um erro de imagem nunca esconde o pedido nem quebra o
 * layout: as dimensões vêm do contêiner e são reservadas antes da carga.
 */
export function OrderItemThumb({
  src,
  name,
  className,
  imgClassName,
  decorative = false,
}: OrderItemThumbProps) {
  // Guardar a URL que falhou, e não um booleano, dispensa reagir à troca de
  // imagem: trocar de pedido reaproveita o mesmo nó, e um erro anterior
  // deixaria o placeholder sobre uma imagem nova e válida.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = typeof src === "string" ? src.trim() : "";

  if (!url || failedUrl === url) {
    return (
      <div
        className={cn(
          "flex shrink-0 flex-col items-center justify-center gap-1 border border-white/5 bg-white/[0.03] text-dim",
          className,
        )}
        role="img"
        aria-label={name ? `Sem imagem para ${name}` : "Sem imagem"}
        title="Sem imagem"
      >
        <ImageOff className="h-1/3 max-h-5 w-auto opacity-50" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={cn("shrink-0 overflow-hidden bg-black/20", className)}>
      <img
        src={url}
        alt={decorative ? "" : name ? `Foto de ${name}` : "Foto do item do pedido"}
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(url)}
        className={cn("h-full w-full object-cover", imgClassName)}
      />
    </div>
  );
}
