// ============================================================================
// MOTOR DE PRECIFICAÇÃO INOVAPRO3D
// ----------------------------------------------------------------------------
// Fonte ÚNICA de verdade para o custo e o preço de qualquer impressão 3D.
// As duas calculadoras (pública /calculadora e admin "Cálculo Maker Rápido")
// importam daqui, garantindo que o mesmo job gere SEMPRE o mesmo número.
//
// Foco: Bambu Lab P2S + AMS, operação B2B/varejo no Pará (tarifa Equatorial).
// ============================================================================

export type MaterialKey = "pla" | "petg";

export interface MaterialPreset {
  key: MaterialKey;
  label: string;
  /** Preço pago por 1 rolo (carretel) em R$. */
  spoolPrice: number;
  /** Peso líquido do rolo em gramas. */
  spoolWeight: number;
  /** Potência média da P2S imprimindo este material (W). */
  steadyPowerWatts: number;
  /** Reserva de falha sugerida (%) — PETG falha mais que PLA. */
  defaultReservePct: number;
  /** Temperatura típica de bico (°C) — apenas informativo. */
  printTempC: number;
}

/**
 * Presets de material com dados reais de mercado (Pará, 2025).
 * O foco é PLA (principal) e PETG (secundário).
 */
export const MATERIAL_PRESETS: Record<MaterialKey, MaterialPreset> = {
  pla: {
    key: "pla",
    label: "PLA",
    // R$100 produto + frete R$119 diluído em ~7 rolos (compra típica 5–10 rolos).
    // Frete/rolo ≈ R$17. Ajuste se comprar menos (5 rolos = R$124) ou mais (10 = R$112).
    spoolPrice: 117,
    spoolWeight: 1000,
    steadyPowerWatts: 200,
    defaultReservePct: 12,
    printTempC: 215,
  },
  petg: {
    key: "petg",
    label: "PETG",
    // R$120 produto + frete R$119 diluído em ~7 rolos ≈ R$17/rolo.
    spoolPrice: 137,
    spoolWeight: 1000,
    steadyPowerWatts: 230,
    defaultReservePct: 20,
    printTempC: 245,
  },
};

// ----------------------------------------------------------------------------
// MÁQUINA & DEPRECIAÇÃO
// ----------------------------------------------------------------------------

export interface MachineConfig {
  /** Quanto você pagou na impressora + AMS (R$). */
  price: number;
  /** Horas de impressão que a máquina deve durar antes de troca/overhaul. */
  lifespanHours: number;
  /** Bico (nozzle): preço e vida útil em horas. */
  nozzlePrice: number;
  nozzleLifeHours: number;
  /** Placa de impressão / PEI: preço e vida útil em horas. */
  platePrice: number;
  plateLifeHours: number;
  /** Correias (par): preço e vida útil em horas. */
  beltsPrice: number;
  beltsLifeHours: number;
  /** Manutenção geral por hora (graxa, PTFE, limpeza, imprevistos) em R$/h. */
  maintPerHour: number;
}

/**
 * Configuração padrão da Bambu Lab P2S + AMS 2 PRO no Brasil.
 * Fonte: mercado BR jun/2026 — Fozit R$9.899, Beehive R$10.999.
 * Você pode editar todos os campos na calculadora detalhada.
 */
export const DEFAULT_MACHINE: MachineConfig = {
  price: 10999,
  lifespanHours: 7000,
  // Hotend completo 0,4mm aço endurecido P1/P2 series (Tecnocubo jun/2026: R$200–220 + margem).
  nozzlePrice: 250,
  nozzleLifeHours: 1300,
  platePrice: 190,
  plateLifeHours: 1500,
  beltsPrice: 100,
  beltsLifeHours: 2500,
  maintPerHour: 0.2,
};

export interface MachineHourBreakdown {
  /** Depreciação da máquina por hora (preço ÷ vida útil). */
  depreciation: number;
  nozzle: number;
  plate: number;
  belts: number;
  maint: number;
  /** Soma do fundo de reposição de peças por hora. */
  replacement: number;
  /** Custo-máquina real por hora (depreciação + reposição). */
  total: number;
}

/**
 * Quebra o custo da máquina por hora em partes transparentes.
 * É isto que responde "quanto a P2S me custa por hora de uso?".
 */
export function machineHourBreakdown(m: MachineConfig): MachineHourBreakdown {
  const depreciation = m.price / Math.max(1, m.lifespanHours);
  const nozzle = m.nozzlePrice / Math.max(1, m.nozzleLifeHours);
  const plate = m.platePrice / Math.max(1, m.plateLifeHours);
  const belts = m.beltsPrice / Math.max(1, m.beltsLifeHours);
  const maint = Math.max(0, m.maintPerHour);
  const replacement = nozzle + plate + belts + maint;
  return {
    depreciation,
    nozzle,
    plate,
    belts,
    maint,
    replacement,
    total: depreciation + replacement,
  };
}

