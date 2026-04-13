/**
 * Auth setup for /admin: passport-local strategy backed by bcrypt,
 * express-session with a Postgres-backed store. The session table
 * (`session`) is created automatically on first startup by
 * connect-pg-simple if missing.
 *
 * Exports:
 *  - configureAuth(app): install session + passport middleware
 *  - requireAdmin:        route guard for /admin/*
 */

import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "./db.ts";
import { users, type User } from "@shared/schema";

const PgSession = connectPgSimple(session);

declare global {
  namespace Express {
    // Tell passport what user shape we store on the session.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends Omit<UserRow, never> {}
  }
}

type UserRow = User;

async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

async function findUserById(id: number): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

passport.use(
  new LocalStrategy({ usernameField: "email", passwordField: "password" }, async (email, password, done) => {
    try {
      const user = await findUserByEmail(email.toLowerCase().trim());
      if (!user) return done(null, false, { message: "Invalid credentials" });
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return done(null, false, { message: "Invalid credentials" });
      // Update last_login_at in the background — not worth blocking login on.
      db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id)).catch((err) => {
        console.error("[auth] failed to update last_login_at:", err);
      });
      return done(null, user);
    } catch (err) {
      return done(err as Error);
    }
  }),
);

passport.serializeUser((user, done) => {
  done(null, (user as UserRow).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await findUserById(id);
    if (!user) return done(null, false);
    done(null, user);
  } catch (err) {
    done(err as Error);
  }
});

export function configureAuth(app: Express): void {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn(
      "[auth] SESSION_SECRET is not set — admin sessions will be insecure. " +
        "Set it in Replit Secrets to a long random string.",
    );
  }

  app.use(
    session({
      store: new PgSession({ pool, tableName: "session", createTableIfMissing: true }),
      secret: secret ?? "dev-insecure-secret-replace-me",
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 8, // 8 hours
      },
      name: "albertium.sid",
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());
}

/**
 * Route guard for /admin/*. Unauthenticated requests get redirected
 * to /admin/login with a ?next= parameter so we can bounce them back
 * to where they were trying to go after login.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated()) {
    next();
    return;
  }
  const next_ = encodeURIComponent(req.originalUrl || "/admin");
  res.redirect(`/admin/login?next=${next_}`);
}
