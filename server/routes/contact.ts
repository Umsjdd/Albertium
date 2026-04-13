import type { Express, Request } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { insertContactSubmission } from "../storage.ts";
import { sendContactNotification } from "../email.ts";

/**
 * Public contact-form endpoint. Accepts JSON from the 4-step inline
 * form on /contact, validates with zod, inserts into Postgres, fires
 * a Resend notification email (best-effort), and returns {ok: true}.
 *
 * Rate-limited to 5 submissions per IP per 15 minutes to stop casual
 * form-spam without blocking a family of designers behind one NAT.
 */

const submissionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Invalid email").max(320),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  projectType: z.string().trim().max(100).optional().or(z.literal("")),
  budget: z.string().trim().max(100).optional().or(z.literal("")),
  timeline: z.string().trim().max(100).optional().or(z.literal("")),
  source: z.enum(["inline", "modal"]).default("inline"),
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many submissions — please try again later." },
});

function getClientIp(req: Request): string | null {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0]?.trim() ?? null;
  return req.ip ?? null;
}

export function registerContactRoutes(app: Express): void {
  app.post("/api/contact", contactLimiter, async (req, res) => {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: "Invalid submission",
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
    }

    const data = parsed.data;
    try {
      const inserted = await insertContactSubmission({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        description: data.description || null,
        projectType: data.projectType || null,
        budget: data.budget || null,
        timeline: data.timeline || null,
        source: data.source,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] ?? null,
      });

      // Fire-and-forget the notification email — we do NOT want an SMTP
      // glitch to make the user think the form failed. Errors are logged
      // inside sendContactNotification.
      void sendContactNotification(inserted);

      return res.status(201).json({ ok: true, id: inserted.id });
    } catch (err) {
      console.error("[contact] failed to save submission:", err);
      return res.status(500).json({ ok: false, error: "Server error — please try again." });
    }
  });
}
