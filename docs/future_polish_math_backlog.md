# Skore Analyser - Future Polish And Math Backlog

This document is a reference list for future design and development sprints. It captures the product polish, teacher-facing improvements, and mathematical optimisations we can still implement after the current MVP refinements.

## Recently Polished In The MVP

- Launch screen changed to a minimal purple splash with the central message: "Bereid jouw klassenraad voor".
- Upload is now the only primary first action; the old left-side workflow steps are removed from the start screen.
- Header controls are hidden during upload and return after data is loaded.
- The dashboard was simplified by removing rarely used teacher-facing actions such as JSON/CSV export buttons, summary copy, meeting mode, pinned-only mode, and council-list copy.
- Print was reduced to one fixed A4 card mode instead of two print modes.
- Legacy filters are sanitised so old saved state cannot bring back hidden modes such as vergadermodus.
- Dutch is the primary interface language, with an NL/ENG toggle.
- Local autosave status is visible in the header after data is loaded.
- Student cards have a `Rondleiding` button with an explainer overlay.
- Trend graph points are interactive and can open an evaluation detail modal.
- Missing score cells no longer count as zero in the MVP calculation.
- Data-quality warnings are placed in an accordion instead of being overexposed.
- Teacher notes were simplified into one practical klassenraad note field.
- Trend alerts were made class-relative instead of only using raw decline.
- Evidence warnings were made less sensitive by comparing missing evaluation weight against class context.
- Pedagogical advice rules were added for yearly total, DW/EX gaps, consistency, volatility, and positive work attitude.
- Step 3 dashboard now uses the same purple animated visual flow as upload and setup.
- Class-level overview cards were added after generation.
- The student table is sortable and each row opens the matching student card.
- Student cards now have compact previous/next navigation inside the same class group.
- Student cards now have a compact back-to-overview control.

## High Impact UX Polish

- Add a short success animation after upload: file accepted, workbook detected, classes found.
- Add a calmer transition from purple splash to setup screen so the app feels intentional instead of abruptly changing state.
- Turn setup into a true step-by-step modal flow: course, cesuurwaarde, score baskets, final check.
- Add a progress indicator for the setup modal, but avoid showing technical workflow labels like upload/map/dashboard.
- Make demo data visually secondary, or hide it behind a small "Demo bekijken" link for teacher testing.
- Add a drag-over animation that makes the upload card feel alive without becoming distracting.
- Add small empty/loading states while cards are generated.
- Make the mapping step less technical by showing only the common basket fields first: DW1, EX1, DW2, EXPAR, EX2.
- Hide advanced assignment mapping behind one clear disclosure: "Geavanceerde detectie aanpassen".
- Improve class-level entry cards with richer class risk summaries.
- Improve next/previous navigation with optional keyboard support.
- Add keyboard shortcuts only if they are discoverable through tooltips, not visible instruction text.
- Add a "Terug naar klasoverzicht" affordance when a student card is opened or focused.
- Refine card entrance animations after teacher usability feedback.
- Add a friendly no-results state when filters remove all students.

## Teacher Explainability Polish

- Replace mathematical wording with teacher language everywhere possible.
- Add short plain-language explanations for every advice flag.
- Explain volatility as "wisselende resultaten" rather than standard deviation.
- Explain class-relative decline as "deze leerling daalt sterker dan de klas gemiddeld".
- Explain evidence completeness as "we hebben minder beoordelingsbewijs dan bij klasgenoten".
- Add an explainer modal for the graph legend: year percentage, class average, trend, and clicked evaluation dots.
- Add a small "Waarom deze suggestie?" disclosure inside each advice block.
- Add a "Niet automatisch beslissen" disclaimer near advice rules, framed positively: the teacher remains the decision-maker.
- De-duplicate advice when multiple flags are driven by the same low-total issue.
- Use softer labels for advice levels, for example "bespreekpunt" before "negatief advies".
- Add optional teacher override labels: "akkoord", "te nuanceren", "niet relevant".
- Let teachers mark a flag as handled so it stops visually competing with open issues.

## Print And Reporting Polish

- Keep only one A4 print mode, but add better preflight warnings for cards that are still too long.
- Add one-page printable student cards that never spill across pages.
- Add a print preview for one selected class group.
- Add a printable class overview page before individual cards.
- Add a print-safe notes field with a visible character limit.
- Add automatic shortening of long technical details in print.
- Add a "print current class" action after class selection.
- Add optional anonymised print mode for internal testing.
- Add page numbering and class/subject metadata in print headers.
- Add a compact visual summary per card for klassenraad use: total, advice band, strongest signal, teacher note.

## Local Storage And Persistence

- Store teacher notes in localStorage per workbook, subject, class, and student.
- Store the last selected class group.
- Store chosen basket weights and cesuurwaarde per course.
- Store dismissed tour steps so returning users are not repeatedly guided.
- Store "handled" advice flags locally.
- Add a visible local-save health indicator with states: saved, saving, failed.
- Add a "Wis lokale notities voor dit bestand" action.
- Add optional import/export of local teacher notes only, separate from score data.
- Add versioned localStorage migration so old state does not break future UI changes.

