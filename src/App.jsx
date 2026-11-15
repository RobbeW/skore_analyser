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
import { parseClassTeacherReportWorkbook } from "../js/class-teacher-parser.js";
import { aggregateClassTeacherReportGroups } from "../js/class-teacher-aggregator.js";
import { calculateClassTeacherAnalysis } from "../js/class-teacher-calculator.js";
import { periodSchemaForYear, trackById, trackOptionsForYear } from "../js/class-teacher-config.js";
import { calculateAnalysis, summariseStudents } from "../js/calculator.js";
import { THRESHOLD_BANDS, thresholdBand } from "../js/config.js";
import { getLanguage, setLanguage, t, translateTrend } from "../js/i18n.js";
import { buildProjectPayload, exportJsonPayload, exportProjectJson } from "../js/exporter.js";
import { hydrateProjectPayload } from "../js/project-importer.js";
import {
  appendSuggestionToNote,
  generateClassTeacherNoteSuggestion,
  generateSubjectTeacherNoteSuggestion,
} from "../js/note-guidance.js";
import {
  applyPreset,
  loadNotes,
  loadPreferences,
  loadPresets,
  saveNote,
  saveNotes,
  savePreferences,
  savePreset,
  clearWorkspaceNotes,
  purgeLegacyProjectDrafts,
  loadDecisions,
  saveDecision,
  saveDecisions,
} from "../js/storage.js";
import { EvaluationDialog, HistogramDialog, NoteSuggestionDialog, StudentTourOverlay } from "./components/dialogs.jsx";
import { Footer } from "./components/layout.jsx";
import { APP_MODES, BASKET_PRESETS, DEFAULT_OPEN_CARD_SECTIONS, FALLBACK_COPY, TOUR_REQUIRED_SECTIONS, cardTourStepsForMode, defaultFilters } from "./lib/app-constants.jsx";
import { basketCategoriesFromConfig, categoriesFromPreset, createInitialConfig, filterStudents, inferBasketCategory, normaliseFilters, preferenceSubjectKey, preferredClassCode, unique, withAnonymousNumbers } from "./lib/app-helpers.jsx";
import { buildClassTeacherProjectPayload, buildClassTeacherUploadSummary, calculateClassTeacherAnalysesFromReports, classTeacherBlockingIssues } from "./lib/class-teacher-helpers.jsx";
import { ClassTeacherDashboardScreen } from "./screens/ClassTeacherDashboardScreen.jsx";
import { ClassTeacherReviewScreen } from "./screens/ClassTeacherReviewScreen.jsx";
import { DashboardScreen } from "./screens/DashboardScreen.jsx";
import { EvaluationReviewScreen, MappingScreen } from "./screens/SetupScreens.jsx";
import { BrandMark, ImportSplash, LaunchIntro, useImportSplash } from "./components/brand.jsx";
import { nextFrame } from "./lib/motion.js";
import { buildSubjectFeedbackPayload, normaliseName, parseSubjectFeedback } from "./lib/teacher-decisions.js";
import { browserInflate, extractPdfTextRuns } from "../js/pdf-text.js";
import { parsePriorYearReport } from "../js/prior-year-report.js";
import { PriorYearNameDialog } from "./components/prior-year.jsx";
import { UploadScreen } from "./screens/UploadScreen.jsx";

