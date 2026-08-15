import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, DataTable, Modal } from "../../components/ui";
import { AuditHistoryButton } from "../audit/AuditHistory";
import { formatCurrency, formatDate } from "../../lib/utils";
import type {
  Payment,
  PurchaseReturn,
  ReturnStatus,
} from "../../services/operations";
import { Money } from "./common";
import { OrderDocument, OrderDocumentBrand } from "./OrderDocument";

const PURCHASES = "/purchase/purchases";
const RETURNS = "/purchase/returns";

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

export const PurchaseReturnDocument = ({
  item,
  returnId,
}: {
  item: PurchaseReturn;
  returnId: number;
}) => {
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const receipts = item.receipts ?? [];
  const canRecordReceipt = item.status === "PENDING";
  const documentCode = (item.purchaseReferenceNo ?? `PR-${item.id}`).replace(
    /^#/,
    "",
  );

  return (
    <>
      <OrderDocument
        filename={`PR-${item.id}-${item.vehicleNo ?? item.uin ?? item.id}`}
      >
        <header className="order-document__masthead">
          <OrderDocumentBrand documentTitle="Purchase return" />
          <div className="order-document__meta">
            <strong className="order-document__code">#{documentCode}</strong>
            <Badge tone={statusTone(item.status)}>{item.status}</Badge>
            <dl>
              <div>
                <dt>Date</dt>
                <dd>{formatDate(item.returnDate)}</dd>
              </div>
              <div>
                <dt>Original purchase</dt>
                <dd>
                  <Link to={`${PURCHASES}/${item.purchaseId}`}>
                    #PO-{item.purchaseId}
                  </Link>
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <nav className="order-document__tabs" aria-label="Related records">
          <button type="button" onClick={() => setReceiptsOpen(true)}>
            Receipts
            <span className="order-document__count">{receipts.length}</span>
          </button>
        </nav>

        <section className="order-document__parties">
          <div>
            <h3>Vendor</h3>
            <strong>{item.vendorName ?? "—"}</strong>
            <p>{item.reason || "—"}</p>
          </div>
          <div>
            <h3>Vehicle</h3>
            <strong>
              {joinMeta([item.brandName, item.modelName, item.variantName]) ||
                "—"}
            </strong>
            <p>{item.vehicleNo ?? item.uin}</p>
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
                    item.vehicleNo ?? item.uin,
                  ])}
                </small>
              </td>
              <td>{formatCurrency(item.inventoryLandedCost)}</td>
              <td>{formatCurrency(item.inventoryLandedCost)}</td>
            </tr>
            <tr>
              <td>
                <strong>Vendor invoice</strong>
                <small>Original amount billed by the vendor</small>
              </td>
              <td>—</td>
              <td>{formatCurrency(item.vendorInvoiceAmount)}</td>
            </tr>
            <tr>
              <td>
                <strong>Paid to vendor</strong>
                <small>Already settled against this purchase</small>
              </td>
              <td>—</td>
              <td>{formatCurrency(item.paidToVendor)}</td>
            </tr>
            {(item.outstandingAp ?? 0) > 0 && (
              <tr>
                <td>
                  <strong>Outstanding payable</strong>
                  <small>Still due to the vendor</small>
                </td>
                <td>—</td>
                <td>{formatCurrency(item.outstandingAp)}</td>
              </tr>
            )}
            {(item.unwindAmount ?? 0) > 0 && (
              <tr>
                <td>
                  <strong>Unwind</strong>
                  <small>Payable reversed on return</small>
                </td>
                <td>—</td>
                <td>{formatCurrency(item.unwindAmount)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="order-document__totals">
          <dl>
            <div>
              <dt>Landed cost</dt>
              <dd>
                <Money value={item.inventoryLandedCost} />
              </dd>
            </div>
            <div>
              <dt>Paid to vendor</dt>
              <dd>
                <Money value={item.paidToVendor} />
              </dd>
            </div>
            {(item.unwindAmount ?? 0) > 0 && (
              <div>
                <dt>Unwind</dt>
                <dd>
                  <Money value={item.unwindAmount} />
                </dd>
              </div>
            )}
            <div className="order-document__total">
              <dt>Refund expected</dt>
              <dd>
                <Money value={item.refundAmount} />
              </dd>
            </div>
            <div>
              <dt>Loss on return</dt>
              <dd>
                <Money value={item.lossOnReturn} />
              </dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd>
                <Money value={item.totalReceived} />
              </dd>
            </div>
            <div>
              <dt>Remaining</dt>
              <dd>
                <Money value={item.remainingReceivable} />
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
        open={receiptsOpen}
        title="Receipts"
        className="modal--wide"
        onClose={() => setReceiptsOpen(false)}
        footer={
          canRecordReceipt ? (
            <Link
              className="button button--primary"
              to={`${RETURNS}/${returnId}/receipt`}
            >
              Record receipt
            </Link>
          ) : undefined
        }
      >
        <dl className="order-document-modal__summary">
          <div>
            <dt>Refund expected</dt>
            <dd>
              <Money value={item.refundAmount} />
            </dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd>
              <Money value={item.totalReceived} />
            </dd>
          </div>
          <div>
            <dt>Remaining</dt>
            <dd>
              <Money value={item.remainingReceivable} />
            </dd>
          </div>
        </dl>
        <DataTable
          caption="Return receipts"
          rows={receipts}
          emptyMessage="No receipts recorded"
          emptyDescription="Refunds received for this return will appear here."
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
              key: "action",
              header: "",
              cell: (row: Payment) => (
                <span className="operations-inline-actions">
                  <AuditHistoryButton
                    entityType="purchase-return-receipt"
                    entityId={row.id}
                    variant="ghost"
                  />
                  <Link to={`${RETURNS}/${returnId}/receipts/${row.id}/edit`}>
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
