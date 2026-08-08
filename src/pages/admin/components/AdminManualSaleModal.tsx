import { useMemo, useState, type FormEvent } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { auth, db } from "../../../services/firebase";
import { Button } from "../../../components/ui/Button";
import type { Customer, Material, MaterialUsage, OrderItem, Product } from "../../../types/domain";

interface Props {
  initialMode: "order" | "quote";
  customers: Customer[];
  products: Product[];
  materials: Material[];
  onClose: () => void;
  onSaved: () => void;
}

const fieldClass = "admin-input w-full";

export function AdminManualSaleModal({
  initialMode,
  customers,
  products,
  materials,
  onClose,
  onSaved,
}: Props) {
  const [mode, setMode] = useState(initialMode);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [materialId, setMaterialId] = useState("");
  const [grams, setGrams] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [shippingRate, setShippingRate] = useState(0);
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);

  const customer = customers.find((entry) => entry.id === customerId);
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const total = Math.max(0, subtotal - discount + shippingRate);
  const usages = items.flatMap((item) => item.materialUsages ?? []);

  const addItem = () => {
    if (!name.trim() || price < 0 || quantity < 1)
      return toast.error("Preencha nome, quantidade e valor do item.");
    const id = crypto.randomUUID();
    const selectedMaterial = materials.find((entry) => entry.id === materialId);
    const materialUsages: MaterialUsage[] =
      materialId && grams > 0
        ? [
            {
              materialId,
              materialName: selectedMaterial?.name,
              itemId: id,
              estimatedGrams: grams,
              reservedGrams: 0,
              consumedGrams: 0,
            },
          ]
        : [];
    setItems((current) => [
      ...current,
      {
        id,
        name: name.trim(),
        price,
        quantity,
        type: "PRODUCT",
        materialId: materialId || undefined,
        materialUsages,
      },
    ]);
    setName("");
    setPrice(0);
    setQuantity(1);
    setMaterialId("");
    setGrams(0);
  };

  const addCatalogProduct = (productId: string) => {
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;
    setName(product.name);
    setPrice(product.basePrice);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!customer || !items.length)
      return toast.error("Selecione o cliente e adicione pelo menos um item.");
    setSaving(true);
    try {
      const common = {
        customerId: customer.id,
        userId: customer.id,
        userName: customer.name ?? "Cliente",
        userEmail: customer.email ?? "",
        phone: customer.whatsapp || customer.phone || "",
        items,
        materialUsages: usages,
        subtotal,
        discount,
        shippingRate,
        total,
        customerNotes,
        internalNotes,
        source: "manual",
        createdBy: auth.currentUser?.uid ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (mode === "order") {
        await addDoc(collection(db, "orders"), {
          ...common,
          status: "PENDING_PAYMENT",
          paymentMethod: "manual",
        });
      } else {
        const first = items[0];
        await addDoc(collection(db, "quotes"), {
          ...common,
          status: "PENDING",
          fileName: first.name,
          materialId: first.materialId || "manual",
          infill: first.infill ?? 20,
          estimatedPrice: total,
          validUntil: validUntil || null,
        });
      }
      toast.success(mode === "order" ? "Pedido manual criado." : "Orcamento manual criado.");
      await onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel salvar. Verifique sua permissao de administrador.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/75 p-3 backdrop-blur-md sm:p-6">
      <form
        onSubmit={submit}
        className="mx-auto my-3 max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#11141b] shadow-2xl sm:my-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4 sm:px-6">
          <div>
            <p className="admin-eyebrow">Venda assistida</p>
            <h2 className="text-lg font-semibold text-white">Montador manual</h2>
            <p className="mt-1 text-xs text-white/40">
              Crie a proposta e registre o consumo de producao no mesmo fluxo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "order" | "quote")}
              className={fieldClass}
            >
              <option value="order">Criar pedido</option>
              <option value="quote">Criar orcamento</option>
            </select>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={fieldClass}
            >
              <option value="">Selecione o cliente</option>
              {customers.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} - {entry.email}
                </option>
              ))}
            </select>
            {mode === "quote" && (
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className={fieldClass}
                title="Validade do orcamento"
              />
            )}
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-white">Adicionar item</h3>
              <p className="mt-1 text-[11px] text-white/38">
                Use o catalogo ou descreva uma peca personalizada.
              </p>
            </div>
            <div className="mb-3 grid gap-3 md:grid-cols-5">
              <select
                defaultValue=""
                onChange={(e) => addCatalogProduct(e.target.value)}
                className={fieldClass}
              >
                <option value="">Usar produto do catalogo...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Item personalizado"
                className={fieldClass}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="Valor unitario"
                className={fieldClass}
              />
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="Quantidade"
                className={fieldClass}
              />
              <Button
                type="button"
                onClick={addItem}
                className="h-[38px] rounded-lg px-3 text-[11px] shadow-none"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Sem consumo informado</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({Math.max(0, (m.stockGrams ?? 0) - (m.reservedGrams ?? 0))}g livres)
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value))}
                placeholder="Consumo total deste item (g)"
                className={fieldClass}
              />
            </div>
          </div>

          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.025] p-3 text-xs"
              >
                <div>
                  <strong className="font-semibold text-white">
                    {item.quantity}x {item.name}
                  </strong>
                  <p className="mt-1 text-white/40">
                    R$ {item.price.toFixed(2)}{" "}
                    {item.materialUsages?.[0]
                      ? `• ${item.materialUsages[0].materialName}: ${item.materialUsages[0].estimatedGrams}g`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remover ${item.name}`}
                  onClick={() =>
                    setItems((current) => current.filter((entry) => entry.id !== item.id))
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg text-red-300 transition hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {!items.length && (
              <p className="rounded-lg border border-dashed border-white/[0.08] py-6 text-center text-xs text-white/35">
                Nenhum item adicionado.
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Observacoes visiveis ao cliente"
              className={fieldClass}
            />
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Observacoes internas de producao"
              className={fieldClass}
            />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              placeholder="Desconto"
              className={fieldClass}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={shippingRate}
              onChange={(e) => setShippingRate(Number(e.target.value))}
              placeholder="Frete"
              className={fieldClass}
            />
            <div className="rounded-lg border border-blue-400/15 bg-blue-500/[0.07] px-4 py-3 text-right">
              <span className="text-[10px] font-semibold uppercase text-white/40">Total</span>
              <p className="font-semibold tabular-nums text-white">R$ {total.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse justify-end gap-2 border-t border-white/[0.07] bg-black/10 px-5 py-4 sm:flex-row sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 rounded-lg border-white/10 px-4 text-[11px]"
          >
            Cancelar
          </Button>
          <Button
            disabled={saving || !items.length}
            className="h-9 rounded-lg px-4 text-[11px] shadow-none"
          >
            {saving ? "Salvando..." : mode === "order" ? "Criar pedido" : "Criar orcamento"}
          </Button>
        </div>
      </form>
    </div>
  );
}
