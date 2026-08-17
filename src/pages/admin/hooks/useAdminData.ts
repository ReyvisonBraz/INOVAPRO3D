import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { toast } from "sonner";
import { db, handleFirestoreError, OperationType } from "../../../services/firebase";
import { fetchPrinters, isPermissionDenied } from "../../../services/printers";
import type {
  AuditLog,
  Category,
  Coupon,
  Customer,
  FAQ,
  Material,
  Order,
  Printer,
  Product,
  Quote,
  ShowcaseItem,
  Ticket,
  TrashEntry,
} from "../../../types/domain";

const QUOTES_PAGE_SIZE = 100;

/**
 * Carrega todas as coleções do painel admin e mantém um listener em tempo
 * real que avisa (e refaz a busca) quando um pedido novo chega.
 */
export function useAdminData() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesCursor, setQuotesCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(
    null,
  );
  const [quotesHasMore, setQuotesHasMore] = useState(false);
  const [quotesLoadingMore, setQuotesLoadingMore] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [trashItems, setTrashItems] = useState<TrashEntry[]>([]);
  const [trashBlocked, setTrashBlocked] = useState(false);
  /** Regras do Firestore ainda não publicadas para a coleção `printers`. */
  const [printersBlocked, setPrintersBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [
        ordersSnap,
        quotesSnap,
        productsSnap,
        showcaseSnap,
        materialsSnap,
        customersSnap,
        ticketsSnap,
        faqsSnap,
        logsSnap,
      ] = await Promise.all([
        getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(50))),
        getDocs(
          query(collection(db, "quotes"), orderBy("createdAt", "desc"), limit(QUOTES_PAGE_SIZE)),
        ),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "showcase")),
        getDocs(collection(db, "materials")),
        getDocs(collection(db, "customers")),
        getDocs(query(collection(db, "tickets"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "faqs")),
        getDocs(query(collection(db, "logs"), orderBy("createdAt", "desc"), limit(100))),
      ]);

      setOrders(
        ordersSnap.docs.map((o) => ({ id: o.id, ...o.data() }) as Order).filter((o) => !o._deleted),
      );
      setQuotes(
        quotesSnap.docs.map((q) => ({ id: q.id, ...q.data() }) as Quote).filter((q) => !q._deleted),
      );
      setQuotesCursor(quotesSnap.docs.at(-1) ?? null);
      setQuotesHasMore(quotesSnap.size === QUOTES_PAGE_SIZE);
      setProducts(productsSnap.docs.map((p) => ({ id: p.id, ...p.data() }) as Product));
      setShowcase(showcaseSnap.docs.map((s) => ({ id: s.id, ...s.data() }) as ShowcaseItem));
      setMaterials(materialsSnap.docs.map((m) => ({ id: m.id, ...m.data() }) as Material));
      setCustomers(customersSnap.docs.map((c) => ({ id: c.id, ...c.data() }) as Customer));
      setTickets(ticketsSnap.docs.map((t) => ({ id: t.id, ...t.data() }) as Ticket));
      setFaqs(faqsSnap.docs.map((f) => ({ id: f.id, ...f.data() }) as FAQ));
      setLogs(logsSnap.docs.map((l) => ({ id: l.id, ...l.data() }) as AuditLog));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "admin/data");
    } finally {
      setLoading(false);
    }

    try {
      const categoriesSnap = await getDocs(collection(db, "categories"));
      setCategories(categoriesSnap.docs.map((c) => ({ id: c.id, ...c.data() }) as Category));
    } catch {
      toast.warning("Não foi possível carregar as categorias. Tente sincronizar novamente.");
    }

    try {
      const couponsSnap = await getDocs(
        query(collection(db, "coupons"), orderBy("createdAt", "desc")),
      );
      setCoupons(couponsSnap.docs.map((c) => ({ id: c.id, ...c.data() }) as Coupon));
    } catch {
      toast.warning("Não foi possível carregar os cupons. Tente sincronizar novamente.");
    }

    // Coleção nova: enquanto as regras não forem publicadas ela responde
    // negado. Isso não pode derrubar o painel — a calculadora segue usando o
    // `settings/machine` e a aba mostra o comando de deploy.
    try {
      setPrinters(await fetchPrinters());
      setPrintersBlocked(false);
    } catch (err) {
      setPrinters([]);
      setPrintersBlocked(isPermissionDenied(err));
      if (!isPermissionDenied(err)) {
        console.error("[admin] falha ao carregar impressoras:", err);
      }
    }

    try {
      const trashSnap = await getDocs(
        query(collection(db, "trash"), orderBy("deletedAt", "desc"), limit(200)),
      );
      setTrashItems(
        trashSnap.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as TrashEntry),
      );
      setTrashBlocked(false);
    } catch (err) {
      setTrashItems([]);
      setTrashBlocked(isPermissionDenied(err));
      if (!isPermissionDenied(err)) console.error("[admin] falha ao carregar lixeira:", err);
    }
  }, []);

  const loadMoreQuotes = useCallback(async () => {
    if (!quotesCursor || !quotesHasMore || quotesLoadingMore) return;
    setQuotesLoadingMore(true);
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "quotes"),
          orderBy("createdAt", "desc"),
          startAfter(quotesCursor),
          limit(QUOTES_PAGE_SIZE),
        ),
      );
      const next = snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }) as Quote)
        .filter((entry) => !entry._deleted);
      setQuotes((current) => {
        const known = new Set(current.map((entry) => entry.id));
        return [...current, ...next.filter((entry) => !known.has(entry.id))];
      });
      setQuotesCursor(snapshot.docs.at(-1) ?? quotesCursor);
      setQuotesHasMore(snapshot.size === QUOTES_PAGE_SIZE);
    } catch {
      toast.error("Não foi possível carregar mais orçamentos.");
    } finally {
      setQuotesLoadingMore(false);
    }
  }, [quotesCursor, quotesHasMore, quotesLoadingMore]);

  useEffect(() => {
    fetchData();
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1));
    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const orderData = change.doc.data();
          toast.info(`Novo pedido de ${orderData.userName || "Cliente"}!`);
          fetchData();
        }
      });
    });
    return () => unsubscribe();
  }, [fetchData]);

  const handleSyncData = useCallback(async () => {
    await fetchData();
    toast.success("Dados sincronizados com o servidor central");
  }, [fetchData]);

  return {
    orders,
    setOrders,
    quotes,
    setQuotes,
    quotesHasMore,
    quotesLoadingMore,
    loadMoreQuotes,
    products,
    setProducts,
    showcase,
    materials,
    customers,
    tickets,
    faqs,
    categories,
    setCategories,
    coupons,
    logs,
    printers,
    printersBlocked,
    trashItems,
    setTrashItems,
    trashBlocked,
    loading,
    fetchData,
    handleSyncData,
  };
}
