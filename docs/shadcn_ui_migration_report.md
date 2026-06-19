# shadcn/ui Review For Skore Analyser

Reviewed on 2026-06-17.

This report extracts the useful parts of shadcn/ui for the Skore Analyser UI. It does not vendor shadcn code into this repository. It translates the documentation into a practical migration path for our current static HTML/CSS/JS app.

## Sources Reviewed

- Official introduction: https://ui.shadcn.com/docs
- Official docs map for broad coverage: https://ui.shadcn.com/llms.txt
- Installation overview and Vite guide: https://ui.shadcn.com/docs/installation and https://ui.shadcn.com/docs/installation/vite
- Theming guide: https://ui.shadcn.com/docs/theming
- CLI guide: https://ui.shadcn.com/docs/cli
- `components.json` configuration guide: https://ui.shadcn.com/docs/components-json
- Component docs relevant to this app: Button, Card, Dialog, Accordion, Select, Table, Data Table, Tabs, Tooltip, Badge, Field, Input, Textarea, Progress, Skeleton, Spinner, Chart, Sheet, Empty.
- GitHub repository and license: https://github.com/shadcn-ui/ui and https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md

## Executive Summary

shadcn/ui is a strong fit for the design direction of Skore Analyser, but not as a direct drop-in dependency today. The project is currently a static vanilla app with `index.html`, `css/main.css`, `css/print.css`, and modular JavaScript renderers. shadcn/ui is built around editable React components, Tailwind CSS, Radix UI primitives, and a CLI that copies component source into a project.

Best path:

1. Adopt the shadcn design model now: semantic tokens, predictable component slots, consistent button variants, dialog shells, table patterns, form fields, badges, accordions, and chart tokens.
2. Keep the current static app stable while simplifying the UI.
3. Move to Vite + React + Tailwind + shadcn/ui later only if we want reusable stateful components, stronger accessibility primitives, or larger UI growth.

This keeps the MVP useful for teachers while giving us a clean runway to a real component system.

## Current Project Fit

Current app facts:

- Static browser-only app.
- No `package.json`, React, Vite, or Tailwind setup.
- Primary language is Dutch with NL/ENG toggle.
- Data remains local in the browser.
- CSS already uses the in-house brand foundations:
  - `--brand-purple: #5200FF`
  - `--font: Roboto, Arial, ui-sans-serif, system-ui, ...`
  - `--radius: 8px`
- Existing UI already has custom versions of cards, buttons, accordions, dialogs, sortable student tables, charts, filters, upload flow, and A4 print styling.

Conclusion:

- Direct shadcn component installation is a framework migration, not a small CSS tweak.
- Vite is the best migration target if we choose full shadcn adoption because Skore Analyser is an app, not a content site or server-rendered product.
- Print CSS must remain custom and heavily tested. shadcn can organize screen UI, but A4 output needs our own print contract.

## Usable Ideas For This App

### 1. Semantic Design Tokens

shadcn/ui recommends CSS variables such as `background`, `foreground`, `card`, `primary`, `border`, `ring`, and `chart-1`. We can map our existing variables to that vocabulary while keeping the current brand.

Recommended token bridge for `css/main.css` or a future `css/tokens.css`:

```css
:root {
  --background: #f6f7f9;
  --foreground: #1c2430;
  --card: #ffffff;
  --card-foreground: #1c2430;
  --popover: #ffffff;
  --popover-foreground: #1c2430;
  --primary: #5200FF;
  --primary-foreground: #ffffff;
  --secondary: #eef2f7;
  --secondary-foreground: #1c2430;
  --muted: #eef2f7;
  --muted-foreground: #647084;
  --accent: #efe7ff;
  --accent-foreground: #330099;
  --destructive: #b91c1c;
  --destructive-foreground: #ffffff;
  --border: #dce2ea;
  --input: #aeb9c7;
  --ring: #5200FF;
  --radius: 8px;
  --font-sans: Roboto, Arial, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --chart-1: #5200FF;
  --chart-2: #15803d;
  --chart-3: #b45309;
  --chart-4: #b91c1c;
  --chart-5: #647084;
}
```

Why this helps:

- The UI becomes less tied to one-off names like `--panel`, `--line`, and `--ink`.
- Future React/Tailwind components can use the same design language.
- Charts, buttons, focus rings, alerts, and cards become easier to keep consistent.

### 2. Component Slot Vocabulary

shadcn components are built through predictable slots. We can mirror that in current HTML/CSS.

Recommended class vocabulary:

