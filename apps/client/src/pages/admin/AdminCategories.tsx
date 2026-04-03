import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ConfirmDialog from "../../components/ConfirmDialog";
import { api } from "../../lib/api";

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.categories.list(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.categories.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewName("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.categories.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.categories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteTarget(null);
    },
  });

  const startEdit = (cat: { id: string; name: string }) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Categories</h1>
      <p className="text-neutral-400 text-sm">
        Manage categories for inventory items (e.g. Beverages, Food, Supplies).
      </p>
      <div className="flex flex-col gap-2 max-w-md">
        <label htmlFor="new-category-name" className="text-sm text-neutral-400">
          New category
        </label>
        <div className="flex flex-wrap items-end gap-2">
        <input
          id="new-category-name"
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Beverages"
          className="flex-1 min-w-[180px] px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="button"
          onClick={() => {
            const name = newName.trim();
            if (name) createMutation.mutate(name);
          }}
          disabled={!newName.trim() || createMutation.isPending}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
        >
          Add
        </button>
        </div>
      </div>
      {isLoading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : (
        <ul className="space-y-2 max-w-md">
          {categories?.map((cat) => (
            <li
              key={cat.id}
              className="p-4 rounded-xl bg-neutral-800 border border-neutral-700 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              {editingId === cat.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full sm:flex-1 min-w-0 px-4 py-2 rounded-lg bg-neutral-700 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex shrink-0 justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-2 rounded-lg bg-neutral-600 hover:bg-neutral-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => updateMutation.mutate({ id: cat.id, name: editName.trim() })}
                      disabled={!editName.trim() || updateMutation.isPending}
                      className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="font-medium">{cat.name}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="px-3 py-2 rounded-lg bg-neutral-600 hover:bg-neutral-500 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}
                      disabled={deleteMutation.isPending}
                      className="px-3 py-2 rounded-lg bg-red-800/60 hover:bg-red-700/60 text-sm disabled:opacity-50"
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

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete category?"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}" from categories? Items may lose this category label. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete category"
        cancelLabel="Cancel"
        destructive
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
