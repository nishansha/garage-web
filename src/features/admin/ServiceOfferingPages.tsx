import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
} from "../../components/ui";
import { Can } from "../../components/Can";
import { usePermission } from "../../hooks/usePermission";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/utils";
import {
  serviceOfferingApi,
  type ServiceOffering,
  type ServiceOfferingInput,
} from "../../services/serviceSales";
import { warehouseApi, warehousesFor } from "../../services/warehouse";

const normalizeCode = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toUpperCase()
    .slice(0, 50);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

type OfferingFormValues = {
  warehouseId: number | "";
  code: string;
  name: string;
  defaultRate: string;
  active: boolean;
};

const emptyForm: OfferingFormValues = {
  warehouseId: "",
  code: "",
  name: "",
  defaultRate: "",
  active: true,
};

const toPayload = (form: OfferingFormValues): ServiceOfferingInput => ({
  warehouseId: Number(form.warehouseId),
  code: form.code.trim().toUpperCase(),
  name: form.name.trim(),
  defaultRate: Number(form.defaultRate),
  active: form.active,
});

export const ServiceOfferingsPage = () => {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [warehouseId, setWarehouseId] = useState<number | "all">("all");
  const [editing, setEditing] = useState<ServiceOffering | null | undefined>();
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof OfferingFormValues, string>>
  >({});
  const [deleteTarget, setDeleteTarget] = useState<ServiceOffering | null>(
    null,
  );

  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehouseApi.list,
  });
  const serviceWarehouses = warehousesFor(warehousesQuery.data, "SERVICES");

  const offeringsQuery = useQuery({
    queryKey: [
      "service-offerings",
      warehouseId === "all" ? undefined : warehouseId,
    ],
    queryFn: () =>
      serviceOfferingApi.list(warehouseId === "all" ? undefined : warehouseId),
  });

  const saveOffering = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      if (editing) {
        return serviceOfferingApi.update(editing.id, {
          ...payload,
          version: editing.version,
        });
      }
      return serviceOfferingApi.create(payload);
    },
    onSuccess: async () => {
      toast.success(editing ? "Service updated" : "Service created");
      setEditing(undefined);
      setForm(emptyForm);
      setFieldErrors({});
      await queryClient.invalidateQueries({ queryKey: ["service-offerings"] });
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        (error.code === "CON_100" || error.code === "CON_101")
      ) {
        toast.error(
          "Someone else updated this service. Please refresh and try again.",
        );
        void queryClient.invalidateQueries({ queryKey: ["service-offerings"] });
        return;
      }
      if (error instanceof ApiError && error.code === "BUS_227") {
        setFieldErrors((current) => ({
          ...current,
          code: error.message || "A service with this code already exists",
        }));
        return;
      }
      toast.error(errorMessage(error, "Unable to save the service."));
    },
  });

  const removeOffering = useMutation({
    mutationFn: (offering: ServiceOffering) =>
      serviceOfferingApi.delete(offering.id),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success("Service deleted");
      await queryClient.invalidateQueries({ queryKey: ["service-offerings"] });
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Unable to delete the service."));
    },
  });

  const openCreate = () => {
    setForm({
      ...emptyForm,
      warehouseId:
        warehouseId !== "all"
          ? warehouseId
          : serviceWarehouses.length === 1
            ? serviceWarehouses[0].id
            : "",
    });
    setFieldErrors({});
    setEditing(null);
  };

  const openEdit = (offering: ServiceOffering) => {
    setForm({
      warehouseId: offering.warehouseId,
      code: offering.code,
      name: offering.name,
      defaultRate: String(offering.defaultRate),
      active: offering.active,
    });
    setFieldErrors({});
    setEditing(offering);
  };

  const validateAndSave = () => {
    const nextErrors: Partial<Record<keyof OfferingFormValues, string>> = {};
    if (!form.warehouseId) nextErrors.warehouseId = "Warehouse is required";
    if (!form.code.trim()) nextErrors.code = "Code is required";
    if (!form.name.trim()) nextErrors.name = "Name is required";
    const rate = Number(form.defaultRate);
    if (!form.defaultRate.trim() || !Number.isFinite(rate) || rate <= 0) {
      nextErrors.defaultRate = "Default rate must be greater than zero";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    saveOffering.mutate();
  };

  const warehouseName = (id: number) =>
    warehousesQuery.data?.find((item) => item.id === id)?.name ??
    `Warehouse ${id}`;

  const canUpdate = can("SERVICE_OFFERING", "UPDATE");
  const offerings = offeringsQuery.data ?? [];
  const warehousesLoading = warehousesQuery.isPending;
  const listLoading = warehousesLoading || offeringsQuery.isPending;
  const listError = warehousesQuery.error ?? offeringsQuery.error;

  return (
    <>
      <PageHeader
        title="Services"
        description="Manage the services offered."
        actions={
          <Can resource="SERVICE_OFFERING" privilege="CREATE">
            <Button
              onClick={openCreate}
              disabled={serviceWarehouses.length === 0 || warehousesLoading}
            >
              <Plus aria-hidden="true" /> Add service
            </Button>
          </Can>
        }
      />
      {serviceWarehouses.length > 0 && (
        <Card className="admin-master-filters">
          <FormField label="Warehouse">
            <Select
              value={warehouseId === "all" ? "" : String(warehouseId)}
              onChange={(event) => {
                const raw = event.target.value;
                setWarehouseId(raw ? Number(raw) : "all");
              }}
            >
              <option value="">All warehouses</option>
              {serviceWarehouses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
        </Card>
      )}
      {listLoading ? (
        <LoadingState label="Loading services…" />
      ) : listError ? (
        <ErrorState
          message={errorMessage(listError, "Unable to load services.")}
          onRetry={() => {
            void warehousesQuery.refetch();
            void offeringsQuery.refetch();
          }}
        />
      ) : serviceWarehouses.length === 0 ? (
        <Card className="admin-selection-prompt">
          <ListChecks aria-hidden="true" />
          <p>Add a warehouse that supports services to manage the catalog.</p>
        </Card>
      ) : offerings.length === 0 ? (
        <EmptyState
          title="No services yet"
          description="Services will appear here once they are added."
        />
      ) : (
        <div className="admin-hub-grid">
          {offerings.map((offering) => {
            const body = (
              <>
                <ListChecks aria-hidden="true" />
                <span>
                  <strong>{offering.name}</strong>
                  <small>
                    {offering.code || "—"} · {warehouseName(offering.warehouseId)}
                  </small>
                  <small>
                    {formatCurrency(offering.defaultRate)} ·{" "}
                    {offering.active ? "Active" : "Inactive"}
                  </small>
                </span>
              </>
            );
            return (
              <div className="admin-hub-card-wrap" key={offering.id}>
                {canUpdate ? (
                  <button
                    type="button"
                    className="admin-hub-card"
                    onClick={() => openEdit(offering)}
                  >
                    {body}
                  </button>
                ) : (
                  <div className="admin-hub-card">{body}</div>
                )}
                <Can resource="SERVICE_OFFERING" privilege="DELETE">
                  <Button
                    variant="ghost"
                    className="admin-hub-card-wrap__action"
                    aria-label={`Delete ${offering.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteTarget(offering);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </Can>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={editing !== undefined}
        title={editing ? "Edit service" : "Add service"}
        onClose={() => setEditing(undefined)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEditing(undefined)}
              disabled={saveOffering.isPending}
            >
              Cancel
            </Button>
            <Button loading={saveOffering.isPending} onClick={validateAndSave}>
              Save
            </Button>
          </>
        }
      >
        <div className="admin-form">
          <FormField label="Warehouse" required error={fieldErrors.warehouseId}>
            <Select
              value={form.warehouseId}
              disabled={Boolean(editing)}
              onChange={(event) => {
                const id = Number(event.target.value);
                setForm((current) => ({
                  ...current,
                  warehouseId: Number.isInteger(id) && id > 0 ? id : "",
                }));
                setFieldErrors((current) => ({
                  ...current,
                  warehouseId: undefined,
                }));
              }}
            >
              <option value="">Select warehouse</option>
              {serviceWarehouses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Code"
            required
            hint="Uppercase letters, numbers, and underscores only."
            error={fieldErrors.code}
          >
            <Input
              autoFocus
              value={form.code}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  code: normalizeCode(event.target.value),
                }));
                setFieldErrors((current) => ({ ...current, code: undefined }));
              }}
              maxLength={50}
              placeholder="WASH"
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
              placeholder="Exterior wash"
            />
          </FormField>
          <FormField
            label="Default rate"
            required
            error={fieldErrors.defaultRate}
          >
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.defaultRate}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  defaultRate: event.target.value,
                }));
                setFieldErrors((current) => ({
                  ...current,
                  defaultRate: undefined,
                }));
              }}
            />
          </FormField>
          <label className="check-label">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  active: event.target.checked,
                }))
              }
            />
            Active
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete service?"
        message={
          deleteTarget ? `Remove "${deleteTarget.name}" from the catalog?` : ""
        }
        confirmLabel="Delete"
        danger
        loading={removeOffering.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeOffering.mutate(deleteTarget)}
      />
    </>
  );
};
