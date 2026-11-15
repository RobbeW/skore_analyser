# Skore Analyser

Skore Analyser is a local-first React/Vite tool that turns a Skore Excel export into teacher-friendly class council cards.

## Modes

- **Vakdocent**: upload one Skore workbook for one subject, choose scoring baskets, and generate subject-specific student cards.
  - Class tiles per class group (count, average, below cut-off, little evidence); the KPI tiles filter the cards.
  - Mark each signal as *opgevolgd*, *te nuanceren* or *niet relevant*.
  - **Vakfeedback exporteren**: a small JSON per subject (name, total, open signals, note) for the klastitularis.
- **Klassenleraar**: upload **1 to 4** class report workbooks (so a mid-year class council with only the first report works too), confirm periods and track, and generate cross-subject class council cards with hoofdvak-in-de-gevarenzone signals.
  - **Klasoverzicht per vak**: pupils × subjects heatmap with the number of results below 50 per subject.
  - **Klassenraad mode**: one pupil at a time (← / →), with a status (te bespreken / besproken / opvolgen), an agreed action and the teacher note.
  - **Bespreeklijst afdrukken**: an A4 class overview with the pupils to discuss.
  - **Vakfeedback importeren**: subject-teacher feedback appears next to the subject in the heatmap, cards and meeting mode (names are matched regardless of order and accents).

Both modes run entirely in the browser. Uploaded workbooks are not sent to a server.

## Design and motion

The UI shares its design system with Planner-analyse: Sint-Lievenscollege colours (navy for interaction, school red only as a decorative accent), Fira Sans with system fallbacks, and the motion tokens from `brand_motion.md` (150/260/520 ms). Tokens live at the top of `src/styles/globals.css`; `src/styles/school.css` and `src/styles/tools.css` style the components.

- `src/lib/motion.js`: entrance, count-up, line draw, bar grow, dot pop. Everything is a no-op under `prefers-reduced-motion` and in hidden tabs.
- `src/lib/use-motion.jsx`: React bindings (`CountUp`, `SlideIndicator`, `useChartReveal`, `useStagger`, `useEnter`). Charts animate only when they scroll into view.
- `src/components/brand.jsx`: launch intro (once per page load, any key/click/drag closes it) and the import overlay with real progress.

## Local Development

```powershell
pnpm install
pnpm dev
```

Open the local Vite URL shown in the terminal.

## Production Build

```powershell
pnpm build
```

The static site is generated in `dist/`.

## Regression Checks

```powershell
pnpm test
```

This parses the klassenleraar fixture workbooks, checks the expected classes and hoofdvak-in-de-gevarenzone signals, runs a production build, and verifies that fixture Excel files are not copied into `dist/`.

For a quicker data-only check:

```powershell
pnpm run test:class-teacher
```

To serve the built site locally:

```powershell
python launch_demo_server.py
```

## GitHub Pages

The repository includes `.github/workflows/pages.yml`.

After pushing to the `main` branch, GitHub Actions will:

1. install dependencies with pnpm;
2. run `pnpm test`, which includes the production build;
3. publish the generated `dist/` folder to GitHub Pages.

In GitHub, enable Pages with **Source: GitHub Actions**.

## Data Privacy

Example Excel files belong only in fixture folders such as `example_data/` and `example_folder_klassenleraar/`.

The build does not copy fixture folders into `dist`, and `.gitignore` excludes `example_data/*.xlsx` so local student spreadsheets are not committed accidentally.

The app processes uploaded workbooks in the browser.

Teacher notes and klassenraad decisions are kept in the browser's local storage per workbook/class so work is not lost on a refresh; **Gegevens wissen** removes them for the current workspace. Full project data (names and scores) is only written when the teacher explicitly saves a project file. Older versions silently stored project drafts in local storage; those are removed on start-up.

Pseudonyms in anonymised mode are fixed per pupil (class, then name order), so "Leerling 03" stays the same pupil when sorting or filtering.
