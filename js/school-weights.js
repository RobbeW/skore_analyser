// School weights ("Overzicht gewichten" as pasted from Skore).
//
// Each subject has a DW weight and exam weights (EX, and in semester 2 often EXPA). The algemeen
// totaal of a report is the weighted average of the subject totals.
//
// Grade 1 (confirmed 2026-11-15): trimesters 1-3 share one table; a subject without an exam gets
//   its DW weight x 3, which makes every subject weigh 3 x its lesson hours.
// Grade 2 (pasted 2026-11-15): separate tables for Semester 1, Semester 2 and Jaar. Exam subjects
//   weigh 4 x hours (S1) and 6 x hours (S2); subjects without an exam 1 x, 1.5 x and 2.5 x (Jaar).
//   Sub-lines ("Frans: Basiskennis (30%)", "SE²AL - Artistieke Vorming") belong to the subject above:
//   they carry its DW weight, and the subject's own numbers are then its exam weight(s).

import { canonicalSubject, inferTrackFromClassCode, inferYearFromClassCode, normaliseKey, SUBJECT_ALIASES } from "./class-teacher-config.js";
import { GRADE1_SOURCES } from "./school-weights-grade1.js";
import { GRADE2_WEIGHTS_TEXT } from "./school-weights-grade2.js";
import { GRADE3_WEIGHTS_TEXT } from "./school-weights-grade3.js";
import { GRADE3_Y6_WEIGHTS_TEXT } from "./school-weights-grade3-y6.js";

/** Skore track code (from the weights overview) -> track id in class-teacher-config. */
export const SKORE_TRACK_CODES = {
  g1_j1_lat: { year: 1, trackId: "Latijn" },
  g1_j1_steam: { year: 1, trackId: "STEaM" },
  "g1_j1_ta&cu": { year: 1, trackId: "Taal_en_Cultuur" },
  g1_j2_grla: { year: 2, trackId: "Grieks_Latijn" },
  g1_j2_la: { year: 2, trackId: "Latijn" },
  g1_j2_mw: { year: 2, trackId: "Moderne_Talen_Wetenschappen_2A" },
  g1_j2_stea: { year: 2, trackId: "STEaM" },
  g2_j1_ews: { year: 3, trackId: "Economische_Wetenschappen" },
  g2_j1_ewtc: { year: 3, trackId: "Economische_Wetenschappen_TC" },
  g2_j1_glst: { year: 3, trackId: "Grieks_Latijn_STEaM" },
  g2_j1_gltc: { year: 3, trackId: "Grieks_Latijn_TC" },
  g2_j1_hw: { year: 3, trackId: "Humane_Wetenschappen" },
  g2_j1_lst: { year: 3, trackId: "Latijn_STEaM" },
  g2_j1_ltc: { year: 3, trackId: "Latijn_TC" },
  g2_j1_mt: { year: 3, trackId: "Moderne_Talen" },
  g2_j1_nw: { year: 3, trackId: "NW" },
  g2_j2_ews: { year: 4, trackId: "Economische_Wetenschappen" },
  g2_j2_ewtc: { year: 4, trackId: "Economische_Wetenschappen_TC" },
  g2_j2_glst: { year: 4, trackId: "Grieks_Latijn_STEaM" },
  g2_j2_gltc: { year: 4, trackId: "Grieks_Latijn_TC" },
  g2_j2_hw: { year: 4, trackId: "Humane_Wetenschappen" },
  g2_j2_lst: { year: 4, trackId: "Latijn_STEaM" },
  g2_j2_ltc: { year: 4, trackId: "Latijn_TC" },
  g2_j2_mt: { year: 4, trackId: "Moderne_Talen" },
  g2_j2_nw: { year: 4, trackId: "NW" },
  g3_j1_emt: { year: 5, trackId: "Economie_Moderne_Talen" },
  g3_j1_ewi: { year: 5, trackId: "Economie_Wiskunde" },
  g3_j1_gl: { year: 5, trackId: "Grieks_Latijn" },
  g3_j1_gwi6: { year: 5, trackId: "Grieks_Wiskunde", variant: "6" },
  g3_j1_gwi8: { year: 5, trackId: "Grieks_Wiskunde", variant: "8" },
  g3_j1_hw: { year: 5, trackId: "Humane_Wetenschappen" },
  g3_j1_lmt: { year: 5, trackId: "Latijn_Moderne_Talen" },
  g3_j1_lwe: { year: 5, trackId: "Latijn_Wetenschappen" },
  g3_j1_lwi6: { year: 5, trackId: "Latijn_Wiskunde", variant: "6" },
  g3_j1_lwi8: { year: 5, trackId: "Latijn_Wiskunde", variant: "8" },
  g3_j1_mt: { year: 5, trackId: "Moderne_Talen" },
  g3_j1_mtwe: { year: 5, trackId: "Moderne_Talen_Wetenschappen" },
  g3_j1_wwi6: { year: 5, trackId: "Wetenschappen_Wiskunde", variant: "6" },
  g3_j1_wwi8: { year: 5, trackId: "Wetenschappen_Wiskunde", variant: "8" },
  g3_j2_emt: { year: 6, trackId: "Economie_Moderne_Talen" },
  g3_j2_ewi: { year: 6, trackId: "Economie_Wiskunde" },
  g3_j2_gl3: { year: 6, trackId: "Grieks_Latijn", variant: "3" },
  g3_j2_gl4: { year: 6, trackId: "Grieks_Latijn", variant: "4" },
  g3_j2_gwi6: { year: 6, trackId: "Grieks_Wiskunde", variant: "6" },
  g3_j2_gwi8: { year: 6, trackId: "Grieks_Wiskunde", variant: "8" },
  g3_j2_hw: { year: 6, trackId: "Humane_Wetenschappen" },
  g3_j2_lmt: { year: 6, trackId: "Latijn_Moderne_Talen" },
  g3_j2_lwe: { year: 6, trackId: "Latijn_Wetenschappen" },
  g3_j2_lwi6: { year: 6, trackId: "Latijn_Wiskunde", variant: "6" },
  g3_j2_lwi8: { year: 6, trackId: "Latijn_Wiskunde", variant: "8" },
  g3_j2_mt: { year: 6, trackId: "Moderne_Talen" },
  g3_j2_mtwe: { year: 6, trackId: "Moderne_Talen_Wetenschappen" },
  g3_j2_wwi6: { year: 6, trackId: "Wetenschappen_Wiskunde", variant: "6" },
  g3_j2_wwi8: { year: 6, trackId: "Wetenschappen_Wiskunde", variant: "8" },
};

