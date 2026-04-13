/**
 * CRUD routes for every editable content table plus the
 * singleton site_settings row and a read view for contact
 * submissions.
 *
 * Design: one route module, one small config block per entity.
 * Each entity gets GET list / GET new / POST new / GET edit /
 * POST edit / POST delete, all behind requireAdmin. Forms post
 * as application/x-www-form-urlencoded (matching simple <form>
 * elements) and flash a success/error message back via the
 * session object.
 */

import type { Express, Request, Response } from "express";
import { eq, asc, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.ts";
import { requireAdmin } from "../auth.ts";
import {
  projects,
  services,
  serviceFeatures,
  studioValues,
  teamMembers,
  timelineEntries,
  stats,
  processSteps,
  siteSettings,
  contactSubmissions,
} from "@shared/schema";

/* ─── Flash helper ─── */

type Flash = { type: "success" | "error" | "info"; message: string };

declare module "express-session" {
  interface SessionData {
    flash?: Flash;
  }
}

function setFlash(req: Request, flash: Flash): void {
  if (req.session) req.session.flash = flash;
}

function takeFlash(req: Request): Flash | null {
  const f = req.session?.flash;
  if (!f) return null;
  if (req.session) delete req.session.flash;
  return f;
}

/* ─── Zod coercion helpers ─── */

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const requiredText = z.string().trim().min(1);

const coercedInt = z.preprocess((v) => {
  if (v === "" || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}, z.number().int());

const coercedOptionalInt = z.preprocess((v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}, z.number().int().nullable());

const coercedBool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/* ─── Project schema ─── */

const projectFormSchema = z.object({
  slug: requiredText.regex(/^[a-z0-9-]+$/, "Slug must be kebab-case"),
  title: requiredText,
  category: z.enum(["residential", "commercial", "cultural", "interior", "sustainable"]),
  location: optionalText.transform((v) => v ?? ""),
  year: coercedOptionalInt,
  meta: optionalText.transform((v) => v ?? ""),
  description: optionalText,
  gradientCss: optionalText,
  featured: coercedBool,
  sortOrder: coercedInt.default(0),
  published: coercedBool,
});

/* ─── Service schema ─── */

const serviceFormSchema = z.object({
  slug: requiredText.regex(/^[a-z0-9-]+$/, "Slug must be kebab-case"),
  number: requiredText,
  title: requiredText,
  description: requiredText,
  detailBody: optionalText,
  detailBgClass: optionalText,
  sortOrder: coercedInt.default(0),
  // Features are submitted as two parallel arrays from repeating
  // inputs in the edit form, parsed below.
});

/* ─── Other entity schemas ─── */

const studioValueSchema = z.object({
  number: requiredText,
  title: requiredText,
  description: requiredText,
  sortOrder: coercedInt.default(0),
});

const teamSchema = z.object({
  name: requiredText,
  role: requiredText,
  gradientVariant: z.preprocess((v) => Number(v), z.number().int().min(1).max(4)),
  bio: optionalText,
  sortOrder: coercedInt.default(0),
});

const timelineSchema = z.object({
  year: requiredText,
  title: requiredText,
  description: requiredText,
  sortOrder: coercedInt.default(0),
});

const statsSchema = z.object({
  count: coercedInt,
  suffix: optionalText.transform((v) => v ?? ""),
  label: requiredText,
  sortOrder: coercedInt.default(0),
});

const processStepSchema = z.object({
  stepNumber: requiredText,
  title: requiredText,
  description: requiredText,
  sortOrder: coercedInt.default(0),
});

const siteSettingsSchema = z.object({
  address: requiredText,
  phone: requiredText,
  email: requiredText.email(),
  officeHours: requiredText,
  tagline: requiredText,
  instagramUrl: optionalText,
  facebookUrl: optionalText,
  twitterUrl: optionalText,
  youtubeUrl: optionalText,
  copyrightYear: coercedInt,
});

/* ─── Helpers to render with shell ─── */

function renderAdmin(
  res: Response,
  req: Request,
  view: string,
  section: string,
  heading: string,
  locals: Record<string, unknown> = {},
  headerAction?: { label: string; href: string },
): void {
  res.render(view, {
    user: req.user,
    section,
    heading,
    flash: takeFlash(req),
    headerAction,
    ...locals,
  });
}

/* ────────────────────────────────────────────────
   Register routes
   ──────────────────────────────────────────────── */

export function registerAdminCrudRoutes(app: Express): void {
  /* ─── Projects ─── */

  app.get("/admin/projects", requireAdmin, async (req, res, next) => {
    try {
      const rows = await db
        .select()
        .from(projects)
        .orderBy(asc(projects.sortOrder), asc(projects.id));
      renderAdmin(
        res,
        req,
        "admin/projects/list",
        "projects",
        "Projects",
        { projects: rows },
        { label: "+ New project", href: "/admin/projects/new" },
      );
    } catch (err) {
      next(err);
    }
  });

  app.get("/admin/projects/new", requireAdmin, (req, res) => {
    renderAdmin(res, req, "admin/projects/edit", "projects", "New project", {
      project: null,
      errors: null,
      values: { slug: "", title: "", category: "residential", location: "", year: "", meta: "", description: "", gradientCss: "linear-gradient(145deg, #2c3e6b, #0f1a30)", featured: false, sortOrder: 0, published: true },
    });
  });

  app.post("/admin/projects/new", requireAdmin, async (req, res, next) => {
    const parsed = projectFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return renderAdmin(res, req, "admin/projects/edit", "projects", "New project", {
        project: null,
        errors: parsed.error.flatten().fieldErrors,
        values: req.body,
      });
    }
    try {
      await db.insert(projects).values(parsed.data);
      setFlash(req, { type: "success", message: "Project created." });
      res.redirect("/admin/projects");
    } catch (err) {
      next(err);
    }
  });

  app.get("/admin/projects/:id/edit", requireAdmin, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      if (!row) {
        setFlash(req, { type: "error", message: "Project not found." });
        return res.redirect("/admin/projects");
      }
      renderAdmin(res, req, "admin/projects/edit", "projects", `Edit: ${row.title}`, {
        project: row,
        errors: null,
        values: { ...row, year: row.year ?? "", description: row.description ?? "", gradientCss: row.gradientCss ?? "" },
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/admin/projects/:id/edit", requireAdmin, async (req, res, next) => {
    const id = Number(req.params.id);
    const parsed = projectFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return renderAdmin(res, req, "admin/projects/edit", "projects", "Edit project", {
        project: { id },
        errors: parsed.error.flatten().fieldErrors,
        values: req.body,
      });
    }
    try {
      await db
        .update(projects)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(projects.id, id));
      setFlash(req, { type: "success", message: "Project updated." });
      res.redirect("/admin/projects");
    } catch (err) {
      next(err);
    }
  });

  app.post("/admin/projects/:id/delete", requireAdmin, async (req, res, next) => {
    try {
      await db.delete(projects).where(eq(projects.id, Number(req.params.id)));
      setFlash(req, { type: "success", message: "Project deleted." });
      res.redirect("/admin/projects");
    } catch (err) {
      next(err);
    }
  });

  /* ─── Services (with features) ─── */

  app.get("/admin/services", requireAdmin, async (req, res, next) => {
    try {
      const svcs = await db
        .select()
        .from(services)
        .orderBy(asc(services.sortOrder), asc(services.id));
      const feats = await db.select().from(serviceFeatures);
      const featureCount = new Map<number, number>();
      for (const f of feats) featureCount.set(f.serviceId, (featureCount.get(f.serviceId) ?? 0) + 1);
      renderAdmin(
        res,
        req,
        "admin/services/list",
        "services",
        "Services",
        { services: svcs, featureCount: Object.fromEntries(featureCount) },
        { label: "+ New service", href: "/admin/services/new" },
      );
    } catch (err) {
      next(err);
    }
  });

  app.get("/admin/services/new", requireAdmin, (req, res) => {
    renderAdmin(res, req, "admin/services/edit", "services", "New service", {
      service: null,
      features: [],
      errors: null,
      values: { slug: "", number: "", title: "", description: "", detailBody: "", detailBgClass: "sd-bg-1", sortOrder: 0 },
    });
  });

  app.post("/admin/services/new", requireAdmin, async (req, res, next) => {
    const parsed = serviceFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return renderAdmin(res, req, "admin/services/edit", "services", "New service", {
        service: null,
        features: [],
        errors: parsed.error.flatten().fieldErrors,
        values: req.body,
      });
    }
    try {
      const [inserted] = await db.insert(services).values(parsed.data).returning();
      const featureLabels = parseFeatureList(req.body.featureLabels);
      if (featureLabels.length > 0) {
        await db
          .insert(serviceFeatures)
          .values(featureLabels.map((label, i) => ({ serviceId: inserted.id, label, sortOrder: i })));
      }
      setFlash(req, { type: "success", message: "Service created." });
      res.redirect("/admin/services");
    } catch (err) {
      next(err);
    }
  });

  app.get("/admin/services/:id/edit", requireAdmin, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [row] = await db.select().from(services).where(eq(services.id, id)).limit(1);
      if (!row) {
        setFlash(req, { type: "error", message: "Service not found." });
        return res.redirect("/admin/services");
      }
      const feats = await db
        .select()
        .from(serviceFeatures)
        .where(eq(serviceFeatures.serviceId, id))
        .orderBy(asc(serviceFeatures.sortOrder), asc(serviceFeatures.id));
      renderAdmin(res, req, "admin/services/edit", "services", `Edit: ${row.title}`, {
        service: row,
        features: feats,
        errors: null,
        values: { ...row, detailBody: row.detailBody ?? "", detailBgClass: row.detailBgClass ?? "" },
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/admin/services/:id/edit", requireAdmin, async (req, res, next) => {
    const id = Number(req.params.id);
    const parsed = serviceFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return renderAdmin(res, req, "admin/services/edit", "services", "Edit service", {
        service: { id },
        features: [],
        errors: parsed.error.flatten().fieldErrors,
        values: req.body,
      });
    }
    try {
      await db.update(services).set(parsed.data).where(eq(services.id, id));
      // Replace features: wipe and re-insert. Cheap for ≤10 items and
      // avoids diffing logic we don't need.
      await db.delete(serviceFeatures).where(eq(serviceFeatures.serviceId, id));
      const featureLabels = parseFeatureList(req.body.featureLabels);
      if (featureLabels.length > 0) {
        await db
          .insert(serviceFeatures)
          .values(featureLabels.map((label, i) => ({ serviceId: id, label, sortOrder: i })));
      }
      setFlash(req, { type: "success", message: "Service updated." });
      res.redirect("/admin/services");
    } catch (err) {
      next(err);
    }
  });

  app.post("/admin/services/:id/delete", requireAdmin, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      // Cascading delete handled by the schema's onDelete: "cascade".
      await db.delete(services).where(eq(services.id, id));
      setFlash(req, { type: "success", message: "Service deleted." });
      res.redirect("/admin/services");
    } catch (err) {
      next(err);
    }
  });

  /* ─── Studio values ─── */

  registerSimpleCrud(app, {
    table: studioValues,
    pathSegment: "values",
    section: "values",
    singular: "Value",
    plural: "Studio values",
    schema: studioValueSchema,
    emptyValues: { number: "", title: "", description: "", sortOrder: 0 },
    listFields: ["number", "title"],
  });

  /* ─── Team members ─── */

  registerSimpleCrud(app, {
    table: teamMembers,
    pathSegment: "team",
    section: "team",
    singular: "Team member",
    plural: "Team",
    schema: teamSchema,
    emptyValues: { name: "", role: "", gradientVariant: 1, bio: "", sortOrder: 0 },
    listFields: ["name", "role"],
  });

  /* ─── Timeline entries ─── */

  registerSimpleCrud(app, {
    table: timelineEntries,
    pathSegment: "timeline",
    section: "timeline",
    singular: "Timeline entry",
    plural: "Timeline",
    schema: timelineSchema,
    emptyValues: { year: "", title: "", description: "", sortOrder: 0 },
    listFields: ["year", "title"],
  });

  /* ─── Stats ─── */

  registerSimpleCrud(app, {
    table: stats,
    pathSegment: "stats",
    section: "stats",
    singular: "Stat",
    plural: "Stats",
    schema: statsSchema,
    emptyValues: { count: 0, suffix: "", label: "", sortOrder: 0 },
    listFields: ["count", "label"],
  });

  /* ─── Process steps ─── */

  registerSimpleCrud(app, {
    table: processSteps,
    pathSegment: "process-steps",
    section: "process",
    singular: "Process step",
    plural: "Process steps",
    schema: processStepSchema,
    emptyValues: { stepNumber: "", title: "", description: "", sortOrder: 0 },
    listFields: ["stepNumber", "title"],
  });

  /* ─── Site settings (singleton) ─── */

  app.get("/admin/site-settings", requireAdmin, async (req, res, next) => {
    try {
      const [row] = await db.select().from(siteSettings).limit(1);
      if (!row) {
        setFlash(req, { type: "error", message: "Site settings row missing — run `npm run db:seed`." });
        return res.redirect("/admin");
      }
      renderAdmin(res, req, "admin/site-settings", "settings", "Site settings", {
        values: row,
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/admin/site-settings", requireAdmin, async (req, res, next) => {
    const parsed = siteSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return renderAdmin(res, req, "admin/site-settings", "settings", "Site settings", {
        values: req.body,
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    try {
      const [existing] = await db.select().from(siteSettings).limit(1);
      if (!existing) {
        await db.insert(siteSettings).values(parsed.data);
      } else {
        await db
          .update(siteSettings)
          .set({ ...parsed.data, updatedAt: new Date() })
          .where(eq(siteSettings.id, existing.id));
      }
      setFlash(req, { type: "success", message: "Site settings saved." });
      res.redirect("/admin/site-settings");
    } catch (err) {
      next(err);
    }
  });

  /* ─── Contact submissions (read-only list) ─── */

  app.get("/admin/submissions", requireAdmin, async (req, res, next) => {
    try {
      const rows = await db
        .select()
        .from(contactSubmissions)
        .orderBy(desc(contactSubmissions.createdAt));
      renderAdmin(res, req, "admin/submissions", "submissions", "Contact enquiries", {
        submissions: rows,
      });
    } catch (err) {
      next(err);
    }
  });
}

/* ─── Service features parser ─── */

function parseFeatureList(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((s) => String(s).trim()).filter((s) => s.length > 0);
  }
  if (typeof input === "string") {
    // Textarea: one feature per line
    return input
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

/* ─── Generic CRUD registration for simple content tables ─── */

interface SimpleCrudConfig<Schema extends z.ZodType> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any;
  pathSegment: string;
  section: string;
  singular: string;
  plural: string;
  schema: Schema;
  emptyValues: Record<string, unknown>;
  listFields: string[];
}

function registerSimpleCrud<Schema extends z.ZodType>(
  app: Express,
  config: SimpleCrudConfig<Schema>,
): void {
  const base = `/admin/${config.pathSegment}`;
  const viewBase = `admin/${config.pathSegment}`;
  const { table } = config;

  app.get(base, requireAdmin, async (req, res, next) => {
    try {
      const rows = await db.select().from(table).orderBy(asc(table.sortOrder), asc(table.id));
      renderAdmin(
        res,
        req,
        `${viewBase}/list`,
        config.section,
        config.plural,
        { rows, listFields: config.listFields, pathSegment: config.pathSegment },
        { label: `+ New ${config.singular.toLowerCase()}`, href: `${base}/new` },
      );
    } catch (err) {
      next(err);
    }
  });

  app.get(`${base}/new`, requireAdmin, (req, res) => {
    renderAdmin(res, req, `${viewBase}/edit`, config.section, `New ${config.singular.toLowerCase()}`, {
      row: null,
      values: config.emptyValues,
      errors: null,
      pathSegment: config.pathSegment,
    });
  });

  app.post(`${base}/new`, requireAdmin, async (req, res, next) => {
    const parsed = config.schema.safeParse(req.body);
    if (!parsed.success) {
      return renderAdmin(res, req, `${viewBase}/edit`, config.section, `New ${config.singular.toLowerCase()}`, {
        row: null,
        values: req.body,
        errors: (parsed.error as z.ZodError).flatten().fieldErrors,
        pathSegment: config.pathSegment,
      });
    }
    try {
      await db.insert(table).values(parsed.data as Record<string, unknown>);
      setFlash(req, { type: "success", message: `${config.singular} created.` });
      res.redirect(base);
    } catch (err) {
      next(err);
    }
  });

  app.get(`${base}/:id/edit`, requireAdmin, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1);
      if (!row) {
        setFlash(req, { type: "error", message: `${config.singular} not found.` });
        return res.redirect(base);
      }
      renderAdmin(res, req, `${viewBase}/edit`, config.section, `Edit ${config.singular.toLowerCase()}`, {
        row,
        values: row,
        errors: null,
        pathSegment: config.pathSegment,
      });
    } catch (err) {
      next(err);
    }
  });

  app.post(`${base}/:id/edit`, requireAdmin, async (req, res, next) => {
    const id = Number(req.params.id);
    const parsed = config.schema.safeParse(req.body);
    if (!parsed.success) {
      return renderAdmin(res, req, `${viewBase}/edit`, config.section, `Edit ${config.singular.toLowerCase()}`, {
        row: { id },
        values: req.body,
        errors: (parsed.error as z.ZodError).flatten().fieldErrors,
        pathSegment: config.pathSegment,
      });
    }
    try {
      await db.update(table).set(parsed.data as Record<string, unknown>).where(eq(table.id, id));
      setFlash(req, { type: "success", message: `${config.singular} updated.` });
      res.redirect(base);
    } catch (err) {
      next(err);
    }
  });

  app.post(`${base}/:id/delete`, requireAdmin, async (req, res, next) => {
    try {
      await db.delete(table).where(eq(table.id, Number(req.params.id)));
      setFlash(req, { type: "success", message: `${config.singular} deleted.` });
      res.redirect(base);
    } catch (err) {
      next(err);
    }
  });
}
