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

import { readXlsxWorkbook } from "../../js/xlsx-reader.js";
import { buildDefaultConfig, parseSkoreWorkbook } from "../../js/skore-parser.js";
import { parseClassTeacherReportWorkbook } from "../../js/class-teacher-parser.js";
import { aggregateClassTeacherReportGroups } from "../../js/class-teacher-aggregator.js";
import { calculateClassTeacherAnalysis } from "../../js/class-teacher-calculator.js";
import { periodSchemaForYear, trackById, trackOptionsForYear } from "../../js/class-teacher-config.js";
import { calculateAnalysis, summariseStudents } from "../../js/calculator.js";
import { THRESHOLD_BANDS, thresholdBand } from "../../js/config.js";
import { getLanguage, setLanguage, t, translateTrend } from "../../js/i18n.js";
import { buildProjectPayload, exportJsonPayload, exportProjectJson } from "../../js/exporter.js";
import { hydrateProjectPayload } from "../../js/project-importer.js";
import {
  appendSuggestionToNote,
  generateClassTeacherNoteSuggestion,
  generateSubjectTeacherNoteSuggestion,
} from "../../js/note-guidance.js";
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
} from "../../js/storage.js";


export const BASKET_PRESETS = {
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

export const DEFAULT_BASKET_PRESET = "grade2_iw";
export const LOW_EVIDENCE_POINTS_COVERAGE = 0.6;
export const LOW_EVIDENCE_CLASS_GAP = 0.25;
export const ASSIGNMENT_USAGE_OPTIONS = ["include", "displayOnly", "exclude"];
export const SCHOOL_YEAR_MONTHS = [
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
export const SCHOOL_YEAR_DOMAIN_END = SCHOOL_YEAR_MONTHS.length;
export const CLASS_TEACHER_LINE_COLORS = [
  "#006394",
  "#2E8B57",
  "#B07A00",
  "#7A4FA0",
  "#0F8A8A",
  "#8C5A3C",
  "#4F6D8A",
  "#A0527A",
  "#5B7F2A",
  "#3E5C76",
];
export const GENERATION_STEPS = [
  { key: "file", titleKey: "generation.fileTitle", bodyKey: "generation.fileBody" },
  { key: "weights", titleKey: "generation.weightsTitle", bodyKey: "generation.weightsBody" },
  { key: "cards", titleKey: "generation.cardsTitle", bodyKey: "generation.cardsBody" },
];
export const DEFAULT_OPEN_CARD_SECTIONS = {
  duiding: false,
  contextCharts: true,
  score: false,
  comments: true,
};

export const CARD_TOUR_STEPS = [
  { part: "total", titleKey: "tour.totalTitle", bodyKey: "tour.totalBody" },
  { part: "table", titleKey: "tour.tableTitle", bodyKey: "tour.tableBody" },
  { part: "graph", titleKey: "tour.graphTitle", bodyKey: "tour.graphBody" },
  { part: "advice", titleKey: "tour.adviceTitle", bodyKey: "tour.adviceBody" },
  { part: "notes", titleKey: "tour.notesTitle", bodyKey: "tour.notesBody" },
];
export const CLASS_TEACHER_CARD_TOUR_STEPS = [
  { part: "total", titleKey: "classTeacherTourTotalTitle", bodyKey: "classTeacherTourTotalBody", copy: true },
  { part: "graph", titleKey: "classTeacherTourGraphTitle", bodyKey: "classTeacherTourGraphBody", copy: true },
  { part: "advice", titleKey: "classTeacherTourSummaryTitle", bodyKey: "classTeacherTourSummaryBody", copy: true },
  { part: "table", titleKey: "classTeacherTourTableTitle", bodyKey: "classTeacherTourTableBody", copy: true },
  { part: "notes", titleKey: "classTeacherTourNotesTitle", bodyKey: "classTeacherTourNotesBody", copy: true },
];
export const TOUR_REQUIRED_SECTIONS = {
  table: "score",
};
export const APP_MODES = ["vakdocent", "klassenleraar"];

export function cardTourStepsForMode(mode) {
  return mode === "klassenleraar" ? CLASS_TEACHER_CARD_TOUR_STEPS : CARD_TOUR_STEPS;
}

export const FALLBACK_COPY = {
  nl: {
    localFirst: "Alles blijft lokaal in deze browser.",
    processing: "Bestand lokaal verwerken...",
    parsed: "Bestand herkend. Controleer eerst welke evaluaties meetellen.",
    classTeacherProcessing: "Rapportbestanden lokaal verwerken...",
    classTeacherParsed: "Klasrapporten herkend. De mappingcontrole volgt in de volgende stap.",
    classTeacherFileCountWarning: "Kies 1 tot 4 rapportbestanden van dezelfde klas.",
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
    classTeacherNoSubjectLines: "Geen vaklijnen",
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
    classTeacherMissingPeriodTitle: "Tussentijdse klassenraad",
    classTeacherMissingPeriodBody: "{available} van {expected} rapporten zijn ingelezen. Dat is normaal in de loop van het schooljaar: trends en jaarsignalen verschijnen zodra er meer rapporten zijn.",
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
    roleHelpKlassenleraar: "1 tot 4 rapportbestanden van één klas, ook halverwege het jaar.",
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
    classTeacherFileCountWarning: "Choose 1 to 4 report files from the same class.",
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
    classTeacherNoSubjectLines: "No subject lines",
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
    classTeacherMissingPeriodTitle: "Mid-year class council",
    classTeacherMissingPeriodBody: "{available} of {expected} reports are loaded. That is normal during the school year: trends and year signals appear once more reports are available.",
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
    roleHelpKlassenleraar: "1 to 4 report files from one class, also mid-year.",
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

export const defaultFilters = () => ({
  classCode: "all",
  band: "all",
  flag: "all",
  sortKey: "name",
  sortDirection: "asc",
  threshold: 50,
});