/**
 * Tracks with Wiskunde-hour variants share one track id: GWI, LWI and WWI (6 or 8 hours) and, in
 * the 6th year, GL (3 or 4 hours). The variant comes from the class code ("5WWI8" -> 8, "6GL4" -> 4);
 * without it the 6-hour variant (or the lowest one, GL3) is used.
 */
export function wiskundeVariantFromClassCode(classCode) {
  const match = String(classCode || "").toUpperCase().match(/(?:WIs*([68])|GLs*([34]))(?!d)/);
  return match ? match[1] || match[2] : null;
}

/** Multiplier for subjects without an exam, per grade (grade 2 lists those weights explicitly). */
export const NO_EXAM_MULTIPLIER_BY_GRADE = { 1: 3 };

const HEADER_RE = /(\d)\s*(?:ste|de|e)\s+jaar\s+(\d)\s*(?:ste|de|e)\s+graad\s+([A-Za-z]+)?\s*\/\s*([^/]+?)\s*\/\s*(.+)$/i;
// "Name (4 uur) [CODE] (note)" optionally followed by "| 1 3" (compact storage).
const SUBJECT_RE = /^(.+?)\s*\(\s*(\d+(?:[.,]\d+)?)\s*uur\s*\)\s*\[([^\]]+)\]\s*(?:\(([^)]*)\))?\s*(?:\|\s*([-\d.,\s]*))?$/i;
// Sub-line: "Frans: Basiskennis (30%) [FrKennis] (4 uur - major)" or "SE²AL - ICT [SICT] (1 uur)".
const COMPONENT_RE = /^(.+?)\s*\[([^\]]+)\]\s*(?:\(([^)]*)\))?\s*(?:\|\s*([-\d.,\s]*))?$/i;
const NUMBER_RE = /^-?\d+(?:[.,]\d+)?$/;

