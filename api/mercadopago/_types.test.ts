import { describe, expect, it } from "vitest";
import {
  formatMercadoPagoDate,
  isKnownMercadoPagoStatus,
  mapMercadoPagoPaymentMethod,
  mapMercadoPagoStatus,
} from "./_types";

describe("mapMercadoPagoStatus", () => {
  it.each([
    ["approved", "APPROVED"],
    ["pending", "PENDING"],
    ["in_process", "PENDING"],
    ["authorized", "PENDING"],
    ["rejected", "REJECTED"],
    ["cancelled", "CANCELED"],
    ["canceled", "CANCELED"],
    ["expired", "EXPIRED"],
    ["refunded", "REFUNDED"],
    ["charged_back", "CHARGED_BACK"],
    ["future_status", "PROCESSING"],
  ])("mapeia %s para %s", (providerStatus, expectedStatus) => {
    expect(mapMercadoPagoStatus(providerStatus)).toBe(expectedStatus);
  });
});

describe("mapMercadoPagoPaymentMethod", () => {
  it("não presume um método desconhecido", () => {
    expect(mapMercadoPagoPaymentMethod("pix")).toBe("pix");
    expect(mapMercadoPagoPaymentMethod("new_method")).toBe("unknown");
  });
});

describe("isKnownMercadoPagoStatus", () => {
  it("reconhece os status documentados", () => {
    expect(isKnownMercadoPagoStatus("approved")).toBe(true);
    expect(isKnownMercadoPagoStatus("CHARGED_BACK")).toBe(true);
  });

  it("aponta status fora do contrato conhecido", () => {
    expect(isKnownMercadoPagoStatus("future_status")).toBe(false);
  });
});

describe("formatMercadoPagoDate", () => {
  it("usa o formato com deslocamento explícito exigido pelo provedor", () => {
    expect(formatMercadoPagoDate(new Date("2026-08-08T12:30:00.000Z"))).toBe(
      "2026-08-08T12:30:00.000+00:00",
    );
  });
});
