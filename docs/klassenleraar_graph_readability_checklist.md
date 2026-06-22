# Klassenleraar Graph Readability Checklist

Use this checklist after `npm test` and before a demo.

## Dashboard

- The dashboard opens with the student table sorted by name A-Z.
- The statistic "Hoofdvak in de gevarenzone" is visible without opening a panel.
- The quick filter "Toon leerlingen met hoofdvak in de gevarenzone" updates the table and cards.
- Histogram labels remain readable on desktop and narrow laptop widths.
- Clicking a student row opens the matching card.

## Student Card

- The multi-subject graph fits inside the card without clipped labels.
- The solid year line is visually distinct from the pastel subject lines.
- Hover or focus states do not cover the student name, totals, or summary.
- Selecting one or more subjects makes the graph easier to read, not busier.
- The card still works when a class has three periods instead of four.

## Interpretation

- "Hoofdvak in de gevarenzone" always lists the affected subjects when possible.
- Strong stable profiles still show positive context.
- Provisional-vs-final differences are only shown for the year 3-4 period schema.
- Unknown tracks produce a calm empty/info state rather than a hard warning.

## Build Hygiene

- `npm test` passes.
- `dist` contains no `.xlsx` files.
- `dist` contains no `example_data` or `example_folder_klassenleraar` folders.
