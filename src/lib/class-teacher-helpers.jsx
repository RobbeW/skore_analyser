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
import { applySchoolWeightsToAggregation } from "../../js/school-weights.js";
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
import { formatNumber, unique, withAnonymousNumbers } from "./app-helpers.jsx";

export function buildClassTeacherUploadSummary(files, analyses) {
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
    periods: analyses.map((analysis) => formatPeriodCount(analysis.totals)).join(", "),
    year: years.join(", ") || t("option.notAvailable"),
    track: tracks.join(", ") || t("option.notAvailable"),
    keySubjects,
    warnings: warningCodes,
  };
}

export function buildClassTeacherProjectPayload(reports, analyses, notes = {}, trackOverrides = {}, subjectOverrides = {}, decisions = {}, subjectFeedback = {}) {
  const primary = analyses[0] || {};
  return {
    mode: "klassenleraar",
    exportedAt: new Date().toISOString(),
    privacy: t("export.privacy"),
    classTeacherReports: reports,
    classTeacherTrackOverrides: trackOverrides,
    classTeacherSubjectOverrides: subjectOverrides,
    teacherNotes: notes,
    teacherDecisions: decisions,
    subjectFeedback,
    analysis: primary,
  };
}

export function calculateClassTeacherAnalysesFromReports(reports = [], trackOverrides = {}, subjectOverrides = {}) {
  const mappedReports = reports.map((report) => applyClassTeacherSubjectOverridesToReport(
    report,
    subjectOverrides[report.classCode] || {},
  ));
  return aggregateClassTeacherReportGroups(mappedReports).map((aggregation) => {
    const selectedTrack = trackById(trackOverrides[aggregation.classCode]) || aggregation.track;
    const withTrack = applyClassTeacherTrackToAggregation(aggregation, selectedTrack);
    // Reports without an algemeen totaal: use the school weights for this year and track when known.
    const weighted = applySchoolWeightsToAggregation(withTrack, { year: withTrack.year, trackId: withTrack.track?.id });
    return withAnonymousNumbers(calculateClassTeacherAnalysis(weighted));
  });
}

