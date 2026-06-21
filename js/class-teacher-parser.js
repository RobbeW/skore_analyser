import {
  canonicalSubject,
  inferPeriodFromText,
  inferTrackFromClassCode,
  inferYearFromClassCode,
  isKnownSubject,
  normaliseReportMetric,
  periodSchemaForYear,
} from "./class-teacher-config.js";

const REPORT_CLASS_RE = /^\s*Klas:\s*(.+?)\s*$/i;
const MEDIAN_RE = /klasmediaan|klasgemiddelde|groepsgemiddelde/i;

export function parseClassTeacherReportWorkbook(workbook, options = {}) {
  const warnings = [];
  const mainSheet = findMainReportSheet(workbook);
  if (!mainSheet) {
    return emptyReport(workbook, warnings.concat(warning("no_report_sheet", "Geen rapportblad met klasrij gevonden.")));
  }

  const layout = detectReportLayout(mainSheet);
  if (!layout) {
    return emptyReport(workbook, warnings.concat(warning("no_report_layout", `Geen herkenbare rapportstructuur in ${mainSheet.name}.`)));
  }

  const classCode = options.classCode || extractClassCode(mainSheet.rows[layout.classRowIndex]?.[0]) || extractClassCode(workbook.fileName);
  const year = options.year ?? inferYearFromClassCode(classCode);
  const periodSchema = options.periodSchema || periodSchemaForYear(year);
  const period = options.period || inferPeriodFromText(`${workbook.fileName} ${mainSheet.name}`, periodSchema);
  const trackGuess = inferTrackFromClassCode(classCode, year);
  const columns = detectSubjectColumns(mainSheet, layout, warnings);
  const students = extractStudents(mainSheet, layout, columns, period, warnings);

  if (!classCode) warnings.push(warning("missing_class_code", "Geen klascode gevonden."));
  if (!year) warnings.push(warning("missing_year", "Geen leerjaar uit de klascode afgeleid."));
  if (!periodSchema) warnings.push(warning("missing_period_schema", "Geen periodeschema gevonden voor dit leerjaar."));
  if (!period) warnings.push(warning("missing_period", "Geen periode uit bestandsnaam of bladnaam afgeleid."));
  if (!students.length) warnings.push(warning("no_students", "Geen leerlingen gevonden."));
  if (!columns.subjectGroups.length) warnings.push(warning("no_subjects", "Geen vakgroepen gevonden."));
  if (!columns.overallGroup && !period?.optionalOverallScore) {
    warnings.push(warning("missing_overall", "Geen algemeen totaal gevonden voor deze periode."));
  }

  return {
    fileName: workbook.fileName,
    sheetName: mainSheet.name,
    classCode,
    year,
    periodSchemaId: periodSchema?.id || null,
    periodId: period?.id || null,
    periodLabel: period?.label || "",
    trackGuess,
    subjects: columns.subjectGroups.map((group) => ({
      raw: group.rawSubject,
      canonical: group.subject,
      known: group.known,
      metrics: group.columns.map((column) => column.metric),
    })),
    students,
    warnings,
    totals: {
      subjectCount: columns.subjectGroups.length,
      studentCount: students.length,
      scoreCount: students.reduce((sum, student) => sum + student.subjectScores.filter((score) => Number.isFinite(score.score)).length, 0),
      missingSubjectScores: students.reduce((sum, student) => sum + student.subjectScores.filter((score) => !Number.isFinite(score.score)).length, 0),
    },
  };
}

function emptyReport(workbook, warnings) {
  return {
    fileName: workbook.fileName,
    sheetName: "",
    classCode: extractClassCode(workbook.fileName),
    year: inferYearFromClassCode(workbook.fileName),
    periodSchemaId: null,
    periodId: null,
    periodLabel: "",
    trackGuess: inferTrackFromClassCode(workbook.fileName),
    subjects: [],
    students: [],
    warnings,
    totals: {
      subjectCount: 0,
      studentCount: 0,
      scoreCount: 0,
      missingSubjectScores: 0,
    },
  };
}

function findMainReportSheet(workbook) {
  return (workbook.sheets || []).find((sheet) => {
    if (/onvoldoendes/i.test(sheet.name)) return false;
    return detectReportLayout(sheet);
  }) || null;
}

function detectReportLayout(sheet) {
  const rows = sheet.rows || [];
  for (let rowIndex = 0; rowIndex < rows.length - 2; rowIndex += 1) {
    if (!extractClassCode(rows[rowIndex]?.[0])) continue;
    const metricRowIndex = findMetricRow(rows, rowIndex + 1, Math.min(rowIndex + 5, rows.length - 1));
    if (metricRowIndex == null) continue;
    const medianRowIndex = findMedianRow(rows, metricRowIndex + 1, Math.min(metricRowIndex + 4, rows.length - 1));
    return {
      classRowIndex: rowIndex,
      subjectRowIndex: rowIndex,
      metricRowIndex,
      medianRowIndex: medianRowIndex ?? metricRowIndex + 1,
      firstStudentRowIndex: (medianRowIndex ?? metricRowIndex + 1) + 1,
    };
  }
  return null;
}

