import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, DataTable, Modal } from "../../components/ui";
import { Can } from "../../components/Can";
import { AuditHistoryButton } from "../audit/AuditHistory";
import { formatCurrency, formatDate } from "../../lib/utils";
import type {
  Payment,
  PaymentStatus,
  Purchase,
} from "../../services/operations";
import { Money } from "./common";

const PURCHASES = "/purchase/purchases";

const paymentTone = (
  status?: PaymentStatus | null,
): "success" | "warning" | "danger" | "neutral" => {
  if (status === "PAID") return "success";
  if (status === "PARTIAL") return "warning";
  if (status === "UNPAID" || status === "PENDING") return "danger";
  return "neutral";
};

const joinMeta = (values: Array<string | number | null | undefined>) =>
  values
    .map((value) => (value == null || value === "" ? null : String(value)))
    .filter(Boolean)
    .join(" · ");

const expenseTotal = (purchase: Purchase) =>
  (purchase.expenses ?? []).reduce(
    (sum, expense) => sum + (Number(expense.amount) || 0),
    0,
  );

export const PurchaseOrderDocument = ({
  purchase,
  purchaseId,
  onDeleteRcDueReceipt,
}: {
  purchase: Purchase;
  purchaseId: number;
  onDeleteRcDueReceipt: (receiptId: number) => void;
}) => {
  const [modal, setModal] = useState<"payments" | "rcd" | null>(null);
  const payments = purchase.payments ?? [];
  const expenses = purchase.expenses ?? [];
  const receipts = purchase.rcDueReceipts ?? [];
  const hasRcd = (purchase.rcDueAmount ?? 0) > 0;
  const vehicleMeta = joinMeta([
    purchase.colorName,
    purchase.fuelType,
    purchase.transmissionType,
    purchase.segmentName,
    purchase.makeYear,
    purchase.odometer != null ? `${purchase.odometer} km` : null,
    purchase.ownerShipSerialNo ? `Owners ${purchase.ownerShipSerialNo}` : null,
  ]);
  const canRecordPayment =
    !purchase.returned &&
    (purchase.pendingAmount ?? 0) > 0 &&
    purchase.paymentStatus !== "PAID";

  return (
    <>
      <article className="order-document">
        <header className="order-document__masthead">
          <div>
            <p className="order-document__kicker">Purchase order</p>
            <h2>{purchase.vehicleNo}</h2>
            <p className="order-document__subtitle">
              {joinMeta([
                purchase.brandName,
                purchase.modelName,
                purchase.variantName,
              ])}
            </p>
          </div>
          <div className="order-document__meta">
            {purchase.code && (
              <strong className="order-document__code">#PO-{purchase.id}</strong>
            )}
            {purchase.returned ? (
              <Badge tone="warning">Returned</Badge>
            ) : (
              <Badge tone={paymentTone(purchase.paymentStatus)}>
                {purchase.paymentStatus ?? "PENDING"}
              </Badge>
            )}
            <dl>
              <div>
                <dt>Date</dt>
                <dd>{formatDate(purchase.date)}</dd>
              </div>
              <div>
                <dt>Delivered</dt>
                <dd>{formatDate(purchase.deliveredDate)}</dd>
              </div>
            </dl>
          </div>
        </header>

        <nav className="order-document__tabs" aria-label="Related records">
          <button type="button" onClick={() => setModal("payments")}>
            Payments
            <span className="order-document__count">{payments.length}</span>
          </button>
          {hasRcd && (
            <button type="button" onClick={() => setModal("rcd")}>
              RCD
              <span className="order-document__count">{receipts.length}</span>
            </button>
          )}
        </nav>

        <section className="order-document__parties">
          <div>
            <h3>Vendor</h3>
            <strong>{purchase.ownerName ?? "—"}</strong>
            <p>{purchase.ownerMobileNo ?? "—"}</p>
            <p>{purchase.ownerAddress ?? "—"}</p>
          </div>
          <div>
            <h3>Pickup / warehouse</h3>
            <strong>{purchase.warehouseName ?? "—"}</strong>
            <p>{purchase.pickupStaffName ?? "No pickup staff"}</p>
            <p>{purchase.pickupLocation ?? "—"}</p>
          </div>
        </section>

        <section className="order-document__vehicle">
          <h3>{purchase.code}</h3>
          <p>{vehicleMeta || "—"}</p>
        </section>

        <table className="order-document__lines">
          <caption className="sr-only">Order lines</caption>
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
                <strong>{purchase.code}</strong>
                <small>
                  {joinMeta([
                    purchase.brandName,
                    purchase.modelName,
                    purchase.variantName,
                  ])}
                </small>
              </td>
              <td>{formatCurrency(purchase.purchaseRate)}
              <small>RCD: {formatCurrency(purchase?.rcDueAmount ?? 0)}</small>
              </td>
              <td>{formatCurrency(purchase.purchaseRate + (purchase?.rcDueAmount ?? 0))}</td>
            </tr>
            {expenses.map((expense, index) => (
              <tr key={expense.id ?? `expense-${index}`}>
                <td>
                  <strong>{expense.description}</strong>
                  <small>{formatDate(expense.date)}</small>
                </td>
                <td>-</td>
                <td>{formatCurrency(expense.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="order-document__totals">
          <dl>
            <div>
              <dt>Purchase rate</dt>
              <dd>
                <Money value={purchase.purchaseRate} />
              </dd>
            </div>
            <div>
              <dt>RC Deposit</dt>
              <dd>
                <Money value={purchase?.rcDueAmount ?? 0} />
              </dd>
            </div>
            <div>
              <dt>Expenses</dt>
              <dd>
                <Money value={expenseTotal(purchase)} />
              </dd>
            </div>
            <div className="order-document__total">
              <dt>Total</dt>
              <dd>
                <Money value={purchase.totalCost} />
              </dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd>
                <Money value={purchase.paidAmount} />
              </dd>
            </div>
            <div>
              <dt>Pending</dt>
              <dd>
                <Money value={purchase.pendingAmount} />
              </dd>
            </div>
          </dl>
        </div>

        {hasRcd && (
          <aside className="order-document__callout">
            <h3>RC Deposit</h3>
            <dl>
              <div>
                <dt>Amount</dt>
                <dd>
                  <Money value={purchase.rcDueAmount} />
                </dd>
              </div>
              <div>
                <dt>Received</dt>
                <dd>
                  <Money value={purchase.paidRcDueAmount} />
                </dd>
              </div>
              <div>
                <dt>Pending</dt>
                <dd>
                  <Money value={purchase.pendingRcDueAmount} />
                </dd>
              </div>
            </dl>
          </aside>
        )}

        {purchase.notes && (
          <section className="order-document__notes">
            <h3>Notes</h3>
            <p>{purchase.notes}</p>
          </section>
        )}
      </article>

      <Modal
        open={modal === "payments"}
        title="Payments"
        className="modal--wide"
        onClose={() => setModal(null)}
        footer={
          canRecordPayment ? (
            <Can resource="PURCHASE_PAYMENT" privilege="CREATE">
              <Link
                className="button button--primary"
                to={`${PURCHASES}/${purchaseId}/payment`}
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
              <Money value={purchase.paidAmount} />
            </dd>
          </div>
          <div>
            <dt>Pending</dt>
            <dd>
              <Money value={purchase.pendingAmount} />
            </dd>
          </div>
          {!purchase.returned && (
            <div>
              <dt>Status</dt>
              <dd>
                <Badge tone={paymentTone(purchase.paymentStatus)}>
                  {purchase.paymentStatus ?? "PENDING"}
                </Badge>
              </dd>
            </div>
          )}
        </dl>
        <DataTable
          caption="Purchase payments"
          rows={payments}
          emptyMessage="No payments recorded"
          emptyDescription="Vendor payments for this purchase will appear here."
          rowKey={(row) => String(row.id)}
          columns={[
            {
              key: "date",
              header: "Date",
              cell: (row) => formatDate(row.paymentDate),
            },
            {
              key: "method",
              header: "Method",
              cell: (row) => row.paymentMethod ?? "—",
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
                    entityType="purchase-payment"
                    entityId={row.id}
                    variant="ghost"
                  />
                  {purchase.editable !== false && (
                    <Link
                      to={`${PURCHASES}/${purchaseId}/payments/${row.id}/edit`}
                    >
                      Edit
                    </Link>
                  )}
                </span>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        open={modal === "rcd"}
        title="RCD receipts"
        className="modal--wide"
        onClose={() => setModal(null)}
        footer={
          (purchase.pendingRcDueAmount ?? 0) > 0 ? (
            <Can resource="PURCHASE_PAYMENT" privilege="CREATE">
              <Link
                className="button button--primary"
                to={`${PURCHASES}/${purchaseId}/rc-due-receipts/new`}
              >
                Record RCD Receipt
              </Link>
            </Can>
          ) : undefined
        }
      >
        <dl className="order-document-modal__summary">
          <div>
            <dt>RCD amount</dt>
            <dd>
              <Money value={purchase.rcDueAmount} />
            </dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd>
              <Money value={purchase.paidRcDueAmount} />
            </dd>
          </div>
          <div>
            <dt>Pending</dt>
            <dd>
              <Money value={purchase.pendingRcDueAmount} />
            </dd>
          </div>
        </dl>
        <DataTable
          caption="RCD receipts"
          rows={receipts}
          rowKey={(row) => String(row.id)}
          emptyMessage="No RCD receipts recorded"
          emptyDescription="Receipts against this purchase's RC deposit will appear here."
          columns={[
            {
              key: "date",
              header: "Date",
              cell: (row) => formatDate(row.receiptDate),
            },
            {
              key: "method",
              header: "Method",
              cell: (row) => row.paymentMethod,
            },
            {
              key: "account",
              header: "Account",
              cell: (row) => row.paymentAccountName,
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
              cell: (row) => (
                <span className="operations-inline-actions">
                  <Can resource="PURCHASE_PAYMENT" privilege="UPDATE">
                    <Link
                      to={`${PURCHASES}/${purchaseId}/rc-due-receipts/${row.id}/edit`}
                    >
                      Edit
                    </Link>
                  </Can>
                  <Can resource="PURCHASE_PAYMENT" privilege="DELETE">
                    <Button
                      variant="ghost"
                      onClick={() => onDeleteRcDueReceipt(row.id)}
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
