import type { Express } from "express";

/**
 * Public page routes.
 *
 * Today these just render the EJS templates with no data — the templates
 * still contain their original hardcoded content. The next milestone is to
 * load site content from Postgres (projects, team, services, etc.) and pass
 * it as locals to res.render() here, replacing the hardcoded HTML sections
 * with EJS loops.
 */
export function registerPageRoutes(app: Express): void {
  app.get("/", (_req, res) => {
    res.render("index");
  });

  app.get("/about", (_req, res) => {
    res.render("about");
  });

  app.get("/services", (_req, res) => {
    res.render("services");
  });

  app.get("/projects", (_req, res) => {
    res.render("projects");
  });

  app.get("/contact", (_req, res) => {
    res.render("contact");
  });
}
