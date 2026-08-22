import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DateInput,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  type DataColumn,
} from "../../components/ui";
import { Can } from "../../components/Can";
import { CompanyFilterSelect } from "../../components/CompanyFilterSelect";
import { QueryBoundary } from "../operations/common";
import { ApiError } from "../../lib/api";
import { paymentAccountCompanyMismatchMessage } from "../../lib/validation";
import { formatCurrency, formatDate } from "../../lib/utils";
import { companyLabel, useCompanyScope } from "../../hooks/useCompanyScope";
import { accountingApi } from "../../services/accounting";
import { adminApi } from "../../services/admin";
import { operationsApi } from "../../services/operations";
import {
  employeeApi,
  salaryPaymentApi,
  type Employee,
  type EmployeeInput,
  type SalaryPayment,
} from "../../services/payroll";

const normalizeCode = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toUpperCase()
    .slice(0, 50);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

const thisMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

type EmployeeFormValues = {
  companyId: number | "";
  employeeCode: string;
  name: string;
  designation: string;
  joinDate: string;
  terminationDate: string;
  salaryAmount: string;
  bankName: string;
  bankAccountNo: string;
  paymentAccountId: number | "";
  userProfileId: number | "";
  active: boolean;
};

const emptyEmployeeForm = (
  companyId: number | "" = "",
): EmployeeFormValues => ({
  companyId,
  employeeCode: "",
  name: "",
  designation: "",
  joinDate: new Date().toISOString().slice(0, 10),
  terminationDate: "",
  salaryAmount: "",
  bankName: "",
  bankAccountNo: "",
  paymentAccountId: "",
  userProfileId: "",
  active: true,
});

const toEmployeePayload = (form: EmployeeFormValues): EmployeeInput => ({
  companyId: Number(form.companyId),
  employeeCode: form.employeeCode,
  name: form.name,
  joinDate: form.joinDate,
  salaryAmount: Number(form.salaryAmount),
  paymentAccountId: Number(form.paymentAccountId),
  active: form.active,
  ...(form.designation.trim() ? { designation: form.designation.trim() } : {}),
  ...(form.terminationDate ? { terminationDate: form.terminationDate } : {}),
  ...(form.bankName.trim() ? { bankName: form.bankName.trim() } : {}),
  ...(form.bankAccountNo.trim()
    ? { bankAccountNo: form.bankAccountNo.trim() }
    : {}),
  ...(form.userProfileId ? { userProfileId: Number(form.userProfileId) } : {}),
});

