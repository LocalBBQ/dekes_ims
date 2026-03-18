import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

export interface SessionUser {
  id: string;
  email: string;
  role: string;
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    req.session?.destroy(() => {});
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as Request & { user: SessionUser }).user = user as SessionUser;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as Request & { user?: SessionUser }).user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
