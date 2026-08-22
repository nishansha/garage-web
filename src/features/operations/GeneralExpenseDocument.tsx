import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  operationsApi,
  type Expense,
  type PaymentAccount,
} from "../../services/operations";
import { Money } from "./common";
import { OrderDocument, OrderDocumentBrand } from "./OrderDocument";

const expenseType = (expense: Expense) =>
  expense.typeDesc ||
  expense.type ||
  expense.expenseType ||
  expense.title ||
  "Expense";

const paymentAccountLabel = (account: PaymentAccount) =>
  account.accountType === "BANK" && account.bankName
    ? `${account.name} (${account.bankName})`
    : account.name;

export const GeneralExpenseDocument = ({ expense }: { expense: Expense }) => {
  const accounts = useQuery({
    queryKey: ["operations", "payment-accounts", expense.companyId],
    queryFn: () => operationsApi.paymentAccounts(expense.companyId),
    enabled: expense.paymentAccountId != null,
  });
  const typeLabel = expenseType(expense);
  const account = accounts.data?.find(
    (item) => item.id === expense.paymentAccountId,
  );

  return (
    <OrderDocument filename={`EXP-${expense.id}-${typeLabel}`}>
      <header className="order-document__masthead">
        <OrderDocumentBrand documentTitle="General expense" />
        <div className="order-document__meta">
          <strong className="order-document__code">#EXP-{expense.id}</strong>
          <dl>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(expense.date)}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="order-document__parties">
        <div>
          <h3>Expense type</h3>
          <strong>{typeLabel}</strong>
        </div>
        <div>
          <h3>Paid from</h3>
          <strong>
            {account
              ? paymentAccountLabel(account)
              : expense.paymentAccountId
                ? `Account #${expense.paymentAccountId}`
                : "—"}
          </strong>
        </div>
      </section>

      <table className="order-document__lines">
        <caption className="sr-only">Expense lines</caption>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>{expense.description || typeLabel}</strong>
              <small>{typeLabel}</small>
            </td>
            <td>{formatCurrency(expense.amount)}</td>
          </tr>
        </tbody>
      </table>

      <div className="order-document__totals">
        <dl>
          <div className="order-document__total">
            <dt>Total</dt>
            <dd>
              <Money value={expense.amount} />
            </dd>
          </div>
        </dl>
      </div>
    </OrderDocument>
  );
};
