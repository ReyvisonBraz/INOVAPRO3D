import { flushSync } from "react-dom";

export type PrintDocumentMode = "CLIENT" | "PRODUCTION";

export function buildPrintDocumentTitle(
  mode: PrintDocumentMode,
  customer: { name: string; phone?: string },
): string {
  const documentLabel = mode === "CLIENT" ? "Orçamento" : "Ficha de Produção";
  return `INOVA PRO 3D ${documentLabel} - ${customer.name} - ${customer.phone || "Sem telefone"}`.replace(
    /[\\/:*?"<>|]+/g,
    "-",
  );
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
let printQueue: Promise<void> = Promise.resolve();

/**
 * Espera o React montar o portal, as fontes terminarem e dois frames serem
 * pintados antes de abrir a caixa do navegador. Isso evita relatórios vazios
 * ou com o modo anterior em máquinas mais lentas.
 */
async function waitForPrintImages(): Promise<void> {
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>(".print-document-host img"),
  );
  await Promise.all(
    images.map(async (image) => {
      if (image.complete) {
        await image.decode?.().catch(() => undefined);
        return;
      }
      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 5000);
        const finish = () => {
          window.clearTimeout(timeout);
          resolve();
        };
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });
    }),
  );
}

export function printDocument(
  prepare: () => void,
  cleanup?: () => void,
  suggestedTitle?: string,
): Promise<void> {
  const job = printQueue
    .catch(() => undefined)
    .then(async () => {
      // Garante que o portal já contenha exclusivamente o trabalho atual antes
      // que o navegador calcule as páginas de impressão.
      flushSync(prepare);
      const previousTitle = document.title;
      if (suggestedTitle) document.title = suggestedTitle;
      document.body.classList.add("printing");
      try {
        await document.fonts?.ready;
        await waitForPrintImages();
        await nextFrame();
        await nextFrame();
        window.print();
      } finally {
        document.body.classList.remove("printing");
        document.title = previousTitle;
        if (cleanup) flushSync(cleanup);
      }
    });
  printQueue = job.catch(() => undefined);
  return job;
}
