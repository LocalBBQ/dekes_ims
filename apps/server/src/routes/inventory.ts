import { Router, Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma.js";
import type {
  CreateInventoryItemBody,
  QuantityAtLocationInput,
  TransferQuantityBody,
  UpdateInventoryItemBody,
  UpdateQuantityBody,
} from "@shop-inventory/shared";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const itemInclude = {
  category: { select: { id: true, name: true } },
  itemLocationQuantities: { include: { location: true } },
};

function toItem(row: {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  lastOrderAt: Date | null;
  reorderLink: string | null;
  createdAt: Date;
  updatedAt: Date;
  itemLocationQuantities: { locationId: string; quantity: number; quantityInUse: number; location: { id: string; name: string } }[];
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    categoryId: row.categoryId,
    category: row.category,
    lastOrderAt: row.lastOrderAt?.toISOString() ?? null,
    reorderLink: row.reorderLink ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    quantities: row.itemLocationQuantities.map((q) => ({
      locationId: q.locationId,
      locationName: q.location.name,
      quantity: q.quantity,
      quantityInUse: q.quantityInUse,
    })),
  };
}

export const inventoryRouter = Router();

inventoryRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryId = req.query.category as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();
    const where: { categoryId?: string; name?: { contains: string } } = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) where.name = { contains: search };
    const items = await prisma.inventoryItem.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: itemInclude,
      orderBy: { name: "asc" },
    });
    res.json(items.map(toItem));
  } catch (err) {
    console.error("GET /inventory error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

inventoryRouter.post(
  "/import",
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      if (!file?.buffer) {
        res.status(400).json({ error: "No file uploaded. Use field name 'file'." });
        return;
      }
      const wb = XLSX.read(file.buffer, { type: "buffer" });
      const firstSheet = wb.SheetNames[0];
      if (!firstSheet) {
        res.status(400).json({ error: "Workbook has no sheets." });
        return;
      }
      const sheet = wb.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const locations = await prisma.location.findMany();
      let created = 0;
      let updated = 0;
      for (const row of rows) {
        const rawName = row["Item"] ?? row["item"];
        const name = typeof rawName === "string" ? rawName.trim() : "";
        if (!name) continue;
        const lastOrderRaw = row["Last Order"] ?? row["Last order"] ?? row["LastOrder"];
        let lastOrderAt: Date | null = null;
        if (lastOrderRaw != null) {
          if (typeof lastOrderRaw === "number" && lastOrderRaw > 0) {
            const parsed = XLSX.SSF.parse_date_code(lastOrderRaw) as { y: number; m: number; d: number } | undefined;
            if (parsed) lastOrderAt = new Date(parsed.y, parsed.m - 1, parsed.d);
            else lastOrderAt = new Date((lastOrderRaw - 25569) * 86400 * 1000);
          } else if (typeof lastOrderRaw === "string" && lastOrderRaw.trim()) {
            const d = new Date(lastOrderRaw.trim());
            if (!Number.isNaN(d.getTime())) lastOrderAt = d;
          }
        }
        const reorderLink = typeof row["Link"] === "string" ? row["Link"].trim() || null : typeof row["link"] === "string" ? row["link"].trim() || null : null;
        const existing = await prisma.inventoryItem.findFirst({
          where: { name },
          include: itemInclude,
        });
        if (existing) {
          await prisma.inventoryItem.update({
            where: { id: existing.id },
            data: {
              lastOrderAt,
              reorderLink: reorderLink ?? undefined,
            },
          });
          updated++;
        } else {
          const item = await prisma.inventoryItem.create({
            data: {
              name,
              lastOrderAt,
              reorderLink: reorderLink ?? undefined,
            },
            include: itemInclude,
          });
          for (const loc of locations) {
            await prisma.itemLocationQuantity.create({
              data: { itemId: item.id, locationId: loc.id, quantity: 0, quantityInUse: 0 },
            });
          }
          created++;
        }
      }
      res.json({ created, updated, total: rows.length });
    } catch (err) {
      console.error("POST /inventory/import error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
    }
  }
);

inventoryRouter.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: itemInclude,
    });
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(toItem(item));
  } catch (err) {
    console.error("GET /inventory/:id error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

inventoryRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as CreateInventoryItemBody;
    if (!body.name?.trim()) {
      res.status(400).json({ error: "name required" });
      return;
    }
    const locations = await prisma.location.findMany();
    const lastOrderAt = body.lastOrderAt ? new Date(body.lastOrderAt) : null;
    const item = await prisma.inventoryItem.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        categoryId: body.categoryId?.trim() || null,
        lastOrderAt: lastOrderAt && !Number.isNaN(lastOrderAt.getTime()) ? lastOrderAt : null,
        reorderLink: body.reorderLink?.trim() || null,
      },
      include: itemInclude,
    });
    for (const loc of locations) {
      const raw = body.quantities?.[loc.id];
      const qty = typeof raw === "number" ? raw : (raw && typeof raw === "object" && typeof (raw as QuantityAtLocationInput).quantity === "number" ? (raw as QuantityAtLocationInput).quantity! : 0);
      const inUse = raw && typeof raw === "object" && typeof (raw as QuantityAtLocationInput).quantityInUse === "number" ? (raw as QuantityAtLocationInput).quantityInUse! : 0;
      await prisma.itemLocationQuantity.create({
        data: { itemId: item.id, locationId: loc.id, quantity: qty, quantityInUse: inUse },
      });
    }
    const withAll = await prisma.inventoryItem.findUnique({
      where: { id: item.id },
      include: itemInclude,
    });
    res.status(201).json(withAll ? toItem(withAll) : toItem(item));
  } catch (err) {
    console.error("POST /api/inventory error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

function parseQty(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === "number" ? val : Number(val);
  return !Number.isNaN(n) ? n : null;
}

inventoryRouter.patch("/:id/quantity", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const body = req.body as UpdateQuantityBody;
    if (!body.locationId?.trim()) {
      res.status(400).json({ error: "locationId required" });
      return;
    }
    const quantity = parseQty(body.quantity);
    const quantityInUse = parseQty(body.quantityInUse);
    if (quantity === null && quantityInUse === null) {
      res.status(400).json({ error: "quantity or quantityInUse required" });
      return;
    }
    if (quantity !== null && quantity < 0) {
      res.status(400).json({ error: "quantity must be a non-negative number" });
      return;
    }
    if (quantityInUse !== null && quantityInUse < 0) {
      res.status(400).json({ error: "quantityInUse must be a non-negative number" });
      return;
    }
    const location = await prisma.location.findUnique({ where: { id: body.locationId } });
    if (!location) {
      res.status(400).json({ error: "Invalid location" });
      return;
    }
    const item = await prisma.inventoryItem.findUnique({ where: { id }, include: itemInclude });
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    const existing = item.itemLocationQuantities.find((q) => q.locationId === location.id);
    const sealed = quantity !== null ? quantity : existing?.quantity ?? 0;
    const inUse = quantityInUse !== null ? quantityInUse : existing?.quantityInUse ?? 0;
    await prisma.itemLocationQuantity.upsert({
      where: {
        itemId_locationId: { itemId: id, locationId: location.id },
      },
      create: { itemId: id, locationId: location.id, quantity: sealed, quantityInUse: inUse },
      update: { quantity: sealed, quantityInUse: inUse },
    });
    await prisma.inventoryItem.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
    const updated = await prisma.inventoryItem.findUnique({
      where: { id },
      include: itemInclude,
    });
    res.json(toItem(updated!));
  } catch (err) {
    console.error("PATCH /inventory/:id/quantity error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

inventoryRouter.patch("/:id/transfer", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const body = req.body as TransferQuantityBody;
    if (!body.fromLocationId?.trim() || !body.toLocationId?.trim()) {
      res.status(400).json({ error: "fromLocationId and toLocationId required" });
      return;
    }
    if (body.fromLocationId === body.toLocationId) {
      res.status(400).json({ error: "from and to location must be different" });
      return;
    }
    const qty = typeof body.quantity === "number" ? body.quantity : Number(body.quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      res.status(400).json({ error: "quantity must be a positive number" });
      return;
    }
    const item = await prisma.inventoryItem.findUnique({ where: { id }, include: itemInclude });
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    const fromRow = item.itemLocationQuantities.find((q) => q.locationId === body.fromLocationId);
    const available = fromRow ? fromRow.quantity : 0;
    if (available < qty) {
      res.status(400).json({
        error: `Not enough sealed stock at source (available: ${available}, requested: ${qty})`,
      });
      return;
    }
    const toLocation = await prisma.location.findUnique({ where: { id: body.toLocationId } });
    if (!toLocation) {
      res.status(400).json({ error: "To location not found" });
      return;
    }
    const fromLocation = await prisma.location.findUnique({ where: { id: body.fromLocationId } });
    if (!fromLocation) {
      res.status(400).json({ error: "From location not found" });
      return;
    }
    await prisma.$transaction([
      prisma.itemLocationQuantity.upsert({
        where: {
          itemId_locationId: { itemId: id, locationId: body.fromLocationId },
        },
        create: {
          itemId: id,
          locationId: body.fromLocationId,
          quantity: Math.max(0, available - qty),
          quantityInUse: fromRow?.quantityInUse ?? 0,
        },
        update: { quantity: Math.max(0, available - qty) },
      }),
      prisma.itemLocationQuantity.upsert({
        where: {
          itemId_locationId: { itemId: id, locationId: body.toLocationId },
        },
        create: {
          itemId: id,
          locationId: body.toLocationId,
          quantity: qty,
          quantityInUse: 0,
        },
        update: {
          quantity: { increment: qty },
        },
      }),
    ]);
    await prisma.inventoryItem.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
    const updated = await prisma.inventoryItem.findUnique({
      where: { id },
      include: itemInclude,
    });
    res.json(toItem(updated!));
  } catch (err) {
    console.error("PATCH /inventory/:id/transfer error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

inventoryRouter.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const body = req.body as UpdateInventoryItemBody;
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    const updateData: {
      name?: string;
      description?: string | null;
      categoryId?: string | null;
      lastOrderAt?: Date | null;
      reorderLink?: string | null;
    } = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId?.trim() || null;
    if (body.lastOrderAt !== undefined) {
      const d = body.lastOrderAt ? new Date(body.lastOrderAt) : null;
      updateData.lastOrderAt = d && !Number.isNaN(d.getTime()) ? d : null;
    }
    if (body.reorderLink !== undefined) updateData.reorderLink = body.reorderLink?.trim() || null;
    if (Object.keys(updateData).length > 0) {
      await prisma.inventoryItem.update({
        where: { id },
        data: updateData,
      });
    }
    if (body.quantities && Object.keys(body.quantities).length > 0) {
      for (const [locationId, raw] of Object.entries(body.quantities)) {
        const qty = typeof raw === "number" ? raw : (raw && typeof raw === "object" && typeof (raw as QuantityAtLocationInput).quantity === "number" ? (raw as QuantityAtLocationInput).quantity! : 0);
        const inUse = raw && typeof raw === "object" && typeof (raw as QuantityAtLocationInput).quantityInUse === "number" ? (raw as QuantityAtLocationInput).quantityInUse! : 0;
        await prisma.itemLocationQuantity.upsert({
          where: {
            itemId_locationId: { itemId: id, locationId },
          },
          create: { itemId: id, locationId, quantity: Number(qty) || 0, quantityInUse: Number(inUse) || 0 },
          update: { quantity: Number(qty) || 0, quantityInUse: Number(inUse) || 0 },
        });
      }
    }
    const didRelatedUpdates = body.quantities && Object.keys(body.quantities).length > 0;
    if (didRelatedUpdates && Object.keys(updateData).length === 0) {
      await prisma.inventoryItem.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
    }
    const updated = await prisma.inventoryItem.findUnique({
      where: { id },
      include: itemInclude,
    });
    res.json(toItem(updated!));
  } catch (err) {
    console.error("PATCH /inventory/:id error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

inventoryRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;
  await prisma.inventoryItem.delete({ where: { id } }).catch(() => null);
  res.status(204).send();
});
