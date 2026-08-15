import { formatCompanyAddress, formatCompanyPhone, formatDocumentLabel } from "../../lib/company";
import { formatBRL } from "../../lib/pricing";
import type { QuoteDocumentData } from "../../lib/quoteDocument";

const date = (value: Date) => value.toLocaleDateString("pt-BR");

export function QuoteDocument({ data }: { data: QuoteDocumentData }) {
  const companyAddress = formatCompanyAddress(data.company.address);
  const companyPhone = formatCompanyPhone(data.company.phone || data.company.whatsapp);
  const documentLabel = formatDocumentLabel(data.company.document);
  const customerPhone = formatCompanyPhone(data.customer.phone);

  return (
    <article className="print-document doc-page" aria-label="Proposta comercial">
      <header className="doc-company-header doc-avoid">
        <div className="doc-brand-block">
          {data.company.logoUrl ? (
            <img className="doc-logo" src={data.company.logoUrl} alt={data.company.tradeName} />
          ) : (
            <div className="doc-brand-fallback">{data.company.tradeName}</div>
          )}
          <div>
            <strong>{data.company.tradeName}</strong>
            {data.company.legalName && <span>{data.company.legalName}</span>}
          </div>
        </div>
        <div className="doc-company-meta">
          {documentLabel && <span>{documentLabel}</span>}
          {companyAddress && <span>{companyAddress}</span>}
          {companyPhone && <span>{companyPhone}</span>}
          <span>{[data.company.email, data.company.site].filter(Boolean).join(" · ")}</span>
        </div>
      </header>

      <section className="doc-title-row doc-avoid">
        <div>
          <span className="doc-eyebrow">Proposta comercial</span>
          <h1>{data.quoteNumber}</h1>
        </div>
        <dl className="doc-dates">
          <div>
            <dt>Emissão</dt>
            <dd>{date(data.issuedAt)}</dd>
          </div>
          <div>
            <dt>Validade</dt>
            <dd>{date(data.validUntil)}</dd>
          </div>
        </dl>
      </section>

      <section className="doc-info-grid doc-avoid">
        <div>
          <h2>Cliente</h2>
          <strong>{data.customer.name}</strong>
          {customerPhone && <span>{customerPhone}</span>}
          {data.customer.email && <span>{data.customer.email}</span>}
        </div>
        <div>
          <h2>Condições</h2>
          <span>Tabela: {data.priceTier === "WHOLESALE" ? "Atacado" : "Varejo"}</span>
          {data.paymentTerms && <span>Pagamento: {data.paymentTerms}</span>}
          {data.leadTimeText && <span>Prazo estimado: {data.leadTimeText}</span>}
        </div>
      </section>

      <section className="doc-items-layout">
        <div className="doc-items-main">
          <table className="doc-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Descrição</th>
                <th className="doc-number">Qtd.</th>
                <th className="doc-number">Unitário</th>
                <th className="doc-number">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={`${item.description}-${index}`}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{item.description}</strong>
                    {item.detail && <small>{item.detail}</small>}
                  </td>
                  <td className="doc-number">{item.quantity}</td>
                  <td className="doc-number">{formatBRL(item.unitPrice)}</td>
                  <td className="doc-number">{formatBRL(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="doc-totals doc-avoid">
            <div>
              <span>Subtotal</span>
              <strong>{formatBRL(data.subtotal)}</strong>
            </div>
            {data.discount > 0 && (
              <div>
                <span>Desconto</span>
                <strong>− {formatBRL(data.discount)}</strong>
              </div>
            )}
            {data.surcharge > 0 && (
              <div>
                <span>Acréscimo</span>
                <strong>{formatBRL(data.surcharge)}</strong>
              </div>
            )}
            {data.shipping > 0 && (
              <div>
                <span>Entrega</span>
                <strong>{formatBRL(data.shipping)}</strong>
              </div>
            )}
            <div className="doc-grand-total">
              <span>Total</span>
              <strong>{formatBRL(data.total)}</strong>
            </div>
            {data.items.length === 1 && data.items[0].quantity > 1 && (
              <small>{formatBRL(data.unitPrice)} por unidade</small>
            )}
          </div>
        </div>

        {data.showImage && data.imageUrl && (
          <figure className="doc-product-image doc-avoid">
            <img src={data.imageUrl} alt={data.items[0]?.description || "Produto"} />
          </figure>
        )}
      </section>

      {data.customerNotes && (
        <section className="doc-notes doc-avoid">
          <h2>Observações</h2>
          <p>{data.customerNotes}</p>
        </section>
      )}

      <section className="doc-terms doc-avoid">
        <h2>Condições gerais</h2>
        {data.company.warrantyTerms && <p>{data.company.warrantyTerms}</p>}
        {data.company.quoteFooterNote && <p>{data.company.quoteFooterNote}</p>}
        <div className="doc-acceptance">
          <span>De acordo: ____________________________________</span>
          <span>Data: ____/____/________</span>
        </div>
      </section>

      <footer className="doc-footer">
        <span>{data.company.tradeName}</span>
        <span>{[documentLabel, companyPhone, data.company.site].filter(Boolean).join(" · ")}</span>
      </footer>
    </article>
  );
}
