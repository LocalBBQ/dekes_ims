import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

type QuantityAtLocationForm = { quantity: number; quantityInUse: number };

type ItemForm = {
  name: string;
  description: string;
  categoryId: string | null;
  lastOrderAt: string;
  reorderLink: string;
  quantities: Record<string, QuantityAtLocationForm>;
};

const emptyForm: ItemForm = {
  name: "",
  description: "",
  categoryId: null,
  lastOrderAt: "",
  reorderLink: "",
  quantities: {},
};

export default function InventoryItemPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const goBackAfterSave = () => {
    if (returnTo && returnTo !== "/inventory") navigate(returnTo);
    else navigate("/", { replace: true });
  };
  const queryClient = useQueryClient();
  const isNew = id === "new" || !id;

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.locations.list(),
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.categories.list(),
  });
  const { data: item, isLoading } = useQuery({
    queryKey: ["inventory", id],
    queryFn: () => api.inventory.get(id!),
    enabled: !isNew,
  });

  const [form, setForm] = useState<ItemForm>(emptyForm);

  useEffect(() => {
    if (isNew && locations?.length) {
      setForm((f) => ({
        ...f,
        quantities: Object.fromEntries(
          locations.map((loc) => [loc.id, { quantity: 0, quantityInUse: 0 }])
        ),
      }));
    }
  }, [isNew, locations]);

  useEffect(() => {
    if (!item) return;
    const quantities: Record<string, QuantityAtLocationForm> = Object.fromEntries(
      item.quantities.map((q) => [
        q.locationId,
        { quantity: (q.quantity ?? 0) + (q.quantityInUse ?? 0), quantityInUse: 0 },
      ])
    );
    const lastOrderAt = item.lastOrderAt ? item.lastOrderAt.slice(0, 10) : "";
    setForm({
      name: item.name ?? "",
      description: item.description ?? "",
      categoryId: item.categoryId ?? null,
      lastOrderAt,
      reorderLink: item.reorderLink ?? "",
      quantities,
    });
  }, [item?.id]);

  const createMutation = useMutation({
    mutationFn: (body: Parameters<typeof api.inventory.create>[0]) => api.inventory.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      goBackAfterSave();
    },
  });
  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof api.inventory.update>[1]) =>
      api.inventory.update(id!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", id] });
      goBackAfterSave();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.inventory.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      goBackAfterSave();
    },
  });
  const updateQuantityMutation = useMutation({
    mutationFn: ({
      locId,
      quantity,
      quantityInUse,
    }: {
      locId: string;
      quantity?: number;
      quantityInUse?: number;
    }) => api.inventory.updateQuantity(id!, locId, { quantity, quantityInUse }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", id] });
    },
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lastOrderAt = form.lastOrderAt.trim() ? form.lastOrderAt.trim() + "T12:00:00.000Z" : null;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      categoryId: form.categoryId || null,
      lastOrderAt: lastOrderAt ?? null,
      reorderLink: form.reorderLink.trim() || null,
      quantities: Object.fromEntries(
        Object.entries(form.quantities).map(([locId, v]) => [
          locId,
          { quantity: v.quantity, quantityInUse: v.quantityInUse },
        ])
      ),
    };
    if (isNew) createMutation.mutate(payload);
    else updateMutation.mutate(payload);
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const deleting = deleteMutation.isPending;
  const error = createMutation.error || updateMutation.error || deleteMutation.error
    || updateQuantityMutation.error;

  if (!isNew && isLoading) return <p className="text-neutral-400">Loading…</p>;
  if (!locations?.length) return <p className="text-neutral-400">No locations. Add one in Admin → Locations.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{isNew ? "New item" : "Edit item"}</h1>
          {!isNew && item?.updatedAt && (
            <p className="text-sm text-neutral-500 mt-0.5">
              Last updated: {new Date(item.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>
        {isAdmin && !isNew && item?.reorderLink && (
          <a
            href={item.reorderLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium"
          >
            Purchase / Order
          </a>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Name *</label>
          <input
            type="text"
            value={form.name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional description of the item…"
            rows={4}
            className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base sm:text-sm resize-y min-h-[6rem]"
          />
        </div>
        {categories && (
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Category</label>
            <select
              value={form.categoryId ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  categoryId: e.target.value ? e.target.value : null,
                }))
              }
              className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base sm:text-sm"
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Last order date</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={form.lastOrderAt ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, lastOrderAt: e.target.value }))}
              className="flex-1 min-w-0 px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base sm:text-sm"
            />
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  lastOrderAt: new Date().toISOString().slice(0, 10),
                }))
              }
              className="px-4 py-3 rounded-lg bg-neutral-700 hover:bg-neutral-600 whitespace-nowrap"
            >
              Today
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Reorder link</label>
            <input
              type="url"
              value={form.reorderLink ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, reorderLink: e.target.value }))}
              placeholder="https://…"
              className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base sm:text-sm"
            />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-2">Quantity by location</label>
          {isNew ? (
            <div className="space-y-3">
              {locations.map((loc) => {
                const val = form.quantities[loc.id] ?? { quantity: 0, quantityInUse: 0 };
                const displayQty = val.quantity + val.quantityInUse;
                return (
                  <div key={loc.id} className="flex flex-wrap items-center gap-2">
                    <span className="w-28 text-sm text-neutral-400">{loc.name}</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Quantity"
                      value={displayQty}
                      onChange={(e) => {
                        const n = Number(e.target.value) || 0;
                        setForm((f) => ({
                          ...f,
                          quantities: {
                            ...f.quantities,
                            [loc.id]: { quantity: n, quantityInUse: 0 },
                          },
                        }));
                      }}
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-xl bg-neutral-800 border border-neutral-700">
              {item && item.quantities.length > 0 && (
                <p className="text-sm text-neutral-500">
                  {item.quantities
                    .map((q) => `${q.locationName}: ${(q.quantity ?? 0) + (q.quantityInUse ?? 0)}`)
                    .join(" · ")}
                </p>
              )}
              <p className="text-sm text-neutral-500">Use the item view (open the item from the list) to receive to storage and move to shop.</p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error instanceof Error ? error.message : "Error"}</p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-medium"
          >
            {saving ? "Saving…" : isNew ? "Create" : "Save"}
          </button>
          {!isNew && (
            <>
              <button
                type="button"
                onClick={goBackAfterSave}
                className="w-full sm:w-auto px-4 py-3 rounded-lg bg-neutral-700 hover:bg-neutral-600"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete this item? This cannot be undone.")) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleting}
                className="w-full sm:w-auto px-4 py-3 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white"
              >
                {deleting ? "Deleting…" : "Delete item"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
