import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export default function AdminLocations() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: locations, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.locations.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.locations.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setEditingId(null);
    },
  });

  const startEdit = (loc: { id: string; name: string }) => {
    setEditingId(loc.id);
    setEditName(loc.name);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Locations</h1>
      <p className="text-neutral-400 text-sm">
        Edit location names (e.g. Shop, Storage unit). These are seeded on first run.
      </p>
      {isLoading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : (
        <ul className="space-y-2 max-w-md">
          {locations?.map((loc) => (
            <li
              key={loc.id}
              className="p-4 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-between gap-2"
            >
              {editingId === loc.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg bg-neutral-700 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => updateMutation.mutate({ id: loc.id, name: editName.trim() })}
                    disabled={!editName.trim() || updateMutation.isPending}
                    className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-3 py-2 rounded-lg bg-neutral-600 hover:bg-neutral-500"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="font-medium">{loc.name}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(loc)}
                    className="px-3 py-2 rounded-lg bg-neutral-600 hover:bg-neutral-500 text-sm"
                  >
                    Edit
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
