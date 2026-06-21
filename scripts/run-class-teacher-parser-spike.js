import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { aggregateClassTeacherReportGroups } from "../js/class-teacher-aggregator.js";
import { calculateClassTeacherAnalysis } from "../js/class-teacher-calculator.js";
import { parseClassTeacherReportWorkbook } from "../js/class-teacher-parser.js";

const DEFAULT_FOLDER = "example_folder_klassenleraar";
const TEXT_DECODER = new TextDecoder("utf-8");

const folder = process.argv[2] || DEFAULT_FOLDER;
const files = fs.readdirSync(folder)
  .filter((fileName) => fileName.toLowerCase().endsWith(".xlsx"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (!files.length) {
  console.error(`No .xlsx files found in ${folder}`);
  process.exit(1);
}

const reports = files.map((fileName) => {
  const filePath = path.join(folder, fileName);
  const workbook = readWorkbook(filePath);
  return parseClassTeacherReportWorkbook(workbook);
});

const aggregations = aggregateClassTeacherReportGroups(reports);
const analyses = aggregations.map((aggregation) => calculateClassTeacherAnalysis(aggregation));
const output = {
  folder,
  fileCount: reports.length,
  classes: analyses.map(summariseAnalysis),
  reports: reports.map(summariseReport),
};

const blockingIssues = [
  ...reports.flatMap((report) => {
    const issues = [];
    if (!report.classCode) issues.push(`${report.fileName}: missing classCode`);
    if (!report.periodId) issues.push(`${report.fileName}: missing periodId`);
    if (!report.totals.subjectCount) issues.push(`${report.fileName}: no subjects`);
    if (!report.totals.studentCount) issues.push(`${report.fileName}: no students`);
    return issues;
  }),
  ...aggregations.flatMap((aggregation) => {
    const issues = [];
    if (!aggregation.classCode) issues.push("aggregation: missing classCode");
    if (!aggregation.totals.periodCount) issues.push(`${aggregation.classCode}: no periods`);
    if (!aggregation.totals.subjectCount) issues.push(`${aggregation.classCode}: no subjects`);
    if (!aggregation.totals.studentCount) issues.push(`${aggregation.classCode}: no students`);
    return issues;
  }),
];

console.log(JSON.stringify(output, null, 2));

if (blockingIssues.length) {
  console.error("\nBlocking parser spike issues:");
  blockingIssues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

function summariseReport(report) {
  const unknownSubjects = unique(report.warnings
    .filter((warning) => warning.code === "unknown_subject" && warning.details?.subject)
    .map((warning) => warning.details.subject));
  return {
    fileName: report.fileName,
    sheetName: report.sheetName,
    classCode: report.classCode,
    year: report.year,
    periodSchemaId: report.periodSchemaId,
    periodId: report.periodId,
    periodLabel: report.periodLabel,
    subjectCount: report.totals.subjectCount,
    studentCount: report.totals.studentCount,
    scoreCount: report.totals.scoreCount,
    missingSubjectScores: report.totals.missingSubjectScores,
    warnings: report.warnings.map((warning) => warning.code),
    unknownSubjects,
  };
}

function summariseAggregation(aggregation) {
  return {
    classCode: aggregation.classCode,
    year: aggregation.year,
    periodSchemaId: aggregation.periodSchemaId,
    track: aggregation.track,
    periods: aggregation.periods.map((period) => ({
      id: period.id,
      label: period.label,
      fileName: period.fileName,
      missing: period.missing,
    })),
    totals: aggregation.totals,
    keySubjects: aggregation.subjects.filter((subject) => subject.isKeySubject).map((subject) => subject.subject),
    unknownSubjects: aggregation.subjects.filter((subject) => !subject.known).map((subject) => subject.subject),
    warningCodes: unique(aggregation.warnings.map((warning) => warning.code)),
    sampleStudent: sampleAggregatedStudent(aggregation),
  };
}

function summariseAnalysis(analysis) {
  return {
    ...summariseAggregation(analysis),
    stats: analysis.stats,
    flagCounts: countFlags(analysis.students),
    sampleStudent: sampleCalculatedStudent(analysis),
  };
}

function sampleAggregatedStudent(aggregation) {
  const student = aggregation.students[0];
  if (!student) return null;
  return {
    name: student.name,
    yearScore: student.yearScore,
    latestOverallScore: student.latestOverallScore,
    overallScores: student.overallScores.map((score) => ({
      periodId: score.periodId,
      value: score.value,
      sourceMetric: score.sourceMetric,
    })),
    keySubjectLines: student.subjectLines
      .filter((line) => line.isKeySubject)
      .slice(0, 6)
      .map((line) => ({
        subject: line.subject,
        latestScore: line.latestScore,
        yearScore: line.yearScore,
        points: line.points.map((point) => ({
          periodId: point.periodId,
          value: point.value,
          sourceMetric: point.sourceMetric,
        })),
      })),
  };
}

function sampleCalculatedStudent(analysis) {
  const student = analysis.students.find((item) => item.flags?.length) || analysis.students[0];
  if (!student) return null;
  return {
    name: student.name,
    finalWeighted: student.finalWeighted,
    thresholdBand: student.thresholdBand?.id,
    percentile: student.percentile,
    yearScore: student.yearScore,
    latestOverallScore: student.latestOverallScore,
    keySubjectSummary: student.keySubjectSummary,
    overallTrend: student.overallTrend,
    subjectSpread: student.subjectSpread,
    flags: (student.flags || []).map((flag) => ({
      type: flag.type,
      label: flag.label,
      tone: flag.tone,
      detail: flag.detail,
    })),
    keySubjectLines: student.subjectLines
      .filter((line) => line.isKeySubject)
      .slice(0, 6)
      .map((line) => ({
        subject: line.subject,
        latestScore: line.latestScore,
        yearScore: line.yearScore,
        points: line.points.map((point) => ({
          periodId: point.periodId,
          value: point.value,
          sourceMetric: point.sourceMetric,
        })),
      })),
  };
}

function countFlags(students = []) {
  const counts = new Map();
  for (const student of students) {
    for (const flag of student.flags || []) {
      counts.set(flag.type, (counts.get(flag.type) || 0) + 1);
    }
  }
  return Object.fromEntries(Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0])));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function readWorkbook(filePath) {
  const entries = readZipEntries(fs.readFileSync(filePath));
  const sharedStrings = parseSharedStrings(readOptionalText(entries, "xl/sharedStrings.xml"));
  const relationships = parseRelationships(readRequiredText(entries, "xl/_rels/workbook.xml.rels"));
  const sheets = parseWorkbookSheets(readRequiredText(entries, "xl/workbook.xml"), relationships)
    .map((sheet) => parseWorksheet(readRequiredText(entries, sheet.path), sheet.name, sharedStrings));

  return {
    fileName: path.basename(filePath),
    sheetNames: sheets.map((sheet) => sheet.name),
    sheets,
  };
}

function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(view);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map();
  let pointer = centralDirectoryOffset;

  for (let i = 0; i < totalEntries; i += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) {
      throw new Error("Invalid ZIP central directory.");
    }

    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const fileNameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localHeaderOffset = view.getUint32(pointer + 42, true);
    const name = TEXT_DECODER.decode(bytes.subarray(pointer + 46, pointer + 46 + fileNameLength));

    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    const data = inflateZipEntry(method, compressed);
    entries.set(normaliseZipPath(name), data);
    pointer += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(view) {
  const minOffset = Math.max(0, view.byteLength - 22 - 65535);
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error("ZIP end-of-central-directory record not found.");
}

function inflateZipEntry(method, bytes) {
  if (method === 0) return bytes;
  if (method !== 8) throw new Error(`Unsupported ZIP compression method ${method}.`);
  try {
    return zlib.inflateRawSync(Buffer.from(bytes));
  } catch {
    return zlib.inflateSync(Buffer.from(bytes));
  }
}

function parseWorkbookSheets(xml, relationships) {
  return matchTags(xml, "sheet").map((tag) => {
    const attrs = attributes(tag);
    const target = relationships.get(attrs["r:id"] || attrs.id) || "";
    return {
      name: attrs.name || "Sheet",
      path: normaliseZipPath(target.startsWith("/") ? target.slice(1) : `xl/${target}`),
    };
  });
}

function parseRelationships(xml) {
  return new Map(matchTags(xml, "Relationship").map((tag) => {
    const attrs = attributes(tag);
    return [attrs.Id, attrs.Target];
  }));
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  return matchBlocks(xml, "si").map((block) => {
    return matchBlocks(block, "t").map((textNode) => decodeXml(textNode)).join("");
  });
}

function parseWorksheet(xml, name, sharedStrings) {
  const rows = [];
  for (const rowBlock of matchFullTags(xml, "row")) {
    const rowAttrs = attributes(rowBlock.openTag);
    const rowIndex = Number(rowAttrs.r) > 0 ? Number(rowAttrs.r) - 1 : rows.length;
    const row = rows[rowIndex] || [];
    for (const cellBlock of matchFullTags(rowBlock.inner, "c")) {
      const cellAttrs = attributes(cellBlock.openTag);
      const ref = cellAttrs.r || "";
      const col = columnIndexFromRef(ref);
      row[col] = parseCellValue(cellBlock.inner, cellAttrs, sharedStrings);
    }
    rows[rowIndex] = row;
  }

  const compactRows = Array.from({ length: rows.length }, (_, index) => trimTrailingEmptyCells(rows[index] || []));
  const trimmedRows = trimTrailingEmptyRows(compactRows);
  return {
    name,
    rows: trimmedRows,
    rowCount: trimmedRows.length,
    columnCount: trimmedRows.reduce((max, row) => Math.max(max, row.length), 0),
  };
}

function parseCellValue(inner, attrs, sharedStrings) {
  const inline = matchBlocks(inner, "t").map((value) => decodeXml(value)).join("");
  if (inline && attrs.t === "inlineStr") return inline;

  const rawValue = firstBlock(inner, "v");
  if (rawValue == null) return inline || "";
  const decoded = decodeXml(rawValue);
  if (attrs.t === "s") return sharedStrings[Number(decoded)] || "";
  if (attrs.t === "str") return decoded;
  const numeric = Number(decoded);
  return Number.isFinite(numeric) ? numeric : decoded;
}

function readRequiredText(entries, zipPath) {
  const bytes = entries.get(normaliseZipPath(zipPath));
  if (!bytes) throw new Error(`Missing required workbook part: ${zipPath}`);
  return TEXT_DECODER.decode(bytes);
}

function readOptionalText(entries, zipPath) {
  const bytes = entries.get(normaliseZipPath(zipPath));
  return bytes ? TEXT_DECODER.decode(bytes) : "";
}

function matchTags(xml, name) {
  return Array.from(xml.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))).map((match) => match[0]);
}

