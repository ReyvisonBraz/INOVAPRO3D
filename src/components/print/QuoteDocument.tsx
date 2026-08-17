import {
  formatCompanyAddress,
  formatCompanyPhone,
  formatDocumentLabel,
  PAYMENT_METHOD_LABELS,
} from "../../lib/company";
import { formatBRL } from "../../lib/pricing";
import type { QuoteDocumentData } from "../../lib/quoteDocument";

const date = (value: Date) => value.toLocaleDateString("pt-BR");

const socialHandle = (value: string) =>
  value
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/\/$/, "")
    .replace(/^instagram\.com\//i, "@")
    .replace(/^tiktok\.com\/@?/i, "@");

export function QuoteDocument({ data }: { data: QuoteDocumentData }) {
  const companyAddress = formatCompanyAddress(data.company.address);
  const companyPhone = formatCompanyPhone(data.company.phone || data.company.whatsapp);
  const documentLabel = formatDocumentLabel(data.company.document);
  const customerPhone = formatCompanyPhone(data.customer.phone);
  const socialLinks = [
    data.company.instagram,
    data.company.facebook,
    data.company.tiktok,
    data.company.linkedin,
  ]
    .filter((value): value is string => Boolean(value))
    .map(socialHandle);

  return (
    <article className="print-document doc-page" aria-label="Proposta comercial">
      <div className="doc-accent" />
      <header className="doc-company-header doc-avoid">
        <div className="doc-brand-block">
          {data.company.logoUrl ? (
            <img className="doc-logo" src={data.company.logoUrl} alt={data.company.tradeName} />
          ) : (
            <div className="doc-brand-fallback">{data.company.tradeName}</div>
          )}
          <div>
            <strong className="doc-brand-name">{data.company.tradeName}</strong>
            {data.company.legalName && <span>{data.company.legalName}</span>}
            <small className="doc-brand-tagline">Impressão 3D • Design • Prototipagem</small>
          </div>
        </div>
        <div className="doc-company-meta">
          {documentLabel && <span>{documentLabel}</span>}
          {companyAddress && <span>{companyAddress}</span>}
          {companyPhone && <span>WhatsApp {companyPhone}</span>}
          <span>{[data.company.email, data.company.site].filter(Boolean).join("  •  ")}</span>
          {socialLinks.length > 0 && <span>{socialLinks.join("  •  ")}</span>}
        </div>
      </header>

      <section className="doc-title-row doc-avoid">
        <div>
          <span className="doc-eyebrow">
            <i className="doc-brand-dot" /> Orçamento personalizado
          </span>
          <h1>{data.quoteNumber}</h1>
          <p className="doc-subtitle">Soluções em impressão 3D sob medida</p>
        </div>
        <div className="doc-title-meta">
          <span className="doc-document-chip">Proposta comercial</span>
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
        </div>
      </section>

      <section className="doc-info-grid doc-avoid">
        <div>
          <h2>Preparado para</h2>
          <strong>{data.customer.name}</strong>
          {customerPhone && <span>{customerPhone}</span>}
          {data.customer.email && <span>{data.customer.email}</span>}
        </div>
        <div>
          <h2>Resumo da proposta</h2>
          <span>Modalidade: {data.priceTier === "WHOLESALE" ? "Atacado" : "Varejo"}</span>
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

      {(data.paymentTerms || data.company.acceptedPaymentMethods?.length) && (
        <section className="doc-payment doc-avoid">
          <div>
            <span className="doc-payment-kicker">Pagamento</span>
            <strong>{data.paymentTerms || "Conforme combinado"}</strong>
          </div>
          {Boolean(data.company.acceptedPaymentMethods?.length) && (
            <div className="doc-payment-methods">
              {data.company.acceptedPaymentMethods?.map((method) => (
                <span key={method}>{PAYMENT_METHOD_LABELS[method]}</span>
              ))}
            </div>
          )}
        </section>
      )}

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
          <span>Assinatura do cliente</span>
          <span>Data da aprovação</span>
        </div>
      </section>

      <footer className="doc-footer">
        <span>{data.company.tradeName}</span>
        <span>{[documentLabel, companyPhone, data.company.site].filter(Boolean).join(" · ")}</span>
      </footer>
    </article>
  );
}
