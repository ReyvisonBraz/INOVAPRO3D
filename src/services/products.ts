import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Product } from "../types/domain";

/** Teto de operacoes por batch no Firestore. */
const BATCH_LIMIT = 500;

// ============================================================================
// CAMPOS INTERNOS DO PRODUTO
// ----------------------------------------------------------------------------
// `products` e leitura publica: e o catalogo. O Firestore nao tem seguranca por
// campo, entao o que nao pode ser publico precisa sair do documento — e nao
// apenas deixar de ser exibido.
//
// Estes dois nunca aparecem em tela de cliente, so no painel: `sourceUrl` e a
// procedencia do modelo (o link de origem, que uma consulta anonima devolvia em
// todos os produtos) e `productionMaterial` e o insumo de fabricacao, que o
// proprio tipo ja documenta como "nao e uma opcao exibida ao cliente".
//
// Moram em `productsInternal/{productId}` — colecao irma, admin-only por regra.
// Colecao irma e nao subcolecao para o painel continuar carregando tudo com um
// `getDocs` a mais em paralelo, em vez de uma leitura por produto.
// ============================================================================

const INTERNAL_COLLECTION = "productsInternal";

export const PRODUCT_INTERNAL_FIELDS = ["sourceUrl", "productionMaterial"] as const;

export type ProductInternalField = (typeof PRODUCT_INTERNAL_FIELDS)[number];

export type ProductInternal = Pick<Product, ProductInternalField>;

function isInternalField(key: string): key is ProductInternalField {
  return (PRODUCT_INTERNAL_FIELDS as readonly string[]).includes(key);
}

export function productInternalRef(productId: string): DocumentReference {
  return doc(db, INTERNAL_COLLECTION, productId);
}

/**
 * Separa um payload de produto nas duas metades que vao para documentos
 * diferentes. Chave unica da divisao: toda gravacao passa por aqui, entao
 * acrescentar um campo interno e mexer so em `PRODUCT_INTERNAL_FIELDS`.
 */
export function splitProductPayload<T extends Record<string, unknown>>(
  payload: T,
): { publicData: Record<string, unknown>; internalData: Record<string, unknown> } {
  const publicData: Record<string, unknown> = {};
  const internalData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (isInternalField(key)) internalData[key] = value;
    else publicData[key] = value;
  }
  return { publicData, internalData };
}

/**
 * Le os documentos internos de uma vez. O painel junta ao resultado de
 * `products` para que o restante da tela continue vendo um `Product` inteiro —
 * a divisao existe no banco, nao na memoria.
 */
export async function fetchProductsInternal(): Promise<Map<string, ProductInternal>> {
  const snapshot = await getDocs(collection(db, INTERNAL_COLLECTION));
  return new Map(snapshot.docs.map((d) => [d.id, d.data() as ProductInternal]));
}

export async function readProductInternal(productId: string): Promise<ProductInternal | null> {
  const snapshot = await getDoc(productInternalRef(productId));
  return snapshot.exists() ? (snapshot.data() as ProductInternal) : null;
}

export function mergeProductsInternal(
  products: Product[],
  internals: Map<string, ProductInternal>,
): Product[] {
  return products.map((product) => {
    const internal = internals.get(product.id);
    return internal ? { ...product, ...internal } : product;
  });
}

/**
 * Move os campos internos dos produtos que ainda os tem no documento publico.
 *
 * Idempotente: produto sem nenhum dos campos e ignorado, e rodar duas vezes nao
 * causa dano — a segunda passada nao encontra nada para mover. O `updatedAt`
 * fica intacto de proposito: isso e migracao tecnica, nao edicao de catalogo, e
 * o campo ordena listas do painel. Mesmo criterio de `backfillProductCategoryIds`.
 *
 * Devolve quantos produtos foram migrados.
 */
export async function migrateProductsInternal(products: Product[]): Promise<number> {
  const pending = products
    .map((product) => ({
      id: product.id,
      internalData: splitProductPayload({ ...product }).internalData,
    }))
    .filter((entry) => Object.keys(entry.internalData).length > 0);

  for (let start = 0; start < pending.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const entry of pending.slice(start, start + BATCH_LIMIT)) {
      batch.set(productInternalRef(entry.id), entry.internalData, { merge: true });
      // O mesmo batch grava a copia e apaga o original: nao existe janela em
      // que o campo tenha sumido do publico sem estar salvo no interno.
      batch.update(
        doc(db, "products", entry.id),
        Object.fromEntries(Object.keys(entry.internalData).map((key) => [key, deleteField()])),
      );
    }
    await batch.commit();
  }

  return pending.length;
}

/**
 * Move um produto de categoria.
 *
 * Grava os dois campos: `categoryId` e o nome. O id e o vinculo real; o nome
 * fica como espelho de exibicao e como fallback de quem ainda le por nome.
 */
export async function updateProductCategory(
  productId: string,
  categoryId: string,
  categoryName: string,
): Promise<void> {
  await updateDoc(doc(db, "products", productId), {
    categoryId,
    category: categoryName,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Move varios produtos de uma vez.
 *
 * Em batch, nao em updates soltos: falha no meio de um `Promise.all` deixava
 * parte dos produtos movidos e parte nao, e o rollback da tela so desfazia o
 * que estava na memoria. O batch aplica tudo ou nada.
 */
export async function updateProductsCategory(
  productIds: string[],
  categoryId: string,
  categoryName: string,
): Promise<void> {
  for (let start = 0; start < productIds.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const id of productIds.slice(start, start + BATCH_LIMIT)) {
      batch.update(doc(db, "products", id), {
        categoryId,
        category: categoryName,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

/**
 * Remove o vinculo de categoria (id e nome) de varios produtos de uma vez.
 *
 * Usado quando uma categoria e excluida: sem isso, `category` fica gravado
 * no produto como um nome "fantasma" que nunca mais existe na colecao
 * `categories`, mas continua aparecendo na vitrine e no hover do card.
 */
export async function clearProductsCategory(productIds: string[]): Promise<void> {
  for (let start = 0; start < productIds.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const id of productIds.slice(start, start + BATCH_LIMIT)) {
      batch.update(doc(db, "products", id), {
        categoryId: deleteField(),
        category: deleteField(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

/**
 * Grava o `categoryId` de produtos que hoje so tem o nome.
 *
 * Escreve **so** o id: o nome ja gravado fica intacto, entao desfazer e apagar
 * um campo do qual nada depende exclusivamente. Nao mexe em `updatedAt` — isso
 * e migracao tecnica, nao edicao de catalogo, e o campo ordena listas do admin.
 */
export async function backfillProductCategoryIds(
  links: { productId: string; categoryId: string }[],
): Promise<void> {
  for (let start = 0; start < links.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const link of links.slice(start, start + BATCH_LIMIT)) {
      batch.update(doc(db, "products", link.productId), { categoryId: link.categoryId });
    }
    await batch.commit();
  }
}
