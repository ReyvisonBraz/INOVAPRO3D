import React, { useState } from "react";
import { 
  Calculator, 
  Zap, 
  DollarSign, 
  Package, 
  AlertCircle, 
  ChevronRight,
  Settings,
  Scale,
  Clock,
  ZapOff,
  HelpCircle
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
  const [spoolWeight, setSpoolWeight] = useState(1000); // grams
  const [printWeight, setPrintWeight] = useState(150); // grams
  const [energyCost, setEnergyCost] = useState(0.85); // per kWh
  const [printTime, setPrintTime] = useState(10); // hours
  const [printerPower, setPrinterPower] = useState(150); // Watts
  const [infill, setInfill] = useState(20); // %
  const [failureRate, setFailureRate] = useState(5); // %

  // Calculations
  const materialCost = (spoolPrice / spoolWeight) * printWeight;
  const energyKWh = (printerPower / 1000) * printTime;
  const energyCostTotal = energyKWh * energyCost;
  const baseCost = materialCost + energyCostTotal;
  const failureCost = baseCost * (failureRate / 100);
  const totalCost = baseCost + failureCost;

  return (
    <div className="px-3 lg:px-4 py-4 max-w-4xl mx-auto min-h-screen">
      <div className="max-w-xl mb-5 px-1">
        <h1 className="text-2xl lg:text-3xl font-black font-display uppercase tracking-tight mb-2">
          Maker <span className="text-shimmer italic">Calculus.</span>
        </h1>
        <p className="text-xs text-white/40 font-medium leading-relaxed">
          Engineered for precision. Calculate the true overhead of your additive manufacturing workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* CONFIGURATION AREA */}
        <div className="space-y-4 md:col-span-7">
          {/* MATERIAL CONFIG */}
          <section className="space-y-3.5">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-1.5">
               <Package className="w-3 h-3" /> Parâmetros de Material
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                  <label className="text-[8px] text-white/30 uppercase font-black tracking-widest px-1">
                    Preço do Carretel (R$)
                    <Tooltip text="Valor total investido no carretel de filamento (ex: PLA, PETG de 1kg)." />
                  </label>
                  <input 
                    type="number" 
                    value={spoolPrice}
                    onChange={(e) => setSpoolPrice(Number(e.target.value))}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg p-2.5 text-xs font-display font-black focus:border-primary focus:bg-primary/5 transition-all outline-none"
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[8px] text-white/30 uppercase font-black tracking-widest px-1">
                    Peso Nominal (g)
                    <Tooltip text="Peso líquido do filamento em gramas contido na bobina (geralmente 1000g)." />
                  </label>
                  <input 
                    type="number" 
                    value={spoolWeight}
                    onChange={(e) => setSpoolWeight(Number(e.target.value))}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg p-2.5 text-xs font-display font-black focus:border-primary focus:bg-primary/5 transition-all outline-none"
                  />
               </div>
            </div>
            
            <div className="space-y-1">
               <label className="text-[8px] text-white/30 uppercase font-black tracking-widest px-1 flex justify-between">
                 <span>
                   Peso Estimado da Peça (g)
                   <Tooltip text="Peso da peça fatiada, incluindo suportes e guias, estimado no slicer." />
                 </span>
                 <span className="text-primary font-mono">{printWeight}g</span>
               </label>
               <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                 <input 
                    type="range" min="1" max="1000" step="1" value={printWeight}
                    onChange={(e) => setPrintWeight(Number(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary mb-2"
                  />
                  <div className="flex justify-between text-[6px] text-white/20 uppercase font-black tracking-widest">
                    <span>1g</span>
                    <span>500g</span>
                    <span>1kg</span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-[8px] text-white/30 uppercase font-black tracking-widest px-1 flex justify-between">
                     <span>
                       Preenchimento
                       <Tooltip text="Densidade da estrutura de suporte interna da peça (% do volume interno)." />
                     </span>
                     <span className="text-primary font-mono">{infill}%</span>
                   </label>
                   <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                     <input 
                        type="range" min="0" max="100" step="5" value={infill}
                        onChange={(e) => setInfill(Number(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary mb-2"
                      />
                      <div className="flex justify-between text-[6px] text-white/20 uppercase font-black tracking-widest">
                        <span>Min</span>
                        <span>100%</span>
                      </div>
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] text-white/30 uppercase font-black tracking-widest px-1 flex justify-between">
                     <span>
                       Taxa de Falha
                       <Tooltip text="Percentual médio reservado para perdas estragadas, teste ou descolamento na mesa." />
                     </span>
                     <span className="text-red-400 font-mono">{failureRate}%</span>
                   </label>
                   <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                     <input 
                        type="range" min="0" max="25" step="1" value={failureRate}
                        onChange={(e) => setFailureRate(Number(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-red-500 mb-2"
                      />
                      <div className="flex justify-between text-[6px] text-white/20 uppercase font-black tracking-widest">
                        <span>Safe</span>
                        <span>25%</span>
                      </div>
                   </div>
                </div>
            </div>
          </section>

          {/* ENERGY CONFIG */}
          <section className="space-y-3.5">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-1.5">
               <Zap className="w-3 h-3" /> Eficiência Energética
            </h3>
            
            <div className="grid grid-cols-3 gap-2.5">
               <div className="space-y-1">
                  <label className="text-[8px] text-white/30 uppercase font-black tracking-widest px-1 truncate">
                    Tempo (H)
                    <Tooltip text="Tempo total estimado para conclusão da impressão completa." />
                  </label>
                  <input 
                    type="number" 
                    value={printTime}
                    onChange={(e) => setPrintTime(Number(e.target.value))}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg p-2.5 text-xs font-display font-black focus:border-primary focus:bg-primary/5 transition-all outline-none"
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[8px] text-white/30 uppercase font-black tracking-widest px-1 truncate">
                    Custo kWh
                    <Tooltip text="Preço pago no kW/h para a distribuidora da sua região, incluindo impostos." />
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={energyCost}
                    onChange={(e) => setEnergyCost(Number(e.target.value))}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg p-2.5 text-xs font-display font-black focus:border-primary focus:bg-primary/5 transition-all outline-none"
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[8px] text-white/30 uppercase font-black tracking-widest px-1 truncate">
                    Potência (W)
                    <Tooltip text="Consumo médio nominal da sua impressora 3D em Watts durante a execução." />
                  </label>
                  <input 
                    type="number" 
                    value={printerPower}
                    onChange={(e) => setPrinterPower(Number(e.target.value))}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg p-2.5 text-xs font-display font-black focus:border-primary focus:bg-primary/5 transition-all outline-none"
                  />
               </div>
            </div>
          </section>
        </div>

        {/* RESULTS AREA */}
        <div className="md:col-span-5 md:sticky md:top-20">
           <div className="rounded-2xl bg-primary p-5 relative overflow-hidden text-white shadow-lg shadow-primary/5">
              {/* Pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] -mr-16 -mt-16" />
              
              <div className="relative z-10">
                 <h3 className="text-[8px] font-black uppercase tracking-[0.4em] mb-4 opacity-70 flex items-center justify-between">
                    <span>Resultados da Análise</span>
                    <Tooltip text="Custeio direto gerado com base nos parâmetros inseridos ao lado." />
                 </h3>
                 
                 <div className="space-y-2.5 mb-5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 group">
                       <div className="flex items-center gap-2">
                          <Scale className="w-3.5 h-3.5 text-white/60" />
                          <p className="text-[10px] font-bold uppercase tracking-tight opacity-80">Massa Líquida</p>
                       </div>
                       <p className="text-xs font-mono font-black">R$ {materialCost.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-2 group">
                       <div className="flex items-center gap-2">
                          <ZapOff className="w-3.5 h-3.5 text-white/60" />
                          <p className="text-[10px] font-bold uppercase tracking-tight opacity-80">Gasto da Máquina</p>
                       </div>
                       <p className="text-xs font-mono font-black">R$ {energyCostTotal.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-2 group">
                       <div className="flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-white/60" />
                          <p className="text-[10px] font-bold uppercase tracking-tight opacity-80 font-mono">Perda / Risco</p>
                       </div>
                       <p className="text-xs font-mono font-black">R$ {failureCost.toFixed(2)}</p>
                    </div>

                    <div className="pt-2">
                       <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60">Faturamento Mínimo Estimado</p>
                       <div className="flex items-baseline gap-1">
                          <span className="text-sm font-mono text-white/40">R$</span>
                          <p className="text-2xl lg:text-3xl font-display font-black leading-none tracking-tighter">
                            {totalCost.toFixed(2)}
                          </p>
                       </div>
                    </div>
                 </div>

                 <div className="p-3 rounded-lg bg-black/10 border border-white/15 mb-4 flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 opacity-60 text-white mt-0.5" />
                    <p className="text-[9px] font-medium leading-relaxed opacity-60">
                      Cálculo técnico preliminar. Não computa depreciação de bicos, amortização de máquina, horas técnicas do projetista CAD ou insumos adicionais de acabamento.
                    </p>
                 </div>

                 <Button variant="glass" className="w-full h-11 rounded-lg bg-white text-primary text-xs font-display font-black uppercase tracking-tight gap-2 shadow-sm">
                    GERAR RELATÓRIO PDF <ChevronRight className="w-3.5 h-3.5" />
                 </Button>
              </div>
           </div>
           
           <div className="mt-4 flex justify-center gap-4">
              <div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-white/20">
                 <Settings className="w-2 h-2" /> NIST-SPEC v4.2
              </div>
              <div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-white/20">
                 <Calculator className="w-2 h-2" /> PRECISION ENGINE
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