- `ui-card`, `ui-card-header`, `ui-card-title`, `ui-card-description`, `ui-card-action`, `ui-card-content`, `ui-card-footer`
- `ui-button`, `ui-button-primary`, `ui-button-secondary`, `ui-button-outline`, `ui-button-ghost`, `ui-button-icon`, `ui-button-destructive`
- `ui-field`, `ui-label`, `ui-input`, `ui-select`, `ui-textarea`, `ui-field-help`, `ui-field-error`
- `ui-dialog`, `ui-dialog-overlay`, `ui-dialog-content`, `ui-dialog-header`, `ui-dialog-title`, `ui-dialog-description`, `ui-dialog-footer`
- `ui-accordion`, `ui-accordion-item`, `ui-accordion-trigger`, `ui-accordion-content`
- `ui-table`, `ui-table-header`, `ui-table-row`, `ui-table-cell`
- `ui-badge`, `ui-alert`, `ui-empty`, `ui-skeleton`, `ui-spinner`

This does not require React yet. It gives the vanilla renderer a more stable UI contract.

### 3. Components Worth Copying Conceptually

| shadcn element | Use in Skore Analyser | Priority |
| --- | --- | --- |
| Button | Standardize primary, secondary, outline, ghost, destructive, and icon-only actions. | High |
| Card | Student cards, mapping panels, dashboard panels, class summaries. | High |
| Dialog | Upload wizard, chart point detail modal, teacher tour. | High |
| Accordion | Data quality warnings, calculation trace, advice explanations. | High |
| Field/Input/Textarea/Select | Step 2 configuration and teacher notes. | High |
| Table/Data Table | Clickable student table, sortable columns, future pagination/column visibility. | High |
| Tabs/Toggle Group | Class group switching and compact filters. | Medium |
| Badge | Advice signals, score bands, data-quality labels. | Medium |
| Tooltip | Icon-only buttons and chart points. | Medium |
| Skeleton/Spinner/Progress | Upload parsing, generation animation, file-loading state. | Medium |
| Chart | Use chart tokens/config now; consider Recharts only after React migration. | Medium |
| Sheet/Drawer | Optional future side panel for student details or class filters. | Low |
| Sidebar | Not recommended now. The current teacher workflow needs fewer persistent controls, not more. | Low |

## Brand Mapping

Keep these in-house rules:

- Font: Roboto as the first font.
- Purple: `#5200FF` as the primary action, brand, focus, and key chart color.
- Border radius: 8px or less for cards and controls unless a very specific interaction needs a circle, such as an icon button.
- Copyright: keep the current footer and privacy message. If shadcn source code is copied later, include the MIT license notice where appropriate.
- Tone: teacher-facing, calm, beginner-friendly, Dutch-first.

Suggested shadcn token mapping:

| shadcn token | Skore value | Purpose |
| --- | --- | --- |
| `background` | `#f6f7f9` | App background |
| `foreground` | `#1c2430` | Main text |
| `card` | `#ffffff` | Panels and student cards |
| `primary` | `#5200FF` | Main actions and brand |
| `primary-foreground` | `#ffffff` | Text on purple |
| `accent` | `#efe7ff` | Soft purple surfaces |
| `accent-foreground` | `#330099` | Text on soft purple |
| `muted-foreground` | `#647084` | Secondary text |
| `border` | `#dce2ea` | Hairlines and table borders |
| `input` | `#aeb9c7` | Input borders |
| `ring` | `#5200FF` | Keyboard focus |
| `destructive` | `#b91c1c` | Strong warnings |
| `chart-1` | `#5200FF` | Primary chart series |
| `chart-2` | `#15803d` | Positive series |
| `chart-3` | `#b45309` | Caution series |
| `chart-4` | `#b91c1c` | Risk series |
| `chart-5` | `#647084` | Neutral context |

## Recommended Migration Plan

### Phase 1: shadcn-Inspired Cleanup In The Current App

This is the best next sprint because it avoids a framework rewrite.

1. Add shadcn-compatible semantic tokens to `css/main.css` or `css/tokens.css`.
2. Keep old variables as aliases during transition:
   - `--bg: var(--background)`
   - `--panel: var(--card)`
   - `--ink: var(--foreground)`
   - `--line: var(--border)`
3. Add UI contract classes beside existing classes:
   - Example: `<article class="student-card ui-card">`
   - Example: `<button class="button ui-button ui-button-primary">`
4. Refactor card sections into slot-like structure:
   - Header: learner identity, grade badge, navigation.
   - Content: score table and graph.
   - Footer/notes: teacher judgement and next-step text.
5. Standardize all buttons:
   - One primary button per screen.
   - Ghost/icon buttons for navigation.
   - Outline buttons for secondary actions.
   - Destructive only for data reset.
6. Standardize form fields in Step 2:
   - Label, input/select, helper text, error state.
   - Keep basket inputs compact and responsive.
7. Standardize accordions:
   - Data quality warning.
   - Calculation explanation.
   - Advice detail.
8. Standardize dialogs:
   - Upload modal.
   - Chart-point detail modal.
   - Student-card tour.
9. Define a chart config object in JS that maps series names to `--chart-*` tokens.
10. Add accessibility checks:
   - Visible focus ring on every interactive element.
   - Escape closes dialogs.
   - Enter/Space activates clickable table rows.
   - Dialog focus is contained.
   - Tooltip content is not required to understand the UI.

