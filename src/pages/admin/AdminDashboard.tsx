import { useCallback, useMemo, useState } from "react";
import { auth } from "../../services/firebase";
import { updateProductsCategory } from "../../services/products";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { computePricing, parseTimeToHours } from "../../lib/pricing";
import { type AdminTabId } from "../../lib/adminHelpers";
import { ADMIN_MENU_ITEMS, ADMIN_TAB_SUBTITLES } from "./adminConfig";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { AdminSidebar } from "./components/AdminSidebar";
import type { Order, Quote, Ticket } from "../../types/domain";
import { useAdminData } from "./hooks/useAdminData";
import { useAdminActions } from "./hooks/useAdminActions";
import { useCategoryAdmin } from "./hooks/useCategoryAdmin";
import { usePrinterAdmin } from "./hooks/usePrinterAdmin";
import { useCompanyAdmin } from "./hooks/useCompanyAdmin";
import { useProductAdmin } from "./hooks/useProductAdmin";
import { useQuoteAdmin } from "./hooks/useQuoteAdmin";
import { uploadQuoteImage } from "../../lib/quotes";
import { useCouponAdmin } from "./hooks/useCouponAdmin";
import { useAdminSettings } from "./hooks/useAdminSettings";
import { useOrderEditing } from "./hooks/useOrderEditing";
import { useMaterialAdmin } from "./hooks/useMaterialAdmin";
import { useShowcaseAdmin } from "./hooks/useShowcaseAdmin";
import { useFAQAdmin } from "./hooks/useFAQAdmin";
import { useSupportAdmin } from "./hooks/useSupportAdmin";
import { useCRMAdmin } from "./hooks/useCRMAdmin";
import AdminOverviewPanel from "./components/AdminOverviewPanel";
import AdminOrdersPanel from "./components/AdminOrdersPanel";
import AdminProductsPanel from "./components/AdminProductsPanel";
import AdminCategoriesPanel from "./components/AdminCategoriesPanel";
import AdminMaterialsPanel from "./components/AdminMaterialsPanel";
import AdminPrintersPanel from "./components/AdminPrintersPanel";
import AdminPrinterFormModal from "./components/AdminPrinterFormModal";
import AdminQuotesPanel from "./components/AdminQuotesPanel";
import AdminSupportPanel from "./components/AdminSupportPanel";
import AdminCRMPanel from "./components/AdminCRMPanel";
import AdminFAQPanel from "./components/AdminFAQPanel";
import AdminShowcasePanel from "./components/AdminShowcasePanel";
import AdminLogsPanel from "./components/AdminLogsPanel";
import AdminErrorReportsPanel from "./components/AdminErrorReportsPanel";
import AdminReviewsPanel from "./components/AdminReviewsPanel";
import AdminSettingsPanel from "./components/AdminSettingsPanel";
import { AdminCouponsPanel } from "./components/AdminCouponsPanel";
import { AdminHeader } from "./components/AdminHeader";
import { AdminManualSaleModal } from "./components/AdminManualSaleModal";
import { AdminCalculatorWorkspace } from "./components/AdminCalculatorWorkspace";
import { openAdminCalculator } from "./adminCalculatorEvents";
import {
  PrintDocumentHost,
  type PrintDocumentEntry,
} from "../../components/print/PrintDocumentHost";
import { buildQuoteDocumentData } from "../../lib/quoteDocument";
import { printDocument, type PrintDocumentMode } from "../../lib/printing";
import AdminTrashPanel from "./components/AdminTrashPanel";
import AdminCalculatorTemplatesPanel from "./components/AdminCalculatorTemplatesPanel";
import { AdminPanelRoute, AdminPanelRouter } from "./components/AdminPanelRouter";
import { AdminCustomerDetailModal } from "./components/AdminCustomerDetailModal";
import { AdminCustomerFormModal } from "./components/AdminCustomerFormModal";
import { AdminMaterialFormModal } from "./components/AdminMaterialFormModal";
import { AdminShowcaseFormModal } from "./components/AdminShowcaseFormModal";
import { AdminOrderDetailModal } from "./components/AdminOrderDetailModal";
import { AdminQuoteApprovalSuccess } from "./components/AdminQuoteApprovalSuccess";
import { AdminQuoteEditorHeader } from "./components/AdminQuoteEditorHeader";
import { AdminQuoteCalcSnapshotNotice } from "./components/AdminQuoteCalcSnapshotNotice";
import { AdminQuoteEditorOverview } from "./components/AdminQuoteEditorOverview";
import { AdminQuoteTechnicalSection } from "./components/AdminQuoteTechnicalSection";
import { AdminQuoteCustomerSection } from "./components/AdminQuoteCustomerSection";
import { AdminQuoteImageSection } from "./components/AdminQuoteImageSection";
import { AdminQuoteCommercialSection } from "./components/AdminQuoteCommercialSection";
import { AdminQuoteNotesSection } from "./components/AdminQuoteNotesSection";
import { AdminQuotePricingAssistant } from "./components/AdminQuotePricingAssistant";
import { AdminQuoteEditorActions } from "./components/AdminQuoteEditorActions";
import { AdminProductFormModal } from "./components/AdminProductFormModal";
import { AdminCategoryFormModal } from "./components/AdminCategoryFormModal";

function isQuoteRecord(record: Quote | Ticket): record is Quote {
  return typeof record.fileName === "string" && typeof record.materialId === "string";
}