function toNumber(value) {
  return Number(String(value).replace(",", "."));
}

function numbersFrom(text) {
  return String(text || "").trim().split(/\s+/).filter((part) => NUMBER_RE.test(part)).map(toNumber);
}

function firstWordKey(value) {
  return normaliseKey(String(value || "").split(/[\s:(-]/)[0]).replace(/[^A-Z0-9]/g, "");
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Canonical subject name: via the abbreviation first (matches report columns), then the full name. */
export function weightSubjectName(code, name) {
  return SUBJECT_ALIASES.get(normaliseKey(code)) || canonicalSubject(name);
}

/** "Semester 1" -> "semester_1", "Jaar" -> "year", "Trimester 1" -> "trimester_1". */
export function weightPeriodKey(period) {
  const text = normaliseKey(period).toLowerCase();
  if (/jaar/.test(text)) return "year";
  const semester = text.match(/semester\s*(\d)/);
  if (semester) return `semester_${semester[1]}`;
  const trimester = text.match(/trimester\s*(\d)/);
  if (trimester) return `trimester_${trimester[1]}`;
  return text.replace(/\s+/g, "_");
}

/**
 * Parses one weights overview (pasted or compact). Returns { year, grade, trackCode, trackId,
 * period, periodKey, subjects: [{ subject, name, code, hours, dw, ex, expa, hasExam, total,
 * components, note, isMajor, isMinor, share }], totals }. Throws "INVALID_WEIGHTS" without subjects.
 */
export function parseWeightsText(text, options = {}) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim());
  let header = null;
  const subjects = [];
  let current = null;
  let target = null; // where loose number lines go: the subject or its last sub-line

  for (const line of lines) {
    if (!line) continue;
    if (!header) {
      const match = line.match(HEADER_RE);
      if (match) {
        header = {
          year: Number(match[1]),
          grade: Number(match[2]),
          education: (match[3] || "").toUpperCase(),
          trackCode: match[4].trim(),
          period: match[5].trim(),
        };
        continue;
      }
    }
    if (/^dw\b/i.test(line) || /algemeen\s+totaal/i.test(line)) continue;

    const subjectMatch = line.match(SUBJECT_RE);
    if (subjectMatch) {
      current = {
        name: subjectMatch[1].trim(),
        hours: toNumber(subjectMatch[2]),
        code: subjectMatch[3].trim(),
        note: (subjectMatch[4] || "").trim(),
        values: numbersFrom(subjectMatch[5]),
        components: [],
      };
      subjects.push(current);
      target = current;
      continue;
    }

    const componentMatch = line.match(COMPONENT_RE);
    if (componentMatch && current && firstWordKey(componentMatch[1]) === firstWordKey(current.name)) {
      const component = {
        name: componentMatch[1].trim(),
        code: componentMatch[2].trim(),
        note: (componentMatch[3] || "").trim(),
        values: numbersFrom(componentMatch[4]),
      };
      current.components.push(component);
      target = component;
      continue;
    }

    if (target && NUMBER_RE.test(line)) target.values.push(toNumber(line));
  }

  if (!subjects.length) throw new Error("INVALID_WEIGHTS");
  const grade = options.grade ?? header?.grade ?? null;
  const multiplier = options.noExamMultiplier ?? NO_EXAM_MULTIPLIER_BY_GRADE[grade] ?? 1;
  const trackInfo = SKORE_TRACK_CODES[String(header?.trackCode || "").toLowerCase()] || null;

  const parsed = subjects.map((item) => {
    let dw;
    let ex;
    let expa;
    if (item.components.length) {
      // Sub-lines carry the DW weight; the subject's own numbers are its exam weight(s).
      dw = item.components.reduce((sum, component) => sum + (component.values[0] || 0), 0);
      [ex = null, expa = null] = item.values;
    } else {
      [dw = 0, ex = null, expa = null] = item.values;
    }
    const hasExam = Number.isFinite(ex) || Number.isFinite(expa);
    const total = hasExam ? dw + (ex || 0) + (expa || 0) : dw * multiplier;
    return {
      subject: weightSubjectName(item.code, item.name),
      name: item.name,
      code: item.code,
      hours: item.hours,
      dw: round2(dw),
      ex: Number.isFinite(ex) ? ex : null,
      expa: Number.isFinite(expa) ? expa : null,
      hasExam,
      total: round2(total),
      components: item.components.map((component) => ({ name: component.name, code: component.code, weight: component.values[0] || 0 })),
      note: item.note,
      isMajor: /\bmajor\b/i.test(item.note),
      isMinor: /\bminor\b/i.test(item.note),
    };
  }).filter((item) => item.total > 0);

  return finaliseTable({
    // "1ste jaar 2de graad" is the 3rd year: convert the year within the grade to the school year.
    year: trackInfo?.year ?? (header ? (header.grade - 1) * 2 + header.year : null),
    yearInGrade: header?.year ?? null,
    grade,
    education: header?.education || "",
    trackCode: header?.trackCode || "",
    trackId: trackInfo?.trackId || null,
    variant: trackInfo?.variant || null,
    period: header?.period || "",
    periodKey: weightPeriodKey(header?.period || ""),
    noExamMultiplier: multiplier,
    subjects: parsed,
  });
}

