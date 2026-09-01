import { FieldValue } from "firebase-admin/firestore";
import { cspReportFingerprint, type CspReportSummary } from "./_cspReport.js";
import { logEvent } from "./_observability/logger.js";
import type { RequestContext } from "./_observability/context.js";
import { getAdminDb, isAdminSdkConfigured } from "./firebaseAdmin.js";

interface AggregatedReport {
  count: number;
  report: CspReportSummary;
}

/**
 * Observabilidade CSP é best-effort: falhas de telemetria nunca devem gerar
 * retentativas do navegador nem afetar a navegação principal.
 */
export async function recordCspReports(
  reports: readonly CspReportSummary[],
  context: RequestContext,
): Promise<void> {
  const aggregated = new Map<string, AggregatedReport>();

  for (const report of reports) {
    const fingerprint = cspReportFingerprint(report);
    const current = aggregated.get(fingerprint);
    aggregated.set(fingerprint, {
      count: (current?.count ?? 0) + 1,
      report,
    });
  }

  for (const [fingerprint, entry] of aggregated) {
    logEvent("warn", context, "Violação CSP observada", {
      fingerprint,
      occurrences: entry.count,
      report: entry.report,
    });
  }

  if (!isAdminSdkConfigured() || aggregated.size === 0) return;

  try {
    const db = getAdminDb();
    const batch = db.batch();
    for (const [fingerprint, entry] of aggregated) {
      batch.set(
        db.collection("cspReports").doc(fingerprint),
        {
          ...entry.report,
          count: FieldValue.increment(entry.count),
          lastSeen: new Date(),
          environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
        },
        { merge: true },
      );
    }
    await batch.commit();
  } catch (error) {
    logEvent("error", context, "Falha ao persistir relatórios CSP", { error });
  }
}
