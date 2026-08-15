import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, Gauge, TrendingUp } from "lucide-react";
import type { InventoryForecast } from "../../lib/inventoryForecast";
import { formatBRL, type PricingResult } from "../../lib/pricing";
import { buildScenarioTable } from "../../lib/scenarios";

interface ScenarioSimulatorProps {
  base: PricingResult;
  doubleLot: PricingResult;
  tier: "RETAIL" | "WHOLESALE";
  targetProfitPerMachineHour: number;
  inventory: InventoryForecast;
}

const toneClass = {
  healthy: "text-emerald-300",
  warning: "text-amber-300",
  loss: "text-red-300",
} as const;

export function ScenarioSimulator({
  base,
  doubleLot,
  tier,
  targetProfitPerMachineHour,
  inventory,
}: ScenarioSimulatorProps) {
  const [discountPct, setDiscountPct] = useState(8);
  const [filamentShockPct, setFilamentShockPct] = useState(10);
  const table = useMemo(
    () =>
      buildScenarioTable(base, {
        tier,
        discountPct,
        filamentShockPct,
        doubleLot,
      }),
    [base, tier, discountPct, filamentShockPct, doubleLot],
  );

  return (
    <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.25)] lg:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
            Previsibilidade
          </p>
          <h2 className="mt-1 text-lg font-black text-white">Simulador de cenários</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/45">
            Compare falhas, variação de insumo, desconto e lote sem alterar o orçamento atual.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:w-[440px]">
          <label className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs font-bold text-white/60">
            <span className="flex justify-between">
              Desconto <strong className="font-mono text-white">{discountPct}%</strong>
            </span>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={discountPct}
              onChange={(event) => setDiscountPct(Number(event.target.value))}
              className="mt-3 w-full accent-blue-500"
            />
          </label>
          <label className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs font-bold text-white/60">
            <span className="flex justify-between">
              Filamento <strong className="font-mono text-white">+{filamentShockPct}%</strong>
            </span>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={filamentShockPct}
              onChange={(event) => setFilamentShockPct(Number(event.target.value))}
              className="mt-3 w-full accent-violet-500"
            />
          </label>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[760px] w-full text-left text-xs">
          <thead className="bg-white/[0.05] text-[10px] font-black uppercase tracking-wider text-white/40">
            <tr>
              <th className="px-4 py-3">Cenário</th>
              <th className="px-4 py-3 text-right">Preço</th>
              <th className="px-4 py-3 text-right">Custo</th>
              <th className="px-4 py-3 text-right">Lucro</th>
              <th className="px-4 py-3 text-right">Margem</th>
              <th className="px-4 py-3 text-right">Δ lucro</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((scenario) => (
              <tr key={scenario.id} className="border-t border-white/[0.07] bg-black/10">
                <td className="px-4 py-3 font-bold text-white/80">
                  {scenario.id === "BASE" && (
                    <span className="mr-2 text-emerald-300" aria-label="Cenário base">
                      ●
                    </span>
                  )}
                  {scenario.label}
                </td>
                <td className="px-4 py-3 text-right font-mono text-white/70">
                  {formatBRL(scenario.price)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-white/55">
                  {formatBRL(scenario.cost)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono font-black ${toneClass[scenario.tone]}`}
                >
                  {formatBRL(scenario.profit)}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${toneClass[scenario.tone]}`}>
                  {scenario.marginPct.toFixed(1)}%
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${scenario.profitDelta >= 0 ? "text-emerald-300" : "text-red-300"}`}
                >
                  {scenario.profitDelta >= 0 ? "+" : "−"}
                  {formatBRL(Math.abs(scenario.profitDelta))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <TrendingUp className="h-5 w-5 text-emerald-300" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-white/40">
            Piso e desconto
          </p>
          <strong className="mt-1 block text-sm text-white">
            Desconto máximo seguro: {table.maxSafeDiscountPct.toFixed(1)}%
          </strong>
          <span className="mt-1 block text-xs text-white/45">
            Nunca abaixo de {formatBRL(table.sustainableFloor)}.
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <Gauge className="h-5 w-5 text-cyan-300" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-white/40">
            Hora-máquina
          </p>
          <strong className="mt-1 block text-sm text-white">
            Contribui {formatBRL(table.contributionPerMachineHour)}/h
          </strong>
          <span className="mt-1 block text-xs text-white/45">
            Meta configurada: {formatBRL(targetProfitPerMachineHour)}/h.
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          {inventory.hasShortage ? (
            <AlertTriangle className="h-5 w-5 text-amber-300" />
          ) : (
            <Boxes className="h-5 w-5 text-emerald-300" />
          )}
          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-white/40">
            Filamento vs. estoque
          </p>
          <strong
            className={`mt-1 block text-sm ${inventory.hasShortage ? "text-amber-200" : "text-white"}`}
          >
            {inventory.hasShortage
              ? `${inventory.shortages.length} material(is) com falta`
              : "Estoque suficiente para o previsto"}
          </strong>
          <span className="mt-1 block text-xs text-white/45">
            {inventory.hasShortage
              ? `Comprar aproximadamente ${inventory.shortages.reduce((sum, item) => sum + item.spoolsMissing, 0).toFixed(1)} rolo(s).`
              : `${inventory.totalGrams.toFixed(1)} g previstos neste projeto.`}
          </span>
        </div>
      </div>
    </section>
  );
}
