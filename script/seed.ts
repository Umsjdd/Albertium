/**
 * Seed script — populates Postgres with the content that was hardcoded
 * into the original HTML files. Idempotent: clears and re-inserts each
 * content table on every run, so safe to re-run after schema changes
 * or copy edits. Also upserts the initial admin user from env vars.
 *
 * Usage:   npm run db:seed
 * Prereq:  npm run db:push   (to ensure the schema exists)
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pool } from "../server/db.ts";
import {
  users,
  siteSettings,
  projects,
  services,
  serviceFeatures,
  studioValues,
  teamMembers,
  timelineEntries,
  stats,
  processSteps,
} from "../shared/schema.ts";

/* ─────────────── Content ─────────────── */

const PROJECT_ROWS = [
  {
    slug: "the-meridian-house",
    title: "The Meridian House",
    category: "residential",
    location: "London",
    year: 2024,
    meta: "London, 2024",
    gradientCss: "linear-gradient(145deg, #2c3e6b, #0f1a30)",
    featured: true,
  },
  {
    slug: "azure-commercial-tower",
    title: "Azure Commercial Tower",
    category: "commercial",
    location: "Manchester",
    year: 2023,
    meta: "Manchester, 2023",
    gradientCss: "linear-gradient(145deg, #3b5998, #0d1f3c)",
    featured: false,
  },
  {
    slug: "st-barnabas-cultural-centre",
    title: "St. Barnabas Cultural Centre",
    category: "cultural",
    location: "Birmingham",
    year: 2023,
    meta: "Birmingham, 2023",
    gradientCss: "linear-gradient(145deg, #4a6fa5, #162d47)",
    featured: false,
  },
  {
    slug: "the-ivory-residence",
    title: "The Ivory Residence",
    category: "residential",
    location: "Edinburgh",
    year: 2022,
    meta: "Edinburgh, 2022",
    gradientCss: "linear-gradient(145deg, #2e5266, #0d2230)",
    featured: false,
  },
  {
    slug: "nexus-business-park",
    title: "Nexus Business Park",
    category: "commercial",
    location: "Leeds",
    year: 2022,
    meta: "Leeds, 2022",
    gradientCss: "linear-gradient(145deg, #3d5a80, #111d2e)",
    featured: false,
  },
  {
    slug: "green-terrace-villas",
    title: "Green Terrace Villas",
    category: "sustainable",
    location: "Bristol",
    year: 2023,
    meta: "Bristol, 2023",
    gradientCss: "linear-gradient(145deg, #2d6b4f, #0f3024)",
    featured: true,
  },
  {
    slug: "the-atrium-gallery",
    title: "The Atrium Gallery",
    category: "cultural",
    location: "Liverpool",
    year: 2021,
    meta: "Liverpool, 2021",
    gradientCss: "linear-gradient(145deg, #5c4a82, #1f1535)",
    featured: false,
  },
  {
    slug: "zenith-apartments",
    title: "Zenith Apartments",
    category: "residential",
    location: "Glasgow",
    year: 2024,
    meta: "Glasgow, 2024",
    gradientCss: "linear-gradient(145deg, #4a5d7a, #1a2538)",
    featured: false,
  },
  {
    slug: "horizon-office-campus",
    title: "Horizon Office Campus",
    category: "commercial",
    location: "Cardiff",
    year: 2022,
    meta: "Cardiff, 2022",
    gradientCss: "linear-gradient(145deg, #3a6b8c, #122a3d)",
    featured: false,
  },
];

const SERVICE_ROWS = [
  {
    slug: "architectural-design",
    number: "01",
    title: "Architectural Design",
    description:
      "Concept to completion. Buildings that balance innovation with timeless elegance.",
    detailBody:
      "Every building begins with a conversation. We work closely with clients to understand their vision, then translate it into spaces that exceed expectations. From initial sketches through to construction documentation, our designs balance ambition with buildability.",
    detailBgClass: "sd-bg-1",
    features: [
      "Concept Development & Feasibility",
      "Planning Applications & Approvals",
      "Construction Documentation",
    ],
  },
  {
    slug: "sustainable-design",
    number: "02",
    title: "Sustainable Design",
    description:
      "Eco-friendly materials. Energy-efficient spaces that respect the environment.",
    detailBody:
      "Sustainability isn't an add-on — it's woven into every decision. We select materials, orient buildings, and design systems that minimise environmental impact while maximising comfort and performance.",
    detailBgClass: "sd-bg-2",
    features: [
      "Energy Modelling & Passive Design",
      "Material Lifecycle Analysis",
      "BREEAM & Eco Certifications",
    ],
  },
  {
    slug: "interior-architecture",
    number: "03",
    title: "Interior Architecture",
    description:
      "Interiors that harmonize with their shell. Material, light, and spatial composition.",
    detailBody:
      "The interior is where architecture meets daily life. We design spaces that feel as intentional inside as they look outside — where every surface, fixture, and sightline has been considered.",
    detailBgClass: "sd-bg-3",
    features: [
      "Spatial Planning & Flow",
      "Material & Finish Specification",
      "Furniture & Lighting Design",
    ],
  },
  {
    slug: "consultation-planning",
    number: "04",
    title: "Consultation & Planning",
    description:
      "Feasibility to planning approval. We navigate complexity so you don't have to.",
    detailBody:
      "Navigating the planning process requires expertise and precision. We guide projects from initial feasibility through to full approval, handling the complexity so our clients can focus on their vision.",
    detailBgClass: "sd-bg-4",
    features: [
      "Site Analysis & Feasibility Studies",
      "Planning Strategy & Submissions",
      "Stakeholder Engagement",
    ],
  },
];

