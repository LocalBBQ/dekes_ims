import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
export const usersRouter = Router();
usersRouter.use(requireAdmin);
function toUser(row) {
    return {
        id: row.id,
        email: row.email,
        role: row.role,
        createdAt: row.createdAt.toISOString(),
    };
}
usersRouter.get("/", async (_req, res) => {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true, role: true, createdAt: true },
    });
    res.json(users.map(toUser));
});
usersRouter.post("/", async (req, res) => {
    const body = req.body;
    const email = body.email?.trim();
    const password = body.password;
    const role = body.role === "admin" || body.role === "manager" || body.role === "staff" ? body.role : "staff";
    if (!email) {
        res.status(400).json({ error: "email required" });
        return;
    }
    if (!password || password.length < 6) {
        res.status(400).json({ error: "password required (min 6 characters)" });
        return;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        res.status(400).json({ error: "User with this email already exists" });
        return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { email, passwordHash, role },
        select: { id: true, email: true, role: true, createdAt: true },
    });
    res.status(201).json(toUser(user));
});
usersRouter.delete("/:id", async (req, res) => {
    const id = req.params.id;
    const currentUser = req.user;
    if (currentUser && currentUser.id === id) {
        res.status(400).json({ error: "You cannot delete your own user account." });
        return;
    }
    const deleted = await prisma.user
        .delete({
        where: { id },
        select: { id: true },
    })
        .catch(() => null);
    if (!deleted) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.status(204).send();
});
