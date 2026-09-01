// Testes das regras do Firestore contra o emulador oficial.
//
// Estes testes não rodam em `npm run check`: exigem Java e o jar do emulador.
// Rode `npm run test:rules` — obrigatório sempre que `firestore.rules` mudar.
//
// O que se prova aqui é o que o comentário da regra promete. Antes, três
// promessas não eram cobradas por regra nenhuma: "1 avaliação por usuário por
// produto", "1 voto por avaliação" e a unicidade da inscrição na newsletter.
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, setLogLevel } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const ADMIN_UID = "admin-1";
const USER_UID = "cliente-1";
const OTHER_UID = "cliente-2";

let testEnv: RulesTestEnvironment;

/** Contexto anônimo: o visitante que chega pelo site sem sessão. */
function anon() {
  return testEnv.unauthenticatedContext().firestore();
}

function asUser(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

beforeAll(async () => {
  // A recusa é o resultado esperado na maioria dos casos; sem isso o log fica
  // coberto de `permission-denied` legítimos.
  setLogLevel("error");
  testEnv = await initializeTestEnvironment({
    projectId: "inovapro3d-rules-test",
    firestore: {
      rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // `isAdmin()` lê `users/{uid}.role`, então o admin precisa existir de fato.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", ADMIN_UID), {
      email: "admin@example.com",
      role: "ADMIN",
      createdAt: new Date(),
    });
  });
});

describe("coupons", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "coupons", "PROMO10"), {
        code: "PROMO10",
        percentOff: 10,
      });
    });
  });

  it("nega leitura a visitante e a cliente logado", async () => {
    await assertFails(getDoc(doc(anon(), "coupons", "PROMO10")));
    await assertFails(getDoc(doc(asUser(USER_UID), "coupons", "PROMO10")));
  });

  it("permite leitura ao admin", async () => {
    await assertSucceeds(getDoc(doc(asUser(ADMIN_UID), "coupons", "PROMO10")));
  });
});

describe("tickets", () => {
  const ticket = {
    subject: "Pedido atrasado",
    message: "O pedido não chegou na data prevista.",
    status: "OPEN",
    createdAt: serverTimestamp(),
  };

  it("nega criação anônima", async () => {
    await assertFails(setDoc(doc(anon(), "tickets", "t-1"), ticket));
  });

  // Este payload omite `userId`, `userName`, `email` e `phone` — os quatro
  // campos que a regra declara opcionais. É o caso que revelou o bug do
  // `optionalString(data.campo, ...)`: chave ausente abortava a avaliação e
  // negava o chamado inteiro.
  it("aceita criação de usuário autenticado sem os campos opcionais", async () => {
    await assertSucceeds(setDoc(doc(asUser(USER_UID), "tickets", "t-1"), ticket));
  });
});

describe("reviews", () => {
  function review(productId: string, uid: string) {
    return {
      productId,
      userId: uid,
      userName: "Cliente",
      userPhoto: null,
      rating: 5,
      comment: "Acabamento excelente.",
      createdAt: serverTimestamp(),
    };
  }

  it("aceita a avaliação no ID determinístico productId_uid", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(USER_UID), "reviews", `prod-1_${USER_UID}`), review("prod-1", USER_UID)),
    );
  });

  it("nega uma segunda avaliação do mesmo usuário no mesmo produto", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(USER_UID), "reviews", `prod-1_${USER_UID}`), review("prod-1", USER_UID)),
    );
    // O caminho do review bombing: mesmo produto, mesmo usuário, outro ID.
    await assertFails(
      setDoc(doc(asUser(USER_UID), "reviews", `prod-1_${USER_UID}_2`), review("prod-1", USER_UID)),
    );
  });

  it("nega avaliação gravada no ID de outro usuário", async () => {
    await assertFails(
      setDoc(doc(asUser(USER_UID), "reviews", `prod-1_${OTHER_UID}`), review("prod-1", USER_UID)),
    );
  });
});

