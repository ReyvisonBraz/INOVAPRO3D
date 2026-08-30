import { describe, expect, it } from "vitest";
import {
  buildOrderTelegramMessage,
  loadOrderForNotification,
  resolveTrustedIdentity,
  resolveVerifiedEmail,
} from "./_orderNotification";

type StoredOrder = Record<string, unknown> | null;

/** Firestore mínimo: só o caminho `collection("orders").doc(id).get()`. */
function fakeDb(orders: Record<string, StoredOrder>) {
  return {
    collection: () => ({
      doc: (id: string) => ({
        get: async () => {
          const data = orders[id];
          return { exists: data != null, data: () => data };
        },
      }),
    }),
  } as unknown as FirebaseFirestore.Firestore;
}

function fakeProfileDb(profile: Record<string, unknown> | null, shouldFail = false) {
  return {
    collection: () => ({
      doc: () => ({
        get: async () => {
          if (shouldFail) throw new Error("Firestore unavailable");
          return { data: () => profile };
        },
      }),
    }),
  } as unknown as FirebaseFirestore.Firestore;
}

const order = {
  userId: "dono-123",
  userName: "Ana Paula",
  userEmail: "ana@example.com",
  total: 249.9,
  items: [{ productId: "a" }, { productId: "b" }],
  paymentMethod: "mercadopago",
};

const caller = {
  uid: "dono-123",
  name: "Ana Paula",
  email: "ana@example.com",
};

describe("resolveTrustedIdentity", () => {
  it("normaliza nome e aceita somente e-mail marcado como verificado", async () => {
    const identity = await resolveTrustedIdentity(fakeProfileDb(null), "dono-123", {
      email: "  ANA@EXAMPLE.COM ",
      emailVerified: true,
      name: "  Ana\n  Paula  ",
    });

    expect(identity).toEqual({ email: "ana@example.com", name: "Ana Paula" });
  });

  it("não usa e-mail não verificado nem o e-mail editável do perfil", async () => {
    const identity = await resolveTrustedIdentity(
      fakeProfileDb({ email: "vitima@example.com", name: "Nome do perfil" }),
      "dono-123",
      { email: "vitima@example.com", emailVerified: false },
    );

    expect(identity).toEqual({ email: null, name: "Nome do perfil" });
  });

  it("continua seguro quando o perfil está indisponível", async () => {
    const identity = await resolveTrustedIdentity(fakeProfileDb(null, true), "dono-123", {
      email: "ana@example.com",
      emailVerified: true,
    });

    expect(identity).toEqual({ email: "ana@example.com", name: null });
  });
});

describe("resolveVerifiedEmail", () => {
  it("normaliza somente e-mail explicitamente verificado", () => {
    expect(resolveVerifiedEmail({ email: "  ANA@EXAMPLE.COM ", emailVerified: true })).toBe(
      "ana@example.com",
    );
    expect(resolveVerifiedEmail({ email: "vitima@example.com", emailVerified: false })).toBeNull();
    expect(resolveVerifiedEmail({ email: "vitima@example.com" })).toBeNull();
    expect(resolveVerifiedEmail({ email: "   ", emailVerified: true })).toBeNull();
  });
});

describe("loadOrderForNotification", () => {
  it("recusa quem não é dono do pedido", async () => {
    const result = await loadOrderForNotification(fakeDb({ "ped-1": order }), "ped-1", {
      ...caller,
      uid: "outro-uid",
    });
    expect(result).toEqual({ ok: false, status: 403, error: "Acesso negado." });
  });

  it("recusa pedido inexistente", async () => {
    const result = await loadOrderForNotification(fakeDb({}), "ped-1", caller);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("transforma indisponibilidade do Firestore em resposta controlada", async () => {
    const db = fakeProfileDb(null, true);
    const result = await loadOrderForNotification(db, "ped-1", caller);

    expect(result).toEqual({
      ok: false,
      status: 503,
      error: "Não foi possível consultar o pedido.",
    });
  });

  it("recusa orderId ausente ou fora do formato", async () => {
    const db = fakeDb({ "ped-1": order });
    for (const invalid of [undefined, "", 42, "com/barra", "com espaço", "x".repeat(129)]) {
      const result = await loadOrderForNotification(db, invalid, caller);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(400);
    }
  });

  it("devolve os dados do dono a partir do documento", async () => {
    const result = await loadOrderForNotification(fakeDb({ "ped-1": order }), "ped-1", caller);
    expect(result).toEqual({
      ok: true,
      data: {
        orderId: "ped-1",
        customerName: "Ana Paula",
        customerEmail: "ana@example.com",
        total: 249.9,
        itemCount: 2,
        paymentMethod: "mercadopago",
      },
    });
  });

  it("recusa pedido com total ou itens corrompidos", async () => {
    const db = fakeDb({ "ped-1": { ...order, total: "muito caro" } });
    const result = await loadOrderForNotification(db, "ped-1", caller);
    expect(result).toEqual({ ok: false, status: 422, error: "Pedido possui dados inválidos." });
  });

  it("ignora destinatário legado gravado no pedido", async () => {
    const db = fakeDb({
      "ped-1": { ...order, userEmail: "vitima@example.com", userName: "Nome legado" },
    });
    const result = await loadOrderForNotification(db, "ped-1", caller);

    expect(result.ok && result.data.customerEmail).toBe("ana@example.com");
    expect(result.ok && result.data.customerName).toBe("Ana Paula");
  });
});

describe("buildOrderTelegramMessage", () => {
  it("escapa markup vindo do pedido", async () => {
    const db = fakeDb({
      "ped-1": { ...order, userName: "<a/href=https://evil.com>Suporte</a>" },
    });
    const result = await loadOrderForNotification(db, "ped-1", {
      ...caller,
      name: "<a/href=https://evil.com>Suporte</a>",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const message = buildOrderTelegramMessage(result.data, "https://exemplo.test");
    // O canal usa parse_mode HTML: o link injetado não pode chegar renderizável.
    expect(message).not.toContain("<a/href");
    expect(message).toContain("&lt;a/href=https://evil.com&gt;");
    // A marcação legítima do template continua intacta.
    expect(message).toContain("<b>Novo Pedido — INOVAPRO3D</b>");
  });
});
