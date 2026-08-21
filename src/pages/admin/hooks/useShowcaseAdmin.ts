import { useCallback, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  createShowcaseItem,
  updateShowcaseItem,
  type ShowcaseDraft,
} from "../../../services/showcase";
import { handleFirestoreError, OperationType } from "../../../services/firebase";
import type { ShowcaseItem } from "../../../types/domain";

const emptyShowcase = (): ShowcaseDraft => ({
  title: "",
  subtitle: "",
  image: "",
  link: "",
  active: true,
});

interface UseShowcaseAdminOptions {
  fetchData: () => void | Promise<void>;
}

export function useShowcaseAdmin({ fetchData }: UseShowcaseAdminOptions) {
  const [isAddingShowcase, setIsAddingShowcase] = useState(false);
  const [isEditingShowcase, setIsEditingShowcase] = useState(false);
  const [isSubmittingShowcase, setIsSubmittingShowcase] = useState(false);
  const [selectedShowcase, setSelectedShowcase] = useState<ShowcaseItem | null>(null);
  const [newShowcase, setNewShowcase] = useState<ShowcaseDraft>(emptyShowcase);

  const openNewShowcase = useCallback(() => {
    setNewShowcase(emptyShowcase());
    setIsAddingShowcase(true);
  }, []);

  const openShowcaseEditor = useCallback((item: ShowcaseItem) => {
    setSelectedShowcase(item);
    setNewShowcase({
      title: item.title || "",
      subtitle: item.subtitle || "",
      image: item.image || "",
      link: item.link || "",
      active: item.active !== undefined ? item.active : true,
    });
    setIsEditingShowcase(true);
  }, []);

  const closeShowcaseForm = useCallback(() => {
    setIsAddingShowcase(false);
    setIsEditingShowcase(false);
  }, []);

  const handleShowcaseSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (isSubmittingShowcase) return;
      setIsSubmittingShowcase(true);
      try {
        if (isEditingShowcase && selectedShowcase) {
          await updateShowcaseItem(selectedShowcase.id, newShowcase);
          toast.success("Item da vitrine atualizado!");
        } else {
          await createShowcaseItem(newShowcase);
          toast.success("Item adicionado à vitrine!");
        }
        setIsAddingShowcase(false);
        setIsEditingShowcase(false);
        void fetchData();
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "showcase");
      } finally {
        setIsSubmittingShowcase(false);
      }
    },
    [fetchData, isEditingShowcase, isSubmittingShowcase, newShowcase, selectedShowcase],
  );

  return {
    isAddingShowcase,
    isEditingShowcase,
    newShowcase,
    setNewShowcase,
    openNewShowcase,
    openShowcaseEditor,
    closeShowcaseForm,
    handleShowcaseSubmit,
  };
}
