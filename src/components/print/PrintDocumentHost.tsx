import { createPortal } from "react-dom";
import type { PrintDocumentMode } from "../../lib/printing";
import type { QuoteDocumentData } from "../../lib/quoteDocument";
import { ProductionSheet } from "./ProductionSheet";
import { QuoteDocument } from "./QuoteDocument";

interface PrintDocumentHostProps {
  data: QuoteDocumentData | null;
  mode: PrintDocumentMode;
}

export function PrintDocumentHost({ data, mode }: PrintDocumentHostProps) {
  if (!data || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="print-document-host"
      aria-hidden={!document.body.classList.contains("printing")}
    >
      {mode === "CLIENT" ? <QuoteDocument data={data} /> : <ProductionSheet data={data} />}
    </div>,
    document.body,
  );
}
