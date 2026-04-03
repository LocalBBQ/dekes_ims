import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireManagerOrAdmin } from "../middleware/auth.js";
export const tasksRouter = Router();
const COLUMNS = ["todo", "need_purchase", "need_fix"];
function parseColumn(raw) {
    if (typeof raw !== "string")
        return null;
    return COLUMNS.includes(raw) ? raw : null;
}
function toTask(row) {
    return {
        id: row.id,
        title: row.title,
        column: row.column,
        sortOrder: row.sortOrder,
        createdById: row.createdById,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
tasksRouter.get("/", async (_req, res) => {
    const rows = await prisma.task.findMany({
        orderBy: [{ column: "asc" }, { sortOrder: "asc" }],
    });
    res.json(rows.map(toTask));
});
tasksRouter.put("/board", requireManagerOrAdmin, async (req, res) => {
    const body = req.body;
    const board = {
        todo: [],
        need_purchase: [],
        need_fix: [],
    };
    for (const col of COLUMNS) {
        const arr = body[col];
        if (!Array.isArray(arr) || !arr.every((x) => typeof x === "string")) {
            res.status(400).json({ error: `column ${col} must be an array of string ids` });
            return;
        }
        board[col] = arr;
    }
    const allIds = [...board.todo, ...board.need_purchase, ...board.need_fix];
    const unique = new Set(allIds);
    if (unique.size !== allIds.length) {
        res.status(400).json({ error: "duplicate task id in board" });
        return;
    }
    const count = await prisma.task.count();
    if (allIds.length !== count) {
        res.status(400).json({ error: "board must include every task id exactly once" });
        return;
    }
    if (count > 0) {
        const existing = await prisma.task.findMany({ select: { id: true } });
        const existingSet = new Set(existing.map((r) => r.id));
        for (const id of allIds) {
            if (!existingSet.has(id)) {
                res.status(400).json({ error: "unknown task id in board" });
                return;
            }
        }
    }
    if (count > 0) {
        const updates = COLUMNS.flatMap((column) => board[column].map((id, sortOrder) => prisma.task.update({
            where: { id },
            data: { column, sortOrder },
        })));
        await prisma.$transaction(updates);
    }
    const rows = await prisma.task.findMany({
        orderBy: [{ column: "asc" }, { sortOrder: "asc" }],
    });
    res.json(rows.map(toTask));
});
tasksRouter.post("/", requireManagerOrAdmin, async (req, res) => {
    const body = req.body;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const column = parseColumn(body.column);
    if (!title) {
        res.status(400).json({ error: "title required" });
        return;
    }
    if (!column) {
        res.status(400).json({ error: "invalid column" });
        return;
    }
    const user = req.user;
    const maxOrder = await prisma.task.aggregate({
        where: { column },
        _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    const task = await prisma.task.create({
        data: {
            title,
            column,
            sortOrder,
            createdById: user?.id ?? null,
        },
    });
    res.status(201).json(toTask(task));
});
tasksRouter.patch("/:id", requireManagerOrAdmin, async (req, res) => {
    const id = req.params.id;
    const body = req.body;
    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    if (title === undefined || title === "") {
        res.status(400).json({ error: "title required" });
        return;
    }
    const updated = await prisma.task
        .update({
        where: { id },
        data: { title },
    })
        .catch(() => null);
    if (!updated) {
        res.status(404).json({ error: "Task not found" });
        return;
    }
    res.json(toTask(updated));
});
tasksRouter.delete("/:id", requireManagerOrAdmin, async (req, res) => {
    const id = req.params.id;
    const deleted = await prisma.task.delete({ where: { id } }).catch(() => null);
    if (!deleted) {
        res.status(404).json({ error: "Task not found" });
        return;
    }
    res.status(204).send();
});
