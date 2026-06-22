# Skore Analyser - UI And Animation Improvement Backup

Date: 2026-06-18

This document captures UI, interaction, and animation improvements for future design sprints. It is based on the current React/shadcn-style MVP, the existing CSS motion system, the teacher onboarding notes, and the latest product feedback.

## 2026-06-22 Klassenleraar UI Pass

Implemented in this pass:

- Fixed review-card header overlap by making klassenleraar review card headers single-column where title and help text are siblings.
- Added school-specific subject aliases, including `Esth`, `Godsd`, `SMS`, `SAV`, `SFV`, `SICT`, `AIDT`, `DEC`, `NatWe`, `PMS`, and `TE`.
- Replaced visible `Sleutelvak` terminology with `Hoofdvak` in the klassenleraar UI.
- Simplified the klassenleraar histogram panel to `Histogram` and connected bar clicks to the student-name dialog.
- Removed the intro sentence and graph chip from klassenleraar student cards.
- Reduced duplicated warning copy by turning repeated hoofdvak flags into one summary that also lists non-hoofdvak subjects in alarm zones.
- Added a visible dotted trendline and `0-100`/`Inzoomen` scale toggle to the klassenleraar multi-line graph.
- Fixed klassenleraar JSON backup save/import.
- Added reduced-motion coverage for new klassenleraar animations.
- Added `griek` and `SEAL` subject recognition, removed the klassenleraar compact-card toggle, and split the rondleiding copy so klassenleraar cards explain vaklijnen, hoofdvakken, samenvatting, and klassenraadnotities instead of vakdocent score baskets.
- Removed the vakdocent compact-card toggle and A4 chip, opened commentaren by default, removed the generic no-signal next-step sentence, and simplified trend-dot hover labels/detail modals so `DW1`/`DW2` basket names no longer appear as graph point labels or evaluation categories.

Remaining checks:

- Visual screenshot QA on `1366x768`, `1280x720`, and mobile.
- A4 PDF/print proof for a klassenleraar card with many subject lines.
- Consider making klassenleraar graph points click into a small detail modal in a later sprint.

## 2026-06-18 UI Reanalysis Update

Implemented in the current pass:

- Renamed `Pedagogische samenvatting` to `Samenvatting` on the student card.
- Renamed the limited-evidence dashboard stat to `leerlingen met weinig evaluaties`.
- Removed the `Vlaggen` column from the sortable student table to reduce overview noise.
- Gave `Evaluaties meegedaan` a stable right-aligned table column so percentages align under the header.

## 2026-06-18 Full UI/Animation Sprint Implementation

Implemented in the follow-up sprint:

- Added a three-step generation screen between setup and dashboard: file read, weights applied, cards created.
- Unified review, setup, generation, and dashboard page entrance motion around the shared motion tokens.
- Made student cards more compact: graph first, summary second, notes visible, calculation/comments behind remembered accordions.
- Added a compact-card preference toggle and persisted it locally.
- Removed median/stddev from the default dashboard stat row so only teacher-facing stats remain visible.
- Replaced native SVG chart titles with visible hover/focus labels for yearline, dot plot, and histogram marks.
- Changed exam dot motion from constant pulsing to a short initial pulse plus a brief hover/focus pulse.
- Added a subtle open-arrow affordance to clickable student table rows.
- Added a tour connector line and animated tour text transitions.
- Expanded projector-focused CSS for 1366x768 style displays.
- Persisted selected class, card section open state, completed tour timestamp, compact-card preference, and last used basket preset per subject.

Remaining quality pass:

- Run visual screenshots on splash, review, setup, generation, dashboard, one student card, and tour overlay.
- Decide whether the compact-card toggle should stay visible for demos or become a hidden preference later.
- Replace the remaining old `scorebewijs` wording in deeper calculation notes when the scoring terminology sprint happens.

Current UI read:

