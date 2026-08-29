export interface DocumentLike {
  id: string;
  data(): unknown;
}

export function readDocumentRecord(
  document: DocumentLike,
  entityName: string,
): Record<string, unknown> {
  const data = document.data();
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new TypeError(`${entityName} ${document.id} possui dados inválidos`);
  }
  return data as Record<string, unknown>;
}