describe("reviewVotes", () => {
  function vote(reviewId: string, uid: string) {
    return {
      reviewId,
      productId: "prod-1",
      userId: uid,
      value: 1,
      createdAt: serverTimestamp(),
    };
  }

  it("aceita o voto no ID reviewId__uid", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(USER_UID), "reviewVotes", `rev-1__${USER_UID}`), vote("rev-1", USER_UID)),
    );
  });

  it("nega voto com ID divergente", async () => {
    await assertFails(
      setDoc(doc(asUser(USER_UID), "reviewVotes", "voto-extra"), vote("rev-1", USER_UID)),
    );
  });
});

describe("reviewReports", () => {
  const report = {
    reviewId: "rev-1",
    productId: "prod-1",
    reporterId: USER_UID,
    reason: "Conteúdo ofensivo",
    createdAt: serverTimestamp(),
  };

  it("aceita a denúncia no ID reviewId__uid", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(USER_UID), "reviewReports", `rev-1__${USER_UID}`), report),
    );
  });

  it("nega denúncias repetidas do mesmo usuário na mesma avaliação", async () => {
    await assertFails(setDoc(doc(asUser(USER_UID), "reviewReports", "denuncia-2"), report));
  });
});

describe("newsletter", () => {
  const EMAIL = "visitante@example.com";
  const signup = { email: EMAIL, createdAt: serverTimestamp() };

  it("aceita inscrição anônima quando o ID é o e-mail normalizado", async () => {
    await assertSucceeds(setDoc(doc(anon(), "newsletter", EMAIL), signup));
  });

  it("nega ID diferente do e-mail, e-mail não normalizado e campo extra", async () => {
    await assertFails(setDoc(doc(anon(), "newsletter", "id-qualquer"), signup));
    await assertFails(
      setDoc(doc(anon(), "newsletter", "Visitante@Example.com"), {
        email: "Visitante@Example.com",
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(anon(), "newsletter", EMAIL), { ...signup, role: "ADMIN" as const }),
    );
  });

  it("nega reinscrição e preserva a data da inscrição original", async () => {
    await assertSucceeds(setDoc(doc(anon(), "newsletter", EMAIL), signup));

    let original: unknown;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      original = (await getDoc(doc(context.firestore(), "newsletter", EMAIL))).data()?.createdAt;
    });

    await assertFails(setDoc(doc(anon(), "newsletter", EMAIL), signup));

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const current = (await getDoc(doc(context.firestore(), "newsletter", EMAIL))).data();
      expect(current?.createdAt).toEqual(original);
    });
  });

  it("nega leitura da lista por visitante", async () => {
    await assertFails(getDoc(doc(anon(), "newsletter", EMAIL)));
  });
});

// Um campo opcional ausente precisa continuar sendo opcional. Em regras do
// Firestore ler `data.campo` de uma chave que não existe não devolve null: a
// avaliação aborta e a escrita inteira é negada. Cada caso abaixo omite todos
// os campos que a regra correspondente declara opcionais.
describe("campos opcionais ausentes", () => {
  it("aceita perfil criado sem nome nem foto", async () => {
    const context = testEnv.authenticatedContext(USER_UID, { email: "cliente@example.com" });
    await assertSucceeds(
      setDoc(doc(context.firestore(), "users", USER_UID), {
        email: "cliente@example.com",
        role: "CUSTOMER",
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("aceita orçamento sem nome, e-mail e preço estimado", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(USER_UID), "quotes", "orc-1"), {
        userId: USER_UID,
        status: "PENDING",
        fileName: "peca.stl",
        materialId: "pla-branco",
        infill: 20,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("aceita avaliação sem nome nem foto do autor", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(USER_UID), "reviews", `prod-9_${USER_UID}`), {
        productId: "prod-9",
        userId: USER_UID,
        rating: 4,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("aceita denúncia sem justificativa", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(USER_UID), "reviewReports", `rev-9__${USER_UID}`), {
        reviewId: "rev-9",
        productId: "prod-9",
        reporterId: USER_UID,
        createdAt: serverTimestamp(),
      }),
    );
  });
});
