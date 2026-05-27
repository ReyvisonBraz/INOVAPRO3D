import React, { useEffect, useState } from "react";
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
  onSnapshot
} from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { db, handleFirestoreError, OperationType, auth, storage } from "../../services/firebase";
import { 
  Package, 
  Clock, 
  Printer, 
  FileText, 
  TrendingUp, 
  Users, 
  Settings, 
  Trash2, 
  Plus, 
  RefreshCw, 
  History,
  Shield,
  Truck,
  BarChart as BarChartIcon, 
  PieChart as PieChartIcon, 
  MapPin,
  Maximize2,
  CheckCircle2,
  Box,
  Sparkles,
  HelpCircle,
  LayoutDashboard,
  Search,
  Bell,
  ChevronRight,
  ArrowRight,
  Zap,
  Edit,
  Eye,
  LogOut,
  Mail,
  Menu,
  X,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Layers,
  Copy,
  Download,
  Wallet,
  Calculator,
  ListTodo,
  Upload
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import type {
  AuditLog,
  Coupon,
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

type AdminTabId = 'overview' | 'orders' | 'quotes' | 'products' | 'materials' | 'showcase' | 'crm' | 'support' | 'faqs' | 'settings' | 'logs';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    promoBanner: 'Frete Grátis em pedidos acima de R$ 250',
    minOrderValue: 50,
    maintenanceMode: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGlobalSettings(docSnap.data() as GlobalSettings);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...globalSettings,
        updatedAt: serverTimestamp()
      });
      toast.success("Configurações globais atualizadas!");
    } catch (err) {
      toast.error("Erro ao salvar configurações.");
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.userName && o.userName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredCustomers = customers.filter(c => 
    (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredQuotes = quotes.filter(q =>
    (q.userName && q.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.fileName && q.fileName.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const menuItems = [
    { id: 'overview', name: 'Painel', icon: TrendingUp },
    { id: 'orders', name: 'Pedidos', icon: Package },
    { id: 'quotes', name: 'Orçamentos', icon: FileText },
    { id: 'products', name: 'Catálogo', icon: Printer },
    { id: 'materials', name: 'Materiais', icon: Box },
    { id: 'showcase', name: 'Vitrine', icon: Sparkles },
    { id: 'crm', name: 'Clientes', icon: Users },
    { id: 'support', name: 'Suporte', icon: AlertCircle },
    { id: 'faqs', name: 'FAQs', icon: HelpCircle },
    { id: 'settings', name: 'Ajustes', icon: Settings },
    { id: 'logs', name: 'Registro de Auditoria', icon: History },
  ];

  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [isEditingMaterial, setIsEditingMaterial] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    type: 'PLA',
    color: '#2563EB',
    pricePerKg: 120,
    inStock: true
  });

  const [isAddingShowcase, setIsAddingShowcase] = useState(false);
  const [isEditingShowcase, setIsEditingShowcase] = useState(false);
  const [selectedShowcase, setSelectedShowcase] = useState<ShowcaseItem | null>(null);
  const [newShowcase, setNewShowcase] = useState({
    title: '',
    subtitle: '',
    image: '',
    link: '',
    active: true
  });

  const [replyText, setReplyText] = useState("");

  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditingMaterial && selectedMaterial) {
        await updateDoc(doc(db, "materials", selectedMaterial.id), newMaterial);
        toast.success("Material atualizado!");
      } else {
        await addDoc(collection(db, "materials"), {
          ...newMaterial,
          createdAt: serverTimestamp()
        });
        toast.success("Material adicionado!");
      }
      setIsAddingMaterial(false);
      setIsEditingMaterial(false);
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "materials");
    }
  };

  const handleShowcaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditingShowcase && selectedShowcase) {
        await updateDoc(doc(db, "showcase", selectedShowcase.id), newShowcase);
        toast.success("Item da vitrine atualizado!");
      } else {
        await addDoc(collection(db, "showcase"), {
          ...newShowcase,
          createdAt: serverTimestamp()
        });
        toast.success("Item adicionado à vitrine!");
      }
      setIsAddingShowcase(false);
      setIsEditingShowcase(false);
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "showcase");
    }
  };

  const handleSendReply = async () => {
    if (!selectedCustomer || !replyText.trim()) return;
    try {
      await addDoc(collection(db, "logs"), {
        action: "REPLY_SUPPORT",
        ticketId: selectedCustomer.id,
        userEmail: selectedCustomer.email,
        reply: replyText,
        adminId: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "tickets", selectedCustomer.id), { status: "RESPONDIDO" });
      setReplyText("");
      toast.success("Resposta enviada e log registrada!");
      fetchData();
    } catch (err) {
      toast.error("Erro ao enviar resposta.");
    }
  };

  const handleFAQSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "faqs"), {
        ...newFAQ,
        createdAt: serverTimestamp()
      });
      toast.success("FAQ adicionado!");
      setIsAddingFAQ(false);
      setNewFAQ({ question: '', answer: '' });
      fetchData();
    } catch (err) {
      toast.error("Erro ao adicionar FAQ.");
    }
  };

  const [isAddingFAQ, setIsAddingFAQ] = useState(false);
  const [newFAQ, setNewFAQ] = useState({ question: '', answer: '' });

  const getCustomerStats = (email: string) => {
    const customerOrders = orders.filter(o => o.userEmail === email);
    const totalSpent = customerOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);
    return {
      count: customerOrders.length,
      total: totalSpent
    };
  };

  const handleUpdateTicket = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'tickets', id), { 
        status,
        updatedAt: serverTimestamp() 
      });
      toast.success(`Ticket ${status.toLowerCase()}!`);
      fetchData();
    } catch (err) {
      toast.error("Erro ao atualizar ticket.");
    }
  };
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', tags: [] as string[], address: '' });

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditingCustomer && selectedCRMUser) {
        await updateDoc(doc(db, "customers", selectedCRMUser.id), {
          ...newCustomer,
          updatedAt: serverTimestamp()
        });
        toast.success("Dados do cliente atualizados!");
      } else {
        await addDoc(collection(db, "customers"), {
          ...newCustomer,
          createdAt: serverTimestamp()
        });
        toast.success("Cliente cadastrado manualmente!");
      }
      setIsAddingCustomer(false);
      setIsEditingCustomer(false);
      setNewCustomer({ name: '', email: '', phone: '', tags: [], address: '' });
      fetchData();
    } catch (err) {
      toast.error("Erro ao processar operação de cliente.");
    }
  };

  const exportCustomersToCSV = () => {
    try {
      const headers = ["Nome", "Email", "Telefone", "Tags", "Data de Cadastro"];
      const rows = customers.map(c => [
        c.name,
        c.email,
        c.phone,
        (c.tags || []).join(", "),
        c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `clientes_INOVAPRO_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exportação de CRM concluída!");
    } catch (err) {
      toast.error("Falha ao gerar arquivo CSV.");
    }
  };
  const [selectedCRMUser, setSelectedCRMUser] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<(Quote | Ticket) | null>(null);

  // Custom states for refining quotes
  const [editingQuoteTotal, setEditingQuoteTotal] = useState<number>(45.90);
  const [editingQuoteWeight, setEditingQuoteWeight] = useState<number>(30);
  const [editingQuoteTime, setEditingQuoteTime] = useState<string>('2h 30m');
  const [editingQuoteInfill, setEditingQuoteInfill] = useState<number>(20);
  const [editingQuotePhone, setEditingQuotePhone] = useState<string>('');
  const [editingQuoteNotes, setEditingQuoteNotes] = useState<string>('');

  // Smart pricing assistant states
  const [isCalcAssistantOpen, setIsCalcAssistantOpen] = useState<boolean>(false);
  const [calcFilamentPrice, setCalcFilamentPrice] = useState<number>(0.15); // per gram
  const [calcHourCost, setCalcHourCost] = useState<number>(4.50); // per print hour
  const [calcSetupFee, setCalcSetupFee] = useState<number>(10.00); // base slicing/setup fee
  const [calcMargin, setCalcMargin] = useState<number>(50); // profit margin in %

  // Dashboard Quick Smart Pricing Calculator states
  const [quickCalcWeight, setQuickCalcWeight] = useState<number>(80);
  const [quickCalcTime, setQuickCalcTime] = useState<string>('2h 30m');
  const [quickCalcInfill, setQuickCalcInfill] = useState<number>(20);
  const [quickCalcPhone, setQuickCalcPhone] = useState<string>('');
  const [quickCalcCustomerName, setQuickCalcCustomerName] = useState<string>('');
  const [quickCalcPieceName, setQuickCalcPieceName] = useState<string>('');
  const [quickCalcMargin, setQuickCalcMargin] = useState<number>(50);
  const [quickCalcFilamentPrice, setQuickCalcFilamentPrice] = useState<number>(0.15);
  const [quickCalcHourCost, setQuickCalcHourCost] = useState<number>(4.50);
  const [quickCalcSetupFee, setQuickCalcSetupFee] = useState<number>(10.00);

  // Helper to convert time strings (e.g., "2h 30m" or "5.5" or "5:30") to decimal hours
  const parseTimeToHours = (timeStr: string): number => {
    if (!timeStr) return 0;
    const hMatch = timeStr.match(/(\d+)\s*h/i);
    const mMatch = timeStr.match(/(\d+)\s*m/i);
    const h = hMatch ? parseInt(hMatch[1], 10) : 0;
    const m = mMatch ? parseInt(mMatch[1], 10) : 0;
    
    if (!hMatch && !mMatch) {
      if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        const hp = parseFloat(parts[0]);
        const mp = parseFloat(parts[1]);
        if (!isNaN(hp) && !isNaN(mp)) {
          return hp + (mp / 60);
        }
      }
      const num = parseFloat(timeStr);
      return isNaN(num) ? 0 : num;
    }
    return h + (m / 60);
  };

  const [approvalStatus, setApprovalStatus] = useState<{ 
    success: boolean; 
    orderId?: string; 
    finalPrice?: number;
    finalInfill?: number;
    finalTime?: string;
    finalWeight?: number;
    finalPhone?: string;
    finalNotes?: string;
  } | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const triggerConfirm = (
    title: string,
    description: string,
    onConfirm: () => void,
    isDanger = false,
    confirmText = "Confirmar",
    cancelText = "Cancelar"
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      description,
      confirmText,
      cancelText,
      isDanger,
      onConfirm: () => {
        onConfirm();
        setConfirmState(null);
      }
    });
  };

  const handleSendQuickWhatsAppQuote = () => {
    const rawPhone = quickCalcPhone;
    const phoneClean = (rawPhone || '').replace(/\D/g, '');
    if (!phoneClean) {
      toast.error("Por favor, preencha o número de WhatsApp do cliente para enviar o orçamento.");
      return;
    }
    const weightVal = Number(quickCalcWeight) || 0;
    const timeVal = quickCalcTime || '2h 30m';
    const hours = parseTimeToHours(timeVal);
    const costFilament = weightVal * quickCalcFilamentPrice;
    const costTime = hours * quickCalcHourCost;
    const directCost = costFilament + costTime + quickCalcSetupFee;
    const finalPrice = directCost * (1 + quickCalcMargin / 100);
    
    const clientName = quickCalcCustomerName || "Cliente";
    const pieceName = quickCalcPieceName || "Peça Customizada";
    
    const text = `Olá, *${clientName}*!\n\nSeu orçamento de manufatura 3D para o projeto *${pieceName}* foi gerado por nosso assistente na *INOVAPRO3D*.\n\n*Especificações Simuladas:*\n• Preenchimento (Infill): ${quickCalcInfill}%\n• Peso Estimado: ${weightVal}g\n• Tempo de Impressão: ${timeVal}\n\n*Investimento Final:* R$ ${finalPrice.toFixed(2).replace('.', ',')}\n\nPeso total: ${weightVal}g | Tempo total: ${timeVal} (${hours.toFixed(2)}h)\n\nFicamos à disposição para fecharmos o seu pedido! 🚀`;
    const encodedText = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodedText}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    if (!selectedCustomer) {
      setApprovalStatus(null);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (selectedCustomer && activeTab === 'quotes') {
      setEditingQuoteTotal(selectedCustomer.estimatedPrice || selectedCustomer.total || 45.90);
      setEditingQuoteWeight(selectedCustomer.weight || 30);
      setEditingQuoteTime(selectedCustomer.printTime || '2h 30m');
      setEditingQuoteInfill(selectedCustomer.infill || 20);
      setEditingQuoteNotes(selectedCustomer.adminNotes || '');
      
      const matchedCustomer = customers.find(c => 
        (c.email && selectedCustomer.userEmail && c.email.toLowerCase() === selectedCustomer.userEmail.toLowerCase()) || 
        (c.id === selectedCustomer.userId)
      );
      setEditingQuotePhone(matchedCustomer?.phone || selectedCustomer.phone || '');
    }
  }, [selectedCustomer, activeTab, customers]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productImportUrl, setProductImportUrl] = useState('');
  const [isImportingProduct, setIsImportingProduct] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    basePrice: 0,
    category: 'DECORAÇÃO',
    images: [''],
    active: true,
    stock: 0,
    tags: [] as string[],
    technical: { infill: 20, resolution: '0.20mm', printTime: '2h 30m', weight: 80 },
    sourceUrl: '',
    modelUrl: '',
    baseDimensions: { x: 120, y: 120, z: 150 }
  });

  const resetNewProduct = () => {
    setNewProduct({
      name: '',
      description: '',
      basePrice: 0,
      category: 'DECORAÃ‡ÃƒO',
      images: [''],
      active: true,
      stock: 0,
      tags: [],
      technical: { infill: 20, resolution: '0.20mm', printTime: '2h 30m', weight: 80 },
      sourceUrl: '',
      modelUrl: '',
      baseDimensions: { x: 120, y: 120, z: 150 }
    });
    setProductImportUrl('');
  };

  const handleDuplicateProduct = (product: Product) => {
    const { id, createdAt, updatedAt, ...rest } = product;
    setNewProduct({
      ...rest,
      name: `${rest.name} (Cópia)`,
      sourceUrl: rest.sourceUrl || '',
      modelUrl: rest.modelUrl || '',
      active: rest.active !== undefined ? rest.active : true,
      stock: rest.stock || 0,
      tags: rest.tags || [],
      technical: {
        infill: rest.technical?.infill ?? 20,
        resolution: rest.technical?.resolution || '0.20mm',
        printTime: rest.technical?.printTime || '2h 30m',
        weight: rest.technical?.weight ?? 80,
      },
      baseDimensions: rest.baseDimensions || { x: 120, y: 120, z: 150 },
      images: rest.images || ['']
    });
    setIsAddingProduct(true);
    toast.info("Protótipo duplicado. Ajuste os detalhes antes de salvar.");
  };

  const handleImportProductMetadata = async () => {
    const url = productImportUrl.trim();
    if (!url) {
      toast.error("Informe o link do modelo antes de importar.");
      return;
    }

    try {
      setIsImportingProduct(true);
      const response = await fetch(`/api/model-metadata?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel importar este link.");
      }

      const importedImages = Array.isArray(data.images)
        ? data.images.filter((image: unknown): image is string => typeof image === 'string' && image.length > 0)
        : [];

      setNewProduct((current) => ({
        ...current,
        name: data.title || current.name,
        description: data.description || current.description,
        images: importedImages.length > 0 ? importedImages : current.images,
        sourceUrl: data.sourceUrl || url,
        modelUrl: data.modelUrl || current.modelUrl,
        tags: Array.from(new Set([...current.tags, data.sourceHost].filter(Boolean))),
      }));

      toast.success("Metadados importados. Revise o preco antes de salvar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao importar metadados.");
    } finally {
      setIsImportingProduct(false);
    }
  };

  const handleProductImageUpload = async (file: File | null) => {
    if (!file) return;
    if (!auth.currentUser) {
      toast.error("Faça login novamente para enviar imagens.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }

    try {
      setIsUploadingProductImage(true);
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeName = file.name
        .replace(/\.[^.]+$/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase()
        .slice(0, 60) || "imagem";
      const path = `products/manual/${auth.currentUser.uid}/${Date.now()}-${safeName}.${extension}`;
      const fileRef = storageRef(storage, path);

      await uploadBytes(fileRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: auth.currentUser.uid,
          source: "admin-product-form",
        },
      });

      const downloadUrl = await getDownloadURL(fileRef);
      setNewProduct((current) => {
        const images = current.images.filter(Boolean);
        return {
          ...current,
          images: [...images, downloadUrl],
        };
      });
      toast.success("Imagem enviada e adicionada ao produto.");
    } catch (error) {
      console.error("Product image upload failed:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar imagem.");
    } finally {
      setIsUploadingProductImage(false);
    }
  };

  const fetchData = async () => {
    try {
      const ordersSnap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(50)));
      const quotesSnap = await getDocs(query(collection(db, "quotes"), orderBy("createdAt", "desc"), limit(50)));
      const productsSnap = await getDocs(collection(db, "products"));
      const showcaseSnap = await getDocs(collection(db, "showcase"));
      const materialsSnap = await getDocs(collection(db, "materials"));
      const couponsSnap = await getDocs(collection(db, "coupons"));
      const customersSnap = await getDocs(collection(db, "customers"));
      const ticketsSnap = await getDocs(query(collection(db, "tickets"), orderBy("createdAt", "desc")));
      const faqsSnap = await getDocs(collection(db, "faqs"));
      const settingsSnap = await getDocs(collection(db, "settings"));
      const logsSnap = await getDocs(query(collection(db, "logs"), orderBy("createdAt", "desc"), limit(100)));
      
      setOrders(ordersSnap.docs.map(o => ({ id: o.id, ...o.data() } as Order)));
      setQuotes(quotesSnap.docs.map(q => ({ id: q.id, ...q.data() } as Quote)));
      setProducts(productsSnap.docs.map(p => ({ id: p.id, ...p.data() } as Product)));
      setShowcase(showcaseSnap.docs.map(s => ({ id: s.id, ...s.data() } as ShowcaseItem)));
      setMaterials(materialsSnap.docs.map(m => ({ id: m.id, ...m.data() } as Material)));
      setCoupons(couponsSnap.docs.map(c => ({ id: c.id, ...c.data() } as Coupon)));
      setCustomers(customersSnap.docs.map(c => ({ id: c.id, ...c.data() } as Customer)));
      setTickets(ticketsSnap.docs.map(t => ({ id: t.id, ...t.data() } as Ticket)));
      setFaqs(faqsSnap.docs.map(f => ({ id: f.id, ...f.data() } as FAQ)));
      
      const settingsObj: GlobalSettings = {};
      settingsSnap.docs.forEach(d => settingsObj[d.id] = d.data());
      setGlobalSettings(settingsObj);
      setLogs(logsSnap.docs.map(l => ({ id: l.id, ...l.data() } as AuditLog)));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "admin/data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1));
    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsLive(true);
      if (isInitialLoad) { isInitialLoad = false; return; }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const orderData = change.doc.data();
          toast.info(`Novo pedido de ${orderData.userName || 'Cliente'}!`);
          fetchData();
        }
      });
    }, () => setIsLive(false));
    return () => unsubscribe();
  }, []);

  const handleUpdateTracking = async (id: string, trackingCode: string) => {
    try {
      await updateDoc(doc(db, "orders", id), { trackingCode, updatedAt: serverTimestamp() });
      toast.success("Código de rastreio atualizado!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "orders");
    }
  };

  const updateStatus = async (type: string, id: string, newStatus: string | Record<string, unknown>) => {
    try {
      const updatePayload = typeof newStatus === 'object' ? newStatus : { status: newStatus };
      await updateDoc(doc(db, type, id), updatePayload);
      fetchData();
      
      // Update local active modal state if it matches the edited item
      if (type === 'orders' && selectedOrder && selectedOrder.id === id) {
        setSelectedOrder((prev) => prev ? { ...prev, ...updatePayload } : null);
      }
      if (type === 'quotes' && selectedCustomer && selectedCustomer.id === id) {
        setSelectedCustomer((prev) => prev ? { ...prev, ...updatePayload } : null);
      }
      
      toast.success("Registro atualizado com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${type}/${id}`);
    }
  };

  const handleUpdateStock = async (id: string, currentStock: number, delta: number) => {
    try {
      const newStock = Math.max(0, currentStock + delta);
      await updateDoc(doc(db, "products", id), { stock: newStock, updatedAt: serverTimestamp() });
      toast.success("Estoque atualizado!");
      fetchData();
    } catch (err) {
      toast.error("Falha ao atualizar estoque.");
    }
  };

  const deleteItem = async (type: string, id: string) => {
    try {
      await deleteDoc(doc(db, type, id));
      fetchData();
      toast.success("Item excluído com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${type}/${id}`);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditingProduct && selectedProduct) {
        await updateDoc(doc(db, "products", selectedProduct.id), {
          ...newProduct,
          updatedAt: serverTimestamp()
        });
        toast.success("Produto atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "products"), {
          ...newProduct,
          createdAt: serverTimestamp()
        });
        toast.success("Produto adicionado ao catálogo!");
      }
      setIsAddingProduct(false);
      setIsEditingProduct(false);
      setNewProduct({
        name: '',
        description: '',
        basePrice: 0,
        category: 'DECORAÇÃO',
        images: [''],
        active: true,
        stock: 0,
        tags: [],
        technical: { infill: 20, resolution: '0.20mm', printTime: '2h 30m', weight: 80 },
        sourceUrl: '',
        modelUrl: '',
        baseDimensions: { x: 120, y: 120, z: 150 }
      });
      setProductImportUrl('');
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "products");
    }
  };

  const handleWhatsAppQuote = (
    q: Quote | Ticket, 
    finalPrice: number, 
    orderId?: string, 
    phoneOverride?: string, 
    infillOverride?: number, 
    timeOverride?: string, 
    weightOverride?: number
  ) => {
    const rawPhone = phoneOverride !== undefined ? phoneOverride : editingQuotePhone;
    const phoneClean = (rawPhone || '').replace(/\D/g, '');
    if (!phoneClean) {
      toast.error("Por favor, preencha o celular do cliente para enviar WhatsApp.");
      return;
    }
    const orderMsg = orderId ? ` e o pedido oficial #${orderId.slice(0,8)} foi gerado` : '';
    const infillToUse = infillOverride !== undefined ? infillOverride : editingQuoteInfill;
    const timeToUse = timeOverride !== undefined ? timeOverride : editingQuoteTime;
    const weightToUse = weightOverride !== undefined ? weightOverride : editingQuoteWeight;
    const text = `Olá, *${q.userName}*!\n\nSeu orçamento para a peça *${q.fileName}* foi analisado pela equipe *INOVAPRO3D*${orderMsg}.\n\n*Detalhes do Projeto:*\n• Preenchimento (Infill): ${infillToUse}%\n• Tempo de Impressão: ${timeToUse}\n• Peso Estimado: ${weightToUse}g\n\n*Investimento Final:* R$ ${finalPrice.toFixed(2).replace('.', ',')}\n\nAcesse o painel para verificar os detalhes e acompanhar a manufatura.\n\nFicamos à disposição! 🚀`;
    const encodedText = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handlePrintQuote = (q: Quote | Ticket) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup bloqueado pelo navegador. Por favor, permita popups para esta página.");
      return;
    }
    
    const formattedDate = q.createdAt 
      ? new Date(q.createdAt.seconds * 1000).toLocaleDateString('pt-BR') 
      : new Date().toLocaleDateString('pt-BR');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orçamento INOVAPRO3D - ${q.id.slice(0, 8)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            margin: 40px;
            color: #111827;
            background-color: #ffffff;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-b: 2px solid #e5e7eb;
            padding-bottom: 24px;
            margin-bottom: 40px;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.05em;
          }
          .logo span {
            color: #2563EB;
            font-style: italic;
          }
          .title {
            text-align: right;
          }
          .title h1 {
            margin: 0;
            font-size: 20px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .title p {
            margin: 4px 0 0 0;
            font-size: 11px;
            color: #6b7280;
            font-weight: 600;
          }
          .details-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 24px;
            margin-bottom: 40px;
          }
          .card {
            background-color: #f9fafb;
            border: 1px solid #f3f4f6;
            padding: 20px;
            border-radius: 12px;
          }
          .card h3 {
            margin: 0 0 10px 0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #9ca3af;
          }
          .card p {
            margin: 4px 0;
            font-size: 13px;
            font-weight: 600;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          .table th {
            background-color: #f9fafb;
            border-bottom: 2px solid #e5e7eb;
            padding: 12px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
            text-align: left;
          }
          .table td {
            padding: 16px 12px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 13px;
          }
          .table td.right, .table th.right {
            text-align: right;
          }
          .total-box {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
          }
          .total-card {
            background-color: #111827;
            color: #ffffff;
            padding: 20px 40px;
            border-radius: 12px;
            text-align: right;
          }
          .total-card p {
            margin: 0;
            font-size: 11px;
            text-transform: uppercase;
            color: rgba(255,255,255,0.6);
          }
          .total-card h2 {
            margin: 5px 0 0 0;
            font-size: 28px;
            font-weight: 800;
          }
          .footer-info {
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            padding-top: 24px;
            margin-top: 80px;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 15mm 10mm 15mm;
            }
            body { 
              margin: 0 !important; 
              padding: 0 !important; 
              font-size: 11px !important;
              color: #111827 !important; 
              line-height: 1.4 !important;
            }
            .header {
              margin-bottom: 15px !important;
              padding-bottom: 10px !important;
            }
            .logo {
              font-size: 20px !important;
            }
            .title h1 {
              font-size: 15px !important;
            }
            .details-grid {
              gap: 12px !important;
              margin-bottom: 15px !important;
            }
            .card {
              padding: 10px !important;
              margin-bottom: 10px !important;
              border-radius: 6px !important;
            }
            .card h3 {
              margin-bottom: 6px !important;
            }
            .card p {
              margin: 2px 0 !important;
              font-size: 11px !important;
            }
            .table {
              margin-bottom: 15px !important;
            }
            .table th {
              padding: 6px 10px !important;
              font-size: 10px !important;
            }
            .table td {
              padding: 8px 10px !important;
              font-size: 11px !important;
            }
            .total-box {
              margin-bottom: 15px !important;
            }
            .total-card {
              padding: 8px 20px !important;
              border-radius: 6px !important;
            }
            .total-card h2 {
              font-size: 20px !important;
            }
            .footer-info {
              margin-top: 15px !important;
              padding-top: 10px !important;
            }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">INOVAPRO<span>3D</span></div>
          <div class="title">
            <h1>Orçamento de Manufatura</h1>
            <p>Protocolo #${q.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div class="details-grid">
          <div class="card">
            <h3>Dados do Cliente</h3>
            <p><strong>Nome:</strong> ${q.userName}</p>
            <p><strong>Contato:</strong> ${editingQuotePhone || 'Não informado'}</p>
            <p><strong>Email:</strong> ${q.userEmail || 'Não informado'}</p>
          </div>
          <div class="card">
            <h3>Emissão & Vencimento</h3>
            <p><strong>Emissão:</strong> ${formattedDate}</p>
            <p><strong>Validade:</strong> 15 dias corridos</p>
            <p><strong>Preenchimento:</strong> ${editingQuoteInfill}%</p>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Especificação do Arquivo</th>
              <th>Material</th>
              <th>Resistência</th>
              <th>Tempo de Impressão</th>
              <th class="right">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${q.fileName}</strong></td>
              <td>${q.materialId || 'PLA Pro'}</td>
              <td>Preenchimento de ${editingQuoteInfill}%</td>
              <td>${editingQuoteTime}</td>
              <td class="right"><strong>R$ ${editingQuoteTotal.toFixed(2).replace('.', ',')}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-card">
            <p>Valor Total Estimado</p>
            <h2>R$ ${editingQuoteTotal.toFixed(2).replace('.', ',')}</h2>
          </div>
        </div>

        <div class="card" style="margin-bottom: 40px; border-left: 4px solid #2563EB;">
          <h3 style="color:#2563EB">Instruções para Faturamento</h3>
          <p style="font-size: 12px; font-weight: normal; margin-top: 5px; color: #4b5563;">
            Este orçamento foi homologado por um engenheiro. Após aprovação, o pedido oficial é gerado na categoria de <strong>Aguardando Pagamento</strong>. 
            O pagamento pode ser efetuado via Pix através do QR Code disponível no painel. O prazo de fabricação inicia imediatamente após a compensação.
          </p>
        </div>

        <div class="footer-info">
          INOVAPRO3D Ltda. - Soluções Industriais e Manufatura Aditiva de Alta Resolução.<br/>
          Termo de confidencialidade garantido. Seus arquivos de geometria são eliminados do servidor após a produção.
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleApproveQuote = async (quote: Quote | Ticket) => {
    try {
      const isSelected = selectedCustomer && selectedCustomer.id === quote.id;
      
      const finalPrice = isSelected ? editingQuoteTotal : (quote.estimatedPrice || quote.total || 45.90);
      const finalInfill = isSelected ? editingQuoteInfill : (quote.infill || 20);
      const finalTime = isSelected ? editingQuoteTime : (quote.printTime || '2h 30m');
      const finalWeight = isSelected ? editingQuoteWeight : (quote.weight || 30);
      const finalNotes = isSelected ? editingQuoteNotes : (quote.adminNotes || '');
      
      const matchedCustomer = customers.find(c => 
        (c.email && quote.userEmail && c.email.toLowerCase() === quote.userEmail.toLowerCase()) || 
        (c.id === quote.userId)
      );
      const finalPhone = isSelected ? editingQuotePhone : (matchedCustomer?.phone || quote.phone || '');

      const orderData = {
        userId: quote.userId || 'guest',
        userEmail: quote.userEmail || '',
        userName: quote.userName || 'Visitante',
        items: [{
          name: quote.fileName || 'Impressão Personalizada',
          quantity: 1,
          price: finalPrice,
          image: 'https://images.unsplash.com/photo-1615810231586-52233952673d?q=80&w=400',
          options: {
            material: quote.materialId || 'PLA Pro',
            infill: finalInfill,
            printTime: finalTime,
            weight: finalWeight,
            adminNotes: finalNotes
          }
        }],
        total: finalPrice,
        status: "PENDING_PAYMENT",
        quoteId: quote.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const orderRef = await addDoc(collection(db, "orders"), orderData);
      
      await updateDoc(doc(db, "quotes", quote.id), {
        status: "APPROVED",
        convertedOrderId: orderRef.id,
        total: finalPrice,
        printTime: finalTime,
        weight: finalWeight,
        infill: finalInfill,
        adminNotes: finalNotes,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, "logs"), {
        action: "TRANSFORM_QUOTE_TO_ORDER",
        details: `Orçamento de ${quote.userName} convertido em pedido oficial #${orderRef.id} com status Aguardando Pagamento`,
        adminId: auth.currentUser?.uid,
        userEmail: quote.userEmail,
        createdAt: serverTimestamp()
      });

      toast.success("Orçamento aprovado e faturado com sucesso!");
      setApprovalStatus({
        success: true,
        orderId: orderRef.id,
        finalPrice,
        finalInfill,
        finalTime,
        finalWeight,
        finalPhone,
        finalNotes
      });
      fetchData();
    } catch (err) {
      toast.error("Falha na conversão do orçamento.");
    }
  };

  const handleSaveQuoteSpecifications = async (quote: Quote | Ticket) => {
    try {
      const phoneClean = editingQuotePhone.replace(/\D/g, '');
      await updateDoc(doc(db, "quotes", quote.id), {
        total: editingQuoteTotal,
        infill: editingQuoteInfill,
        printTime: editingQuoteTime,
        weight: editingQuoteWeight,
        adminNotes: editingQuoteNotes,
        phone: phoneClean,
        updatedAt: serverTimestamp()
      });
      
      // Update selectedCustomer in local state so changes don't flash back
      setSelectedCustomer((prev) => prev ? {
        ...prev,
        total: editingQuoteTotal,
        infill: editingQuoteInfill,
        printTime: editingQuoteTime,
        weight: editingQuoteWeight,
        adminNotes: editingQuoteNotes,
        phone: phoneClean
      } : null);

      // Sync to CRM if a matched customer exists
      if (quote.userId || quote.userEmail) {
        const matchedCustomer = customers.find(c => 
          (quote.userId && c.id === quote.userId) || 
          (quote.userEmail && c.email?.toLowerCase() === quote.userEmail?.toLowerCase())
        );
        if (matchedCustomer) {
          await updateDoc(doc(db, "customers", matchedCustomer.id), {
            phone: phoneClean
          });
        }
      }

      fetchData();
      toast.success("Especificações do orçamento salvas com sucesso!");
    } catch (err) {
      toast.error("Falha ao salvar especificações.");
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      await fetchData();
      setTimeout(() => {
        setIsSyncing(false);
        toast.success("Dados sincronizados com o servidor central");
      }, 600);
    } catch (err) {
      setIsSyncing(false);
      toast.error("Erro na sincronização");
    }
  };

  const chartData = orders.map(o => ({
    name: new Date(o.createdAt?.seconds * 1000).toLocaleDateString() || 'N/A',
    total: o.total || 0
  })).reverse();

  const pieData = [
    { name: 'Pendente', value: orders.filter(o => o.status === 'PENDING_PAYMENT').length },
    { name: 'Pago', value: orders.filter(o => o.status === 'PAID').length },
    { name: 'Produção', value: orders.filter(o => ['QUEUE', 'SLICING', 'PRINTING', 'FINISHING'].includes(o.status)).length },
    { name: 'Concluído', value: orders.filter(o => o.status === 'COMPLETED').length },
  ];

  const COLORS = ['#2563EB', '#22C55E', '#3B82F6', '#EAB308'];

  if (loading) return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#050508] text-white">
      {/* SIDEBAR - Responsive Toggle */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "w-64 border-r border-white/5 bg-surface/30 backdrop-blur-3xl flex flex-col fixed inset-y-0 z-[70] transition-transform duration-500 ease-in-out lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-primary fill-primary" />
            <h1 className="text-xl font-black font-display uppercase italic tracking-tighter">INOVAPRO<span className="text-primary truncate">Admin</span></h1>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-white/20 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar pb-8">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as AdminTabId);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-bold transition-all group",
                activeTab === item.id ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-white/30 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </button>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-white/5">
           <button className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-2xl transition-colors" onClick={() => auth.signOut()}>
              <LogOut className="w-4 h-4 text-white/20" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sair</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 min-h-screen">
        <header className="h-20 border-b border-white/5 bg-[#050508]/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-white/5 rounded-xl border border-white/10 hover:border-primary/50 transition-all"
            >
              <Menu className="w-5 h-5 text-primary" />
            </button>
            <h2 className="text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] italic truncate">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
             <div className="hidden sm:flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 border border-white/5 focus-within:border-primary/50 transition-all flex-1 max-w-md">
               <Search className="w-3.5 h-3.5 text-white/20" />
               <input 
                  type="text" 
                  placeholder="Pesquisar protocolo ou cliente..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-[10px] font-bold text-white w-full" 
               />
             </div>
             <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className={cn("h-9 px-3 sm:px-4 text-[10px] uppercase font-black", isSyncing && "opacity-50")} 
                  onClick={handleSyncData}
                  disabled={isSyncing}
                >
                  <RefreshCw className={cn("w-3 h-3 sm:mr-2", isSyncing && "animate-spin")} /> 
                  <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                </Button>
             </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                {/* TOP STATS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2 glass rounded-[40px] p-10 border border-white/5 relative overflow-hidden group">
                    <TrendingUp className="absolute top-10 right-10 w-24 h-24 text-primary opacity-10" />
                    <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-2 italic">Receita Acumulada</p>
                    <h2 className="text-4xl sm:text-6xl font-display font-black italic tracking-tighter">R$ {orders.reduce((acc, o) => acc + (o.total || 0), 0).toFixed(2)}</h2>
                  </div>
                  <div className="glass rounded-[40px] p-10 border border-white/5 flex flex-col justify-center">
                    <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1 italic">Em Produção</p>
                    <h3 className="text-4xl font-display font-black italic text-primary">{orders.filter(o => o.status !== "COMPLETED").length}</h3>
                  </div>
                  <div className="glass rounded-[40px] p-10 border border-white/5 flex flex-col justify-center">
                    <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1 italic">Orçamentos</p>
                    <h3 className="text-4xl font-display font-black italic">{quotes.filter(q => q.status === "PENDING").length}</h3>
                  </div>
                </div>

                {/* RECENT ACTIVITY BENTO */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Orders */}
                  <div className="glass rounded-[40px] p-8 border border-white/5">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-primary" /> Últimos Pedidos
                       </h3>
                       <button onClick={() => setActiveTab('orders')} className="text-[9px] font-black uppercase text-white/20 hover:text-white transition-colors">Ver Todos</button>
                    </div>
                    <div className="space-y-3">
                       {orders.slice(0, 4).map(o => (
                          <div key={o.id} className="flex justify-between items-center p-4 bg-white/[0.01] hover:bg-white/[0.02] rounded-2xl border border-white/5 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center font-mono text-[9px] font-bold text-white/40">#{o.id.slice(0,4)}</div>
                                <div>
                                   <p className="text-xs font-bold uppercase truncate max-w-[120px]">{o.userName}</p>
                                   <p className="text-[8px] text-white/20 uppercase font-black tracking-widest">{new Date(o.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                </div>
                             </div>
                             <p className="text-sm font-display font-black text-primary italic">R$ {(o.total || 0).toFixed(2)}</p>
                          </div>
                       ))}
                    </div>
                  </div>

                  {/* Recent Quotes */}
                  <div className="glass rounded-[40px] p-8 border border-white/5">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-blue-400" /> Consultas de Preço
                       </h3>
                       <button onClick={() => setActiveTab('quotes')} className="text-[9px] font-black uppercase text-white/20 hover:text-white transition-colors">Ver Todos</button>
                    </div>
                    <div className="space-y-3">
                       {quotes.slice(0, 4).map(q => (
                          <div key={q.id} className="flex justify-between items-center p-4 bg-white/[0.01] hover:bg-white/[0.02] rounded-2xl border border-white/5 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><FileText className="w-4 h-4 text-blue-400" /></div>
                                <div>
                                   <p className="text-xs font-bold uppercase truncate max-w-[120px]">{q.userName}</p>
                                   <p className="text-[8px] text-white/20 uppercase font-black tracking-widest truncate max-w-[150px]">{q.fileName}</p>
                                </div>
                             </div>
                             <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">PENDENTE</span>
                          </div>
                       ))}
                    </div>
                  </div>
                </div>

                {/* CENTRAL INTELLIGENT PRICING ASSISTANT & QUICK WHATSAPP SENDER */}
                <div className="glass rounded-[40px] p-8 border border-white/5 bg-gradient-to-b from-white/[0.01] to-black/40 space-y-6">
                   <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-2">
                         <Calculator className="w-5 h-5 text-primary" />
                         <div>
                            <h3 className="text-xs font-black uppercase tracking-widest italic text-white">Assistente de Orçamento Rápido</h3>
                            <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Simule preços e envie propostas por WhatsApp na hora</p>
                         </div>
                      </div>
                      <span className="text-[9px] font-black tracking-wider uppercase text-[#2563EB] bg-[#2563EB]/10 px-2.5 py-1 rounded-full border border-[#2563EB]/10">Modo Avulso</span>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* INPUTS GERAIS */}
                      <div className="space-y-4">
                         <h4 className="text-[10px] uppercase font-black tracking-widest text-[#2563EB] italic border-b border-white/5 pb-2">1. Dados do Cliente e Peça</h4>
                         <div>
                            <label className="text-[9px] text-white/40 uppercase font-bold block mb-1">Nome do Cliente</label>
                            <input
                               type="text"
                               value={quickCalcCustomerName}
                               onChange={(e) => setQuickCalcCustomerName(e.target.value)}
                               className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-primary/50 text-white font-bold"
                               placeholder="Ex: João Silva"
                            />
                         </div>
                         <div>
                            <label className="text-[9px] text-white/40 uppercase font-bold block mb-1">WhatsApp (DDD + Número)</label>
                            <input
                               type="text"
                               value={quickCalcPhone}
                               onChange={(e) => setQuickCalcPhone(e.target.value)}
                               className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-primary/50 text-white font-mono font-bold"
                               placeholder="Ex: 11999998888"
                            />
                         </div>
                         <div>
                            <label className="text-[9px] text-white/40 uppercase font-bold block mb-1">Nome do Modelo 3D</label>
                            <input
                               type="text"
                               value={quickCalcPieceName}
                               onChange={(e) => setQuickCalcPieceName(e.target.value)}
                               className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-primary/50 text-white font-bold"
                               placeholder="Ex: Suporte de Headset"
                            />
                         </div>
                      </div>

                      {/* INPUTS TÉCNICOS */}
                      <div className="space-y-4">
                         <h4 className="text-[10px] uppercase font-black tracking-widest text-[#2563EB] italic border-b border-white/5 pb-2">2. Especificações da Impressão</h4>
                         <div className="grid grid-cols-2 gap-3">
                            <div>
                               <label className="text-[9px] text-white/40 uppercase font-bold block mb-1">Peso Geral (g)</label>
                               <input
                                  type="number"
                                  value={quickCalcWeight}
                                  onChange={(e) => setQuickCalcWeight(Number(e.target.value))}
                                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-primary/50 text-white font-mono font-bold"
                               />
                            </div>
                            <div>
                               <label className="text-[9px] text-white/40 uppercase font-bold block mb-1">Infill / Preenc. (%)</label>
                               <input
                                  type="number"
                                  value={quickCalcInfill}
                                  onChange={(e) => setQuickCalcInfill(Number(e.target.value))}
                                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-primary/50 text-white font-mono font-bold"
                               />
                            </div>
                         </div>
                         <div>
                            <label className="text-[9px] text-white/40 uppercase font-bold block mb-1">Tempo de Impressão</label>
                            <input
                               type="text"
                               value={quickCalcTime}
                               onChange={(e) => setQuickCalcTime(e.target.value)}
                               className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-primary/50 text-white font-mono font-bold"
                               placeholder="Ex: 2h 30m"
                            />
                         </div>
                         
                         {/* Taxas do Cálculo Direct Edit */}
                         <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 space-y-2">
                            <p className="text-[8px] uppercase font-black text-white/40 tracking-wider mb-1">Taxas de Custo Direto</p>
                            <div className="grid grid-cols-3 gap-2">
                               <div>
                                  <label className="text-[7px] text-white/30 uppercase block font-black">Filamento/g</label>
                                  <input
                                     type="number"
                                     step="0.01"
                                     value={quickCalcFilamentPrice}
                                     onChange={(e) => setQuickCalcFilamentPrice(Number(e.target.value))}
                                     className="w-full bg-black/50 border border-white/5 rounded-lg p-1 text-[9px] font-mono text-white text-center"
                                  />
                               </div>
                               <div>
                                  <label className="text-[7px] text-white/30 uppercase block font-black">Hora de Impressão</label>
                                  <input
                                     type="number"
                                     step="0.10"
                                     value={quickCalcHourCost}
                                     onChange={(e) => setQuickCalcHourCost(Number(e.target.value))}
                                     className="w-full bg-black/50 border border-white/5 rounded-lg p-1 text-[9px] font-mono text-white text-center"
                                  />
                               </div>
                               <div>
                                  <label className="text-[7px] text-white/30 uppercase block font-black">M. Lucro %</label>
                                  <input
                                     type="number"
                                     value={quickCalcMargin}
                                     onChange={(e) => setQuickCalcMargin(Number(e.target.value))}
                                     className="w-full bg-black/50 border border-white/5 rounded-lg p-1 text-[9px] font-mono text-white text-center"
                                  />
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* DETALHAMENTO DO CÁLCULO DIRETO + COMPARTILHAMENTO */}
                      <div className="space-y-4">
                         <h4 className="text-[10px] uppercase font-black tracking-widest text-[#2563EB] italic border-b border-white/5 pb-2">3. Demonstrativo Detalhado</h4>

                         <div className="bg-black/40 border border-white/5 rounded-[24px] p-5 space-y-3">
                            <div className="flex justify-between text-xs text-white/70">
                               <span>Custo Filamento ({quickCalcWeight}g × R$ {quickCalcFilamentPrice.toFixed(2)}):</span>
                               <span className="font-mono text-white">R$ {(quickCalcWeight * quickCalcFilamentPrice).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-white/70">
                               <span>Custo Máquina ({parseTimeToHours(quickCalcTime).toFixed(2)}h × R$ {quickCalcHourCost.toFixed(2)}):</span>
                               <span className="font-mono text-white">R$ {(parseTimeToHours(quickCalcTime) * quickCalcHourCost).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-white/70">
                               <span>Taxa Setup:</span>
                               <span className="font-mono text-white">R$ {quickCalcSetupFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-white/40 border-t border-white/5 pt-2">
                               <span>Soma dos Custos Diretos:</span>
                               <span className="font-mono text-white/60">R$ {(quickCalcWeight * quickCalcFilamentPrice + parseTimeToHours(quickCalcTime) * quickCalcHourCost + quickCalcSetupFee).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-black text-white border-t border-white/10 pt-3">
                               <span className="uppercase text-[#2563EB] italic">Preço Sugerido (+{quickCalcMargin}%):</span>
                               <span className="font-mono text-primary text-base">
                                  R$ {((quickCalcWeight * quickCalcFilamentPrice + parseTimeToHours(quickCalcTime) * quickCalcHourCost + quickCalcSetupFee) * (1 + quickCalcMargin / 100)).toFixed(2)}
                                </span>
                            </div>
                         </div>

                         <Button
                            type="button"
                            disabled={!quickCalcPhone.replace(/\D/g, '')}
                            onClick={handleSendQuickWhatsAppQuote}
                            className="w-full h-11 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-xs font-black uppercase tracking-wider text-black flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            <Smartphone className="w-4 h-4" /> Enviar Orçamento por WhatsApp
                         </Button>
                      </div>
                   </div>
                </div>

                {/* ESTEIRA DE PRODUÇÃO (KANBAN) DIRETA NA TELA INICIAL */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white/[0.02] p-6 rounded-[32px] border border-white/5">
                     <div>
                        <h3 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2">
                           <Layers className="w-4 h-4 text-primary" /> Esteira de Produção
                        </h3>
                        <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Controle logístico e manufatura diretamente no dashboard inicial</p>
                     </div>
                  </div>

                  <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x no-scrollbar">
                     {[
                       { id: 'PENDING_PAYMENT', label: 'AGUAR. PAGTO', icon: Wallet },
                       { id: 'PAID', label: 'PAGO', icon: CheckCircle2 },
                       { id: 'QUEUE', label: 'FILA IMPRESSÃO', icon: ListTodo },
                       { id: 'PRINTING', label: 'IMPRIMINDO', icon: Zap },
                       { id: 'FINISHING', label: 'ACABAMENTO', icon: Layers },
                       { id: 'SHIPPED', label: 'ENVIADO', icon: Truck },
                       { id: 'COMPLETED', label: 'FINALIZADO', icon: Shield },
                     ].map(stage => {
                        const stageOrders = orders.filter(o => o.status === stage.id &&
                          (searchTerm === "" ||
                           o.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           o.id.toLowerCase().includes(searchTerm.toLowerCase()))
                        );
                        const Icon = stage.icon;
                        return (
                           <div key={stage.id} className="min-w-[260px] sm:min-w-[300px] flex-shrink-0 snap-start bg-[#0A0A0F] border border-white/5 rounded-[32px] flex flex-col h-[420px]">
                              <div className="p-4 border-b border-white/5 bg-white/[0.01]">
                                 <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                       <Icon className="w-3.5 h-3.5 text-primary" />
                                       <h4 className="text-[10px] font-black uppercase text-white/70">{stage.label}</h4>
                                    </div>
                                    <span className="text-[9px] font-black bg-white/5 px-2 py-0.5 rounded-full text-white/40">{stageOrders.length}</span>
                                 </div>
                              </div>
                              <div className="flex-1 p-3 overflow-y-auto no-scrollbar space-y-3">
                                 {stageOrders.map(o => (
                                    <div key={o.id} onClick={() => { setActiveTab('orders'); setSelectedOrder(o); }} className="glass p-4 rounded-[20px] border border-white/5 hover:border-primary/50 cursor-pointer transition-all group hover:shadow-[0_0_15px_rgba(37,99,235,0.08)]">
                                       <div className="flex justify-between items-start mb-2">
                                          <p className="text-[8px] font-mono text-white/30">#{o.id.slice(0,8)}</p>
                                          <p className="text-[9px] font-display font-black text-primary italic bg-primary/10 px-1.5 py-0.5 rounded-md">R$ {(o.total || 0).toFixed(2)}</p>
                                       </div>
                                       <h5 className="text-xs font-black uppercase truncate group-hover:text-white text-white/80 transition-colors">{o.userName}</h5>
                                       <p className="text-[9px] text-white/30 line-clamp-1 mb-3 mt-1 font-bold">{o.items?.map((i: OrderItem) => i.name || i.fileName).join(' • ')}</p>
                                       <div className="flex items-center justify-between border-t border-white/5 pt-2">
                                           <p className="text-[8px] font-mono text-white/20">{new Date(o.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                           <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-primary group-hover:text-white transition-all">
                                               <ArrowRight className="w-2.5 h-2.5" />
                                           </div>
                                       </div>
                                    </div>
                                 ))}
                                 {stageOrders.length === 0 && (
                                    <div className="py-12 text-center">
                                       <p className="text-[8px] font-black uppercase text-white/10 tracking-widest border border-white/5 border-dashed rounded-xl p-3 w-3/4 mx-auto">Sem Pedidos</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        )
                     })}
                  </div>
                </div>

                {/* CHARTS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-3 glass rounded-[48px] p-6 sm:p-10 border border-white/5 h-[300px] sm:h-[400px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#ffffff10" fontSize={9} tick={{ fill: '#ffffff20' }} />
                          <YAxis stroke="#ffffff10" fontSize={9} tick={{ fill: '#ffffff20' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#0A0A0F', border: '1px solid rgba(37,99,235,0.1)', borderRadius: '24px' }} />
                          <Area type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
                  
                  <div className="glass rounded-[48px] p-10 border border-white/5 flex flex-col items-center justify-center relative">
                     <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                           <Pie data={pieData} innerRadius={60} outerRadius={85} paddingAngle={10} dataKey="value">
                              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                           </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                        <span className="text-2xl font-black italic">{orders.length}</span>
                        <span className="text-[8px] font-black uppercase text-white/20">Pedidos</span>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <div className="flex justify-between items-center bg-white/5 p-6 rounded-[32px] border border-white/5">
                    <div>
                       <h3 className="text-sm font-black uppercase tracking-widest italic">Esteira de Produção (Kanban)</h3>
                       <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Painel de controle logístico e manufatura</p>
                    </div>
                 </div>

                 <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 snap-x no-scrollbar">
                    {[
                      { id: 'PENDING_PAYMENT', label: 'AGUAR. PAGTO', icon: Wallet },
                      { id: 'PAID', label: 'PAGO', icon: CheckCircle2 },
                      { id: 'QUEUE', label: 'FILA IMPRESSÃO', icon: ListTodo },
                      { id: 'PRINTING', label: 'IMPRIMINDO', icon: Zap },
                      { id: 'FINISHING', label: 'ACABAMENTO', icon: Layers },
                      { id: 'SHIPPED', label: 'ENVIADO', icon: Truck },
                      { id: 'COMPLETED', label: 'FINALIZADO', icon: Shield },
                    ].map(stage => {
                       const stageOrders = orders.filter(o => o.status === stage.id &&
                         (searchTerm === "" ||
                          o.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.id.toLowerCase().includes(searchTerm.toLowerCase()))
                       );
                       const Icon = stage.icon;
                       return (
                          <div key={stage.id} className="min-w-[260px] sm:min-w-[300px] flex-shrink-0 snap-start bg-[#0A0A0F] border border-white/5 rounded-[32px] flex flex-col h-[65vh] sm:h-[70vh]">
                             {/* Column Header */}
                             <div className="p-4 sm:p-5 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                       <Icon className="w-4 h-4 text-primary" />
                                       <h4 className="text-xs font-black uppercase text-white/80">{stage.label}</h4>
                                    </div>
                                    <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded-full text-white/40">{stageOrders.length}</span>
                                </div>
                             </div>
                             
                             {/* Column Body / Cards */}
                             <div className="flex-1 p-3 overflow-y-auto no-scrollbar space-y-3">
                                {stageOrders.map(o => (
                                   <div key={o.id} onClick={() => setSelectedOrder(o)} className="glass p-4 sm:p-5 rounded-[24px] border border-white/5 hover:border-primary/50 cursor-pointer transition-all group hover:shadow-[0_0_20px_rgba(37,99,235,0.1)]">
                                      <div className="flex justify-between items-start mb-3">
                                         <p className="text-[9px] font-mono text-white/30">#{o.id.slice(0,8)}</p>
                                         <p className="text-[10px] font-display font-black text-primary italic bg-primary/10 px-2 py-0.5 rounded-md">R$ {(o.total || 0).toFixed(2)}</p>
                                      </div>
                                      <h5 className="text-sm font-black uppercase truncate group-hover:text-white text-white/80 transition-colors">{o.userName}</h5>
                                      <p className="text-[10px] text-white/30 line-clamp-1 mb-4 mt-1 font-bold">{o.items?.map((i: OrderItem) => i.name || i.fileName).join(' • ')}</p>
                                      
                                      <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                          <p className="text-[8px] font-mono text-white/20">{new Date(o.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-primary group-hover:text-white transition-all">
                                              <ArrowRight className="w-3 h-3" />
                                          </div>
                                      </div>
                                   </div>
                                ))}
                                {stageOrders.length === 0 && (
                                   <div className="py-10 text-center">
                                      <p className="text-[9px] font-black uppercase text-white/10 tracking-widest border border-white/5 border-dashed rounded-xl p-4 w-1/2 mx-auto">Vazio</p>
                                   </div>
                                )}
                             </div>
                          </div>
                       )
                    })}
                 </div>
              </motion.div>
            )}

            {activeTab === 'products' && (
              <motion.div key="products" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <div className="flex justify-between items-center bg-white/5 p-6 rounded-[32px] border border-white/5">
                    <div>
                       <h3 className="text-sm font-black uppercase tracking-widest italic">Controle de Catálogo</h3>
                       <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Gerencie os itens visíveis na loja</p>
                    </div>
                    <Button onClick={() => { resetNewProduct(); setSelectedProduct(null); setIsEditingProduct(false); setIsAddingProduct(true); }} className="rounded-2xl gap-2 h-11 px-6">
                       <Plus className="w-4 h-4" /> Novo Produto
                    </Button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(p => (
                       <div key={p.id} className="glass rounded-[40px] p-6 border border-white/5 group hover:border-primary/30 transition-all flex flex-col">
                          <div className="relative aspect-square rounded-[32px] overflow-hidden mb-4 bg-black/40 border border-white/5">
                             <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                             <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDuplicateProduct(p)} className="p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 hover:text-blue-400 transition-colors" title="Duplicar"><Layers className="w-4 h-4" /></button>
                                <button onClick={() => { setSelectedProduct(p); setIsEditingProduct(true); setProductImportUrl(p.sourceUrl || ''); setNewProduct({ name: p.name || '', description: p.description || '', basePrice: p.basePrice || 0, category: p.category || 'DECORAÇÃO', images: p.images || [''], active: p.active !== undefined ? p.active : true, stock: p.stock || 0, tags: p.tags || [], technical: { infill: p.technical?.infill ?? 20, resolution: p.technical?.resolution || '0.20mm', printTime: p.technical?.printTime || '2h 30m', weight: p.technical?.weight ?? 80 }, sourceUrl: p.sourceUrl || '', modelUrl: p.modelUrl || '', baseDimensions: p.baseDimensions || { x: 120, y: 120, z: 150 } }); }} className="p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => deleteItem('products', p.id)} className="p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                             </div>
                             <div className="absolute bottom-4 left-4">
                                <span className="px-3 py-1 bg-primary text-white text-[9px] font-black uppercase rounded-full tracking-widest italic">{p.category}</span>
                             </div>
                          </div>
                          <h4 className="text-sm font-black uppercase mb-1">{p.name}</h4>
                          <p className="text-[10px] text-white/20 mb-4 line-clamp-2">{p.description}</p>
                          
                          <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 mb-4">
                             <div>
                                <p className="text-[8px] font-black uppercase text-white/30 tracking-widest">Estoque</p>
                                <p className="text-xs font-black">{p.stock || 0} unid.</p>
                             </div>
                             <div className="flex gap-1">
                                <button onClick={() => handleUpdateStock(p.id, p.stock || 0, -1)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">-</button>
                                <button onClick={() => handleUpdateStock(p.id, p.stock || 0, 1)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">+</button>
                             </div>
                          </div>

                          <div className="mt-auto flex justify-between items-center">
                             <span className="text-lg font-display font-black text-primary">R$ {p.basePrice?.toFixed(2)}</span>
                             <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{p.active ? 'Ativo' : 'Inativo'}</span>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </motion.div>
            )}

            {activeTab === 'materials' && (
              <motion.div key="materials" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <div className="flex justify-between items-center bg-white/5 p-6 rounded-[32px] border border-white/5">
                    <div>
                       <h3 className="text-sm font-black uppercase tracking-widest italic">Estoque</h3>
                       <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Matéria Prima para Impressão</p>
                    </div>
                    <Button onClick={() => setIsAddingMaterial(true)} className="rounded-2xl gap-2 h-11 px-6">
                       <Plus className="w-4 h-4" /> Novo Filamento
                    </Button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materials.map(m => (
                       <div key={m.id} className="glass rounded-[48px] p-8 border border-white/5 flex flex-col items-center text-center group relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => deleteItem('materials', m.id)} className="text-white/20 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <div className="w-16 h-16 rounded-full mb-6 border-4 border-white/5 shadow-2xl transition-transform group-hover:scale-110" style={{ backgroundColor: m.color }} />
                          <h4 className="text-sm font-black uppercase tracking-tight mb-2">{m.name}</h4>
                          <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-6">{m.type || 'PLA Premium'}</p>
                          
                          <div className="w-full flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5">
                             <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Em Estoque</span>
                             <button 
                                onClick={() => updateStatus('materials', m.id, { inStock: !m.inStock })}
                                className={cn(
                                   "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                   m.inStock ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                )}
                             >
                                {m.inStock ? 'Disponível' : 'Esgotado'}
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
              </motion.div>
            )}

            {activeTab === 'quotes' && (
              <motion.div key="quotes" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <div className="glass rounded-[32px] sm:rounded-[48px] p-4 sm:p-10 border border-white/5 overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[600px]">
                       <thead>
                          <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5">
                             <th className="pb-6">Protocolo</th>
                             <th className="pb-6">Arquivo</th>
                             <th className="pb-6">Cliente</th>
                             <th className="pb-6 text-right">Ação</th>
                          </tr>
                       </thead>
                       <tbody>
                          {filteredQuotes.map(q => (
                             <tr key={q.id} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="py-6 font-mono text-[10px] text-white/40">#{q.id.slice(0,8)}</td>
                                <td className="py-6 font-bold truncate max-w-[200px]">{q.fileName}</td>
                                <td className="py-6 text-sm font-bold uppercase text-white/60">{q.userName}</td>
                                <td className="py-6 text-right">
                                   <div className="flex items-center justify-end gap-2">
                                      <button onClick={() => setSelectedCustomer(q)} className="p-3 bg-white/5 hover:bg-white/10 text-white/20 hover:text-white rounded-xl transition-all"><Eye className="w-4 h-4" /></button>
                                      {q.status !== 'APPROVED' && (
                                        <button onClick={() => triggerConfirm("Aprovar Orçamento", `Confirmar aprovação do orçamento de ${q.userName} e faturar gerando o pedido?`, () => { setSelectedCustomer(q); handleApproveQuote(q); })} className="p-3 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-xl transition-all shadow-lg shadow-green-500/10"><CheckCircle className="w-4 h-4" /></button>
                                      )}
                                      <button onClick={() => triggerConfirm("Deletar Orçamento", `Deseja realmente deletar permanentemente o orçamento de ${q.userName}?`, () => deleteItem('quotes', q.id), true)} className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                          {filteredQuotes.length === 0 && (
                             <tr>
                                <td colSpan={4} className="py-20 text-center text-white/10 italic">Nenhum orçamento encontrado.</td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </motion.div>
            )}

            {activeTab === 'support' && (
              <motion.div key="support" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* TICKETS LIST */}
                    <div className="lg:col-span-1 space-y-4">
                       <h3 className="text-sm font-black uppercase tracking-widest italic mb-6">Tickets de Entrada</h3>
                       <div className="space-y-3 max-h-[70vh] overflow-y-auto no-scrollbar pr-2">
                          {tickets.map(t => (
                             <button 
                                key={t.id} 
                                onClick={() => setSelectedCustomer(t)}
                                className={cn(
                                   "w-full text-left p-5 rounded-[32px] border transition-all group",
                                   selectedCustomer?.id === t.id ? "bg-primary border-primary shadow-lg shadow-primary/20" : "bg-white/5 border-white/5 hover:bg-white/10"
                                )}
                             >
                                <div className="flex justify-between items-start mb-2">
                                   <span className={cn(
                                      "text-[8px] font-black uppercase px-2 py-0.5 rounded-full", 
                                      selectedCustomer?.id === t.id ? "bg-white/20 text-white" : t.status === 'RESOLVIDO' ? "bg-green-500/20 text-green-400" : "bg-blue-500/10 text-blue-400"
                                   )}>{t.status || 'ABERTO'}</span>
                                   <span className="text-[8px] text-white/30 font-bold">{new Date(t.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                </div>
                                <p className={cn("text-xs font-bold uppercase truncate", selectedCustomer?.id === t.id ? "text-white" : "text-white/80")}>{t.userName || 'Visitante'}</p>
                                <p className={cn("text-[9px] line-clamp-1 mt-1", selectedCustomer?.id === t.id ? "text-white/60" : "text-white/40")}>{t.message}</p>
                             </button>
                          ))}
                          {tickets.length === 0 && <p className="text-xs text-white/10 italic text-center py-10">Nenhuma mensagem no momento.</p>}
                       </div>
                    </div>

                    {/* RESPONSE PANEL */}
                    <div className="lg:col-span-2">
                       {selectedCustomer ? (
                          <div className="glass rounded-[48px] p-6 sm:p-10 border border-white/5 h-full flex flex-col min-h-[500px]">
                             <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                                <div>
                                   <h4 className="text-xl font-black italic">{selectedCustomer.userName}</h4>
                                   <p className="text-[10px] text-primary font-black uppercase tracking-widest">{selectedCustomer.email}</p>
                                </div>
                                <div className="flex gap-2">
                                   <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleUpdateTicket(selectedCustomer.id, 'RESOLVIDO')}>Marcar Resolvido</Button>
                                   <Button variant="outline" size="sm" className="rounded-xl border-red-500/20 text-red-500" onClick={() => deleteItem('tickets', selectedCustomer.id)}>Excluir</Button>
                                </div>
                             </div>
                             <div className="flex-1 space-y-6">
                                <div className="bg-white/5 p-6 rounded-[32px] border border-white/5">
                                   <p className="text-[10px] text-white/20 uppercase font-black mb-2 italic">Mensagem do Cliente:</p>
                                   <p className="text-sm leading-relaxed text-white/80">{selectedCustomer.message}</p>
                                </div>
                                <div className="mt-auto space-y-4 pt-6">
                                   <div className="flex justify-between items-center">
                                      <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Resposta Rápida (Protocolo OS)</label>
                                      <span className="text-[8px] font-bold text-white/20 uppercase italic">Logs serão registrados automaticamente</span>
                                   </div>
                                   <textarea 
                                      className="w-full bg-black border border-white/10 rounded-[32px] p-6 text-sm outline-none focus:border-primary/50 resize-none transition-all" 
                                      rows={4} 
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      placeholder="Digite sua resposta oficial aqui..." 
                                   />
                                   <Button className="w-full py-6 rounded-[24px] uppercase font-black italic tracking-widest gap-3" onClick={handleSendReply}>
                                      <Mail className="w-4 h-4" /> Enviar Resposta via Protocolo
                                   </Button>
                                </div>
                             </div>
                          </div>
                       ) : (
                          <div className="glass rounded-[48px] border border-white/5 border-dashed h-full flex flex-col items-center justify-center text-white/10 opacity-30 py-20 lg:py-0">
                             <Mail className="w-16 h-16 mb-4" />
                             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Selecione um ticket para processar</p>
                          </div>
                       )}
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'crm' && (
              <motion.div key="crm" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <div className="flex flex-col sm:flex-row justify-between items-center bg-white/5 p-6 rounded-[32px] border border-white/5 gap-4">
                    <div>
                       <h3 className="text-sm font-black uppercase tracking-widest italic text-center sm:text-left">Base de Clientes (CRM)</h3>
                       <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest text-center sm:text-left">Inteligência de contatos e retenção</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                       <Button onClick={exportCustomersToCSV} variant="outline" className="rounded-2xl gap-2 h-11 px-6 border-white/10 text-white/40 hover:text-white flex-1 sm:flex-none">
                          <FileText className="w-4 h-4" /> CSV
                       </Button>
                       <Button onClick={() => { setIsAddingCustomer(true); setIsEditingCustomer(false); setNewCustomer({ name: '', email: '', phone: '', tags: [], address: '' }); }} className="rounded-2xl gap-2 h-11 px-6 flex-1 sm:flex-none">
                          <Plus className="w-4 h-4" /> Novo Cliente
                       </Button>
                    </div>
                 </div>

                 {/* CRM MOBILE CARDS */}
                 <div className="lg:hidden space-y-4">
                    {filteredCustomers.map(c => {
                       const stats = getCustomerStats(c.email);
                       return (
                          <div key={c.id} className="glass rounded-[32px] p-6 border border-white/5 space-y-4">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center font-black text-sm text-primary uppercase">
                                   {c.photoURL ? <img src={c.photoURL} className="w-full h-full rounded-2xl object-cover" /> : c.name?.[0]}
                                </div>
                                <div className="overflow-hidden">
                                   <h4 className="text-sm font-black uppercase truncate">{c.name}</h4>
                                   <p className="text-[10px] font-mono text-white/20 truncate">{c.email}</p>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                   <p className="text-[8px] font-black uppercase text-white/20 mb-1">Pedidos</p>
                                   <p className="text-sm font-black italic">{stats.count}</p>
                                </div>
                                <div>
                                   <p className="text-[8px] font-black uppercase text-white/20 mb-1">Investido</p>
                                   <p className="text-sm font-black italic text-primary">R$ {stats.total.toFixed(2)}</p>
                                </div>
                             </div>
                             <Button onClick={() => setSelectedCRMUser(c)} className="w-full rounded-2xl h-11 text-[10px] uppercase font-black italic tracking-widest" variant="outline">Protocolo Histórico</Button>
                          </div>
                       );
                    })}
                 </div>

                 {/* CRM DESKTOP TABLE */}
                 <div className="hidden lg:block glass rounded-[32px] sm:rounded-[48px] p-4 sm:p-10 border border-white/5 overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[600px]">
                       <thead>
                          <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5">
                             <th className="pb-6">Cliente</th>
                             <th className="pb-6">Pedidos</th>
                             <th className="pb-6">Volume Transacionado</th>
                             <th className="pb-6 text-right">Integração</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {filteredCustomers.map(c => {
                             const stats = getCustomerStats(c.email);
                             return (
                                <tr key={c.id} className="hover:bg-white/[0.01] transition-colors group">
                                   <td className="py-6">
                                      <div className="flex items-center gap-4">
                                         <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center font-black text-xs text-primary">
                                            {c.photoURL ? <img src={c.photoURL} className="w-full h-full rounded-full object-cover" /> : (c.name?.[0] || 'U')}
                                         </div>
                                         <div className="flex flex-col">
                                            <span className="text-sm font-bold uppercase">{c.name}</span>
                                            <span className="text-[10px] text-white/20 font-bold">{c.email}</span>
                                         </div>
                                      </div>
                                   </td>
                                   <td className="py-6">
                                      <div className="flex items-center gap-2">
                                         <Package className="w-3 h-3 text-white/20" />
                                         <span className="text-xs font-black uppercase">{stats.count}</span>
                                      </div>
                                   </td>
                                   <td className="py-6 font-display font-black text-primary italic">R$ {stats.total.toFixed(2)}</td>
                                   <td className="py-6 text-right">
                                      <button onClick={() => setSelectedCRMUser(c)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/20 hover:text-white group-hover:scale-105 transform"><Eye className="w-4 h-4" /></button>
                                   </td>
                                </tr>
                             );
                          })}
                          {filteredCustomers.length === 0 && (
                             <tr><td colSpan={4} className="py-20 text-center text-white/10 italic">Nenhum cliente catalogado.</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </motion.div>
            )}

            {activeTab === 'faqs' && (
              <motion.div key="faqs" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <div className="flex justify-between items-center bg-white/5 p-6 rounded-[32px] border border-white/5">
                    <div>
                       <h3 className="text-sm font-black uppercase tracking-widest italic">Central de Dúvidas</h3>
                       <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Base de Conhecimento do Cliente</p>
                    </div>
                    <Button onClick={() => setIsAddingFAQ(true)} className="rounded-2xl gap-2 h-11 px-6">
                       <Plus className="w-4 h-4" /> Nova Resposta
                    </Button>
                 </div>
                 <div className="space-y-4">
                    {faqs.map(f => (
                       <div key={f.id} className="glass rounded-[32px] p-8 border border-white/5 group hover:border-white/10 transition-all">
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <h4 className="text-sm font-bold uppercase text-white/80 italic">{f.question}</h4>
                             </div>
                             <button onClick={() => deleteItem('faqs', f.id)} className="p-2 text-white/10 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <p className="text-xs text-white/40 leading-relaxed font-medium">{f.answer}</p>
                       </div>
                    ))}
                    {faqs.length === 0 && (
                       <div className="py-20 text-center glass border-dashed border-white/5 rounded-[48px] text-white/10 italic">Nenhum FAQ catalogado até o momento.</div>
                    )}
                 </div>
              </motion.div>
            )}

            {activeTab === 'showcase' && (
              <motion.div key="showcase" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                 <div className="flex justify-between items-center bg-white/5 p-8 rounded-[40px] border border-white/5">
                    <div>
                       <h3 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2 text-primary">
                          <Eye className="w-4 h-4" /> Gestão de Vitrine
                       </h3>
                       <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] mt-1">Banners e Destaques da Landing Page</p>
                    </div>
                    <Button onClick={() => setIsAddingShowcase(true)} className="rounded-3xl gap-2 h-12 px-8 bg-white text-black hover:bg-white/90">
                       <Plus className="w-4 h-4" /> Novo Destaque
                    </Button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {showcase.map(s => (
                       <div key={s.id} className="group relative aspect-[21/9] rounded-[48px] overflow-hidden border border-white/5 bg-black">
                          <img src={s.image} alt={s.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-all duration-700 group-hover:scale-105" />
                          <div className="absolute inset-0 p-12 flex flex-col justify-end bg-gradient-to-t from-black via-black/40 to-transparent">
                             <div className="flex items-center gap-2 mb-3">
                                <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded", s.active ? "bg-green-500 text-white" : "bg-red-500 text-white")}>
                                   {s.active ? "ATIVO" : "INATIVO"}
                                </span>
                             </div>
                             <h4 className="text-3xl font-display font-black italic mb-1 tracking-tighter">{s.title}</h4>
                             <p className="text-xs text-white/40 uppercase tracking-[0.3em] font-medium">{s.subtitle}</p>
                             
                             <div className="mt-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                                <button onClick={() => {
                                   setSelectedShowcase(s);
                                   setNewShowcase({
                                     title: s.title || '',
                                     subtitle: s.subtitle || '',
                                     image: s.image || '',
                                     link: s.link || '',
                                     active: s.active !== undefined ? s.active : true
                                   });
                                   setIsEditingShowcase(true);
                                }} className="flex-1 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-primary hover:border-primary transition-all text-[10px] font-black uppercase italic tracking-widest">Editar Config</button>
                                <button onClick={() => deleteItem('showcase', s.id)} className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                             </div>
                          </div>
                       </div>
                    ))}
                    {showcase.length === 0 && (
                       <div className="md:col-span-2 py-20 text-center text-white/10 italic">Nenhum destaque configurado.</div>
                    )}
                 </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div key="logs" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <div className="glass rounded-[48px] p-10 border border-white/10 overflow-hidden">
                    <div className="flex items-center gap-3 mb-10">
                       <History className="w-6 h-6 text-primary" />
                       <h3 className="text-sm font-black uppercase tracking-widest italic">Protocolos de Auditoria</h3>
                    </div>
                    <div className="space-y-4">
                       {logs.map(log => (
                          <div key={log.id} className="flex gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-[32px] hover:bg-white/[0.04] transition-all group">
                             <div className="w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center font-mono text-[10px] font-bold text-white/20 group-hover:text-primary transition-colors">#{log.id.slice(0,4)}</div>
                             <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">{log.action}</span>
                                   <span className="text-[8px] text-white/20 font-bold uppercase">{new Date(log.createdAt?.seconds * 1000).toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed">{log.reply || log.details || 'Ação sistêmica registrada sob protocolo central.'}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Operator</p>
                                <p className="text-xs font-bold text-white/40">{log.adminId?.slice(0,8) || 'SYSTEM'}</p>
                             </div>
                          </div>
                       ))}
                       {logs.length === 0 && (
                          <div className="py-20 text-center opacity-20 italic">Nenhum evento auditado nas últimas 48h.</div>
                       )}
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="glass rounded-[48px] p-10 border border-white/5 space-y-8">
                    <h3 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2"><Settings className="w-4 h-4" /> Config Gerais</h3>
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-white/20">Banner Promocional</label>
                          <input 
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-primary/50" 
                            value={globalSettings.promoBanner}
                            onChange={(e) => setGlobalSettings({...globalSettings, promoBanner: e.target.value})}
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-white/20">Valor Mínimo para Orçamento (R$)</label>
                          <input 
                            type="number" 
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-primary/50" 
                            value={globalSettings.minOrderValue}
                            onChange={(e) => setGlobalSettings({...globalSettings, minOrderValue: parseFloat(e.target.value)})}
                          />
                       </div>
                       <Button className="w-full h-14 rounded-2xl" onClick={handleSaveSettings}>Salvar Alterações Globais</Button>
                    </div>
                 </div>
                 <div className="glass rounded-[48px] p-10 border border-white/5">
                    <h3 className="text-sm font-black uppercase tracking-widest italic mb-8">Estado do Sistema</h3>
                    <div className="space-y-4">
                       <button 
                          onClick={() => setGlobalSettings({...globalSettings, maintenanceMode: !globalSettings.maintenanceMode})}
                          className={cn(
                             "w-full flex items-center justify-between p-6 rounded-3xl border transition-all",
                             globalSettings.maintenanceMode ? "bg-red-500/10 border-red-500/20" : "bg-green-500/10 border-green-500/20"
                          )}
                       >
                          <div className="flex items-center gap-3">
                             <div className={cn("w-2 h-2 rounded-full animate-pulse", globalSettings.maintenanceMode ? "bg-red-500" : "bg-green-500")} />
                             <span className="text-[10px] font-black uppercase">{globalSettings.maintenanceMode ? "Modo Manutenção Ativo" : "Sistema Online"}</span>
                          </div>
                          <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded", globalSettings.maintenanceMode ? "bg-red-500 text-white" : "bg-green-500 text-white")}>
                             {globalSettings.maintenanceMode ? "OFFLINE" : "LIVE"}
                          </span>
                       </button>
                       <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                          <p className="text-[10px] font-black uppercase text-white/20 mb-2">Versão do Engine</p>
                          <p className="text-xs font-mono font-bold">INOVAPRO-OS v2.4.8-stable</p>
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}


          </AnimatePresence>
        </div>
      </main>

      {/* MODAL DETALHE (Simplified to ensure no errors) */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-surface border border-white/10 rounded-[32px] sm:rounded-[56px] w-full max-w-5xl relative my-auto overflow-hidden flex flex-col lg:flex-row h-full max-h-[90vh]">
                
                {/* LEFT INFO (CORE DATA) */}
                <div className="lg:w-1/3 bg-white/[0.02] border-b lg:border-b-0 lg:border-r border-white/5 p-6 sm:p-12 flex flex-col">
                   <button onClick={() => setSelectedOrder(null)} className="mb-6 lg:mb-12 self-start p-3 hover:bg-white/5 rounded-2xl transition-all group">
                      <Plus className="w-6 h-6 rotate-45 text-white/20 group-hover:text-red-500" />
                   </button>
                   
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2 italic">Protocol Ledger</p>
                   <h2 className="text-4xl font-display font-black italic tracking-tighter mb-8 leading-none">#{selectedOrder.id.slice(0, 12)}</h2>
                   
                   <div className="space-y-8">
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4 italic">Status de Operação</p>
                         <select 
                            value={selectedOrder.status}
                            onChange={(e) => updateStatus('orders', selectedOrder.id, e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-[20px] p-4 text-xs font-black uppercase tracking-widest text-primary outline-none focus:border-primary transition-all appearance-none"
                         >
                            <option value="PENDING_PAYMENT">AGUARDANDO PAGAMENTO</option>
                            <option value="PAID">PAGAMENTO APROVADO</option>
                            <option value="QUEUE">FILA DE PRODUÇÃO</option>
                            <option value="PRINTING">EM IMPRESSÃO 3D</option>
                            <option value="FINISHING">ACABAMENTO POST-OP</option>
                            <option value="SHIPPED">ENVIADO / LOGÍSTICA</option>
                            <option value="COMPLETED">ENTREGA FINALIZADA</option>
                         </select>
                      </div>

                      <div className="p-6 bg-white/5 rounded-[28px] border border-white/5">
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-3 italic">Identidade do Cliente</p>
                         <p className="text-sm font-bold uppercase mb-1">{selectedOrder.userName}</p>
                         <p className="text-xs text-white/40">{selectedOrder.userEmail}</p>
                      </div>

                      <div className="space-y-4">
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Rastreamento de Logística</p>
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
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/10 mb-2">Total Transacionado</p>
                      <p className="text-3xl lg:text-4xl font-display font-black text-primary italic">R$ {(selectedOrder.total || 0).toFixed(2)}</p>
                   </div>
                </div>

                {/* RIGHT AREA (ITEMS & LOGS) */}
                <div className="flex-1 p-6 sm:p-12 overflow-y-auto no-scrollbar bg-[#050508]/40">
                   <h3 className="text-sm font-black uppercase tracking-widest italic mb-8 border-b border-white/5 pb-4">Manifesto de Produção</h3>
                   <div className="space-y-4">
                      {selectedOrder.items?.map((item, idx: number) => (
                         <div key={idx} className="flex gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-[32px] group hover:bg-white/[0.04] transition-all">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-black border border-white/5">
                               <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="flex-1">
                               <h4 className="text-sm font-black uppercase tracking-tight">{item.name}</h4>
                               <p className="text-[10px] text-white/20 uppercase font-black mt-1">Qtde: {item.quantity}</p>
                               <div className="flex gap-4 mt-3">
                                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-white/5 text-white/40 border border-white/10">Material: {item.options?.material || 'PLA'}</span>
                                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-white/5 text-white/40 border border-white/10">Cor: {item.options?.color || 'Preto'}</span>
                               </div>
                            </div>
                            <div className="self-center">
                               <p className="text-lg font-display font-black italic text-primary">R$ {(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                         </div>
                      ))}
                      {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                         <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[32px]">
                            <p className="text-xs text-white/10 italic">Nenhum item granulado neste protocolo.</p>
                         </div>
                      )}
                   </div>

                   <div className="mt-12 p-8 border border-primary/20 bg-primary/5 rounded-[40px]">
                      <div className="flex items-center gap-4 mb-4">
                         <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><MapPin className="w-5 h-5 text-primary" /></div>
                         <h4 className="text-xs font-black uppercase tracking-widest italic">Destino da Remessa</h4>
                      </div>
                      <div className="text-xs text-white/60 leading-relaxed font-bold uppercase tracking-tight">
                         {selectedOrder.shippingAddress ? (
                            <>
                               {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.number}<br/>
                               {selectedOrder.shippingAddress.neighborhood} - {selectedOrder.shippingAddress.city}/{selectedOrder.shippingAddress.state}<br/>
                               CEP: {selectedOrder.shippingAddress.zipCode}
                            </>
                         ) : (
                            "Logística de retirada na base ou endereço não informado."
                         )}
                      </div>
                    </div>

                    {selectedOrder.status === 'PENDING_PAYMENT' && (() => {
                      const matchedC = customers.find(c => 
                        (c.email && selectedOrder.userEmail && c.email.toLowerCase() === selectedOrder.userEmail.toLowerCase()) || 
                        (c.id === selectedOrder.userId)
                      );
                      const phone = matchedC?.phone || selectedOrder.phone || '';
                      const orderId = selectedOrder.id;
                      const finalPrice = selectedOrder.total || 0;
                      const pixCode = "00020101021226830014br.gov.bcb.pix2561api.INOVAPRO3D.com.br/pix/qr/v2/cob/order_" + orderId + "_" + finalPrice.toFixed(0);

                      const handleSendWhatsAppBilling = () => {
                        const phoneClean = phone.replace(/\D/g, '');
                        if (!phoneClean) {
                          toast.error("Número de WhatsApp do cliente não encontrado. Atualize o contato no CRM.");
                          return;
                        }
                        const text = `Olá, *${selectedOrder.userName}*!\n\nSeu pedido *#${orderId.slice(0,8)}* na *INOVAPRO3D* está pronto para faturamento. 😊\n\n*Valor:* R$ ${finalPrice.toFixed(2).replace('.', ',')}\n\n*Pix Copia e Cola:*\n\`${pixCode}\`\n\nAbra o aplicativo do seu banco, escolha "Pix Copia e Cola" e cole o código acima.\n\nFicamos no aguardo de sua confirmação para acelerar a produção de sua peça! 🚀`;
                        const encodedText = encodeURIComponent(text);
                        window.open(`https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodedText}`, '_blank');
                      };

                      return (
                        <div className="mt-8 p-8 border border-[#2563EB]/20 bg-[#2563EB]/[0.02] rounded-[40px] space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 shadow-lg shrink-0">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_Pix.png" className="w-full object-contain" alt="Pix" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-[#2563EB]">Gestão de Faturamento</h4>
                                <p className="text-[10px] text-white/40 font-medium italic">Copie o Pix ou envie a cobrança direta ao cliente do pedido.</p>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-baseline">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Código Pix Copia e Cola</label>
                                  {phone && (
                                    <span className="text-[9px] font-bold text-white/40">WhatsApp: +55 {phone}</span>
                                  )}
                                </div>
                                <div className="p-4 bg-black rounded-2xl border border-white/5 font-mono text-[10px] text-primary select-all break-all">
                                  {pixCode}
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-3">
                                 <button 
                                   onClick={() => {
                                     navigator.clipboard.writeText(pixCode);
                                     toast.success("Pix Copia e Cola copiado com sucesso!");
                                   }}
                                   type="button"
                                   className="flex-1 h-11 bg-white/5 hover:bg-white/10 text-white hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-white/5 flex items-center justify-center gap-2"
                                 >
                                    <Copy className="w-3.5 h-3.5" /> Copiar Pix
                                 </button>

                                 <button 
                                   onClick={handleSendWhatsAppBilling}
                                   type="button"
                                   className="flex-1 h-11 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-green-500/20 flex items-center justify-center gap-2"
                                 >
                                    <Smartphone className="w-3.5 h-3.5" /> Cobrança WhatsApp
                                 </button>
                              </div>
                           </div>
                        </div>
                      );
                    })()}
                    </div>
             </motion.div>
          </div>
        )}

        {(isAddingProduct || isEditingProduct) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-3xl overflow-y-auto">
             <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="bg-surface border border-white/10 rounded-[32px] sm:rounded-[48px] p-6 sm:p-12 max-w-2xl w-full relative my-auto">
                <button onClick={() => { setIsAddingProduct(false); setIsEditingProduct(false); setProductImportUrl(''); }} className="absolute top-6 right-6 sm:top-8 sm:right-8 text-white/20 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                <h2 className="text-3xl font-black italic tracking-tighter mb-8">
                   {isEditingProduct ? 'Editar Produto' : 'Novo Produto no Catálogo'}
                </h2>
                
                <form onSubmit={handleProductSubmit} className="space-y-6">
                    <div className="space-y-3 rounded-[28px] border border-primary/20 bg-primary/5 p-4 sm:p-5">
                       <div className="flex items-center justify-between gap-4">
                          <div>
                             <label className="text-[10px] font-black uppercase tracking-widest text-primary">Importar por link</label>
                             <p className="text-[9px] text-white/35 font-bold uppercase tracking-widest mt-1">Preenche nome, imagem, descricao e origem. O preco continua manual.</p>
                          </div>
                          <Download className="w-5 h-5 text-primary/70 shrink-0" />
                       </div>
                       <div className="flex flex-col sm:flex-row gap-3">
                          <input
                             type="url"
                             value={productImportUrl}
                             onChange={(e) => setProductImportUrl(e.target.value)}
                             placeholder="Cole um link publico do modelo, ex: MakerWorld/Bambu Lab"
                             className="min-w-0 flex-1 bg-black border border-white/10 rounded-2xl p-4 text-xs font-mono outline-none focus:border-primary/50 transition-all"
                          />
                          <Button
                             type="button"
                             onClick={handleImportProductMetadata}
                             disabled={isImportingProduct}
                             className="rounded-2xl px-6 h-12 text-[10px] font-black uppercase tracking-widest"
                          >
                             {isImportingProduct ? 'Importando...' : 'Importar'}
                          </Button>
                       </div>
                       {newProduct.sourceUrl && (
                         <p className="text-[8px] text-white/30 font-mono break-all">
                           Origem: {newProduct.sourceUrl}
                         </p>
                       )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Identidade do Item</label>
                          <input 
                             required
                             value={newProduct.name}
                             onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                             placeholder="Ex: Luminária Cyberpunk"
                             className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Status & Disponibilidade</label>
                          <div className="flex items-center gap-4 h-14 bg-white/5 border border-white/10 rounded-2xl px-4">
                             <button 
                                type="button"
                                onClick={() => setNewProduct({...newProduct, active: !newProduct.active})}
                                className={cn(
                                   "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                   newProduct.active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                )}
                             >
                                {newProduct.active ? 'Ativo' : 'Inativo'}
                             </button>
                             <div className="h-6 w-px bg-white/10" />
                             <div className="flex items-center gap-2 flex-1">
                                <label className="text-[9px] font-black uppercase text-white/20">Estoque:</label>
                                <input 
                                   type="number"
                                   value={newProduct.stock || 0}
                                   onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})}
                                   className="bg-transparent border-none outline-none text-xs font-bold text-white w-12"
                                />
                             </div>
                          </div>
                       </div>
                    </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Preço Base (R$)</label>
                         <input 
                            required
                            type="number"
                            step="0.01"
                            value={newProduct.basePrice}
                            onChange={(e) => setNewProduct({...newProduct, basePrice: parseFloat(e.target.value)})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
                         />
                      </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Setor / Categoria</label>
                          <select 
                             value={newProduct.category}
                             onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                             className="w-full bg-[#050508] border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all font-display text-[11px]"
                          >
                             <option value="DECORAÇÃO">DECORAÇÃO</option>
                             <option value="UTILITÁRIOS">UTILITÁRIOS</option>
                             <option value="ACTION FIGURES">ACTION FIGURES</option>
                             <option value="ORGANIZADORES">ORGANIZADORES</option>
                             <option value="MODA">MODA</option>
                             <option value="GAMES">GAMES</option>
                             <option value="OUTROS">OUTROS</option>
                          </select>
                       </div>
                   </div>

                   <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Carrossel de Imagens (URLs, uma por linha)</label>
                       <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4">
                         <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer">
                           <div className="min-w-0">
                             <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                               <Upload className="w-4 h-4" />
                               Enviar imagem manual
                             </span>
                             <p className="text-[8px] uppercase tracking-widest text-white/30 mt-1">
                               JPG, PNG ou WEBP. A URL do Firebase Storage entra automaticamente abaixo.
                             </p>
                           </div>
                           <span className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">
                             {isUploadingProductImage ? "Enviando..." : "Escolher arquivo"}
                           </span>
                           <input
                             type="file"
                             accept="image/*"
                             disabled={isUploadingProductImage}
                             onChange={(e) => {
                               const file = e.target.files?.[0] || null;
                               void handleProductImageUpload(file);
                               e.target.value = "";
                             }}
                             className="sr-only"
                           />
                         </label>
                       </div>
                       <textarea 
                          rows={3}
                          value={newProduct.images.join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value.split('\n').map(line => line.trim()).filter(Boolean);
                            setNewProduct({...newProduct, images: lines.length > 0 ? lines : ['']});
                          }}
                          placeholder="https://images.unsplash.com/...&#10;https://images.unsplash.com/..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono outline-none focus:border-primary/50 transition-all resize-y"
                       />
                       <span className="text-[8px] uppercase tracking-widest text-white/30 block mt-1">O primeiro link é a capa. Insira outros de forma opcional (um por linha) para habilitar o carrossel.</span>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Link do Arquivo STL / Modelo 3D</label>
                       <input 
                          value={newProduct.modelUrl || ''}
                          onChange={(e) => setNewProduct({...newProduct, modelUrl: e.target.value})}
                          placeholder="Ex: /cube.stl ou link HTTPS"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all font-mono text-xs"
                       />
                       <span className="text-[8px] uppercase tracking-widest text-white/30">Deixe em branco para usar o cubo padrão. Defina uma URL para renderização 3D interativa!</span>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Link de Origem / Download do Modelo</label>
                       <input 
                          value={newProduct.sourceUrl || ''}
                          onChange={(e) => setNewProduct({...newProduct, sourceUrl: e.target.value})}
                          placeholder="Link da pagina do modelo ou download externo"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all font-mono text-xs"
                       />
                       <span className="text-[8px] uppercase tracking-widest text-white/30">Use este campo para guardar a pagina original. O visualizador 3D usa apenas links diretos de arquivo no campo acima.</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 bg-white/5 p-4 sm:p-6 rounded-3xl border border-white/5">
                       <div className="space-y-1 col-span-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Dimensões Base do Modelo (mm)</label>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-white/40">Eixo X (Largura)</label>
                          <input 
                             type="number"
                             value={newProduct.baseDimensions?.x || 120}
                             onChange={(e) => setNewProduct({
                               ...newProduct, 
                               baseDimensions: { 
                                 ...(newProduct.baseDimensions || { x: 120, y: 120, z: 150 }), 
                                 x: parseInt(e.target.value) || 0 
                               }
                             })}
                             className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold outline-none focus:border-primary/50 transition-colors text-center"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-white/40">Eixo Y (Comprimento)</label>
                          <input 
                             type="number"
                             value={newProduct.baseDimensions?.y || 120}
                             onChange={(e) => setNewProduct({
                               ...newProduct, 
                               baseDimensions: { 
                                 ...(newProduct.baseDimensions || { x: 120, y: 120, z: 150 }), 
                                 y: parseInt(e.target.value) || 0 
                               }
                             })}
                             className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold outline-none focus:border-primary/50 transition-colors text-center"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-white/40">Eixo Z (Altura)</label>
                          <input 
                             type="number"
                             value={newProduct.baseDimensions?.z || 150}
                             onChange={(e) => setNewProduct({
                               ...newProduct, 
                               baseDimensions: { 
                                 ...(newProduct.baseDimensions || { x: 120, y: 120, z: 150 }), 
                                 z: parseInt(e.target.value) || 0 
                               }
                             })}
                             className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold outline-none focus:border-primary/50 transition-colors text-center"
                          />
                       </div>
                    </div>

                   <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 p-4 sm:p-6 bg-white/5 rounded-3xl border border-white/5">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-white/20">Resolução</label>
                         <input 
                            value={newProduct.technical.resolution}
                            onChange={(e) => setNewProduct({...newProduct, technical: {...newProduct.technical, resolution: e.target.value}})}
                            placeholder="0.2mm"
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-white/20">Infill (%)</label>
                         <input 
                            type="number"
                            value={newProduct.technical.infill}
                            onChange={(e) => setNewProduct({...newProduct, technical: {...newProduct.technical, infill: parseInt(e.target.value)}})}
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-white/20">Tempo</label>
                         <input 
                            value={newProduct.technical.printTime}
                            onChange={(e) => setNewProduct({...newProduct, technical: {...newProduct.technical, printTime: e.target.value}})}
                            placeholder="4h 30m"
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-white/20">Peso Base (g)</label>
                         <input 
                            type="number"
                            value={newProduct.technical.weight || 80}
                            onChange={(e) => setNewProduct({...newProduct, technical: {...newProduct.technical, weight: parseInt(e.target.value) || 0}})}
                            placeholder="80"
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none"
                         />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Descrição Técnica / Marketing</label>
                      <textarea 
                         rows={3}
                         value={newProduct.description}
                         onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all resize-none"
                      />
                   </div>

                   <Button type="submit" className="w-full h-16 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] italic">
                      Finalizar Protocolo de Registro
                   </Button>
                </form>
             </motion.div>
          </div>
        )}

        {selectedCustomer && activeTab === 'quotes' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto no-scrollbar">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface border border-white/10 rounded-[32px] sm:rounded-[48px] p-6 sm:p-12 max-w-3xl w-full relative my-auto animate-fade-in">
                <button onClick={() => setSelectedCustomer(null)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-all"><X className="w-8 h-8" /></button>
                
                {approvalStatus && approvalStatus.success ? (
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
                        <p className="text-xs text-white/40 mt-1 font-medium">Ordem de faturamento: <strong className="text-primary font-mono text-sm">#{approvalStatus.orderId?.slice(0,10).toUpperCase()}</strong></p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto text-left">
                       <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Resumo da Ordem</h4>
                         <div className="space-y-2 text-xs">
                           <div className="flex justify-between"><span className="text-white/40">Geometria:</span> <span className="text-white/80 font-bold truncate max-w-[120px]" title={selectedCustomer.fileName}>{selectedCustomer.fileName}</span></div>
                           <div className="flex justify-between"><span className="text-white/40">Infill:</span> <span className="text-white/80 font-bold">{approvalStatus.finalInfill}%</span></div>
                           <div className="flex justify-between"><span className="text-white/40">Tempo Impressão:</span> <span className="text-white/80 font-bold">{approvalStatus.finalTime}</span></div>
                           <div className="flex justify-between"><span className="text-white/40">Peso Estimado:</span> <span className="text-white/80 font-bold">{approvalStatus.finalWeight}g</span></div>
                           <div className="pt-2 border-t border-white/5 flex justify-between items-baseline"><span className="text-white/40 text-[10px] uppercase font-black">Investimento:</span> <span className="text-lg font-mono font-black text-primary">R$ {approvalStatus.finalPrice?.toFixed(2).replace('.', ',')}</span></div>
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
                           <p className="text-[10px] text-white/40 leading-relaxed font-medium italic">Copie este código para o aplicativo de pagamento do cliente ou envie pelo link de WhatsApp.</p>
                         </div>
                         
                         <div className="space-y-2">
                           <button 
                             onClick={() => {
                               const code = "00020101021226830014br.gov.bcb.pix2561api.INOVAPRO3D.com.br/pix/qr/v2/cob/order_" + approvalStatus.orderId + "_" + (approvalStatus.finalPrice || 45.90).toFixed(0);
                               navigator.clipboard.writeText(code);
                               toast.success("Código Pix Copiado com sucesso!");
                             }}
                             className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 hover:text-white text-primary text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                           >
                             Copiar Chave Pix
                           </button>
                         </div>
                       </div>
                     </div>

                     <div className="pt-6 border-t border-white/5 flex flex-wrap justify-center gap-3">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const q = selectedCustomer;
                            handleWhatsAppQuote(
                              q, 
                              approvalStatus.finalPrice || 45.9, 
                              approvalStatus.orderId, 
                              approvalStatus.finalPhone, 
                              approvalStatus.finalInfill, 
                              approvalStatus.finalTime, 
                              approvalStatus.finalWeight
                            );
                          }}
                          className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest border-green-500/20 text-green-400 hover:bg-green-500/10 flex items-center gap-2"
                        >
                          <Smartphone className="w-4 h-4" /> Enviar por WhatsApp
                        </Button>

                        <button 
                          onClick={() => {
                            setSelectedCustomer(null);
                            setApprovalStatus(null);
                            setActiveTab('orders');
                          }}
                          className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-widest gap-2 flex items-center justify-center transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
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
                          <p className="text-[9px] font-black uppercase text-white/20 mb-1">Cliente</p>
                          <p className="text-xs font-bold text-white/80">{selectedCustomer.userName}</p>
                       </div>
                       <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                          <p className="text-[9px] font-black uppercase text-white/20 mb-1">Geometria / Arquivo</p>
                          <p className="text-xs font-bold text-primary truncate" title={selectedCustomer.fileName}>{selectedCustomer.fileName}</p>
                       </div>
                    </div>

                    <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 mb-6">
                       <p className="text-[9px] font-black uppercase text-white/20 mb-1">Especificações de Entrada (Cliente)</p>
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs mt-2">
                         <div>
                           <span className="text-white/40">Material:</span> <strong className="text-white/80 uppercase">{selectedCustomer.materialId || 'PLA Pro'}</strong>
                         </div>
                         <div>
                           <span className="text-white/40">Infill:</span> <strong className="text-white/80">{selectedCustomer.infill || 20}%</strong>
                         </div>
                         <div>
                           <span className="text-white/40">Preço Est.:</span> <strong className="text-primary font-mono">R$ {selectedCustomer.estimatedPrice || '45,90'}</strong>
                         </div>
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

                        {/* CALCULADORA INTELIGENTE DE AUXÍLIO DE PREÇO */}
                        <div className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden transition-all duration-300">
                           <button
                              type="button"
                              onClick={() => setIsCalcAssistantOpen(!isCalcAssistantOpen)}
                              className="w-full p-4 flex items-center justify-between text-left text-xs font-black uppercase tracking-wider text-primary hover:bg-white/[0.03] transition-colors"
                           >
                              <span className="flex items-center gap-2">
                                 <Calculator className="w-4 h-4" /> 
                                 Assistente de Precificação {isCalcAssistantOpen ? "▲" : "▼"}
                              </span>
                              <span className="text-[9px] text-white/35 font-mono normal-case font-normal">Fórmula de Custo Direto + Margem</span>
                           </button>

                           {isCalcAssistantOpen && (
                              <div className="p-4 border-t border-white/5 space-y-4 bg-black/40 text-xs">
                                 <p className="text-[10px] text-white/50 leading-relaxed">
                                    Simule o preço sugerido combinando as especificações técnicas de impressão (peso e tempo) com seus custos operacionais.
                                 </p>

                                 <div className="grid grid-cols-2 gap-3">
                                    <div>
                                       <label className="text-[9px] text-white/40 uppercase font-black block mb-1">Filamento (R$/g)</label>
                                       <input
                                          type="number"
                                          step="0.01"
                                          value={calcFilamentPrice}
                                          onChange={(e) => setCalcFilamentPrice(Number(e.target.value))}
                                          className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs outline-none focus:border-primary/50 text-white font-mono font-bold"
                                          placeholder="Ex: 0.15"
                                       />
                                    </div>
                                    <div>
                                       <label className="text-[9px] text-white/40 uppercase block mb-1 font-black">Hora Máquina (R$)</label>
                                       <input
                                          type="number"
                                          step="0.10"
                                          value={calcHourCost}
                                          onChange={(e) => setCalcHourCost(Number(e.target.value))}
                                          className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs outline-none focus:border-primary/50 text-white font-mono font-bold"
                                          placeholder="Ex: 4.50"
                                       />
                                    </div>
                                    <div>
                                       <label className="text-[9px] text-white/40 uppercase font-black block mb-1">Taxa Setup (R$)</label>
                                       <input
                                          type="number"
                                          value={calcSetupFee}
                                          onChange={(e) => setCalcSetupFee(Number(e.target.value))}
                                          className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs outline-none focus:border-primary/50 text-white font-mono font-bold"
                                          placeholder="Ex: 10.00"
                                       />
                                    </div>
                                    <div>
                                       <label className="text-[9px] text-white/40 uppercase font-black block mb-1">Margem de Lucro (%)</label>
                                       <input
                                          type="number"
                                          value={calcMargin}
                                          onChange={(e) => setCalcMargin(Number(e.target.value))}
                                          className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs outline-none focus:border-primary/50 text-white font-mono font-bold"
                                          placeholder="Ex: 50"
                                       />
                                    </div>
                                 </div>

                                 <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                                    <h4 className="text-[10px] uppercase font-black tracking-wider text-white/60 mb-1 border-b border-white/5 pb-1 flex justify-between">
                                       <span>Demonstrativo do Cálculo</span>
                                       <span className="text-primary normal-case font-normal font-mono">tempo útil: {parseTimeToHours(editingQuoteTime).toFixed(2)}h</span>
                                    </h4>
                                    <div className="flex justify-between text-[11px] text-white/70">
                                       <span>Material ({editingQuoteWeight}g × R$ {calcFilamentPrice.toFixed(2)}):</span>
                                       <span className="font-mono">R$ {(editingQuoteWeight * calcFilamentPrice).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-white/70">
                                       <span>Máquina ({parseTimeToHours(editingQuoteTime).toFixed(2)}h × R$ {calcHourCost.toFixed(2)}):</span>
                                       <span className="font-mono">R$ {(parseTimeToHours(editingQuoteTime) * calcHourCost).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-white/70">
                                       <span>Taxa / Setup de Fatiamento:</span>
                                       <span className="font-mono">R$ {calcSetupFee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] font-black border-t border-white/5 pt-1.5 uppercase text-white">
                                       <span>Preço sugerido (+{calcMargin}%):</span>
                                       <span className="text-primary font-mono select-all">
                                          R$ {( (editingQuoteWeight * calcFilamentPrice + parseTimeToHours(editingQuoteTime) * calcHourCost + calcSetupFee) * (1 + calcMargin / 100) ).toFixed(2)}
                                       </span>
                                    </div>
                                 </div>

                                 <Button 
                                    type="button"
                                    onClick={() => {
                                       const suggestedPrice = (editingQuoteWeight * calcFilamentPrice + parseTimeToHours(editingQuoteTime) * calcHourCost + calcSetupFee) * (1 + calcMargin / 100);
                                       setEditingQuoteTotal(Number(suggestedPrice.toFixed(2)));
                                       toast.success(`Preço sugerido de R$ ${suggestedPrice.toFixed(2)} aplicado!`);
                                    }}
                                    className="w-full h-10 rounded-xl bg-primary hover:bg-opacity-90 text-[10px] font-black uppercase tracking-wider text-white"
                                 >
                                    Aplicar Preço Sugerido
                                 </Button>
                              </div>
                           )}
                        </div>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                             <label className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1 block">Valor Final Aprovado (R$)</label>
                             <input 
                                type="number" 
                                step="0.01"
                                value={editingQuoteTotal}
                                onChange={(e) => setEditingQuoteTotal(Number(e.target.value))}
                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-primary font-bold outline-none focus:border-primary/50 transition-all font-mono"
                             />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1 block">WhatsApp do Cliente (Apenas Números)</label>
                             <input 
                                type="text" 
                                placeholder="Ex: 11999998888"
                                value={editingQuotePhone}
                                onChange={(e) => setEditingQuotePhone(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary/50 transition-all font-mono"
                             />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] mb-1 block font-bold">Tempo de Impressão</label>
                             <input 
                                type="text" 
                                placeholder="Ex: 2h 30m"
                                value={editingQuoteTime}
                                onChange={(e) => setEditingQuoteTime(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary/50 transition-all font-mono"
                             />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] mb-1 block font-bold">Peso Estimado (g)</label>
                             <input 
                                type="number" 
                                value={editingQuoteWeight}
                                onChange={(e) => setEditingQuoteWeight(Number(e.target.value))}
                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary/50 transition-all font-mono"
                             />
                          </div>
                       </div>

                       <div>
                          <div className="flex justify-between items-center mb-1">
                             <label className="text-[10px] font-black uppercase tracking-wider text-white/40">Infill Final (%)</label>
                             <span className="text-xs font-mono text-primary font-bold">{editingQuoteInfill}%</span>
                          </div>
                          <input 
                             type="range" min="10" max="100" step="5" value={editingQuoteInfill}
                             onChange={(e) => setEditingQuoteInfill(Number(e.target.value))}
                             className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                          />
                       </div>

                       <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1 block">Notas do Técnico (Serão impressas no PDF)</label>
                          <textarea 
                             rows={2}
                             placeholder="Insira notas de qualidade, resolução de camada, etc..."
                             value={editingQuoteNotes}
                             onChange={(e) => setEditingQuoteNotes(e.target.value)}
                             className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs leading-relaxed outline-none focus:border-primary/50 transition-all resize-none"
                          />
                       </div>

                       <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                          <Button 
                            variant="outline" 
                            onClick={() => handlePrintQuote(selectedCustomer)}
                            className="h-12 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase border-white/15 hover:bg-white/5 whitespace-nowrap"
                          >
                             <Printer className="w-4 h-4" /> Gerar PDF
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            onClick={() => handleWhatsAppQuote(selectedCustomer, editingQuoteTotal)}
                            className="h-12 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-green-400 hover:text-green-300 uppercase border-green-500/20 hover:bg-green-500/10 whitespace-nowrap"
                          >
                             <Smartphone className="w-4 h-4" /> WhatsApp
                          </Button>

                          <Button 
                            onClick={() => triggerConfirm("Aprovar Orçamento", `Aprovar o orçamento de ${selectedCustomer.userName || 'Cliente'} e faturar gerando o pedido correspondente?`, () => handleApproveQuote(selectedCustomer))} 
                            className="flex-1 h-12 rounded-xl bg-green-500 hover:bg-green-600 gap-2 text-[10px] font-black uppercase whitespace-nowrap shadow-lg shadow-green-500/10"
                          >
                             <CheckCircle2 className="w-4 h-4" /> Aprovar e Faturar
                           </Button>
                           <Button 
                             variant="outline"
                             onClick={() => handleSaveQuoteSpecifications(selectedCustomer)}
                             className="h-12 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase border-white/15 hover:bg-white/5 whitespace-nowrap text-white/85 hover:text-white"
                           >
                             <Edit className="w-4 h-4" /> Salvar Alterações
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            onClick={() => triggerConfirm("Descartar Orçamento", "Tem certeza que deseja excluir permanentemente este orçamento?", () => { deleteItem('quotes', selectedCustomer.id); setSelectedCustomer(null); }, true)}
                            className="h-12 rounded-xl border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-500 flex items-center justify-center gap-2 text-[10px] font-black uppercase whitespace-nowrap"
                          >
                             <Trash2 className="w-4 h-4" /> Descartar
                          </Button>
                       </div>
                    </div>
                  </>
                )}
             </motion.div>
          </div>
        )}
        {selectedCRMUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface border border-white/10 rounded-[48px] w-full max-w-4xl relative my-auto overflow-hidden flex flex-col h-full max-h-[85vh]">
                <div className="p-12 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                   <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center font-black text-2xl text-primary uppercase">
                         {selectedCRMUser.photoURL ? <img src={selectedCRMUser.photoURL} className="w-full h-full rounded-3xl object-cover" /> : selectedCRMUser.name?.[0]}
                      </div>
                      <div>
                         <h2 className="text-3xl font-black italic tracking-tighter">{selectedCRMUser.name}</h2>
                         <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{selectedCRMUser.email}</p>
                      </div>
                   </div>
                   <button onClick={() => setSelectedCRMUser(null)} className="p-4 hover:bg-white/5 rounded-2xl transition-all text-white/20 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                </div>
                <div className="flex-1 p-12 overflow-y-auto no-scrollbar space-y-10">
                   <div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-6 italic">Fluxo de Protocolos (Pedidos)</h3>
                      <div className="space-y-4">
                         {orders.filter(o => o.userEmail === selectedCRMUser.email).map(order => (
                            <div key={order.id} className="glass p-6 rounded-[32px] border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all">
                               <div>
                                  <p className="text-[10px] font-mono text-white/20 mb-1">#{order.id.slice(0,12)}</p>
                                  <p className="text-xs font-bold uppercase">{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                               </div>
                               <div className="text-center">
                                  <p className="text-[8px] font-black uppercase text-white/20 mb-1">Status</p>
                                  <span className="text-[9px] font-black uppercase px-3 py-1 bg-white/5 rounded-full border border-white/5">{order.status}</span>
                               </div>
                               <div className="text-right">
                                  <p className="text-sm font-display font-black text-primary">R$ {(order.total || 0).toFixed(2)}</p>
                                  <button onClick={() => { setSelectedOrder(order); setSelectedCRMUser(null); }} className="text-[8px] font-black uppercase text-white/20 hover:text-white mt-1 underline">Ver Detalhes</button>
                               </div>
                            </div>
                         ))}
                         {orders.filter(o => o.userEmail === selectedCRMUser.email).length === 0 && (
                            <div className="py-20 text-center opacity-10 italic">Nenhum protocolo interceptado para este usuário.</div>
                         )}
                      </div>
                   </div>
                </div>
                <div className="p-8 bg-black/40 border-t border-white/5 flex gap-4">
                   <Button onClick={() => window.open(`mailto:${selectedCRMUser.email}`)} className="flex-1 rounded-2xl h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-black uppercase italic tracking-widest text-white">Enviar Notificação</Button>
                   <Button onClick={() => deleteItem('customers', selectedCRMUser.id)} className="rounded-2xl h-14 px-8 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-black uppercase italic tracking-widest" variant="outline">Banir / Excluir</Button>
                </div>
             </motion.div>
          </div>
        )}
        {(isAddingCustomer || isEditingCustomer) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-surface border border-white/10 rounded-[48px] p-10 max-w-md w-full relative my-auto">
                <button onClick={() => { setIsAddingCustomer(false); setIsEditingCustomer(false); }} className="absolute top-8 right-8 text-white/20 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                <h2 className="text-3xl font-black italic tracking-tighter mb-8 leading-none">{isEditingCustomer ? 'Editar Cliente' : 'Novo Cliente'}<br/><span className="text-primary text-sm uppercase tracking-widest mt-2 block">{isEditingCustomer ? 'Refinar Cadastro' : 'Cadastro Manual (CRM)'}</span></h2>
                
                <form onSubmit={handleCustomerSubmit} className="space-y-6">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-white/20 italic">Nome Completo</label>
                         <input 
                            required
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-white/20 italic">Telefone / WhatsApp</label>
                         <input 
                            value={newCustomer.phone}
                            onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                            placeholder="(00) 00000-0000"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
                         />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/20 italic">Email de Contato</label>
                      <input 
                         required
                         type="email"
                         value={newCustomer.email}
                         onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/20 italic">Segmentação (Tags separadas por vírgula)</label>
                      <input 
                         value={newCustomer.tags.join(', ')}
                         onChange={(e) => setNewCustomer({...newCustomer, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '')})}
                         placeholder="Ex: VIP, B2B, Atacado"
                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
                      />
                   </div>
                   <Button type="submit" className="w-full h-16 rounded-[24px] uppercase font-black text-xs italic tracking-widest bg-primary hover:bg-primary-hover shadow-xl shadow-primary/20">Registrar no Database</Button>
                </form>
             </motion.div>
          </div>
        )}
        {isAddingFAQ && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-surface border border-white/10 rounded-[48px] p-10 max-w-lg w-full relative my-auto">
                <button onClick={() => setIsAddingFAQ(false)} className="absolute top-8 right-8 text-white/20 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                <h2 className="text-3xl font-black italic tracking-tighter mb-8 leading-none">Novo FAQ<br/><span className="text-primary text-sm uppercase tracking-widest mt-2 block">Central de Ajuda</span></h2>
                
                <form onSubmit={handleFAQSubmit} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/20 italic">Pergunta (Short Handle)</label>
                      <input 
                         required
                         value={newFAQ.question}
                         onChange={(e) => setNewFAQ({...newFAQ, question: e.target.value})}
                         placeholder="Ex: Como rastrear meu pedido?"
                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/20 italic">Resposta Detalhada</label>
                      <textarea 
                         required
                         rows={5}
                         value={newFAQ.answer}
                         onChange={(e) => setNewFAQ({...newFAQ, answer: e.target.value})}
                         placeholder="Descreva a solução completa aqui..."
                         className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-xs font-medium leading-relaxed outline-none focus:border-primary/50 resize-none"
                      />
                   </div>
                   <Button type="submit" className="w-full h-16 rounded-[24px] uppercase font-black text-xs italic tracking-widest bg-primary hover:bg-primary-hover shadow-xl shadow-primary/20">Publicar Conhecimento</Button>
                </form>
             </motion.div>
          </div>
        )}

        {(isAddingMaterial || isEditingMaterial) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl">
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-surface border border-white/10 rounded-[48px] p-12 max-w-md w-full relative">
                <button onClick={() => { setIsAddingMaterial(false); setIsEditingMaterial(false); }} className="absolute top-8 right-8 text-white/20 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                <h2 className="text-3xl font-black italic tracking-tighter mb-8">{isEditingMaterial ? 'Editar Material' : 'Novo Material'}</h2>
                
                <form onSubmit={handleMaterialSubmit} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/20">Identificação</label>
                      <input 
                         required
                         value={newMaterial.name}
                         onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none"
                         placeholder="Ex: PLA Silk Gold"
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-white/20">Tipo</label>
                         <input 
                            value={newMaterial.type}
                            onChange={(e) => setNewMaterial({...newMaterial, type: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-white/20">Custo p/ Kg</label>
                         <input 
                            type="number"
                            value={newMaterial.pricePerKg}
                            onChange={(e) => setNewMaterial({...newMaterial, pricePerKg: parseFloat(e.target.value)})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none"
                         />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/20">Cor do Display</label>
                      <input 
                         type="color"
                         value={newMaterial.color}
                         onChange={(e) => setNewMaterial({...newMaterial, color: e.target.value})}
                         className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer"
                      />
                   </div>
                   <Button type="submit" className="w-full h-16 rounded-[24px] uppercase font-black text-xs italic tracking-widest">{isEditingMaterial ? 'Salvar Protocolo' : 'Registrar Material'}</Button>
                </form>
             </motion.div>
          </div>
        )}

        {(isAddingShowcase || isEditingShowcase) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
             <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="bg-surface border border-white/10 rounded-[48px] p-12 max-w-lg w-full relative my-auto">
                <button onClick={() => { setIsAddingShowcase(false); setIsEditingShowcase(false); }} className="absolute top-8 right-8 text-white/20 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                <h2 className="text-3xl font-black italic tracking-tighter mb-8">{isEditingShowcase ? 'Edição Vitrine' : 'Novo Destaque'}</h2>
                
                <form onSubmit={handleShowcaseSubmit} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/20">Título do Banner</label>
                      <input 
                         required
                         value={newShowcase.title}
                         onChange={(e) => setNewShowcase({...newShowcase, title: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/20">Subtítulo / Tagline</label>
                      <input 
                         value={newShowcase.subtitle}
                         onChange={(e) => setNewShowcase({...newShowcase, subtitle: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-white/20">Wallpaper URL</label>
                      <input 
                         required
                         value={newShowcase.image}
                         onChange={(e) => setNewShowcase({...newShowcase, image: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none"
                      />
                   </div>
                   <Button type="submit" className="w-full h-16 rounded-[24px] uppercase font-black text-xs italic">Publicar Ativo</Button>

        {confirmState && confirmState.isOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
             <div className="bg-[#0a0a0f] border border-white/10 rounded-[32px] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mx-auto border transition-all",
                  confirmState.isDanger 
                    ? "bg-red-500/10 text-red-500 border-red-500/20" 
                    : "bg-green-500/10 text-green-500 border-green-500/20"
                )}>
                   {confirmState.isDanger ? (
                     <AlertCircle className="w-8 h-8 animate-pulse" />
                   ) : (
                     <CheckCircle2 className="w-8 h-8 animate-pulse" />
                   )}
                </div>
                
                <div className="space-y-2">
                   <h3 className="text-lg font-black text-white italic uppercase tracking-wider">{confirmState.title}</h3>
                   <p className="text-xs text-white/50 leading-relaxed font-bold">{confirmState.description}</p>
                </div>
                
                <div className="flex gap-3 pt-2">
                   <button 
                     type="button"
                     onClick={() => setConfirmState(null)}
                     className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white transition-all border border-white/5 active:scale-95"
                   >
                      {confirmState.cancelText || "Cancelar"}
                   </button>
                   <button 
                     type="button"
                     onClick={confirmState.onConfirm}
                     className={cn(
                       "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-white transition-all active:scale-95",
                       confirmState.isDanger 
                         ? "bg-red-500 hover:bg-red-600" 
                         : "bg-green-500 hover:bg-green-600"
                     )}
                   >
                      {confirmState.confirmText || "Confirmar"}
                   </button>
                </div>
             </div>
          </div>
        )}
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

