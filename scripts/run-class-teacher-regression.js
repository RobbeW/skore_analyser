import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aggregateClassTeacherReportGroups } from "../js/class-teacher-aggregator.js";
import { calculateClassTeacherAnalysis } from "../js/class-teacher-calculator.js";
import { canonicalSubject, inferPeriodFromText, isKnownSubject, periodSchemaForYear } from "../js/class-teacher-config.js";
import { parseClassTeacherReportWorkbook } from "../js/class-teacher-parser.js";
import {
  appendSuggestionToNote,
  generateClassTeacherNoteSuggestion,
  generateSubjectTeacherNoteSuggestion,
} from "../js/note-guidance.js";
import { readWorkbook } from "./workbook-reader.js";
import { buildSubjectFeedbackPayload, normaliseName, parseSubjectFeedback } from "../src/lib/teacher-decisions.js";
import { applySchoolWeightsToAggregation, builtInWeightTables, findSchoolWeights, parseWeightsText, schoolBasketPreset, weightedOverall } from "../js/school-weights.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLE_FOLDER = path.join(ROOT, "example_folder_klassenleraar");
const DIST_FOLDER = path.join(ROOT, "dist");
const SHOULD_BUILD = !process.argv.includes("--no-build");

const EXPECTED_REPORTS = {
  "1STEAM1 Trimester 1.xlsx": { classCode: "1STEAM1", year: 1, schema: "year_1_2", periodId: "trimester_1", subjectCount: 17, studentCount: 25 },
  "1STEAM1 Trimester 2.xlsx": { classCode: "1STEAM1", year: 1, schema: "year_1_2", periodId: "trimester_2", subjectCount: 17, studentCount: 25 },
  "1STEAM1 Trimester 3.xlsx": { classCode: "1STEAM1", year: 1, schema: "year_1_2", periodId: "trimester_3", subjectCount: 17, studentCount: 25 },
  "1STEAM1 Jaar.xlsx": { classCode: "1STEAM1", year: 1, schema: "year_1_2", periodId: "year", subjectCount: 17, studentCount: 25 },
  "3NW3 Semester 1.xlsx": { classCode: "3NW3", year: 3, schema: "year_3_4", periodId: "semester_1", subjectCount: 15, studentCount: 22 },
  "3NW3 Semester 2 - voorlopig resultaat.xlsx": { classCode: "3NW3", year: 3, schema: "year_3_4", periodId: "semester_2_prelim", subjectCount: 15, studentCount: 22 },
  "3NW3 Semester 2.xlsx": { classCode: "3NW3", year: 3, schema: "year_3_4", periodId: "semester_2", subjectCount: 15, studentCount: 22 },
  "3NW3 Jaarrapport.xlsx": { classCode: "3NW3", year: 3, schema: "year_3_4", periodId: "year", subjectCount: 15, studentCount: 22 },
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
    subjectCount: 15,
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
  const reports = loadExampleReports();
  if (reports.length) {
    assertParserFixtures(reports);

    const analyses = aggregateClassTeacherReportGroups(reports).map((aggregation) => calculateClassTeacherAnalysis(aggregation));
    assertAggregations(analyses);
    assertCalculations(analyses);
  } else {
    logPass("Parser fixtures overgeslagen: example_folder_klassenleraar niet aanwezig.");
  }

  assertSyntheticClassTeacherRegression();
  assertSubjectAliases();
  assertNoteGuidance();
  assertMidYearClassCouncil();
  assertInterimReports();
  assertSchoolWeights();
  assertSubjectFeedbackHandover();

  if (SHOULD_BUILD) {
    runViteBuild();
    assertNoExampleDataInDist();
  } else if (fs.existsSync(DIST_FOLDER)) {
    assertNoExampleDataInDist();
  }

  logPass("Klassenleraar regressie afgerond.");
}

