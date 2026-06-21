# Skore Analyser

Skore Analyser is a local-first React/Vite tool that turns a Skore Excel export into teacher-friendly class council cards.

## Modes

- **Vakdocent**: upload one Skore workbook for one subject, choose scoring baskets, and generate subject-specific student cards.
- **Klassenleraar**: upload three or four class report workbooks, confirm periods and track, and generate cross-subject class council cards with hoofdvak-in-de-gevarenzone signals.

Both modes run entirely in the browser. Uploaded workbooks are not sent to a server.

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
