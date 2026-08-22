import { api } from "../lib/api";

export interface Employee {
  id: number;
  version: number;
  companyId: number;
  employeeCode: string;
  name: string;
  designation?: string | null;
  joinDate: string;
  terminationDate?: string | null;
  salaryAmount: number;
  bankName?: string | null;
  bankAccountNo?: string | null;
  paymentAccountId: number;
  paymentAccountName?: string | null;
  userProfileId?: number | null;
  active: boolean;
}

export interface EmployeeInput {
  version?: number;
  companyId: number;
  employeeCode: string;
  name: string;
  designation?: string;
  joinDate: string;
  terminationDate?: string;
  salaryAmount: number;
  bankName?: string;
  bankAccountNo?: string;
  paymentAccountId: number;
  userProfileId?: number;
  active: boolean;
}

export type SalaryPaymentStatus = "PENDING" | "PAID" | string;

export interface SalaryPayment {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  payPeriodMonth: number;
  payPeriodYear: number;
  grossAmount: number;
  netAmount: number;
  paymentDate?: string | null;
  paymentAccountId?: number | null;
  paymentAccountName?: string | null;
  status: SalaryPaymentStatus;
  notes?: string | null;
}

export interface SalaryPaymentMarkPaidInput {
  paymentDate: string;
  paymentAccountId: number;
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

export const employeeApi = {
  list: (companyId?: number) =>
    api
      .get<{ employees: Employee[] }>(`v1/employees${query({ companyId })}`)
      .then((result) => result.employees ?? []),

  get: (id: number) => api.get<Employee>(`v1/employees/${id}`),

  create: (payload: EmployeeInput) =>
    api.post<{ id: number }>("v1/employees", {
      ...payload,
      employeeCode: payload.employeeCode.trim().toUpperCase(),
      name: payload.name.trim(),
      designation: cleanText(payload.designation),
      terminationDate: cleanText(payload.terminationDate),
      bankName: cleanText(payload.bankName),
      bankAccountNo: cleanText(payload.bankAccountNo),
    }),

  update: (id: number, payload: EmployeeInput) =>
    api.put<{ id: number }>(`v1/employees/${id}`, {
      ...payload,
      employeeCode: payload.employeeCode.trim().toUpperCase(),
      name: payload.name.trim(),
      designation: cleanText(payload.designation),
      terminationDate: cleanText(payload.terminationDate),
      bankName: cleanText(payload.bankName),
      bankAccountNo: cleanText(payload.bankAccountNo),
    }),

  delete: (id: number) => api.delete<void>(`v1/employees/${id}`),
};

export const salaryPaymentApi = {
  list: (companyId?: number) =>
    api
      .get<{ salaryPayments: SalaryPayment[] }>(
        `v1/salary-payments${query({ companyId })}`,
      )
      .then((result) => result.salaryPayments ?? []),

  generate: (companyId: number, period?: string) =>
    api.post<number>(
      `v1/salary-payments/generate${query({ companyId, period })}`,
    ),

  markPaid: (id: number, payload: SalaryPaymentMarkPaidInput) =>
    api.put<{ id: number }>(`v1/salary-payments/${id}/mark-paid`, payload),

  delete: (id: number) => api.delete<void>(`v1/salary-payments/${id}`),
};
