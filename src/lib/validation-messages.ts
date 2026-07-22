export const VALIDATION_CODES = [
  "REQUIRED",
  "MUST_BE_POSITIVE",
  "MAX_LENGTH",
  "INVALID_CHARS",
  "INVALID_FORMAT",
  "MIN_LENGTH",
  "NON_NEGATIVE",
  "INVALID_VALUE",
  "MAXIMUM",
  "FUTURE_DATE",
  "BALANCE_MISMATCH",
] as const;

export type ValidationCode = (typeof VALIDATION_CODES)[number];

export const validationMessageConfig: Record<string, string> = {
  "common.field.REQUIRED": "This field is required",
  "common.field.INVALID_FORMAT": "Invalid format",
  "common.field.MIN_LENGTH": "Value is too short",
  "common.field.MAX_LENGTH": "Value is too long",
  "common.field.INVALID_CHARS": "Contains invalid characters",
  "common.field.MUST_BE_POSITIVE": "Must be a positive number",
  "common.field.NON_NEGATIVE": "Must be zero or greater",
  "common.field.INVALID_VALUE": "Invalid value",

  "purchase.date.REQUIRED": "Purchase date is required",
  "purchase.vehicleNo.REQUIRED": "Vehicle number is required",
  "purchase.brandId.REQUIRED": "Brand is required",
  "purchase.modelId.REQUIRED": "Model is required",
  "purchase.variantId.REQUIRED": "Variant is required",
  "purchase.colorId.REQUIRED": "Color is required",
  "purchase.fuelTypeId.REQUIRED": "Fuel type is required",
  "purchase.transmissionTypeId.REQUIRED": "Transmission type is required",
  "purchase.segmentId.REQUIRED": "Segment is required",
  "purchase.warehouseId.REQUIRED": "Warehouse is required",
  "purchase.makeYear.REQUIRED": "Make year is required",
  "purchase.makeYear.INVALID_VALUE": "Enter a valid make year",
  "purchase.odometer.REQUIRED": "Odometer is required",
  "purchase.odometer.NON_NEGATIVE": "Odometer cannot be negative",
  "purchase.purchaseRate.REQUIRED": "Purchase rate is required",
  "purchase.purchaseRate.MUST_BE_POSITIVE":
    "Purchase rate must be greater than zero",
  "purchase.ownerShipSerialNo.REQUIRED": "Ownership serial number is required",
  "purchase.ownerName.REQUIRED": "Owner/vendor name is required",
  "purchase.ownerMobileNo.REQUIRED": "Owner mobile is required",
  "purchase.pickupLocation.REQUIRED": "Pickup location is required",
  "purchase.expenses.date.REQUIRED": "Expense date is required",
  "purchase.expenses.typeId.REQUIRED": "Expense type is required",
  "purchase.expenses.description.REQUIRED": "Expense description is required",
  "purchase.expenses.amount.REQUIRED": "Expense amount is required",
  "purchase.expenses.amount.MUST_BE_POSITIVE":
    "Expense amount must be greater than zero",
  "purchase.expenses.paymentAccountId.REQUIRED": "Payment account is required",

  "payment.amount.REQUIRED": "Amount is required",
  "payment.amount.MUST_BE_POSITIVE": "Amount must be greater than zero",
  "payment.amount.MAXIMUM": "Amount exceeds the available balance",
  "payment.paymentDate.REQUIRED": "Payment date is required",
  "payment.paymentMethod.REQUIRED": "Payment method is required",
  "payment.paymentAccountId.REQUIRED": "Payment account is required",

  "purchaseReturn.returnDate.REQUIRED": "Return date is required",
  "purchaseReturn.refundAmount.REQUIRED": "Refund amount is required",
  "purchaseReturn.refundAmount.NON_NEGATIVE":
    "Refund amount cannot be negative",
  "purchaseReturn.refundAmount.MAXIMUM":
    "Refund amount exceeds the maximum allowed",
  "purchaseReturn.receiptAmount.MAXIMUM":
    "Receipt amount cannot exceed the remaining receivable",
  "purchaseReturn.reason.REQUIRED": "Reason is required",

  "sale.date.REQUIRED": "Sale date is required",
  "sale.stockId.REQUIRED": "Stock vehicle is required",
  "sale.saleRate.REQUIRED": "Sale rate is required",
  "sale.saleRate.MUST_BE_POSITIVE": "Sale rate must be greater than zero",
  "sale.customerName.REQUIRED": "Customer name is required",
  "sale.customerMobileNo.REQUIRED": "Customer mobile is required",
  "sale.customerAddress.REQUIRED": "Customer address is required",
  "sale.paymentStatus.REQUIRED": "Payment status is required",
  "sale.exchangeAmount.MUST_BE_POSITIVE":
    "Exchange amount must be greater than zero",
  "sale.exchangeAmount.REQUIRED": "Exchange amount is required",
  "sale.exchangeAmount.NON_NEGATIVE": "Exchange amount cannot be negative",
  "sale.exchange.vehicleNo.REQUIRED": "Exchange vehicle number is required",
  "sale.exchange.brandId.REQUIRED": "Exchange vehicle brand is required",
  "sale.exchange.modelId.REQUIRED": "Exchange vehicle model is required",
  "sale.exchange.variantId.REQUIRED": "Exchange vehicle variant is required",
  "sale.exchange.colorId.REQUIRED": "Exchange vehicle color is required",
  "sale.exchange.fuelTypeId.REQUIRED":
    "Exchange vehicle fuel type is required",
  "sale.exchange.transmissionTypeId.REQUIRED":
    "Exchange vehicle transmission type is required",
  "sale.exchange.segmentId.REQUIRED": "Exchange vehicle segment is required",
  "sale.exchange.warehouseId.REQUIRED":
    "Exchange vehicle warehouse is required",
  "sale.exchange.makeYear.REQUIRED": "Exchange vehicle make year is required",
  "sale.exchange.makeYear.INVALID_VALUE": "Enter a valid make year",
  "sale.exchange.odometer.REQUIRED": "Exchange vehicle odometer is required",
  "sale.exchange.odometer.NON_NEGATIVE":
    "Exchange vehicle odometer cannot be negative",
  "sale.exchange.purchaseRate.REQUIRED":
    "Exchange vehicle purchase rate is required",
  "sale.exchange.purchaseRate.MUST_BE_POSITIVE":
    "Exchange vehicle purchase rate must be greater than zero",
  "sale.exchange.ownerShipSerialNo.REQUIRED":
    "Exchange vehicle ownership serial number is required",
  "sale.financeCompany.REQUIRED": "Finance company is required",
  "sale.financeAmount.REQUIRED": "Finance amount is required",
  "sale.financeAmount.NON_NEGATIVE": "Finance amount cannot be negative",
  "sale.financeAmount.MUST_BE_POSITIVE":
    "Finance amount must be greater than zero",
  "sale.emiAmount.REQUIRED": "EMI amount is required",
  "sale.emiAmount.NON_NEGATIVE": "EMI amount cannot be negative",
  "sale.emiAmount.MUST_BE_POSITIVE": "EMI amount must be greater than zero",
  "sale.amountSplits.typeId.REQUIRED": "Split type is required",
  "sale.amountSplits.amount.REQUIRED": "Split amount is required",
  "sale.amountSplits.amount.NON_NEGATIVE": "Split amount cannot be negative",
  "sale.amountSplits.amount.MUST_BE_POSITIVE":
    "Split amount must be greater than zero",
  "sale.exchangeExpenses.date.REQUIRED": "Expense date is required",
  "sale.exchangeExpenses.typeId.REQUIRED": "Expense type is required",
  "sale.exchangeExpenses.description.REQUIRED":
    "Expense description is required",
  "sale.exchangeExpenses.amount.REQUIRED": "Expense amount is required",
  "sale.exchangeExpenses.amount.NON_NEGATIVE":
    "Expense amount cannot be negative",
  "sale.exchangeExpenses.amount.MUST_BE_POSITIVE":
    "Expense amount must be greater than zero",
  "sale.exchangeExpenses.paymentAccountId.REQUIRED":
    "Payment account is required",

  "saleReturn.returnDate.REQUIRED": "Return date is required",
  "saleReturn.reason.REQUIRED": "Reason is required",
  "saleReturn.exchangeHandling.REQUIRED": "Exchange handling is required",
  "saleReturn.exchangeBuybackAmount.MUST_BE_POSITIVE":
    "Exchange buyback amount must be greater than zero",
  "saleReturn.exchangeBuybackAmount.REQUIRED":
    "Exchange buyback amount is required",
  "saleReturn.exchangeBuybackAmount.NON_NEGATIVE":
    "Exchange buyback amount cannot be negative",
  "saleReturn.deductions.description.REQUIRED":
    "Deduction description is required",
  "saleReturn.deductions.amount.REQUIRED": "Deduction amount is required",
  "saleReturn.deductions.amount.NON_NEGATIVE":
    "Deduction amount cannot be negative",

  "expense.date.REQUIRED": "Date is required",
  "expense.typeId.REQUIRED": "Expense type is required",
  "expense.paymentAccountId.REQUIRED": "Payment account is required",
  "expense.description.REQUIRED": "Description is required",
  "expense.amount.REQUIRED": "Amount is required",
  "expense.amount.MUST_BE_POSITIVE": "Amount must be greater than zero",
  "expense.amount.MAXIMUM": "Amount exceeds the available balance",

  "paymentAccount.name.REQUIRED": "Account name is required",
  "paymentAccount.openingBalance.REQUIRED": "Opening balance is required",
  "paymentAccount.openingBalance.NON_NEGATIVE":
    "Opening balance cannot be negative",
  "paymentAccount.openingDate.REQUIRED": "Opening date is required",
  "paymentAccount.openingDate.FUTURE_DATE":
    "Opening date cannot be in the future",
  "paymentAccount.bankName.REQUIRED": "Bank name is required",
  "paymentAccount.accountNumber.REQUIRED": "Account number is required",
  "paymentAccount.ifsc.REQUIRED": "IFSC is required",

  "directAdjustment.accountId.REQUIRED": "Account is required",
  "directAdjustment.date.REQUIRED": "Date is required",
  "directAdjustment.date.FUTURE_DATE": "Date cannot be in the future",
  "directAdjustment.amount.MUST_BE_POSITIVE":
    "Amount must be greater than zero",
  "directAdjustment.amount.MAXIMUM": "Amount exceeds the available balance",
  "directAdjustment.party.REQUIRED": "Party is required",
  "directAdjustment.description.REQUIRED": "Description is required",

  "directEntry.accountId.REQUIRED": "Account is required",
  "directEntry.paymentAccountId.REQUIRED": "Payment account is required",
  "directEntry.party.REQUIRED": "Party is required",
  "directEntry.description.REQUIRED": "Description is required",
  "directEntry.amount.MUST_BE_POSITIVE": "Amount must be greater than zero",
  "directEntry.amount.MAXIMUM": "Amount exceeds the available balance",
  "directEntry.date.REQUIRED": "Date is required",
  "directEntry.date.FUTURE_DATE": "Date cannot be in the future",

  "journal.description.REQUIRED": "Description is required",
  "journal.date.REQUIRED": "Journal date is required",
  "journal.date.FUTURE_DATE": "Journal date cannot be in the future",
  "journal.lines.MIN_LENGTH": "Add at least two journal lines",
  "journal.lines.accountId.REQUIRED": "Account is required",
  "journal.lines.amount.MUST_BE_POSITIVE":
    "Debit or credit must be greater than zero",
  "journal.lines.amount.REQUIRED": "Debit or credit amount is required",
  "journal.lines.amount.INVALID_VALUE":
    "Enter either a debit or credit, not both",
  "journal.lines.BALANCE_MISMATCH": "Total debits and credits must balance",

  "chartOfAccount.label.REQUIRED": "Label is required",
  "chartOfAccount.description.REQUIRED": "Description is required",

  "staff.name.REQUIRED": "Name is required",
  "staff.userName.REQUIRED": "User name is required",
  "staff.password.REQUIRED": "Password is required",
  "staff.role.REQUIRED": "Role is required",
  "staff.roleIds.REQUIRED": "Select at least one role",
  "staff.designation.REQUIRED": "Designation is required",

  "masterData.code.REQUIRED": "Code is required",
  "masterData.code.INVALID_CHARS":
    "Use letters, numbers, and underscores without spaces",
  "masterData.description.REQUIRED": "Description is required",
  "masterData.categoryId.REQUIRED": "Category is required",
  "masterData.brandId.REQUIRED": "Brand is required",
  "masterData.modelId.REQUIRED": "Model is required",
};

export type ValidationModule =
  | "purchase"
  | "payment"
  | "purchaseReturn"
  | "sale"
  | "saleReturn"
  | "expense"
  | "paymentAccount"
  | "directAdjustment"
  | "directEntry"
  | "journal"
  | "chartOfAccount"
  | "staff"
  | "masterData";
