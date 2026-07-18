import { Menu, RefreshCw, Search } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/utils";
import type { AdminTabId } from "../adminConfig";

interface AdminHeaderProps {
  activeTab: AdminTabId;
  activeTabName?: string;
  activeTabDescription?: string;
  searchTerm: string;
  isSyncing: boolean;
  onOpenSidebar: () => void;
  onSearchChange: (value: string) => void;
  onSyncData: () => void;
}

export function AdminHeader({ activeTab, activeTabName, activeTabDescription, searchTerm, isSyncing, onOpenSidebar, onSearchChange, onSyncData }: AdminHeaderProps) {
  const search = (
    <div className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 transition focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-500/10">
      <Search className="h-3.5 w-3.5 shrink-0 text-white/35" />
      <input type="search" placeholder="Buscar em pedidos, clientes..." value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} className="w-full border-0 bg-transparent text-xs text-white outline-none placeholder:text-white/30" />
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#090b10]/90 backdrop-blur-xl">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onOpenSidebar} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-white/70 transition hover:bg-white/[0.07] hover:text-white lg:hidden" aria-label="Abrir menu">
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-white sm:text-[15px]">{activeTabName || activeTab}</h1>
            {activeTabDescription && <p className="hidden truncate text-[11px] text-white/40 sm:block">{activeTabDescription}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden w-64 md:block xl:w-80">{search}</div>
          <Button size="sm" variant="outline" className={cn("h-9 rounded-lg border-white/10 bg-white/[0.025] px-3 text-[11px] font-semibold text-white/65 hover:text-white", isSyncing && "opacity-50")} onClick={onSyncData} disabled={isSyncing}>
            <RefreshCw className={cn("h-3.5 w-3.5 sm:mr-1.5", isSyncing && "animate-spin")} />
            <span className="hidden sm:inline">{isSyncing ? "Atualizando" : "Atualizar"}</span>
          </Button>
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">{search}</div>
    </header>
  );
}
