import ShopTasksBoard from "../components/ShopTasksBoard";
import { useAuth } from "../contexts/AuthContext";

function canManageTasks(role: string | undefined): boolean {
  const r = (role ?? "").trim().toLowerCase();
  return r === "admin" || r === "manager";
}

export default function Tasks() {
  const { user } = useAuth();
  const canManage = canManageTasks(user?.role);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Shop tasks</h1>
        <p className="text-neutral-400 text-sm mt-1">
          {canManage
            ? "Use the column menu on each card to move a task. Staff accounts can view this board only."
            : "You can view this list. Only managers and admins can add or change tasks."}
        </p>
      </div>

      <ShopTasksBoard variant="page" />
    </div>
  );
}
