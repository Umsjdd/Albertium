/**
 * Thin data-access layer for the public site. Keeps Drizzle calls
 * out of the route handlers so routes stay small and testable.
 *
 * Every public page read goes through here. Admin writes and
 * contact-form inserts live in their own modules (to be added).
 */

import { asc, eq } from "drizzle-orm";
import { db } from "./db.ts";
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
  type Project,
  type ServiceWithFeatures,
  type StudioValue,
  type TeamMember,
  type TimelineEntry,
  type Stat,
  type ProcessStep,
  type SiteSettings,
  type ContactSubmission,
  type InsertContactSubmission,
} from "@shared/schema";

export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await db.select().from(siteSettings).limit(1);
  if (rows.length === 0) {
    throw new Error("site_settings is empty — run `npm run db:seed` first");
  }
  return rows[0];
}

export async function listProjects(): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.published, true))
    .orderBy(asc(projects.sortOrder), asc(projects.id));
}

export async function listServicesWithFeatures(): Promise<ServiceWithFeatures[]> {
  const svcs = await db
    .select()
    .from(services)
    .orderBy(asc(services.sortOrder), asc(services.id));
  const feats = await db
    .select()
    .from(serviceFeatures)
    .orderBy(asc(serviceFeatures.sortOrder), asc(serviceFeatures.id));
  const featuresByService = new Map<number, typeof feats>();
  for (const f of feats) {
    const bucket = featuresByService.get(f.serviceId) ?? [];
    bucket.push(f);
    featuresByService.set(f.serviceId, bucket);
  }
  return svcs.map((s) => ({ ...s, features: featuresByService.get(s.id) ?? [] }));
}

export async function listStudioValues(): Promise<StudioValue[]> {
  return db
    .select()
    .from(studioValues)
    .orderBy(asc(studioValues.sortOrder), asc(studioValues.id));
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  return db
    .select()
    .from(teamMembers)
    .orderBy(asc(teamMembers.sortOrder), asc(teamMembers.id));
}

export async function listTimelineEntries(): Promise<TimelineEntry[]> {
  return db
    .select()
    .from(timelineEntries)
    .orderBy(asc(timelineEntries.sortOrder), asc(timelineEntries.id));
}

export async function listStats(): Promise<Stat[]> {
  return db
    .select()
    .from(stats)
    .orderBy(asc(stats.sortOrder), asc(stats.id));
}

export async function listProcessSteps(): Promise<ProcessStep[]> {
  return db
    .select()
    .from(processSteps)
    .orderBy(asc(processSteps.sortOrder), asc(processSteps.id));
}

export async function insertContactSubmission(
  row: InsertContactSubmission,
): Promise<ContactSubmission> {
  const [inserted] = await db.insert(contactSubmissions).values(row).returning();
  return inserted;
}
