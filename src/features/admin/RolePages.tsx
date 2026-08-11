import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Badge,
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
import {
  isSuperAdminRoleCode,
  isSystemRole,
  RBAC_PRIVILEGES,
  type RbacModule,
  type RbacPrivilege,
  type RoleRecord,
} from "../../lib/rbac";
import {
  rbacApi,
  type CreateRolePayload,
  type RolePrivilegeGrant,
  type UpdateRolePayload,
} from "../../services/rbac";
import { usePermission } from "../../hooks/usePermission";

type TriState = { checked: boolean; indeterminate: boolean };

const PrivilegeSelectAllCheckbox = ({
  checked,
  indeterminate,
  disabled,
  onChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: () => void;
  "aria-label": string;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={ariaLabel}
    />
  );
};

const normalizeCode = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, "").toUpperCase();

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

type RoleFormValues = {
  code: string;
  name: string;
  description: string;
};

const emptyRoleForm: RoleFormValues = { code: "", name: "", description: "" };

type GridState = Record<number, Set<RbacPrivilege>>;

const buildGrid = (
  modules: RbacModule[],
  grants: { resourceId: number; privileges: string[] }[],
): GridState => {
  const grid: GridState = {};
  for (const mod of modules) {
    for (const resource of mod.resources) {
      grid[resource.id] = new Set();
    }
  }
  for (const grant of grants) {
    const set = new Set<RbacPrivilege>();
    for (const p of grant.privileges) {
      if (RBAC_PRIVILEGES.includes(p as RbacPrivilege)) {
        set.add(p as RbacPrivilege);
      }
    }
    grid[grant.resourceId] = set;
  }
  return grid;
};

const gridToPayload = (grid: GridState): RolePrivilegeGrant[] => {
  const grants: RolePrivilegeGrant[] = [];
  for (const [resourceIdStr, privs] of Object.entries(grid)) {
    if (privs.size === 0) continue;
    grants.push({
      resourceId: Number(resourceIdStr),
      privileges: [...privs],
    });
  }
  return grants;
};

