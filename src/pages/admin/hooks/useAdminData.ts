import { useCallback, useEffect, useState } from "react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { toast } from "sonner";
import { useAdminOrders } from "../../../features/orders/hooks/useAdminOrders";
import { useAdminQuotes } from "../../../features/quotes/hooks/useAdminQuotes";
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
  ShowcaseItem,
  Ticket,
  TrashEntry,
} from "../../../types/domain";

/**
 * Fachada de compatibilidade do painel administrativo. Pedidos já são
 * carregados pela feature dedicada; as demais coleções serão extraídas
 * gradualmente sem alterar o contrato consumido pelo Dashboard.
 */
export function useAdminData() {
  const notifyNewOrder = useCallback((order: Order): void => {
    toast.info(`Novo pedido de ${order.userName || "Cliente"}!`);
  }, []);
  const {
    orders,
    setOrders,
    loading: ordersLoading,
    refreshOrders,
  } = useAdminOrders({ onNewOrder: notifyNewOrder });
  const notifyQuotePaginationError = useCallback((): void => {
    toast.error("Não foi possível carregar mais orçamentos.");
  }, []);
  const {
    quotes,
    setQuotes,
    loading: quotesLoading,
    loadingMore: quotesLoadingMore,
    hasMore: quotesHasMore,
    refreshQuotes,
    loadMoreQuotes,
  } = useAdminQuotes({ onLoadMoreError: notifyQuotePaginationError });
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
  const [supportingDataLoading, setSupportingDataLoading] = useState(true);

  const fetchSupportingData = useCallback(async () => {
    try {
      const [
        productsSnap,
        showcaseSnap,
        materialsSnap,
        customersSnap,
        ticketsSnap,
        faqsSnap,
        logsSnap,
      ] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "showcase")),
        getDocs(collection(db, "materials")),
        getDocs(collection(db, "customers")),
        getDocs(query(collection(db, "tickets"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "faqs")),
        getDocs(query(collection(db, "logs"), orderBy("createdAt", "desc"), limit(100))),
      ]);

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
      setSupportingDataLoading(false);
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

  const fetchData = useCallback(async () => {
    await Promise.all([refreshOrders(), refreshQuotes(), fetchSupportingData()]);
  }, [fetchSupportingData, refreshOrders, refreshQuotes]);

  useEffect(() => {
    void fetchSupportingData();
  }, [fetchSupportingData]);

  const handleSyncData = useCallback(async () => {
    await fetchData();
    toast.success("Dados sincronizados com o servidor central");
  }, [fetchData]);

  const loading = ordersLoading || quotesLoading || supportingDataLoading;

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
