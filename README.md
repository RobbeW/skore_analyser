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

## School weights

`js/school-weights.js` reads the "Overzicht gewichten" as pasted from Skore (subject, hours, DW/EX/EXPA weights, sub-lines such as "Frans: Basiskennis (30%)" or "SE²AL - ICT"). Built-in tables:

- **Grade 1** (`js/school-weights-grade1.js`): 7 tracks; trimesters 1–3 share one table; a subject without an exam gets its DW weight × 3 (every subject = 3 × lesson hours).
- **Grade 2** (`js/school-weights-grade2.js`): 18 tracks × Semester 1, Semester 2 and Jaar. Exam subjects weigh 4 × hours (S1) and 6 × hours (S2); subjects without an exam 1 ×, 1.5 × and 2.5 × (Jaar). Sub-lines carry the DW weight of the subject above them; that subject's own numbers are then its exam weights (EX, EXPA).

Use:

- **Klastitularis:** when a report has no algemeen totaal, the pupil total is the school-weighted average. Dagelijks werk / Klassenraad reports use only the DW weights of their semester (no exams yet); semester reports use that semester's totals; the year report uses S1 + S2 + Jaar. The check screen shows the table in use.
- **Vakleerkracht:** baskets are prefilled from the subject's weights (grade 1: DW/EX per trimester; grade 2: DW1/EX1 from S1, DW2/EXPAR/EX2 from S2).

- **Grade 3** (`js/school-weights-grade3.js`): the 5th year, 14 tracks × Semester 1, Semester 2 and Jaar, same rules as grade 2. GWI, LWI and WWI have a 6- and an 8-hour Wiskunde variant; the class code decides (`5WWI8` → 8), otherwise the 6-hour variant is used. The 6th year (`js/school-weights-grade3-y6.js`, 15 tracks) adds GL3/GL4 (3 or 4 hours Wiskunde; `6GL4` → 4, otherwise GL3).

The regression script checks every table against these hours rules. 3GLST SE²AL is stored corrected (it was a slip in Skore).

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
