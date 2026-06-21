import {
  inferTrackFromClassCode,
  periodSchemaForYear,
} from "./class-teacher-config.js";

export function aggregateClassTeacherReportGroups(reports = [], options = {}) {
  return Array.from(groupReportsByClass(reports).entries()).map(([classCode, classReports]) => (
    aggregateClassTeacherReports(classReports, { ...options, classCode })
  ));
}

export function aggregateClassTeacherReports(reports = [], options = {}) {
  const usableReports = reports.filter(Boolean);
  const warnings = [];
  if (!usableReports.length) {
    return emptyAggregation(warnings.concat(warning("no_reports", "Geen rapportbestanden om samen te voegen.")));
  }

  const classCode = options.classCode || mostCommon(usableReports.map((report) => report.classCode)) || "";
  const classReports = usableReports.filter((report) => !classCode || report.classCode === classCode);
  const ignoredReports = usableReports.filter((report) => classCode && report.classCode !== classCode);
  if (ignoredReports.length) {
    warnings.push(warning("mixed_class_codes", "Niet alle rapportbestanden horen bij dezelfde klas.", {
      selectedClassCode: classCode,
      ignoredFiles: ignoredReports.map((report) => report.fileName),
    }));
  }

  const year = options.year ?? mostCommon(classReports.map((report) => report.year)) ?? null;
  const schema = options.periodSchema || periodSchemaForYear(year);
  const track = options.track || firstTrackGuess(classReports) || inferTrackFromClassCode(classCode, year);
  const keySubjects = new Set(track?.keySubjects || []);
  const expectedPeriods = schema?.periods || [];
  const reportsByPeriod = mapReportsByPeriod(classReports, warnings);
  const periods = buildPeriodEntries(expectedPeriods, reportsByPeriod, warnings);
  const subjectMap = collectSubjects(classReports, keySubjects);
  const studentMap = collectStudents(classReports, periods, subjectMap, warnings);
  const students = Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  addStudentPresenceWarnings(students, periods, warnings);

  const subjects = Array.from(subjectMap.values())
    .map((subject) => ({
      ...subject,
      aliases: Array.from(subject.aliases).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      periodIds: Array.from(subject.periodIds),
    }))
    .sort((a, b) => Number(b.isKeySubject) - Number(a.isKeySubject) || a.subject.localeCompare(b.subject, undefined, { numeric: true }));

  return {
    mode: "klassenleraar",
    classCode,
    year,
    periodSchemaId: schema?.id || null,
    track,
    periods,
    subjects,
    students,
    warnings: [...warnings, ...classReports.flatMap(reportWarnings)],
    sourceReports: classReports.map((report) => ({
      fileName: report.fileName,
      sheetName: report.sheetName,
      periodId: report.periodId,
      periodLabel: report.periodLabel,
      studentCount: report.totals?.studentCount || report.students?.length || 0,
      subjectCount: report.totals?.subjectCount || report.subjects?.length || 0,
    })),
    totals: {
      reportCount: classReports.length,
      expectedPeriodCount: expectedPeriods.length,
      periodCount: periods.filter((period) => !period.missing).length,
      subjectCount: subjects.length,
      keySubjectCount: subjects.filter((subject) => subject.isKeySubject).length,
      studentCount: students.length,
      warningCount: warnings.length + classReports.reduce((sum, report) => sum + (report.warnings?.length || 0), 0),
    },
  };
}

function emptyAggregation(warnings) {
  return {
    mode: "klassenleraar",
    classCode: "",
    year: null,
    periodSchemaId: null,
    track: null,
    periods: [],
    subjects: [],
    students: [],
    warnings,
    sourceReports: [],
    totals: {
      reportCount: 0,
      expectedPeriodCount: 0,
      periodCount: 0,
      subjectCount: 0,
      keySubjectCount: 0,
      studentCount: 0,
      warningCount: warnings.length,
    },
  };
}