- The splash screen is the strongest part of the product: minimal, branded, animated, and focused.
- The review/setup/dashboard screens now share the shadcn-style component language, but the motion rhythm is still uneven between screens.
- Student cards contain the right information, but their internal hierarchy can still feel busy because graph, summary, advice, notes, and controls all compete for attention.
- Graph interactions are improving, especially after the month-based x-axis, but tooltips and click affordances should become more consistent across all charts.
- The table and dashboard are calmer after removing redundant flags from the table, but statistics should continue moving toward teacher language instead of audit language.

Animation assessment:

- Strong: splash entrance, upload card entrance, card rise, exam point pulse, histogram arrow, tour focus movement.
- Mixed: workflow transition from upload to review to setup; currently it is animated, but not yet a single continuous story.
- Too subtle: clickable chart marks, save state, sortable table row affordance.
- Risky: always-pulsing exam dots can become visually noisy in long meetings; consider a short attention pulse on card entrance, then a quieter steady state.
- Missing: a clear generation animation between setup confirmation and generated cards.

Updated upgrade path:

| Priority | Upgrade | Impact | Notes |
| --- | --- | --- | --- |
| P0 | Add a real generation sequence after setup | Very high | Show `bestand gelezen`, `weging toegepast`, `leerlingkaarten gemaakt`; then transition to dashboard. |
| P0 | Unify page transitions | Very high | Use one motion pattern for review, setup, dashboard: fade + 12px rise, no abrupt layout jump. |
| P0 | Compact student card hierarchy | Very high | Graphs first, summary second, notes visible, calculation/advice details collapsed. |
| P1 | Standard chart tooltip system | High | Replace native SVG titles with visible HTML/SVG labels that match dot plot, histogram, quartile, and yearline. |
| P1 | Calm exam emphasis | High | Pulse exam dots twice on card entrance or hover, then settle; keep reduced-motion support. |
| P1 | Dashboard stat language pass | High | Keep labels teacher-readable: `Leerlingen`, `Klasgemiddelde`, `Onder cesuur`, `leerlingen met weinig evaluaties`. |
| P2 | Sortable table polish | Medium | Add row hover affordance and a tiny open icon on hover/focus without adding another permanent column. |
| P2 | Tour connector and panel animation | Medium | Add a connector line from panel to focus rectangle and crossfade tour text. |
| P2 | Projector viewport QA | Medium | Test 1366x768 and 1280x720; tune header density, stat count, and card spacing. |
| P3 | Preference memory | Low | Remember collapsed sections, selected class, completed tour, and compact card preference. |

## Current Baseline

The app already has a solid visual direction:

- Primary brand color is consistently based on `#5200FF`.
- Roboto is the first font in the UI font stack.
- Dutch is the primary language.
- The upload screen is now a focused purple splash with one primary action.
- Step 2 uses basket presets and teacher-facing scoring fields.
- Step 3 has class cards, a sortable student table, student cards, chart modals, a rondleiding overlay, local autosave indication, and A4 print styling.
- Student cards now include per-card print, previous/next navigation, interactive graphs, and plain-language duiding.

The next improvements should focus less on adding more controls and more on flow, confidence, hierarchy, and teacher calm.

## Design Principles For The Next Pass

- Keep one primary action per screen.
- Prefer teacher language over data language.
- Animate state changes, not decoration.
- Make the interface feel guided without becoming childish.
- Use motion to confirm progress, focus attention, and explain structure.
- Keep every animation short, purposeful, and disabled under `prefers-reduced-motion`.
- Avoid adding new visible help text unless it removes a real misunderstanding.
- Keep the dense dashboard scannable; do not turn it into a landing page.

## Priority Matrix

| Priority | Area | Impact | Why |
| --- | --- | --- | --- |
| P0 | Upload-to-setup transition | Very high | The app still changes screens abruptly after the polished splash. |
| P0 | Setup step clarity | Very high | Teachers need confidence before generating cards. |
| P0 | Student card density | Very high | Cards are central to klassenraad use and can still feel large. |
| P1 | Graph explainability | High | Graphs are powerful but need more visible affordance and context. |
| P1 | Tour polish | High | The rondleiding is useful but can feel mechanical. |
| P1 | Print confidence | High | Printing is a core teacher workflow. |
| P2 | Micro-interactions | Medium | Adds polish, but should not distract from decisions. |
| P2 | Responsive refinements | Medium | Demo laptops and projectors need robust layouts. |
| P3 | Optional personalization | Low | Useful later, but not needed for the demo. |

