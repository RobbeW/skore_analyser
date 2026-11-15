// Prior school year (Skore year report PDF, uploaded per pupil card): upload button, name check,
// klassenraad decision panel and the deterministic prior-year signals.
import React, { useRef } from "react";
import { History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { t } from "../../js/i18n.js";
import { priorClassPosition, priorValueFor } from "../../js/prior-year-report.js";
import { formatNumber } from "../lib/app-helpers.jsx";
import { scoreForClassTeacherLine } from "../lib/class-teacher-helpers.jsx";

export const PRIOR_RULES = {
  strongDrop: 15, // points below last year's result in the same hoofdvak
  weakBefore: 50, // last year's result below this ...
  weakNow: 60, // ... and this year's still below this
};

const pct = (value) => (Number.isFinite(value) ? `${formatNumber(value)}%` : "–");

/** Upload button on a pupil card; shows a chip with last year's total once a report is linked. */
export function PriorYearButton({ student, prior, displayName, onUpload, onRemove, compact = false }) {
  const inputRef = useRef(null);
  return (
    <span className="prior-year-control">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept=".pdf,application/pdf"
        onChange={(event) => {
          const [file] = event.target.files || [];
          event.target.value = "";
          if (file) onUpload?.(student, file, displayName);
        }}
      />
      {prior ? (
        <span className="prior-chip" title={t("prior.chipTitle", { year: prior.schoolYear || "", classCode: prior.classCode || "" })}>
          <History size={14} aria-hidden="true" />
          <span>{t("prior.chip", { total: pct(prior.overall?.tot) })}</span>
          <button type="button" className="prior-chip__remove" onClick={() => onRemove?.(student.id)} aria-label={t("prior.remove")}>
            <X size={13} aria-hidden="true" />
          </button>
        </span>
      ) : (
        <Button variant="outline" size={compact ? "sm" : "default"} type="button" onClick={() => inputRef.current?.click()}>
          <History size={15} aria-hidden="true" />
          {t("prior.upload")}
        </Button>
      )}
    </span>
  );
}

/** Name check (and read errors) after an upload. */
export function PriorYearNameDialog({ data, onConfirm, onCancel }) {
  const open = Boolean(data);
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent>
        {data?.error ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("prior.errorTitle")}</DialogTitle>
              <DialogDescription>{data.error}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={onCancel}>{t("prior.close")}</Button>
            </DialogFooter>
          </>
        ) : data ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("prior.nameTitle")}</DialogTitle>
              <DialogDescription>
                {data.anonymisedName || !data.report.pupilName
                  ? t("prior.nameMismatchAnon")
                  : t("prior.nameMismatch", { pdfName: data.report.pupilName, name: data.studentName })}
              </DialogDescription>
            </DialogHeader>
            <p className="muted">{t("prior.reportMeta", { year: data.report.schoolYear || "?", classCode: data.report.classCode || "?", subjects: data.report.subjects.length })}</p>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onCancel}>{t("prior.cancel")}</Button>
              <Button type="button" onClick={onConfirm}>{t("prior.linkAnyway")}</Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Deterministic prior-year signals for one class-teacher pupil (hoofdvakken only). */
export function priorYearSignals(student, prior) {
  if (!prior) return [];
  const signals = [];
  for (const line of student.subjectLines || []) {
    if (!line.isKeySubject) continue;
    const before = priorValueFor(prior, line.subject);
    const now = scoreForClassTeacherLine(line);
    if (!before || before.source !== "same" || !Number.isFinite(now)) continue;
    if (before.value - now >= PRIOR_RULES.strongDrop) {
      signals.push({ type: "prior_drop", tone: "caution", label: t("prior.signalDrop"), detail: t("prior.signalDropDetail", { subject: line.subject, before: pct(before.value), now: pct(now) }) });
    } else if (before.value < PRIOR_RULES.weakBefore && now < PRIOR_RULES.weakNow) {
      signals.push({ type: "prior_weak", tone: "critical", label: t("prior.signalWeak"), detail: t("prior.signalWeakDetail", { subject: line.subject, before: pct(before.value), now: pct(now) }) });
    }
  }
  return signals;
}

export function PriorSignalList({ signals }) {
  if (!signals.length) return null;
  return (
    <div className="prior-signals">
      {signals.map((signal, index) => (
        <div key={`${signal.type}-${index}`} className="flag-detail-row__main">
          <Badge variant={signal.tone === "critical" ? "destructive" : "warning"}>{signal.label}</Badge>
          <p>{signal.detail}</p>
        </div>
      ))}
    </div>
  );
}

/** Klassenraad mode only: last year's result and the decision of the deliberating class council. */
export function PriorYearDecision({ prior }) {
  if (!prior) return null;
  const decision = prior.decision || {};
  return (
    <section className="prior-decision" aria-label={t("prior.decisionTitle")}>
      <h4><History size={16} aria-hidden="true" /> {t("prior.decisionTitle")} <span className="muted">{prior.schoolYear} · {prior.classCode}</span></h4>
      <dl>
        <div><dt>{t("prior.overall")}</dt><dd>{pct(prior.overall?.tot)}</dd></div>
        {decision.beslissing ? <div><dt>{t("prior.beslissing")}</dt><dd>{decision.beslissing}</dd></div> : null}
        {decision.studiebewijs ? <div><dt>{t("prior.studiebewijs")}</dt><dd>{decision.studiebewijs}</dd></div> : null}
        {decision.advies ? <div className="prior-decision__wide"><dt>{t("prior.advies")}</dt><dd>{decision.advies}</dd></div> : null}
      </dl>
    </section>
  );
}

/** Small cell for tables: last year's value for a subject (lead-ins in italics). */
export function PriorCell({ prior, subject }) {
  const value = priorValueFor(prior, subject);
  if (!value) return <span className="muted">–</span>;
  const position = priorClassPosition(value.item);
  const title = [
    value.source === "leadIn" ? t("prior.leadInTitle", { from: value.fromSubject }) : t("prior.sameTitle"),
    position ? t("prior.positionTitle", { below: position.below, total: position.total }) : "",
  ].filter(Boolean).join(" · ");
  return (
    <span className={cn("prior-cell", value.source === "leadIn" && "is-lead-in")} title={title}>
      {formatNumber(value.value)}
    </span>
  );
}
