import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  getDocs,
  getDoc,
  setDoc,
  orderBy,
  updateDoc,
  doc,
  limit,
  addDoc,
  serverTimestamp,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { db, handleFirestoreError, OperationType, auth, storage } from "../../services/firebase";
import {
  RefreshCw,
  LogOut,
  Search,
  Menu,
  X,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Edit,
  Trash2,
  Truck,
  Calculator,
  Plus,
  Upload,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import {
  MATERIAL_PRESETS,
  DEFAULT_MACHINE,
  DEFAULT_ENERGY,
  DEFAULT_FAILURE_RATE,
  machineHourBreakdown,
  computePricing,
  formatBRL,
  parseTimeToHours,
  type MaterialKey,
  type MachineConfig,
} from "../../lib/pricing";
import {
  formatCatalogTitle,
  formatCatalogDescription,
  importAndConvertImage,
  translateToBR,
  NumInput,
  type AdminTabId,
} from "../../lib/adminHelpers";
import { ADMIN_MENU_ITEMS } from "./adminConfig";
import { BrandMark } from "../../components/brand/BrandLogo";
import { FloatingBackground } from "../../components/ui/FloatingBackground";
import { ConfirmDialog } from "./components/ConfirmDialog";
import type {
  AuditLog,
  Customer,
  FAQ,
  GlobalSettings,
  Material,
  Order,
  OrderItem,
  Product,
  Quote,
  ShowcaseItem,
  Ticket,
} from "../../types/domain";
import AdminOverviewPanel from "./components/AdminOverviewPanel";
import AdminOrdersPanel from "./components/AdminOrdersPanel";
import AdminProductsPanel from "./components/AdminProductsPanel";
import AdminMaterialsPanel from "./components/AdminMaterialsPanel";
import AdminQuotesPanel from "./components/AdminQuotesPanel";
import AdminSupportPanel from "./components/AdminSupportPanel";
import AdminCRMPanel from "./components/AdminCRMPanel";
import AdminFAQPanel from "./components/AdminFAQPanel";
import AdminShowcasePanel from "./components/AdminShowcasePanel";
import AdminLogsPanel from "./components/AdminLogsPanel";
import AdminSettingsPanel from "./components/AdminSettingsPanel";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setIsLive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    promoBanner: "Frete Grátis em pedidos acima de R$ 250",
    minOrderValue: 50,
    maintenanceMode: false,
  });

  const [machineConfig, setMachineConfig] = useState<MachineConfig>(DEFAULT_MACHINE);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingItems, setEditingItems] = useState(false);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Quote | Ticket | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [globalSnap, machineSnap] = await Promise.all([
          getDoc(doc(db, "settings", "global")),
          getDoc(doc(db, "settings", "machine")),
        ]);
        if (globalSnap.exists()) setGlobalSettings(globalSnap.data() as GlobalSettings);
        if (machineSnap.exists()) setMachineConfig(machineSnap.data() as MachineConfig);
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // ── Data fetching ──
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

      setOrders(ordersSnap.docs.map((o) => ({ id: o.id, ...o.data() } as Order)));
      setQuotes(quotesSnap.docs.map((q) => ({ id: q.id, ...q.data() } as Quote)));
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
  }, []);

  useEffect(() => {
    fetchData();
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1));
    let isInitialLoad = true;
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setIsLive(true);
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
      },
      () => setIsLive(false)
    );
    return () => unsubscribe();
  }, [fetchData]);

  // ── Handlers ──
  const handleSaveSettings = useCallback(async () => {
    try {
      await setDoc(doc(db, "settings", "global"), { ...globalSettings, updatedAt: serverTimestamp() });
      toast.success("Configurações globais atualizadas!");
    } catch {
      toast.error("Erro ao salvar configurações.");
    }
  }, [globalSettings]);

  const handleSaveMachineConfig = useCallback(async () => {
    try {
      await setDoc(doc(db, "settings", "machine"), { ...machineConfig, updatedAt: serverTimestamp() });
      toast.success("Config da máquina salva!");
    } catch {
      toast.error("Erro ao salvar config da máquina.");
    }
  }, [machineConfig]);

  const updateStatus = useCallback(
    async (type: string, id: string, newStatus: string | Record<string, unknown>) => {
      try {
        const payload = typeof newStatus === "object" ? newStatus : { status: newStatus };
        await updateDoc(doc(db, type, id), payload);
        fetchData();
        if (type === "orders" && selectedOrder?.id === id) {
          setSelectedOrder((prev) => (prev ? { ...prev, ...payload } : null));
        }
        if (type === "quotes" && selectedCustomer?.id === id) {
          setSelectedCustomer((prev) => (prev ? { ...prev, ...payload } : null));
        }
        toast.success("Registro atualizado com sucesso!");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${type}/${id}`);
      }
    },
    [fetchData, selectedOrder, selectedCustomer]
  );

  const deleteItem = useCallback(
    async (type: string, id: string) => {
      try {
        await deleteDoc(doc(db, type, id));
        fetchData();
        toast.success("Item excluído com sucesso!");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${type}/${id}`);
      }
    },
    [fetchData]
  );

  const handleSyncData = useCallback(async () => {
    await fetchData();
    toast.success("Dados sincronizados com o servidor central");
  }, [fetchData]);

  // ── Product state ──
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productImportUrl, setProductImportUrl] = useState("");
  const [isImportingProduct, setIsImportingProduct] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [translatingField, setTranslatingField] = useState<"name" | "description" | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const defaultProduct = {
    name: "",
    description: "",
    basePrice: 0,
    category: "DECORAÇÃO",
    images: [""],
    active: true,
    stock: 0,
    tags: [] as string[],
    technical: { infill: 20, resolution: "0.20mm", printTime: "2h 30m", weight: 80 },
    sourceUrl: "",
    modelUrl: "",
    baseDimensions: { x: 120, y: 120, z: 150 },
  };
  const [newProduct, setNewProduct] = useState(defaultProduct);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [importingImage, setImportingImage] = useState(false);

  const resetNewProduct = useCallback(() => {
    setNewProduct(defaultProduct);
    setProductImportUrl("");
  }, []);

  const handleProductSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      try {
        if (isEditingProduct && selectedProduct) {
          await updateDoc(doc(db, "products", selectedProduct.id), { ...newProduct, updatedAt: serverTimestamp() });
          toast.success("Produto atualizado com sucesso!");
        } else {
          await addDoc(collection(db, "products"), { ...newProduct, createdAt: serverTimestamp() });
          toast.success("Produto adicionado ao catálogo!");
        }
        setIsAddingProduct(false);
        setIsEditingProduct(false);
        setNewProduct(defaultProduct);
        setProductImportUrl("");
        fetchData();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, "products");
      }
    },
    [isEditingProduct, selectedProduct, newProduct, fetchData]
  );

  const handleImportProductMetadata = useCallback(async () => {
    const url = productImportUrl.trim();
    if (!url) {
      toast.error("Informe o link do modelo antes de importar.");
      return;
    }
    try {
      setIsImportingProduct(true);
      const response = await fetch(`/api/model-metadata?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível importar este link.");

      const importedImages = Array.isArray(data.images)
        ? data.images.filter((image: unknown): image is string => typeof image === "string" && image.length > 0)
        : [];

      setNewProduct((current) => ({
        ...current,
        name: formatCatalogTitle(data.title || current.name),
        description: formatCatalogDescription(data.description || current.description),
        images: importedImages.length > 0 ? importedImages : current.images,
        sourceUrl: data.sourceUrl || url,
        modelUrl: data.modelUrl || current.modelUrl,
        tags: Array.from(new Set([
          ...current.tags, data.sourceHost, data.author, data.license,
          ...(Array.isArray(data.tags) ? data.tags : []),
        ].filter(Boolean))),
        technical: { ...current.technical, ...(data.technical || {}) },
      }));

      const importedTech = { ...(data.technical || {}) };
      const weightG = Number(importedTech.weight) || 0;
      const hMatch = String(importedTech.printTime || "").match(/(\d+)\s*h/i);
      const mMatch = String(importedTech.printTime || "").match(/(\d+)\s*m/i);
      const printTimeH = (hMatch ? Number(hMatch[1]) : 0) + (mMatch ? Number(mMatch[1]) / 60 : 0);
      if (weightG > 0 && printTimeH > 0) {
        try {
          const suggested = computePricing({
            material: "pla", weightGrams: weightG, hours: printTimeH, quantity: 1,
            reservePct: MATERIAL_PRESETS.pla.defaultReservePct,
            failureRatePct: DEFAULT_FAILURE_RATE,
            machine: DEFAULT_MACHINE,
            kwhCost: DEFAULT_ENERGY.kwhCost,
            startupPowerWatts: DEFAULT_ENERGY.startupPowerWatts,
            startupMinutes: DEFAULT_ENERGY.startupMinutes,
            laborHours: 0, laborRate: 0, extraSupplies: 0,
            wholesaleMarkup: 1.8, retailMarkup: 2.5, minPrice: 15,
          });
          setNewProduct((p) => ({ ...p, basePrice: parseFloat(suggested.retailUnit.toFixed(2)) }));
          toast.info(`Preço sugerido: R$ ${suggested.retailUnit.toFixed(2)} (varejo unitário)`, { duration: 5000 });
        } catch (err) { console.error("Price suggestion failed:", err); }
      }
      toast.success("Metadados importados. Revise o preço antes de salvar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao importar metadados.");
    } finally {
      setIsImportingProduct(false);
    }
  }, [productImportUrl]);

  const handleProductImageUpload = useCallback(async (file: File | null) => {
    if (!file || !auth.currentUser) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem."); return; }
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) { toast.error("Imagem excede 5MB. Reduza o tamanho antes de enviar."); return; }
    try {
      setIsUploadingProductImage(true);
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeName = file.name.replace(/\.[^.]+$/, "").normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "").toLowerCase().slice(0, 60) || "imagem";
      const path = `products/manual/${auth.currentUser.uid}/${Date.now()}-${safeName}.${extension}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file, { contentType: file.type, customMetadata: { uploadedBy: auth.currentUser.uid, source: "admin-product-form" } });
      const downloadUrl = await getDownloadURL(fileRef);
      setNewProduct((current) => ({ ...current, images: [...current.images.filter(Boolean), downloadUrl] }));
      toast.success("Imagem enviada e adicionada ao produto.");
    } catch {
      toast.error("Erro ao enviar imagem.");
    } finally {
      setIsUploadingProductImage(false);
    }
  }, []);

  const handleImportImageUrl = useCallback(async (url: string, addFn: (u: string) => void) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setImportingImage(true);
    try {
      const { getStorage } = await import("firebase/storage");
      const result = await importAndConvertImage(trimmed, getStorage());
      addFn(result.url);
      toast.success("Imagem convertida para WebP e salva no Storage!");
    } catch {
      addFn(trimmed);
      toast.warning("CORS bloqueou a conversão — URL original mantida.", { duration: 3500 });
    } finally {
      setImportingImage(false);
      setNewImageUrl("");
    }
  }, []);

  const handleDuplicateProduct = useCallback((product: Product) => {
    const { id, createdAt, updatedAt, ...rest } = product;
    setNewProduct({
      ...rest,
      name: `${rest.name} (Cópia)`,
      sourceUrl: rest.sourceUrl || "",
      modelUrl: rest.modelUrl || "",
      active: rest.active !== undefined ? rest.active : true,
      stock: rest.stock || 0,
      tags: rest.tags || [],
      technical: {
        infill: rest.technical?.infill ?? 20,
        resolution: rest.technical?.resolution || "0.20mm",
        printTime: rest.technical?.printTime || "2h 30m",
        weight: rest.technical?.weight ?? 80,
      },
      baseDimensions: rest.baseDimensions || { x: 120, y: 120, z: 150 },
      images: rest.images || [""],
    });
    setIsAddingProduct(true);
    toast.info("Protótipo duplicado. Ajuste os detalhes antes de salvar.");
  }, []);

  const handleEditProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setIsEditingProduct(true);
    setProductImportUrl(product.sourceUrl || "");
    setNewProduct({
      name: product.name || "",
      description: product.description || "",
      basePrice: product.basePrice || 0,
      category: product.category || "DECORAÇÃO",
      images: product.images || [""],
      active: product.active !== undefined ? product.active : true,
      stock: product.stock || 0,
      tags: product.tags || [],
      technical: {
        infill: product.technical?.infill ?? 20,
        resolution: product.technical?.resolution || "0.20mm",
        printTime: product.technical?.printTime || "2h 30m",
        weight: product.technical?.weight ?? 80,
      },
      sourceUrl: product.sourceUrl || "",
      modelUrl: product.modelUrl || "",
      baseDimensions: product.baseDimensions || { x: 120, y: 120, z: 150 },
    });
  }, []);

  const handleUpdateStock = useCallback(async (id: string, currentStock: number, delta: number) => {
    try {
      const newStock = Math.max(0, currentStock + delta);
      await updateDoc(doc(db, "products", id), { stock: newStock, updatedAt: serverTimestamp() });
      toast.success("Estoque atualizado!");
      fetchData();
    } catch {
      toast.error("Falha ao atualizar estoque.");
    }
  }, [fetchData]);

  // ── Materials ──
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: "", type: "PLA", color: "#2563EB", pricePerKg: 120, inStock: true });

  const handleMaterialSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "materials"), { ...newMaterial, createdAt: serverTimestamp() });
      toast.success("Material adicionado!");
      setIsAddingMaterial(false);
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "materials");
    }
  }, [newMaterial, fetchData]);

  // ── Showcase ──
  const [isAddingShowcase, setIsAddingShowcase] = useState(false);
  const [isEditingShowcase, setIsEditingShowcase] = useState(false);
  const [selectedShowcase, setSelectedShowcase] = useState<ShowcaseItem | null>(null);
  const [newShowcase, setNewShowcase] = useState({ title: "", subtitle: "", image: "", link: "", active: true });

  const handleShowcaseSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (isEditingShowcase && selectedShowcase) {
        await updateDoc(doc(db, "showcase", selectedShowcase.id), newShowcase);
        toast.success("Item da vitrine atualizado!");
      } else {
        await addDoc(collection(db, "showcase"), { ...newShowcase, createdAt: serverTimestamp() });
        toast.success("Item adicionado à vitrine!");
      }
      setIsAddingShowcase(false);
      setIsEditingShowcase(false);
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "showcase");
    }
  }, [isEditingShowcase, selectedShowcase, newShowcase, fetchData]);

  // ── CRM ──
  const [selectedCRMUser, setSelectedCRMUser] = useState<Customer | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "", tags: [] as string[], address: "" });

  const handleCustomerSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (isEditingCustomer && selectedCRMUser) {
        await updateDoc(doc(db, "customers", selectedCRMUser.id), { ...newCustomer, updatedAt: serverTimestamp() });
        toast.success("Dados do cliente atualizados!");
      } else {
        await addDoc(collection(db, "customers"), { ...newCustomer, createdAt: serverTimestamp() });
        toast.success("Cliente cadastrado manualmente!");
      }
      setIsAddingCustomer(false);
      setIsEditingCustomer(false);
      setNewCustomer({ name: "", email: "", phone: "", tags: [], address: "" });
      fetchData();
    } catch {
      toast.error("Erro ao processar operação de cliente.");
    }
  }, [isEditingCustomer, selectedCRMUser, newCustomer, fetchData]);

  const exportCustomersToCSV = useCallback(() => {
    try {
      const headers = ["Nome", "Email", "Telefone", "Tags", "Data de Cadastro"];
      const escapeCSV = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const rows = customers.map((c) => [
        escapeCSV(c.name), escapeCSV(c.email), escapeCSV(c.phone),
        escapeCSV((c.tags || []).join("; ")),
        escapeCSV(c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : "N/A"),
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + headers.map(escapeCSV).join(",") + "\n" + rows.map((e) => e.join(",")).join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `clientes_INOVAPRO_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      toast.success("Exportação de CRM concluída!");
    } catch {
      toast.error("Falha ao gerar arquivo CSV.");
    }
  }, [customers]);

  // ── Support ──
  const [replyText, setReplyText] = useState("");

  const handleSendReply = useCallback(async () => {
    if (!selectedCustomer || !replyText.trim()) return;
    try {
      await addDoc(collection(db, "logs"), {
        action: "REPLY_SUPPORT", ticketId: selectedCustomer.id,
        userEmail: selectedCustomer.email, reply: replyText,
        adminId: auth.currentUser?.uid, createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "tickets", selectedCustomer.id), { status: "RESPONDIDO" });
      setReplyText("");
      toast.success("Resposta enviada e log registrada!");
      fetchData();
    } catch {
      toast.error("Erro ao enviar resposta.");
    }
  }, [selectedCustomer, replyText, fetchData]);

  const handleUpdateTicket = useCallback(async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "tickets", id), { status, updatedAt: serverTimestamp() });
      toast.success(`Ticket ${status.toLowerCase()}!`);
      fetchData();
    } catch {
      toast.error("Erro ao atualizar ticket.");
    }
  }, [fetchData]);

  // ── FAQs ──
  const [isAddingFAQ, setIsAddingFAQ] = useState(false);
  const [newFAQ, setNewFAQ] = useState({ question: "", answer: "" });

  const handleFAQSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "faqs"), { ...newFAQ, createdAt: serverTimestamp() });
      toast.success("FAQ adicionado!");
      setIsAddingFAQ(false);
      setNewFAQ({ question: "", answer: "" });
      fetchData();
    } catch {
      toast.error("Erro ao adicionar FAQ.");
    }
  }, [newFAQ, fetchData]);

  // ── Quotes ──
  const [editingQuoteTotal, setEditingQuoteTotal] = useState(45.90);
  const [editingQuoteWeight, setEditingQuoteWeight] = useState(30);
  const [editingQuoteTime, setEditingQuoteTime] = useState("2h 30m");
  const [editingQuoteInfill, setEditingQuoteInfill] = useState(20);
  const [editingQuotePhone, setEditingQuotePhone] = useState("");
  const [editingQuoteNotes, setEditingQuoteNotes] = useState("");
  const [isCalcAssistantOpen, setIsCalcAssistantOpen] = useState(false);
  const [calcFilamentPrice, setCalcFilamentPrice] = useState(0.15);
  const [calcHourCost, setCalcHourCost] = useState(4.50);
  const [calcSetupFee, setCalcSetupFee] = useState(10.00);
  const [calcMargin, setCalcMargin] = useState(50);
  const [approvalStatus, setApprovalStatus] = useState<{
    success: boolean; orderId?: string; finalPrice?: number; finalInfill?: number;
    finalTime?: string; finalWeight?: number; finalPhone?: string; finalNotes?: string;
  } | null>(null);

  useEffect(() => {
    if (selectedCustomer && activeTab === "quotes") {
      setEditingQuoteTotal(selectedCustomer.estimatedPrice || selectedCustomer.total || 45.90);
      setEditingQuoteWeight(selectedCustomer.weight || 30);
      setEditingQuoteTime(selectedCustomer.printTime || "2h 30m");
      setEditingQuoteInfill(selectedCustomer.infill || 20);
      setEditingQuoteNotes(selectedCustomer.adminNotes || "");
      const matchedCustomer = customers.find((c) =>
        (c.email && selectedCustomer.userEmail && c.email.toLowerCase() === selectedCustomer.userEmail.toLowerCase()) ||
        (c.id === selectedCustomer.userId)
      );
      setEditingQuotePhone(matchedCustomer?.phone || selectedCustomer.phone || "");
    }
  }, [selectedCustomer, activeTab, customers]);

  useEffect(() => {
    if (!selectedCustomer) setApprovalStatus(null);
  }, [selectedCustomer]);

  const handleWhatsAppQuote = useCallback(
    (q: Quote | Ticket, finalPrice: number, orderId?: string, phoneOverride?: string,
     infillOverride?: number, timeOverride?: string, weightOverride?: number) => {
      const rawPhone = phoneOverride !== undefined ? phoneOverride : editingQuotePhone;
      const phoneClean = (rawPhone || "").replace(/\D/g, "");
      if (!phoneClean) { toast.error("Preencha o celular do cliente."); return; }
      const orderMsg = orderId ? ` e o pedido oficial #${orderId.slice(0, 8)} foi gerado` : "";
      const infillToUse = infillOverride ?? editingQuoteInfill;
      const timeToUse = timeOverride ?? editingQuoteTime;
      const weightToUse = weightOverride ?? editingQuoteWeight;
      const text = `Olá, *${q.userName}*!\n\nSeu orçamento para a peça *${q.fileName}* foi analisado pela equipe *INOVAPRO3D*${orderMsg}.\n\n*Detalhes do Projeto:*\n• Preenchimento (Infill): ${infillToUse}%\n• Tempo de Impressão: ${timeToUse}\n• Peso Estimado: ${weightToUse}g\n\n*Investimento Final:* R$ ${finalPrice.toFixed(2).replace(".", ",")}\n\nAcesse o painel para verificar os detalhes e acompanhar a manufatura.\n\nFicamos à disposição! 🚀`;
      window.open(`https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodeURIComponent(text)}`, "_blank");
    },
    [editingQuotePhone, editingQuoteInfill, editingQuoteTime, editingQuoteWeight]
  );

  const handleApproveQuote = useCallback(async (quote: Quote | Ticket) => {
    try {
      const isSelected = selectedCustomer?.id === quote.id;
      const finalPrice = isSelected ? editingQuoteTotal : (quote.estimatedPrice || quote.total || 45.90);
      const finalInfill = isSelected ? editingQuoteInfill : (quote.infill || 20);
      const finalTime = isSelected ? editingQuoteTime : (quote.printTime || "2h 30m");
      const finalWeight = isSelected ? editingQuoteWeight : (quote.weight || 30);
      const finalNotes = isSelected ? editingQuoteNotes : (quote.adminNotes || "");
      const matchedCustomer = customers.find((c) =>
        (c.email && quote.userEmail && c.email.toLowerCase() === quote.userEmail.toLowerCase()) || (c.id === quote.userId)
      );
      const finalPhone = isSelected ? editingQuotePhone : (matchedCustomer?.phone || quote.phone || "");

      const orderRef = await addDoc(collection(db, "orders"), {
        userId: quote.userId || "guest", userEmail: quote.userEmail || "",
        userName: quote.userName || "Visitante",
        items: [{
          name: quote.fileName || "Impressão Personalizada", quantity: 1, price: finalPrice,
          image: "https://images.unsplash.com/photo-1615810231586-52233952673d?q=80&w=400",
          options: { material: quote.materialId || "PLA Pro", infill: finalInfill, printTime: finalTime, weight: finalWeight, adminNotes: finalNotes },
        }],
        total: finalPrice, status: "PENDING_PAYMENT", quoteId: quote.id,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "quotes", quote.id), {
        status: "APPROVED", convertedOrderId: orderRef.id, total: finalPrice,
        printTime: finalTime, weight: finalWeight, infill: finalInfill, adminNotes: finalNotes, updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, "logs"), {
        action: "TRANSFORM_QUOTE_TO_ORDER",
        details: `Orçamento de ${quote.userName} convertido em pedido #${orderRef.id}`,
        adminId: auth.currentUser?.uid, userEmail: quote.userEmail, createdAt: serverTimestamp(),
      });
      toast.success("Orçamento aprovado e faturado com sucesso!");
      setApprovalStatus({ success: true, orderId: orderRef.id, finalPrice, finalInfill, finalTime, finalWeight, finalPhone, finalNotes });
      fetchData();
    } catch {
      toast.error("Falha na conversão do orçamento.");
    }
  }, [selectedCustomer, editingQuoteTotal, editingQuoteInfill, editingQuoteTime, editingQuoteWeight, editingQuoteNotes, editingQuotePhone, customers, fetchData]);

  const handleSaveQuoteSpecifications = useCallback(async (quote: Quote | Ticket) => {
    try {
      const phoneClean = editingQuotePhone.replace(/\D/g, "");
      await updateDoc(doc(db, "quotes", quote.id), {
        total: editingQuoteTotal, infill: editingQuoteInfill, printTime: editingQuoteTime,
        weight: editingQuoteWeight, adminNotes: editingQuoteNotes, phone: phoneClean, updatedAt: serverTimestamp(),
      });
      setSelectedCustomer((prev) => prev ? { ...prev, total: editingQuoteTotal, infill: editingQuoteInfill, printTime: editingQuoteTime, weight: editingQuoteWeight, adminNotes: editingQuoteNotes, phone: phoneClean } : null);
      fetchData();
      toast.success("Especificações do orçamento salvas!");
    } catch {
      toast.error("Falha ao salvar especificações.");
    }
  }, [editingQuoteTotal, editingQuoteInfill, editingQuoteTime, editingQuoteWeight, editingQuoteNotes, editingQuotePhone, fetchData]);

  const handleUpdateTracking = useCallback(async (id: string, trackingCode: string) => {
    try {
      await updateDoc(doc(db, "orders", id), { trackingCode, updatedAt: serverTimestamp() });
      toast.success("Código de rastreio atualizado!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "orders");
    }
  }, []);

  // ── Quick Calc ──
  const [quickCalcWeight, setQuickCalcWeight] = useState(80);
  const [quickCalcTime, setQuickCalcTime] = useState("2h 30m");
  const [quickCalcPhone, setQuickCalcPhone] = useState("");
  const [quickCalcCustomerName, setQuickCalcCustomerName] = useState("");
  const [quickCalcPieceName, setQuickCalcPieceName] = useState("");
  const [quickCalcBatchQty, setQuickCalcBatchQty] = useState(1);
  const [quickCalcMaterial, setQuickCalcMaterial] = useState<MaterialKey>("pla");
  const [quickCalcMaterialReserve, setQuickCalcMaterialReserve] = useState(15);
  const [quickCalcFailureRate, setQuickCalcFailureRate] = useState(DEFAULT_FAILURE_RATE);
  const [quickCalcMinPrice, setQuickCalcMinPrice] = useState(35);
  const [quickCalcWholesaleMarkup, setQuickCalcWholesaleMarkup] = useState(1.6);
  const [quickCalcRetailMarkup, setQuickCalcRetailMarkup] = useState(2.5);

  const quickMachine = machineConfig;
  const quickCalcResult = useMemo(() => computePricing({
    material: quickCalcMaterial, weightGrams: Math.max(0, Number(quickCalcWeight) || 0),
    hours: Math.max(0, parseTimeToHours(quickCalcTime)),
    quantity: Math.max(1, Math.floor(Number(quickCalcBatchQty) || 1)),
    reservePct: Math.max(0, Number(quickCalcMaterialReserve) || 0),
    failureRatePct: Math.max(0, Number(quickCalcFailureRate) || 0),
    kwhCost: DEFAULT_ENERGY.kwhCost,
    startupPowerWatts: DEFAULT_ENERGY.startupPowerWatts, startupMinutes: DEFAULT_ENERGY.startupMinutes,
    machine: quickMachine, laborHours: 0, laborRate: 0, extraSupplies: 0,
    wholesaleMarkup: Math.max(0, Number(quickCalcWholesaleMarkup) || 0),
    retailMarkup: Math.max(0, Number(quickCalcRetailMarkup) || 0),
    minPrice: Math.max(0, Number(quickCalcMinPrice) || 0),
  }), [quickCalcMaterial, quickCalcWeight, quickCalcTime, quickCalcBatchQty, quickCalcMaterialReserve, quickCalcFailureRate, quickCalcWholesaleMarkup, quickCalcRetailMarkup, quickCalcMinPrice, quickMachine]);
  const quickMachineBreak = useMemo(() => machineHourBreakdown(quickMachine), [quickMachine]);

  const handleSendQuickWhatsAppQuote = useCallback(() => {
    const phoneClean = quickCalcPhone.replace(/\D/g, "");
    if (!phoneClean) { toast.error("Preencha o WhatsApp do cliente."); return; }
    const clientName = quickCalcCustomerName || "Cliente";
    const pieceName = quickCalcPieceName || "Peça personalizada";
    const text = `Olá, *${clientName}*!\n\nSeu orçamento de manufatura 3D para o projeto *${pieceName}* foi gerado pela *INOVAPRO3D*.\n\n*Especificações:*\n- Material: ${MATERIAL_PRESETS[quickCalcMaterial].label}\n- Quantidade: ${quickCalcResult.quantity} unidade(s)\n- Peso do job/lote: ${quickCalcResult.weightGrams.toFixed(1).replace(".", ",")}g\n- Tempo de impressão: ${quickCalcTime || "0h"} (${quickCalcResult.hours.toFixed(2).replace(".", ",")}h)\n\n*Investimento final (varejo):*\nTotal: ${formatBRL(quickCalcResult.retailTotal)}\nUnitário: ${formatBRL(quickCalcResult.retailUnit)}\n\nProposta baseada em cálculo técnico com material ${MATERIAL_PRESETS[quickCalcMaterial].label}, energia e hora-máquina P2S.`;
    window.open(`https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodeURIComponent(text)}`, "_blank");
  }, [quickCalcPhone, quickCalcCustomerName, quickCalcPieceName, quickCalcMaterial, quickCalcTime, quickCalcResult]);

  const handleTabChange = useCallback((tab: string) => setActiveTab(tab as AdminTabId), []);
  const handleSelectOrderAndTab = useCallback((o: Order) => { setActiveTab("orders"); setSelectedOrder(o); }, []);

  // ── Confirm dialog ──
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; description: string; confirmText?: string;
    cancelText?: string; isDanger?: boolean; onConfirm: () => void;
  } | null>(null);

  const triggerConfirm = useCallback((
    title: string, description: string, onConfirm: () => void,
    isDanger = false, confirmText = "Confirmar", cancelText = "Cancelar"
  ) => {
    setConfirmState({ isOpen: true, title, description, confirmText, cancelText, isDanger, onConfirm: () => { onConfirm(); setConfirmState(null); } });
  }, []);

  // ── Filtered data ──
  const filteredOrders = useMemo(() => orders.filter((o) =>
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.userName && o.userName.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [orders, searchTerm]);

  const filteredCustomers = useMemo(() => customers.filter((c) =>
    (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [customers, searchTerm]);

  const filteredQuotes = useMemo(() => quotes.filter((q) =>
    (q.userName && q.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.fileName && q.fileName.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [quotes, searchTerm]);

  const STATIC_CATEGORIES = ["DECORAÇÃO", "UTILITÁRIOS", "ACTION FIGURES", "ORGANIZADORES", "MODA", "GAMES", "PERSONALIZADO", "OUTROS"];
  const allCategories = useMemo(
    () => Array.from(new Set([...STATIC_CATEGORIES, ...customCategories])).sort(),
    [customCategories]
  );

  // ── Menu ──
  const activeMenuItem = ADMIN_MENU_ITEMS.find((item) => item.id === activeTab);

  if (loading)
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="relative flex min-h-screen bg-[#050508] text-white overflow-hidden">
      <FloatingBackground subtle />

      {/* SIDEBAR OVERLAY (mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside
        className={cn(
          "w-64 border-r border-white/5 bg-surface/30 backdrop-blur-3xl flex flex-col fixed inset-y-0 z-[70] transition-transform duration-500 ease-in-out lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <BrandMark className="h-6 w-6" />
            <h1 className="text-xl font-black font-display uppercase italic tracking-tighter">
              INOVAPRO<span className="text-primary truncate">Admin</span>
            </h1>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-dim hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar pb-8">
          {ADMIN_MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as AdminTabId); setIsSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-bold transition-all group",
                activeTab === item.id
                  ? "bg-primary text-white shadow-xl shadow-primary/20"
                  : "text-secondary hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </button>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-white/5">
          <button
            className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-2xl transition-colors"
            onClick={() => auth.signOut()}
          >
            <LogOut className="w-4 h-4 text-dim" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sair</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 lg:ml-64 min-h-screen min-w-0">
        {/* HEADER */}
        <header className="h-20 border-b border-white/5 bg-[#050508]/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-white/5 rounded-xl border border-white/10 hover:border-primary/50 transition-all"
            >
              <Menu className="w-5 h-5 text-primary" />
            </button>
            <div className="flex items-center gap-2">
              <BrandMark className="h-6 w-6 hidden sm:block" />
              <h2 className="text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] italic truncate">
                {activeMenuItem?.name || activeTab}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
            <div className="hidden sm:flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 border border-white/5 focus-within:border-primary/50 transition-all flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-dim" />
              <input
                type="text"
                placeholder="Pesquisar protocolo ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] font-bold text-white w-full"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-3 sm:px-4 text-[10px] uppercase font-black"
              onClick={handleSyncData}
            >
              <RefreshCw className="w-3 h-3 sm:mr-2" />
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>
          </div>
        </header>

        {/* TAB CONTENT */}
        <div className="p-3 sm:p-6 lg:p-10 xl:p-12 max-w-[1600px] mx-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <AdminOverviewPanel
                orders={filteredOrders}
                quotes={filteredQuotes}
                searchTerm={searchTerm}
                quickCalcWeight={quickCalcWeight}
                quickCalcTime={quickCalcTime}
                quickCalcPhone={quickCalcPhone}
                quickCalcCustomerName={quickCalcCustomerName}
                quickCalcPieceName={quickCalcPieceName}
                quickCalcBatchQty={quickCalcBatchQty}
                quickCalcMaterial={quickCalcMaterial}
                quickCalcMaterialReserve={quickCalcMaterialReserve}
                quickCalcFailureRate={quickCalcFailureRate}
                quickCalcMinPrice={quickCalcMinPrice}
                quickCalcWholesaleMarkup={quickCalcWholesaleMarkup}
                quickCalcRetailMarkup={quickCalcRetailMarkup}
                setQuickCalcWeight={setQuickCalcWeight}
                setQuickCalcTime={setQuickCalcTime}
                setQuickCalcPhone={setQuickCalcPhone}
                setQuickCalcCustomerName={setQuickCalcCustomerName}
                setQuickCalcPieceName={setQuickCalcPieceName}
                setQuickCalcBatchQty={setQuickCalcBatchQty}
                setQuickCalcMaterial={setQuickCalcMaterial}
                setQuickCalcMaterialReserve={setQuickCalcMaterialReserve}
                setQuickCalcFailureRate={setQuickCalcFailureRate}
                setQuickCalcMinPrice={setQuickCalcMinPrice}
                setQuickCalcWholesaleMarkup={setQuickCalcWholesaleMarkup}
                setQuickCalcRetailMarkup={setQuickCalcRetailMarkup}
                quickCalcResult={quickCalcResult}
                quickMachineBreak={quickMachineBreak}
                machineConfig={machineConfig}
                onSelectOrder={handleSelectOrderAndTab}
                onTabChange={handleTabChange}
                onSendWhatsAppQuote={handleSendQuickWhatsAppQuote}
              />
            )}
            {activeTab === "orders" && (
              <AdminOrdersPanel
                orders={filteredOrders}
                searchTerm={searchTerm}
                onSelectOrder={setSelectedOrder}
              />
            )}
            {activeTab === "products" && (
              <AdminProductsPanel
                products={products}
                onDuplicate={handleDuplicateProduct}
                onEdit={handleEditProduct}
                onDelete={(id) => triggerConfirm("Excluir Produto", "Tem certeza que deseja excluir este produto permanentemente?", () => deleteItem("products", id), true)}
                onUpdateStock={handleUpdateStock}
                onAddProduct={() => { resetNewProduct(); setSelectedProduct(null); setIsEditingProduct(false); setIsAddingProduct(true); }}
              />
            )}
            {activeTab === "materials" && (
              <AdminMaterialsPanel
                materials={materials}
                onDeleteMaterial={(id) => deleteItem("materials", id)}
                onAddMaterial={() => { setNewMaterial({ name: "", type: "PLA", color: "#2563EB", pricePerKg: 120, inStock: true }); setIsAddingMaterial(true); }}
                onToggleStock={(id, current) => updateStatus("materials", id, { inStock: !current })}
              />
            )}
            {activeTab === "quotes" && (
              <AdminQuotesPanel
                quotes={filteredQuotes}
                onSelectQuote={setSelectedCustomer}
                onApproveQuote={handleApproveQuote}
                onDeleteQuote={(id) => deleteItem("quotes", id)}
              />
            )}
            {activeTab === "support" && (
              <AdminSupportPanel
                tickets={tickets}
                selectedTicket={selectedCustomer as Ticket | null}
                replyText={replyText}
                onSelectTicket={(t) => setSelectedCustomer(t)}
                onReplyChange={setReplyText}
                onSendReply={handleSendReply}
                onMarkResolved={(id) => handleUpdateTicket(id, "RESOLVIDO")}
                onDeleteTicket={(id) => deleteItem("tickets", id)}
              />
            )}
            {activeTab === "crm" && (
              <AdminCRMPanel
                customers={filteredCustomers}
                orders={orders}
                searchTerm={searchTerm}
                onSelectCRMUser={setSelectedCRMUser}
                onAddCustomer={() => { setIsAddingCustomer(true); setIsEditingCustomer(false); setNewCustomer({ name: "", email: "", phone: "", tags: [], address: "" }); }}
                onExportCSV={exportCustomersToCSV}
              />
            )}
            {activeTab === "faqs" && (
              <AdminFAQPanel
                faqs={faqs}
                onDeleteFAQ={(id) => deleteItem("faqs", id)}
                onAddFAQ={() => setIsAddingFAQ(true)}
                isAddingFAQ={isAddingFAQ}
                newFAQ={newFAQ}
                setNewFAQ={setNewFAQ}
                onFAQSubmit={handleFAQSubmit}
                setIsAddingFAQ={setIsAddingFAQ}
              />
            )}
            {activeTab === "showcase" && (
              <AdminShowcasePanel
                showcase={showcase}
                onDeleteShowcase={(id) => deleteItem("showcase", id)}
                onAddShowcase={() => { setNewShowcase({ title: "", subtitle: "", image: "", link: "", active: true }); setIsAddingShowcase(true); }}
                onEditShowcase={(item) => { setSelectedShowcase(item); setNewShowcase({ title: item.title || "", subtitle: item.subtitle || "", image: item.image || "", link: item.link || "", active: item.active !== undefined ? item.active : true }); setIsEditingShowcase(true); }}
              />
            )}
            {activeTab === "logs" && (
              <AdminLogsPanel logs={logs} />
            )}
            {activeTab === "settings" && (
              <AdminSettingsPanel
                globalSettings={globalSettings}
                machineConfig={machineConfig}
                onUpdateGlobalSettings={setGlobalSettings}
                onUpdateMachineConfig={setMachineConfig}
                onSaveGlobalSettings={handleSaveSettings}
                onSaveMachineConfig={handleSaveMachineConfig}
                onToggleMaintenance={() => setGlobalSettings({ ...globalSettings, maintenanceMode: !globalSettings.maintenanceMode })}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── MODALS ── */}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface border border-white/10 rounded-[32px] sm:rounded-[56px] w-full max-w-5xl relative my-auto overflow-hidden flex flex-col lg:flex-row max-h-[90vh]"
            >
              {/* Left: Core data */}
              <div className="lg:w-1/3 bg-white/[0.02] border-b lg:border-b-0 lg:border-r border-white/5 p-6 sm:p-12 flex flex-col">
                <button onClick={() => setSelectedOrder(null)} className="mb-6 lg:mb-12 self-start p-3 hover:bg-white/5 rounded-2xl transition-all group">
                  <Plus className="w-6 h-6 rotate-45 text-dim group-hover:text-red-500" />
                </button>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2 italic">Protocol Ledger</p>
                <h2 className="text-4xl font-display font-black italic tracking-tighter mb-8 leading-none">#{selectedOrder.id.slice(0, 12)}</h2>
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-dim mb-4 italic">Status de Operação</p>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => updateStatus("orders", selectedOrder.id, e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-[20px] p-4 text-xs font-black uppercase tracking-widest text-primary outline-none focus:border-primary transition-all appearance-none"
                    >
                      <option value="PENDING_PAYMENT">AGUARDANDO PAGAMENTO</option>
                      <option value="PAID">PAGAMENTO APROVADO</option>
                      <option value="QUEUE">FILA DE PRODUÇÃO</option>
                      <option value="PRINTING">EM IMPRESSÃO 3D</option>
                      <option value="FINISHING">ACABAMENTO POST-OP</option>
                      <option value="SHIPPED">ENVIADO / LOGÍSTICA</option>
                      <option value="COMPLETED">ENTREGA FINALIZADA</option>
                      <option value="CANCELED">CANCELADO</option>
                    </select>
                    <div className="flex gap-3 mt-3">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-2xl h-10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                        onClick={() => triggerConfirm(
                          "Cancelar Pedido",
                          `Deseja realmente cancelar o pedido #${selectedOrder.id.slice(0, 12)}? O status será alterado para CANCELADO.`,
                          () => { updateStatus("orders", selectedOrder.id, "CANCELED"); setSelectedOrder(null); },
                          true,
                          "Sim, Cancelar Pedido"
                        )}
                      >
                        Cancelar Pedido
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 rounded-2xl h-10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                        onClick={() => triggerConfirm(
                          "Excluir Pedido",
                          `ATENÇÃO: O pedido #${selectedOrder.id.slice(0, 12)} será permanentemente removido do banco de dados. Esta ação não pode ser desfeita.`,
                          () => { deleteItem("orders", selectedOrder.id); setSelectedOrder(null); },
                          true,
                          "Sim, Excluir Permanentemente"
                        )}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir Pedido
                      </Button>
                    </div>
                  </div>
                  <div className="p-6 bg-white/5 rounded-[28px] border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-dim mb-3 italic">Identidade do Cliente</p>
                    <p className="text-sm font-bold uppercase mb-1">{selectedOrder.userName}</p>
                    <p className="text-xs text-white/40">{selectedOrder.userEmail}</p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-dim italic">Rastreamento de Logística</p>
                    <div className="flex gap-2">
                      <input
                        placeholder="Código de Rastreio"
                        defaultValue={selectedOrder.trackingCode}
                        onBlur={(e) => handleUpdateTracking(selectedOrder.id, e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none focus:border-primary/50"
                      />
                      <Button size="sm" variant="outline" className="rounded-xl h-10 w-10 p-0"><Truck className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
                <div className="mt-8 lg:mt-auto pt-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-subtle mb-2">Total Transacionado</p>
                  <p className="text-3xl lg:text-4xl font-display font-black text-primary italic">R$ {(selectedOrder.total || 0).toFixed(2)}</p>
                </div>
              </div>
              {/* Right: Items */}
              <div className="flex-1 p-6 sm:p-12 overflow-y-auto no-scrollbar bg-[#050508]/40">
                <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest italic">Manifesto de Produção</h3>
                  <button
                    onClick={() => {
                      if (editingItems) {
                        const newTotal = editedItems.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 1), 0);
                        updateDoc(doc(db, "orders", selectedOrder.id), { items: editedItems, total: newTotal, updatedAt: serverTimestamp() })
                          .then(() => { setSelectedOrder((prev) => prev ? { ...prev, items: editedItems, total: newTotal } : null); toast.success("Itens atualizados!"); })
                          .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `orders/${selectedOrder.id}`));
                        setEditingItems(false);
                      } else {
                        setEditedItems(JSON.parse(JSON.stringify(selectedOrder.items || [])));
                        setEditingItems(true);
                      }
                    }}
                    className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                      editingItems
                        ? "bg-primary text-white"
                        : "text-primary hover:bg-primary/10 border border-primary/20"
                    }`}
                  >
                    {editingItems ? "Salvar Alterações" : "Editar Itens"}
                  </button>
                </div>
                <div className="space-y-4">
                  {selectedOrder.items?.map((item: OrderItem, idx: number) => {
                    const editItem = editingItems ? editedItems[idx] : item;
                    return (
                    <div key={idx} className="bg-surface-card p-6 rounded-[32px] border border-white/5 flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingItems ? (
                          <input
                            value={editItem.name}
                            onChange={(e) => { const next = [...editedItems]; next[idx] = { ...next[idx], name: e.target.value }; setEditedItems(next); }}
                            className="w-full bg-black border border-white/10 rounded-xl p-2 text-xs font-black uppercase outline-none focus:border-primary/50 mb-2"
                          />
                        ) : (
                          <p className="text-xs font-black uppercase">{item.name}</p>
                        )}
                        <p className="text-[11px] text-white/40">{item.options?.material} / Infill {item.options?.infill}%</p>
                        {item.options?.adminNotes && <p className="text-[11px] text-primary/70 italic mt-1">{item.options.adminNotes}</p>}
                        {editingItems ? (
                          <div className="flex items-center gap-2 mt-2">
                            <label className="text-[10px] text-dim">Qtd:</label>
                            <input
                              type="number"
                              min={1}
                              value={editItem.quantity}
                              onChange={(e) => { const next = [...editedItems]; next[idx] = { ...next[idx], quantity: Number(e.target.value) || 1 }; setEditedItems(next); }}
                              className="w-16 bg-black border border-white/10 rounded-lg p-1.5 text-xs font-bold text-center outline-none focus:border-primary/50"
                            />
                          </div>
                        ) : (
                          <p className="text-[11px] text-secondary mt-0.5">Qtd: {item.quantity}</p>
                        )}
                      </div>
                      {editingItems ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-dim">R$</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editItem.price}
                            onChange={(e) => { const next = [...editedItems]; next[idx] = { ...next[idx], price: Number(e.target.value) || 0 }; setEditedItems(next); }}
                            className="w-24 bg-black border border-white/10 rounded-lg p-1.5 text-xs font-bold text-right outline-none focus:border-primary/50 font-mono"
                          />
                        </div>
                      ) : (
                        <p className="text-sm font-display font-black text-primary shrink-0">R$ {(item.price || 0).toFixed(2)}</p>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Quote Detail Modal */}
        {selectedCustomer && activeTab === "quotes" && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto no-scrollbar">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-white/10 rounded-[32px] sm:rounded-[48px] p-6 sm:p-12 max-w-3xl w-full relative my-auto"
            >
              <button onClick={() => setSelectedCustomer(null)} className="absolute top-8 right-8 text-dim hover:text-white transition-all"><X className="w-8 h-8" /></button>
              {approvalStatus?.success ? (
                <div className="text-center py-6 space-y-8">
                  <div className="relative mb-6 flex justify-center">
                    <div className="absolute inset-0 bg-green-500/10 blur-3xl rounded-full" />
                    <div className="w-24 h-24 rounded-[32px] bg-green-500/10 text-green-500 flex items-center justify-center relative border-2 border-green-500/20 shadow-2xl">
                      <CheckCircle2 className="w-12 h-12 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500 italic block mb-1">Faturamento Concluído</span>
                    <h3 className="text-4xl font-black italic tracking-tighter text-white">PEDIDO EMITIDO!</h3>
                    <p className="text-xs text-white/40 mt-1 font-medium">Ordem de faturamento: <strong className="text-primary font-mono text-sm">#{approvalStatus.orderId?.slice(0, 10).toUpperCase()}</strong></p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto text-left">
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary">Resumo da Ordem</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-white/40">Geometria:</span> <span className="text-white/80 font-bold truncate max-w-[120px]" title={selectedCustomer.fileName}>{selectedCustomer.fileName}</span></div>
                        <div className="flex justify-between"><span className="text-white/40">Infill:</span> <span className="text-white/80 font-bold">{approvalStatus.finalInfill}%</span></div>
                        <div className="flex justify-between"><span className="text-white/40">Tempo Impressão:</span> <span className="text-white/80 font-bold">{approvalStatus.finalTime}</span></div>
                        <div className="flex justify-between"><span className="text-white/40">Peso Estimado:</span> <span className="text-white/80 font-bold">{approvalStatus.finalWeight}g</span></div>
                        <div className="pt-2 border-t border-white/5 flex justify-between items-baseline"><span className="text-white/40 text-[10px] uppercase font-black">Investimento:</span> <span className="text-lg font-mono font-black text-primary">R$ {approvalStatus.finalPrice?.toFixed(2).replace(".", ",")}</span></div>
                      </div>
                    </div>
                    <div className="p-6 bg-primary/[0.01] border border-primary/10 rounded-3xl space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1.5 shrink-0 shadow-md">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_Pix.png" className="w-full object-contain" alt="Pix" />
                          </div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#2563EB]">Pix Copia e Cola</h4>
                        </div>
                        <p className="text-[10px] text-white/40 leading-relaxed font-medium italic">Copie este código para o aplicativo de pagamento do cliente.</p>
                      </div>
                      <button
                        onClick={() => {
                          const code = "00020101021226830014br.gov.bcb.pix2561api.INOVAPRO3D.com.br/pix/qr/v2/cob/order_" + approvalStatus.orderId + "_" + (approvalStatus.finalPrice || 45.90).toFixed(0);
                          navigator.clipboard.writeText(code);
                          toast.success("Código Pix Copiado com sucesso!");
                        }}
                        className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 hover:text-white text-primary text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-primary/20"
                      >
                        Copiar Chave Pix
                      </button>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-white/5 flex flex-wrap justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => { handleWhatsAppQuote(selectedCustomer, approvalStatus.finalPrice || 45.9, approvalStatus.orderId, approvalStatus.finalPhone, approvalStatus.finalInfill, approvalStatus.finalTime, approvalStatus.finalWeight); }}
                      className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest border-green-500/20 text-green-400 hover:bg-green-500/10 flex items-center gap-2"
                    >
                      <Smartphone className="w-4 h-4" /> Enviar por WhatsApp
                    </Button>
                    <button
                      onClick={() => { setSelectedCustomer(null); setApprovalStatus(null); setActiveTab("orders"); }}
                      className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-widest gap-2 flex items-center justify-center transition-all shadow-lg shadow-primary/20"
                    >
                      Ir para os Pedidos <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2 italic">Refinamento de Orçamento Personalizado</p>
                  <h2 className="text-3xl font-black italic tracking-tighter mb-8">Revisão do Engenheiro</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black uppercase text-dim mb-1">Cliente</p>
                      <p className="text-xs font-bold text-white/80">{selectedCustomer.userName}</p>
                    </div>
                    <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black uppercase text-dim mb-1">Geometria / Arquivo</p>
                      <p className="text-xs font-bold text-primary truncate" title={selectedCustomer.fileName}>{selectedCustomer.fileName}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 mb-6">
                    <p className="text-[9px] font-black uppercase text-dim mb-1">Especificações de Entrada (Cliente)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs mt-2">
                      <div><span className="text-white/40">Material:</span> <strong className="text-white/80 uppercase">{selectedCustomer.materialId || "PLA Pro"}</strong></div>
                      <div><span className="text-white/40">Infill:</span> <strong className="text-white/80">{selectedCustomer.infill || 20}%</strong></div>
                      <div><span className="text-white/40">Preço Est.:</span> <strong className="text-primary font-mono">R$ {selectedCustomer.estimatedPrice || "45,90"}</strong></div>
                    </div>
                    {selectedCustomer.notes && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <span className="text-white/40 text-[10px] uppercase font-black">Observações:</span>
                        <p className="text-[11px] text-white/60 leading-relaxed mt-1">{selectedCustomer.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#2563EB] italic">Parâmetros de Homologação</h3>
                    {/* Calculator Assistant */}
                    <div className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setIsCalcAssistantOpen(!isCalcAssistantOpen)}
                        className="w-full p-4 flex items-center justify-between text-left text-xs font-black uppercase tracking-wider text-primary hover:bg-white/[0.03] transition-colors"
                      >
                        <span className="flex items-center gap-2"><Calculator className="w-4 h-4" />Assistente de Precificação {isCalcAssistantOpen ? "▲" : "▼"}</span>
                        <span className="text-[9px] text-white/35 font-mono">Fórmula de Custo Direto + Margem</span>
                      </button>
                      {isCalcAssistantOpen && (
                        <div className="p-4 border-t border-white/5 space-y-4 bg-black/40 text-xs">
                          <p className="text-[10px] text-white/50 leading-relaxed">Simule o preço sugerido combinando as especificações técnicas com seus custos operacionais.</p>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: "Filamento (R$/g)", value: calcFilamentPrice, set: setCalcFilamentPrice, step: 0.01 },
                              { label: "Hora Máquina (R$)", value: calcHourCost, set: setCalcHourCost, step: 0.10 },
                              { label: "Taxa Setup (R$)", value: calcSetupFee, set: setCalcSetupFee, step: 1 },
                              { label: "Margem de Lucro (%)", value: calcMargin, set: setCalcMargin, max: 100 },
                            ].map(({ label, value, set, step, max }) => (
                              <div key={label}>
                                <label className="text-[9px] text-white/40 uppercase font-black block mb-1">{label}</label>
                                <NumInput min={0} max={max} step={step} value={value} onChange={set} className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs outline-none focus:border-primary/50 text-white font-mono font-bold" />
                              </div>
                            ))}
                          </div>
                          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                            <h4 className="text-[10px] uppercase font-black tracking-wider text-white/60 mb-1 border-b border-white/5 pb-1 flex justify-between">
                              <span>Demonstrativo do Cálculo</span>
                              <span className="text-primary font-mono">tempo útil: {parseTimeToHours(editingQuoteTime).toFixed(2)}h</span>
                            </h4>
                            <div className="flex justify-between text-[11px] text-white/70"><span>Material ({editingQuoteWeight}g × R$ {calcFilamentPrice.toFixed(2)}):</span><span className="font-mono">R$ {(editingQuoteWeight * calcFilamentPrice).toFixed(2)}</span></div>
                            <div className="flex justify-between text-[11px] text-white/70"><span>Máquina ({parseTimeToHours(editingQuoteTime).toFixed(2)}h × R$ {calcHourCost.toFixed(2)}):</span><span className="font-mono">R$ {(parseTimeToHours(editingQuoteTime) * calcHourCost).toFixed(2)}</span></div>
                            <div className="flex justify-between text-[11px] text-white/70"><span>Taxa / Setup de Fatiamento:</span><span className="font-mono">R$ {calcSetupFee.toFixed(2)}</span></div>
                            <div className="flex justify-between text-[11px] font-black border-t border-white/5 pt-1.5 uppercase text-white">
                              <span>Preço sugerido (+{calcMargin}%):</span>
                              <span className="text-primary font-mono select-all">R$ {((editingQuoteWeight * calcFilamentPrice + parseTimeToHours(editingQuoteTime) * calcHourCost + calcSetupFee) * (1 + calcMargin / 100)).toFixed(2)}</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => {
                              const suggestedPrice = (editingQuoteWeight * calcFilamentPrice + parseTimeToHours(editingQuoteTime) * calcHourCost + calcSetupFee) * (1 + calcMargin / 100);
                              setEditingQuoteTotal(Number(suggestedPrice.toFixed(2)));
                              toast.success(`Preço sugerido de R$ ${suggestedPrice.toFixed(2)} aplicado!`);
                            }}
                            className="w-full h-10 rounded-xl bg-primary text-[10px] font-black uppercase tracking-wider text-white"
                          >
                            Aplicar Preço Sugerido
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1 block">Valor Final Aprovado (R$)</label><NumInput min={0} step={0.01} value={editingQuoteTotal} onChange={setEditingQuoteTotal} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-primary font-bold outline-none focus:border-primary/50 transition-all font-mono" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1 block">WhatsApp (Apenas Números)</label><input type="text" value={editingQuotePhone} onChange={(e) => setEditingQuotePhone(e.target.value)} placeholder="Ex: 11999998888" className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary/50 transition-all font-mono" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] mb-1 block font-bold">Tempo de Impressão</label><input type="text" value={editingQuoteTime} onChange={(e) => setEditingQuoteTime(e.target.value)} placeholder="Ex: 2h 30m" className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary/50 transition-all font-mono" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] mb-1 block font-bold">Peso Estimado (g)</label><NumInput min={0} value={editingQuoteWeight} onChange={setEditingQuoteWeight} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary/50 transition-all font-mono" /></div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1"><label className="text-[10px] font-black uppercase tracking-wider text-white/40">Infill Final (%)</label><span className="text-xs font-mono text-primary font-bold">{editingQuoteInfill}%</span></div>
                      <input type="range" min="10" max="100" step="5" value={editingQuoteInfill} onChange={(e) => setEditingQuoteInfill(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                    </div>
                    <div><label className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1 block">Notas do Técnico</label><textarea rows={2} value={editingQuoteNotes} onChange={(e) => setEditingQuoteNotes(e.target.value)} placeholder="Insira notas de qualidade..." className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs leading-relaxed outline-none focus:border-primary/50 transition-all resize-none" /></div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                      <Button variant="outline" onClick={() => handleWhatsAppQuote(selectedCustomer, editingQuoteTotal)} className="h-12 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-green-400 hover:text-green-300 uppercase border-green-500/20 hover:bg-green-500/10 whitespace-nowrap"><Smartphone className="w-4 h-4" /> WhatsApp</Button>
                      <Button onClick={() => triggerConfirm("Aprovar Orçamento", `Aprovar o orçamento de ${selectedCustomer.userName || "Cliente"} e faturar gerando o pedido?`, () => handleApproveQuote(selectedCustomer))} className="flex-1 h-12 rounded-xl bg-green-500 hover:bg-green-600 gap-2 text-[10px] font-black uppercase whitespace-nowrap shadow-lg shadow-green-500/10"><CheckCircle2 className="w-4 h-4" /> Aprovar e Faturar</Button>
                      <Button variant="outline" onClick={() => handleSaveQuoteSpecifications(selectedCustomer)} className="h-12 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase border-white/15 hover:bg-white/5 whitespace-nowrap text-white/85 hover:text-white"><Edit className="w-4 h-4" /> Salvar Alterações</Button>
                      <Button variant="outline" onClick={() => triggerConfirm("Descartar Orçamento", "Tem certeza que deseja excluir permanentemente este orçamento?", () => { deleteItem("quotes", selectedCustomer.id); setSelectedCustomer(null); }, true)} className="h-12 rounded-xl border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-500 flex items-center justify-center gap-2 text-[10px] font-black uppercase whitespace-nowrap"><Trash2 className="w-4 h-4" /> Descartar</Button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* CRM Detail Modal */}
        {selectedCRMUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface border border-white/10 rounded-[48px] w-full max-w-4xl relative my-auto overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-12 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center font-black text-2xl text-primary uppercase">
                    {selectedCRMUser.photoURL ? <img src={selectedCRMUser.photoURL} className="w-full h-full rounded-3xl object-cover" /> : selectedCRMUser.name?.[0]}
                  </div>
                  <div><h2 className="text-3xl font-black italic tracking-tighter">{selectedCRMUser.name}</h2><p className="text-xs text-white/40 font-bold uppercase tracking-widest">{selectedCRMUser.email}</p></div>
                </div>
                <button onClick={() => setSelectedCRMUser(null)} className="p-4 hover:bg-white/5 rounded-2xl transition-all text-dim hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
              </div>
              <div className="flex-1 p-12 overflow-y-auto no-scrollbar space-y-10">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-dim mb-6 italic">Fluxo de Protocolos (Pedidos)</h3>
                  <div className="space-y-4">
                    {orders.filter((o) => o.userEmail === selectedCRMUser.email).map((order) => (
                      <div key={order.id} className="glass p-6 rounded-[32px] border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all">
                        <div><p className="text-[10px] font-mono text-dim mb-1">#{order.id.slice(0, 12)}</p><p className="text-xs font-bold uppercase">{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</p></div>
                        <div className="text-center"><p className="text-[11px] font-black uppercase text-dim mb-1">Status</p><span className="text-[9px] font-black uppercase px-3 py-1 bg-white/5 rounded-full border border-white/5">{order.status}</span></div>
                        <div className="text-right">
                          <p className="text-sm font-display font-black text-primary">R$ {(order.total || 0).toFixed(2)}</p>
                          <button onClick={() => { setSelectedOrder(order); setSelectedCRMUser(null); }} className="text-[11px] font-black uppercase text-dim hover:text-white mt-1 underline">Ver Detalhes</button>
                        </div>
                      </div>
                    ))}
                    {orders.filter((o) => o.userEmail === selectedCRMUser.email).length === 0 && (
                      <div className="py-20 text-center opacity-10 italic">Nenhum protocolo interceptado para este usuário.</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-8 bg-black/40 border-t border-white/5 flex gap-4">
                <Button onClick={() => window.open(`mailto:${selectedCRMUser.email}`)} className="flex-1 rounded-2xl h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-black uppercase italic tracking-widest text-white">Enviar Notificação</Button>
                <Button onClick={() => deleteItem("customers", selectedCRMUser.id)} className="rounded-2xl h-14 px-8 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-black uppercase italic tracking-widest" variant="outline">Banir / Excluir</Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Customer Form Modal */}
        {(isAddingCustomer || isEditingCustomer) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-surface border border-white/10 rounded-[48px] p-10 max-w-md w-full relative my-auto">
              <button onClick={() => { setIsAddingCustomer(false); setIsEditingCustomer(false); }} className="absolute top-8 right-8 text-dim hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
              <h2 className="text-3xl font-black italic tracking-tighter mb-8 leading-none">{isEditingCustomer ? "Editar Cliente" : "Novo Cliente"}<br /><span className="text-primary text-sm uppercase tracking-widest mt-2 block">{isEditingCustomer ? "Refinar Cadastro" : "Cadastro Manual (CRM)"}</span></h2>
              <form onSubmit={handleCustomerSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim italic">Nome Completo</label><input required value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim italic">Telefone / WhatsApp</label><input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="(00) 00000-0000" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all" /></div>
                </div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim italic">Email de Contato</label><input required type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim italic">Segmentação (Tags separadas por vírgula)</label><input value={newCustomer.tags.join(", ")} onChange={(e) => setNewCustomer({ ...newCustomer, tags: e.target.value.split(",").map((t) => t.trim()).filter((t) => t !== "") })} placeholder="Ex: VIP, B2B, Atacado" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all" /></div>
                <Button type="submit" className="w-full h-16 rounded-[24px] uppercase font-black text-xs italic tracking-widest bg-primary shadow-xl shadow-primary/20">Registrar no Database</Button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Material Form Modal */}
        {isAddingMaterial && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-surface border border-white/10 rounded-[48px] p-12 max-w-md w-full relative">
              <button onClick={() => setIsAddingMaterial(false)} className="absolute top-8 right-8 text-dim hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
              <h2 className="text-3xl font-black italic tracking-tighter mb-8">Novo Material</h2>
              <form onSubmit={handleMaterialSubmit} className="space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim">Identificação</label><input required value={newMaterial.name} onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })} placeholder="Ex: PLA Silk Gold" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim">Tipo</label><input value={newMaterial.type} onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim">Custo p/ Kg</label><NumInput min={0} step={0.01} value={newMaterial.pricePerKg} onChange={(v) => setNewMaterial({ ...newMaterial, pricePerKg: v })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none" /></div>
                </div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim">Cor do Display</label><input type="color" value={newMaterial.color} onChange={(e) => setNewMaterial({ ...newMaterial, color: e.target.value })} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer" /></div>
                <Button type="submit" className="w-full h-16 rounded-[24px] uppercase font-black text-xs italic tracking-widest">Registrar Material</Button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Showcase Form Modal */}
        {(isAddingShowcase || isEditingShowcase) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="bg-surface border border-white/10 rounded-[48px] p-12 max-w-lg w-full relative my-auto">
              <button onClick={() => { setIsAddingShowcase(false); setIsEditingShowcase(false); }} className="absolute top-8 right-8 text-dim hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
              <h2 className="text-3xl font-black italic tracking-tighter mb-8">{isEditingShowcase ? "Edição Vitrine" : "Novo Destaque"}</h2>
              <form onSubmit={handleShowcaseSubmit} className="space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim">Título do Banner</label><input required value={newShowcase.title} onChange={(e) => setNewShowcase({ ...newShowcase, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim">Subtítulo / Tagline</label><input value={newShowcase.subtitle} onChange={(e) => setNewShowcase({ ...newShowcase, subtitle: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim">Wallpaper URL</label><input required value={newShowcase.image} onChange={(e) => setNewShowcase({ ...newShowcase, image: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none" /></div>
                <Button type="submit" className="w-full h-16 rounded-[24px] uppercase font-black text-xs italic">Publicar Ativo</Button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Product Form Modal */}
        {(isAddingProduct || isEditingProduct) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto no-scrollbar">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface border border-white/10 rounded-[32px] sm:rounded-[48px] p-6 sm:p-12 max-w-4xl w-full relative my-auto">
              <button onClick={() => { setIsAddingProduct(false); setIsEditingProduct(false); }} className="absolute top-8 right-8 text-dim hover:text-red-500 transition-all"><X className="w-8 h-8" /></button>
              <h2 className="text-3xl font-black italic tracking-tighter mb-8 leading-none">{isEditingProduct ? "Editar Produto" : "Cadastrar Item"}<br /><span className="text-primary text-sm uppercase tracking-widest mt-2 block">{isEditingProduct ? "Ajuste de Catálogo" : "Registro de Manufatura"}</span></h2>
              <form onSubmit={handleProductSubmit} className="space-y-6">
                {/* Source URL import */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="text" value={productImportUrl} onChange={(e) => setProductImportUrl(e.target.value)} placeholder="Cole um link público do modelo, ex: MakerWorld/Bambu Lab" className="min-w-0 flex-1 bg-black border border-white/10 rounded-2xl p-4 text-xs font-mono outline-none focus:border-primary/50 transition-all" />
                    <Button type="button" onClick={handleImportProductMetadata} disabled={isImportingProduct} className="rounded-2xl px-6 h-12 text-[10px] font-black uppercase tracking-widest">{isImportingProduct ? "Importando..." : "Importar"}</Button>
                  </div>
                  {newProduct.sourceUrl && <p className="text-[11px] text-secondary font-mono break-all">Origem: {newProduct.sourceUrl}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-dim">Identidade do Item</label>
                      <button type="button" disabled={!newProduct.name || translatingField === "name"}
                        onClick={async () => { setTranslatingField("name"); try { const t = await translateToBR(newProduct.name); setNewProduct((p) => ({ ...p, name: formatCatalogTitle(t) })); } catch { toast.error("Falha na tradução."); } finally { setTranslatingField(null); } }}
                        className="text-[11px] font-black uppercase tracking-widest text-primary/70 hover:text-primary transition-colors disabled:opacity-30 flex items-center gap-1 shrink-0">
                        {translatingField === "name" ? "traduzindo..." : "Traduzir PT"}
                      </button>
                    </div>
                    <input required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Ex: Luminária Cyberpunk" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">Status & Disponibilidade</label>
                    <div className="flex items-center gap-4 h-14 bg-white/5 border border-white/10 rounded-2xl px-4">
                      <button type="button" onClick={() => setNewProduct({ ...newProduct, active: !newProduct.active })} className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", newProduct.active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>{newProduct.active ? "Ativo" : "Inativo"}</button>
                      <div className="h-6 w-px bg-white/10" />
                      <div className="flex items-center gap-2 flex-1"><label className="text-[9px] font-black uppercase text-dim">Estoque:</label><NumInput min={0} value={newProduct.stock || 0} onChange={(v) => setNewProduct({ ...newProduct, stock: Math.round(v) })} className="bg-transparent border-none outline-none text-xs font-bold text-white w-12" /></div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-dim">Preço Base (R$)</label><NumInput min={0} step={0.01} value={newProduct.basePrice} onChange={(v) => setNewProduct({ ...newProduct, basePrice: v })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all" /></div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">Setor / Categoria</label>
                    <select value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="w-full bg-[#050508] border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all font-display text-[11px]">
                      {allCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <div className="mt-2">
                      <input type="text" placeholder="+ Nova categoria (Enter para adicionar)" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-primary/50 transition-all text-white placeholder:text-dim"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const val = (e.target as HTMLInputElement).value.trim().toUpperCase(); if (val && !allCategories.includes(val)) { setCustomCategories((prev) => [...prev, val]); setNewProduct((p) => ({ ...p, category: val })); (e.target as HTMLInputElement).value = ""; } } }} />
                    </div>
                  </div>
                </div>
                {/* Images */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-dim">Fotos do Produto</label>
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4">
                    <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer">
                      <div className="min-w-0"><span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Upload className="w-4 h-4" />Enviar imagem manual</span><p className="text-[11px] uppercase tracking-widest text-secondary mt-1">JPG, PNG ou WEBP.</p></div>
                      <span className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">{isUploadingProductImage ? "Enviando..." : "Escolher arquivo"}</span>
                      <input type="file" accept="image/*" disabled={isUploadingProductImage} onChange={(e) => { void handleProductImageUpload(e.target.files?.[0] || null); e.target.value = ""; }} className="sr-only" />
                    </label>
                  </div>
                  {newProduct.images.filter(Boolean).length > 0 && (
                    <div className="space-y-1.5">
                      {newProduct.images.filter(Boolean).map((url, idx) => (
                        <div key={`${url}-${idx}`} className="flex items-center gap-2 p-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] group">
                          <img src={url} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 bg-black/20" loading="lazy" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-secondary w-8 shrink-0 text-center">{idx === 0 ? "CAPA" : `#${idx + 1}`}</span>
                          <span className="flex-1 min-w-0 text-[9px] font-mono text-secondary truncate hidden sm:block">{url}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button" title="Mover para cima" disabled={idx === 0} onClick={() => { const imgs = [...newProduct.images.filter(Boolean)]; [imgs[idx - 1], imgs[idx]] = [imgs[idx], imgs[idx - 1]]; setNewProduct((p) => ({ ...p, images: imgs })); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-secondary hover:text-white hover:bg-white/[0.07] transition-all disabled:opacity-20 disabled:cursor-not-allowed text-xs">↑</button>
                            <button type="button" title="Mover para baixo" disabled={idx === newProduct.images.filter(Boolean).length - 1} onClick={() => { const imgs = [...newProduct.images.filter(Boolean)]; [imgs[idx], imgs[idx + 1]] = [imgs[idx + 1], imgs[idx]]; setNewProduct((p) => ({ ...p, images: imgs })); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-secondary hover:text-white hover:bg-white/[0.07] transition-all disabled:opacity-20 disabled:cursor-not-allowed text-xs">↓</button>
                            <button type="button" title="Remover" onClick={() => { const imgs = newProduct.images.filter(Boolean).filter((_, i) => i !== idx); setNewProduct((p) => ({ ...p, images: imgs.length > 0 ? imgs : [""] })); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-secondary hover:text-red-400 hover:bg-red-400/10 transition-all text-xs">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="url" placeholder="Cole uma URL de imagem (Bambu Lab, etc.)..." value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleImportImageUrl(newImageUrl, (u) => setNewProduct((p) => ({ ...p, images: [...p.images.filter(Boolean), u] }))); } }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-primary/50 transition-all" />
                    <button type="button" disabled={importingImage} onClick={() => handleImportImageUrl(newImageUrl, (u) => setNewProduct((p) => ({ ...p, images: [...p.images.filter(Boolean), u] })))} className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed min-w-[64px]">{importingImage ? "..." : "Importar"}</button>
                  </div>
                </div>
                {/* Model URLs */}
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-dim">Link do Arquivo STL / Modelo 3D</label><input value={newProduct.modelUrl || ""} onChange={(e) => setNewProduct({ ...newProduct, modelUrl: e.target.value })} placeholder="Ex: /cube.stl ou link HTTPS" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all font-mono text-xs" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-dim">Link de Origem / Download do Modelo</label><input value={newProduct.sourceUrl || ""} onChange={(e) => setNewProduct({ ...newProduct, sourceUrl: e.target.value })} placeholder="Link da página do modelo ou download externo" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all font-mono text-xs" /></div>
                {/* Dimensions */}
                <div className="grid grid-cols-3 gap-4 bg-white/5 p-4 sm:p-6 rounded-3xl border border-white/5">
                  <div className="space-y-1 col-span-3"><label className="text-[10px] font-black uppercase tracking-widest text-dim">Dimensões Base do Modelo (mm)</label></div>
                  <div className="space-y-2"><label className="text-[9px] font-black uppercase text-white/40">Eixo X (Largura)</label><NumInput min={0} value={newProduct.baseDimensions?.x || 120} onChange={(v) => setNewProduct({ ...newProduct, baseDimensions: { ...(newProduct.baseDimensions || { x: 120, y: 120, z: 150 }), x: Math.round(v) } })} className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold outline-none focus:border-primary/50 transition-colors text-center" /></div>
                  <div className="space-y-2"><label className="text-[9px] font-black uppercase text-white/40">Eixo Y (Comprimento)</label><NumInput min={0} value={newProduct.baseDimensions?.y || 120} onChange={(v) => setNewProduct({ ...newProduct, baseDimensions: { ...(newProduct.baseDimensions || { x: 120, y: 120, z: 150 }), y: Math.round(v) } })} className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold outline-none focus:border-primary/50 transition-colors text-center" /></div>
                  <div className="space-y-2"><label className="text-[9px] font-black uppercase text-white/40">Eixo Z (Altura)</label><NumInput min={0} value={newProduct.baseDimensions?.z || 150} onChange={(v) => setNewProduct({ ...newProduct, baseDimensions: { ...(newProduct.baseDimensions || { x: 120, y: 120, z: 150 }), z: Math.round(v) } })} className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold outline-none focus:border-primary/50 transition-colors text-center" /></div>
                </div>
                {/* Technical specs */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 p-4 sm:p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim">Resolução</label><input value={newProduct.technical.resolution} onChange={(e) => setNewProduct({ ...newProduct, technical: { ...newProduct.technical, resolution: e.target.value } })} className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim">Infill (%)</label><NumInput min={0} max={100} value={newProduct.technical.infill} onChange={(v) => setNewProduct({ ...newProduct, technical: { ...newProduct.technical, infill: Math.round(v) } })} className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim">Tempo</label><input value={newProduct.technical.printTime} onChange={(e) => setNewProduct({ ...newProduct, technical: { ...newProduct.technical, printTime: e.target.value } })} placeholder="4h 30m" className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-dim">Peso Base (g)</label><NumInput min={0} value={newProduct.technical.weight || 80} onChange={(v) => setNewProduct({ ...newProduct, technical: { ...newProduct.technical, weight: Math.round(v) } })} className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none" /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">Descrição Técnica / Marketing</label>
                    <button type="button" disabled={!newProduct.description || translatingField === "description"}
                      onClick={async () => { setTranslatingField("description"); try { const t = await translateToBR(newProduct.description); setNewProduct((p) => ({ ...p, description: formatCatalogDescription(t) })); } catch { toast.error("Falha na tradução."); } finally { setTranslatingField(null); } }}
                      className="text-[11px] font-black uppercase tracking-widest text-primary/70 hover:text-primary transition-colors disabled:opacity-30 flex items-center gap-1 shrink-0">
                      {translatingField === "description" ? "traduzindo..." : "Traduzir PT"}
                    </button>
                  </div>
                  <textarea rows={3} value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all resize-none" />
                </div>
                <Button type="submit" className="w-full h-16 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] italic">Finalizar Protocolo de Registro</Button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Confirm Dialog */}
        <ConfirmDialog state={confirmState} onCancel={() => setConfirmState(null)} />
      </AnimatePresence>
    </div>
  );
}
