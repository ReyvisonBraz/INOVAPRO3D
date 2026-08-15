import { memo, useRef, type ReactNode } from "react";
import { Building2, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { NumberField } from "../../../components/ui/NumberField";
import { cn } from "../../../lib/utils";
import {
  formatCompanyAddress,
  formatCompanyPhone,
  formatDocumentLabel,
} from "../../../lib/company";
import { AdminSettingsCard } from "./AdminPrimitives";
import type { CompanyAddress, CompanyProfile } from "../../../types/domain";

interface AdminCompanyPanelProps {
  profile: CompanyProfile;
  saving: boolean;
  uploadingLogo: boolean;
  onChangeField: <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => void;
  onChangeAddress: <K extends keyof CompanyAddress>(key: K, value: CompanyAddress[K]) => void;
  onSave: () => void;
  onUploadLogo: (file: File | null) => void;
}

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-semibold outline-none focus:border-primary/50 transition-all";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  className,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  className?: string;
  multiline?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-[10px] font-black uppercase tracking-widest text-secondary">
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={2}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputCls, "resize-none leading-relaxed")}
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={inputCls}
        />
      )}
      {hint && <p className="text-[9px] text-dim">{hint}</p>}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-dim">{title}</p>
      {children}
    </div>
  );
}

const AdminCompanyPanel = memo(function AdminCompanyPanel({
  profile,
  saving,
  uploadingLogo,
  onChangeField,
  onChangeAddress,
  onSave,
  onUploadLogo,
}: AdminCompanyPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const address = profile.address ?? {};
  const addressLine = formatCompanyAddress(profile.address);
  const documentLine = formatDocumentLabel(profile.document);

  return (
    <AdminSettingsCard
      icon={Building2}
      title="Empresa"
      subtitle="Identidade impressa no cabeçalho do orçamento e da ficha técnica"
      className="lg:col-span-2"
    >
      {/* PRÉVIA DO CABEÇALHO — o mesmo arranjo que sai no papel */}
      <div className="rounded-2xl border border-white/10 bg-white p-5 text-[#0f172a]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt=""
                className="h-12 w-auto max-w-[120px] object-contain"
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-lg border border-dashed border-[#0f172a]/20 text-[#0f172a]/25">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-black uppercase tracking-tight">
                {profile.tradeName || "Nome da empresa"}
              </p>
              {profile.legalName && (
                <p className="truncate text-[11px] text-[#0f172a]/60">{profile.legalName}</p>
              )}
            </div>
          </div>
          <div className="text-right text-[11px] leading-relaxed text-[#0f172a]/70">
            {documentLine && <p>{documentLine}</p>}
            {addressLine && <p>{addressLine}</p>}
            <p>
              {[formatCompanyPhone(profile.whatsapp || profile.phone), profile.instagram]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {profile.email && <p>{profile.email}</p>}
          </div>
        </div>
        <div className="mt-4 border-t-2 border-[#0f172a] pt-2 text-[10px] font-bold uppercase tracking-widest text-[#0f172a]/45">
          Prévia do cabeçalho impresso
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Group title="Identidade">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                {profile.logoUrl ? (
                  <img src={profile.logoUrl} alt="" className="h-full w-full object-contain p-2" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-white/15" />
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 grid place-items-center bg-black/70">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-white/12 text-[10px] font-bold text-white/65 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                >
                  <Upload className="h-3 w-3" /> Logo
                </button>
                {profile.logoUrl && (
                  <button
                    type="button"
                    onClick={() => onChangeField("logoUrl", undefined)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-white/12 text-white/40 transition hover:text-red-300"
                    aria-label="Remover logo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  onUploadLogo(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <TextField
                label="Nome fantasia"
                value={profile.tradeName}
                onChange={(value) => onChangeField("tradeName", value)}
                placeholder="INOVAPRO3D"
              />
              <TextField
                label="Razão social"
                value={profile.legalName ?? ""}
                onChange={(value) => onChangeField("legalName", value || undefined)}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="CNPJ / CPF"
              value={profile.document ?? ""}
              onChange={(value) => onChangeField("document", value || undefined)}
              placeholder="00.000.000/0001-00"
            />
            <TextField
              label="Inscrição estadual"
              value={profile.stateRegistration ?? ""}
              onChange={(value) => onChangeField("stateRegistration", value || undefined)}
              placeholder="Opcional"
            />
          </div>
        </Group>

        <Group title="Contato">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="WhatsApp"
              value={profile.whatsapp ?? ""}
              onChange={(value) => onChangeField("whatsapp", value || undefined)}
              placeholder="5591980774776"
              hint="Aparece formatado no documento"
            />
            <TextField
              label="Telefone fixo"
              value={profile.phone ?? ""}
              onChange={(value) => onChangeField("phone", value || undefined)}
              placeholder="Opcional"
            />
          </div>
          <TextField
            label="E-mail"
            value={profile.email ?? ""}
            onChange={(value) => onChangeField("email", value || undefined)}
            placeholder="vendas@inovapro3d.com.br"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Site"
              value={profile.site ?? ""}
              onChange={(value) => onChangeField("site", value || undefined)}
              placeholder="inovapro3d.com.br"
            />
            <TextField
              label="Instagram"
              value={profile.instagram ?? ""}
              onChange={(value) => onChangeField("instagram", value || undefined)}
              placeholder="@inovapro3d"
            />
          </div>
        </Group>

        <Group title="Endereço">
          <div className="grid grid-cols-3 gap-3">
            <TextField
              label="CEP"
              value={address.zipCode ?? ""}
              onChange={(value) => onChangeAddress("zipCode", value || undefined)}
              placeholder="66000-000"
            />
            <TextField
              label="Rua"
              className="col-span-2"
              value={address.street ?? ""}
              onChange={(value) => onChangeAddress("street", value || undefined)}
              placeholder="Rua das Flores"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <TextField
              label="Número"
              value={address.number ?? ""}
              onChange={(value) => onChangeAddress("number", value || undefined)}
              placeholder="123"
            />
            <TextField
              label="Complemento"
              className="col-span-2"
              value={address.complement ?? ""}
              onChange={(value) => onChangeAddress("complement", value || undefined)}
              placeholder="Sala 2"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <TextField
              label="Bairro"
              value={address.neighborhood ?? ""}
              onChange={(value) => onChangeAddress("neighborhood", value || undefined)}
              placeholder="Centro"
            />
            <TextField
              label="Cidade"
              value={address.city ?? ""}
              onChange={(value) => onChangeAddress("city", value || undefined)}
              placeholder="Belém"
            />
            <TextField
              label="UF"
              value={address.state ?? ""}
              onChange={(value) => onChangeAddress("state", value || undefined)}
              placeholder="PA"
            />
          </div>
        </Group>

        <Group title="Condições comerciais padrão">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-secondary">
              Validade da proposta (dias)
            </label>
            <NumberField
              value={profile.defaultValidityDays}
              onChange={(value) => onChangeField("defaultValidityDays", Math.max(1, value))}
              min={1}
              step={1}
              aria-label="Validade padrão da proposta em dias"
              className={inputCls}
            />
          </div>
          <TextField
            label="Forma de pagamento"
            value={profile.paymentTerms ?? ""}
            onChange={(value) => onChangeField("paymentTerms", value || undefined)}
            placeholder="50% na aprovação e 50% na entrega · PIX, cartão ou dinheiro"
            multiline
          />
          <TextField
            label="Prazo de entrega"
            value={profile.leadTimeText ?? ""}
            onChange={(value) => onChangeField("leadTimeText", value || undefined)}
            placeholder="5 a 7 dias úteis após a aprovação"
          />
          <TextField
            label="Garantia"
            value={profile.warrantyTerms ?? ""}
            onChange={(value) => onChangeField("warrantyTerms", value || undefined)}
            placeholder="Opcional — aparece nas condições gerais"
            multiline
          />
          <TextField
            label="Observação no rodapé"
            value={profile.quoteFooterNote ?? ""}
            onChange={(value) => onChangeField("quoteFooterNote", value || undefined)}
            placeholder="Opcional — texto final da proposta"
            multiline
          />
        </Group>
      </div>

      <Button
        className="h-12 rounded-2xl px-8 text-[10px] font-black uppercase tracking-widest"
        onClick={onSave}
        disabled={saving}
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar dados da empresa
      </Button>
    </AdminSettingsCard>
  );
});

export default AdminCompanyPanel;
