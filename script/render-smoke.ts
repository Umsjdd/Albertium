/**
 * Template smoke test — renders every EJS view with fake data and
 * verifies each render succeeds. Catches syntax errors and missing
 * locals without needing a live database. Run with:
 *
 *     npx tsx script/render-smoke.ts
 *
 * This script is a dev-only helper; safe to delete once we have a
 * real end-to-end test against Replit Postgres.
 */

import ejs from "ejs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viewsDir = path.join(__dirname, "..", "views");

const settings = {
  id: 1,
  address: "86 St. Barnabas Road",
  phone: "07721 632 406",
  email: "info@albertium.com",
  officeHours: "Mon – Fri: 9:00 – 18:00",
  tagline: "Sustainability meets creativity.",
  instagramUrl: null,
  facebookUrl: null,
  twitterUrl: null,
  youtubeUrl: null,
  copyrightYear: 2026,
  updatedAt: new Date(),
};

const projects = [
  {
    id: 1,
    slug: "meridian-house",
    title: "The Meridian House",
    category: "residential",
    location: "London",
    year: 2024,
    meta: "London, 2024",
    description: null,
    gradientCss: "linear-gradient(145deg, #2c3e6b, #0f1a30)",
    featured: true,
    sortOrder: 0,
    published: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    slug: "azure-tower",
    title: "Azure Commercial Tower",
    category: "commercial",
    location: "Manchester",
    year: 2023,
    meta: "Manchester, 2023",
    description: null,
    gradientCss: "linear-gradient(145deg, #3b5998, #0d1f3c)",
    featured: false,
    sortOrder: 1,
    published: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const services = [
  {
    id: 1,
    slug: "architectural-design",
    number: "01",
    title: "Architectural Design",
    description: "Concept to completion.",
    detailBody: "Every building begins with a conversation.",
    detailBgClass: "sd-bg-1",
    sortOrder: 0,
    features: [
      { id: 1, serviceId: 1, label: "Concept Development", sortOrder: 0 },
      { id: 2, serviceId: 1, label: "Planning", sortOrder: 1 },
    ],
  },
  {
    id: 2,
    slug: "sustainable-design",
    number: "02",
    title: "Sustainable Design",
    description: "Eco-friendly materials.",
    detailBody: "Sustainability isn't an add-on.",
    detailBgClass: "sd-bg-2",
    sortOrder: 1,
    features: [{ id: 3, serviceId: 2, label: "Energy Modelling", sortOrder: 0 }],
  },
];

const values = [
  { id: 1, number: "01", title: "Innovation", description: "Pushing boundaries.", sortOrder: 0 },
  { id: 2, number: "02", title: "Sustainability", description: "Eco-conscious.", sortOrder: 1 },
  { id: 3, number: "03", title: "Collaboration", description: "A conversation.", sortOrder: 2 },
];

const team = [
  { id: 1, name: "Gerard Albert", role: "Founder & Principal Architect", gradientVariant: 1, bio: null, sortOrder: 0 },
  { id: 2, name: "Sarah Mitchell", role: "Design Director", gradientVariant: 2, bio: null, sortOrder: 1 },
];

const timeline = [
  { id: 1, year: "2014", title: "Studio Founded", description: "Gerard founds the studio.", sortOrder: 0 },
  { id: 2, year: "2024", title: "300+ Projects", description: "A decade of work.", sortOrder: 1 },
];

const stats = [
  { id: 1, count: 300, suffix: "+", label: "Projects Completed", sortOrder: 0 },
  { id: 2, count: 15, suffix: "", label: "Awards Won", sortOrder: 1 },
];

const processSteps = [
  { id: 1, stepNumber: "01", title: "Discovery", description: "We listen.", sortOrder: 0 },
  { id: 2, stepNumber: "02", title: "Design", description: "Concepts evolve.", sortOrder: 1 },
];

const cases: Array<{ view: string; data: Record<string, unknown> }> = [
  { view: "index", data: { settings, projects, featuredProjects: projects.filter((p) => p.featured), stats } },
  { view: "about", data: { settings, values, team, timeline } },
  { view: "services", data: { settings, services, stats, processSteps } },
  { view: "projects", data: { settings, projects } },
  { view: "contact", data: { settings } },
];

let failed = 0;
for (const { view, data } of cases) {
  const file = path.join(viewsDir, `${view}.ejs`);
  try {
    const html = await ejs.renderFile(file, data, { async: false });
    console.log(`[smoke] ${view}.ejs OK (${html.length} bytes)`);
  } catch (err) {
    failed++;
    console.error(`[smoke] ${view}.ejs FAILED:`);
    console.error((err as Error).message);
  }
}

if (failed > 0) {
  console.error(`\n[smoke] ${failed} template(s) failed to render`);
  process.exit(1);
}
console.log("\n[smoke] all templates rendered successfully");
