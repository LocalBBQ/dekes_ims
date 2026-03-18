import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  type ActionItemRecord,
  loadSavedActionList,
  saveActionListToStorage,
} from "../lib/actionItemsStorage";

function nextId() {
  return "action-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export default function ActionItems() {
  const [list, setList] = useState<ActionItemRecord[]>(loadSavedActionList);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [itemId, setItemId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.inventory.list(),
  });
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.locations.list(),
  });

  const addToList = () => {
    if (!itemId || !fromLocationId || !toLocationId || fromLocationId === toLocationId) return;
    const item = items?.find((i) => i.id === itemId);
    const fromLoc = locations?.find((l) => l.id === fromLocationId);
    const toLoc = locations?.find((l) => l.id === toLocationId);
    if (!item || !fromLoc || !toLoc) return;
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    setList((prev) => [
      ...prev,
      {
        id: nextId(),
        itemId: item.id,
        itemName: item.name,
        fromLocationId: fromLoc.id,
        fromLocationName: fromLoc.name,
        toLocationId: toLoc.id,
        toLocationName: toLoc.name,
        quantity: qty,
      },
    ]);
    setQuantity(1);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeFromList = (id: string) => {
    setList((prev) => prev.filter((a) => a.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const clearList = () => {
    setList([]);
    setSelectedIds(new Set());
    saveActionListToStorage([]);
  };

  const saveList = () => {
    saveActionListToStorage(list);
    setSaveFeedback(true);
  };

  const doneSelected = () => {
    if (selectedIds.size === 0) return;
    const nextList = list.filter((a) => !selectedIds.has(a.id));
    setList(nextList);
    setSelectedIds(new Set());
    saveActionListToStorage(nextList);
  };

  useEffect(() => {
    if (!saveFeedback) return;
    const t = setTimeout(() => setSaveFeedback(false), 2000);
    return () => clearTimeout(t);
  }, [saveFeedback]);

  const fromOptions = useMemo(() => {
    if (!itemId || !locations?.length) return locations ?? [];
    const item = items?.find((i) => i.id === itemId);
    if (!item) return locations;
    const withStock = item.quantities.filter((q) => (q.quantity ?? 0) > 0).map((q) => q.locationId);
    return locations.filter((l) => withStock.includes(l.id));
  }, [itemId, items, locations]);

  const isLoading = itemsLoading || locationsLoading;
  const canAdd =
    itemId && fromLocationId && toLocationId && fromLocationId !== toLocationId && quantity >= 1;
  const hasList = list.length > 0;
  const hasSelection = selectedIds.size > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Action items</h1>
        <p className="text-neutral-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Action items</h1>
      <p className="text-neutral-400 text-sm">
        Build a list of moves (item from location → to location). Select items and click Done to clear them from the list.
      </p>

      <section className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-5 space-y-4">
        <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Add move</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Item</label>
            <select
              value={itemId}
              onChange={(e) => {
                setItemId(e.target.value);
                setFromLocationId("");
                setToLocationId("");
              }}
              className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base sm:text-sm"
            >
              <option value="">Select item</option>
              {items?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">From location</label>
            <select
              value={fromLocationId}
              onChange={(e) => setFromLocationId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base sm:text-sm"
            >
              <option value="">Select location</option>
              {fromOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">To location</label>
            <select
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base sm:text-sm"
            >
              <option value="">Select location</option>
              {locations?.map((l) => (
                <option key={l.id} value={l.id} disabled={l.id === fromLocationId}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-base sm:text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={addToList}
          disabled={!canAdd}
          className="w-full sm:w-auto px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Add to list
        </button>
      </section>

      <section className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
            Move list ({list.length})
          </h2>
          {hasList && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={saveList}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-sm font-medium"
              >
                Save
              </button>
              {saveFeedback && (
                <span className="px-2 py-2 text-sm text-emerald-400">Saved</span>
              )}
              <button
                type="button"
                onClick={doneSelected}
                disabled={!hasSelection}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Done
              </button>
              <button
                type="button"
                onClick={clearList}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-sm"
              >
                Clear list
              </button>
            </div>
          )}
        </div>
        {list.length === 0 ? (
          <p className="text-neutral-500 text-sm py-4">No moves added. Use the form above to add items.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((a) => (
              <li
                key={a.id}
                className={`flex flex-wrap items-center gap-x-2 gap-y-2 p-3 rounded-lg border min-w-0 ${
                  selectedIds.has(a.id)
                    ? "bg-amber-900/20 border-amber-600/50"
                    : "bg-neutral-800 border-neutral-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(a.id)}
                  onChange={() => toggleSelected(a.id)}
                  className="rounded border-neutral-500 bg-neutral-800 text-amber-600 focus:ring-amber-500 shrink-0"
                  aria-label={`Select ${a.itemName}`}
                />
                <span className="font-medium text-neutral-200 min-w-0 truncate">{a.itemName}</span>
                <span className="text-neutral-500 shrink-0">× {a.quantity}</span>
                <span className="text-neutral-400 text-xs sm:text-sm w-full sm:w-auto min-w-0">
                  {a.fromLocationName} → {a.toLocationName}
                </span>
                <button
                  type="button"
                  onClick={() => removeFromList(a.id)}
                  className="ml-auto sm:ml-0 px-3 py-2 rounded-lg text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 text-sm"
                  aria-label="Remove"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
