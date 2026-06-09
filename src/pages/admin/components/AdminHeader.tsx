import { Menu, RefreshCw, Search } from "lucide-react";
import { BrandMark } from "../../../components/brand/BrandLogo";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/utils";
import type { AdminTabId } from "../adminConfig";

interface AdminHeaderProps {
  activeTab: AdminTabId;
  activeTabName?: string;
  searchTerm: string;
  isSyncing: boolean;
  onOpenSidebar: () => void;
  onSearchChange: (value: string) => void;
  onSyncData: () => void;
}

export function AdminHeader({
  activeTab,
  activeTabName,
  searchTerm,
  isSyncing,
  onOpenSidebar,
  onSearchChange,
  onSyncData,
}: AdminHeaderProps) {
  return (
    <header className="h-20 border-b border-white/5 bg-[#050508]/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 bg-white/5 rounded-xl border border-white/10 hover:border-primary/50 transition-all"
        >
          <Menu className="w-5 h-5 text-primary" />
        </button>
        <div className="flex items-center gap-2">
          <BrandMark className="h-6 w-6 hidden sm:block" />
          <h2 className="text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] italic truncate">
            {activeTabName || activeTab}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
        <div className="hidden sm:flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 border border-white/5 focus-within:border-primary/50 transition-all flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-dim" />
          <input
            type="text"
            placeholder="Pesquisar protocolo ou cliente..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="bg-transparent border-none outline-none text-[10px] font-bold text-white w-full"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className={cn("h-9 px-3 sm:px-4 text-[10px] uppercase font-black", isSyncing && "opacity-50")}
          onClick={onSyncData}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("w-3 h-3 sm:mr-2", isSyncing && "animate-spin")} />
          <span className="hidden sm:inline">{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
        </Button>
      </div>
    </header>
  );
}