// ----------------------------------------------------------------------------
// ENERGIA (tarifa Pará)
// ----------------------------------------------------------------------------

export const DEFAULT_ENERGY = {
  /**
   * Equatorial Pará (CELPA) — RH ANEEL nº 3.507 (ago/2025→ago/2026).
   * Tarifa residencial B1 com ICMS 25% + PIS/COFINS: R$0,97/kWh.
   * Sem bandeira tarifária (verde). Ajuste se estiver em bandeira amarela/vermelha.
   */
  kwhCost: 0.97,
  /** Pico de aquecimento — P2S câmara fechada, medido ~1000 W por ~8 min. */
  startupPowerWatts: 1000,
  /** Tempo no pico (aquecimento). */
  startupMinutes: 8,
};

/** Taxa de falha padrão sugerida (%) — perfil estável de PLA. */
export const DEFAULT_FAILURE_RATE = 5;

// ----------------------------------------------------------------------------
// CONFIGURAÇÃO CENTRAL DE PRECIFICAÇÃO (settings/pricing no Firestore)
// ----------------------------------------------------------------------------
// Estes são os parâmetros de NEGÓCIO (não do job): energia, markups, preço
// mínimo, taxa de falha e os presets de material. O admin edita na aba
// Configurações e AS DUAS calculadoras (pública e do painel) leem daqui,
// garantindo que o mesmo job sempre gere o mesmo preço.

/** Parâmetros de um material editáveis pelo admin. */
export interface MaterialSettings {
  spoolPrice: number;
  spoolWeight: number;
  steadyPowerWatts: number;
  defaultReservePct: number;
}

/** Configuração de negócio compartilhada pelas duas calculadoras. */
export interface PricingSettings {
  /** Tarifa de energia (R$/kWh). */
  kwhCost: number;
  /** Pico de aquecimento (W). */
  startupPowerWatts: number;
  /** Duração do pico (min). */
  startupMinutes: number;
  /** Taxa de falha padrão (%). */
  failureRatePct: number;
  /** Markup de atacado (multiplicador sobre o custo). */
  wholesaleMarkup: number;
  /** Markup de varejo (multiplicador sobre o custo). */
  retailMarkup: number;
  /** Preço mínimo por pedido (R$). */
  minPrice: number;
  /** Desconto (%) para pagamento à vista no PIX, exibido na vitrine. */
  pixDiscountPct: number;
  /** Nº máximo de parcelas sem juros exibidas no cartão. */
  maxInstallments: number;
  /** Presets de material editáveis. */
  materials: Record<MaterialKey, MaterialSettings>;
}

/** Defaults usados quando ainda não existe `settings/pricing` no Firestore. */
export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  kwhCost: DEFAULT_ENERGY.kwhCost,
  startupPowerWatts: DEFAULT_ENERGY.startupPowerWatts,
  startupMinutes: DEFAULT_ENERGY.startupMinutes,
  failureRatePct: DEFAULT_FAILURE_RATE,
  wholesaleMarkup: 1.6,
  retailMarkup: 2.5,
  minPrice: 35,
  pixDiscountPct: 5,
  maxInstallments: 6,
  materials: {
    pla: {
      spoolPrice: MATERIAL_PRESETS.pla.spoolPrice,
      spoolWeight: MATERIAL_PRESETS.pla.spoolWeight,
      steadyPowerWatts: MATERIAL_PRESETS.pla.steadyPowerWatts,
      defaultReservePct: MATERIAL_PRESETS.pla.defaultReservePct,
    },
    petg: {
      spoolPrice: MATERIAL_PRESETS.petg.spoolPrice,
      spoolWeight: MATERIAL_PRESETS.petg.spoolWeight,
      steadyPowerWatts: MATERIAL_PRESETS.petg.steadyPowerWatts,
      defaultReservePct: MATERIAL_PRESETS.petg.defaultReservePct,
    },
  },
};

/**
 * Combina um documento bruto do Firestore (que pode estar parcial ou ausente)
 * com os defaults, garantindo um `PricingSettings` sempre válido e completo.
 */
