import { describe, expect, it } from "vitest";
import { mapMercadoPagoPaymentMethod, mapMercadoPagoStatus } from "./_types";

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
