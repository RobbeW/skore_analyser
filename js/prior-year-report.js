// Turns the text runs of a Skore year-report printout into structured prior-year data.
// Kept separate from the PDF reader so it can be tested with made-up runs.
//
// Layout (Skore, 2025-2026): header (class, school year, "<number> <name>", period), a table per
// group of subjects with DW / EX / TOT percentages and the class distribution per band
// (90 / 80 / 70 / 60 / 50 / <50), group totals, "Algemeen Totaal", report comments (ignored on
// purpose) and the conclusion of the deliberating class council.

import { canonicalSubject } from "./class-teacher-config.js";

// "Wiskunde (5 uur)", optionally followed by "(teacher)" in the same cell.
const SUBJECT_RE = /^(.+?)\s*\(\s*(\d+(?:[.,]\d+)?)\s*uur\s*\)\s*(?:\([^)]*\))?\s*$/i;
const PERCENT_RE = /^\d{1,3}(?:[.,]\d+)?$/;
const COUNT_RE = /^\d{1,3}$/;
const BAND_LABELS = ["90", "80", "70", "60", "50", "<50"];

// This year's subject -> earlier subjects that lead into it (shown as a faint lead-in).
export const PRIOR_LEAD_INS = {
  Biologie: ["Wetenschappen", "Natuurwetenschappen"],
  Chemie: ["Wetenschappen", "Natuurwetenschappen"],
  Fysica: ["Wetenschappen", "Natuurwetenschappen"],
};

const toNumber = (text) => Number(String(text).replace(",", "."));

/** Long subject names wrap onto a second line in the same table cell: join those runs. */
function mergeCellRuns(runs, maxX) {
  const merged = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    const sameCell = last && Math.abs(last.cellX - run.cellX) < 0.5 && Math.abs(last.cellY - run.cellY) < 0.5;
    if (sameCell && run.cellX < maxX) {
      last.text = `${last.text} ${run.text}`.replace(/\(\s+/g, "(").replace(/\s+/g, " ");
      continue;
    }
    merged.push({ ...run });
  }
  return merged;
}

function findColumns(runs) {
  const byText = (label) => runs.filter((run) => run.text === label);
  const dw = byText("DW")[0];
  const ex = byText("EX")[0];
  const tot = byText("TOT")[0];
  const bands = BAND_LABELS.map((label) => byText(label).find((run) => !dw || Math.abs(run.cellY - dw.cellY) < 3));
  if (!dw || !tot || bands.some((band) => !band)) return null;
  return {
    percent: [["dw", dw.cellX], ["ex", ex?.cellX ?? null], ["tot", tot.cellX]].filter(([, x]) => x !== null),
    bands: bands.map((run, index) => [BAND_LABELS[index], run.cellX]),
    headerY: dw.cellY,
  };
}

function percentColumn(columns, x) {
  let best = null;
  for (const [key, colX] of columns.percent) {
    const distance = Math.abs(colX - x);
    if (distance <= 20 && (!best || distance < best.distance)) best = { key, distance };
  }
  return best?.key || null;
}

function bandColumn(columns, x) {
  // The pupil's own band label is drawn slightly to the right: take the column it falls in.
  const firstX = columns.bands[0][1];
  if (x < firstX - 12) return null;
  let found = null;
  for (const [label, colX] of columns.bands) if (x >= colX - 12) found = label;
  return found;
}

