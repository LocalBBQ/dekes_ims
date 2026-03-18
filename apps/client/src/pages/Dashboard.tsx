import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

const LOW_STOCK_THRESHOLD = 1;

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
  const totalItems = items?.length ?? 0;
  const outOfStockItems =
    items?.filter((item) =>
      item.quantities.some((q) => q.quantity === 0)
    ) ?? [];
  const lowStockItems =
    items?.filter((item) =>
      item.quantities.some(
        (q) => (q.quantity ?? 0) + (q.quantityInUse ?? 0) <= LOW_STOCK_THRESHOLD
      )
    ) ?? [];
  const outOfStockCount = outOfStockItems.length;
  const lowStockCount = lowStockItems.length;

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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-neutral-800 border border-neutral-700 animate-pulse"
            >
              <div className="h-4 w-24 bg-neutral-700 rounded mb-2" />
              <div className="h-8 w-16 bg-neutral-700 rounded" />
            </div>
          ))}
        </div>
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-neutral-800 border border-neutral-700">
          <p className="text-neutral-400 text-sm">Total items</p>
          <p className="text-2xl font-semibold">{totalItems}</p>
        </div>
        <div className="p-4 rounded-xl bg-neutral-800 border border-neutral-700">
          <p className="text-neutral-400 text-sm">Out of stock</p>
          <p className="text-2xl font-semibold text-red-400">{outOfStockCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-neutral-800 border border-neutral-700">
          <p className="text-neutral-400 text-sm">Low stock (≤{LOW_STOCK_THRESHOLD})</p>
          <p className="text-2xl font-semibold text-amber-400">{lowStockCount}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Out of stock list */}
        <section className="rounded-xl bg-neutral-800 border border-neutral-700 overflow-hidden">
          <h2 className="p-4 border-b border-neutral-700 text-sm font-medium text-neutral-400">
            Out of stock
          </h2>
          <div className="max-h-48 overflow-y-auto">
            {outOfStockItems.length === 0 ? (
              <p className="p-4 text-neutral-500 text-sm">No items out of stock</p>
            ) : (
              <ul className="divide-y divide-neutral-700/80">
                {outOfStockItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/inventory/${item.id}`}
                      state={linkState}
                      className="block p-3 hover:bg-neutral-700/50 text-sm"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Low stock list */}
        <section className="rounded-xl bg-neutral-800 border border-neutral-700 overflow-hidden">
          <h2 className="p-4 border-b border-neutral-700 text-sm font-medium text-neutral-400">
            Low stock
          </h2>
          <div className="max-h-48 overflow-y-auto">
            {lowStockItems.length === 0 ? (
              <p className="p-4 text-neutral-500 text-sm">No low stock items</p>
            ) : (
              <ul className="divide-y divide-neutral-700/80">
                {lowStockItems.map((item) => {
                  const lowQty = item.quantities.find(
                    (q) => (q.quantity ?? 0) + (q.quantityInUse ?? 0) <= LOW_STOCK_THRESHOLD
                  );
                  return (
                    <li key={item.id}>
                      <Link
                        to={`/inventory/${item.id}`}
                        state={linkState}
                        className="block p-3 hover:bg-neutral-700/50 text-sm flex justify-between items-center gap-2"
                      >
                        <span>{item.name}</span>
                        {lowQty && (
                          <span className="text-neutral-500 text-xs shrink-0">
                            {lowQty.locationName}: {(lowQty.quantity ?? 0) + (lowQty.quantityInUse ?? 0)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

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
                    <td className="p-3 text-neutral-400 text-sm">{count}</td>
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
                <th className="p-3 font-medium text-neutral-400 text-sm">Quantities</th>
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
                    <td className="p-3 text-neutral-300 text-sm">
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
