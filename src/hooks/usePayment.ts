// Hook simplificado para processamento de pagamentos
// Foca na lógica de negócio, delega integração para o serviço

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ApiClientError, formatSupportCode, readApiError } from "../lib/apiError";

export interface ProcessPaymentResult {
  success: boolean;
  pixCode?: string;
  qrCodeBase64?: string;
  qrCodeUrl?: string;
  /** Vencimento definido pelo servidor, em ISO 8601. */
  expiresAt?: string;
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
        throw await readApiError(response, "Não foi possível gerar o Pix agora. Tente novamente.");
      }

      const data = await response.json();

      if (data.pixCode) {
        return {
          success: true,
          pixCode: data.pixCode,
          qrCodeBase64: data.qrCodeBase64,
          qrCodeUrl: data.qrCodeUrl,
          expiresAt: data.expiresAt,
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
      const supportCode =
        err instanceof ApiClientError ? formatSupportCode(err.correlationId) : null;
      toast.error(message, {
        description: supportCode ? `Código de atendimento: ${supportCode}` : undefined,
      });
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