/** Parses pages of runs ([{ runs }]) into a prior-year report. Throws "NOT_SKORE_REPORT". */
export function parsePriorYearReport(pages, { fileName = "" } = {}) {
  const allRuns = pages.flatMap((page, pageIndex) => page.runs.map((run) => ({ ...run, page: pageIndex })));
  const firstPage = pages[0]?.runs || [];
  let columns = findColumns(firstPage);
  const report = {
    fileName,
    schoolYear: "",
    classCode: "",
    pupilName: "",
    period: "",
    subjects: [],
    groupTotals: [],
    overall: null,
    decision: null,
  };

  // Header: the runs above the first table.
  const headerRuns = firstPage.filter((run) => !columns || run.cellY > columns.headerY + 20);
  for (const run of headerRuns) {
    if (/^\d{4}\s*-\s*\d{4}$/.test(run.text)) report.schoolYear = run.text.replace(/\s+/g, " ");
    else if (/^[1-7][A-Z]{1,8}\d{0,2}$/.test(run.text)) report.classCode = run.text;
    else if (/^(jaar|semester\s*\d|trimester\s*\d|kerst|pasen)$/i.test(run.text)) report.period = run.text;
    else if (/^\d{1,2}\s+\S+\s+\S+/.test(run.text) && !report.pupilName) report.pupilName = run.text.replace(/^\d{1,2}\s+/, "").trim();
  }

  for (const page of pages) {
    const ownColumns = findColumns(page.runs);
    columns = ownColumns || columns;
    if (!columns) continue;
    const runs = mergeCellRuns(page.runs, columns.percent[0][1] - 10);
    // Only the page that carries the column headers has runs above the table to skip.
    const skipAboveY = ownColumns ? ownColumns.headerY - 2 : Infinity;
    const rows = [];
    for (const run of runs) {
      const subject = run.text.match(SUBJECT_RE);
      const isTotal = /^(totaal\b.*|algemeen\s+totaal)\s*:?\s*$/i.test(run.text);
      if (subject || isTotal) rows.push({ run, subject, isTotal, values: {}, bands: {} });
    }
    rows.sort((a, b) => b.run.y - a.run.y);
    const rowFor = (run) => {
      let best = null;
      for (const row of rows) {
        const dy = row.run.y - run.y;
        if (dy >= -4 && dy <= 24 && (!best || dy < best.dy)) best = { row, dy };
      }
      return best?.row || null;
    };
    for (const run of runs) {
      if (run.cellY >= skipAboveY) continue;
      const row = rowFor(run);
      if (!row || row.run === run) continue;
      if (PERCENT_RE.test(run.text) && /[.,]|^\d{2,3}$/.test(run.text)) {
        const key = percentColumn(columns, run.cellX);
        if (key && !(key in row.values)) { row.values[key] = toNumber(run.text); continue; }
      }
      if (COUNT_RE.test(run.text)) {
        const band = bandColumn(columns, run.cellX);
        if (band && percentColumn(columns, run.cellX) === null) {
          row.bands[band] = Number(run.text);
          if (run.cellX - columns.bands.find(([label]) => label === band)[1] > 5) row.ownBand = band;
        }
      }
    }
    for (const row of rows) {
      if (row.subject) {
        const name = row.subject[1].trim();
        report.subjects.push({
          subject: canonicalSubject(name),
          name,
          hours: toNumber(row.subject[2]),
          dw: row.values.dw ?? null,
          ex: row.values.ex ?? null,
          tot: row.values.tot ?? row.values.dw ?? null,
          classDistribution: Object.keys(row.bands).length ? row.bands : null,
          ownBand: row.ownBand || null,
        });
      } else if (/algemeen/i.test(row.run.text)) {
        report.overall = { dw: row.values.dw ?? null, ex: row.values.ex ?? null, tot: row.values.tot ?? null };
      } else {
        report.groupTotals.push({ label: row.run.text.replace(/\s*:\s*$/, ""), dw: row.values.dw ?? null, ex: row.values.ex ?? null, tot: row.values.tot ?? null });
      }
    }
  }

  // Conclusion of the deliberating class council (the only free text that is kept).
  const start = allRuns.findIndex((run) => /conclusie van de delibererende klassenraad/i.test(run.text));
  if (start >= 0) {
    const parts = [];
    for (let i = start + 1; i < allRuns.length; i += 1) {
      if (/^(klastitularis|handtekening|afdrukdatum)/i.test(allRuns[i].text)) break;
      if (allRuns[i].page !== allRuns[start].page) break;
      parts.push(allRuns[i].text);
    }
    const text = parts.join(" ").replace(/\s+/g, " ");
    const pick = (label, next) => {
      const until = next.length ? `(?=${next.join("|")}|$)` : "$";
      return text.match(new RegExp(`${label}\\s*:\\s*(.*?)\\s*${until}`, "i"))?.[1]?.trim() || "";
    };
    report.decision = {
      beslissing: pick("Beslissing", ["Studiebewijs\\s*:", "Advies\\s*:"]),
      studiebewijs: pick("Studiebewijs", ["Advies\\s*:"]),
      advies: pick("Advies", []),
    };
  }

  // Deduplicate subjects (a subject can appear once per page header repeat).
  const seen = new Set();
  report.subjects = report.subjects.filter((item) => (seen.has(item.subject) ? false : seen.add(item.subject)));
  if (!report.subjects.length) throw new Error("NOT_SKORE_REPORT");
  return report;
}

/**
 * Prior-year value for one of this year's subjects: the same subject, or a lead-in
 * (e.g. Wetenschappen -> Biologie). Returns { value, source: "same" | "leadIn", fromSubject } or null.
 */
export function priorValueFor(prior, subject) {
  if (!prior?.subjects?.length) return null;
  const same = prior.subjects.find((item) => item.subject === subject && Number.isFinite(item.tot));
  if (same) return { value: same.tot, source: "same", fromSubject: same.subject, item: same };
  for (const lead of PRIOR_LEAD_INS[subject] || []) {
    const item = prior.subjects.find((entry) => entry.subject === lead && Number.isFinite(entry.tot));
    if (item) return { value: item.tot, source: "leadIn", fromSubject: item.subject, item };
  }
  return null;
}

