import { thresholdBand } from "./config.js";
import { t } from "./i18n.js";

const CLASS_TEACHER_RULES = {
  weakYearTotal: 65,
  veryWeakYearTotal: 50,
  weakKeySubject: 60,
  criticalKeySubject: 50,
  positiveYearTotal: 75,
  positiveMinimumKeySubject: 65,
  stableSubjectStddev: 8,
  sharpSubjectDrop: 12,
  provisionalDifference: 8,
};

export function calculateClassTeacherAnalysis(aggregation, options = {}) {
  const threshold = options.threshold ?? CLASS_TEACHER_RULES.veryWeakYearTotal;
  const students = (aggregation.students || []).map((student) => calculateClassTeacherStudent(student, aggregation, threshold));
  applyClassTeacherPercentiles(students);

  return {
    ...aggregation,
    students,
    stats: summariseClassTeacherStudents(students, threshold),
    generatedAt: new Date().toISOString(),
  };
}

export function summariseClassTeacherStudents(students = [], threshold = CLASS_TEACHER_RULES.veryWeakYearTotal) {
  const totals = students.map((student) => student.finalWeighted).filter(Number.isFinite).sort((a, b) => a - b);
  const keyRiskStudents = students.filter((student) => student.flags.some((flag) => (
    flag.type === "key_subject_critical"
    || flag.type === "multiple_key_subjects_weak"
    || flag.type === "track_mismatch_signal"
  )));

  return {
    count: students.length,
    mean: round(mean(totals)),
    median: round(quantile(totals, 0.5)),
    min: totals[0] ?? null,
    max: totals[totals.length - 1] ?? null,
    q1: round(quantile(totals, 0.25)),
    q3: round(quantile(totals, 0.75)),
    stddev: round(stddev(totals)),
    belowThreshold: students.filter((student) => Number.isFinite(student.finalWeighted) && student.finalWeighted < threshold).length,
    below50: students.filter((student) => Number.isFinite(student.finalWeighted) && student.finalWeighted < CLASS_TEACHER_RULES.veryWeakYearTotal).length,
    below65: students.filter((student) => Number.isFinite(student.finalWeighted) && student.finalWeighted < CLASS_TEACHER_RULES.weakYearTotal).length,
    keyRiskCount: keyRiskStudents.length,
    positiveProfileCount: students.filter((student) => student.flags.some((flag) => flag.type === "positive_stable_profile")).length,
  };
}

function calculateClassTeacherStudent(student, aggregation, threshold) {
  const keySubjectLines = (student.subjectLines || []).filter((line) => line.isKeySubject);
  const allSubjectLatestScores = (student.subjectLines || [])
    .map((line) => scoreForLine(line))
    .filter(Number.isFinite);
  const keySubjectScores = keySubjectLines
    .map((line) => ({ line, score: scoreForLine(line) }))
    .filter((entry) => Number.isFinite(entry.score));
  const keySubjectsBelow50 = keySubjectScores.filter((entry) => entry.score < CLASS_TEACHER_RULES.criticalKeySubject);
  const keySubjectsBelow60 = keySubjectScores.filter((entry) => entry.score < CLASS_TEACHER_RULES.weakKeySubject);
  const keySubjectsBelow65 = keySubjectScores.filter((entry) => entry.score < CLASS_TEACHER_RULES.positiveMinimumKeySubject);
  const keySubjectAverage = round(mean(keySubjectScores.map((entry) => entry.score)));
  const subjectStddev = round(stddev(allSubjectLatestScores));
  const overallTrend = calculateOverallTrend(student.overallScores || []);
  const strongestSubjectDrop = strongestDrop(keySubjectLines.length ? keySubjectLines : (student.subjectLines || []));
  const provisionalDifference = provisionalDifferenceSignal(student, aggregation);
  const finalWeighted = numberOrNull(student.yearScore) ?? numberOrNull(student.latestOverallScore);

  const context = {
    aggregation,
    finalWeighted,
    threshold,
    keySubjectLines,
    keySubjectScores,
    keySubjectsBelow50,
    keySubjectsBelow60,
    keySubjectsBelow65,
    keySubjectAverage,
    subjectStddev,
    overallTrend,
    strongestSubjectDrop,
    provisionalDifference,
  };

  return {
    ...student,
    finalWeighted,
    thresholdBand: thresholdBand(finalWeighted),
    keySubjectSummary: {
      expected: keySubjectLines.length,
      available: keySubjectScores.length,
      average: keySubjectAverage,
      below50: keySubjectsBelow50.map((entry) => subjectScoreSummary(entry)),
      below60: keySubjectsBelow60.map((entry) => subjectScoreSummary(entry)),
      below65: keySubjectsBelow65.map((entry) => subjectScoreSummary(entry)),
    },
    overallTrend,
    subjectSpread: {
      availableSubjectCount: allSubjectLatestScores.length,
      stddev: subjectStddev,
    },
    flags: calculateClassTeacherFlags(context),
  };
}

