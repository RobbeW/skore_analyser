import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
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
import {
  applyPreset,
  loadNotes,
  loadPreferences,
  loadPresets,
  saveNote,
  savePreferences,
  savePreset,
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
    parsed: "Bestand herkend. Controleer de mandjes en maak daarna kaarten.",
    basketNormalised: "Telt mee als",
    advancedAssignment: "Geavanceerde evaluatiekoppeling",
    visibleAdvice: "Interessante elementen",
    allGood: "Geen extra signalen voor deze selectie.",
    clickEvaluation: "Klik op een punt voor evaluatiedetails.",
    chartModalTitle: "Evaluatiemoment",
    chartModalDescription: "Deze score is een deel van de jaarlijn van de leerling.",
    noScore: "Geen score",
    autosaved: "Opgeslagen",
    stepFlow: "Stap {step} van 3",
    uploadFlow: "Upload",
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
    parsed: "File detected. Check the baskets, then create cards.",
    basketNormalised: "Counts as",
    advancedAssignment: "Advanced assessment mapping",
    visibleAdvice: "Interesting signals",
    allGood: "No extra signals for this selection.",
    clickEvaluation: "Click a point for assessment details.",
    chartModalTitle: "Assessment moment",
    chartModalDescription: "This score is part of the student's year line.",
    noScore: "No score",
    autosaved: "Saved",
    stepFlow: "Step {step} of 3",
    uploadFlow: "Upload",
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
  const fileInputRef = useRef(null);

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

  async function loadWorkbook(source, fileName) {
    setIsBusy(true);
    setStatus({ kind: "busy", text: c("processing") });
    try {
      const workbook = await readXlsxWorkbook(source, { fileName });
      const parsedModel = parseSkoreWorkbook(workbook);
      const nextConfig = createInitialConfig(parsedModel);
      const nextWorkspaceKey = `${parsedModel.fileName}::${nextConfig.subject || "subject"}`.toLowerCase();
      setModel(parsedModel);
      setConfig(nextConfig);
      setAnalysis(null);
      setFilters(normaliseFilters({}, nextConfig.threshold));
      setNotes(loadNotes(nextWorkspaceKey));
      setStatus({ kind: "success", text: c("parsed") });
      setWorkflowStep("map");
    } catch (error) {
      console.error(error);
      setStatus({ kind: "error", text: `${t("status.parseError")} ${error?.message || ""}`.trim() });
    } finally {
      setIsBusy(false);
    }
  }

  function generateCards() {
    if (!model || !config) return;
    setIsBusy(true);
    setStatus({ kind: "busy", text: t("mapping.generating") });
    window.setTimeout(() => {
      const nextAnalysis = calculateAnalysis(model, config);
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
    }, 240);
  }

  function resetData() {
    if (!window.confirm(c("resetConfirm"))) return;
    setModel(null);
    setConfig(null);
    setAnalysis(null);
    setNotes({});
    setFilters(defaultFilters());
    setActiveTour(null);
    setEvaluationDialog(null);
    setHistogramDialog(null);
    setStatus({ kind: "idle", text: t("status.reset") });
    setWorkflowStep("upload");
  }

  function updateConfig(patch) {
    setConfig((current) => ({ ...current, ...patch }));
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
  }

  function updateBasketWeight(name, weight) {
    setConfig((current) => ({
      ...current,
      basketPreset: "custom",
      categories: basketCategoriesFromConfig(current).map((category) => (
        category.name === name ? { ...category, weight } : category
      )),
    }));
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
  }

  function updateFilters(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function updateNote(studentId, value) {
    setNotes(saveNote(workspaceKey, studentId, value));
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

  const shellClass = cn("app-shell", workflowStep === "upload" && "app-shell--splash", printStudentId && "is-printing-single");

  return (
    <TooltipProvider delayDuration={180}>
      <div className={shellClass}>
        {workflowStep !== "upload" ? (
          <AppHeader
            preferences={preferences}
            onAnonymiseChange={(value) => persistPreferences({ anonymised: value })}
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
              onLoadWorkbook={loadWorkbook}
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

          {workflowStep === "dashboard" && analysis ? (
            <DashboardScreen
              c={c}
              analysis={analysis}
              filters={filters}
              filteredStudents={filteredStudents}
              anonymised={Boolean(preferences.anonymised)}
              notes={notes}
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
          onClose={() => setActiveTour(null)}
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

function AppHeader({ preferences, onAnonymiseChange, onReset }) {
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
            <div className="autosave-indicator" role="status" aria-label={t("autosave.ready")}>
              <Save size={18} aria-hidden="true" />
            </div>
          </TooltipTrigger>
          <TooltipContent>{t("autosave.ready")}</TooltipContent>
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
  onLoadWorkbook,
}) {
  function handleFileSelection(event) {
    const [file] = event.target.files || [];
    if (file) onLoadWorkbook(file, file.name);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const [file] = event.dataTransfer.files || [];
    if (file) onLoadWorkbook(file, file.name);
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

        <Card className="upload-card">
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
              <input ref={fileInputRef} className="sr-only" type="file" accept=".xlsx,.xls" onChange={handleFileSelection} />
              <span className="drop-zone-icon" aria-hidden="true">
                {isBusy ? <Spinner /> : <UploadCloud size={30} />}
              </span>
              <span className="drop-zone-title">{t("upload.dropTitle")}</span>
              <span className="drop-zone-help">{t("upload.help")}</span>
            </button>

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

  return (
    <section className="workflow-screen map-screen">
      <FlowIndicator active="map" c={c} />
      <div className="screen-heading">
        <div>
          <p className="eyebrow">{t("step.2")}</p>
          <h2>{t("mapping.title")}</h2>
        </div>
        <Button type="button" disabled={isBusy} onClick={onGenerate}>
          {isBusy ? <Spinner /> : <Sparkles size={16} aria-hidden="true" />}
          {isBusy ? t("mapping.generating") : t("mapping.generate")}
        </Button>
      </div>

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

function DashboardScreen({
  c,
  analysis,
  filters,
  filteredStudents,
  anonymised,
  notes,
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
            <p className="eyebrow">{t("step.3")}</p>
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
          <StatCard label={t("dashboard.median")} value={`${formatNumber(stats.median)}%`} />
          <StatCard label={t("dashboard.stddev")} value={formatNumber(stats.stddev)} />
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
        <h3>{t("student.cardsTitle")}</h3>
        <span>{filteredStudents.length} {t("detected.students").toLowerCase()}</span>
      </div>

      <div className="student-cards">
        {filteredStudents.length ? filteredStudents.map((student, index) => (
          <StudentCard
            key={student.id}
            student={student}
            peers={peerGroups.get(student.classCode) || filteredStudents}
            anonymised={anonymised}
            displayIndex={index}
            note={notes[student.id] || ""}
            onNoteChange={onNoteChange}
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

function FlowIndicator({ active, c }) {
  const steps = [
    ["upload", c("uploadFlow")],
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
          const category = override.category || inferBasketCategory(assignment, index, model.assignments, categoryOptions);
          const options = unique([...categoryOptions, category, assignment.category, "OTHER"]);
          return (
            <TableRow key={assignment.id}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={override.active !== false}
                  onChange={(event) => onAssignmentChange(assignment.id, { active: event.target.checked })}
                />
              </TableCell>
              <TableCell>
                <input
                  type="checkbox"
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
          <SortHeader field="flags" label={t("student.flagsShort")} filters={filters} onFiltersChange={onFiltersChange} align="right" />
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
            <TableCell>{anonymised ? t("student.anonymous", { number: String(index + 1).padStart(2, "0") }) : student.name}</TableCell>
            <TableCell>{student.classCode}</TableCell>
            <TableCell className="table-cell-numeric">{formatGrade(student.finalWeighted)}</TableCell>
            <TableCell className="table-cell-numeric student-table-coverage">{formatPercent(student.evidenceCoverage)}</TableCell>
            <TableCell className="table-cell-numeric">{student.flags.length}</TableCell>
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
  displayIndex,
  note,
  onNoteChange,
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

  return (
    <Card className={cn("student-card", isPrintTarget && "is-print-target")} id={`student-card-${student.id}`} data-student-id={student.id}>
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
        <div className="card-grid score-visual-grid">
          <section className="card-section" data-tour-part="table">
            <h4>{t("student.summary")}</h4>
            <ScoreTable rows={student.categoryRows} />
            <Accordion type="single" collapsible className="calculation-accordion">
              <AccordionItem value="calculation">
                <AccordionTrigger>{t("student.calculationTrace")}</AccordionTrigger>
                <AccordionContent>
                  <p>{t("student.evidenceBody", {
                    available: student.evidence.availableRequired,
                    expected: student.evidence.expectedRequired,
                    coverage: formatPercent(student.evidenceCoverage),
                  })}</p>
                  <p>{t("student.traceBody")}</p>
                  <p>{t("student.importedFinal")}: {student.importedFinal ? `${student.importedFinal.source} ${student.importedFinal.field} = ${formatNumber(student.importedFinal.value)}%` : t("student.noImportedFinal")}</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          <section className="card-section" data-tour-part="graph">
            <h4>{t("student.visualContext")}</h4>
            <YearTrend trend={student.trend} student={student} onEvaluationClick={onEvaluationClick} />
            <GraphInterpretation trend={student.trend} />
            <div className="peer-chart-grid">
              <div className="peer-chart-stack">
                <DotPlot students={peers} selected={student} anonymised={anonymised} />
                <QuartileStrip students={peers} selected={student} />
              </div>
              <MiniHistogram students={peers} selected={student} anonymised={anonymised} onBinClick={onHistogramClick} />
            </div>
          </section>
        </div>

        <div className="card-grid support-grid">
          <section className="card-section print-optional">
            <h4>{t("student.comments")}</h4>
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
          </section>

          <section className="card-section" data-tour-part="advice">
            <h4>{t("student.flags")}</h4>
            <PedagogicalSummary student={student} />
            {student.flags.length ? (
              <Accordion type="multiple" className="flag-accordion">
                {student.flags.map((flag, index) => (
                  <AccordionItem key={`${flag.type}-${index}`} value={`${flag.type}-${index}`}>
                    <AccordionTrigger>
                      <Badge variant={flag.tone === "danger" ? "destructive" : flag.tone === "warning" ? "warning" : "secondary"}>
                        {flag.label}
                      </Badge>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p>{flag.detail}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : null}
          </section>
        </div>

        <section className="card-section notes-section" data-tour-part="notes">
          <h4>{t("student.teacherJudgement")}</h4>
          <Textarea
            value={note}
            onChange={(event) => onNoteChange(student.id, event.target.value)}
            placeholder={t("student.teacherPlaceholder")}
          />
        </section>
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
            <TableCell>{formatPercent(row.effectiveWeight)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function GraphInterpretation({ trend }) {
  return (
    <div className="graph-interpretation-panel">
      <h4>{t("chart.interpretationTitle")}</h4>
      <dl>
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
  const height = 220;
  const left = 48;
  const top = 18;
  const bottom = 164;
  const axisWidth = width - left - 28;
  const axisHeight = bottom - top;
  const xFor = (index) => left + (points.length === 1 ? axisWidth / 2 : (index / (points.length - 1)) * axisWidth);
  const yFor = (value) => bottom - (clamp(value, 0, 100) / 100) * axisHeight;
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point.value)}`).join(" ");
  const trendLine = linearTrendLine(points.map((point) => point.value));
  const labels = dedupeAxisLabels(points);

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
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
        {trendLine ? (
          <line
            className="year-trend-direction"
            x1={xFor(0)}
            y1={yFor(trendLine.start)}
            x2={xFor(points.length - 1)}
            y2={yFor(trendLine.end)}
          />
        ) : null}
        {points.map((point, index) => (
          <g
            key={`${point.assignmentId || point.label}-${index}`}
            className={cn("trend-dot", isExamPoint(point) && "is-exam-point")}
            role="button"
            tabIndex={0}
            transform={`translate(${xFor(index)}, ${yFor(point.value)})`}
            onClick={() => onEvaluationClick?.({ student, point })}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onEvaluationClick?.({ student, point });
              }
            }}
            aria-label={`${t("chart.evaluation")}: ${point.label}, ${formatNumber(point.value)}%`}
          >
            <title>{`${point.label}: ${formatNumber(point.value)}%`}</title>
            <text className="trend-dot-label" x="0" y="-15" textAnchor="middle">{formatNumber(point.value)}%</text>
            <circle cx="0" cy="0" r="7" />
          </g>
        ))}
        {labels.map((label) => (
          <text key={label.index} className="axis-label" x={xFor(label.index)} y={bottom + 30} textAnchor="middle">{label.text}</text>
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
    <svg className="chart-svg compact-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("chart.dotPlot")}>
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
            <title>{`${label}: ${formatGrade(student.finalWeighted)}`}</title>
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
  const height = compact ? 155 : 230;
  const left = 42;
  const bottom = compact ? 122 : 188;
  const barWidth = 64;
  const gap = 20;
  const bars = bins.map((bin, index) => {
    const x = left + 16 + index * (barWidth + gap);
    const barHeight = (counts[index] / max) * (compact ? 78 : 140);
    const y = bottom - barHeight;
    const band = thresholdBand((bin[0] + Math.min(bin[1], 100)) / 2);
    const studentsInBin = binStudents[index];
    return { bin, index, x, y, barHeight, band, studentsInBin };
  });
  const selectedBar = selected ? bars.find((bar) => bar.studentsInBin.some((student) => student.id === selected.id)) : null;
  const selectedMarker = selectedBar ? {
    x: selectedBar.x + barWidth / 2,
    y: Math.max(20, selectedBar.y - 36),
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
            <text x={x + barWidth / 2} y={y - 8} textAnchor="middle">{counts[index]}</text>
            <text x={x + barWidth / 2} y={bottom + 22} textAnchor="middle">{bin[2]}</text>
          </g>
        );
      })}
      {selectedMarker ? (
        <g className="histogram-selected-marker" transform={`translate(${selectedMarker.x}, ${selectedMarker.y})`}>
          <g className="histogram-selected-arrow">
            <title>{t("chart.selectedStudent")}: {formatGrade(selected.finalWeighted)}</title>
            <path d="M 0 18 L -9 4 L -3 4 L -3 -8 L 3 -8 L 3 4 L 9 4 Z" />
          </g>
        </g>
      ) : null}
    </svg>
  );
}

function StudentTourOverlay({ c, activeTour, onChange, onClose }) {
  const [rect, setRect] = useState(null);
  const step = activeTour ? CARD_TOUR_STEPS[activeTour.step] : null;

  useLayoutEffect(() => {
    if (!activeTour || !step) {
      setRect(null);
      return undefined;
    }
    const update = () => {
      const target = document.querySelector(`[data-student-id="${CSS.escape(activeTour.studentId)}"] [data-tour-part="${CSS.escape(step.part)}"]`);
      if (!target) {
        setRect(null);
        return;
      }
      const box = target.getBoundingClientRect();
      setRect({
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
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
      <div className="tour-panel" style={{ top: panelTop, left: panelLeft }}>
        <p className="eyebrow">{t("tour.title", { student: "" }).replace(":", "").trim()}</p>
        <h3 id="tour-title">{t(step.titleKey)}</h3>
        <p>{t(step.bodyKey)}</p>
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
              if (isLast) onClose();
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

function createInitialConfig(model) {
  const base = buildDefaultConfig(model);
  const basketPreset = suggestBasketPreset(model);
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
        category: inferBasketCategory(assignment, index, model.assignments, preset.order),
        maxPoints: assignment.maxPoints,
      },
    ])),
  };
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
  const basketFromText = inferBasketFromText(assignmentText, category, basketOrder, broadText);

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

function inferBasketFromText(text, category, basketOrder, broadText = text) {
  if (/par|paas|partial|partieel/.test(broadText) && basketOrder.includes("EXPAR")) return "EXPAR";
  const period = detectPeriod(text);
  if (period && basketOrder.includes(`${category}${period}`)) return `${category}${period}`;
  if (category === "EX") {
    if (/(kerst|christmas|sem\s*1|semester\s*1)/.test(broadText) && basketOrder.includes("EX1")) return "EX1";
    if (/(paas|easter)/.test(broadText) && basketOrder.includes("EXPAR")) return "EXPAR";
    if (/(juni|eind|final|sem\s*2|semester\s*2)/.test(broadText)) {
      if (basketOrder.includes("EX3")) return "EX3";
      if (basketOrder.includes("EX2")) return "EX2";
    }
  }
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

function linearTrendLine(values) {
  const clean = values.map((value) => Number(value)).filter(Number.isFinite);
  if (clean.length < 2) return null;
  const n = clean.length;
  const meanX = (n - 1) / 2;
  const meanY = clean.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;
  clean.forEach((value, index) => {
    numerator += (index - meanX) * (value - meanY);
    denominator += (index - meanX) ** 2;
  });
  if (!denominator) return null;
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  return {
    start: clamp(intercept, 0, 100),
    end: clamp(intercept + slope * (n - 1), 0, 100),
  };
}

function dedupeAxisLabels(points) {
  if (!points.length) return [];
  const maxLabels = points.length > 12 ? 6 : points.length > 8 ? 7 : points.length;
  const indexes = new Set([0, points.length - 1]);
  if (maxLabels > 2) {
    const step = (points.length - 1) / (maxLabels - 1);
    for (let i = 1; i < maxLabels - 1; i += 1) {
      indexes.add(Math.round(i * step));
    }
  }
  const used = new Set();
  return points
    .map((point, index) => {
      const raw = point.period || point.category || point.label || "";
      const text = String(raw).replace(/\s+/g, " ").trim().slice(0, 12) || String(index + 1);
      return { index, text };
    })
    .filter((label) => indexes.has(label.index))
    .filter((label) => {
      if (used.has(label.text)) return false;
      used.add(label.text);
      return true;
    });
}
