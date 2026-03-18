export type UserRole = "admin" | "staff";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface QuantityAtLocation {
  locationId: string;
  locationName: string;
  quantity: number; // sealed
  quantityInUse: number; // open / in use
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category?: Category | null;
  lastOrderAt: string | null;
  reorderLink: string | null;
  createdAt: string;
  updatedAt: string;
  quantities: QuantityAtLocation[];
  images?: ItemImage[];
}

export interface ItemImage {
  id: string;
  itemId: string;
  filePathOrUrl: string;
  createdAt: string;
}

// API payloads
export interface LoginBody {
  email: string;
  password: string;
}

export interface QuantityAtLocationInput {
  quantity?: number;
  quantityInUse?: number;
}

export interface CreateInventoryItemBody {
  name: string;
  description?: string | null;
  categoryId?: string | null;
  lastOrderAt?: string | null;
  reorderLink?: string | null;
  quantities?: Record<string, number | QuantityAtLocationInput>;
}

export interface UpdateInventoryItemBody {
  name?: string;
  description?: string | null;
  categoryId?: string | null;
  lastOrderAt?: string | null;
  reorderLink?: string | null;
  quantities?: Record<string, number | QuantityAtLocationInput>;
}

export interface UpdateQuantityBody {
  locationId: string;
  quantity?: number; // sealed
  quantityInUse?: number; // open / in use
}

export interface TransferQuantityBody {
  fromLocationId: string;
  toLocationId: string;
  quantity: number; // sealed units to move
}

export interface UpdateLocationBody {
  name: string;
}

export interface CreateUserBody {
  email: string;
  password: string;
  role: UserRole;
}