function calculateClassTeacherFlags(input) {
  const flags = [];

  if (!input.aggregation.track?.id || !input.keySubjectLines.length) {
    flags.push(flag("unknown_track_key_subjects", t("classTeacher.flagDetail.unknown_track_key_subjects"), "info"));
  }

  if (Number.isFinite(input.finalWeighted) && input.finalWeighted < CLASS_TEACHER_RULES.veryWeakYearTotal) {
    flags.push(flag("overall_low_year", t("classTeacher.flagDetail.overall_low_year", {
      score: formatScore(input.finalWeighted),
    }), "critical"));
  } else if (Number.isFinite(input.finalWeighted) && input.finalWeighted < CLASS_TEACHER_RULES.weakYearTotal) {
    flags.push(flag("overall_negative_advice_band", t("classTeacher.flagDetail.overall_negative_advice_band", {
      score: formatScore(input.finalWeighted),
    }), "caution"));
  }

  if (input.keySubjectsBelow50.length) {
    flags.push(flag("key_subject_critical", t("classTeacher.flagDetail.key_subject_critical", {
      subjects: formatSubjectList(input.keySubjectsBelow50),
    }), "critical"));
  }

  if (input.keySubjectsBelow60.length >= 2) {
    flags.push(flag("multiple_key_subjects_weak", t("classTeacher.flagDetail.multiple_key_subjects_weak", {
      count: input.keySubjectsBelow60.length,
      subjects: formatSubjectList(input.keySubjectsBelow60),
    }), "critical"));
  }

  if (
    input.aggregation.track?.confidence !== "unknown"
    && (
      input.keySubjectsBelow60.length >= 3
      || (Number.isFinite(input.keySubjectAverage) && input.keySubjectAverage < CLASS_TEACHER_RULES.weakKeySubject)
    )
  ) {
    flags.push(flag("track_mismatch_signal", t("classTeacher.flagDetail.track_mismatch_signal", {
      average: formatScore(input.keySubjectAverage),
      count: input.keySubjectsBelow60.length,
    }), "critical"));
  }

  if (input.strongestSubjectDrop && input.strongestSubjectDrop.drop <= -CLASS_TEACHER_RULES.sharpSubjectDrop) {
    flags.push(flag("sharp_subject_drop", t("classTeacher.flagDetail.sharp_subject_drop", {
      subject: input.strongestSubjectDrop.subject,
      points: formatScore(Math.abs(input.strongestSubjectDrop.drop)),
      from: input.strongestSubjectDrop.fromLabel,
      to: input.strongestSubjectDrop.toLabel,
    }), "caution"));
  }

  if (input.provisionalDifference && input.provisionalDifference.difference >= CLASS_TEACHER_RULES.provisionalDifference) {
    flags.push(flag("provisional_changed_materially", t("classTeacher.flagDetail.provisional_changed_materially", {
      label: input.provisionalDifference.label,
      difference: formatScore(input.provisionalDifference.difference),
    }), "info"));
  }

  if (
    Number.isFinite(input.finalWeighted)
    && input.finalWeighted >= CLASS_TEACHER_RULES.positiveYearTotal
    && input.keySubjectScores.length
    && !input.keySubjectsBelow65.length
    && Number.isFinite(input.subjectStddev)
    && input.subjectStddev <= CLASS_TEACHER_RULES.stableSubjectStddev
  ) {
    flags.push(flag("positive_stable_profile", t("classTeacher.flagDetail.positive_stable_profile", {
      score: formatScore(input.finalWeighted),
      average: formatScore(input.keySubjectAverage),
    }), "positive"));
  }

  return dedupeFlags(flags);
}

