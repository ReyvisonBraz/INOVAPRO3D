import { memo, useMemo } from "react";
import { Eye, FileText, Package, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/Button";
import { AdminEmptyState, AdminSectionHeader } from "./AdminPrimitives";
import type { Customer, Order } from "../../../types/domain";

interface AdminCRMPanelProps {
  customers: Customer[];
  orders: Order[];
  searchTerm: string;
  onSelectCRMUser: (customer: Customer) => void;
  onAddCustomer: () => void;
  onExportCSV: () => void;
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const AdminCRMPanel = memo(function AdminCRMPanel({ customers, orders, searchTerm, onSelectCRMUser, onAddCustomer, onExportCSV }: AdminCRMPanelProps) {
  const customerStats = useMemo(() => {
    const byEmail = new Map<string, { count: number; total: number }>();
    for (const order of orders) {
      const key = order.userEmail?.toLowerCase();
      if (!key || order.status === "CANCELED") continue;
      const current = byEmail.get(key) ?? { count: 0, total: 0 };
      byEmail.set(key, { count: current.count + 1, total: current.total + (order.total || 0) });
    }
    const term = searchTerm.trim().toLowerCase();
    return customers
      .filter((customer) => !term || [customer.name, customer.email, customer.phone, customer.whatsapp].some((value) => value?.toLowerCase().includes(term)))
      .map((customer) => ({ customer, stats: byEmail.get(customer.email?.toLowerCase() || "") ?? { count: 0, total: 0 } }));
  }, [customers, orders, searchTerm]);

  return (
    <motion.div key="crm" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <AdminSectionHeader eyebrow="Relacionamento" title="Clientes" description={`${customerStats.length} contatos com historico consolidado de pedidos.`} actions={
        <>
          <Button onClick={onExportCSV} variant="outline" className="h-9 rounded-lg border-white/10 px-3 text-[11px] font-semibold text-white/60 hover:text-white"><FileText className="h-3.5 w-3.5" /> Exportar CSV</Button>
          <Button onClick={onAddCustomer} className="h-9 rounded-lg px-3 text-[11px] font-semibold shadow-none"><Plus className="h-3.5 w-3.5" /> Novo cliente</Button>
        </>
      } />

      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {customerStats.map(({ customer, stats }) => (
          <article key={customer.id} className="admin-panel p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-blue-400/20 bg-blue-500/10 text-xs font-semibold text-blue-300">
                {customer.photoURL ? <img src={customer.photoURL} className="h-full w-full object-cover" alt="" /> : customer.name?.[0]?.toUpperCase() || "C"}
              </div>
              <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-white">{customer.name || "Cliente sem nome"}</h3><p className="truncate text-[11px] text-white/40">{customer.email || customer.whatsapp || customer.phone || "Sem contato"}</p></div>
            </div>
            <div className="my-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/[0.025] p-3"><span className="text-[10px] text-white/40">Pedidos</span><strong className="mt-1 block text-sm text-white">{stats.count}</strong></div>
              <div className="rounded-lg bg-white/[0.025] p-3"><span className="text-[10px] text-white/40">Volume</span><strong className="mt-1 block text-sm text-blue-300">{money.format(stats.total)}</strong></div>
            </div>
            <Button onClick={() => onSelectCRMUser(customer)} className="h-9 w-full rounded-lg border-white/10 text-[11px] font-semibold" variant="outline">Ver perfil e historico</Button>
          </article>
        ))}
      </div>

      <div className="admin-table-wrap hidden lg:block">
        <table className="admin-table min-w-[760px]">
          <thead><tr><th>Cliente</th><th>Contato</th><th>Pedidos</th><th>Volume</th><th className="text-right">Acoes</th></tr></thead>
          <tbody>
            {customerStats.map(({ customer, stats }) => (
              <tr key={customer.id}>
                <td><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-blue-400/15 bg-blue-500/10 text-[11px] font-semibold text-blue-300">{customer.photoURL ? <img src={customer.photoURL} className="h-full w-full object-cover" alt="" /> : customer.name?.[0]?.toUpperCase() || "C"}</div><div className="min-w-0"><p className="truncate font-semibold text-white">{customer.name || "Cliente sem nome"}</p><p className="mt-0.5 text-[10px] text-white/35">{customer.tags?.slice(0, 2).join(" · ") || "Sem segmento"}</p></div></div></td>
                <td><p>{customer.email || "Sem email"}</p><p className="mt-0.5 text-[10px] text-white/35">{customer.whatsapp || customer.phone || "Sem telefone"}</p></td>
                <td><span className="inline-flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-white/35" /> {stats.count}</span></td>
                <td className="font-semibold tabular-nums text-white">{money.format(stats.total)}</td>
                <td className="text-right"><button onClick={() => onSelectCRMUser(customer)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2.5 text-[11px] font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white"><Eye className="h-3.5 w-3.5" /> Ver</button></td>
              </tr>
            ))}
            {!customerStats.length && <tr><td colSpan={5} className="p-0"><AdminEmptyState title="Nenhum cliente encontrado" description="Ajuste a busca ou cadastre o primeiro contato da base." /></td></tr>}
          </tbody>
        </table>
      </div>
      {!customerStats.length && <div className="admin-panel lg:hidden"><AdminEmptyState title="Nenhum cliente encontrado" description="Ajuste a busca ou cadastre o primeiro contato da base." /></div>}
    </motion.div>
  );
});

export default AdminCRMPanel;
