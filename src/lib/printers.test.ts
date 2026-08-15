import { describe, expect, it } from "vitest";
import {
  applyMachineOverrides,
  countMachineOverrides,
  diffMachineOverrides,
  machineConfigFromPrinter,
  MACHINE_CONFIG_KEYS,
  mergePrinter,
  pickDefaultPrinter,
  printerFromMachineConfig,
  printerHourlyCost,
  PRINTER_COST_FIELDS,
  sortPrinters,
} from "./printers";
import { DEFAULT_MACHINE, machineHourBreakdown } from "./pricing";
import type { Printer } from "../types/domain";

const printer = (patch: Partial<Printer> = {}): Printer => ({
  id: patch.id ?? "p1",
  name: patch.name ?? "Bambu Lab P2S",
  ...DEFAULT_MACHINE,
  ...patch,
});

describe("machineConfigFromPrinter", () => {
  it("devolve exatamente as 9 chaves que o motor conhece", () => {
    const config = machineConfigFromPrinter(printer({ name: "X", photoUrl: "a.png" }));
    expect(Object.keys(config).sort()).toEqual([...MACHINE_CONFIG_KEYS].sort());
  });

  it("não vaza identidade da impressora para o motor", () => {
    const config = machineConfigFromPrinter(printer()) as unknown as Record<string, unknown>;
    expect(config.name).toBeUndefined();
    expect(config.photoUrl).toBeUndefined();
    expect(config.id).toBeUndefined();
  });
});

describe("compatibilidade com o cálculo atual", () => {
  it("impressora criada do settings/machine produz o mesmo custo-hora", () => {
    const seeded = printerFromMachineConfig(DEFAULT_MACHINE);
    const antes = machineHourBreakdown(DEFAULT_MACHINE);
    const depois = machineHourBreakdown(machineConfigFromPrinter(seeded));
    expect(depois).toEqual(antes);
    expect(printerHourlyCost(seeded)).toBeCloseTo(antes.total, 10);
  });

  it("a semeadura nasce padrão e ativa", () => {
    const seeded = printerFromMachineConfig(DEFAULT_MACHINE, "  ");
    expect(seeded.isDefault).toBe(true);
    expect(seeded.active).toBe(true);
    expect(seeded.name).toBe("Impressora principal");
  });
});

describe("mergePrinter", () => {
  it("nunca devolve NaN a partir de lixo", () => {
    const merged = mergePrinter(
      { name: 42, price: "caro", lifespanHours: NaN, maintPerHour: null },
      "abc",
    );
    for (const key of MACHINE_CONFIG_KEYS) {
      expect(Number.isFinite(merged[key])).toBe(true);
    }
    expect(merged.id).toBe("abc");
    expect(merged.name).toBe("Impressora principal");
  });

  it("aceita documento vazio, nulo ou de outro formato", () => {
    for (const raw of [null, undefined, {}, "texto", 7]) {
      const merged = mergePrinter(raw, "id");
      expect(merged.price).toBe(DEFAULT_MACHINE.price);
      expect(merged.active).toBe(true);
      expect(merged.isDefault).toBe(false);
    }
  });

  it("preserva os campos válidos e limita os que não podem ser zero", () => {
    const merged = mergePrinter(
      { name: " A1 mini ", price: 2500, lifespanHours: 0, maintPerHour: -3, isDefault: true },
      "id",
    );
    expect(merged.name).toBe("A1 mini");
    expect(merged.price).toBe(2500);
    expect(merged.lifespanHours).toBe(1);
    expect(merged.maintPerHour).toBe(0);
    expect(merged.isDefault).toBe(true);
  });

  it("mantém opcionais de energia ausentes em vez de inventar valor", () => {
    const merged = mergePrinter({ name: "A" }, "id");
    expect(merged.defaultSteadyPowerWatts).toBeUndefined();
    expect(merged.startupPowerWatts).toBeUndefined();
  });
});

