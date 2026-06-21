You are an expert coder. Analyse the following MVP brief in YAML. Then make a detailed file tree for this project. Then create a basic HTML example barebones for this MVP. 

project:
  name: "Local Orientation Evidence Dashboard"
  type: "static client-side web app"
  hosting_target: "GitHub Pages"
  privacy_model: "local-first; no backend; no student data leaves browser"
  core_positioning: >
    A teacher-facing tool that transforms an Excel export from a learning
    platform into transparent, printable student evidence cards for orientation
    and class council preparation.

non_goals:
  - "Do not build a full student information system."
  - "Do not build a gradebook editor."
  - "Do not send Excel data to any server."
  - "Do not generate automatic orientation decisions."
  - "Do not use predictive AI in the MVP."

user_flow:
  - step: "Upload Excel export"
    details:
      - "Use browser file input and drag-and-drop."
      - "Parse file locally."
      - "Show filename, sheet names, and detected structure."
  - step: "Map data"
    details:
      - "Auto-detect class blocks, student names, assignments, periods, max scores, scores, averages, and comments."
      - "Provide manual correction UI for wrongly detected columns or rows."
      - "Show data-quality warnings before generating cards."
  - step: "Configure subject model"
    details:
      - "Ask for subject/course name."
      - "Ask for year/class."
      - "Allow arbitrary weighted categories."
      - "Support examples such as DW S1, EX S1, DW S2, Partial EX, EX S2."
      - "Normalize absolute weights to total weight."
      - "Save weighting presets locally."
  - step: "Generate analysis"
    details:
      - "Compute raw totals."
      - "Compute category averages."
      - "Compute weighted totals."
      - "Compute class mean, median, min, max, quartiles, percentile, and standard deviation."
      - "Compute evidence coverage per student."
      - "Compute DW-versus-exam gap when categories allow it."
      - "Compute trend across periods when date or period metadata is available."
  - step: "Render dashboard"
    details:
      - "Show class overview first."
      - "Show searchable/filterable student card list."
      - "Allow switching to one-student meeting mode."
  - step: "Export"
    details:
      - "Browser print stylesheet for PDF."
      - "Export anonymised CSV summary."
      - "Export local JSON project file containing parsed data and configuration."

student_card:
  sections:
    - header:
        fields:
          - student_name
          - class_code
          - subject
          - evidence_coverage
          - final_weighted_grade
          - percentile_band
    - score_summary:
        fields:
          - category
          - points_earned
          - points_possible
          - raw_percentage
          - weight
          - weighted_contribution
    - visual_context:
        charts:
          - type: "dot_plot"
            requirement: "Show all class students on 0-100 scale and highlight selected student."
          - type: "histogram"
            requirement: "Show actual class distribution."
          - type: "box_plot_or_quartile_strip"
            requirement: "Show median, Q1, Q3, and outliers if implemented."
          - type: "optional_normal_overlay"
            requirement: "Clearly label as reference only, not actual distribution."
    - trend:
        fields:
          - period_scores
          - trend_direction
          - volatility
    - comments:
        fields:
          - evaluation_comments
          - report_comments
          - subject_comments
          - exam_comments
        requirement: "Group chronologically and by source."
    - flags:
        deterministic_only:
          - missing_data
          - low_evidence_coverage
          - declining_trend
          - large_dw_exam_gap
          - below_threshold
          - high_volatility
        requirement: "Flags must be explainable and clickable."
    - teacher_judgement:
        fields:
          - notes
          - orientation_considerations
          - decision_status
        requirement: "Keep teacher judgement separate from calculated evidence."

class_dashboard:
  required_widgets:
    - "Number of students"
    - "Class average"
    - "Median"
    - "Standard deviation"
    - "Number below configured threshold"
    - "Number with incomplete evidence"
    - "Histogram of final weighted grades"
    - "Sortable table of students"
  filters:
    - class
    - category
    - threshold_band
    - missing_data
    - trend
    - flag_type

