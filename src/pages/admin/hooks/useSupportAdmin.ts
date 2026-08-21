import { useCallback, useState } from "react";
import { toast } from "sonner";
import { sendTicketReply, updateTicketStatus } from "../../../services/support";
import type { Ticket } from "../../../types/domain";

interface UseSupportAdminOptions {
  selectedTicket: Ticket | null;
  fetchData: () => void | Promise<void>;
}

export function useSupportAdmin({ selectedTicket, fetchData }: UseSupportAdminOptions) {
  const [replyText, setReplyText] = useState("");

  const handleSendReply = useCallback(async () => {
    if (!selectedTicket || !replyText.trim()) return;
    try {
      await sendTicketReply(selectedTicket, replyText);
      setReplyText("");
      toast.success("Resposta enviada e log registrada!");
      void fetchData();
    } catch {
      toast.error("Erro ao enviar resposta.");
    }
  }, [fetchData, replyText, selectedTicket]);

  const handleUpdateTicket = useCallback(
    async (id: string, status: string) => {
      try {
        await updateTicketStatus(id, status);
        toast.success(`Ticket ${status.toLowerCase()}!`);
        void fetchData();
      } catch {
        toast.error("Erro ao atualizar ticket.");
      }
    },
    [fetchData],
  );

  return {
    replyText,
    setReplyText,
    handleSendReply,
    handleUpdateTicket,
  };
}
