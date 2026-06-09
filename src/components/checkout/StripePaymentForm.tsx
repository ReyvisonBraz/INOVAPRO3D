import React, { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "../ui/Button";
import { ArrowRight, Lock } from "lucide-react";

interface Props {
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onBack: () => void;
}

export function StripePaymentForm({ orderId, amount, onSuccess, onError, onBack }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const returnUrl = `${window.location.origin}/checkout?order_id=${orderId}&redirect_status=succeeded`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || processing) return;

    setProcessing(true);

    // Submit form data to Stripe first (validates fields)
    const { error: submitError } = await elements.submit();
    if (submitError) {
      onError(submitError.message ?? "Verifique os dados do pagamento.");
      setProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required', // redirect only for methods that need it (PIX)
    });

    if (error) {
      onError(error.message ?? "Erro ao processar pagamento.");
      setProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      // Card payment confirmed immediately
      onSuccess();
    }
    // If redirect happened (PIX), browser leaves the page — handled on return
  };

  const busy = !stripe || !elements || processing;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <PaymentElement
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card', 'pix'],
          fields: { billingDetails: { email: 'never' } },
        }}
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          type="button"
          variant="outline"
          className="h-20 rounded-3xl flex-1 text-sm font-black uppercase tracking-widest border-white/10"
          onClick={onBack}
          disabled={processing}
        >
          Logística
        </Button>
        <Button
          type="submit"
          isShimmer
          loading={processing}
          disabled={busy}
          size="lg"
          className="h-20 rounded-3xl flex-[2] gap-4 text-xl font-display font-black uppercase tracking-tight"
        >
          {processing
            ? "PROCESSANDO..."
            : `PAGAR R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          <ArrowRight className="w-6 h-6" />
        </Button>
      </div>

      <p className="flex items-center gap-2 text-[10px] text-white/25 font-medium">
        <Lock className="w-3 h-3 shrink-0" />
        Pagamento processado com segurança pela Stripe. Seus dados nunca passam pelos nossos servidores.
      </p>
    </form>
  );
}