calculation_engine:
  principles:
    - "Every calculated value must be traceable."
    - "Weights may be entered as percentages or absolute point weights."
    - "Weights are normalized internally."
    - "Missing and excused values must be handled explicitly."
    - "No silent exclusion of data."
  formulas:
    category_percentage: "sum(points_earned_in_category) / sum(points_possible_in_category) * 100"
    weighted_total: "sum(category_percentage * normalized_category_weight)"
    evidence_coverage: "available_required_components / expected_required_components"
    percentile: "position of student total relative to class totals"
  edge_cases:
    - absent_score
    - excused_score
    - zero_point_assignment
    - malformed_numeric_value
    - duplicate_student_name
    - multiple_classes_in_one_sheet
    - comments_without_scores
    - assignments_without_category
    - weights_not_summing_to_expected_total

visual_design:
  constraints:
    - "Readable on teacher laptop."
    - "Print-friendly A4 layout."
    - "No decorative chart junk."
    - "Use consistent threshold bands: 90, 80, 70, 60, 50, below 50."
    - "Do not imply a forced bell curve."
  preferred_components:
    - cards
    - tables
    - collapsible calculation drawers
    - sticky class summary header
    - warning banners for data-quality issues

privacy_and_security:
  requirements:
    - "No backend."
    - "No analytics scripts."
    - "No external calls after app load, except static library assets if CDN is used."
    - "Prefer bundled dependencies for offline/private deployment."
    - "Display local-processing notice."
    - "Add clear data-reset button."
    - "Support anonymised mode."
    - "Do not persist student data unless user explicitly exports a local project file."

technology:
  allowed:
    - "HTML"
    - "CSS"
    - "Vanilla JavaScript or lightweight framework"
    - "SheetJS/xlsx or equivalent client-side Excel parser"
    - "Chart.js for basic charts"
  optional:
    - "D3 only if Chart.js cannot support the required distribution visualisations"
    - "Service worker for offline app shell"
  forbidden_for_mvp:
    - "Server database"
    - "Authentication"
    - "Cloud storage"
    - "Remote AI API"
    - "Telemetry"

acceptance_criteria:
  - "Teacher can upload the provided Excel export."
  - "Tool detects at least one class and student list."
  - "Teacher can correct mappings before analysis."
  - "Teacher can define arbitrary weighted categories."
  - "Every student receives a card."
  - "Each card shows weighted total, calculation breakdown, comments, distribution position, and evidence coverage."
  - "Class overview shows distribution and missing-data warnings."
  - "All processing works offline after assets are loaded."
  - "No student data is transmitted externally."
  - "Printed output is usable for a class council."
  
  
  🔍 YAML Brief Analysis
This MVP is a strictly local-first, teacher-facing evidence generator designed for transparency, auditability, and print readiness. Key architectural implications:

