import { DEFAULT_THRESHOLD, thresholdBand } from "./config.js";
import { t } from "./i18n.js";

const ADVICE_RULES = {
  weakYearTotal: 65,
  veryWeakYearTotal: 50,
  strongDwExamGap: 18,
  lowDecisionEvidence: 0.5,
  lowEvidenceMissingShare: 0.5,
  lowEvidencePointsCoverage: 0.6,
  lowEvidenceClassGap: 0.25,
  consistentGoodTotal: 75,
  consistentGoodMinimumScore: 70,
  consistentGoodVolatility: 8,
  minimumConsistentScores: 4,
  positiveTrendDelta: 8,
  weakCategoryScore: 50,
  minimumCategoryScores: 2,
  trendMinimumDelta: -8,
  trendStddevMultiplier: 1.25,
};

export function calculateAnalysis(model, config) {
  const assignments = normaliseAssignments(model.assignments, config);
  const scoreAssignments = assignments.filter((assignment) => assignment.countsForTotal);
  const categories = normaliseWeights(config.categories, scoreAssignments);
  const students = model.students.map((student) => calculateStudent(student, assignments, categories, config));

  applyClassPercentiles(students);
  applyClassContextFlags(students);

  return {
    fileName: model.fileName,
    subject: config.subject || model.subjects[0]?.value || "",
    classes: model.classes.map((entry) => entry.value),
    sheetNames: model.sheetNames,
    warnings: model.warnings,
    assignments,
    categories,
    students,
    stats: summariseStudents(students, config.threshold ?? DEFAULT_THRESHOLD),
    generatedAt: new Date().toISOString(),
  };
}

export function summariseStudents(students, threshold = DEFAULT_THRESHOLD) {
  const values = students.map((student) => student.finalWeighted).filter(Number.isFinite).sort((a, b) => a - b);
  const belowThreshold = students.filter((student) => Number.isFinite(student.finalWeighted) && student.finalWeighted < threshold).length;
  const incomplete = students.filter((student) => student.evidenceCoverage < 1).length;

  return {
    count: students.length,
    mean: mean(values),
    median: quantile(values, 0.5),
    min: values[0] ?? null,
    max: values[values.length - 1] ?? null,
    q1: quantile(values, 0.25),
    q3: quantile(values, 0.75),
    stddev: stddev(values),
    belowThreshold,
    incomplete,
  };
}

function normaliseAssignments(assignments, config) {
  return assignments
    .map((assignment) => {
      const override = config.assignments?.[assignment.id] || {};
      const maxPoints = numberOr(override.maxPoints, assignment.maxPoints);
      const usage = normaliseAssignmentUsage(override);
      const active = usage !== "exclude" && override.active !== false && maxPoints > 0;
      return {
        ...assignment,
        classCodes: Array.from(assignment.classCodes || []),
        category: override.category || assignment.category || "OTHER",
        maxPoints,
        usage,
        active,
        countsForTotal: active && usage === "include",
        useInTrend: active && (usage === "include" || usage === "displayOnly"),
        visibleInGraph: active && usage !== "exclude",
        required: override.required !== false && usage === "include",
        assessmentGroup: assessmentGroupKey(assignment),
        isRetake: isRetakeAssignment(assignment),
      };
    })
    .filter((assignment) => assignment.active);
}

function normaliseAssignmentUsage(override = {}) {
  if (override.usage === "displayOnly" || override.usage === "exclude" || override.usage === "include") {
    return override.usage;
  }
  return override.active === false ? "exclude" : "include";
}

function normaliseWeights(configCategories = [], assignments) {
  const assignmentCategories = unique(assignments.map((assignment) => assignment.category));
  const configured = new Map(configCategories.map((category) => [category.name, numberOr(category.weight, 0)]));
  const categories = assignmentCategories.map((name) => ({
    name,
    weight: configured.has(name) ? configured.get(name) : 1,
  }));
  let total = categories.reduce((sum, category) => sum + Math.max(0, category.weight), 0);
  if (!total) {
    total = categories.length || 1;
    categories.forEach((category) => {
      category.weight = 1;
    });
  }
  return categories.map((category) => ({
    ...category,
    normalisedWeight: Math.max(0, category.weight) / total,
  }));
}

