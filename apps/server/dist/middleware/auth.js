import { prisma } from "../lib/prisma.js";
export async function requireAuth(req, res, next) {
    const userId = req.session?.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
    });
    if (!user) {
        req.session?.destroy(() => { });
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
