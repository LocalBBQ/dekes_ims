import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

const TYPES = ["text", "number", "date", "select", "image"] as const;

export default function AdminFields() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "text" as string,
    options: "",
    sortOrder: 0,
  });

  const { data: fields, isLoading } = useQuery({
    queryKey: ["fieldDefinitions"],
    queryFn: () => api.fieldDefinitions.list(),
  });

  const createMutation = useMutation({
    mutationFn: api.fieldDefinitions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fieldDefinitions"] });
      setForm({ name: "", type: "text", options: "", sortOrder: 0 });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof api.fieldDefinitions.update>[1] }) =>
      api.fieldDefinitions.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fieldDefinitions"] });
      setEditingId(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: api.fieldDefinitions.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fieldDefinitions"] }),
  });

  type FieldItem = { id: string; name: string; type: string; options: string[] | null; sortOrder: number };
  const startEdit = (f: FieldItem) => {
    setEditingId(f.id);
    setForm({
      name: f.name,
      type: f.type,
      options: Array.isArray(f.options) ? f.options.join(", ") : "",
      sortOrder: f.sortOrder,
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const options = form.options.trim()
      ? form.options.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    createMutation.mutate({
      name: form.name.trim(),
      type: form.type as "text" | "number" | "date" | "select" | "image",
      options: form.type === "select" ? options ?? [] : null,
      sortOrder: form.sortOrder,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const options = form.options.trim()
      ? form.options.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    updateMutation.mutate({
      id: editingId,
      body: {
        name: form.name.trim(),
        type: form.type as "text" | "number" | "date" | "select" | "image",
        options: form.type === "select" ? options : undefined,
        sortOrder: form.sortOrder,
      },
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Field definitions</h1>
      <p className="text-neutral-400 text-sm">
        Custom fields for inventory items. Staff will see these when adding or editing items.
      </p>

      <form onSubmit={handleCreate} className="p-4 rounded-xl bg-neutral-800 border border-neutral-700 space-y-3 max-w-md">
        <h2 className="font-medium">Add field</h2>
        <input
          type="text"
          placeholder="Field name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          className="w-full px-4 py-3 rounded-lg bg-neutral-700 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          className="w-full px-4 py-3 rounded-lg bg-neutral-700 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {form.type === "select" && (
          <input
            type="text"
            placeholder="Options (comma-separated)"
            value={form.options}
            onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg bg-neutral-700 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        )}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Sort order</label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            className="w-full px-4 py-3 rounded-lg bg-neutral-700 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
        >
          Add field
        </button>
      </form>

      {isLoading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {fields?.map((f: FieldItem) => (
            <li
              key={f.id}
              className="p-4 rounded-xl bg-neutral-800 border border-neutral-700 flex flex-wrap items-center justify-between gap-2"
            >
              {editingId === f.id ? (
                <form onSubmit={handleUpdate} className="flex flex-wrap items-end gap-2 flex-1">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))}
                    className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-neutral-700 border border-neutral-600"
                  />
                  <select
                    value={form.type}
                    onChange={(e) => setForm((x) => ({ ...x, type: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-neutral-700 border border-neutral-600"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {form.type === "select" && (
                    <input
                      type="text"
                      placeholder="Options (comma)"
                      value={form.options}
                      onChange={(e) => setForm((x) => ({ ...x, options: e.target.value }))}
                      className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-neutral-700 border border-neutral-600"
                    />
                  )}
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((x) => ({ ...x, sortOrder: Number(e.target.value) }))}
                    className="w-16 px-3 py-2 rounded-lg bg-neutral-700 border border-neutral-600"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-3 py-2 rounded-lg bg-neutral-600 hover:bg-neutral-500"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500">
                    Save
                  </button>
                </form>
              ) : (
                <>
                  <div>
                    <span className="font-medium">{f.name}</span>
                    <span className="text-neutral-400 text-sm ml-2">{f.type}</span>
                    {f.options?.length ? (
                      <span className="text-neutral-500 text-sm ml-2">
                        ({f.options.join(", ")})
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(f)}
                      className="px-3 py-2 rounded-lg bg-neutral-600 hover:bg-neutral-500 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(f.id)}
                      disabled={deleteMutation.isPending}
                      className="px-3 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-sm disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