export function mergePricingSettings(raw: unknown): PricingSettings {
  const base = DEFAULT_PRICING_SETTINGS;
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Record<string, unknown>;
  const numOr = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

  const mergeMaterial = (key: MaterialKey): MaterialSettings => {
    const def = base.materials[key];
    const m = (r.materials as Record<string, unknown> | undefined)?.[key] as
      | Record<string, unknown>
      | undefined;
    if (!m) return def;
    return {
      spoolPrice: numOr(m.spoolPrice, def.spoolPrice),
      spoolWeight: numOr(m.spoolWeight, def.spoolWeight),
      steadyPowerWatts: numOr(m.steadyPowerWatts, def.steadyPowerWatts),
      defaultReservePct: numOr(m.defaultReservePct, def.defaultReservePct),
    };
  };

  return {
    kwhCost: numOr(r.kwhCost, base.kwhCost),
    startupPowerWatts: numOr(r.startupPowerWatts, base.startupPowerWatts),
    startupMinutes: numOr(r.startupMinutes, base.startupMinutes),
    failureRatePct: numOr(r.failureRatePct, base.failureRatePct),
    wholesaleMarkup: numOr(r.wholesaleMarkup, base.wholesaleMarkup),
    retailMarkup: numOr(r.retailMarkup, base.retailMarkup),
    minPrice: numOr(r.minPrice, base.minPrice),
    pixDiscountPct: numOr(r.pixDiscountPct, base.pixDiscountPct),
    maxInstallments: numOr(r.maxInstallments, base.maxInstallments),
    materials: { pla: mergeMaterial("pla"), petg: mergeMaterial("petg") },
  };
}

// ----------------------------------------------------------------------------
// CÁLCULO PRINCIPAL
// ----------------------------------------------------------------------------

export interface PricingInputs {
  material: MaterialKey;
  /** Sobrescreve o preço do rolo do preset (opcional). */
  spoolPrice?: number;
  spoolWeight?: number;
  /** Sobrescreve a potência média do preset (opcional). */
  steadyPowerWatts?: number;

  /** Peso do filamento do slicer (g) — já inclui purga/suportes. */
  weightGrams: number;
  /** Tempo de impressão em horas decimais. */
  hours: number;
  /** Peças no lote. */
  quantity: number;
  /** Reserva de material para falhas (%). */
  reservePct: number;

  /** Tarifa de energia (R$/kWh). */
  kwhCost: number;
  startupPowerWatts: number;
  startupMinutes: number;

  machine: MachineConfig;

  /** Mão de obra: horas de trabalho manual (modelagem, pós, embalagem). */
  laborHours: number;
  /** Valor da sua hora de trabalho (R$). */
  laborRate: number;
  /** Insumos extras do job (parafusos, tinta, ímã) em R$. */
  extraSupplies: number;

  /**
   * Taxa de falha de impressão (%). Captura o tempo de máquina + energia
   * PERDIDOS quando uma impressão falha e precisa ser refeita. NÃO mexe no
   * material — esse desperdício já é coberto por `reservePct`.
   */
  failureRatePct?: number;

  /** Multiplicador de atacado (B2B) sobre o custo. */
  wholesaleMarkup: number;
  /** Multiplicador de varejo (cliente final) sobre o custo. */
  retailMarkup: number;
  /** Preço mínimo por pedido (R$). */
  minPrice: number;
}

export interface PricingResult {
  hours: number;
  quantity: number;
  weightGrams: number;
  gramCost: number;

  materialCost: number;
  energyKwh: number;
  energyCost: number;
  machineHourCost: number;
  machineCost: number;
  laborCost: number;
  extraSupplies: number;
  /** Custo do tempo de máquina + energia perdidos em falhas de impressão. */
  failureLoss: number;
  failureRatePct: number;
  totalCost: number;
  unitCost: number;
  costPerGram: number;

  shares: {
    material: number;
    energy: number;
    machine: number;
    labor: number;
    failure: number;
  };

  wholesaleTotal: number;
  wholesaleUnit: number;
  retailTotal: number;
  retailUnit: number;
  isBelowMinWholesale: boolean;
  isBelowMinRetail: boolean;

  profitWholesale: number;
  profitWholesaleUnit: number;
  profitWholesalePct: number;
  profitRetail: number;
  profitRetailUnit: number;
  profitRetailPct: number;
}

const num = (v: number, fallback = 0) =>
  Number.isFinite(v) ? v : fallback;

