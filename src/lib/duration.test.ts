import { describe, expect, it } from "vitest";
import { describeDuration, formatClock, splitDuration } from "./duration";

describe("splitDuration", () => {
  it("separa horas, minutos e segundos", () => {
    expect(splitDuration(3_725_000)).toEqual({ hours: 1, minutes: 2, seconds: 5 });
  });

  it("nunca devolve tempo negativo", () => {
    expect(splitDuration(-5000)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
  });
});

describe("formatClock", () => {
  it("mostra apenas minutos e segundos na validade padrão do Pix", () => {
    expect(formatClock(30 * 60_000)).toBe("30:00");
    expect(formatClock(9_000)).toBe("00:09");
  });

  it("acrescenta horas quando a validade é maior", () => {
    expect(formatClock(3_725_000)).toBe("1:02:05");
  });
});

describe("describeDuration", () => {
  it("descreve o tempo por extenso para leitores de tela", () => {
    expect(describeDuration(3_725_000)).toBe("1 hora e 2 minutos e 5 segundos");
    expect(describeDuration(65_000)).toBe("1 minuto e 5 segundos");
    expect(describeDuration(1_000)).toBe("1 segundo");
  });

  it("usa plural corretamente", () => {
    expect(describeDuration(125_000)).toBe("2 minutos e 5 segundos");
  });
});
