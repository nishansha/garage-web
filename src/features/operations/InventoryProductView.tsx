import { Image } from "lucide-react";
import { Badge } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/utils";
import type { Stock } from "../../services/operations";
import { Money } from "./common";

const joinMeta = (values: Array<string | number | null | undefined>) =>
  values
    .map((value) => (value == null || value === "" ? null : String(value)))
    .filter(Boolean)
    .join(" · ");

const statusTone = (
  status?: string | null,
): "success" | "warning" | "neutral" => {
  if (status === "AVAILABLE") return "success";
  if (status === "SOLD") return "neutral";
  return "warning";
};

export const InventoryProductView = ({ item }: { item: Stock }) => {
  const sold =
    Boolean(item.soldDate) ||
    item.saleRate != null ||
    item.profit != null ||
    item.status === "SOLD";
  const specs = joinMeta([
    item.color,
    item.fuelType,
    item.odometer != null ? `${item.odometer} km` : null,
  ]);

  return (
    <article className="product-profile">
      <div className="product-profile__hero">
        <figure className="product-profile__media">
          <div className="product-profile__media-empty">
            <Image aria-hidden="true" />
            <span>Photos</span>
          </div>
        </figure>
        <div className="product-profile__identity">
          <div className="product-profile__identity-top">
            <p className="product-profile__kicker">Inventory</p>
            <Badge tone={statusTone(item.status)}>
              {item.status?.replaceAll("_", " ") ?? "—"}
            </Badge>
          </div>
          <h2>{item.productCode}</h2>
          <p className="product-profile__subtitle">
            {joinMeta([item.brandName, item.modelName, item.variantName])}
          </p>
          {specs && <p className="product-profile__specs">{specs}</p>}
          <dl className="product-profile__dates">
            <div>
              <dt>Purchased</dt>
              <dd>{formatDate(item.purchaseDate)}</dd>
            </div>
            {item.soldDate && (
              <div>
                <dt>Sold</dt>
                <dd>{formatDate(item.soldDate)}</dd>
              </div>
            )}
          </dl>
          <div className="product-profile__metrics">
            <div>
              <span>Landed cost</span>
              <strong>
                <Money value={item.landedCost} />
              </strong>
            </div>
            {sold ? (
              <>
                <div>
                  <span>Sale rate</span>
                  <strong>
                    <Money value={item.saleRate} />
                  </strong>
                </div>
                <div
                  className={
                    (item.profit ?? 0) >= 0 ? "is-positive" : "is-negative"
                  }
                >
                  <span>Profit</span>
                  <strong>
                    <Money value={item.profit} />
                  </strong>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span>Purchased</span>
                  <strong>
                    <Money value={item.purchasedAmount} />
                  </strong>
                </div>
                <div>
                  <span>Expenses</span>
                  <strong>
                    <Money value={item.purchaseExpense} />
                  </strong>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <section className="product-profile__parties">
        <div>
          <h3>Vendor</h3>
          <strong>{item.vendorName ?? "—"}</strong>
          <p>{item.vendorMobileNo ?? "—"}</p>
          <p>{item.vendorAddress ?? "—"}</p>
        </div>
        <div>
          <h3>Customer</h3>
          {sold ? (
            <>
              <strong>{item.customerName ?? "—"}</strong>
              <p>{item.customerMobileNo ?? "—"}</p>
              <p>{item.customerAddress ?? "—"}</p>
            </>
          ) : (
            <p>Not sold yet</p>
          )}
        </div>
      </section>

      <table className="product-profile__lines">
        <caption className="sr-only">Cost lines</caption>
        <thead>
          <tr>
            <th>Description</th>
            <th>Date</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Purchase</strong>
              <small>
                {joinMeta([
                  item.brandName,
                  item.modelName,
                  item.variantName,
                  item.productCode,
                ])}
              </small>
            </td>
            <td>{formatDate(item.purchaseDate)}</td>
            <td>{formatCurrency(item.purchasedAmount)}</td>
          </tr>
          {(item.expenses ?? []).map((expense, index) => (
            <tr key={expense.id ?? `expense-${index}`}>
              <td>
                <strong>{expense.description}</strong>
                <small>Purchase expense</small>
              </td>
              <td>{formatDate(expense.date)}</td>
              <td>{formatCurrency(expense.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="product-profile__totals">
        <dl>
          <div>
            <dt>Purchased</dt>
            <dd>
              <Money value={item.purchasedAmount} />
            </dd>
          </div>
          <div>
            <dt>Expenses</dt>
            <dd>
              <Money value={item.purchaseExpense} />
            </dd>
          </div>
          <div className="product-profile__total">
            <dt>Landed cost</dt>
            <dd>
              <Money value={item.landedCost} />
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
};
