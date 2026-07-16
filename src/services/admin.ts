import { api } from "../lib/api";

export type StaffRole = "STAFF" | "ADMIN";

export interface StaffMember {
  id: number;
  name: string;
  userName: string;
  role: StaffRole | string;
  designation: string;
}

export interface Vendor {
  id: number;
  name: string;
  mobile: string;
  address: string | null;
  outstandingBalance: number;
}

export interface VendorPage {
  vendors: Vendor[];
  totalPages: number;
  totalElements: number;
}

export type Customer = Vendor;

export interface CustomerPage {
  customers: Customer[];
  totalPages: number;
  totalElements: number;
}

export interface CreateStaffPayload {
  name: string;
  userName: string;
  password: string;
  role: StaffRole;
  designation: string;
}

export interface UpdateStaffPayload {
  name: string;
  role: StaffRole;
  designation: string;
  password?: string;
}

interface StaffResponse {
  users?: StaffMember[];
}

export interface MasterDataItem {
  id: number;
  code: string;
  description: string;
}

interface MasterDataListResponse {
  values?: Array<{
    id: number;
    code?: string;
    name?: string;
    label?: string;
    description?: string;
  }>;
  accounts?: MasterDataItem[];
  categories?: MasterDataItem[];
  brands?: MasterDataItem[];
  models?: MasterDataItem[];
  varients?: MasterDataItem[];
  variants?: MasterDataItem[];
  segments?: MasterDataItem[];
}

export type MasterDataType =
  | "CATEGORY"
  | "BRAND"
  | "MODEL"
  | "VARIANT"
  | "SEGMENT"
  | "COLOR"
  | "FUEL_TYPE"
  | "WAREHOUSE"
  | "EXPENSE_TYPE";

export interface MasterDataContext {
  categoryId?: number;
  brandId?: number;
  modelId?: number;
}

export interface SaveMasterDataPayload extends MasterDataContext {
  type: MasterDataType;
  code: string;
  description: string;
}

export interface SaveMasterDataResponse {
  id?: number;
  message?: string;
}

export interface ResetDataResponse {
  tablesCleared: number;
  totalRowsDeleted: number;
  deletedRowsByTable: Record<string, number>;
  orphanCoaRowsDeleted: number;
}

const toItems = (
  values: MasterDataListResponse["values"] = [],
): MasterDataItem[] =>
  values.map((value) => ({
    id: value.id,
    code: value.code ?? "",
    description:
      value.description ?? value.name ?? value.label ?? value.code ?? "",
  }));

const listEndpoint = (
  type: MasterDataType,
  context: MasterDataContext,
): string => {
  const categoryId = context.categoryId ?? 1;
  switch (type) {
    case "CATEGORY":
      return "v1/product/categories";
    case "BRAND":
      return `v1/product/categories/${categoryId}/brands`;
    case "MODEL":
      return `v1/product/categories/${categoryId}/brands/${context.brandId ?? 0}/models`;
    case "VARIANT":
      return `v1/product/categories/${categoryId}/brands/${context.brandId ?? 0}/models/${context.modelId ?? 0}/varients`;
    case "SEGMENT":
      return `v1/product/categories/${categoryId}/segments`;
    case "COLOR":
    case "FUEL_TYPE":
    case "WAREHOUSE":
      return `v1/lookup?type=${encodeURIComponent(type)}`;
    case "EXPENSE_TYPE":
      return "v1/account?type=EXPENSE";
  }
};

const extractItems = (
  type: MasterDataType,
  response: MasterDataListResponse,
): MasterDataItem[] => {
  switch (type) {
    case "CATEGORY":
      return response.categories ?? toItems(response.values);
    case "BRAND":
      return response.brands ?? [];
    case "MODEL":
      return response.models ?? [];
    case "VARIANT":
      return response.varients ?? response.variants ?? [];
    case "SEGMENT":
      return response.segments ?? [];
    case "EXPENSE_TYPE":
      return response.accounts ?? [];
    case "COLOR":
    case "FUEL_TYPE":
    case "WAREHOUSE":
      return toItems(response.values);
  }
};

export const adminApi = {
  getVendors(page = 0, size = 20): Promise<VendorPage> {
    return api.get(`v1/vendor?page=${page}&size=${size}`);
  },
  getCustomers(page = 0, size = 20): Promise<CustomerPage> {
    return api.get(`v1/customer?page=${page}&size=${size}`);
  },
  async getStaff(): Promise<StaffMember[]> {
    const response = await api.get<StaffResponse>("v1/user");
    return response.users ?? [];
  },
  createStaff(payload: CreateStaffPayload): Promise<unknown> {
    return api.post("v1/user", payload);
  },
  updateStaff(id: number, payload: UpdateStaffPayload): Promise<unknown> {
    return api.put(`v1/user/${id}`, payload);
  },
  async getMasterData(
    type: MasterDataType,
    context: MasterDataContext = {},
  ): Promise<MasterDataItem[]> {
    const response = await api.get<MasterDataListResponse>(
      listEndpoint(type, context),
    );
    return extractItems(type, response);
  },
  createMasterData(
    payload: SaveMasterDataPayload,
  ): Promise<SaveMasterDataResponse | string> {
    return api.post("v1/product/manage-types", payload);
  },
  updateMasterData(
    id: number,
    payload: SaveMasterDataPayload,
  ): Promise<SaveMasterDataResponse | string> {
    return api.put(`v1/product/manage-types/${id}`, payload);
  },
  resetData(): Promise<ResetDataResponse> {
    return api.post("v1/admin/reset-data", {});
  },
};
