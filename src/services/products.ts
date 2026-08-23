import { doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

/** Teto de operacoes por batch no Firestore. */
const BATCH_LIMIT = 500;

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
