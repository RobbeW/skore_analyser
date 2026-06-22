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
const CLASS_TEACHER_LINE_COLORS = [
  "#38bdf8",
  "#34d399",
  "#fb7185",
  "#f59e0b",
  "#a78bfa",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];
const GENERATION_STEPS = [
  { key: "file", titleKey: "generation.fileTitle", bodyKey: "generation.fileBody" },
  { key: "weights", titleKey: "generation.weightsTitle", bodyKey: "generation.weightsBody" },
  { key: "cards", titleKey: "generation.cardsTitle", bodyKey: "generation.cardsBody" },
];
const DEFAULT_OPEN_CARD_SECTIONS = {
  duiding: false,
  contextCharts: true,
  score: false,
  comments: true,
};

const CARD_TOUR_STEPS = [
  { part: "total", titleKey: "tour.totalTitle", bodyKey: "tour.totalBody" },
  { part: "table", titleKey: "tour.tableTitle", bodyKey: "tour.tableBody" },
  { part: "graph", titleKey: "tour.graphTitle", bodyKey: "tour.graphBody" },
  { part: "advice", titleKey: "tour.adviceTitle", bodyKey: "tour.adviceBody" },
  { part: "notes", titleKey: "tour.notesTitle", bodyKey: "tour.notesBody" },
];
const CLASS_TEACHER_CARD_TOUR_STEPS = [
  { part: "total", titleKey: "classTeacherTourTotalTitle", bodyKey: "classTeacherTourTotalBody", copy: true },
  { part: "graph", titleKey: "classTeacherTourGraphTitle", bodyKey: "classTeacherTourGraphBody", copy: true },
  { part: "advice", titleKey: "classTeacherTourSummaryTitle", bodyKey: "classTeacherTourSummaryBody", copy: true },
  { part: "table", titleKey: "classTeacherTourTableTitle", bodyKey: "classTeacherTourTableBody", copy: true },
  { part: "notes", titleKey: "classTeacherTourNotesTitle", bodyKey: "classTeacherTourNotesBody", copy: true },
];
const TOUR_REQUIRED_SECTIONS = {
  table: "score",
};
const APP_MODES = ["vakdocent", "klassenleraar"];

function cardTourStepsForMode(mode) {
  return mode === "klassenleraar" ? CLASS_TEACHER_CARD_TOUR_STEPS : CARD_TOUR_STEPS;
}