export default function AdminDashboard() {
  const [printJob, setPrintJob] = useState<{
    id: string;
    documents: PrintDocumentEntry[];
  } | null>(null);
  // ── Dados de todas as coleções + listener de pedidos novos ──
  const {
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
  } = useAdminData();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [auditView, setAuditView] = useState<"errors" | "audit">("errors");
  const [isSyncing, setIsSyncing] = useState(false);
  const [manualSaleMode, setManualSaleMode] = useState<"order" | "quote" | null>(null);

  const {
    globalSettings,
    setGlobalSettings,
    machineConfig,
    setMachineConfig,
    pricingSettings,
    setPricingSettings,
    handleSaveGlobalSettings,
    handleSaveMachineConfig,
    handleSavePricingSettings,
    toggleMaintenance,
  } = useAdminSettings();
  const {
    selectedOrder,
    setSelectedOrder,
    editingItems,
    editedItems,
    handleToggleItemEditing,
    updateEditedItem,
  } = useOrderEditing();
  const [selectedCustomer, setSelectedCustomer] = useState<Quote | Ticket | null>(null);

  // ── Categorias ──
  const {
    isAddingCategory,
    setIsAddingCategory,
    isEditingCategory,
    setIsEditingCategory,
    editingCategoryId,
    setEditingCategoryId,
    newCategory,
    setNewCategory,
    isUploadingCategoryImage,
    handleCategorySubmit,
    handleCategoryImageUpload,
    handleToggleCategoryActive,
    handleReorderCategory,
  } = useCategoryAdmin({ categories, setCategories, fetchData });

  // ── Impressoras ──
  const printerAdmin = usePrinterAdmin({ printers, printersBlocked, fetchData, machineConfig });

  // ── Empresa (cabeçalho dos documentos impressos) ──
  const companyAdmin = useCompanyAdmin();

  const buildPrintEntry = useCallback(
    (quote: Quote, mode: PrintDocumentMode): PrintDocumentEntry => {
      const printerId = quote.printerId || quote.calcSnapshot?.printerId;
      const printer = printers.find((candidate) => candidate.id === printerId);
      const quoteEmail = (quote.userEmail || quote.email || "").trim().toLowerCase();
      const registeredCustomer = customers.find(
        (customer) =>
          (quote.customerId && customer.id === quote.customerId) ||
          (quoteEmail && customer.email?.trim().toLowerCase() === quoteEmail),
      );
      const enrichedQuote: Quote = {
        ...quote,
        userName: quote.userName || registeredCustomer?.name,
        phone: quote.phone || registeredCustomer?.whatsapp || registeredCustomer?.phone,
      };
      const data = buildQuoteDocumentData(enrichedQuote, companyAdmin.companyProfile, {
        materials,
        printerPhotoUrl: printer?.photoUrl,
      });
      return { data, mode, key: `${quote.id}-${mode}` };
    },
    [companyAdmin.companyProfile, customers, materials, printers],
  );

  const handlePrintSavedQuotes = useCallback(
    (selectedQuotes: Quote[], mode: PrintDocumentMode) => {
      const preparedDocuments = selectedQuotes.map((quote) => buildPrintEntry(quote, mode));
      const documents = preparedDocuments.filter(
        ({ data }) => !(data.total <= 0 && data.customer.name.trim().toLowerCase() === "cliente"),
      );
      const skipped = preparedDocuments.length - documents.length;
      if (!documents.length) {
        toast.error("Este orçamento ainda está vazio", {
          description: "Informe o cliente e os valores antes de gerar a proposta.",
        });
        return;
      }
      if (skipped) {
        toast.warning(`${skipped} rascunho vazio não foi incluído no PDF.`);
      }

      const first = documents[0].data;
      const documentLabel = mode === "CLIENT" ? "Orçamento" : "Ficha de Produção";
      const suggestedTitle =
        documents.length === 1
          ? `INOVA PRO 3D ${documentLabel} - ${first.customer.name} - ${first.customer.phone || "Sem telefone"}`
          : `INOVA PRO 3D ${documentLabel} - ${documents.length} clientes`;
      const id = `${Date.now()}-${mode}`;
      void printDocument(
        () => setPrintJob({ id, documents }),
        () => setPrintJob(null),
        suggestedTitle.replace(/[\\/:*?"<>|]+/g, "-"),
      );
    },
    [buildPrintEntry],
  );

  const handlePrintSavedQuote = useCallback(
    (quote: Quote, mode: PrintDocumentMode) => handlePrintSavedQuotes([quote], mode),
    [handlePrintSavedQuotes],
  );

  // ── Ações sobre registros (status, exclusão, rastreio) ──
  const {
    updateStatus,
    deleteItem,
    deleteItems,
    restoreTrashItem,
    permanentlyDeleteTrashItem,
    emptyTrashItems,
    handleUpdateTracking,
  } = useAdminActions({
    orders,
    fetchData,
    selectedOrder,
    setSelectedOrder,
    selectedCustomer,
    setSelectedCustomer,
    setOrders,
    setQuotes,
    setTrashItems,
  });

  // ── Produtos: formulário, importação por link e imagens ──
  const {
    setSelectedProduct,
    isAddingProduct,
    setIsAddingProduct,
    isEditingProduct,
    setIsEditingProduct,
    productImportUrl,
    setProductImportUrl,
    isImportingProduct,
    isUploadingProductImage,
    translatingField,
    setTranslatingField,
    setCustomCategories,
    newProduct,
    setNewProduct,
    newImageUrl,
    setNewImageUrl,
    importingImage,
    allCategories,
    resetNewProduct,
    handleProductSubmit,
    handleImportProductMetadata,
    handleProductImageUpload,
    handleImportImageUrl,
    handleDuplicateProduct,
    handleEditProduct,
    handleUpdateStock,
  } = useProductAdmin({ categories, fetchData });

  const {
    isAddingMaterial,
    newMaterial,
    setNewMaterial,
    openMaterialForm,
    closeMaterialForm,
    handleMaterialSubmit,
    handleAdjustMaterialStock,
  } = useMaterialAdmin({ fetchData });

  const {
    isAddingShowcase,
    isEditingShowcase,
    newShowcase,
    setNewShowcase,
    openNewShowcase,
    openShowcaseEditor,
    closeShowcaseForm,
    handleShowcaseSubmit,
  } = useShowcaseAdmin({ fetchData });

  const {
    selectedCRMUser,
    setSelectedCRMUser,
    isAddingCustomer,
    isEditingCustomer,
    isSubmittingCustomer,
    newCustomer,
    setNewCustomer,
    openNewCustomer,
    openCustomerEditor,
    closeCustomerForm,
    handleCustomerSubmit,
    exportCustomersToCSV,
  } = useCRMAdmin({ customers, fetchData });

  // ── Support ──
  const { replyText, setReplyText, handleSendReply, handleUpdateTicket } = useSupportAdmin({
    selectedTicket: selectedCustomer as Ticket | null,
    fetchData,
  });

  const { isAddingFAQ, setIsAddingFAQ, newFAQ, setNewFAQ, handleFAQSubmit } = useFAQAdmin({
    fetchData,
  });

  // ── Orçamentos: edição, aprovação e WhatsApp ──
  const {
    editingQuoteTotal,
    editingQuoteWeight,
    setEditingQuoteWeight,
    editingQuoteTime,
    setEditingQuoteTime,
    editingQuoteInfill,
    setEditingQuoteInfill,
    editingQuotePhone,
    setEditingQuotePhone,
    editingQuoteNotes,
    setEditingQuoteNotes,
    editingQuoteFileName,
    setEditingQuoteFileName,
    editingQuoteMaterial,
    setEditingQuoteMaterial,
    editingQuoteQuantity,
    editingQuoteUnitPrice,
    editingQuoteImageUrl,
    setEditingQuoteImageUrl,
    editingQuoteCustomerNotes,
    setEditingQuoteCustomerNotes,
    editingQuoteCustomerName,
    setEditingQuoteCustomerName,
    editingQuoteCustomerEmail,
    setEditingQuoteCustomerEmail,
    editingQuoteValidUntil,
    setEditingQuoteValidUntil,
    editingQuotePaymentTerms,
    setEditingQuotePaymentTerms,
    editingQuoteShowImage,
    setEditingQuoteShowImage,
    handleQuantityChange,
    handleUnitPriceChange,
    handleQuoteTotalChange,
    isCalcAssistantOpen,
    setIsCalcAssistantOpen,
    isApprovingQuote,
    approvalStatus,
    setApprovalStatus,
    handleWhatsAppQuote,
    handleApproveQuote,
    handleSaveQuoteSpecifications,
  } = useQuoteAdmin({ customers, selectedCustomer, setSelectedCustomer, activeTab, fetchData });

  const handleQuoteImageUpload = useCallback(
    async (file: File) => {
      try {
        const url = await uploadQuoteImage(file);
        setEditingQuoteImageUrl(url);
        toast.success("Imagem enviada com sucesso!");
      } catch {
        toast.error("Falha ao enviar a imagem.");
      }
    },
    [setEditingQuoteImageUrl],
  );

  /**
   * Move produtos de categoria com atualização otimista. Se a escrita falhar,
   * desfaz a mudança na lista e avisa o usuário.
   */
  const moveProductsToCategory = useCallback(
    async (ids: string[], category: string, options?: { successMessage?: string }) => {
      const previousCategories = new Map(
        products.filter((p) => ids.includes(p.id)).map((p) => [p.id, p.category]),
      );

      setProducts((prev) =>
        prev.map((p) => (previousCategories.has(p.id) ? { ...p, category } : p)),
      );
      if (options?.successMessage) toast.success(options.successMessage);

      try {
        await updateProductsCategory(ids, category);
      } catch (error) {
        setProducts((prev) =>
          prev.map((p) => {
            const previous = previousCategories.get(p.id);
            return previous === undefined ? p : { ...p, category: previous };
          }),
        );
        console.error("Falha ao mover produtos de categoria:", error);
        toast.error("Não foi possível mover. A lista voltou ao estado anterior.");
      }
    },
    [products, setProducts],
  );

  // O modal de homologação usa exatamente o mesmo motor e os mesmos
  // parâmetros das calculadoras completa e rápida.
  const quoteAssistantResult = useMemo(() => {
    const materialText = selectedCustomer?.materialId?.toLowerCase() || "";
    const snapshotMaterial =
      selectedCustomer && "calcSnapshot" in selectedCustomer
        ? selectedCustomer.calcSnapshot?.material.key
        : undefined;
    const material = snapshotMaterial ?? (materialText.includes("petg") ? "petg" : "pla");
    const preset = pricingSettings.materials[material];
    return computePricing({
      material,
      spoolPrice: preset.spoolPrice,
      spoolWeight: preset.spoolWeight,
      steadyPowerWatts: preset.steadyPowerWatts,
      weightGrams: editingQuoteWeight,
      hours: parseTimeToHours(editingQuoteTime),
      quantity: 1,
      reservePct: preset.defaultReservePct,
      failureRatePct: pricingSettings.failureRatePct,
      failureImpactPct: pricingSettings.failureImpactPct,
      kwhCost: pricingSettings.kwhCost,
      startupPowerWatts: pricingSettings.startupPowerWatts,
      startupMinutes: pricingSettings.startupMinutes,
      machine: machineConfig,
      laborHours: 0,
      laborRate: 0,
      extraSupplies: 0,
      packagingCost: pricingSettings.defaultPackagingCost,
      targetProfitPerMachineHour: pricingSettings.targetProfitPerMachineHour,
      wholesaleMarkup: pricingSettings.wholesaleMarkup,
      retailMarkup: pricingSettings.retailMarkup,
      minPrice: pricingSettings.minPrice,
    });
  }, [editingQuoteTime, editingQuoteWeight, machineConfig, pricingSettings, selectedCustomer]);

  // A visualização usa o rascunho atual, inclusive antes de salvar.
  const editingQuotePreview = useMemo<Quote | null>(() => {
    if (!selectedCustomer || !isQuoteRecord(selectedCustomer)) return null;
    return {
      ...selectedCustomer,
      fileName: editingQuoteFileName.trim() || "Peça personalizada",
      materialId: editingQuoteMaterial.trim() || "PLA Pro",
      quantity: Math.max(1, editingQuoteQuantity),
      unitPrice: editingQuoteUnitPrice,
      total: editingQuoteTotal,
      infill: editingQuoteInfill,
      printTime: editingQuoteTime,
      weight: editingQuoteWeight,
      phone: editingQuotePhone,
      userName: editingQuoteCustomerName.trim() || "Cliente",
      userEmail: editingQuoteCustomerEmail.trim(),
      notes: editingQuoteCustomerNotes,
      adminNotes: editingQuoteNotes,
      imageUrl: editingQuoteImageUrl.trim() || undefined,
      validUntil: editingQuoteValidUntil,
      paymentTerms: editingQuotePaymentTerms.trim(),
      showImageOnQuote: editingQuoteShowImage,
    };
  }, [
    selectedCustomer,
    editingQuoteFileName,
    editingQuoteMaterial,
    editingQuoteQuantity,
    editingQuoteUnitPrice,
    editingQuoteTotal,
    editingQuoteInfill,
    editingQuoteTime,
    editingQuoteWeight,
    editingQuotePhone,
    editingQuoteCustomerName,
    editingQuoteCustomerEmail,
    editingQuoteCustomerNotes,
    editingQuoteNotes,
    editingQuoteImageUrl,
    editingQuoteValidUntil,
    editingQuotePaymentTerms,
    editingQuoteShowImage,
  ]);

  const {
    isAdding: isCouponAdding,
    setIsAdding: setCouponAdding,
    form: couponForm,
    setForm: setCouponForm,
    openForm: openCouponForm,
    handleCreate: handleCreateCoupon,
    handleToggle: handleToggleCoupon,
  } = useCouponAdmin(fetchData);

  const handleTabChange = useCallback((tab: string) => setActiveTab(tab as AdminTabId), []);
  const handleSelectOrderAndTab = useCallback(
    (o: Order) => {
      setActiveTab("orders");
      setSelectedOrder(o);
    },
    [setSelectedOrder],
  );

  // ── Confirm dialog ──
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const triggerConfirm = useCallback(
    (
      title: string,
      description: string,
      onConfirm: () => void,
      isDanger = false,
      confirmText = "Confirmar",
      cancelText = "Cancelar",
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
        },
      });
    },
    [],
  );

  // ── Filtered data ──
  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.userName && o.userName.toLowerCase().includes(searchTerm.toLowerCase())),
      ),
    [orders, searchTerm],
  );

  const filteredCustomers = useMemo(
    () =>
      customers.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())),
      ),
    [customers, searchTerm],
  );

  const filteredQuotes = useMemo(
    () =>
      quotes.filter(
        (q) =>
          (q.userName && q.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (q.fileName && q.fileName.toLowerCase().includes(searchTerm.toLowerCase())),
      ),
    [quotes, searchTerm],
  );

  const orderTrashItems = useMemo(
    () => trashItems.filter((item) => item.sourceCollection === "orders"),
    [trashItems],
  );
  const quoteTrashItems = useMemo(
    () => trashItems.filter((item) => item.sourceCollection === "quotes"),
    [trashItems],
  );

  // ── Menu ──
  const activeMenuItem = ADMIN_MENU_ITEMS.find((item) => item.id === activeTab);

  const sidebarCounts = useMemo(
    () => ({
      orders: orders.filter((o) => o.status === "PENDING_PAYMENT").length,
      quotes: quotes.filter((q) => q.status === "PENDING").length,
      trash: trashItems.length,
    }),
    [orders, quotes, trashItems.length],
  );

  const syncAdminData = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await handleSyncData();
    } finally {
      setIsSyncing(false);
    }
  }, [handleSyncData, isSyncing]);

  if (loading)
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="admin-workspace relative flex min-h-screen text-white overflow-hidden">
      {/* SIDEBAR OVERLAY (mobile) */}
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

      <AdminSidebar
        activeTab={activeTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
        onLogout={() => auth.signOut()}
        counts={sidebarCounts}
      />

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 lg:ml-60 min-h-screen min-w-0">
        <AdminHeader
          activeTab={activeTab}
          activeTabName={activeMenuItem?.name}
          activeTabDescription={ADMIN_TAB_SUBTITLES[activeTab]}
          searchTerm={searchTerm}
          isSyncing={isSyncing}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onSearchChange={setSearchTerm}
          onSyncData={syncAdminData}
        />

        {/* TAB CONTENT */}
        <div className="admin-content overflow-x-hidden">
          <AdminPanelRouter activeTab={activeTab}>
            <AdminPanelRoute tab="overview">
              <AdminOverviewPanel
                orders={filteredOrders}
                quotes={filteredQuotes}
                searchTerm={searchTerm}
                onSelectOrder={handleSelectOrderAndTab}
                onCancelOrder={(o) =>
                  triggerConfirm(
                    "Cancelar Pedido",
                    `Deseja cancelar o pedido #${o.id.slice(0, 12)} de ${o.userName}?`,
                    () => updateStatus("orders", o.id, "CANCELED"),
                    true,
                    "Sim, Cancelar",
                  )
                }
                onDeleteOrder={(o) =>
                  triggerConfirm(
                    "Mover pedido para a lixeira",
                    `O pedido #${o.id.slice(0, 12)} poderá ser restaurado. Pedidos em andamento são protegidos.`,
                    () => deleteItem("orders", o.id),
                    true,
                    "Mover para lixeira",
                  )
                }
                onTabChange={handleTabChange}
              />
            </AdminPanelRoute>
            <AdminPanelRoute tab="orders">
              <AdminOrdersPanel
                orders={filteredOrders}
                searchTerm={searchTerm}
                onSelectOrder={setSelectedOrder}
                onUpdateStatus={(id, status) => updateStatus("orders", id, status)}
                onCreateManual={() => setManualSaleMode("order")}
                onCancelOrder={(o) =>
                  triggerConfirm(
                    "Cancelar Pedido",
                    `Deseja cancelar o pedido #${o.id.slice(0, 12)} de ${o.userName}?`,
                    () => updateStatus("orders", o.id, "CANCELED"),
                    true,
                    "Sim, Cancelar",
                  )
                }
                onDeleteOrder={(o) =>
                  triggerConfirm(
                    "Mover pedido para a lixeira",
                    `O pedido #${o.id.slice(0, 12)} poderá ser restaurado. Pedidos em andamento são protegidos.`,
                    () => deleteItem("orders", o.id),
                    true,
                    "Mover para lixeira",
                  )
                }
                onDeleteOrders={(selected) =>
                  triggerConfirm(
                    "Mover pedidos para a lixeira",
                    "Somente pedidos em Aguardando pagamento ou Cancelados serão movidos. Os demais serão preservados.",
                    () =>
                      void deleteItems(
                        "orders",
                        selected.map((order) => order.id),
                      ),
                    true,
                    "Mover permitidos",
                  )
                }
                trashItems={orderTrashItems}
                trashBlocked={trashBlocked}
                onRestoreTrash={(entry) =>
                  triggerConfirm(
                    "Restaurar pedido",
                    `Deseja restaurar “${entry.label}”?`,
                    () => void restoreTrashItem(entry),
                    false,
                    "Restaurar",
                  )
                }
                onDeleteTrashPermanently={(entry) =>
                  triggerConfirm(
                    "Excluir pedido definitivamente",
                    `“${entry.label}” não poderá mais ser recuperado.`,
                    () => void permanentlyDeleteTrashItem(entry),
                    true,
                    "Excluir de vez",
                  )
                }
                onEmptyTrash={() =>
                  triggerConfirm(
                    "Esvaziar lixeira de pedidos",
                    `${orderTrashItems.length} pedido(s) serão excluídos definitivamente e não poderão ser restaurados.`,
                    () => void emptyTrashItems(orderTrashItems),
                    true,
                    "Esvaziar lixeira",
                  )
                }
              />
            </AdminPanelRoute>
            <AdminPanelRoute tab="products">
              <AdminProductsPanel
                products={products}
                categories={categories.filter((c) => c.active !== false).map((c) => c.name)}
                onDuplicate={handleDuplicateProduct}
                onEdit={handleEditProduct}
                onDelete={(id) =>
                  triggerConfirm(
                    "Excluir Produto",
                    "Tem certeza que deseja excluir este produto permanentemente?",
                    () => deleteItem("products", id),
                    true,
                  )
                }
                onBatchDelete={(ids) =>
                  triggerConfirm(
                    "Excluir Produtos",
                    `Tem certeza que deseja excluir ${ids.length} produto(s) permanentemente?`,
                    () => {
                      ids.forEach((id) => deleteItem("products", id));
                    },
                    true,
                  )
                }
                onUpdateStock={handleUpdateStock}
                onAddProduct={() => {
                  resetNewProduct();
                  setSelectedProduct(null);
                  setIsEditingProduct(false);
                  setIsAddingProduct(true);
                }}
                onMoveToCategory={(ids, cat) => {
                  void moveProductsToCategory(ids, cat, {
                    successMessage: `${ids.length} produto(s) movido(s) para ${cat}`,
                  });
                }}
                onChangeCategory={(id, cat) => {
                  void moveProductsToCategory([id], cat);
                }}
              />
            </AdminPanelRoute>
            <AdminPanelRoute tab="categories">
              <AdminCategoriesPanel
                categories={categories}
                productsCount={products.reduce(
                  (acc, p) => {
                    acc[p.category] = (acc[p.category] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>,
                )}
                onAdd={(parentId) => {
                  setNewCategory({
                    name: "",
                    description: "",
                    image: "",
                    active: true,
                    parentId: parentId || "",
                  });
                  setIsEditingCategory(false);
                  setEditingCategoryId(null);
                  setIsAddingCategory(true);
                }}
                onEdit={(cat) => {
                  setNewCategory({
                    name: cat.name,
                    description: cat.description || "",
                    image: cat.image || "",
                    active: cat.active !== false,
                    parentId: cat.parentId || "",
                  });
                  setEditingCategoryId(cat.id);
                  setIsEditingCategory(true);
                  setIsAddingCategory(true);
                }}
                onDelete={(id) =>
                  triggerConfirm(
                    "Excluir categoria",
                    "Tem certeza? Os produtos não serão removidos, mas ficarão sem uma categoria válida.",
                    () => deleteItem("categories", id),
                    true,
                  )
                }
                onToggleActive={handleToggleCategoryActive}
                onReorder={handleReorderCategory}
                onSetCover={(cat) => {
                  setNewCategory({
                    name: cat.name,
                    description: cat.description || "",
                    image: cat.image || "",
                    active: cat.active !== false,
                    parentId: cat.parentId || "",
                  });
                  setEditingCategoryId(cat.id);
                  setIsEditingCategory(true);
                  setIsAddingCategory(true);
                }}
              />
            </AdminPanelRoute>
            <AdminPanelRoute tab="materials">
              <AdminMaterialsPanel
                materials={materials}
                onDeleteMaterial={(id) => deleteItem("materials", id)}
                onAddMaterial={openMaterialForm}
                onToggleStock={(id, current) =>
                  updateStatus("materials", id, { inStock: !current })
                }
                onAdjustStock={handleAdjustMaterialStock}
              />
            </AdminPanelRoute>
            <AdminPanelRoute tab="printers">
              <AdminPrintersPanel
                printers={printers}
                blocked={printersBlocked}
                onAdd={printerAdmin.openNewPrinter}
                onEdit={printerAdmin.openEditPrinter}
                onSetDefault={printerAdmin.handleSetDefaultPrinter}
                onToggleActive={printerAdmin.handleTogglePrinterActive}
                onDelete={(printer) =>
                  triggerConfirm(
                    "Excluir impressora",
                    `"${printer.name}" sai do cadastro. Orçamentos já salvos mantêm os valores usados no cálculo.`,
                    () => printerAdmin.handleDeletePrinter(printer.id),
                    true,
                    "Sim, Excluir",
                  )
                }
              />
            </AdminPanelRoute>
            <AdminPanelRoute tab="calculatorTemplates">
              <AdminCalculatorTemplatesPanel
                onEditInCalculator={(template) => openAdminCalculator({ mode: "NEW", template })}
              />
            </AdminPanelRoute>
            <AdminPanelRoute tab="quotes">
              <AdminQuotesPanel
                quotes={filteredQuotes}
                onSelectQuote={setSelectedCustomer}
                onApproveQuote={handleApproveQuote}
                onDeleteQuote={(type, id) =>
                  triggerConfirm(
                    "Mover orçamento para a lixeira",
                    "O orçamento poderá ser restaurado depois. Se houver um pedido em andamento vinculado, a exclusão será bloqueada.",
                    () => void deleteItem(type, id),
                    true,
                    "Mover para lixeira",
                  )
                }
                onWhatsApp={(q) =>
                  handleWhatsAppQuote(
                    q,
                    q.total || q.estimatedPrice || 45.9,
                    undefined,
                    q.phone,
                    q.infill,
                    q.printTime,
                    q.weight,
                  )
                }
                isApprovingQuote={isApprovingQuote}
                onCreateManual={() => setManualSaleMode("quote")}
                onEditInCalculator={(quote) => openAdminCalculator({ mode: "EDIT", quote })}
                onDuplicateInCalculator={(quote) =>
                  openAdminCalculator({ mode: "DUPLICATE", quote })
                }
                onPrintClient={(quote) => handlePrintSavedQuote(quote, "CLIENT")}
                onPrintProduction={(quote) => handlePrintSavedQuote(quote, "PRODUCTION")}
                onPrintClientBatch={(selected) => handlePrintSavedQuotes(selected, "CLIENT")}
                onPrintProductionBatch={(selected) =>
                  handlePrintSavedQuotes(selected, "PRODUCTION")
                }
                onDeleteQuotes={(selected) =>
                  triggerConfirm(
                    "Mover orçamentos para a lixeira",
                    `${selected.length} orçamento(s) serão movidos. Os vinculados a pedidos em andamento serão preservados.`,
                    () =>
                      void deleteItems(
                        "quotes",
                        selected.map((quote) => quote.id),
                      ),
                    true,
                    "Mover selecionados",
                  )
                }
                trashItems={quoteTrashItems}
                trashBlocked={trashBlocked}
                onRestoreTrash={(entry) =>
                  triggerConfirm(
                    "Restaurar orçamento",
                    `Deseja restaurar “${entry.label}”?`,
                    () => void restoreTrashItem(entry),
                    false,
                    "Restaurar",
                  )
                }
                onDeleteTrashPermanently={(entry) =>
                  triggerConfirm(
                    "Excluir orçamento definitivamente",
                    `“${entry.label}” não poderá mais ser recuperado.`,
                    () => void permanentlyDeleteTrashItem(entry),
                    true,
                    "Excluir de vez",
                  )
                }
                onEmptyTrash={() =>
                  triggerConfirm(
                    "Esvaziar lixeira de orçamentos",
                    `${quoteTrashItems.length} orçamento(s) serão excluídos definitivamente e não poderão ser restaurados.`,
                    () => void emptyTrashItems(quoteTrashItems),
                    true,
                    "Esvaziar lixeira",
                  )
                }
                hasMore={quotesHasMore}
                loadingMore={quotesLoadingMore}
                onLoadMore={loadMoreQuotes}
              />
            </AdminPanelRoute>
            <AdminPanelRoute tab="support">
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
            </AdminPanelRoute>
            <AdminPanelRoute tab="crm">
              <AdminCRMPanel
                customers={filteredCustomers}
                orders={orders}
                searchTerm={searchTerm}
                onSelectCRMUser={setSelectedCRMUser}
                onEditCustomer={openCustomerEditor}
                onAddCustomer={openNewCustomer}
                onExportCSV={exportCustomersToCSV}
              />
            </AdminPanelRoute>
            <AdminPanelRoute tab="faqs">
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
            </AdminPanelRoute>
            <AdminPanelRoute tab="showcase">
              <AdminShowcasePanel
                showcase={showcase}
                onDeleteShowcase={(id) => deleteItem("showcase", id)}
                onAddShowcase={openNewShowcase}
                onEditShowcase={openShowcaseEditor}
              />
            </AdminPanelRoute>
            <AdminPanelRoute tab="coupons">
              <AdminCouponsPanel
                coupons={coupons}
                isAdding={isCouponAdding}
                form={couponForm}
                setForm={setCouponForm}
                onOpen={openCouponForm}
                onCreate={handleCreateCoupon}
                onToggle={handleToggleCoupon}
                onDelete={(id) => void deleteItem("coupons", id)}
                onClose={() => setCouponAdding(false)}
              />
            </AdminPanelRoute>
            <AdminPanelRoute tab="reviews">
              <AdminReviewsPanel />
            </AdminPanelRoute>
            <AdminPanelRoute tab="logs">
              <div className="space-y-5">
                <div className="inline-flex gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1">
                  <button
                    onClick={() => setAuditView("errors")}
                    className={cn(
                      "rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors",
                      auditView === "errors"
                        ? "bg-white/[0.08] text-white"
                        : "text-white/45 hover:text-white",
                    )}
                  >
                    Relatos de Erro
                  </button>
                  <button
                    onClick={() => setAuditView("audit")}
                    className={cn(
                      "rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors",
                      auditView === "audit"
                        ? "bg-white/[0.08] text-white"
                        : "text-white/45 hover:text-white",
                    )}
                  >
                    Ações (Auditoria)
                  </button>
                </div>
                {auditView === "errors" ? (
                  <AdminErrorReportsPanel />
                ) : (
                  <AdminLogsPanel logs={logs} />
                )}
              </div>
            </AdminPanelRoute>
            <AdminPanelRoute tab="trash">
              <AdminTrashPanel
                items={trashItems}
                blocked={trashBlocked}
                onRestore={(entry) =>
                  triggerConfirm(
                    "Restaurar item",
                    `Deseja restaurar “${entry.label}” ao cadastro original?`,
                    () => void restoreTrashItem(entry),
                    false,
                    "Restaurar",
                  )
                }
                onDeletePermanently={(entry) =>
                  triggerConfirm(
                    "Excluir permanentemente",
                    `“${entry.label}” não poderá mais ser recuperado.`,
                    () => void permanentlyDeleteTrashItem(entry),
                    true,
                    "Excluir definitivamente",
                  )
                }
              />
            </AdminPanelRoute>
            <AdminPanelRoute tab="settings">
              <AdminSettingsPanel
                globalSettings={globalSettings}
                machineConfig={machineConfig}
                pricingSettings={pricingSettings}
                companyProfile={companyAdmin.companyProfile}
                isSavingCompany={companyAdmin.isSavingCompany}
                isUploadingLogo={companyAdmin.isUploadingLogo}
                printersCount={printers.length}
                onUpdateGlobalSettings={setGlobalSettings}
                onUpdateMachineConfig={setMachineConfig}
                onUpdatePricingSettings={setPricingSettings}
                onUpdateCompanyField={companyAdmin.updateCompanyField}
                onUpdateCompanyAddress={companyAdmin.updateCompanyAddress}
                onSaveGlobalSettings={handleSaveGlobalSettings}
                onSaveMachineConfig={handleSaveMachineConfig}
                onSavePricingSettings={handleSavePricingSettings}
                onSaveCompany={companyAdmin.handleSaveCompany}
                onUploadCompanyLogo={companyAdmin.handleUploadLogo}
                onOpenPrinters={() => setActiveTab("printers")}
                onToggleMaintenance={toggleMaintenance}
              />
            </AdminPanelRoute>
          </AdminPanelRouter>
        </div>
      </main>

      {/* ── MODALS ── */}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <AdminOrderDetailModal
            order={selectedOrder}
            editingItems={editingItems}
            editedItems={editedItems}
            onClose={() => setSelectedOrder(null)}
            onChangeStatus={(status) => updateStatus("orders", selectedOrder.id, status)}
            onCancelOrder={() =>
              triggerConfirm(
                "Cancelar Pedido",
                `Deseja realmente cancelar o pedido #${selectedOrder.id.slice(0, 12)}? O status será alterado para CANCELADO.`,
                () => {
                  updateStatus("orders", selectedOrder.id, "CANCELED");
                  setSelectedOrder(null);
                },
                true,
                "Sim, Cancelar Pedido",
              )
            }
            onDeleteOrder={() =>
              triggerConfirm(
                "Excluir Pedido",
                `ATENÇÃO: O pedido #${selectedOrder.id.slice(0, 12)} será permanentemente removido do banco de dados. Esta ação não pode ser desfeita.`,
                () => {
                  deleteItem("orders", selectedOrder.id);
                  setSelectedOrder(null);
                },
                true,
                "Sim, Excluir Permanentemente",
              )
            }
            onUpdateTracking={(trackingCode) =>
              handleUpdateTracking(selectedOrder.id, trackingCode)
            }
            onToggleItemEditing={handleToggleItemEditing}
            onUpdateEditedItem={updateEditedItem}
          />
        )}

        {/* Quote Detail Modal */}
        {selectedCustomer && activeTab === "quotes" && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/90 p-2 backdrop-blur-2xl sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative my-auto max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-[24px] border border-white/10 bg-[#090c13] p-4 shadow-2xl shadow-black/60 sm:rounded-[32px] sm:p-7 lg:p-9"
            >
              <button
                onClick={() => setSelectedCustomer(null)}
                className="sticky top-0 z-30 float-right grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#111722]/95 text-white/60 shadow-xl backdrop-blur transition-all hover:border-white/30 hover:text-white"
                aria-label="Fechar editor de orçamento"
              >
                <X className="w-5 h-5" />
              </button>
              {approvalStatus?.success ? (
                <AdminQuoteApprovalSuccess
                  quote={selectedCustomer}
                  approvalStatus={approvalStatus}
                  onSendWhatsApp={() =>
                    handleWhatsAppQuote(
                      selectedCustomer,
                      approvalStatus.finalPrice || 45.9,
                      approvalStatus.orderId,
                      approvalStatus.finalPhone,
                      approvalStatus.finalInfill,
                      approvalStatus.finalTime,
                      approvalStatus.finalWeight,
                    )
                  }
                  onGoToOrders={() => {
                    setSelectedCustomer(null);
                    setApprovalStatus(null);
                    setActiveTab("orders");
                  }}
                />
              ) : (
                <>
                  <AdminQuoteEditorHeader quoteId={selectedCustomer.id} total={editingQuoteTotal} />

                  {"calcSnapshot" in selectedCustomer && selectedCustomer.calcSnapshot && (
                    <AdminQuoteCalcSnapshotNotice
                      onEditInCalculator={() => {
                        openAdminCalculator({ mode: "EDIT", quote: selectedCustomer });
                        setSelectedCustomer(null);
                      }}
                      onDuplicate={() => {
                        openAdminCalculator({ mode: "DUPLICATE", quote: selectedCustomer });
                        setSelectedCustomer(null);
                      }}
                    />
                  )}

                  <AdminQuoteEditorOverview
                    imageUrl={editingQuoteImageUrl}
                    customerName={editingQuoteCustomerName}
                    total={editingQuoteTotal}
                    fileName={editingQuoteFileName}
                    onChangeFileName={setEditingQuoteFileName}
                  />

                  <div className="quote-editor-grid">
                    <AdminQuoteTechnicalSection
                      material={editingQuoteMaterial}
                      quantity={editingQuoteQuantity}
                      unitPrice={editingQuoteUnitPrice}
                      printTime={editingQuoteTime}
                      weight={editingQuoteWeight}
                      infill={editingQuoteInfill}
                      onChangeMaterial={setEditingQuoteMaterial}
                      onChangeQuantity={handleQuantityChange}
                      onChangeUnitPrice={handleUnitPriceChange}
                      onChangePrintTime={setEditingQuoteTime}
                      onChangeWeight={setEditingQuoteWeight}
                      onChangeInfill={setEditingQuoteInfill}
                    />
                    <AdminQuoteCustomerSection
                      name={editingQuoteCustomerName}
                      phone={editingQuotePhone}
                      email={editingQuoteCustomerEmail}
                      notes={editingQuoteCustomerNotes}
                      onChangeName={setEditingQuoteCustomerName}
                      onChangePhone={setEditingQuotePhone}
                      onChangeEmail={setEditingQuoteCustomerEmail}
                      onChangeNotes={setEditingQuoteCustomerNotes}
                    />

                    <AdminQuoteImageSection
                      imageUrl={editingQuoteImageUrl}
                      onChangeImageUrl={setEditingQuoteImageUrl}
                      onUploadImage={handleQuoteImageUpload}
                    />
                    <AdminQuotePricingAssistant
                      isOpen={isCalcAssistantOpen}
                      result={quoteAssistantResult}
                      onToggle={() => setIsCalcAssistantOpen(!isCalcAssistantOpen)}
                      onApplySuggestedPrice={handleQuoteTotalChange}
                    />

                    <AdminQuoteCommercialSection
                      total={editingQuoteTotal}
                      quantity={editingQuoteQuantity}
                      unitPrice={editingQuoteUnitPrice}
                      validUntil={editingQuoteValidUntil}
                      paymentTerms={editingQuotePaymentTerms}
                      showImage={editingQuoteShowImage}
                      onChangeTotal={handleQuoteTotalChange}
                      onChangeValidUntil={setEditingQuoteValidUntil}
                      onChangePaymentTerms={setEditingQuotePaymentTerms}
                      onChangeShowImage={setEditingQuoteShowImage}
                    />

                    <AdminQuoteNotesSection
                      notes={editingQuoteNotes}
                      onChangeNotes={setEditingQuoteNotes}
                    />
                    <AdminQuoteEditorActions
                      documentActions={
                        editingQuotePreview
                          ? {
                              onPrintClientQuote: () =>
                                handlePrintSavedQuote(editingQuotePreview, "CLIENT"),
                              onPrintProductionSheet: () =>
                                handlePrintSavedQuote(editingQuotePreview, "PRODUCTION"),
                            }
                          : null
                      }
                      isApproving={isApprovingQuote}
                      onSendWhatsApp={() =>
                        handleWhatsAppQuote(selectedCustomer, editingQuoteTotal)
                      }
                      onSave={() => handleSaveQuoteSpecifications(selectedCustomer)}
                      onApprove={() =>
                        triggerConfirm(
                          "Aprovar Orçamento",
                          `Aprovar o orçamento de ${editingQuoteCustomerName || "Cliente"} e faturar gerando o pedido?`,
                          () => handleApproveQuote(selectedCustomer),
                        )
                      }
                      onDiscard={() =>
                        triggerConfirm(
                          "Descartar Orçamento",
                          "Tem certeza que deseja excluir permanentemente este orçamento?",
                          () => {
                            deleteItem("quotes", selectedCustomer.id);
                            setSelectedCustomer(null);
                          },
                          true,
                        )
                      }
                    />
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {manualSaleMode && (
          <AdminManualSaleModal
            initialMode={manualSaleMode}
            customers={customers}
            products={products}
            materials={materials}
            onClose={() => setManualSaleMode(null)}
            onSaved={fetchData}
          />
        )}
        <AdminCalculatorWorkspace onQuoteSaved={fetchData} />
        <PrintDocumentHost jobId={printJob?.id} documents={printJob?.documents} />

        <AdminPrinterFormModal
          open={printerAdmin.isPrinterFormOpen}
          isEditing={Boolean(printerAdmin.editingPrinterId)}
          form={printerAdmin.printerForm}
          setForm={printerAdmin.setPrinterForm}
          saving={printerAdmin.isSavingPrinter}
          uploadingPhoto={printerAdmin.isUploadingPrinterPhoto}
          onSubmit={printerAdmin.handlePrinterSubmit}
          onClose={printerAdmin.closePrinterForm}
          onUploadPhoto={printerAdmin.handlePrinterPhotoUpload}
        />

        {selectedCRMUser && (
          <AdminCustomerDetailModal
            customer={selectedCRMUser}
            orders={orders}
            onClose={() => setSelectedCRMUser(null)}
            onEdit={openCustomerEditor}
            onSelectOrder={(order) => {
              setSelectedOrder(order);
              setSelectedCRMUser(null);
            }}
            onEmail={(email) => window.open(`mailto:${email}`)}
            onDelete={(id) => deleteItem("customers", id)}
          />
        )}

        {(isAddingCustomer || isEditingCustomer) && (
          <AdminCustomerFormModal
            isEditing={isEditingCustomer}
            isSubmitting={isSubmittingCustomer}
            customer={newCustomer}
            setCustomer={setNewCustomer}
            onSubmit={handleCustomerSubmit}
            onClose={closeCustomerForm}
          />
        )}

        {isAddingMaterial && (
          <AdminMaterialFormModal
            material={newMaterial}
            setMaterial={setNewMaterial}
            onSubmit={handleMaterialSubmit}
            onClose={closeMaterialForm}
          />
        )}

        {(isAddingShowcase || isEditingShowcase) && (
          <AdminShowcaseFormModal
            isEditing={isEditingShowcase}
            showcase={newShowcase}
            setShowcase={setNewShowcase}
            onSubmit={handleShowcaseSubmit}
            onClose={closeShowcaseForm}
          />
        )}

        {/* Product Form Modal */}
        {(isAddingProduct || isEditingProduct) && (
          <AdminProductFormModal
            isEditing={isEditingProduct}
            product={newProduct}
            setProduct={setNewProduct}
            allCategories={allCategories}
            onAddCustomCategory={setCustomCategories}
            importUrl={productImportUrl}
            setImportUrl={setProductImportUrl}
            isImportingMetadata={isImportingProduct}
            onImportMetadata={handleImportProductMetadata}
            isUploadingImage={isUploadingProductImage}
            onUploadImage={handleProductImageUpload}
            imageUrlDraft={newImageUrl}
            setImageUrlDraft={setNewImageUrl}
            isImportingImage={importingImage}
            onImportImageUrl={handleImportImageUrl}
            translatingField={translatingField}
            setTranslatingField={setTranslatingField}
            onSubmit={handleProductSubmit}
            onClose={() => {
              setIsAddingProduct(false);
              setIsEditingProduct(false);
            }}
          />
        )}

        {/* Category Form Modal */}
        {isAddingCategory && (
          <AdminCategoryFormModal
            isEditing={isEditingCategory}
            category={newCategory}
            setCategory={setNewCategory}
            categories={categories}
            editingCategoryId={editingCategoryId}
            isUploadingImage={isUploadingCategoryImage}
            onUploadImage={handleCategoryImageUpload}
            onSubmit={handleCategorySubmit}
            onClose={() => {
              setIsAddingCategory(false);
              setIsEditingCategory(false);
              setEditingCategoryId(null);
            }}
          />
        )}

        {/* Confirm Dialog */}
        <ConfirmDialog state={confirmState} onCancel={() => setConfirmState(null)} />
      </AnimatePresence>
    </div>
  );
}
