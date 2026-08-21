interface CalculatorCustomerDetailsProps {
  priceTier: "RETAIL" | "WHOLESALE";
  hasSelectedCustomer: boolean;
  clientName: string;
  clientLastName: string;
  clientPhone: string;
  onPriceTierChange: (tier: "RETAIL" | "WHOLESALE") => void;
  onClientNameChange: (value: string) => void;
  onClientLastNameChange: (value: string) => void;
  onClientPhoneChange: (value: string) => void;
}

export function CalculatorCustomerDetails({
  priceTier,
  hasSelectedCustomer,
  clientName,
  clientLastName,
  clientPhone,
  onPriceTierChange,
  onClientNameChange,
  onClientLastNameChange,
  onClientPhoneChange,
}: CalculatorCustomerDetailsProps) {
  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/20 p-1.5">
        <button
          type="button"
          onClick={() => onPriceTierChange("RETAIL")}
          className={`min-h-11 rounded-lg px-3 text-xs font-black transition ${priceTier === "RETAIL" ? "bg-blue-500 text-white shadow-lg" : "text-white/45 hover:bg-white/[0.05] hover:text-white"}`}
        >
          Varejo <span className="block text-[9px] font-medium opacity-75">padrão</span>
        </button>
        <button
          type="button"
          onClick={() => onPriceTierChange("WHOLESALE")}
          className={`min-h-11 rounded-lg px-3 text-xs font-black transition ${priceTier === "WHOLESALE" ? "bg-amber-500 text-black shadow-lg" : "text-white/45 hover:bg-white/[0.05] hover:text-white"}`}
        >
          Atacado <span className="block text-[9px] font-medium opacity-75">lote ou revenda</span>
        </button>
      </div>

      {!hasSelectedCustomer && (
        <p className="mb-2 text-[11px] leading-relaxed text-white/45">
          Cliente novo: será criado um cadastro rápido no CRM ao salvar. Nome obrigatório, sobrenome
          opcional.
        </p>
      )}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Nome *"
          value={clientName}
          disabled={hasSelectedCustomer}
          onChange={(event) => onClientNameChange(event.target.value.toLocaleUpperCase("pt-BR"))}
          className="h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-bold uppercase text-white placeholder:normal-case placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none disabled:opacity-60"
        />
        <input
          type="text"
          placeholder="Sobrenome (opcional)"
          value={clientLastName}
          disabled={hasSelectedCustomer}
          onChange={(event) =>
            onClientLastNameChange(event.target.value.toLocaleUpperCase("pt-BR"))
          }
          className="h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-bold uppercase text-white placeholder:normal-case placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none disabled:opacity-60"
        />
        <div className="sm:col-span-2">
          <label className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-200">
            WhatsApp{" "}
            <span className="normal-case tracking-normal text-amber-200/70">
              Importante para enviar a proposta
            </span>
          </label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="(DDD) número do WhatsApp"
            value={clientPhone}
            disabled={hasSelectedCustomer}
            onChange={(event) => onClientPhoneChange(event.target.value)}
            className="h-11 w-full min-w-0 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] px-3 text-xs font-mono font-bold text-white placeholder:text-white/30 focus:border-amber-300/50 focus:outline-none disabled:opacity-60"
          />
        </div>
      </div>
    </>
  );
}
