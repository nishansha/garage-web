import { api } from "../lib/api";
import type { PaymentInput, PaymentMethod, PaymentStatus } from "./operations";

export interface ServiceOffering {
  id: number;
  version: number;
  warehouseId: number;
  code: string;
  name: string;
  defaultRate: number;
  active: boolean;
}

export interface ServiceOfferingInput {
  version?: number;
  warehouseId: number;
  code: string;
  name: string;
  defaultRate: number;
  active: boolean;
}

export interface ServiceSaleItem {
  id?: number;
  serviceOfferingId?: number | null;
  description: string;
  qty: number;
  rate: number;
  amount?: number;
}

export interface ServiceSalePayment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNo?: string | null;
  notes?: string | null;
  paymentAccountId: number;
  paymentAccountName?: string | null;
}

export interface ServiceSale {
  id: number;
  version: number;
  invoiceNo: string;
  companyId: number;
  warehouseId: number;
  customerId?: number | null;
  customerName?: string | null;
  walkInCustomerName?: string | null;
  saleDate: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus | string;
  notes?: string | null;
  items: ServiceSaleItem[];
  payments?: ServiceSalePayment[] | null;
}

export interface ServiceSaleItemInput {
  serviceOfferingId?: number;
  description: string;
  qty: number;
  rate: number;
}

export interface ServiceSaleInput {
  version?: number;
  warehouseId: number;
  customerId?: number;
  walkInCustomerName?: string;
  saleDate: string;
  notes?: string;
  items: ServiceSaleItemInput[];
}

export interface ServiceSaleSearch {
  searchText?: string;
  fromDate?: string;
  toDate?: string;
  warehouseId?: number;
}

export interface ServiceSalePage {
  totalPages: number;
  totalElements: number | null;
  serviceSales: ServiceSale[];
}

export interface ServiceReceivableItem {
  serviceSaleId: number;
  invoiceNo: string;
  paymentStatus: PaymentStatus | string;
  saleDate: string;
  amount: number;
  pendingAmount: number;
  lastPaymentDate?: string | null;
  customerName?: string | null;
  customerMobile?: string | null;
}

export interface ServiceReceivables {
  totalCount: number;
  totalPendingAmount: number;
  items: ServiceReceivableItem[];
}

const query = (
  values: Record<string, string | number | boolean | undefined>,
) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
};

const cleanText = (value?: string) => value?.trim() || undefined;

const cleanPayment = (value: PaymentInput) => ({
  amount: value.amount,
  paymentDate: value.paymentDate,
  paymentMethod: value.paymentMethod,
  paymentAccountId: value.paymentAccountId,
  ...(cleanText(value.referenceNo)
    ? { referenceNo: value.referenceNo!.trim() }
    : {}),
  ...(cleanText(value.notes) ? { notes: value.notes!.trim() } : {}),
});

export const serviceOfferingApi = {
  list: (warehouseId?: number) =>
    api
      .get<{ services: ServiceOffering[] }>(
        `v1/services${query({ warehouseId })}`,
      )
      .then((result) => result.services ?? []),

  get: (id: number) => api.get<ServiceOffering>(`v1/services/${id}`),

  create: (payload: ServiceOfferingInput) =>
    api.post<{ id: number }>("v1/services", payload),

  update: (id: number, payload: ServiceOfferingInput) =>
    api.put<{ id: number }>(`v1/services/${id}`, payload),

  delete: (id: number) => api.delete<void>(`v1/services/${id}`),
};

export const serviceSaleApi = {
  list: (page = 0, size = 20, filters?: ServiceSaleSearch) =>
    api.post<ServiceSalePage>(
      `v1/service-sales/find?page=${page}&size=${size}`,
      filters ?? {},
    ),

  get: (id: number) => api.get<ServiceSale>(`v1/service-sales/${id}`),

  create: (payload: ServiceSaleInput) =>
    api.post<{ id: number }>("v1/service-sales", payload),

  update: (id: number, payload: ServiceSaleInput) =>
    api.put<{ id: number }>(`v1/service-sales/${id}`, payload),

  delete: (id: number) => api.delete<void>(`v1/service-sales/${id}`),

  payment: (id: number, payload: PaymentInput) =>
    api.post<{ id: number }>(
      `v1/service-sales/${id}/payments`,
      cleanPayment(payload),
    ),

  deletePayment: (id: number, paymentId: number) =>
    api.delete<void>(`v1/service-sales/${id}/payments/${paymentId}`),

  receivables: (companyId?: number) =>
    api.get<ServiceReceivables>(
      `v1/reports/service-receivables${query({ companyId })}`,
    ),
};
