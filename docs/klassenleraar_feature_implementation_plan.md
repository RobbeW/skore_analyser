# Klassenleraar Feature Implementation Plan

```yaml
document:
  title: "Klassenleraar mode implementation guide"
  created: "2026-06-21"
  project: "Skore Analyser"
  status: "planning"
  language: "nl"
  purpose: >
    This guide translates the klassenleraar feature request into a concrete
    implementation path. It preserves the existing vakdocent flow while adding
    a second mode for class teachers who need to analyse each student across
    multiple subjects and report periods.

feature_request_analysis:
  current_app_scope:
    mode: "vakdocent"
    user: "subject teacher"
    core_objective: >
      Upload one Skore export for one own subject, configure baskets, calculate
      transparent subject evidence, and prepare student cards for class council.
    current_strengths_to_reuse:
      - "local-first privacy model"
      - "drag/drop upload interaction"
      - "student card structure"
      - "class overview dashboard"
      - "rule-based flags"
      - "teacher notes and print-friendly card layout"
      - "SVG graph components and tooltip/modals"
      - "local JSON project backup pattern"

  requested_new_scope:
    mode: "klassenleraar"
    user: "class teacher / klastitularis"
    core_objective: >
      Upload 3 or 4 report Excel files for one class, combine period totals
      across all subjects, and prepare student cards that show how each student
      evolves across the school year and across key subjects for their track.
    key_difference_from_vakdocent:
      - "input is multi-file, not one workbook"
      - "data is report-summary data, not raw assignment evidence"
      - "analysis is cross-subject and period-based"
      - "graph should show many subject lines plus an overall year/total line"
      - "flags depend on study track and key subjects"
      - "basket setup is not relevant in the same way as vakdocent mode"

  proposed_product_decision:
    add_mode_toggle_on_splash:
      component: "segmented control"
      options:
        - id: "vakdocent"
          label: "Vakdocent"
          behaviour: "existing flow"
        - id: "klassenleraar"
          label: "Klassenleraar"
          behaviour: "new multi-file report flow"
      default: "vakdocent"
      rationale: >
        Teachers should not be asked to choose technical import types. They
        should choose their role, then the upload and setup flow should adapt.

example_data_findings:
  folder: "example_folder_klassenleraar"
  observed_classes:
    - class_code: "1STEAM1"
      inferred_year: 1
      inferred_track: "STEaM"
      files:
        - "1STEAM1 Trimester 1.xlsx"
        - "1STEAM1 Trimester 2.xlsx"
        - "1STEAM1 Trimester 3.xlsx"
        - "1STEAM1 Jaar.xlsx"
      expected_period_schema: "year_1_2"
      observed_main_sheet_names:
        - "Trimester 1"
        - "Trimester 2"
        - "Trimester 3"
        - "Jaar"
      observed_columns:
        - "AlgTo PCT"
        - "subject DW1/EX1/TOT1 for trimester 1"
        - "subject DW2/EX2/TOT2 for trimester 2"
        - "subject DW3/EX3/TOT3 for trimester 3"
        - "subject DW/EX/PCT for year"
      notes:
        - "Some trimester 3 EX columns are blank for subjects without a final exam."
        - "The Onvoldoendes sheet lists weak subjects and subcomponents."

    - class_code: "3NW3"
      inferred_year: 3
      inferred_track: "NW"
      files:
        - "3NW3 Semester 1.xlsx"
        - "3NW3 Semester 2 - voorlopig resultaat.xlsx"
        - "3NW3 Semester 2.xlsx"
        - "3NW3 Jaarrapport.xlsx"
      expected_period_schema: "year_3_4"
      observed_main_sheet_names:
        - "Semester 1"
        - "Semester 2 - voorlopig resultaa"
        - "Semester 2"
        - "Jaarrapport"
      observed_columns:
        - "AlgTo PCT appears in semester 1, semester 2, and year files"
        - "Semester 2 voorlopig may start directly with subject columns"
        - "subject DW1/EX1/TOT1 for semester 1"
        - "subject DW2/EX2/TOT2 for semester 2 or provisional semester 2"
        - "subject DW/EX/PCT for year"
      notes:
        - "The provisional semester 2 file can have no overall AlgTo column."
        - "The parser must not assume that every file contains the same leading columns."

    - class_code: "6LWI6"
      inferred_year: 6
      inferred_track: "LWI"
      files:
        - "6LWI6 Semester 1.xlsx"
        - "6LWI6 Semester 2.xlsx"
        - "6LWI6 Jaarrapport.xlsx"
      expected_period_schema: "year_5_6"
      observed_main_sheet_names:
        - "Semester 1"
        - "Semester 2"
        - "Jaarrapport"
      observed_columns:
        - "AlgTo PCT"
        - "subject DW1/EX1/TOT1"
        - "subject DW2/EX2/TOT2"
        - "subject DW/EX/PCT"
      notes:
        - "This flow needs 3 files, not 4."
        - "The class is small in the sample, so graph and percentile components need to handle small groups gracefully."

  structural_conclusion:
    parser_type: "new report-summary parser"
    reason: >
      These files are not assignment-level Skore exports. They are report tables
      where subjects are grouped across columns and students are rows. The
      existing parseSkoreWorkbook function can stay for vakdocent mode, but
      klassenleraar mode should add a dedicated parser for report summaries.

period_models:
  year_1_2:
    applies_to_years: [1, 2]
    required_files: 4
    periods:
      - id: "trimester_1"
        label: "Trimester 1"
        file_patterns: ["trimester 1", "trim 1", "t1"]
        subject_score_priority: ["TOT1", "PCT", "EX1", "DW1"]
        overall_score_priority: ["PCT", "AlgTo PCT"]
      - id: "trimester_2"
        label: "Trimester 2"
        file_patterns: ["trimester 2", "trim 2", "t2"]
        subject_score_priority: ["TOT2", "PCT", "EX2", "DW2"]
        overall_score_priority: ["PCT", "AlgTo PCT"]
      - id: "trimester_3"
        label: "Trimester 3"
        file_patterns: ["trimester 3", "trim 3", "t3"]
        subject_score_priority: ["TOT3", "PCT", "EX3", "DW3"]
        overall_score_priority: ["PCT", "AlgTo PCT"]
      - id: "year"
        label: "Jaar"
        file_patterns: ["jaar", "jaarrapport"]
        subject_score_priority: ["PCT", "TOT", "EX", "DW"]
        overall_score_priority: ["PCT", "AlgTo PCT"]

  year_3_4:
    applies_to_years: [3, 4]
    required_files: 4
    periods:
      - id: "semester_1"
        label: "Semester 1"
        file_patterns: ["semester 1", "sem 1", "s1"]
        subject_score_priority: ["TOT1", "PCT", "EX1", "DW1"]
        overall_score_priority: ["PCT", "AlgTo PCT"]
      - id: "semester_2_prelim"
        label: "Semester 2 voorlopig resultaat"
        file_patterns: ["semester 2 - voorlopig", "voorlopig", "voorlopig resultaat"]
        subject_score_priority: ["TOT2", "PCT", "EX2", "DW2"]
        overall_score_priority: ["PCT", "AlgTo PCT"]
        optional_overall_score: true
      - id: "semester_2"
        label: "Semester 2"
        file_patterns: ["semester 2", "sem 2", "s2"]
        subject_score_priority: ["TOT2", "PCT", "EX2", "DW2"]
        overall_score_priority: ["PCT", "AlgTo PCT"]
      - id: "year"
        label: "Jaar"
        file_patterns: ["jaar", "jaarrapport"]
        subject_score_priority: ["PCT", "TOT", "EX", "DW"]
        overall_score_priority: ["PCT", "AlgTo PCT"]

  year_5_6:
    applies_to_years: [5, 6]
    required_files: 3
    periods:
      - id: "semester_1"
        label: "Semester 1"
        file_patterns: ["semester 1", "sem 1", "s1"]
        subject_score_priority: ["TOT1", "PCT", "EX1", "DW1"]
        overall_score_priority: ["PCT", "AlgTo PCT"]
      - id: "semester_2"
        label: "Semester 2"
        file_patterns: ["semester 2", "sem 2", "s2"]
        subject_score_priority: ["TOT2", "PCT", "EX2", "DW2"]
        overall_score_priority: ["PCT", "AlgTo PCT"]
      - id: "year"
        label: "Jaar"
        file_patterns: ["jaar", "jaarrapport"]
        subject_score_priority: ["PCT", "TOT", "EX", "DW"]
        overall_score_priority: ["PCT", "AlgTo PCT"]

track_key_subject_config:
  design_principle: >
    Keep key-subject rules in a plain config file, not hard-coded in UI
    components. The config should be editable after field testing.
  canonical_subject_aliases:
    AlgTo: "Algemeen totaal"
    Aard: "Aardrijkskunde"
    Bio: "Biologie"
    Chem: "Chemie"
    Digi: "Digiwiskunde"
    DT: "Design Thinking"
    Eng: "Engels"
    Fra: "Frans"
    Fys: "Fysica"
    Ges: "Geschiedenis"
    Gri: "Grieks"
    IW: "Informaticawetenschappen"
    Lat: "Latijn"
    Ned: "Nederlands"
    Wis: "Wiskunde"

  year_1_2_tracks:
    Latijn:
      aliases: ["Latijn", "LAT"]
      key_subjects: ["Wiskunde", "Frans", "Nederlands", "Latijn"]
    Grieks_Latijn:
      aliases: ["Grieks Latijn", "Grieks-Latijn", "GL"]
      key_subjects: ["Wiskunde", "Frans", "Nederlands", "Latijn", "Grieks"]
    STEaM:
      aliases: ["STEaM", "STEM", "1STEAM", "2STEAM"]
      key_subjects:
        - "Wiskunde"
        - "Frans"
        - "Nederlands"
        - "Informaticawetenschappen"
        - "Design Thinking"
        - "Digiwiskunde"
    Taal_en_Cultuur:
      aliases: ["Taal en Cultuur", "TC"]
      key_subjects: ["Wiskunde", "Frans", "Nederlands", "Engels", "Geschiedenis"]

  year_3_6_tracks:
    NW:
      aliases: ["NW", "Natuurwetenschappen"]
      key_subjects:
        - "Wiskunde"
        - "Frans"
        - "Nederlands"
        - "Chemie"
        - "Biologie"
        - "Fysica"
        - "Informaticawetenschappen"
        - "Aardrijkskunde"
    Latijn_TC:
      aliases: ["Latijn TC", "LAT TC"]
      key_subjects: ["Wiskunde", "Frans", "Nederlands", "Engels", "Geschiedenis", "Latijn"]
    Latijn_STEaM:
      aliases: ["Latijn STEaM", "LAT STEAM"]
      key_subjects: ["Wiskunde", "Frans", "Nederlands", "Informaticawetenschappen", "Latijn"]
    Grieks_Latijn:
      aliases: ["Grieks-Latijn", "Grieks Latijn", "GL"]
      key_subjects: ["Wiskunde", "Frans", "Nederlands", "Latijn", "Grieks"]
    Latijn_Wiskunde:
      aliases: ["LWI", "Latijn-Wiskunde", "Latijn Wiskunde"]
      key_subjects: ["Wiskunde", "Nederlands", "Frans", "Latijn", "Fysica", "Chemie"]
      confidence: "needs_school_validation"

data_model:
  new_mode_id: "class_teacher"
  proposed_files:
    - path: "js/class-teacher-config.js"
      purpose: "period schemas, subject aliases, track key-subject rules"
    - path: "js/class-teacher-parser.js"
      purpose: "parse report summary workbooks into period models"
    - path: "js/class-teacher-aggregator.js"
      purpose: "merge 3-4 parsed files into one class dataset"
    - path: "js/class-teacher-calculator.js"
      purpose: "calculate cross-subject cards, trend lines, and flags"
    - path: "src/components/class-teacher/"
      purpose: "role-specific upload, mapping, dashboard, graph components"

  report_workbook:
    fields:
      - "fileName"
      - "periodId"
      - "periodLabel"
      - "classCode"
      - "year"
      - "trackGuess"
      - "subjects"
      - "students"
      - "warnings"

  report_subject_column_group:
    fields:
      - "subjectRaw"
      - "subjectCanonical"
      - "columns"
      - "availableMetrics"
    column_example:
      subjectRaw: "Aard"
      subjectCanonical: "Aardrijkskunde"
      columns:
        - metric: "DW1"
          index: 2
        - metric: "EX1"
          index: 3
        - metric: "TOT1"
          index: 4

  class_teacher_student:
    fields:
      - "id"
      - "name"
      - "classCode"
      - "periods"
      - "subjects"
      - "overallScores"
      - "yearScore"
      - "flags"
      - "comments"
      - "teacherNote"

  subject_period_result:
    fields:
      - "subject"
      - "periodId"
      - "score"
      - "sourceMetric"
      - "dw"
      - "exam"
      - "isKeySubject"
      - "isMissing"
      - "sourceFile"

parser_strategy:
  high_level_algorithm:
    - step: "read workbook"
      detail: "Reuse readXlsxWorkbook so the same local XLSX privacy model stays intact."
    - step: "select main report sheet"
      detail: "Ignore Onvoldoendes for the first MVP pass; parse it later as validation context."
    - step: "identify class row"
      detail: "Find row where first cell starts with 'Klas:'. Extract class code from that cell."
    - step: "identify metric header row"
      detail: "The next non-empty row contains PCT, DW1, EX1, TOT1, etc."
    - step: "fill-forward subject groups"
      detail: >
        Subject abbreviations appear in the row above metric headers. Empty
        cells under a subject must inherit the previous subject until the next
        subject header appears.
    - step: "detect student rows"
      detail: "Rows after Klasmediaan are students until blank rows or sheet end."
    - step: "extract overall score"
      detail: "Use AlgTo/PCT when available. If absent, mark overall score missing for that period."
    - step: "extract subject score"
      detail: "Use the period schema priority list, usually TOTx before DW/EX."
    - step: "normalise subjects"
      detail: "Map abbreviations to canonical names and keep unknown subjects visible for teacher correction."
    - step: "record warnings"
      detail: "Missing overall, duplicate names, unknown subjects, missing expected period file, and malformed values."

  important_parser_edge_cases:
    - "Merged-cell-like layout may appear as a subject name followed by blank cells."
    - "Semester 2 voorlopig can omit AlgTo and start with subject columns."
    - "Jaarrapport uses PCT instead of TOT1/TOT2/TOT3."
    - "Some EX columns are blank by design; do not turn them into negative flags."
    - "Onvoldoendes is not the primary data source but can validate weak-subject flags."
    - "Class code and track should be inferred from filenames but must be editable."

calculation_strategy:
  principles:
    - "Do not recompute report grades from DW/EX unless explicitly required later."
    - "Use imported report percentages as the source of truth for klassenleraar mode."
    - "Keep every line point traceable to file, sheet, subject, metric, and period."
    - "Never infer a missing subject score as zero."
    - "Do not mix provisional semester 2 with final semester 2 without labeling it."

  overall_score:
    source: "AlgTo PCT per period when available"
    year_source: "Jaarrapport AlgTo PCT"
    display_label: "Jaarpercentage"
    graph_style:
      stroke: "#5200FF"
      opacity: 1
      width: 3
      dash: "none"

  subject_lines:
    source: "canonical subject score per period"
    preferred_metric: "TOTx or PCT according to period schema"
    graph_style:
      palette: "pastel deterministic by subject name"
      opacity_default: 0.42
      opacity_selected: 0.9
      width_default: 1.75
      width_selected: 2.5

  derived_metrics:
    - id: "key_subject_average_latest"
      formula: "mean(latest available score of key subjects)"
    - id: "key_subjects_below_50"
      formula: "count(key subjects with latest available score < 50)"
    - id: "key_subjects_below_60"
      formula: "count(key subjects with latest available score < 60)"
    - id: "broad_subject_risk"
      formula: "count(all subjects with latest available score < 50)"
    - id: "overall_delta"
      formula: "latest overall score - first overall score"
    - id: "subject_delta"
      formula: "latest subject score - first subject score for each subject"

flag_rules:
  tone_levels:
    info: "context only"
    caution: "needs teacher attention"
    critical: "high priority for class council"
    positive: "positive remark candidate"

  proposed_rules:
    - id: "key_subject_critical"
      tone: "critical"
      trigger: "any key subject latest score < 50"
      teacher_copy: "Een sleutelvak voor deze richting staat onder 50%."
      explanation: "Track-specific subjects weigh pedagogically more heavily for this class."

    - id: "multiple_key_subjects_weak"
      tone: "critical"
      trigger: "two or more key subjects latest score < 60"
      teacher_copy: "Meerdere sleutelvakken vragen aandacht."
      explanation: "This can indicate a broader mismatch with the study track."

    - id: "overall_low_year"
      tone: "critical"
      trigger: "year overall score < 50"
      teacher_copy: "Jaartotaal onder 50%."
      explanation: "Use as a preparation signal, never as automatic advice."

    - id: "overall_negative_advice_band"
      tone: "caution"
      trigger: "year overall score >= 50 and < 65"
      teacher_copy: "Jaartotaal onder 65%."
      explanation: "Same broad threshold family as vakdocent mode."

    - id: "track_mismatch_signal"
      tone: "critical"
      trigger: "key_subjects_below_60 >= 3 or key_subject_average_latest < 60"
      teacher_copy: "Mogelijk richtingsgebonden risico."
      explanation: "Only shown when key-subject configuration is confident."

    - id: "positive_stable_profile"
      tone: "positive"
      trigger: "year overall >= 75 and no key subject below 65 and low subject volatility"
      teacher_copy: "Stabiel sterk profiel over de vakken heen."
      explanation: "Candidate for positive workhouding/studiehouding note."

    - id: "sharp_subject_drop"
      tone: "caution"
      trigger: "any selected or key subject drops by at least 12 points between periods"
      teacher_copy: "Opvallende daling in een vaklijn."
      explanation: "Can be used as a conversation starter about context."

    - id: "provisional_changed_materially"
      tone: "info"
      applies_to: "year_3_4 only"
      trigger: "semester_2_prelim and semester_2 differ by >= 8 points in key subject or overall"
      teacher_copy: "Voorlopig resultaat en definitief semesterresultaat verschillen sterk."
      explanation: "Useful for explaining late movement in the year."

    - id: "missing_period_file"
      tone: "caution"
      trigger: "required period file missing for detected year schema"
      teacher_copy: "Niet alle verwachte rapportbestanden zijn opgeladen."
      explanation: "Analysis remains possible but year narrative is incomplete."

    - id: "unknown_track_key_subjects"
      tone: "info"
      trigger: "track cannot be mapped to key-subject config"
      teacher_copy: "Sleutelvakken zijn nog niet zeker voor deze richting."
      explanation: "Ask teacher to select track or manually mark key subjects."

ui_flow:
  splash_screen:
    change:
      - "Add role segmented control before upload area."
      - "Keep vakdocent visually identical after selection."
      - "For klassenleraar, change dropzone copy to ask for 3 or 4 rapportbestanden."
      - "Allow multi-file selection and drag/drop."
      - "Optional later: support folder upload with webkitdirectory where available."

  klassenleraar_steps:
    - step_id: "upload_reports"
      title: "Rapportbestanden opladen"
      purpose: "Collect 3-4 Excel files for one class."
      required_ui:
        - "large drag/drop zone"
        - "file list grouped by inferred period"
        - "warning when class codes differ"
        - "warning when expected period count does not match year schema"

    - step_id: "detect_class_context"
      title: "Klas en richting bevestigen"
      purpose: "Confirm class code, year, period schema, and track."
      required_ui:
        - "class code field"
        - "year selector"
        - "period schema preview"
        - "track selector with inferred suggestion"
        - "key subjects preview chips"

    - step_id: "review_mapping"
      title: "Vakken en periodes controleren"
      purpose: "Let teacher correct subject aliases and file-period mapping."
      required_ui:
        - "file-to-period table"
        - "subject alias table"
        - "unknown subject warning"
        - "student matching preview"
        - "continue button only after blocking issues resolved"

    - step_id: "generate_cards"
      title: "Klassenleraar-kaarten maken"
      purpose: "Aggregate reports into cross-subject student cards."
      required_ui:
        - "short animation matching existing generation screen"
        - "clear count of students, subjects, and periods"

    - step_id: "dashboard"
      title: "Klasoverzicht"
      purpose: "Show class-level patterns and student cards."
      required_ui:
        - "same broad dashboard style as vakdocent"
        - "student cards"
        - "class histogram based on year overall score"
        - "key-subject risk counts"
        - "student table sorted by name by default"

student_card_design:
  preserve_from_vakdocent:
    - "student header"
    - "class badge"
    - "overall score badge"
    - "flags and summary section"
    - "teacher judgement text area"
    - "print button on card"
    - "rondleiding support"
    - "compact A4 direction"

  replace_or_adapt:
    old: "single-subject dots/trend graph"
    new: "multi-line subject evolution graph"
    graph_requirements:
      x_axis: "period labels from schema"
      y_axis: "0-100 percentage"
      overall_line:
        label: "Jaarpercentage / Algemeen totaal"
        style: "solid primary purple"
      subject_lines:
        label: "one line per subject"
        style: "slightly opaque pastel colours"
      interactions:
        - "hover point: subject, period, score, source metric"
        - "click point: modal with file, sheet, raw metric, and score"
        - "legend click: toggle subject"
        - "dropdown multi-select: show all, key subjects, weak subjects, or manually selected subjects"
      default_subject_visibility:
        first_choice: "overall line + key subjects + subjects below 60"
        fallback: "overall line + all subjects if <= 8 subjects"

  new_sections:
    - id: "track_context"
      title: "Richting en sleutelvakken"
      content:
        - "track label"
        - "key subject chips"
        - "small note that key-subject rules are guidance, not decisions"
    - id: "subject_matrix"
      title: "Vakoverzicht"
      content:
        - "rows are subjects"
        - "columns are periods"
        - "highlight key subjects"
        - "highlight scores below 50 and below 60"

graph_implementation:
  component_name: "ClassTeacherYearLines"
  recommended_technology: "native SVG, consistent with existing charts"
  sizing:
    desktop_height: 260
    compact_height: 220
    mobile_height: 240
    margins:
      top: 18
      right: 24
      bottom: 42
      left: 42
  colour_strategy:
    primary_line: "#5200FF"
    subject_palette: "pastel deterministic HSL generated from canonical subject name"
    key_subject_emphasis: "slightly stronger opacity and width"
    non_selected_subject_opacity: 0.18
  accessibility:
    - "SVG role img with descriptive aria-label"
    - "keyboard-focusable points where practical"
    - "text fallback table in subject matrix"
    - "do not rely on colour alone for key subjects"

storage_and_project_json:
  mode_field:
    name: "mode"
    allowed_values: ["vakdocent", "klassenleraar"]
  klassenleraar_project_payload:
    include:
      - "mode"
      - "parsed report files"
      - "period mapping"
      - "subject aliases"
      - "track selection"
      - "key subject overrides"
      - "notes"
      - "filters"
    privacy_note: >
      Keep the same explicit save/download pattern. Do not silently persist
      uploaded report data in localStorage.

implementation_plan:
  phase_0_discovery:
    goal: "Lock assumptions before UI work."
    tasks:
      - "Add this plan to docs."
      - "Create a small parser spike script or temporary debug page for example_folder_klassenleraar."
      - "Document exact subject abbreviations found in the three sample classes."
      - "Confirm whether Onvoldoendes should be shown in MVP or postponed."
    deliverables:
      - "validated parsing notes"
      - "final period schema constants"

  phase_1_config_foundation:
    goal: "Create reusable constants for periods, subjects, and tracks."
    tasks:
      - "Create js/class-teacher-config.js."
      - "Define period schemas for year_1_2, year_3_4, year_5_6."
      - "Define subject alias map."
      - "Define track key-subject config."
      - "Add helpers inferYearFromClassCode, inferTrackFromClassCode, inferPeriodFromFileName."
    acceptance:
      - "1STEAM1 maps to year_1_2 and STEaM."
      - "3NW3 maps to year_3_4 and NW."
      - "6LWI6 maps to year_5_6 and LWI with low-confidence track note."

  phase_2_report_parser:
    goal: "Parse one report workbook into period/student/subject data."
    tasks:
      - "Create js/class-teacher-parser.js."
      - "Reuse readXlsxWorkbook output."
      - "Detect main report sheet and ignore Onvoldoendes initially."
      - "Detect class code and metric header rows."
      - "Fill-forward subject names across grouped columns."
      - "Extract student rows and subject period scores."
      - "Emit warnings for unknown subjects, missing AlgTo, and duplicate names."
    acceptance:
      - "Each example file yields classCode, period guess, subjects, students, and warnings."
      - "No blank EX column is treated as zero."
      - "Semester 2 voorlopig can parse without an overall AlgTo score."

  phase_3_multi_file_aggregator:
    goal: "Merge 3-4 report workbooks into a single class-teacher analysis input."
    tasks:
      - "Create js/class-teacher-aggregator.js."
      - "Group files by class code."
      - "Validate that uploaded files belong to one class unless teacher overrides."
      - "Map files to expected period schema."
      - "Merge students by normalized name and class code."
      - "Build per-student period arrays and subject arrays."
    acceptance:
      - "1STEAM1 has 4 periods."
      - "3NW3 has 4 periods including provisional semester 2."
      - "6LWI6 has 3 periods."
      - "Missing periods create warnings, not crashes."

  phase_4_calculation_and_flags:
    goal: "Calculate cross-subject card data and key-subject warnings."
    tasks:
      - "Create js/class-teacher-calculator.js."
      - "Calculate latest overall, year overall, overall delta, subject deltas."
      - "Mark key subjects per selected track."
      - "Implement proposed flag rules."
      - "Add Dutch and English i18n strings for new flags."
      - "Return data in a shape close to existing student card model."
    acceptance:
      - "Students with weak key subjects receive visible, explainable flags."
      - "Positive stable profiles receive positive remarks."
      - "Unknown track shows an info warning instead of pretending confidence."

  phase_5_mode_split_ui:
    goal: "Add role toggle without disturbing vakdocent mode."
    tasks:
      - "Add role segmented control to splash screen."
      - "Keep existing upload state for vakdocent."
      - "Add multi-file upload state for klassenleraar."
      - "Show inferred class/year/period count immediately after upload."
      - "Update JSON import to route by payload.mode."
    acceptance:
      - "Existing vakdocent example flow still works."
      - "Klassenleraar upload accepts 3-4 Excel files."
      - "Wrong number of files shows beginner-friendly warning."

  phase_6_mapping_review_ui:
    goal: "Let teachers correct inference before cards are generated."
    tasks:
      - "Build file-to-period review table."
      - "Build track selector and key subject preview."
      - "Build subject alias correction table."
      - "Build student matching preview."
      - "Disable generate only for blocking issues."
    acceptance:
      - "Teacher can correct 6LWI6 track."
      - "Teacher can map an unknown abbreviation to a known subject."
      - "Teacher sees which period file is missing or duplicated."

  phase_7_card_and_graph_ui:
    goal: "Render klassenleraar cards using existing visual language."
    tasks:
      - "Create ClassTeacherStudentCard or adapt StudentCard with mode prop."
      - "Replace single-subject trend graph with ClassTeacherYearLines."
      - "Add subject multi-select/dropdown."
      - "Add subject matrix."
      - "Preserve notes, print button, navigation, and rondleiding."
      - "Update rondleiding steps for klassenleraar mode."
    acceptance:
      - "Overall line is solid #5200FF."
      - "Subject lines are pastel and partially transparent."
      - "Dropdown can show one or multiple subjects."
      - "Key subjects are easy to identify."

  phase_8_dashboard_ui:
    goal: "Add class-teacher overview above the cards."
    tasks:
      - "Show student count, class average year score, and 'hoofdvak in de gevarenzone' count."
      - "Show histogram of year overall score."
      - "Show sortable student table with 'hoofdvak in de gevarenzone' summary."
      - "Add filters for 'hoofdvak in de gevarenzone', score band, and subject."
    acceptance:
      - "Default sort remains name A-Z."
      - "Clicking a student opens their card."
      - "Teacher can filter students with a main subject in the danger zone."

  phase_9_testing:
    goal: "Make regressions visible before demo."
    status: "implemented"
    tasks:
      - "Add parser fixture tests for all example_folder_klassenleraar files."
      - "Add aggregation tests for 1STEAM1, 3NW3, and 6LWI6."
      - "Add calculation tests for main-subject danger-zone flags."
      - "Add build verification."
      - "Add screenshot/manual checklist for graph readability."
    implementation:
      regression_script: "scripts/run-class-teacher-regression.js"
      workbook_reader: "scripts/workbook-reader.js"
      npm_scripts:
        full: "npm test"
        data_only: "npm run test:class-teacher"
      manual_checklist: "docs/klassenleraar_graph_readability_checklist.md"
    acceptance:
      - "Build passes."
      - "All example class folders generate student cards."
      - "No example data is copied into dist."

  phase_10_polish:
    goal: "Make the new mode feel as polished as the existing mode."
    status: "implemented"
    tasks:
      - "Add upload/generation animations matching current splash style."
      - "Tune pastel line palette for readability."
      - "Add empty states for missing period and unknown track."
      - "Update docs and README with both modes."
      - "Review A4 card print layout for multi-subject cards."
    implementation:
      generation_bridge: "ClassTeacherGenerationScreen adds a short animated build step between mapping confirmation and cards."
      graph_readability: "Subject line colours are stronger, point labels show on hover/focus, and the chart includes a compact legend."
      empty_states: "Unknown track and missing period states render as calm notices in review/dashboard."
      print_review: "Print CSS hides interactive controls and protects the multi-line graph from clipping."
    acceptance:
      - "Teacher can complete the flow without reading technical docs."
      - "Card remains scannable on one screen as much as possible."
      - "Print does not clip the multi-line graph."

open_questions:
  - question: "Should Onvoldoendes be displayed in the MVP?"
    recommendation: "Postpone visual display; use it first for validation warnings."
  - question: "Are track key-subject lists official or school-specific?"
    recommendation: "Treat as configurable school policy, not universal truth."
  - question: "Should the graph default to all subjects?"
    recommendation: "Default to overall + key subjects + weak subjects to avoid visual noise."
  - question: "Should provisional semester 2 be included in the year line?"
    recommendation: "Show it as its own x-axis point, clearly labeled voorlopig."
  - question: "How should LWI and other upper-year tracks be finalized?"
    recommendation: "Start with low-confidence defaults and require teacher confirmation."

minimum_viable_scope:
  must_have:
    - "splash role toggle"
    - "multi-file upload for klassenleraar"
    - "period schema detection"
    - "report summary parser"
    - "subject alias normalization"
    - "track selector and key-subject config"
    - "student cards with multi-line graph"
    - "key-subject flags"
    - "project JSON import/export with mode"
    - "tests against example_folder_klassenleraar"

  should_have:
    - "subject dropdown/multi-select on each card"
    - "subject matrix below graph"
    - "teacher-friendly file mapping review"
    - "rondleiding adapted to klassenleraar mode"
    - "print review for multi-subject cards"

  could_have_later:
    - "folder upload"
    - "Onvoldoendes sheet visualization"
    - "manual key-subject overrides per class"
    - "compare with class median per subject and period"
    - "export klassenraad agenda for klassenleraar"

first_implementation_step:
  title: "Build the report parser spike"
  why_first: >
    The largest uncertainty is not UI but the report table structure. Once the
    parser reliably extracts period/subject/student scores from the example
    files, the rest of the feature can reuse existing dashboard and card ideas.
  exact_tasks:
    - "Create js/class-teacher-config.js with period schemas and aliases."
    - "Create js/class-teacher-parser.js with parseReportWorkbook(workbook, options)."
    - "Add a temporary regression script that reads example_folder_klassenleraar and prints summary JSON."
    - "Verify 1STEAM1, 3NW3, and 6LWI6 are recognized correctly."
  done_when:
    - "Every example file reports classCode, periodId, subject count, student count."
    - "At least one known student per class has subject scores for every available period."
    - "Warnings are explicit and understandable."
```
