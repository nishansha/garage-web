import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  Textarea,
  type DataColumn,
} from "../../components/ui";
import { Can } from "../../components/Can";
import { ApiError } from "../../lib/api";
import { companyApi, type Company } from "../../services/company";
import { companyLabel } from "../../hooks/useCompanyScope";
import {
  BUSINESS_LINE_LABELS,
  BUSINESS_LINES,
  warehouseApi,
  type BusinessLine,
  type Warehouse,
  type WarehouseInput,
} from "../../services/warehouse";

const normalizeCode = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toUpperCase()
    .slice(0, 50);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

type WarehouseFormValues = {
  companyId: number | "";
  businessLines: BusinessLine[];
  code: string;
  name: string;
  address: string;
  location: string;
};

const emptyForm: WarehouseFormValues = {
  companyId: "",
  businessLines: ["VEHICLE_SALES"],
  code: "",
  name: "",
  address: "",
  location: "",
};

const toPayload = (form: WarehouseFormValues): WarehouseInput => ({
  companyId: Number(form.companyId),
  businessLines: form.businessLines,
  code: form.code.trim().toUpperCase(),
  name: form.name.trim(),
  ...(form.address.trim() ? { address: form.address.trim() } : {}),
  ...(form.location.trim() ? { location: form.location.trim() } : {}),
});

const companyName = (companies: Company[] | undefined, companyId: number) =>
  companies?.find((item) => item.id === companyId)?.name ??
  `Company ${companyId}`;

