import { describe, it, expect } from "vitest";
import { mergePricingSettings, DEFAULT_PRICING_SETTINGS } from "./pricing";

describe("mergePricingSettings", () => {
  it("devolve os defaults quando o input é null", () => {
    expect(mergePricingSettings(null)).toEqual(DEFAULT_PRICING_SETTINGS);
  });

  it("devolve os defaults quando o input não é objeto", () => {
    expect(mergePricingSettings("lixo")).toEqual(DEFAULT_PRICING_SETTINGS);
    expect(mergePricingSettings(42)).toEqual(DEFAULT_PRICING_SETTINGS);
  });

  it("sobrescreve só os campos numéricos presentes", () => {
    const merged = mergePricingSettings({ retailMarkup: 3.0, minPrice: 50 });
    expect(merged.retailMarkup).toBe(3.0);
    expect(merged.minPrice).toBe(50);
    // Campos ausentes mantêm o default:
    expect(merged.wholesaleMarkup).toBe(DEFAULT_PRICING_SETTINGS.wholesaleMarkup);
    expect(merged.kwhCost).toBe(DEFAULT_PRICING_SETTINGS.kwhCost);
  });

  it("ignora valores não-numéricos e cai no default", () => {
    const merged = mergePricingSettings({ retailMarkup: "muito", minPrice: NaN });
    expect(merged.retailMarkup).toBe(DEFAULT_PRICING_SETTINGS.retailMarkup);
    expect(merged.minPrice).toBe(DEFAULT_PRICING_SETTINGS.minPrice);
  });

  it("faz merge parcial dos presets de material", () => {
    const merged = mergePricingSettings({ materials: { pla: { spoolPrice: 130 } } });
    expect(merged.materials.pla.spoolPrice).toBe(130);
    // Demais campos do PLA mantêm o default:
    expect(merged.materials.pla.spoolWeight).toBe(
      DEFAULT_PRICING_SETTINGS.materials.pla.spoolWeight,
    );
    // PETG intacto:
    expect(merged.materials.petg).toEqual(DEFAULT_PRICING_SETTINGS.materials.petg);
  });
});
