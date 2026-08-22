import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { companyApi, type Company } from "../services/company";

export const useCompanyScope = () => {
  const query = useQuery({
    queryKey: ["companies"],
    queryFn: companyApi.list,
  });
  const companies = useMemo(
    () => (query.data ?? []).filter((company) => company.active !== false),
    [query.data],
  );
  const ready = query.isSuccess || query.isError;
  const multi = companies.length > 1;
  const [selectedId, setSelectedId] = useState<number | undefined>();

  useEffect(() => {
    if (!multi) return;
    if (selectedId != null && companies.some((item) => item.id === selectedId))
      return;
    setSelectedId(companies[0]?.id);
  }, [companies, multi, selectedId]);

  const companyId = multi ? selectedId : companies[0]?.id;
  const reportCompanyId = multi ? selectedId : undefined;

  return {
    query,
    companies,
    ready,
    multi,
    companyId,
    reportCompanyId,
    selectedId: companyId,
    setSelectedId,
  };
};

export const companyLabel = (company: Company) =>
  company.code ? `${company.name} (${company.code})` : company.name;
