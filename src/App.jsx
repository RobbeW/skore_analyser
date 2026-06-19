import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  FileJson,
  FolderOpen,
  HelpCircle,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Minimize2,
  Maximize2,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { readXlsxWorkbook } from "../js/xlsx-reader.js";
import { buildDefaultConfig, parseSkoreWorkbook } from "../js/skore-parser.js";
import { calculateAnalysis, summariseStudents } from "../js/calculator.js";
import { THRESHOLD_BANDS, thresholdBand } from "../js/config.js";
import { getLanguage, setLanguage, t } from "../js/i18n.js";
import { buildProjectPayload, exportProjectJson } from "../js/exporter.js";
import { hydrateProjectPayload } from "../js/project-importer.js";
import {
  applyPreset,
  loadNotes,
  loadPreferences,
  loadPresets,
  saveNote,
  saveNotes,
  savePreferences,
  savePreset,
  saveProjectDraft,
} from "../js/storage.js";

const BASKET_PRESETS = {
  iw: {
    labelKey: "preset.iw",
    hidden: true,
    order: ["DW1", "EX1", "DW2", "EXPAR", "EX2"],
    weights: { DW1: 10, EX1: 30, DW2: 15, EXPAR: "", EX2: 45 },
  },
  grade1_math: {
    label: "Graad 1 voorbeeld: DW1 - EX1 - DW2 - EX2 - DW3 - EX3",
    order: ["DW1", "EX1", "DW2", "EX2", "DW3", "EX3"],
    weights: { DW1: 50, EX1: 100, DW2: 50, EX2: 100, DW3: 50, EX3: 100 },
  },
  grade2_iw: {
    label: "Graad 2 voorbeeld: DW1 - EX1 - DW2 - EXPAR - EX2",
    order: ["DW1", "EX1", "DW2", "EXPAR", "EX2"],
    weights: { DW1: 10, EX1: 30, DW2: 15, EXPAR: "", EX2: 45 },
  },
  dwex: {
    labelKey: "preset.dwex",
    order: ["DW1", "EX1", "DW2", "EX2"],
    weights: { DW1: 12.5, EX1: 37.5, DW2: 12.5, EXPAR: "", EX2: 37.5 },
  },
};

const DEFAULT_BASKET_PRESET = "grade2_iw";
const LOW_EVIDENCE_POINTS_COVERAGE = 0.6;
const LOW_EVIDENCE_CLASS_GAP = 0.25;
const ASSIGNMENT_USAGE_OPTIONS = ["include", "displayOnly", "exclude"];
const SCHOOL_YEAR_MONTHS = [
  { month: 8, labelKey: "month.sep" },
  { month: 9, labelKey: "month.oct" },
  { month: 10, labelKey: "month.nov" },
  { month: 11, labelKey: "month.dec" },
  { month: 0, labelKey: "month.jan" },
  { month: 1, labelKey: "month.feb" },
  { month: 2, labelKey: "month.mar" },
  { month: 3, labelKey: "month.apr" },
  { month: 4, labelKey: "month.may" },
  { month: 5, labelKey: "month.jun" },
];
const SCHOOL_YEAR_DOMAIN_END = SCHOOL_YEAR_MONTHS.length;
const GENERATION_STEPS = [
  { key: "file", titleKey: "generation.fileTitle", bodyKey: "generation.fileBody" },
  { key: "weights", titleKey: "generation.weightsTitle", bodyKey: "generation.weightsBody" },
  { key: "cards", titleKey: "generation.cardsTitle", bodyKey: "generation.cardsBody" },
];
const DEFAULT_OPEN_CARD_SECTIONS = {
  duiding: false,
  contextCharts: true,
  score: false,
  comments: false,
};

const CARD_TOUR_STEPS = [
  { part: "total", titleKey: "tour.totalTitle", bodyKey: "tour.totalBody" },
  { part: "table", titleKey: "tour.tableTitle", bodyKey: "tour.tableBody" },
  { part: "graph", titleKey: "tour.graphTitle", bodyKey: "tour.graphBody" },
  { part: "advice", titleKey: "tour.adviceTitle", bodyKey: "tour.adviceBody" },
  { part: "notes", titleKey: "tour.notesTitle", bodyKey: "tour.notesBody" },
];

const FALLBACK_COPY = {
  nl: {
    localFirst: "Alles blijft lokaal in deze browser.",
    processing: "Bestand lokaal verwerken...",
    parsed: "Bestand herkend. Controleer eerst welke evaluaties meetellen.",
    basketNormalised: "Telt mee als",
    advancedAssignment: "Geavanceerde evaluatiekoppeling",
    visibleAdvice: "Interessante elementen",
    allGood: "Geen extra signalen voor deze selectie.",
    clickEvaluation: "Klik op een punt voor evaluatiedetails.",
    chartModalTitle: "Evaluatiemoment",
    chartModalDescription: "Deze score is een deel van de jaarlijn van de leerling.",
    noScore: "Geen score",
    autosaved: "Opgeslagen",
    stepFlow: "Stap {step} van 4",
    uploadFlow: "Upload",
    reviewFlow: "Evaluaties",
    mapFlow: "Mandjes",
    dashboardFlow: "Kaarten",
    classCards: "Klasgroepen",
    selected: "Geselecteerd",
    printReady: "A4-kaartmodus",
    closeTour: "Rondleiding sluiten",
    next: "Volgende",
    previous: "Vorige",
    finish: "Afronden",
    resetConfirm: "Alle geladen gegevens wissen?",
    buildRequired: "Gebruik de Vite devserver of bouw de app voor statische demo.",
  },
  en: {
    localFirst: "Everything stays local in this browser.",
    processing: "Processing file locally...",
    parsed: "File detected. First check which assessments should count.",
    basketNormalised: "Counts as",
    advancedAssignment: "Advanced assessment mapping",
    visibleAdvice: "Interesting signals",
    allGood: "No extra signals for this selection.",
    clickEvaluation: "Click a point for assessment details.",
    chartModalTitle: "Assessment moment",
    chartModalDescription: "This score is part of the student's year line.",
    noScore: "No score",
    autosaved: "Saved",
    stepFlow: "Step {step} of 4",
    uploadFlow: "Upload",
    reviewFlow: "Assessments",
    mapFlow: "Baskets",
    dashboardFlow: "Cards",
    classCards: "Class groups",
    selected: "Selected",
    printReady: "A4 card mode",
    closeTour: "Close tour",
    next: "Next",
    previous: "Previous",
    finish: "Finish",
    resetConfirm: "Clear all loaded data?",
    buildRequired: "Use the Vite dev server or build the app for a static demo.",
  },
};

const defaultFilters = () => ({
  classCode: "all",
  band: "all",
  flag: "all",
  sortKey: "name",
  sortDirection: "asc",
  threshold: 50,
});

