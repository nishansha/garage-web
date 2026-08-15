import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, DataTable, Modal } from "../../components/ui";
import { Can } from "../../components/Can";
import { AuditHistoryButton } from "../audit/AuditHistory";
import { formatCurrency, formatDate } from "../../lib/utils";
import type {
  ExchangeHandling,
  Payment,
  ReturnStatus,
  SaleReturn,
} from "../../services/operations";
import { Money } from "./common";
import { OrderDocument, OrderDocumentBrand } from "./OrderDocument";

const RETURNS = "/sales/returns";

const statusTone = (
  status?: ReturnStatus | null,
): "success" | "warning" | "danger" | "neutral" => {
  if (status === "COMPLETED") return "success";
  if (status === "PARTIAL") return "warning";
  if (status === "PENDING") return "danger";
  return "neutral";
};

const joinMeta = (values: Array<string | number | null | undefined>) =>
  values
    .map((value) => (value == null || value === "" ? null : String(value)))
    .filter(Boolean)
    .join(" · ");

const exchangeHandlingLabel = (value: ExchangeHandling) =>
  value.replaceAll("_", " ");

export const SaleReturnDocument = ({
  item,
  returnId,
  onDeleteRefund,
}: {
  item: SaleReturn;
  returnId: number;
  onDeleteRefund: (refundId: number) => void;
}) => {
  const [refundsOpen, setRefundsOpen] = useState(false);
  const refunds = item.refunds ?? [];
  const deductions = item.deductions ?? [];
  const hasExchange =
    item.exchangeHandling !== "NONE" ||
    (item.exchangeBuybackAmount ?? 0) > 0 ||
    item.exchangeVehicleDeductionAmount > 0;
  const canRecordRefund =
    item.status !== "COMPLETED" && item.remainingRefund > 0;

  return (
    <>
      <OrderDocument
        filename={`SR-${item.id}-${item.productNo ?? item.invoiceNo}`}
      >
        <header className="order-document__masthead">
          <OrderDocumentBrand documentTitle="Sale return" />
          <div className="order-document__meta">
            <strong className="order-document__code">
              #{item.invoiceNo.replace(/^#/, "")}
            </strong>
            <Badge tone={statusTone(item.status)}>{item.status}</Badge>
            <dl>
              <div>
                <dt>Date</dt>
                <dd>{formatDate(item.returnDate)}</dd>
              </div>
              <div>
                <dt>Original sale</dt>
                <dd>
                  <Link to={`/sales/sales/${item.saleId}`}>
                    #SO-{item.saleId}
                  </Link>
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <nav className="order-document__tabs" aria-label="Related records">
          <button type="button" onClick={() => setRefundsOpen(true)}>
            Refunds
            <span className="order-document__count">{refunds.length}</span>
          </button>
        </nav>

        <section className="order-document__parties">
          <div>
            <h3>Reason</h3>
            <strong>{item.reason || "—"}</strong>
            <p>{exchangeHandlingLabel(item.exchangeHandling)}</p>
          </div>
          <div>
            <h3>Vehicle</h3>
            <strong>
              {joinMeta([item.brandName, item.modelName, item.variantName]) ||
                "—"}
            </strong>
            <p>{item.productNo ?? "—"}</p>
          </div>
        </section>

        <table className="order-document__lines">
          <caption className="sr-only">Return lines</caption>
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
                <strong>Vehicle return</strong>
                <small>
                  {joinMeta([
                    item.brandName,
                    item.modelName,
                    item.variantName,
                    item.productNo,
                  ])}
                </small>
              </td>
              <td>{formatCurrency(item.customerPaidAmount)}</td>
              <td>{formatCurrency(item.customerPaidAmount)}</td>
            </tr>
            {deductions.map((deduction) => (
              <tr key={deduction.id}>
                <td>
                  <strong>{deduction.description}</strong>
                  <small>
                    {deduction.vehicleContext === "EXCHANGE"
                      ? "Exchange vehicle deduction"
                      : "Sold vehicle deduction"}
                  </small>
                </td>
                <td>—</td>
                <td>−{formatCurrency(deduction.amount)}</td>
              </tr>
            ))}
            {(item.exchangeBuybackAmount ?? 0) > 0 && (
              <tr>
                <td>
                  <strong>Exchange buyback</strong>
                  <small>{exchangeHandlingLabel(item.exchangeHandling)}</small>
                </td>
                <td>—</td>
                <td>{formatCurrency(item.exchangeBuybackAmount)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="order-document__totals">
          <dl>
            <div>
              <dt>Customer paid</dt>
              <dd>
                <Money value={item.customerPaidAmount} />
              </dd>
            </div>
            <div>
              <dt>Sold deductions</dt>
              <dd>
                <Money value={item.soldVehicleDeductionAmount} />
              </dd>
            </div>
            {hasExchange && (
              <div>
                <dt>Exchange deductions</dt>
                <dd>
                  <Money value={item.exchangeVehicleDeductionAmount} />
                </dd>
              </div>
            )}
            {(item.exchangeBuybackAmount ?? 0) > 0 && (
              <div>
                <dt>Buyback</dt>
                <dd>
                  <Money value={item.exchangeBuybackAmount} />
                </dd>
              </div>
            )}
            <div className="order-document__total">
              <dt>Refund due</dt>
              <dd>
                <Money value={item.refundAmount} />
              </dd>
            </div>
            <div>
              <dt>Refunded</dt>
              <dd>
                <Money value={item.totalRefunded} />
              </dd>
            </div>
            <div>
              <dt>Remaining</dt>
              <dd>
                <Money value={item.remainingRefund} />
              </dd>
            </div>
          </dl>
        </div>

        {item.notes && (
          <section className="order-document__notes">
            <h3>Notes</h3>
            <p>{item.notes}</p>
          </section>
        )}
      </OrderDocument>

      <Modal
        open={refundsOpen}
        title="Refunds"
        className="modal--wide"
        onClose={() => setRefundsOpen(false)}
        footer={
          canRecordRefund ? (
            <Link
              className="button button--primary"
              to={`${RETURNS}/${returnId}/refund`}
            >
              Record refund
            </Link>
          ) : undefined
        }
      >
        <dl className="order-document-modal__summary">
          <div>
            <dt>Refund due</dt>
            <dd>
              <Money value={item.refundAmount} />
            </dd>
          </div>
          <div>
            <dt>Refunded</dt>
            <dd>
              <Money value={item.totalRefunded} />
            </dd>
          </div>
          <div>
            <dt>Remaining</dt>
            <dd>
              <Money value={item.remainingRefund} />
            </dd>
          </div>
        </dl>
        <DataTable
          caption="Return refunds"
          rows={refunds}
          emptyMessage="No refunds recorded"
          emptyDescription="Refunds issued for this return will appear here."
          rowKey={(row) => String(row.id)}
          columns={[
            {
              key: "date",
              header: "Date",
              cell: (row) => formatDate(row.paymentDate),
            },
            {
              key: "reference",
              header: "Reference",
              cell: (row) => row.referenceNo ?? "—",
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              cell: (row) => formatCurrency(row.amount),
            },
            {
              key: "actions",
              header: "",
              cell: (row: Payment) => (
                <span className="operations-inline-actions">
                  <AuditHistoryButton
                    entityType="sale-refund-payment"
                    entityId={row.id}
                    variant="ghost"
                  />
                  <Can resource="SALE_RETURN" privilege="UPDATE">
                    <Link to={`${RETURNS}/${returnId}/refunds/${row.id}/edit`}>
                      Edit
                    </Link>
                  </Can>
                  <Can resource="SALE_RETURN" privilege="DELETE">
                    <Button
                      variant="ghost"
                      onClick={() => onDeleteRefund(row.id)}
                    >
                      Delete
                    </Button>
                  </Can>
                </span>
              ),
            },
          ]}
        />
      </Modal>
    </>
  );
};
