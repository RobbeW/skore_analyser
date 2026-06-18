import { readXlsxWorkbook } from "./xlsx-reader.js";
import { buildDefaultConfig, parseSkoreWorkbook } from "./skore-parser.js";
import { calculateAnalysis } from "./calculator.js";
import { getLanguage, setLanguage, t } from "./i18n.js";
import { hydrateProjectPayload } from "./project-importer.js";
import { applyPreset, loadDecisions, loadNotes, loadPreferences, loadPresets, saveDecisions, saveNote, saveNotes, savePreferences, savePreset } from "./storage.js";
import {
  addCategoryRow,
  applyBasketPreset,
  collectConfigFromForm,
  refreshNormalisedWeights,
  renderDashboard,
  renderDetectedSummary,
  renderMappingForm,
  renderSampleButtons,
  renderWarnings,
  setWorkflowStep,
} from "./renderer.js";

const state = {
  workbook: null,
  model: null,
  config: null,
  analysis: null,
  notes: {},
  decisions: {},
  filters: defaultFilters(),
  preferences: loadPreferences(),
  presets: loadPresets(),
  statusKey: "upload.empty",
  statusParams: {},
};

const CARD_TOUR_STEPS = [
  { part: "total", titleKey: "tour.totalTitle", bodyKey: "tour.totalBody" },
  { part: "table", titleKey: "tour.tableTitle", bodyKey: "tour.tableBody" },
  { part: "graph", titleKey: "tour.graphTitle", bodyKey: "tour.graphBody" },
  { part: "advice", titleKey: "tour.adviceTitle", bodyKey: "tour.adviceBody" },
  { part: "notes", titleKey: "tour.notesTitle", bodyKey: "tour.notesBody" },
];

let activeCardTour = null;

const els = {
  dropZone: document.getElementById("drop-zone"),
  fileInput: document.getElementById("file-input"),
  projectInput: document.getElementById("project-input"),
  projectImportButton: document.getElementById("project-import-button"),
  uploadStatus: document.getElementById("upload-status"),
  sampleButtons: document.getElementById("sample-buttons"),
  detectedSummary: document.getElementById("detected-summary"),
  warnings: document.getElementById("warnings"),
  mappingForm: document.getElementById("mapping-form"),
  generateButton: document.getElementById("generate-button"),
  dashboard: document.getElementById("dashboard"),
  languageToggle: document.getElementById("language-toggle"),
  anonymiseToggle: document.getElementById("anonymise-toggle"),
  resetButton: document.getElementById("reset-button"),
  autosaveIndicator: document.getElementById("autosave-indicator"),
  printButton: document.getElementById("print-button"),
};

init();

function init() {
  setLanguage(state.preferences.language || "nl");
  els.languageToggle.value = getLanguage();
  els.anonymiseToggle.checked = Boolean(state.preferences.anonymised);
  applyStaticTranslations();
  renderSampleButtons(els.sampleButtons, loadSample);
  wireUpload();
  wireActions();
  setWorkflowStep("upload");

  const sample = new URL(window.location.href).searchParams.get("sample");
  if (sample) loadSample(sample);
}

function wireUpload() {
  els.fileInput.addEventListener("change", () => {
    const [file] = els.fileInput.files;
    if (file) loadWorkbook(file, file.name);
  });

  els.projectImportButton.addEventListener("click", () => els.projectInput.click());
  els.projectInput.addEventListener("change", () => {
    const [file] = els.projectInput.files;
    if (file) loadProjectFile(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("is-dragging");
    });
  });

  els.dropZone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer.files;
    if (!file) return;
    if (/\.json$/i.test(file.name)) loadProjectFile(file);
    else loadWorkbook(file, file.name);
  });
}

