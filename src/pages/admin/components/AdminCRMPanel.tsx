import { memo, useMemo } from "react";
import { Package, Eye, Plus, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/Button";

import type { Customer, Order } from "../../../types/domain";

interface AdminCRMPanelProps {
  customers: Customer[];
  orders: Order[];
  searchTerm: string;
  onSelectCRMUser: (c: Customer) => void;
  onAddCustomer: () => void;
  onExportCSV: () => void;
}

const getCustomerStats = (email: string, orders: Order[]) => {
  const customerOrders = orders.filter(o => o.userEmail === email);
  const totalSpent = customerOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);
  return { count: customerOrders.length, total: totalSpent };
};

const AdminCRMPanel = memo(({
  customers,
  orders,
  searchTerm,
  onSelectCRMUser,
  onAddCustomer,
  onExportCSV,
}: AdminCRMPanelProps) => {
  const filteredCustomers = useMemo(
    () =>
      customers.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())),
      ),
    [customers, searchTerm],
  );

  return (
    <motion.div key="crm" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white/[0.02] p-6 rounded-[24px] border border-white/5 gap-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest italic text-center sm:text-left">Base de Clientes (CRM)</h3>
          <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest text-center sm:text-left">Inteligência de contatos e retenção</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={onExportCSV} variant="outline" className="rounded-2xl gap-2 h-11 px-6 border-white/10 text-white/40 hover:text-white flex-1 sm:flex-none">
            <FileText className="w-4 h-4" /> CSV
          </Button>
          <Button onClick={onAddCustomer} className="rounded-2xl gap-2 h-11 px-6 flex-1 sm:flex-none">
            <Plus className="w-4 h-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* CRM MOBILE CARDS */}
      <div className="lg:hidden space-y-4">
        {filteredCustomers.map((c) => {
          const stats = getCustomerStats(c.email || '', orders);
          return (
            <div key={c.id} className="glass rounded-[32px] p-6 border border-white/5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center font-black text-sm text-primary uppercase">
                  {c.photoURL ? <img src={c.photoURL} className="w-full h-full rounded-2xl object-cover" alt="" /> : c.name?.[0]}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-black uppercase truncate">{c.name}</h4>
                  <p className="text-[10px] font-mono text-white/20 truncate">{c.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div>
                  <p className="text-[8px] font-black uppercase text-white/20 mb-1">Pedidos</p>
                  <p className="text-sm font-black italic">{stats.count}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-white/20 mb-1">Investido</p>
                  <p className="text-sm font-black italic text-primary">R$ {stats.total.toFixed(2)}</p>
                </div>
              </div>
              <Button onClick={() => onSelectCRMUser(c)} className="w-full rounded-2xl h-11 text-[10px] uppercase font-black italic tracking-widest" variant="outline">Protocolo Histórico</Button>
            </div>
          );
        })}
      </div>

      {/* CRM DESKTOP TABLE */}
      <div className="hidden lg:block glass rounded-[32px] sm:rounded-[48px] p-4 sm:p-10 border border-white/5 overflow-x-auto no-scrollbar">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5">
              <th className="pb-6">Cliente</th>
              <th className="pb-6">Pedidos</th>
              <th className="pb-6">Volume Transacionado</th>
              <th className="pb-6 text-right">Integração</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredCustomers.map((c) => {
              const stats = getCustomerStats(c.email || '', orders);
              return (
                <tr key={c.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center font-black text-xs text-primary">
                        {c.photoURL ? <img src={c.photoURL} className="w-full h-full rounded-full object-cover" alt="" /> : (c.name?.[0] || 'U')}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold uppercase">{c.name}</span>
                        <span className="text-[10px] text-white/20 font-bold">{c.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-6">
                    <div className="flex items-center gap-2">
                      <Package className="w-3 h-3 text-white/20" />
                      <span className="text-xs font-black uppercase">{stats.count}</span>
                    </div>
                  </td>
                  <td className="py-6 font-display font-black text-primary italic">R$ {stats.total.toFixed(2)}</td>
                  <td className="py-6 text-right">
                    <button onClick={() => onSelectCRMUser(c)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/20 hover:text-white group-hover:scale-105 transform"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
            {filteredCustomers.length === 0 && (
              <tr><td colSpan={4} className="py-20 text-center text-white/10 italic">Nenhum cliente catalogado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
});

export default AdminCRMPanel;
