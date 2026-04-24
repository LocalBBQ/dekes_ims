import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task, TaskBoardBody, TaskColumn } from "@shop-inventory/shared";
import ConfirmDialog from "./ConfirmDialog";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const COLUMNS: TaskColumn[] = ["todo", "need_purchase", "need_fix"];

const COLUMN_LABELS: Record<TaskColumn, string> = {
  todo: "To do",
  need_purchase: "Need to purchase",
  need_fix: "Need to fix",
};

function tasksToBoard(tasks: Task[]): TaskBoardBody {
  const board: TaskBoardBody = { todo: [], need_purchase: [], need_fix: [] };
  for (const col of COLUMNS) {
    board[col] = tasks
      .filter((t) => t.column === col)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => t.id);
  }
  return board;
}

/** Remove `taskId` from all columns, then append it to `column` (end of list). */
function moveTaskToColumn(tasks: Task[], taskId: string, column: TaskColumn): TaskBoardBody {
  const board = tasksToBoard(tasks);
  for (const col of COLUMNS) {
    board[col] = board[col].filter((id) => id !== taskId);
  }
  board[column].push(taskId);
  return board;
}

function canManageTasks(role: string | undefined): boolean {
  const r = (role ?? "").trim().toLowerCase();
  return r === "admin" || r === "manager";
}

export type ShopTasksBoardVariant = "page" | "embedded";

type ShopTasksBoardProps = {
  variant?: ShopTasksBoardVariant;
};

export default function ShopTasksBoard({ variant = "page" }: ShopTasksBoardProps) {
  const { user } = useAuth();
  const canManage = canManageTasks(user?.role);
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState<Record<TaskColumn, string>>({
    todo: "",
    need_purchase: "",
    need_fix: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.tasks.list(),
  });

  const putBoardMutation = useMutation({
    mutationFn: (body: TaskBoardBody) => api.tasks.putBoard(body),
    onSuccess: (data) => {
      queryClient.setQueryData(["tasks"], data);
    },
  });

  const createMutation = useMutation({
    mutationFn: ({ title, column }: { title: string; column: TaskColumn }) =>
      api.tasks.create({ title, column }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setNewTitle((prev) => ({ ...prev, [vars.column]: "" }));
    },
    onError: (err) => {
      console.error("Create task failed:", err);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.tasks.update(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDeleteTaskId(null);
    },
  });

  const byColumn = useMemo(() => {
    const m = new Map<TaskColumn, Task[]>();
    for (const col of COLUMNS) {
      m.set(
        col,
        tasks
          .filter((t) => t.column === col)
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
    }
    return m;
  }, [tasks]);

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const t = editTitle.trim();
    if (!t) return;
    updateMutation.mutate({ id: editingId, title: t });
  };

  const handleColumnChange = (task: Task, nextColumn: TaskColumn) => {
    if (!canManage || nextColumn === task.column) return;
    putBoardMutation.mutate(moveTaskToColumn(tasks, task.id, nextColumn));
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`rounded-xl bg-neutral-800 border border-neutral-700 animate-pulse ${
              variant === "embedded" ? "min-h-[200px]" : "min-h-[240px]"
            }`}
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 rounded-xl bg-neutral-800 border border-red-900/50 text-red-200">
        <p className="font-medium">Failed to load tasks</p>
        <p className="text-sm text-neutral-400 mt-1">
          {error instanceof Error ? error.message : "Something went wrong"}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3 md:items-start">
        {COLUMNS.map((column) => {
          const columnTasks = byColumn.get(column) ?? [];
          return (
            <section
              key={column}
              className={`flex flex-col rounded-xl bg-neutral-800 border border-neutral-700 ${
                variant === "embedded" ? "min-h-[240px]" : "min-h-[280px]"
              }`}
            >
              <h2 className="p-3 border-b border-neutral-700 text-sm font-medium text-neutral-300">
                {COLUMN_LABELS[column]}
              </h2>

              <div className="flex flex-col flex-1 p-2 gap-2 min-h-0">
                {canManage && (
                  <form
                    className="shrink-0 border-b border-neutral-700/80 pb-3 mb-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const title = newTitle[column].trim();
                      if (!title) return;
                      createMutation.mutate({ title, column });
                    }}
                  >
                    <label className="sr-only">New task in {COLUMN_LABELS[column]}</label>
                    <div className="flex gap-2">
                      <input
                        value={newTitle[column]}
                        onChange={(e) =>
                          setNewTitle((prev) => ({ ...prev, [column]: e.target.value }))
                        }
                        placeholder="Add a task…"
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-neutral-700 border border-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={createMutation.isPending || !newTitle[column].trim()}
                        className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-medium disabled:opacity-50 shrink-0"
                      >
                        {createMutation.isPending ? "…" : "Add"}
                      </button>
                    </div>
                  </form>
                )}

                {columnTasks.length === 0 && !canManage && (
                  <p className="text-neutral-500 text-sm px-2 py-6 text-center">No tasks yet</p>
                )}
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg bg-neutral-700/80 border border-neutral-600 p-3 text-sm"
                  >
                    {canManage && (
                      <label className="block mb-2">
                        <span className="sr-only">Column</span>
                        <select
                          value={task.column}
                          onChange={(e) =>
                            handleColumnChange(task, e.target.value as TaskColumn)
                          }
                          disabled={putBoardMutation.isPending}
                          className="w-full px-2 py-1.5 rounded-lg bg-neutral-800 border border-neutral-600 text-xs text-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c} value={c}>
                              {COLUMN_LABELS[c]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {editingId === task.id && canManage ? (
                      <div className="space-y-2">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-2 py-1.5 rounded bg-neutral-800 border border-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded bg-neutral-600 hover:bg-neutral-500"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 font-medium"
                            onClick={saveEdit}
                            disabled={updateMutation.isPending}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-between items-start">
                        <p className="text-neutral-100 flex-1 min-w-0 break-words">{task.title}</p>
                        {canManage && (
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              className="text-xs text-amber-500 hover:text-amber-400 px-1"
                              onClick={() => startEdit(task)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-xs text-red-400 hover:text-red-300 px-1"
                              onClick={() => setDeleteTaskId(task.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {createMutation.isError && (
        <p className="text-sm text-red-400 mt-4" role="alert">
          {createMutation.error instanceof Error
            ? createMutation.error.message
            : "Could not add task"}
        </p>
      )}

      {putBoardMutation.isError && (
        <p className="text-sm text-red-400 mt-4">
          {putBoardMutation.error instanceof Error
            ? putBoardMutation.error.message
            : "Could not update board"}
        </p>
      )}

      <ConfirmDialog
        open={deleteTaskId != null}
        title="Remove task?"
        description="This task will be removed from the board."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTaskId(null)}
        onConfirm={() => {
          if (deleteTaskId) deleteMutation.mutate(deleteTaskId);
        }}
      />
    </>
  );
}