function wireActions() {
  els.languageToggle.addEventListener("change", () => {
    setLanguage(els.languageToggle.value);
    state.preferences = savePreferences({ language: getLanguage() });
    applyStaticTranslations();
    refreshCurrentLanguage();
  });
  els.generateButton.addEventListener("click", generateAnalysis);
  els.anonymiseToggle.addEventListener("change", () => {
    state.preferences = savePreferences({ anonymised: els.anonymiseToggle.checked });
    renderCurrentDashboard();
  });
  els.dashboard.addEventListener("click", handleDashboardClick);
  els.dashboard.addEventListener("input", handleDashboardInput);
  els.dashboard.addEventListener("keydown", handleDashboardKeydown);
  els.resetButton.addEventListener("click", resetData);
  els.printButton.addEventListener("click", openPrintPreview);
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("print-one-page");
  });

  els.mappingForm.addEventListener("input", (event) => {
    if (event.target.matches("[data-category-weight], [data-basket-weight]")) refreshNormalisedWeights(els.mappingForm);
  });

  els.mappingForm.addEventListener("click", (event) => {
    if (event.target.id === "add-category-button") {
      addCategoryRow(els.mappingForm);
      return;
    }
    if (event.target.matches("[data-remove-category]")) {
      event.target.closest(".category-row")?.remove();
      refreshNormalisedWeights(els.mappingForm);
    }
  });

  els.mappingForm.addEventListener("change", (event) => {
    if (event.target.name === "basketPreset") {
      applyBasketPreset(els.mappingForm, event.target.value);
      refreshNormalisedWeights(els.mappingForm);
      return;
    }
    if (event.target.name === "preset" && event.target.value) {
      const preset = state.presets.find((item) => item.name === event.target.value);
      state.config = applyPreset(state.config, preset);
      renderMapping();
    }
  });
}

function defaultFilters() {
  return {
    classCode: "all",
    band: "all",
    flag: "all",
    sortKey: "total",
    sortDirection: "asc",
    threshold: 50,
  };
}

function normaliseFilters(filters = {}, threshold = 50) {
  const source = filters && typeof filters === "object" ? filters : {};
  const fallback = defaultFilters();
  return {
    classCode: typeof source.classCode === "string" && source.classCode ? source.classCode : fallback.classCode,
    band: typeof source.band === "string" && source.band ? source.band : fallback.band,
    flag: typeof source.flag === "string" && source.flag ? source.flag : fallback.flag,
    sortKey: typeof source.sortKey === "string" && source.sortKey ? source.sortKey : fallback.sortKey,
    sortDirection: source.sortDirection === "desc" ? "desc" : fallback.sortDirection,
    threshold: threshold ?? source.threshold ?? fallback.threshold,
  };
}

function applyRememberedConfig(config, rememberedConfig) {
  if (!rememberedConfig) return config;
  return {
    ...config,
    threshold: rememberedConfig.threshold ?? config.threshold,
    categories: rememberedConfig.categories?.length ? rememberedConfig.categories : config.categories,
  };
}

function workspaceKey() {
  const fileName = state.model?.fileName || "workbook";
  const subject = state.config?.subject || state.model?.subjects?.[0]?.value || "subject";
  return `${fileName}::${subject}`.toLowerCase();
}

function openPrintPreview() {
  if (!state.analysis) return;
  closeCardTour();
  const printResult = measurePrintCards();
  const dialog = buildPrintPreviewDialog(printResult);
  document.body.append(dialog);
  wirePrintPreviewDialog(dialog);

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "open");
}

function buildPrintPreviewDialog(result) {
  document.querySelector(".print-preview-dialog")?.remove();
  const dialog = document.createElement("dialog");
  dialog.className = "print-preview-dialog";
  dialog.setAttribute("aria-labelledby", "print-preview-title");
  dialog.innerHTML = `
    <div class="print-preview-modal">
      <header class="print-preview-header">
        <div>
          <p class="eyebrow">${t("printPreview.eyebrow")}</p>
          <h2 id="print-preview-title">${t("printPreview.title")}</h2>
        </div>
        <button class="button" type="button" data-print-preview-action="close">${t("printPreview.close")}</button>
      </header>
      <section class="print-preview-body">
        <div class="print-preview-summary">
          <strong>${t("printPreview.cardCount", { count: result.total })}</strong>
          <span>${t("printPreview.currentSelection", { summary: getPrintFilterSummary() })}</span>
        </div>
        <div class="print-preview-status" data-print-preview-status></div>
        <details class="print-preview-problems" data-print-preview-problems hidden>
          <summary>${t("printPreview.problemCards")}</summary>
          <ul data-print-preview-problem-list></ul>
        </details>
        <p class="print-preview-help">${t("printPreview.measureHelp")}</p>
        <p class="print-preview-help">${t("printPreview.singleMode")}</p>
      </section>
      <footer class="print-preview-actions">
        <button class="button" type="button" data-print-preview-action="close">${t("printPreview.cancel")}</button>
        <button class="button primary" type="button" data-print-preview-action="print" ${result.total ? "" : "disabled"}>${t("printPreview.printNow")}</button>
      </footer>
    </div>
  `;
  renderPrintPreviewStatus(dialog, result);
  return dialog;
}

