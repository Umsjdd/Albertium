#!/bin/sh
set -e
npm install
npm run build
npm run db:push -- --force
npm run db:seed
