# Local Orientation Evidence Dashboard - MVP Notes

## Mission Targets

The MVP is a static, client-side web app for GitHub Pages. It must transform a Skore Excel export into transparent, printable student evidence cards without a backend, analytics, telemetry, cloud storage, or AI decisions.

The implemented workflow follows the brief:

1. Upload an Excel workbook or load one of the local example files.
2. Parse the workbook in-browser.
3. Detect sheets, class blocks, student rows, assignments, dates, categories, maximum scores, scores, summary sheets, and comments.
4. Let the teacher correct categories, maximum points, required/active status, subject, and threshold.
5. Compute weighted totals, coverage, percentiles, class statistics, trends, DW/exam gaps, and deterministic flags.
6. Render class overview first, then searchable/filterable student cards.
7. Export anonymised CSV, explicit local JSON, or print to PDF.

## File Tree

```text
skore_analyser/
|-- index.html
|-- css/
|   |-- main.css
|   `-- print.css
|-- js/
|   |-- app.js
|   |-- calculator.js
|   |-- config.js
|   |-- exporter.js
|   |-- renderer.js
|   |-- skore-parser.js
|   |-- storage.js
|   `-- xlsx-reader.js
|-- docs/
|   `-- mvp-analysis.md
|-- example_data/
|   |-- 1ste jaar Informatic.xlsx
|   |-- 2de jaar 1 Informatic.xlsx
|   |-- 3de jaar Design Thi.xlsx
|   `-- 3de jaar Informatic.xlsx
`-- mission_brief.md
```

## Example Data Findings

The workbooks are Skore-style Excel exports with two major worksheet shapes:

- Raw evidence sheets: title row, class row, date row, category row, maximum-points row, class-average row, then student score rows.
- Summary sheets: class and subject row, summary headers such as `DW`, `EX`, `TOT`, `PCT/100`, and optional `Vakcommentaar`.

Important edge cases found in the example data:

- Several worksheets contain multiple class blocks in one sheet, for example `3NW3` followed by `3NW4`.
- Some student rows start with `-` instead of a numbered prefix.
- Many expected score cells are blank and must be flagged rather than silently ignored.
- Summary comments appear in `Vakcommentaar` columns and should be grouped by source sheet.
- Exam sheets can be named `Kerstexamen`, `Paasexamen`, or `Eindexamen`, not only `Skore - Periode ...`.

## Implementation Choice

No SheetJS or Chart.js package was available locally, and CDN loading would weaken the offline/private deployment story. The MVP therefore includes:

- A small browser-side XLSX reader for ZIP/XML workbook parts.
- Native SVG charts for histograms, dot plots, and quartile strips.
- localStorage only for weighting presets, never for student score data.