export default function App() {
  const initialPreferences = useMemo(() => loadPreferences(), []);
  const [language, setLanguageState] = useState(initialPreferences.language || "nl");
  const [preferences, setPreferences] = useState(initialPreferences);
  const [workflowStep, setWorkflowStep] = useState("upload");
  const [model, setModel] = useState(null);
  const [config, setConfig] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [notes, setNotes] = useState({});
  const [presets, setPresets] = useState(() => loadPresets());
  const [status, setStatus] = useState({ kind: "idle", text: t("upload.empty") });
  const [isDragging, setIsDragging] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [activeTour, setActiveTour] = useState(null);
  const [evaluationDialog, setEvaluationDialog] = useState(null);
  const [histogramDialog, setHistogramDialog] = useState(null);
  const [printStudentId, setPrintStudentId] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [projectSaveState, setProjectSaveState] = useState("idle");
  const [noteSaveStatus, setNoteSaveStatus] = useState({});
  const [generationStep, setGenerationStep] = useState(0);
  const fileInputRef = useRef(null);
  const projectInputRef = useRef(null);
  const noteSaveTimersRef = useRef(new Map());
  const generationTimersRef = useRef([]);

  const c = (key, params = {}) => {
    const value = FALLBACK_COPY[language]?.[key] || FALLBACK_COPY.nl[key] || key;
    return Object.entries(params).reduce((text, [name, replacement]) => text.replace(`{${name}}`, replacement), value);
  };

  useEffect(() => {
    setLanguage(language);
    document.documentElement.lang = language;
    document.title = t("app.title");
  }, [language]);

  useEffect(() => {
    document.body.dataset.workflowStep = workflowStep;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [workflowStep]);

  useEffect(() => {
    const clearPrintTarget = () => setPrintStudentId(null);
    window.addEventListener("afterprint", clearPrintTarget);
    return () => window.removeEventListener("afterprint", clearPrintTarget);
  }, []);

  useEffect(() => () => {
    generationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    noteSaveTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (!printStudentId) return undefined;
    const printTimer = window.setTimeout(() => window.print(), 80);
    return () => window.clearTimeout(printTimer);
  }, [printStudentId]);

  const workspaceKey = useMemo(() => {
    const fileName = model?.fileName || "workbook";
    const subject = config?.subject || model?.subjects?.[0]?.value || "subject";
    return `${fileName}::${subject}`.toLowerCase();
  }, [config?.subject, model]);

  const filteredStudents = useMemo(() => {
    if (!analysis) return [];
    return filterStudents(analysis.students, filters);
  }, [analysis, filters]);

  function persistPreferences(patch) {
    const next = savePreferences(patch);
    if (patch.language) setLanguage(patch.language);
    setPreferences(next);
    if (patch.language) setLanguageState(patch.language);
  }

  function persistLastBasketPreset(presetName) {
    if (!presetName || !config) return;
    const subjectKey = preferenceSubjectKey(config.subject || model?.subjects?.[0]?.value || "subject");
    persistPreferences({
      lastBasketPresetBySubject: {
        ...(preferences.lastBasketPresetBySubject || {}),
        [subjectKey]: presetName,
      },
    });
  }

  function markProjectDirty() {
    if (model && config) setProjectSaveState("dirty");
  }

  async function loadWorkbook(source, fileName) {
    setIsBusy(true);
    setUploadSummary(null);
    setStatus({ kind: "busy", text: c("processing") });
    try {
      const workbook = await readXlsxWorkbook(source, { fileName });
      const parsedModel = parseSkoreWorkbook(workbook);
      const nextConfig = createInitialConfig(parsedModel, preferences);
      const nextWorkspaceKey = `${parsedModel.fileName}::${nextConfig.subject || "subject"}`.toLowerCase();
      setModel(parsedModel);
      setConfig(nextConfig);
      setAnalysis(null);
      setFilters(normaliseFilters({ classCode: preferredClassCode(parsedModel, preferences) }, nextConfig.threshold));
      setNotes(loadNotes(nextWorkspaceKey));
      setProjectSaveState("dirty");
      setUploadSummary({
        fileName: parsedModel.fileName,
        students: parsedModel.students.length,
        classes: parsedModel.classes.length,
        assignments: parsedModel.assignments.length,
      });
      setStatus({ kind: "success", text: c("parsed") });
      window.setTimeout(() => setWorkflowStep("review"), 820);
    } catch (error) {
      console.error(error);
      setUploadSummary(null);
      setStatus({ kind: "error", text: `${t("status.parseError")} ${error?.message || ""}`.trim() });
    } finally {
      setIsBusy(false);
    }
  }

  async function loadProjectFile(file) {
    setIsBusy(true);
    setUploadSummary(null);
    setStatus({ kind: "busy", text: t("status.loadingProject", { fileName: file.name }) });
    try {
      const payload = JSON.parse(await file.text());
      const restored = hydrateProjectPayload(payload, defaultFilters());
      const restoredWorkspaceKey = `${restored.model.fileName}::${restored.config.subject || restored.model.subjects?.[0]?.value || "subject"}`.toLowerCase();
      const nextAnalysis = calculateAnalysis(restored.model, restored.config);
      setModel(restored.model);
      setConfig(restored.config);
      setAnalysis(nextAnalysis);
      setFilters(normaliseFilters(restored.filters, restored.config.threshold));
      setNotes(saveNotes(restoredWorkspaceKey, restored.notes));
      setProjectSaveState("saved");
      setStatus({
        kind: "success",
        text: t("status.projectLoaded", {
          fileName: file.name,
          students: restored.model.students.length,
        }),
      });
      setWorkflowStep("dashboard");
    } catch (error) {
      console.error(error);
      setProjectSaveState("error");
      setStatus({
        kind: "error",
        text: error?.message === "INVALID_PROJECT" ? t("status.projectImportError") : error?.message || t("status.projectImportError"),
      });
      setWorkflowStep("upload");
    } finally {
      setIsBusy(false);
      if (projectInputRef.current) projectInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function generateCards() {
    if (!model || !config) return;
    generationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    generationTimersRef.current = [];
    setIsBusy(true);
    setGenerationStep(0);
    setStatus({ kind: "busy", text: t("mapping.generating") });
    setWorkflowStep("generating");

    const nextAnalysis = calculateAnalysis(model, config);
    generationTimersRef.current = [
      window.setTimeout(() => setGenerationStep(1), 520),
      window.setTimeout(() => setGenerationStep(2), 1040),
      window.setTimeout(() => {
        setAnalysis(nextAnalysis);
        setFilters((current) => normaliseFilters(current, config.threshold));
        setStatus({
          kind: "success",
          text: t("status.loaded", {
            fileName: model.fileName,
            students: model.students.length,
            assignments: nextAnalysis.assignments.length,
            classes: nextAnalysis.classes.length,
          }),
        });
        setIsBusy(false);
        setWorkflowStep("dashboard");
      }, 1620),
    ];
  }

  function resetData() {
    if (!window.confirm(c("resetConfirm"))) return;
    generationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    generationTimersRef.current = [];
    setModel(null);
    setConfig(null);
    setAnalysis(null);
    setNotes({});
    setFilters(defaultFilters());
    setActiveTour(null);
    setEvaluationDialog(null);
    setHistogramDialog(null);
    setUploadSummary(null);
    setProjectSaveState("idle");
    setStatus({ kind: "idle", text: t("status.reset") });
    setWorkflowStep("upload");
  }

  function updateConfig(patch) {
    setConfig((current) => ({ ...current, ...patch }));
    markProjectDirty();
  }

  function updateAssignment(assignmentId, patch) {
    setConfig((current) => ({
      ...current,
      assignments: {
        ...(current.assignments || {}),
        [assignmentId]: {
          ...(current.assignments?.[assignmentId] || {}),
          ...patch,
        },
      },
    }));
    markProjectDirty();
    persistLastBasketPreset(presetName);
  }

  function updateBasketWeight(name, weight) {
    setConfig((current) => ({
      ...current,
      basketPreset: "custom",
      categories: basketCategoriesFromConfig(current).map((category) => (
        category.name === name ? { ...category, weight } : category
      )),
    }));
    markProjectDirty();
  }

  function applyBasketPreset(presetName) {
    const preset = BASKET_PRESETS[presetName];
    if (!preset) {
      setConfig((current) => ({ ...current, basketPreset: "custom" }));
      return;
    }
    setConfig((current) => ({
      ...current,
      basketPreset: presetName,
      categories: categoriesFromPreset(preset),
      assignments: model ? Object.fromEntries(model.assignments.map((assignment, index) => [
        assignment.id,
        {
          ...(current.assignments?.[assignment.id] || {}),
          category: inferBasketCategory(assignment, index, model.assignments, preset.order),
        },
      ])) : current.assignments,
    }));
    markProjectDirty();
  }

  function saveCurrentPreset(name) {
    if (!name.trim() || !config) return;
    setPresets(savePreset(name.trim(), config));
    setStatus({ kind: "success", text: c("autosaved") });
  }

  function applySavedPreset(name) {
    const preset = presets.find((item) => item.name === name);
    if (!preset || !config) return;
    setConfig({ ...applyPreset(config, preset), basketPreset: "custom" });
    markProjectDirty();
  }

  function updateFilters(patch) {
    setFilters((current) => ({ ...current, ...patch }));
    if (Object.prototype.hasOwnProperty.call(patch, "classCode")) {
      persistPreferences({ lastClassCode: patch.classCode || "all" });
    }
    markProjectDirty();
  }

  function updateNote(studentId, value) {
    setNoteSaveStatus((current) => ({ ...current, [studentId]: "saving" }));
    try {
      setNotes(saveNote(workspaceKey, studentId, value));
      setNoteSaveStatus((current) => ({ ...current, [studentId]: "saved" }));
      const timers = noteSaveTimersRef.current;
      if (timers.has(studentId)) window.clearTimeout(timers.get(studentId));
      timers.set(studentId, window.setTimeout(() => {
        setNoteSaveStatus((current) => ({ ...current, [studentId]: "idle" }));
        timers.delete(studentId);
      }, 1800));
      markProjectDirty();
    } catch (error) {
      console.error(error);
      setNoteSaveStatus((current) => ({ ...current, [studentId]: "error" }));
      setProjectSaveState("error");
    }
  }

  function saveProjectBackup() {
    if (!model || !config) return;
    const exportAnalysis = analysis || calculateAnalysis(model, config);
    const payload = buildProjectPayload(model, config, exportAnalysis, notes, filters, {});
    const localSave = saveProjectDraft(workspaceKey, payload);
    exportProjectJson(model, config, exportAnalysis, notes, filters, {});
    setProjectSaveState(localSave.ok ? "saved" : "error");
    setStatus({
      kind: localSave.ok ? "success" : "warning",
      text: localSave.ok ? t("status.projectSaved") : t("status.projectSavePartial"),
    });
  }

  function scrollToStudent(studentId) {
    const card = document.querySelector(`[data-student-id="${CSS.escape(studentId)}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("is-focused");
    window.setTimeout(() => card.classList.remove("is-focused"), 1100);
  }

  function printStudentCard(studentId) {
    setPrintStudentId(studentId);
  }

  const compactCards = preferences.compactCards !== false;
  const openCardSections = {
    ...DEFAULT_OPEN_CARD_SECTIONS,
    ...(preferences.openCardSections || {}),
  };

  function updateCardSectionPreference(section, isOpen) {
    persistPreferences({
      openCardSections: {
        ...openCardSections,
        [section]: Boolean(isOpen),
      },
    });
  }

  function closeTour(completed = false) {
    setActiveTour(null);
    if (completed) {
      persistPreferences({
        tourCompletedAt: new Date().toISOString(),
      });
    }
  }

  const shellClass = cn("app-shell", workflowStep === "upload" && "app-shell--splash", printStudentId && "is-printing-single");

  return (
    <TooltipProvider delayDuration={180}>
      <div className={shellClass}>
        {workflowStep !== "upload" ? (
          <AppHeader
            preferences={preferences}
            projectSaveState={projectSaveState}
            onAnonymiseChange={(value) => persistPreferences({ anonymised: value })}
            onSaveProject={saveProjectBackup}
            onReset={resetData}
          />
        ) : null}

        <main className="app-main">
          {workflowStep === "upload" ? (
            <UploadScreen
              status={status}
              isBusy={isBusy}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              fileInputRef={fileInputRef}
              projectInputRef={projectInputRef}
              uploadSummary={uploadSummary}
              onLoadWorkbook={loadWorkbook}
              onLoadProject={loadProjectFile}
            />
          ) : null}

          {workflowStep === "review" && model && config ? (
            <EvaluationReviewScreen
              c={c}
              model={model}
              config={config}
              status={status}
              onAssignmentChange={updateAssignment}
              onContinue={() => setWorkflowStep("map")}
            />
          ) : null}

          {workflowStep === "map" && model && config ? (
            <MappingScreen
              c={c}
              model={model}
              config={config}
              presets={presets}
              isBusy={isBusy}
              status={status}
              onConfigChange={updateConfig}
              onAssignmentChange={updateAssignment}
              onBasketWeightChange={updateBasketWeight}
              onApplyBasketPreset={applyBasketPreset}
              onSavePreset={saveCurrentPreset}
              onApplySavedPreset={applySavedPreset}
              onGenerate={generateCards}
            />
          ) : null}

          {workflowStep === "generating" && model && config ? (
            <GenerationScreen c={c} model={model} config={config} generationStep={generationStep} />
          ) : null}

          {workflowStep === "dashboard" && analysis ? (
            <DashboardScreen
              c={c}
              analysis={analysis}
              filters={filters}
              filteredStudents={filteredStudents}
              anonymised={Boolean(preferences.anonymised)}
              compactCards={compactCards}
              openCardSections={openCardSections}
              notes={notes}
              noteSaveStatus={noteSaveStatus}
              onCompactCardsChange={(value) => persistPreferences({ compactCards: value })}
              onCardSectionOpenChange={updateCardSectionPreference}
              onFiltersChange={updateFilters}
              onNoteChange={updateNote}
              onScrollToStudent={scrollToStudent}
              onStartTour={(studentId) => {
                scrollToStudent(studentId);
                window.setTimeout(() => setActiveTour({ studentId, step: 0 }), 220);
              }}
              onPrintStudent={printStudentCard}
              printStudentId={printStudentId}
              onEvaluationClick={setEvaluationDialog}
              onHistogramClick={setHistogramDialog}
            />
          ) : null}
        </main>

        {workflowStep !== "upload" ? <Footer /> : null}

        <StudentTourOverlay
          c={c}
          activeTour={activeTour}
          onChange={setActiveTour}
          onClose={() => closeTour(false)}
          onComplete={() => closeTour(true)}
        />

        <EvaluationDialog
          c={c}
          data={evaluationDialog}
          onOpenChange={(open) => {
            if (!open) setEvaluationDialog(null);
          }}
        />

        <HistogramDialog
          data={histogramDialog}
          anonymised={Boolean(preferences.anonymised)}
          onOpenChange={(open) => {
            if (!open) setHistogramDialog(null);
          }}
        />
      </div>
    </TooltipProvider>
  );
}

function AppHeader({ preferences, projectSaveState, onAnonymiseChange, onSaveProject, onReset }) {
  const saveLabel = projectSaveState === "dirty"
    ? t("autosave.dirty")
    : projectSaveState === "error"
      ? t("autosave.error")
      : t("autosave.ready");
  return (
    <header className="app-header">
      <div className="brand-heading">
        <span className="brand-mark" aria-hidden="true">SA</span>
        <div>
          <p className="eyebrow">{t("app.brand")}</p>
          <h1>{t("app.heading")}</h1>
        </div>
      </div>
      <div className="header-actions">
        <label className="toggle-control">
          <input
            type="checkbox"
            checked={Boolean(preferences.anonymised)}
            onChange={(event) => onAnonymiseChange(event.target.checked)}
          />
          <span>{t("toggle.anonymise")}</span>
        </label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn("autosave-indicator", projectSaveState === "dirty" && "is-dirty", projectSaveState === "error" && "is-error")}
              type="button"
              onClick={onSaveProject}
              aria-label={t("button.saveProject")}
            >
              <Save size={18} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{saveLabel}</TooltipContent>
        </Tooltip>
        <Button variant="outline" type="button" onClick={onReset}>
          <RotateCcw size={16} aria-hidden="true" />
          {t("button.reset")}
        </Button>
      </div>
    </header>
  );
}

function UploadScreen({
  status,
  isBusy,
  isDragging,
  setIsDragging,
  fileInputRef,
  projectInputRef,
  uploadSummary,
  onLoadWorkbook,
  onLoadProject,
}) {
  function handleIncomingFile(file) {
    if (!file) return;
    if (/\.json$/i.test(file.name)) onLoadProject(file);
    else onLoadWorkbook(file, file.name);
  }

  function handleFileSelection(event) {
    const [file] = event.target.files || [];
    handleIncomingFile(file);
    event.target.value = "";
  }

  function handleProjectSelection(event) {
    const [file] = event.target.files || [];
    if (file) onLoadProject(file);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const [file] = event.dataTransfer.files || [];
    handleIncomingFile(file);
  }

  return (
    <section className="upload-screen">
      <div className="splash-topbar">
        <div className="brand-heading brand-heading--light">
          <span className="brand-mark brand-mark--light" aria-hidden="true">SA</span>
          <span>{t("app.brand")}</span>
        </div>
      </div>

      <div className="upload-stage">
        <div className="upload-copy">
          <p className="eyebrow">{t("app.brand")}</p>
          <h2>{t("upload.title")}</h2>
          <p>{t("upload.subtitle")}</p>
        </div>

        <Card className={cn("upload-card", uploadSummary && "is-complete")}>
          <CardContent>
            <button
              type="button"
              className={cn("drop-zone", isDragging && "is-dragging")}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} className="sr-only" type="file" accept=".xlsx,.xls,.json,application/json" onChange={handleFileSelection} />
              <span className="drop-zone-icon" aria-hidden="true">
                {isBusy ? <Spinner /> : <UploadCloud size={30} />}
              </span>
              <span className="drop-zone-title">{t("upload.dropTitle")}</span>
              <span className="drop-zone-help">{t("upload.help")}</span>
            </button>

            {uploadSummary ? (
              <div className="upload-success-panel" aria-live="polite">
                <div className="upload-success-icon" aria-hidden="true">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <strong>{t("upload.detectedTitle")}</strong>
                  <p>{t("upload.detectedHelp", { fileName: uploadSummary.fileName })}</p>
                  <dl>
                    <div>
                      <dt>{t("detected.students")}</dt>
                      <dd>{uploadSummary.students}</dd>
                    </div>
                    <div>
                      <dt>{t("detected.classes")}</dt>
                      <dd>{uploadSummary.classes}</dd>
                    </div>
                    <div>
                      <dt>{t("detected.assignments")}</dt>
                      <dd>{uploadSummary.assignments}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : null}

            <div className="project-import-row">
              <input ref={projectInputRef} className="sr-only" type="file" accept=".json,application/json" onChange={handleProjectSelection} />
              <Button variant="ghost" type="button" onClick={() => projectInputRef.current?.click()}>
                <FolderOpen size={16} aria-hidden="true" />
                {t("button.importProject")}
              </Button>
              <span>{t("upload.importHelp")}</span>
            </div>

            <div className={cn("status-pill", `status-pill--${status.kind}`)} aria-live="polite">
              {isBusy ? <Spinner /> : <ShieldCheck size={15} aria-hidden="true" />}
              <span>{status.text}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function EvaluationReviewScreen({
  c,
  model,
  config,
  status,
  onAssignmentChange,
  onContinue,
}) {
  const counts = assignmentUsageCounts(model.assignments, config);
  const suggestions = reviewSuggestionItems(model.assignments);
  return (
    <section className="workflow-screen review-screen">
      <FlowIndicator active="review" c={c} />
      <div className="screen-heading">
        <div>
          <p className="eyebrow">{t("step.2")}</p>
          <h2>{t("review.title")}</h2>
          <p>{t("review.subtitle")}</p>
        </div>
        <Button type="button" onClick={onContinue}>
          <ChevronRight size={16} aria-hidden="true" />
          {t("review.continue")}
        </Button>
      </div>

      <div className="review-layout">
        <Card className="review-guidance-card">
          <CardContent>
            <div className="usage-summary-grid">
              <StatCard label={t("usage.include")} value={counts.include} compact />
              <StatCard label={t("usage.displayOnly")} value={counts.displayOnly} compact />
              <StatCard label={t("usage.exclude")} value={counts.exclude} compact />
            </div>
            <div className="review-suggestions">
              <strong>{t("review.suggestedTitle")}</strong>
              {suggestions.length ? (
                <ul>
                  {suggestions.map((item) => (
                    <li key={`${item.assignment.id}-${item.reasonKey}`}>
                      <span>{item.assignment.title}</span>
                      <small>{t(item.reasonKey)}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{t("review.suggestedEmpty")}</p>
              )}
            </div>
            <div className={cn("status-pill", `status-pill--${status.kind}`)}>{status.text}</div>
          </CardContent>
        </Card>

        <Card className="evaluation-review-card">
          <CardHeader>
            <CardTitle>{t("review.tableTitle")}</CardTitle>
            <CardDescription>{t("review.tableHelp")}</CardDescription>
          </CardHeader>
          <CardContent>
            <EvaluationUsageTable
              assignments={model.assignments}
              config={config}
              onAssignmentChange={onAssignmentChange}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function MappingScreen({
  c,
  model,
  config,
  presets,
  isBusy,
  status,
  onConfigChange,
  onAssignmentChange,
  onBasketWeightChange,
  onApplyBasketPreset,
  onSavePreset,
  onApplySavedPreset,
  onGenerate,
}) {
  const [presetName, setPresetName] = useState("");
  const basketCategories = basketCategoriesFromConfig(config);
  const categoryOptions = basketCategories.map((category) => category.name);
  const normalised = normaliseBasketPercentages(basketCategories);
  const transferPairs = basketTransferHints(basketCategories);

  return (
    <section className="workflow-screen map-screen">
      <FlowIndicator active="map" c={c} />
      <div className="screen-heading">
        <div>
          <p className="eyebrow">{t("step.3")}</p>
          <h2>{t("mapping.title")}</h2>
        </div>
        <Button type="button" disabled={isBusy} onClick={onGenerate}>
          {isBusy ? <Spinner /> : <Sparkles size={16} aria-hidden="true" />}
          {isBusy ? t("mapping.generating") : t("mapping.generate")}
        </Button>
      </div>

      <SetupProgressRail />

      <div className="map-grid">
        <DetectedSummary model={model} />
        <WarningsPanel warnings={model.warnings} />
      </div>

      <div className="setup-wizard">
        <Card className="wizard-card">
          <CardHeader>
            <div className="step-number">1</div>
            <div>
              <CardTitle>{t("mapping.stepCourse")}</CardTitle>
              <CardDescription>{t("mapping.stepCourseHelp")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="form-grid">
            <Field label={t("mapping.subject")}>
              <Input value={config.subject || ""} onChange={(event) => onConfigChange({ subject: event.target.value })} />
            </Field>
            <Field label={t("mapping.threshold")}>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={config.threshold ?? 50}
                onChange={(event) => onConfigChange({ threshold: Number(event.target.value) })}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="wizard-card">
          <CardHeader>
            <div className="step-number">2</div>
            <div>
              <CardTitle>{t("mapping.stepBaskets")}</CardTitle>
              <CardDescription>{t("mapping.stepBasketsHelp")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="form-grid">
              <Field label={t("mapping.basketPreset")}>
                <Select value={config.basketPreset || "custom"} onChange={(event) => onApplyBasketPreset(event.target.value)}>
                  {Object.entries(BASKET_PRESETS).filter(([, preset]) => !preset.hidden).map(([key, preset]) => (
                    <option key={key} value={key}>{presetLabel(preset)}</option>
                  ))}
                  <option value="custom">{t("preset.custom")}</option>
                </Select>
              </Field>
            </div>
            <div className="basket-grid">
              {basketCategories.map((category) => (
                <label key={category.name} className="basket-row">
                  <span>{category.name}</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder={t("mapping.basketPlaceholder")}
                    value={category.weight || ""}
                    onChange={(event) => onBasketWeightChange(category.name, Number(event.target.value) || 0)}
                  />
                  <strong>{c("basketNormalised")} {normalised.get(category.name) || "0%"}</strong>
                </label>
              ))}
            </div>
            {transferPairs.length ? (
              <div className="basket-transfer-panel">
                <div>
                  <p className="eyebrow">{t("mapping.transferTitle")}</p>
                  <strong>{t("mapping.transferIntro")}</strong>
                </div>
                <div className="basket-transfer-list">
                  {transferPairs.map((pair) => (
                    <span key={`${pair.dw}-${pair.ex}`} className="basket-transfer-chip">
                      <span>{pair.ex}</span>
                      <ArrowDown size={14} aria-hidden="true" />
                      <span>{pair.dw}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <Accordion type="single" collapsible className="preset-tools-accordion">
              <AccordionItem value="preset-tools">
                <AccordionTrigger>{t("mapping.presetTools")}</AccordionTrigger>
                <AccordionContent>
                  <div className="form-grid">
                    <Field label={t("mapping.savePreset")}>
                      <div className="inline-field">
                        <Input
                          value={presetName}
                          placeholder={t("mapping.presetPlaceholder")}
                          onChange={(event) => setPresetName(event.target.value)}
                        />
                        <Button variant="outline" type="button" onClick={() => {
                          onSavePreset(presetName);
                          setPresetName("");
                        }}>
                          <Save size={16} aria-hidden="true" />
                          {t("button.savePreset")}
                        </Button>
                      </div>
                    </Field>
                    <Field label={t("mapping.savedPreset")}>
                      <Select defaultValue="" onChange={(event) => onApplySavedPreset(event.target.value)}>
                        <option value="">{t("mapping.noPreset")}</option>
                        {presets.map((preset) => (
                          <option key={preset.name} value={preset.name}>{preset.name}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="wizard-card">
          <CardHeader>
            <div className="step-number">3</div>
            <div>
              <CardTitle>{t("mapping.stepCheck")}</CardTitle>
              <CardDescription>{t("mapping.stepCheckHelp")}</CardDescription>
            </div>
            <CardAction>
              <Button type="button" disabled={isBusy} onClick={onGenerate}>
                {isBusy ? <Spinner /> : <Sparkles size={16} aria-hidden="true" />}
                {t("mapping.generate")}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className={cn("status-pill", `status-pill--${status.kind}`)}>{status.text}</div>
          </CardContent>
        </Card>
      </div>

      <Accordion type="single" collapsible className="advanced-accordion">
        <AccordionItem value="assignments">
          <AccordionTrigger>{c("advancedAssignment")}</AccordionTrigger>
          <AccordionContent>
            <AssignmentMappingTable model={model} config={config} categoryOptions={categoryOptions} onAssignmentChange={onAssignmentChange} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}

function GenerationScreen({ c, model, config, generationStep }) {
  return (
    <section className="workflow-screen generation-screen">
      <FlowIndicator active="dashboard" c={c} />
      <div className="generation-shell">
        <div className="generation-copy">
          <p className="eyebrow">{t("generation.eyebrow")}</p>
          <h2>{t("generation.title")}</h2>
          <p>{t("generation.body", {
            students: model.students.length,
            subject: config.subject || model.subjects?.[0]?.value || t("dashboard.fallbackTitle"),
          })}</p>
        </div>
        <div className="generation-steps" aria-live="polite">
          {GENERATION_STEPS.map((step, index) => {
            const isComplete = index < generationStep;
            const isActive = index === generationStep;
            return (
              <div key={step.key} className={cn("generation-step", isComplete && "is-complete", isActive && "is-active")}>
                <span>{isComplete ? "OK" : index + 1}</span>
                <div>
                  <strong>{t(step.titleKey)}</strong>
                  <p>{t(step.bodyKey)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DashboardScreen({
  c,
  analysis,
  filters,
  filteredStudents,
  anonymised,
  compactCards,
  openCardSections,
  notes,
  noteSaveStatus,
  onCompactCardsChange,
  onCardSectionOpenChange,
  onFiltersChange,
  onNoteChange,
  onScrollToStudent,
  onStartTour,
  onPrintStudent,
  printStudentId,
  onEvaluationClick,
  onHistogramClick,
}) {
  const classes = unique(analysis.students.map((student) => student.classCode));
  const flags = unique(analysis.students.flatMap((student) => student.flags.map((flag) => flag.type)));
  const stats = summariseStudents(filteredStudents, filters.threshold ?? 50);
  const peerGroups = useMemo(() => {
    const groups = new Map();
    for (const student of analysis.students) {
      if (!groups.has(student.classCode)) {
        groups.set(student.classCode, analysis.students.filter((peer) => peer.classCode === student.classCode));
      }
    }
    return groups;
  }, [analysis.students]);

  return (
    <section className="workflow-screen dashboard-screen">
      <FlowIndicator active="dashboard" c={c} />
      <div className="dashboard-header">
        <div className="screen-heading">
          <div>
            <p className="eyebrow">{t("step.4")}</p>
            <h2>{analysis.subject || t("dashboard.fallbackTitle")}</h2>
            <p>{t("dashboard.detectedLine", {
              fileName: analysis.fileName,
              students: analysis.students.length,
              assignments: analysis.assignments.length,
            })}</p>
          </div>
          <Badge variant="secondary">{c("printReady")}</Badge>
        </div>

        <ClassTabs classes={classes} students={analysis.students} selectedClass={filters.classCode} onSelect={(classCode) => onFiltersChange({ classCode })} />
        <ClassOverviewCards classes={classes} students={analysis.students} selectedClass={filters.classCode} threshold={filters.threshold} onSelect={(classCode) => onFiltersChange({ classCode })} />

        <div className="stats-grid">
          <StatCard label={t("detected.students")} value={stats.count} />
          <StatCard label={t("dashboard.classAverage")} value={`${formatNumber(stats.mean)}%`} />
          <StatCard label={t("dashboard.below", { threshold: filters.threshold ?? 50 })} value={stats.belowThreshold} />
          <StatCard label={t("dashboard.incomplete")} value={stats.incomplete} />
        </div>

        <div className="filters" aria-label={t("filter.label")}>
          <Select value={filters.band} onChange={(event) => onFiltersChange({ band: event.target.value })} aria-label={t("filter.allBands")}>
            <option value="all">{t("filter.allBands")}</option>
            {THRESHOLD_BANDS.map((band) => (
              <option key={band.id} value={band.id}>{t(`band.${band.id}`)}</option>
            ))}
          </Select>
          <Select value={filters.flag} onChange={(event) => onFiltersChange({ flag: event.target.value })} aria-label={t("filter.allFlags")}>
            <option value="all">{t("filter.allFlags")}</option>
            {flags.map((flag) => (
              <option key={flag} value={flag}>{t(`flag.${flag}`)}</option>
            ))}
          </Select>
          <Button variant="outline" type="button" onClick={() => onFiltersChange({ band: "all", flag: "all" })}>
            {t("filter.clear")}
          </Button>
        </div>
      </div>

      <div className="overview-grid">
        <Card className="chart-panel">
          <CardHeader>
            <CardTitle>{t("chart.histogramTitle")}</CardTitle>
            <CardDescription>{c("visibleAdvice")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Histogram students={filteredStudents} anonymised={anonymised} onBinClick={onHistogramClick} />
          </CardContent>
        </Card>
        <Card className="students-panel">
          <CardHeader>
            <CardTitle>{t("student.tableTitle")}</CardTitle>
            <CardDescription>{t("student.openCard")}</CardDescription>
          </CardHeader>
          <CardContent>
            <StudentTable
              students={filteredStudents}
              anonymised={anonymised}
              filters={filters}
              onFiltersChange={onFiltersChange}
              onOpen={onScrollToStudent}
            />
          </CardContent>
        </Card>
      </div>

      <div className="cards-heading">
        <div>
          <h3>{t("student.cardsTitle")}</h3>
          <span>{filteredStudents.length} {t("detected.students").toLowerCase()}</span>
        </div>
        <Button variant="outline" size="sm" type="button" onClick={() => onCompactCardsChange(!compactCards)}>
          {compactCards ? <Maximize2 size={15} aria-hidden="true" /> : <Minimize2 size={15} aria-hidden="true" />}
          {compactCards ? t("dashboard.roomyCards") : t("dashboard.compactCards")}
        </Button>
      </div>

      <div className={cn("student-cards", compactCards && "student-cards--compact")}>
        {filteredStudents.length ? filteredStudents.map((student, index) => (
          <StudentCard
            key={student.id}
            student={student}
            peers={peerGroups.get(student.classCode) || filteredStudents}
            anonymised={anonymised}
            compact={compactCards}
            openSections={openCardSections}
            displayIndex={index}
            note={notes[student.id] || ""}
            noteStatus={noteSaveStatus[student.id] || "idle"}
            onNoteChange={onNoteChange}
            onSectionOpenChange={onCardSectionOpenChange}
            onScrollToStudent={onScrollToStudent}
            onStartTour={onStartTour}
            onPrintStudent={onPrintStudent}
            isPrintTarget={printStudentId === student.id}
            onEvaluationClick={onEvaluationClick}
            onHistogramClick={onHistogramClick}
          />
        )) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

function SetupProgressRail() {
  const steps = [
    { number: 1, title: t("mapping.stepCourse"), body: t("mapping.railCourse") },
    { number: 2, title: t("mapping.stepBaskets"), body: t("mapping.railBaskets") },
    { number: 3, title: t("mapping.stepCheck"), body: t("mapping.railGenerate") },
  ];

  return (
    <div className="setup-progress-rail" aria-label={t("mapping.progressLabel")}>
      {steps.map((step) => (
        <div className="setup-progress-step" key={step.number}>
          <span>{step.number}</span>
          <div>
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FlowIndicator({ active, c }) {
  const steps = [
    ["upload", c("uploadFlow")],
    ["review", c("reviewFlow")],
    ["map", c("mapFlow")],
    ["dashboard", c("dashboardFlow")],
  ];
  const activeIndex = steps.findIndex(([id]) => id === active);
  return (
    <ol className="flow-indicator" aria-label="Workflow">
      {steps.map(([id, label], index) => (
        <li key={id} className={cn(index <= activeIndex && "is-complete", id === active && "is-active")}>
          <span>{index + 1}</span>
          <strong>{label}</strong>
        </li>
      ))}
    </ol>
  );
}

function Field({ label, help, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {help ? <small>{help}</small> : null}
    </label>
  );
}

function DetectedSummary({ model }) {
  const primarySubject = model.subjects[0]?.value || t("option.none");
  const classList = model.classes.map((entry) => `${entry.value} (${entry.count})`).join(", ") || t("option.none");
  return (
    <Card className="detected-summary-card">
      <CardHeader>
        <div>
          <p className="eyebrow">{t("detected.ready")}</p>
          <CardTitle>{primarySubject}</CardTitle>
          <CardDescription>{t("detected.simpleLine", {
            fileName: model.fileName,
            students: model.students.length,
            classes: model.classes.length,
            assignments: model.assignments.length,
          })}</CardDescription>
        </div>
        <CardAction>
          <Badge>{model.totals.missingCells} {t("detected.blankScores").toLowerCase()}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="detected-grid">
          <StatCard label={t("detected.workbook")} value={model.fileName} compact />
          <StatCard label={t("detected.classes")} value={classList} compact />
          <StatCard label={t("detected.students")} value={model.students.length} compact />
          <StatCard label={t("detected.assignments")} value={model.assignments.length} compact />
        </div>
      </CardContent>
    </Card>
  );
}

function WarningsPanel({ warnings }) {
  if (!warnings.length) {
    return (
      <Card className="warning-card">
        <CardHeader>
          <CardTitle>{t("warnings.title")}</CardTitle>
          <CardDescription>{t("quality.retakeBody")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Accordion type="single" collapsible className="warning-accordion">
      <AccordionItem value="warnings">
        <AccordionTrigger>
          {t("warnings.title")}
          <Badge variant="warning">{t("warnings.count", { count: warnings.length })}</Badge>
        </AccordionTrigger>
        <AccordionContent>
          <ul className="warning-list">
            {warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function EvaluationUsageTable({ assignments, config, onAssignmentChange }) {
  return (
    <Table className="evaluation-usage-table">
      <TableHeader>
        <TableRow>
          <TableHead>{t("mapping.assignment")}</TableHead>
          <TableHead>{t("table.sheet")}</TableHead>
          <TableHead>{t("mapping.date")}</TableHead>
          <TableHead>{t("mapping.category")}</TableHead>
          <TableHead>{t("mapping.max")}</TableHead>
          <TableHead>{t("review.useFor")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((assignment) => {
          const override = config.assignments?.[assignment.id] || {};
          const usage = assignmentUsage(override);
          return (
            <TableRow key={assignment.id} className={cn("evaluation-usage-row", usage !== "include" && "is-muted")}>
              <TableCell>
                <strong>{assignment.title}</strong>
                <small>{assignment.subject || ""}</small>
              </TableCell>
              <TableCell>{assignment.sheetName}</TableCell>
              <TableCell>{assignment.date || t("option.notAvailable")}</TableCell>
              <TableCell>{override.category || assignment.category || "OTHER"}</TableCell>
              <TableCell>{formatNumber(override.maxPoints ?? assignment.maxPoints)}</TableCell>
              <TableCell>
                <UsageSegmentedControl
                  value={usage}
                  onChange={(nextUsage) => onAssignmentChange(assignment.id, assignmentUsagePatch(nextUsage, override))}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function UsageSegmentedControl({ value, onChange }) {
  return (
    <div className="usage-segment" role="group" aria-label={t("review.useFor")}>
      {ASSIGNMENT_USAGE_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={cn(value === option && "is-active")}
          onClick={() => onChange(option)}
        >
          {t(`usage.${option}`)}
        </button>
      ))}
    </div>
  );
}

function AssignmentMappingTable({ model, config, categoryOptions, onAssignmentChange }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("mapping.use")}</TableHead>
          <TableHead>{t("mapping.required")}</TableHead>
          <TableHead>{t("table.sheet")}</TableHead>
          <TableHead>{t("mapping.assignment")}</TableHead>
          <TableHead>{t("mapping.date")}</TableHead>
          <TableHead>{t("mapping.category")}</TableHead>
          <TableHead>{t("mapping.max")}</TableHead>
          <TableHead>{t("detected.classes")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {model.assignments.map((assignment, index) => {
          const override = config.assignments?.[assignment.id] || {};
          const usage = assignmentUsage(override);
          const category = override.category || inferBasketCategory(assignment, index, model.assignments, categoryOptions);
          const options = unique([...categoryOptions, category, assignment.category, "OTHER"]);
          return (
            <TableRow key={assignment.id}>
              <TableCell>
                <Select value={usage} onChange={(event) => onAssignmentChange(assignment.id, assignmentUsagePatch(event.target.value, override))}>
                  {ASSIGNMENT_USAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{t(`usage.${option}`)}</option>
                  ))}
                </Select>
              </TableCell>
              <TableCell>
                <input
                  type="checkbox"
                  disabled={usage !== "include"}
                  checked={override.required !== false}
                  onChange={(event) => onAssignmentChange(assignment.id, { required: event.target.checked })}
                />
              </TableCell>
              <TableCell>{assignment.sheetName}</TableCell>
              <TableCell>{assignment.title}</TableCell>
              <TableCell>{assignment.date || ""}</TableCell>
              <TableCell>
                <Select value={category} onChange={(event) => onAssignmentChange(assignment.id, { category: event.target.value })}>
                  {options.map((name) => <option key={name} value={name}>{name}</option>)}
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={override.maxPoints ?? assignment.maxPoints}
                  onChange={(event) => onAssignmentChange(assignment.id, { maxPoints: Number(event.target.value) })}
                />
              </TableCell>
              <TableCell>{Array.from(assignment.classCodes || []).join(", ")}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ClassTabs({ classes, students, selectedClass, onSelect }) {
  const tabs = ["all", ...classes];
  return (
    <div className="class-tabs" aria-label={t("dashboard.classTabs")}>
      {tabs.map((classCode) => {
        const active = selectedClass === classCode || (!selectedClass && classCode === "all");
        const count = classCode === "all" ? students.length : students.filter((student) => student.classCode === classCode).length;
        const label = classCode === "all" ? t("filter.allClasses") : classCode;
        return (
          <button key={classCode} className={cn("class-tab", active && "is-active")} type="button" onClick={() => onSelect(classCode)}>
            <span>{label}</span>
            <strong>{count}</strong>
          </button>
        );
      })}
    </div>
  );
}

function ClassOverviewCards({ classes, students, selectedClass, threshold, onSelect }) {
  if (classes.length < 2) return null;
  return (
    <div className="class-overview-cards" aria-label={t("dashboard.classOverview")}>
      {classes.map((classCode) => {
        const classStudents = students.filter((student) => student.classCode === classCode);
        const stats = summariseStudents(classStudents, threshold);
        return (
          <button
            key={classCode}
            className={cn("class-overview-card", selectedClass === classCode && "is-active")}
            type="button"
            onClick={() => onSelect(classCode)}
          >
            <span>{classCode}</span>
            <strong>{stats.count}</strong>
            <small>{t("dashboard.classAverage")}: {formatNumber(stats.mean)}%</small>
            <small>{t("dashboard.below", { threshold })}: {stats.belowThreshold}</small>
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, compact = false }) {
  const valueText = String(value ?? "");
  return (
    <div className={cn("stat-card", compact && "stat-card--compact")}>
      <p className={cn("stat-value", valueText.length > 24 && "is-extra-long", valueText.length > 14 && "is-long")}>{valueText}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}

function StudentTable({ students, anonymised, filters, onFiltersChange, onOpen }) {
  const sorted = sortStudents(students, filters);
  return (
    <Table className="student-table">
      <TableHeader>
        <TableRow>
          <SortHeader field="name" label={t("student.student")} filters={filters} onFiltersChange={onFiltersChange} />
          <SortHeader field="class" label={t("student.class")} filters={filters} onFiltersChange={onFiltersChange} />
          <SortHeader field="total" label={t("student.total")} filters={filters} onFiltersChange={onFiltersChange} align="right" />
          <SortHeader field="coverage" label={t("student.coverage")} filters={filters} onFiltersChange={onFiltersChange} align="right" className="student-table-coverage" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((student, index) => (
          <TableRow
            key={student.id}
            className="student-table-row"
            tabIndex={0}
            onClick={() => onOpen(student.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(student.id);
              }
            }}
          >
            <TableCell>
              <span className="student-table-name">
                <span>{anonymised ? t("student.anonymous", { number: String(index + 1).padStart(2, "0") }) : student.name}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </TableCell>
            <TableCell>{student.classCode}</TableCell>
            <TableCell className="table-cell-numeric">{formatGrade(student.finalWeighted)}</TableCell>
            <TableCell className="table-cell-numeric student-table-coverage">{formatPercent(student.evidenceCoverage)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SortHeader({ field, label, filters, onFiltersChange, align = "left", className }) {
  const active = (filters.sortKey || "name") === field;
  const direction = active ? filters.sortDirection || "asc" : "asc";
  const nextDirection = active && direction === "asc" ? "desc" : "asc";
  return (
    <TableHead className={className} aria-sort={active ? direction === "asc" ? "ascending" : "descending" : "none"}>
      <button className={cn("table-sort-button", align === "right" && "table-sort-button--right")} type="button" onClick={() => onFiltersChange({ sortKey: field, sortDirection: nextDirection })}>
        <span>{label}</span>
        {active ? direction === "asc" ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" /> : null}
      </button>
    </TableHead>
  );
}

function StudentCard({
  student,
  peers,
  anonymised,
  compact,
  openSections,
  displayIndex,
  note,
  noteStatus,
  onNoteChange,
  onSectionOpenChange,
  onScrollToStudent,
  onStartTour,
  onPrintStudent,
  isPrintTarget,
  onEvaluationClick,
  onHistogramClick,
}) {
  const displayName = anonymised ? t("student.anonymous", { number: String(displayIndex + 1).padStart(2, "0") }) : student.name;
  const peerIndex = peers.findIndex((peer) => peer.id === student.id);
  const previousPeer = peerIndex > 0 ? peers[peerIndex - 1] : null;
  const nextPeer = peerIndex >= 0 && peerIndex < peers.length - 1 ? peers[peerIndex + 1] : null;
  const sectionOpen = {
    ...DEFAULT_OPEN_CARD_SECTIONS,
    ...(openSections || {}),
  };

  return (
    <Card className={cn("student-card", compact && "student-card--compact", isPrintTarget && "is-print-target")} id={`student-card-${student.id}`} data-student-id={student.id}>
      <CardHeader className="student-card-header" data-tour-part="total">
        <div>
          <CardTitle className="student-title">{displayName}</CardTitle>
          <div className="student-meta">
            <Badge variant="outline">{student.classCode}</Badge>
            <Badge variant="outline">{student.subject || ""}</Badge>
            <EvidenceParticipationBadge student={student} peers={peers} />
          </div>
        </div>
        <CardAction className="student-actions">
          <nav className="student-nav" aria-label={t("student.navLabel")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={t("student.backToOverview")}>
                  <ArrowUp size={17} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("student.backToOverview")}</TooltipContent>
            </Tooltip>
            {previousPeer ? (
              <Button variant="ghost" size="icon" type="button" onClick={() => onScrollToStudent(previousPeer.id)} aria-label={t("student.previousInClass")}>
                <ChevronLeft size={17} aria-hidden="true" />
              </Button>
            ) : null}
            {nextPeer ? (
              <Button variant="ghost" size="icon" type="button" onClick={() => onScrollToStudent(nextPeer.id)} aria-label={t("student.nextInClass")}>
                <ChevronRight size={17} aria-hidden="true" />
              </Button>
            ) : null}
          </nav>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" type="button" onClick={() => onPrintStudent(student.id)} aria-label={t("student.printCard")}>
                <Printer size={17} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("student.printCard")}</TooltipContent>
          </Tooltip>
          <Button variant="outline" type="button" onClick={() => onStartTour(student.id)}>{t("tour.button")}</Button>
          <div className={cn("grade-badge", student.thresholdBand.className)}>{formatGrade(student.finalWeighted)}</div>
        </CardAction>
      </CardHeader>

      <CardContent>
        <section className="card-section card-section--graph" data-tour-part="graph">
          <div className="section-row graph-section-heading">
            <h4>{t("student.visualContext")}</h4>
            <span>{t("chart.clickDots")}</span>
          </div>
          <YearTrend trend={student.trend} student={student} onEvaluationClick={onEvaluationClick} />
          <Accordion
            type="single"
            collapsible
            className="duiding-accordion"
            value={sectionOpen.duiding ? "duiding" : ""}
            onValueChange={(value) => onSectionOpenChange?.("duiding", value === "duiding")}
          >
            <AccordionItem value="duiding">
              <AccordionTrigger>{t("chart.interpretationTitle")}</AccordionTrigger>
              <AccordionContent>
                <GraphInterpretation trend={student.trend} embedded />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Accordion
            type="single"
            collapsible
            className="context-charts-accordion"
            value={sectionOpen.contextCharts ? "context" : ""}
            onValueChange={(value) => onSectionOpenChange?.("contextCharts", value === "context")}
          >
            <AccordionItem value="context">
              <AccordionTrigger>{t("chart.classContext")}</AccordionTrigger>
              <AccordionContent>
                <div className="peer-chart-grid">
                  <div className="peer-chart-stack">
                    <DotPlot students={peers} selected={student} anonymised={anonymised} />
                    <QuartileStrip students={peers} selected={student} />
                  </div>
                  <MiniHistogram students={peers} selected={student} anonymised={anonymised} onBinClick={onHistogramClick} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section className="card-section card-section--summary" data-tour-part="advice">
          <PedagogicalSummary student={student} />
          {student.flags.length ? (
            <div className="flag-detail-list">
              {student.flags.map((flag, index) => (
                <div className="flag-detail-row" key={`${flag.type}-${index}`}>
                  <Badge variant={flag.tone === "danger" ? "destructive" : flag.tone === "warning" ? "warning" : "secondary"}>
                    {flag.label}
                  </Badge>
                  <p>{flag.detail}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="card-section notes-section" data-tour-part="notes">
          <div className="section-row notes-heading">
            <h4>{t("student.teacherJudgement")}</h4>
            <span className={cn("note-save-state", noteStatus !== "idle" && `is-${noteStatus}`)}>
              {noteStatus === "saving" ? t("notes.saving") : noteStatus === "error" ? t("notes.error") : t("notes.saved")}
            </span>
          </div>
          <Textarea
            value={note}
            onChange={(event) => onNoteChange(student.id, event.target.value)}
            placeholder={t("student.teacherPlaceholder")}
          />
        </section>

        <div className="card-grid compact-detail-grid">
          <section className="card-section compact-detail-section" data-tour-part="table">
            <Accordion
              type="single"
              collapsible
              className="score-detail-accordion"
              value={sectionOpen.score ? "score" : ""}
              onValueChange={(value) => onSectionOpenChange?.("score", value === "score")}
            >
              <AccordionItem value="score">
                <AccordionTrigger>{t("student.calculationDetails")}</AccordionTrigger>
                <AccordionContent>
                  <ScoreTable rows={student.categoryRows} />
                  <div className="calculation-note">
                    <p>{t("student.evidenceBody", {
                      available: student.evidence.availableRequired,
                      expected: student.evidence.expectedRequired,
                      coverage: formatPercent(student.evidenceCoverage),
                    })}</p>
                    <p>{t("student.traceBody")}</p>
                    <p>{t(`student.finalSource.${student.finalSource || "missing"}`)}</p>
                    {student.finalSource === "imported" && Number.isFinite(student.calculatedWeighted) ? (
                      <p>{t("student.calculatedFinal")}: {formatGrade(student.calculatedWeighted)}</p>
                    ) : null}
                    <p>{t("student.importedFinal")}: {student.importedFinal ? `${student.importedFinal.source} ${student.importedFinal.field} = ${formatNumber(student.importedFinal.value)}%` : t("student.noImportedFinal")}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          <section className="card-section print-optional compact-detail-section">
            <Accordion
              type="single"
              collapsible
              value={sectionOpen.comments ? "comments" : ""}
              onValueChange={(value) => onSectionOpenChange?.("comments", value === "comments")}
            >
              <AccordionItem value="comments">
                <AccordionTrigger>{t("student.comments")}</AccordionTrigger>
                <AccordionContent>
                  {student.comments.length ? (
                    <ul className="comment-list">
                      {student.comments.map((comment, index) => (
                        <li key={`${comment.source}-${comment.field}-${index}`}>
                          <strong>{comment.source} - {comment.field}</strong>
                          {comment.text}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="muted">{t("student.noComments")}</p>}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

function EvidenceParticipationBadge({ student, peers }) {
  const context = evidenceParticipationContext(peers);
  return (
    <span className="participation-chip">
      <span>{t("student.participationMeta", { value: formatPercent(student.evidenceCoverage) })}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="participation-help" type="button" aria-label={t("student.participationHelpTitle")}>
            <HelpCircle size={14} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="participation-tooltip">
          <strong>{t("student.participationHelpTitle")}</strong>
          <span>{t("student.participationHelp", {
            threshold: formatPercent(context.concernThreshold),
            classMedian: formatPercent(context.classMedianPointsCoverage),
          })}</span>
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

function ScoreTable({ rows }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("mapping.category")}</TableHead>
          <TableHead>{t("student.earned")}</TableHead>
          <TableHead>{t("student.possible")}</TableHead>
          <TableHead>{t("student.raw")}</TableHead>
          <TableHead>{t("mapping.weight")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.category}>
            <TableCell>{row.category}</TableCell>
            <TableCell>{formatNumber(row.pointsEarned)}</TableCell>
            <TableCell>{formatAvailablePoints(row)}</TableCell>
            <TableCell>{row.rawPercentage == null ? t("option.notAvailable") : `${formatNumber(row.rawPercentage)}%`}</TableCell>
            <TableCell>
              <span className="weight-cell-stack">
                <span>{formatPercent(row.effectiveWeight)}</span>
                {row.transferredWeight > 0 ? <small>{t("student.transferredWeight")}</small> : null}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function GraphInterpretation({ trend, embedded = false }) {
  return (
    <div className={cn("graph-interpretation-panel", embedded && "is-embedded")}>
      {embedded ? null : <h4>{t("chart.interpretationTitle")}</h4>}
      <dl>
        <div>
          <dt>{t("chart.monthAxisLabel")}</dt>
          <dd>{t("chart.monthAxisHelp")}</dd>
        </div>
        <div>
          <dt>{t("chart.solidLineLabel")}</dt>
          <dd>{t("chart.solidLineHelp")}</dd>
        </div>
        <div>
          <dt>{t("chart.dashedLineLabel")}</dt>
          <dd>{t("chart.dashedLineHelp")}</dd>
        </div>
        <div>
          <dt>{t("student.trend")}</dt>
          <dd>{renderTrendExplanation(trend)}</dd>
        </div>
        <div>
          <dt>{t("chart.volatilityLabel")}</dt>
          <dd>{renderVolatilityExplanation(trend)}</dd>
        </div>
      </dl>
    </div>
  );
}

function PedagogicalSummary({ student }) {
  const mainFlag = student.flags[0];
  return (
    <div className="advice-summary">
      <strong>{t("advice.summaryTitle")}</strong>
      <p>{mainFlag ? mainFlag.label : t("advice.noSignal")}</p>
      <p>{pedagogicalNextStep(student.flags)}</p>
    </div>
  );
}

function YearTrend({ trend, student, onEvaluationClick }) {
  const points = trend?.periodScores || [];
  if (points.length < 2) {
    return <p className="muted">{t("chart.noTrendData")}</p>;
  }
  const width = 720;
  const height = 184;
  const left = 48;
  const top = 30;
  const bottom = 132;
  const axisWidth = width - left - 28;
  const axisHeight = bottom - top;
  const positionedPoints = positionTrendPoints(points);
  const xFor = (value) => left + (clamp(value, 0, SCHOOL_YEAR_DOMAIN_END) / SCHOOL_YEAR_DOMAIN_END) * axisWidth;
  const yFor = (value) => bottom - (clamp(value, 0, 100) / 100) * axisHeight;
  const linePath = positionedPoints.map(({ point, x }, index) => `${index === 0 ? "M" : "L"} ${xFor(x)} ${yFor(point.value)}`).join(" ");
  const trendLine = linearTrendLineForPoints(positionedPoints);

  return (
    <figure className="year-chart">
      <svg className="chart-svg chart-svg--interactive" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("chart.yearTrend")}>
        <line x1={left} y1={top} x2={left} y2={bottom} stroke="var(--chart-axis)" />
        <line x1={left} y1={bottom} x2={width - 20} y2={bottom} stroke="var(--chart-axis)" />
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line x1={left - 4} y1={yFor(value)} x2={width - 20} y2={yFor(value)} stroke="var(--chart-grid)" />
            <text x="10" y={yFor(value) + 4}>{value}%</text>
          </g>
        ))}
        {SCHOOL_YEAR_MONTHS.slice(1).map((month, index) => (
          <line key={`month-line-${month.labelKey}`} className="year-month-marker" x1={xFor(index + 1)} y1={top} x2={xFor(index + 1)} y2={bottom} />
        ))}
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
        {trendLine ? (
          <line
            className="year-trend-direction"
            x1={xFor(trendLine.startX)}
            y1={yFor(trendLine.start)}
            x2={xFor(trendLine.endX)}
            y2={yFor(trendLine.end)}
          />
        ) : null}
        {positionedPoints.map(({ point, x }, index) => {
          const dotX = xFor(x);
          const dotY = yFor(point.value);
          const label = chartPointLabelPosition(dotX, dotY, { width, top, bottom });
          return (
            <g
              key={`${point.assignmentId || point.label}-${index}`}
              className={cn("trend-dot", isExamPoint(point) && "is-exam-point", point.usage === "displayOnly" && "is-context-point")}
              role="button"
              tabIndex={0}
              transform={`translate(${dotX}, ${dotY})`}
              onClick={() => onEvaluationClick?.({ student, point })}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onEvaluationClick?.({ student, point });
                }
              }}
              aria-label={`${t("chart.evaluation")}: ${point.label}, ${formatNumber(point.value)}%`}
            >
              <text className="trend-dot-label chart-svg-tooltip" x={label.x} y={label.y} textAnchor={label.anchor}>
                {shortLabel(`${point.label} - ${formatNumber(point.value)}%`, 30)}
              </text>
              <circle cx="0" cy="0" r="7" />
            </g>
          );
        })}
        {SCHOOL_YEAR_MONTHS.map((month, index) => (
          <text key={month.labelKey} className="axis-label month-axis-label" x={xFor(index + 0.5)} y={bottom + 26} textAnchor="middle">
            {t(month.labelKey)}
          </text>
        ))}
      </svg>
    </figure>
  );
}

function DotPlot({ students, selected, anonymised }) {
  const [hoveredId, setHoveredId] = useState(null);
  const width = 560;
  const height = 110;
  const left = 34;
  const axisWidth = 488;
  const y = 52;
  const values = students.filter((student) => Number.isFinite(student.finalWeighted));
  return (
    <svg className="chart-svg compact-chart dotplot-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("chart.dotPlot")}>
      <line x1={left} y1={y} x2={left + axisWidth} y2={y} stroke="var(--chart-axis)" />
      {[0, 50, 100].map((value) => (
        <g key={value}>
          <line x1={left + (value / 100) * axisWidth} y1={y - 8} x2={left + (value / 100) * axisWidth} y2={y + 8} stroke="var(--chart-axis)" />
          <text x={left + (value / 100) * axisWidth} y="88" textAnchor="middle">{value}</text>
        </g>
      ))}
      {values.map((student, index) => {
        const x = left + (clamp(student.finalWeighted, 0, 100) / 100) * axisWidth;
        const active = student.id === selected.id;
        const dotY = active ? y - 7 : y + (index % 5) * 3 - 6;
        const label = anonymised ? t("student.anonymous", { number: String(index + 1).padStart(2, "0") }) : student.name;
        const anchor = x < left + 90 ? "start" : x > left + axisWidth - 90 ? "end" : "middle";
        const labelX = anchor === "start" ? 8 : anchor === "end" ? -8 : 0;
        const isHovered = hoveredId === student.id;
        return (
          <g
            key={student.id}
            className={cn("peer-dot", active && "is-selected")}
            tabIndex={0}
            transform={`translate(${x}, ${dotY})`}
            aria-label={`${label}: ${formatGrade(student.finalWeighted)}`}
            onMouseEnter={() => setHoveredId(student.id)}
            onMouseLeave={() => setHoveredId(null)}
            onFocus={() => setHoveredId(student.id)}
            onBlur={() => setHoveredId(null)}
          >
            <text className={cn("peer-dot-label", isHovered && "is-visible")} x={labelX} y="-14" textAnchor={anchor}>{shortLabel(label, 24)} - {formatGrade(student.finalWeighted)}</text>
            <circle className="peer-dot-hit" cx="0" cy="0" r="13" />
            <circle className="peer-dot-circle" cx="0" cy="0" r={active ? 7 : 4} />
          </g>
        );
      })}
    </svg>
  );
}

function QuartileStrip({ students, selected }) {
  const values = students.map((student) => student.finalWeighted).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length || !Number.isFinite(selected.finalWeighted)) return null;
  const q1 = quantile(values, 0.25);
  const q2 = quantile(values, 0.5);
  const q3 = quantile(values, 0.75);
  const x = clamp(selected.finalWeighted, 0, 100);
  return (
    <div className="quartile-strip" aria-label={t("chart.quartile")}>
      <QuartileMarker value={q1} label={t("chart.q1")} help={t("chart.q1Help")} />
      <QuartileMarker value={q2} label={t("chart.median")} help={t("chart.medianHelp")} />
      <QuartileMarker value={q3} label={t("chart.q3")} help={t("chart.q3Help")} />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="quartile-selected"
            type="button"
            style={{ left: `${x}%` }}
            aria-label={`${t("chart.selectedStudent")}: ${formatNumber(selected.finalWeighted)}%`}
          >
            {formatNumber(selected.finalWeighted)}%
          </button>
        </TooltipTrigger>
        <TooltipContent className="quartile-tooltip">
          <strong>{t("chart.selectedStudent")}: {formatNumber(selected.finalWeighted)}%</strong>
          <span>{t("chart.selectedStudentHelp")}</span>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function QuartileMarker({ value, label, help }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="quartile-marker"
          type="button"
          style={{ left: `${clamp(value, 0, 100)}%` }}
          aria-label={`${label}: ${formatNumber(value)}%`}
        />
      </TooltipTrigger>
      <TooltipContent className="quartile-tooltip">
        <strong>{label}: {formatNumber(value)}%</strong>
        <span>{help}</span>
      </TooltipContent>
    </Tooltip>
  );
}

function MiniHistogram({ students, selected, anonymised, onBinClick }) {
  return (
    <div aria-label={t("chart.classDistribution")}>
      <Histogram students={students} selected={selected} compact anonymised={anonymised} onBinClick={onBinClick} />
    </div>
  );
}

function Histogram({ students, selected, compact = false, anonymised = false, onBinClick }) {
  const bins = [
    [0, 49.999, t("band.low")],
    [50, 59.999, "50-59"],
    [60, 69.999, "60-69"],
    [70, 79.999, "70-79"],
    [80, 89.999, "80-89"],
    [90, 100, "90+"],
  ];
  const binStudents = bins.map(([min, max]) => students.filter((student) => (
    Number.isFinite(student.finalWeighted) && student.finalWeighted >= min && student.finalWeighted <= max
  )));
  const counts = binStudents.map((items) => items.length);
  const max = Math.max(1, ...counts);
  const width = 560;
  const height = compact ? 134 : 230;
  const left = 42;
  const bottom = compact ? 106 : 188;
  const barWidth = 64;
  const gap = 20;
  const bars = bins.map((bin, index) => {
    const x = left + 16 + index * (barWidth + gap);
    const barHeight = (counts[index] / max) * (compact ? 62 : 140);
    const y = bottom - barHeight;
    const band = thresholdBand((bin[0] + Math.min(bin[1], 100)) / 2);
    const studentsInBin = binStudents[index];
    return { bin, index, x, y, barHeight, band, studentsInBin };
  });
  const selectedBar = selected ? bars.find((bar) => bar.studentsInBin.some((student) => student.id === selected.id)) : null;
  const selectedMarker = selectedBar ? {
    x: selectedBar.x + barWidth / 2,
    y: Math.max(42, selectedBar.y - 24),
  } : null;

  return (
    <svg className={cn("chart-svg", compact && "compact-chart")} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("chart.histogramAria")}>
      <line x1={left} y1="18" x2={left} y2={bottom} stroke="var(--chart-axis)" />
      <line x1={left} y1={bottom} x2="535" y2={bottom} stroke="var(--chart-axis)" />
      {bars.map(({ bin, index, x, y, barHeight, band, studentsInBin }) => {
        const isInteractive = Boolean(onBinClick && studentsInBin.length);
        const openBin = () => {
          if (isInteractive) {
            onBinClick({ label: bin[2], students: studentsInBin, anonymised });
          }
        };
        return (
          <g
            key={bin[2]}
            className={cn(isInteractive && "histogram-bin")}
            role={isInteractive ? "button" : "presentation"}
            tabIndex={isInteractive ? 0 : undefined}
            aria-label={isInteractive ? `${bin[2]}: ${studentsInBin.length} ${t("detected.students").toLowerCase()}` : undefined}
            onClick={openBin}
            onKeyDown={(event) => {
              if (!isInteractive) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openBin();
              }
            }}
          >
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="6" fill={bandColor(band.id)} />
            <text x={x + barWidth / 2} y={Math.max(14, y - 8)} textAnchor="middle">{counts[index]}</text>
            <text className="histogram-bin-tooltip chart-svg-tooltip" x={x + barWidth / 2} y={Math.max(14, y - 24)} textAnchor="middle">
              {histogramTooltipLabel(bin[2], studentsInBin, anonymised)}
            </text>
            <text x={x + barWidth / 2} y={bottom + 22} textAnchor="middle">{bin[2]}</text>
          </g>
        );
      })}
      {selectedMarker ? (
        <g className="histogram-selected-marker" transform={`translate(${selectedMarker.x}, ${selectedMarker.y})`}>
          <g className="histogram-selected-arrow">
            <path d="M 0 18 L -9 4 L -3 4 L -3 -8 L 3 -8 L 3 4 L 9 4 Z" />
            <text className="histogram-selected-label chart-svg-tooltip" x="0" y="-12" textAnchor="middle">{formatGrade(selected.finalWeighted)}</text>
          </g>
        </g>
      ) : null}
    </svg>
  );
}

function StudentTourOverlay({ c, activeTour, onChange, onClose, onComplete }) {
  const [rect, setRect] = useState(null);
  const step = activeTour ? CARD_TOUR_STEPS[activeTour.step] : null;

  useLayoutEffect(() => {
    if (!activeTour || !step) {
      setRect(null);
      return undefined;
    }
    let frame = 0;
    const update = () => {
      const target = document.querySelector(`[data-student-id="${CSS.escape(activeTour.studentId)}"] [data-tour-part="${CSS.escape(step.part)}"]`);
      if (!target) {
        setRect(null);
        return;
      }
      const box = target.getBoundingClientRect();
      const offscreen = box.top < 84 || box.bottom > window.innerHeight - 84;
      if (offscreen) {
        target.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "center",
        });
        frame = window.requestAnimationFrame(update);
        return;
      }
      const updatedBox = target.getBoundingClientRect();
      setRect({
        top: updatedBox.top,
        left: updatedBox.left,
        width: updatedBox.width,
        height: updatedBox.height,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [activeTour, step]);

  if (!activeTour || !step || !rect) return null;

  const isLast = activeTour.step >= CARD_TOUR_STEPS.length - 1;
  const panelLeft = Math.min(window.innerWidth - 340, Math.max(18, rect.left));
  const panelTop = rect.top + rect.height + 18 < window.innerHeight - 170
    ? rect.top + rect.height + 18
    : Math.max(18, rect.top - 170);
  const focusCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  const panelCenter = {
    x: panelLeft + 160,
    y: panelTop + 78,
  };

  return (
    <div className="tour-layer" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <button className="tour-scrim" type="button" aria-label={c("closeTour")} onClick={onClose} />
      <div
        className="tour-focus-box"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />
      <svg className="tour-connector" aria-hidden="true">
        <line x1={focusCenter.x} y1={focusCenter.y} x2={panelCenter.x} y2={panelCenter.y} />
      </svg>
      <div className="tour-panel" style={{ top: panelTop, left: panelLeft }}>
        <div className="tour-panel-body" key={step.part}>
          <div className="tour-panel-meta">
            <p className="eyebrow">{t("tour.title", { student: "" }).replace(":", "").trim()}</p>
            <span>{t("tour.stepProgress", { current: activeTour.step + 1, total: CARD_TOUR_STEPS.length })}</span>
          </div>
          <h3 id="tour-title">{t(step.titleKey)}</h3>
          <p>{t(step.bodyKey)}</p>
        </div>
        <div className="tour-actions">
          <Button variant="ghost" type="button" onClick={onClose}>{c("closeTour")}</Button>
          <Button
            variant="outline"
            type="button"
            disabled={activeTour.step === 0}
            onClick={() => onChange({ ...activeTour, step: Math.max(0, activeTour.step - 1) })}
          >
            {c("previous")}
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (isLast) onComplete?.();
              else onChange({ ...activeTour, step: activeTour.step + 1 });
            }}
          >
            {isLast ? c("finish") : c("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EvaluationDialog({ c, data, onOpenChange }) {
  const point = data?.point;
  const assignment = point?.assignment;
  const score = point?.score;
  return (
    <Dialog open={Boolean(data)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{c("chartModalTitle")}</DialogTitle>
          <DialogDescription>{c("chartModalDescription")}</DialogDescription>
        </DialogHeader>
        {point ? (
          <div className="evaluation-detail">
            <StatCard label={t("chart.evaluation")} value={point.label} compact />
            <StatCard label={t("chart.score")} value={Number.isFinite(point.value) ? `${formatNumber(point.value)}%` : c("noScore")} compact />
            <StatCard
              label={t("student.earned")}
              value={Number.isFinite(point.earned) && Number.isFinite(point.maxPoints) ? `${formatNumber(point.earned)} / ${formatNumber(point.maxPoints)}` : c("noScore")}
              compact
            />
            <StatCard label={t("mapping.category")} value={assignment?.category || point.category || ""} compact />
            <StatCard label={t("mapping.max")} value={assignment?.maxPoints ?? score?.maxPoints ?? point.maxPoints ?? ""} compact />
            {point.usage === "displayOnly" ? (
              <p className="context-evaluation-note">
                <FileJson size={16} aria-hidden="true" />
                {t("usage.displayOnlyHelp")}
              </p>
            ) : null}
            <p className="muted">{point.title || assignment?.title || ""}</p>
            <p className="muted">{assignment?.sheetName || point.sheetName || ""} {assignment?.date || point.date || ""}</p>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistogramDialog({ data, anonymised, onOpenChange }) {
  const students = data?.students || [];
  const useAnonymousNames = data?.anonymised ?? anonymised;
  const isEnglish = getLanguage() === "en";
  const title = isEnglish
    ? `Students in score band ${data?.label || ""}`.trim()
    : `Leerlingen in scoreband ${data?.label || ""}`.trim();
  const description = isEnglish
    ? `${students.length} student${students.length === 1 ? "" : "s"} in this bar.`
    : `${students.length} leerling${students.length === 1 ? "" : "en"} in deze staaf.`;

  return (
    <Dialog open={Boolean(data)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="histogram-student-list">
          {students.map((student, index) => (
            <div className="histogram-student-row" key={student.id}>
              <div>
                <strong>{useAnonymousNames ? t("student.anonymous", { number: String(index + 1).padStart(2, "0") }) : student.name}</strong>
                <span>{student.classCode}</span>
              </div>
              <Badge variant="secondary">{formatGrade(student.finalWeighted)}</Badge>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState() {
  return (
    <Card className="empty-state">
      <CardHeader>
        <CardTitle>{t("empty.title")}</CardTitle>
        <CardDescription>{t("empty.body")}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <p>{t("app.footer")}</p>
    </footer>
  );
}

function createInitialConfig(model, preferences = {}) {
  const base = buildDefaultConfig(model);
  const subjectKey = preferenceSubjectKey(base.subject || model.subjects?.[0]?.value || "subject");
  const preferredPreset = preferences.lastBasketPresetBySubject?.[subjectKey];
  const basketPreset = BASKET_PRESETS[preferredPreset] ? preferredPreset : suggestBasketPreset(model);
  const preset = BASKET_PRESETS[basketPreset] || BASKET_PRESETS[DEFAULT_BASKET_PRESET];
  return {
    ...base,
    basketPreset,
    categories: categoriesFromPreset(preset),
    assignments: Object.fromEntries(model.assignments.map((assignment, index) => [
      assignment.id,
      {
        ...(base.assignments?.[assignment.id] || {}),
        active: true,
        required: true,
        usage: "include",
        category: inferBasketCategory(assignment, index, model.assignments, preset.order),
        maxPoints: assignment.maxPoints,
      },
    ])),
  };
}

function preferenceSubjectKey(value) {
  return String(value || "subject").trim().toLowerCase() || "subject";
}

function preferredClassCode(model, preferences = {}) {
  const preferred = preferences.lastClassCode;
  if (!preferred || preferred === "all") return "all";
  const classes = new Set((model.classes || []).map((entry) => entry.value));
  return classes.has(preferred) ? preferred : "all";
}

function assignmentUsage(override = {}) {
  if (ASSIGNMENT_USAGE_OPTIONS.includes(override.usage)) return override.usage;
  return override.active === false ? "exclude" : "include";
}

function assignmentUsagePatch(usage, override = {}) {
  const nextUsage = ASSIGNMENT_USAGE_OPTIONS.includes(usage) ? usage : "include";
  return {
    ...override,
    usage: nextUsage,
    active: nextUsage !== "exclude",
    required: nextUsage === "include",
  };
}

function assignmentUsageCounts(assignments = [], config = {}) {
  return assignments.reduce((counts, assignment) => {
    const usage = assignmentUsage(config.assignments?.[assignment.id] || {});
    counts[usage] += 1;
    return counts;
  }, { include: 0, displayOnly: 0, exclude: 0 });
}

function reviewSuggestionItems(assignments = []) {
  return assignments
    .map((assignment) => {
      const text = `${assignment.title || ""} ${assignment.sheetName || ""}`.toLowerCase();
      if (/(diagnost|diagnos|oefen|formatief|proef)/i.test(text)) {
        return { assignment, reasonKey: "review.reasonDiagnostic" };
      }
      if (/(inhaal|herkansing|herkans|redo|retake|bis|tweede kans|2e kans|2de kans)/i.test(text)) {
        return { assignment, reasonKey: "review.reasonRetake" };
      }
      if (!Number.isFinite(Number(assignment.maxPoints)) || Number(assignment.maxPoints) <= 0) {
        return { assignment, reasonKey: "review.reasonNoMax" };
      }
      return null;
    })
    .filter(Boolean)
    .slice(0, 6);
}

function basketCategoriesFromConfig(config) {
  if (config.basketPreset === "custom" && config.categories?.length) {
    return config.categories.map((category) => ({
      name: category.name,
      weight: Number(category.weight) || 0,
    }));
  }
  const preset = BASKET_PRESETS[config.basketPreset] || BASKET_PRESETS[DEFAULT_BASKET_PRESET];
  const orderedNames = uniqueKeepOrder([
    ...(preset.order || []),
    ...(config.categories || []).map((category) => category.name),
  ]);
  const weights = new Map(orderedNames.map((name) => [name, Number(preset.weights?.[name]) || 0]));
  for (const category of config.categories || []) {
    if (weights.has(category.name)) weights.set(category.name, Number(category.weight) || 0);
    else weights.set(category.name, Number(category.weight) || 0);
  }
  return Array.from(weights.entries()).map(([name, weight]) => ({ name, weight }));
}

function normaliseBasketPercentages(categories) {
  const total = categories.reduce((sum, category) => sum + (Number(category.weight) || 0), 0) || 1;
  return new Map(categories.map((category) => [category.name, `${Math.round(((Number(category.weight) || 0) / total) * 1000) / 10}%`]));
}

function categoriesFromPreset(preset) {
  return (preset.order || Object.keys(preset.weights || {})).map((name) => ({
    name,
    weight: Number(preset.weights?.[name]) || 0,
  }));
}

function presetLabel(preset) {
  return preset.labelKey ? t(preset.labelKey) : preset.label;
}

function basketTransferHints(categories = []) {
  const names = new Set(categories.map((category) => String(category.name || "").toUpperCase()));
  return categories
    .map((category) => String(category.name || "").toUpperCase().match(/^DW(\d+)$/)?.[1])
    .filter(Boolean)
    .filter((segment, index, all) => all.indexOf(segment) === index)
    .filter((segment) => names.has(`EX${segment}`))
    .map((segment) => ({ dw: `DW${segment}`, ex: `EX${segment}` }));
}

function suggestBasketPreset(model) {
  const text = [
    model.fileName,
    ...(model.subjects || []).map((subject) => subject.value),
    ...(model.classes || []).map((classInfo) => classInfo.value),
  ].join(" ").toLowerCase();
  if (/(wiskunde|math|mathematics)/i.test(text) && /(1ste|eerste|year\s*1|\b1\b)/i.test(text)) return "grade1_math";
  if (/(informatic|iw|informatica)/i.test(text)) return "grade2_iw";
  return "dwex";
}

function inferBasketCategory(assignment, index, assignments, basketOrder = BASKET_PRESETS[DEFAULT_BASKET_PRESET].order) {
  const assignmentText = `${assignment.title || ""} ${assignment.date || ""}`.toLowerCase();
  const broadText = `${assignment.sheetName || ""} ${assignment.title || ""} ${assignment.date || ""}`.toLowerCase();
  const category = String(assignment.category || "").toUpperCase();
  const sameType = assignments.filter((item) => String(item.category || "").toUpperCase() === category);
  const typeIndex = sameType.findIndex((item) => item.id === assignment.id);
  const matchingBaskets = basketOrder.filter((name) => {
    const upper = name.toUpperCase();
    return upper.startsWith(category) && upper !== "EXPAR";
  });
  const basketFromText = inferBasketFromText(assignmentText, category, basketOrder, broadText, assignment.date);

  if (basketFromText) return basketFromText;
  if (matchingBaskets.length) {
    const safeTypeIndex = Math.max(0, typeIndex);
    const bucketIndex = Math.min(
      matchingBaskets.length - 1,
      Math.floor((safeTypeIndex / Math.max(1, sameType.length)) * matchingBaskets.length),
    );
    return matchingBaskets[bucketIndex];
  }
  return category || basketOrder[Math.min(index, basketOrder.length - 1)] || "OTHER";
}

function inferBasketFromText(text, category, basketOrder, broadText = text, dateText = "") {
  const period = detectPeriod(text);
  const hasSpringExamText = /(parex|expar|paas|easter|partial|partieel)/.test(broadText);

  if (category === "EX") {
    const parsedDate = parseDateFromText(dateText) || parseDateFromText(broadText) || parseDateFromText(text);
    const month = parsedDate?.month;

    if (isWinterExamMonth(month) && basketOrder.includes("EX1")) return "EX1";
    if (isSpringExamMonth(month)) return springExamBasket(basketOrder, hasSpringExamText);
    if (isFinalExamMonth(month)) return finalExamBasket(basketOrder);

    if (/(kerst|christmas|sem\s*1|semester\s*1)/.test(broadText) && basketOrder.includes("EX1")) return "EX1";
    if (hasSpringExamText) return springExamBasket(basketOrder, true);
    if (/(juni|june|eind|final)/.test(broadText)) return finalExamBasket(basketOrder);

    if (period === 1 && basketOrder.includes("EX1")) return "EX1";
    if (period === 2) return springExamBasket(basketOrder, false);
    if (period === 3) return finalExamBasket(basketOrder);

    return null;
  }

  if (hasSpringExamText && basketOrder.includes("EXPAR")) return "EXPAR";
  if (period && basketOrder.includes(`${category}${period}`)) return `${category}${period}`;
  return null;
}

function parseDateFromText(value) {
  const direct = parseSchoolDate(value);
  if (direct) return direct;

  const text = String(value || "");
  const iso = text.match(/\b\d{4}-\d{1,2}-\d{1,2}\b/);
  if (iso) return parseSchoolDate(iso[0]);

  const separated = text.match(/\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/);
  if (separated) return parseSchoolDate(separated[0]);

  return parseNamedSchoolDate(text);
}

function isWinterExamMonth(month) {
  return month === 11 || month === 0 || month === 1;
}

function isSpringExamMonth(month) {
  return month === 2 || month === 3;
}

function isFinalExamMonth(month) {
  return month === 4 || month === 5;
}

function springExamBasket(basketOrder, preferPartial = false) {
  if (preferPartial && basketOrder.includes("EXPAR")) return "EXPAR";
  if (basketOrder.includes("EX2")) return "EX2";
  if (basketOrder.includes("EXPAR")) return "EXPAR";
  return null;
}

function finalExamBasket(basketOrder) {
  if (basketOrder.includes("EX3")) return "EX3";
  if (basketOrder.includes("EX2")) return "EX2";
  return null;
}

function detectPeriod(text) {
  if (/(trimester|trim|tri|periode|period|sem|semester)\s*1|\b(dw|ex)\s*1\b|\b1\b/.test(text)) return 1;
  if (/(trimester|trim|tri|periode|period|sem|semester)\s*2|\b(dw|ex)\s*2\b|\b2\b/.test(text)) return 2;
  if (/(trimester|trim|tri|periode|period|sem|semester)\s*3|\b(dw|ex)\s*3\b|\b3\b/.test(text)) return 3;
  return null;
}

function uniqueKeepOrder(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
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

function filterStudents(students, filters) {
  return students.filter((student) => {
    if (filters.classCode && filters.classCode !== "all" && student.classCode !== filters.classCode) return false;
    if (filters.band && filters.band !== "all" && student.thresholdBand.id !== filters.band) return false;
    if (filters.flag && filters.flag !== "all" && !student.flags.some((flag) => flag.type === filters.flag)) return false;
    return true;
  });
}

function sortStudents(students, filters = {}) {
  const key = filters.sortKey || "name";
  const direction = filters.sortDirection === "desc" ? -1 : 1;
  return [...students].sort((a, b) => {
    let av;
    let bv;
    if (key === "name") {
      av = a.name;
      bv = b.name;
      return av.localeCompare(bv, undefined, { numeric: true }) * direction;
    }
    if (key === "class") {
      av = a.classCode;
      bv = b.classCode;
      return av.localeCompare(bv, undefined, { numeric: true }) * direction;
    }
    if (key === "coverage") {
      av = a.evidenceCoverage;
      bv = b.evidenceCoverage;
    } else if (key === "flags") {
      av = a.flags.length;
      bv = b.flags.length;
    } else {
      av = Number.isFinite(a.finalWeighted) ? a.finalWeighted : -Infinity;
      bv = Number.isFinite(b.finalWeighted) ? b.finalWeighted : -Infinity;
    }
    return ((av ?? 0) - (bv ?? 0)) * direction;
  });
}

function renderTrendExplanation(trend) {
  if (!trend || trend.direction === "unknown") return t("trendExplain.insufficient");
  const direction = ["declining", "improving", "stable"].includes(trend.direction) ? trend.direction : "stable";
  const points = Number.isFinite(trend.delta) ? formatNumber(Math.abs(trend.delta)) : "0";
  const volatility = Number.isFinite(trend.volatility) ? formatNumber(trend.volatility) : t("option.notAvailable");
  const volatilityMeaning = volatilityMeaningKey(trend.volatility);
  return t(`trendExplain.${direction}`, {
    points,
    volatility,
    volatilityMeaning: t(`trendExplain.${volatilityMeaning}`),
  });
}

function renderVolatilityExplanation(trend) {
  const isEnglish = getLanguage() === "en";
  if (!Number.isFinite(trend?.volatility)) {
    return isEnglish
      ? "Volatility cannot be explained reliably yet because there are too few usable assessment scores."
      : "Volatiliteit kan nog niet betrouwbaar uitgelegd worden omdat er te weinig bruikbare evaluaties zijn.";
  }
  const volatility = formatNumber(trend.volatility);
  if (trend.volatility < 8) {
    return isEnglish
      ? `Volatility is ${volatility}: the assessment scores stay close together, so the student's performance looks fairly predictable.`
      : `Volatiliteit is ${volatility}: de evaluatiepunten liggen dicht bij elkaar, dus de prestaties lijken vrij voorspelbaar.`;
  }
  if (trend.volatility < 16) {
    return isEnglish
      ? `Volatility is ${volatility}: the scores move noticeably. Check whether one assessment, topic, absence, or preparation moment explains the difference.`
      : `Volatiliteit is ${volatility}: de punten schommelen merkbaar. Kijk of een bepaalde toets, leerstof, afwezigheid of voorbereiding het verschil verklaart.`;
  }
  return isEnglish
    ? `Volatility is ${volatility}: the scores jump strongly between assessments. Use this as a conversation starter about planning, test format, stress, absence, or gaps in prerequisite knowledge.`
    : `Volatiliteit is ${volatility}: de punten springen sterk tussen evaluaties. Gebruik dit als gespreksstarter over planning, toetsvorm, stress, afwezigheid of gaten in voorkennis.`;
}

function volatilityMeaningKey(value) {
  if (!Number.isFinite(value)) return "volatilityUnknown";
  if (value < 8) return "volatilityLow";
  if (value < 16) return "volatilityMedium";
  return "volatilityHigh";
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

function formatGrade(value) {
  return Number.isFinite(value) ? `${formatNumber(value)}%` : t("option.notAvailable");
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${formatNumber(value * 100)}%` : t("option.notAvailable");
}

function evidenceParticipationContext(peers = []) {
  const pointCoverages = peers
    .map((student) => student.evidence?.pointsCoverage)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const classMedianPointsCoverage = pointCoverages.length ? quantile(pointCoverages, 0.5) : LOW_EVIDENCE_POINTS_COVERAGE;
  const concernThreshold = Math.max(
    0,
    Math.min(LOW_EVIDENCE_POINTS_COVERAGE, classMedianPointsCoverage - LOW_EVIDENCE_CLASS_GAP),
  );
  return {
    classMedianPointsCoverage,
    concernThreshold,
  };
}

function formatAvailablePoints(row) {
  const expected = Number.isFinite(row.expectedPossible) ? row.expectedPossible : row.pointsPossible;
  const available = Number.isFinite(row.availablePossible) ? row.availablePossible : row.pointsPossible;
  if (expected && available !== expected) return `${formatNumber(available)} / ${formatNumber(expected)}`;
  return formatNumber(row.pointsPossible);
}

function formatNumber(value, fallback = t("option.notAvailable")) {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function isExamPoint(point) {
  const text = `${point?.category || ""} ${point?.label || ""} ${point?.title || ""} ${point?.sheetName || ""}`.toUpperCase();
  return /\bEX(?:PAR|\d*)\b/.test(text) || /\bEXAM(?:EN)?\b/.test(text);
}

function shortLabel(value, maxLength = 24) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
}

function histogramTooltipLabel(label, studentsInBin = [], anonymised = false) {
  if (!studentsInBin.length) return `${label}: 0`;
  const names = studentsInBin.slice(0, 2).map((student, index) => (
    anonymised ? t("student.anonymous", { number: String(index + 1).padStart(2, "0") }) : student.name
  ));
  const rest = studentsInBin.length > names.length ? ` +${studentsInBin.length - names.length}` : "";
  const text = `${label}: ${names.join(", ")}${rest}`;
  return text.length <= 44 ? text : `${text.slice(0, 41).trim()}...`;
}

function chartPointLabelPosition(x, y, bounds) {
  let labelX = 0;
  let anchor = "middle";
  if (x < 108) {
    labelX = 14;
    anchor = "start";
  } else if (x > bounds.width - 108) {
    labelX = -14;
    anchor = "end";
  }

  const labelY = y < bounds.top + 26 ? 22 : -13;
  return {
    x: labelX,
    y: labelY,
    anchor,
  };
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function positionTrendPoints(points) {
  return points.map((point, index) => ({
    point,
    x: trendPointX(point, index, points.length),
  }));
}

function trendPointX(point, index, total) {
  const parsed = parseSchoolDate(point?.date);
  const slot = parsed ? schoolMonthSlot(parsed.month) : null;
  if (slot != null) {
    const days = daysInMonth(parsed.year, parsed.month);
    const dayFraction = days ? clamp(((parsed.day || 15) - 1) / days, 0.08, 0.92) : 0.5;
    return slot + dayFraction;
  }
  if (total < 2) return SCHOOL_YEAR_DOMAIN_END / 2;
  return 0.5 + (index / (total - 1)) * (SCHOOL_YEAR_DOMAIN_END - 1);
}

function parseSchoolDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { year: value.getFullYear(), month: value.getMonth(), day: value.getDate() };
  }

  const text = String(value || "").trim();
  if (!text) return null;

  const numeric = Number(text);
  if (Number.isFinite(numeric)) {
    return parseExcelSerialDate(numeric);
  }

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return {
      year: Number(iso[1]),
      month: Number(iso[2]) - 1,
      day: Number(iso[3]),
    };
  }

  const separated = text.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
  if (separated) {
    const first = Number(separated[1]);
    const second = Number(separated[2]);
    const year = normaliseYear(separated[3]);
    const monthFirst = first <= 12 && second > 12;
    return {
      year,
      month: (monthFirst ? first : second) - 1,
      day: monthFirst ? second : first,
    };
  }

  const named = parseNamedSchoolDate(text);
  if (named) return named;

  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
  }

  return null;
}

function parseExcelSerialDate(serial) {
  if (serial < 20000 || serial > 80000) return null;
  const millis = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

function parseNamedSchoolDate(value) {
  const monthNames = {
    sep: 8,
    sept: 8,
    september: 8,
    okt: 9,
    oktober: 9,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
    jan: 0,
    januari: 0,
    january: 0,
    feb: 1,
    februari: 1,
    february: 1,
    mrt: 2,
    maart: 2,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    mei: 4,
    may: 4,
    jun: 5,
    juni: 5,
    june: 5,
  };
  const normalised = value.toLowerCase().replace(/[.,]/g, " ");
  const dayMatch = normalised.match(/\b(\d{1,2})\b/);
  for (const [name, month] of Object.entries(monthNames)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(normalised)) {
      return {
        year: null,
        month,
        day: dayMatch ? Number(dayMatch[1]) : 15,
      };
    }
  }
  return null;
}

function normaliseYear(value) {
  if (!value) return null;
  const year = Number(value);
  if (!Number.isFinite(year)) return null;
  return year < 100 ? 2000 + year : year;
}

function schoolMonthSlot(month) {
  if (month >= 8 && month <= 11) return month - 8;
  if (month >= 0 && month <= 5) return month + 4;
  return null;
}

function daysInMonth(year, month) {
  const safeYear = Number.isFinite(year) ? year : 2025;
  return new Date(safeYear, month + 1, 0).getDate();
}

function linearTrendLineForPoints(positionedPoints) {
  const clean = positionedPoints
    .map(({ point, x }) => ({ x: Number(x), value: Number(point?.value) }))
    .filter((entry) => Number.isFinite(entry.x) && Number.isFinite(entry.value));
  if (clean.length < 2) return null;
  const meanX = clean.reduce((sum, entry) => sum + entry.x, 0) / clean.length;
  const meanY = clean.reduce((sum, entry) => sum + entry.value, 0) / clean.length;
  let numerator = 0;
  let denominator = 0;
  clean.forEach((entry) => {
    numerator += (entry.x - meanX) * (entry.value - meanY);
    denominator += (entry.x - meanX) ** 2;
  });
  if (!denominator) return null;
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  const startX = Math.min(...clean.map((entry) => entry.x));
  const endX = Math.max(...clean.map((entry) => entry.x));
  return {
    startX,
    endX,
    start: clamp(intercept + slope * startX, 0, 100),
    end: clamp(intercept + slope * endX, 0, 100),
  };
}