describe("applyMachineOverrides", () => {
  it("não muta a base", () => {
    const base = machineConfigFromPrinter(printer());
    const copia = { ...base };
    applyMachineOverrides(base, { nozzlePrice: 999 });
    expect(base).toEqual(copia);
  });

  it("aplica só os campos informados", () => {
    const base = machineConfigFromPrinter(printer());
    const resultado = applyMachineOverrides(base, { nozzlePrice: 999 });
    expect(resultado.nozzlePrice).toBe(999);
    expect(resultado.price).toBe(base.price);
  });

  it("ignora NaN, undefined e chaves desconhecidas", () => {
    const base = machineConfigFromPrinter(printer());
    const resultado = applyMachineOverrides(base, {
      nozzlePrice: NaN,
      platePrice: undefined,
      naoExiste: 1,
    } as Partial<typeof base>);
    expect(resultado).toEqual(base);
  });

  it("sem overrides devolve a base intacta", () => {
    const base = machineConfigFromPrinter(printer());
    expect(applyMachineOverrides(base, null)).toEqual(base);
    expect(applyMachineOverrides(base)).toEqual(base);
  });
});

describe("diffMachineOverrides", () => {
  it("guarda apenas o que mudou", () => {
    const base = machineConfigFromPrinter(printer());
    const atual = { ...base, nozzlePrice: 999, maintPerHour: 0.5 };
    expect(diffMachineOverrides(base, atual)).toEqual({ nozzlePrice: 999, maintPerHour: 0.5 });
  });

  it("volta vazio quando nada foi personalizado", () => {
    const base = machineConfigFromPrinter(printer());
    expect(diffMachineOverrides(base, { ...base })).toEqual({});
    expect(countMachineOverrides(diffMachineOverrides(base, { ...base }))).toBe(0);
  });

  it("faz ida e volta com applyMachineOverrides", () => {
    const base = machineConfigFromPrinter(printer());
    const atual = { ...base, price: 15000, beltsLifeHours: 4000 };
    const diff = diffMachineOverrides(base, atual);
    expect(applyMachineOverrides(base, diff)).toEqual(atual);
    expect(countMachineOverrides(diff)).toBe(2);
  });
});

describe("pickDefaultPrinter e sortPrinters", () => {
  it("devolve null sem impressoras", () => {
    expect(pickDefaultPrinter([])).toBeNull();
  });

  it("prefere a marcada como padrão", () => {
    const lista = [
      printer({ id: "a", name: "A", order: 0 }),
      printer({ id: "b", name: "B", order: 5, isDefault: true }),
    ];
    expect(pickDefaultPrinter(lista)?.id).toBe("b");
    expect(sortPrinters(lista)[0].id).toBe("b");
  });

  it("ignora a padrão inativa e cai na primeira ativa", () => {
    const lista = [
      printer({ id: "a", name: "A", isDefault: true, active: false }),
      printer({ id: "b", name: "B", active: true }),
    ];
    expect(pickDefaultPrinter(lista)?.id).toBe("b");
  });

  it("com todas inativas ainda devolve alguma, sem quebrar o cálculo", () => {
    const lista = [printer({ id: "a", name: "A", active: false })];
    expect(pickDefaultPrinter(lista)?.id).toBe("a");
  });
});

describe("PRINTER_COST_FIELDS", () => {
  it("cobre exatamente as 9 chaves de custo, sem repetir", () => {
    const keys = PRINTER_COST_FIELDS.map((field) => field.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...MACHINE_CONFIG_KEYS].sort());
  });

  it("todo campo tem rótulo e ajuda preenchidos", () => {
    for (const field of PRINTER_COST_FIELDS) {
      expect(field.label.length).toBeGreaterThan(0);
      expect(field.shortLabel.length).toBeGreaterThan(0);
      expect(field.help.length).toBeGreaterThan(20);
    }
  });
});