export const EmployeesPage = () => {
  const queryClient = useQueryClient();
  const {
    companies,
    multi,
    companyId,
    reportCompanyId,
    selectedId,
    setSelectedId,
    ready,
  } = useCompanyScope();
  const [editing, setEditing] = useState<Employee | null | undefined>();
  const [form, setForm] = useState(emptyEmployeeForm());
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof EmployeeFormValues | "form", string>>
  >({});
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["employees", reportCompanyId],
    queryFn: () => employeeApi.list(reportCompanyId),
    enabled: ready,
  });
  const accountsQuery = useQuery({
    queryKey: ["operations", "payment-accounts", form.companyId || undefined],
    queryFn: () =>
      operationsApi.paymentAccounts(
        typeof form.companyId === "number" ? form.companyId : undefined,
      ),
    enabled: typeof form.companyId === "number",
  });
  const staffQuery = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: adminApi.getStaff,
  });

  const saveEmployee = useMutation({
    mutationFn: async () => {
      const payload = toEmployeePayload(form);
      if (editing) {
        return employeeApi.update(editing.id, {
          ...payload,
          version: editing.version,
        });
      }
      return employeeApi.create(payload);
    },
    onSuccess: async () => {
      toast.success(editing ? "Employee updated" : "Employee created");
      setEditing(undefined);
      setForm(emptyEmployeeForm(companyId ?? ""));
      setFieldErrors({});
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        (error.code === "CON_100" || error.code === "CON_101")
      ) {
        toast.error(
          "Someone else updated this employee. Please refresh and try again.",
        );
        void queryClient.invalidateQueries({ queryKey: ["employees"] });
        return;
      }
      if (error instanceof ApiError && error.code === "BUS_231") {
        setFieldErrors((current) => ({
          ...current,
          employeeCode:
            error.message || "An employee with this code already exists",
        }));
        return;
      }
      const mismatch = paymentAccountCompanyMismatchMessage(error);
      if (mismatch) {
        setFieldErrors((current) => ({
          ...current,
          form: mismatch,
        }));
        return;
      }
      toast.error(errorMessage(error, "Unable to save the employee."));
    },
  });

  const removeEmployee = useMutation({
    mutationFn: (employee: Employee) => employeeApi.delete(employee.id),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success("Employee deleted");
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Unable to delete the employee."));
    },
  });

  const openCreate = () => {
    setForm(emptyEmployeeForm(companyId ?? ""));
    setFieldErrors({});
    setEditing(null);
  };

  const openEdit = (employee: Employee) => {
    setForm({
      companyId: employee.companyId,
      employeeCode: employee.employeeCode,
      name: employee.name,
      designation: employee.designation ?? "",
      joinDate: employee.joinDate,
      terminationDate: employee.terminationDate ?? "",
      salaryAmount: String(employee.salaryAmount),
      bankName: employee.bankName ?? "",
      bankAccountNo: employee.bankAccountNo ?? "",
      paymentAccountId: employee.paymentAccountId,
      userProfileId: employee.userProfileId ?? "",
      active: employee.active,
    });
    setFieldErrors({});
    setEditing(employee);
  };

  const validateAndSave = () => {
    const nextErrors: Partial<Record<keyof EmployeeFormValues, string>> = {};
    if (!form.companyId) nextErrors.companyId = "Company is required";
    if (!form.employeeCode.trim())
      nextErrors.employeeCode = "Employee code is required";
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.joinDate) nextErrors.joinDate = "Join date is required";
    const salary = Number(form.salaryAmount);
    if (!form.salaryAmount.trim() || !Number.isFinite(salary) || salary <= 0) {
      nextErrors.salaryAmount = "Salary must be greater than zero";
    }
    if (!form.paymentAccountId)
      nextErrors.paymentAccountId = "Payment account is required";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    saveEmployee.mutate();
  };

  const companyName = (id: number) =>
    companies.find((item) => item.id === id)?.name ?? `Company ${id}`;

  const columns: readonly DataColumn<Employee>[] = [
    {
      key: "code",
      header: "Code",
      cell: (row) => <code>{row.employeeCode}</code>,
    },
    { key: "name", header: "Name", cell: (row) => row.name },
    {
      key: "designation",
      header: "Designation",
      cell: (row) => row.designation || "—",
    },
    {
      key: "company",
      header: "Company",
      cell: (row) => companyName(row.companyId),
    },
    {
      key: "salary",
      header: "Salary",
      align: "right",
      cell: (row) => formatCurrency(row.salaryAmount),
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
          <Can resource="EMPLOYEE" privilege="UPDATE">
            <Button variant="ghost" onClick={() => openEdit(row)}>
              <Pencil size={14} /> Edit
            </Button>
          </Can>
          <Can resource="EMPLOYEE" privilege="DELETE">
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
        title="Employees"
        description="People on payroll for a company. Optional login linking is only for staff who also sign in."
        actions={
          <Can resource="EMPLOYEE" privilege="CREATE">
            <Button onClick={openCreate} disabled={!companyId}>
              <Plus aria-hidden="true" /> New employee
            </Button>
          </Can>
        }
      />
      {multi && (
        <Card className="report-filters">
          <CompanyFilterSelect
            companies={companies}
            selectedId={selectedId}
            onChange={setSelectedId}
          />
        </Card>
      )}
      <QueryBoundary
        pending={employeesQuery.isPending}
        error={employeesQuery.error}
        retry={() => void employeesQuery.refetch()}
      >
        <Card>
          <DataTable
            caption="Employees"
            columns={columns}
            rows={employeesQuery.data ?? []}
            rowKey={(row) => String(row.id)}
            emptyMessage="No employees yet"
            emptyDescription="Employees will appear here once they are added."
          />
        </Card>
      </QueryBoundary>

      <Modal
        open={editing !== undefined}
        title={editing ? "Edit employee" : "New employee"}
        onClose={() => setEditing(undefined)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button loading={saveEmployee.isPending} onClick={validateAndSave}>
              {editing ? "Save changes" : "Create employee"}
            </Button>
          </>
        }
      >
        <div className="admin-form">
          {fieldErrors.form && (
            <div className="form-validation-summary" role="alert">
              {fieldErrors.form}
            </div>
          )}
          <FormField label="Company" required error={fieldErrors.companyId}>
            <Select
              value={form.companyId}
              disabled={Boolean(editing)}
              onChange={(event) => {
                const id = Number(event.target.value);
                setForm((current) => ({
                  ...current,
                  companyId: Number.isInteger(id) && id > 0 ? id : "",
                  paymentAccountId: "",
                }));
                setFieldErrors((current) => ({
                  ...current,
                  companyId: undefined,
                }));
              }}
            >
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {companyLabel(company)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Employee code"
            required
            error={fieldErrors.employeeCode}
          >
            <Input
              value={form.employeeCode}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  employeeCode: normalizeCode(event.target.value),
                }));
                setFieldErrors((current) => ({
                  ...current,
                  employeeCode: undefined,
                }));
              }}
              maxLength={50}
              placeholder="EMP001"
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
            />
          </FormField>
          <FormField label="Designation" error={fieldErrors.designation}>
            <Input
              value={form.designation}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  designation: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField label="Join date" required error={fieldErrors.joinDate}>
            <DateInput
              value={form.joinDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  joinDate: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField
            label="Termination date"
            error={fieldErrors.terminationDate}
          >
            <DateInput
              value={form.terminationDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  terminationDate: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField
            label="Salary amount"
            required
            error={fieldErrors.salaryAmount}
          >
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.salaryAmount}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  salaryAmount: event.target.value,
                }));
                setFieldErrors((current) => ({
                  ...current,
                  salaryAmount: undefined,
                }));
              }}
            />
          </FormField>
          <FormField
            label="Disbursement account"
            required
            error={fieldErrors.paymentAccountId}
          >
            <Select
              value={form.paymentAccountId}
              disabled={!form.companyId}
              onChange={(event) => {
                const id = Number(event.target.value);
                setForm((current) => ({
                  ...current,
                  paymentAccountId: Number.isInteger(id) && id > 0 ? id : "",
                }));
                setFieldErrors((current) => ({
                  ...current,
                  paymentAccountId: undefined,
                }));
              }}
            >
              <option value="">Select account</option>
              {(accountsQuery.data ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Bank name" error={fieldErrors.bankName}>
            <Input
              value={form.bankName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  bankName: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField label="Bank account no." error={fieldErrors.bankAccountNo}>
            <Input
              value={form.bankAccountNo}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  bankAccountNo: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField
            label="Linked login"
            hint="Only if this employee also has a staff login."
            error={fieldErrors.userProfileId}
          >
            <Select
              value={form.userProfileId}
              onChange={(event) => {
                const id = Number(event.target.value);
                setForm((current) => ({
                  ...current,
                  userProfileId: Number.isInteger(id) && id > 0 ? id : "",
                }));
              }}
            >
              <option value="">None</option>
              {(staffQuery.data ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.userName})
                </option>
              ))}
            </Select>
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
        title="Delete employee?"
        message={
          deleteTarget ? `Remove "${deleteTarget.name}" from payroll?` : ""
        }
        confirmLabel="Delete"
        danger
        loading={removeEmployee.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeEmployee.mutate(deleteTarget)}
      />
    </>
  );
};

