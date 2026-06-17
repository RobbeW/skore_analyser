import { BRAND_COLORS, SAMPLE_FILES, THRESHOLD_BANDS, thresholdBand } from "./config.js";
import { summariseStudents } from "./calculator.js";
import { t } from "./i18n.js";

const BASKET_PRESETS = {
  iw: {
    labelKey: "preset.iw",
    weights: { DW1: 10, EX1: 30, DW2: 15, EXPAR: "", EX2: 45 },
  },
  dwex: {
    labelKey: "preset.dwex",
    weights: { DW1: 12.5, EX1: 37.5, DW2: 12.5, EXPAR: "", EX2: 37.5 },
  },
};

const BASKET_NAMES = ["DW1", "EX1", "DW2", "EXPAR", "EX2"];

export function renderSampleButtons(container, onLoad) {
  container.innerHTML = SAMPLE_FILES.map((file) => {
    const label = file.split("/").pop();
    return `<button class="button" type="button" data-sample="${escapeAttr(file)}">${escapeHtml(label)}</button>`;
  }).join("");
  container.querySelectorAll("[data-sample]").forEach((button) => {
    button.addEventListener("click", () => onLoad(button.dataset.sample));
  });
}

export function setWorkflowStep(step) {
  const previousStep = document.body.dataset.workflowStep;
  document.body.dataset.workflowStep = step;
  document.getElementById("upload-step").classList.toggle("hidden", step !== "upload");
  document.getElementById("mapping-step").classList.toggle("hidden", step !== "map");
  document.getElementById("dashboard-step").classList.toggle("hidden", step !== "dashboard");
  if (previousStep !== step) {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }
}

export function renderDetectedSummary(model, container) {
  const primarySubject = model.subjects[0]?.value || t("option.none");
  const classList = model.classes.map((entry) => `${entry.value} (${entry.count})`).join(", ") || t("option.none");
  container.innerHTML = `
    <div class="detected-summary-card">
      <div>
        <p class="eyebrow">${t("detected.ready")}</p>
        <h3>${escapeHtml(primarySubject)}</h3>
        <p>${escapeHtml(t("detected.simpleLine", {
          fileName: model.fileName,
          students: model.students.length,
          classes: model.classes.length,
          assignments: model.assignments.length,
        }))}</p>
      </div>
      <div class="detected-pills">
        <span>${escapeHtml(classList)}</span>
        <span>${t("detected.blankScores")}: ${model.totals.missingCells}</span>
      </div>
    </div>
    <details class="advanced-panel">
      <summary>${t("detected.technicalDetails")}</summary>
      <div class="detected-grid">
        ${stat(t("detected.workbook"), model.fileName)}
        ${stat(t("detected.sheets"), model.sheetNames.length)}
        ${stat(t("detected.classes"), classList)}
        ${stat(t("detected.subject"), primarySubject)}
        ${stat(t("detected.students"), model.students.length)}
        ${stat(t("detected.assignments"), model.assignments.length)}
        ${stat(t("detected.comments"), model.totals.comments)}
        ${stat(t("detected.blankScores"), model.totals.missingCells)}
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>${t("table.sheet")}</th><th>${t("table.rows")}</th><th>${t("table.cols")}</th><th>${t("table.rawBlocks")}</th><th>${t("table.summaryBlocks")}</th><th>${t("detected.assignments")}</th><th>${t("detected.comments")}</th></tr>
          </thead>
          <tbody>
            ${model.sheets.map((sheet) => `
              <tr>
                <td>${escapeHtml(sheet.name)}</td>
                <td>${sheet.rowCount}</td>
                <td>${sheet.columnCount}</td>
                <td>${sheet.rawBlocks || 0}</td>
                <td>${sheet.summaryBlocks || 0}</td>
                <td>${sheet.assignments || 0}</td>
                <td>${sheet.comments || 0}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}

export function renderWarnings(model, container) {
  if (!model.warnings.length) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `
    <details class="warning-box warning-accordion">
      <summary>
        <span>${t("warnings.title")}</span>
        <strong>${t("warnings.count", { count: model.warnings.length })}</strong>
      </summary>
      <ul>${model.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>
    </details>
  `;
}

