import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  FileJson,
  FolderOpen,
  HelpCircle,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { readXlsxWorkbook } from "../../js/xlsx-reader.js";
import { buildDefaultConfig, parseSkoreWorkbook } from "../../js/skore-parser.js";
import { parseClassTeacherReportWorkbook } from "../../js/class-teacher-parser.js";
import { aggregateClassTeacherReportGroups } from "../../js/class-teacher-aggregator.js";
import { calculateClassTeacherAnalysis } from "../../js/class-teacher-calculator.js";
import { periodSchemaForYear, trackById, trackOptionsForYear } from "../../js/class-teacher-config.js";
import { calculateAnalysis, summariseStudents } from "../../js/calculator.js";
import { THRESHOLD_BANDS, thresholdBand } from "../../js/config.js";
import { getLanguage, setLanguage, t, translateTrend } from "../../js/i18n.js";
import { buildProjectPayload, exportJsonPayload, exportProjectJson } from "../../js/exporter.js";
import { hydrateProjectPayload } from "../../js/project-importer.js";
import {
  appendSuggestionToNote,
  generateClassTeacherNoteSuggestion,
  generateSubjectTeacherNoteSuggestion,
} from "../../js/note-guidance.js";
import {
  applyPreset,
  loadNotes,
  loadPreferences,
  loadPresets,
  saveNote,
  saveNotes,
  savePreferences,
  savePreset,
  clearWorkspaceNotes,
  purgeLegacyProjectDrafts,
} from "../../js/storage.js";
import { StatCard } from "./student-card.jsx";
import { cardTourStepsForMode } from "../lib/app-constants.jsx";
import { anonymousName, formatGrade, formatNumber } from "../lib/app-helpers.jsx";

