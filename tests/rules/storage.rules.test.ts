// Testes das regras do Storage contra o emulador oficial.
//
// Companheiro de `firestore.rules.test.ts`: não rodam em `npm run check`
// (exigem Java e o jar do emulador). Rode `npm run test:rules` — obrigatório
// sempre que `storage.rules` mudar.
//
// O que se prova aqui é a distinção que a regra faz entre as duas naturezas de
// arquivo do bucket: vitrine (products, showcase, categories, printers,
// company) é público de propósito; `quotes/` é peça de cliente e não é.
// A leitura de `quotes/` já foi `if true`, e como `read` no Storage concede
// `get` E `list`, o prefixo inteiro era enumerável por qualquer visitante.
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, setLogLevel } from "firebase/firestore";
import { getBytes, listAll, ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const ADMIN_UID = "admin-1";
const USER_UID = "cliente-1";

/** Caminho real gravado por `src/lib/quotes.ts`: quotes/{uid}/{ts}-{nome}.ext */
const QUOTE_PATH = `quotes/${USER_UID}/1700000000000-peca.webp`;
const VITRINE_PATH = "products/produto-1.webp";

const PIXEL = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);

let testEnv: RulesTestEnvironment;

/** Contexto anônimo: o visitante que chega pelo site sem sessão. */
function anon() {
  return testEnv.unauthenticatedContext().storage();
}

function asUser(uid: string) {
  return testEnv.authenticatedContext(uid).storage();
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
    storage: {
      rules: readFileSync(new URL("../../storage.rules", import.meta.url), "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearStorage();
  await testEnv.clearFirestore();
  // `isAdmin()` aqui é cross-service: a regra do Storage consulta
  // `users/{uid}.role` no Firestore, então o admin precisa existir de fato.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", ADMIN_UID), {
      email: "admin@example.com",
      role: "ADMIN",
      createdAt: new Date(),
    });
    await uploadBytes(ref(context.storage(), QUOTE_PATH), PIXEL, {
      contentType: "image/webp",
    });
    await uploadBytes(ref(context.storage(), VITRINE_PATH), PIXEL, {
      contentType: "image/webp",
    });
  });
});

describe("quotes/ — anexos de orçamento", () => {
  it("nega download a visitante anônimo", async () => {
    await assertFails(getBytes(ref(anon(), QUOTE_PATH)));
  });

  // O caso que a leitura pública tornava possível: sem saber nenhuma URL, o
  // visitante listava o prefixo e descobria todos os arquivos e os UIDs donos.
  it("nega enumeração do prefixo a visitante anônimo", async () => {
    await assertFails(listAll(ref(anon(), "quotes")));
  });

  it("nega download a cliente autenticado que não é admin", async () => {
    await assertFails(getBytes(ref(asUser(USER_UID), QUOTE_PATH)));
  });

  // Mesmo o UID que aparece no caminho não basta: hoje nenhuma tela de cliente
  // abre um orçamento, então a regra é admin-only de propósito.
  it("nega enumeração a cliente autenticado que não é admin", async () => {
    await assertFails(listAll(ref(asUser(USER_UID), `quotes/${USER_UID}`)));
  });

  it("permite download ao admin", async () => {
    await assertSucceeds(getBytes(ref(asUser(ADMIN_UID), QUOTE_PATH)));
  });

  it("nega upload de quem não é admin", async () => {
    await assertFails(
      uploadBytes(ref(asUser(USER_UID), "quotes/cliente-1/invasao.webp"), PIXEL, {
        contentType: "image/webp",
      }),
    );
  });
});

describe("vitrine — segue pública", () => {
  // Contraprova: fechar `quotes/` não pode ter fechado o catálogo junto, que
  // precisa carregar para visitante deslogado.
  it("permite download anônimo de imagem de produto", async () => {
    await assertSucceeds(getBytes(ref(anon(), VITRINE_PATH)));
  });

  it("nega upload anônimo de imagem de produto", async () => {
    await assertFails(
      uploadBytes(ref(anon(), "products/invasao.webp"), PIXEL, {
        contentType: "image/webp",
      }),
    );
  });
});

describe("bucket fora das pastas declaradas", () => {
  it("nega leitura e escrita mesmo ao admin", async () => {
    await assertFails(getBytes(ref(asUser(ADMIN_UID), "pasta-desconhecida/x.webp")));
    await assertFails(
      uploadBytes(ref(asUser(ADMIN_UID), "pasta-desconhecida/x.webp"), PIXEL, {
        contentType: "image/webp",
      }),
    );
  });
});