## P0 Improvements

### 1. Smooth Upload-To-Setup Transition

Current issue:

- The upload splash feels polished, but the move to Step 2 can still feel like a hard context switch.

Suggested improvement:

- Add a short intermediate "bestand gelezen" state after upload.
- Show three quick checks: workbook found, classes detected, evaluations detected.
- Then slide/morph into setup.

Implementation notes:

- Add an `uploadComplete` or `parsingComplete` visual state before `setWorkflowStep("map")`.
- Reuse the existing purple background for the first part of Step 2, then fade into the light workspace.
- Keep total motion under about 700ms.

Acceptance criteria:

- Teacher sees immediate confirmation that upload worked.
- Step 2 does not feel visually disconnected from the splash.
- Reduced-motion users get a simple state change without movement.

### 2. Guided Setup As A Wizard Sheet

Current issue:

- Step 2 is better than before, but it still exposes course, threshold, presets, baskets, and advanced mapping in one working surface.

Suggested improvement:

- Convert setup into a compact wizard panel:
  - Course and class confirmation.
  - Cesuurwaarde.
  - Basket preset.
  - Basket weight check.
  - Final "kaarten maken" review.

Animation ideas:

- Horizontal panel slide between setup questions.
- Small progress dots or steps at the top.
- Generate button morphs into a loading state, then success.

Implementation notes:

- Keep advanced assignment mapping as an accordion below the wizard or in a secondary dialog.
- Use the existing `Card`, `Button`, `Select`, and `Input` primitives.
- Store temporary wizard state in the same `config` object.

Acceptance criteria:

- A non-technical teacher can finish setup without touching advanced mapping.
- The current basket flexibility remains available.
- No page section should appear as a card inside another card.

### 3. Basket Transfer Explanation

Current issue:

- The new rule where an empty `EXn` basket transfers to `DWn` is mathematically sensible but hidden.

Suggested improvement:

- In Step 2, show a small visual relation between segment baskets:
  - `DW3 + EX3`
  - If `EX3` has no scores, show `EX3 gewicht -> DW3`.

Animation ideas:

- When analysis detects an empty exam basket, briefly highlight the affected segment.
- Use a tiny purple arrow or transfer chip only inside the basket row.

Implementation notes:

- The calculation now exposes `transferredWeight` on category rows.
- Add a teacher-facing label in the score table when a row has transferred weight.
- Avoid making this a warning; it is an expected rule.

Acceptance criteria:

- Teacher understands why `DW3` can carry more weight when `EX3` is empty.
- Empty exam baskets are not perceived as missing scores that lower a student.

### 4. Student Card Compact Mode

Current issue:

- Student cards can feel large, especially with graph, duiding, flags, comments, and notes.

Suggested improvement:

- Create a more compact default card:
  - Header, total, key badges.
  - Graphs first.
  - One-line pedagogical signal.
  - Notes field.
  - Details collapsed by default.

Animation ideas:

- Details accordion expands with a fast height animation.
- Focused card gets a subtle lift and border glow, already partly present.

Implementation notes:

- Keep print layout separate from screen layout.
- Consider making score table collapsed under "Berekening".
- Keep `Rondleiding`, print, previous/next, and total visible.

Acceptance criteria:

- More cards are scannable in one viewport.
- Card print remains one A4 page.
- Important signals stay visible without expanding.

## P1 Improvements

### 5. Graph Period Bands

Current state:

- The year graph now uses school months from September to June as the x-axis. Evaluation dots are positioned by date when available, with a sequence fallback for undated points.

Suggested improvement:

- Add very faint background bands for school periods, trimesters, or semesters on top of the month axis.
- Keep month labels as the primary teacher-facing x-axis.

Animation ideas:

- On hover over a period band, lightly highlight the matching months.
- Clicking a period band could open a small modal listing evaluations in that period.

Implementation notes:

- Derive period spans from dates and basket metadata instead of old grouped axis labels.
- Use low opacity grey, not brand purple, to avoid implying advice.