const STUDIO_VALUE_ROWS = [
  {
    number: "01",
    title: "Innovation",
    description:
      "Pushing boundaries while respecting context. Every project explores new possibilities.",
  },
  {
    number: "02",
    title: "Sustainability",
    description:
      "Eco-conscious design at every scale. Materials and methods that respect the planet.",
  },
  {
    number: "03",
    title: "Collaboration",
    description:
      "Great architecture is a conversation. We design with you, not just for you.",
  },
];

const TEAM_ROWS = [
  { name: "Gerard Albert", role: "Founder & Principal Architect", gradientVariant: 1 },
  { name: "Sarah Mitchell", role: "Design Director", gradientVariant: 2 },
  { name: "David Chen", role: "Head of Sustainability", gradientVariant: 3 },
  { name: "Emma Richards", role: "Project Manager", gradientVariant: 4 },
];

const TIMELINE_ROWS = [
  {
    year: "2014",
    title: "Studio Founded",
    description:
      "Gerard Albert establishes Albertium with a vision for sustainable, human-centred architecture.",
  },
  {
    year: "2016",
    title: "First Award",
    description:
      "Recognised for sustainable residential design, affirming our commitment to eco-conscious practice.",
  },
  {
    year: "2018",
    title: "100 Projects",
    description:
      "A milestone of completed works across residential, commercial, and cultural sectors.",
  },
  {
    year: "2020",
    title: "Team Expands",
    description:
      "The studio grows to 30+ professionals, bringing new disciplines and perspectives.",
  },
  {
    year: "2022",
    title: "International Work",
    description:
      "First projects outside the UK, extending our design philosophy across borders.",
  },
  {
    year: "2024",
    title: "300+ Projects",
    description:
      "A decade of architectural excellence, shaping spaces that matter around the world.",
  },
];

const STAT_ROWS = [
  { count: 300, suffix: "+", label: "Projects Completed" },
  { count: 15, suffix: "", label: "Awards Won" },
  { count: 10, suffix: "", label: "Years of Excellence" },
  { count: 50, suffix: "+", label: "Design Professionals" },
];

const PROCESS_STEP_ROWS = [
  {
    stepNumber: "01",
    title: "Discovery",
    description: "We listen. Your vision and aspirations form the foundation.",
  },
  {
    stepNumber: "02",
    title: "Design",
    description: "Concepts evolve through collaboration and 3D visualization.",
  },
  {
    stepNumber: "03",
    title: "Develop",
    description: "Precision documentation. Every detail built as designed.",
  },
  {
    stepNumber: "04",
    title: "Deliver",
    description: "Site supervision to handover. Reality exceeds the render.",
  },
];

/* ─────────────── Seed runner ─────────────── */

async function seed(): Promise<void> {
  console.log("[seed] starting…");

  // Site settings: upsert the single row (id = 1)
  const existingSettings = await db.select().from(siteSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(siteSettings).values({});
    console.log("[seed] inserted default site_settings");
  } else {
    console.log("[seed] site_settings already present, leaving as-is");
  }

  // Wipe content tables in dependency order — service_features first
  // because it references services.
  await db.execute(sql`TRUNCATE TABLE service_features, services, projects, studio_values, team_members, timeline_entries, stats, process_steps RESTART IDENTITY CASCADE`);
  console.log("[seed] truncated content tables");

  // Projects
  await db
    .insert(projects)
    .values(PROJECT_ROWS.map((row, i) => ({ ...row, sortOrder: i })));
  console.log(`[seed] inserted ${PROJECT_ROWS.length} projects`);

  // Services + features
  for (const [i, svc] of SERVICE_ROWS.entries()) {
    const [inserted] = await db
      .insert(services)
      .values({
        slug: svc.slug,
        number: svc.number,
        title: svc.title,
        description: svc.description,
        detailBody: svc.detailBody,
        detailBgClass: svc.detailBgClass,
        sortOrder: i,
      })
      .returning();
    await db.insert(serviceFeatures).values(
      svc.features.map((label, j) => ({
        serviceId: inserted.id,
        label,
        sortOrder: j,
      })),
    );
  }
  console.log(
    `[seed] inserted ${SERVICE_ROWS.length} services and ${SERVICE_ROWS.reduce(
      (n, s) => n + s.features.length,
      0,
    )} service features`,
  );

  // Values, team, timeline, stats, process steps
  await db
    .insert(studioValues)
    .values(STUDIO_VALUE_ROWS.map((row, i) => ({ ...row, sortOrder: i })));
  console.log(`[seed] inserted ${STUDIO_VALUE_ROWS.length} studio values`);

  await db
    .insert(teamMembers)
    .values(TEAM_ROWS.map((row, i) => ({ ...row, sortOrder: i })));
  console.log(`[seed] inserted ${TEAM_ROWS.length} team members`);

  await db
    .insert(timelineEntries)
    .values(TIMELINE_ROWS.map((row, i) => ({ ...row, sortOrder: i })));
  console.log(`[seed] inserted ${TIMELINE_ROWS.length} timeline entries`);

  await db.insert(stats).values(STAT_ROWS.map((row, i) => ({ ...row, sortOrder: i })));
  console.log(`[seed] inserted ${STAT_ROWS.length} stats`);

  await db
    .insert(processSteps)
    .values(PROCESS_STEP_ROWS.map((row, i) => ({ ...row, sortOrder: i })));
  console.log(`[seed] inserted ${PROCESS_STEP_ROWS.length} process steps`);

  // Admin user (upsert)
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db
      .insert(users)
      .values({ email: adminEmail, passwordHash, displayName: "Admin" })
      .onConflictDoUpdate({
        target: users.email,
        set: { passwordHash },
      });
    console.log(`[seed] upserted admin user ${adminEmail}`);
  } else {
    console.log("[seed] ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin user");
  }

  console.log("[seed] done.");
}

seed()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
