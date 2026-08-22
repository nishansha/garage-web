import { api } from "../lib/api";

export type BusinessLine = "VEHICLE_SALES" | "SERVICES";

export const BUSINESS_LINES: readonly BusinessLine[] = [
  "VEHICLE_SALES",
  "SERVICES",
];

export const BUSINESS_LINE_LABELS: Record<BusinessLine, string> = {
  VEHICLE_SALES: "Vehicle sales",
  SERVICES: "Services",
};

export interface Warehouse {
  id: number;
  version: number;
  companyId: number;
  businessLines: BusinessLine[];
  code: string;
  name: string;
  address?: string | null;
  location?: string | null;
}

export interface WarehouseInput {
  version?: number;
  companyId: number;
  businessLines: BusinessLine[];
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
  serviceSalesCount: number;
  serviceRevenue: number;
  purchaseCount: number;
  purchaseCost: number;
  landedCost: number;
  purchaseExpenses: number;
  payablesCount: number;
  totalPayables: number;
  generalExpenses: number;
}

export interface WarehouseComparison {
  month: string;
  warehouses: WarehousePerformance[];
  unallocatedGeneralExpenses: number;
}

export const warehouseSupports = (warehouse: Warehouse, line: BusinessLine) =>
  (warehouse.businessLines ?? []).includes(line);

export const warehousesFor = (
  warehouses: Warehouse[] | undefined,
  line: BusinessLine,
) => (warehouses ?? []).filter((item) => warehouseSupports(item, line));

export const companyIdForWarehouse = (
  warehouses: Warehouse[] | undefined,
  warehouseId?: number | null,
) => warehouses?.find((item) => item.id === warehouseId)?.companyId;

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
