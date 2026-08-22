import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge, Button, DataTable, Modal } from "../../components/ui";
import { Can } from "../../components/Can";
import { formatCurrency, formatDate } from "../../lib/utils";
import type { PaymentStatus } from "../../services/operations";
import type {
  ServiceSale,
  ServiceSalePayment,
} from "../../services/serviceSales";
import { warehouseApi } from "../../services/warehouse";
import { Money } from "./common";
import { OrderDocument, OrderDocumentBrand } from "./OrderDocument";

const SERVICE_SALES = "/sales/service-sales";

const paymentTone = (
  status?: PaymentStatus | string | null,
): "success" | "warning" | "danger" | "neutral" => {
  if (status === "PAID") return "success";
  if (status === "PARTIAL") return "warning";
  if (status === "UNPAID" || status === "PENDING") return "danger";
  return "neutral";
};

const customerLabel = (sale: ServiceSale) =>
  sale.customerName?.trim() || sale.walkInCustomerName?.trim() || "Walk-in";

export const ServiceSaleDocument = ({
  sale,
  saleId,
  onDeletePayment,
}: {
  sale: ServiceSale;
  saleId: number;
  onDeletePayment: (paymentId: number) => void;
}) => {
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const payments = sale.payments ?? [];
  const items = sale.items ?? [];
  const pending = Number(sale.totalAmount ?? 0) - Number(sale.paidAmount ?? 0);
  const canRecordPayment = pending > 0 && sale.paymentStatus !== "PAID";
  const warehouses = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehouseApi.list,
  });
  const warehouseName =
    warehouses.data?.find((item) => item.id === sale.warehouseId)?.name ?? "—";

  return (
    <>
      <OrderDocument filename={sale.invoiceNo || `SSO-${sale.id}`}>
        <header className="order-document__masthead">
          <OrderDocumentBrand documentTitle="Service invoice" />
          <div className="order-document__meta">
            <strong className="order-document__code">
              {sale.invoiceNo ? `#${sale.invoiceNo}` : `#SSO-${sale.id}`}
            </strong>
            <Badge tone={paymentTone(sale.paymentStatus)}>
              {sale.paymentStatus ?? "PENDING"}
            </Badge>
            <dl>
              <div>
                <dt>Date</dt>
                <dd>{formatDate(sale.saleDate)}</dd>
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
            <strong>{customerLabel(sale)}</strong>
            <p>
              {sale.customerId
                ? "Existing customer"
                : sale.walkInCustomerName
                  ? "Walk-in"
                  : "—"}
            </p>
          </div>
          <div>
            <h3>Warehouse</h3>
            <strong>{warehouseName}</strong>
          </div>
        </section>

        <table className="order-document__lines">
          <caption className="sr-only">Invoice lines</caption>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id ?? `line-${index}`}>
                <td>
                  <strong>{item.description}</strong>
                </td>
                <td>{item.qty}</td>
                <td>{formatCurrency(item.rate)}</td>
                <td>
                  {formatCurrency(
                    item.amount ?? Number(item.qty) * Number(item.rate),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="order-document__totals">
          <dl>
            <div className="order-document__total">
              <dt>Total</dt>
              <dd>
                <Money value={sale.totalAmount} />
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
                <Money value={pending} />
              </dd>
            </div>
          </dl>
        </div>

        {sale.notes && (
          <section className="order-document__notes">
            <h3>Notes</h3>
            <p>{sale.notes}</p>
          </section>
        )}
      </OrderDocument>

      <Modal
        open={paymentsOpen}
        title="Payments"
        className="modal--wide"
        onClose={() => setPaymentsOpen(false)}
        footer={
          canRecordPayment ? (
            <Can resource="SERVICE_SALE" privilege="CREATE">
              <Link
                className="button button--primary"
                to={`${SERVICE_SALES}/${saleId}/payment`}
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
              <Money value={pending} />
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
        </dl>
        <DataTable
          caption="Service sale payments"
          rows={payments}
          emptyMessage="No payments recorded"
          emptyDescription="Receipts for this service sale will appear here."
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
              key: "account",
              header: "Account",
              cell: (row) => row.paymentAccountName || "—",
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
              cell: (row: ServiceSalePayment) => (
                <span className="operations-inline-actions">
                  <Can resource="SERVICE_SALE" privilege="DELETE">
                    <Button
                      variant="ghost"
                      onClick={() => onDeletePayment(row.id)}
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
