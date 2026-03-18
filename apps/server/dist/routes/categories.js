import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
export const categoriesRouter = Router();
categoriesRouter.get("/", async (_req, res) => {
    try {
        const list = await prisma.category.findMany({
            orderBy: { name: "asc" },
        });
        res.json(list.map((c) => ({ id: c.id, name: c.name })));
    }
    catch (err) {
        console.error("GET /categories error:", err);
        res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
    }
});
categoriesRouter.use(requireAdmin);
categoriesRouter.post("/", async (req, res) => {
    const name = req.body?.name?.trim();
    if (!name) {
        res.status(400).json({ error: "name required" });
        return;
    }
    const category = await prisma.category.create({
        data: { name },
    });
    res.status(201).json({ id: category.id, name: category.name });
});
categoriesRouter.patch("/:id", async (req, res) => {
    const id = req.params.id;
    const name = req.body?.name?.trim();
    if (!name) {
        res.status(400).json({ error: "name required" });
        return;
    }
    const category = await prisma.category
        .update({
        where: { id },
        data: { name },
    })
        .catch(() => null);
    if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
    }
    res.json({ id: category.id, name: category.name });
});
categoriesRouter.delete("/:id", async (req, res) => {
    const id = req.params.id;
    await prisma.category.delete({ where: { id } }).catch(() => null);
    res.status(204).send();
});
