import { describe, expect, it } from "vitest";
import {
  customerMatchesSearch,
  normalizeCustomerName,
  normalizeCustomerPhone,
  splitCustomerName,
} from "./customerIdentity";

describe("identidade do cliente", () => {
  it("normaliza nomes sem diferenciar acento ou caixa", () => {
    expect(normalizeCustomerName("  João da silva ")).toBe("JOAO DA SILVA");
  });

  it("encontra cliente por nome, sobrenome ou telefone sem máscara", () => {
    const customer = { name: "JOÃO DA SILVA", phone: "(91) 99999-1234" };
    expect(customerMatchesSearch(customer, "joao")).toBe(true);
    expect(customerMatchesSearch(customer, "silva")).toBe(true);
    expect(customerMatchesSearch(customer, "999991234")).toBe(true);
  });

  it("remove o código do Brasil ao comparar telefones", () => {
    expect(normalizeCustomerPhone("+55 (91) 99999-1234")).toBe("91999991234");
  });

  it("mantém sobrenome opcional e gera o nome completo em maiúsculas", () => {
    expect(splitCustomerName("Maria", "")).toEqual({
      firstName: "MARIA",
      lastName: "",
      fullName: "MARIA",
    });
  });
});
