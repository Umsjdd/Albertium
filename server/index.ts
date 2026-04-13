import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import path from "node:path";
import { registerPageRoutes } from "./routes/pages.ts";

// Resolve views/ and public/ relative to the process working directory.
// This works identically for `tsx server/index.ts` in dev (cwd = repo root)
// and `node dist/server.cjs` in production (cwd = repo root on Replit).
// Avoids import.meta.url, which behaves differently under esbuild's CJS bundle.
const projectRoot = process.cwd();

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.set("view engine", "ejs");
app.set("views", path.join(projectRoot, "views"));
app.disable("x-powered-by");

/* ─── Security headers ─── */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // shared.css/shared.js are self-hosted; inline styles/scripts inside
        // the EJS templates still need 'unsafe-inline' until we refactor them.
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(compression());

/* ─── Body parsing ─── */
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));

/* ─── Static assets (CSS, JS, future images) ─── */
app.use(
  express.static(path.join(projectRoot, "public"), {
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    extensions: ["html"],
  }),
);

/* ─── Tiny request logger ─── */
app.use((req, _res, next) => {
  if (req.path.startsWith("/shared.") || req.path.startsWith("/favicon")) return next();
  const start = Date.now();
  _res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${_res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

/* ─── Health check ─── */
app.get("/healthz", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

/* ─── Page routes ─── */
registerPageRoutes(app);

/* ─── 404 ─── */
app.use((req, res) => {
  res.status(404).render("index", {
    // For now, 404s fall back to home. Replace with a proper 404.ejs later.
  });
});

/* ─── Error handler ─── */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[server] unhandled error:", err);
  res.status(500).send("Something went wrong. Please try again shortly.");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`[server] Albertium listening on http://0.0.0.0:${port}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[server] uncaught exception:", err);
});
