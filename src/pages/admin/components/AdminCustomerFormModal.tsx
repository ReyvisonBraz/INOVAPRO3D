import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/Button";
import type { CustomerDraft } from "../../../services/customers";

interface AdminCustomerFormModalProps {
  isEditing: boolean;
  isSubmitting: boolean;
  customer: CustomerDraft;
  setCustomer: Dispatch<SetStateAction<CustomerDraft>>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
}

export function AdminCustomerFormModal({
  isEditing,
  isSubmitting,
  customer,
  setCustomer,
  onSubmit,
  onClose,
}: AdminCustomerFormModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="bg-surface border border-white/10 rounded-2xl p-6 sm:p-8 max-w-2xl w-full relative my-auto max-h-[92vh] overflow-y-auto"
      >
        <button
          aria-label="Fechar editor de cliente"
          onClick={onClose}
          className="absolute top-8 right-8 text-dim hover:text-white"
        >
          <Plus className="w-8 h-8 rotate-45" />
        </button>
        <h2 className="text-3xl font-black italic tracking-tighter mb-8 leading-none">
          {isEditing ? "Editar Cliente" : "Novo Cliente"}
          <br />
          <span className="text-primary text-sm uppercase tracking-widest mt-2 block">
            {isEditing ? "Refinar Cadastro" : "Cadastro Manual (CRM)"}
          </span>
        </h2>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-dim italic">
                Nome Completo
              </label>
              <input
                required
                value={customer.name}
                onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-dim italic">
                Telefone / WhatsApp
              </label>
              <input
                value={customer.phone}
                onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
                placeholder="(00) 00000-0000"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-dim italic">
              Email de Contato
            </label>
            <input
              type="email"
              value={customer.email}
              onChange={(event) => setCustomer({ ...customer, email: event.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              value={customer.secondaryPhone}
              onChange={(event) => setCustomer({ ...customer, secondaryPhone: event.target.value })}
              placeholder="Telefone alternativo"
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
            />
            <select
              value={customer.preferredContact}
              onChange={(event) =>
                setCustomer({
                  ...customer,
                  preferredContact: event.target.value as "WHATSAPP" | "PHONE" | "EMAIL",
                })
              }
              className="bg-black border border-white/10 rounded-2xl p-4 text-sm"
            >
              <option value="WHATSAPP">Prefere WhatsApp</option>
              <option value="PHONE">Prefere telefone</option>
              <option value="EMAIL">Prefere email</option>
            </select>
            <input
              type="date"
              value={customer.birthday}
              onChange={(event) => setCustomer({ ...customer, birthday: event.target.value })}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
              title="Nascimento / aniversário"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select
              value={customer.customerType}
              onChange={(event) =>
                setCustomer({
                  ...customer,
                  customerType: event.target.value as "PERSON" | "COMPANY",
                })
              }
              className="bg-black border border-white/10 rounded-2xl p-4 text-sm"
            >
              <option value="PERSON">Pessoa fisica</option>
              <option value="COMPANY">Empresa</option>
            </select>
            <input
              value={customer.document}
              onChange={(event) => setCustomer({ ...customer, document: event.target.value })}
              placeholder="CPF / CNPJ"
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              value={customer.zipCode}
              onChange={(event) => setCustomer({ ...customer, zipCode: event.target.value })}
              placeholder="CEP"
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
            />
            <input
              value={customer.city}
              onChange={(event) => setCustomer({ ...customer, city: event.target.value })}
              placeholder="Cidade"
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
            />
            <input
              value={customer.state}
              onChange={(event) =>
                setCustomer({
                  ...customer,
                  state: event.target.value.toUpperCase().slice(0, 2),
                })
              }
              placeholder="UF"
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
            />
          </div>
          <input
            value={customer.address}
            onChange={(event) => setCustomer({ ...customer, address: event.target.value })}
            placeholder="Endereco completo"
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              value={customer.source}
              onChange={(event) => setCustomer({ ...customer, source: event.target.value })}
              placeholder="Origem do cliente"
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
            />
            <input
              value={customer.whatsapp}
              onChange={(event) => setCustomer({ ...customer, whatsapp: event.target.value })}
              placeholder="WhatsApp"
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-dim italic">
              Segmentação (Tags separadas por vírgula)
            </label>
            <input
              value={customer.tags.join(", ")}
              onChange={(event) =>
                setCustomer({
                  ...customer,
                  tags: event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter((tag) => tag !== ""),
                })
              }
              placeholder="Ex: VIP, B2B, Atacado"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
            />
          </div>
          <textarea
            value={customer.notes}
            onChange={(event) => setCustomer({ ...customer, notes: event.target.value })}
            placeholder="Observacoes gerais"
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm min-h-20"
          />
          <textarea
            value={customer.internalNotes}
            onChange={(event) => setCustomer({ ...customer, internalNotes: event.target.value })}
            placeholder="Observacoes internas (nao exibidas ao cliente)"
            className="w-full bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-sm min-h-20"
          />
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-16 rounded-[24px] uppercase font-black text-xs italic tracking-widest bg-primary shadow-xl shadow-primary/20"
          >
            {isSubmitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar cliente"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