## Mathematical Optimisations

- Move from simple evidence completeness to weighted evidence completeness based on maximum points or configured basket weight.
- Compare missing evidence against classmates: alert only when a student has meaningfully less available evaluation weight than the class median.
- Detect retakes and redo tests more robustly by grouping related assignments and treating alternatives as replacement evidence.
- Use class-relative trend alerts: compare each student trend against the class trend for the same evaluation sequence.
- Add a minimum evidence threshold before trend or volatility flags can fire.
- Calculate trend using weighted or robust regression instead of a simple first-to-last or ordinary slope.
- Use median absolute deviation for volatility outlier detection, which is more robust than standard deviation in small classes.
- Separate DW and EX trendlines when enough data exists.
- Detect "exam drop" using deviation from class exam drop, not only raw DW versus EX gap.
- Account for increasing curriculum difficulty by modelling the average class decline across the year.
- Add confidence labels to advice: high, medium, low, based on evidence amount and consistency.
- Avoid double-penalising missing evaluations and low totals when both come from the same data issue.
- Use percentile bands within class group, but explain them without ranking language that feels punitive.
- Add subject-specific default basket profiles beyond IW.
- Add safeguards for very small class groups where class statistics are unstable.
- Detect impossible values, such as scores above maximum or negative scores, before analysis.
- Detect assignment columns where almost everyone is missing and treat them as likely inactive or retake-only evidence.
- Add date-aware ordering so graph labels do not duplicate awkwardly when basket names repeat.
- Add optional category normalisation so uneven maximum scores do not distort year trends.
- Add class baseline context: show whether a student is improving or declining relative to where they started.

## Pedagogical Rule Ideas

- Strong positive work attitude: consistently good results with low volatility.
- Recovery signal: earlier weak evidence followed by sustained improvement.
- Watchlist signal: acceptable total but sharp class-relative decline.
- Study attitude signal: DW far below EX or repeated low daily-work results.
- Large-package difficulty signal: EX far below DW, especially compared with class exam drop.
- Fragile pass signal: total just above cesuurwaarde with high volatility or low evidence.
- Under-evidence signal: too little trustworthy evaluation weight compared with classmates.
- Positive exam resilience: exam results stable or better than DW, while class average drops.
- Planning concern: repeated missing or late evidence across different baskets.
- Strength area: one basket is consistently stronger than the student's own average.
- Risk area: one basket is consistently weaker than the student's own average.
- Context-needed signal: conflicting evidence where total, trend, and teacher notes disagree.

## Accessibility And Responsiveness

- Verify color contrast on the purple splash and white upload card.
- Respect reduced-motion settings for all splash and card animations.
- Ensure the upload card remains fully usable on small laptop screens.
- Add focus-visible states for every interactive card control.
- Make the graph modal keyboard accessible.
- Ensure the card tour can be closed and navigated by keyboard.
- Test print and dashboard layout at 390px, 768px, 1280px, and 1440px widths.
- Add touch-friendly spacing for class tabs and filters.

## QA And Regression Tests

- Add a deterministic regression script that loads each example workbook and validates student counts, assignment counts, missing evidence counts, and advice counts.
- Add tests for missing-score handling so blanks never become zero scores.
- Add tests for retake/redo grouping.
- Add tests for class-relative trend detection.
- Add tests for DW/EX gap rules.
- Add browser checks for the upload splash, mapping step, dashboard render, card tour, graph modal, and print preview.
- Add visual smoke checks for desktop and mobile screenshots.
- Add a fixture workbook with deliberate edge cases: empty retake column, inactive assignment, duplicate basket labels, malformed score, and multiple class blocks.

## Technical Maintainability

- Remove any remaining unused exporter code if JSON/CSV export is permanently out of scope.
- Split renderer responsibilities into smaller modules: dashboard, student card, graph, tour, print preview.
- Move advice rule definitions into a dedicated rules module with readable metadata.
- Add a schema/version field to saved preferences and project payloads.
- Keep all teacher-facing strings in i18n and avoid hardcoded Dutch text in renderer code.
- Add a small design-token section for brand color, spacing, motion, and print sizing.
- Document the calculation model in a teacher-readable and developer-readable form.
- Keep `mission_brief.md`, `docs/mvp-analysis.md`, and this backlog aligned after each sprint.

## Suggested Next Sprint Order

1. Build the true setup modal flow for course, cesuurwaarde, and basket weights.
2. Implement weighted evidence completeness against class median.
3. Improve trend math with class-relative robust trend alerts.
4. Add next/previous navigation within a selected class group.
5. Make A4 print cards reliably one page with a stricter preview warning.
6. Add localStorage persistence for class selection, notes, handled flags, and tour completion.
7. Add regression tests for example workbooks and known edge cases.
8. Refactor advice rules into a dedicated module with explainable rule metadata.
9. Add a printable class overview page.
10. Run a teacher usability pass and remove any remaining confusing labels.