function wirePrintPreviewDialog(dialog) {
  dialog.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-print-preview-action]") : null;
    if (!button) return;
    const action = button.dataset.printPreviewAction;
    if (action === "close") {
      closePrintPreviewDialog(dialog);
      return;
    }
    if (action === "print") {
      document.body.classList.add("print-one-page");
      closePrintPreviewDialog(dialog);
      window.print();
    }
  });

  dialog.addEventListener("close", () => dialog.remove(), { once: true });
}

function closePrintPreviewDialog(dialog) {
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.remove();
}

function renderPrintPreviewStatus(dialog, result) {
  const status = dialog.querySelector("[data-print-preview-status]");
  const problemBox = dialog.querySelector("[data-print-preview-problems]");
  const problemList = dialog.querySelector("[data-print-preview-problem-list]");
  const isOk = result.total > 0 && result.tooTall.length === 0;

  status.className = `print-preview-status ${isOk ? "is-ok" : "is-warning"}`;
  if (!result.total) {
    status.innerHTML = `<strong>${t("printPreview.noCards")}</strong>`;
  } else if (isOk) {
    status.innerHTML = `
      <strong>${t("printPreview.ok")}</strong>
      <span>${t("printPreview.onePageModeActive")}</span>
    `;
  } else {
    status.innerHTML = `
      <strong>${t("printPreview.warning", { count: result.tooTall.length })}</strong>
      <span>${t("printPreview.warningHelp")}</span>
    `;
  }

  problemBox.hidden = result.tooTall.length === 0;
  problemList.innerHTML = result.tooTall.map((card) => `
    <li>
      <strong>${escapeHtml(card.name)}</strong>
      <span>${t("printPreview.estimatedHeight", { height: Math.round(card.heightPercent) })}</span>
    </li>
  `).join("");
}

function measurePrintCards(options = {}) {
  const onePage = options.onePage ?? true;
  const cards = Array.from(document.querySelectorAll(".student-card"));
  if (!cards.length) return { total: 0, tooTall: [], onePage, maxHeight: 0 };

  const measurer = document.createElement("div");
  measurer.className = `print-preview-measurer${onePage ? " is-one-page" : ""}`;
  measurer.setAttribute("aria-hidden", "true");
  const page = document.createElement("div");
  page.className = "print-preview-page-measure";
  measurer.append(page);
  document.body.append(measurer);

  const maxHeight = page.getBoundingClientRect().height;
  const tooTall = [];

  cards.forEach((card, index) => {
    const clone = card.cloneNode(true);
    clone.removeAttribute("id");
    clone.querySelectorAll(".button, .student-nav, .calculation-drawer").forEach((node) => node.remove());
    clone.querySelectorAll("textarea").forEach((textarea, textareaIndex) => {
      const source = card.querySelectorAll("textarea")[textareaIndex];
      textarea.value = source?.value || "";
      textarea.textContent = textarea.value;
    });
    page.replaceChildren(clone);
    const height = Math.max(clone.scrollHeight, clone.getBoundingClientRect().height);
    if (height > maxHeight) {
      tooTall.push({
        name: card.querySelector(".student-title")?.textContent?.trim() || t("student.anonymous", { number: String(index + 1).padStart(2, "0") }),
        heightPercent: (height / maxHeight) * 100,
      });
    }
  });

  measurer.remove();
  return { total: cards.length, tooTall, onePage, maxHeight };
}