export const WarehousesManagementPage = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Warehouse | null | undefined>();
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof WarehouseFormValues, string>>
  >({});
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);

  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehouseApi.list,
  });
  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: companyApi.list,
  });

  const saveWarehouse = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      if (editing) {
        return warehouseApi.update(editing.id, {
          ...payload,
          version: editing.version,
        });
      }
      return warehouseApi.create(payload);
    },
    onSuccess: async () => {
      toast.success(editing ? "Warehouse updated" : "Warehouse created");
      setEditing(undefined);
      setForm(emptyForm);
      setFieldErrors({});
      await queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        (error.code === "CON_100" || error.code === "CON_101")
      ) {
        toast.error(
          "Someone else updated this warehouse. Please refresh and try again.",
        );
        void queryClient.invalidateQueries({ queryKey: ["warehouses"] });
        return;
      }
      if (error instanceof ApiError && error.code === "BUS_174") {
        setFieldErrors((current) => ({
          ...current,
          code: error.message || "A warehouse with this code already exists",
        }));
        return;
      }
      toast.error(errorMessage(error, "Unable to save the warehouse."));
    },
  });

  const removeWarehouse = useMutation({
    mutationFn: (warehouse: Warehouse) => warehouseApi.delete(warehouse.id),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success("Warehouse deleted");
      await queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "BUS_175") {
        toast.error(
          error.message ||
            "This warehouse has inventory assigned and cannot be deleted",
        );
        return;
      }
      toast.error(errorMessage(error, "Unable to delete the warehouse."));
    },
  });

  const openCreate = () => {
    const companies = companiesQuery.data ?? [];
    setForm({
      ...emptyForm,
      companyId: companies.length === 1 ? companies[0].id : "",
    });
    setFieldErrors({});
    setEditing(null);
  };

  const openEdit = (warehouse: Warehouse) => {
    setForm({
      companyId: warehouse.companyId,
      businessLines: warehouse.businessLines ?? [],
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address ?? "",
      location: warehouse.location ?? "",
    });
    setFieldErrors({});
    setEditing(warehouse);
  };

  const validateAndSave = () => {
    const nextErrors: Partial<Record<keyof WarehouseFormValues, string>> = {};
    if (!form.companyId) nextErrors.companyId = "Company is required";
    if (form.businessLines.length === 0)
      nextErrors.businessLines = "Select at least one business line";
    if (!form.code.trim()) nextErrors.code = "Code is required";
    if (!form.name.trim()) nextErrors.name = "Name is required";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    saveWarehouse.mutate();
  };

  const columns: readonly DataColumn<Warehouse>[] = [
    {
      key: "code",
      header: "Code",
      cell: (row) => <code>{row.code}</code>,
    },
    { key: "name", header: "Name", cell: (row) => row.name },
    {
      key: "company",
      header: "Company",
      cell: (row) => companyName(companiesQuery.data, row.companyId),
    },
    {
      key: "businessLines",
      header: "Business lines",
      cell: (row) =>
        (row.businessLines ?? [])
          .map((line) => BUSINESS_LINE_LABELS[line] ?? line)
          .join(", ") || "—",
    },
    {
      key: "address",
      header: "Address",
      cell: (row) => row.address || "—",
    },
    {
      key: "location",
      header: "Location",
      cell: (row) => row.location || "—",
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (row) => (
        <span className="operations-inline-actions">
          <Can resource="WAREHOUSE" privilege="UPDATE">
            <Button variant="ghost" onClick={() => openEdit(row)}>
              <Pencil size={14} /> Edit
            </Button>
          </Can>
          <Can resource="WAREHOUSE" privilege="DELETE">
            <Button variant="ghost" onClick={() => setDeleteTarget(row)}>
              <Trash2 size={14} /> Delete
            </Button>
          </Can>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Warehouses"
        description="Manage inventory storage locations for this garage."
        actions={
          <Can resource="WAREHOUSE" privilege="CREATE">
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" /> New warehouse
            </Button>
          </Can>
        }
      />
      {warehousesQuery.isPending ? (
        <LoadingState label="Loading warehouses…" />
      ) : warehousesQuery.isError ? (
        <ErrorState
          message={errorMessage(
            warehousesQuery.error,
            "Unable to load warehouses.",
          )}
          onRetry={() => void warehousesQuery.refetch()}
        />
      ) : (
        <Card>
          <DataTable
            caption="Warehouses"
            columns={columns}
            rows={warehousesQuery.data ?? []}
            rowKey={(row) => String(row.id)}
            emptyMessage="No warehouses yet"
            emptyDescription="Warehouses will appear here once they are added."
          />
        </Card>
      )}

      <Modal
        open={editing !== undefined}
        title={editing ? "Edit warehouse" : "New warehouse"}
        onClose={() => setEditing(undefined)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button loading={saveWarehouse.isPending} onClick={validateAndSave}>
              {editing ? "Save changes" : "Create warehouse"}
            </Button>
          </>
        }
      >
        <div className="admin-form">
          <FormField label="Company" required error={fieldErrors.companyId}>
            <Select
              value={form.companyId}
              disabled={Boolean(editing)}
              onChange={(event) => {
                const id = Number(event.target.value);
                setForm((current) => ({
                  ...current,
                  companyId: Number.isInteger(id) && id > 0 ? id : "",
                }));
                setFieldErrors((current) => ({
                  ...current,
                  companyId: undefined,
                }));
              }}
            >
              <option value="">Select company</option>
              {(companiesQuery.data ?? []).map((company) => (
                <option key={company.id} value={company.id}>
                  {companyLabel(company)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Business lines"
            required
            error={fieldErrors.businessLines}
          >
            <fieldset className="account-type-options">
              <legend className="sr-only">Business lines</legend>
              {BUSINESS_LINES.map((line) => {
                const checked = form.businessLines.includes(line);
                return (
                  <label
                    key={line}
                    className={checked ? "is-selected" : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setForm((current) => ({
                          ...current,
                          businessLines: checked
                            ? current.businessLines.filter(
                                (item) => item !== line,
                              )
                            : [...current.businessLines, line],
                        }));
                        setFieldErrors((current) => ({
                          ...current,
                          businessLines: undefined,
                        }));
                      }}
                    />
                    {BUSINESS_LINE_LABELS[line]}
                  </label>
                );
              })}
            </fieldset>
          </FormField>
          <FormField label="Code" required error={fieldErrors.code}>
            <Input
              value={form.code}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  code: normalizeCode(event.target.value),
                }));
                setFieldErrors((current) => ({ ...current, code: undefined }));
              }}
              maxLength={50}
              placeholder="MAIN"
            />
          </FormField>
          <FormField label="Name" required error={fieldErrors.name}>
            <Input
              value={form.name}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }));
                setFieldErrors((current) => ({ ...current, name: undefined }));
              }}
              placeholder="Main warehouse"
            />
          </FormField>
          <FormField label="Address" error={fieldErrors.address}>
            <Textarea
              value={form.address}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              rows={2}
              placeholder="Street address"
            />
          </FormField>
          <FormField label="Location" error={fieldErrors.location}>
            <Input
              value={form.location}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
              placeholder="City or landmark"
            />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete warehouse?"
        message={
          deleteTarget
            ? `Remove "${deleteTarget.name}"? Warehouses with assigned inventory cannot be deleted.`
            : ""
        }
        confirmLabel="Delete"
        danger
        loading={removeWarehouse.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeWarehouse.mutate(deleteTarget)}
      />
    </>
  );
};
