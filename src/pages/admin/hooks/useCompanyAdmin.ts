import { useCallback, useEffect, useState } from "react";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { toast } from "sonner";
import { auth, getStorageInstance } from "../../../services/firebase";
import { fetchCompanyProfile, saveCompanyProfile } from "../../../services/company";
import { DEFAULT_COMPANY_PROFILE } from "../../../lib/company";
import type { CompanyAddress, CompanyProfile } from "../../../types/domain";

/**
 * Cadastro da empresa usado no cabeçalho dos documentos impressos.
 * Carrega uma vez ao montar e grava em `settings/company`.
 */
export function useCompanyAdmin() {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    // `fetchCompanyProfile` nunca lança: sem cadastro ou sem permissão, cai
    // no perfil padrão para nenhum documento sair sem cabeçalho.
    fetchCompanyProfile().then(setCompanyProfile);
  }, []);

  const updateCompanyField = useCallback(
    <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
      setCompanyProfile((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const updateCompanyAddress = useCallback(
    <K extends keyof CompanyAddress>(key: K, value: CompanyAddress[K]) => {
      setCompanyProfile((previous) => ({
        ...previous,
        address: { ...previous.address, [key]: value },
      }));
    },
    [],
  );

  const handleSaveCompany = useCallback(async () => {
    if (!companyProfile.tradeName.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }
    setIsSavingCompany(true);
    try {
      await saveCompanyProfile(companyProfile);
      toast.success("Dados da empresa salvos!");
    } catch (err) {
      console.error("[empresa] falha ao salvar:", err);
      toast.error("Erro ao salvar os dados da empresa.");
    } finally {
      setIsSavingCompany(false);
    }
  }, [companyProfile]);

  const handleUploadLogo = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!auth.currentUser) {
      toast.error("Sessão expirada. Entre novamente.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande. Use uma de até 8 MB.");
      return;
    }
    setIsUploadingLogo(true);
    try {
      // O logo NÃO passa por conversão WebP em canvas: isso achataria a
      // transparência do PNG, e é justamente ela que faz o logo funcionar
      // sobre o fundo branco do documento impresso.
      const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const path = `company/logo_${Date.now()}_${safeName}`;
      const fileRef = storageRef(await getStorageInstance(), path);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      setCompanyProfile((previous) => ({ ...previous, logoUrl: url }));
      toast.success("Logo enviado! Salve para aplicar nos documentos.");
    } catch (err) {
      console.error("[empresa] falha no upload do logo:", err);
      const code = (err as { code?: string })?.code || "";
      toast.error(
        code === "storage/unauthorized"
          ? "Upload bloqueado: publique as regras do Storage (firebase deploy --only storage)."
          : "Erro ao enviar o logo.",
        code === "storage/unauthorized" ? { duration: 6000 } : undefined,
      );
    } finally {
      setIsUploadingLogo(false);
    }
  }, []);

  return {
    companyProfile,
    setCompanyProfile,
    updateCompanyField,
    updateCompanyAddress,
    isSavingCompany,
    isUploadingLogo,
    handleSaveCompany,
    handleUploadLogo,
  };
}