function getPrintFilterSummary() {
  const pieces = [
    state.filters.classCode && state.filters.classCode !== "all"
      ? t("printPreview.classOnly", { classCode: state.filters.classCode })
      : t("printPreview.allClasses"),
  ];
  if (state.filters.band && state.filters.band !== "all") pieces.push(t("printPreview.band", { band: t(`band.${state.filters.band}`) }));
  if (state.filters.flag && state.filters.flag !== "all") pieces.push(t("printPreview.flag", { flag: t(`flag.${state.filters.flag}`) }));
  return pieces.join(" - ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function scrollToStudent(studentId) {
  const card = document.querySelector(`.student-card[data-student-id="${CSS.escape(studentId)}"]`);
  if (!card) return;
  card.scrollIntoView({ block: "start", behavior: "smooth" });
  card.classList.add("is-focused");
  window.setTimeout(() => card.classList.remove("is-focused"), 1200);
}

function scrollToDashboardTop() {
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;
  dashboard.scrollIntoView({ block: "start", behavior: "smooth" });
}

async function loadSample(path) {
  try {
    setStatus("status.loading", { path });
    const response = await fetch(encodeURI(path));
    if (!response.ok) throw new Error(t("status.loadSampleError", { path }));
    const buffer = await response.arrayBuffer();
    await loadWorkbook(buffer, path.split("/").pop());
  } catch (error) {
    setRawStatus(error.message, true);
  }
}

async function loadWorkbook(source, fileName) {
  try {
    disableExports();
    setStatus("status.parsing", { fileName });
    const workbook = await readXlsxWorkbook(source, { fileName });
    const model = parseSkoreWorkbook(workbook);
    const config = applyRememberedConfig(buildDefaultConfig(model), state.preferences.lastConfig);

    state.workbook = workbook;
    state.model = model;
    state.config = config;
    state.analysis = null;
    state.notes = {};
    state.decisions = {};
    state.filters = {
      ...normaliseFilters(state.preferences.filters, config.threshold),
      classCode: "all",
    };

    setStatus("status.loaded", {
      fileName,
      students: model.students.length,
      assignments: model.assignments.length,
      classes: model.classes.length,
    });
    renderMapping();
    setWorkflowStep("map");
  } catch (error) {
    console.error(error);
    setRawStatus(error.message || t("status.parseError"), true);
    setWorkflowStep("upload");
  }
}

async function loadProjectFile(file) {
  try {
    disableExports();
    setStatus("status.loadingProject", { fileName: file.name });
    const payload = JSON.parse(await file.text());
    await restoreProject(payload, file.name);
  } catch (error) {
    console.error(error);
    setRawStatus(error.message === "INVALID_PROJECT" ? t("status.projectImportError") : error.message || t("status.projectImportError"), true);
    setWorkflowStep("upload");
  } finally {
    els.projectInput.value = "";
  }
}

async function restoreProject(payload, fileName) {
  const { model, config, notes, decisions, filters } = hydrateProjectPayload(payload, defaultFilters());

  state.workbook = null;
  state.model = model;
  state.config = config;
  state.analysis = calculateAnalysis(model, config);
  state.notes = saveNotes(workspaceKey(), notes);
  state.decisions = saveDecisions(workspaceKey(), decisions);
  state.filters = normaliseFilters(filters, config.threshold);
  state.preferences = savePreferences({ lastConfig: config, filters: state.filters });

  enableExports();
  renderMapping();
  renderCurrentDashboard();
  setWorkflowStep("dashboard");
  setStatus("status.projectLoaded", {
    fileName,
    students: model.students.length,
  });
}

function renderMapping() {
  if (!state.model || !state.config) return;
  renderDetectedSummary(state.model, els.detectedSummary);
  renderWarnings(state.model, els.warnings);
  renderMappingForm(state.model, state.config, state.presets, els.mappingForm);
}

async function generateAnalysis() {
  if (!state.model || !state.config) return;
  els.generateButton.disabled = true;
  els.generateButton.classList.add("is-loading");
  els.generateButton.textContent = t("mapping.generating");
  await new Promise((resolve) => requestAnimationFrame(resolve));

  try {
    state.config = collectConfigFromForm(state.model, els.mappingForm, state.config);
    const presetName = new FormData(els.mappingForm).get("presetName");
    if (String(presetName || "").trim()) {
      state.presets = savePreset(String(presetName).trim(), state.config);
    }

    state.analysis = calculateAnalysis(state.model, state.config);
    state.notes = loadNotes(workspaceKey());
    state.decisions = loadDecisions(workspaceKey());
    state.filters.threshold = state.config.threshold;
    state.preferences = savePreferences({ lastConfig: state.config, filters: state.filters });
    enableExports();
    renderCurrentDashboard();
    setWorkflowStep("dashboard");
  } catch (error) {
    console.error(error);
    setRawStatus(error.message || t("status.parseError"), true);
  } finally {
    els.generateButton.classList.remove("is-loading");
    els.generateButton.textContent = t("mapping.generate");
    els.generateButton.disabled = false;
  }
}

function renderCurrentDashboard(options = {}) {
  if (!state.analysis) return;
  closeCardTour();
  const focusState = options.preserveFocus ? captureFocusState() : null;
  renderDashboard(state.analysis, state.filters, els.anonymiseToggle.checked, els.dashboard, state.notes, state.decisions);
  wireDashboardFilters();
  wireDashboardTours();
  restoreFocusState(focusState);
}

function wireDashboardFilters() {
  const pairs = [
    ["filter-band", "band"],
    ["filter-flag", "flag"],
  ];

  for (const [id, key] of pairs) {
    const input = document.getElementById(id);
    if (!input) continue;
    input.addEventListener(input.tagName === "INPUT" ? "input" : "change", () => {
      state.filters[key] = input.value;
      state.preferences = savePreferences({ filters: state.filters });
      renderCurrentDashboard({ preserveFocus: input.tagName === "INPUT" });
    });
  }
}

function handleDashboardInput(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.matches("[data-note-student-id]")) {
    setAutosaveStatus("saving");
    state.notes = saveNote(workspaceKey(), target.dataset.noteStudentId, target.value);
    window.clearTimeout(handleDashboardInput.autosaveTimer);
    handleDashboardInput.autosaveTimer = window.setTimeout(() => setAutosaveStatus("ready"), 450);
    return;
  }
}

function handleDashboardClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const classButton = target.closest("[data-class-filter]");
  if (classButton) {
    state.filters.classCode = classButton.dataset.classFilter;
    state.preferences = savePreferences({ filters: state.filters });
    renderCurrentDashboard();
    return;
  }

  const clearFiltersButton = target.closest("[data-clear-filters]");
  if (clearFiltersButton) {
    state.filters = { ...defaultFilters(), threshold: state.config?.threshold ?? 50 };
    state.preferences = savePreferences({ filters: state.filters });
    renderCurrentDashboard();
    return;
  }

  const sortButton = target.closest("[data-table-sort]");
  if (sortButton) {
    state.filters.sortKey = sortButton.dataset.tableSort;
    state.filters.sortDirection = sortButton.dataset.sortDirection === "desc" ? "desc" : "asc";
    state.preferences = savePreferences({ filters: state.filters });
    renderCurrentDashboard();
    return;
  }

  const studentRow = target.closest("[data-student-row]");
  if (studentRow && studentRow.dataset.studentId) {
    scrollToStudent(studentRow.dataset.studentId);
    return;
  }

  const dashboardTopButton = target.closest("[data-dashboard-top]");
  if (dashboardTopButton) {
    scrollToDashboardTop();
    return;
  }

  const navButton = target.closest("[data-student-nav]");
  if (navButton && navButton.dataset.studentNav) {
    scrollToStudent(navButton.dataset.studentNav);
    return;
  }

  const trendPoint = target.closest("[data-trend-point]");
  if (trendPoint) {
    openTrendPointDialog(trendPoint);
    return;
  }

  const tourButton = target.closest("[data-tour-button]");
  if (tourButton) {
    startCardTour(tourButton);
    return;
  }

  handleTourControl(target);
}

function handleDashboardKeydown(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.matches("[data-student-row]") && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    scrollToStudent(target.dataset.studentId);
    return;
  }
  if (!target?.matches("[data-trend-point]")) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  openTrendPointDialog(target);
}

function openTrendPointDialog(point) {
  document.querySelector(".trend-point-dialog")?.remove();
  const dialog = document.createElement("dialog");
  dialog.className = "trend-point-dialog";
  dialog.setAttribute("aria-labelledby", "trend-point-title");
  dialog.innerHTML = `
    <div class="trend-point-modal">
      <header class="trend-point-header">
        <div>
          <p class="eyebrow">${escapeHtml(point.dataset.category || t("option.notAvailable"))}</p>
          <h2 id="trend-point-title">${escapeHtml(point.dataset.title || t("chart.evaluation"))}</h2>
        </div>
        <button class="button" type="button" data-trend-point-close>${t("tour.close")}</button>
      </header>
      <dl class="trend-point-details">
        <div><dt>${t("chart.score")}</dt><dd>${escapeHtml(point.dataset.score || t("option.notAvailable"))}</dd></div>
        <div><dt>${t("mapping.date")}</dt><dd>${escapeHtml(point.dataset.date || t("option.notAvailable"))}</dd></div>
        <div><dt>${t("mapping.category")}</dt><dd>${escapeHtml(point.dataset.category || t("option.notAvailable"))}</dd></div>
      </dl>
    </div>
  `;
  dialog.addEventListener("click", (event) => {
    if (event.target.closest?.("[data-trend-point-close]")) dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  document.body.append(dialog);
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "open");
}

function setAutosaveStatus(status) {
  if (!els.autosaveIndicator) return;
  els.autosaveIndicator.classList.toggle("is-saving", status === "saving");
  els.autosaveIndicator.classList.toggle("is-saved", status !== "saving");
  const label = els.autosaveIndicator.querySelector("span:last-child");
  if (label) label.textContent = t(status === "saving" ? "autosave.saving" : "autosave.ready");
}

function wireDashboardTours() {
  document.querySelectorAll("[data-tour-button]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      startCardTour(button);
    });
  });
}

