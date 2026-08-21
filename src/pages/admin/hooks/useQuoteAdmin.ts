import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { auth, db } from "../../../services/firebase";
import type { AdminTabId } from "../../../lib/adminHelpers";
import type { Customer, Quote, Ticket } from "../../../types/domain";
import { buildCommercialQuoteMessage } from "../../../lib/quoteMessage";

interface Deps {
  customers: Customer[];
  selectedCustomer: Quote | Ticket | null;
  setSelectedCustomer: Dispatch<SetStateAction<Quote | Ticket | null>>;
  activeTab: AdminTabId;
  fetchData: () => Promise<void>;
}

export interface QuoteApprovalStatus {
  success: boolean;
  orderId?: string;
  finalPrice?: number;
  finalInfill?: number;
  finalTime?: string;
  finalWeight?: number;
  finalPhone?: string;
  finalNotes?: string;
}

function isQuote(record: Quote | Ticket): record is Quote {
  return (
    typeof record.fileName === "string" &&
    typeof record.materialId === "string" &&
    typeof record.infill === "number"
  );
}

const roundMoney = (value: number): number => Number(Number(value).toFixed(2));

/**
 * Edição de orçamentos: especificações, abertura do motor de precificação,
 * aprovação (vira pedido) e envio da proposta por WhatsApp.
 */