Requirement	Implementation Implication
No backend / privacy-first	All parsing, calculation, and rendering must happen in-browser. localStorage only for presets, never for student data. Explicit data-reset & anonymise toggles.
Excel → Mapping → Weights → Cards	State machine UI: Upload → Map → Configure → Dashboard → Export. Each step validates before progression.
Traceable calculations	Every derived value (weighted total, coverage, percentile, trend) must expose its formula & raw inputs in collapsible drawers.
Print-friendly A4	CSS @media print must strip UI chrome, paginate cards cleanly, enforce threshold band colors, and hide interactive elements.
Vanilla JS + SheetJS + Chart.js	Keep dependencies minimal. Bundle xlsx & chart.js locally for offline compliance. Avoid framework overhead.
Deterministic flags only	No AI/predictions. Flags are rule-based (missing data, coverage < X%, declining trend, DW/EX gap, below threshold). Clickable to show derivation.
📁 Detailed File Tree
local-orientation-dashboard/
├── index.html                  # Entry point, static shell
├── css/
│   ├── main.css               # Base reset, typography, layout grid
│   ├── dashboard.css          # Class overview, filters, stats widgets
│   ├── cards.css              # Student card layout, threshold bands, flags
│   ├── drawers.css            # Collapsible calculation breakdowns
│   └── print.css              # @media print rules, pagination, hide UI
├── js/
│   ├── app.js                 # Bootstrapper, step navigation, event wiring
│   ├── config.js              # Constants, threshold bands, default weights
│   ├── parser.js              # SheetJS integration, drag/drop, sheet detection
│   ├── mapper.js              # Column/row mapping UI, validation, warnings
│   ├── calculator.js          # Weighted totals, stats, coverage, trends, flags
│   ├── renderer.js            # DOM generation for dashboard & student cards
│   ├── charts.js              # Chart.js dot plot, histogram, box plot wrappers
│   ├── exporter.js            # CSV anonymisation, JSON project export, print trigger
│   └── storage.js             # Local preset saving, data reset, anonymise toggle
├── lib/
│   ├── xlsx.full.min.js       # SheetJS (bundled for offline)
│   └── chart.umd.min.js       # Chart.js (bundled for offline)
├── assets/
│   └── favicon.ico
├── .gitignore
└── README.md                  # Setup, privacy notice, offline instructions
Module Mapping to Brief:

parser.js → Handles drag/drop, reads sheets, detects structure
mapper.js → Auto-detects columns, provides correction UI, shows data-quality warnings
config.js + calculator.js → Arbitrary weighted categories, normalization, edge-case handling
renderer.js + charts.js → Class dashboard widgets, student cards, distribution visuals
exporter.js → Print stylesheet trigger, anonymised CSV, local JSON project file
storage.js → Preset persistence, explicit data reset, anonymised mode toggle
🖥️ Barebones HTML Example
A single-file MVP skeleton that demonstrates the flow, card structure, threshold bands, print readiness, and privacy controls.

