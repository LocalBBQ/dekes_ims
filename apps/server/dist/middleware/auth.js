import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
function getBearerToken(req) {
    const raw = req.headers.authorization;
    if (!raw)
        return null;
    const [type, token] = raw.split(" ");
    if (type !== "Bearer" || !token)
        return null;
    return token;
}
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (secret && secret.trim())
        return secret;
    if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET is required in production");
    }
    return "dev-jwt-secret-change-in-production";
}
export async function requireAuth(req, res, next) {
    const token = getBearerToken(req);
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    let userId = null;
    try {
        const payload = jwt.verify(token, getJwtSecret());
        if (typeof payload === "string")
            userId = null;
        else
            userId = payload.sub ?? null;
    }
    catch {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
    });
    if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    req.user = user;
    next();
}
export function requireAdmin(req, res, next) {
    const user = req.user;
    if (!user || user.role !== "admin") {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    next();
}
/** Managers and admins can create and edit shop task lists; staff is read-only. */
export function requireManagerOrAdmin(req, res, next) {
    const user = req.user;
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    next();
}
