# Setup

Follow these steps to set up the project for local development.

1. Install Node.js 18+ and npm.
2. From the project root, install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root with any required environment variables. Example keys:

- `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID` — Firebase config
- `GENAI_API_KEY` — optional AI provider API key
- `NODE_ENV=development`

4. Start the dev server:

```bash
npm run dev
```

5. Visit http://localhost:3000 in your browser.

Notes:
- Dev mode uses temporary OS files for local state. Production mode writes to `.database`.
