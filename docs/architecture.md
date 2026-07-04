# Architecture

This project is a lightweight full‑stack example:

- Frontend: Vite + React, code under `src/`.
- Backend: single TypeScript server (`server.ts`) using Express and Vite middleware in development.
- State: JSON files (`database_state.json`) for local persistence; production uses `.database/` directory.
- Integrations: optional Firebase and AI (Gemini) integrations via environment variables.

Key runtime behaviors:
- The server migrates legacy root `database_state.json` into `.database/` for production deployments.
- In development, the server uses OS temp files to avoid accidental repository changes.
- The server exposes a REST API used by the frontend; see `docs/api.md` and `docs/openapi.yaml`.
