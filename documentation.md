# Apex E-Commerce Platform — Documentation

Purpose: provide a clear, developer-focused reference for running, developing, debugging, and extending this example e‑commerce project.

Sections:
- Overview
- Quick start
- Environment variables
- Project layout
- Server (runtime) details
- Frontend (client) details
- State & persistence
- Common commands
- Troubleshooting
- Contributing

---

## Overview

This repository is a compact full‑stack example combining a Vite + React frontend with a small TypeScript Node server (`server.ts`). It includes sample product and user data maintained in local JSON state files. The server seeds Firestore-like fallback data when a valid state file isn't present.

Intended audience: developers who want a lightweight example to prototype an e‑commerce UI and local server behavior.

## Quick start

Prerequisites:
- Node.js 18+ and npm

Install dependencies:

```bash
npm install
```

Run development (server runs with TypeScript via `tsx` and serves client via Vite):

```bash
npm run dev
```

Build production assets and the server bundle:

```bash
npm run build
npm start
```

The dev server listens at http://localhost:3000 by default. The client is served from the same process.

## Environment variables

Create a `.env` in the project root and set values needed by integrations. Typical variables used by the project:

- `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, etc. — Firebase client/server config.
- `GENAI_API_KEY` or `GEMINI_API_KEY` — optional AI provider keys used by server features.
- `NODE_ENV` — `production` or `development`.
- `PORT` — override HTTP port (server defaults to 3000 if not set).

The server will still run with fallback seeds if env values are missing, but external integrations will be disabled or limited.

## Project layout

- `server.ts` — main server process: routing, state migration, seeding, and synchronization.
- `package.json` — scripts and dependencies.
- `tsconfig.json`, `vite.config.ts` — TypeScript and Vite configuration.
- `src/` — React client source:
  - `App.tsx`, `main.tsx` — app entry points.
  - `components/` — shared UI components (`Navbar.tsx`, `Footer.tsx`, `Chatbot.tsx`).
  - `pages/` — page components (Landing, Product Details, Cart, Checkout, Admin pages).
  - `store.ts` — Redux/toolkit store setup.
  - `types.ts`, `utils.ts` — type definitions and helpers.
- `database_state.json` — project-level JSON state (products, users). This file can be large.
- `database_state_backup.json` — manually stored backup (if present).

## Server (runtime) details

Behavior highlights in `server.ts`:

- The server prefers a runtime `.database` location for persistent state when `NODE_ENV` is `production`.
- In development the server uses OS temp files (`apex_database_state.json` and `apex_database_state_backup.json`) to avoid accidental commits.
- On startup the server attempts to migrate old root state files into the `.database` folder, loads the primary state file, and falls back to a backup. If both fail it seeds default data and continues.
- State loading/parsing errors produce explicit messages (e.g. "Unterminated string in JSON"). When that happens the server will seed fallback data but you should repair the invalid JSON files to persist custom data.

API surface: the server exposes HTTP routes for application usage. The exact endpoints are defined in `server.ts` — check the file for `app.get`, `app.post`, and `app.put` calls to discover available API routes and expected payloads.

## Frontend (client) details

- Client is a Vite + React app. Routing and pages are under `src/pages` and `react-router-dom` is used for navigation.
- UI components live in `src/components` and are designed to be small and composable.
- Application state uses `@reduxjs/toolkit` and is configured in `src/store.ts`.

## State & persistence

Where state lives:

- Development mode: the server stores runtime state under the OS temporary directory with filenames `apex_database_state.json` and `apex_database_state_backup.json` so local runs do not overwrite committed files.
- Production mode: the server uses `.database/database_state.json` and `.database/database_state_backup.json` under the project root.

Repairing broken state files:

- If you see JSON parse errors on startup (e.g. `Unterminated string in JSON`), the file is malformed. Validate with:

```bash
node -e "JSON.parse(require('fs').readFileSync('database_state.json','utf8')); console.log('OK')"
```

- To repair, open the file at the reported line number and fix quoting/braces, or restore from `database_state_backup.json` or another backup.

## Common commands

- `npm install` — install deps
- `npm run dev` — run dev server (tsx)
- `npm run build` — build client + bundle server
- `npm start` — start production server from `dist/server.cjs`
- `npm run lint` — TypeScript compile check (`tsc --noEmit`)

## Troubleshooting

- JSON parsing errors: see "State & persistence" above.
- Port conflicts: set `PORT` env variable or kill the process holding the port.
- Missing env values: features depending on external APIs (Firebase, genAI) will log warnings; add the correct keys to `.env`
- Dependency issues: run `npm ci` or remove `node_modules` and reinstall.

## Testing suggestions

- This repo does not include automated tests by default. Add small unit tests for `utils.ts` and integration/smoke tests for core flows such as "browse product → add to cart → checkout" (Playwright is recommended for UI flows).

## Contributing

1. Fork the repo and create a branch for your change.
2. Run `npm install` and verify `npm run dev` runs successfully.
3. Submit a PR describing the change and rationale. Keep diffs focused.

## Notes & maintenance

- Large `database_state.json` files are easy to corrupt during manual edits. Prefer editing a copy or using programmatic scripts to update state.
- If you plan to deploy, replace local JSON-based state with a real database (Firestore, Postgres, etc.) and remove the commit of large JSON files from the repo.

---

If you want, I can:

- convert this document into `docs/` with separate pages (Architecture, DevOps, API Reference),
- extract actual API endpoints from `server.ts` and add a machine-readable OpenAPI snippet,
- or restore the single truncated product entry that was removed earlier (I can attempt to reconstruct it from backups if available).
