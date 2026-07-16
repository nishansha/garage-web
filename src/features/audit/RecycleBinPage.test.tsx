import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { auditApi } from "../../services/audit";
import { RecycleBinPage } from "./RecycleBinPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RecycleBinPage />
    </QueryClientProvider>,
  );
};

describe("RecycleBinPage", () => {
  it("lists deleted records and opens their history", async () => {
    vi.spyOn(auditApi, "deleted").mockResolvedValue([
      {
        id: 53,
        revision: 9,
        deletedBy: 1,
        deletedByName: "Salman",
        deletedAt: "2026-07-15T03:51:40",
        entity: { invoiceNo: "INV-53", amount: 15 },
      },
    ]);
    vi.spyOn(auditApi, "history").mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("INV-53")).toBeInTheDocument();
    expect(screen.getByText("Salman")).toBeInTheDocument();
    expect(screen.getByText("15 Jul 2026, 03:51")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View history" }));
    expect(
      await screen.findByRole("dialog", { name: /Sale History · INV-53/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText("No history")).toBeInTheDocument();
  });

  it("refetches and shows the selected entity's empty state", async () => {
    vi.spyOn(auditApi, "deleted").mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByText("No deleted sale records."),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Record type" }), {
      target: { value: "expense" },
    });
    expect(
      await screen.findByText("No deleted expense records."),
    ).toBeInTheDocument();
    expect(auditApi.deleted).toHaveBeenLastCalledWith("expense");
  });
});
