import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ShopTasksBoard from "../components/ShopTasksBoard";
import { api } from "../lib/api";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return "—";
  }
}

export default function Dashboard() {
  const location = useLocation();
  const linkState = { returnTo: location.pathname || "/" };

  const {
    data: items,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.inventory.list(),
  });

  // Category breakdown from items (include uncategorized)
  const categoryCounts = items
    ? Array.from(
        items.reduce(
          (acc, item) => {
            const key = item.categoryId ?? "__none__";
            acc.set(key, (acc.get(key) ?? 0) + 1);
            return acc;
          },
          new Map<string, number>()
        )
      ).map(([id, count]) => ({
        id,
        name: id === "__none__" ? "Uncategorized" : items.find((i) => i.categoryId === id)?.category?.name ?? "Unknown",
        count,
      }))
    : [];

  const recentlyUpdated = items
    ? [...items]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 8)
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <section className="rounded-xl bg-neutral-800 border border-neutral-700 overflow-hidden">
          <div className="p-4 border-b border-neutral-700">
            <h2 className="text-sm font-medium text-neutral-400">Shop tasks</h2>
          </div>
          <div className="p-4">
            <ShopTasksBoard variant="embedded" />
          </div>
        </section>
        <div className="h-32 rounded-xl bg-neutral-800 border border-neutral-700 animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="p-6 rounded-xl bg-neutral-800 border border-red-900/50 text-red-200">
          <p className="font-medium">Failed to load dashboard</p>
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
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <section className="rounded-xl bg-neutral-800 border border-neutral-700 overflow-hidden">
        <div className="p-4 border-b border-neutral-700 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-medium text-neutral-400">Shop tasks</h2>
          <Link
            to="/tasks"
            state={linkState}
            className="text-sm font-medium text-amber-500 hover:text-amber-400 whitespace-nowrap"
          >
            Open full page
          </Link>
        </div>
        <div className="p-4">
          <ShopTasksBoard variant="embedded" />
        </div>
      </section>

      {/* Category breakdown */}
      {categoryCounts.length > 0 && (
        <section className="rounded-xl bg-neutral-800 border border-neutral-700 overflow-hidden">
          <h2 className="p-4 border-b border-neutral-700 text-sm font-medium text-neutral-400">
            By category
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody className="divide-y divide-neutral-700/80">
                {categoryCounts.map(({ id, name, count }) => (
                  <tr key={id}>
                    <td className="p-3">
                      {id === "__none__" ? (
                        <span className="text-neutral-500">{name}</span>
                      ) : (
                        <Link
                          to={`/inventory?category=${id}`}
                          className="text-amber-500 hover:text-amber-400 font-medium"
                        >
                          {name}
                        </Link>
                      )}
                    </td>
                    <td className="p-3 text-right text-neutral-400 text-sm tabular-nums">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent inventory updates */}
      <section className="rounded-xl bg-neutral-800 border border-neutral-700 overflow-hidden">
        <div className="p-4 border-b border-neutral-700 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-neutral-400">
            Recent inventory updates
          </h2>
          <Link
            to="/inventory"
            state={linkState}
            className="text-sm font-medium text-amber-500 hover:text-amber-400 whitespace-nowrap"
          >
            View inventory
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-700/80">
                <th className="p-3 font-medium text-sm">Item</th>
                <th className="p-3 font-medium text-neutral-400 text-sm text-right">Quantities</th>
                <th className="p-3 font-medium text-neutral-400 text-sm">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-700/80">
              {recentlyUpdated.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-neutral-500 text-sm">
                    No items yet
                  </td>
                </tr>
              ) : (
                recentlyUpdated.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-700/30">
                    <td className="p-3">
                      <Link
                        to={`/inventory/${item.id}`}
                        state={linkState}
                        className="text-amber-500 hover:text-amber-400 font-medium"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="p-3 text-neutral-300 text-sm text-right tabular-nums">
                      {item.quantities.reduce(
                        (sum, q) => sum + (q.quantity ?? 0) + (q.quantityInUse ?? 0),
                        0
                      )}
                    </td>
                    <td className="p-3 text-neutral-400 text-sm">
                      {formatDate(item.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
