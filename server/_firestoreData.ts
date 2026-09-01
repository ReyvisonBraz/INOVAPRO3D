/**
 * Remove campos opcionais ausentes antes de gravar no Firestore.
 * O SDK rejeita explicitamente `undefined`, enquanto `null` continua sendo
 * preservado quando fizer parte do modelo de dados.
 */
export function omitUndefined<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