function matchBlocks(xml, name) {
  return Array.from(xml.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "g"))).map((match) => match[1]);
}

function firstBlock(xml, name) {
  const match = xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`));
  return match ? match[1] : null;
}

function matchFullTags(xml, name) {
  return Array.from(xml.matchAll(new RegExp(`(<${name}\\b[^>]*>)([\\s\\S]*?)<\\/${name}>`, "g"))).map((match) => ({
    openTag: match[1],
    inner: match[2],
  }));
}

function attributes(tag) {
  return Object.fromEntries(Array.from(tag.matchAll(/([\w:]+)="([^"]*)"/g)).map((match) => [match[1], decodeXml(match[2])]));
}

function columnIndexFromRef(ref) {
  const letters = String(ref || "A").replace(/[^A-Za-z]/g, "").toUpperCase();
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return Math.max(0, index - 1);
}

function trimTrailingEmptyCells(row = []) {
  const next = [...row];
  while (next.length && isEmpty(next[next.length - 1])) next.pop();
  return next;
}

function trimTrailingEmptyRows(rows) {
  const next = [...rows];
  while (next.length && next[next.length - 1].every(isEmpty)) next.pop();
  return next;
}

function isEmpty(value) {
  return value == null || value === "";
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function normaliseZipPath(zipPath) {
  return path.posix.normalize(String(zipPath || "").replace(/\\/g, "/"));
}
