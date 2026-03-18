import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import type { CreateUserBody } from "@shop-inventory/shared";

export const usersRouter = Router();

usersRouter.use(requireAdmin);

function toUser(row: { id: string; email: string; role: string; createdAt: Date }) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
  };
}

usersRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  res.json(users.map(toUser));
});

usersRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateUserBody;
  const email = body.email?.trim();
  const password = body.password;
  const role = body.role === "admin" || body.role === "staff" ? body.role : "staff";
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
