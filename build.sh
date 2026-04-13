#!/bin/sh
set -e
# --include=dev is required: Replit's build env has NODE_ENV=production
# set, which otherwise makes `npm install` skip devDependencies — and
# drizzle-kit (used by `db:push`) lives there.
npm install --include=dev
npm run build
npm run db:push -- --force
npm run db:seed
