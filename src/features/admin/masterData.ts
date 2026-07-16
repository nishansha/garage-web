import {
  Boxes,
  Building2,
  Car,
  Droplets,
  Layers3,
  Palette,
  ReceiptText,
  Shapes,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { MasterDataType } from "../../services/admin";

export interface MasterTypeConfig {
  type: MasterDataType;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const masterDataTypes: readonly MasterTypeConfig[] = [
  {
    type: "CATEGORY",
    label: "Categories",
    description: "Top-level product categories",
    icon: Boxes,
  },
  {
    type: "BRAND",
    label: "Brands",
    description: "Vehicle and product brands",
    icon: Building2,
  },
  {
    type: "MODEL",
    label: "Models",
    description: "Models grouped by brand",
    icon: Car,
  },
  {
    type: "VARIANT",
    label: "Variants",
    description: "Variants grouped by model",
    icon: Shapes,
  },
  {
    type: "SEGMENT",
    label: "Segments",
    description: "Product and vehicle segments",
    icon: Layers3,
  },
  {
    type: "COLOR",
    label: "Colors",
    description: "Available inventory colors",
    icon: Palette,
  },
  {
    type: "FUEL_TYPE",
    label: "Fuel types",
    description: "Supported vehicle fuel types",
    icon: Droplets,
  },
  {
    type: "WAREHOUSE",
    label: "Warehouses",
    description: "Inventory storage locations",
    icon: Warehouse,
  },
  {
    type: "EXPENSE_TYPE",
    label: "Expense types",
    description: "Expense classification records",
    icon: ReceiptText,
  },
] as const;