html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Local Orientation Evidence Dashboard</title>
  <style>
    :root {
      --band-90: #16a34a; --band-80: #4ade80; --band-70: #86efac;
      --band-60: #facc15; --band-50: #fb923c; --band-low: #ef4444;
      --bg: #f8fafc; --card-bg: #fff; --text: #0f172a; --muted: #64748b;
      --border: #e2e8f0; --radius: 8px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; padding: 1rem; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 2px solid var(--border); padding-bottom: 1rem; }
    .privacy-notice { font-size: 0.85rem; color: var(--muted); background: #e0f2fe; padding: 0.5rem 1rem; border-radius: var(--radius); }
    .hidden { display: none !important; }
    .btn { padding: 0.5rem 1rem; border: 1px solid var(--border); background: #fff; border-radius: var(--radius); cursor: pointer; }
    .btn:hover { background: #f1f5f9; }
    .btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
    
    /* Upload Zone */
    #upload-zone { border: 2px dashed var(--border); padding: 3rem; text-align: center; border-radius: var(--radius); cursor: pointer; transition: 0.2s; }
    #upload-zone.dragover { border-color: #2563eb; background: #eff6ff; }
    
    /* Dashboard */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
    .stat-card { background: var(--card-bg); padding: 0.75rem; border-radius: var(--radius); border: 1px solid var(--border); }
    .stat-value { font-size: 1.25rem; font-weight: 600; }
    .stat-label { font-size: 0.8rem; color: var(--muted); }
    
    /* Student Card */
    .student-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem; page-break-inside: avoid; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .threshold-badge { padding: 0.25rem 0.5rem; border-radius: 4px; color: #fff; font-weight: 600; font-size: 0.8rem; }
    .card-section { margin-bottom: 0.75rem; }
    .card-section h4 { font-size: 0.9rem; color: var(--muted); margin-bottom: 0.25rem; }
    .score-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .score-table th, .score-table td { text-align: left; padding: 0.4rem; border-bottom: 1px solid var(--border); }
    .flag { display: inline-block; padding: 0.2rem 0.5rem; background: #fef2f2; color: #b91c1c; border-radius: 4px; font-size: 0.75rem; margin-right: 0.5rem; cursor: help; }
    .teacher-judgement { background: #fffbeb; padding: 0.75rem; border-radius: var(--radius); border-left: 4px solid #f59e0b; }
    
    /* Print */
    @media print {
      body { background: #fff; padding: 0; }
      header, .controls, #upload-zone, .btn { display: none !important; }
      .student-card { break-inside: avoid; border: 1px solid #ccc; margin-bottom: 1.5rem; }
      .threshold-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <header>
    <h1>📊 Local Orientation Evidence Dashboard</h1>
    <div style="display:flex; gap:0.5rem; align-items:center;">
      <span class="privacy-notice">🔒 All data processed locally. Nothing leaves your browser.</span>
      <button class="btn" id="btn-reset">🗑️ Reset Data</button>
      <button class="btn btn-primary" id="btn-print">🖨️ Print / Export PDF</button>
    </div>
  </header>

  <main>
    <!-- STEP 1: Upload -->
    <section id="step-upload">
      <div id="upload-zone">
        <p>📁 Drag & drop Excel export here, or click to browse</p>
        <input type="file" id="file-input" accept=".xlsx,.xls" style="display:none;">
      </div>
    </section>

    <!-- STEP 2: Mapping & Config (Placeholder) -->
    <section id="step-mapping" class="hidden">
      <h2>🔍 Column Mapping & Subject Configuration</h2>
      <p>Auto-detected: <code>Student Name, Class, DW S1, EX S1, DW S2, EX S2, Comments</code></p>
      <div style="margin:1rem 0; padding:1rem; background:#fff; border:1px solid var(--border); border-radius:var(--radius);">
        <label>Subject: <input type="text" value="Mathematics S1"></label><br><br>
        <label>Weighting Preset: 
          <select><option>Default (DW 40%, EX 60%)</option><option>Custom</option></select>
        </label>
      </div>
      <button class="btn btn-primary" id="btn-generate">✅ Generate Analysis & Cards</button>
    </section>

    <!-- STEP 3: Dashboard -->
    <section id="step-dashboard" class="hidden">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">24</div><div class="stat-label">Students</div></div>
        <div class="stat-card"><div class="stat-value">72.4%</div><div class="stat-label">Class Mean</div></div>
        <div class="stat-card"><div class="stat-value">74.0%</div><div class="stat-label">Median</div></div>
        <div class="stat-card"><div class="stat-value">8.2</div><div class="stat-label">Std Dev</div></div>
        <div class="stat-card"><div class="stat-value">3</div><div class="stat-label">Below 60%</div></div>
        <div class="stat-card"><div class="stat-value">2</div><div class="stat-label">Incomplete Evidence</div></div>
      </div>

      <div class="controls" style="margin-bottom:1rem; display:flex; gap:0.5rem;">
        <input type="text" placeholder="🔍 Search student..." style="padding:0.4rem; border:1px solid var(--border); border-radius:var(--radius);">
        <select style="padding:0.4rem; border:1px solid var(--border); border-radius:var(--radius);">
          <option>All Thresholds</option><option>≥90%</option><option>80-89%</option><option>70-79%</option><option>60-69%</option><option>50-59%</option><option>&lt;50%</option>
        </select>
        <select style="padding:0.4rem; border:1px solid var(--border); border-radius:var(--radius);">
          <option>All Flags</option><option>Missing Data</option><option>Declining Trend</option><option>DW/EX Gap</option>
        </select>
      </div>

      <div id="cards-container">
        <!-- Cards injected via JS -->
      </div>
    </section>
  </main>

  <script>
    // Minimal flow control & mock rendering
    const steps = { upload: document.getElementById('step-upload'), mapping: document.getElementById('step-mapping'), dashboard: document.getElementById('step-dashboard') };
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('dragover'); showMapping(); });
    fileInput.addEventListener('change', showMapping);

    function showMapping() {
      steps.upload.classList.add('hidden');
      steps.mapping.classList.remove('hidden');
    }

    document.getElementById('btn-generate').addEventListener('click', () => {
      steps.mapping.classList.add('hidden');
      steps.dashboard.classList.remove('hidden');
      renderMockCards();
    });

    document.getElementById('btn-print').addEventListener('click', () => window.print());
    document.getElementById('btn-reset').addEventListener('click', () => {
      if(confirm('Clear all loaded data and presets?')) {
        location.reload();
      }
    });

    function getBandClass(pct) {
      if(pct >= 90) return 'var(--band-90)';
      if(pct >= 80) return 'var(--band-80)';
      if(pct >= 70) return 'var(--band-70)';
      if(pct >= 60) return 'var(--band-60)';
      if(pct >= 50) return 'var(--band-50)';
      return 'var(--band-low)';
    }

    function renderMockCards() {
      const container = document.getElementById('cards-container');
      container.innerHTML = `
        <div class="student-card">
          <div class="card-header">
            <div>
              <strong>Lena Müller</strong> <span style="color:var(--muted)">| Math S1 | 9B</span>
              <div style="font-size:0.8rem; color:var(--muted);">Coverage: 100% | Percentile: 78th</div>
            </div>
            <span class="threshold-badge" style="background:${getBandClass(74)}">74%</span>
          </div>

          <div class="card-section">
            <h4>📊 Score Summary</h4>
            <table class="score-table">
              <tr><th>Category</th><th>Earned</th><th>Possible</th><th>Raw %</th><th>Weight</th><th>Contrib.</th></tr>
              <tr><td>DW S1</td><td>18</td><td>20</td><td>90%</td><td>20%</td><td>18.0</td></tr>
              <tr><td>EX S1</td><td>32</td><td>40</td><td>80%</td><td>30%</td><td>24.0</td></tr>
              <tr><td>DW S2</td><td>14</td><td>20</td><td>70%</td><td>20%</td><td>14.0</td></tr>
              <tr><td>EX S2</td><td>22</td><td>40</td><td>55%</td><td>30%</td><td>16.5</td></tr>
              <tr style="font-weight:600"><td>Weighted Total</td><td colspan="4" style="text-align:right">72.5%</td><td>72.5</td></tr>
            </table>
          </div>

          <div class="card-section">
            <h4>📈 Visual Context & Trend</h4>
            <div style="height:60px; background:#f1f5f9; border-radius:4px; display:flex; align-items:center; justify-content:center; color:var(--muted); font-size:0.8rem;">
              [Chart.js Dot Plot + Histogram Placeholder]
            </div>
            <div style="margin-top:0.5rem; font-size:0.85rem;">Trend: ↘ Declining | Volatility: Low</div>
          </div>

          <div class="card-section">
            <h4>🚩 Deterministic Flags</h4>
            <span class="flag" title="Final grade < 60% threshold">Below Threshold</span>
            <span class="flag" title="DW avg (80%) vs EX avg (67.5%) gap > 10%">DW/EX Gap</span>
          </div>

          <div class="card-section">
            <h4>💬 Comments</h4>
            <ul style="font-size:0.85rem; padding-left:1.2rem;">
              <li><strong>EX S1:</strong> Strong algebra, struggles with proof structure.</li>
              <li><strong>Teacher:</strong> Consistent effort, needs targeted practice on exam timing.</li>
            </ul>
          </div>

          <div class="teacher-judgement">
            <h4>🧑‍🏫 Teacher Judgement (Separate from Calculations)</h4>
            <textarea style="width:100%; height:60px; margin-top:0.5rem; padding:0.5rem; border:1px solid var(--border); border-radius:4px;" placeholder="Orientation considerations, notes, decision status..."></textarea>
          </div>
        </div>
      `;
    }
  </script>
</body>
</html>