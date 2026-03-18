import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
export const authRouter = Router();
authRouter.post("/login", async (req, res) => {
    const body = req.body;
    const { email, password } = body;
    if (!email || !password) {
        res.status(400).json({ error: "Email and password required" });
        return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
    }
    req.session.userId = user.id;
    req.session.save((err) => {
        if (err) {
            console.error("Session save error:", err);
            res.status(500).json({ error: "Session error" });
            return;
        }
        res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt.toISOString(),
            },
        });
    });
});
authRouter.post("/logout", (req, res) => {
    req.session?.destroy(() => { });
    res.json({ ok: true });
});
authRouter.get("/me", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, createdAt: true },
    });
    if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    res.json({
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
        },
    });
});