function calculateOverallTrend(scores = []) {
  const available = scores.filter((score) => Number.isFinite(score.value));
  const first = available.find((score) => score.periodId !== "year") || available[0] || null;
  const latest = available.find((score) => score.periodId === "year") || available[available.length - 1] || null;
  const delta = first && latest ? round(latest.value - first.value) : null;
  let direction = "insufficient";
  if (Number.isFinite(delta)) {
    direction = "stable";
    if (delta >= 5) direction = "improving";
    if (delta <= -5) direction = "declining";
  }
  return {
    first: first?.value ?? null,
    latest: latest?.value ?? null,
    delta,
    direction,
    points: scores,
  };
}

function strongestDrop(subjectLines = []) {
  let strongest = null;
  for (const line of subjectLines) {
    const points = (line.points || []).filter((point) => Number.isFinite(point.value));
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const drop = round(current.value - previous.value);
      if (!strongest || drop < strongest.drop) {
        strongest = {
          subject: line.subject,
          drop,
          fromPeriodId: previous.periodId,
          fromLabel: previous.periodLabel,
          toPeriodId: current.periodId,
          toLabel: current.periodLabel,
          fromValue: previous.value,
          toValue: current.value,
        };
      }
    }
  }
  return strongest;
}

function provisionalDifferenceSignal(student, aggregation) {
  if (aggregation.periodSchemaId !== "year_3_4") return null;
  let strongest = null;

  const prelimOverall = student.overallScores.find((score) => score.periodId === "semester_2_prelim");
  const finalOverall = student.overallScores.find((score) => score.periodId === "semester_2");
  if (Number.isFinite(prelimOverall?.value) && Number.isFinite(finalOverall?.value)) {
    strongest = {
      label: t("classTeacher.overall"),
      difference: round(Math.abs(finalOverall.value - prelimOverall.value)),
    };
  }

  for (const line of (student.subjectLines || []).filter((subjectLine) => subjectLine.isKeySubject)) {
    const prelim = line.points.find((point) => point.periodId === "semester_2_prelim");
    const final = line.points.find((point) => point.periodId === "semester_2");
    if (!Number.isFinite(prelim?.value) || !Number.isFinite(final?.value)) continue;
    const difference = round(Math.abs(final.value - prelim.value));
    if (!strongest || difference > strongest.difference) {
      strongest = {
        label: line.subject,
        difference,
      };
    }
  }
  return strongest;
}

function applyClassTeacherPercentiles(students) {
  const values = students.map((student) => student.finalWeighted).filter(Number.isFinite).sort((a, b) => a - b);
  for (const student of students) {
    if (!Number.isFinite(student.finalWeighted) || !values.length) {
      student.percentile = null;
      student.percentileBand = t("option.notAvailable");
      continue;
    }
    const lower = values.filter((value) => value < student.finalWeighted).length;
    const equal = values.filter((value) => value === student.finalWeighted).length;
    student.percentile = round(((lower + equal * 0.5) / values.length) * 100);
    student.percentileBand = t("student.percentileBand", { value: student.percentile });
  }
}

function scoreForLine(line) {
  return numberOrNull(line.yearScore) ?? numberOrNull(line.latestScore);
}

function subjectScoreSummary(entry) {
  return {
    subject: entry.line.subject,
    score: entry.score,
  };
}

function flag(type, detail, tone = "info") {
  return {
    type,
    label: t(`classTeacher.flag.${type}`),
    detail,
    tone,
  };
}

function dedupeFlags(flags) {
  const seen = new Set();
  return flags.filter((item) => {
    if (seen.has(item.type)) return false;
    seen.add(item.type);
    return true;
  });
}

function formatSubjectList(entries) {
  return entries.map((entry) => `${entry.line.subject} ${formatScore(entry.score)}%`).join(", ");
}

function formatScore(value) {
  return Number.isFinite(value) ? String(round(value)) : t("option.notAvailable");
}

function mean(values) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null;
}

function stddev(values) {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 2) return null;
  const avg = mean(clean);
  const variance = clean.reduce((sum, value) => sum + (value - avg) ** 2, 0) / clean.length;
  return Math.sqrt(variance);
}

function quantile(values, q) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return null;
  const position = (clean.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return clean[base + 1] == null ? clean[base] : clean[base] + rest * (clean[base + 1] - clean[base]);
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function round(value, decimals = 1) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