function finaliseTable(table) {
  const total = table.subjects.reduce((sum, item) => sum + item.total, 0);
  return {
    ...table,
    subjects: table.subjects.map((item) => ({ ...item, share: total ? item.total / total : 0 })),
    totals: {
      dw: round2(table.subjects.reduce((sum, item) => sum + (item.hasExam ? item.dw : item.total), 0)),
      ex: round2(table.subjects.reduce((sum, item) => sum + (item.ex || 0) + (item.expa || 0), 0)),
      total: round2(total),
    },
  };
}

/** Splits a text with several overviews (one header line each) and parses every one. */
export function parseWeightsCollection(text, options = {}) {
  const blocks = [];
  let currentBlock = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    if (HEADER_RE.test(line.trim()) && currentBlock.some((item) => item.trim())) {
      blocks.push(currentBlock.join("\n"));
      currentBlock = [];
    }
    currentBlock.push(line);
  }
  if (currentBlock.some((item) => item.trim())) blocks.push(currentBlock.join("\n"));
  return blocks.map((block) => parseWeightsText(block, options));
}

/**
 * Weighted algemeen totaal from subject scores ({ subject, score }). `basis` "total" uses the
 * subject totals; "dw" uses only the daily-work weights (for Dagelijks werk reports, when no exam
 * has been taken yet). Subjects without a weight are left out.
 */
export function weightedOverall(subjectScores = [], table, basis = "total") {
  if (!table) return null;
  const weights = new Map(table.subjects.map((item) => [item.subject, basis === "dw" ? item.dw : item.total]));
  let sum = 0;
  let weightSum = 0;
  const used = [];
  for (const score of subjectScores) {
    const weight = weights.get(score.subject);
    if (!weight || !Number.isFinite(score.score)) continue;
    sum += weight * score.score;
    weightSum += weight;
    used.push(score.subject);
  }
  if (!weightSum) return null;
  return { value: Math.round((sum / weightSum) * 10) / 10, weightUsed: weightSum, subjects: used, basis };
}

// ---- Built-in tables ----

let builtIn = null;

/** All built-in weight tables (parsed once). */
export function builtInWeightTables() {
  if (!builtIn) {
    builtIn = [
      ...GRADE1_SOURCES.map((source) => parseWeightsText(source)),
      ...parseWeightsCollection(GRADE2_WEIGHTS_TEXT),
      ...parseWeightsCollection(GRADE3_WEIGHTS_TEXT),
      ...parseWeightsCollection(GRADE3_Y6_WEIGHTS_TEXT),
    ];
  }
  return builtIn;
}