export default function App() {
  const initialPreferences = useMemo(() => loadPreferences(), []);
  const [language, setLanguageState] = useState(initialPreferences.language || "nl");
  const [preferences, setPreferences] = useState(initialPreferences);
  const [appMode, setAppModeState] = useState(APP_MODES.includes(initialPreferences.appMode) ? initialPreferences.appMode : "vakdocent");
  const [workflowStep, setWorkflowStep] = useState("upload");
  const [model, setModel] = useState(null);
  const [config, setConfig] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [classTeacherReports, setClassTeacherReports] = useState([]);
  const [classTeacherAnalyses, setClassTeacherAnalyses] = useState([]);
  const [classTeacherTrackOverrides, setClassTeacherTrackOverrides] = useState({});
  const [classTeacherSubjectOverrides, setClassTeacherSubjectOverrides] = useState({});
  const [filters, setFilters] = useState(defaultFilters);
  const [notes, setNotes] = useState({});
  const [decisions, setDecisions] = useState({});
  const [subjectFeedback, setSubjectFeedback] = useState({});
  // Prior-year reports per pupil (session + explicit project file only; never in localStorage).
  const [priorYear, setPriorYear] = useState({});
  const [pendingPrior, setPendingPrior] = useState(null);
  const [printOverview, setPrintOverview] = useState(false);
  const [presets, setPresets] = useState(() => loadPresets());
  const [status, setStatus] = useState({ kind: "idle", text: t("upload.empty") });
  const [isDragging, setIsDragging] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [activeTour, setActiveTour] = useState(null);
  const [evaluationDialog, setEvaluationDialog] = useState(null);
  const [histogramDialog, setHistogramDialog] = useState(null);
  const [noteSuggestionDialog, setNoteSuggestionDialog] = useState(null);
  const [printStudentId, setPrintStudentId] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [projectSaveState, setProjectSaveState] = useState("idle");
  const [noteSaveStatus, setNoteSaveStatus] = useState({});
  const [generationStep, setGenerationStep] = useState(0);
  const fileInputRef = useRef(null);
  const projectInputRef = useRef(null);
  const noteSaveTimersRef = useRef(new Map());
  const generationTimersRef = useRef([]);
  const splash = useImportSplash();

  const c = (key, params = {}) => {
    const value = FALLBACK_COPY[language]?.[key] || FALLBACK_COPY.nl[key] || key;
    return Object.entries(params).reduce((text, [name, replacement]) => text.replace(`{${name}}`, replacement), value);
  };

  useEffect(() => {
    purgeLegacyProjectDrafts();
  }, []);

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
    if (!printOverview) return undefined;
    const printTimer = window.setTimeout(() => window.print(), 80);
    return () => window.clearTimeout(printTimer);
  }, [printOverview]);

  useEffect(() => {
    const clearPrintTarget = () => {
      setPrintStudentId(null);
      setPrintOverview(false);
    };
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
    if (appMode === "klassenleraar" && classTeacherAnalyses[0]) {
      const current = classTeacherAnalyses[0];
      return `klassenleraar::${current.classCode || "klas"}::${current.periodSchemaId || "periodes"}`.toLowerCase();
    }
    const fileName = model?.fileName || "workbook";
    const subject = config?.subject || model?.subjects?.[0]?.value || "subject";
    return `${fileName}::${subject}`.toLowerCase();
  }, [appMode, classTeacherAnalyses, config?.subject, model]);

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

  function changeAppMode(nextMode) {
    if (!APP_MODES.includes(nextMode)) return;
    setAppModeState(nextMode);
    persistPreferences({ appMode: nextMode });
    setUploadSummary(null);
    setStatus({ kind: "idle", text: t("upload.empty") });
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
    if ((model && config) || (appMode === "klassenleraar" && classTeacherAnalyses.length)) {
      setProjectSaveState("dirty");
    }
  }

  async function loadWorkbook(source, fileName) {
    setIsBusy(true);
    setUploadSummary(null);
    setStatus({ kind: "busy", text: c("processing") });
    splash.open();
    try {
      splash.update({ stage: "reading", fileIndex: 0, fileCount: 1 });
      await nextFrame();
      const workbook = await readXlsxWorkbook(source, { fileName });
      splash.update({ stage: "parsing" });
      await nextFrame();
      const parsedModel = parseSkoreWorkbook(workbook);
      splash.update({ stage: "analysing" });
      await nextFrame();
      const nextConfig = createInitialConfig(parsedModel, preferences);
      const nextWorkspaceKey = `${parsedModel.fileName}::${nextConfig.subject || "subject"}`.toLowerCase();
      setClassTeacherReports([]);
      setClassTeacherAnalyses([]);
      setClassTeacherTrackOverrides({});
      setClassTeacherSubjectOverrides({});
      setModel(parsedModel);
      setConfig(nextConfig);
      setAnalysis(null);
      setFilters(normaliseFilters({ classCode: preferredClassCode(parsedModel, preferences) }, nextConfig.threshold));
      setNotes(loadNotes(nextWorkspaceKey));
      setDecisions(loadDecisions(nextWorkspaceKey));
      setProjectSaveState("dirty");
      setUploadSummary({
        fileName: parsedModel.fileName,
        students: parsedModel.students.length,
        classes: parsedModel.classes.length,
        assignments: parsedModel.assignments.length,
      });
      setStatus({ kind: "success", text: c("parsed") });
      await splash.finish();
      setWorkflowStep("review");
    } catch (error) {
      console.error(error);
      splash.close();
      setUploadSummary(null);
      setStatus({ kind: "error", text: `${t("status.parseError")} ${error?.message || ""}`.trim() });
    } finally {
      setIsBusy(false);
    }
  }

  async function loadClassTeacherReports(fileList) {
    const files = Array.from(fileList || []).filter((file) => /\.(xlsx|xls)$/i.test(file.name));
    setUploadSummary(null);
    setClassTeacherReports([]);
    setClassTeacherAnalyses([]);
    setClassTeacherTrackOverrides({});
    setClassTeacherSubjectOverrides({});

    // Mid-year class councils only have one or two reports: accept 1 to 4.
    if (files.length < 1 || files.length > 4) {
      setStatus({ kind: "warning", text: c("classTeacherFileCountWarning") });
      return;
    }

    setIsBusy(true);
    setStatus({ kind: "busy", text: c("classTeacherProcessing") });
    splash.open();
    try {
      const reports = [];
      for (const [index, file] of files.entries()) {
        splash.update({ stage: "reading", fileIndex: index, fileCount: files.length });
        await nextFrame();
        const workbook = await readXlsxWorkbook(file, { fileName: file.name });
        reports.push(parseClassTeacherReportWorkbook(workbook));
      }
      splash.update({ stage: "analysing" });
      await nextFrame();
      // Files without pupil scores (e.g. "Overzicht gewichten", which is only a class list) are skipped.
      const skippedFiles = reports.filter((report) => !report.students?.length).map((report) => report.fileName);
      reports.splice(0, reports.length, ...reports.filter((report) => report.students?.length));
      if (!reports.length) throw new Error(c("classTeacherSkippedFiles", { files: skippedFiles.join(", ") }));
      const analyses = calculateClassTeacherAnalysesFromReports(reports);
      const summary = buildClassTeacherUploadSummary(files, analyses);

      setModel(null);
      setConfig(null);
      setAnalysis(null);
      setNotes({});
      setFilters(defaultFilters());
      setClassTeacherReports(reports);
      setClassTeacherAnalyses(analyses);
      setProjectSaveState("dirty");
      setUploadSummary(summary);
      setStatus({
        kind: summary.classes > 1 ? "warning" : "success",
        text: [
          summary.classes > 1 ? c("classTeacherMultiClassWarning") : c("classTeacherParsed"),
          skippedFiles.length ? c("classTeacherSkippedFiles", { files: skippedFiles.join(", ") }) : "",
        ].filter(Boolean).join(" "),
      });
      await splash.finish();
      if (summary.classes === 1) setWorkflowStep("classTeacherReview");
    } catch (error) {
      console.error(error);
      splash.close();
      setUploadSummary(null);
      setClassTeacherReports([]);
      setClassTeacherAnalyses([]);
      setStatus({ kind: "error", text: `${t("status.parseError")} ${error?.message || ""}`.trim() });
    } finally {
      setIsBusy(false);
    }
  }

  async function loadProjectFile(file) {
    setIsBusy(true);
    setUploadSummary(null);
    setStatus({ kind: "busy", text: t("status.loadingProject", { fileName: file.name }) });
    splash.open();
    try {
      splash.update({ stage: "project" });
      await nextFrame();
      const payload = JSON.parse(await file.text());
      splash.update({ stage: "analysing" });
      await nextFrame();
      if (payload?.mode === "klassenleraar") {
        setAppModeState("klassenleraar");
        persistPreferences({ appMode: "klassenleraar" });
        const reports = Array.isArray(payload.classTeacherReports) ? payload.classTeacherReports : [];
        const trackOverrides = payload.classTeacherTrackOverrides || {};
        const subjectOverrides = payload.classTeacherSubjectOverrides || {};
        const analyses = calculateClassTeacherAnalysesFromReports(reports, trackOverrides, subjectOverrides);
        const nextWorkspaceKey = `klassenleraar::${analyses[0]?.classCode || "klas"}::${analyses[0]?.periodSchemaId || "periodes"}`.toLowerCase();
        setModel(null);
        setConfig(null);
        setAnalysis(null);
        setFilters(defaultFilters());
        setClassTeacherReports(reports);
        setClassTeacherTrackOverrides(trackOverrides);
        setClassTeacherSubjectOverrides(subjectOverrides);
        setClassTeacherAnalyses(analyses);
        setNotes(saveNotes(nextWorkspaceKey, payload.teacherNotes || {}));
        setDecisions(saveDecisions(nextWorkspaceKey, payload.teacherDecisions || {}));
        setSubjectFeedback(payload.subjectFeedback && typeof payload.subjectFeedback === "object" ? payload.subjectFeedback : {});
        setPriorYear(payload.priorYear && typeof payload.priorYear === "object" ? payload.priorYear : {});
        setProjectSaveState("saved");
        await splash.finish();
        setWorkflowStep(analyses.length ? "classTeacherReview" : "upload");
        setStatus({ kind: "success", text: t("status.projectLoaded", { fileName: file.name }) });
        return;
      }
      const restored = hydrateProjectPayload(payload, defaultFilters());
      const restoredWorkspaceKey = `${restored.model.fileName}::${restored.config.subject || restored.model.subjects?.[0]?.value || "subject"}`.toLowerCase();
      const nextAnalysis = withAnonymousNumbers(calculateAnalysis(restored.model, restored.config));
      setAppModeState("vakdocent");
      setClassTeacherReports([]);
      setClassTeacherAnalyses([]);
      setModel(restored.model);
      setConfig(restored.config);
      setAnalysis(nextAnalysis);
      setFilters(normaliseFilters(restored.filters, restored.config.threshold));
      setNotes(saveNotes(restoredWorkspaceKey, restored.notes));
      setDecisions(saveDecisions(restoredWorkspaceKey, restored.decisions || {}));
      setPriorYear(payload.priorYear && typeof payload.priorYear === "object" ? payload.priorYear : {});
      setProjectSaveState("saved");
      setStatus({
        kind: "success",
        text: t("status.projectLoaded", {
          fileName: file.name,
          students: restored.model.students.length,
        }),
      });
      await splash.finish();
      setWorkflowStep("dashboard");
    } catch (error) {
      console.error(error);
      splash.close();
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

  function recomputeClassTeacherReview(nextReports, nextTrackOverrides = classTeacherTrackOverrides, nextSubjectOverrides = classTeacherSubjectOverrides) {
    const nextAnalyses = calculateClassTeacherAnalysesFromReports(nextReports, nextTrackOverrides, nextSubjectOverrides);
    setClassTeacherAnalyses(nextAnalyses);
    setProjectSaveState("dirty");
    return nextAnalyses;
  }

  function updateClassTeacherTrack(classCode, trackId) {
    const nextOverrides = {
      ...classTeacherTrackOverrides,
      [classCode]: trackId,
    };
    setClassTeacherTrackOverrides(nextOverrides);
    recomputeClassTeacherReview(classTeacherReports, nextOverrides, classTeacherSubjectOverrides);
  }

  function updateClassTeacherPeriod(fileName, periodId) {
    const nextReports = classTeacherReports.map((report) => {
      if (report.fileName !== fileName) return report;
      const period = periodSchemaForYear(report.year)?.periods.find((item) => item.id === periodId);
      if (!period) return report;
      return {
        ...report,
        periodId: period.id,
        periodLabel: period.label,
      };
    });
    setClassTeacherReports(nextReports);
    recomputeClassTeacherReview(nextReports);
  }

  function updateClassTeacherSubject(classCode, subject, targetSubject) {
    const nextOverrides = {
      ...classTeacherSubjectOverrides,
      [classCode]: {
        ...(classTeacherSubjectOverrides[classCode] || {}),
        [subject]: targetSubject || "",
      },
    };
    if (!targetSubject) delete nextOverrides[classCode][subject];
    setClassTeacherSubjectOverrides(nextOverrides);
    recomputeClassTeacherReview(classTeacherReports, classTeacherTrackOverrides, nextOverrides);
  }

  function confirmClassTeacherMapping() {
    const blockingIssues = classTeacherBlockingIssues(classTeacherAnalyses);
    if (blockingIssues.length) {
      setStatus({ kind: "warning", text: c("classTeacherBlocked") });
      return;
    }
    const current = classTeacherAnalyses[0];
    const nextWorkspaceKey = `klassenleraar::${current?.classCode || "klas"}::${current?.periodSchemaId || "periodes"}`.toLowerCase();
    setNotes(loadNotes(nextWorkspaceKey));
    setDecisions(loadDecisions(nextWorkspaceKey));
    setFilters(defaultFilters());
    setStatus({ kind: "success", text: c("classTeacherReviewReady") });
    setWorkflowStep("classTeacherDashboard");
  }

  function generateCards() {
    if (!model || !config) return;
    generationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    generationTimersRef.current = [];
    // The calculation is instant: no artificial waiting steps.
    const nextAnalysis = withAnonymousNumbers(calculateAnalysis(model, config));
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
    setWorkflowStep("dashboard");
  }

  function resetData() {
    if (!window.confirm(c("resetConfirm"))) return;
    generationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    generationTimersRef.current = [];
    clearWorkspaceNotes(workspaceKey);
    setModel(null);
    setConfig(null);
    setAnalysis(null);
    setClassTeacherReports([]);
    setClassTeacherAnalyses([]);
    setClassTeacherTrackOverrides({});
    setClassTeacherSubjectOverrides({});
    setNotes({});
    setDecisions({});
    setSubjectFeedback({});
    setPriorYear({});
    setPendingPrior(null);
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
    const preset = presetName === "school" ? config?.schoolPreset : BASKET_PRESETS[presetName];
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
    persistLastBasketPreset(presetName);
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

  function openSubjectNoteSuggestion(student, peers, displayName) {
    setNoteSuggestionDialog({
      mode: "vakdocent",
      studentId: student.id,
      studentName: displayName || student.name,
      suggestion: generateSubjectTeacherNoteSuggestion(student, peers),
    });
  }

  function openClassTeacherNoteSuggestion(student, currentAnalysis, displayName) {
    setNoteSuggestionDialog({
      mode: "klassenleraar",
      studentId: student.id,
      studentName: displayName || student.name,
      suggestion: generateClassTeacherNoteSuggestion(student, currentAnalysis),
    });
  }

  function insertNoteSuggestion(text) {
    if (!noteSuggestionDialog) return;
    const nextNote = appendSuggestionToNote(notes[noteSuggestionDialog.studentId] || "", text);
    updateNote(noteSuggestionDialog.studentId, nextNote);
    setNoteSuggestionDialog(null);
  }

  function updateDecision(studentId, patch) {
    try {
      setDecisions(saveDecision(workspaceKey, studentId, patch));
    } catch (error) {
      console.error(error);
      setDecisions((current) => ({ ...current, [studentId]: { ...(current[studentId] || {}), ...patch } }));
    }
    markProjectDirty();
  }

  /** Vakleerkracht → klastitularis handover: one small JSON per subject (names, totals, open signals, note). */
  function exportSubjectFeedback(students, teacher = "") {
    if (!analysis) return;
    const payload = buildSubjectFeedbackPayload({
      subject: analysis.subject || config?.subject || "Vak",
      teacher,
      students,
      notes,
      decisions,
    });
    const classPart = unique(students.map((student) => student.classCode)).join("-") || "klas";
    const subjectSlug = String(payload.subject).replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
    exportJsonPayload(payload, `vakfeedback-${subjectSlug}-${classPart}.json`);
    setStatus({ kind: "success", text: t("feedback.exported", { count: students.length }) });
  }

  async function importSubjectFeedback(fileList) {
    const files = Array.from(fileList || []);
    const imported = [];
    const failed = [];
    for (const file of files) {
      try {
        const parsed = parseSubjectFeedback(JSON.parse(await file.text()));
        imported.push(parsed);
      } catch (error) {
        console.error(error);
        failed.push(file.name);
      }
    }
    if (imported.length) {
      setSubjectFeedback((current) => {
        const next = { ...current };
        for (const entry of imported) next[entry.subject.toLowerCase()] = entry;
        return next;
      });
      markProjectDirty();
    }
    return { imported: imported.map((entry) => entry.subject), failed };
  }

  /** Reads one pupil's Skore year report (PDF) from last school year and links it to the card. */
  async function loadPriorYear(student, file, displayName) {
    if (!student || !file) return;
    splash.open();
    try {
      splash.update({ stage: "pdf" });
      await nextFrame();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pages = await extractPdfTextRuns(bytes, { inflate: browserInflate });
      splash.update({ stage: "pdfParse" });
      await nextFrame();
      const report = parsePriorYearReport(pages, { fileName: file.name });
      splash.update({ stage: "pdfMatch" });
      await nextFrame();
      await splash.finish();
      const sameName = report.pupilName && normaliseName(report.pupilName) === normaliseName(student.name);
      if (sameName) {
        attachPriorYear(student.id, report);
        setStatus({ kind: "success", text: t("prior.loaded", { name: displayName || student.name, year: report.schoolYear || "" }) });
      } else {
        // Different (or unreadable) name: let the teacher decide before linking.
        setPendingPrior({ studentId: student.id, studentName: displayName || student.name, report, anonymisedName: displayName !== student.name });
      }
    } catch (error) {
      console.error(error);
      splash.close();
      const message = error?.message === "NOT_SKORE_REPORT" || error?.message === "NOT_A_PDF" ? t("prior.notReport") : `${t("prior.readError")} ${error?.message || ""}`.trim();
      setPendingPrior({ error: message, fileName: file.name });
    }
  }

  function attachPriorYear(studentId, report) {
    setPriorYear((current) => ({ ...current, [studentId]: report }));
    markProjectDirty();
  }

  function removePriorYear(studentId) {
    setPriorYear((current) => {
      const next = { ...current };
      delete next[studentId];
      return next;
    });
    markProjectDirty();
  }

  function saveProjectBackup() {
    if (appMode === "klassenleraar" && classTeacherAnalyses[0]) {
      const current = classTeacherAnalyses[0];
      const payload = buildClassTeacherProjectPayload(
        classTeacherReports,
        classTeacherAnalyses,
        notes,
        classTeacherTrackOverrides,
        classTeacherSubjectOverrides,
        decisions,
        subjectFeedback,
      );
      const localSave = { ok: true };
      exportJsonPayload({ ...payload, priorYear }, `${current.classCode || "klassenleraar"}-project.json`);
      setProjectSaveState(localSave.ok ? "saved" : "error");
      setStatus({
        kind: localSave.ok ? "success" : "warning",
        text: localSave.ok ? t("status.projectSaved") : t("status.projectSavePartial"),
      });
      return;
    }
    if (!model || !config) return;
    const exportAnalysis = analysis || withAnonymousNumbers(calculateAnalysis(model, config));
    const payload = buildProjectPayload(model, config, exportAnalysis, notes, filters, decisions);
    const localSave = { ok: true };
    exportJsonPayload({ ...payload, priorYear }, `${String(model.fileName || "skore").replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-")}-project.json`);
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

  const compactCards = true;
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

  function changeActiveTour(nextTour) {
    const tourSteps = cardTourStepsForMode(appMode);
    if (nextTour && !tourSteps[nextTour.step]) {
      setActiveTour(null);
      return;
    }
    const requiredSection = appMode === "vakdocent" && nextTour ? TOUR_REQUIRED_SECTIONS[tourSteps[nextTour.step]?.part] : null;
    if (requiredSection && !openCardSections[requiredSection]) {
      persistPreferences({
        openCardSections: {
          ...openCardSections,
          [requiredSection]: true,
        },
      });
    }
    setActiveTour(nextTour);
  }

  function startStudentTour(studentId) {
    scrollToStudent(studentId);
    window.setTimeout(() => changeActiveTour({ studentId, step: 0 }), 220);
  }

  function closeTour(completed = false) {
    setActiveTour(null);
    if (completed) {
      persistPreferences({
        tourCompletedAt: new Date().toISOString(),
      });
    }
  }

  const shellClass = cn("app-shell", workflowStep === "upload" && "app-shell--splash", printStudentId && "is-printing-single", printOverview && "is-printing-overview");

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
              c={c}
              appMode={appMode}
              onModeChange={changeAppMode}
              status={status}
              isBusy={isBusy}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              fileInputRef={fileInputRef}
              projectInputRef={projectInputRef}
              uploadSummary={uploadSummary}
              onLoadWorkbook={loadWorkbook}
              onLoadClassTeacherFiles={loadClassTeacherReports}
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

          {workflowStep === "classTeacherReview" && classTeacherAnalyses.length ? (
            <ClassTeacherReviewScreen
              c={c}
              status={status}
              reports={classTeacherReports}
              analyses={classTeacherAnalyses}
              trackOverrides={classTeacherTrackOverrides}
              subjectOverrides={classTeacherSubjectOverrides}
              onTrackChange={updateClassTeacherTrack}
              onPeriodChange={updateClassTeacherPeriod}
              onSubjectChange={updateClassTeacherSubject}
              onConfirm={confirmClassTeacherMapping}
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
              compactCards={compactCards}
              openCardSections={openCardSections}
              notes={notes}
              noteSaveStatus={noteSaveStatus}
              onCardSectionOpenChange={updateCardSectionPreference}
              onFiltersChange={updateFilters}
              onNoteChange={updateNote}
              onOpenNoteSuggestion={openSubjectNoteSuggestion}
              decisions={decisions}
              onDecisionChange={updateDecision}
              onExportFeedback={exportSubjectFeedback}
              priorYear={priorYear}
              onUploadPriorYear={loadPriorYear}
              onRemovePriorYear={removePriorYear}
              onScrollToStudent={scrollToStudent}
              onStartTour={startStudentTour}
              onPrintStudent={printStudentCard}
              printStudentId={printStudentId}
              onEvaluationClick={setEvaluationDialog}
              onHistogramClick={setHistogramDialog}
            />
          ) : null}

          {workflowStep === "classTeacherDashboard" && classTeacherAnalyses[0] ? (
            <ClassTeacherDashboardScreen
              c={c}
              analysis={classTeacherAnalyses[0]}
              anonymised={Boolean(preferences.anonymised)}
              compactCards={compactCards}
              notes={notes}
              noteSaveStatus={noteSaveStatus}
              onNoteChange={updateNote}
              onOpenNoteSuggestion={openClassTeacherNoteSuggestion}
              decisions={decisions}
              onDecisionChange={updateDecision}
              subjectFeedback={subjectFeedback}
              onImportFeedback={importSubjectFeedback}
              onPrintOverview={() => setPrintOverview(true)}
              priorYear={priorYear}
              onUploadPriorYear={loadPriorYear}
              onRemovePriorYear={removePriorYear}
              onScrollToStudent={scrollToStudent}
              onStartTour={startStudentTour}
              onPrintStudent={printStudentCard}
              printStudentId={printStudentId}
              onHistogramClick={setHistogramDialog}
            />
          ) : null}
        </main>

        {workflowStep !== "upload" ? <Footer /> : null}

        <PriorYearNameDialog
          data={pendingPrior}
          onConfirm={() => {
            attachPriorYear(pendingPrior.studentId, pendingPrior.report);
            setStatus({ kind: "success", text: t("prior.loaded", { name: pendingPrior.studentName, year: pendingPrior.report.schoolYear || "" }) });
            setPendingPrior(null);
          }}
          onCancel={() => setPendingPrior(null)}
        />

        <LaunchIntro />
        <ImportSplash state={splash.state} />

        <StudentTourOverlay
          c={c}
          mode={appMode}
          activeTour={activeTour}
          onChange={changeActiveTour}
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

        <NoteSuggestionDialog
          data={noteSuggestionDialog}
          onInsert={insertNoteSuggestion}
          onOpenChange={(open) => {
            if (!open) setNoteSuggestionDialog(null);
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
        <BrandMark size={40} className="brand-mark-svg" />
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
