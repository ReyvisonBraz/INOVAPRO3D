import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { Quote } from "../../../types/domain";
import { firestoreQuoteRepository } from "../data/firestoreQuoteRepository";
import type { QuotePageCursor, QuoteRepository } from "../domain/quoteRepository";
import { appendUniqueQuotes } from "./quoteCollection";

const QUOTES_PAGE_SIZE = 100;

interface UseAdminQuotesOptions {
  repository?: QuoteRepository;
  onLoadMoreError?: (error: unknown) => void;
}

interface UseAdminQuotesResult {
  quotes: Quote[];
  setQuotes: Dispatch<SetStateAction<Quote[]>>;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: unknown;
  refreshQuotes(): Promise<void>;
  loadMoreQuotes(): Promise<void>;
}

export function useAdminQuotes({
  repository = firestoreQuoteRepository,
  onLoadMoreError,
}: UseAdminQuotesOptions = {}): UseAdminQuotesResult {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [cursor, setCursor] = useState<QuotePageCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const applyFirstPage = useCallback(
    async (shouldThrow: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const page = await repository.listPage({ maxResults: QUOTES_PAGE_SIZE });
        setQuotes(page.items);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
      } catch (loadError) {
        setError(loadError);
        console.error("[admin/quotes] falha ao carregar orçamentos:", loadError);
        if (shouldThrow) throw loadError;
      } finally {
        setLoading(false);
      }
    },
    [repository],
  );

  const refreshQuotes = useCallback(async () => {
    await applyFirstPage(true);
  }, [applyFirstPage]);

  const loadMoreQuotes = useCallback(async () => {
    if (!cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await repository.listPage({
        cursor,
        maxResults: QUOTES_PAGE_SIZE,
      });
      setQuotes((current) => appendUniqueQuotes(current, page.items));
      setCursor(page.cursor ?? cursor);
      setHasMore(page.hasMore);
      setError(null);
    } catch (loadError) {
      setError(loadError);
      onLoadMoreError?.(loadError);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore, onLoadMoreError, repository]);

  useEffect(() => {
    let active = true;
    void repository.listPage({ maxResults: QUOTES_PAGE_SIZE }).then(
      (page) => {
        if (!active) return;
        setQuotes(page.items);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
        setError(null);
        setLoading(false);
      },
      (loadError: unknown) => {
        if (!active) return;
        setError(loadError);
        setLoading(false);
        console.error("[admin/quotes] falha ao carregar orçamentos:", loadError);
      },
    );
    return () => {
      active = false;
    };
  }, [repository]);

  return {
    quotes,
    setQuotes,
    loading,
    loadingMore,
    hasMore,
    error,
    refreshQuotes,
    loadMoreQuotes,
  };
}
