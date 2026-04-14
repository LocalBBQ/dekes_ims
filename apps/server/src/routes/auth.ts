import { createHash, randomBytes } from "node:crypto";
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { getPublicAppUrl, isSmtpConfigured, sendPasswordResetEmail } from "../lib/mail.js";
import type { ForgotPasswordBody, LoginBody, ResetPasswordBody } from "@shop-inventory/shared";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim()) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  return "dev-jwt-secret-change-in-production";
}

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_MS = 60 * 60 * 1000;

function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

const FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email, you will receive a password reset link shortly.";

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

authRouter.post("/logout", (req: Request, res: Response): void => {
  res.json({ ok: true });
});

authRouter.post("/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as ForgotPasswordBody;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    res.status(400).json({ error: "Email required" });
    return;
  }
  if (process.env.NODE_ENV === "production" && !isSmtpConfigured()) {
    res.status(503).json({ error: "Password reset email is temporarily unavailable." });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.json({ ok: true, message: FORGOT_PASSWORD_MESSAGE });
    return;
  }
  const rawToken = randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_MS);
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
  ]);
  const base = getPublicAppUrl();
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    console.error("sendPasswordResetEmail:", err);
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  }
  res.json({ ok: true, message: FORGOT_PASSWORD_MESSAGE });
});

authRouter.post("/reset-password", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as ResetPasswordBody;
  const rawToken = typeof body.token === "string" ? body.token.trim() : "";
  const password = body.password;
  if (!rawToken || password === undefined || password === null) {
    res.status(400).json({ error: "Token and password required" });
    return;
  }
  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  const tokenHash = hashResetToken(rawToken);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.expiresAt.getTime() < Date.now()) {
    res.status(400).json({
      error: "Invalid or expired reset link. Request a new one from the login page.",
    });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } }),
  ]);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: { id: string } }).user;
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
