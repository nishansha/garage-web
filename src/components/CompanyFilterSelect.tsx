import { Select } from "./ui";
import { companyLabel } from "../hooks/useCompanyScope";
import type { Company } from "../services/company";

export const CompanyFilterSelect = ({
  companies,
  selectedId,
  onChange,
  allowAll = false,
  allLabel = "All companies",
  "aria-label": ariaLabel = "Company",
}: {
  companies: Company[];
  selectedId?: number;
  onChange: (id: number | undefined) => void;
  allowAll?: boolean;
  allLabel?: string;
  "aria-label"?: string;
}) => {
  if (companies.length <= 1) return null;
  return (
    <Select
      aria-label={ariaLabel}
      value={selectedId ?? ""}
      onChange={(event) => {
        const id = Number(event.target.value);
        onChange(Number.isInteger(id) && id > 0 ? id : undefined);
      }}
    >
      {allowAll && <option value="">{allLabel}</option>}
      {companies.map((company) => (
        <option key={company.id} value={company.id}>
          {companyLabel(company)}
        </option>
      ))}
    </Select>
  );
};
