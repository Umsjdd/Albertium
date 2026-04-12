# Albertium Group — Replit Setup

Brochure site for Albertium Group (architecture studio). Express + EJS + Drizzle + Postgres, matching the `resoled-fix` stack. Static design is preserved — the server just wraps the existing HTML and will progressively replace hardcoded content with data from Postgres.

## First-run setup

1. **Provision Postgres** — Replit sidebar → Database → Create Postgres. This sets `DATABASE_URL` automatically.
2. **Set secrets** in the Replit Secrets panel (or a local `.env` when developing outside Replit — see `.env.example`):
   - `SESSION_SECRET` — generate with `openssl rand -hex 32`
   - `RESEND_API_KEY` — from resend.com
   - `CONTACT_NOTIFY_EMAIL` — where contact-form emails go (default `info@albertium.com`)
   - `CONTACT_FROM_EMAIL` — sender for notification emails
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — initial admin login, only read by the seed script
3. **Push the schema**: `npm run db:push`
4. **Seed content** (pending): `npm run db:seed` — will be added in the next milestone to load projects, team, services, etc. into the DB.
5. **Run**: `npm run dev`

## Layout

```
albertium/
├── server/
│   ├── index.ts          # Express app, static serving, CSP, page routes
│   ├── db.ts             # Drizzle + pg pool
│   └── routes/
│       └── pages.ts      # Public page routes (/, /about, /services, /projects, /contact)
├── shared/
│   └── schema.ts         # Drizzle schema — all content tables + users + sessions + submissions
├── views/                # EJS templates (renamed from .html; content still hardcoded for now)
├── public/               # Static assets (shared.css, shared.js, future images)
├── script/               # Seed and maintenance scripts
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

## Milestones

- [x] Safety-net git commit of the static prototype
- [x] Delete orphan pages (pitch/sampler/fonts) and canonicalize homepage
- [x] Drizzle schema for all site content
- [x] Express + EJS scaffold serving the existing HTML unchanged
- [ ] Seed script that populates the DB from the current hardcoded HTML
- [ ] Convert EJS templates to loop over DB content
- [ ] Admin login (`/admin`) + CRUD dashboard
- [ ] Contact form → DB + Resend notification email
- [ ] Polish pass: real map embed, real social links, replace visual placeholders

## Notes

- **Homepage is `views/index.ejs`** — this is the file previously called `demo.html`. An earlier dark-themed `index.html` was an orphan prototype and has been deleted.
- **No image assets yet** — all visuals are CSS gradients. Image upload infrastructure will be added only if the client supplies real project photography.
- **Design system lives in `public/shared.css`** — light theme, blueprint grid, blue accent (#2563EB), Cormorant Garamond + Inter.
