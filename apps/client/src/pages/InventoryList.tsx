import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return "—";
  }
}

export default function InventoryList() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = searchParams.get("category") ?? undefined;
  const searchQuery = searchParams.get("search") ?? "";
  const linkState = { returnTo: location.pathname || "/inventory" };
  const isAdmin = user?.role === "admin";

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.categories.list(),
  });
  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory", categoryId, searchQuery],
    queryFn: () => api.inventory.list({ categoryId, search: searchQuery || undefined }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Inventory</h1>
        {isAdmin && (
          <Link
            to="/inventory/new"
            className="px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium"
          >
            Add item
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          placeholder="Search items…"
          value={searchQuery}
          onChange={(e) => {
            const v = e.target.value;
            const next = new URLSearchParams(searchParams);
            if (v) next.set("search", v);
            else next.delete("search");
            setSearchParams(next, { replace: true });
          }}
          className="w-full sm:min-w-[12rem] px-3 py-2.5 rounded-lg bg-neutral-800 border border-neutral-600 text-base sm:text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label="Search inventory items"
        />
        {categories && categories.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm text-neutral-400 shrink-0">Category:</span>
            <select
              value={categoryId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const next = new URLSearchParams(searchParams);
                if (v) next.set("category", v);
                else next.delete("category");
                setSearchParams(next);
              }}
              className="flex-1 min-w-0 sm:flex-none px-3 py-2.5 rounded-lg bg-neutral-800 border border-neutral-600 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {isLoading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : items?.length === 0 ? (
        <p className="text-neutral-400">
          {searchQuery.trim()
            ? "No items match your search. Try a different term or clear the search."
            : "No items. Add one or import an Excel file."}
        </p>
      ) : (
        <>
          {/* Mobile: card list (no horizontal scroll) */}
          <ul className="space-y-3 md:hidden">
            {items?.map((item) => (
              <li key={item.id}>
                <Link
                  to={"/inventory/" + item.id}
                  state={linkState}
                  className="block rounded-xl border border-neutral-700 bg-neutral-800/50 p-4 active:bg-neutral-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-amber-400">{item.name}</span>
                    {isAdmin && item.reorderLink && (
                      <a
                        href={item.reorderLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
                      >
                        Purchase
                      </a>
                    )}
                  </div>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <dt className="text-neutral-500">Category:</dt>
                      <dd className="text-neutral-400">{item.category?.name ?? "—"}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <dt className="text-neutral-500">Last order:</dt>
                      <dd className="tabular-nums text-neutral-300">{formatDate(item.lastOrderAt)}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <dt className="text-neutral-500">Last updated:</dt>
                      <dd className="tabular-nums text-neutral-400">{formatDate(item.updatedAt)}</dd>
                    </div>
                    <div className="pt-1">
                      <dt className="text-neutral-500">Quantities:</dt>
                      <dd className="mt-0.5 flex flex-wrap gap-2">
                        {item.quantities.map((q) => {
                          const total = (q.quantity ?? 0) + (q.quantityInUse ?? 0);
                          return (
                            <span key={q.locationId} className="inline-flex items-baseline gap-1.5 rounded border border-neutral-600 bg-neutral-800/80 px-2.5 py-1.5">
                              <span className="text-sm text-neutral-500">{q.locationName}</span>
                              <span className="text-lg font-semibold tabular-nums text-white">{total}</span>
                            </span>
                          );
                        })}
                      </dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-neutral-700">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-800/80">
                  <th className="p-3 font-medium">Item</th>
                  <th className="p-3 font-medium text-neutral-400">Category</th>
                  <th className="p-3 font-medium text-neutral-400">Last order</th>
                  <th className="p-3 font-medium text-neutral-400">Quantities</th>
                  <th className="p-3 font-medium text-neutral-400">Last updated</th>
                  {isAdmin && <th className="p-3 font-medium text-neutral-400 w-24">Order Link</th>}
                </tr>
              </thead>
              <tbody>
                {items?.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-700/80 hover:bg-neutral-800/50">
                    <td className="p-3">
                      <Link to={"/inventory/" + item.id} state={linkState} className="font-medium text-amber-400 hover:underline">
                        {item.name}
                      </Link>
                    </td>
                    <td className="p-3 text-neutral-400">{item.category?.name ?? "—"}</td>
                    <td className="p-3 text-neutral-300 tabular-nums">{formatDate(item.lastOrderAt)}</td>
                    <td className="p-3">
                      <span className="flex flex-wrap gap-2">
                        {item.quantities.map((q) => {
                          const total = (q.quantity ?? 0) + (q.quantityInUse ?? 0);
                          return (
                            <span key={q.locationId} className="inline-flex items-baseline gap-1.5 rounded border border-neutral-600 bg-neutral-800/80 px-2 py-1">
                              <span className="text-sm text-neutral-500">{q.locationName}</span>
                              <span className="text-lg font-semibold tabular-nums text-white">{total}</span>
                            </span>
                          );
                        })}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-400 tabular-nums text-sm">
                      {formatDate(item.updatedAt)}
                    </td>
                    {isAdmin && (
                      <td className="p-3">
                        {item.reorderLink ? (
                          <a
                            href={item.reorderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-medium"
                          >
                            Purchase
                          </a>
                        ) : (
                          <span className="text-neutral-500 text-sm">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