export const RolesManagementPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { can } = usePermission();
  const [editing, setEditing] = useState<RoleRecord | null | undefined>();
  const [form, setForm] = useState(emptyRoleForm);
  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null);

  const rolesQuery = useQuery({
    queryKey: ["rbac", "roles"],
    queryFn: rbacApi.listRoles,
  });

  const saveRole = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      };
      if (editing) {
        const update: UpdateRolePayload = {
          ...payload,
          version: editing.version,
        };
        return rbacApi.updateRole(editing.id, update);
      }
      return rbacApi.createRole(payload as CreateRolePayload);
    },
    onSuccess: async () => {
      toast.success(editing ? "Role updated" : "Role created");
      setEditing(undefined);
      setForm(emptyRoleForm);
      await queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "CON_100") {
        toast.error(
          "This role was changed elsewhere. Refresh the list and try again.",
        );
        void queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] });
        return;
      }
      toast.error(errorMessage(error, "Unable to save the role."));
    },
  });

  const removeRole = useMutation({
    mutationFn: (role: RoleRecord) => rbacApi.deleteRole(role.id),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success("Role deleted");
      await queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] });
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Unable to delete the role.")),
  });

  const openCreate = () => {
    setForm(emptyRoleForm);
    setEditing(null);
  };

  const openEdit = (role: RoleRecord) => {
    if (isSystemRole(role)) return;
    setForm({
      code: role.code,
      name: role.name,
      description: role.description ?? "",
    });
    setEditing(role);
  };

  const columns: readonly DataColumn<RoleRecord>[] = [
    { key: "name", header: "Name", cell: (row) => row.name },
    {
      key: "code",
      header: "Code",
      cell: (row) => <code>{row.code}</code>,
    },
    {
      key: "system",
      header: "Type",
      cell: (row) =>
        isSystemRole(row) ? (
          <Badge tone="info">System</Badge>
        ) : (
          <Badge tone="neutral">Custom</Badge>
        ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => row.description || "—",
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (row) => {
        const system = isSystemRole(row);
        const superAdmin = isSuperAdminRoleCode(row.code);
        return (
          <span className="operations-inline-actions">
            {!superAdmin && (
              <Can resource="ROLE" privilege="VIEW">
                <Link
                  className="button button--ghost"
                  to={`/more/roles/${row.id}/permissions`}
                >
                  <KeyRound size={14} /> Permissions
                </Link>
              </Can>
            )}
            <Can resource="ROLE" privilege="UPDATE">
              <Button
                variant="ghost"
                disabled={system}
                onClick={() => openEdit(row)}
              >
                <Pencil size={14} /> Edit
              </Button>
            </Can>
            <Can resource="ROLE" privilege="DELETE">
              <Button
                variant="ghost"
                disabled={system}
                onClick={() => setDeleteTarget(row)}
              >
                <Trash2 size={14} /> Delete
              </Button>
            </Can>
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="Define roles and control access across the application."
        actions={
          <Can resource="ROLE" privilege="CREATE">
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" /> New role
            </Button>
          </Can>
        }
      />
      {rolesQuery.isPending ? (
        <LoadingState label="Loading roles…" />
      ) : rolesQuery.isError ? (
        <ErrorState
          message={errorMessage(rolesQuery.error, "Unable to load roles.")}
          onRetry={() => void rolesQuery.refetch()}
        />
      ) : (
        <Card>
          <DataTable
            caption="Roles"
            columns={columns}
            rows={rolesQuery.data ?? []}
            rowKey={(row) => String(row.id)}
            emptyMessage="No roles yet"
            onRowClick={(row) => {
              if (!isSuperAdminRoleCode(row.code) && can("ROLE", "VIEW")) {
                navigate(`/more/roles/${row.id}/permissions`);
              }
            }}
          />
        </Card>
      )}

      <Modal
        open={editing !== undefined}
        title={editing ? "Edit role" : "New role"}
        onClose={() => setEditing(undefined)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button
              loading={saveRole.isPending}
              onClick={() => saveRole.mutate()}
            >
              {editing ? "Save changes" : "Create role"}
            </Button>
          </>
        }
      >
        <div className="admin-form">
          <FormField label="Code" required>
            <Input
              value={form.code}
              onChange={(event) =>
                setForm((f) => ({
                  ...f,
                  code: normalizeCode(event.target.value),
                }))
              }
              readOnly={Boolean(editing)}
              placeholder="SALES_MANAGER"
            />
          </FormField>
          <FormField label="Name" required>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((f) => ({ ...f, name: event.target.value }))
              }
              placeholder="Sales Manager"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm((f) => ({ ...f, description: event.target.value }))
              }
              rows={3}
            />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete role?"
        message={
          deleteTarget
            ? `Remove "${deleteTarget.name}"? User assignments for this role will be cleared.`
            : ""
        }
        confirmLabel="Delete"
        danger
        loading={removeRole.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeRole.mutate(deleteTarget)}
      />
    </>
  );
};

export const RolePermissionsPage = () => {
  const { roleId } = useParams();
  const id = Number(roleId);
  const { can } = usePermission();

  const rolesQuery = useQuery({
    queryKey: ["rbac", "roles"],
    queryFn: rbacApi.listRoles,
  });

  const role = rolesQuery.data?.find((entry) => entry.id === id);
  const superAdminRole = role ? isSuperAdminRoleCode(role.code) : false;
  const matrixReadOnly = superAdminRole || !can("ROLE", "UPDATE");

  const resourcesQuery = useQuery({
    queryKey: ["rbac", "resources"],
    queryFn: rbacApi.getResources,
  });

  const privilegesQuery = useQuery({
    queryKey: ["rbac", "role-privileges", id],
    queryFn: () => rbacApi.getRolePrivileges(id),
    enabled: Number.isInteger(id) && id > 0,
  });

  const [grid, setGrid] = useState<GridState>({});

  const modules = resourcesQuery.data?.modules ?? [];

  useEffect(() => {
    if (!modules.length || !privilegesQuery.data) return;
    setGrid(buildGrid(modules, privilegesQuery.data.grants ?? []));
  }, [modules, privilegesQuery.data]);

  const save = useMutation({
    mutationFn: () => rbacApi.replaceRolePrivileges(id, gridToPayload(grid)),
    onSuccess: (result) => {
      toast.success("Permissions saved");
      setGrid(buildGrid(modules, result.grants ?? []));
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Unable to save permissions.")),
  });

  const toggle = (resourceId: number, privilege: RbacPrivilege) => {
    if (matrixReadOnly) return;
    setGrid((current) => {
      const next = { ...current };
      const set = new Set(next[resourceId] ?? []);
      if (set.has(privilege)) set.delete(privilege);
      else set.add(privilege);
      next[resourceId] = set;
      return next;
    });
  };

  const moduleSelection = (mod: RbacModule): TriState => {
    let total = 0;
    let selected = 0;
    for (const resource of mod.resources) {
      for (const privilege of RBAC_PRIVILEGES) {
        total += 1;
        if (grid[resource.id]?.has(privilege)) selected += 1;
      }
    }
    return {
      checked: total > 0 && selected === total,
      indeterminate: selected > 0 && selected < total,
    };
  };

  const columnSelection = (
    mod: RbacModule,
    privilege: RbacPrivilege,
  ): TriState => {
    const total = mod.resources.length;
    const selected = mod.resources.filter((resource) =>
      grid[resource.id]?.has(privilege),
    ).length;
    return {
      checked: total > 0 && selected === total,
      indeterminate: selected > 0 && selected < total,
    };
  };

  const rowSelection = (resourceId: number): TriState => {
    const selected = RBAC_PRIVILEGES.filter((privilege) =>
      grid[resourceId]?.has(privilege),
    ).length;
    const total = RBAC_PRIVILEGES.length;
    return {
      checked: selected === total,
      indeterminate: selected > 0 && selected < total,
    };
  };

  const toggleModule = (mod: RbacModule) => {
    if (matrixReadOnly) return;
    const { checked } = moduleSelection(mod);
    setGrid((current) => {
      const next = { ...current };
      for (const resource of mod.resources) {
        next[resource.id] = checked
          ? new Set()
          : new Set(RBAC_PRIVILEGES);
      }
      return next;
    });
  };

  const toggleColumn = (mod: RbacModule, privilege: RbacPrivilege) => {
    if (matrixReadOnly) return;
    const { checked } = columnSelection(mod, privilege);
    setGrid((current) => {
      const next = { ...current };
      for (const resource of mod.resources) {
        const set = new Set(next[resource.id] ?? []);
        if (checked) set.delete(privilege);
        else set.add(privilege);
        next[resource.id] = set;
      }
      return next;
    });
  };

  const toggleRow = (resourceId: number) => {
    if (matrixReadOnly) return;
    const { checked } = rowSelection(resourceId);
    setGrid((current) => ({
      ...current,
      [resourceId]: checked ? new Set() : new Set(RBAC_PRIVILEGES),
    }));
  };

  if (!Number.isInteger(id) || id <= 0) {
    return <ErrorState message="Invalid role." />;
  }

  const loading =
    rolesQuery.isPending ||
    resourcesQuery.isPending ||
    privilegesQuery.isPending;

  if (loading) {
    return <LoadingState label="Loading permission matrix…" />;
  }

  if (rolesQuery.isError || resourcesQuery.isError || privilegesQuery.isError) {
    return (
      <ErrorState
        message="Unable to load role permissions."
        onRetry={() => {
          void rolesQuery.refetch();
          void resourcesQuery.refetch();
          void privilegesQuery.refetch();
        }}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={role ? `${role.name} permissions` : "Role permissions"}
        description={
          superAdminRole
            ? "Super Admin bypasses privilege checks; grants cannot be edited."
            : "Checked privileges are granted for this role. Saving replaces all grants."
        }
        actions={
          <>
            <Link className="button button--secondary" to="/more/roles">
              Back to roles
            </Link>
            {!matrixReadOnly && (
              <Button loading={save.isPending} onClick={() => save.mutate()}>
                Save permissions
              </Button>
            )}
          </>
        }
      />

      <div className="admin-permission-matrix">
        {modules.map((mod) => {
          const moduleState = moduleSelection(mod);
          return (
            <Card key={mod.id} className="admin-permission-module">
              <div className="admin-permission-module-header">
                <h2>{mod.description || mod.code}</h2>
                <label className="admin-permission-select-all">
                  <PrivilegeSelectAllCheckbox
                    checked={moduleState.checked}
                    indeterminate={moduleState.indeterminate}
                    disabled={matrixReadOnly}
                    onChange={() => toggleModule(mod)}
                    aria-label={`Select all privileges in ${mod.description || mod.code}`}
                  />
                  Select all
                </label>
              </div>
              <div className="admin-permission-table-wrap">
                <table className="admin-permission-table">
                  <thead>
                    <tr>
                      <th>Resource</th>
                      {RBAC_PRIVILEGES.map((priv) => {
                        const columnState = columnSelection(mod, priv);
                        return (
                          <th key={priv}>
                            <div className="admin-permission-col-header">
                              <PrivilegeSelectAllCheckbox
                                checked={columnState.checked}
                                indeterminate={columnState.indeterminate}
                                disabled={matrixReadOnly}
                                onChange={() => toggleColumn(mod, priv)}
                                aria-label={`Select ${priv} for all resources in ${mod.description || mod.code}`}
                              />
                              <span>{priv}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {mod.resources.map((resource) => {
                      const rowState = rowSelection(resource.id);
                      return (
                        <tr key={resource.id}>
                          <td>
                            <div className="admin-permission-resource">
                              <PrivilegeSelectAllCheckbox
                                checked={rowState.checked}
                                indeterminate={rowState.indeterminate}
                                disabled={matrixReadOnly}
                                onChange={() => toggleRow(resource.id)}
                                aria-label={`Select all privileges for ${resource.code}`}
                              />
                              <div>
                                <strong>{resource.description}</strong>
                                <div className="admin-permission-resource-code">
                                  {resource.code}
                                </div>
                              </div>
                            </div>
                          </td>
                          {RBAC_PRIVILEGES.map((priv) => {
                            const checked =
                              grid[resource.id]?.has(priv) ?? false;
                            return (
                              <td key={priv}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={matrixReadOnly}
                                  onChange={() => toggle(resource.id, priv)}
                                  aria-label={`${resource.code} ${priv}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
};
