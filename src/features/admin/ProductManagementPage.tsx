import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Tags } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Button,
  Card,
  DataTable,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  PageHeader,
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
  type MasterDataContext,
  type MasterDataItem,
  type MasterDataType,
  type SaveMasterDataPayload,
} from "../../services/admin";
import { AdminGuard } from "./AdminGuard";
import { masterDataTypes } from "./masterData";

const isMasterDataType = (value: string | null): value is MasterDataType =>
  masterDataTypes.some((entry) => entry.type === value);

const displayError = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;
const masterDataValidationMessage = (field: string, code: ValidationCode) =>
  getFieldValidationMessage("masterData", field, code);

const itemLabel = (item: MasterDataItem) =>
  item.description || item.code || `Record ${item.id}`;

interface MasterFormValues {
  code: string;
  description: string;
  categoryId?: number;
  brandId?: number;
  modelId?: number;
}

const emptyForm: MasterFormValues = { code: "", description: "" };
const normalizeCode = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, "").toUpperCase();

export const ProductManagementPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get("type");
  const selectedType = isMasterDataType(requestedType)
    ? requestedType
    : undefined;
  const config = masterDataTypes.find((entry) => entry.type === selectedType);
  const [categoryId, setCategoryId] = useState(1);
  const [brandId, setBrandId] = useState(0);
  const [modelId, setModelId] = useState(0);
  const [editing, setEditing] = useState<MasterDataItem | null | undefined>();
  const form = useForm<MasterFormValues>({ defaultValues: emptyForm });

  useEffect(() => {
    setBrandId(0);
    setModelId(0);
    setEditing(undefined);
    form.reset(emptyForm);
  }, [selectedType, form]);

  const requiresCategory =
    selectedType === "BRAND" ||
    selectedType === "MODEL" ||
    selectedType === "VARIANT" ||
    selectedType === "SEGMENT";
  const requiresBrand = selectedType === "MODEL" || selectedType === "VARIANT";
  const requiresModel = selectedType === "VARIANT";

  const categoriesQuery = useQuery({
    queryKey: ["admin", "master-data", "CATEGORY"],
    queryFn: () => adminApi.getMasterData("CATEGORY"),
    enabled: Boolean(selectedType && requiresCategory),
  });
  const brandsQuery = useQuery({
    queryKey: ["admin", "master-data", "BRAND", categoryId],
    queryFn: () => adminApi.getMasterData("BRAND", { categoryId }),
    enabled: Boolean(selectedType && requiresBrand && categoryId),
  });
  const modelsQuery = useQuery({
    queryKey: ["admin", "master-data", "MODEL", categoryId, brandId],
    queryFn: () => adminApi.getMasterData("MODEL", { categoryId, brandId }),
    enabled: Boolean(selectedType && requiresModel && categoryId && brandId),
  });

  useEffect(() => {
    if (
      categoriesQuery.data?.length &&
      !categoriesQuery.data.some((category) => category.id === categoryId)
    ) {
      setCategoryId(categoriesQuery.data[0].id);
    }
  }, [categoriesQuery.data, categoryId]);

  const context = useMemo<MasterDataContext>(
    () => ({ categoryId, brandId, modelId }),
    [categoryId, brandId, modelId],
  );
  const canLoad =
    Boolean(selectedType) &&
    (!requiresCategory || categoryId > 0) &&
    (!requiresBrand || brandId > 0) &&
    (!requiresModel || modelId > 0);
  const listQuery = useQuery({
    queryKey: [
      "admin",
      "master-data",
      selectedType,
      categoryId,
      brandId,
      modelId,
    ],
    queryFn: () => adminApi.getMasterData(selectedType!, context),
    enabled: canLoad,
  });

  const saveItem = useMutation({
    mutationFn: (values: MasterFormValues) => {
      if (!selectedType) throw new Error("Select a master-data type.");
      const payload: SaveMasterDataPayload = {
        type: selectedType,
        code: normalizeCode(values.code),
        description: values.description.trim(),
        ...(requiresCategory ? { categoryId } : {}),
        ...(requiresBrand ? { brandId } : {}),
        ...(requiresModel ? { modelId } : {}),
      };
      return editing
        ? adminApi.updateMasterData(editing.id, payload)
        : adminApi.createMasterData(payload);
    },
    onSuccess: async () => {
      toast.success(editing ? "Record updated" : "Record created");
      setEditing(undefined);
      form.reset(emptyForm);
      await queryClient.invalidateQueries({
        queryKey: ["admin", "master-data"],
      });
    },
    onError: (error) => {
      const applied = applyFieldValidationErrors(
        error,
        form.setError,
        "masterData",
        {
          code: "code",
          description: "description",
          categoryId: "categoryId",
          category_id: "categoryId",
          brandId: "brandId",
          brand_id: "brandId",
          modelId: "modelId",
          model_id: "modelId",
        },
      );
      if (!applied) {
        toast.error(displayError(error, "Unable to save the record."));
      }
    },
  });

  const validatePrerequisites = () => {
    form.clearErrors(["categoryId", "brandId", "modelId"]);
    let valid = true;
    if (requiresCategory && categoryId <= 0) {
      form.setError("categoryId", {
        type: "required",
        message: masterDataValidationMessage("categoryId", "REQUIRED"),
      });
      valid = false;
    }
    if (requiresBrand && brandId <= 0) {
      form.setError("brandId", {
        type: "required",
        message: masterDataValidationMessage("brandId", "REQUIRED"),
      });
      valid = false;
    }
    if (requiresModel && modelId <= 0) {
      form.setError("modelId", {
        type: "required",
        message: masterDataValidationMessage("modelId", "REQUIRED"),
      });
      valid = false;
    }
    return valid;
  };
  const openCreate = () => {
    if (!validatePrerequisites()) return;
    form.reset({ ...emptyForm, categoryId, brandId, modelId });
    setEditing(null);
  };
  const openEdit = (item: MasterDataItem) => {
    form.reset({
      code: item.code,
      description: item.description,
      categoryId,
      brandId,
      modelId,
    });
    setEditing(item);
  };
  const submitItem = (values: MasterFormValues) => {
    if (validatePrerequisites()) saveItem.mutate(values);
  };
  const selectType = (type: MasterDataType) => setSearchParams({ type });

  const columns: readonly DataColumn<MasterDataItem>[] = [
    {
      key: "description",
      header: "Description",
      cell: (item) => itemLabel(item),
    },
    { key: "code", header: "Code", cell: (item) => item.code || "—" },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (item) => (
        <Button variant="ghost" onClick={() => openEdit(item)}>
          <Pencil aria-hidden="true" /> Edit
        </Button>
      ),
    },
  ];

  if (!selectedType || !config) {
    return (
      <AdminGuard>
        <PageHeader
          title="Product Management"
          description="Manage product and operational master data."
        />
        <div className="admin-hub-grid">
          {masterDataTypes.map((entry) => {
            const Icon = entry.icon;
            return (
              <button
                className="admin-hub-card"
                key={entry.type}
                onClick={() => selectType(entry.type)}
              >
                <Icon aria-hidden="true" />
                <span>
                  <strong>{entry.label}</strong>
                  <small>{entry.description}</small>
                </span>
              </button>
            );
          })}
        </div>
      </AdminGuard>
    );
  }

  const dependencyLoading =
    (requiresCategory && categoriesQuery.isPending) ||
    (requiresBrand && brandsQuery.isPending) ||
    (requiresModel && modelsQuery.isPending);
  const dependencyError =
    (requiresCategory ? categoriesQuery.error : null) ??
    (requiresBrand ? brandsQuery.error : null) ??
    (requiresModel ? modelsQuery.error : null);

  return (
    <AdminGuard>
      <PageHeader
        title={config.label}
        description={config.description}
        actions={
          <>
            <Button variant="secondary" onClick={() => setSearchParams({})}>
              <ArrowLeft aria-hidden="true" /> All types
            </Button>
            <Button onClick={openCreate} disabled={dependencyLoading}>
              <Plus aria-hidden="true" /> Add {config.label.toLowerCase()}
            </Button>
          </>
        }
      />
      {(requiresCategory || requiresBrand || requiresModel) && (
        <Card className="admin-master-filters">
          {requiresCategory && (
            <FormField
              label="Category"
              required
              error={form.formState.errors.categoryId?.message}
            >
              <Select
                value={String(categoryId)}
                onChange={(event) => {
                  const nextCategoryId = Number(event.target.value);
                  setCategoryId(nextCategoryId);
                  setBrandId(0);
                  setModelId(0);
                  form.setValue("categoryId", nextCategoryId);
                  form.setValue("brandId", 0);
                  form.setValue("modelId", 0);
                  form.clearErrors(["categoryId", "brandId", "modelId"]);
                }}
              >
                {!categoriesQuery.data?.length && (
                  <option value="1">Default category</option>
                )}
                {categoriesQuery.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {itemLabel(category)}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          {requiresBrand && (
            <FormField
              label="Brand"
              required
              error={form.formState.errors.brandId?.message}
            >
              <Select
                placeholder="Select brand"
                value={brandId || ""}
                onChange={(event) => {
                  const nextBrandId = Number(event.target.value);
                  setBrandId(nextBrandId);
                  setModelId(0);
                  form.setValue("brandId", nextBrandId);
                  form.setValue("modelId", 0);
                  form.clearErrors(["brandId", "modelId"]);
                }}
                disabled={!categoryId || brandsQuery.isPending}
              >
                {brandsQuery.data?.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {itemLabel(brand)}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          {requiresModel && (
            <FormField
              label="Model"
              required
              error={form.formState.errors.modelId?.message}
            >
              <Select
                placeholder="Select model"
                value={modelId || ""}
                onChange={(event) => {
                  const nextModelId = Number(event.target.value);
                  setModelId(nextModelId);
                  form.setValue("modelId", nextModelId);
                  form.clearErrors("modelId");
                }}
                disabled={!brandId || modelsQuery.isPending}
              >
                {modelsQuery.data?.map((model) => (
                  <option key={model.id} value={model.id}>
                    {itemLabel(model)}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </Card>
      )}
      {dependencyLoading || (listQuery.isPending && canLoad) ? (
        <LoadingState label={`Loading ${config.label.toLowerCase()}…`} />
      ) : dependencyError || listQuery.isError ? (
        <ErrorState
          message={displayError(
            dependencyError ?? listQuery.error,
            `Unable to load ${config.label.toLowerCase()}.`,
          )}
          onRetry={() => {
            void categoriesQuery.refetch();
            void brandsQuery.refetch();
            void modelsQuery.refetch();
            void listQuery.refetch();
          }}
        />
      ) : !canLoad ? (
        <Card className="admin-selection-prompt">
          <Tags aria-hidden="true" />
          <p>Select the required parent records to view this list.</p>
        </Card>
      ) : (
        <DataTable
          caption={config.label}
          columns={columns}
          rows={listQuery.data ?? []}
          rowKey={(item) => String(item.id)}
          emptyMessage={`No ${config.label.toLowerCase()} yet`}
        />
      )}
      <Modal
        open={editing !== undefined}
        title={`${editing ? "Edit" : "Add"} ${config.label
          .replace(/ies$/, "y")
          .replace(/s$/, "")}`}
        onClose={() => setEditing(undefined)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEditing(undefined)}
              disabled={saveItem.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="master-data-form"
              loading={saveItem.isPending}
            >
              Save
            </Button>
          </>
        }
      >
        <form
          id="master-data-form"
          className="admin-form"
          onSubmit={form.handleSubmit(submitItem)}
        >
          <FormField
            label="Code"
            required
            hint="Uppercase letters, numbers, and underscores only."
            error={form.formState.errors.code?.message}
          >
            <Input
              autoFocus
              {...form.register("code", {
                required: masterDataValidationMessage("code", "REQUIRED"),
                pattern: {
                  value: /^[A-Za-z0-9_]+$/,
                  message: masterDataValidationMessage("code", "INVALID_CHARS"),
                },
              })}
            />
          </FormField>
          <FormField
            label="Description"
            required
            error={form.formState.errors.description?.message}
          >
            <Input
              {...form.register("description", {
                required: masterDataValidationMessage(
                  "description",
                  "REQUIRED",
                ),
                validate: (value) =>
                  value.trim().length > 0 ||
                  masterDataValidationMessage("description", "REQUIRED"),
              })}
            />
          </FormField>
        </form>
      </Modal>
    </AdminGuard>
  );
};
