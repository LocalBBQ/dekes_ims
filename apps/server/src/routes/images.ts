import path from "node:path";
import fs from "node:fs";
import { Router, Request, Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma.js";

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

function getFilePath(stored: string): string {
  return path.isAbsolute(stored) ? stored : path.join(uploadDir, stored);
}

export const imagesRouter = Router();

// POST /api/inventory/:itemId/images - multipart, optional fieldDefinitionId
imagesRouter.post(
  "/:itemId/images",
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    const itemId = req.params.itemId;
    const fieldDefinitionId = (req.body?.fieldDefinitionId as string) || null;
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      res.status(400).json({ error: "file required" });
      return;
    }
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) {
      fs.promises.unlink(file.path).catch(() => {});
      res.status(404).json({ error: "Item not found" });
      return;
    }
    const filename = path.basename(file.path);
    const image = await prisma.itemImage.create({
      data: {
        itemId,
        fieldDefinitionId: fieldDefinitionId || null,
        filePathOrUrl: filename,
      },
    });
    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { updatedAt: new Date() },
    });
    res.status(201).json({
      id: image.id,
      itemId: image.itemId,
      fieldDefinitionId: image.fieldDefinitionId,
      filePathOrUrl: image.filePathOrUrl,
      createdAt: image.createdAt.toISOString(),
    });
  }
);

// GET /api/inventory/:itemId/images/:imageId - serve file (auth already applied to router)
imagesRouter.get("/:itemId/images/:imageId", async (req: Request, res: Response): Promise<void> => {
  const { itemId, imageId } = req.params;
  const image = await prisma.itemImage.findFirst({
    where: { id: imageId, itemId },
  });
  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  const fullPath = getFilePath(image.filePathOrUrl);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(fullPath);
});

// DELETE /api/inventory/:itemId/images/:imageId
imagesRouter.delete("/:itemId/images/:imageId", async (req: Request, res: Response): Promise<void> => {
  const { itemId, imageId } = req.params;
  const image = await prisma.itemImage.findFirst({
    where: { id: imageId, itemId },
  });
  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  fs.promises.unlink(getFilePath(image.filePathOrUrl)).catch(() => {});
  await prisma.itemImage.delete({ where: { id: imageId } });
  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { updatedAt: new Date() },
  });
  res.status(204).send();
});
