import { describe, it, expect } from "vitest";
import { parseTimeToHours, formatHoursToHHMM } from "./pricing";

describe("parseTimeToHours", () => {
  it('interpreta "2h 30m" como 2.5', () => {
    expect(parseTimeToHours("2h 30m")).toBeCloseTo(2.5, 5);
  });
  it('interpreta "2:30" como 2.5', () => {
    expect(parseTimeToHours("2:30")).toBeCloseTo(2.5, 5);
  });
  it('interpreta decimal puro "2.5" como 2.5', () => {
    expect(parseTimeToHours("2.5")).toBeCloseTo(2.5, 5);
  });
  it('interpreta só horas "3h" como 3', () => {
    expect(parseTimeToHours("3h")).toBe(3);
  });
  it('interpreta só minutos "45m" como 0.75', () => {
    expect(parseTimeToHours("45m")).toBeCloseTo(0.75, 5);
  });
  it("devolve 0 para string vazia", () => {
    expect(parseTimeToHours("")).toBe(0);
  });
  it("devolve 0 para lixo não numérico", () => {
    expect(parseTimeToHours("abc")).toBe(0);
  });
  it('interpreta dias: "1d 4h 12m" como 28.2', () => {
    expect(parseTimeToHours("1d 4h 12m")).toBeCloseTo(28.2, 5);
  });
  it('interpreta "2d" como 48', () => {
    expect(parseTimeToHours("2d")).toBe(48);
  });
  it('interpreta horas decimais "7.50h" como 7.5, não como 50', () => {
    expect(parseTimeToHours("7.50h")).toBeCloseTo(7.5, 5);
  });
  it('aceita vírgula decimal: "7,5h" como 7.5', () => {
    expect(parseTimeToHours("7,5h")).toBeCloseTo(7.5, 5);
  });
  it('interpreta dias decimais "1.5d" como 36', () => {
    expect(parseTimeToHours("1.5d")).toBeCloseTo(36, 5);
  });
  it('soma unidades decimais: "2.5h 30m" como 3', () => {
    expect(parseTimeToHours("2.5h 30m")).toBeCloseTo(3, 5);
  });
});

describe("formatHoursToHHMM", () => {
  it('formata 3.47h como "3h 28min"', () => {
    expect(formatHoursToHHMM(3.47)).toBe("3h 28min");
  });
  it("formata hora cheia sem minutos", () => {
    expect(formatHoursToHHMM(2)).toBe("2h");
  });
  it("formata menos de 1h só em minutos", () => {
    expect(formatHoursToHHMM(0.5)).toBe("30min");
  });
  it('satura negativo para "0min"', () => {
    expect(formatHoursToHHMM(-5)).toBe("0min");
  });
});

describe("parseTimeToHours com segundos do Bambu", () => {
  it("considera segundos no cálculo sem exigir exibição em segundos", () => {
    expect(parseTimeToHours("36m57s")).toBeCloseTo(36 / 60 + 57 / 3600, 8);
    expect(parseTimeToHours("22m4s")).toBeCloseTo(22 / 60 + 4 / 3600, 8);
    expect(
      formatHoursToHHMM(
        parseTimeToHours("2h49m") + parseTimeToHours("36m57s") + parseTimeToHours("22m4s"),
      ),
    ).toBe("3h 48min");
  });
});