function tablesFor(year, trackId, classCode = "") {
  if (!year || !trackId) return [];
  const tables = builtInWeightTables().filter((table) => table.year === Number(year) && table.trackId === trackId);
  const variants = [...new Set(tables.map((table) => table.variant).filter(Boolean))];
  if (!variants.length) return tables;
  const wanted = wiskundeVariantFromClassCode(classCode);
  const chosen = variants.includes(wanted) ? wanted : variants.includes("6") ? "6" : [...variants].sort()[0];
  return tables.filter((table) => table.variant === chosen);
}

/** Sum of several period tables per subject (used for the year report: S1 + S2 + Jaar). */
function combineTables(tables, label) {
  const bySubject = new Map();
  for (const table of tables) {
    for (const item of table.subjects) {
      const existing = bySubject.get(item.subject);
      if (!existing) {
        bySubject.set(item.subject, { ...item, ex: item.ex, expa: item.expa });
        continue;
      }
      existing.dw = round2(existing.dw + item.dw);
      existing.ex = (existing.ex || 0) + (item.ex || 0) || null;
      existing.expa = (existing.expa || 0) + (item.expa || 0) || null;
      existing.total = round2(existing.total + item.total);
      existing.hasExam = existing.hasExam || item.hasExam;
    }
  }
  const first = tables[0];
  return finaliseTable({ ...first, period: label, periodKey: "year_combined", subjects: Array.from(bySubject.values()) });
}

// Which weights period a report period uses.
const SEMESTER_1_PERIODS = new Set(["dw_1", "kr_1", "dw_2", "dw_3", "semester_1"]);
const SEMESTER_2_PERIODS = new Set(["dw_4", "dw_5", "dw_6", "dw_7", "semester_2_prelim", "semester_2"]);

/**
 * The weights for a year + track and (optionally) a report period. Returns { table, basis } or null.
 * Interim reports (Dagelijks werk, Klassenraad) use only the DW weights of their semester.
 */
export function schoolWeightsFor({ year, trackId, periodId = null, classCode = "" } = {}) {
  const tables = tablesFor(year, trackId, classCode);
  if (!tables.length) return null;
  const basis = /^(dw|kr)_/.test(String(periodId || "")) ? "dw" : "total";
  const byKey = new Map(tables.map((table) => [table.periodKey, table]));
  // Grade 1: one table for all trimesters.
  if (!byKey.has("semester_1")) return { table: tables[0], basis };
  if (periodId === "year") {
    return { table: combineTables(tables.filter((table) => ["semester_1", "semester_2", "year"].includes(table.periodKey)), "Jaar (S1 + S2 + Jaar)"), basis: "total" };
  }
  if (SEMESTER_2_PERIODS.has(periodId)) return { table: byKey.get("semester_2") || byKey.get("semester_1"), basis };
  return { table: byKey.get("semester_1"), basis };
}

/** The main table for a year + track (grade 1: the trimester table; grade 2: semester 1). */
export function findSchoolWeights({ year, trackId, periodId = null, classCode = "" } = {}) {
  return schoolWeightsFor({ year, trackId, periodId, classCode })?.table || null;
}

/**
 * Replaces the unweighted subject average (used when a report has no algemeen totaal) by the
 * school-weighted total, per period. Returns a new aggregation with `schoolWeights` attached.
 */
export function applySchoolWeightsToAggregation(aggregation, { year, trackId, classCode = aggregation?.classCode || "" } = {}) {
  if (!aggregation || !tablesFor(year, trackId, classCode).length) return aggregation;
  const used = new Map();
  const students = (aggregation.students || []).map((student) => {
    let changed = false;
    const periods = (student.periods || []).map((period) => {
      if (period.missing || period.overallSourceMetric !== "VAKGEMIDDELDE") return period;
      const weights = schoolWeightsFor({ year, trackId, periodId: period.periodId, classCode });
      const weighted = weightedOverall(Object.values(period.subjectScores || {}), weights?.table, weights?.basis);
      if (!weighted) return period;
      used.set(period.periodId, { periodLabel: period.periodLabel, table: weights.table, basis: weights.basis });
      changed = true;
      return { ...period, overallScore: weighted.value, overallSourceMetric: "GEWOGEN" };
    });
    if (!changed) return student;
    const byPeriod = new Map(periods.map((period) => [period.periodId, period]));
    const overallScores = (student.overallScores || []).map((entry) => {
      const period = byPeriod.get(entry.periodId);
      return period?.overallSourceMetric === "GEWOGEN"
        ? { ...entry, value: period.overallScore, sourceMetric: "GEWOGEN" }
        : entry;
    });
    const finite = overallScores.filter((entry) => Number.isFinite(entry.value));
    const yearEntry = finite.find((entry) => entry.periodId === "year");
    return {
      ...student,
      periods,
      overallScores,
      yearScore: yearEntry ? yearEntry.value : student.yearScore,
      latestOverallScore: finite.length ? finite[finite.length - 1].value : student.latestOverallScore,
    };
  });
  const usedList = Array.from(used.values());
  const latest = usedList[usedList.length - 1] || null;
  return {
    ...aggregation,
    students,
    schoolWeights: latest?.table || findSchoolWeights({ year, trackId, classCode }),
    schoolWeightsBasis: latest?.basis || "total",
    schoolWeightsUsed: usedList.map((item) => ({ periodLabel: item.periodLabel, period: item.table.period, basis: item.basis })),
  };
}

