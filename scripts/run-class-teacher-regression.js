import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aggregateClassTeacherReportGroups } from "../js/class-teacher-aggregator.js";
import { calculateClassTeacherAnalysis } from "../js/class-teacher-calculator.js";
import { parseClassTeacherReportWorkbook } from "../js/class-teacher-parser.js";
import { readWorkbook } from "./workbook-reader.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLE_FOLDER = path.join(ROOT, "example_folder_klassenleraar");
const DIST_FOLDER = path.join(ROOT, "dist");
const SHOULD_BUILD = !process.argv.includes("--no-build");

const EXPECTED_REPORTS = {
  "1STEAM1 Trimester 1.xlsx": { classCode: "1STEAM1", year: 1, schema: "year_1_2", periodId: "trimester_1", subjectCount: 17, studentCount: 25 },
  "1STEAM1 Trimester 2.xlsx": { classCode: "1STEAM1", year: 1, schema: "year_1_2", periodId: "trimester_2", subjectCount: 17, studentCount: 25 },
  "1STEAM1 Trimester 3.xlsx": { classCode: "1STEAM1", year: 1, schema: "year_1_2", periodId: "trimester_3", subjectCount: 17, studentCount: 25 },
  "1STEAM1 Jaar.xlsx": { classCode: "1STEAM1", year: 1, schema: "year_1_2", periodId: "year", subjectCount: 17, studentCount: 25 },
  "3NW3 Semester 1.xlsx": { classCode: "3NW3", year: 3, schema: "year_3_4", periodId: "semester_1", subjectCount: 17, studentCount: 22 },
  "3NW3 Semester 2 - voorlopig resultaat.xlsx": { classCode: "3NW3", year: 3, schema: "year_3_4", periodId: "semester_2_prelim", subjectCount: 17, studentCount: 22 },
  "3NW3 Semester 2.xlsx": { classCode: "3NW3", year: 3, schema: "year_3_4", periodId: "semester_2", subjectCount: 17, studentCount: 22 },
  "3NW3 Jaarrapport.xlsx": { classCode: "3NW3", year: 3, schema: "year_3_4", periodId: "year", subjectCount: 17, studentCount: 22 },
  "6LWI6 Semester 1.xlsx": { classCode: "6LWI6", year: 6, schema: "year_5_6", periodId: "semester_1", subjectCount: 14, studentCount: 9 },
  "6LWI6 Semester 2.xlsx": { classCode: "6LWI6", year: 6, schema: "year_5_6", periodId: "semester_2", subjectCount: 13, studentCount: 9 },
  "6LWI6 Jaarrapport.xlsx": { classCode: "6LWI6", year: 6, schema: "year_5_6", periodId: "year", subjectCount: 14, studentCount: 9 },
};

const EXPECTED_CLASSES = {
  "1STEAM1": {
    year: 1,
    schema: "year_1_2",
    trackId: "STEaM",
    periodCount: 4,
    expectedPeriodCount: 4,
    subjectCount: 17,
    keySubjectCount: 6,
    studentCount: 25,
    mean: 77.2,
    below65: 1,
    mainSubjectDangerCount: 1,
    positiveProfileCount: 15,
  },
  "3NW3": {
    year: 3,
    schema: "year_3_4",
    trackId: "NW",
    periodCount: 4,
    expectedPeriodCount: 4,
    subjectCount: 17,
    keySubjectCount: 8,
    studentCount: 22,
    mean: 72.8,
    below65: 4,
    mainSubjectDangerCount: 6,
    positiveProfileCount: 4,
  },
  "6LWI6": {
    year: 6,
    schema: "year_5_6",
    trackId: "Latijn_Wiskunde",
    periodCount: 3,
    expectedPeriodCount: 3,
    subjectCount: 14,
    keySubjectCount: 6,
    studentCount: 9,
    mean: 73.6,
    below65: 0,
    mainSubjectDangerCount: 1,
    positiveProfileCount: 1,
  },
};

