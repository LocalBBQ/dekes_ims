import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import type { UpdateLocationBody } from "@shop-inventory/shared";

export const locationsRouter = Router();

locationsRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: "asc" },
    });
    res.json(locations.map((l) => ({ id: l.id, name: l.name })));
  } catch (err) {
    console.error("GET /locations error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

locationsRouter.patch("/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;
  const body = req.body as UpdateLocationBody;
  if (!body.name?.trim()) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const location = await prisma.location.update({
    where: { id },
    data: { name: body.name.trim() },
  }).catch(() => null);
  if (!location) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  res.json({ id: location.id, name: location.name });
});
