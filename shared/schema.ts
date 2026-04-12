import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/* ────────────────────────────────────────────────
   Admin users (single-table, bcrypt password hash)
   ──────────────────────────────────────────────── */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => ({
    emailUnique: uniqueIndex("users_email_unique").on(t.email),
  }),
);

/* ────────────────────────────────────────────────
   Session store for connect-pg-simple
   (connect-pg-simple creates this automatically if
   `createTableIfMissing: true`, but declaring it
   here means drizzle-kit knows about it too.)
   ──────────────────────────────────────────────── */
export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6, withTimezone: false }).notNull(),
});

/* ────────────────────────────────────────────────
   Site settings — singleton row (id = 1)
   Contact info, social links, tagline, etc.
   ──────────────────────────────────────────────── */
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().default("86 St. Barnabas Road"),
  phone: text("phone").notNull().default("07721 632 406"),
  email: text("email").notNull().default("info@albertium.com"),
  officeHours: text("office_hours").notNull().default("Mon – Fri: 9:00 – 18:00"),
  tagline: text("tagline")
    .notNull()
    .default("Sustainability meets creativity. Designing spaces that move people since 2014."),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  twitterUrl: text("twitter_url"),
  youtubeUrl: text("youtube_url"),
  copyrightYear: integer("copyright_year").notNull().default(2026),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ────────────────────────────────────────────────
   Projects (projects.html — .projects-grid .pg-card)
   9 items currently, 2 featured
   ──────────────────────────────────────────────── */
export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    // residential | commercial | cultural | interior | sustainable
    category: text("category").notNull(),
    location: text("location").notNull().default(""),
    year: integer("year"),
    // Short tag/meta line shown under the title
    meta: text("meta").notNull().default(""),
    // Optional body for a future detail page
    description: text("description"),
    // CSS gradient currently used as the card background
    gradientCss: text("gradient_css"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUnique: uniqueIndex("projects_slug_unique").on(t.slug),
    categoryIdx: index("projects_category_idx").on(t.category),
  }),
);

/* ────────────────────────────────────────────────
   Services (services.html)
   4 high-level cards + 4 detail sections with feature lists
   ──────────────────────────────────────────────── */
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  // "01", "02", "03", "04" — shown in .service-num
  number: text("number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  // Longer body shown in the .detail-section for this service
  detailBody: text("detail_body"),
  // Which alternating CSS class the detail-section uses (.sd-bg-1 … .sd-bg-4)
  detailBgClass: text("detail_bg_class"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const serviceFeatures = pgTable("service_features", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const servicesRelations = relations(services, ({ many }) => ({
  features: many(serviceFeatures),
}));

export const serviceFeaturesRelations = relations(serviceFeatures, ({ one }) => ({
  service: one(services, {
    fields: [serviceFeatures.serviceId],
    references: [services.id],
  }),
}));

/* ────────────────────────────────────────────────
   Studio values (about.html — .values-grid .value-card)
   3 items
   ──────────────────────────────────────────────── */
export const studioValues = pgTable("studio_values", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ────────────────────────────────────────────────
   Team (about.html — .team-grid .team-card)
   4 items, CSS gradient backgrounds (no photos yet)
   ──────────────────────────────────────────────── */
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  // 1 | 2 | 3 | 4 — picks .team-card-bg-N gradient
  gradientVariant: integer("gradient_variant").notNull().default(1),
  bio: text("bio"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ────────────────────────────────────────────────
   Timeline (about.html — .timeline .timeline-item)
   6 items
   ──────────────────────────────────────────────── */
export const timelineEntries = pgTable("timeline_entries", {
  id: serial("id").primaryKey(),
  year: text("year").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ────────────────────────────────────────────────
   Stats (services.html — .stats-grid .stat-item)
   4 items, numeric counter animates via data-count
   ──────────────────────────────────────────────── */
export const stats = pgTable("stats", {
  id: serial("id").primaryKey(),
  // Numeric target used by shared.js counter animation
  count: integer("count").notNull(),
  // Optional suffix like "+" or "%" to render after the count
  suffix: text("suffix").notNull().default(""),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ────────────────────────────────────────────────
   Process steps (services.html — .process-timeline .process-step)
   4 items
   ──────────────────────────────────────────────── */
export const processSteps = pgTable("process_steps", {
  id: serial("id").primaryKey(),
  stepNumber: text("step_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ────────────────────────────────────────────────
   Contact submissions
   Mirrors the 4-step form (both modal + inline variants)
   ──────────────────────────────────────────────── */
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  projectType: text("project_type"),
  budget: text("budget"),
  timeline: text("timeline"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  description: text("description"),
  // Which form submitted it — "modal" or "inline"
  source: text("source").notNull().default("inline"),
  // "new" | "read" | "replied" | "archived"
  status: text("status").notNull().default("new"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ────────────────────────────────────────────────
   Zod schemas for insert validation
   ──────────────────────────────────────────────── */
export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  status: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true,
});
export const selectContactSubmissionSchema = createSelectSchema(contactSubmissions);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export const insertServiceFeatureSchema = createInsertSchema(serviceFeatures).omit({ id: true });
export const insertStudioValueSchema = createInsertSchema(studioValues).omit({ id: true });
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true });
export const insertTimelineEntrySchema = createInsertSchema(timelineEntries).omit({ id: true });
export const insertStatSchema = createInsertSchema(stats).omit({ id: true });
export const insertProcessStepSchema = createInsertSchema(processSteps).omit({ id: true });

/* ────────────────────────────────────────────────
   Inferred TypeScript types
   ──────────────────────────────────────────────── */
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type SiteSettings = typeof siteSettings.$inferSelect;

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export type Service = typeof services.$inferSelect;
export type ServiceFeature = typeof serviceFeatures.$inferSelect;
export type ServiceWithFeatures = Service & { features: ServiceFeature[] };

export type StudioValue = typeof studioValues.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type TimelineEntry = typeof timelineEntries.$inferSelect;
export type Stat = typeof stats.$inferSelect;
export type ProcessStep = typeof processSteps.$inferSelect;

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;
