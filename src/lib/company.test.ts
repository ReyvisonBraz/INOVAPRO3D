import { describe, expect, it } from "vitest";
import {
  computeValidUntil,
  DEFAULT_COMPANY_PROFILE,
  formatCompanyAddress,
  formatCompanyPhone,
  formatDocument,
  formatDocumentLabel,
  mergeCompanyProfile,
} from "./company";
import { CONTACT } from "./config";

describe("mergeCompanyProfile", () => {
  it("semeia o cabeçalho com os contatos do site quando não há cadastro", () => {
    const perfil = mergeCompanyProfile(null);
    expect(perfil.tradeName).toBe(CONTACT.businessName);
    expect(perfil.email).toBe(CONTACT.email);
    expect(perfil.whatsapp).toBe(CONTACT.whatsapp);
    expect(perfil.defaultValidityDays).toBe(DEFAULT_COMPANY_PROFILE.defaultValidityDays);
  });

  it("aceita documento parcial, vazio ou de outro formato", () => {
    for (const raw of [undefined, {}, "texto", 12, []]) {
      const perfil = mergeCompanyProfile(raw);
      expect(perfil.tradeName.length).toBeGreaterThan(0);
      expect(perfil.defaultValidityDays).toBeGreaterThanOrEqual(1);
    }
  });

  it("prefere o cadastro do admin sobre o default", () => {
    const perfil = mergeCompanyProfile({
      tradeName: "  INOVAPRO3D LTDA  ",
      document: "12345678000199",
      site: "inovapro3d.com.br",
      defaultValidityDays: 15,
    });
    expect(perfil.tradeName).toBe("INOVAPRO3D LTDA");
    expect(perfil.document).toBe("12345678000199");
    expect(perfil.site).toBe("inovapro3d.com.br");
    expect(perfil.defaultValidityDays).toBe(15);
  });

  it("nunca deixa a validade zerada ou negativa", () => {
    expect(mergeCompanyProfile({ defaultValidityDays: 0 }).defaultValidityDays).toBe(1);
    expect(mergeCompanyProfile({ defaultValidityDays: -9 }).defaultValidityDays).toBe(1);
    expect(mergeCompanyProfile({ defaultValidityDays: "abc" }).defaultValidityDays).toBe(7);
    expect(mergeCompanyProfile({ defaultValidityDays: 10.9 }).defaultValidityDays).toBe(10);
  });

  it("descarta strings em branco em vez de imprimir campo vazio", () => {
    const perfil = mergeCompanyProfile({ legalName: "   ", site: "", logoUrl: "  " });
    expect(perfil.legalName).toBeUndefined();
    expect(perfil.site).toBeUndefined();
    expect(perfil.logoUrl).toBeUndefined();
  });

  it("ignora endereço completamente vazio", () => {
    expect(mergeCompanyProfile({ address: {} }).address).toBeUndefined();
    expect(mergeCompanyProfile({ address: { city: "Belém" } }).address).toEqual({
      zipCode: undefined,
      street: undefined,
      number: undefined,
      complement: undefined,
      neighborhood: undefined,
      city: "Belém",
      state: undefined,
    });
  });
});

describe("formatDocument", () => {
  it("formata CNPJ e CPF", () => {
    expect(formatDocument("12345678000199")).toBe("12.345.678/0001-99");
    expect(formatDocument("12345678901")).toBe("123.456.789-01");
  });

  it("devolve o original quando o tamanho não bate", () => {
    expect(formatDocument("123")).toBe("123");
    expect(formatDocument("")).toBe("");
    expect(formatDocument(undefined)).toBe("");
  });

  it("rotula com CNPJ ou CPF", () => {
    expect(formatDocumentLabel("12345678000199")).toBe("CNPJ 12.345.678/0001-99");
    expect(formatDocumentLabel("12345678901")).toBe("CPF 123.456.789-01");
    expect(formatDocumentLabel(undefined)).toBe("");
  });
});

describe("formatCompanyPhone", () => {
  it("formata celular e fixo, com ou sem DDI", () => {
    expect(formatCompanyPhone("5591980774776")).toBe("(91) 98077-4776");
    expect(formatCompanyPhone("91980774776")).toBe("(91) 98077-4776");
    expect(formatCompanyPhone("9132224444")).toBe("(91) 3222-4444");
  });

  it("devolve o texto original quando não reconhece", () => {
    expect(formatCompanyPhone("0800 123")).toBe("0800 123");
    expect(formatCompanyPhone(undefined)).toBe("");
  });
});

describe("formatCompanyAddress", () => {
  it("monta uma linha só com o que existe", () => {
    expect(
      formatCompanyAddress({
        street: "Rua das Flores",
        number: "123",
        neighborhood: "Centro",
        city: "Belém",
        state: "PA",
        zipCode: "66000-000",
      }),
    ).toBe("Rua das Flores, 123 · Centro, Belém/PA · CEP 66000-000");
  });

  it("não deixa separador sobrando com dados parciais", () => {
    expect(formatCompanyAddress({ city: "Belém", state: "PA" })).toBe("Belém/PA");
    expect(formatCompanyAddress({})).toBe("");
    expect(formatCompanyAddress(undefined)).toBe("");
  });
});

describe("computeValidUntil", () => {
  it("soma os dias de validade à emissão", () => {
    const emissao = new Date("2026-08-14T12:00:00");
    expect(computeValidUntil(emissao, 7).toISOString().slice(0, 10)).toBe("2026-08-21");
  });

  it("atravessa a virada de mês", () => {
    const emissao = new Date("2026-08-28T12:00:00");
    expect(computeValidUntil(emissao, 7).toISOString().slice(0, 10)).toBe("2026-09-04");
  });

  it("nunca vence antes da emissão", () => {
    const emissao = new Date("2026-08-14T12:00:00");
    expect(computeValidUntil(emissao, 0).getTime()).toBeGreaterThan(emissao.getTime());
    expect(computeValidUntil(emissao, NaN).getTime()).toBeGreaterThan(emissao.getTime());
  });
});