function startCardTour(button) {
  const card = button.closest(".student-card");
  if (!card) return;
  closeCardTour();

  const studentName = card.querySelector(".student-title")?.textContent?.trim() || "";
  const overlay = document.createElement("div");
  overlay.className = "card-tour-overlay";
  overlay.innerHTML = `
    <div class="card-tour-frame" aria-hidden="true"></div>
    <aside class="card-tour-popover" role="dialog" aria-live="polite" aria-label="${t("tour.eyebrow")}">
      <div class="card-tour-header">
        <div>
          <p class="eyebrow">${t("tour.eyebrow")}</p>
          <h3>${t("tour.title", { student: studentName })}</h3>
        </div>
        <button class="button" type="button" data-tour-action="close">${t("tour.close")}</button>
      </div>
      <p class="card-tour-progress"></p>
      <h4 class="card-tour-step-title"></h4>
      <p class="card-tour-step-body"></p>
      <div class="card-tour-controls">
        <button class="button" type="button" data-tour-action="previous">${t("tour.previous")}</button>
        <button class="button primary" type="button" data-tour-action="next">${t("tour.next")}</button>
      </div>
    </aside>
  `;
  document.body.append(overlay);

  activeCardTour = { card, overlay, index: 0, target: card };
  document.body.classList.add("has-card-tour");
  overlay.addEventListener("click", (event) => handleTourControl(event.target));
  window.addEventListener("resize", updateCardTourPosition);
  window.addEventListener("scroll", updateCardTourPosition, true);
  document.addEventListener("keydown", handleTourKeydown);
  showCardTourStep(0);
}

function handleTourControl(target) {
  const actionButton = target.closest?.("[data-tour-action]");
  if (!actionButton || !activeCardTour) return;

  const action = actionButton.dataset.tourAction;
  if (action === "close") {
    closeCardTour();
    return;
  }
  if (action === "previous") {
    showCardTourStep(activeCardTour.index - 1);
    return;
  }
  if (action === "next") {
    if (activeCardTour.index >= CARD_TOUR_STEPS.length - 1) closeCardTour();
    else showCardTourStep(activeCardTour.index + 1);
  }
}

function handleTourKeydown(event) {
  if (!activeCardTour) return;
  if (event.key === "Escape") closeCardTour();
  if (event.key === "ArrowRight") showCardTourStep(activeCardTour.index + 1);
  if (event.key === "ArrowLeft") showCardTourStep(activeCardTour.index - 1);
}

function showCardTourStep(index) {
  if (!activeCardTour) return;
  activeCardTour.index = Math.max(0, Math.min(index, CARD_TOUR_STEPS.length - 1));
  const step = CARD_TOUR_STEPS[activeCardTour.index];
  const target = activeCardTour.card.querySelector(`[data-tour-part="${step.part}"]`) || activeCardTour.card;
  activeCardTour.target = target;

  const overlay = activeCardTour.overlay;
  overlay.querySelector(".card-tour-progress").textContent = t("tour.stepProgress", {
    current: activeCardTour.index + 1,
    total: CARD_TOUR_STEPS.length,
  });
  overlay.querySelector(".card-tour-step-title").textContent = t(step.titleKey);
  overlay.querySelector(".card-tour-step-body").textContent = t(step.bodyKey);
  overlay.querySelector('[data-tour-action="previous"]').disabled = activeCardTour.index === 0;
  overlay.querySelector('[data-tour-action="next"]').textContent = activeCardTour.index === CARD_TOUR_STEPS.length - 1
    ? t("tour.finish")
    : t("tour.next");

  target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  requestAnimationFrame(updateCardTourPosition);
  window.setTimeout(updateCardTourPosition, 260);
}