const FALLBACK_COPY = {
  nl: {
    localFirst: "Alles blijft lokaal in deze browser.",
    processing: "Bestand lokaal verwerken...",
    parsed: "Bestand herkend. Controleer eerst welke evaluaties meetellen.",
    classTeacherProcessing: "Rapportbestanden lokaal verwerken...",
    classTeacherParsed: "Klasrapporten herkend. De mappingcontrole volgt in de volgende stap.",
    classTeacherFileCountWarning: "Kies 3 of 4 rapportbestanden voor een klassenleraaranalyse.",
    classTeacherMultiClassWarning: "Deze selectie bevat meerdere klasgroepen. Controleer dit in de volgende stap.",
    classTeacherReviewReady: "Mapping bevestigd. De klassenleraar-kaarten staan klaar.",
    classTeacherReviewFlow: "Controle",
    classTeacherReviewTitle: "Controleer je klasrapporten",
    classTeacherReviewBody: "Kijk klas, periodes, richting en onbekende vakafkortingen na voordat we leerlingkaarten maken.",
    classTeacherConfirmMapping: "Mapping bevestigen",
    classTeacherTrackHelp: "Automatisch afgeleid uit de klasnaam. Pas aan als de klascode afwijkt van de richting.",
    classTeacherSubjectHelp: "Onbekende afkortingen kan je voorlopig aan een bestaand vak koppelen.",
    classTeacherStudentsHelp: "Deze preview controleert of leerlingen over de rapportbestanden heen aan elkaar gekoppeld worden.",
    classTeacherBlocked: "Los eerst de blokkerende punten op.",
    classTeacherDashboardTitle: "Klassenleraaranalyse",
    classTeacherDashboardBody: "Elke kaart toont het jaarbeeld van een leerling over alle vakken heen.",
    classTeacherOverallLine: "Algemene lijn",
    classTeacherSubjectLines: "Vaklijnen",
    classTeacherSubjectPicker: "Welke vaklijnen tonen?",
    classTeacherKeySubjectsOnly: "Hoofdvakken",
    classTeacherAllSubjects: "Alle vakken",
    classTeacherSubjectMatrix: "Vakoverzicht",
    classTeacherKeySubject: "Hoofdvak",
    classTeacherNoSignals: "Geen opvallende klassenleraar-signalen.",
    classTeacherTrackSignal: "Richting",
    classTeacherMainSubjectDanger: "Hoofdvak in de gevarenzone",
    classTeacherShowMainSubjectDanger: "Toon leerlingen met hoofdvak in de gevarenzone",
    classTeacherNoMainSubjectDanger: "Geen hoofdvak in de gevarenzone",
    classTeacherVisibleStudents: "Getoonde leerlingen",
    classTeacherFilterAll: "Alle leerlingen",
    classTeacherBelow65: "Jaartotaal onder 65%",
    classTeacherPositiveProfiles: "Sterke stabiele profielen",
    classTeacherSubjectFilter: "Filter op vak",
    classTeacherRiskSummary: "Aandachtspunten",
    classTeacherSummaryGood: "Geen opvallende automatische signalen.",
    classTeacherSummaryAttention: "Aandacht voor {count} element(en).",
    classTeacherSummaryMainSubjects: "Hoofdvakken in alarmzone: {subjects}.",
    classTeacherSummaryOtherSubjects: "Andere vakken in alarmzone: {subjects}.",
    classTeacherSummaryNoOtherSubjects: "Geen andere vakken in alarmzone.",
    classTeacherScaleFull: "0-100",
    classTeacherScaleZoom: "Inzoomen",
    classTeacherGenerateFlow: "Opbouw",
    classTeacherGeneratingTitle: "Leerlingkaarten opbouwen",
    classTeacherGeneratingBody: "We bundelen {students} leerlingen, {subjects} vakken en {periods} rapportperiodes tot rustige klassenraadkaarten.",
    classTeacherGeneratingReports: "Rapportperiodes koppelen",
    classTeacherGeneratingSubjects: "Vaklijnen tekenen",
    classTeacherGeneratingCards: "Kaarten klaarzetten",
    classTeacherUnknownTrackTitle: "Richting nog niet zeker",
    classTeacherUnknownTrackBody: "Bevestig de richting in de controle. Dan weet de tool welke hoofdvakken echt belangrijk zijn voor deze klas.",
    classTeacherMissingPeriodTitle: "Rapportperiode ontbreekt",
    classTeacherMissingPeriodBody: "{missing} van {expected} verwachte periodes ontbreken. De kaarten blijven bruikbaar, maar de jaarlijn steunt op minder meetpunten.",
    classTeacherGraphHint: "Beweeg over een punt voor details. De paarse lijn is het jaartotaal; de zachte lijnen zijn vakken.",
    classTeacherTourEyebrow: "Rondleiding klassenleraar",
    classTeacherTourTotalTitle: "Snelle leerlingcontext",
    classTeacherTourTotalBody: "Bovenaan zie je leerling, klas, richting en jaartotaal. Gebruik dit als vertrekpunt voor de klassenraad.",
    classTeacherTourGraphTitle: "Grafieken over vakken heen",
    classTeacherTourGraphBody: "De paarse lijn toont het algemene jaarbeeld. De zachte lijnen tonen de gekozen vakken. Met 0-100 of Inzoomen kies je of je het volledige bereik of kleine verschillen beter wil zien.",
    classTeacherTourSummaryTitle: "Samenvatting en aandachtspunten",
    classTeacherTourSummaryBody: "Hier bundelt de kaart hoofdvakken en andere vakken in alarmzone. Dubbele hoofdvaksignalen worden samengevat zodat je sneller ziet waar gesprek of context nodig is.",
    classTeacherTourTableTitle: "Vakoverzicht",
    classTeacherTourTableBody: "Deze tabel toont per vak de rapportperiodes en het jaartotaal. Hoofdvakken zijn gemarkeerd omdat ze belangrijk zijn binnen de richting van deze klas.",
    classTeacherTourNotesTitle: "Wat zeg je op de klassenraad?",
    classTeacherTourNotesBody: "Noteer hier je eigen duiding: inzet, afwezigheden, remediëring, afspraken of wat je concreet wil bespreken.",
    roleHelpVakdocent: "Een Skore-export voor jouw eigen vak.",
    roleHelpKlassenleraar: "Drie of vier rapportbestanden voor een hele klas.",
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
    classTeacherProcessing: "Processing report files locally...",
    classTeacherParsed: "Class reports detected. The mapping check follows in the next step.",
    classTeacherFileCountWarning: "Choose 3 or 4 report files for class-teacher analysis.",
    classTeacherMultiClassWarning: "This selection contains multiple class groups. Check this in the next step.",
    classTeacherReviewReady: "Mapping confirmed. Class-teacher cards are ready.",
    classTeacherReviewFlow: "Check",
    classTeacherReviewTitle: "Check your class reports",
    classTeacherReviewBody: "Review class, periods, track, and unknown subject abbreviations before creating student cards.",
    classTeacherConfirmMapping: "Confirm mapping",
    classTeacherTrackHelp: "Automatically inferred from the class name. Adjust it if the class code differs from the track.",
    classTeacherSubjectHelp: "Unknown abbreviations can temporarily be mapped to an existing subject.",
    classTeacherStudentsHelp: "This preview checks whether students are matched across report files.",
    classTeacherBlocked: "Resolve blocking issues first.",
    classTeacherDashboardTitle: "Class-teacher analysis",
    classTeacherDashboardBody: "Each card shows one student's year profile across all subjects.",
    classTeacherOverallLine: "Overall line",
    classTeacherSubjectLines: "Subject lines",
    classTeacherSubjectPicker: "Which subject lines to show?",
    classTeacherKeySubjectsOnly: "Key subjects",
    classTeacherAllSubjects: "All subjects",
    classTeacherSubjectMatrix: "Subject overview",
    classTeacherKeySubject: "Key subject",
    classTeacherNoSignals: "No notable class-teacher signals.",
    classTeacherTrackSignal: "Track",
    classTeacherMainSubjectDanger: "Core subject in the danger zone",
    classTeacherShowMainSubjectDanger: "Show students with a core subject in the danger zone",
    classTeacherNoMainSubjectDanger: "No core subject in the danger zone",
    classTeacherVisibleStudents: "Visible students",
    classTeacherFilterAll: "All students",
    classTeacherBelow65: "Year total below 65%",
    classTeacherPositiveProfiles: "Strong stable profiles",
    classTeacherSubjectFilter: "Filter by subject",
    classTeacherRiskSummary: "Attention points",
    classTeacherSummaryGood: "No notable automatic signals.",
    classTeacherSummaryAttention: "Attention for {count} item(s).",
    classTeacherSummaryMainSubjects: "Core subjects in the alarm zone: {subjects}.",
    classTeacherSummaryOtherSubjects: "Other subjects in the alarm zone: {subjects}.",
    classTeacherSummaryNoOtherSubjects: "No other subjects in the alarm zone.",
    classTeacherScaleFull: "0-100",
    classTeacherScaleZoom: "Zoom",
    classTeacherGenerateFlow: "Build",
    classTeacherGeneratingTitle: "Building student cards",
    classTeacherGeneratingBody: "We combine {students} students, {subjects} subjects, and {periods} report periods into calm class-council cards.",
    classTeacherGeneratingReports: "Linking report periods",
    classTeacherGeneratingSubjects: "Drawing subject lines",
    classTeacherGeneratingCards: "Preparing cards",
    classTeacherUnknownTrackTitle: "Track not confirmed yet",
    classTeacherUnknownTrackBody: "Confirm the track in the review step. Then the tool knows which core subjects matter most for this class.",
    classTeacherMissingPeriodTitle: "Report period missing",
    classTeacherMissingPeriodBody: "{missing} of {expected} expected periods are missing. The cards remain useful, but the year line has fewer points.",
    classTeacherGraphHint: "Hover a point for details. The purple line is the year total; the soft lines are subjects.",
    classTeacherTourEyebrow: "Class-teacher tour",
    classTeacherTourTotalTitle: "Quick student context",
    classTeacherTourTotalBody: "At the top you see student, class, track, and year total. Use this as a starting point for the class council.",
    classTeacherTourGraphTitle: "Charts across subjects",
    classTeacherTourGraphBody: "The purple line shows the overall year profile. The soft lines show selected subjects. Use 0-100 or Zoom to choose between the full range and smaller differences.",
    classTeacherTourSummaryTitle: "Summary and attention points",
    classTeacherTourSummaryBody: "This section combines core subjects and other subjects in alarm zones. Repeated core-subject signals are summarised so you can quickly see where context or discussion is needed.",
    classTeacherTourTableTitle: "Subject overview",
    classTeacherTourTableBody: "This table shows the report periods and year total for each subject. Core subjects are marked because they matter more in this track context.",
    classTeacherTourNotesTitle: "What will you say in class council?",
    classTeacherTourNotesBody: "Add your own context here: effort, absences, remediation, agreements, or the concrete point you want to discuss.",
    roleHelpVakdocent: "One Skore export for your own subject.",
    roleHelpKlassenleraar: "Three or four report files for a whole class.",
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
    try {
      const workbook = await readXlsxWorkbook(source, { fileName });
      const parsedModel = parseSkoreWorkbook(workbook);
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

  async function loadClassTeacherReports(fileList) {
    const files = Array.from(fileList || []).filter((file) => /\.(xlsx|xls)$/i.test(file.name));
    setUploadSummary(null);
    setClassTeacherReports([]);
    setClassTeacherAnalyses([]);
    setClassTeacherTrackOverrides({});
    setClassTeacherSubjectOverrides({});

    if (files.length < 3 || files.length > 4) {
      setStatus({ kind: "warning", text: c("classTeacherFileCountWarning") });
      return;
    }

    setIsBusy(true);
    setStatus({ kind: "busy", text: c("classTeacherProcessing") });
    try {
      const reports = await Promise.all(files.map(async (file) => {
        const workbook = await readXlsxWorkbook(file, { fileName: file.name });
        return parseClassTeacherReportWorkbook(workbook);
      }));
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
        text: summary.classes > 1 ? c("classTeacherMultiClassWarning") : c("classTeacherParsed"),
      });
      if (summary.classes === 1) {
        window.setTimeout(() => setWorkflowStep("classTeacherReview"), 860);
      }
    } catch (error) {
      console.error(error);
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
    try {
      const payload = JSON.parse(await file.text());
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
        setProjectSaveState("saved");
        setWorkflowStep(analyses.length ? "classTeacherReview" : "upload");
        setStatus({ kind: "success", text: t("status.projectLoaded", { fileName: file.name }) });
        return;
      }
      const restored = hydrateProjectPayload(payload, defaultFilters());
      const restoredWorkspaceKey = `${restored.model.fileName}::${restored.config.subject || restored.model.subjects?.[0]?.value || "subject"}`.toLowerCase();
      const nextAnalysis = calculateAnalysis(restored.model, restored.config);
      setAppModeState("vakdocent");
      setClassTeacherReports([]);
      setClassTeacherAnalyses([]);
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
    setFilters(defaultFilters());
    setStatus({ kind: "success", text: c("classTeacherReviewReady") });
    generationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    generationTimersRef.current = [];
    setGenerationStep(0);
    setWorkflowStep("classTeacherGenerating");
    generationTimersRef.current.push(window.setTimeout(() => setGenerationStep(1), 260));
    generationTimersRef.current.push(window.setTimeout(() => setGenerationStep(2), 540));
    generationTimersRef.current.push(window.setTimeout(() => {
      setGenerationStep(0);
      setWorkflowStep("classTeacherDashboard");
    }, 920));
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
    setClassTeacherReports([]);
    setClassTeacherAnalyses([]);
    setClassTeacherTrackOverrides({});
    setClassTeacherSubjectOverrides({});
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
    if (appMode === "klassenleraar" && classTeacherAnalyses[0]) {
      const current = classTeacherAnalyses[0];
      const payload = buildClassTeacherProjectPayload(
        classTeacherReports,
        classTeacherAnalyses,
        notes,
        classTeacherTrackOverrides,
        classTeacherSubjectOverrides
      );
      const localSave = saveProjectDraft(workspaceKey, payload);
      exportJsonPayload(payload, `${current.classCode || "klassenleraar"}-project.json`);
      setProjectSaveState(localSave.ok ? "saved" : "error");
      setStatus({
        kind: localSave.ok ? "success" : "warning",
        text: localSave.ok ? t("status.projectSaved") : t("status.projectSavePartial"),
      });
      return;
    }
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

          {workflowStep === "generating" && model && config ? (
            <GenerationScreen c={c} model={model} config={config} generationStep={generationStep} />
          ) : null}

          {workflowStep === "classTeacherGenerating" && classTeacherAnalyses[0] ? (
            <ClassTeacherGenerationScreen c={c} analysis={classTeacherAnalyses[0]} generationStep={generationStep} />
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
              onScrollToStudent={scrollToStudent}
              onStartTour={startStudentTour}
              onPrintStudent={printStudentCard}
              printStudentId={printStudentId}
              onHistogramClick={setHistogramDialog}
            />
          ) : null}
        </main>

        {workflowStep !== "upload" ? <Footer /> : null}

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

function buildClassTeacherUploadSummary(files, analyses) {
  const classCodes = unique(analyses.map((analysis) => analysis.classCode));
  const years = unique(analyses.map((analysis) => String(analysis.year || "")));
  const tracks = unique(analyses.map((analysis) => analysis.track?.label || ""));
  const warningCodes = unique(analyses.flatMap((analysis) => (
    analysis.warnings || []
  ).map((warning) => warning.code || warning.message || String(warning))));
  const periodCount = analyses.reduce((sum, analysis) => sum + (analysis.totals?.periodCount || 0), 0);
  const expectedPeriodCount = analyses.reduce((sum, analysis) => sum + (analysis.totals?.expectedPeriodCount || 0), 0);
  const students = analyses.reduce((sum, analysis) => sum + (analysis.totals?.studentCount || 0), 0);
  const subjects = analyses.reduce((sum, analysis) => sum + (analysis.totals?.subjectCount || 0), 0);
  const keySubjects = analyses.reduce((sum, analysis) => sum + (analysis.totals?.keySubjectCount || 0), 0);

  return {
    mode: "klassenleraar",
    fileName: files.map((file) => file.name).join(", "),
    fileCount: files.length,
    classCode: classCodes.join(", ") || t("option.notAvailable"),
    classes: classCodes.length,
    students,
    subjects,
    periodCount,
    expectedPeriodCount,
    periods: expectedPeriodCount ? `${periodCount}/${expectedPeriodCount}` : String(periodCount),
    year: years.join(", ") || t("option.notAvailable"),
    track: tracks.join(", ") || t("option.notAvailable"),
    keySubjects,
    warnings: warningCodes,
  };
}

function buildClassTeacherProjectPayload(reports, analyses, notes = {}, trackOverrides = {}, subjectOverrides = {}) {
  const primary = analyses[0] || {};
  return {
    mode: "klassenleraar",
    exportedAt: new Date().toISOString(),
    privacy: t("export.privacy"),
    classTeacherReports: reports,
    classTeacherTrackOverrides: trackOverrides,
    classTeacherSubjectOverrides: subjectOverrides,
    teacherNotes: notes,
    analysis: primary,
  };
}

function calculateClassTeacherAnalysesFromReports(reports = [], trackOverrides = {}, subjectOverrides = {}) {
  const mappedReports = reports.map((report) => applyClassTeacherSubjectOverridesToReport(
    report,
    subjectOverrides[report.classCode] || {},
  ));
  return aggregateClassTeacherReportGroups(mappedReports).map((aggregation) => {
    const selectedTrack = trackById(trackOverrides[aggregation.classCode]) || aggregation.track;
    return calculateClassTeacherAnalysis(applyClassTeacherTrackToAggregation(aggregation, selectedTrack));
  });
}

function applyClassTeacherSubjectOverridesToReport(report, overrides = {}) {
  const activeOverrides = Object.fromEntries(Object.entries(overrides).filter(([, target]) => target));
  if (!Object.keys(activeOverrides).length) return report;
  const rename = (subject) => activeOverrides[subject] || subject;
  const isMapped = (subject) => Boolean(activeOverrides[subject]);

  return {
    ...report,
    subjects: (report.subjects || []).map((subject) => ({
      ...subject,
      canonical: rename(subject.canonical),
      known: subject.known || isMapped(subject.canonical) || isMapped(subject.raw),
    })),
    students: (report.students || []).map((student) => ({
      ...student,
      subjectScores: (student.subjectScores || []).map((score) => ({
        ...score,
        subject: rename(score.subject),
        rawSubject: score.rawSubject || score.subject,
      })),
    })),
    warnings: (report.warnings || []).filter((warning) => {
      if (warning.code !== "unknown_subject") return true;
      return !isMapped(warning.details?.subject) && !isMapped(warning.details?.canonical);
    }),
  };
}

function applyClassTeacherTrackToAggregation(aggregation, track) {
  if (!track) return aggregation;
  const keySubjects = new Set(track.keySubjects || []);
  return {
    ...aggregation,
    track,
    subjects: (aggregation.subjects || []).map((subject) => ({
      ...subject,
      isKeySubject: keySubjects.has(subject.subject),
    })),
    students: (aggregation.students || []).map((student) => ({
      ...student,
      periods: (student.periods || []).map((period) => ({
        ...period,
        subjectScores: Object.fromEntries(Object.entries(period.subjectScores || {}).map(([key, score]) => [
          key,
          {
            ...score,
            isKeySubject: keySubjects.has(score.subject || key),
          },
        ])),
      })),
      subjectLines: (student.subjectLines || []).map((line) => ({
        ...line,
        isKeySubject: keySubjects.has(line.subject),
      })),
    })),
    totals: {
      ...aggregation.totals,
      keySubjectCount: (aggregation.subjects || []).filter((subject) => keySubjects.has(subject.subject)).length,
    },
  };
}

function classTeacherBlockingIssues(analyses = []) {
  const issues = [];
  if (!analyses.length) issues.push("Geen klasrapporten gevonden.");
  if (analyses.length > 1) issues.push("De selectie bevat meerdere klasgroepen. Upload per klassenraad een klas tegelijk.");
  for (const analysis of analyses) {
    if (!analysis.classCode) issues.push("Geen klascode gevonden.");
    if (!analysis.totals?.studentCount) issues.push(`${analysis.classCode || "Klas"} bevat geen leerlingen.`);
    if (!analysis.totals?.periodCount) issues.push(`${analysis.classCode || "Klas"} bevat geen herkenbare periodes.`);
    const duplicatePeriod = (analysis.warnings || []).find((warning) => warning.code === "duplicate_period_report");
    if (duplicatePeriod) issues.push(`${analysis.classCode}: meerdere bestanden staan op dezelfde periode.`);
  }
  return unique(issues);
}

function classTeacherPolishNotices(analysis, c) {
  if (!analysis) return [];
  const notices = [];
  if (!analysis.track?.id) {
    notices.push({
      id: "unknown-track",
      title: c("classTeacherUnknownTrackTitle"),
      body: c("classTeacherUnknownTrackBody"),
    });
  }
  const expected = analysis.totals?.expectedPeriodCount || 0;
  const available = analysis.totals?.periodCount || 0;
  if (expected && available < expected) {
    notices.push({
      id: "missing-period",
      title: c("classTeacherMissingPeriodTitle"),
      body: c("classTeacherMissingPeriodBody", {
        missing: expected - available,
        expected,
      }),
    });
  }
  return notices;
}

function classTeacherSubjectOptions(analysis) {
  const commonSubjects = [
    "Aardrijkskunde",
    "Biologie",
    "Chemie",
    "Design Thinking",
    "Digiwiskunde",
    "Duits",
    "Economie",
    "Engels",
    "Frans",
    "Fysica",
    "Geschiedenis",
    "Godsdienst",
    "Grieks",
    "ICT",
    "Informaticawetenschappen",
    "Latijn",
    "Lichamelijke opvoeding",
    "Muzikale opvoeding",
    "Natuurwetenschappen",
    "Nederlands",
    "Spaans",
    "Techniek",
    "Wiskunde",
  ];
  return unique([
    ...(analysis.subjects || []).filter((subject) => subject.known).map((subject) => subject.subject),
    ...(analysis.track?.keySubjects || []),
    ...commonSubjects,
  ]);
}

function classTeacherDefaultSubjects(student, onlyKeySubjects = false) {
  const lines = student.subjectLines || [];
  const keySubjects = lines.filter((line) => line.isKeySubject).map((line) => line.subject);
  if (keySubjects.length) return keySubjects.slice(0, onlyKeySubjects ? keySubjects.length : 7);
  return lines.slice(0, onlyKeySubjects ? 0 : 6).map((line) => line.subject);
}

function normaliseSelectedClassTeacherSubjects(student, selectedSubjects = []) {
  const available = new Set((student.subjectLines || []).map((line) => line.subject));
  const selected = selectedSubjects.filter((subject) => available.has(subject));
  if (selected.length) return selected;
  return classTeacherDefaultSubjects(student);
}

function classTeacherFlagVariant(tone) {
  if (tone === "critical") return "destructive";
  if (tone === "caution" || tone === "warning") return "warning";
  if (tone === "positive") return "success";
  return "secondary";
}

function filterClassTeacherStudents(students = [], filters = {}) {
  return students.filter((student) => {
    if (filters.focus === "mainSubjectDanger" && !classTeacherHasMainSubjectDanger(student)) return false;
    if (filters.focus === "below65" && (!Number.isFinite(student.finalWeighted) || student.finalWeighted >= 65)) return false;
    if (filters.focus === "positive" && !student.flags?.some((flag) => flag.type === "positive_stable_profile")) return false;
    if (filters.band && filters.band !== "all" && student.thresholdBand?.id !== filters.band) return false;
    if (filters.subject && filters.subject !== "all" && !student.subjectLines?.some((line) => line.subject === filters.subject && Number.isFinite(scoreForClassTeacherLine(line)))) return false;
    return true;
  });
}

function sortClassTeacherStudents(students = [], filters = {}) {
  const direction = filters.sortDirection === "desc" ? -1 : 1;
  const sortKey = filters.sortKey || "name";
  return [...students].sort((a, b) => {
    let result = 0;
    if (sortKey === "total") result = numericSortValue(a.finalWeighted) - numericSortValue(b.finalWeighted);
    else if (sortKey === "trend") result = numericSortValue(a.overallTrend?.delta) - numericSortValue(b.overallTrend?.delta);
    else if (sortKey === "flags") result = (a.flags?.length || 0) - (b.flags?.length || 0);
    else if (sortKey === "mainSubjectDanger") result = classTeacherDangerSubjects(a).length - classTeacherDangerSubjects(b).length;
    else result = a.name.localeCompare(b.name, undefined, { numeric: true });
    return result === 0 ? a.name.localeCompare(b.name, undefined, { numeric: true }) : result * direction;
  });
}

function classTeacherHasMainSubjectDanger(student) {
  return classTeacherDangerSubjects(student).length > 0
    || student.flags?.some((flag) => ["key_subject_critical", "multiple_key_subjects_weak", "track_mismatch_signal"].includes(flag.type));
}

function classTeacherDangerSubjects(student) {
  const bySubject = new Map();
  for (const item of student.keySubjectSummary?.below60 || []) bySubject.set(item.subject, item.score);
  for (const item of student.keySubjectSummary?.below50 || []) bySubject.set(item.subject, item.score);
  return Array.from(bySubject.entries())
    .map(([subject, score]) => ({ subject, score }))
    .sort((a, b) => a.score - b.score || a.subject.localeCompare(b.subject, undefined, { numeric: true }));
}

function classTeacherMainSubjectDangerLabel(student, c) {
  const dangerSubjects = classTeacherDangerSubjects(student);
  if (!dangerSubjects.length) return c("classTeacherNoMainSubjectDanger");
  const visible = dangerSubjects.slice(0, 3).map((item) => `${item.subject} ${formatNumber(item.score)}%`).join(", ");
  return dangerSubjects.length > 3 ? `${visible} +${dangerSubjects.length - 3}` : visible;
}

function classTeacherSubjectAlarmLists(student) {
  const mainSubjects = [];
  const otherSubjects = [];
  for (const line of student.subjectLines || []) {
    const score = scoreForClassTeacherLine(line);
    if (!Number.isFinite(score) || score >= 60) continue;
    const entry = `${line.subject} ${formatNumber(score)}%`;
    if (line.isKeySubject) {
      mainSubjects.push(entry);
    } else {
      otherSubjects.push(entry);
    }
  }
  return { mainSubjects, otherSubjects };
}

function classTeacherStudentSummary(student, c) {
  const { mainSubjects, otherSubjects } = classTeacherSubjectAlarmLists(student);
  const parts = [];
  if (mainSubjects.length) {
    parts.push(c("classTeacherSummaryMainSubjects", { subjects: mainSubjects.join(", ") }));
  }
  if (otherSubjects.length) {
    parts.push(c("classTeacherSummaryOtherSubjects", { subjects: otherSubjects.join(", ") }));
  } else if (mainSubjects.length) {
    parts.push(c("classTeacherSummaryNoOtherSubjects"));
  }
  return {
    title: student.flags?.length
      ? c("classTeacherSummaryAttention", { count: student.flags.length })
      : c("classTeacherSummaryGood"),
    body: parts.join(" ") || c("classTeacherNoSignals"),
  };
}

function classTeacherDetailFlags(student) {
  const summaryTypes = new Set([
    "key_subject_critical",
    "multiple_key_subjects_weak",
    "track_mismatch_signal",
  ]);
  return (student.flags || []).filter((flag) => !summaryTypes.has(flag.type));
}

function scoreForClassTeacherLine(line) {
  return Number.isFinite(line?.yearScore) ? line.yearScore : line?.latestScore;
}

function numericSortValue(value) {
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

function UploadScreen({
  c,
  appMode,
  onModeChange,
  status,
  isBusy,
  isDragging,
  setIsDragging,
  fileInputRef,
  projectInputRef,
  uploadSummary,
  onLoadWorkbook,
  onLoadClassTeacherFiles,
  onLoadProject,
}) {
  const isClassTeacherMode = appMode === "klassenleraar";

  function handleIncomingFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (files.length === 1 && /\.json$/i.test(files[0].name)) {
      onLoadProject(files[0]);
      return;
    }
    if (isClassTeacherMode) {
      onLoadClassTeacherFiles(files);
      return;
    }
    onLoadWorkbook(files[0], files[0].name);
  }

  function handleFileSelection(event) {
    handleIncomingFiles(event.target.files);
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
    handleIncomingFiles(event.dataTransfer.files);
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
          <div className="mode-toggle" aria-label={t("upload.roleLabel")}>
            {APP_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn("mode-choice", appMode === mode && "is-active")}
                onClick={() => onModeChange(mode)}
                aria-pressed={appMode === mode}
              >
                <span>{t(`upload.mode.${mode}`)}</span>
                <small>{mode === "klassenleraar" ? c("roleHelpKlassenleraar") : c("roleHelpVakdocent")}</small>
              </button>
            ))}
          </div>
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
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".xlsx,.xls,.json,application/json"
                multiple={isClassTeacherMode}
                onChange={handleFileSelection}
              />
              <span className="drop-zone-icon" aria-hidden="true">
                {isBusy ? <Spinner /> : <UploadCloud size={30} />}
              </span>
              <span className="drop-zone-title">{isClassTeacherMode ? t("upload.classTeacherDropTitle") : t("upload.dropTitle")}</span>
              <span className="drop-zone-help">{isClassTeacherMode ? t("upload.classTeacherHelp") : t("upload.help")}</span>
            </button>

            {uploadSummary ? (
              <div className="upload-success-panel" aria-live="polite">
                <div className="upload-success-icon" aria-hidden="true">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <UploadSummaryContent uploadSummary={uploadSummary} />
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

function UploadSummaryContent({ uploadSummary }) {
  if (uploadSummary.mode === "klassenleraar") {
    return (
      <>
        <strong>{t("upload.classTeacherDetectedTitle")}</strong>
        <p>{t("upload.classTeacherDetectedHelp", {
          fileCount: uploadSummary.fileCount,
          classCode: uploadSummary.classCode,
        })}</p>
        <dl className="upload-summary-grid upload-summary-grid--class-teacher">
          <div>
            <dt>{t("detected.files")}</dt>
            <dd>{uploadSummary.fileCount}</dd>
          </div>
          <div>
            <dt>{t("detected.periods")}</dt>
            <dd>{uploadSummary.periods}</dd>
          </div>
          <div>
            <dt>{t("detected.students")}</dt>
            <dd>{uploadSummary.students}</dd>
          </div>
          <div>
            <dt>{t("detected.year")}</dt>
            <dd>{uploadSummary.year}</dd>
          </div>
          <div>
            <dt>{t("detected.track")}</dt>
            <dd>{uploadSummary.track}</dd>
          </div>
          <div>
            <dt>{t("detected.keySubjects")}</dt>
            <dd>{uploadSummary.keySubjects}</dd>
          </div>
        </dl>
      </>
    );
  }

  return (
    <>
      <strong>{t("upload.detectedTitle")}</strong>
      <p>{t("upload.detectedHelp", { fileName: uploadSummary.fileName })}</p>
      <dl className="upload-summary-grid">
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
    </>
  );
}

function ClassTeacherReviewScreen({
  c,
  status,
  reports,
  analyses,
  trackOverrides,
  subjectOverrides,
  onTrackChange,
  onPeriodChange,
  onSubjectChange,
  onConfirm,
}) {
  const blockingIssues = classTeacherBlockingIssues(analyses);
  const primaryAnalysis = analyses[0];
  const classesLabel = analyses.map((analysis) => analysis.classCode).join(", ");
  const periodLabel = analyses.map((analysis) => `${analysis.totals.periodCount}/${analysis.totals.expectedPeriodCount}`).join(", ");
  const studentCount = analyses.reduce((sum, analysis) => sum + analysis.totals.studentCount, 0);
  const polishNotices = analyses.flatMap((analysis) => classTeacherPolishNotices(analysis, c));

  return (
    <section className="workflow-screen class-teacher-review-screen">
      <FlowIndicator active="classTeacherReview" c={c} />
      <div className="screen-heading">
        <div>
          <p className="eyebrow">{t("upload.mode.klassenleraar")}</p>
          <h2>{c("classTeacherReviewTitle")}</h2>
          <p>{c("classTeacherReviewBody")}</p>
        </div>
        <Button type="button" onClick={onConfirm} disabled={Boolean(blockingIssues.length)}>
          <ArrowRight size={16} aria-hidden="true" />
          {c("classTeacherConfirmMapping")}
        </Button>
      </div>

      <div className="class-teacher-review-grid">
        <Card className="review-overview-card">
          <CardHeader>
            <div>
              <CardTitle>{classesLabel || t("option.notAvailable")}</CardTitle>
              <CardDescription>{status.text}</CardDescription>
            </div>
            <CardAction>
              <Badge variant={blockingIssues.length ? "warning" : "default"}>
                {blockingIssues.length ? c("classTeacherBlocked") : t("detected.ready")}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="detected-grid">
              <StatCard label={t("detected.files")} value={reports.length} compact />
              <StatCard label={t("detected.periods")} value={periodLabel} compact />
              <StatCard label={t("detected.students")} value={studentCount} compact />
              <StatCard label={t("detected.subject")} value={primaryAnalysis?.totals?.subjectCount || 0} compact />
            </div>
            {blockingIssues.length ? (
              <ul className="class-teacher-issue-list">
                {blockingIssues.map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
            ) : null}
            {polishNotices.length ? <ClassTeacherNoticeList notices={polishNotices} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("detected.track")}</CardTitle>
            <CardDescription>{c("classTeacherTrackHelp")}</CardDescription>
          </CardHeader>
          <CardContent className="class-teacher-stack">
            {analyses.map((analysis) => {
              const options = trackOptionsForYear(analysis.year);
              const selectedTrackId = trackOverrides[analysis.classCode] || analysis.track?.id || "";
              const selectedTrack = trackById(selectedTrackId) || analysis.track;
              return (
                <div className="track-review-row" key={analysis.classCode}>
                  <div>
                    <strong>{analysis.classCode}</strong>
                    <p>{t("detected.year")} {analysis.year || t("option.notAvailable")}</p>
                  </div>
                  <Select value={selectedTrackId} onChange={(event) => onTrackChange(analysis.classCode, event.target.value)}>
                    <option value="">{t("option.notAvailable")}</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </Select>
                  <div className="key-subject-list" aria-label={t("detected.keySubjects")}>
                    {(selectedTrack?.keySubjects || []).map((subject) => <Badge key={subject}>{subject}</Badge>)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="class-teacher-wide-card">
          <CardHeader>
            <CardTitle>{t("detected.files")}</CardTitle>
            <CardDescription>{t("review.tableHelp")}</CardDescription>
          </CardHeader>
          <CardContent className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("detected.classes")}</TableHead>
                  <TableHead>{t("detected.workbook")}</TableHead>
                  <TableHead>{t("detected.periods")}</TableHead>
                  <TableHead>{t("detected.students")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const periods = periodSchemaForYear(report.year)?.periods || [];
                  return (
                    <TableRow key={report.fileName}>
                      <TableCell>{report.classCode}</TableCell>
                      <TableCell>{report.fileName}</TableCell>
                      <TableCell>
                        <Select value={report.periodId || ""} onChange={(event) => onPeriodChange(report.fileName, event.target.value)}>
                          <option value="">{t("option.notAvailable")}</option>
                          {periods.map((period) => (
                            <option key={period.id} value={period.id}>{period.label}</option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>{report.totals.studentCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("detected.subject")}</CardTitle>
            <CardDescription>{c("classTeacherSubjectHelp")}</CardDescription>
          </CardHeader>
          <CardContent className="class-teacher-stack">
            {analyses.map((analysis) => {
              const unknownSubjects = analysis.subjects.filter((subject) => !subject.known);
              const subjectOptions = classTeacherSubjectOptions(analysis);
              if (!unknownSubjects.length) {
                return <p className="muted" key={analysis.classCode}>{analysis.classCode}: {t("review.suggestedEmpty")}</p>;
              }
              return unknownSubjects.slice(0, 8).map((subject) => (
                <div className="subject-alias-row" key={`${analysis.classCode}-${subject.subject}`}>
                  <div>
                    <strong>{subject.subject}</strong>
                    <p>{analysis.classCode}</p>
                  </div>
                  <Select
                    value={subjectOverrides[analysis.classCode]?.[subject.subject] || ""}
                    onChange={(event) => onSubjectChange(analysis.classCode, subject.subject, event.target.value)}
                  >
                    <option value="">{t("option.none")}</option>
                    {subjectOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </Select>
                </div>
              ));
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("detected.students")}</CardTitle>
            <CardDescription>{c("classTeacherStudentsHelp")}</CardDescription>
          </CardHeader>
          <CardContent className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("student.student")}</TableHead>
                  <TableHead>{t("detected.periods")}</TableHead>
                  <TableHead>{t("student.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(primaryAnalysis?.students || []).slice(0, 8).map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.periods.filter((period) => !period.missing).length}/{primaryAnalysis.periods.filter((period) => !period.missing).length}</TableCell>
                    <TableCell>{formatNumber(student.finalWeighted)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ClassTeacherNoticeList({ notices }) {
  if (!notices.length) return null;
  return (
    <div className="class-teacher-notice-list">
      {notices.map((notice) => (
        <div className="class-teacher-notice" key={notice.id}>
          <ShieldCheck size={17} aria-hidden="true" />
          <div>
            <strong>{notice.title}</strong>
            <p>{notice.body}</p>
          </div>
        </div>
      ))}
    </div>
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

function ClassTeacherGenerationScreen({ c, analysis, generationStep }) {
  const steps = [
    { key: "reports", title: c("classTeacherGeneratingReports"), body: `${analysis.totals.periodCount}/${analysis.totals.expectedPeriodCount} ${t("detected.periods").toLowerCase()}` },
    { key: "subjects", title: c("classTeacherGeneratingSubjects"), body: `${analysis.totals.subjectCount} ${t("detected.subject").toLowerCase()}` },
    { key: "cards", title: c("classTeacherGeneratingCards"), body: `${analysis.totals.studentCount} ${t("detected.students").toLowerCase()}` },
  ];

  return (
    <section className="workflow-screen generation-screen class-teacher-generation-screen">
      <FlowIndicator active="classTeacherGenerating" c={c} />
      <div className="generation-shell class-teacher-generation-shell">
        <div className="generation-copy">
          <p className="eyebrow">{t("upload.mode.klassenleraar")}</p>
          <h2>{c("classTeacherGeneratingTitle")}</h2>
          <p>{c("classTeacherGeneratingBody", {
            students: analysis.totals.studentCount,
            subjects: analysis.totals.subjectCount,
            periods: analysis.totals.periodCount,
          })}</p>
        </div>
        <div className="generation-steps" aria-live="polite">
          {steps.map((step, index) => {
            const isComplete = index < generationStep;
            const isActive = index === generationStep;
            return (
              <div key={step.key} className={cn("generation-step", isComplete && "is-complete", isActive && "is-active")}>
                <span>{isComplete ? "OK" : index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
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

function ClassTeacherDashboardScreen({
  c,
  analysis,
  anonymised,
  compactCards,
  notes,
  noteSaveStatus,
  onNoteChange,
  onScrollToStudent,
  onStartTour,
  onPrintStudent,
  printStudentId,
  onHistogramClick,
}) {
  const students = [...analysis.students].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const [dashboardFilters, setDashboardFilters] = useState({
    focus: "all",
    band: "all",
    subject: "all",
    sortKey: "name",
    sortDirection: "asc",
  });
  const subjectOptions = useMemo(() => unique((analysis.subjects || []).map((subject) => subject.subject)), [analysis.subjects]);
  const filteredStudents = useMemo(() => (
    sortClassTeacherStudents(filterClassTeacherStudents(students, dashboardFilters), dashboardFilters)
  ), [dashboardFilters, students]);
  const stats = analysis.stats || {};
  const mainSubjectDangerStudents = students.filter(classTeacherHasMainSubjectDanger);
  const keyRiskCount = stats.keyRiskCount || mainSubjectDangerStudents.length;
  const polishNotices = classTeacherPolishNotices(analysis, c);
  const updateDashboardFilters = (patch) => setDashboardFilters((current) => ({ ...current, ...patch }));

  return (
    <section className="workflow-screen dashboard-screen class-teacher-dashboard-screen">
      <FlowIndicator active="classTeacherDashboard" c={c} />
      <div className="dashboard-header">
        <div className="screen-heading">
          <div>
            <p className="eyebrow">{t("upload.mode.klassenleraar")}</p>
            <h2>{c("classTeacherDashboardTitle")}: {analysis.classCode}</h2>
            <p>{c("classTeacherDashboardBody")}</p>
          </div>
          <Badge variant="secondary">{analysis.track?.label || t("option.notAvailable")}</Badge>
        </div>

        <div className="stats-grid">
          <StatCard label={t("detected.students")} value={stats.count || students.length} />
          <StatCard label={t("dashboard.classAverage")} value={`${formatNumber(stats.mean)}%`} />
          <StatCard label={c("classTeacherMainSubjectDanger")} value={keyRiskCount} />
          <StatCard label={c("classTeacherVisibleStudents")} value={filteredStudents.length} />
        </div>

        {polishNotices.length ? <ClassTeacherNoticeList notices={polishNotices} /> : null}

        <ClassTeacherDashboardFilters
          c={c}
          filters={dashboardFilters}
          subjectOptions={subjectOptions}
          counts={{
            all: students.length,
            mainSubjectDanger: mainSubjectDangerStudents.length,
            below65: students.filter((student) => Number.isFinite(student.finalWeighted) && student.finalWeighted < 65).length,
            positive: students.filter((student) => student.flags?.some((flag) => flag.type === "positive_stable_profile")).length,
          }}
          onChange={updateDashboardFilters}
        />
      </div>

      <div className="overview-grid">
        <Card className="chart-panel">
          <CardHeader>
            <CardTitle>Histogram</CardTitle>
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
            <ClassTeacherStudentTable
              c={c}
              students={filteredStudents}
              anonymised={anonymised}
              filters={dashboardFilters}
              onFiltersChange={updateDashboardFilters}
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
      </div>

      <div className={cn("student-cards", "class-teacher-student-cards", compactCards && "student-cards--compact")}>
        {filteredStudents.length ? filteredStudents.map((student, index) => (
          <ClassTeacherStudentCard
            key={student.id}
            c={c}
            student={student}
            analysis={analysis}
            peers={filteredStudents}
            anonymised={anonymised}
            displayIndex={index}
            compact={compactCards}
            note={notes[student.id] || ""}
            noteStatus={noteSaveStatus[student.id] || "idle"}
            onNoteChange={onNoteChange}
            onScrollToStudent={onScrollToStudent}
            onStartTour={onStartTour}
            onPrintStudent={onPrintStudent}
            isPrintTarget={printStudentId === student.id}
          />
        )) : <EmptyState />}
      </div>
    </section>
  );
}

function ClassTeacherDashboardFilters({ c, filters, subjectOptions, counts, onChange }) {
  const focusItems = [
    { id: "all", label: c("classTeacherFilterAll"), count: counts.all },
    { id: "mainSubjectDanger", label: c("classTeacherShowMainSubjectDanger"), count: counts.mainSubjectDanger },
    { id: "below65", label: c("classTeacherBelow65"), count: counts.below65 },
    { id: "positive", label: c("classTeacherPositiveProfiles"), count: counts.positive },
  ];
  return (
    <div className="class-teacher-dashboard-filters" aria-label={t("filter.label")}>
      <div className="class-teacher-quick-filters">
        {focusItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn("quick-filter-pill", filters.focus === item.id && "is-active")}
            onClick={() => onChange({ focus: item.id })}
          >
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </button>
        ))}
      </div>
      <div className="filters">
        <Select value={filters.band} onChange={(event) => onChange({ band: event.target.value })} aria-label={t("filter.allBands")}>
          <option value="all">{t("filter.allBands")}</option>
          {THRESHOLD_BANDS.map((band) => (
            <option key={band.id} value={band.id}>{t(`band.${band.id}`)}</option>
          ))}
        </Select>
        <Select value={filters.subject} onChange={(event) => onChange({ subject: event.target.value })} aria-label={c("classTeacherSubjectFilter")}>
          <option value="all">{c("classTeacherSubjectFilter")}</option>
          {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
        </Select>
        <Button variant="outline" type="button" onClick={() => onChange({ focus: "all", band: "all", subject: "all" })}>
          {t("filter.clear")}
        </Button>
      </div>
    </div>
  );
}

function ClassTeacherStudentTable({ c, students, anonymised, filters, onFiltersChange, onOpen }) {
  return (
    <Table className="student-table class-teacher-student-table">
      <TableHeader>
        <TableRow>
          <SortHeader field="name" label={t("student.student")} filters={filters} onFiltersChange={onFiltersChange} />
          <SortHeader field="total" label={t("student.total")} filters={filters} onFiltersChange={onFiltersChange} align="right" />
          <SortHeader field="trend" label={t("student.trend")} filters={filters} onFiltersChange={onFiltersChange} />
          <SortHeader field="mainSubjectDanger" label={c("classTeacherMainSubjectDanger")} filters={filters} onFiltersChange={onFiltersChange} />
          <SortHeader field="flags" label={c("visibleAdvice")} filters={filters} onFiltersChange={onFiltersChange} align="right" className="class-teacher-interesting-column" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student, index) => (
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
            <TableCell className="table-cell-numeric">{formatGrade(student.finalWeighted)}</TableCell>
            <TableCell>{translateTrend(student.overallTrend?.direction || "insufficient")}</TableCell>
            <TableCell>{classTeacherMainSubjectDangerLabel(student, c)}</TableCell>
            <TableCell className="table-cell-numeric class-teacher-interesting-column">{student.flags?.length || 0}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ClassTeacherStudentCard({
  c,
  student,
  analysis,
  peers,
  anonymised,
  displayIndex,
  compact,
  note,
  noteStatus,
  onNoteChange,
  onScrollToStudent,
  onStartTour,
  onPrintStudent,
  isPrintTarget,
}) {
  const displayName = anonymised ? t("student.anonymous", { number: String(displayIndex + 1).padStart(2, "0") }) : student.name;
  const peerIndex = peers.findIndex((peer) => peer.id === student.id);
  const previousPeer = peerIndex > 0 ? peers[peerIndex - 1] : null;
  const nextPeer = peerIndex >= 0 && peerIndex < peers.length - 1 ? peers[peerIndex + 1] : null;
  const defaultSubjects = classTeacherDefaultSubjects(student);
  const [selectedSubjects, setSelectedSubjects] = useState(defaultSubjects);
  const [scaleMode, setScaleMode] = useState("full");
  const visibleSubjects = normaliseSelectedClassTeacherSubjects(student, selectedSubjects);
  const summary = classTeacherStudentSummary(student, c);
  const detailFlags = classTeacherDetailFlags(student);

  function toggleSubject(subject) {
    setSelectedSubjects((current) => {
      if (current.includes(subject)) return current.filter((item) => item !== subject);
      return [...current, subject];
    });
  }

  function showKeySubjects() {
    setSelectedSubjects(classTeacherDefaultSubjects(student, true));
  }

  function showAllSubjects() {
    setSelectedSubjects((student.subjectLines || []).map((line) => line.subject));
  }

  return (
    <Card className={cn("student-card", "class-teacher-student-card", compact && "student-card--compact", isPrintTarget && "is-print-target")} id={`student-card-${student.id}`} data-student-id={student.id}>
      <CardHeader className="student-card-header" data-tour-part="total">
        <div>
          <CardTitle className="student-title">{displayName}</CardTitle>
          <div className="student-meta">
            <Badge variant="outline">{student.classCode}</Badge>
            <Badge variant="outline">{analysis.track?.label || t("option.notAvailable")}</Badge>
            <Badge variant="secondary">{formatGrade(student.finalWeighted)}</Badge>
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
          <div className={cn("grade-badge", student.thresholdBand?.className)}>{formatGrade(student.finalWeighted)}</div>
        </CardAction>
      </CardHeader>

      <CardContent>
        <section className="card-section card-section--graph class-teacher-lines-section" data-tour-part="graph">
          <div className="section-row graph-section-heading">
            <h4>{t("student.visualContext")}</h4>
            <div className="class-teacher-scale-toggle" aria-label={t("chart.yearTrend")}>
              <Button variant={scaleMode === "full" ? "default" : "outline"} size="sm" type="button" onClick={() => setScaleMode("full")}>{c("classTeacherScaleFull")}</Button>
              <Button variant={scaleMode === "zoom" ? "default" : "outline"} size="sm" type="button" onClick={() => setScaleMode("zoom")}>{c("classTeacherScaleZoom")}</Button>
            </div>
          </div>
          <ClassTeacherSubjectPicker
            c={c}
            student={student}
            selectedSubjects={visibleSubjects}
            onToggle={toggleSubject}
            onKeySubjects={showKeySubjects}
            onAllSubjects={showAllSubjects}
          />
          <p className="class-teacher-graph-hint">{c("classTeacherGraphHint")}</p>
          <ClassTeacherLinesChart c={c} student={student} periods={analysis.periods} selectedSubjects={visibleSubjects} scaleMode={scaleMode} />
        </section>

        <section className="card-section card-section--summary" data-tour-part="advice">
          <div className="advice-summary">
            <strong>{t("advice.summaryTitle")}</strong>
            <p>{summary.title}</p>
            <p>{summary.body}</p>
          </div>
          {detailFlags.length ? (
            <div className="flag-detail-list">
              {detailFlags.map((flag, index) => (
                <div className="flag-detail-row" key={`${flag.type}-${index}`}>
                  <Badge variant={classTeacherFlagVariant(flag.tone)}>{flag.label}</Badge>
                  <p>{flag.detail}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="card-section class-teacher-subject-matrix" data-tour-part="table">
          <div className="section-row">
            <h4>{c("classTeacherSubjectMatrix")}</h4>
            <span>{analysis.track?.label || ""}</span>
          </div>
          <ClassTeacherSubjectMatrix c={c} student={student} periods={analysis.periods} />
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
      </CardContent>
    </Card>
  );
}

function ClassTeacherSubjectPicker({ c, student, selectedSubjects, onToggle, onKeySubjects, onAllSubjects }) {
  const subjects = student.subjectLines || [];
  return (
    <details className="class-teacher-subject-picker">
      <summary>
        <span>{c("classTeacherSubjectPicker")}</span>
        <Badge>{selectedSubjects.length}</Badge>
      </summary>
      <div className="class-teacher-subject-picker-body">
        <div className="subject-picker-actions">
          <Button variant="outline" size="sm" type="button" onClick={onKeySubjects}>{c("classTeacherKeySubjectsOnly")}</Button>
          <Button variant="outline" size="sm" type="button" onClick={onAllSubjects}>{c("classTeacherAllSubjects")}</Button>
        </div>
        <div className="subject-checkbox-grid">
          {subjects.map((line) => (
            <label key={line.subject} className={cn("subject-checkbox", line.isKeySubject && "is-key-subject")}>
              <input type="checkbox" checked={selectedSubjects.includes(line.subject)} onChange={() => onToggle(line.subject)} />
              <span>{line.subject}</span>
              {line.isKeySubject ? <small>{c("classTeacherKeySubject")}</small> : null}
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

function ClassTeacherLinesChart({ c, student, periods, selectedSubjects, scaleMode = "full" }) {
  const width = 760;
  const height = 252;
  const left = 48;
  const right = 24;
  const top = 28;
  const bottom = 194;
  const axisWidth = width - left - right;
  const periodList = periods || [];
  const xForIndex = (index) => left + (periodList.length <= 1 ? 0 : (index / (periodList.length - 1)) * axisWidth);
  const subjectLines = (student.subjectLines || []).filter((line) => selectedSubjects.includes(line.subject));
  const overallPoints = (student.overallTrend?.points || []).map((point) => ({
    subject: c("classTeacherOverallLine"),
    periodId: point.periodId,
    periodLabel: point.periodLabel,
    value: point.value,
    isOverall: true,
  }));
  const chartValues = [
    ...overallPoints.map((point) => point.value),
    ...subjectLines.flatMap((line) => (line.points || []).map((point) => point.value)),
  ].filter(Number.isFinite);
  const domain = classTeacherChartDomain(chartValues, scaleMode);
  const axisHeight = bottom - top;
  const yFor = (value) => bottom - ((clamp(value, domain.min, domain.max) - domain.min) / (domain.max - domain.min)) * axisHeight;
  const axisTicks = classTeacherAxisTicks(domain);
  const trendLine = classTeacherOverallTrendLine(overallPoints, periodList);

  return (
    <figure className="class-teacher-lines-chart">
      <svg className="chart-svg chart-svg--interactive" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("chart.yearTrend")}>
        <line x1={left} y1={top} x2={left} y2={bottom} stroke="var(--chart-axis)" />
        <line x1={left} y1={bottom} x2={width - right} y2={bottom} stroke="var(--chart-axis)" />
        {axisTicks.map((value) => (
          <g key={value}>
            <line x1={left - 4} y1={yFor(value)} x2={width - right} y2={yFor(value)} stroke="var(--chart-grid)" />
            <text x="10" y={yFor(value) + 4}>{formatNumber(value)}%</text>
          </g>
        ))}
        {periodList.map((period, index) => (
          <g key={period.id}>
            <line className="class-teacher-period-line" x1={xForIndex(index)} y1={top} x2={xForIndex(index)} y2={bottom} />
            <text className="axis-label" x={xForIndex(index)} y={bottom + 28} textAnchor="middle">{shortLabel(period.label, 16)}</text>
          </g>
        ))}
        {trendLine ? (
          <line
            className="class-teacher-overall-trendline"
            x1={xForIndex(trendLine.startX)}
            y1={yFor(trendLine.start)}
            x2={xForIndex(trendLine.endX)}
            y2={yFor(trendLine.end)}
          />
        ) : null}
        {subjectLines.map((line, index) => (
          <ClassTeacherLinePath
            key={line.subject}
            line={line}
            periods={periodList}
            color={CLASS_TEACHER_LINE_COLORS[index % CLASS_TEACHER_LINE_COLORS.length]}
            xForIndex={xForIndex}
            yFor={yFor}
            muted
          />
        ))}
        <ClassTeacherLinePath
          line={{ subject: c("classTeacherOverallLine"), points: overallPoints }}
          periods={periodList}
          color="#5200FF"
          xForIndex={xForIndex}
          yFor={yFor}
          overall
        />
      </svg>
      <figcaption className="class-teacher-chart-legend">
        <span><i style={{ background: "#5200FF" }} />{c("classTeacherOverallLine")}</span>
        <span><i />{selectedSubjects.length} {c("classTeacherSubjectLines").toLowerCase()}</span>
      </figcaption>
    </figure>
  );
}

function ClassTeacherLinePath({ line, periods, color, xForIndex, yFor, overall = false, muted = false }) {
  const points = periods.map((period, index) => {
    const point = (line.points || []).find((item) => item.periodId === period.id);
    return {
      ...point,
      index,
      periodLabel: point?.periodLabel || period.label,
      value: point?.value,
    };
  }).filter((point) => Number.isFinite(point.value));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xForIndex(point.index)} ${yFor(point.value)}`).join(" ");
  if (!points.length) return null;
  return (
    <g className={cn("class-teacher-line-group", overall && "is-overall", muted && "is-muted-line")}>
      {points.length > 1 ? <path d={path} fill="none" stroke={color} /> : null}
      {points.map((point) => {
        const x = xForIndex(point.index);
        const y = yFor(point.value);
        const label = `${line.subject} - ${point.periodLabel}: ${formatNumber(point.value)}%`;
        return (
          <g
            key={`${line.subject}-${point.periodId}`}
            className="class-teacher-line-dot"
            transform={`translate(${x}, ${y})`}
            tabIndex={0}
            aria-label={label}
          >
            <text className="chart-svg-tooltip class-teacher-line-label" x="0" y="-14" textAnchor="middle">
              {shortLabel(`${line.subject}: ${formatNumber(point.value)}%`, 34)}
            </text>
            <title>{label}</title>
            <circle cx="0" cy="0" r={overall ? 6 : 4.5} fill={color} />
          </g>
        );
      })}
    </g>
  );
}

function ClassTeacherSubjectMatrix({ c, student, periods }) {
  const periodIds = (periods || []).map((period) => period.id);
  return (
    <div className="table-scroll">
      <Table className="class-teacher-subject-matrix-table">
        <TableHeader>
          <TableRow>
            <TableHead>{t("detected.subject")}</TableHead>
            {periods.map((period) => <TableHead key={period.id}>{shortLabel(period.label, 12)}</TableHead>)}
            <TableHead>{t("student.total")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(student.subjectLines || []).map((line) => (
            <TableRow key={line.subject} className={line.isKeySubject ? "is-key-subject-row" : ""}>
              <TableCell>
                <strong>{line.subject}</strong>
                {line.isKeySubject ? <small>{c("classTeacherKeySubject")}</small> : null}
              </TableCell>
              {periodIds.map((periodId) => {
                const point = line.points.find((item) => item.periodId === periodId);
                return <TableCell key={periodId}>{Number.isFinite(point?.value) ? `${formatNumber(point.value)}%` : t("option.notAvailable")}</TableCell>;
              })}
              <TableCell>{Number.isFinite(line.yearScore) ? `${formatNumber(line.yearScore)}%` : formatGrade(line.latestScore)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
  const steps = active === "classTeacherReview" || active === "classTeacherGenerating" || active === "classTeacherDashboard"
    ? [
        ["upload", c("uploadFlow")],
        ["classTeacherReview", c("classTeacherReviewFlow")],
        ["classTeacherGenerating", c("classTeacherGenerateFlow")],
        ["classTeacherDashboard", c("dashboardFlow")],
      ]
    : [
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
          <section className="card-section compact-detail-section">
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
                  <div className="score-table-tour-target" data-tour-part="table">
                    <ScoreTable rows={student.categoryRows} />
                  </div>
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
  const nextStep = mainFlag ? pedagogicalNextStep(student.flags) : "";
  return (
    <div className="advice-summary">
      <strong>{t("advice.summaryTitle")}</strong>
      <p>{mainFlag ? mainFlag.label : t("advice.noSignal")}</p>
      {nextStep ? <p>{nextStep}</p> : null}
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
                {formatNumber(point.value)}%
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

function StudentTourOverlay({ c, mode = "vakdocent", activeTour, onChange, onClose, onComplete }) {
  const [rect, setRect] = useState(null);
  const steps = cardTourStepsForMode(mode);
  const step = activeTour ? steps[activeTour.step] : null;

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

  const isLast = activeTour.step >= steps.length - 1;
  const tourEyebrow = mode === "klassenleraar"
    ? c("classTeacherTourEyebrow")
    : t("tour.title", { student: "" }).replace(":", "").trim();
  const tourTitle = step.copy ? c(step.titleKey) : t(step.titleKey);
  const tourBody = step.copy ? c(step.bodyKey) : t(step.bodyKey);
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
            <p className="eyebrow">{tourEyebrow}</p>
            <span>{t("tour.stepProgress", { current: activeTour.step + 1, total: steps.length })}</span>
          </div>
          <h3 id="tour-title">{tourTitle}</h3>
          <p>{tourBody}</p>
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

function classTeacherChartDomain(values, scaleMode) {
  const clean = values.filter(Number.isFinite);
  if (scaleMode !== "zoom" || clean.length < 2) return { min: 0, max: 100 };
  let min = Math.max(0, Math.floor((Math.min(...clean) - 5) / 5) * 5);
  let max = Math.min(100, Math.ceil((Math.max(...clean) + 5) / 5) * 5);
  if (max - min < 20) {
    const center = (min + max) / 2;
    min = Math.max(0, Math.floor((center - 10) / 5) * 5);
    max = Math.min(100, Math.ceil((center + 10) / 5) * 5);
  }
  if (max <= min) return { min: 0, max: 100 };
  return { min, max };
}

function classTeacherAxisTicks(domain) {
  const step = (domain.max - domain.min) / 4;
  return Array.from({ length: 5 }, (_, index) => Math.round((domain.min + step * index) * 10) / 10);
}

function classTeacherOverallTrendLine(points = [], periods = []) {
  const available = points
    .map((point) => ({
      x: periods.findIndex((period) => period.id === point.periodId),
      value: point.value,
    }))
    .filter((point) => point.x >= 0 && Number.isFinite(point.value));
  if (available.length < 2) return null;
  const meanX = available.reduce((sum, point) => sum + point.x, 0) / available.length;
  const meanY = available.reduce((sum, point) => sum + point.value, 0) / available.length;
  const denominator = available.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (!denominator) return null;
  const slope = available.reduce((sum, point) => sum + (point.x - meanX) * (point.value - meanY), 0) / denominator;
  const intercept = meanY - slope * meanX;
  const startX = available[0].x;
  const endX = available[available.length - 1].x;
  return {
    startX,
    endX,
    start: intercept + slope * startX,
    end: intercept + slope * endX,
  };
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
  return "";
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