export function renderMappingForm(model, config, presets, container) {
  const categoryOptions = BASKET_NAMES;
  const basketWeights = basketWeightsFromConfig(config);
  container.innerHTML = `
    <ol class="setup-progress" aria-label="${t("mapping.progressLabel")}">
      <li><span>1</span>${t("mapping.stepCourse")}</li>
      <li><span>2</span>${t("mapping.stepBaskets")}</li>
      <li><span>3</span>${t("mapping.stepCheck")}</li>
    </ol>
    <div class="setup-wizard">
      <section class="wizard-step">
        <div class="step-number">1</div>
        <div>
          <h3>${t("mapping.stepCourse")}</h3>
          <p class="muted">${t("mapping.stepCourseHelp")}</p>
          <div class="form-grid">
            <label class="field">
              <span>${t("mapping.subject")}</span>
              <input name="subject" value="${escapeAttr(config.subject)}" autocomplete="off">
            </label>
            <label class="field">
              <span>${t("mapping.threshold")}</span>
              <input name="threshold" type="number" min="0" max="100" step="1" value="${escapeAttr(config.threshold)}">
            </label>
          </div>
        </div>
      </section>

      <section class="wizard-step">
        <div class="step-number">2</div>
        <div>
          <h3>${t("mapping.stepBaskets")}</h3>
          <p class="muted">${t("mapping.stepBasketsHelp")}</p>
          <div class="form-grid">
            <label class="field">
              <span>${t("mapping.basketPreset")}</span>
              <select name="basketPreset">
                <option value="iw">${t("preset.iw")}</option>
                <option value="dwex">${t("preset.dwex")}</option>
                <option value="custom">${t("preset.custom")}</option>
              </select>
            </label>
            <label class="field">
              <span>${t("mapping.savePreset")}</span>
              <input name="presetName" placeholder="${t("mapping.presetPlaceholder")}" autocomplete="off">
            </label>
          </div>
          <div class="basket-grid">
            ${BASKET_NAMES.map((name) => basketRow(name, basketWeights.get(name))).join("")}
          </div>
        </div>
      </section>

      <section class="wizard-step">
        <div class="step-number">3</div>
        <div>
          <h3>${t("mapping.stepCheck")}</h3>
          <p class="muted">${t("mapping.stepCheckHelp")}</p>
        </div>
      </section>
    </div>

    <datalist id="category-options">
      ${categoryOptions.map((name) => `<option value="${escapeAttr(name)}"></option>`).join("")}
    </datalist>

    <details class="advanced-panel">
      <summary>${t("mapping.advancedTitle")}</summary>
      <div class="form-grid">
        <label class="field">
          <span>${t("mapping.savedPreset")}</span>
          <select name="preset">
            <option value="">${t("mapping.noPreset")}</option>
            ${presets.map((preset) => `<option value="${escapeAttr(preset.name)}">${escapeHtml(preset.name)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="section-heading">
        <div>
          <h3>${t("mapping.assignmentMapping")}</h3>
          <p class="muted">${t("mapping.assignmentHelp")}</p>
        </div>
      </div>
      <div class="table-wrap">
        <table class="assignment-table">
          <thead>
            <tr>
              <th>${t("mapping.use")}</th><th>${t("mapping.required")}</th><th>${t("table.sheet")}</th><th>${t("mapping.assignment")}</th><th>${t("mapping.date")}</th><th>${t("mapping.category")}</th><th>${t("mapping.max")}</th><th>${t("detected.classes")}</th>
            </tr>
          </thead>
          <tbody>
            ${model.assignments.map((assignment, index) => {
              const override = config.assignments[assignment.id] || {};
              const category = override.category && override.category !== assignment.category ? override.category : inferBasketCategory(assignment, index, model.assignments);
              return `
                <tr class="assignment-row" data-assignment-id="${escapeAttr(assignment.id)}">
                  <td class="small-cell"><input type="checkbox" name="assignmentActive:${escapeAttr(assignment.id)}" ${override.active !== false ? "checked" : ""}></td>
                  <td class="small-cell"><input type="checkbox" name="assignmentRequired:${escapeAttr(assignment.id)}" ${override.required !== false ? "checked" : ""}></td>
                  <td>${escapeHtml(assignment.sheetName)}</td>
                  <td>${escapeHtml(assignment.title)}</td>
                  <td>${escapeHtml(assignment.date || "")}</td>
                  <td><input list="category-options" name="assignmentCategory:${escapeAttr(assignment.id)}" value="${escapeAttr(category)}"></td>
                  <td><input name="assignmentMax:${escapeAttr(assignment.id)}" type="number" min="0" step="0.1" value="${escapeAttr(override.maxPoints ?? assignment.maxPoints)}"></td>
                  <td>${escapeHtml(Array.from(assignment.classCodes || []).join(", "))}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;

  refreshNormalisedWeights(container);
}

export function collectConfigFromForm(model, form, currentConfig) {
  const data = new FormData(form);
  const basketRows = Array.from(form.querySelectorAll(".basket-row"));
  const categories = (basketRows.length ? basketRows : Array.from(form.querySelectorAll(".category-row")))
    .map((row) => ({
      name: (row.querySelector("[data-basket-name]") || row.querySelector("[data-category-name]")).value.trim(),
      weight: Number((row.querySelector("[data-basket-weight]") || row.querySelector("[data-category-weight]")).value || 0),
    }))
    .filter((category) => category.name);

  const assignments = {};
  model.assignments.forEach((assignment, index) => {
    assignments[assignment.id] = {
      active: data.get(`assignmentActive:${assignment.id}`) === "on",
      required: data.get(`assignmentRequired:${assignment.id}`) === "on",
      category: data.get(`assignmentCategory:${assignment.id}`) || inferBasketCategory(assignment, index, model.assignments),
      maxPoints: Number(data.get(`assignmentMax:${assignment.id}`)),
    };
  });

  return {
    ...currentConfig,
    subject: String(data.get("subject") || "").trim(),
    threshold: Number(data.get("threshold") || 50),
    categories,
    assignments,
  };
}

export function applyBasketPreset(form, presetName) {
  const preset = BASKET_PRESETS[presetName];
  if (!preset) return;
  form.querySelectorAll("[data-basket-weight]").forEach((input) => {
    input.value = preset.weights[input.dataset.basketWeight] ?? "";
  });
}

export function addCategoryRow(form) {
  const tbody = form.querySelector("#category-table tbody");
  const index = tbody.querySelectorAll(".category-row").length;
  tbody.insertAdjacentHTML("beforeend", categoryRow("OTHER", 1, index));
  refreshNormalisedWeights(form);
}

export function refreshNormalisedWeights(container) {
  const rows = Array.from(container.querySelectorAll(".basket-row")).length
    ? Array.from(container.querySelectorAll(".basket-row"))
    : Array.from(container.querySelectorAll(".category-row"));
  const weights = rows.map((row) => Number((row.querySelector("[data-basket-weight]") || row.querySelector("[data-category-weight]")).value)).map((value) => Number.isFinite(value) && value > 0 ? value : 0);
  const total = weights.reduce((sum, value) => sum + value, 0) || 1;
  rows.forEach((row, index) => {
    const cell = row.querySelector("[data-normalised-weight], [data-basket-normalised]");
    cell.textContent = `${Math.round((weights[index] / total) * 1000) / 10}%`;
  });
}

export function renderDashboard(analysis, filters, anonymised, container, notes = {}, decisions = {}) {
  const filtered = filterStudents(analysis.students, filters, decisions);
  const stats = summariseStudents(filtered, filters.threshold ?? 50);
  const classes = unique(analysis.students.map((student) => student.classCode));
  const flags = unique(analysis.students.flatMap((student) => student.flags.map((flag) => flag.type)));
  const selectedPeerGroups = new Map();

  for (const student of analysis.students) {
    if (!selectedPeerGroups.has(student.classCode)) {
      selectedPeerGroups.set(student.classCode, analysis.students.filter((peer) => peer.classCode === student.classCode));
    }
  }

  container.innerHTML = `
    <div class="dashboard-header">
      <div class="dashboard-title-row">
        <div>
          <p class="eyebrow">${t("step.3")}</p>
          <h2>${escapeHtml(analysis.subject || t("dashboard.fallbackTitle"))}</h2>
          <p>${escapeHtml(t("dashboard.detectedLine", { fileName: analysis.fileName, students: analysis.students.length, assignments: analysis.assignments.length }))}</p>
        </div>
      </div>
      ${renderClassTabs(classes, analysis.students, filters.classCode)}
      ${renderClassOverviewCards(classes, analysis.students, filters.classCode, filters.threshold ?? 50)}
      <div class="stats-grid">
        ${stat(t("detected.students"), stats.count)}
        ${stat(t("dashboard.classAverage"), formatNumber(stats.mean))}
        ${stat(t("dashboard.median"), formatNumber(stats.median))}
        ${stat(t("dashboard.stddev"), formatNumber(stats.stddev))}
        ${stat(t("dashboard.below", { threshold: filters.threshold ?? 50 }), stats.belowThreshold)}
        ${stat(t("dashboard.incomplete"), stats.incomplete)}
      </div>
      <div class="filters" aria-label="${t("filter.label")}">
        <select id="filter-band" aria-label="${t("filter.allBands")}">
          <option value="all">${t("filter.allBands")}</option>
          ${THRESHOLD_BANDS.map((band) => `<option value="${escapeAttr(band.id)}" ${filters.band === band.id ? "selected" : ""}>${escapeHtml(t(`band.${band.id}`))}</option>`).join("")}
        </select>
        <select id="filter-flag" aria-label="${t("filter.allFlags")}">
          <option value="all">${t("filter.allFlags")}</option>
          ${flags.map((flag) => `<option value="${escapeAttr(flag)}" ${filters.flag === flag ? "selected" : ""}>${escapeHtml(t(`flag.${flag}`))}</option>`).join("")}
        </select>
        <button class="button filter-clear" type="button" data-clear-filters>${t("filter.clear")}</button>
      </div>
    </div>

    <div class="overview-grid">
      <section class="chart-panel">
        <h3>${t("chart.histogramTitle")}</h3>
        ${renderHistogram(filtered)}
      </section>
      <section class="students-panel">
        <h3>${t("student.tableTitle")}</h3>
        ${renderStudentTable(filtered, anonymised, filters)}
      </section>
    </div>

    <div class="cards-heading">
      <h3>${t("student.cardsTitle")}</h3>
    </div>
    <div class="student-cards">
      ${filtered.length ? filtered.map((student, index) => renderStudentCard(student, selectedPeerGroups.get(student.classCode) || filtered, anonymised, index, notes)).join("") : renderEmptyState()}
    </div>
  `;
}

function renderDataQualityPanel(analysis, filtered) {
  const warningCount = analysis.warnings?.length || 0;
  const incomplete = filtered.filter((student) => student.evidence.missingRequired > 0).length;
  return `
    <details class="dashboard-info-panel">
      <summary>
        <span>${t("quality.title")}</span>
        <strong>${t("quality.summary", { warnings: warningCount, incomplete })}</strong>
      </summary>
      <div class="info-grid">
        <div>
          <h3>${t("quality.missingTitle")}</h3>
          <p>${t("quality.missingBody")}</p>
        </div>
        <div>
          <h3>${t("quality.retakeTitle")}</h3>
          <p>${t("quality.retakeBody")}</p>
        </div>
        <div>
          <h3>${t("quality.printTitle")}</h3>
          <p>${t("quality.printBody")}</p>
        </div>
      </div>
    </details>
  `;
}

function renderEmptyState() {
  return `
    <div class="empty-state">
      <h3>${t("empty.title")}</h3>
      <p>${t("empty.body")}</p>
    </div>
  `;
}

function renderClassTabs(classes, students, selectedClass) {
  const tabs = ["all", ...classes];
  return `
    <div class="class-tabs" aria-label="${t("dashboard.classTabs")}">
      ${tabs.map((classCode) => {
        const active = selectedClass === classCode || (!selectedClass && classCode === "all");
        const count = classCode === "all" ? students.length : students.filter((student) => student.classCode === classCode).length;
        const label = classCode === "all" ? t("filter.allClasses") : classCode;
        return `<button class="class-tab ${active ? "is-active" : ""}" type="button" data-class-filter="${escapeAttr(classCode)}">${escapeHtml(label)} <span>${count}</span></button>`;
      }).join("")}
    </div>
  `;
}

function renderClassOverviewCards(classes, students, selectedClass, threshold) {
  if (classes.length < 2) return "";
  return `
    <div class="class-overview-cards" aria-label="${t("dashboard.classOverview")}">
      ${classes.map((classCode) => {
        const classStudents = students.filter((student) => student.classCode === classCode);
        const stats = summariseStudents(classStudents, threshold);
        const active = selectedClass === classCode;
        return `
          <button class="class-overview-card ${active ? "is-active" : ""}" type="button" data-class-filter="${escapeAttr(classCode)}">
            <span>${escapeHtml(classCode)}</span>
            <strong>${stats.count}</strong>
            <small>${t("dashboard.classAverage")}: ${formatNumber(stats.mean)}%</small>
            <small>${t("dashboard.below", { threshold })}: ${stats.belowThreshold}</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderStudentCard(student, peers, anonymised, index, notes = {}) {
  const displayName = anonymised ? t("student.anonymous", { number: String(index + 1).padStart(2, "0") }) : student.name;
  const note = notes[student.id] || "";
  const peerIndex = peers.findIndex((peer) => peer.id === student.id);
  const previousPeer = peerIndex > 0 ? peers[peerIndex - 1] : null;
  const nextPeer = peerIndex >= 0 && peerIndex < peers.length - 1 ? peers[peerIndex + 1] : null;
  return `
    <article class="student-card" id="student-card-${escapeAttr(student.id)}" data-student-id="${escapeAttr(student.id)}">
      <header class="card-header" data-tour-part="total">
        <div>
          <h3 class="student-title">${escapeHtml(displayName)}</h3>
          <div class="student-meta">
            <span>${escapeHtml(student.classCode)}</span>
            <span>${escapeHtml(student.subject || "")}</span>
            <span>${t("student.coverageMeta", { value: formatPercent(student.evidenceCoverage) })}</span>
            <span>${escapeHtml(student.percentileBand)}</span>
          </div>
        </div>
        <div class="card-header-actions">
          <nav class="student-nav" aria-label="${t("student.navLabel")}">
            <button class="button icon-button" type="button" data-dashboard-top aria-label="${t("student.backToOverview")}" title="${t("student.backToOverview")}">↑</button>
            ${previousPeer ? `<button class="button icon-button" type="button" data-student-nav="${escapeAttr(previousPeer.id)}" aria-label="${t("student.previousInClass")}" title="${t("student.previousInClass")}">‹</button>` : ""}
            ${nextPeer ? `<button class="button icon-button" type="button" data-student-nav="${escapeAttr(nextPeer.id)}" aria-label="${t("student.nextInClass")}" title="${t("student.nextInClass")}">›</button>` : ""}
          </nav>
          <button class="button" type="button" data-tour-button>${t("tour.button")}</button>
          <div class="grade-badge ${student.thresholdBand.className}">${formatGrade(student.finalWeighted)}</div>
        </div>
      </header>

      <div class="card-grid score-visual-grid">
        <section class="card-section" data-tour-part="table">
          <h4>${t("student.summary")}</h4>
          <div class="table-wrap">
            <table>
              <thead><tr><th>${t("mapping.category")}</th><th>${t("student.earned")}</th><th>${t("student.possible")}</th><th>${t("student.raw")}</th><th>${t("mapping.weight")}</th><th>${t("student.contribution")}</th></tr></thead>
              <tbody>
                ${student.categoryRows.map((row) => `
                  <tr>
                    <td>${escapeHtml(row.category)}</td>
                    <td>${formatNumber(row.pointsEarned)}</td>
                    <td>${formatAvailablePoints(row)}</td>
                    <td>${row.rawPercentage == null ? t("option.notAvailable") : `${formatNumber(row.rawPercentage)}%`}</td>
                    <td>${formatPercent(row.effectiveWeight)}</td>
                    <td>${formatNumber(row.weightedContribution)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <details class="calculation-drawer">
            <summary>${t("student.calculationTrace")}</summary>
            <p>${t("student.evidenceBody", {
              available: student.evidence.availableRequired,
              expected: student.evidence.expectedRequired,
              coverage: formatPercent(student.evidenceCoverage),
            })}</p>
            <p>${t("student.traceBody")}</p>
            <p>${t("student.importedFinal")}: ${student.importedFinal ? `${escapeHtml(student.importedFinal.source)} ${escapeHtml(student.importedFinal.field)} = ${formatNumber(student.importedFinal.value)}%` : t("student.noImportedFinal")}</p>
          </details>
        </section>

        <section class="card-section" data-tour-part="graph">
          <h4>${t("student.visualContext")}</h4>
          ${renderYearTrend(student.trend)}
          ${renderDotPlot(peers, student)}
          ${renderQuartileStrip(peers, student)}
          ${renderMiniHistogram(peers)}
          <h4>${t("student.trend")}</h4>
          <p class="explain-text">${renderTrendExplanation(student.trend)}</p>
        </section>
      </div>

      <div class="card-grid support-grid print-optional-grid">
        <section class="card-section print-optional">
          <h4>${t("student.comments")}</h4>
          ${student.comments.length ? `
            <ul class="comment-list">
              ${student.comments.map((comment) => `<li><strong>${escapeHtml(comment.source)} - ${escapeHtml(comment.field)}</strong>${escapeHtml(comment.text)}</li>`).join("")}
            </ul>
          ` : `<p class="muted">${t("student.noComments")}</p>`}
        </section>
        <section class="card-section" data-tour-part="advice">
          <h4>${t("student.flags")}</h4>
          ${renderPedagogicalSummary(student)}
          ${student.flags.length ? `
            <ul class="flag-list">
              ${student.flags.map((flag) => `
                <li>
                  <details class="flag-item ${escapeAttr(flag.tone ? `is-${flag.tone}` : "is-info")}">
                    <summary>${escapeHtml(flag.label)}</summary>
                    <p>${escapeHtml(flag.detail)}</p>
                  </details>
                </li>
              `).join("")}
            </ul>
          ` : `<p class="muted">${t("student.noFlags")}</p>`}
        </section>
      </div>

      <section class="card-section" data-tour-part="notes">
        <h4>${t("student.teacherJudgement")}</h4>
        <textarea class="teacher-notes" data-note-student-id="${escapeAttr(student.id)}" placeholder="${t("student.teacherPlaceholder")}">${escapeHtml(note)}</textarea>
      </section>
    </article>
  `;
}

function renderStudentTable(students, anonymised, filters = {}) {
  const sorted = sortStudents(students, filters);
  return `
    <div class="table-wrap student-table-wrap">
      <table class="student-table">
        <thead>
          <tr>
            ${renderSortHeader("name", t("student.student"), filters)}
            ${renderSortHeader("class", t("student.class"), filters)}
            ${renderSortHeader("total", t("student.total"), filters)}
            ${renderSortHeader("coverage", t("student.coverage"), filters)}
            ${renderSortHeader("flags", t("student.flagsShort"), filters)}
          </tr>
        </thead>
        <tbody>
          ${sorted.map((student, index) => `
            <tr class="student-table-row" tabindex="0" data-student-row data-student-id="${escapeAttr(student.id)}" aria-label="${escapeAttr(t("student.openCard"))}: ${escapeAttr(anonymised ? t("student.anonymous", { number: String(index + 1).padStart(2, "0") }) : student.name)}">
              <td>${escapeHtml(anonymised ? t("student.anonymous", { number: String(index + 1).padStart(2, "0") }) : student.name)}</td>
              <td>${escapeHtml(student.classCode)}</td>
              <td>${formatGrade(student.finalWeighted)}</td>
              <td>${formatPercent(student.evidenceCoverage)}</td>
              <td>${student.flags.length}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSortHeader(key, label, filters = {}) {
  const active = (filters.sortKey || "total") === key;
  const direction = active ? filters.sortDirection || "asc" : "asc";
  const nextDirection = active && direction === "asc" ? "desc" : "asc";
  const marker = active ? (direction === "asc" ? "↑" : "↓") : "";
  return `
    <th scope="col" aria-sort="${active ? direction === "asc" ? "ascending" : "descending" : "none"}">
      <button class="table-sort-button ${active ? "is-active" : ""}" type="button" data-table-sort="${escapeAttr(key)}" data-sort-direction="${escapeAttr(nextDirection)}" aria-label="${escapeAttr(t("student.sortBy", { field: label }))}">
        <span>${escapeHtml(label)}</span>
        <span aria-hidden="true">${marker}</span>
      </button>
    </th>
  `;
}

function renderPedagogicalSummary(student) {
  const mainFlag = student.flags[0];
  const nextStep = pedagogicalNextStep(student.flags);
  return `
    <div class="advice-summary">
      <strong>${t("advice.summaryTitle")}</strong>
      <p>${mainFlag ? escapeHtml(mainFlag.label) : t("advice.noSignal")}</p>
      <p>${escapeHtml(nextStep)}</p>
    </div>
  `;
}

function pedagogicalNextStep(flags) {
  const types = new Set(flags.map((flag) => flag.type));
  if (types.has("year_total_below_50")) return t("advice.nextOrientation");
  if (types.has("year_total_below_65") || types.has("below_threshold")) return t("advice.nextRemediation");
  if (types.has("high_volatility") || types.has("declining_trend")) return t("advice.nextConversation");
  if (types.has("low_evidence_coverage") || types.has("insufficient_decision_evidence")) return t("advice.nextEvidence");
  if (types.has("consistent_good_work") || types.has("positive_evolution")) return t("advice.nextPositive");
  return t("advice.nextMonitor");
}

function renderHistogram(students) {
  const bins = [
    [0, 49.999, t("band.low")],
    [50, 59.999, "50-59"],
    [60, 69.999, "60-69"],
    [70, 79.999, "70-79"],
    [80, 89.999, "80-89"],
    [90, 100, "90+"],
  ];
  const counts = bins.map(([min, max]) => students.filter((student) => {
    return Number.isFinite(student.finalWeighted) && student.finalWeighted >= min && student.finalWeighted <= max;
  }).length);
  const max = Math.max(1, ...counts);
  const width = 560;
  const height = 230;
  const left = 42;
  const bottom = 188;
  const barWidth = 64;
  const gap = 20;
  return `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${t("chart.histogramAria")}">
      <line x1="${left}" y1="18" x2="${left}" y2="${bottom}" stroke="${BRAND_COLORS.axis}"></line>
      <line x1="${left}" y1="${bottom}" x2="535" y2="${bottom}" stroke="${BRAND_COLORS.axis}"></line>
      ${bins.map((bin, index) => {
        const x = left + 16 + index * (barWidth + gap);
        const barHeight = (counts[index] / max) * 140;
        const y = bottom - barHeight;
        const band = thresholdBand((bin[0] + Math.min(bin[1], 100)) / 2);
        return `
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="3" fill="${bandColor(band.id)}"></rect>
          <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="12" fill="${BRAND_COLORS.text}">${counts[index]}</text>
          <text x="${x + barWidth / 2}" y="211" text-anchor="middle" font-size="11" fill="${BRAND_COLORS.muted}">${escapeHtml(bin[2])}</text>
        `;
      }).join("")}
    </svg>
  `;
}

function renderMiniHistogram(students) {
  return `<div aria-label="${t("chart.classDistribution")}">${renderHistogram(students).replace("viewBox=\"0 0 560 230\"", "viewBox=\"0 0 560 230\"")}</div>`;
}

function renderYearTrend(trend) {
  const points = (trend.periodScores || []).filter((point) => Number.isFinite(point.value));
  if (points.length < 2) {
    return `<div class="chart-note">${t("chart.noTrendData")}</div>`;
  }

  const width = 560;
  const height = 230;
  const left = 42;
  const top = 18;
  const chartWidth = 490;
  const chartHeight = 145;
  const bottom = top + chartHeight;
  const x = (index) => left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
  const y = (value) => top + (100 - clamp(value, 0, 100)) / 100 * chartHeight;
  const pointPath = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const axisLabels = uniqueTrendLabels(points);
  const regression = regressionLine(points.map((point) => point.value));
  const trendPath = regression
    ? `<line x1="${x(0)}" y1="${y(regression.start)}" x2="${x(points.length - 1)}" y2="${y(regression.end)}" stroke="${BRAND_COLORS.purpleInk}" stroke-width="3" stroke-dasharray="7 5"></line>`
    : "";

  return `
    <figure class="year-chart">
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${t("chart.yearTrend")}">
        <line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="${BRAND_COLORS.axis}"></line>
        <line x1="${left}" y1="${bottom}" x2="${left + chartWidth}" y2="${bottom}" stroke="${BRAND_COLORS.axis}"></line>
        ${[0, 50, 100].map((tick) => `
          <g>
            <line x1="${left - 4}" y1="${y(tick)}" x2="${left + chartWidth}" y2="${y(tick)}" stroke="${BRAND_COLORS.axis}" opacity="${tick === 0 ? "1" : "0.25"}"></line>
            <text x="8" y="${y(tick) + 4}" font-size="11" fill="${BRAND_COLORS.muted}">${tick}%</text>
          </g>
        `).join("")}
        ${trendPath}
        <polyline points="${pointPath}" fill="none" stroke="${BRAND_COLORS.purple}" stroke-width="2.5"></polyline>
        ${points.map((point, index) => `
          <g class="trend-point" role="button" tabindex="0"
            data-trend-point
            data-title="${escapeAttr(point.title || point.sheetName || axisLabels[index])}"
            data-score="${escapeAttr(`${formatNumber(point.value)}% (${formatNumber(point.earned)} / ${formatNumber(point.maxPoints)})`)}"
            data-date="${escapeAttr(point.date || point.sheetName || "")}"
            data-category="${escapeAttr(point.category || "")}">
            <circle cx="${x(index)}" cy="${y(point.value)}" r="5" fill="${BRAND_COLORS.purple}"
              data-trend-point
              data-title="${escapeAttr(point.title || point.sheetName || axisLabels[index])}"
              data-score="${escapeAttr(`${formatNumber(point.value)}% (${formatNumber(point.earned)} / ${formatNumber(point.maxPoints)})`)}"
              data-date="${escapeAttr(point.date || point.sheetName || "")}"
              data-category="${escapeAttr(point.category || "")}"></circle>
            <title>${escapeHtml(`${axisLabels[index]} - ${formatNumber(point.value)}%`)}</title>
            <text x="${x(index)}" y="${bottom + 28}" text-anchor="end" font-size="10" fill="${BRAND_COLORS.muted}" transform="rotate(-28 ${x(index)} ${bottom + 28})">${escapeHtml(axisLabels[index])}</text>
          </g>
        `).join("")}
      </svg>
      <figcaption>${t("chart.yearTrendCaption")}</figcaption>
      <div class="chart-legend">
        <span><i class="legend-dot"></i>${t("chart.legendPoint")}</span>
        <span><i class="legend-line"></i>${t("chart.legendTrend")}</span>
      </div>
    </figure>
  `;
}

function uniqueTrendLabels(points) {
  const totals = new Map();
  points.forEach((point) => {
    const base = point.label || point.category || "P";
    totals.set(base, (totals.get(base) || 0) + 1);
  });
  const seen = new Map();
  return points.map((point, index) => {
    const base = point.label || point.category || `P${index + 1}`;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    return totals.get(base) > 1 ? `${index + 1}. ${base}` : base;
  });
}

function renderDotPlot(students, selected) {
  const width = 560;
  const y = 28;
  const axisLeft = 34;
  const axisWidth = 490;
  const dots = students.filter((student) => Number.isFinite(student.finalWeighted)).map((student, index) => {
    const x = axisLeft + clamp(student.finalWeighted, 0, 100) / 100 * axisWidth;
    const jitter = ((index % 5) - 2) * 3;
    const active = student.id === selected.id;
    return `<circle cx="${x}" cy="${y + jitter}" r="${active ? 6 : 3.5}" fill="${active ? BRAND_COLORS.purple : BRAND_COLORS.neutral}" opacity="${active ? "1" : "0.55"}"></circle>`;
  }).join("");
  return `
    <svg class="chart-svg" viewBox="0 0 ${width} 62" role="img" aria-label="${t("chart.dotPlot")}">
      <line x1="${axisLeft}" y1="${y}" x2="${axisLeft + axisWidth}" y2="${y}" stroke="${BRAND_COLORS.axis}"></line>
      ${[0, 50, 100].map((tick) => {
        const x = axisLeft + tick / 100 * axisWidth;
        return `<g><line x1="${x}" y1="${y - 8}" x2="${x}" y2="${y + 8}" stroke="${BRAND_COLORS.axis}"></line><text x="${x}" y="56" text-anchor="middle" font-size="11" fill="${BRAND_COLORS.muted}">${tick}</text></g>`;
      }).join("")}
      ${dots}
    </svg>
  `;
}

function renderQuartileStrip(students, selected) {
  const values = students.map((student) => student.finalWeighted).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return "";
  const stats = {
    min: values[0],
    q1: quantile(values, 0.25),
    median: quantile(values, 0.5),
    q3: quantile(values, 0.75),
    max: values[values.length - 1],
  };
  const axisLeft = 34;
  const axisWidth = 490;
  const x = (value) => axisLeft + clamp(value, 0, 100) / 100 * axisWidth;
  const selectedMarker = Number.isFinite(selected.finalWeighted)
    ? `<circle cx="${x(selected.finalWeighted)}" cy="34" r="5" fill="${BRAND_COLORS.purpleInk}"></circle>`
    : "";
  return `
    <svg class="chart-svg" viewBox="0 0 560 70" role="img" aria-label="${t("chart.quartile")}">
      <line x1="${x(stats.min)}" y1="34" x2="${x(stats.max)}" y2="34" stroke="${BRAND_COLORS.muted}" stroke-width="2"></line>
      <rect x="${x(stats.q1)}" y="22" width="${Math.max(2, x(stats.q3) - x(stats.q1))}" height="24" fill="${BRAND_COLORS.purpleSoft}" stroke="${BRAND_COLORS.purple}"></rect>
      <line x1="${x(stats.median)}" y1="18" x2="${x(stats.median)}" y2="50" stroke="${BRAND_COLORS.purple}" stroke-width="3"></line>
      ${selectedMarker}
      <text x="${x(stats.q1)}" y="64" text-anchor="middle" font-size="10" fill="${BRAND_COLORS.muted}">Q1 ${formatNumber(stats.q1)}</text>
      <text x="${x(stats.median)}" y="13" text-anchor="middle" font-size="10" fill="${BRAND_COLORS.muted}">M ${formatNumber(stats.median)}</text>
      <text x="${x(stats.q3)}" y="64" text-anchor="middle" font-size="10" fill="${BRAND_COLORS.muted}">Q3 ${formatNumber(stats.q3)}</text>
    </svg>
  `;
}

function renderTrendExplanation(trend) {
  if (trend.delta == null) return t("trendExplain.insufficient");
  const volatility = trend.volatility == null ? t("option.notAvailable") : formatNumber(trend.volatility);
  const volatilityMeaning = trend.volatility == null ? t("trendExplain.volatilityUnknown") : volatilityLabel(trend.volatility);
  if (trend.direction === "declining") {
    return t("trendExplain.declining", {
      points: formatNumber(Math.abs(trend.delta)),
      volatility,
      volatilityMeaning,
    });
  }
  if (trend.direction === "improving") {
    return t("trendExplain.improving", {
      points: formatNumber(trend.delta),
      volatility,
      volatilityMeaning,
    });
  }
  return t("trendExplain.stable", { volatility, volatilityMeaning });
}

function volatilityLabel(value) {
  if (value < 8) return t("trendExplain.volatilityLow");
  if (value < 18) return t("trendExplain.volatilityMedium");
  return t("trendExplain.volatilityHigh");
}

function regressionLine(values) {
  if (values.length < 2) return null;
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / n;
  const denominator = values.reduce((sum, _value, index) => sum + (index - meanX) ** 2, 0);
  if (!denominator) return null;
  const slope = values.reduce((sum, value, index) => sum + (index - meanX) * (value - meanY), 0) / denominator;
  const intercept = meanY - slope * meanX;
  return {
    start: intercept,
    end: intercept + slope * (n - 1),
  };
}

function filterStudents(students, filters) {
  return students.filter((student) => {
    if (filters.classCode && filters.classCode !== "all" && student.classCode !== filters.classCode) return false;
    if (filters.band && filters.band !== "all" && student.thresholdBand.id !== filters.band) return false;
    if (filters.flag && filters.flag !== "all" && !student.flags.some((flag) => flag.type === filters.flag)) return false;
    return true;
  });
}

function categoryRow(name, weight, index) {
  return `
    <tr class="category-row">
      <td><input data-category-name name="categoryName:${index}" value="${escapeAttr(name)}"></td>
      <td><input data-category-weight name="categoryWeight:${index}" type="number" min="0" step="0.1" value="${escapeAttr(weight)}"></td>
      <td data-normalised-weight>0%</td>
      <td class="small-cell"><button class="button" data-remove-category type="button">${t("mapping.remove")}</button></td>
    </tr>
  `;
}

function basketRow(name, weight) {
  return `
    <label class="basket-row">
      <span>${escapeHtml(name)}</span>
      <input type="hidden" data-basket-name name="basketName:${escapeAttr(name)}" value="${escapeAttr(name)}">
      <input data-basket-weight="${escapeAttr(name)}" name="basketWeight:${escapeAttr(name)}" type="number" min="0" step="0.1" value="${escapeAttr(weight ?? "")}" placeholder="${t("mapping.basketPlaceholder")}">
      <strong data-basket-normalised>0%</strong>
    </label>
  `;
}

function basketWeightsFromConfig(config) {
  const weights = new Map(BASKET_NAMES.map((name) => [name, BASKET_PRESETS.iw.weights[name]]));
  for (const category of config.categories || []) {
    if (weights.has(category.name)) weights.set(category.name, category.weight);
  }
  return weights;
}

function inferBasketCategory(assignment, index, assignments) {
  const text = `${assignment.sheetName || ""} ${assignment.title || ""} ${assignment.date || ""}`.toLowerCase();
  const category = String(assignment.category || "").toUpperCase();
  const sameType = assignments.filter((item) => String(item.category || "").toUpperCase() === category);
  const typeIndex = sameType.findIndex((item) => item.id === assignment.id);
  const secondHalf = typeIndex >= Math.ceil(sameType.length / 2);

  if (/par|paas|partial|partieel/.test(text)) return "EXPAR";
  if (category === "EX") {
    if (/kerst|sem\s*1|semester\s*1|\b1\b/.test(text)) return "EX1";
    if (/eind|juni|sem\s*2|semester\s*2|\b2\b/.test(text)) return "EX2";
    return secondHalf ? "EX2" : "EX1";
  }
  if (category === "DW") {
    if (/sem\s*1|semester\s*1|\b1\b/.test(text)) return "DW1";
    if (/sem\s*2|semester\s*2|\b2\b/.test(text)) return "DW2";
    return secondHalf ? "DW2" : "DW1";
  }
  return category || BASKET_NAMES[Math.min(index, BASKET_NAMES.length - 1)];
}

function stat(label, value) {
  const text = String(value ?? "");
  const valueClass = text.length > 24 ? " is-extra-long" : text.length > 14 ? " is-long" : "";
  return `
    <div class="stat-card">
      <p class="stat-value${valueClass}">${escapeHtml(value)}</p>
      <p class="stat-label">${escapeHtml(label)}</p>
    </div>
  `;
}

function quantile(values, q) {
  if (!values.length) return 0;
  const position = (values.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return values[base + 1] == null ? values[base] : values[base] + rest * (values[base + 1] - values[base]);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function bandColor(id) {
  return {
    90: "#b7f7ca",
    80: "#c7f0a8",
    70: "#f7e589",
    60: "#fbc17c",
    50: "#f59f8c",
    low: "#ef7777",
  }[id] || "#cbd5e1";
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return t("option.notAvailable");
  return String(Math.round(value * 10) / 10);
}

function formatGrade(value) {
  if (!Number.isFinite(value)) return t("option.notAvailable");
  return `${formatNumber(value)}%`;
}

function formatAvailablePoints(row) {
  if (Number.isFinite(row.expectedPossible) && row.expectedPossible !== row.availablePossible) {
    return `${formatNumber(row.availablePossible)} / ${formatNumber(row.expectedPossible)}`;
  }
  return formatNumber(row.pointsPossible);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return t("option.notAvailable");
  return `${Math.round(value * 1000) / 10}%`;
}

function sortStudents(students, filters = {}) {
  const key = filters.sortKey || "total";
  const direction = filters.sortDirection === "desc" ? "desc" : "asc";
  return [...students].sort((a, b) => {
    let result = 0;
    if (key === "name") result = compareText(a.name, b.name, direction);
    else if (key === "class") result = compareText(a.classCode, b.classCode, direction);
    else if (key === "coverage") result = compareNumber(a.evidenceCoverage, b.evidenceCoverage, direction);
    else if (key === "flags") result = compareNumber(a.flags.length, b.flags.length, direction);
    else result = compareNumber(a.finalWeighted, b.finalWeighted, direction);
    return result || compareText(a.name, b.name, "asc");
  });
}

function compareNumber(a, b, direction) {
  const aFinite = Number.isFinite(a);
  const bFinite = Number.isFinite(b);
  if (!aFinite && !bFinite) return 0;
  if (!aFinite) return 1;
  if (!bFinite) return -1;
  return direction === "desc" ? b - a : a - b;
}

function compareText(a, b, direction) {
  const result = String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" });
  return direction === "desc" ? -result : result;
}

function compareGrades(a, b) {
  const aGrade = Number.isFinite(a.finalWeighted) ? a.finalWeighted : Infinity;
  const bGrade = Number.isFinite(b.finalWeighted) ? b.finalWeighted : Infinity;
  return aGrade - bGrade;
}

function capitalize(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
