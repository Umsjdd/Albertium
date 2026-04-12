import type { Express } from "express";
import {
  getSiteSettings,
  listProjects,
  listServicesWithFeatures,
  listStudioValues,
  listTeamMembers,
  listTimelineEntries,
  listStats,
  listProcessSteps,
} from "../storage.ts";

/**
 * Public page routes. Each one fetches its data from Postgres in parallel
 * and hands it to the EJS template as locals. The templates loop over the
 * data to render the cards/lists that were previously hardcoded.
 */
export function registerPageRoutes(app: Express): void {
  app.get("/", async (_req, res, next) => {
    try {
      const [settings, projects, stats] = await Promise.all([
        getSiteSettings(),
        listProjects(),
        listStats(),
      ]);
      res.render("index", {
        settings,
        projects,
        featuredProjects: projects.filter((p) => p.featured),
        stats,
      });
    } catch (err) {
      next(err);
    }
  });

  app.get("/about", async (_req, res, next) => {
    try {
      const [settings, values, team, timeline] = await Promise.all([
        getSiteSettings(),
        listStudioValues(),
        listTeamMembers(),
        listTimelineEntries(),
      ]);
      res.render("about", { settings, values, team, timeline });
    } catch (err) {
      next(err);
    }
  });

  app.get("/services", async (_req, res, next) => {
    try {
      const [settings, services, stats, processSteps] = await Promise.all([
        getSiteSettings(),
        listServicesWithFeatures(),
        listStats(),
        listProcessSteps(),
      ]);
      res.render("services", { settings, services, stats, processSteps });
    } catch (err) {
      next(err);
    }
  });

  app.get("/projects", async (_req, res, next) => {
    try {
      const [settings, projects] = await Promise.all([
        getSiteSettings(),
        listProjects(),
      ]);
      res.render("projects", { settings, projects });
    } catch (err) {
      next(err);
    }
  });

  app.get("/contact", async (_req, res, next) => {
    try {
      const settings = await getSiteSettings();
      res.render("contact", { settings });
    } catch (err) {
      next(err);
    }
  });
}