Acceptance criteria:

- Teacher can quickly see which scores belong together.
- Period labels do not collide with dots or axis labels.

### 6. Better Graph Tooltips

Current issue:

- Dot hover labels exist, and click opens details, but the affordance is subtle.

Suggested improvement:

- Use consistent tooltip styling for:
  - Yearline dots.
  - Dot plot points.
  - Histogram bars.
  - Quartile markers.

Animation ideas:

- Tooltip fades and rises 4px.
- Exam dots can pulse only on initial card entrance, then settle.

Implementation notes:

- Prefer Radix Tooltip for HTML controls.
- SVG-only tooltips should be implemented as SVG labels or a positioned HTML overlay, not native `<title>` alone.

Acceptance criteria:

- Hovering any chart mark reveals exactly what it means.
- Clicking any interactive chart mark opens the detail modal when there is more to inspect.

### 7. Class Context Layer In Graphs

Suggested improvement:

- Add optional class average line to the year graph.
- Add a subtle class range or median marker to make class-relative decline easier to understand.

Animation ideas:

- Toggle class context on/off with a small icon button.
- Fade class context in rather than redrawing abruptly.

Implementation notes:

- Requires aligning class averages by assignment/category sequence.
- Do not ship this until the alignment is robust; misleading class lines would be worse than none.

Acceptance criteria:

- Teacher can see whether a student decline is personal or class-wide.
- The line is visually secondary to the student's own scores.

### 8. Tour Flow Polish

Current issue:

- The rondleiding bounding box works, but the overlay can still feel technical.

Suggested improvement:

- Add a visible step count inside the tour panel.
- Smoothly scroll the target into view before moving the focus box.
- Add a small connector line from panel to focus box.
- Store completed tour in localStorage so experienced users are not prompted again later.

Animation ideas:

- Focus box transitions with position and size.
- Panel crossfades text between steps.

Implementation notes:

- Current tour uses `data-tour-part` and `useLayoutEffect`; keep that pattern.
- Use a short `requestAnimationFrame` measurement after scroll for more stable box placement.

Acceptance criteria:

- The focus box never lands off-screen.
- Keyboard users can move through the tour and close it.
- Reduced-motion users get instant focus changes.

### 9. Print Workflow Confidence

Current state:

- Print is now a per-card icon and CSS hides other cards during single-card print.

Suggested improvement:

- Before printing, show a tiny local preflight toast:
  - "Deze kaart wordt afgedrukt."
  - Optional warning if notes are long.

Animation ideas:

- Print icon briefly turns purple and pulses once before opening print.
- Avoid long animation because browser print dialogs interrupt flow.

Implementation notes:

- Use `printStudentId` state already present.
- A preflight dialog is probably too much; a toast or inline status is enough.

Acceptance criteria:

- Teacher is never surprised about whether one card or all cards will print.
- The UI returns to normal after `afterprint`.

## P2 Improvements

### 10. Dashboard Stat Hierarchy

Current issue:

- The dashboard still exposes several stat cards. Some are useful, some feel analytical.

Suggested improvement:

- Keep only the most teacher-relevant default stats:
  - leerlingen
  - klasgemiddelde
  - onder cesuur
  - interessante elementen
- Move median/stddev into an optional "meer klascontext" disclosure.

Animation ideas:

- Count-up numbers on first dashboard render.
- Highlight changed stats when filters change.

Implementation notes:

- Avoid animating every filter change too loudly.
- Use tabular numbers to prevent layout jitter.

### 11. Filter Simplification

Suggested improvement:

- Replace the visible flag dropdown with "Interessante elementen" chips.
- Put rare filters in a small filter popover.
- Add a clear empty state with one button to reset filters.

Animation ideas:

- Selected chips slide/fade into a small active-filter row.

Acceptance criteria:

- Teacher can filter by class and interesting signal without reading a complex control row.

### 12. Local Save Feedback

Current state:

- Header has a save icon with animation.

Suggested improvement:

- Make save feedback contextual in notes:
  - "Opgeslagen"
  - "Bezig..."
  - "Kon niet lokaal bewaren"

