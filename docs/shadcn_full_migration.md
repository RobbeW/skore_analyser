# shadcn/ui Migration Notes

Completed on 2026-06-17.

## What Changed

- Migrated the UI shell from static string-rendered HTML to a Vite + React app.
- Added local shadcn-style UI primitives under `src/components/ui`.
- Added `components.json` so the project has a shadcn-compatible component configuration.
- Kept the existing Skore logic in `js/` and reused it from React:
  - Excel reading
  - Skore parsing
  - score calculation
  - advice rules
  - localStorage notes/preferences
  - NL/ENG translations
- Rebuilt the user flow:
  - animated upload splash
  - step-by-step basket mapping
  - warning accordion
  - dashboard
  - clickable sortable student table
  - student cards
  - interactive chart-point modal
  - moving rondleiding highlight
  - A4 print styling
- Added a Vite build step that copies `example_data` into `dist/example_data` so sample buttons work in static demos.
- Updated `launch_demo_server.py` to serve `dist` when available.

## Brand Rules Preserved

- Primary purple: `#5200FF`
- Font stack starts with Roboto.
- Dutch remains the primary language.
- Radius stays at 8px for normal cards and controls.
- Data stays local in the browser.

## Current Commands

This machine does not expose a normal global `npm`, so the migration was built with the bundled Codex Node runtime:

```powershell
& 'C:\Users\robbe\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'node_modules\vite\bin\vite.js' build
```

For a static demo after building:

```powershell
python launch_demo_server.py
```

Then open the printed localhost URL.

## Verification

Verified with `example_data/1ste jaar Informatic.xlsx`:

- Upload splash renders.
- Demo workbook loads.
- Step 2 mapping screen appears.
- Data quality warning accordion renders.
- Analysis generation opens the dashboard.
- Dashboard rendered 50 student cards and 50 table rows.
- Clicking a table row scrolls to the student card.
- Rondleiding opens a moving highlight box.
- Chart dots open an evaluation detail modal.
- Production build succeeds.

## Optional Follow-Up

- Optionally replace the current local shadcn-style primitives with CLI-generated Tailwind variants if we want to track upstream component code more closely.
- Add a small script or PowerShell wrapper for users without npm/pnpm on PATH.
- Add visual regression screenshots for upload, mapping, dashboard, card tour, and print.
- Revisit the dashboard contrast and density after teacher feedback.
