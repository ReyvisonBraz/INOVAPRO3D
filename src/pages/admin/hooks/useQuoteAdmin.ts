import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { auth, db } from "../../../services/firebase";
import type { AdminTabId } from "../../../lib/adminHelpers";
import type { Customer, Quote, Ticket } from "../../../types/domain";

interface Deps {
  customers: Customer[];
  selectedCustomer: Quote | Ticket | null;
  setSelectedCustomer: Dispatch<SetStateAction<Quote | Ticket | null>>;
  activeTab: AdminTabId;
  fetchData: () => Promise<void>;
}

/**
 * Edição de orçamentos: especificações, assistente de precificação,
 * aprovação (vira pedido) e envio da proposta por WhatsApp.
 */
export function useQuoteAdmin({ customers, selectedCustomer, setSelectedCustomer, activeTab, fetchData }: Deps) {
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
  }, [editingQuoteTotal, editingQuoteInfill, editingQuoteTime, editingQuoteWeight, editingQuoteNotes, editingQuotePhone, setSelectedCustomer, fetchData]);

  return {
    editingQuoteTotal, setEditingQuoteTotal,
    editingQuoteWeight, setEditingQuoteWeight,
    editingQuoteTime, setEditingQuoteTime,
    editingQuoteInfill, setEditingQuoteInfill,
    editingQuotePhone, setEditingQuotePhone,
    editingQuoteNotes, setEditingQuoteNotes,
    isCalcAssistantOpen, setIsCalcAssistantOpen,
    calcFilamentPrice, setCalcFilamentPrice,
    calcHourCost, setCalcHourCost,
    calcSetupFee, setCalcSetupFee,
    calcMargin, setCalcMargin,
    approvalStatus, setApprovalStatus,
    handleWhatsAppQuote,
    handleApproveQuote,
    handleSaveQuoteSpecifications,
  };
}