/**
 * Basket preset for one subject teacher's workbook, from the school weights.
 * Grade 1: three trimesters with the same DW:EX each. Grade 2: DW1/EX1 from semester 1 and
 * DW2/EXPAR/EX2 from semester 2. Subjects without an exam only get DW baskets.
 */
export function schoolBasketPreset({ classCode, subject } = {}) {
  const year = inferYearFromClassCode(classCode);
  const track = inferTrackFromClassCode(classCode, year);
  const tables = tablesFor(year, track?.id, classCode);
  if (!tables.length) return null;
  const wanted = canonicalSubject(subject);
  const find = (table) => table?.subjects.find((item) => item.subject === wanted)
    || table?.subjects.find((item) => normaliseKey(item.name) === normaliseKey(wanted));
  const byKey = new Map(tables.map((table) => [table.periodKey, table]));

  if (!byKey.has("semester_1")) {
    const entry = find(tables[0]);
    if (!entry) return null;
    const periods = [1, 2, 3];
    return {
      label: entry.hasExam
        ? `Schoolgewichten ${tables[0].trackCode}: ${entry.subject} (DW ${entry.dw} : EX ${entry.ex} per trimester)`
        : `Schoolgewichten ${tables[0].trackCode}: ${entry.subject} (alleen DW, geen examen)`,
      order: periods.flatMap((n) => (entry.hasExam ? [`DW${n}`, `EX${n}`] : [`DW${n}`])),
      weights: Object.fromEntries(periods.flatMap((n) => (entry.hasExam
        ? [[`DW${n}`, entry.dw], [`EX${n}`, (entry.ex || 0) + (entry.expa || 0)]]
        : [[`DW${n}`, entry.total]]))),
      source: { trackCode: tables[0].trackCode, subject: entry.subject },
    };
  }

  const s1 = find(byKey.get("semester_1"));
  const s2 = find(byKey.get("semester_2"));
  if (!s1 && !s2) return null;
  const hasExam = Boolean(s1?.hasExam || s2?.hasExam);
  const weights = hasExam
    ? { DW1: s1?.dw || 0, EX1: (s1?.ex || 0) + (s1?.expa || 0), DW2: s2?.dw || 0, EXPAR: s2?.expa || 0, EX2: s2?.ex || 0 }
    : { DW1: s1?.total || 0, DW2: s2?.total || 0 };
  const order = Object.keys(weights).filter((name) => weights[name] > 0);
  const trackCode = byKey.get("semester_1").trackCode;
  const name = (s1 || s2).subject;
  return {
    label: hasExam
      ? `Schoolgewichten ${trackCode}: ${name} (S1 DW ${weights.DW1} : EX ${weights.EX1} · S2 DW ${weights.DW2} : EX ${weights.EX2}${weights.EXPAR ? ` : EXPA ${weights.EXPAR}` : ""})`
      : `Schoolgewichten ${trackCode}: ${name} (alleen DW, geen examen)`,
    order,
    weights: Object.fromEntries(order.map((key) => [key, weights[key]])),
    source: { trackCode, subject: name },
  };
}
