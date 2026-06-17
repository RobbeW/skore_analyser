export function hydrateProjectPayload(payload, fallbackFilters = {}) {
  if (!payload || !payload.model || !payload.config) {
    throw new Error("INVALID_PROJECT");
  }

  const model = hydrateModel(payload.model);
  const config = payload.config;
  const filters = sanitizeFilters(payload.filters, fallbackFilters, config.threshold ?? fallbackFilters.threshold ?? 50);

  return {
    model,
    config,
    filters,
    notes: payload.teacherNotes || {},
    decisions: payload.teacherDecisions || {},
  };
}

function sanitizeFilters(filters = {}, fallbackFilters = {}, threshold = 50) {
  const source = filters && typeof filters === "object" ? filters : {};
  return {
    classCode: typeof source.classCode === "string" && source.classCode ? source.classCode : fallbackFilters.classCode || "all",
    band: typeof source.band === "string" && source.band ? source.band : fallbackFilters.band || "all",
    flag: typeof source.flag === "string" && source.flag ? source.flag : fallbackFilters.flag || "all",
    sortKey: typeof source.sortKey === "string" && source.sortKey ? source.sortKey : fallbackFilters.sortKey || "total",
    sortDirection: source.sortDirection === "desc" ? "desc" : fallbackFilters.sortDirection || "asc",
    threshold,
  };
}

function hydrateModel(model) {
  return {
    fileName: model.fileName || "skore-project.json",
    sheetNames: model.sheetNames || [],
    sheets: model.sheets || [],
    assignments: (model.assignments || []).map((assignment) => ({
      ...assignment,
      classCodes: new Set(Array.from(assignment.classCodes || [])),
    })),
    students: (model.students || []).map((student) => ({
      ...student,
      scores: new Map((student.scores || []).map((score) => [score.assignmentId, score])),
      comments: student.comments || [],
      summaries: student.summaries || [],
    })),
    classes: model.classes || [],
    subjects: model.subjects || [],
    warnings: model.warnings || [],
    totals: model.totals || {
      rawBlocks: 0,
      summaryBlocks: 0,
      scoreCells: 0,
      missingCells: 0,
      comments: 0,
      malformedValues: 0,
    },
  };
}