function mapReportsByPeriod(reports, warnings) {
  const byPeriod = new Map();
  for (const report of reports) {
    const key = report.periodId || `unknown:${report.fileName}`;
    if (!byPeriod.has(key)) {
      byPeriod.set(key, []);
    }
    byPeriod.get(key).push(report);
  }

  for (const [periodId, periodReports] of byPeriod.entries()) {
    if (periodId.startsWith("unknown:")) {
      warnings.push(warning("unknown_period_report", "Een rapportbestand kon niet aan een periode gekoppeld worden.", {
        fileName: periodReports[0]?.fileName || "",
      }));
      continue;
    }
    if (periodReports.length > 1) {
      warnings.push(warning("duplicate_period_report", "Er zijn meerdere bestanden voor dezelfde periode.", {
        periodId,
        files: periodReports.map((report) => report.fileName),
      }));
    }
  }

  return byPeriod;
}

function buildPeriodEntries(expectedPeriods, reportsByPeriod, warnings) {
  const periodEntries = expectedPeriods.map((period, index) => {
    const report = reportsByPeriod.get(period.id)?.[0] || null;
    if (!report) {
      warnings.push(warning("missing_period_report", "Een verwacht rapportbestand ontbreekt.", {
        periodId: period.id,
        periodLabel: period.label,
      }));
    }
    return {
      id: period.id,
      label: period.label,
      index,
      fileName: report?.fileName || "",
      sheetName: report?.sheetName || "",
      missing: !report,
      optionalOverallScore: Boolean(period.optionalOverallScore),
    };
  });

  for (const [periodId, reports] of reportsByPeriod.entries()) {
    if (periodId.startsWith("unknown:")) continue;
    if (expectedPeriods.some((period) => period.id === periodId)) continue;
    const report = reports[0];
    warnings.push(warning("unexpected_period_report", "Een rapportbestand past niet in het verwachte periodeschema.", {
      periodId,
      fileName: report?.fileName || "",
    }));
    periodEntries.push({
      id: periodId,
      label: report?.periodLabel || periodId,
      index: periodEntries.length,
      fileName: report?.fileName || "",
      sheetName: report?.sheetName || "",
      missing: false,
      optionalOverallScore: false,
    });
  }

  return periodEntries;
}

function collectSubjects(reports, keySubjects) {
  const subjects = new Map();
  for (const report of reports) {
    for (const subject of report.subjects || []) {
      if (!subjects.has(subject.canonical)) {
        subjects.set(subject.canonical, {
          subject: subject.canonical,
          aliases: new Set(),
          known: Boolean(subject.known),
          isKeySubject: keySubjects.has(subject.canonical),
          periodIds: new Set(),
          reportCount: 0,
        });
      }
      const entry = subjects.get(subject.canonical);
      entry.aliases.add(subject.raw || subject.canonical);
      entry.known = entry.known || Boolean(subject.known);
      entry.isKeySubject = entry.isKeySubject || keySubjects.has(subject.canonical);
      if (report.periodId) entry.periodIds.add(report.periodId);
      entry.reportCount += 1;
    }
  }
  return subjects;
}

function collectStudents(reports, periods, subjectMap, warnings) {
  const reportsByPeriod = new Map(reports.map((report) => [report.periodId, report]));
  const students = new Map();
  for (const report of reports) {
    for (const reportStudent of report.students || []) {
      if (!students.has(reportStudent.id)) {
        students.set(reportStudent.id, {
          id: reportStudent.id,
          name: reportStudent.name,
          classCode: report.classCode,
          periods: [],
          overallScores: [],
          subjectLines: [],
          yearScore: null,
          latestOverallScore: null,
          missingPeriodIds: [],
        });
      }
      const student = students.get(reportStudent.id);
      if (student.name !== reportStudent.name) {
        warnings.push(warning("student_name_collision", "Twee leerlingnamen hebben dezelfde technische sleutel.", {
          firstName: student.name,
          secondName: reportStudent.name,
        }));
      }
    }
  }

  for (const student of students.values()) {
    for (const period of periods) {
      const report = reportsByPeriod.get(period.id);
      const reportStudent = report?.students?.find((item) => item.id === student.id);
      if (!report || !reportStudent) {
        student.periods.push(emptyStudentPeriod(period));
        if (!period.missing) student.missingPeriodIds.push(period.id);
        continue;
      }

      const subjectScores = Object.fromEntries((reportStudent.subjectScores || []).map((score) => [
        score.subject,
        {
          subject: score.subject,
          rawSubject: score.rawSubject,
          score: numberOrNull(score.score),
          sourceMetric: score.sourceMetric || "",
          metrics: score.metrics || {},
          isMissing: !Number.isFinite(score.score),
          isKeySubject: Boolean(subjectMap.get(score.subject)?.isKeySubject),
          sourceFile: report.fileName,
          sourceSheet: report.sheetName,
          sourceRow: score.sourceRow,
        },
      ]));

      const overallEntry = {
        periodId: period.id,
        periodLabel: period.label,
        value: numberOrNull(reportStudent.overallScore),
        sourceMetric: reportStudent.overallSourceMetric || "",
        sourceFile: report.fileName,
      };

      student.periods.push({
        periodId: period.id,
        periodLabel: period.label,
        periodIndex: period.index,
        sourceFile: report.fileName,
        sourceSheet: report.sheetName,
        overallScore: overallEntry.value,
        overallSourceMetric: overallEntry.sourceMetric,
        subjectScores,
        missing: false,
      });
      student.overallScores.push(overallEntry);
    }

    student.yearScore = findOverallScore(student.overallScores, "year");
    student.latestOverallScore = latestOverallScore(student.overallScores);
    student.subjectLines = buildSubjectLines(student, subjectMap, periods);
  }

  return students;
}