function assessmentGroupKey(assignment) {
  const title = String(assignment.title || "")
    .toLowerCase()
    .replace(/\b(herkansing|herkans|herk|inhaaltoets|inhaaltest|inhaal|redo|retake|bis|inhaalmoment|inhaalproef)\b/g, "")
    .replace(/\b(opnieuw|tweede kans|2e kans|2de kans)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${String(assignment.category || "").toUpperCase()}::${title || String(assignment.title || "").toLowerCase()}`;
}

function isRetakeAssignment(assignment) {
  return /\b(herkansing|herkans|herk|inhaaltoets|inhaaltest|inhaal|redo|retake|bis|inhaalmoment|inhaalproef|opnieuw|tweede kans|2e kans|2de kans)\b/i
    .test(`${assignment.title || ""} ${assignment.sheetName || ""}`);
}

function isCoveredMissingScore(student, assignment, assignments) {
  const score = student.scores.get(assignment.id);
  if (score?.status === "available") return false;
  const group = assignment.assessmentGroup;
  const groupAssignments = assignments.filter((item) => item.assessmentGroup === group);
  if (groupAssignments.length < 2 || !groupAssignments.some((item) => item.isRetake)) return false;
  return groupAssignments.some((item) => {
    if (item.id === assignment.id) return false;
    return student.scores.get(item.id)?.status === "available";
  });
}

function calculateStudent(student, assignments, categories, config) {
  const classAssignments = assignments.filter((assignment) => {
    return !assignment.classCodes.length || assignment.classCodes.includes(student.classCode);
  });
  const baseCategoryRows = categories.map((category) => calculateCategory(student, classAssignments, category));
  const categoryRows = applyAvailableEvidenceWeights(baseCategoryRows);
  const calculatedWeighted = categoryRows.some((row) => row.hasAvailableEvidence)
    ? categoryRows.reduce((sum, row) => sum + (Number.isFinite(row.rawPercentage) ? row.rawPercentage * row.effectiveWeight : 0), 0)
    : null;
  const expectedRequired = classAssignments.filter((assignment) => {
    if (!assignment.countsForTotal) return false;
    if (!assignment.required) return false;
    if (isCoveredMissingScore(student, assignment, classAssignments)) return false;
    return student.scores.get(assignment.id)?.status !== "excused";
  });
  const availableRequired = expectedRequired.filter((assignment) => student.scores.get(assignment.id)?.status === "available");
  const expectedRequiredPoints = expectedRequired.reduce((sum, assignment) => sum + assignment.maxPoints, 0);
  const availableRequiredPoints = availableRequired.reduce((sum, assignment) => sum + assignment.maxPoints, 0);
  const evidenceCoverage = expectedRequired.length ? availableRequired.length / expectedRequired.length : 0;
  const evidencePointsCoverage = expectedRequiredPoints ? availableRequiredPoints / expectedRequiredPoints : 0;
  const trend = calculateTrend(student, classAssignments.filter((assignment) => assignment.useInTrend));
  const dwExamGap = calculateDwExamGap(categoryRows);
  const importedFinal = getImportedFinal(student);
  const resolvedFinal = resolveFinalWeighted(calculatedWeighted, importedFinal);
  const flags = calculateFlags({
    student,
    finalWeighted: resolvedFinal.value,
    importedFinal,
    categoryRows,
    evidenceCoverage,
    evidencePointsCoverage,
    missingCount: expectedRequired.length - availableRequired.length,
    trend,
    dwExamGap,
    threshold: config.threshold ?? DEFAULT_THRESHOLD,
  });

  return {
    id: student.id,
    classCode: student.classCode,
    name: student.name,
    displayNumber: student.displayNumber,
    subject: config.subject || student.subject,
    categoryRows,
    finalWeighted: round(resolvedFinal.value),
    calculatedWeighted: round(calculatedWeighted),
    finalSource: resolvedFinal.source,
    importedFinal,
    evidenceCoverage,
    evidence: {
      availableRequired: availableRequired.length,
      expectedRequired: expectedRequired.length,
      missingRequired: Math.max(0, expectedRequired.length - availableRequired.length),
      availableRequiredPoints: round(availableRequiredPoints, 2),
      expectedRequiredPoints: round(expectedRequiredPoints, 2),
      pointsCoverage: evidencePointsCoverage,
    },
    trend,
    dwExamGap,
    flags,
    comments: student.comments,
    summaries: student.summaries,
    thresholdBand: thresholdBand(resolvedFinal.value),
    assignmentScores: classAssignments.map((assignment) => {
      const score = student.scores.get(assignment.id);
      return {
        assignment,
        score: score || { status: "missing", value: null },
      };
    }),
  };
}

function calculateCategory(student, assignments, category) {
  const categoryAssignments = assignments.filter((assignment) => assignment.countsForTotal && assignment.category === category.name && assignment.required);
  let earned = 0;
  let expectedPossible = 0;
  let availablePossible = 0;
  let availableCount = 0;
  let expectedCount = 0;
  let missingCount = 0;

  for (const assignment of categoryAssignments) {
    const score = student.scores.get(assignment.id);
    if (isCoveredMissingScore(student, assignment, assignments)) continue;
    if (score?.status === "excused") continue;

    expectedPossible += assignment.maxPoints;
    expectedCount += 1;

    if (score?.status === "available" && Number.isFinite(score.value)) {
      earned += score.value;
      availablePossible += assignment.maxPoints;
      availableCount += 1;
    } else {
      missingCount += 1;
    }
  }

  const rawPercentage = availablePossible > 0 ? (earned / availablePossible) * 100 : null;
  return {
    category: category.name,
    pointsEarned: round(earned, 2),
    pointsPossible: round(availablePossible, 2),
    expectedPossible: round(expectedPossible, 2),
    availablePossible: round(availablePossible, 2),
    rawPercentage: Number.isFinite(rawPercentage) ? round(rawPercentage) : null,
    weight: category.weight,
    normalisedWeight: category.normalisedWeight,
    effectiveWeight: 0,
    weightedContribution: null,
    hasAvailableEvidence: availablePossible > 0,
    availableCount,
    expectedCount,
    missingCount,
  };
}

function applyAvailableEvidenceWeights(categoryRows) {
  const transferredWeights = transferableExamWeights(categoryRows);
  const availableWeightTotal = categoryRows.reduce((sum, row) => {
    if (!row.hasAvailableEvidence || !Number.isFinite(row.rawPercentage)) return sum;
    return sum + row.normalisedWeight + (transferredWeights.get(row.category) || 0);
  }, 0);

  return categoryRows.map((row) => {
    if (!row.hasAvailableEvidence || !availableWeightTotal || !Number.isFinite(row.rawPercentage)) {
      return { ...row, effectiveWeight: 0, weightedContribution: null, transferredWeight: 0 };
    }

    const transferredWeight = transferredWeights.get(row.category) || 0;
    const effectiveWeight = (row.normalisedWeight + transferredWeight) / availableWeightTotal;
    return {
      ...row,
      effectiveWeight,
      transferredWeight,
      weightedContribution: round(row.rawPercentage * effectiveWeight),
    };
  });
}

function transferableExamWeights(categoryRows) {
  const transfers = new Map();

  for (const sourceRow of categoryRows) {
    if (sourceRow.hasAvailableEvidence || sourceRow.normalisedWeight <= 0) continue;
    const source = basketSegment(sourceRow.category);
    if (!source || source.type !== "EX") continue;

    const targetRow = categoryRows.find((candidate) => {
      const target = basketSegment(candidate.category);
      return target
        && target.type === "DW"
        && target.segment === source.segment
        && candidate.hasAvailableEvidence
        && Number.isFinite(candidate.rawPercentage);
    });

    if (targetRow) {
      transfers.set(targetRow.category, (transfers.get(targetRow.category) || 0) + sourceRow.normalisedWeight);
    }
  }

  return transfers;
}

function basketSegment(category) {
  const match = String(category || "").trim().toUpperCase().replace(/\s+/g, "").match(/^(DW|EX)(\d+)$/);
  return match ? { type: match[1], segment: match[2] } : null;
}

function calculateTrend(student, assignments) {
  const points = assignments
    .map((assignment, index) => {
      const score = student.scores.get(assignment.id);
      if (!score || score.status !== "available" || !Number.isFinite(score.value) || assignment.maxPoints <= 0) return null;
      return {
        assignmentId: assignment.id,
        index,
        date: assignment.date || "",
        title: assignment.title || "",
        category: assignment.category || "",
        sheetName: assignment.sheetName || "",
        usage: assignment.usage || "include",
        countsForTotal: Boolean(assignment.countsForTotal),
        earned: score.value,
        maxPoints: assignment.maxPoints,
        label: periodLabel(assignment, index),
        value: (score.value / assignment.maxPoints) * 100,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.date && b.date && a.date !== b.date) return a.date.localeCompare(b.date);
      return a.index - b.index;
    });

  if (points.length < 3) {
    return {
      direction: "insufficient",
      delta: null,
      volatility: points.length ? round(stddev(points.map((point) => point.value))) : null,
      periodScores: points,
    };
  }

  const split = Math.max(1, Math.floor(points.length / 2));
  const first = mean(points.slice(0, split).map((point) => point.value));
  const second = mean(points.slice(-split).map((point) => point.value));
  const delta = second - first;
  let direction = "stable";
  if (delta >= 5) direction = "improving";
  if (delta <= -5) direction = "declining";

  return {
    direction,
    delta: round(delta),
    volatility: round(stddev(points.map((point) => point.value))),
    periodScores: points.map((point) => ({ ...point, value: round(point.value), earned: round(point.earned, 2), maxPoints: round(point.maxPoints, 2) })),
  };
}

function periodLabel(assignment, index) {
  const text = `${assignment.sheetName || ""} ${assignment.title || ""} ${assignment.date || ""}`.toLowerCase();
  const category = String(assignment.category || "").toUpperCase();
  if (/par|paas|partial|partieel/.test(text)) return "EXPAR";
  if (category === "EX" && /(kerst|sem\s*1|semester\s*1|\b1\b)/i.test(text)) return "EX1";
  if (category === "EX" && /(eind|juni|sem\s*2|semester\s*2|\b2\b)/i.test(text)) return "EX2";
  if (category === "EX") return "EX";
  if (category === "DW" && /(sem\s*1|semester\s*1|\b1\b)/i.test(text)) return "DW1";
  if (category === "DW" && /(sem\s*2|semester\s*2|\b2\b)/i.test(text)) return "DW2";
  if (category === "DW") return `DW${index + 1}`;
  return category || `P${index + 1}`;
}

function calculateDwExamGap(categoryRows) {
  const dw = categoryRows.find((row) => row.category === "DW");
  const ex = categoryRows.find((row) => row.category === "EX");
  if (!dw || !ex || !Number.isFinite(dw.rawPercentage) || !Number.isFinite(ex.rawPercentage)) {
    return null;
  }
  return {
    dw: dw.rawPercentage,
    exam: ex.rawPercentage,
    gap: round(dw.rawPercentage - ex.rawPercentage),
    absoluteGap: round(Math.abs(dw.rawPercentage - ex.rawPercentage)),
  };
}

function calculateFlags(input) {
  const flags = [];
  const yearTotal = getYearTotal(input.finalWeighted, input.importedFinal);
  const scoreValues = (input.trend.periodScores || []).map((point) => point.value).filter(Number.isFinite);
  const weakestCategory = getWeakestCategory(input.categoryRows);
  const hasStrongDwExamGap = input.dwExamGap && input.dwExamGap.absoluteGap >= ADVICE_RULES.strongDwExamGap;

  if (input.evidenceCoverage <= ADVICE_RULES.lowDecisionEvidence) {
    flags.push(flag("insufficient_decision_evidence", t("flagDetail.insufficient_decision_evidence", {
      coverage: formatPercent(input.evidenceCoverage),
    }), "caution"));
  }
  if (yearTotal && yearTotal.value < ADVICE_RULES.veryWeakYearTotal) {
    flags.push(flag("year_total_below_50", t("flagDetail.year_total_below_50", {
      score: formatScore(yearTotal.value),
      source: yearTotal.source,
    }), "critical"));
  } else if (yearTotal && yearTotal.value < ADVICE_RULES.weakYearTotal) {
    flags.push(flag("year_total_below_65", t("flagDetail.year_total_below_65", {
      score: formatScore(yearTotal.value),
      source: yearTotal.source,
    }), "critical"));
  }
  if (!hasStrongDwExamGap && input.trend.direction === "improving" && input.trend.delta >= ADVICE_RULES.positiveTrendDelta) {
    flags.push(flag("positive_evolution", t("flagDetail.positive_evolution", { points: input.trend.delta }), "positive"));
  }
  if (input.dwExamGap && input.dwExamGap.absoluteGap >= 12) {
    flags.push(flag("large_dw_exam_gap", t("flagDetail.large_dw_exam_gap", {
      dw: formatScore(input.dwExamGap.dw),
      exam: formatScore(input.dwExamGap.exam),
    }), "caution"));
  }
  if (input.dwExamGap && input.dwExamGap.gap >= ADVICE_RULES.strongDwExamGap) {
    flags.push(flag("exam_far_below_dw", t("flagDetail.exam_far_below_dw", {
      dw: formatScore(input.dwExamGap.dw),
      exam: formatScore(input.dwExamGap.exam),
      gap: input.dwExamGap.absoluteGap,
    }), "critical"));
  }
  if (input.dwExamGap && input.dwExamGap.gap <= -ADVICE_RULES.strongDwExamGap) {
    flags.push(flag("dw_far_below_exam", t("flagDetail.dw_far_below_exam", {
      dw: formatScore(input.dwExamGap.dw),
      exam: formatScore(input.dwExamGap.exam),
      gap: input.dwExamGap.absoluteGap,
    }), "caution"));
  }
  const hasYearTotalAdvice = flags.some((item) => item.type === "year_total_below_50" || item.type === "year_total_below_65");
  if (!hasYearTotalAdvice && Number.isFinite(input.finalWeighted) && input.finalWeighted < input.threshold) {
    flags.push(flag("below_threshold", t("flagDetail.below_threshold", { threshold: input.threshold }), "critical"));
  }
  if (Number.isFinite(input.trend.volatility) && input.trend.volatility >= 22) {
    flags.push(flag("high_volatility", t("flagDetail.high_volatility", { volatility: input.trend.volatility }), "caution"));
  }
  if (weakestCategory) {
    flags.push(flag("category_bottleneck", t("flagDetail.category_bottleneck", {
      category: weakestCategory.category,
      score: formatScore(weakestCategory.rawPercentage),
      count: weakestCategory.availableCount,
    }), "caution"));
  }
  if (isConsistentGoodProfile(yearTotal, scoreValues, input.trend.volatility, input.evidenceCoverage)) {
    flags.push(flag("consistent_good_work", t("flagDetail.consistent_good_work", {
      score: formatScore(yearTotal.value),
      count: scoreValues.length,
      volatility: formatScore(input.trend.volatility),
    }), "positive"));
  }

  return flags;
}

function getYearTotal(finalWeighted, importedFinal) {
  if (isPercentageSummary(importedFinal)) {
    return {
      value: importedFinal.value,
      source: t("advice.sourceImported"),
    };
  }
  if (Number.isFinite(finalWeighted)) {
    return {
      value: finalWeighted,
      source: t("advice.sourceCalculated"),
    };
  }
  return null;
}

function resolveFinalWeighted(calculatedWeighted, importedFinal) {
  if (isPercentageSummary(importedFinal)) {
    return {
      value: importedFinal.value,
      source: "imported",
    };
  }
  if (Number.isFinite(calculatedWeighted)) {
    return {
      value: calculatedWeighted,
      source: "calculated",
    };
  }
  return {
    value: null,
    source: "missing",
  };
}

function isPercentageSummary(summary) {
  if (!summary || !Number.isFinite(summary.value) || summary.value < 0 || summary.value > 100) return false;
  return /pct|percent|%|\/100|op 100/i.test(`${summary.source || ""} ${summary.field || ""}`);
}

function getWeakestCategory(categoryRows = []) {
  return categoryRows
    .filter((row) => row.availableCount >= ADVICE_RULES.minimumCategoryScores && Number.isFinite(row.rawPercentage))
    .filter((row) => row.rawPercentage < ADVICE_RULES.weakCategoryScore)
    .sort((a, b) => a.rawPercentage - b.rawPercentage)[0] || null;
}

function isConsistentGoodProfile(yearTotal, scoreValues, volatility, evidenceCoverage) {
  if (!yearTotal || scoreValues.length < ADVICE_RULES.minimumConsistentScores) return false;
  if (!Number.isFinite(volatility) || volatility > ADVICE_RULES.consistentGoodVolatility) return false;
  if (evidenceCoverage < 0.85 || yearTotal.value < ADVICE_RULES.consistentGoodTotal) return false;
  return Math.min(...scoreValues) >= ADVICE_RULES.consistentGoodMinimumScore;
}

function flag(type, detail, tone = "info") {
  return {
    type,
    label: t(`flag.${type}`),
    detail,
    tone,
  };
}

function applyClassContextFlags(students) {
  const byClass = new Map();
  for (const student of students) {
    if (!byClass.has(student.classCode)) byClass.set(student.classCode, []);
    byClass.get(student.classCode).push(student);
  }

  for (const classStudents of byClass.values()) {
    const pointCoverages = classStudents
      .map((student) => student.evidence.pointsCoverage)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    const classPointCoverage = pointCoverages.length ? quantile(pointCoverages, 0.5) : null;
    const deltas = classStudents
      .map((student) => student.trend.delta)
      .filter(Number.isFinite);
    const classDelta = deltas.length ? mean(deltas) : null;
    const classDeltaStddev = deltas.length > 1 ? stddev(deltas) : 0;
    const trendMargin = Math.max(8, classDeltaStddev * ADVICE_RULES.trendStddevMultiplier);

    for (const student of classStudents) {
      const missingShare = student.evidence.expectedRequired
        ? student.evidence.missingRequired / student.evidence.expectedRequired
        : 0;
      const pointsCoverage = student.evidence.pointsCoverage;
      const pointsGap = Number.isFinite(classPointCoverage) && Number.isFinite(pointsCoverage)
        ? classPointCoverage - pointsCoverage
        : 0;
      const severeByCount = student.evidence.expectedRequired >= 3 && missingShare >= ADVICE_RULES.lowEvidenceMissingShare;
      const severeByPoints = student.evidence.expectedRequired >= 3
        && pointsCoverage <= ADVICE_RULES.lowEvidencePointsCoverage
        && pointsGap >= ADVICE_RULES.lowEvidenceClassGap;

      if ((severeByCount || severeByPoints) && !student.flags.some((item) => item.type === "low_evidence_coverage")) {
        student.flags.push(flag("low_evidence_coverage", t("flagDetail.low_evidence_coverage", {
          coverage: formatPercent(student.evidenceCoverage),
          pointsCoverage: formatPercent(pointsCoverage),
          classCoverage: formatPercent(classPointCoverage),
        }), "caution"));
      }

      if (
        Number.isFinite(student.trend.delta)
        && Number.isFinite(classDelta)
        && student.trend.delta <= ADVICE_RULES.trendMinimumDelta
        && student.trend.delta < classDelta - trendMargin
        && !student.flags.some((item) => item.type === "declining_trend")
      ) {
        student.flags.push(flag("declining_trend", t("flagDetail.declining_trend", {
          points: Math.abs(student.trend.delta),
          classDelta: formatSignedScore(classDelta),
          difference: formatScore(Math.abs(student.trend.delta - classDelta)),
        }), "caution"));
      }
    }
  }
}

function applyClassPercentiles(students) {
  const byClass = new Map();
  for (const student of students) {
    if (!byClass.has(student.classCode)) byClass.set(student.classCode, []);
    byClass.get(student.classCode).push(student);
  }

  for (const classStudents of byClass.values()) {
    const values = classStudents.map((student) => student.finalWeighted).filter(Number.isFinite).sort((a, b) => a - b);
    for (const student of classStudents) {
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
}

function getImportedFinal(student) {
  const preferred = [...student.summaries].reverse().find((summary) => {
    return /jaar|jaarrapport/i.test(summary.source) && /pct|tot|jaar/i.test(summary.field);
  });
  if (preferred) return preferred;

  return [...student.summaries].reverse().find((summary) => /pct|tot/i.test(summary.field)) || null;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function numberOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function mean(values) {
  if (!values.length) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function quantile(values, q) {
  if (!values.length) return null;
  if (values.length === 1) return round(values[0]);
  const position = (values.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  const value = values[base + 1] == null ? values[base] : values[base] + rest * (values[base + 1] - values[base]);
  return round(value);
}

function stddev(values) {
  if (values.length < 2) return 0;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  return round(Math.sqrt(variance));
}

function round(value, decimals = 1) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return t("option.notAvailable");
  return `${round(value * 100)}%`;
}

function formatScore(value) {
  if (!Number.isFinite(value)) return t("option.notAvailable");
  return String(round(value));
}

function formatSignedScore(value) {
  if (!Number.isFinite(value)) return t("option.notAvailable");
  const rounded = round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}
