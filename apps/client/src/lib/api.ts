const base = (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL || "/api";

const TOKEN_KEY = "auth_token";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (!token) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, ...init } = options;
  const headers: HeadersInit = { ...(init.headers as HeadersInit) };
  if (json !== undefined) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
    init.body = JSON.stringify(json);
  }
  const token = getAuthToken();
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
  return data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{
        token: string;
        user: { id: string; email: string; role: string; createdAt: string };
      }>(
        "/auth/login",
        { method: "POST", json: { email, password } }
      ),
    logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
    me: () =>
      request<{ user: { id: string; email: string; role: string; createdAt: string } }>("/auth/me"),
  },
  users: {
    list: () =>
      request<{ id: string; email: string; role: string; createdAt: string }[]>("/users"),
    create: (body: { email: string; password: string; role: "admin" | "staff" }) =>
      request<{ id: string; email: string; role: string; createdAt: string }>("/users", {
        method: "POST",
        json: body,
      }),
  },
  locations: {
    list: () => request<{ id: string; name: string }[]>("/locations"),
    update: (id: string, name: string) =>
      request<{ id: string; name: string }>("/locations/" + id, {
        method: "PATCH",
        json: { name },
      }),
  },
  categories: {
    list: () => request<{ id: string; name: string }[]>("/categories"),
    create: (name: string) =>
      request<{ id: string; name: string }>("/categories", {
        method: "POST",
        json: { name },
      }),
    update: (id: string, name: string) =>
      request<{ id: string; name: string }>("/categories/" + id, {
        method: "PATCH",
        json: { name },
      }),
    delete: (id: string) => request<void>("/categories/" + id, { method: "DELETE" }),
  },
  fieldDefinitions: {
    list: () =>
      request<
        { id: string; name: string; type: string; options: string[] | null; sortOrder: number }[]
      >("/field-definitions"),
    create: (body: {
      name: string;
      type: "text" | "number" | "date" | "select" | "image";
      options: string[] | null;
      sortOrder: number;
    }) =>
      request<{
        id: string;
        name: string;
        type: string;
        options: string[] | null;
        sortOrder: number;
      }>("/field-definitions", { method: "POST", json: body }),
    update: (
      id: string,
      body: Partial<{
        name: string;
        type: "text" | "number" | "date" | "select" | "image";
        options: string[] | null;
        sortOrder: number;
      }>
    ) =>
      request<{
        id: string;
        name: string;
        type: string;
        options: string[] | null;
        sortOrder: number;
      }>("/field-definitions/" + id, { method: "PATCH", json: body }),
    delete: (id: string) => request<void>("/field-definitions/" + id, { method: "DELETE" }),
  },
  inventory: {
    list: (opts?: { categoryId?: string; search?: string }) => {
      const params = new URLSearchParams();
      if (opts?.categoryId) params.set("category", opts.categoryId);
      if (opts?.search?.trim()) params.set("search", opts.search.trim());
      const qs = params.toString();
      return request<
        {
          id: string;
          name: string;
          description: string | null;
          categoryId: string | null;
          category: { id: string; name: string } | null;
          lastOrderAt: string | null;
          reorderLink: string | null;
          createdAt: string;
          updatedAt: string;
          quantities: { locationId: string; locationName: string; quantity: number; quantityInUse: number }[];
          images: {
            id: string;
            itemId: string;
            filePathOrUrl: string;
            createdAt: string;
          }[];
        }[]
      >("/inventory" + (qs ? "?" + qs : ""));
    },
    get: (id: string) =>
      request<{
        id: string;
        name: string;
        description: string | null;
        categoryId: string | null;
        category: { id: string; name: string } | null;
        lastOrderAt: string | null;
        reorderLink: string | null;
        createdAt: string;
        updatedAt: string;
        quantities: { locationId: string; locationName: string; quantity: number; quantityInUse: number }[];
        images: {
          id: string;
          itemId: string;
          filePathOrUrl: string;
          createdAt: string;
        }[];
      }>("/inventory/" + id),
    create: (body: {
      name: string;
      description?: string | null;
      categoryId?: string | null;
      lastOrderAt?: string | null;
      reorderLink?: string | null;
      quantities?: Record<string, number | { quantity?: number; quantityInUse?: number }>;
    }) =>
      request<{
        id: string;
        name: string;
        description: string | null;
        categoryId: string | null;
        category: { id: string; name: string } | null;
        lastOrderAt: string | null;
        reorderLink: string | null;
        createdAt: string;
        updatedAt: string;
        quantities: { locationId: string; locationName: string; quantity: number; quantityInUse: number }[];
        images: { id: string; itemId: string; filePathOrUrl: string; createdAt: string }[];
      }>("/inventory", { method: "POST", json: body }),
    update: (
      id: string,
      body: {
        name?: string;
        description?: string | null;
        categoryId?: string | null;
        lastOrderAt?: string | null;
        reorderLink?: string | null;
        quantities?: Record<string, number | { quantity?: number; quantityInUse?: number }>;
      }
    ) =>
      request<{
        id: string;
        name: string;
        description: string | null;
        categoryId: string | null;
        category: { id: string; name: string } | null;
        lastOrderAt: string | null;
        reorderLink: string | null;
        createdAt: string;
        updatedAt: string;
        quantities: { locationId: string; locationName: string; quantity: number; quantityInUse: number }[];
        images: { id: string; itemId: string; filePathOrUrl: string; createdAt: string }[];
      }>("/inventory/" + id, { method: "PATCH", json: body }),
    updateQuantity: (
      id: string,
      locationId: string,
      payload: { quantity?: number; quantityInUse?: number }
    ) =>
      request<{
        id: string;
        name: string;
        categoryId: string | null;
        category: { id: string; name: string } | null;
        lastOrderAt: string | null;
        reorderLink: string | null;
        createdAt: string;
        updatedAt: string;
        quantities: { locationId: string; locationName: string; quantity: number; quantityInUse: number }[];
        images: { id: string; itemId: string; filePathOrUrl: string; createdAt: string }[];
      }>("/inventory/" + id + "/quantity", {
        method: "PATCH",
        json: { locationId, ...payload },
      }),
    transfer: (
      id: string,
      fromLocationId: string,
      toLocationId: string,
      quantity: number
    ) =>
      request<{
        id: string;
        name: string;
        categoryId: string | null;
        category: { id: string; name: string } | null;
        lastOrderAt: string | null;
        reorderLink: string | null;
        createdAt: string;
        updatedAt: string;
        quantities: { locationId: string; locationName: string; quantity: number; quantityInUse: number }[];
        images: { id: string; itemId: string; filePathOrUrl: string; createdAt: string }[];
      }>("/inventory/" + id + "/transfer", {
        method: "PATCH",
        json: { fromLocationId, toLocationId, quantity },
      }),
    delete: (id: string) => request<void>("/inventory/" + id, { method: "DELETE" }),
    importFromExcel: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${base}/inventory/import`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText || "Import failed");
      return data as { created: number; updated: number; total: number };
    },
  },
};
