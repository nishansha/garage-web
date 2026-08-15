import { api } from "../lib/api";

export interface Warehouse {
  id: number;
  version: number;
  code: string;
  name: string;
  address?: string | null;
  location?: string | null;
}

export interface WarehouseInput {
  version?: number;
  code: string;
  name: string;
  address?: string;
  location?: string;
}

export interface WarehousePerformance {
  warehouseId: number | null;
  warehouseCode: string;
  warehouseName: string;
  stockCount: number;
  stockValue: number;
  salesCount: number;
  salesRevenue: number;
  grossProfit: number;
  grossMarginPct: number;
  purchaseCount: number;
  purchaseCost: number;
  landedCost: number;
  purchaseExpenses: number;
  payablesCount: number;
  totalPayables: number;
}

export interface WarehouseComparison {
  month: string;
  warehouses: WarehousePerformance[];
  unallocatedGeneralExpenses: number;
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

export const warehouseApi = {
  list: () =>
    api
      .get<{ warehouses: Warehouse[] }>("v1/warehouses")
      .then((result) => result.warehouses ?? []),

  get: (id: number) => api.get<Warehouse>(`v1/warehouses/${id}`),

  create: (payload: WarehouseInput) =>
    api.post<{ id: number }>("v1/warehouses", payload),

  update: (id: number, payload: WarehouseInput) =>
    api.put<{ id: number }>(`v1/warehouses/${id}`, payload),

  delete: (id: number) => api.delete<void>(`v1/warehouses/${id}`),

  comparison: (month?: string, warehouseId?: number) =>
    api.get<WarehouseComparison>(
      `v1/reports/warehouse-comparison${query({ month, warehouseId })}`,
    ),
};
