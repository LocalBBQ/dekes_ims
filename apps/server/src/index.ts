import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { locationsRouter } from "./routes/locations.js";
import { categoriesRouter } from "./routes/categories.js";
import { inventoryRouter } from "./routes/inventory.js";
import { settingsRouter } from "./routes/settings.js";
import { fieldDefinitionsRouter } from "./routes/fieldDefinitions.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";

if (!isProd) {
  app.set("trust proxy", 1);
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === "http://localhost:5173" || origin === "http://localhost:3000") return true;
  if (origin.endsWith(".vercel.app")) return true;
  const extra = process.env.CORS_ORIGIN;
  if (extra && extra.split(",").map((s) => s.trim()).filter(Boolean).includes(origin)) return true;
  return false;
}

app.use(
  cors({
    origin: (origin, cb) => {
      cb(null, isAllowedOrigin(origin));
    },
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());

// API routes
app.use("/api/auth", authRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/locations", requireAuth, locationsRouter);
app.use("/api/categories", requireAuth, categoriesRouter);
app.use("/api/inventory", requireAuth, inventoryRouter);
app.use("/api/settings", requireAuth, settingsRouter);
app.use("/api/field-definitions", requireAuth, fieldDefinitionsRouter);

// Production: serve client (from apps/server/dist -> apps/client/dist)
if (isProd) {
  const clientDir = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });
}

const HOST = process.env.HOST ?? "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  if (HOST === "0.0.0.0") {
    console.log("  (reachable from other devices on your network)");
  }
});
