# Skore Analyser

Skore Analyser is a local-first React/Vite tool that turns a Skore Excel export into teacher-friendly class council cards.

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

To serve the built site locally:

```powershell
python launch_demo_server.py
```

## GitHub Pages

The repository includes `.github/workflows/pages.yml`.

After pushing to the `main` branch, GitHub Actions will:

1. install dependencies with pnpm;
2. run `pnpm build`;
3. publish the generated `dist/` folder to GitHub Pages.

In GitHub, enable Pages with **Source: GitHub Actions**.

## Data Privacy

Example Excel files belong only in `example_data/`.

The build does not copy `example_data` into `dist`, and `.gitignore` excludes `example_data/*.xlsx` so local student spreadsheets are not committed accidentally.

The app processes uploaded workbooks in the browser.