export function applyClassTeacherSubjectOverridesToReport(report, overrides = {}) {
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

export function applyClassTeacherTrackToAggregation(aggregation, track) {
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

/** Compact period name for table headers and chart axes: "Dagelijks werk 2" → "DW2", "Klassenraad 1" → "KR1". */
export function periodShortLabel(period) {
  return String(period?.label || "")
    .replace(/^dagelijks\s*werk\s*/i, "DW")
    .replace(/^klassenraad\s*/i, "KR")
    .replace(/^semester\s*2 voorlopig resultaat$/i, "Sem 2 (voorl.)")
    .replace(/^semester\s*/i, "Sem ");
}

/** Only the reports that were actually uploaded (future periods would be empty columns). */
export function loadedPeriods(analysis) {
  const periods = analysis?.periods || [];
  const loaded = periods.filter((period) => !period.missing);
  return loaded.length ? loaded : periods;
}

/** "2/4" for semester/year reports; interim reports (Dagelijks werk) are counted separately. */
export function formatPeriodCount(totals = {}) {
  const interim = totals.interimPeriodCount || 0;
  const required = totals.requiredPeriodCount ?? totals.periodCount ?? 0;
  const expected = totals.expectedPeriodCount || 0;
  const main = expected ? `${required}/${expected}` : String(required);
  return interim ? `${main} + ${interim} tussentijds` : main;
}

export function classTeacherBlockingIssues(analyses = []) {
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

export function classTeacherPolishNotices(analysis, c) {
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
  const required = analysis.totals?.requiredPeriodCount ?? analysis.totals?.periodCount ?? 0;
  const loaded = (analysis.periods || []).filter((period) => !period.missing).map((period) => period.label);
  if (expected && required < expected) {
    notices.push({
      id: "missing-period",
      title: c("classTeacherMissingPeriodTitle"),
      body: c("classTeacherInterimBody", { count: loaded.length, labels: loaded.join(", ") }),
    });
  }
  if ((analysis.sourceReports || []).some((report) => report.overallEstimated)) {
    notices.push(analysis.schoolWeights
      ? {
          id: "weighted-overall",
          title: c("classTeacherWeightedOverallTitle"),
          body: c(analysis.schoolWeightsBasis === "dw" ? "classTeacherWeightedOverallDwBody" : "classTeacherWeightedOverallBody", { track: analysis.schoolWeights.trackCode, period: analysis.schoolWeights.period }),
        }
      : {
          id: "estimated-overall",
          title: c("classTeacherEstimatedOverallTitle"),
          body: c("classTeacherEstimatedOverallBody"),
        });
  }
  return notices;
}

export function classTeacherSubjectOptions(analysis) {
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

export function classTeacherDefaultSubjects(student, onlyKeySubjects = false) {
  const lines = student.subjectLines || [];
  const keySubjects = lines.filter((line) => line.isKeySubject).map((line) => line.subject);
  if (keySubjects.length) return keySubjects.slice(0, onlyKeySubjects ? keySubjects.length : 7);
  return lines.slice(0, onlyKeySubjects ? 0 : 6).map((line) => line.subject);
}

export function normaliseSelectedClassTeacherSubjects(student, selectedSubjects = []) {
  const available = new Set((student.subjectLines || []).map((line) => line.subject));
  return selectedSubjects.filter((subject) => available.has(subject));
}

export function classTeacherFlagVariant(tone) {
  if (tone === "critical") return "destructive";
  if (tone === "caution" || tone === "warning") return "warning";
  if (tone === "positive") return "success";
  return "secondary";
}

export function filterClassTeacherStudents(students = [], filters = {}) {
  return students.filter((student) => {
    if (filters.focus === "mainSubjectDanger" && !classTeacherHasMainSubjectDanger(student)) return false;
    if (filters.focus === "below65" && (!Number.isFinite(student.finalWeighted) || student.finalWeighted >= 65)) return false;
    if (filters.focus === "positive" && !student.flags?.some((flag) => flag.type === "positive_stable_profile")) return false;
    if (filters.band && filters.band !== "all" && student.thresholdBand?.id !== filters.band) return false;
    if (filters.subject && filters.subject !== "all" && !student.subjectLines?.some((line) => line.subject === filters.subject && Number.isFinite(scoreForClassTeacherLine(line)))) return false;
    return true;
  });
}

export function sortClassTeacherStudents(students = [], filters = {}) {
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

export function classTeacherHasMainSubjectDanger(student) {
  return classTeacherDangerSubjects(student).length > 0
    || student.flags?.some((flag) => ["key_subject_critical", "multiple_key_subjects_weak", "track_mismatch_signal"].includes(flag.type));
}

export function classTeacherDangerSubjects(student) {
  const bySubject = new Map();
  for (const item of student.keySubjectSummary?.below60 || []) bySubject.set(item.subject, item.score);
  for (const item of student.keySubjectSummary?.below50 || []) bySubject.set(item.subject, item.score);
  return Array.from(bySubject.entries())
    .map(([subject, score]) => ({ subject, score }))
    .sort((a, b) => a.score - b.score || a.subject.localeCompare(b.subject, undefined, { numeric: true }));
}

export function classTeacherMainSubjectDangerLabel(student, c) {
  const dangerSubjects = classTeacherDangerSubjects(student);
  if (!dangerSubjects.length) return c("classTeacherNoMainSubjectDanger");
  const visible = dangerSubjects.slice(0, 3).map((item) => `${item.subject} ${formatNumber(item.score)}%`).join(", ");
  return dangerSubjects.length > 3 ? `${visible} +${dangerSubjects.length - 3}` : visible;
}

export function classTeacherSubjectAlarmLists(student) {
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

export function classTeacherStudentSummary(student, c) {
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

export function classTeacherDetailFlags(student) {
  const summaryTypes = new Set([
    "key_subject_critical",
    "multiple_key_subjects_weak",
    "track_mismatch_signal",
  ]);
  return (student.flags || []).filter((flag) => !summaryTypes.has(flag.type));
}

export function scoreForClassTeacherLine(line) {
  return Number.isFinite(line?.yearScore) ? line.yearScore : line?.latestScore;
}

export function numericSortValue(value) {
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}
