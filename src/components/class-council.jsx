// Klastitularis tools: class heatmap (pupils x subjects), klassenraad meeting mode,
// printable bespreeklijst, and the subject-teacher handover (vakfeedback) display.
import React, { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, MessageSquareText, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { t } from "../../js/i18n.js";
import { anonymousName, formatGrade, formatNumber, shortLabel } from "../lib/app-helpers.jsx";
import { loadedPeriods, periodShortLabel,
  classTeacherDetailFlags,
  classTeacherFlagVariant,
  classTeacherHasMainSubjectDanger,
  classTeacherStudentSummary,
  scoreForClassTeacherLine,
} from "../lib/class-teacher-helpers.jsx";
import { useEnter, useStagger } from "../lib/use-motion.jsx";
import { DECISION_STATUSES, FLAG_STATES, normaliseName } from "../lib/teacher-decisions.js";
import { PriorCell, PriorSignalList, PriorYearDecision, priorYearSignals } from "./prior-year.jsx";

export function heatTone(score) {
  if (!Number.isFinite(score)) return "empty";
  if (score < 50) return "over";
  if (score < 60) return "cap";
  return "ok";
}

/** Pupils who belong on the bespreeklijst: hoofdvak in danger, year below 65, or any critical signal. */
export function isDiscussionStudent(student) {
  return classTeacherHasMainSubjectDanger(student)
    || (Number.isFinite(student.finalWeighted) && student.finalWeighted < 65)
    || (student.flags || []).some((flag) => flag.tone === "critical");
}

function displayName(student, anonymised) {
  return anonymised ? anonymousName(student) : student.name;
}

/** Subject feedback entries (from subject teachers) for one pupil, keyed by subject. */
export function feedbackForStudent(feedback = {}, student) {
  const key = normaliseName(student?.name);
  return Object.values(feedback)
    .map((entry) => ({ subject: entry.subject, teacher: entry.teacher, item: entry.students?.[key] }))
    .filter((row) => row.item);
}

function subjectHasFeedback(feedback, student, subject) {
  const key = normaliseName(student?.name);
  return Object.values(feedback || {}).some((entry) => (
    String(entry.subject || "").toLowerCase() === String(subject || "").toLowerCase() && entry.students?.[key]
  ));
}

export function ClassHeatmap({ c, analysis, students, anonymised, feedback, decisions = {}, onOpenStudent }) {
  const subjects = analysis.subjects || [];
  const signature = `${students.length}-${subjects.length}`;
  const bodyRef = useStagger("tr", signature, { step: 18 });
  const counts = useMemo(() => subjects.map((subject) => {
    let over = 0;
    let cap = 0;
    for (const student of students) {
      const line = (student.subjectLines || []).find((item) => item.subject === subject.subject);
      const tone = heatTone(scoreForClassTeacherLine(line));
      if (tone === "over") over += 1;
      if (tone === "cap") cap += 1;
    }
    return { over, cap };
  }), [students, subjects]);

  if (!subjects.length || !students.length) return null;
  return (
    <div className="heatmap">
      <div className="heatmap__legend" aria-hidden="true">
        <span><i className="heat-chip heat-chip--over" />{t("heatmap.legendOver")}</span>
        <span><i className="heat-chip heat-chip--cap" />{t("heatmap.legendCap")}</span>
        <span><i className="heat-chip heat-chip--ok" />{t("heatmap.legendOk")}</span>
        <span><i className="heat-dot" />{t("heatmap.legendFeedback")}</span>
      </div>
      <div className="heatmap__scroll" tabIndex={0} aria-label={t("heatmap.title")}>
        <table className="heatmap__table">
          <caption className="sr-only">{t("heatmap.caption", { classCode: analysis.classCode })}</caption>
          <thead>
            <tr>
              <th scope="col" className="heatmap__name">{t("student.student")}</th>
              <th scope="col" className="heatmap__total">{t("student.total")}</th>
              {subjects.map((subject) => (
                <th key={subject.subject} scope="col" title={subject.subject} className={cn(subject.isKeySubject && "is-key")}>
                  <span>{shortLabel(subject.subject, 11)}</span>
                  {subject.isKeySubject ? <small>{c("classTeacherKeySubject")}</small> : null}
                </th>
              ))}
              <th scope="col">{t("heatmap.status")}</th>
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {students.map((student) => {
              const status = decisions[student.id]?.status || (isDiscussionStudent(student) ? "open" : "none");
              return (
                <tr key={student.id}>
                  <th scope="row" className="heatmap__name">
                    <button type="button" className="link-button" onClick={() => onOpenStudent(student.id)}>
                      {displayName(student, anonymised)}
                    </button>
                  </th>
                  <td className={cn("heatmap__total", `heat--${heatTone(student.finalWeighted)}`)}>{formatGrade(student.finalWeighted)}</td>
                  {subjects.map((subject) => {
                    const line = (student.subjectLines || []).find((item) => item.subject === subject.subject);
                    const score = scoreForClassTeacherLine(line);
                    const tone = heatTone(score);
                    const hasFeedback = subjectHasFeedback(feedback, student, subject.subject);
                    return (
                      <td key={subject.subject} className={cn("heat", `heat--${tone}`, subject.isKeySubject && "is-key")} title={`${subject.subject}: ${Number.isFinite(score) ? `${formatNumber(score)}%` : t("option.notAvailable")}`}>
                        {Number.isFinite(score) ? formatNumber(score, "") : "–"}
                        {hasFeedback ? <i className="heat-dot" aria-label={t("heatmap.legendFeedback")} /> : null}
                      </td>
                    );
                  })}
                  <td>
                    {status === "none" ? null : <span className={cn("status-chip", `status-chip--${status}`)}>{t(`decision.status.${status}`)}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="heatmap__name">{t("heatmap.countOver")}</th>
              <td />
              {counts.map((count, index) => (
                <td key={subjects[index].subject} className={cn("heat-count", count.over >= Math.max(3, students.length * 0.25) && "is-hot")}>
                  {count.over || "·"}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="heatmap__hint">{t("heatmap.hint")}</p>
    </div>
  );
}

function SubjectMiniTable({ student, periods, prior = null }) {
  return (
    <div className="table-scroll">
      <table className="meeting-subjects">
        <thead>
          <tr>
            <th scope="col">{t("detected.subject")}</th>
            {prior ? <th scope="col" className="prior-column">{t("prior.column")}</th> : null}
            {periods.map((period) => <th key={period.id} scope="col">{shortLabel(periodShortLabel(period), 12)}</th>)}
          </tr>
        </thead>
        <tbody>
          {(student.subjectLines || []).map((line) => (
            <tr key={line.subject} className={line.isKeySubject ? "is-key" : undefined}>
              <th scope="row">{line.subject}</th>
              {prior ? <td className="prior-column"><PriorCell prior={prior} subject={line.subject} /></td> : null}
              {periods.map((period) => {
                const point = (line.points || []).find((item) => item.periodId === period.id);
                return (
                  <td key={period.id} className={cn("heat", `heat--${heatTone(point?.value)}`)}>
                    {Number.isFinite(point?.value) ? formatNumber(point.value) : "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FlagWithHandling({ flag, state, onChange }) {
  return (
    <div className={cn("flag-detail-row", state && "is-handled")}>
      <div className="flag-detail-row__main">
        <Badge variant={classTeacherFlagVariant(flag.tone)}>{flag.label}</Badge>
        <p>{flag.detail}</p>
      </div>
      <div className="flag-handling" role="group" aria-label={t("flagState.label", { flag: flag.label })}>
        {FLAG_STATES.map((option) => (
          <button
            key={option}
            type="button"
            className={cn("flag-handling__btn", state === option && "is-active")}
            aria-pressed={state === option}
            onClick={() => onChange(state === option ? null : option)}
          >
            {t(`flagState.${option}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SubjectFeedbackList({ entries }) {
  if (!entries.length) return null;
  return (
    <section className="feedback-list" aria-label={t("feedback.title")}>
      <h4><MessageSquareText size={16} aria-hidden="true" /> {t("feedback.title")}</h4>
      <ul>
        {entries.map(({ subject, teacher, item }) => (
          <li key={subject}>
            <strong>{subject}</strong>
            {Number.isFinite(item.total) ? <span className="feedback-list__score">{formatGrade(item.total)}</span> : null}
            {teacher ? <span className="muted"> · {teacher}</span> : null}
            {item.signals?.length ? <p className="feedback-list__signals">{item.signals.join(" · ")}</p> : null}
            {item.note ? <p>{item.note}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Full-screen klassenraad mode: one pupil at a time, arrow keys to move, decisions kept per pupil. */
export function MeetingMode({
  c,
  open,
  students,
  index,
  analysis,
  anonymised,
  notes,
  decisions,
  feedback,
  priorYear = {},
  onIndexChange,
  onClose,
  onNoteChange,
  onDecisionChange,
  onOpenNoteSuggestion,
}) {
  const student = students[index];
  const contentRef = useEnter(student?.id || "none", { y: 6 });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      const tag = event.target?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (event.key === "ArrowRight" && index < students.length - 1) {
        event.preventDefault();
        onIndexChange(index + 1);
      } else if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        onIndexChange(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, students.length, onIndexChange]);

  if (!student) return null;
  const decision = decisions[student.id] || {};
  const status = decision.status || (isDiscussionStudent(student) ? "open" : "none");
  const summary = classTeacherStudentSummary(student, c);
  const flags = classTeacherDetailFlags(student);
  const keyFlags = (student.flags || []).filter((flag) => !flags.includes(flag));
  const name = displayName(student, anonymised);
  const feedbackEntries = feedbackForStudent(feedback, student);
  const prior = priorYear[student.id] || null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="meeting" showClose={false}>
        <header className="meeting__bar">
          <div className="meeting__counter" aria-live="polite">
            {t("meeting.counter", { index: index + 1, count: students.length })}
          </div>
          <div className="meeting__progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${(index + 1) / Math.max(students.length, 1)})` }} />
          </div>
          <div className="meeting__nav">
            <Button variant="outline" size="icon" type="button" disabled={index === 0} onClick={() => onIndexChange(index - 1)} aria-label={t("student.previousInClass")}>
              <ChevronLeft size={18} aria-hidden="true" />
            </Button>
            <Button variant="outline" size="icon" type="button" disabled={index >= students.length - 1} onClick={() => onIndexChange(index + 1)} aria-label={t("student.nextInClass")}>
              <ChevronRight size={18} aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" type="button" onClick={onClose} aria-label={t("meeting.close")}>
              <X size={18} aria-hidden="true" />
            </Button>
          </div>
        </header>

        <div ref={contentRef} className="meeting__body">
          <div className="meeting__head">
            <div>
              <DialogTitle className="meeting__name">{name}</DialogTitle>
              <DialogDescription className="meeting__meta">
                {analysis.classCode} · {analysis.track?.label || t("option.notAvailable")}
              </DialogDescription>
            </div>
            <div className={cn("meeting__total", `heat--${heatTone(student.finalWeighted)}`)}>
              <span className="meeting__total-label">{t("student.total")}</span>
              <strong>{formatGrade(student.finalWeighted)}</strong>
            </div>
          </div>

          <div className="meeting__grid">
            <section className="meeting__panel">
              <h3>{t("advice.summaryTitle")}</h3>
              <p className="meeting__summary-title">{summary.title}</p>
              <p>{summary.body}</p>
              {keyFlags.length ? (
                <div className="chip-row">
                  {keyFlags.map((flag, i) => <Badge key={`${flag.type}-${i}`} variant={classTeacherFlagVariant(flag.tone)}>{flag.label}</Badge>)}
                </div>
              ) : null}
              {flags.map((flag, i) => (
                <FlagWithHandling
                  key={`${flag.type}-${i}`}
                  flag={flag}
                  state={decision.flagStates?.[flag.type] || null}
                  onChange={(value) => onDecisionChange(student.id, { flagStates: { ...(decision.flagStates || {}), [flag.type]: value } })}
                />
              ))}
              <PriorSignalList signals={priorYearSignals(student, prior)} />
              <SubjectFeedbackList entries={feedbackEntries} />
              <PriorYearDecision prior={prior} />
            </section>

            <section className="meeting__panel">
              <h3>{c("classTeacherSubjectMatrix")}</h3>
              <SubjectMiniTable student={student} periods={loadedPeriods(analysis)} prior={prior} />
            </section>
          </div>

          <section className="meeting__panel meeting__decision">
            <div className="meeting__decision-row">
              <h3>{t("decision.title")}</h3>
              <div className="status-picker" role="group" aria-label={t("decision.title")}>
                {DECISION_STATUSES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cn("status-picker__btn", `status-picker__btn--${option}`, status === option && "is-active")}
                    aria-pressed={status === option}
                    onClick={() => onDecisionChange(student.id, { status: option })}
                  >
                    {t(`decision.status.${option}`)}
                  </button>
                ))}
              </div>
            </div>
            <label className="meeting__field">
              <span>{t("decision.action")}</span>
              <input
                className="ui-input"
                value={decision.action || ""}
                onChange={(event) => onDecisionChange(student.id, { action: event.target.value })}
                placeholder={t("decision.actionPlaceholder")}
              />
            </label>
            <label className="meeting__field">
              <span className="meeting__field-head">
                {t("student.teacherJudgement")}
                <Button variant="ghost" size="sm" type="button" onClick={() => onOpenNoteSuggestion?.(student, analysis, name)}>
                  <Sparkles size={14} aria-hidden="true" /> {t("noteSuggestion.button")}
                </Button>
              </span>
              <Textarea value={notes[student.id] || ""} onChange={(event) => onNoteChange(student.id, event.target.value)} placeholder={t("student.teacherPlaceholder")} />
            </label>
          </section>
          <p className="meeting__keys">{t("meeting.keys")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Print-only class overview: heatmap summary and bespreeklijst. Shown when the shell has .is-printing-overview. */
export function ClassCouncilPrint({ c, analysis, students, anonymised, notes, decisions }) {
  const discussion = students.filter((student) => {
    const status = decisions[student.id]?.status;
    return status === "open" || status === "followup" || (!status && isDiscussionStudent(student));
  });
  const keySubjects = (analysis.subjects || []).filter((subject) => subject.isKeySubject);
  return (
    <section className="print-overview" aria-hidden="true">
      <header className="print-overview__head">
        <h1>{t("print.overviewTitle", { classCode: analysis.classCode })}</h1>
        <p>{analysis.track?.label || ""} · {t("print.generated", { date: new Date().toLocaleDateString("nl-BE") })}</p>
      </header>
      <dl className="print-overview__stats">
        <div><dt>{t("detected.students")}</dt><dd>{students.length}</dd></div>
        <div><dt>{t("dashboard.classAverage")}</dt><dd>{formatGrade(analysis.stats?.mean)}</dd></div>
        <div><dt>{c("classTeacherMainSubjectDanger")}</dt><dd>{students.filter(classTeacherHasMainSubjectDanger).length}</dd></div>
        <div><dt>{t("print.discussionCount")}</dt><dd>{discussion.length}</dd></div>
      </dl>
      <h2>{t("print.discussionList")}</h2>
      <table className="print-overview__table">
        <thead>
          <tr>
            <th>{t("student.student")}</th>
            <th>{t("student.total")}</th>
            {keySubjects.map((subject) => <th key={subject.subject}>{shortLabel(subject.subject, 10)}</th>)}
            <th>{t("print.signal")}</th>
            <th>{t("decision.title")}</th>
            <th>{t("print.note")}</th>
          </tr>
        </thead>
        <tbody>
          {discussion.map((student) => {
            const decision = decisions[student.id] || {};
            const summary = classTeacherStudentSummary(student, c);
            return (
              <tr key={student.id}>
                <td>{displayName(student, anonymised)}</td>
                <td>{formatGrade(student.finalWeighted)}</td>
                {keySubjects.map((subject) => {
                  const line = (student.subjectLines || []).find((item) => item.subject === subject.subject);
                  const score = scoreForClassTeacherLine(line);
                  return <td key={subject.subject} className={`heat--${heatTone(score)}`}>{Number.isFinite(score) ? formatNumber(score) : "–"}</td>;
                })}
                <td>{summary.body}</td>
                <td>{t(`decision.status.${decision.status || "open"}`)}{decision.action ? ` — ${decision.action}` : ""}</td>
                <td className="print-overview__note">{notes[student.id] || ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!discussion.length ? <p>{t("print.noDiscussion")}</p> : null}
    </section>
  );
}