/** Share of classmates in a lower band last year (0-1), from the class distribution. */
export function priorClassPosition(item) {
  if (!item?.classDistribution || !item.ownBand) return null;
  const order = ["<50", "50", "60", "70", "80", "90"];
  const total = order.reduce((sum, band) => sum + (item.classDistribution[band] || 0), 0);
  if (!total) return null;
  const below = order.slice(0, order.indexOf(item.ownBand)).reduce((sum, band) => sum + (item.classDistribution[band] || 0), 0);
  return { below, total, share: below / total };
}

// ---------------------------------------------------------------------------
// Advice of last year's deliberating class council
// ---------------------------------------------------------------------------

const ADVICE_STOPWORDS = new Set(["de", "het", "een", "en", "studierichting", "richting", "finaliteit", "doorstroom", "domeinoverschrijdende", "met", "verdieping"]);

// Abbreviations that can show up in an advice ("EW-STEaM", "HW").
const TRACK_ALIASES = {
  ew: "economische wetenschappen",
  hw: "humane wetenschappen",
  nw: "natuurwetenschappen",
  mt: "moderne talen",
  mtw: "moderne talen wetenschappen",
  la: "latijn",
  gl: "grieks latijn",
  tc: "taal cultuur",
  steam: "steam",
};

function adviceTokens(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .flatMap((token) => (TRACK_ALIASES[token] && token !== "steam" ? TRACK_ALIASES[token].split(" ") : [token]))
    .filter((token) => token && !ADVICE_STOPWORDS.has(token));
}

const cleanTrack = (value) => String(value || "").replace(/\s+/g, " ").replace(/[\s,.;:]+$/, "").trim();

/**
 * Reads the free-text advice of last year's class council.
 * Returns { kind, tracks, openToOthers, otherHint, condition } where kind is
 * "supports" (backs the pupil's own choice), "recommends" (names a track),
 * "against" (advises against / reorientation) or "unknown".
 */
export function classifyPriorAdvice(text) {
  const advice = String(text || "").replace(/\s+/g, " ").trim();
  const result = { kind: "unknown", tracks: [], openToOthers: false, otherHint: "", condition: "" };
  if (!advice) return result;
  // Where a track name ends: "in j3", "en wenst ...", "mits ...", "of een andere ...", or the sentence end.
  const stop = String.raw`(?=\s+in\s+(?:j|het\s)\S*|\s+en\s+wenst|\s+mits\b|\s+of\s+een\b|[.;]|$)`;

  const condition = advice.match(/\bmits\s+(.+?)(?:[.;]|$)/i);
  if (condition) result.condition = cleanTrack(condition[1]);

  const supports = advice.match(new RegExp(String.raw`ondersteunt\s+(?:jouw|je|uw|zijn|haar)\s+(?:studie)?keuze(?:\s+voor\s+(.+?)${stop})?`, "i"));
  const recommends = advice.match(new RegExp(String.raw`adviseert\s+(?:de|een|het)?\s*(?:studierichting|richting|finaliteit|studiedomein)\s+(.+?)${stop}`, "i"));
  const against = /\braadt\b.*\baf\b|afgeraden|\bniet\s+(?:aan\s+te\s+raden|geschikt)|herori[eë]nt/i.test(advice);

  if (supports) {
    result.kind = "supports";
    if (supports[1]) result.tracks.push(cleanTrack(supports[1]));
  } else if (recommends) {
    result.kind = "recommends";
    result.tracks.push(...recommends[1].split(/\s+of\s+(?:de\s+)?(?:studierichting\s+)?(?!een\b)/i).map(cleanTrack).filter(Boolean));
  } else if (against) {
    result.kind = "against";
  }

  const other = advice.match(/of\s+een\s+andere\s+(?:studie)?richting\s*(.*?)(?=\s+in\s+(?:j|het\s)\S*|\s+mits\b|[.;]|$)/i);
  if (other) {
    result.openToOthers = true;
    result.otherHint = cleanTrack(other[1]);
  }
  return result;
}

/**
 * True when the current track is (one of) the advised track(s).
 * "Economische wetenschappen met verdieping STEaM" matches "Economische Wetenschappen"
 * but not "Economische Wetenschappen Taal & Cultuur" (a different verdieping).
 */
export function trackMatchesAdvice(trackLabel, advisedTrack) {
  const [basePart, verdiepingPart = ""] = String(advisedTrack || "").split(/\s+met\s+verdieping\s+/i);
  const base = adviceTokens(basePart);
  const current = adviceTokens(trackLabel);
  if (!base.length || !current.length) return false;
  const has = (token) => current.some((word) => word === token || word.startsWith(token) || token.startsWith(word));
  if (!base.every(has)) return false;
  const verdieping = adviceTokens(verdiepingPart);
  const extras = current.filter((word) => !base.some((token) => word === token || word.startsWith(token) || token.startsWith(word)));
  if (verdieping.length && extras.length && !verdieping.some((token) => extras.includes(token))) return false;
  return true;
}