function loadExampleReports() {
  if (!fs.existsSync(EXAMPLE_FOLDER)) return [];
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

function assertSyntheticClassTeacherRegression() {
  const reports = buildSyntheticClassTeacherReports();
  const analyses = aggregateClassTeacherReportGroups(reports).map((aggregation) => calculateClassTeacherAnalysis(aggregation));
  assertEqual(analyses.length, 1, "Synthetische regressie: aantal klassen");

  const analysis = analyses[0];
  assertEqual(analysis.classCode, "3NW3", "Synthetische regressie: klascode");
  assertEqual(analysis.year, 3, "Synthetische regressie: leerjaar");
  assertEqual(analysis.periodSchemaId, "year_3_4", "Synthetische regressie: periodeschema");
  assertEqual(analysis.track?.id, "NW", "Synthetische regressie: richting");
  assertEqual(analysis.totals.periodCount, 4, "Synthetische regressie: periodes");
  assertEqual(analysis.totals.studentCount, 3, "Synthetische regressie: leerlingen");
  assert(analysis.subjects.some((subject) => subject.subject === "Wetenschappen" && subject.known), "Synthetische regressie: WET wordt niet als Wetenschappen herkend");

  assertClose(analysis.stats.mean, 60.3, "Synthetische regressie: klasgemiddelde");
  assertEqual(analysis.stats.below65, 2, "Synthetische regressie: jaartotaal onder 65");
  assertEqual(analysis.stats.below50, 1, "Synthetische regressie: jaartotaal onder 50");
  assertEqual(analysis.stats.keyRiskCount, 1, "Synthetische regressie: hoofdvak in de gevarenzone");
  assertEqual(analysis.stats.positiveProfileCount, 1, "Synthetische regressie: sterke stabiele profielen");

  const byName = new Map(analysis.students.map((student) => [student.name, student]));
  assertStudentHasFlag(byName.get("Bram Janssens"), "key_subject_critical", "Synthetische regressie: Bram hoofdvak onder 50");
  assertStudentHasFlag(byName.get("Bram Janssens"), "multiple_key_subjects_weak", "Synthetische regressie: Bram meerdere hoofdvakken zwak");
  assertStudentHasFlag(byName.get("Cato Peeters"), "overall_low_year", "Synthetische regressie: Cato jaartotaal onder 50");
  assertStudentHasFlag(byName.get("Amina De Smet"), "positive_stable_profile", "Synthetische regressie: Amina positief stabiel profiel");

  logPass("Synthetische klassenleraarregressie: berekeningen zonder voorbeeldbestanden.");
}

function assertMidYearClassCouncil() {
  // A December class council has only the first report: the analysis must still work.
  const firstReport = buildSyntheticClassTeacherReports().slice(0, 1);
  const [analysis] = aggregateClassTeacherReportGroups(firstReport).map((aggregation) => calculateClassTeacherAnalysis(aggregation));
  assertEqual(analysis.totals.periodCount, 1, "Tussentijdse klassenraad: 1 periode");
  assertEqual(analysis.totals.expectedPeriodCount, 4, "Tussentijdse klassenraad: 4 verwachte periodes");
  assertEqual(analysis.totals.studentCount, 3, "Tussentijdse klassenraad: leerlingen");
  assert(analysis.students.every((student) => Number.isFinite(student.finalWeighted)), "Tussentijdse klassenraad: elke leerling heeft een totaal");
  logPass("Tussentijdse klassenraad: analyse met 1 rapport.");
}

function assertInterimReports() {
  const schema = periodSchemaForYear(3);
  const cases = [
    ["3NW4 Dagelijks Werk 1.xlsx", "dw_1"],
    ["3NW4 Dagelijks werk 3.xlsx", "dw_3"],
    ["3NW4 Klassenraad 1.xlsx", "kr_1"],
    ["3NW3 Semester 2 - voorlopig resultaat.xlsx", "semester_2_prelim"],
    ["3NW3 Semester 1.xlsx", "semester_1"],
    ["3NW3 Jaarrapport.xlsx", "year"],
  ];
  for (const [fileName, expected] of cases) {
    assertEqual(inferPeriodFromText(fileName, schema)?.id || null, expected, `Tussentijdse rapporten: periode voor ${fileName}`);
  }
  assertEqual(canonicalSubject("FrKen"), "Frans kennis", "Tussentijdse rapporten: FrKen");
  assertEqual(canonicalSubject("DTAI"), "Design Thinking", "Tussentijdse rapporten: DTAI");

  const reports = buildSyntheticClassTeacherReports().slice(0, 3).map((report, index) => ({
    ...report,
    fileName: `synthetic Dagelijks werk ${index + 1}.xlsx`,
    periodId: `dw_${index + 1}`,
    periodLabel: `Dagelijks werk ${index + 1}`,
  }));
  const [analysis] = aggregateClassTeacherReportGroups(reports).map((aggregation) => calculateClassTeacherAnalysis(aggregation));
  assertEqual(analysis.totals.interimPeriodCount, 3, "Tussentijdse rapporten: 3 DW-rapporten");
  assertEqual(analysis.totals.expectedPeriodCount, 4, "Tussentijdse rapporten: DW telt niet als verwacht rapport");
  assert(!analysis.periods.some((period) => period.id === "dw_4"), "Tussentijdse rapporten: ontbrekende DW-rapporten verschijnen niet");
  assertEqual(analysis.periods.slice(0, 3).map((period) => period.id).join(","), "dw_1,dw_2,dw_3", "Tussentijdse rapporten: volgorde");
  logPass("Tussentijdse rapporten: Dagelijks werk en Klassenraad herkend.");
}

function assertSchoolWeights() {
  const tables = builtInWeightTables().filter((table) => table.grade === 1);
  assertEqual(tables.length, 7, "Schoolgewichten: 7 tabellen graad 1");
  for (const table of tables) {
    assert(table.trackId, `Schoolgewichten: richting gekend voor ${table.trackCode}`);
    assertEqual(table.totals.total, 102, `Schoolgewichten: totaal 102 voor ${table.trackCode}`);
    assert(table.subjects.every((item) => item.total === item.hours * 3), `Schoolgewichten: elk vak 3 x uren in ${table.trackCode}`);
  }
  const pasted = parseWeightsText([
    "wiz1ste jaar 1ste graad ASO / g1_j1_Lat / Trimester 1",
    "DW\tEX\t\tEXPA",
    "Beeld (1 uur) [BLD] (1 uur)",
    "1",
    "Wiskunde (4 uur) [WIS] (4 uur)",
    "4",
    "8",
  ].join("\n"));
  assertEqual(pasted.trackId, "Latijn", "Schoolgewichten: plaktekst met ruis ervoor");
  assertEqual(pasted.subjects.find((item) => item.code === "BLD").total, 3, "Schoolgewichten: vak zonder examen = DW x 3");
  assertEqual(pasted.subjects.find((item) => item.code === "WIS").total, 12, "Schoolgewichten: DW + EX");

  const lat = findSchoolWeights({ year: 1, trackId: "Latijn" });
  const overall = weightedOverall([{ subject: "Latijn", score: 80 }, { subject: "Beeld", score: 50 }], lat);
  assertEqual(overall.value, 75, "Schoolgewichten: gewogen totaal (15 x 80 + 3 x 50) / 18");

  const preset = schoolBasketPreset({ classCode: "1STEAM2", subject: "Wiskunde (5 uur)" });
  assertEqual(preset?.order.join(","), "DW1,EX1,DW2,EX2,DW3,EX3", "Schoolgewichten: mandjes per trimester");
  assertEqual(preset?.weights.EX2, 10, "Schoolgewichten: EX-gewicht wiskunde STEaM");
  const noExam = schoolBasketPreset({ classCode: "1LAT1", subject: "Beeld" });
  assertEqual(noExam?.order.join(","), "DW1,DW2,DW3", "Schoolgewichten: geen examen = alleen DW");

  const aggregation = {
    year: 1,
    students: [{
      id: "x",
      periods: [{ periodId: "trimester_1", overallScore: 65, overallSourceMetric: "VAKGEMIDDELDE", subjectScores: { Latijn: { subject: "Latijn", score: 80 }, Beeld: { subject: "Beeld", score: 50 } } }],
      overallScores: [{ periodId: "trimester_1", value: 65, sourceMetric: "VAKGEMIDDELDE" }],
      yearScore: null,
      latestOverallScore: 65,
    }],
  };
  const weighted = applySchoolWeightsToAggregation(aggregation, { year: 1, trackId: "Latijn" });
  assertEqual(weighted.students[0].latestOverallScore, 75, "Schoolgewichten: rapport zonder totaal krijgt gewogen totaal");
  logPass("Schoolgewichten: graad 1 ingelezen, gewogen totaal en mandjes.");
  assertGrade2Weights();
}

function assertGrade2Weights() {
  const tables = builtInWeightTables().filter((table) => table.grade === 2);
  assertEqual(tables.length, 54, "Schoolgewichten graad 2: 18 richtingen x 3 periodes");
  assert(tables.every((table) => table.trackId), "Schoolgewichten graad 2: elke richting gekend");
  const factor = { semester_1: [4, 1], semester_2: [6, 1.5], year: [null, 2.5] };
  const off = [];
  for (const table of tables) {
    for (const item of table.subjects) {
      const expected = item.hasExam ? factor[table.periodKey][0] * item.hours : factor[table.periodKey][1] * item.hours;
      if (Math.abs(item.total - expected) > 0.05) off.push(`${table.trackCode} ${table.period} ${item.code}`);
    }
  }
  // 3GLST SE²AL was a slip in Skore and is stored corrected, so no exceptions remain.
  assertEqual(off.join(","), "", "Schoolgewichten graad 2: uren-regel (S1 4x, S2 6x, zonder examen 1x/1.5x/2.5x)");

  const nw = findSchoolWeights({ year: 3, trackId: "NW", periodId: "dw_2" });
  const frans = nw.subjects.find((item) => item.subject === "Frans");
  assertEqual(`${frans.dw}/${frans.ex}`, "9.6/6.4", "Schoolgewichten graad 2: Frans deelvakken = DW, Frans zelf = EX");
  assertEqual(nw.period, "Semester 1", "Schoolgewichten graad 2: DW-rapport gebruikt semester 1");
  assertEqual(findSchoolWeights({ year: 3, trackId: "NW", periodId: "dw_5" }).period, "Semester 2", "Schoolgewichten graad 2: DW5 gebruikt semester 2");
  const dwOnly = weightedOverall([{ subject: "Wiskunde", score: 80 }, { subject: "Godsdienst", score: 50 }], nw, "dw");
  assertEqual(dwOnly.value, 71.4, "Schoolgewichten graad 2: DW-basis (5 x 80 + 2 x 50) / 7");

  const iw = schoolBasketPreset({ classCode: "3NW4", subject: "Informaticawetenschappen (1 uur )" });
  assertEqual(iw?.order.join(","), "DW1,EX1,DW2,EX2", "Schoolgewichten graad 2: mandjes IW 3NW");
  assertEqual(`${iw.weights.DW1}/${iw.weights.EX1}/${iw.weights.DW2}/${iw.weights.EX2}`, "1/3/1.5/4.5", "Schoolgewichten graad 2: gewichten IW 3NW");
  const wis = schoolBasketPreset({ classCode: "3NW4", subject: "Wiskunde" });
  assertEqual(wis?.weights.EXPAR, 11.2, "Schoolgewichten graad 2: EXPA wiskunde = EXPAR-mandje");
  logPass("Schoolgewichten graad 2: 54 tabellen, deelvakken, DW-basis en mandjes.");
  assertGrade3Weights();
}

function assertGrade3Weights() {
  const tables = builtInWeightTables().filter((table) => table.grade === 3 && table.year === 5);
  assertEqual(tables.length, 42, "Schoolgewichten graad 3: 14 richtingen 5de jaar x 3 periodes");
  assert(tables.every((table) => table.trackId && table.year === 5), "Schoolgewichten graad 3: richting en leerjaar 5 gekend");
  const factor = { semester_1: [4, 1], semester_2: [6, 1.5], year: [null, 2.5] };
  const off = [];
  for (const table of tables) {
    for (const item of table.subjects) {
      const expected = item.hasExam ? factor[table.periodKey][0] * item.hours : factor[table.periodKey][1] * item.hours;
      if (Math.abs(item.total - expected) > 0.05) off.push(`${table.trackCode} ${table.period} ${item.code}`);
    }
  }
  // Kept as pasted (confirmed 2026-11-15): 5HW SOC (17 / 23 instead of 16 / 24) and PRO in S2 (1 instead of 1.5).
  assertEqual(off.join(","), "g3_j1_HW Semester 1 SOC,g3_j1_HW Semester 2 PRO,g3_j1_HW Semester 2 SOC", "Schoolgewichten graad 3: uren-regel");
  assertEqual(findSchoolWeights({ year: 5, trackId: "Wetenschappen_Wiskunde", classCode: "5WWI8" })?.trackCode, "g3_j1_WWI8", "Schoolgewichten graad 3: variant 8 uur uit klascode");
  assertEqual(findSchoolWeights({ year: 5, trackId: "Wetenschappen_Wiskunde", classCode: "5WWI1" })?.trackCode, "g3_j1_WWI6", "Schoolgewichten graad 3: zonder variant 6 uur");
  const mt = schoolBasketPreset({ classCode: "5MT1", subject: "Frans" });
  assertEqual(`${mt?.weights.DW1}/${mt?.weights.EX1}/${mt?.weights.DW2}/${mt?.weights.EX2}`, "12/8/18/12", "Schoolgewichten graad 3: Frans 5MT (deelvakken = DW)");
  logPass("Schoolgewichten graad 3: 42 tabellen 5de jaar, varianten 6/8 uur.");
  assertYear6Weights();
}

function assertYear6Weights() {
  const tables = builtInWeightTables().filter((table) => table.year === 6);
  assertEqual(tables.length, 45, "Schoolgewichten 6de jaar: 15 richtingen x 3 periodes");
  assert(tables.every((table) => table.trackId), "Schoolgewichten 6de jaar: elke richting gekend");
  const factor = { semester_1: [4, 1], semester_2: [6, 1.5], year: [null, 2.5] };
  const off = [];
  for (const table of tables) {
    for (const item of table.subjects) {
      const expected = item.hasExam ? factor[table.periodKey][0] * item.hours : factor[table.periodKey][1] * item.hours;
      if (Math.abs(item.total - expected) > 0.05) off.push(`${table.trackCode} ${table.period} ${item.code}`);
    }
  }
  // Kept as pasted, same pattern as 5HW: SOC 17 / 23 instead of 16 / 24.
  assertEqual(off.join(","), "g3_j2_HW Semester 1 SOC,g3_j2_HW Semester 2 SOC", "Schoolgewichten 6de jaar: uren-regel");
  assertEqual(findSchoolWeights({ year: 6, trackId: "Grieks_Latijn", classCode: "6GL4" })?.trackCode, "g3_j2_GL4", "Schoolgewichten 6de jaar: GL4 uit klascode");
  assertEqual(findSchoolWeights({ year: 6, trackId: "Grieks_Latijn", classCode: "6GL1" })?.trackCode, "g3_j2_GL3", "Schoolgewichten 6de jaar: GL zonder variant = GL3");
  assertEqual(findSchoolWeights({ year: 5, trackId: "Grieks_Latijn", classCode: "5GL1" })?.trackCode, "g3_j1_GL", "Schoolgewichten 6de jaar: 5GL blijft g3_j1_GL");
  assert(tables.filter((table) => table.periodKey === "year").every((table) => table.subjects.find((item) => item.subject === "Godsdienst")?.total === 5), "Schoolgewichten 6de jaar: Godsdienst Jaar = 5 (correctie)");
  logPass("Schoolgewichten 6de jaar: 45 tabellen, varianten GL3/GL4.");
}

function assertSubjectFeedbackHandover() {
  assertEqual(normaliseName("De Smet Amina"), normaliseName("Amina  De Smét"), "Vakfeedback: naamkoppeling negeert volgorde en accenten");
  const payload = buildSubjectFeedbackPayload({
    subject: "Wiskunde",
    teacher: "Test",
    students: [
      { id: "a", name: "Amina De Smet", classCode: "3NW3", finalWeighted: 48.26, flags: [{ type: "below_threshold", label: "Onder cesuur", tone: "critical" }, { type: "high_volatility", label: "Wisselend", tone: "caution" }] },
    ],
    notes: { a: "Breuken herhalen." },
    decisions: { a: { flagStates: { high_volatility: "irrelevant" } } },
  });
  const parsed = parseSubjectFeedback(JSON.parse(JSON.stringify(payload)));
  const item = parsed.students[normaliseName("Amina De Smet")];
  assert(item, "Vakfeedback: leerling teruggevonden");
  assertEqual(item.total, 48.3, "Vakfeedback: totaal afgerond");
  assertEqual(item.signals.join("|"), "Onder cesuur", "Vakfeedback: afgehandelde signalen vallen weg");
  assertEqual(item.note, "Breuken herhalen.", "Vakfeedback: notitie");
  let rejected = false;
  try {
    parseSubjectFeedback({ kind: "iets-anders", students: [] });
  } catch {
    rejected = true;
  }
  assert(rejected, "Vakfeedback: onbekend bestand wordt geweigerd");
  logPass("Vakfeedback: export, import en naamkoppeling.");
}

function assertSubjectAliases() {
  assertEqual(canonicalSubject("WET"), "Wetenschappen", "Vakalias WET");
  assert(isKnownSubject("WET"), "Vakalias WET staat niet als gekend vak geregistreerd");
  logPass("Vakaliases: WET wordt Wetenschappen.");
}

function buildSyntheticClassTeacherReports() {
  const periods = [
    ["semester_1", "Semester 1"],
    ["semester_2_prelim", "Semester 2 voorlopig resultaat"],
    ["semester_2", "Semester 2"],
    ["year", "Jaar"],
  ];
  const subjects = ["Wiskunde", "Fysica", "Nederlands", "Frans", "WET", "Engels"];
  const students = [
    {
      name: "Amina De Smet",
      overall: [76, 78, 82, 80],
      scores: {
        Wiskunde: [78, 79, 82, 80],
        Fysica: [70, 74, 76, 75],
        Nederlands: [84, 85, 86, 85],
        Frans: [74, 75, 76, 75],
        WET: [78, 80, 82, 81],
        Engels: [79, 80, 81, 80],
      },
    },
    {
      name: "Bram Janssens",
      overall: [60, 57, 55, 54],
      scores: {
        Wiskunde: [55, 51, 49, 48],
        Fysica: [60, 57, 54, 52],
        Nederlands: [62, 61, 60, 60],
        Frans: [64, 61, 59, 58],
        WET: [66, 64, 62, 61],
        Engels: [65, 65, 64, 64],
      },
    },
    {
      name: "Cato Peeters",
      overall: [52, 50, 49, 47],
      scores: {
        Wiskunde: [64, 63, 62, 62],
        Fysica: [66, 65, 64, 64],
        Nederlands: [68, 67, 66, 66],
        Frans: [70, 69, 68, 68],
        WET: [56, 54, 52, 50],
        Engels: [62, 61, 60, 60],
      },
    },
  ];

  return periods.map(([periodId, periodLabel], periodIndex) => ({
    fileName: `synthetic ${periodLabel}.xlsx`,
    sheetName: "Rapport",
    classCode: "3NW3",
    year: 3,
    periodSchemaId: "year_3_4",
    periodId,
    periodLabel,
    trackGuess: null,
    warnings: [],
    subjects: subjects.map((subject) => ({
      raw: subject,
      canonical: canonicalSubject(subject),
      known: isKnownSubject(subject),
    })),
    students: students.map((student, studentIndex) => ({
      id: `student-${studentIndex + 1}`,
      name: student.name,
      overallScore: student.overall[periodIndex],
      overallSourceMetric: "PCT",
      subjectScores: subjects.map((subject, subjectIndex) => ({
        subject: canonicalSubject(subject),
        rawSubject: subject,
        score: student.scores[subject][periodIndex],
        sourceMetric: "PCT",
        metrics: { PCT: student.scores[subject][periodIndex] },
        sourceRow: 10 + studentIndex * subjects.length + subjectIndex,
      })),
    })),
    totals: {
      subjectCount: subjects.length,
      studentCount: students.length,
    },
  }));
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

function assertNoteGuidance() {
  const subjectSuggestion = generateSubjectTeacherNoteSuggestion({
    id: "subject-student",
    finalWeighted: 48,
    evidence: { expectedRequired: 4, missingRequired: 0 },
    categoryRows: [{ category: "EX", rawPercentage: 42, hasAvailableEvidence: true }],
    trend: { periodScores: [{ value: 40 }, { value: 55 }], volatility: 6 },
    flags: [],
  }, []);
  assertEqual(subjectSuggestion.primaryPattern, "well_below_configured_threshold", "Vakdocent notitievoorstel: lage jaarscore");
  assert(subjectSuggestion.validation.ok, "Vakdocent notitievoorstel bevat validatiewaarschuwingen");

  const classTeacherSuggestion = generateClassTeacherNoteSuggestion({
    id: "class-student",
    finalWeighted: 70,
    subjectLines: [
      { subject: "Wiskunde", isKeySubject: true, yearScore: 48 },
      { subject: "Frans", isKeySubject: false, yearScore: 72 },
      { subject: "Nederlands", isKeySubject: true, yearScore: 74 },
    ],
    overallTrend: { points: [{ value: 70 }, { value: 72 }] },
    subjectSpread: { stddev: 8 },
    flags: [],
  }, { periods: [{}, {}, {}], students: [] });
  assertEqual(classTeacherSuggestion.primaryPattern, "main_subject_below_threshold", "Klassenleraar notitievoorstel: hoofdvak");
  assert(classTeacherSuggestion.text.includes("hoofdvakken"), "Klassenleraar notitievoorstel benoemt hoofdvakken niet");

  const appended = appendSuggestionToNote("Bestaande notitie.", "Nieuw voorstel.");
  assertEqual(appended, "Bestaande notitie.\n\nNieuw voorstel.", "Notitievoorstel wordt niet correct toegevoegd");
  logPass("Notitievoorstel: beslisboom, hoofdvakregel en invoegen.");
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

function assertStudentHasFlag(student, flagType, label) {
  assert(student, `${label}: leerling ontbreekt`);
  assert((student.flags || []).some((flag) => flag.type === flagType), `${label}: vlag ${flagType} ontbreekt`);
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
