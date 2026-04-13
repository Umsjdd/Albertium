import type { Express, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { requireAdmin } from "../auth.ts";

/**
 * Admin area — login, logout, and a dashboard index. CRUD forms for
 * content tables get bolted on in routes/admin-crud.ts once the auth
 * flow is in place.
 */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts — please wait 15 minutes." },
});

export function registerAdminRoutes(app: Express): void {
  app.get("/admin/login", (req, res) => {
    const next_ = typeof req.query.next === "string" ? req.query.next : "/admin";
    res.render("admin/login", {
      next: next_,
      error: null,
      email: "",
    });
  });

  app.post(
    "/admin/login",
    loginLimiter,
    (req: Request, res: Response, routeNext: NextFunction) => {
      passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message?: string } | undefined) => {
        if (err) return routeNext(err);
        if (!user) {
          return res.status(401).render("admin/login", {
            next: typeof req.body.next === "string" ? req.body.next : "/admin",
            error: info?.message ?? "Invalid credentials",
            email: typeof req.body.email === "string" ? req.body.email : "",
          });
        }
        req.login(user, (loginErr) => {
          if (loginErr) return routeNext(loginErr);
          const dest = typeof req.body.next === "string" && req.body.next.startsWith("/admin") ? req.body.next : "/admin";
          res.redirect(dest);
        });
      })(req, res, routeNext);
    },
  );

  app.post("/admin/logout", requireAdmin, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie("albertium.sid");
        res.redirect("/admin/login");
      });
    });
  });

  app.get("/admin", requireAdmin, (req, res) => {
    res.render("admin/dashboard", { user: req.user });
  });
}
