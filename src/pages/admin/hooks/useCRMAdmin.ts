import { useCallback, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createCustomer, updateCustomer, type CustomerDraft } from "../../../services/customers";
import type { Customer } from "../../../types/domain";

const emptyCustomer = (): CustomerDraft => ({
  name: "",
  email: "",
  phone: "",
  secondaryPhone: "",
  whatsapp: "",
  tags: [],
  address: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  customerType: "PERSON",
  document: "",
  zipCode: "",
  city: "",
  state: "",
  source: "",
  preferredContact: "WHATSAPP",
  birthday: "",
  notes: "",
  internalNotes: "",
});

interface UseCRMAdminOptions {
  customers: Customer[];
  fetchData: () => void | Promise<void>;
}

export function useCRMAdmin({ customers, fetchData }: UseCRMAdminOptions) {
  const [selectedCRMUser, setSelectedCRMUser] = useState<Customer | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState<CustomerDraft>(emptyCustomer);

  const openNewCustomer = useCallback(() => {
    setIsAddingCustomer(true);
    setIsEditingCustomer(false);
    setNewCustomer(emptyCustomer());
  }, []);

  const openCustomerEditor = useCallback((customer: Customer) => {
    setSelectedCRMUser(customer);
    setNewCustomer({
      ...emptyCustomer(),
      name: customer.name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      secondaryPhone: customer.secondaryPhone ?? "",
      whatsapp: customer.whatsapp ?? "",
      tags: customer.tags ?? [],
      customerType: customer.customerType ?? "PERSON",
      document: customer.document ?? "",
      zipCode: customer.zipCode ?? "",
      address: customer.address ?? "",
      street: customer.street ?? "",
      number: customer.number ?? "",
      complement: customer.complement ?? "",
      neighborhood: customer.neighborhood ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      source: customer.source ?? "",
      preferredContact: customer.preferredContact ?? "WHATSAPP",
      birthday: customer.birthday ?? "",
      notes: customer.notes ?? "",
      internalNotes: customer.internalNotes ?? "",
    });
    setIsAddingCustomer(false);
    setIsEditingCustomer(true);
  }, []);

  const closeCustomerForm = useCallback(() => {
    setIsAddingCustomer(false);
    setIsEditingCustomer(false);
  }, []);

  const handleCustomerSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (isSubmittingCustomer) return;
      if (!newCustomer.name.trim()) return toast.error("Informe o nome do cliente.");
      if (
        ![newCustomer.email, newCustomer.phone, newCustomer.whatsapp].some((value) => value.trim())
      ) {
        return toast.error("Informe pelo menos um contato: email, telefone ou WhatsApp.");
      }
      setIsSubmittingCustomer(true);
      try {
        if (isEditingCustomer && selectedCRMUser) {
          await updateCustomer(selectedCRMUser.id, newCustomer);
          toast.success("Dados do cliente atualizados!");
        } else {
          await createCustomer(newCustomer);
          toast.success("Cliente cadastrado manualmente!");
        }
        setIsAddingCustomer(false);
        setIsEditingCustomer(false);
        setSelectedCRMUser(null);
        setNewCustomer(emptyCustomer());
        void fetchData();
      } catch {
        toast.error("Erro ao processar operação de cliente.");
      } finally {
        setIsSubmittingCustomer(false);
      }
    },
    [fetchData, isEditingCustomer, isSubmittingCustomer, newCustomer, selectedCRMUser],
  );

  const exportCustomersToCSV = useCallback(() => {
    try {
      const headers = ["Nome", "Email", "Telefone", "Tags", "Data de Cadastro"];
      const escapeCSV = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const rows = customers.map((customer) => [
        escapeCSV(customer.name),
        escapeCSV(customer.email),
        escapeCSV(customer.phone),
        escapeCSV((customer.tags || []).join("; ")),
        escapeCSV(
          customer.createdAt
            ? new Date(customer.createdAt.seconds * 1000).toLocaleDateString()
            : "N/A",
        ),
      ]);
      const csvContent =
        "data:text/csv;charset=utf-8," +
        headers.map(escapeCSV).join(",") +
        "\n" +
        rows.map((row) => row.join(",")).join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `clientes_INOVAPRO_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exportação de CRM concluída!");
    } catch {
      toast.error("Falha ao gerar arquivo CSV.");
    }
  }, [customers]);

  return {
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
  };
}