function emptyStudentPeriod(period) {
  return {
    periodId: period.id,
    periodLabel: period.label,
    periodIndex: period.index,
    sourceFile: "",
    sourceSheet: "",
    overallScore: null,
    overallSourceMetric: "",
    subjectScores: {},
    missing: true,
  };
}

function buildSubjectLines(student, subjectMap, periods) {
  return Array.from(subjectMap.values()).map((subject) => {
    const points = periods.map((period) => {
      const periodEntry = student.periods.find((item) => item.periodId === period.id);
      const score = periodEntry?.subjectScores?.[subject.subject];
      return {
        periodId: period.id,
        periodLabel: period.label,
        value: numberOrNull(score?.score),
        sourceMetric: score?.sourceMetric || "",
        sourceFile: score?.sourceFile || "",
        isMissing: !Number.isFinite(score?.score),
      };
    });
    const available = points.filter((point) => Number.isFinite(point.value));
    return {
      subject: subject.subject,
      aliases: Array.from(subject.aliases),
      isKeySubject: Boolean(subject.isKeySubject),
      known: Boolean(subject.known),
      points,
      firstScore: available[0]?.value ?? null,
      latestScore: available[available.length - 1]?.value ?? null,
      yearScore: points.find((point) => point.periodId === "year")?.value ?? null,
    };
  });
}

function addStudentPresenceWarnings(students, periods, warnings) {
  const availablePeriods = periods.filter((period) => !period.missing);
  for (const student of students) {
    if (!student.missingPeriodIds.length) continue;
    warnings.push(warning("student_missing_in_period", "Een leerling ontbreekt in minstens een rapportperiode.", {
      student: student.name,
      missingPeriodIds: student.missingPeriodIds,
      availablePeriodCount: availablePeriods.length,
    }));
  }
}

function reportWarnings(report) {
  return (report.warnings || []).map((item) => ({
    ...item,
    sourceFile: report.fileName,
    sourcePeriodId: report.periodId,
  }));
}

function firstTrackGuess(reports) {
  return reports.find((report) => report.trackGuess?.id)?.trackGuess || reports.find((report) => report.trackGuess)?.trackGuess || null;
}

function findOverallScore(scores, periodId) {
  const score = scores.find((entry) => entry.periodId === periodId && Number.isFinite(entry.value));
  return score?.value ?? null;
}

function latestOverallScore(scores) {
  const available = scores.filter((entry) => Number.isFinite(entry.value));
  return available[available.length - 1]?.value ?? null;
}

function groupReportsByClass(reports) {
  const grouped = new Map();
  for (const report of reports) {
    const key = report?.classCode || "unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(report);
  }
  return grouped;
}

function mostCommon(values) {
  const counts = new Map();
  for (const value of values.filter((item) => item != null && item !== "")) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true }))[0]?.[0] ?? null;
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function warning(code, message, details = {}) {
  return { code, message, details };
}
