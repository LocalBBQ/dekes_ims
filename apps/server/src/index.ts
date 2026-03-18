import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import session from "express-session";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { locationsRouter } from "./routes/locations.js";
import { categoriesRouter } from "./routes/categories.js";
import { inventoryRouter } from "./routes/inventory.js";
import { imagesRouter } from "./routes/images.js";
import { settingsRouter } from "./routes/settings.js";
import { fieldDefinitionsRouter } from "./routes/fieldDefinitions.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";

if (!isProd) {
  app.set("trust proxy", 1);
}

app.use(express.json());

const sessionSecret = process.env.SESSION_SECRET || "dev-secret-change-in-production";
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

// API routes
app.use("/api/auth", authRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/locations", requireAuth, locationsRouter);
app.use("/api/categories", requireAuth, categoriesRouter);
app.use("/api/inventory", requireAuth, inventoryRouter);
app.use("/api/inventory", requireAuth, imagesRouter);
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
