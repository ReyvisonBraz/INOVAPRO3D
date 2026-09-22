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
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  where,
} from "firebase/firestore";
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

// A ficha do filamento é estoque, não vitrine: custo de compra, saldo,
// fornecedor e lote. Era legível por qualquer visitante, e uma consulta
// anônima em produção devolvia os documentos inteiros.
describe("materials", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "materials", "pla-branco"), {
        name: "BRANCO",
        type: "PLA",
        color: "#ffffff",
        pricePerKg: 120,
        stockGrams: 1000,
        supplier: "Fornecedor X",
        active: true,
      });
    });
  });

  it("nega leitura a visitante e a cliente logado", async () => {
    await assertFails(getDoc(doc(anon(), "materials", "pla-branco")));
    await assertFails(getDoc(doc(asUser(USER_UID), "materials", "pla-branco")));
  });

  // A calculadora é quem lê a coleção, e ela é rota `requireAdmin`.
  it("permite leitura ao admin", async () => {
    await assertSucceeds(getDoc(doc(asUser(ADMIN_UID), "materials", "pla-branco")));
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

  // A5: a assinatura da avaliação é pública e some da moderação — quem escolhe
  // o nome e a foto é o token, não o corpo da requisição.
  describe("identidade assinada pelo token", () => {
    const CLAIMS = { name: "Ana Souza", picture: "https://lh3.example.com/ana.jpg" };

    function asAna() {
      return testEnv.authenticatedContext(USER_UID, CLAIMS).firestore();
    }

    it("aceita nome e foto iguais aos do token", async () => {
      await assertSucceeds(
        setDoc(doc(asAna(), "reviews", `prod-1_${USER_UID}`), {
          ...review("prod-1", USER_UID),
          userName: CLAIMS.name,
          userPhoto: CLAIMS.picture,
        }),
      );
    });

    it("nega nome forjado — o caminho da falsa avaliação oficial", async () => {
      await assertFails(
        setDoc(doc(asAna(), "reviews", `prod-1_${USER_UID}`), {
          ...review("prod-1", USER_UID),
          userName: "InovaPro3D Oficial",
        }),
      );
    });

    it("nega foto apontando para uma URL de fora do token", async () => {
      await assertFails(
        setDoc(doc(asAna(), "reviews", `prod-1_${USER_UID}`), {
          ...review("prod-1", USER_UID),
          userPhoto: "https://rastreador.example.com/pixel.gif",
        }),
      );
    });

    it("aceita a parte local do e-mail quando o token não traz nome", async () => {
      const ctx = testEnv.authenticatedContext(USER_UID, { email: "ana@example.com" }).firestore();
      await assertSucceeds(
        setDoc(doc(ctx, "reviews", `prod-1_${USER_UID}`), {
          ...review("prod-1", USER_UID),
          userName: "ana",
        }),
      );
    });
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

// O catálogo é público, mas só do que está publicado. O filtro de `active`
// vivia na tela (`Catalog.tsx`), então o rascunho não aparecia na vitrine e
// mesmo assim vinha inteiro para quem consultasse a coleção direto.
describe("products", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "products", "publicado"), { name: "Publicado", active: true });
      await setDoc(doc(db, "products", "rascunho"), { name: "Rascunho", active: false });
      // Produto legado: nunca teve o campo. O padrão `true` do `get()` o mantém
      // visível, senão a regra apagaria da vitrine tudo o que veio antes.
      await setDoc(doc(db, "products", "legado"), { name: "Legado" });
    });
  });

  it("permite ao visitante ler o produto publicado e o legado", async () => {
    await assertSucceeds(getDoc(doc(anon(), "products", "publicado")));
    await assertSucceeds(getDoc(doc(anon(), "products", "legado")));
  });

  it("nega ao visitante o rascunho", async () => {
    await assertFails(getDoc(doc(anon(), "products", "rascunho")));
  });

  it("permite ao admin ler o rascunho", async () => {
    await assertSucceeds(getDoc(doc(asUser(ADMIN_UID), "products", "rascunho")));
  });

  // Regra não é filtro: a consulta sem `where` pode devolver o rascunho, e
  // por isso falha inteira. É o que obriga toda consulta pública a filtrar.
  it("nega a listagem sem filtro e aceita a filtrada", async () => {
    await assertFails(getDocs(collection(anon(), "products")));
    await assertSucceeds(
      getDocs(query(collection(anon(), "products"), where("active", "==", true))),
    );
  });

  it("permite ao admin listar sem filtro", async () => {
    await assertSucceeds(getDocs(query(collection(asUser(ADMIN_UID), "products"), limit(10))));
  });
});

// Os campos que saíram do documento público do produto.
describe("productsInternal", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "productsInternal", "publicado"), {
        sourceUrl: "https://makerworld.com/pt/models/13717",
        productionMaterial: "PLA",
      });
    });
  });

  it("nega leitura a visitante e a cliente logado", async () => {
    await assertFails(getDoc(doc(anon(), "productsInternal", "publicado")));
    await assertFails(getDoc(doc(asUser(USER_UID), "productsInternal", "publicado")));
  });

  it("permite leitura e escrita ao admin", async () => {
    await assertSucceeds(getDoc(doc(asUser(ADMIN_UID), "productsInternal", "publicado")));
    await assertSucceeds(
      setDoc(doc(asUser(ADMIN_UID), "productsInternal", "publicado"), {
        productionMaterial: "PETG",
      }),
    );
  });
});

describe("settings", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "settings", "storefront"), { pixDiscountPct: 5, maxInstallments: 3 });
      await setDoc(doc(db, "settings", "global"), { promoBanner: "Frete grátis", flatRate: 20 });
      await setDoc(doc(db, "settings", "pricing"), { energyCostKwh: 0.9 });
    });
  });

  // A projeção que a página do produto consome — e só ela.
  it("permite ao visitante ler storefront", async () => {
    await assertSucceeds(getDoc(doc(anon(), "settings", "storefront")));
  });

  // `global` não tem leitor público no app, e o tipo aceita campo livre: o que
  // for gravado ali não pode virar público por descuido.
  it("nega ao visitante global e pricing", async () => {
    await assertFails(getDoc(doc(anon(), "settings", "global")));
    await assertFails(getDoc(doc(anon(), "settings", "pricing")));
  });

  it("permite ao admin ler global", async () => {
    await assertSucceeds(getDoc(doc(asUser(ADMIN_UID), "settings", "global")));
  });
});
