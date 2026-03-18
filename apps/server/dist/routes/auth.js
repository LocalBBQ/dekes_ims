import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
export const authRouter = Router();
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (secret && secret.trim())
        return secret;
    if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET is required in production");
    }
    return "dev-jwt-secret-change-in-production";
}
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
    const token = jwt.sign({}, getJwtSecret(), { subject: user.id, expiresIn: "7d" });
    res.json({
        token,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
        },
    });
});
authRouter.post("/logout", (req, res) => {
    res.json({ ok: true });
});
authRouter.get("/me", requireAuth, async (req, res) => {
    const user = req.user;
    const full = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, role: true, createdAt: true },
    });
    if (!full) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    res.json({
        user: {
            id: full.id,
            email: full.email,
            role: full.role,
            createdAt: full.createdAt.toISOString(),
        },
    });
});
