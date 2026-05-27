import React, { useState } from "react";
import { 
  Calculator, 
  Zap, 
  Package, 
  AlertCircle, 
  ChevronRight,
  Settings,
  HelpCircle,
  TrendingUp,
  Coins,
  Gauge,
  Hash
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/Button";

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-block cursor-help ml-1.5 focus:outline-none">
      <HelpCircle className="w-3 h-3 text-white/30 hover:text-primary transition-colors inline" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-black/95 text-[9px] text-white/80 font-normal normal-case tracking-normal rounded-xl border border-white/10 shadow-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 group-active:opacity-100 group-active:scale-100 pointer-events-none transition-all duration-150 z-50 text-left leading-relaxed">
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/95" />
        {text}
      </span>
    </span>
  );
}

export default function FilamentCalculator() {
  const [spoolPrice, setSpoolPrice] = useState(120);
  const [spoolWeight, setSpoolWeight] = useState(1000);
  const [printWeight, setPrintWeight] = useState(150);
  const [energyCost, setEnergyCost] = useState(0.85);
  const [printTime, setPrintTime] = useState(10);
  const [printerPower, setPrinterPower] = useState(150);
  const [infill, setInfill] = useState(20);
  const [failureRate, setFailureRate] = useState(5);

  const materialCost = (spoolPrice / spoolWeight) * printWeight;
  const energyKWh = (printerPower / 1000) * printTime;
  const energyCostTotal = energyKWh * energyCost;
  const baseCost = materialCost + energyCostTotal;
  const failureCost = baseCost * (failureRate / 100);
  const totalCost = baseCost + failureCost;
  const costPerGram = printWeight > 0 ? totalCost / printWeight : 0;

  const materialPercent = totalCost > 0 ? (materialCost / totalCost) * 100 : 0;
  const energyPercent = totalCost > 0 ? (energyCostTotal / totalCost) * 100 : 0;
  const failurePercent = totalCost > 0 ? (failureCost / totalCost) * 100 : 0;

  return (
    <div className="px-3 lg:px-6 py-6 max-w-5xl mx-auto min-h-screen">
      {/* HEADER */}
      <div className="mb-8 lg:mb-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black font-display uppercase tracking-tight leading-none">
              Cálculo <span className="text-shimmer italic">Maker</span>
            </h1>
            <p className="text-[10px] text-white/30 font-medium tracking-wide mt-0.5">
              Projetado para precisão — custo real da manufatura aditiva
            </p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-white/15">
              <Settings className="w-2.5 h-2.5" /> NIST-SPEC v4.2
            </div>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-white/15">
              <Hash className="w-2.5 h-2.5" /> MOTOR DE PRECISÃO
            </div>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-primary/40 via-white/5 to-transparent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* INPUT PANEL */}
        <div className="lg:col-span-7 space-y-5">
          {/* MATERIAL CARD */}
          <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-5 lg:p-6 space-y-5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Parâmetros de Material</h3>
                <p className="text-[8px] text-white/25 font-medium tracking-wide">Filamento, peso e densidade</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] text-white/25 uppercase font-black tracking-widest px-0.5">
                  Preço do Carretel (R$)
                  <Tooltip text="Valor total investido no carretel de filamento (ex: PLA, PETG de 1kg)." />
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-white/20 font-mono">R$</span>
                  <input 
                    type="number" 
                    value={spoolPrice}
                    onChange={(e) => setSpoolPrice(Number(e.target.value))}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2.5 pl-9 pr-3 text-sm font-display font-black focus:border-primary/50 focus:bg-primary/[0.03] transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] text-white/25 uppercase font-black tracking-widest px-0.5">
                  Peso Nominal (g)
                  <Tooltip text="Peso líquido do filamento em gramas contido na bobina (geralmente 1000g)." />
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/20 font-mono">g</span>
                  <input 
                    type="number" 
                    value={spoolWeight}
                    onChange={(e) => setSpoolWeight(Number(e.target.value))}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2.5 px-3 pr-10 text-sm font-display font-black focus:border-primary/50 focus:bg-primary/[0.03] transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] text-white/25 uppercase font-black tracking-widest px-0.5 flex justify-between">
                <span>
                  Peso Estimado da Peça (g)
                  <Tooltip text="Peso da peça fatiada, incluindo suportes e guias, estimado no slicer." />
                </span>
                <span className="text-primary font-mono text-[10px]">{printWeight}g</span>
              </label>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <input 
                  type="range" min="1" max="1000" step="1" value={printWeight}
                  onChange={(e) => setPrintWeight(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-surface"
                  style={{
                    background: `linear-gradient(to right, #2563EB ${(printWeight/1000)*100}%, rgba(255,255,255,0.05) ${(printWeight/1000)*100}%)`
                  }}
                />
                <div className="flex justify-between text-[7px] text-white/15 uppercase font-black tracking-widest mt-2">
                  <span>1g</span>
                  <span>500g</span>
                  <span>1kg</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] text-white/25 uppercase font-black tracking-widest px-0.5 flex justify-between">
                  <span>
                    Preenchimento
                    <Tooltip text="Densidade da estrutura de suporte interna da peça (% do volume interno)." />
                  </span>
                  <span className="text-primary font-mono text-[10px]">{infill}%</span>
                </label>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <input 
                    type="range" min="0" max="100" step="5" value={infill}
                    onChange={(e) => setInfill(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-surface"
                    style={{
                      background: `linear-gradient(to right, #2563EB ${infill}%, rgba(255,255,255,0.05) ${infill}%)`
                    }}
                  />
                  <div className="flex justify-between text-[7px] text-white/15 uppercase font-black tracking-widest mt-2">
                    <span>Mín</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] text-white/25 uppercase font-black tracking-widest px-0.5 flex justify-between">
                  <span>
                    Taxa de Falha
                    <Tooltip text="Percentual médio reservado para perdas, testes ou descolamento na mesa." />
                  </span>
                  <span className="text-red-400 font-mono text-[10px]">{failureRate}%</span>
                </label>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <input 
                    type="range" min="0" max="25" step="1" value={failureRate}
                    onChange={(e) => setFailureRate(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-red-500 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-red-500 [&::-webkit-slider-thumb]:bg-surface"
                    style={{
                      background: `linear-gradient(to right, #EF4444 ${(failureRate/25)*100}%, rgba(255,255,255,0.05) ${(failureRate/25)*100}%)`
                    }}
                  />
                  <div className="flex justify-between text-[7px] text-white/15 uppercase font-black tracking-widest mt-2">
                    <span>Seguro</span>
                    <span>12.5%</span>
                    <span>25%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ENERGY CARD */}
          <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-5 lg:p-6 space-y-5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Eficiência Energética</h3>
                <p className="text-[8px] text-white/25 font-medium tracking-wide">Consumo e custo operacional da máquina</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] text-white/25 uppercase font-black tracking-widest px-0.5 truncate block">
                  Tempo (H)
                  <Tooltip text="Tempo total estimado para conclusão da impressão completa." />
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/20 font-mono">h</span>
                  <input 
                    type="number" 
                    value={printTime}
                    onChange={(e) => setPrintTime(Number(e.target.value))}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2.5 px-3 pr-10 text-sm font-display font-black focus:border-amber-500/50 focus:bg-amber-500/[0.03] transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] text-white/25 uppercase font-black tracking-widest px-0.5 truncate block">
                  Custo kWh
                  <Tooltip text="Preço pago no kW/h para a distribuidora da sua região, incluindo impostos." />
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-white/20 font-mono">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={energyCost}
                    onChange={(e) => setEnergyCost(Number(e.target.value))}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2.5 pl-9 pr-3 text-sm font-display font-black focus:border-amber-500/50 focus:bg-amber-500/[0.03] transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] text-white/25 uppercase font-black tracking-widest px-0.5 truncate block">
                  Potência (W)
                  <Tooltip text="Consumo médio nominal da sua impressora 3D em Watts durante a execução." />
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/20 font-mono">W</span>
                  <input 
                    type="number" 
                    value={printerPower}
                    onChange={(e) => setPrinterPower(Number(e.target.value))}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2.5 px-3 pr-10 text-sm font-display font-black focus:border-amber-500/50 focus:bg-amber-500/[0.03] transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS PANEL */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
          {/* COST BREAKDOWN CARD */}
          <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-6 space-y-6 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[60px] -mr-24 -mt-24 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] -ml-16 -mb-16 pointer-events-none" />

            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Análise de Custos</h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-mono text-white/30">R$</span>
                    <span className="text-3xl lg:text-4xl font-display font-black text-white tracking-tight leading-none">
                      {totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-white/25 font-black uppercase tracking-widest">por grama</p>
                  <p className="text-sm font-mono font-black text-primary">R$ {costPerGram.toFixed(3)}</p>
                </div>
              </div>

              {/* COST BARS */}
              <div className="space-y-3.5 mb-5">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white/60">Material</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white/40">R$ {materialCost.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${materialPercent}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white/60">Energia</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white/40">R$ {energyCostTotal.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${energyPercent}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white/60">Risco / Perda</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white/40">R$ {failureCost.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${failurePercent}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                      className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* TOTAL BAR */}
              <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                  className="absolute inset-0 flex"
                >
                  <div className="bg-gradient-to-r from-blue-600 to-blue-500" style={{ width: `${materialPercent}%` }} />
                  <div className="bg-gradient-to-r from-amber-600 to-amber-500" style={{ width: `${energyPercent}%` }} />
                  <div className="bg-gradient-to-r from-red-600 to-red-500" style={{ width: `${failurePercent}%` }} />
                </motion.div>
              </div>

              {/* SUMMARY STATS */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                  <Coins className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                  <p className="text-[7px] font-black uppercase tracking-widest text-white/25">Material</p>
                  <p className="text-[10px] font-mono font-black text-blue-400">{materialPercent.toFixed(0)}%</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                  <p className="text-[7px] font-black uppercase tracking-widest text-white/25">Energia</p>
                  <p className="text-[10px] font-mono font-black text-amber-400">{energyPercent.toFixed(0)}%</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                  <Gauge className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />
                  <p className="text-[7px] font-black uppercase tracking-widest text-white/25">Risco</p>
                  <p className="text-[10px] font-mono font-black text-red-400">{failurePercent.toFixed(0)}%</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 mb-4 flex gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500/60 mt-0.5" />
                <p className="text-[9px] font-medium leading-relaxed text-amber-500/50">
                  Cálculo técnico preliminar. Não computa depreciação de bicos, amortização de máquina, horas técnicas do projetista CAD ou insumos adicionais de acabamento.
                </p>
              </div>

              <Button variant="glass" className="w-full h-12 rounded-2xl bg-white text-surface text-xs font-display font-black uppercase tracking-tight gap-2 shadow-lg shadow-white/5 hover:shadow-white/10 transition-shadow">
                <TrendingUp className="w-4 h-4" />
                GERAR RELATÓRIO PDF
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* MOBILE BADGES */}
          <div className="flex justify-center gap-4 sm:hidden">
            <div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-white/15">
              <Settings className="w-2 h-2" /> NIST-SPEC v4.2
            </div>
            <div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-white/15">
              <Hash className="w-2 h-2" /> MOTOR DE PRECISÃO
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
