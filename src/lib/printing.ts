export type PrintDocumentMode = "CLIENT" | "PRODUCTION";

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Espera o React montar o portal, as fontes terminarem e dois frames serem
 * pintados antes de abrir a caixa do navegador. Isso evita relatórios vazios
 * ou com o modo anterior em máquinas mais lentas.
 */
export async function printDocument(prepare: () => void): Promise<void> {
  prepare();
  document.body.classList.add("printing");
  try {
    await document.fonts?.ready;
    await nextFrame();
    await nextFrame();
    window.print();
  } finally {
    document.body.classList.remove("printing");
  }
}
