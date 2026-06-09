import { AnimatePresence, motion } from "framer-motion";
import { LogOut, X } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "../../../components/brand/BrandLogo";
import { cn } from "../../../lib/utils";
import { ADMIN_MENU_ITEMS, type AdminTabId } from "../adminConfig";

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
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "w-64 border-r border-white/5 bg-surface/30 backdrop-blur-3xl flex flex-col fixed inset-y-0 z-[70] transition-transform duration-500 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="p-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <BrandMark className="h-6 w-6" />
            <h1 className="text-xl font-black font-display uppercase italic tracking-tighter">
              INOVAPRO<span className="text-primary truncate">Admin</span>
            </h1>
          </Link>
          <button onClick={onClose} className="lg:hidden p-2 text-dim hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar pb-8">
          {ADMIN_MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-bold transition-all group",
                activeTab === item.id
                  ? "bg-primary text-white shadow-xl shadow-primary/20"
                  : "text-secondary hover:text-white hover:bg-white/5",
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5">
          <button className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-2xl transition-colors" onClick={onLogout}>
            <LogOut className="w-4 h-4 text-dim" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
