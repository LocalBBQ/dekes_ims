import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
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

const SEARCH_DEBOUNCE_MS = 250;

function InventoryListSkeleton() {
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <li
            key={i}
            className="h-36 rounded-xl border border-neutral-700 bg-neutral-800/50 animate-pulse"
          />
        ))}
      </ul>
      <div className="hidden md:block overflow-x-auto rounded-xl border border-neutral-700">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-700 bg-neutral-800/80">
              <th className="p-3 font-medium">Item</th>
              <th className="p-3 font-medium text-neutral-400">Category</th>
              <th className="p-3 font-medium text-neutral-400 text-right">Last order</th>
              <th className="p-3 font-medium text-neutral-400">Quantities</th>
              <th className="p-3 font-medium text-neutral-400 text-right">Last updated</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <tr key={i} className="border-b border-neutral-700/80">
                <td className="p-3">
                  <div className="h-4 w-36 max-w-full bg-neutral-700 rounded animate-pulse" />
                </td>
                <td className="p-3">
                  <div className="h-4 w-20 bg-neutral-700 rounded animate-pulse" />
                </td>
                <td className="p-3 text-right">
                  <div className="ml-auto h-4 w-16 bg-neutral-700 rounded animate-pulse" />
                </td>
                <td className="p-3">
                  <div className="h-6 w-24 bg-neutral-700 rounded animate-pulse" />
                </td>
                <td className="p-3 text-right">
                  <div className="ml-auto h-4 w-20 bg-neutral-700 rounded animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function InventoryList() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = searchParams.get("category") ?? undefined;
  const searchQuery = searchParams.get("search") ?? "";
  const [inputValue, setInputValue] = useState(searchQuery);
  const linkState = { returnTo: location.pathname || "/inventory" };
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearchParams(
        (prev) => {
          const current = prev.get("search") ?? "";
          if (inputValue === current) return prev;
          const next = new URLSearchParams(prev);
          if (inputValue.trim()) next.set("search", inputValue);
          else next.delete("search");
          return next;
        },
        { replace: true }
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [inputValue, setSearchParams]);

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
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
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
        <InventoryListSkeleton />
      ) : items?.length === 0 ? (
        <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-8 text-center space-y-3">
          <p className="text-neutral-300 font-medium">
            {searchQuery.trim()
              ? "No items match your search"
              : "No items yet"}
          </p>
          <p className="text-neutral-500 text-sm max-w-sm mx-auto">
            {searchQuery.trim()
              ? "Try a different search term or clear the search box."
              : "Add your first item to start tracking stock by location."}
          </p>
          {isAdmin && !searchQuery.trim() && (
            <Link
              to="/inventory/new"
              className="inline-flex px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium"
            >
              Add item
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {items?.map((item) => (
              <li key={item.id}>
                <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 overflow-hidden">
                  <Link
                    to={"/inventory/" + item.id}
                    state={linkState}
                    className="block p-4 active:bg-neutral-800"
                  >
                    <span className="font-medium text-amber-400">{item.name}</span>
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
                              <span
                                key={q.locationId}
                                className="inline-flex items-baseline gap-1.5 rounded border border-neutral-600 bg-neutral-800/80 px-2.5 py-1.5"
                              >
                                <span className="text-sm text-neutral-500">{q.locationName}</span>
                                <span className="text-lg font-semibold tabular-nums text-white">
                                  {total}
                                </span>
                              </span>
                            );
                          })}
                        </dd>
                      </div>
                    </dl>
                  </Link>
                  {isAdmin && item.reorderLink && (
                    <div className="border-t border-neutral-700/80 px-4 py-3 bg-neutral-800/80">
                      <a
                        href={item.reorderLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-3 rounded-lg border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 font-medium text-sm"
                      >
                        Purchase / reorder
                      </a>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block overflow-x-auto rounded-xl border border-neutral-700">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-800/80">
                  <th className="p-3 font-medium">Item</th>
                  <th className="p-3 font-medium text-neutral-400">Category</th>
                  <th className="p-3 font-medium text-neutral-400 text-right">Last order</th>
                  <th className="p-3 font-medium text-neutral-400">Quantities</th>
                  <th className="p-3 font-medium text-neutral-400 text-right">Last updated</th>
                  {isAdmin && (
                    <th className="p-3 font-medium text-neutral-400 w-28 text-right">Order link</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items?.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-700/80 hover:bg-neutral-800/50">
                    <td className="p-3">
                      <Link
                        to={"/inventory/" + item.id}
                        state={linkState}
                        className="font-medium text-amber-400 hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="p-3 text-neutral-400">{item.category?.name ?? "—"}</td>
                    <td className="p-3 text-neutral-300 tabular-nums text-right">
                      {formatDate(item.lastOrderAt)}
                    </td>
                    <td className="p-3">
                      <span className="flex flex-wrap gap-2">
                        {item.quantities.map((q) => {
                          const total = (q.quantity ?? 0) + (q.quantityInUse ?? 0);
                          return (
                            <span
                              key={q.locationId}
                              className="inline-flex items-baseline gap-1.5 rounded border border-neutral-600 bg-neutral-800/80 px-2 py-1"
                            >
                              <span className="text-sm text-neutral-500">{q.locationName}</span>
                              <span className="text-lg font-semibold tabular-nums text-white">
                                {total}
                              </span>
                            </span>
                          );
                        })}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-400 tabular-nums text-sm text-right">
                      {formatDate(item.updatedAt)}
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-right">
                        {item.reorderLink ? (
                          <a
                            href={item.reorderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-sm font-medium"
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