const MAIN_SUBJECT_DANGER_FLAGS = new Set([
  "key_subject_critical",
  "multiple_key_subjects_weak",
  "track_mismatch_signal",
]);

main();

function main() {
  const reports = loadReports();
  assertParserFixtures(reports);

  const analyses = aggregateClassTeacherReportGroups(reports).map((aggregation) => calculateClassTeacherAnalysis(aggregation));
  assertAggregations(analyses);
  assertCalculations(analyses);

  if (SHOULD_BUILD) {
    runViteBuild();
    assertNoExampleDataInDist();
  } else if (fs.existsSync(DIST_FOLDER)) {
    assertNoExampleDataInDist();
  }

  logPass("Klassenleraar regressie afgerond.");
}

function loadReports() {
  assert(fs.existsSync(EXAMPLE_FOLDER), `Example folder not found: ${EXAMPLE_FOLDER}`);
  const files = fs.readdirSync(EXAMPLE_FOLDER)
    .filter((fileName) => fileName.toLowerCase().endsWith(".xlsx"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  assertEqual(files.length, Object.keys(EXPECTED_REPORTS).length, "Aantal voorbeeldrapporten");

  return files.map((fileName) => {
    assert(EXPECTED_REPORTS[fileName], `Onverwacht voorbeeldrapport: ${fileName}`);
    const workbook = readWorkbook(path.join(EXAMPLE_FOLDER, fileName));
    return parseClassTeacherReportWorkbook(workbook);
  });
}

function assertParserFixtures(reports) {
  for (const report of reports) {
    const expected = EXPECTED_REPORTS[report.fileName];
    assert(expected, `Geen fixtureverwachting voor ${report.fileName}`);
    assertEqual(report.classCode, expected.classCode, `${report.fileName}: klascode`);
    assertEqual(report.year, expected.year, `${report.fileName}: leerjaar`);
    assertEqual(report.periodSchemaId, expected.schema, `${report.fileName}: periodeschema`);
    assertEqual(report.periodId, expected.periodId, `${report.fileName}: periode`);
    assertEqual(report.totals.subjectCount, expected.subjectCount, `${report.fileName}: vakken`);
    assertEqual(report.totals.studentCount, expected.studentCount, `${report.fileName}: leerlingen`);
    assertNoBlockingReportWarnings(report);
  }
  logPass(`Parser fixtures: ${reports.length} rapportbestanden.`);
}

function assertAggregations(analyses) {
  assertEqual(analyses.length, Object.keys(EXPECTED_CLASSES).length, "Aantal klassen");
  for (const analysis of analyses) {
    const expected = EXPECTED_CLASSES[analysis.classCode];
    assert(expected, `Onverwachte klas in analyse: ${analysis.classCode}`);
    assertEqual(analysis.year, expected.year, `${analysis.classCode}: leerjaar`);
    assertEqual(analysis.periodSchemaId, expected.schema, `${analysis.classCode}: periodeschema`);
    assertEqual(analysis.track?.id, expected.trackId, `${analysis.classCode}: studierichting`);
    assertEqual(analysis.totals.periodCount, expected.periodCount, `${analysis.classCode}: beschikbare periodes`);
    assertEqual(analysis.totals.expectedPeriodCount, expected.expectedPeriodCount, `${analysis.classCode}: verwachte periodes`);
    assertEqual(analysis.totals.subjectCount, expected.subjectCount, `${analysis.classCode}: vakken`);
    assertEqual(analysis.totals.keySubjectCount, expected.keySubjectCount, `${analysis.classCode}: hoofdvakken`);
    assertEqual(analysis.totals.studentCount, expected.studentCount, `${analysis.classCode}: leerlingen`);
    assertEqual(analysis.students.length, expected.studentCount, `${analysis.classCode}: leerlingkaarten`);
    assert(analysis.students.every((student) => Number.isFinite(student.finalWeighted)), `${analysis.classCode}: niet elke kaart heeft een jaartotaal`);
    assert(analysis.students.every((student) => student.overallTrend.points.length === expected.expectedPeriodCount), `${analysis.classCode}: jaargrafiekpunten komen niet overeen met periodes`);
  }
  logPass(`Aggregatie: ${analyses.length} klassen maken leerlingkaarten.`);
}

function assertCalculations(analyses) {
  for (const analysis of analyses) {
    const expected = EXPECTED_CLASSES[analysis.classCode];
    assertClose(analysis.stats.mean, expected.mean, `${analysis.classCode}: klasgemiddelde`);
    assertEqual(analysis.stats.below65, expected.below65, `${analysis.classCode}: jaartotaal onder 65`);
    assertEqual(analysis.stats.keyRiskCount, expected.mainSubjectDangerCount, `${analysis.classCode}: hoofdvak in de gevarenzone`);
    assertEqual(analysis.stats.positiveProfileCount, expected.positiveProfileCount, `${analysis.classCode}: sterke stabiele profielen`);

    const dangerStudents = analysis.students.filter(hasMainSubjectDanger);
    assertEqual(dangerStudents.length, expected.mainSubjectDangerCount, `${analysis.classCode}: hoofdvak-signalen tellen`);
    assert(dangerStudents.every((student) => student.keySubjectSummary.below60.length || student.keySubjectSummary.below50.length), `${analysis.classCode}: hoofdvak-signaal zonder hoofdvakdetail`);

    const criticalStudents = analysis.students.filter((student) => student.flags.some((flag) => flag.type === "key_subject_critical"));
    assert(criticalStudents.every((student) => student.keySubjectSummary.below50.length), `${analysis.classCode}: kritisch hoofdvak zonder score onder 50`);
  }
  logPass("Berekeningen: hoofdvak-signalen en dashboardstatistieken.");
}

function assertNoBlockingReportWarnings(report) {
  const blockingCodes = new Set([
    "missing_class_code",
    "missing_period",
    "missing_period_schema",
    "no_students",
    "no_subjects",
    "no_report_layout",
    "no_report_sheet",
  ]);
  const blocking = (report.warnings || []).filter((warning) => blockingCodes.has(warning.code));
  assert(!blocking.length, `${report.fileName}: blokkerende parserwarnings: ${blocking.map((warning) => warning.code).join(", ")}`);
}

function hasMainSubjectDanger(student) {
  return (student.flags || []).some((flag) => MAIN_SUBJECT_DANGER_FLAGS.has(flag.type));
}

function runViteBuild() {
  const viteBin = path.join(ROOT, "node_modules", "vite", "bin", "vite.js");
  assert(fs.existsSync(viteBin), `Vite binary not found: ${viteBin}`);
  execFileSync(process.execPath, [viteBin, "build"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  logPass("Build verification: vite build.");
}

function assertNoExampleDataInDist() {
  assert(fs.existsSync(DIST_FOLDER), "dist folder bestaat niet na build.");
  const distFiles = listFiles(DIST_FOLDER).map((filePath) => path.relative(DIST_FOLDER, filePath).replace(/\\/g, "/"));
  const leaked = distFiles.filter((fileName) => (
    /\.xlsx$/i.test(fileName)
    || fileName.includes("example_folder_klassenleraar")
    || fileName.includes("example_data")
  ));
  assert(!leaked.length, `Voorbeelddata staat in dist: ${leaked.join(", ")}`);
  logPass("Dist hygiene: geen voorbeelddata in build-output.");
}

function listFiles(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(folder, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  assert(Object.is(actual, expected), `${label}: verwacht ${expected}, kreeg ${actual}`);
}

function assertClose(actual, expected, label, tolerance = 0.05) {
  assert(Number.isFinite(actual), `${label}: kreeg geen getal`);
  assert(Math.abs(actual - expected) <= tolerance, `${label}: verwacht ${expected}, kreeg ${actual}`);
}

function logPass(message) {
  console.log(`OK ${message}`);
}
