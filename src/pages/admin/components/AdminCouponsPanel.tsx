import { AnimatePresence, motion } from "framer-motion";
import { Plus, Tag, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";
import type { Coupon } from "../../../types/domain";
import type { NewCouponForm } from "../hooks/useCouponAdmin";

interface Props {
  coupons: Coupon[];
  isAdding: boolean;
  form: NewCouponForm;
  setForm: (f: NewCouponForm) => void;
  onOpen: () => void;
  onCreate: () => void;
  onToggle: (c: Coupon) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-white/[0.04] border border-white/8 rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none transition-all placeholder:text-white/20";

export function AdminCouponsPanel({ coupons, isAdding, form, setForm, onOpen, onCreate, onToggle, onDelete, onClose }: Props) {
  const set = (k: keyof NewCouponForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-black uppercase tracking-tight">Cupons</h2>
          <p className="text-white/30 text-xs mt-1">{coupons.length} cupom(ns) cadastrado(s)</p>
        </div>
        <button
          onClick={onOpen}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-wider hover:bg-primary/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Novo Cupom
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl bg-white/[0.03] border border-white/8 p-6 space-y-5"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black uppercase tracking-widest text-primary">Novo Cupom</p>
              <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-white/30 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Código *">
                <input className={`${inputCls} font-mono uppercase`} placeholder="EX: PROMO10" value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Tipo *">
                <select className={inputCls} value={form.type} onChange={set("type")}>
                  <option value="percentage">Percentual (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </Field>
              <Field label={form.type === "percentage" ? "Desconto (%) *" : "Desconto (R$) *"}>
                <input type="number" min={0} max={form.type === "percentage" ? 100 : undefined}
                  className={inputCls} placeholder={form.type === "percentage" ? "10" : "15.00"}
                  value={form.value} onChange={set("value")} />
              </Field>
              <Field label="Valor mínimo do pedido (R$)">
                <input type="number" min={0} className={inputCls} placeholder="50.00"
                  value={form.minOrderValue} onChange={set("minOrderValue")} />
              </Field>
              <Field label="Máximo de usos (vazio = ilimitado)">
                <input type="number" min={1} className={inputCls} placeholder="100"
                  value={form.maxUses} onChange={set("maxUses")} />
              </Field>
              <Field label="Expira em">
                <input type="date" className={inputCls}
                  value={form.expiresAt} onChange={set("expiresAt")} />
              </Field>
              <Field label="Descrição interna">
                <input className={inputCls} placeholder="Campanha de verão..." value={form.description} onChange={set("description")} />
              </Field>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/8 text-white/40 text-[11px] font-black uppercase tracking-wider hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button onClick={onCreate} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-wider hover:bg-primary/80 transition-colors">
                Criar Cupom
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Tag className="w-10 h-10 text-white/10 mb-4" />
          <p className="text-white/30 text-sm font-medium">Nenhum cupom criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(c => {
            const expiry = c.expiresAt ? (c.expiresAt as any).toDate?.() ?? new Date(c.expiresAt as any) : null;
            const expired = expiry && expiry < new Date();
            return (
              <div key={c.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${c.active && !expired ? "bg-white/[0.03] border-white/8" : "bg-white/[0.015] border-white/5 opacity-60"}`}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sm">{c.code}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {c.type === "percentage" ? `${c.value}%` : `R$ ${c.value.toFixed(2).replace(".", ",")}`}
                    </span>
                    {expired && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Expirado</span>}
                    {!c.active && !expired && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 text-white/30">Inativo</span>}
                  </div>
                  <div className="flex gap-4 mt-1 text-[10px] text-white/30 font-medium">
                    {c.minOrderValue ? <span>Mín. R$ {c.minOrderValue.toFixed(2).replace(".", ",")}</span> : null}
                    <span>{c.usedCount ?? 0}{c.maxUses ? `/${c.maxUses}` : ""} usos</span>
                    {expiry && <span>Expira {expiry.toLocaleDateString("pt-BR")}</span>}
                    {c.description && <span className="truncate">{c.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => onToggle(c)} title={c.active ? "Desativar" : "Ativar"}
                    className="p-2 rounded-xl hover:bg-white/5 text-white/30 hover:text-primary transition-colors">
                    {c.active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => onDelete(c.id)} title="Excluir"
                    className="p-2 rounded-xl hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