### Phase 2: Optional Vite + React + Tailwind + shadcn Migration

Choose this only when we are ready for a real frontend rewrite.

1. Create a migration branch.
2. Add a Vite React app structure.
3. Move parser/calculator/storage modules first, without changing behavior.
4. Add Tailwind and initialize shadcn/ui with CSS variables.
5. Configure `components.json`.
6. Add only the components we need:
   - `button`
   - `card`
   - `dialog`
   - `accordion`
   - `field`
   - `input`
   - `textarea`
   - `select` or `native-select`
   - `table`
   - `tabs`
   - `badge`
   - `tooltip`
   - `progress`
   - `skeleton`
   - `spinner`
   - `chart` only if we adopt Recharts
7. Port upload and mapping screens.
8. Port dashboard and student card screens.
9. Port print mode last, with A4 regression checks.
10. Run regression tests on example data and compare outputs against the vanilla app.

Recommended example `components.json` for a Vite migration:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks",
    "utils": "@/lib/utils"
  },
  "iconLibrary": "lucide"
}
```

Recommended Tailwind/global CSS approach after migration:

```css
:root {
  --background: #f6f7f9;
  --foreground: #1c2430;
  --card: #ffffff;
  --card-foreground: #1c2430;
  --primary: #5200FF;
  --primary-foreground: #ffffff;
  --border: #dce2ea;
  --input: #aeb9c7;
  --ring: #5200FF;
  --radius: 8px;
  --font-sans: Roboto, Arial, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

## UI Simplification Recommendations

shadcn/ui is most useful here as a restraint system: fewer UI patterns, more consistency.

Recommended simplifications:

- Keep a single primary action per step:
  - Step 1: upload file.
  - Step 2: generate analysis.
  - Step 3: print or inspect student cards.
- Use accordions for advanced details instead of always-visible technical text.
- Turn score bands and advice types into badges.
- Use a table only for fast scanning. Use cards only for actual decision preparation.
- Avoid sidebar navigation for now.
- Keep "data quality" as a gentle expandable warning, not a dashboard metric.
- Prefer clear Dutch copy over statistical labels.
- Use tooltips only for icon buttons, not as the main explanation layer.
- Keep animations purposeful:
  - Upload entrance.
  - Step transition.
  - Analysis generation.
  - Card reveal.
  - Tour highlight movement.

## Chart Strategy

Current app uses custom SVG charts. That is good for a no-build static app.

Near-term:

- Keep SVG charts.
- Add chart tokens and a small JS chart config.
- Make interactive dots use consistent dialog and tooltip behavior.
- Explain chart meaning in human language near the graph.

Later React migration:

- Consider shadcn Chart with Recharts.
- Preserve the current educational explanations.
- Keep fixed dimensions or aspect ratios so responsive charts do not collapse.
- Do not let chart libraries decide pedagogy. The app should still explain what teachers are seeing.

## Data Table Strategy

Current student table is already clickable and sortable. shadcn Data Table ideas that are useful:

- Clear column headers with sort state.
- Row action pattern.
- Optional filtering controls.
- Optional pagination only when class lists become large.
- Column visibility is low priority for teachers.

Do not overbuild the table. For klassenraad preparation, the table should be a launchpad into student cards, not a spreadsheet replacement.

## Accessibility And Teacher-Friendliness

Adopting shadcn patterns should improve accessibility, but only if we preserve these rules:

- Every modal needs a clear title and close control.
- Focus should move into the modal and return to the launching control.
- Keyboard users should be able to open a student card from the table.
- The tour highlight must not rely on color only.
- Advice badges need readable labels, not just icons.
- All statistical terms must have plain-language explanation.
- Dutch remains the primary language.

## Risks

- A full shadcn migration introduces a build step, package management, and React state architecture.
- Tailwind class-heavy markup may become noisy if mixed with the existing string-template renderer.
- Recharts is useful but adds dependency weight and a new chart mental model.
- shadcn components are copied into the repo, so we own maintenance afterward.
- Print output can regress easily during a UI rewrite.

## Recommended Next Sprint

Highest impact, lowest risk:

1. Add semantic shadcn-compatible tokens while preserving current variable aliases.
2. Create a documented UI class contract for buttons, cards, fields, accordions, dialogs, tables, badges, and charts.
3. Refactor the current upload, mapping, and dashboard markup to use that contract gradually.
4. Add one visual regression checklist for:
   - Upload splash.
   - Step 2 mapping wizard.
   - Dashboard.
   - Student card.
   - A4 print preview.
5. Decide only after that whether a full Vite/React/shadcn migration is worth the extra complexity.

## Decision

Recommended decision for this project: adopt shadcn/ui as the design-system reference now, not as a full dependency yet.

That gives us the polish, consistency, and maintainable vocabulary we want while protecting the current MVP from a large framework rewrite.
