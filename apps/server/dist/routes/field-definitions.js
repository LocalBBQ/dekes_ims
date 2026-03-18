import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
const VALID_TYPES = ["text", "number", "date", "select", "image"];
export const fieldDefinitionsRouter = Router();
function parseOptions(options) {
    if (options == null || options === "")
        return null;
    try {
        const parsed = JSON.parse(options);
        return Array.isArray(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
fieldDefinitionsRouter.get("/", async (_req, res) => {
    try {
        const list = await prisma.fieldDefinition.findMany({
            orderBy: { sortOrder: "asc", name: "asc" },
        });
        res.json(list.map((f) => ({
            id: String(f.id),
            name: String(f.name),
            type: f.type,
            options: parseOptions(f.options),
            sortOrder: Number(f.sortOrder),
        })));
    }
    catch (err) {
        console.error("GET /field-definitions error:", err);
        res.status(500).json({
            error: err instanceof Error ? err.message : "Internal Server Error",
        });
    }
});
fieldDefinitionsRouter.use(requireAdmin);
fieldDefinitionsRouter.post("/", async (req, res) => {
    const body = req.body;
    if (!body.name?.trim()) {
        res.status(400).json({ error: "name required" });
        return;
    }
    if (!body.type || !VALID_TYPES.includes(body.type)) {
        res.status(400).json({ error: "type must be one of: text, number, date, select, image" });
        return;
    }
    const optionsJson = body.type === "select" && Array.isArray(body.options)
        ? JSON.stringify(body.options)
        : null;
    const created = await prisma.fieldDefinition.create({
        data: {
            name: body.name.trim(),
            type: body.type,
            options: optionsJson,
            sortOrder: body.sortOrder ?? 0,
        },
    });
    res.status(201).json({
        id: created.id,
        name: created.name,
        type: created.type,
        options: parseOptions(created.options),
        sortOrder: created.sortOrder,
    });
});
fieldDefinitionsRouter.patch("/:id", async (req, res) => {
    const id = req.params.id;
    const body = req.body;
    if (body.type !== undefined && !VALID_TYPES.includes(body.type)) {
        res.status(400).json({ error: "type must be one of: text, number, date, select, image" });
        return;
    }
    const optionsJson = body.options !== undefined
        ? Array.isArray(body.options)
            ? JSON.stringify(body.options)
            : null
        : undefined;
    const data = {};
    if (body.name !== undefined)
        data.name = body.name.trim();
    if (body.type !== undefined)
        data.type = body.type;
    if (body.options !== undefined)
        data.options = optionsJson ?? null;
    if (body.sortOrder !== undefined)
        data.sortOrder = body.sortOrder;
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
        options: parseOptions(updated.options),
        sortOrder: updated.sortOrder,
    });
});
fieldDefinitionsRouter.delete("/:id", async (req, res) => {
    const id = req.params.id;
    await prisma.fieldDefinition.delete({ where: { id } }).catch(() => null);
    res.status(204).send();
});
