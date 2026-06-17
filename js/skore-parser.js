import { normaliseCategory } from "./config.js";
import { t } from "./i18n.js";

const STUDENT_RE = /^\s*(?:(\d+)\.\s+|-\s+)(.+?)\s*$/;
const CLASS_BLACKLIST_RE = /^(skore|kerstexamen|eindexamen|paasexamen|dagelijks|semester|trimester|jaar|overzicht|klassenraad|klasgemiddelde|groepsgemiddelde)/i;

export function parseSkoreWorkbook(workbook) {
  const model = {
    fileName: workbook.fileName,
    sheetNames: workbook.sheetNames,
    sheets: [],
    assignments: [],
    students: [],
    classes: [],
    subjects: [],
    warnings: [],
    totals: {
      rawBlocks: 0,
      summaryBlocks: 0,
      scoreCells: 0,
      missingCells: 0,
      comments: 0,
      malformedValues: 0,
    },
  };

  const context = {
    model,
    studentsByKey: new Map(),
    assignmentsByKey: new Map(),
    classCounts: new Map(),
    subjectCounts: new Map(),
    duplicateNameClasses: new Map(),
  };

  for (const sheet of workbook.sheets) {
    const sheetInfo = {
      name: sheet.name,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      rawBlocks: 0,
      summaryBlocks: 0,
      assignments: 0,
      students: 0,
      comments: 0,
    };

    parseRawBlocks(sheet, context, sheetInfo);
    parseSummaryBlocks(sheet, context, sheetInfo);

    if (sheetInfo.rawBlocks || sheetInfo.summaryBlocks) {
      model.sheets.push(sheetInfo);
    } else {
      model.sheets.push({ ...sheetInfo, kind: "ignored" });
    }
  }

  model.students = Array.from(context.studentsByKey.values()).sort((a, b) => {
    const byClass = a.classCode.localeCompare(b.classCode, undefined, { numeric: true });
    return byClass || a.name.localeCompare(b.name, undefined, { numeric: true });
  });
  model.assignments = Array.from(context.assignmentsByKey.values()).sort((a, b) => a.order - b.order);
  model.classes = sortedCounts(context.classCounts);
  model.subjects = sortedCounts(context.subjectCounts);

  addGlobalWarnings(model, context);
  return model;
}

export function buildDefaultConfig(model) {
  const categories = new Map();
  for (const assignment of model.assignments) {
    const current = categories.get(assignment.category) || 0;
    categories.set(assignment.category, current + (Number(assignment.maxPoints) || 1));
  }

  return {
    subject: model.subjects[0]?.value || "",
    classCode: "all",
    threshold: 50,
    categories: Array.from(categories.entries()).map(([name, weight]) => ({
      name,
      weight: round(weight || 1, 2),
    })),
    assignments: Object.fromEntries(
      model.assignments.map((assignment) => [
        assignment.id,
        {
          active: true,
          required: true,
          category: assignment.category,
          maxPoints: assignment.maxPoints,
        },
      ]),
    ),
  };
}

function parseRawBlocks(sheet, context, sheetInfo) {
  const rows = sheet.rows;
  for (let rowIndex = 0; rowIndex < rows.length - 5; rowIndex += 1) {
    if (!isRawHeader(rows, rowIndex)) continue;

    const block = {
      startRow: rowIndex,
      title: text(rows[rowIndex]?.[0]) || sheet.name,
      subject: firstText(rows[rowIndex]?.slice(1)) || "",
      classCode: text(rows[rowIndex + 1]?.[0]),
      assignmentRow: rows[rowIndex + 1] || [],
      dateRow: rows[rowIndex + 2] || [],
      categoryRow: rows[rowIndex + 3] || [],
      maxRow: rows[rowIndex + 4] || [],
      firstStudentRow: rowIndex + 6,
    };

    context.model.totals.rawBlocks += 1;
    sheetInfo.rawBlocks += 1;
    count(context.classCounts, block.classCode);
    count(context.subjectCounts, block.subject);

    const assignmentIdsByCol = new Map();
    for (let col = 1; col < Math.max(block.assignmentRow.length, block.maxRow.length); col += 1) {
      const title = text(block.assignmentRow[col]);
      const maxPoints = parseNumeric(block.maxRow[col]);
      if (!title && !Number.isFinite(maxPoints)) continue;

      const category = normaliseCategory(block.categoryRow[col], `${block.title} ${title}`);
      const assignment = ensureAssignment(context, {
        sheetName: sheet.name,
        title: title || `${block.title} column ${col + 1}`,
        date: formatDate(block.dateRow[col]),
        category,
        maxPoints: Number.isFinite(maxPoints) ? maxPoints : 0,
        subject: block.subject,
        order: context.model.assignments.length + context.assignmentsByKey.size + col + rowIndex * 100,
      });
      assignment.classCodes.add(block.classCode);
      assignmentIdsByCol.set(col, assignment);
      sheetInfo.assignments += 1;
    }

    for (let r = block.firstStudentRow; r < rows.length; r += 1) {
      const row = rows[r] || [];
      if (isBlankRow(row)) break;
      if (r !== block.firstStudentRow && isRawHeader(rows, r)) break;
      const studentLabel = parseStudentLabel(row[0]);
      if (!studentLabel) continue;

      const student = ensureStudent(context, block.classCode, studentLabel, block.subject);
      sheetInfo.students += 1;

      for (const [col, assignment] of assignmentIdsByCol.entries()) {
        const rawValue = row[col];
        const parsed = parseScoreValue(rawValue);
        if (parsed.status === "malformed") {
          context.model.totals.malformedValues += 1;
        } else if (parsed.status === "missing") {
          context.model.totals.missingCells += 1;
        } else {
          context.model.totals.scoreCells += 1;
        }

        student.scores.set(assignment.id, {
          assignmentId: assignment.id,
          value: parsed.value,
          status: parsed.status,
          rawValue,
          source: sheet.name,
          date: assignment.date,
          category: assignment.category,
          maxPoints: assignment.maxPoints,
        });
      }
    }
  }
}

