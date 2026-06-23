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
      { id: "overview" as AdminTabId, name: "Painel", icon: "TrendingUp" },
      { id: "orders" as AdminTabId, name: "Pedidos", icon: "Package" },
      { id: "quotes" as AdminTabId, name: "Orçamentos", icon: "FileText" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { id: "categories" as AdminTabId, name: "Pastas", icon: "Folder" },
      { id: "products" as AdminTabId, name: "Catálogo", icon: "Printer" },
      { id: "materials" as AdminTabId, name: "Materiais", icon: "Box" },
      { id: "showcase" as AdminTabId, name: "Vitrine", icon: "Sparkles" },
      { id: "coupons" as AdminTabId, name: "Cupons", icon: "Tag" },
    ],
  },
  {
    label: "Relacionamento",
    items: [
      { id: "crm" as AdminTabId, name: "Clientes", icon: "Users" },
      { id: "support" as AdminTabId, name: "Suporte", icon: "AlertCircle" },
      { id: "faqs" as AdminTabId, name: "FAQs", icon: "HelpCircle" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { id: "settings" as AdminTabId, name: "Ajustes", icon: "Settings" },
      { id: "logs" as AdminTabId, name: "Auditoria", icon: "History" },
    ],
  },
] as const;

import {
  TrendingUp, Package, FileText, Folder, Printer, Box,
  Sparkles, Tag, Users, AlertCircle, HelpCircle, Settings, History,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp, Package, FileText, Folder, Printer, Box,
  Sparkles, Tag, Users, AlertCircle, HelpCircle, Settings, History,
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
        "w-60 border-r border-white/[0.06] bg-[#08080c] flex flex-col fixed inset-y-0 z-[70] transition-transform duration-300 ease-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="px-5 pt-6 pb-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
          <BrandMark className="h-6 w-6" />
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-[15px] font-bold tracking-tight text-white">INOVAPRO</span>
            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              Admin
            </span>
          </span>
        </Link>
        <button onClick={onClose} className="lg:hidden p-1.5 text-dim hover:text-white rounded-lg hover:bg-white/5">
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-6 overflow-y-auto no-scrollbar pb-4">
        {MENU_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
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
                      "group relative w-full flex items-center gap-3 rounded-lg pl-3 pr-2.5 py-2 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-white/[0.06] text-white"
                        : "text-white/45 hover:text-white hover:bg-white/[0.03]",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
                        isActive ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <Icon className={cn("w-[18px] h-[18px] shrink-0 transition-colors", isActive ? "text-primary" : "text-white/40 group-hover:text-white/70")} />
                    <span className="truncate">{item.name}</span>
                    {count != null && count > 0 && (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                          isActive ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-white/50",
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

      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <div className="w-9 h-9 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {avatarLetter}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-white truncate">
              {user?.displayName || user?.email?.split("@")[0] || "Admin"}
            </p>
            <p className="text-[11px] text-white/35 truncate">{user?.email}</p>
          </div>
          <button
            className="shrink-0 p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
