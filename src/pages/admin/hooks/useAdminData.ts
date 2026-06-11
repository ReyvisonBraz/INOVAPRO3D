import { useCallback, useEffect, useState } from "react";
import { collection, query, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { db, handleFirestoreError, OperationType } from "../../../services/firebase";
import type {
  AuditLog,
  Category,
  Customer,
  FAQ,
  Material,
  Order,
  Product,
  Quote,
  ShowcaseItem,
  Ticket,
} from "../../../types/domain";

/**
 * Carrega todas as coleções do painel admin e mantém um listener em tempo
 * real que avisa (e refaz a busca) quando um pedido novo chega.
 */
export function useAdminData() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [ordersSnap, quotesSnap, productsSnap, showcaseSnap, materialsSnap, customersSnap, ticketsSnap, faqsSnap, logsSnap] = await Promise.all([
        getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(50))),
        getDocs(query(collection(db, "quotes"), orderBy("createdAt", "desc"), limit(50))),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "showcase")),
        getDocs(collection(db, "materials")),
        getDocs(collection(db, "customers")),
        getDocs(query(collection(db, "tickets"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "faqs")),
        getDocs(query(collection(db, "logs"), orderBy("createdAt", "desc"), limit(100))),
      ]);

      setOrders(ordersSnap.docs.map((o) => ({ id: o.id, ...o.data() } as Order)).filter(o => !o._deleted));
      setQuotes(quotesSnap.docs.map((q) => ({ id: q.id, ...q.data() } as Quote)).filter(q => !q._deleted));
      setProducts(productsSnap.docs.map((p) => ({ id: p.id, ...p.data() } as Product)));
      setShowcase(showcaseSnap.docs.map((s) => ({ id: s.id, ...s.data() } as ShowcaseItem)));
      setMaterials(materialsSnap.docs.map((m) => ({ id: m.id, ...m.data() } as Material)));
      setCustomers(customersSnap.docs.map((c) => ({ id: c.id, ...c.data() } as Customer)));
      setTickets(ticketsSnap.docs.map((t) => ({ id: t.id, ...t.data() } as Ticket)));
      setFaqs(faqsSnap.docs.map((f) => ({ id: f.id, ...f.data() } as FAQ)));
      setLogs(logsSnap.docs.map((l) => ({ id: l.id, ...l.data() } as AuditLog)));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "admin/data");
    } finally {
      setLoading(false);
    }

    try {
      const categoriesSnap = await getDocs(collection(db, "categories"));
      setCategories(categoriesSnap.docs.map((c) => ({ id: c.id, ...c.data() } as Category)));
    } catch { /* categories collection may not exist yet */ }
  }, []);

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
    orders, setOrders,
    quotes, setQuotes,
    products, setProducts,
    showcase,
    materials,
    customers,
    tickets,
    faqs,
    categories, setCategories,
    logs,
    loading,
    fetchData,
    handleSyncData,
  };
}