function parseSummaryBlocks(sheet, context, sheetInfo) {
  const rows = sheet.rows;
  for (let rowIndex = 0; rowIndex < rows.length - 2; rowIndex += 1) {
    if (!isSummaryHeader(rows, rowIndex)) continue;

    const classCode = text(rows[rowIndex]?.[0]);
    const subject = text(rows[rowIndex]?.[1]);
    const title = text(rows[rowIndex + 1]?.[0]) || sheet.name;
    const headers = rows[rowIndex + 1] || [];

    context.model.totals.summaryBlocks += 1;
    sheetInfo.summaryBlocks += 1;
    count(context.classCounts, classCode);
    count(context.subjectCounts, subject);

    for (let r = rowIndex + 4; r < rows.length; r += 1) {
      const row = rows[r] || [];
      if (isBlankRow(row)) break;
      if (r !== rowIndex + 4 && isSummaryHeader(rows, r)) break;
      const studentLabel = parseStudentLabel(row[0]);
      if (!studentLabel) continue;

      const student = ensureStudent(context, classCode, studentLabel, subject);
      sheetInfo.students += 1;

      for (let col = 1; col < headers.length; col += 1) {
        const header = text(headers[col]);
        if (!header) continue;
        const value = row[col];
        if (isCommentHeader(header)) {
          if (!isEmpty(value)) {
            student.comments.push({
              source: title,
              field: header,
              text: text(value),
            });
            context.model.totals.comments += 1;
            sheetInfo.comments += 1;
          }
          continue;
        }

        const parsed = parseScoreValue(value);
        if (parsed.status === "available") {
          student.summaries.push({
            source: title,
            field: header,
            value: parsed.value,
            category: normaliseCategory(header, title),
          });
        }
      }
    }
  }
}

function ensureAssignment(context, input) {
  const key = [
    input.sheetName,
    input.title,
    input.date || "",
    input.category,
    input.maxPoints,
  ].join("::");

  let assignment = context.assignmentsByKey.get(key);
  if (!assignment) {
    assignment = {
      id: `a${context.assignmentsByKey.size + 1}`,
      ...input,
      classCodes: new Set(),
    };
    context.assignmentsByKey.set(key, assignment);
  }
  return assignment;
}

function ensureStudent(context, classCode, studentLabel, subject) {
  const key = `${classCode}::${studentLabel.name.toLowerCase()}`;
  let student = context.studentsByKey.get(key);
  if (!student) {
    student = {
      id: `s${context.studentsByKey.size + 1}`,
      classCode,
      name: studentLabel.name,
      displayNumber: studentLabel.number,
      subject,
      scores: new Map(),
      summaries: [],
      comments: [],
    };
    context.studentsByKey.set(key, student);

    const nameClasses = context.duplicateNameClasses.get(student.name) || new Set();
    nameClasses.add(classCode);
    context.duplicateNameClasses.set(student.name, nameClasses);
  }
  return student;
}

