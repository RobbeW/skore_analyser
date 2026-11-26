import fs from "node:fs";
import path from "node:path";
import { aggregateClassTeacherReportGroups } from "../js/class-teacher-aggregator.js";
import { calculateClassTeacherAnalysis } from "../js/class-teacher-calculator.js";
import { parseClassTeacherReportWorkbook } from "../js/class-teacher-parser.js";
import { readWorkbook } from "./workbook-reader.js";

const DEFAULT_FOLDER = "example_folder_klassenleraar";

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