export function useQuoteAdmin({
  customers,
  selectedCustomer,
  setSelectedCustomer,
  activeTab,
  fetchData,
}: Deps) {
  const [editingQuoteTotal, setEditingQuoteTotal] = useState(45.9);
  const [editingQuoteWeight, setEditingQuoteWeight] = useState(30);
  const [editingQuoteTime, setEditingQuoteTime] = useState("2h 30m");
  const [editingQuoteInfill, setEditingQuoteInfill] = useState(20);
  const [editingQuotePhone, setEditingQuotePhone] = useState("");
  const [editingQuoteNotes, setEditingQuoteNotes] = useState("");
  const [editingQuoteFileName, setEditingQuoteFileName] = useState("");
  const [editingQuoteMaterial, setEditingQuoteMaterial] = useState("");
  const [editingQuoteQuantity, setEditingQuoteQuantity] = useState(1);
  const [editingQuoteUnitPrice, setEditingQuoteUnitPrice] = useState(0);
  const [editingQuoteImageUrl, setEditingQuoteImageUrl] = useState("");
  const [editingQuoteCustomerNotes, setEditingQuoteCustomerNotes] = useState("");
  const [editingQuoteCustomerName, setEditingQuoteCustomerName] = useState("");
  const [editingQuoteCustomerEmail, setEditingQuoteCustomerEmail] = useState("");
  const [editingQuoteValidUntil, setEditingQuoteValidUntil] = useState("");
  const [editingQuotePaymentTerms, setEditingQuotePaymentTerms] = useState("");
  const [editingQuoteShowImage, setEditingQuoteShowImage] = useState(true);
  const [isCalcAssistantOpen, setIsCalcAssistantOpen] = useState(false);
  const [isApprovingQuote, setIsApprovingQuote] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<QuoteApprovalStatus | null>(null);

  useEffect(() => {
    if (selectedCustomer && activeTab === "quotes") {
      const quoteRecord = isQuote(selectedCustomer) ? selectedCustomer : null;
      setEditingQuoteTotal(
        roundMoney(selectedCustomer.estimatedPrice || selectedCustomer.total || 45.9),
      );
      setEditingQuoteWeight(selectedCustomer.weight || 30);
      setEditingQuoteTime(selectedCustomer.printTime || "2h 30m");
      setEditingQuoteInfill(selectedCustomer.infill || 20);
      setEditingQuoteNotes(selectedCustomer.adminNotes || "");
      setEditingQuoteFileName(selectedCustomer.fileName || "");
      setEditingQuoteMaterial(selectedCustomer.materialId || "");
      const quantity = Math.max(1, Number(quoteRecord?.quantity) || 1);
      setEditingQuoteQuantity(quantity);
      const unitPrice = Number(quoteRecord?.unitPrice) || 0;
      setEditingQuoteUnitPrice(
        roundMoney(
          unitPrice > 0
            ? unitPrice
            : (selectedCustomer.total || selectedCustomer.estimatedPrice || 0) / quantity,
        ),
      );
      setEditingQuoteImageUrl(quoteRecord?.imageUrl || "");
      setEditingQuoteCustomerNotes(selectedCustomer.notes || "");
      setEditingQuoteCustomerName(selectedCustomer.userName || "");
      setEditingQuoteCustomerEmail(selectedCustomer.userEmail || "");
      setEditingQuoteValidUntil(quoteRecord?.validUntil || "");
      setEditingQuotePaymentTerms(quoteRecord?.paymentTerms || "");
      setEditingQuoteShowImage(quoteRecord?.showImageOnQuote !== false);
      const matchedCustomer = customers.find(
        (c) =>
          (c.email &&
            selectedCustomer.userEmail &&
            c.email.toLowerCase() === selectedCustomer.userEmail.toLowerCase()) ||
          c.id === selectedCustomer.userId,
      );
      setEditingQuotePhone(matchedCustomer?.phone || selectedCustomer.phone || "");
    }
  }, [selectedCustomer, activeTab, customers]);

  useEffect(() => {
    if (!selectedCustomer) setApprovalStatus(null);
  }, [selectedCustomer]);

  const handleQuantityChange = useCallback(
    (quantity: number) => {
      const qty = Math.max(1, Math.floor(Number(quantity) || 1));
      setEditingQuoteQuantity(qty);
      setEditingQuoteTotal(roundMoney(editingQuoteUnitPrice * qty));
    },
    [editingQuoteUnitPrice],
  );

  const handleUnitPriceChange = useCallback(
    (unitPrice: number) => {
      const unit = Math.max(0, Number(unitPrice) || 0);
      setEditingQuoteUnitPrice(unit);
      setEditingQuoteTotal(roundMoney(unit * editingQuoteQuantity));
    },
    [editingQuoteQuantity],
  );

  const handleQuoteTotalChange = useCallback(
    (total: number) => {
      const value = Math.max(0, Number(total) || 0);
      setEditingQuoteTotal(value);
      setEditingQuoteUnitPrice(roundMoney(value / Math.max(1, editingQuoteQuantity)));
    },
    [editingQuoteQuantity],
  );

  const handleWhatsAppQuote = useCallback(
    (
      q: Quote | Ticket,
      finalPrice: number,
      orderId?: string,
      phoneOverride?: string,
      _infillOverride?: number,
      _timeOverride?: string,
      _weightOverride?: number,
    ) => {
      const rawPhone = phoneOverride !== undefined ? phoneOverride : editingQuotePhone;
      const phoneClean = (rawPhone || "").replace(/\D/g, "");
      if (!phoneClean) {
        toast.error("Preencha o celular do cliente.");
        return;
      }
      const quantity =
        "quantity" in q && Number(q.quantity) > 0
          ? Number(q.quantity)
          : Math.max(1, Number(editingQuoteQuantity) || 1);
      const projectName =
        selectedCustomer?.id === q.id && editingQuoteFileName ? editingQuoteFileName : q.fileName;
      const text = buildCommercialQuoteMessage({
        customerName: q.userName,
        projectName,
        quantity,
        total: finalPrice,
        orderId,
      });
      window.open(
        `https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodeURIComponent(text)}`,
        "_blank",
      );
    },
    [editingQuotePhone, editingQuoteQuantity, editingQuoteFileName, selectedCustomer],
  );

  const handleApproveQuote = useCallback(
    async (quote: Quote | Ticket) => {
      if (isApprovingQuote) return;
      if (!isQuote(quote)) {
        toast.error("Este registro não é um orçamento válido para faturamento.");
        return;
      }
      setIsApprovingQuote(true);
      try {
        const isSelected = selectedCustomer?.id === quote.id;
        const finalPrice = isSelected
          ? editingQuoteTotal
          : quote.estimatedPrice || quote.total || 45.9;
        if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
          toast.error("Defina o valor final do orçamento antes de aprovar.");
          return;
        }
        const finalInfill = isSelected ? editingQuoteInfill : quote.infill || 20;
        const finalTime = isSelected ? editingQuoteTime : quote.printTime || "2h 30m";
        const finalWeight = isSelected ? editingQuoteWeight : quote.weight || 30;
        const finalNotes = isSelected ? editingQuoteNotes : quote.adminNotes || "";
        const finalFileName = isSelected ? editingQuoteFileName : quote.fileName || "";
        const finalMaterial = isSelected ? editingQuoteMaterial : quote.materialId || "PLA Pro";
        const finalQuantity = isSelected
          ? Math.max(1, editingQuoteQuantity)
          : Math.max(1, Number(quote.quantity) || 1);
        const matchedCustomer = customers.find(
          (c) =>
            (c.email &&
              quote.userEmail &&
              c.email.toLowerCase() === quote.userEmail.toLowerCase()) ||
            c.id === quote.userId,
        );
        const finalPhone = isSelected
          ? editingQuotePhone
          : matchedCustomer?.phone || quote.phone || "";
        const finalImage = (isSelected ? editingQuoteImageUrl : quote.imageUrl) || "";
        const fallbackImage =
          "https://images.unsplash.com/photo-1615810231586-52233952673d?q=80&w=400";

        const orderItems = quote.items?.length
          ? quote.items.map((item, index) =>
              index === 0 && !item.image && finalImage ? { ...item, image: finalImage } : item,
            )
          : [
              {
                name: finalFileName || "Impressão Personalizada",
                quantity: finalQuantity,
                price: finalPrice,
                image: finalImage || fallbackImage,
                options: {
                  material: finalMaterial,
                  infill: finalInfill,
                  printTime: finalTime,
                  weight: finalWeight,
                  adminNotes: finalNotes,
                },
              },
            ];

        const orderRef = await addDoc(collection(db, "orders"), {
          userId: quote.userId || "guest",
          userEmail: editingQuoteCustomerEmail.trim() || quote.userEmail || "",
          userName: editingQuoteCustomerName.trim() || quote.userName || "Visitante",
          customerId: quote.customerId || matchedCustomer?.id || null,
          items: orderItems,
          materialUsages: quote.materialUsages || [],
          ...(quote.calculationProject ? { calculationProject: quote.calculationProject } : {}),
          ...(quote.calcSnapshot ? { calcSnapshot: quote.calcSnapshot } : {}),
          source: "quote",
          total: finalPrice,
          status: "PENDING_PAYMENT",
          quoteId: quote.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "quotes", quote.id), {
          status: "CONVERTED_TO_ORDER",
          convertedOrderId: orderRef.id,
          total: finalPrice,
          printTime: finalTime,
          weight: finalWeight,
          infill: finalInfill,
          adminNotes: finalNotes,
          userName: editingQuoteCustomerName.trim() || quote.userName || "Cliente",
          userEmail: editingQuoteCustomerEmail.trim() || quote.userEmail || "",
          phone: finalPhone.replace(/\D/g, ""),
          notes: editingQuoteCustomerNotes,
          paymentTerms: editingQuotePaymentTerms.trim(),
          validUntil: editingQuoteValidUntil,
          showImageOnQuote: editingQuoteShowImage,
          updatedAt: serverTimestamp(),
        });
        await addDoc(collection(db, "logs"), {
          action: "TRANSFORM_QUOTE_TO_ORDER",
          details: `Orçamento de ${quote.userName} convertido em pedido #${orderRef.id}`,
          adminId: auth.currentUser?.uid,
          userEmail: quote.userEmail,
          createdAt: serverTimestamp(),
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
          finalNotes,
        });
        fetchData();
      } catch {
        toast.error("Falha na conversão do orçamento.");
      } finally {
        setIsApprovingQuote(false);
      }
    },
    [
      isApprovingQuote,
      selectedCustomer,
      editingQuoteTotal,
      editingQuoteInfill,
      editingQuoteTime,
      editingQuoteWeight,
      editingQuoteNotes,
      editingQuotePhone,
      editingQuoteFileName,
      editingQuoteMaterial,
      editingQuoteQuantity,
      editingQuoteImageUrl,
      editingQuoteCustomerName,
      editingQuoteCustomerEmail,
      editingQuoteCustomerNotes,
      editingQuotePaymentTerms,
      editingQuoteValidUntil,
      editingQuoteShowImage,
      customers,
      fetchData,
    ],
  );

  const handleSaveQuoteSpecifications = useCallback(
    async (quote: Quote | Ticket) => {
      try {
        const phoneClean = editingQuotePhone.replace(/\D/g, "");
        const quantity = Math.max(1, Math.floor(Number(editingQuoteQuantity) || 1));
        const unitPrice = Math.max(0, Number(editingQuoteUnitPrice) || 0);
        const imagePayload =
          editingQuoteImageUrl.trim() !== "" ? { imageUrl: editingQuoteImageUrl.trim() } : {};
        await updateDoc(doc(db, "quotes", quote.id), {
          fileName: editingQuoteFileName.trim() || "Peça personalizada",
          materialId: editingQuoteMaterial.trim() || "PLA Pro",
          quantity,
          unitPrice,
          total: editingQuoteTotal,
          infill: editingQuoteInfill,
          printTime: editingQuoteTime,
          weight: editingQuoteWeight,
          adminNotes: editingQuoteNotes,
          notes: editingQuoteCustomerNotes,
          userName: editingQuoteCustomerName.trim() || "Cliente",
          userEmail: editingQuoteCustomerEmail.trim(),
          validUntil: editingQuoteValidUntil,
          paymentTerms: editingQuotePaymentTerms.trim(),
          showImageOnQuote: editingQuoteShowImage,
          phone: phoneClean,
          ...imagePayload,
          ...(isQuote(quote) && quote.calcSnapshot ? { calcSnapshotStale: true } : {}),
          updatedAt: serverTimestamp(),
        });
        if (editingQuoteImageUrl.trim() === "") {
          await updateDoc(doc(db, "quotes", quote.id), { imageUrl: deleteField() });
        }

        const isQuoteRecord = isQuote(quote);
        const convertedOrderId = isQuoteRecord ? quote.convertedOrderId : undefined;
        if (convertedOrderId) {
          const orderSnap = await getDoc(doc(db, "orders", convertedOrderId));
          if (orderSnap.exists()) {
            const orderData = orderSnap.data();
            const currentItems: Array<Record<string, unknown>> = Array.isArray(orderData?.items)
              ? orderData.items
              : [];
            const items =
              currentItems.length === 1
                ? currentItems.map((item) => ({
                    ...item,
                    name: editingQuoteFileName.trim() || item.name,
                    quantity,
                    price: editingQuoteTotal,
                    ...(editingQuoteImageUrl.trim() ? { image: editingQuoteImageUrl.trim() } : {}),
                    options: {
                      ...((item.options as Record<string, unknown>) || {}),
                      material: editingQuoteMaterial.trim() || "PLA Pro",
                      infill: editingQuoteInfill,
                      printTime: editingQuoteTime,
                      weight: editingQuoteWeight,
                      adminNotes: editingQuoteNotes,
                    },
                  }))
                : currentItems;
            await updateDoc(doc(db, "orders", convertedOrderId), {
              total: editingQuoteTotal,
              items,
              userName: editingQuoteCustomerName.trim() || "Cliente",
              userEmail: editingQuoteCustomerEmail.trim(),
              phone: phoneClean,
              updatedAt: serverTimestamp(),
            });
          }
        }

        setSelectedCustomer((prev) =>
          prev
            ? {
                ...prev,
                fileName: editingQuoteFileName.trim() || "Peça personalizada",
                materialId: editingQuoteMaterial.trim() || "PLA Pro",
                quantity,
                unitPrice,
                total: editingQuoteTotal,
                infill: editingQuoteInfill,
                printTime: editingQuoteTime,
                weight: editingQuoteWeight,
                adminNotes: editingQuoteNotes,
                notes: editingQuoteCustomerNotes,
                userName: editingQuoteCustomerName.trim() || "Cliente",
                userEmail: editingQuoteCustomerEmail.trim(),
                validUntil: editingQuoteValidUntil,
                paymentTerms: editingQuotePaymentTerms.trim(),
                showImageOnQuote: editingQuoteShowImage,
                imageUrl:
                  editingQuoteImageUrl.trim() || (isQuote(prev) ? prev.imageUrl : undefined),
                phone: phoneClean,
                ...(isQuote(prev) && prev.calcSnapshot ? { calcSnapshotStale: true } : {}),
              }
            : null,
        );
        fetchData();
        toast.success("Especificações do orçamento salvas!");
      } catch {
        toast.error("Falha ao salvar especificações.");
      }
    },
    [
      editingQuoteTotal,
      editingQuoteInfill,
      editingQuoteTime,
      editingQuoteWeight,
      editingQuoteNotes,
      editingQuotePhone,
      editingQuoteFileName,
      editingQuoteMaterial,
      editingQuoteQuantity,
      editingQuoteUnitPrice,
      editingQuoteImageUrl,
      editingQuoteCustomerNotes,
      editingQuoteCustomerName,
      editingQuoteCustomerEmail,
      editingQuoteValidUntil,
      editingQuotePaymentTerms,
      editingQuoteShowImage,
      setSelectedCustomer,
      fetchData,
    ],
  );

  return {
    editingQuoteTotal,
    setEditingQuoteTotal,
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
    setEditingQuoteUnitPrice,
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
  };
}
