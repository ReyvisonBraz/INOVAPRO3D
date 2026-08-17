import { createPortal } from "react-dom";
import type { PrintDocumentMode } from "../../lib/printing";
import type { QuoteDocumentData } from "../../lib/quoteDocument";
import { ProductionSheet } from "./ProductionSheet";
import { QuoteDocument } from "./QuoteDocument";

interface PrintDocumentHostProps {
  data?: QuoteDocumentData | null;
  mode?: PrintDocumentMode;
  documents?: PrintDocumentEntry[];
  jobId?: string;
}

export interface PrintDocumentEntry {
  data: QuoteDocumentData;
  mode: PrintDocumentMode;
  key?: string;
}

export function PrintDocumentHost({
  data,
  mode = "CLIENT",
  documents,
  jobId,
}: PrintDocumentHostProps) {
  const entries = documents ?? (data ? [{ data, mode }] : []);
  if (entries.length === 0 || typeof document === "undefined") return null;
  return createPortal(
    <div
      key={jobId}
      className="print-document-host"
      aria-hidden={!document.body.classList.contains("printing")}
    >
      {entries.map((entry, index) =>
        entry.mode === "CLIENT" ? (
          <QuoteDocument key={entry.key ?? `${jobId}-client-${index}`} data={entry.data} />
        ) : (
          <ProductionSheet key={entry.key ?? `${jobId}-production-${index}`} data={entry.data} />
        ),
      )}
    </div>,
    document.body,
  );
}