function isRawHeader(rows, rowIndex) {
  const titleRow = rows[rowIndex] || [];
  const classRow = rows[rowIndex + 1] || [];
  const categoryRow = rows[rowIndex + 3] || [];
  const maxRow = rows[rowIndex + 4] || [];
  const averageRow = rows[rowIndex + 5] || [];

  const classCode = text(classRow[0]);
  const hasClass = looksLikeClassCode(classCode);
  const hasSubject = titleRow.slice(1).some((value) => !isEmpty(value));
  const hasAssignment = classRow.slice(1).some((value) => !isEmpty(value));
  const hasCategory = categoryRow.slice(1).some((value) => /^(DW|EX|PCT|TOT)/i.test(text(value)));
  const hasMax = maxRow.slice(1).some((value) => Number.isFinite(parseNumeric(value)));
  const averageLabel = text(averageRow[0]).toLowerCase();
  return hasClass && hasSubject && hasAssignment && hasCategory && hasMax && averageLabel.includes("klasgemiddelde");
}

function isSummaryHeader(rows, rowIndex) {
  const classRow = rows[rowIndex] || [];
  const headerRow = rows[rowIndex + 1] || [];
  const averageRow = rows[rowIndex + 2] || [];
  const classCode = text(classRow[0]);
  const subject = text(classRow[1]);
  const title = text(headerRow[0]);
  const averageLabel = text(averageRow[0]).toLowerCase();
  return (
    looksLikeClassCode(classCode) &&
    !!subject &&
    !!title &&
    headerRow.slice(1).some((value) => !isEmpty(value)) &&
    (averageLabel.includes("klasgemiddelde") || averageLabel.includes("groepsgemiddelde"))
  );
}

function looksLikeClassCode(value) {
  const valueText = text(value);
  if (!valueText || valueText.length > 28) return false;
  if (CLASS_BLACKLIST_RE.test(valueText)) return false;
  return /[0-9]/.test(valueText) && /^[A-Za-z0-9 _/-]+$/.test(valueText);
}

function parseStudentLabel(value) {
  const match = text(value).match(STUDENT_RE);
  if (!match) return null;
  return {
    number: match[1] || "",
    name: match[2].replace(/\s+/g, " ").trim(),
  };
}

function parseScoreValue(value) {
  if (isEmpty(value)) return { status: "missing", value: null };
  if (typeof value === "number" && Number.isFinite(value)) return { status: "available", value };

  const asText = text(value);
  if (/^(vrijgesteld|excused|nvt|n\.v\.t\.|x)$/i.test(asText)) {
    return { status: "excused", value: null };
  }

  const normalised = asText.replace(",", ".");
  const numeric = Number(normalised);
  if (Number.isFinite(numeric)) return { status: "available", value: numeric };
  return { status: "malformed", value: null };
}

function parseNumeric(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (isEmpty(value)) return NaN;
  const numeric = Number(text(value).replace(",", "."));
  return Number.isFinite(numeric) ? numeric : NaN;
}

function isCommentHeader(value) {
  return /commentaar|comment|opmerking|remark/i.test(text(value));
}

function addGlobalWarnings(model, context) {
  if (!model.assignments.length) {
    model.warnings.push(t("warning.noAssignments"));
  }
  if (!model.students.length) {
    model.warnings.push(t("warning.noStudents"));
  }
  if (model.classes.length > 1) {
    model.warnings.push(t("warning.multiClass", { count: model.classes.length }));
  }
  if (model.totals.missingCells > 0) {
    model.warnings.push(t("warning.missingCells", { count: model.totals.missingCells }));
  }
  if (model.totals.malformedValues > 0) {
    model.warnings.push(t("warning.malformed", { count: model.totals.malformedValues }));
  }

  const zeroPointAssignments = model.assignments.filter((assignment) => !Number.isFinite(assignment.maxPoints) || assignment.maxPoints <= 0);
  if (zeroPointAssignments.length) {
    model.warnings.push(t("warning.zeroPoint", { count: zeroPointAssignments.length }));
  }

  const duplicateNames = Array.from(context.duplicateNameClasses.entries())
    .filter(([, classes]) => classes.size > 1)
    .map(([name]) => name);
  if (duplicateNames.length) {
    model.warnings.push(t("warning.duplicateNames", { count: duplicateNames.length }));
  }
}

function sortedCounts(map) {
  return Array.from(map.entries())
    .filter(([value]) => value)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { numeric: true }))
    .map(([value, count]) => ({ value, count }));
}

function count(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function firstText(values = []) {
  for (const value of values) {
    if (!isEmpty(value)) return text(value);
  }
  return "";
}

function formatDate(value) {
  if (isEmpty(value)) return "";
  if (typeof value === "string") return value;
  return text(value);
}

function isBlankRow(row = []) {
  return row.every(isEmpty);
}

function isEmpty(value) {
  return value == null || value === "";
}

function text(value) {
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
