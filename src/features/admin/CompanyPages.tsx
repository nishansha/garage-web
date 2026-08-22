import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, UserCog } from "lucide-react";
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
  Textarea,
  type DataColumn,
} from "../../components/ui";
import { Can } from "../../components/Can";
import { ApiError } from "../../lib/api";
import { adminApi, type StaffMember } from "../../services/admin";
import {
  companyApi,
  type Company,
  type CompanyInput,
} from "../../services/company";

const normalizeCode = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toUpperCase()
    .slice(0, 50);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

type CompanyFormValues = {
  code: string;
  name: string;
  registrationNo: string;
  address: string;
  active: boolean;
};

const emptyForm: CompanyFormValues = {
  code: "",
  name: "",
  registrationNo: "",
  address: "",
  active: true,
};

const toPayload = (form: CompanyFormValues): CompanyInput => ({
  code: form.code.trim().toUpperCase(),
  name: form.name.trim(),
  active: form.active,
  ...(form.registrationNo.trim()
    ? { registrationNo: form.registrationNo.trim() }
    : {}),
  ...(form.address.trim() ? { address: form.address.trim() } : {}),
});

export const CompaniesManagementPage = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Company | null | undefined>();
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CompanyFormValues, string>>
  >({});
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [accessTarget, setAccessTarget] = useState<Company | null>(null);

  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: companyApi.list,
  });

  const saveCompany = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      if (editing) {
        return companyApi.update(editing.id, {
          ...payload,
          version: editing.version,
        });
      }
      return companyApi.create(payload);
    },
    onSuccess: async () => {
      toast.success(editing ? "Company updated" : "Company created");
      setEditing(undefined);
      setForm(emptyForm);
      setFieldErrors({});
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        (error.code === "CON_100" || error.code === "CON_101")
      ) {
        toast.error(
          "Someone else updated this company. Please refresh and try again.",
        );
        void queryClient.invalidateQueries({ queryKey: ["companies"] });
        return;
      }
      if (error instanceof ApiError && error.code === "BUS_222") {
        setFieldErrors((current) => ({
          ...current,
          code: error.message || "A company with this code already exists",
        }));
        return;
      }
      toast.error(errorMessage(error, "Unable to save the company."));
    },
  });

  const removeCompany = useMutation({
    mutationFn: (company: Company) => companyApi.delete(company.id),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success("Company deleted");
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "BUS_223") {
        toast.error(
          error.message ||
            "This company has warehouses assigned and cannot be deleted",
        );
        return;
      }
      toast.error(errorMessage(error, "Unable to delete the company."));
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setFieldErrors({});
    setEditing(null);
  };

  const openEdit = (company: Company) => {
    setForm({
      code: company.code,
      name: company.name,
      registrationNo: company.registrationNo ?? "",
      address: company.address ?? "",
      active: company.active,
    });
    setFieldErrors({});
    setEditing(company);
  };

  const validateAndSave = () => {
    const nextErrors: Partial<Record<keyof CompanyFormValues, string>> = {};
    if (!form.code.trim()) nextErrors.code = "Code is required";
    if (!form.name.trim()) nextErrors.name = "Name is required";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    saveCompany.mutate();
  };

  const columns: readonly DataColumn<Company>[] = [
    {
      key: "code",
      header: "Code",
      cell: (row) => <code>{row.code}</code>,
    },
    { key: "name", header: "Name", cell: (row) => row.name },
    {
      key: "registrationNo",
      header: "Registration",
      cell: (row) => row.registrationNo || "—",
    },
    {
      key: "active",
      header: "Status",
      cell: (row) => (row.active ? "Active" : "Inactive"),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (row) => (
        <span className="operations-inline-actions">
          <Can resource="COMPANY" privilege="UPDATE">
            <Button variant="ghost" onClick={() => openEdit(row)}>
              <Pencil size={14} /> Edit
            </Button>
            <Button variant="ghost" onClick={() => setAccessTarget(row)}>
              <UserCog size={14} /> Access
            </Button>
          </Can>
          <Can resource="COMPANY" privilege="DELETE">
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
        title="Companies"
        description="Legal entities under this tenant. Warehouses and payroll belong to a company."
        actions={
          <Can resource="COMPANY" privilege="CREATE">
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" /> New company
            </Button>
          </Can>
        }
      />
      {companiesQuery.isPending ? (
        <LoadingState label="Loading companies…" />
      ) : companiesQuery.isError ? (
        <ErrorState
          message={errorMessage(
            companiesQuery.error,
            "Unable to load companies.",
          )}
          onRetry={() => void companiesQuery.refetch()}
        />
      ) : (
        <Card>
          <DataTable
            caption="Companies"
            columns={columns}
            rows={companiesQuery.data ?? []}
            rowKey={(row) => String(row.id)}
            emptyMessage="No companies yet"
            emptyDescription="Companies will appear here once they are added."
          />
        </Card>
      )}

      <Modal
        open={editing !== undefined}
        title={editing ? "Edit company" : "New company"}
        onClose={() => setEditing(undefined)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button loading={saveCompany.isPending} onClick={validateAndSave}>
              {editing ? "Save changes" : "Create company"}
            </Button>
          </>
        }
      >
        <div className="admin-form">
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
              placeholder="Main company"
            />
          </FormField>
          <FormField
            label="Registration no."
            error={fieldErrors.registrationNo}
          >
            <Input
              value={form.registrationNo}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  registrationNo: event.target.value,
                }))
              }
              placeholder="GST / CIN"
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
              placeholder="Registered address"
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

      <CompanyAccessModal
        company={accessTarget}
        onClose={() => setAccessTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete company?"
        message={
          deleteTarget
            ? `Remove "${deleteTarget.name}"? Companies with warehouses cannot be deleted.`
            : ""
        }
        confirmLabel="Delete"
        danger
        loading={removeCompany.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeCompany.mutate(deleteTarget)}
      />
    </>
  );
};