function findMetricRow(rows, start, end) {
  for (let rowIndex = start; rowIndex <= end; rowIndex += 1) {
    const metricCount = (rows[rowIndex] || []).slice(1).filter((cell) => normaliseReportMetric(cell)).length;
    if (metricCount >= 2) return rowIndex;
  }
  return null;
}

function findMedianRow(rows, start, end) {
  for (let rowIndex = start; rowIndex <= end; rowIndex += 1) {
    if (MEDIAN_RE.test(text(rows[rowIndex]?.[0]))) return rowIndex;
  }
  return null;
}

function detectSubjectColumns(sheet, layout, warnings) {
  const subjectRow = sheet.rows[layout.subjectRowIndex] || [];
  const metricRow = sheet.rows[layout.metricRowIndex] || [];
  const groups = new Map();
  let currentRawSubject = "";

  for (let col = 1; col < Math.max(subjectRow.length, metricRow.length); col += 1) {
    const rawSubject = text(subjectRow[col]);
    if (rawSubject) currentRawSubject = rawSubject;

    const metric = normaliseReportMetric(metricRow[col]);
    if (!metric || !currentRawSubject) continue;

    const subject = canonicalSubject(currentRawSubject);
    const key = subject.toUpperCase();
    if (!groups.has(key)) {
      const known = isKnownSubject(currentRawSubject) || subject === "Algemeen totaal";
      if (!known) {
        warnings.push(warning("unknown_subject", `Onbekende vakafkorting: ${currentRawSubject}.`, { subject: currentRawSubject }));
      }
      groups.set(key, {
        rawSubject: currentRawSubject,
        subject,
        known,
        columns: [],
      });
    }
    groups.get(key).columns.push({ metric, index: col });
  }

  const allGroups = Array.from(groups.values());
  return {
    overallGroup: allGroups.find((group) => group.subject === "Algemeen totaal") || null,
    subjectGroups: allGroups.filter((group) => group.subject !== "Algemeen totaal"),
  };
}

function extractStudents(sheet, layout, columns, period, warnings) {
  const rows = sheet.rows || [];
  const seenNames = new Set();
  const students = [];

  for (let rowIndex = layout.firstStudentRowIndex; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    if (isBlankRow(row)) break;
    const name = text(row[0]);
    if (!name || MEDIAN_RE.test(name) || /^klas:/i.test(name)) continue;

    const key = name.toLowerCase();
    if (seenNames.has(key)) {
      warnings.push(warning("duplicate_student", `Dubbele leerlingnaam in rapportblad: ${name}.`, { student: name }));
    }
    seenNames.add(key);

    const overall = columns.overallGroup
      ? pickScore(row, columns.overallGroup.columns, period?.overallScorePriority || ["PCT"])
      : { score: null, sourceMetric: "" };

    const subjectScores = columns.subjectGroups.map((group) => {
      const picked = pickScore(row, group.columns, period?.subjectScorePriority || ["PCT", "TOT", "EX", "DW"]);
      return {
        subject: group.subject,
        rawSubject: group.rawSubject,
        score: picked.score,
        sourceMetric: picked.sourceMetric,
        metrics: metricsForRow(row, group.columns),
        isMissing: !Number.isFinite(picked.score),
        sourceRow: rowIndex + 1,
      };
    });

    students.push({
      id: stableStudentId(name),
      name,
      overallScore: overall.score,
      overallSourceMetric: overall.sourceMetric,
      subjectScores,
      sourceRow: rowIndex + 1,
    });
  }

  return students;
}

function pickScore(row, columns, priorities) {
  for (const metric of priorities) {
    const column = columns.find((candidate) => candidate.metric === metric);
    if (!column) continue;
    const value = parseScore(row[column.index]);
    if (Number.isFinite(value)) return { score: value, sourceMetric: metric };
  }

  for (const column of columns) {
    const value = parseScore(row[column.index]);
    if (Number.isFinite(value)) return { score: value, sourceMetric: column.metric };
  }

  return { score: null, sourceMetric: "" };
}

function metricsForRow(row, columns) {
  return Object.fromEntries(columns.map((column) => [column.metric, parseScore(row[column.index])]));
}

function parseScore(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null || value === "") return null;
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractClassCode(value) {
  const raw = text(value);
  const classMatch = raw.match(REPORT_CLASS_RE);
  if (classMatch) return classMatch[1].trim();
  const fileMatch = raw.match(/\b([1-6][A-Za-z0-9-]*\d*)\b/);
  return fileMatch ? fileMatch[1] : "";
}

function stableStudentId(name) {
  return text(name).toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
}

function warning(code, message, details = {}) {
  return { code, message, details };
}

function isBlankRow(row = []) {
  return row.every((value) => text(value) === "");
}

function text(value) {
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}
