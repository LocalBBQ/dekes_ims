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
  if (isLoading) return <p className="text-neutral-400">Loading…</p>;
  if (!item) return <p className="text-neutral-400">Item not found.</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold break-words">{item.name}</h1>
          {item.updatedAt && (
            <p className="text-sm text-neutral-500 mt-0.5">
              Last updated: {new Date(item.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {hasPendingChanges && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full sm:w-auto px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-medium"
            >
              {saveMutation.isPending ? "Saving…" : "Save changes"}
            </button>
          )}
          {isAdmin && (
            <Link
              to={`/inventory/${id}/edit`}
              state={{ returnTo: `/inventory/${id}` }}
              className="w-full sm:w-auto px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-center"
            >
              Edit
            </Link>
          )}
          {isAdmin && item.reorderLink && (
            <a
              href={item.reorderLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-3 rounded-lg bg-neutral-700 hover:bg-neutral-600 font-medium text-center"
            >
              Purchase / Order
            </a>
          )}
          <Link
            to="/inventory"
            className="w-full sm:w-auto px-4 py-3 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-center"
          >
            Back to list
          </Link>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
              className="w-full sm:w-auto px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
                  className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-neutral-800 border border-neutral-700"
                >
                  <span className="font-medium text-neutral-200 min-w-0 sm:min-w-[100px] flex-shrink-0">{q.locationName}</span>
                  <span className="min-w-[2.5rem] text-lg font-semibold tabular-nums text-white">
                    {total}
                  </span>
                  <div className="flex items-stretch rounded-lg overflow-hidden border border-neutral-600 bg-neutral-700">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={total <= 0}
                      onClick={() => adjustQuantity(q.locationId, total, -1)}
                      className="px-3 py-2 bg-neutral-600 hover:bg-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-200 font-medium"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => adjustQuantity(q.locationId, total, 1)}
                      className="px-3 py-2 bg-neutral-600 hover:bg-neutral-500 text-neutral-200 font-medium"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {item.images && item.images.length > 0 && (
        <section className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-5 space-y-4">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Images</h2>
          <div className="flex flex-wrap gap-3">
            {item.images.map((img) => (
              <img
                key={img.id}
                src={api.images.url(item.id, img.id)}
                alt=""
                className="h-28 w-28 object-cover rounded-lg border border-neutral-600"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
