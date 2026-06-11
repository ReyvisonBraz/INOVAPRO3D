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
}

export function AdminSidebar({
  activeTab,
  isOpen,
  onClose,
  onSelectTab,
  onLogout,
}: AdminSidebarProps) {
  const { user } = useAuth();
  const avatarLetter = (user?.displayName || user?.email || "A")[0].toUpperCase();

  return (
    <aside
      className={cn(
        "w-60 border-r border-white/[0.06] bg-[#050508] flex flex-col fixed inset-y-0 z-[70] transition-transform duration-300 ease-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
          <BrandMark className="h-5 w-5" />
          <h1 className="text-base font-black font-display uppercase italic tracking-tighter">
            INOVAPRO<span className="text-primary">Admin</span>
          </h1>
        </Link>
        <button onClick={onClose} className="lg:hidden p-1.5 text-dim hover:text-white rounded-lg hover:bg-white/5">
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-5 overflow-y-auto no-scrollbar">
        {MENU_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white/15">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICON_MAP[item.icon];
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all",
                      activeTab === item.id
                        ? "bg-primary/15 text-primary border border-primary/20"
                        : "text-dim hover:text-white hover:bg-white/[0.04] border border-transparent",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                    {item.id === "orders" && (
                      <span className="ml-auto text-[10px] font-black text-white/15">0</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 p-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary shrink-0">
            {avatarLetter}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-white truncate">
              {user?.displayName || user?.email || "Admin"}
            </p>
            <p className="text-[10px] text-dim truncate">{user?.email}</p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 w-full p-2 hover:bg-white/5 rounded-xl transition-colors text-dim hover:text-red-400"
          onClick={onLogout}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Sair</span>
        </button>
      </div>
    </aside>
  );
}