const CompanyAccessModal = ({
  company,
  onClose,
}: {
  company: Company | null;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const staffQuery = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: adminApi.getStaff,
    enabled: company != null,
  });
  const accessQuery = useQuery({
    queryKey: ["companies", company?.id, "access"],
    queryFn: () => companyApi.access(company!.id),
    enabled: company != null,
  });
  const granted = new Set(accessQuery.data ?? []);

  const toggleAccess = useMutation({
    mutationFn: async ({
      user,
      grant,
    }: {
      user: StaffMember;
      grant: boolean;
    }) => {
      if (!company) return;
      return grant
        ? companyApi.grantAccess(company.id, user.id)
        : companyApi.revokeAccess(company.id, user.id);
    },
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.grant
          ? `Granted access to ${variables.user.name}`
          : `Revoked access from ${variables.user.name}`,
      );
      await queryClient.invalidateQueries({
        queryKey: ["companies", company?.id, "access"],
      });
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Unable to update company access."));
    },
  });

  return (
    <Modal
      open={company != null}
      title={company ? `Access — ${company.name}` : "Access"}
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <p className="muted">
        Users listed here can see this company in reports and operations. Most
        people need access to only one company.
      </p>
      {staffQuery.isPending || accessQuery.isPending ? (
        <LoadingState label="Loading access…" />
      ) : staffQuery.isError || accessQuery.isError ? (
        <ErrorState
          message={errorMessage(
            staffQuery.error ?? accessQuery.error,
            "Unable to load company access.",
          )}
          onRetry={() => {
            void staffQuery.refetch();
            void accessQuery.refetch();
          }}
        />
      ) : (
        <ul className="admin-role-checkboxes">
          {(staffQuery.data ?? []).map((user) => {
            const checked = granted.has(user.id);
            return (
              <label key={user.id} className="admin-role-option">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={toggleAccess.isPending}
                  onChange={() =>
                    toggleAccess.mutate({ user, grant: !checked })
                  }
                />
                <span>
                  {user.name}
                  <small className="cell-subtitle"> {user.userName}</small>
                </span>
              </label>
            );
          })}
        </ul>
      )}
    </Modal>
  );
};
