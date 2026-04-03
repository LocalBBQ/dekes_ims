import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ConfirmDialog from "../../components/ConfirmDialog";
import { api } from "../../lib/api";

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"admin" | "manager" | "staff">("staff");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.users.list(),
  });

  const createMutation = useMutation({
    mutationFn: (body: { email: string; password: string; role: "admin" | "manager" | "staff" }) =>
      api.users.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEmail("");
      setPassword("");
      setRole("staff");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteUserId(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return;
    }
    createMutation.mutate({ email: email.trim(), password, role });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>
      <p className="text-neutral-400 text-sm">
        Create staff, manager, or admin accounts. Staff can view and update inventory and read the shop
        task board. Managers can edit that task board. Admins can also manage fields, locations, and
        users.
      </p>

      <form
        onSubmit={handleSubmit}
        className="p-4 rounded-xl bg-neutral-800 border border-neutral-700 space-y-3 max-w-md"
      >
        <h2 className="font-medium">Add user</h2>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="staff@example.com"
            className="w-full px-4 py-3 rounded-lg bg-neutral-700 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Password (min 6 characters)</label>
          <div className="flex gap-2">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="flex-1 px-4 py-3 rounded-lg bg-neutral-700 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="px-3 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-sm"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Confirm password</label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Repeat password"
            className="w-full px-4 py-3 rounded-lg bg-neutral-700 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>
          )}
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "manager" | "staff")}
            className="w-full px-4 py-3 rounded-lg bg-neutral-700 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {createMutation.error && (
          <p className="text-red-400 text-sm">
            {createMutation.error instanceof Error ? createMutation.error.message : "Failed to create user"}
          </p>
        )}
        <div className="mt-4 border-t border-neutral-700/80 pt-4 flex flex-col sm:flex-row sm:justify-end">
          <button
            type="submit"
            disabled={createMutation.isPending || !password || password !== confirmPassword}
            className="form-actions-primary px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating…" : "Add user"}
          </button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : (
        <div>
          <h2 className="font-medium mb-2">Existing users</h2>
          <ul className="space-y-2 max-w-md">
            {users?.map((u) => (
              <li
                key={u.id}
                className="p-4 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-between gap-2"
              >
                <div>
                  <span className="font-medium break-all">{u.email}</span>
                  <span className="text-neutral-400 text-sm ml-2">({u.role})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteUserId(u.id)}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-sm text-white disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={deleteUserId != null}
        title="Delete user?"
        description="This account will be removed. The person will no longer be able to sign in."
        confirmLabel="Delete user"
        cancelLabel="Cancel"
        destructive
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteUserId(null)}
        onConfirm={() => {
          if (deleteUserId) deleteMutation.mutate(deleteUserId);
        }}
      />
    </div>
  );
}
