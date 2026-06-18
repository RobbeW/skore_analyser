import { t } from "./i18n.js";

export function exportProjectJson(model, config, analysis, notes = {}, filters = {}, decisions = {}) {
  const payload = buildProjectPayload(model, config, analysis, notes, filters, decisions);
  downloadText(`${safeName(model.fileName)}-project.json`, JSON.stringify(payload, null, 2), "application/json");
  return payload;
}

export function buildProjectPayload(model, config, analysis, notes = {}, filters = {}, decisions = {}) {
  return {
    exportedAt: new Date().toISOString(),
    privacy: t("export.privacy"),
    model: serialiseModel(model),
    config,
    filters,
    teacherNotes: notes,
    teacherDecisions: decisions,
    analysis: analysis ? serialiseAnalysis(analysis, false) : null,
  };
}

export function exportSummaryCsv(analysis, anonymised = true, notes = {}, decisions = {}) {
  const headers = [
    t("export.csv.student"),
    t("export.csv.class"),
    t("export.csv.subject"),
    t("export.csv.weightedTotal"),
    t("export.csv.percentile"),
    t("export.csv.coverage"),
    t("export.csv.missing"),
    t("export.csv.trend"),
    t("export.csv.volatility"),
    t("export.csv.flags"),
    t("export.csv.teacherStatus"),
    t("export.csv.teacherAdvice"),
    t("export.csv.pinned"),
    t("export.csv.teacherNotes"),
  ];
  const rows = analysis.students.map((student, index) => [
    anonymised ? t("student.anonymous", { number: String(index + 1).padStart(2, "0") }) : student.name,
    student.classCode,
    student.subject,
    student.finalWeighted,
    student.percentile ?? "",
    Math.round(student.evidenceCoverage * 1000) / 10,
    student.evidence.missingRequired,
    student.trend.direction,
    student.trend.volatility ?? "",
    student.flags.map((flag) => flag.label).join("; "),
    decisions[student.id]?.status || "",
    decisions[student.id]?.advice || "",
    decisions[student.id]?.pinned ? "1" : "",
    notes[student.id] || "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  downloadText(`${safeName(analysis.fileName)}-summary.csv`, csv, "text/csv");
}

export function buildSummaryText(analysis, anonymised = true, notes = {}, decisions = {}) {
  const studentsWithAdvice = analysis.students
    .filter((student) => student.flags.length || notes[student.id] || decisions[student.id]?.status || decisions[student.id]?.advice)
    .slice(0, 12);
  const lines = [
    `${analysis.subject || t("dashboard.fallbackTitle")} - ${analysis.fileName}`,
    t("export.summaryIntro", {
      students: analysis.students.length,
      assignments: analysis.assignments.length,
    }),
    "",
  ];

  for (const [index, student] of studentsWithAdvice.entries()) {
    const name = anonymised ? t("student.anonymous", { number: String(index + 1).padStart(2, "0") }) : student.name;
    lines.push(`${name} (${student.classCode}) - ${formatPercent(student.finalWeighted)}`);
    if (student.flags.length) {
      lines.push(`- ${student.flags.map((flag) => flag.label).join("; ")}`);
    }
    if (decisions[student.id]?.status) {
      lines.push(`- ${t("student.decisionStatus")}: ${t(`decision.${decisions[student.id].status}`)}`);
    }
    if (decisions[student.id]?.advice) {
      lines.push(`- ${t("student.teacherAdvice")}: ${decisions[student.id].advice}`);
    }
    if (notes[student.id]) {
      lines.push(`- ${t("student.teacherJudgement")}: ${notes[student.id]}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function buildClassAgendaText(analysis, anonymised = true, notes = {}, decisions = {}, filters = {}) {
  const classLabel = filters.classCode && filters.classCode !== "all" ? filters.classCode : t("filter.allClasses");
  const students = analysis.students
    .filter((student) => !filters.classCode || filters.classCode === "all" || student.classCode === filters.classCode)
    .filter((student) => student.flags.length || decisions[student.id]?.pinned || decisions[student.id]?.status || notes[student.id])
    .sort((a, b) => {
      const pinGap = Number(Boolean(decisions[b.id]?.pinned)) - Number(Boolean(decisions[a.id]?.pinned));
      if (pinGap) return pinGap;
      const aGrade = Number.isFinite(a.finalWeighted) ? a.finalWeighted : Infinity;
      const bGrade = Number.isFinite(b.finalWeighted) ? b.finalWeighted : Infinity;
      return aGrade - bGrade;
    });

  const lines = [
    `${t("agenda.title")} - ${classLabel}`,
    `${analysis.subject || t("dashboard.fallbackTitle")} - ${analysis.fileName}`,
    "",
  ];

  for (const [index, student] of students.entries()) {
    const name = anonymised ? t("student.anonymous", { number: String(index + 1).padStart(2, "0") }) : student.name;
    const decision = decisions[student.id] || {};
    lines.push(`${name} (${student.classCode}) - ${formatPercent(student.finalWeighted)}`);
    if (decision.status) lines.push(`- ${t("student.decisionStatus")}: ${t(`decision.${decision.status}`)}`);
    if (student.flags.length) lines.push(`- ${student.flags.slice(0, 3).map((flag) => flag.label).join("; ")}`);
    if (decision.advice) lines.push(`- ${t("student.teacherAdvice")}: ${decision.advice}`);
    if (notes[student.id]) lines.push(`- ${t("student.teacherJudgement")}: ${notes[student.id]}`);
    lines.push("");
  }

  if (!students.length) lines.push(t("agenda.empty"));
  return lines.join("\n").trim();
}

function serialiseModel(model) {
  return {
    ...model,
    assignments: model.assignments.map((assignment) => ({
      ...assignment,
      classCodes: Array.from(assignment.classCodes || []),
    })),
    students: model.students.map((student) => ({
      ...student,
      scores: Array.from(student.scores.values()),
    })),
  };
}

function serialiseAnalysis(analysis, includeNames) {
  return {
    ...analysis,
    students: analysis.students.map((student, index) => ({
      ...student,
      name: includeNames ? student.name : t("student.anonymous", { number: String(index + 1).padStart(2, "0") }),
      assignmentScores: student.assignmentScores.map(({ assignment, score }) => ({
        assignmentId: assignment.id,
        title: assignment.title,
        category: assignment.category,
        maxPoints: assignment.maxPoints,
        score,
      })),
    })),
  };
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return t("option.notAvailable");
  return `${Math.round(value * 10) / 10}%`;
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

function safeName(name) {
  return String(name || "skore-analysis")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "skore-analysis";
}
