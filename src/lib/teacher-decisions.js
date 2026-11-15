// Teacher judgement kept apart from calculated evidence: per-pupil status, agreed
// action, flag handling, and the subject-teacher handover file (vakfeedback).

export const DECISION_STATUSES = ["open", "discussed", "followup"];
export const FLAG_STATES = ["handled", "nuance", "irrelevant"];
export const FEEDBACK_KIND = "skore-subject-feedback";
export const FEEDBACK_VERSION = 1;

/** Name key used to match pupils across a subject export and a class report. */
export function normaliseName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .sort()
    .join(" ");
}

/** True when a flag was marked handled/irrelevant, so it no longer competes with open signals. */
export function isFlagSettled(decision, flagType) {
  const state = decision?.flagStates?.[flagType];
  return state === "handled" || state === "irrelevant";
}

/** Builds the vakfeedback payload a subject teacher hands to the class teacher. */
export function buildSubjectFeedbackPayload({ subject, teacher = "", students = [], notes = {}, decisions = {}, flagLabel = (flag) => flag.label || flag.type }) {
  return {
    kind: FEEDBACK_KIND,
    version: FEEDBACK_VERSION,
    createdAt: new Date().toISOString(),
    subject,
    teacher,
    students: students.map((student) => {
      const decision = decisions[student.id] || {};
      return {
        name: student.name,
        classCode: student.classCode,
        total: Number.isFinite(student.finalWeighted) ? Math.round(student.finalWeighted * 10) / 10 : null,
        signals: (student.flags || [])
          .filter((flag) => flag.tone !== "positive" && !isFlagSettled(decision, flag.type))
          .map(flagLabel),
        positives: (student.flags || []).filter((flag) => flag.tone === "positive").map(flagLabel),
        note: String(notes[student.id] || "").trim(),
      };
    }),
  };
}

/** Validates and indexes a vakfeedback payload: { subject, teacher, students: { nameKey: item } }. */
export function parseSubjectFeedback(payload) {
  if (!payload || payload.kind !== FEEDBACK_KIND || !Array.isArray(payload.students) || !payload.subject) {
    throw new Error("INVALID_FEEDBACK");
  }
  const students = {};
  for (const item of payload.students) {
    if (!item?.name) continue;
    students[normaliseName(item.name)] = {
      classCode: String(item.classCode || ""),
      total: Number.isFinite(item.total) ? item.total : null,
      signals: Array.isArray(item.signals) ? item.signals.map(String).slice(0, 12) : [],
      positives: Array.isArray(item.positives) ? item.positives.map(String).slice(0, 12) : [],
      note: String(item.note || "").slice(0, 2000),
    };
  }
  return {
    subject: String(payload.subject),
    teacher: String(payload.teacher || ""),
    createdAt: String(payload.createdAt || ""),
    students,
  };
}