export function StudentTourOverlay({ c, mode = "vakdocent", activeTour, onChange, onClose, onComplete }) {
  const [rect, setRect] = useState(null);
  const steps = cardTourStepsForMode(mode);
  const step = activeTour ? steps[activeTour.step] : null;

  useLayoutEffect(() => {
    if (!activeTour || !step) {
      setRect(null);
      return undefined;
    }
    let frame = 0;
    const update = () => {
      const target = document.querySelector(`[data-student-id="${CSS.escape(activeTour.studentId)}"] [data-tour-part="${CSS.escape(step.part)}"]`);
      if (!target) {
        setRect(null);
        return;
      }
      const box = target.getBoundingClientRect();
      const offscreen = box.top < 84 || box.bottom > window.innerHeight - 84;
      if (offscreen) {
        target.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "center",
        });
        frame = window.requestAnimationFrame(update);
        return;
      }
      const updatedBox = target.getBoundingClientRect();
      setRect({
        top: updatedBox.top,
        left: updatedBox.left,
        width: updatedBox.width,
        height: updatedBox.height,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [activeTour, step]);

  if (!activeTour || !step || !rect) return null;

  const isLast = activeTour.step >= steps.length - 1;
  const tourEyebrow = mode === "klassenleraar"
    ? c("classTeacherTourEyebrow")
    : t("tour.title", { student: "" }).replace(":", "").trim();
  const tourTitle = step.copy ? c(step.titleKey) : t(step.titleKey);
  const tourBody = step.copy ? c(step.bodyKey) : t(step.bodyKey);
  const panelLeft = Math.min(window.innerWidth - 340, Math.max(18, rect.left));
  const panelTop = rect.top + rect.height + 18 < window.innerHeight - 170
    ? rect.top + rect.height + 18
    : Math.max(18, rect.top - 170);
  const focusCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  const panelCenter = {
    x: panelLeft + 160,
    y: panelTop + 78,
  };

  return (
    <div className="tour-layer" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <button className="tour-scrim" type="button" aria-label={c("closeTour")} onClick={onClose} />
      <div
        className="tour-focus-box"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />
      <svg className="tour-connector" aria-hidden="true">
        <line x1={focusCenter.x} y1={focusCenter.y} x2={panelCenter.x} y2={panelCenter.y} />
      </svg>
      <div className="tour-panel" style={{ top: panelTop, left: panelLeft }}>
        <div className="tour-panel-body" key={step.part}>
          <div className="tour-panel-meta">
            <p className="eyebrow">{tourEyebrow}</p>
            <span>{t("tour.stepProgress", { current: activeTour.step + 1, total: steps.length })}</span>
          </div>
          <h3 id="tour-title">{tourTitle}</h3>
          <p>{tourBody}</p>
        </div>
        <div className="tour-actions">
          <Button variant="ghost" type="button" onClick={onClose}>{c("closeTour")}</Button>
          <Button
            variant="outline"
            type="button"
            disabled={activeTour.step === 0}
            onClick={() => onChange({ ...activeTour, step: Math.max(0, activeTour.step - 1) })}
          >
            {c("previous")}
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (isLast) onComplete?.();
              else onChange({ ...activeTour, step: activeTour.step + 1 });
            }}
          >
            {isLast ? c("finish") : c("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EvaluationDialog({ c, data, onOpenChange }) {
  const point = data?.point;
  const assignment = point?.assignment;
  const score = point?.score;
  return (
    <Dialog open={Boolean(data)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{c("chartModalTitle")}</DialogTitle>
          <DialogDescription>{c("chartModalDescription")}</DialogDescription>
        </DialogHeader>
        {point ? (
          <div className="evaluation-detail">
            <StatCard label={t("chart.evaluation")} value={point.label} compact />
            <StatCard label={t("chart.score")} value={Number.isFinite(point.value) ? `${formatNumber(point.value)}%` : c("noScore")} compact />
            <StatCard
              label={t("student.earned")}
              value={Number.isFinite(point.earned) && Number.isFinite(point.maxPoints) ? `${formatNumber(point.earned)} / ${formatNumber(point.maxPoints)}` : c("noScore")}
              compact
            />
            <StatCard label={t("mapping.max")} value={assignment?.maxPoints ?? score?.maxPoints ?? point.maxPoints ?? ""} compact />
            {point.usage === "displayOnly" ? (
              <p className="context-evaluation-note">
                <FileJson size={16} aria-hidden="true" />
                {t("usage.displayOnlyHelp")}
              </p>
            ) : null}
            <p className="muted">{point.title || assignment?.title || ""}</p>
            <p className="muted">{assignment?.sheetName || point.sheetName || ""} {assignment?.date || point.date || ""}</p>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HistogramDialog({ data, anonymised, onOpenChange }) {
  const students = data?.students || [];
  const useAnonymousNames = data?.anonymised ?? anonymised;
  const isEnglish = getLanguage() === "en";
  const title = isEnglish
    ? `Students in score band ${data?.label || ""}`.trim()
    : `Leerlingen in scoreband ${data?.label || ""}`.trim();
  const description = isEnglish
    ? `${students.length} student${students.length === 1 ? "" : "s"} in this bar.`
    : `${students.length} leerling${students.length === 1 ? "" : "en"} in deze staaf.`;

  return (
    <Dialog open={Boolean(data)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="histogram-student-list">
          {students.map((student, index) => (
            <div className="histogram-student-row" key={student.id}>
              <div>
                <strong>{useAnonymousNames ? anonymousName(student) : student.name}</strong>
                <span>{student.classCode}</span>
              </div>
              <Badge variant="secondary">{formatGrade(student.finalWeighted)}</Badge>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NoteSuggestionDialog({ data, onInsert, onOpenChange }) {
  const suggestion = data?.suggestion;
  const [draft, setDraft] = useState("");
  const leerpuntUrl = "https://leerpunt.be/leidraden/feedback";

  useEffect(() => {
    setDraft(suggestion?.text || "");
  }, [suggestion]);

  return (
    <Dialog open={Boolean(data)} onOpenChange={onOpenChange}>
      <DialogContent className="note-suggestion-dialog">
        <DialogHeader className="note-suggestion-header">
          <div className="note-suggestion-title-row">
            <div>
              <DialogTitle>{t("noteSuggestion.title")}</DialogTitle>
              <DialogDescription>
                {data?.studentName ? `${data.studentName} - ${t(`upload.mode.${data.mode}`)}` : t("noteSuggestion.description")}
              </DialogDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  className="note-suggestion-help-button"
                  variant="outline"
                  size="icon"
                  aria-label={t("noteSuggestion.leerpuntLink")}
                >
                  <a href={leerpuntUrl} target="_blank" rel="noreferrer">
                    <HelpCircle size={18} aria-hidden="true" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("noteSuggestion.leerpuntLink")}</TooltipContent>
            </Tooltip>
          </div>
          <div className="note-suggestion-source">
            <Badge variant="secondary">{t("noteSuggestion.sourceBadge")}</Badge>
            <span>{t("noteSuggestion.sourceText")}</span>
          </div>
        </DialogHeader>
        {suggestion ? (
          <div className="note-suggestion-content">
            <div className="note-suggestion-meta">
              <Badge variant={suggestion.dataSupportLevel === "limited" ? "warning" : "secondary"}>
                {dataSupportLabel(suggestion.dataSupportLevel)}
              </Badge>
              <Badge variant="outline">{recipientScopeLabel(suggestion.recipientScope)}</Badge>
              <Badge variant="outline">{patternLabel(suggestion.primaryPattern)}</Badge>
            </div>

            <section>
              <h4>{t("noteSuggestion.proposal")}</h4>
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                aria-label={t("noteSuggestion.proposal")}
              />
            </section>

            <section className="note-suggestion-grid">
              <NoteSuggestionList title={t("noteSuggestion.basedOn")} items={suggestion.supportingData} />
              <NoteSuggestionList title={t("noteSuggestion.missingInfo")} items={suggestion.missingInformation} />
              <NoteSuggestionList title={t("noteSuggestion.nextStep")} items={[suggestion.possibleNextAction].filter(Boolean)} />
              <NoteSuggestionList title={t("noteSuggestion.warnings")} items={[...suggestion.warnings, ...(suggestion.validation?.warnings || [])]} />
            </section>

            <details className="note-suggestion-rules">
              <summary>{t("noteSuggestion.rules")}</summary>
              <ul>
                {(suggestion.appliedRules || []).map((rule) => (
                  <li key={`${rule.origin}-${rule.id}`}>
                    <strong>{rule.id}</strong>
                    <span>{ruleOriginLabel(rule)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>{t("noteSuggestion.close")}</Button>
          <Button type="button" onClick={() => onInsert(draft)} disabled={!draft.trim()}>
            {t("noteSuggestion.insert")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NoteSuggestionList({ title, items }) {
  const visibleItems = (items || []).filter(Boolean);
  return (
    <div className="note-suggestion-list">
      <h4>{title}</h4>
      {visibleItems.length ? (
        <ul>
          {visibleItems.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
        </ul>
      ) : <p className="muted">{t("noteSuggestion.none")}</p>}
    </div>
  );
}

export function dataSupportLabel(level) {
  if (level === "limited") return t("noteSuggestion.data.limited");
  if (level === "rich") return t("noteSuggestion.data.rich");
  return t("noteSuggestion.data.sufficient");
}

export function recipientScopeLabel(scope) {
  if (scope === "whole_class") return t("noteSuggestion.scope.wholeClass");
  if (scope === "subject_group") return t("noteSuggestion.scope.subjectGroup");
  return t("noteSuggestion.scope.individual");
}

export function patternLabel(pattern) {
  const key = `noteSuggestion.pattern.${pattern}`;
  const translated = t(key);
  return translated === key ? String(pattern || "").replace(/_/g, " ") : translated;
}

export function ruleOriginLabel(rule) {
  if (rule.origin === "source_based" && rule.source) {
    return t("noteSuggestion.rule.source", {
      recommendation: rule.source.recommendation,
      pages: rule.source.pages.join("-"),
    });
  }
  if (rule.origin === "local_school_policy") return t("noteSuggestion.rule.local");
  if (rule.origin === "product_heuristic") return t("noteSuggestion.rule.product");
  return t("noteSuggestion.rule.teacher");
}
