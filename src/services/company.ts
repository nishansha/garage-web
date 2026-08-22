import { api } from "../lib/api";

export interface Company {
  id: number;
  version: number;
  code: string;
  name: string;
  registrationNo?: string | null;
  address?: string | null;
  active: boolean;
}

export interface CompanyInput {
  version?: number;
  code: string;
  name: string;
  registrationNo?: string;
  address?: string;
  active: boolean;
}

export interface CompanyPerformance {
  companyId: number;
  companyCode: string;
  companyName: string;
  salesCount: number;
  salesRevenue: number;
  grossProfit: number;
  purchaseCount: number;
  purchaseCost: number;
  serviceSaleCount: number;
  serviceRevenue: number;
  generalExpenses: number;
}

export interface CompanyComparison {
  month: string;
  companies: CompanyPerformance[];
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

export const companyApi = {
  list: () =>
    api
      .get<{ companies: Company[] }>("v1/companies")
      .then((result) => result.companies ?? []),

  get: (id: number) => api.get<Company>(`v1/companies/${id}`),

  create: (payload: CompanyInput) =>
    api.post<{ id: number }>("v1/companies", payload),

  update: (id: number, payload: CompanyInput) =>
    api.put<{ id: number }>(`v1/companies/${id}`, payload),

  delete: (id: number) => api.delete<void>(`v1/companies/${id}`),

  access: (id: number) =>
    api
      .get<number[] | { userIds?: number[] }>(`v1/companies/${id}/access`)
      .then((result) =>
        Array.isArray(result) ? result : (result.userIds ?? []),
      ),

  grantAccess: (id: number, userId: number) =>
    api.post<void>(`v1/companies/${id}/access/${userId}`),

  revokeAccess: (id: number, userId: number) =>
    api.delete<void>(`v1/companies/${id}/access/${userId}`),

  comparison: (month?: string) =>
    api.get<CompanyComparison>(`v1/companies/comparison${query({ month })}`),
};
