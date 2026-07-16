import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { auditApi, type AuditRevision } from "../../services/audit";
import { AuditHistory } from "./AuditHistory";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderHistory = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuditHistory entityType="expense" entityId={53} />
    </QueryClientProvider>,
  );
};

const revisions: AuditRevision[] = [
  {
    revision: 1,
    changeType: "ADD",
    userId: 1,
    username: "Salman",
    revisionAt: "2026-07-15T03:00:00",
    entity: { id: 53, amount: 10 },
    changedFields: null,
  },
  {
    revision: 2,
    changeType: "MOD",
    userId: 1,
    username: "Salman",
    revisionAt: "2026-07-15T03:30:00",
    entity: { id: 53, amount: 15 },
    changedFields: { amount: { oldValue: 10, newValue: 15 } },
  },
  {
    revision: 3,
    changeType: "DEL",
    userId: null,
    username: null,
    revisionAt: "2026-07-15T04:00:00",
    entity: { id: 53, amount: 15 },
    changedFields: {},
  },
];

describe("AuditHistory", () => {
  it("renders newest-first with server-provided changes and deletion text", async () => {
    vi.spyOn(auditApi, "history").mockResolvedValue(revisions);
    renderHistory();

    expect(await screen.findByText("Deleted")).toBeInTheDocument();
    const entries = screen.getAllByRole("listitem");
    expect(entries[0]).toHaveTextContent("Revision 3");
    expect(entries[1]).toHaveTextContent("Revision 2");
    expect(entries[2]).toHaveTextContent("Revision 1");
    expect(entries[0]).toHaveTextContent("Unknown user");
    expect(entries[0]).toHaveTextContent("Deleted — no field changes.");
    expect(entries[1]).toHaveTextContent("Amount");
    expect(entries[1]).toHaveTextContent("10");
    expect(entries[1]).toHaveTextContent("15");
  });

  it("loads a full snapshot only when expanded", async () => {
    vi.spyOn(auditApi, "history").mockResolvedValue([revisions[1]]);
    const snapshot = vi
      .spyOn(auditApi, "snapshot")
      .mockResolvedValue({ id: 53, amount: 15, version: 4 });
    renderHistory();

    const summary = await screen.findByText("View full state at this point");
    expect(snapshot).not.toHaveBeenCalled();
    fireEvent.click(summary);
    expect(await screen.findByText("Record ID")).toBeInTheDocument();
    expect(screen.getAllByText("₹15.00")).toHaveLength(2);
    expect(screen.queryByText("Version")).not.toBeInTheDocument();
  });

  it("handles an empty history", async () => {
    vi.spyOn(auditApi, "history").mockResolvedValue([]);
    renderHistory();
    expect(await screen.findByText("No history")).toBeInTheDocument();
  });
});