Animation ideas:

- Save icon tick animation after note edit.
- Very short fade on status text.

Implementation notes:

- `saveNote` is synchronous localStorage now, but can still fail if storage is blocked/full.
- Wrap localStorage writes in status handling.

### 13. Empty And Loading States

Suggested improvement:

- Add skeleton cards during generation.
- Add a friendly no-results surface when filters hide all students.
- Add a "geen grafiekdata" mini-state that explains why a graph is absent.

Animation ideas:

- Skeleton shimmer should be very subtle or use static blocks under reduced motion.

Acceptance criteria:

- There is no moment where the app appears blank or broken.

### 14. Responsive Projector Mode

Suggested improvement:

- Add a layout tuned for 1366x768 projectors:
  - tighter header
  - fewer visible stats
  - sticky class tabs
  - compact card spacing

Implementation notes:

- This can be CSS-only with media queries.
- Test with the browser viewport at 1366x768 and 1280x720.

## P3 Improvements

### 15. Personal Teacher Preferences

Suggested improvement:

- Remember:
  - last selected class group
  - collapsed/expanded calculation sections
  - tour completed
  - compact card preference
  - preferred basket preset per subject

Implementation notes:

- Add versioned localStorage keys.
- Keep score data out of persistent storage unless explicitly requested.

### 16. Subtle Celebration For Completed Setup

Suggested improvement:

- After cards generate, show a tiny success moment:
  - "Kaarten klaar"
  - number of class groups
  - number of student cards

Animation ideas:

- One purple check animation.
- No confetti or oversized celebration; this is a professional teacher tool.

### 17. Visual Regression Screenshots

Suggested improvement:

- Add scripted screenshots for:
  - splash
  - setup
  - dashboard
  - student card
  - tour overlay
  - print media

Implementation notes:

- Use Playwright when available.
- Store snapshots outside `dist`.

## Motion System Backlog

Create a small motion token system in CSS:

```css
:root {
  --motion-fast: 160ms;
  --motion-normal: 260ms;
  --motion-slow: 520ms;
  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

Then use those tokens for:

- Page entrance.
- Card entrance.
- Dialog entrance.
- Tooltip entrance.
- Tour focus movement.
- Chart marker emphasis.
- Save indicator.

Reduced motion rule:

- Disable pulsing, bobbing, shimmer, and large translation.
- Keep opacity changes if useful.
- Never hide information behind motion.

## UI Cleanup Backlog

- Remove or quarantine legacy `js/app.js`, `js/renderer.js`, `css/main.css`, and `css/print.css` if the React app is now the production path.
- Review i18n for old strings that refer to removed UI, such as demo options, CSV/JSON export, meeting mode, or old print preview.
- Split `src/App.jsx` into smaller modules:
  - `UploadScreen`
  - `MappingScreen`
  - `DashboardScreen`
  - `StudentCard`
  - `Charts`
  - `TourOverlay`
- Move graph helpers out of `App.jsx`.
- Move basket preset metadata into a shared config module.
- Add a teacher-readable calculation note that documents the new `EXn -> DWn` transfer rule.

## Suggested Sprint Order

1. Build the upload-to-setup transition and parsing success state.
2. Turn Step 2 into a guided wizard sheet.
3. Add visual basket transfer explanation for empty `EXn` baskets.
4. Compact the default student card layout.
5. Improve graph tooltips and period bands.
6. Polish the rondleiding with step count, scroll targeting, and connector.
7. Add single-card print confirmation and long-note warning.
8. Simplify dashboard stats and filters.
9. Add local save state near teacher notes.
10. Add responsive/projector QA screenshots.

## Acceptance Criteria For The Next UI Sprint

- A teacher can upload, confirm setup, generate cards, inspect one student, add a note, and print one card without touching an advanced control.
- Every major screen transition has a purposeful animation or a clear static state under reduced motion.
- No teacher-facing label uses developer terms when a classroom term exists.
- No card action is duplicated in the global header unless it truly applies globally.
- Graphs explain their marks through hover, click, or tour text.
- Print behavior is predictable from the button location.
- The app remains calm, professional, and fast.
