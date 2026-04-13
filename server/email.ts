/**
 * Resend-backed email sender for contact-form notifications.
 * Lazily constructs the client so missing RESEND_API_KEY doesn't crash
 * startup — it just logs a warning and skips sending, letting the DB
 * insert still succeed so the submission isn't lost.
 */

import { Resend } from "resend";
import type { ContactSubmission } from "@shared/schema";

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cachedClient = new Resend(key);
  return cachedClient;
}

export async function sendContactNotification(submission: ContactSubmission): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping contact notification email");
    return;
  }

  const notifyTo = process.env.CONTACT_NOTIFY_EMAIL ?? "info@albertium.com";
  const from = process.env.CONTACT_FROM_EMAIL ?? "Albertium <onboarding@resend.dev>";

  const subject = `New enquiry from ${submission.name}`;
  const lines = [
    `Name: ${submission.name}`,
    `Email: ${submission.email}`,
    `Phone: ${submission.phone || "(not provided)"}`,
    `Project type: ${submission.projectType || "(not provided)"}`,
    `Budget: ${submission.budget || "(not provided)"}`,
    `Timeline: ${submission.timeline || "(not provided)"}`,
    "",
    "Description:",
    submission.description || "(no description)",
    "",
    `Received: ${submission.createdAt.toISOString()}`,
  ];

  const text = lines.join("\n");
  const html = lines
    .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
    .join("<br>");

  try {
    const { error } = await client.emails.send({
      from,
      to: [notifyTo],
      replyTo: submission.email,
      subject,
      text,
      html,
    });
    if (error) {
      console.error("[email] Resend returned error:", error);
    }
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}
