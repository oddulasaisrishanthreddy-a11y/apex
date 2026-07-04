# Troubleshooting

Common issues and quick fixes:

- JSON parse errors when loading `database_state.json` or backups:
  - Run `node -e "JSON.parse(require('fs').readFileSync('database_state.json','utf8')); console.log('OK')"` to validate.
  - Repair the file at the reported line number or restore from backup.
- Port in use: set `PORT` in `.env` or kill the process occupying the port.
- Missing env keys: add required keys to `.env` (Firebase, AI keys).
- Dependency errors: remove `node_modules` and reinstall with `npm ci`.

If you need help interpreting server logs, share the tail of the running terminal and I can help diagnose.
