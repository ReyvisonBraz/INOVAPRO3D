import type { ReactNode } from "react";
import { Instagram, Facebook, MessageCircle } from "lucide-react";
import { SOCIAL, waLink } from "../../lib/config";
import { cn } from "../../lib/utils";

type Channel = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  hover: string;
};

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.1v12.5a2.34 2.34 0 0 1-2.34 2.27 2.34 2.34 0 1 1 .64-4.59V8.02a5.45 5.45 0 1 0 4.8 5.41V8.66a7.3 7.3 0 0 0 4.27 1.37V6.93a4.28 4.28 0 0 1-3.22-1.11Z" />
    </svg>
  );
}

function KwaiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-2 6.2 5.5 3.3a.6.6 0 0 1 0 1l-5.5 3.3a.6.6 0 0 1-.9-.5V8.7a.6.6 0 0 1 .9-.5Z" />
    </svg>
  );
}

/**
 * Linha de ícones das redes sociais. Fonte única em `SOCIAL` (config.ts):
 * canais com link vazio são automaticamente escondidos — basta colar a URL
 * do TikTok/Kwai lá que eles aparecem aqui, no rodapé e no botão flutuante.
 */
export function SocialLinks({
  className,
  itemClassName,
  showWhatsapp = true,
  iconClassName = "w-4 h-4",
}: {
  className?: string;
  itemClassName?: string;
  showWhatsapp?: boolean;
  iconClassName?: string;
}) {
  const channels: Channel[] = [
    showWhatsapp && {
      key: "wa",
      label: "WhatsApp",
      href: waLink("Olá INOVAPRO3D! Vim pelo site."),
      icon: <MessageCircle className={iconClassName} />,
      hover: "hover:border-green-400/30 hover:bg-green-400/10 hover:text-green-300",
    },
    SOCIAL.instagram && {
      key: "ig",
      label: "Instagram",
      href: SOCIAL.instagram,
      icon: <Instagram className={iconClassName} />,
      hover: "hover:border-pink-400/30 hover:bg-pink-400/10 hover:text-pink-300",
    },
    SOCIAL.facebook && {
      key: "fb",
      label: "Facebook",
      href: SOCIAL.facebook,
      icon: <Facebook className={iconClassName} />,
      hover: "hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400",
    },
    SOCIAL.tiktok && {
      key: "tt",
      label: "TikTok",
      href: SOCIAL.tiktok,
      icon: <TikTokIcon className={iconClassName} />,
      hover: "hover:border-white/30 hover:bg-white/10 hover:text-white",
    },
    SOCIAL.kwai && {
      key: "kw",
      label: "Kwai",
      href: SOCIAL.kwai,
      icon: <KwaiIcon className={iconClassName} />,
      hover: "hover:border-orange-400/30 hover:bg-orange-400/10 hover:text-orange-300",
    },
  ].filter(Boolean) as Channel[];

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {channels.map((c) => (
        <a
          key={c.key}
          href={c.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={c.label}
          title={c.label}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/45 transition-all duration-300",
            c.hover,
            itemClassName,
          )}
        >
          {c.icon}
        </a>
      ))}
    </div>
  );
}

export default SocialLinks;
