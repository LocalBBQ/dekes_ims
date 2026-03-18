import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";

export const fieldDefinitionsRouter = Router();

fieldDefinitionsRouter.use(requireAdmin);

fieldDefinitionsRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const list = await prisma.fieldDefinition.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json(
      list.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        options: f.options ? (JSON.parse(f.options) as string[]) : null,
        sortOrder: f.sortOrder,
      }))
    );
  } catch (err) {
    console.error("GET /field-definitions error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

fieldDefinitionsRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, type, options, sortOrder } = req.body as {
      name?: string;
      type?: string;
      options?: string[] | null;
      sortOrder?: number;
    };
    const trimmedName = name?.trim();
    const trimmedType = type?.trim();
    if (!trimmedName) {
      res.status(400).json({ error: "name required" });
      return;
    }
    if (!trimmedType) {
      res.status(400).json({ error: "type required" });
      return;
    }
    const record = await prisma.fieldDefinition.create({
      data: {
        name: trimmedName,
        type: trimmedType,
        options: Array.isArray(options) && options.length ? JSON.stringify(options) : null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });
    res.status(201).json({
      id: record.id,
      name: record.name,
      type: record.type,
      options: record.options ? (JSON.parse(record.options) as string[]) : null,
      sortOrder: record.sortOrder,
    });
  } catch (err) {
    console.error("POST /field-definitions error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

fieldDefinitionsRouter.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const { name, type, options, sortOrder } = req.body as {
      name?: string;
      type?: string;
      options?: string[] | null;
      sortOrder?: number;
    };
    const data: {
      name?: string;
      type?: string;
      options?: string | null;
      sortOrder?: number;
    } = {};
    if (name !== undefined) data.name = name.trim();
    if (type !== undefined) data.type = type.trim();
    if (options !== undefined)
      data.options = Array.isArray(options) && options.length ? JSON.stringify(options) : null;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const updated = await prisma.fieldDefinition
      .update({
        where: { id },
        data,
      })
      .catch(() => null);
    if (!updated) {
      res.status(404).json({ error: "Field definition not found" });
      return;
    }
    res.json({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      options: updated.options ? (JSON.parse(updated.options) as string[]) : null,
      sortOrder: updated.sortOrder,
    });
  } catch (err) {
    console.error("PATCH /field-definitions/:id error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

fieldDefinitionsRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;
  await prisma.fieldDefinition.delete({ where: { id } }).catch(() => null);
  res.status(204).send();
});

