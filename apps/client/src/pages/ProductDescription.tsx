import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return "—";
  }
}

function getServerTotal(
  item: { quantities: { locationId: string; quantity?: number | null; quantityInUse?: number | null }[] } | undefined,
  locationId: string
): number {
  const q = item?.quantities.find((x) => x.locationId === locationId);
  return (q?.quantity ?? 0) + (q?.quantityInUse ?? 0);
}

export default function ProductDescription() {
  const { user } = useAuth();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  const { data: item, isLoading } = useQuery({
    queryKey: ["inventory", id],
    queryFn: () => api.inventory.get(id!),
    enabled: !!id,
  });
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.locations.list(),
  });

  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (item?.quantities) {
      setLocalQuantities(
        Object.fromEntries(
          item.quantities.map((q) => [
            q.locationId,
            (q.quantity ?? 0) + (q.quantityInUse ?? 0),
          ])
        )
      );
    }
  }, [item?.id]);

  const storageLocation = locations?.find(
    (l) => l.name === "Storage unit" || l.name.toLowerCase().includes("storage")
  );
  const shopLocation = locations?.find(
    (l) => l.name === "Shop" || l.name.toLowerCase().includes("shop")
  );
  const storageLocationId = storageLocation?.id ?? "";
  const shopLocationId = shopLocation?.id ?? "";

  const getLocal = (locId: string) => localQuantities[locId] ?? getServerTotal(item, locId);
  const storageQty = getLocal(storageLocationId);

  const allLocationIds = new Set([
    ...(item?.quantities.map((q) => q.locationId) ?? []),
    ...Object.keys(localQuantities),
  ]);
  const hasPendingChanges =
    item != null &&
    [...allLocationIds].some((locId) => getLocal(locId) !== getServerTotal(item, locId));

  const saveMutation = useMutation({
    mutationFn: async (updates: { locId: string; quantity: number }[]) => {
      for (const u of updates) {
        await api.inventory.updateQuantity(id!, u.locId, {
          quantity: u.quantity,
          quantityInUse: 0,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", id] });
    },
  });

  const handleSave = () => {
    if (!item || !id) return;
    const allLocIds = new Set([
      ...item.quantities.map((q) => q.locationId),
      ...Object.keys(localQuantities),
    ]);
    const updates = [...allLocIds]
      .filter((locId) => getLocal(locId) !== getServerTotal(item, locId))
      .map((locId) => ({ locId, quantity: getLocal(locId) }));
    if (updates.length === 0) return;
    saveMutation.mutate(updates);
  };

  const handleReceiveToStorage = () => {
    if (!storageLocationId) return;
    setLocalQuantities((prev) => ({
      ...prev,
      [storageLocationId]: (prev[storageLocationId] ?? getServerTotal(item, storageLocationId)) + 1,
    }));
  };
  const handleMoveToShop = () => {
    if (!storageLocationId || !shopLocationId || storageQty < 1) return;
    setLocalQuantities((prev) => ({
      ...prev,
      [storageLocationId]: storageQty - 1,
      [shopLocationId]: (prev[shopLocationId] ?? getServerTotal(item, shopLocationId)) + 1,
    }));
  };

  const adjustQuantity = (locationId: string, currentTotal: number, direction: 1 | -1) => {
    const next = Math.max(0, currentTotal + direction);
    setLocalQuantities((prev) => ({ ...prev, [locationId]: next }));
  };

  if (!id) return <p className="text-neutral-400">No item selected.</p>;
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl animate-pulse">
        <div className="h-8 w-2/3 max-w-md bg-neutral-800 rounded-lg" />
        <div className="h-4 w-40 bg-neutral-800 rounded" />
        <div className="h-40 rounded-xl bg-neutral-800 border border-neutral-700" />
        <div className="h-32 rounded-xl bg-neutral-800 border border-neutral-700" />
      </div>
    );
  }
  if (!item) return <p className="text-neutral-400">Item not found.</p>;

  const editLinkClass = hasPendingChanges
    ? "w-full sm:w-auto px-4 py-3 rounded-lg border border-neutral-500 text-neutral-200 hover:bg-neutral-700 font-medium text-center"
    : "w-full sm:w-auto px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-center";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold break-words">{item.name}</h1>
          {item.updatedAt && (
            <p className="text-sm text-neutral-500 mt-0.5">
              Last updated: {new Date(item.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:max-w-xl">
          <div className="page-toolbar">
            <Link
              to="/inventory"
              className="form-actions-secondary px-4 py-3 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-center"
            >
              Back to list
            </Link>
            <div className="page-toolbar-end flex-1 sm:flex-initial min-w-0">
              {isAdmin && item.reorderLink && (
                <a
                  href={item.reorderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="form-actions-secondary px-4 py-3 rounded-lg border border-neutral-600 bg-neutral-800 hover:bg-neutral-700 font-medium text-center text-neutral-200"
                >
                  Purchase / Order
                </a>
              )}
              {isAdmin && (
                <Link
                  to={`/inventory/${id}/edit`}
                  state={{ returnTo: `/inventory/${id}` }}
                  className={editLinkClass}
                >
                  Edit item
                </Link>
              )}
            </div>
          </div>
          {hasPendingChanges && (
            <div className="flex w-full sm:w-auto sm:justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="form-actions-primary px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-medium"
              >
                {saveMutation.isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-5 space-y-4">
        <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Details</h2>
        {item.description && (
          <p className="text-neutral-200 whitespace-pre-wrap">{item.description}</p>
        )}
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">Category</dt>
            <dd className="text-neutral-200">{item.category?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Last order</dt>
            <dd className="text-neutral-200 tabular-nums">{formatDate(item.lastOrderAt)}</dd>
          </div>
        </dl>
      </section>

      {storageLocationId && shopLocationId && (
        <section className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-5 space-y-4">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Quick actions</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start sm:gap-3">
            <button
              type="button"
              onClick={handleReceiveToStorage}
              className="w-full sm:w-auto px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium"
            >
              + Receive to storage
            </button>
            <button
              type="button"
              onClick={handleMoveToShop}
              disabled={storageQty < 1}
              className="w-full sm:w-auto px-4 py-3 rounded-lg border border-amber-500/60 text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Move 1 to shop
            </button>
          </div>
          {storageQty < 1 && (
            <p className="text-sm text-neutral-500">No stock in storage. Receive inventory first, then move to shop.</p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-5 space-y-4">
        <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Quantity by location</h2>
        {item.quantities.length === 0 ? (
          <p className="text-neutral-500 text-sm">No locations. Edit the item to add quantities.</p>
        ) : (
          <div className="space-y-4">
            {item.quantities.map((q) => {
              const total = getLocal(q.locationId);
              return (
                <div
                  key={q.locationId}
                  className="flex flex-col gap-3 rounded-xl border border-neutral-700 bg-neutral-800 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <span className="font-medium text-neutral-200 text-base shrink-0">{q.locationName}</span>
                  <div
                    className="flex w-full touch-manipulation items-stretch overflow-hidden rounded-xl border border-neutral-600 bg-neutral-900/50 shadow-inner sm:w-auto sm:min-w-[min(100%,14rem)]"
                    role="group"
                    aria-label={`Adjust quantity for ${q.locationName}`}
                  >
                    <button
                      type="button"
                      disabled={total <= 0}
                      onClick={() => adjustQuantity(q.locationId, total, -1)}
                      aria-label={`Decrease quantity at ${q.locationName}`}
                      className="flex min-h-[52px] min-w-[52px] shrink-0 items-center justify-center bg-neutral-700 text-2xl font-semibold leading-none text-neutral-100 transition hover:bg-neutral-600 active:bg-neutral-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:active:scale-100 sm:min-h-[48px] sm:min-w-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-inset"
                    >
                      <span aria-hidden>−</span>
                    </button>
                    <div
                      className="flex min-h-[52px] min-w-0 flex-1 select-none items-center justify-center border-x border-neutral-600 px-2 text-center text-2xl font-semibold tabular-nums text-white sm:min-h-[48px] sm:min-w-[4.5rem] sm:flex-none sm:px-4"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {total}
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustQuantity(q.locationId, total, 1)}
                      aria-label={`Increase quantity at ${q.locationName}`}
                      className="flex min-h-[52px] min-w-[52px] shrink-0 items-center justify-center bg-neutral-700 text-2xl font-semibold leading-none text-neutral-100 transition hover:bg-neutral-600 active:bg-neutral-500 active:scale-[0.98] sm:min-h-[48px] sm:min-w-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-inset"
                    >
                      <span aria-hidden>+</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
