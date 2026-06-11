import { useCallback, useEffect, useRef, useState } from "react";
import { collection, getDocs, query, type QueryConstraint } from "firebase/firestore";
import { db } from "../services/firebase";

interface Options<T> {
  /** Restrições do Firestore (where, orderBy, limit...). Não precisa memoizar. */
  constraints?: QueryConstraint[];
  /** Transformação aplicada após o fetch (filtro, ordenação...). Não precisa memoizar. */
  transform?: (items: T[]) => T[];
  /** Quando false, o fetch automático no mount é pulado. */
  enabled?: boolean;
  /** Quando true, erros são silenciados (sem console.error). */
  silent?: boolean;
}

/**
 * Busca uma coleção do Firestore uma vez no mount e expõe { data, loading,
 * error, refetch }. Centraliza o padrão repetido de
 * `getDocs → docs.map(d => ({ id, ...d.data() }))` espalhado pelas páginas.
 *
 * `constraints` e `transform` são lidos via ref, então podem ser passados
 * inline sem causar re-fetch a cada render.
 */
export function useFirestoreCollection<T extends { id: string }>(
  path: string,
  options: Options<T> = {},
) {
  const { enabled = true } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { constraints, transform } = optionsRef.current;
      const base = collection(db, path);
      const q = constraints?.length ? query(base, ...constraints) : base;
      const snap = await getDocs(q);
      let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
      if (transform) items = transform(items);
      setData(items);
    } catch (err) {
      if (!optionsRef.current.silent) {
        console.error(`[useFirestoreCollection] Falha ao carregar "${path}":`, err);
      }
      setError("Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (enabled) refetch();
  }, [enabled, refetch]);

  return { data, setData, loading, error, refetch };
}
