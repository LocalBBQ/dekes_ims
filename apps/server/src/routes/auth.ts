import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import type { LoginBody } from "@shop-inventory/shared";

export const authRouter = Router();

authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as LoginBody;
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
  (req.session as { userId?: string }).userId = user.id;
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

authRouter.post("/logout", (req: Request, res: Response): void => {
  req.session?.destroy(() => {});
  res.json({ ok: true });
});

authRouter.get("/me", async (req: Request, res: Response): Promise<void> => {
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
