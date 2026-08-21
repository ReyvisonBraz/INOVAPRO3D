import { Search, UserCheck } from "lucide-react";

interface CalculatorCustomerOption {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  whatsapp?: string;
}

interface CalculatorCustomerSelectorProps {
  search: string;
  matches: CalculatorCustomerOption[];
  selectedCustomerId: string;
  selectedCustomerName: string;
  onSearchChange: (value: string) => void;
  onSelect: (customer: CalculatorCustomerOption) => void;
  onClear: () => void;
}

export function CalculatorCustomerSelector({
  search,
  matches,
  selectedCustomerId,
  selectedCustomerName,
  onSearchChange,
  onSelect,
  onClear,
}: CalculatorCustomerSelectorProps) {
  return (
    <>
      <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <label className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/65">
          <Search className="h-4 w-4 text-cyan-300" /> Buscar cliente já cadastrado
        </label>
        <input
          type="search"
          placeholder="Digite nome, sobrenome ou telefone"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm font-bold uppercase text-white placeholder:normal-case placeholder:text-white/30 focus:border-cyan-400/40 focus:outline-none"
        />
        {matches.length > 0 && (
          <div className="mt-2 grid gap-1.5">
            {matches.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => onSelect(customer)}
                className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-left transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.07]"
              >
                <span className="min-w-0">
                  <strong className="block truncate text-xs text-white">
                    {(
                      customer.name ||
                      [customer.firstName, customer.lastName].filter(Boolean).join(" ")
                    ).toLocaleUpperCase("pt-BR")}
                  </strong>
                  <span className="block text-[11px] font-mono text-white/45">
                    {customer.phone || customer.whatsapp || "SEM TELEFONE"}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] font-black uppercase text-cyan-300">
                  Selecionar
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCustomerId && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-3">
          <span className="flex min-w-0 items-center gap-2 text-xs font-black text-emerald-200">
            <UserCheck className="h-4 w-4 shrink-0" />
            <span className="truncate">{selectedCustomerName}</span>
          </span>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-[10px] font-black uppercase text-white/55 hover:text-white"
          >
            Alterar
          </button>
        </div>
      )}
    </>
  );
}
