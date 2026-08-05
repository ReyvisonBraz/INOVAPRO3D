// Hook simplificado para processamento de pagamentos
// Foca na lógica de negócio, delega integração para o serviço

import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface ProcessPaymentResult {
  success: boolean;
  pixCode?: string;
  qrCodeBase64?: string;
  qrCodeUrl?: string;
  expirationDate?: string;
  paymentId?: string;
  status?: string;
}

interface UsePaymentReturn {
  loading: boolean;
  error: string | null;
  processPayment: (orderId: string) => Promise<ProcessPaymentResult>;
  reset: () => void;
}

export function usePayment(): UsePaymentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayment = useCallback(async (orderId: string): Promise<ProcessPaymentResult> => {
    setLoading(true);
    setError(null);

    try {
      const user = await getAuthUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const idToken = await user.getIdToken();
      const response = await fetch("/api/mercadopago/process-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId,
          paymentMethod: "pix",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao processar pagamento");
      }

      const data = await response.json();

      if (data.pixCode) {
        return {
          success: true,
          pixCode: data.pixCode,
          qrCodeBase64: data.qrCodeBase64,
          qrCodeUrl: data.qrCodeUrl,
          expirationDate: data.expirationDate,
          paymentId: data.paymentId,
        };
      }

      if (data.status === "approved") {
        return {
          success: true,
          paymentId: data.paymentId,
          status: data.status,
        };
      }

      return {
        success: false,
        paymentId: data.paymentId,
        status: data.status,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(message);
      toast.error(message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    processPayment,
    reset,
  };
}

// Helper para obter usuário autenticado
async function getAuthUser() {
  const { auth } = await import("../services/firebase");
  return auth.currentUser;
}