export function computePricing(input: PricingInputs): PricingResult {
  const preset = MATERIAL_PRESETS[input.material];
  const spoolPrice = Math.max(0, num(input.spoolPrice ?? preset.spoolPrice));
  const spoolWeight = Math.max(1, num(input.spoolWeight ?? preset.spoolWeight, 1000));
  const steadyPower = Math.max(0, num(input.steadyPowerWatts ?? preset.steadyPowerWatts));

  const hours = Math.max(0, num(input.hours));
  const quantity = Math.max(1, Math.floor(num(input.quantity, 1)));
  const weightGrams = Math.max(0, num(input.weightGrams));
  const reserveMultiplier = 1 + Math.max(0, num(input.reservePct)) / 100;

  // --- Material ---
  const gramCost = spoolPrice / spoolWeight;
  const materialCost = weightGrams * gramCost * reserveMultiplier;

  // --- Energia (pico de aquecimento + regime estável) ---
  const startupHours = Math.min(hours, Math.max(0, num(input.startupMinutes)) / 60);
  const steadyHours = Math.max(0, hours - startupHours);
  const energyKwh =
    (startupHours * Math.max(0, num(input.startupPowerWatts)) +
      steadyHours * steadyPower) /
    1000;
  const energyCost = energyKwh * Math.max(0, num(input.kwhCost));

  // --- Máquina (depreciação + reposição) ---
  const machineHourCost = machineHourBreakdown(input.machine).total;
  const machineCost = hours * machineHourCost;

  // --- Mão de obra + insumos ---
  const laborCost = Math.max(0, num(input.laborHours)) * Math.max(0, num(input.laborRate));
  const extraSupplies = Math.max(0, num(input.extraSupplies));

  // --- Taxa de falha: tempo de máquina + energia perdidos numa reimpressão ---
  // (o material desperdiçado já está coberto por reservePct)
  const failureRatePct = Math.max(0, num(input.failureRatePct));
  const failureLoss = (machineCost + energyCost) * (failureRatePct / 100);

  const totalCost =
    materialCost + energyCost + machineCost + laborCost + extraSupplies + failureLoss;
  const safe = totalCost > 0 ? totalCost : 1;
  const unitCost = totalCost / quantity;
  const costPerGram = weightGrams > 0 ? totalCost / weightGrams : 0;

  // --- Preços (com piso mínimo) ---
  const minPrice = Math.max(0, num(input.minPrice));
  const wholesaleRaw = totalCost * Math.max(0, num(input.wholesaleMarkup));
  const retailRaw = totalCost * Math.max(0, num(input.retailMarkup));
  const wholesaleTotal = Math.max(wholesaleRaw, minPrice);
  const retailTotal = Math.max(retailRaw, minPrice);

  const profitWholesale = wholesaleTotal - totalCost;
  const profitRetail = retailTotal - totalCost;

  return {
    hours,
    quantity,
    weightGrams,
    gramCost,
    materialCost,
    energyKwh,
    energyCost,
    machineHourCost,
    machineCost,
    laborCost,
    extraSupplies,
    failureLoss,
    failureRatePct,
    totalCost,
    unitCost,
    costPerGram,
    shares: {
      material: (materialCost / safe) * 100,
      energy: (energyCost / safe) * 100,
      machine: (machineCost / safe) * 100,
      labor: ((laborCost + extraSupplies) / safe) * 100,
      failure: (failureLoss / safe) * 100,
    },
    wholesaleTotal,
    wholesaleUnit: wholesaleTotal / quantity,
    retailTotal,
    retailUnit: retailTotal / quantity,
    isBelowMinWholesale: wholesaleRaw < minPrice && minPrice > 0,
    isBelowMinRetail: retailRaw < minPrice && minPrice > 0,
    profitWholesale,
    profitWholesaleUnit: profitWholesale / quantity,
    profitWholesalePct: (profitWholesale / (wholesaleTotal || 1)) * 100,
    profitRetail,
    profitRetailUnit: profitRetail / quantity,
    profitRetailPct: (profitRetail / (retailTotal || 1)) * 100,
  };
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

export const formatBRL = (value: number) =>
  (Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

/** Converte horas decimais (3.47) em "3h 28min" para exibição amigável. */
export function formatHoursToHHMM(hours: number): string {
  const h = Math.max(0, Number.isFinite(hours) ? hours : 0);
  const totalMinutes = Math.round(h * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  if (hh === 0) return `${mm}min`;
  if (mm === 0) return `${hh}h`;
  return `${hh}h ${mm}min`;
}

/** Converte "2h 30m", "2.5" ou "2:30" em horas decimais. */
export function parseTimeToHours(timeStr: string): number {
  if (!timeStr) return 0;
  const hMatch = timeStr.match(/(\d+)\s*h/i);
  const mMatch = timeStr.match(/(\d+)\s*m/i);
  const h = hMatch ? parseInt(hMatch[1], 10) : 0;
  const m = mMatch ? parseInt(mMatch[1], 10) : 0;

  if (!hMatch && !mMatch) {
    if (timeStr.includes(":")) {
      const [hp, mp] = timeStr.split(":").map((p) => parseFloat(p));
      if (!isNaN(hp) && !isNaN(mp)) return hp + mp / 60;
    }
    const n = parseFloat(timeStr);
    return isNaN(n) ? 0 : n;
  }
  return h + m / 60;
}

// ----------------------------------------------------------------------------
// EXPLICAÇÕES (texto único reaproveitado pelos tooltips "?")
// ----------------------------------------------------------------------------

export const HELP = {
  material:
    "Filamento usado no job. Define o preço por grama e o consumo de energia. PLA é o principal; PETG aquece mais e custa mais.",
  spoolPrice:
    "Quanto você pagou em 1 rolo do filamento. Verifique a nota da sua última compra.",
  spoolWeight:
    "Peso líquido do rolo. Normalmente 1000 g (1 kg). Está no rótulo da embalagem.",
  weight:
    "Copie o campo 'Filamento utilizado' do Bambu Studio após fatiar. Esse número já inclui suportes e purga das trocas de cor.",
  time:
    "Tempo total de impressão que o Bambu Studio mostra. Aceita '2h 30m', '2.5' ou '2:30'.",
  quantity:
    "Quantas peças saem nesta impressão. O custo total é dividido por aqui para dar o preço por unidade.",
  reserve:
    "Margem de segurança sobre o material para cobrir falhas e reimpressões. PLA com perfil bom: 10–15%. PETG ou peça difícil: 20–30%.",
  failureRate:
    "Quantas impressões, em média, falham e precisam ser refeitas (%). Aqui entra o tempo de máquina e a energia perdidos — o material já está na 'reserva'. Perfil estável: 3–8%. Peça difícil ou nova: 10–20%.",
  kwh:
    "Preço do kWh na sua conta de luz. Equatorial Pará (CELPA) 2025→2026: R$0,97/kWh na tarifa residencial B1 com ICMS 25% + PIS/COFINS, sem bandeira tarifária.",
  steadyPower:
    "Potência média da P2S imprimindo. Medida real: ~200 W em PLA e ~230 W em PETG.",
  startupPower:
    "Pico de consumo nos primeiros minutos, quando a câmara e a mesa aquecem. P2S chega a ~1000 W.",
  startupMinutes:
    "Quanto tempo a máquina fica nesse pico de aquecimento antes de estabilizar. Na P2S, cerca de 8 minutos.",
  machinePrice:
    "Quanto você pagou na P2S + AMS. É a base da depreciação: esse valor é diluído nas horas de uso.",
  lifespan:
    "Quantas horas de impressão você espera tirar da máquina antes de uma reforma grande ou troca. 6000 h é um número conservador (~3 anos de uso intenso).",
  nozzle:
    "Bico se desgasta com o uso e perde precisão. Preço da peça e quantas horas ela costuma durar.",
  plate:
    "Placa/PEI perde aderência com o tempo. Preço e vida útil em horas de impressão.",
  belts:
    "Correias esticam e folgam. Preço do par e horas até a troca.",
  maint:
    "Custo por hora de graxa, tubo PTFE, limpeza e pequenos imprevistos. Um fundo para não ser pego de surpresa.",
  laborHours:
    "Seu tempo de trabalho HUMANO no job: revisar arquivo, fatiar, tirar suportes, lixar, embalar. Mesmo impressão automática tem seu tempo.",
  laborRate:
    "Quanto vale 1 hora do seu trabalho. Não trabalhe de graça: coloque um valor justo para a sua mão de obra.",
  extraSupplies:
    "Insumos específicos deste job que não são filamento: parafusos, ímãs, tinta, cola, embalagem especial.",
  wholesale:
    "Markup de atacado/B2B. No modo ×: insira o multiplicador (ex: 1.6 = custo + 60%). No modo %: insira direto o markup sobre o custo (ex: 60%). Os dois modos dão o mesmo preço.",
  retail:
    "Markup de varejo (cliente final). No modo ×: ex: 2.5 = custo × 2,5. No modo %: ex: 150% = custo + 150%. Cobre seu lucro e o tempo de atendimento.",
  minPrice:
    "Valor mínimo que você cobra por qualquer pedido, mesmo peças pequenas. Cobre o custo de parar, atender, embalar e entregar.",
  depreciation:
    "Quanto da máquina 'se gasta' a cada hora de impressão. É o preço da P2S diluído na vida útil dela.",
  replacement:
    "Fundo de reposição: cada hora separa um valor para repor bico, placa, correias e manutenção quando desgastarem.",
};