function updateCardTourPosition() {
  if (!activeCardTour?.target) return;
  const rect = activeCardTour.target.getBoundingClientRect();
  const frame = activeCardTour.overlay.querySelector(".card-tour-frame");
  const popover = activeCardTour.overlay.querySelector(".card-tour-popover");
  const padding = 8;
  const left = Math.max(8, rect.left - padding);
  const top = Math.max(8, rect.top - padding);
  const width = Math.min(window.innerWidth - left - 8, rect.width + padding * 2);
  const height = Math.min(window.innerHeight - top - 8, rect.height + padding * 2);

  frame.style.transform = `translate(${left}px, ${top}px)`;
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;

  const popoverWidth = Math.min(380, window.innerWidth - 32);
  const rightSpace = window.innerWidth - (left + width);
  let popoverLeft = rightSpace >= popoverWidth + 24 ? left + width + 16 : left - popoverWidth - 16;
  if (popoverLeft < 16) popoverLeft = Math.min(16, window.innerWidth - popoverWidth - 16);
  let popoverTop = Math.min(Math.max(16, top), window.innerHeight - popover.offsetHeight - 16);
  if (!Number.isFinite(popoverTop)) popoverTop = 16;

  popover.style.width = `${popoverWidth}px`;
  popover.style.transform = `translate(${popoverLeft}px, ${popoverTop}px)`;
}

function closeCardTour() {
  if (!activeCardTour) return;
  activeCardTour.overlay.remove();
  activeCardTour = null;
  document.body.classList.remove("has-card-tour");
  window.removeEventListener("resize", updateCardTourPosition);
  window.removeEventListener("scroll", updateCardTourPosition, true);
  document.removeEventListener("keydown", handleTourKeydown);
}

function captureFocusState() {
  const active = document.activeElement;
  if (!active?.id) return null;
  return {
    id: active.id,
    selectionStart: Number.isInteger(active.selectionStart) ? active.selectionStart : null,
    selectionEnd: Number.isInteger(active.selectionEnd) ? active.selectionEnd : null,
  };
}

function restoreFocusState(focusState) {
  if (!focusState) return;
  const target = document.getElementById(focusState.id);
  if (!target) return;
  target.focus();
  if (focusState.selectionStart == null || focusState.selectionEnd == null || typeof target.setSelectionRange !== "function") return;
  target.setSelectionRange(focusState.selectionStart, focusState.selectionEnd);
}

function resetData() {
  if (!confirm(t("status.resetConfirm"))) return;
  state.workbook = null;
  state.model = null;
  state.config = null;
  state.analysis = null;
  state.notes = {};
  state.decisions = {};
  els.fileInput.value = "";
  els.detectedSummary.innerHTML = "";
  els.warnings.innerHTML = "";
  els.mappingForm.innerHTML = "";
  els.dashboard.innerHTML = "";
  disableExports();
  setStatus("status.reset");
  setWorkflowStep("upload");
}

function setStatus(key, params = {}, isError = false) {
  state.statusKey = key;
  state.statusParams = params;
  els.uploadStatus.textContent = t(key, params);
  els.uploadStatus.classList.toggle("warning-box", isError);
}

function setRawStatus(message, isError = false) {
  state.statusKey = "";
  state.statusParams = {};
  els.uploadStatus.textContent = message;
  els.uploadStatus.classList.toggle("warning-box", isError);
}

function enableExports() {
  els.printButton.disabled = false;
}

function disableExports() {
  els.printButton.disabled = true;
}

function applyStaticTranslations() {
  document.documentElement.lang = getLanguage();
  document.title = t("app.title");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
  els.languageToggle?.setAttribute("aria-label", t("toggle.language"));
  if (state.statusKey) {
    els.uploadStatus.textContent = t(state.statusKey, state.statusParams);
  }
}

function refreshCurrentLanguage() {
  if (state.workbook) {
    state.model = parseSkoreWorkbook(state.workbook);
  }
  if (state.model && state.config) {
    renderMapping();
  }
  if (state.model && state.config && state.analysis) {
    state.analysis = calculateAnalysis(state.model, state.config);
    renderCurrentDashboard();
  }
}
