import { LogOut, X } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "../../../components/brand/BrandLogo";
import { cn } from "../../../lib/utils";
import type { AdminTabId } from "../adminConfig";
import { useAuth } from "../../../contexts/AuthContext";

const MENU_GROUPS = [
  {
    label: "Vendas",
    items: [
      { id: "overview", name: "Painel", icon: "TrendingUp" },
      { id: "orders", name: "Pedidos", icon: "Package" },
      { id: "quotes", name: "Orçamentos", icon: "FileText" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { id: "categories", name: "Categorias", icon: "Folder" },
      { id: "products", name: "Catálogo", icon: "Printer" },
      { id: "materials", name: "Materiais", icon: "Box" },
      { id: "printers", name: "Impressoras", icon: "Factory" },
      { id: "showcase", name: "Vitrine", icon: "Sparkles" },
      { id: "coupons", name: "Cupons", icon: "Tag" },
    ],
  },
  {
    label: "Relacionamento",
    items: [
      { id: "crm", name: "Clientes", icon: "Users" },
      { id: "support", name: "Suporte", icon: "AlertCircle" },
      { id: "reviews", name: "Avaliações", icon: "Star" },
      { id: "faqs", name: "FAQs", icon: "HelpCircle" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { id: "settings", name: "Ajustes", icon: "Settings" },
      { id: "logs", name: "Auditoria", icon: "History" },
    ],
  },
] as const satisfies readonly {
  label: string;
  items: readonly { id: AdminTabId; name: string; icon: string }[];
}[];

// O TypeScript já garante que todo item aponta para uma aba existente. Falta a
// direção contrária: uma aba nova esquecida aqui viraria uma tela inalcançável,
// porque este menu é a única forma de chegar nela. Isso quebra a compilação.
type TabInMenu = (typeof MENU_GROUPS)[number]["items"][number]["id"];
type EveryTabIsReachable =
  Exclude<AdminTabId, TabInMenu> extends never
    ? true
    : ["Aba fora do menu lateral:", Exclude<AdminTabId, TabInMenu>];
const _everyTabIsReachable: EveryTabIsReachable = true;
void _everyTabIsReachable;

import {
  TrendingUp,
  Package,
  FileText,
  Folder,
  Printer,
  Factory,
  Box,
  Sparkles,
  Tag,
  Users,
  AlertCircle,
  HelpCircle,
  Settings,
  History,
  Star,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  Package,
  FileText,
  Folder,
  Printer,
  Factory,
  Box,
  Sparkles,
  Tag,
  Users,
  AlertCircle,
  HelpCircle,
  Settings,
  History,
  Star,
};

interface AdminSidebarProps {
  activeTab: AdminTabId;
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: AdminTabId) => void;
  onLogout: () => void;
  counts?: Partial<Record<AdminTabId, number>>;
}

export function AdminSidebar({
  activeTab,
  isOpen,
  onClose,
  onSelectTab,
  onLogout,
  counts = {},
}: AdminSidebarProps) {
  const { user } = useAuth();
  const avatarLetter = (user?.displayName || user?.email || "A")[0].toUpperCase();

  return (
    <aside
      className={cn(
        "w-60 border-r border-white/[0.07] bg-[#0c0f15] flex flex-col fixed inset-y-0 z-[70] shadow-2xl shadow-black/20 transition-transform duration-300 ease-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/[0.055] px-4">
        <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
          <BrandMark className="h-7 w-7" />
          <span className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-semibold tracking-tight text-white">INOVAPRO 3D</span>
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-blue-300">
              Admin
            </span>
          </span>
        </Link>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/75 hover:bg-white/5 hover:text-white lg:hidden"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 no-scrollbar">
        {MENU_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/85">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICON_MAP[item.icon];
                const isActive = activeTab === item.id;
                const count = counts[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={cn(
                      "group relative flex h-9 w-full items-center gap-2.5 rounded-lg pl-3 pr-2.5 text-[12px] font-medium transition-colors",
                      isActive
                        ? "bg-blue-500/10 text-white ring-1 ring-inset ring-blue-400/10"
                        : "text-white hover:bg-white/[0.055]",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-blue-400 transition-opacity",
                        isActive ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-blue-300" : "text-white/70 group-hover:text-white",
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                    {count != null && count > 0 && (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                          isActive ? "bg-primary/20 text-primary" : "bg-white/[0.08] text-white/85",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <div className="w-9 h-9 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {avatarLetter}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-white truncate">
              {user?.displayName || user?.email?.split("@")[0] || "Admin"}
            </p>
            <p className="truncate text-[11px] text-white/85">{user?.email}</p>
          </div>
          <button
            className="shrink-0 rounded-lg p-2 text-white/70 transition-colors hover:bg-red-500/10 hover:text-red-300"
            onClick={onLogout}
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
