/**
 * Production build — bundles server/index.ts (and its imports) into a
 * single CommonJS file at dist/server.cjs, which Replit autoscale runs
 * as `node dist/server.cjs`. No tsx at runtime, no npm script wrapper,
 * no path-alias resolution to negotiate.
 *
 * Strategy: esbuild bundles the server code itself and inlines the
 * shared/ schema module. Every npm package stays external (left as
 * `require()` calls that resolve from node_modules at runtime) so we
 * don't have to track a bundle allowlist as deps change. views/ and
 * public/ are read off the filesystem at runtime, so they don't need
 * to be bundled — just copied alongside dist/ at deploy time, which
 * is automatic on Replit because both directories live at the repo
 * root.
 */

import { build } from "esbuild";
import { rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });

await build({
  entryPoints: ["server/index.ts"],
  outfile: "dist/server.cjs",
  platform: "node",
  target: "node20",
  format: "cjs",
  bundle: true,
  packages: "external",
  sourcemap: "inline",
  logLevel: "info",
});
