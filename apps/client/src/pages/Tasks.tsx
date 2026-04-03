import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task, TaskBoardBody, TaskColumn } from "@shop-inventory/shared";
import ConfirmDialog from "../components/ConfirmDialog";
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

/** Remove `draggedId` from all columns, then insert it into `column` before `beforeId`, or at end if `beforeId` is null. */
function placeTask(
  tasks: Task[],
  draggedId: string,
  column: TaskColumn,
  beforeId: string | null
): TaskBoardBody {
  const board = tasksToBoard(tasks);
  for (const col of COLUMNS) {
    board[col] = board[col].filter((id) => id !== draggedId);
  }
  const col = board[column];
  if (beforeId == null) {
    col.push(draggedId);
  } else {
    const idx = col.indexOf(beforeId);
    if (idx === -1) col.push(draggedId);
    else col.splice(idx, 0, draggedId);
  }
  return board;
}

export default function Tasks() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";
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
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => api.tasks.update(id, { title }),
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

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (!canManage) return;
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!canManage) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropAppend = (e: React.DragEvent, column: TaskColumn) => {
    if (!canManage) return;
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId) return;
    putBoardMutation.mutate(placeTask(tasks, draggedId, column, null));
  };

  const handleDropBeforeCard = (e: React.DragEvent, column: TaskColumn, beforeId: string) => {
    if (!canManage) return;
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === beforeId) return;
    putBoardMutation.mutate(placeTask(tasks, draggedId, column, beforeId));
  };

  const handleDropOnEmptyColumn = (e: React.DragEvent, column: TaskColumn) => {
    if (!canManage) return;
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId) return;
    putBoardMutation.mutate(placeTask(tasks, draggedId, column, null));
  };

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Shop tasks</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="min-h-[240px] rounded-xl bg-neutral-800 border border-neutral-700 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Shop tasks</h1>
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
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Shop tasks</h1>
        <p className="text-neutral-400 text-sm mt-1">
          {canManage
            ? "Drag cards between columns or reorder within a column. Staff accounts can view this board only."
            : "You can view this list. Only managers and admins can add or change tasks."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 md:items-start">
        {COLUMNS.map((column) => {
          const columnTasks = byColumn.get(column) ?? [];
          return (
            <section
              key={column}
              className="flex flex-col rounded-xl bg-neutral-800 border border-neutral-700 min-h-[280px]"
              onDragOver={columnTasks.length === 0 ? handleDragOver : undefined}
              onDrop={columnTasks.length === 0 ? (e) => handleDropOnEmptyColumn(e, column) : undefined}
            >
              <h2 className="p-3 border-b border-neutral-700 text-sm font-medium text-neutral-300">
                {COLUMN_LABELS[column]}
              </h2>

              <div className="flex flex-col flex-1 p-2 gap-2">
                {columnTasks.length === 0 && !canManage && (
                  <p className="text-neutral-500 text-sm px-2 py-6 text-center">No tasks yet</p>
                )}
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropBeforeCard(e, column, task.id)}
                  >
                    <div
                      draggable={canManage}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={`rounded-lg bg-neutral-700/80 border border-neutral-600 p-3 text-sm ${
                        canManage ? "cursor-grab active:cursor-grabbing" : ""
                      }`}
                    >
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
                  </div>
                ))}

                {canManage && (
                  <div
                    className="min-h-10 flex-1 rounded-lg border border-dashed border-neutral-600/80 flex items-center justify-center text-neutral-500 text-xs px-2 text-center"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropAppend(e, column)}
                  >
                    Drop here to add to end
                  </div>
                )}

                {canManage && (
                  <form
                    className="pt-1 border-t border-neutral-700/80 mt-auto"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const title = newTitle[column].trim();
                      if (!title) return;
                      createMutation.mutate({ title, column });
                    }}
                  >
                    <label className="sr-only">New task in {COLUMN_LABELS[column]}</label>
                    <div className="flex gap-2 mt-2">
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
                        Add
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {putBoardMutation.isError && (
        <p className="text-sm text-red-400">
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
    </div>
  );
}
