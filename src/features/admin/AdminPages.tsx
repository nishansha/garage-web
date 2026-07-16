import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  DataTable,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  Select,
  type DataColumn,
} from "../../components/ui";
import { ApiError } from "../../lib/api";
import {
  applyFieldValidationErrors,
  getFieldValidationMessage,
} from "../../lib/validation";
import type { ValidationCode } from "../../lib/validation-messages";
import {
  adminApi,
  type Customer,
  type CreateStaffPayload,
  type ResetDataResponse,
  type StaffMember,
  type StaffRole,
  type Vendor,
} from "../../services/admin";
import { AdminGuard } from "./AdminGuard";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const vendorColumns: readonly DataColumn<Vendor>[] = [
  { key: "name", header: "Name", cell: (row) => row.name },
  { key: "mobile", header: "Mobile", cell: (row) => row.mobile },
  {
    key: "address",
    header: "Address",
    cell: (row) => row.address || "—",
  },
  {
    key: "outstanding",
    header: "Outstanding",
    align: "right",
    cell: (row) => money.format(row.outstandingBalance),
  },
];

export const VendorsPage = () => {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "vendors", page],
    queryFn: () => adminApi.getVendors(page - 1, 20),
  });

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Review vendors and their outstanding balances."
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message={
            query.error instanceof Error
              ? query.error.message
              : "Unable to load vendors."
          }
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <DataTable
            caption="Vendors"
            columns={vendorColumns}
            rows={query.data?.vendors ?? []}
            rowKey={(row) => String(row.id)}
          />
          <Pagination
            page={page}
            pageCount={query.data?.totalPages ?? 0}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  );
};

export const CustomersPage = () => {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "customers", page],
    queryFn: () => adminApi.getCustomers(page - 1, 20),
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Review customers and their outstanding balances."
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message={
            query.error instanceof Error
              ? query.error.message
              : "Unable to load customers."
          }
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <DataTable<Customer>
            caption="Customers"
            columns={vendorColumns}
            rows={query.data?.customers ?? []}
            rowKey={(row) => String(row.id)}
          />
          <Pagination
            page={page}
            pageCount={query.data?.totalPages ?? 0}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  );
};

interface StaffFormValues {
  name: string;
  userName: string;
  password: string;
  role: StaffRole | "";
  designation: string;
}

