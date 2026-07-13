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

const fieldClass = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-bold text-white outline-none focus:border-primary/50";

export function AdminManualSaleModal({ initialMode, customers, products, materials, onClose, onSaved }: Props) {
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
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const total = Math.max(0, subtotal - discount + shippingRate);
  const usages = items.flatMap((item) => item.materialUsages ?? []);

  const addItem = () => {
    if (!name.trim() || price < 0 || quantity < 1) return toast.error("Preencha nome, quantidade e valor do item.");
    const id = crypto.randomUUID();
    const selectedMaterial = materials.find((entry) => entry.id === materialId);
    const materialUsages: MaterialUsage[] = materialId && grams > 0 ? [{
      materialId,
      materialName: selectedMaterial?.name,
      itemId: id,
      estimatedGrams: grams,
      reservedGrams: 0,
      consumedGrams: 0,
    }] : [];
    setItems((current) => [...current, { id, name: name.trim(), price, quantity, type: "PRODUCT", materialId: materialId || undefined, materialUsages }]);
    setName(""); setPrice(0); setQuantity(1); setMaterialId(""); setGrams(0);
  };

  const addCatalogProduct = (productId: string) => {
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;
    setName(product.name);
    setPrice(product.basePrice);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!customer || !items.length) return toast.error("Selecione o cliente e adicione pelo menos um item.");
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
        await addDoc(collection(db, "orders"), { ...common, status: "PENDING_PAYMENT", paymentMethod: "manual" });
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
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/95 p-4 backdrop-blur-2xl">
      <form onSubmit={submit} className="mx-auto my-6 max-w-5xl rounded-[32px] border border-white/10 bg-surface p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div><h2 className="text-2xl font-black italic">Montador manual</h2><p className="text-xs text-dim">Venda e consumo de producao no mesmo registro</p></div>
          <button type="button" onClick={onClose}><X className="h-6 w-6" /></button>
        </div>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <select value={mode} onChange={(e) => setMode(e.target.value as "order" | "quote")} className={fieldClass}>
            <option value="order">Criar pedido</option><option value="quote">Criar orcamento</option>
          </select>
          <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={fieldClass}>
            <option value="">Selecione o cliente</option>{customers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} - {entry.email}</option>)}
          </select>
          {mode === "quote" && <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={fieldClass} title="Validade do orcamento" />}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-3 grid gap-3 md:grid-cols-5">
            <select defaultValue="" onChange={(e) => addCatalogProduct(e.target.value)} className={fieldClass}><option value="">Usar produto do catalogo...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item personalizado" className={fieldClass} />
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="Valor unitario" className={fieldClass} />
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} placeholder="Quantidade" className={fieldClass} />
            <Button type="button" onClick={addItem} className="rounded-xl"><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={fieldClass}><option value="">Sem consumo informado</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({Math.max(0, (m.stockGrams ?? 0) - (m.reservedGrams ?? 0))}g livres)</option>)}</select>
            <input type="number" min="0" value={grams} onChange={(e) => setGrams(Number(e.target.value))} placeholder="Consumo total deste item (g)" className={fieldClass} />
          </div>
        </div>

        <div className="my-5 space-y-2">
          {items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs"><div><strong>{item.quantity}x {item.name}</strong><p className="text-dim">R$ {item.price.toFixed(2)} {item.materialUsages?.[0] ? `• ${item.materialUsages[0].materialName}: ${item.materialUsages[0].estimatedGrams}g` : ""}</p></div><button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}><Trash2 className="h-4 w-4 text-red-400" /></button></div>)}
          {!items.length && <p className="py-5 text-center text-xs text-dim">Nenhum item adicionado.</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="Observacoes visiveis ao cliente" className={fieldClass} />
          <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Observacoes internas de producao" className={fieldClass} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} placeholder="Desconto" className={fieldClass} />
          <input type="number" min="0" step="0.01" value={shippingRate} onChange={(e) => setShippingRate(Number(e.target.value))} placeholder="Frete" className={fieldClass} />
          <div className="rounded-xl bg-primary/10 px-4 py-3 text-right"><span className="text-[10px] uppercase text-dim">Total</span><p className="font-black">R$ {total.toFixed(2)}</p></div>
        </div>
        <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={saving || !items.length}>{saving ? "Salvando..." : mode === "order" ? "Criar pedido" : "Criar orcamento"}</Button></div>
      </form>
    </div>
  );
}
