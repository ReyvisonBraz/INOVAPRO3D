import { formatBRL, formatHoursToHHMM } from "../../lib/pricing";
import { formatCompanyPhone, formatDocumentLabel } from "../../lib/company";
import type { QuoteDocumentData } from "../../lib/quoteDocument";

const date = (value: Date) => value.toLocaleDateString("pt-BR");

export function ProductionSheet({ data }: { data: QuoteDocumentData }) {
  const production = data.production;
  const result = production.result;
  const companyPhone = formatCompanyPhone(data.company.phone || data.company.whatsapp);

  return (
    <article className="print-document doc-page doc-production" aria-label="Ficha de produção">
      <div className="doc-accent" />
      <header className="doc-company-header doc-production-brand doc-avoid">
        <div className="doc-brand-block">
          {data.company.logoUrl ? (
            <img className="doc-logo" src={data.company.logoUrl} alt={data.company.tradeName} />
          ) : (
            <div className="doc-brand-fallback">{data.company.tradeName}</div>
          )}
          <div>
            <strong className="doc-brand-name">{data.company.tradeName}</strong>
            <span>Impressão 3D • Design • Prototipagem</span>
          </div>
        </div>
        <div className="doc-company-meta">
          {formatDocumentLabel(data.company.document) && (
            <span>{formatDocumentLabel(data.company.document)}</span>
          )}
          {companyPhone && <span>{companyPhone}</span>}
          {data.company.email && <span>{data.company.email}</span>}
        </div>
      </header>

      <section className="doc-title-row doc-avoid">
        <div>
          <span className="doc-eyebrow">
            <i className="doc-brand-dot" /> Ordem de fabricação
          </span>
          <h1>{data.quoteNumber}</h1>
          <p className="doc-subtitle">{production.project.name}</p>
        </div>
        <div className="doc-printer-identity">
          <span className="doc-document-chip">Uso interno</span>
          {production.printerPhotoUrl && (
            <img src={production.printerPhotoUrl} alt="" aria-hidden="true" />
          )}
          <div>
            <small>Impressora</small>
            <strong>{production.printerName}</strong>
          </div>
        </div>
      </section>

      {production.degraded && production.note && (
        <div className="doc-warning doc-avoid">{production.note}</div>
      )}

      <section className="doc-info-grid doc-avoid">
        <div>
          <h2>Identificação</h2>
          <span>Cliente: {data.customer.name}</span>
          <span>Projeto: {production.project.name}</span>
          <span>Emissão: {date(data.issuedAt)}</span>
        </div>
        <div>
          <h2>Operação</h2>
          <span>Operador: ______________________________</span>
          <span>Produtos finais: {production.project.outputQuantity}</span>
          {result && <span>Tempo total: {formatHoursToHHMM(result.hours)}</span>}
        </div>
      </section>

      <section>
        <h2 className="doc-section-title">Bandejas</h2>
        {production.plates.length ? (
          <table className="doc-table doc-plate-table">
            <thead>
              <tr>
                <th>Bandeja</th>
                <th>Tipo</th>
                <th>Tempo</th>
                <th className="doc-number">Repet.</th>
                <th>Filamentos</th>
                <th className="doc-number">Gramas</th>
                <th className="doc-number">Material</th>
              </tr>
            </thead>
            <tbody>
              {production.plates.map((plate) => (
                <tr key={plate.id}>
                  <td>
                    <strong>{plate.name}</strong>
                    <small>{plate.pieces} objeto(s) por execução</small>
                  </td>
                  <td>{plate.type}</td>
                  <td>{formatHoursToHHMM(plate.hours)}</td>
                  <td className="doc-number">{plate.repetitions}</td>
                  <td>{plate.filaments || "—"}</td>
                  <td className="doc-number">{plate.grams.toFixed(2)} g</td>
                  <td className="doc-number">{formatBRL(plate.materialCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="doc-empty">As bandejas não estavam disponíveis neste orçamento.</p>
        )}
      </section>

      {result && (
        <>
          <section className="doc-metrics doc-avoid">
            <div>
              <span>Peso total</span>
              <strong>{result.weightGrams.toFixed(2)} g</strong>
            </div>
            <div>
              <span>Energia</span>
              <strong>{result.energyKwh.toFixed(3)} kWh</strong>
            </div>
            <div>
              <span>Custo-máquina/h</span>
              <strong>{formatBRL(production.machineHourCost || 0)}</strong>
            </div>
            <div>
              <span>Custo previsto</span>
              <strong>{formatBRL(result.totalCost)}</strong>
            </div>
          </section>

          <section className="doc-cost-grid doc-avoid">
            <div>
              <h2>Distribuição dos custos</h2>
              <dl>
                <div>
                  <dt>Material</dt>
                  <dd>{formatBRL(result.materialCost)}</dd>
                </div>
                <div>
                  <dt>Energia</dt>
                  <dd>{formatBRL(result.energyCost)}</dd>
                </div>
                <div>
                  <dt>Máquina</dt>
                  <dd>{formatBRL(result.machineCost)}</dd>
                </div>
                <div>
                  <dt>Mão de obra e insumos</dt>
                  <dd>
                    {formatBRL(result.laborCost + result.extraSupplies + result.packagingCost)}
                  </dd>
                </div>
                <div>
                  <dt>Provisão de falha</dt>
                  <dd>{formatBRL(result.failureLoss)}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h2>Comercial interno</h2>
              <dl>
                <div>
                  <dt>Atacado</dt>
                  <dd>{formatBRL(result.wholesaleTotal)}</dd>
                </div>
                <div>
                  <dt>Varejo</dt>
                  <dd>{formatBRL(result.retailTotal)}</dd>
                </div>
                <div>
                  <dt>Piso sustentável</dt>
                  <dd>{formatBRL(result.minimumSustainablePrice)}</dd>
                </div>
                <div>
                  <dt>Margem escolhida</dt>
                  <dd>
                    {data.priceTier === "WHOLESALE"
                      ? `${result.profitWholesalePct.toFixed(1)}%`
                      : `${result.profitRetailPct.toFixed(1)}%`}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </>
      )}

      {production.inventory && production.inventory.hasShortage && (
        <section className="doc-warning doc-avoid">
          <strong>Estoque abaixo do previsto</strong>
          {production.inventory.rows
            .filter((row) => row.shortfall > 0)
            .map((row) => (
              <span key={row.materialId}>
                {row.name}: necessário {row.required.toFixed(1)} g · disponível{" "}
                {row.available.toFixed(1)} g · falta {row.shortfall.toFixed(1)} g
              </span>
            ))}
        </section>
      )}

      <section className="doc-checklist doc-avoid">
        <h2>Controle de qualidade e expedição</h2>
        <div className="doc-check-grid">
          <span>☐ Arquivo conferido</span>
          <span>☐ Fatiamento validado</span>
          <span>☐ Impressão concluída</span>
          <span>☐ Acabamento realizado</span>
          <span>☐ Qualidade aprovada</span>
          <span>☐ Produto embalado</span>
        </div>
        <div className="doc-production-signoff">
          <span>Responsável: ______________________________</span>
          <span>Data: ____/____/________</span>
        </div>
        <p className="doc-note-line">Ocorrências / observações:</p>
        <p>____________________________________________________________________________</p>
        <p>____________________________________________________________________________</p>
      </section>

      <footer className="doc-footer">
        <span>{data.company.tradeName} · uso interno</span>
        <span>{data.quoteNumber}</span>
      </footer>
    </article>
  );
}
