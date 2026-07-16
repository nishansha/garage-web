import { formatCurrency, formatDate } from "../../lib/utils";
import type { AuditEntityType, AuditSnapshot } from "../../services/audit";

export const AUDIT_ENTITY_LABELS: Record<AuditEntityType, string> = {
  sale: "Sale",
  purchase: "Purchase",
  "sale-payment": "Sale Payment",
  "purchase-payment": "Purchase Payment",
  "sale-refund-payment": "Sale Refund Payment",
  "purchase-return-receipt": "Purchase Return Receipt",
  "sale-return": "Sale Return",
  "purchase-return": "Purchase Return",
  "sale-return-deduction": "Sale Return Deduction",
  "direct-entry": "Direct Entry",
  expense: "Expense",
};

const FIELD_LABELS: Record<string, string> = {
  id: "Record ID",
  invoiceNo: "Invoice Number",
  referenceNo: "Reference Number",
  customerId: "Customer ID",
  vendorId: "Vendor ID",
  inventoryId: "Inventory ID",
  purchaseId: "Purchase ID",
  saleId: "Sale ID",
  saleReturnId: "Sale Return ID",
  purchaseReturnId: "Purchase Return ID",
  expenseId: "Expense ID",
  statusId: "Status ID",
  pickupStaffId: "Pickup Staff ID",
  expenseAccountId: "Expense Account ID",
  paymentAccountId: "Payment Account ID",
  chartOfAccountId: "Chart of Account ID",
  saleDate: "Sale Date",
  orderDate: "Order Date",
  deliveredDate: "Delivered Date",
  paymentDate: "Payment Date",
  returnDate: "Return Date",
  entryDate: "Entry Date",
  date: "Date",
  buybackRecordedAt: "Buyback Recorded At",
  saleRate: "Sale Rate",
  landedCostAtSale: "Landed Cost at Sale",
  exchangeAmount: "Exchange Amount",
  financeAmount: "Finance Amount",
  emiAmount: "EMI Amount",
  netSaleAmount: "Net Sale Amount",
  profitAmount: "Profit Amount",
  totalAmount: "Total Amount",
  amount: "Amount",
  customerPaidAmount: "Customer Paid Amount",
  exchangeBuybackAmount: "Exchange Buyback Amount",
  soldVehicleDeductionAmount: "Sold Vehicle Deduction",
  exchangeVehicleDeductionAmount: "Exchange Vehicle Deduction",
  refundAmount: "Refund Amount",
  inventoryLandedCost: "Inventory Landed Cost",
  returnAmount: "Return Amount",
  isExchanged: "Exchanged",
  isFinanced: "Financed",
  financeCompany: "Finance Company",
  paymentStatus: "Payment Status",
  paymentMethod: "Payment Method",
  payerType: "Payer Type",
  pickupLocation: "Pickup Location",
  exchangeHandling: "Exchange Handling",
  vehicleContext: "Vehicle Context",
  direction: "Direction",
  partyName: "Party Name",
  otherExpense: "Other Expense",
  description: "Description",
  reason: "Reason",
  notes: "Notes",
  status: "Status",
};

const HIDDEN_FIELDS = new Set([
  "version",
  "createdAt",
  "createdBy",
  "modifiedAt",
  "modifiedBy",
]);

const MONEY_FIELDS = new Set([
  "saleRate",
  "landedCostAtSale",
  "exchangeAmount",
  "financeAmount",
  "emiAmount",
  "netSaleAmount",
  "profitAmount",
  "totalAmount",
  "amount",
  "customerPaidAmount",
  "exchangeBuybackAmount",
  "soldVehicleDeductionAmount",
  "exchangeVehicleDeductionAmount",
  "refundAmount",
  "inventoryLandedCost",
  "returnAmount",
]);

const DATE_TIME_FIELDS = new Set(["buybackRecordedAt"]);
const DATE_FIELDS = new Set([
  "saleDate",
  "orderDate",
  "deliveredDate",
  "paymentDate",
  "returnDate",
  "entryDate",
  "date",
]);

export const humanizeAuditKey = (key: string): string =>
  FIELD_LABELS[key] ??
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const isVisibleAuditField = (key: string): boolean =>
  !HIDDEN_FIELDS.has(key);

const humanizeEnum = (value: string): string =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const formatAuditValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (MONEY_FIELDS.has(key) && typeof value === "number")
    return formatCurrency(value);
  if (DATE_TIME_FIELDS.has(key) && typeof value === "string")
    return formatDate(value, "dd MMM yyyy, HH:mm");
  if (DATE_FIELDS.has(key) && typeof value === "string")
    return formatDate(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key.endsWith("Id") && (typeof value === "number" || value))
    return `#${String(value)}`;
  if (typeof value === "string" && /^[A-Z][A-Z0-9_]*$/.test(value))
    return humanizeEnum(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const visibleSnapshotEntries = (snapshot: AuditSnapshot | null) =>
  Object.entries(snapshot ?? {}).filter(([key]) => isVisibleAuditField(key));

export const getDeletedRecordLabel = (
  entityType: AuditEntityType,
  id: number,
  entity: AuditSnapshot,
): string => {
  const candidates = [
    entity.invoiceNo,
    entity.referenceNo,
    entity.partyName,
    entity.description,
    entity.reason,
  ];
  const label = candidates.find(
    (value) => typeof value === "string" && value.trim(),
  );
  if (typeof label === "string") return label;
  if (typeof entity.amount === "number")
    return `${AUDIT_ENTITY_LABELS[entityType]} · ${formatCurrency(entity.amount)}`;
  return `${AUDIT_ENTITY_LABELS[entityType]} #${id}`;
};
