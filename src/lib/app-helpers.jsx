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
import { ASSIGNMENT_USAGE_OPTIONS, BASKET_PRESETS, DEFAULT_BASKET_PRESET, LOW_EVIDENCE_CLASS_GAP, LOW_EVIDENCE_POINTS_COVERAGE, SCHOOL_YEAR_DOMAIN_END, defaultFilters } from "./app-constants.jsx";
import { schoolBasketPreset } from "../../js/school-weights.js";

export function createInitialConfig(model, preferences = {}) {
  const base = buildDefaultConfig(model);
  const subjectKey = preferenceSubjectKey(base.subject || model.subjects?.[0]?.value || "subject");
  const preferredPreset = preferences.lastBasketPresetBySubject?.[subjectKey];
  // School weights win when they are known for this class and subject (grade 1 for now).
  const schoolPreset = schoolBasketPreset({
    classCode: model.classes?.[0]?.value || model.fileName,
    subject: base.subject || model.subjects?.[0]?.value || "",
  });
  const basketPreset = schoolPreset ? "school" : BASKET_PRESETS[preferredPreset] ? preferredPreset : suggestBasketPreset(model);
  const preset = schoolPreset || BASKET_PRESETS[basketPreset] || BASKET_PRESETS[DEFAULT_BASKET_PRESET];
  return {
    ...base,
    basketPreset,
    schoolPreset,
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

export function preferenceSubjectKey(value) {
  return String(value || "subject").trim().toLowerCase() || "subject";
}

export function preferredClassCode(model, preferences = {}) {
  const preferred = preferences.lastClassCode;
  if (!preferred || preferred === "all") return "all";
  const classes = new Set((model.classes || []).map((entry) => entry.value));
  return classes.has(preferred) ? preferred : "all";
}

export function assignmentUsage(override = {}) {
  if (ASSIGNMENT_USAGE_OPTIONS.includes(override.usage)) return override.usage;
  return override.active === false ? "exclude" : "include";
}

export function assignmentUsagePatch(usage, override = {}) {
  const nextUsage = ASSIGNMENT_USAGE_OPTIONS.includes(usage) ? usage : "include";
  return {
    ...override,
    usage: nextUsage,
    active: nextUsage !== "exclude",
    required: nextUsage === "include",
  };
}

export function assignmentUsageCounts(assignments = [], config = {}) {
  return assignments.reduce((counts, assignment) => {
    const usage = assignmentUsage(config.assignments?.[assignment.id] || {});
    counts[usage] += 1;
    return counts;
  }, { include: 0, displayOnly: 0, exclude: 0 });
}

export function reviewSuggestionItems(assignments = []) {
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

/** The active basket preset: the school preset or one of the built-in examples. */
export function presetForConfig(config = {}, name = config.basketPreset) {
  if (name === "school" && config.schoolPreset) return config.schoolPreset;
  return BASKET_PRESETS[name] || BASKET_PRESETS[DEFAULT_BASKET_PRESET];
}

export function basketCategoriesFromConfig(config) {
  if (config.basketPreset === "custom" && config.categories?.length) {
    return config.categories.map((category) => ({
      name: category.name,
      weight: Number(category.weight) || 0,
    }));
  }
  const preset = presetForConfig(config);
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

export function normaliseBasketPercentages(categories) {
  const total = categories.reduce((sum, category) => sum + (Number(category.weight) || 0), 0) || 1;
  return new Map(categories.map((category) => [category.name, `${Math.round(((Number(category.weight) || 0) / total) * 1000) / 10}%`]));
}

export function categoriesFromPreset(preset) {
  return (preset.order || Object.keys(preset.weights || {})).map((name) => ({
    name,
    weight: Number(preset.weights?.[name]) || 0,
  }));
}

export function presetLabel(preset) {
  return preset.labelKey ? t(preset.labelKey) : preset.label;
}

export function basketTransferHints(categories = []) {
  const names = new Set(categories.map((category) => String(category.name || "").toUpperCase()));
  return categories
    .map((category) => String(category.name || "").toUpperCase().match(/^DW(\d+)$/)?.[1])
    .filter(Boolean)
    .filter((segment, index, all) => all.indexOf(segment) === index)
    .filter((segment) => names.has(`EX${segment}`))
    .map((segment) => ({ dw: `DW${segment}`, ex: `EX${segment}` }));
}

export function suggestBasketPreset(model) {
  const text = [
    model.fileName,
    ...(model.subjects || []).map((subject) => subject.value),
    ...(model.classes || []).map((classInfo) => classInfo.value),
  ].join(" ").toLowerCase();
  if (/(wiskunde|math|mathematics)/i.test(text) && /(1ste|eerste|year\s*1|\b1\b)/i.test(text)) return "grade1_math";
  if (/(informatic|iw|informatica)/i.test(text)) return "grade2_iw";
  return "dwex";
}

export function inferBasketCategory(assignment, index, assignments, basketOrder = BASKET_PRESETS[DEFAULT_BASKET_PRESET].order) {
  const assignmentText = `${assignment.title || ""} ${assignment.date || ""}`.toLowerCase();
  const broadText = `${assignment.sheetName || ""} ${assignment.title || ""} ${assignment.date || ""}`.toLowerCase();
  const category = String(assignment.category || "").toUpperCase();
  const sameType = assignments.filter((item) => String(item.category || "").toUpperCase() === category);
  const typeIndex = sameType.findIndex((item) => item.id === assignment.id);
  const matchingBaskets = basketOrder.filter((name) => {
    const upper = name.toUpperCase();
    return upper.startsWith(category) && upper !== "EXPAR";
  });
  const basketFromText = inferBasketFromText(assignmentText, category, basketOrder, broadText, assignment.date, assignment.sheetName);

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

export function inferBasketFromText(text, category, basketOrder, broadText = text, dateText = "", sheetName = "") {
  // Skore sheet names ("DW - Sem1.3", "EX - Sem2") are the most reliable period signal,
  // then explicit words in the title, then the date. "Huistaak 2" is not period 2.
  const period = detectPeriod(sheetName) || detectPeriod(text) || periodFromDate(dateText, basketOrder, category);
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

export function parseDateFromText(value) {
  const direct = parseSchoolDate(value);
  if (direct) return direct;

  const text = String(value || "");
  const iso = text.match(/\b\d{4}-\d{1,2}-\d{1,2}\b/);
  if (iso) return parseSchoolDate(iso[0]);

  const separated = text.match(/\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/);
  if (separated) return parseSchoolDate(separated[0]);

  return parseNamedSchoolDate(text);
}

export function isWinterExamMonth(month) {
  return month === 11 || month === 0 || month === 1;
}

export function isSpringExamMonth(month) {
  return month === 2 || month === 3;
}

export function isFinalExamMonth(month) {
  return month === 4 || month === 5;
}

export function springExamBasket(basketOrder, preferPartial = false) {
  if (preferPartial && basketOrder.includes("EXPAR")) return "EXPAR";
  if (basketOrder.includes("EX2")) return "EX2";
  if (basketOrder.includes("EXPAR")) return "EXPAR";
  return null;
}

export function finalExamBasket(basketOrder) {
  if (basketOrder.includes("EX3")) return "EX3";
  if (basketOrder.includes("EX2")) return "EX2";
  return null;
}

/** Period from explicit words only ("Sem1.3", "semester 2", "trim 3", "DW1"). A bare number is not a period. */
export function detectPeriod(text) {
  const value = String(text || "").toLowerCase();
  for (const period of [1, 2, 3]) {
    const explicit = new RegExp(`(trimester|trim|semester|sem|periode|period)\\s*${period}(?!\\d)|\\b(dw|ex)\\s*${period}\\b`);
    if (explicit.test(value)) return period;
  }
  return null;
}

/** Daily work without a period label: place it by school-year date (semesters, or trimesters when DW3 exists). */
export function periodFromDate(dateText, basketOrder = [], category = "") {
  if (String(category).toUpperCase() !== "DW") return null;
  const month = parseDateFromText(dateText)?.month;
  if (!Number.isInteger(month)) return null;
  if (basketOrder.includes("DW3")) {
    if (month >= 8) return 1; // September-December
    if (month <= 2) return 2; // January-March
    return 3;
  }
  return month >= 8 || month === 0 ? 1 : 2; // semester 1: September-January
}

export function uniqueKeepOrder(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export function normaliseFilters(filters = {}, threshold = 50) {
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

export const BELOW_THRESHOLD_FILTER = "__below_threshold";

export function filterStudents(students, filters) {
  return students.filter((student) => {
    if (filters.classCode && filters.classCode !== "all" && student.classCode !== filters.classCode) return false;
    if (filters.band && filters.band !== "all" && student.thresholdBand.id !== filters.band) return false;
    if (filters.flag === BELOW_THRESHOLD_FILTER) {
      // KPI "onder cesuur": the real total, not a flag (other rules can replace the below-threshold flag).
      if (!(Number.isFinite(student.finalWeighted) && student.finalWeighted < (filters.threshold ?? 50))) return false;
    } else if (filters.flag && filters.flag !== "all" && !student.flags.some((flag) => flag.type === filters.flag)) return false;
    return true;
  });
}

export function sortStudents(students, filters = {}) {
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

export function classTeacherChartDomain(values, scaleMode) {
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

export function classTeacherAxisTicks(domain) {
  const step = (domain.max - domain.min) / 4;
  return Array.from({ length: 5 }, (_, index) => Math.round((domain.min + step * index) * 10) / 10);
}

export function renderTrendExplanation(trend) {
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

export function renderVolatilityExplanation(trend) {
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

export function volatilityMeaningKey(value) {
  if (!Number.isFinite(value)) return "volatilityUnknown";
  if (value < 8) return "volatilityLow";
  if (value < 16) return "volatilityMedium";
  return "volatilityHigh";
}

export function pedagogicalNextStep(flags) {
  const types = new Set(flags.map((flag) => flag.type));
  if (types.has("year_total_below_50")) return t("advice.nextOrientation");
  if (types.has("year_total_below_65") || types.has("below_threshold")) return t("advice.nextRemediation");
  if (types.has("high_volatility") || types.has("declining_trend")) return t("advice.nextConversation");
  if (types.has("low_evidence_coverage") || types.has("insufficient_decision_evidence")) return t("advice.nextEvidence");
  if (types.has("consistent_good_work") || types.has("positive_evolution")) return t("advice.nextPositive");
  return "";
}

export function formatGrade(value) {
  return Number.isFinite(value) ? `${formatNumber(value)}%` : t("option.notAvailable");
}

export function formatPercent(value) {
  return Number.isFinite(value) ? `${formatNumber(value * 100)}%` : t("option.notAvailable");
}

export function evidenceParticipationContext(peers = []) {
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

export function formatAvailablePoints(row) {
  const expected = Number.isFinite(row.expectedPossible) ? row.expectedPossible : row.pointsPossible;
  const available = Number.isFinite(row.availablePossible) ? row.availablePossible : row.pointsPossible;
  if (expected && available !== expected) return `${formatNumber(available)} / ${formatNumber(expected)}`;
  return formatNumber(row.pointsPossible);
}

export function formatNumber(value, fallback = t("option.notAvailable")) {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function isExamPoint(point) {
  const text = `${point?.category || ""} ${point?.label || ""} ${point?.title || ""} ${point?.sheetName || ""}`.toUpperCase();
  return /\bEX(?:PAR|\d*)\b/.test(text) || /\bEXAM(?:EN)?\b/.test(text);
}

export function shortLabel(value, maxLength = 24) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
}

export function histogramTooltipLabel(label, studentsInBin = [], anonymised = false) {
  if (!studentsInBin.length) return `${label}: 0`;
  const names = studentsInBin.slice(0, 2).map((student, index) => (
    anonymised ? anonymousName(student) : student.name
  ));
  const rest = studentsInBin.length > names.length ? ` +${studentsInBin.length - names.length}` : "";
  const text = `${label}: ${names.join(", ")}${rest}`;
  return text.length <= 44 ? text : `${text.slice(0, 41).trim()}...`;
}

export function chartPointLabelPosition(x, y, bounds) {
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

/** Gives every student a fixed pseudonym number (class, then name order) so "Leerling 03" never changes when sorting or filtering. */
export function withAnonymousNumbers(analysis) {
  if (!analysis?.students) return analysis;
  const ordered = [...analysis.students].sort((a, b) => (
    String(a.classCode || "").localeCompare(String(b.classCode || ""), undefined, { numeric: true })
    || String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true })
    || String(a.id).localeCompare(String(b.id))
  ));
  ordered.forEach((student, index) => { student.anonNumber = index + 1; });
  return analysis;
}

export function anonymousName(student) {
  return t("student.anonymous", { number: String(student?.anonNumber || 0).padStart(2, "0") });
}

export function quantile(values, q) {
  if (!values.length) return 0;
  const position = (values.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return values[base + 1] == null ? values[base] : values[base] + rest * (values[base + 1] - values[base]);
}

export function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function bandColor(id) {
  return {
    90: "#00405F",
    80: "#006394",
    70: "#3D86AE",
    60: "#7FAFC9",
    50: "#B9D3E1",
    low: "#B3261E",
  }[id] || "#D5DDE2";
}

export function positionTrendPoints(points) {
  return points.map((point, index) => ({
    point,
    x: trendPointX(point, index, points.length),
  }));
}

export function trendPointX(point, index, total) {
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

export function parseSchoolDate(value) {
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

export function parseExcelSerialDate(serial) {
  if (serial < 20000 || serial > 80000) return null;
  const millis = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

export function parseNamedSchoolDate(value) {
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

export function normaliseYear(value) {
  if (!value) return null;
  const year = Number(value);
  if (!Number.isFinite(year)) return null;
  return year < 100 ? 2000 + year : year;
}

export function schoolMonthSlot(month) {
  if (month >= 8 && month <= 11) return month - 8;
  if (month >= 0 && month <= 5) return month + 4;
  return null;
}

export function daysInMonth(year, month) {
  const safeYear = Number.isFinite(year) ? year : 2025;
  return new Date(safeYear, month + 1, 0).getDate();
}

export function linearTrendLineForPoints(positionedPoints) {
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
