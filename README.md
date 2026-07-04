<<<<<<< HEAD
# Apex E‑Commerce Platform (Remix Mockup)

Lightweight e‑commerce example combining a Vite React frontend with a small Node/Express dev server.

## Quick Start

Prerequisites:
- Node.js 18+ and npm

Install dependencies:

```bash
npm install
```

Run in development (starts server and Vite):

```bash
npm run dev
```

Build for production and start:

```bash
npm run build
npm start
```

The app listens on http://localhost:3000 by default (see `server.ts`).

## Environment

Place env variables in a `.env` file in the project root. Typical keys used by the project:

- `FIREBASE_*` — Firebase configuration (API key, project id, etc.)
- `GEMINI_API_KEY` or `GENAI_API_KEY` — external AI API key (optional)
- `NODE_ENV` — set to `production` for production builds

If not provided, the server will seed default fallback data on first run.

## Project Layout

- `server.ts` — Express + dev server, state migration and seeding logic
- `src/` — React application source (components, pages, store)
- `database_state.json` — local project state (products, users). *May be large.*

## Troubleshooting

- JSON parse errors when loading `database_state.json` or backups: the server attempts to migrate files into a `.database` folder or uses temp copies under the OS temp dir. If you see an "Unterminated string" or similar, validate the JSON and repair or restore from a good backup.
- To validate JSON from the project root:

```bash
node -e "JSON.parse(require('fs').readFileSync('database_state.json','utf8')); console.log('OK')"
```

- If the server reports missing state files it will seed fallback data; you can inspect or replace `database_state.json` with a valid file to persist custom data.

## Development notes

- The dev script uses `tsx server.ts` to run TypeScript server code directly. The `build` script bundles server code via `esbuild` and Vite for the client.
- Lint / type check: `npm run lint` (runs `tsc --noEmit`).

## Contributing

1. Create an issue describing the change.
2. Open a PR with focused edits and a short description of the rationale.

## License

This repository has no license file by default — add a `LICENSE` if you intend to publish.

---
Generated README — edit as needed for your project specifics.
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8d1c1101-671b-46da-9ad4-8b040b49d5f6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
=======
# apex
Apex E-Commerce is a full-stack demo for online stores with a Vite + React frontend and a TypeScript Express backend. It includes product catalogs, cart, checkout, seller wallets, and order management using local JSON storage, with optional Firebase and GenAI integration. Ideal for learning and building production-ready e-commerce apps.
>>>>>>> 805b114390d225ed9c58552212bae98ad1d15ce6
