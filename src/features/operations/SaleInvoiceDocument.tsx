import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, DataTable, Modal } from "../../components/ui";
import { Can } from "../../components/Can";
import { AuditHistoryButton } from "../audit/AuditHistory";
import { formatCurrency, formatDate } from "../../lib/utils";
import type {
  Payment,
  Sale,
  SalePaymentStatus,
} from "../../services/operations";
import { Money } from "./common";
import { OrderDocument, OrderDocumentBrand } from "./OrderDocument";

const SALES = "/sales/sales";

const paymentTone = (
  status?: SalePaymentStatus | null,
): "success" | "warning" | "danger" | "info" | "neutral" => {
  if (status === "PAID") return "success";
  if (status === "PARTIAL") return "warning";
  if (status === "FINANCE_PENDING") return "info";
  if (status === "REFUND") return "warning";
  if (status === "PENDING") return "danger";
  return "neutral";
};

const joinMeta = (values: Array<string | number | null | undefined>) =>
  values
    .map((value) => (value == null || value === "" ? null : String(value)))
    .filter(Boolean)
    .join(" · ");

export const SaleInvoiceDocument = ({
  sale,
  saleId,
}: {
  sale: Sale;
  saleId: number;
}) => {
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const payments = sale.payments ?? [];
  const splits = sale.amountSplits ?? [];
  const exchange = sale.exchangeVehicleDetails;
  const canRecordPayment = (sale.pendingAmount ?? 0) > 0;

  return (
    <>
      <OrderDocument filename={`SO-${sale.id}-${sale.vehicleNo}`}>
        <header className="order-document__masthead">
          <OrderDocumentBrand documentTitle="Sale invoice" />
          <div className="order-document__meta">
            <strong className="order-document__code">#SO-{sale.id}</strong>
            <Badge tone={paymentTone(sale.paymentStatus)}>
              {sale.paymentStatus ?? "PENDING"}
            </Badge>
            <dl>
              <div>
                <dt>Date</dt>
                <dd>{formatDate(sale.date)}</dd>
              </div>
              <div>
                <dt>Delivered</dt>
                <dd>{formatDate(sale.deliveredDate)}</dd>
              </div>
            </dl>
          </div>
        </header>

        <nav className="order-document__tabs" aria-label="Related records">
          <button type="button" onClick={() => setPaymentsOpen(true)}>
            Payments
            <span className="order-document__count">{payments.length}</span>
          </button>
        </nav>

        <section className="order-document__parties">
          <div>
            <h3>Customer</h3>
            <strong>{sale.customerName ?? "—"}</strong>
            <p>{sale.customerMobileNo ?? "—"}</p>
            <p>{sale.customerAddress ?? "—"}</p>
          </div>
          <div>
            <h3>Vehicle</h3>
            <strong>
              {joinMeta([sale.brandName, sale.modelName, sale.variantName]) ||
                "—"}
            </strong>
            <p>{sale.vehicleNo}</p>
          </div>
        </section>

        <table className="order-document__lines">
          <caption className="sr-only">Invoice lines</caption>
          <thead>
            <tr>
              <th>Description</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Vehicle sale</strong>
                <small>
                  {joinMeta([
                    sale.brandName,
                    sale.modelName,
                    sale.variantName,
                    sale.vehicleNo,
                  ])}
                </small>
              </td>
              <td>{formatCurrency(sale.saleRate)}</td>
              <td>{formatCurrency(sale.saleRate)}</td>
            </tr>
            {splits.map((split, index) => (
              <tr key={split.id ?? `split-${index}`}>
                <td>
                  <strong>{split.typeDesc ?? `Split ${split.typeId}`}</strong>
                  <small>Amount split</small>
                </td>
                <td>—</td>
                <td>{formatCurrency(split.amount)}</td>
              </tr>
            ))}
            {sale.exchange && (
              <tr>
                <td>
                  <strong>Exchange credit</strong>
                  <small>
                    {exchange?.vehicleNo
                      ? `Trade-in ${exchange.vehicleNo}`
                      : "Trade-in vehicle"}
                  </small>
                </td>
                <td>—</td>
                <td>−{formatCurrency(sale.exchangeAmount)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="order-document__totals">
          <dl>
            <div>
              <dt>Sale rate</dt>
              <dd>
                <Money value={sale.saleRate} />
              </dd>
            </div>
            {sale.exchange && (
              <div>
                <dt>Exchange</dt>
                <dd>
                  <Money value={sale.exchangeAmount} />
                </dd>
              </div>
            )}
            <div className="order-document__total">
              <dt>Net sale</dt>
              <dd>
                <Money value={sale.netSaleAmount ?? sale.saleRate} />
              </dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd>
                <Money value={sale.paidAmount} />
              </dd>
            </div>
            <div>
              <dt>Pending</dt>
              <dd>
                <Money value={sale.pendingAmount} />
              </dd>
            </div>
            <div className="order-document__pdf-hide">
              <dt>Profit</dt>
              <dd>
                <Money value={sale.profit} />
              </dd>
            </div>
          </dl>
        </div>

        {sale.financed && (
          <aside className="order-document__callout order-document__callout--info">
            <h3>Finance</h3>
            <p>
              {joinMeta([
                sale.financeCompany,
                sale.emiAmount != null
                  ? `EMI ${formatCurrency(sale.emiAmount)}`
                  : null,
              ]) || "Financed sale"}
            </p>
            <dl>
              <div>
                <dt>Finance amount</dt>
                <dd>
                  <Money value={sale.financeAmount} />
                </dd>
              </div>
              <div>
                <dt>Finance pending</dt>
                <dd>
                  <Money value={sale.pendingFinanceAmount} />
                </dd>
              </div>
              <div>
                <dt>Customer pending</dt>
                <dd>
                  <Money value={sale.pendingCustomerAmount} />
                </dd>
              </div>
            </dl>
          </aside>
        )}

        {sale.exchange && (
          <aside className="order-document__callout">
            <h3>Exchange vehicle</h3>
            <p>
              {joinMeta([
                exchange?.vehicleNo,
                exchange?.code,
                exchange?.makeYear,
                exchange?.odometer != null ? `${exchange.odometer} km` : null,
                exchange?.ownerShipSerialNo
                  ? `Serial ${exchange.ownerShipSerialNo}`
                  : null,
              ]) || "Trade-in recorded"}
            </p>
            <dl>
              <div>
                <dt>Exchange amount</dt>
                <dd>
                  <Money value={sale.exchangeAmount} />
                </dd>
              </div>
              <div>
                <dt>Purchase rate</dt>
                <dd>
                  <Money value={exchange?.purchaseRate} />
                </dd>
              </div>
              <div>
                <dt>Expenses</dt>
                <dd>
                  <Money
                    value={(exchange?.expenses ?? []).reduce(
                      (sum, expense) => sum + (Number(expense.amount) || 0),
                      0,
                    )}
                  />
                </dd>
              </div>
            </dl>
          </aside>
        )}
      </OrderDocument>

      <Modal
        open={paymentsOpen}
        title="Payments"
        className="modal--wide"
        onClose={() => setPaymentsOpen(false)}
        footer={
          canRecordPayment ? (
            <Can resource="SALE" privilege="CREATE">
              <Link
                className="button button--primary"
                to={`${SALES}/${saleId}/payment`}
              >
                Record payment
              </Link>
            </Can>
          ) : undefined
        }
      >
        <dl className="order-document-modal__summary">
          <div>
            <dt>Paid</dt>
            <dd>
              <Money value={sale.paidAmount} />
            </dd>
          </div>
          <div>
            <dt>Pending</dt>
            <dd>
              <Money value={sale.pendingAmount} />
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <Badge tone={paymentTone(sale.paymentStatus)}>
                {sale.paymentStatus ?? "PENDING"}
              </Badge>
            </dd>
          </div>
          {sale.financed && (
            <>
              <div>
                <dt>Customer pending</dt>
                <dd>
                  <Money value={sale.pendingCustomerAmount} />
                </dd>
              </div>
              <div>
                <dt>Finance pending</dt>
                <dd>
                  <Money value={sale.pendingFinanceAmount} />
                </dd>
              </div>
            </>
          )}
        </dl>
        <DataTable
          caption="Sale payments"
          rows={payments}
          emptyMessage="No payments recorded"
          emptyDescription="Customer receipts for this sale will appear here."
          rowKey={(row) => String(row.id)}
          columns={[
            {
              key: "date",
              header: "Date",
              cell: (row) => formatDate(row.paymentDate),
            },
            {
              key: "payer",
              header: "Payer",
              cell: (row) => row.payerType ?? "CUSTOMER",
            },
            {
              key: "method",
              header: "Method",
              cell: (row) => row.paymentMethod ?? "—",
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              cell: (row) => formatCurrency(row.amount),
            },
            {
              key: "action",
              header: "",
              cell: (row: Payment) => (
                <span className="operations-inline-actions">
                  <AuditHistoryButton
                    entityType="sale-payment"
                    entityId={row.id}
                    variant="ghost"
                  />
                  <Link to={`${SALES}/${saleId}/payments/${row.id}/edit`}>
                    Edit
                  </Link>
                </span>
              ),
            },
          ]}
        />
      </Modal>
    </>
  );
};