export const SalaryPaymentsPage = () => {
  const queryClient = useQueryClient();
  const {
    companies,
    companyId,
    reportCompanyId,
    selectedId,
    setSelectedId,
    ready,
  } = useCompanyScope();
  const [period, setPeriod] = useState(thisMonth());
  const [payTarget, setPayTarget] = useState<SalaryPayment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalaryPayment | null>(null);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentAccountId, setPaymentAccountId] = useState<number | "">("");

  const paymentsQuery = useQuery({
    queryKey: ["salary-payments", reportCompanyId],
    queryFn: () => salaryPaymentApi.list(reportCompanyId),
    enabled: ready,
  });
  const [formError, setFormError] = useState<string>();
  const accountsQuery = useQuery({
    queryKey: ["accounting", "payment-accounts", companyId],
    queryFn: () => accountingApi.paymentAccounts(true, companyId),
    enabled: companyId != null,
  });

  const generate = useMutation({
    mutationFn: () => salaryPaymentApi.generate(companyId!, period),
    onSuccess: async (created) => {
      toast.success(
        created
          ? `Generated ${created} salary payment${created === 1 ? "" : "s"}`
          : "No new salary rows — employees already have this period",
      );
      await queryClient.invalidateQueries({ queryKey: ["salary-payments"] });
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Unable to generate salary payments."));
    },
  });

  const markPaid = useMutation({
    mutationFn: () =>
      salaryPaymentApi.markPaid(payTarget!.id, {
        paymentDate,
        paymentAccountId: Number(paymentAccountId),
      }),
    onSuccess: async () => {
      setPayTarget(null);
      toast.success("Salary marked paid");
      await queryClient.invalidateQueries({ queryKey: ["salary-payments"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "BUS_233") {
        toast.error(error.message || "This salary payment is already paid");
        return;
      }
      const mismatch = paymentAccountCompanyMismatchMessage(error);
      if (mismatch) {
        setFormError(mismatch);
        return;
      }
      toast.error(errorMessage(error, "Unable to mark salary as paid."));
    },
  });

  const removePayment = useMutation({
    mutationFn: (payment: SalaryPayment) => salaryPaymentApi.delete(payment.id),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success("Salary payment deleted");
      await queryClient.invalidateQueries({ queryKey: ["salary-payments"] });
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Unable to delete the salary payment."));
    },
  });

  const openMarkPaid = (payment: SalaryPayment) => {
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentAccountId(payment.paymentAccountId ?? "");
    setFormError(undefined);
    setPayTarget(payment);
  };

  const rows = useMemo(() => {
    const [year, month] = period.split("-").map(Number);
    return (paymentsQuery.data ?? []).filter(
      (row) => row.payPeriodYear === year && row.payPeriodMonth === month,
    );
  }, [paymentsQuery.data, period]);

  const periodLabel = (row: SalaryPayment) =>
    `${String(row.payPeriodMonth).padStart(2, "0")}/${row.payPeriodYear}`;

  const columns: readonly DataColumn<SalaryPayment>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <span>
          <strong>{row.employeeName}</strong>
          <small className="cell-subtitle">{row.employeeCode}</small>
        </span>
      ),
    },
    {
      key: "period",
      header: "Period",
      cell: (row) => periodLabel(row),
    },
    {
      key: "amount",
      header: "Net amount",
      align: "right",
      cell: (row) => formatCurrency(row.netAmount),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge tone={row.status === "PAID" ? "success" : "warning"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "paidOn",
      header: "Paid on",
      cell: (row) => formatDate(row.paymentDate),
    },
    {
      key: "account",
      header: "Account",
      cell: (row) => row.paymentAccountName || "—",
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (row) => (
        <span className="operations-inline-actions">
          {row.status !== "PAID" && (
            <Can resource="SALARY_PAYMENT" privilege="UPDATE">
              <Button variant="ghost" onClick={() => openMarkPaid(row)}>
                Mark paid
              </Button>
            </Can>
          )}
          <Can resource="SALARY_PAYMENT" privilege="DELETE">
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
        title="Salary payments"
        description="Pending rows are generated on the 1st of each month. Generate is a manual early trigger and skips employees who already have a row."
        actions={
          <Can resource="SALARY_PAYMENT" privilege="CREATE">
            <Button
              onClick={() => generate.mutate()}
              loading={generate.isPending}
              disabled={!companyId}
            >
              Generate {period}
            </Button>
          </Can>
        }
      />
      <Card className="report-filters">
        <CompanyFilterSelect
          companies={companies}
          selectedId={selectedId}
          onChange={setSelectedId}
        />
        <Input
          aria-label="Pay period"
          type="month"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        />
      </Card>
      <QueryBoundary
        pending={paymentsQuery.isPending}
        error={paymentsQuery.error}
        retry={() => void paymentsQuery.refetch()}
      >
        <Card>
          <DataTable
            caption="Salary payments"
            columns={columns}
            rows={rows}
            rowKey={(row) => String(row.id)}
            emptyMessage="No salary payments for this period"
            emptyDescription="Use Generate to create pending rows for active employees, or wait for the monthly scheduler."
          />
        </Card>
      </QueryBoundary>

      <Modal
        open={payTarget != null}
        title={
          payTarget ? `Mark paid — ${payTarget.employeeName}` : "Mark paid"
        }
        onClose={() => setPayTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={markPaid.isPending}
              disabled={!paymentDate || !paymentAccountId}
              onClick={() => markPaid.mutate()}
            >
              Mark paid
            </Button>
          </>
        }
      >
        <div className="admin-form">
          {formError && (
            <div className="form-validation-summary" role="alert">
              {formError}
            </div>
          )}
          <FormField label="Payment date" required>
            <DateInput
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
          </FormField>
          <FormField label="Payment account" required>
            <Select
              value={paymentAccountId}
              onChange={(event) => {
                const id = Number(event.target.value);
                setPaymentAccountId(Number.isInteger(id) && id > 0 ? id : "");
              }}
            >
              <option value="">Select account</option>
              {(accountsQuery.data ?? [])
                .filter((account) => account.active)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </Select>
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete salary payment?"
        message={
          deleteTarget
            ? `Delete the ${periodLabel(deleteTarget)} payment for ${deleteTarget.employeeName}? A paid row cannot be unpaid — deleting it reverses the journal entry.`
            : ""
        }
        confirmLabel="Delete"
        danger
        loading={removePayment.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removePayment.mutate(deleteTarget)}
      />
    </>
  );
};
