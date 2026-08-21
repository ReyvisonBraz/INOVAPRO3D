import { useCallback, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createFAQ, type FAQDraft } from "../../../services/faqs";

const emptyFAQ = (): FAQDraft => ({ question: "", answer: "" });

interface UseFAQAdminOptions {
  fetchData: () => void | Promise<void>;
}

export function useFAQAdmin({ fetchData }: UseFAQAdminOptions) {
  const [isAddingFAQ, setIsAddingFAQ] = useState(false);
  const [isSubmittingFAQ, setIsSubmittingFAQ] = useState(false);
  const [newFAQ, setNewFAQ] = useState<FAQDraft>(emptyFAQ);

  const handleFAQSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (isSubmittingFAQ) return;
      setIsSubmittingFAQ(true);
      try {
        await createFAQ(newFAQ);
        toast.success("FAQ adicionado!");
        setIsAddingFAQ(false);
        setNewFAQ(emptyFAQ());
        void fetchData();
      } catch {
        toast.error("Erro ao adicionar FAQ.");
      } finally {
        setIsSubmittingFAQ(false);
      }
    },
    [fetchData, isSubmittingFAQ, newFAQ],
  );

  return {
    isAddingFAQ,
    setIsAddingFAQ,
    newFAQ,
    setNewFAQ,
    handleFAQSubmit,
  };
}