const emptyStaffForm: StaffFormValues = {
  name: "",
  userName: "",
  password: "",
  role: "",
  designation: "",
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;
const staffValidationMessage = (field: string, code: ValidationCode) =>
  getFieldValidationMessage("staff", field, code);

export const StaffManagementPage = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<StaffMember | null | undefined>();
  const form = useForm<StaffFormValues>({ defaultValues: emptyStaffForm });
  const staffQuery = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: adminApi.getStaff,
  });
  const saveStaff = useMutation({
    mutationFn: async (values: StaffFormValues) => {
      if (!values.role)
        throw new Error(staffValidationMessage("role", "REQUIRED"));
      if (editing) {
        return adminApi.updateStaff(editing.id, {
          name: values.name.trim(),
          role: values.role,
          designation: values.designation.trim(),
          ...(values.password ? { password: values.password } : {}),
        });
      }
      const payload: CreateStaffPayload = {
        name: values.name.trim(),
        userName: values.userName.trim(),
        password: values.password,
        role: values.role,
        designation: values.designation.trim(),
      };
      return adminApi.createStaff(payload);
    },
    onSuccess: async () => {
      toast.success(editing ? "Team member updated" : "Team member added");
      setEditing(undefined);
      form.reset(emptyStaffForm);
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: (error) => {
      const applied = applyFieldValidationErrors(
        error,
        form.setError,
        "staff",
        {
          name: "name",
          userName: "userName",
          username: "userName",
          password: "password",
          role: "role",
          designation: "designation",
        },
      );
      if (!applied) {
        toast.error(errorMessage(error, "Unable to save the team member."));
      }
    },
  });

  const openCreate = () => {
    form.reset(emptyStaffForm);
    setEditing(null);
  };
  const openEdit = (staff: StaffMember) => {
    form.reset({
      name: staff.name,
      userName: staff.userName,
      password: "",
      role:
        staff.role === "ADMIN" || staff.role === "STAFF" ? staff.role : "STAFF",
      designation: staff.designation ?? "",
    });
    setEditing(staff);
  };

  const columns: readonly DataColumn<StaffMember>[] = [
    { key: "name", header: "Name", cell: (row) => row.name },
    { key: "username", header: "Username", cell: (row) => row.userName },
    {
      key: "designation",
      header: "Designation",
      cell: (row) => row.designation || "—",
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => (
        <Badge tone={row.role === "ADMIN" ? "info" : "neutral"}>
          {row.role === "ADMIN" ? "Admin" : "Staff"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (row) => (
        <Button variant="ghost" onClick={() => openEdit(row)}>
          <Pencil aria-hidden="true" /> Edit
        </Button>
      ),
    },
  ];

  return (
    <AdminGuard>
      <PageHeader
        title="Staff Management"
        description="Manage team members and administrator access."
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" /> Add team member
          </Button>
        }
      />
      {staffQuery.isPending ? (
        <LoadingState label="Loading team members…" />
      ) : staffQuery.isError ? (
        <ErrorState
          message={errorMessage(
            staffQuery.error,
            "Unable to load team members.",
          )}
          onRetry={() => void staffQuery.refetch()}
        />
      ) : (
        <DataTable
          caption="Team members"
          columns={columns}
          rows={staffQuery.data}
          rowKey={(row) => String(row.id)}
          emptyMessage="No team members yet"
        />
      )}
      <Modal
        open={editing !== undefined}
        title={editing ? "Edit team member" : "Add team member"}
        onClose={() => setEditing(undefined)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEditing(undefined)}
              disabled={saveStaff.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="staff-form"
              loading={saveStaff.isPending}
            >
              {editing ? "Save changes" : "Add member"}
            </Button>
          </>
        }
      >
        <form
          id="staff-form"
          className="admin-form"
          onSubmit={form.handleSubmit((values) => saveStaff.mutate(values))}
        >
          <FormField
            label="Name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              autoFocus
              autoComplete="name"
              {...form.register("name", {
                required: staffValidationMessage("name", "REQUIRED"),
                validate: (value) =>
                  value.trim().length > 0 ||
                  staffValidationMessage("name", "REQUIRED"),
              })}
            />
          </FormField>
          <FormField
            label="User name"
            required={!editing}
            error={form.formState.errors.userName?.message}
          >
            <Input
              autoComplete="username"
              disabled={Boolean(editing)}
              {...form.register("userName", {
                required: editing
                  ? false
                  : staffValidationMessage("userName", "REQUIRED"),
                validate: editing
                  ? undefined
                  : (value) =>
                      value.trim().length > 0 ||
                      staffValidationMessage("userName", "REQUIRED"),
              })}
            />
          </FormField>
          <FormField
            label="Password"
            required={!editing}
            hint={editing ? "Leave blank to keep the current password." : ""}
            error={form.formState.errors.password?.message}
          >
            <Input
              type="password"
              autoComplete="new-password"
              {...form.register("password", {
                required: editing
                  ? false
                  : staffValidationMessage("password", "REQUIRED"),
              })}
            />
          </FormField>
          <FormField
            label="Role"
            required
            error={form.formState.errors.role?.message}
          >
            <Select
              placeholder="Select role"
              options={[
                { value: "STAFF", label: "Staff" },
                { value: "ADMIN", label: "Admin" },
              ]}
              {...form.register("role", {
                required: staffValidationMessage("role", "REQUIRED"),
              })}
            />
          </FormField>
          <FormField
            label="Designation"
            required
            error={form.formState.errors.designation?.message}
          >
            <Input
              {...form.register("designation", {
                required: staffValidationMessage("designation", "REQUIRED"),
                validate: (value) =>
                  value.trim().length > 0 ||
                  staffValidationMessage("designation", "REQUIRED"),
              })}
            />
          </FormField>
        </form>
      </Modal>
    </AdminGuard>
  );
};

export const AccountManagementPage = () => (
  <AdminGuard>
    <Navigate to="/accounting/accounts" replace />
  </AdminGuard>
);

const RESET_PHRASE = "CLEAR ALL DATA";

export const ClearDataPage = () => {
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<ResetDataResponse>();
  const reset = useMutation({
    mutationFn: adminApi.resetData,
    onSuccess: (response) => {
      setResult(response);
      setPhrase("");
      toast.success("Application data cleared");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Unable to clear application data.")),
  });

  return (
    <AdminGuard>
      <PageHeader
        title="Clear Data"
        description="Permanently remove transactional application data."
      />
      <Card className="admin-danger-card">
        <Trash2 aria-hidden="true" />
        <div>
          <h2>This action cannot be undone</h2>
          <p>
            Type <strong>{RESET_PHRASE}</strong> to confirm the reset.
          </p>
          <FormField label="Confirmation phrase">
            <Input
              value={phrase}
              autoComplete="off"
              onChange={(event) => setPhrase(event.target.value)}
              aria-describedby="reset-warning"
            />
          </FormField>
          <p id="reset-warning" className="admin-danger-card__warning">
            Business records will be removed. Authentication and required system
            records may be retained by the server.
          </p>
          <Button
            variant="danger"
            disabled={phrase !== RESET_PHRASE}
            loading={reset.isPending}
            onClick={() => reset.mutate()}
          >
            Clear all data
          </Button>
          {result && (
            <div className="admin-reset-result" role="status">
              Cleared {result.totalRowsDeleted} rows from {result.tablesCleared}{" "}
              tables.
            </div>
          )}
        </div>
      </Card>
    </AdminGuard>
  );
};
