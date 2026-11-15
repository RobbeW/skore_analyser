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
import { DotPlot, MiniHistogram, QuartileStrip } from "./charts.jsx";
import { DEFAULT_OPEN_CARD_SECTIONS, SCHOOL_YEAR_DOMAIN_END, SCHOOL_YEAR_MONTHS } from "../lib/app-constants.jsx";
import { anonymousName, chartPointLabelPosition, clamp, evidenceParticipationContext, formatAvailablePoints, formatGrade, formatNumber, formatPercent, isExamPoint, linearTrendLineForPoints, pedagogicalNextStep, positionTrendPoints, renderTrendExplanation, renderVolatilityExplanation, sortStudents } from "../lib/app-helpers.jsx";
import { CountUp, useChartReveal } from "../lib/use-motion.jsx";
import { FlagWithHandling } from "./class-council.jsx";
import { PriorYearButton } from "./prior-year.jsx";
import { priorValueFor } from "../../js/prior-year-report.js";
import { canonicalSubject } from "../../js/class-teacher-config.js";

/** One row of class tiles (replaces separate tabs + overview cards): count, average, below cut-off, little evidence. */
export function ClassTiles({ classes, students, selectedClass, threshold, onSelect }) {
  const ref = useRef(null);
  // One class: the "all classes" tile would only repeat the KPI row.
  if (classes.length < 2) return null;
  const tiles = ["all", ...classes];
  return (
    <div className="class-tiles" ref={ref} role="group" aria-label={t("dashboard.classTabs")}>
      {tiles.map((classCode) => {
        const classStudents = classCode === "all" ? students : students.filter((student) => student.classCode === classCode);
        const stats = summariseStudents(classStudents, threshold);
        const active = selectedClass === classCode || (!selectedClass && classCode === "all");
        return (
          <button
            key={classCode}
            type="button"
            className={cn("class-tile", active && "is-active")}
            aria-pressed={active}
            onClick={() => onSelect(classCode)}
          >
            <span className="class-tile__name">{classCode === "all" ? t("filter.allClasses") : classCode}</span>
            <span className="class-tile__value"><CountUp value={stats.count} /> <small>{t("detected.students").toLowerCase()}</small></span>
            <span className="class-tile__facts">
              <span>{t("dashboard.classAverage")}: <strong>{formatNumber(stats.mean)}%</strong></span>
              <span className={stats.belowThreshold ? "is-alert" : undefined}>{t("dashboard.below", { threshold })}: <strong>{stats.belowThreshold}</strong></span>
              {stats.incomplete ? <span>{t("dashboard.incomplete")}: <strong>{stats.incomplete}</strong></span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** KPI tile (Planner style). Numbers count up; text values are shown as-is. Clickable when onClick is given. */
export function StatCard({ label, value, compact = false, hint, onClick, pressed, tone }) {
  const valueText = String(value ?? "");
  const match = valueText.match(/^(-?\d+(?:[.,]\d+)?)(\s*%?)$/);
  const numeric = match ? Number(match[1].replace(",", ".")) : null;
  const decimals = match && /[.,]/.test(match[1]) ? match[1].split(/[.,]/)[1].length : 0;
  const content = (
    <>
      <p className={cn("stat-value", numeric === null && "is-text", valueText.length > 24 && "is-extra-long", valueText.length > 14 && "is-long")}>
        {numeric !== null
          ? <CountUp value={numeric} decimals={decimals} format={(n) => `${Number(n).toFixed(decimals)}${match[2]}`} />
          : valueText}
      </p>
      <p className="stat-label">{label}</p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </>
  );
  const className = cn("stat-card", compact && "stat-card--compact", onClick && "stat-card--button", tone && `stat-card--${tone}`);
  if (onClick) {
    return <button type="button" className={className} aria-pressed={Boolean(pressed)} onClick={onClick}>{content}</button>;
  }
  return <div className={className}>{content}</div>;
}

export function StudentTable({ students, anonymised, filters, onFiltersChange, onOpen }) {
  const sorted = sortStudents(students, filters);
  return (
    <Table className="student-table">
      <TableHeader>
        <TableRow>
          <SortHeader field="name" label={t("student.student")} filters={filters} onFiltersChange={onFiltersChange} />
          <SortHeader field="class" label={t("student.class")} filters={filters} onFiltersChange={onFiltersChange} />
          <SortHeader field="total" label={t("student.total")} filters={filters} onFiltersChange={onFiltersChange} align="right" />
          <SortHeader field="coverage" label={t("student.coverage")} filters={filters} onFiltersChange={onFiltersChange} align="right" className="student-table-coverage" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((student, index) => (
          <TableRow
            key={student.id}
            className="student-table-row"
            tabIndex={0}
            onClick={() => onOpen(student.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(student.id);
              }
            }}
          >
            <TableCell>
              <span className="student-table-name">
                <span>{anonymised ? anonymousName(student) : student.name}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </TableCell>
            <TableCell>{student.classCode}</TableCell>
            <TableCell className="table-cell-numeric">{formatGrade(student.finalWeighted)}</TableCell>
            <TableCell className="table-cell-numeric student-table-coverage">{formatPercent(student.evidenceCoverage)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function SortHeader({ field, label, filters, onFiltersChange, align = "left", className }) {
  const active = (filters.sortKey || "name") === field;
  const direction = active ? filters.sortDirection || "asc" : "asc";
  const nextDirection = active && direction === "asc" ? "desc" : "asc";
  return (
    <TableHead className={className} aria-sort={active ? direction === "asc" ? "ascending" : "descending" : "none"}>
      <button className={cn("table-sort-button", align === "right" && "table-sort-button--right")} type="button" onClick={() => onFiltersChange({ sortKey: field, sortDirection: nextDirection })}>
        <span>{label}</span>
        {active ? direction === "asc" ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" /> : null}
      </button>
    </TableHead>
  );
}

export function StudentCard({
  student,
  decision = {},
  onDecisionChange,
  peers,
  anonymised,
  compact,
  openSections,
  displayIndex,
  note,
  noteStatus,
  onNoteChange,
  onOpenNoteSuggestion,
  onSectionOpenChange,
  onScrollToStudent,
  onStartTour,
  onPrintStudent,
  isPrintTarget,
  onEvaluationClick,
  onHistogramClick,
  prior = null,
  onUploadPriorYear,
  onRemovePriorYear,
}) {
  const displayName = anonymised ? anonymousName(student) : student.name;
  // Last year's result for this teacher's own subject (or its lead-in, e.g. Wetenschappen -> Biologie).
  const priorSubject = prior ? priorValueFor(prior, canonicalSubject(student.subject || "")) : null;
  const peerIndex = peers.findIndex((peer) => peer.id === student.id);
  const previousPeer = peerIndex > 0 ? peers[peerIndex - 1] : null;
  const nextPeer = peerIndex >= 0 && peerIndex < peers.length - 1 ? peers[peerIndex + 1] : null;
  const sectionOpen = {
    ...DEFAULT_OPEN_CARD_SECTIONS,
    ...(openSections || {}),
  };

  return (
    <Card className={cn("student-card", compact && "student-card--compact", isPrintTarget && "is-print-target")} id={`student-card-${student.id}`} data-student-id={student.id}>
      <CardHeader className="student-card-header" data-tour-part="total">
        <div>
          <CardTitle className="student-title">{displayName}</CardTitle>
          <div className="student-meta">
            <Badge variant="outline">{student.classCode}</Badge>
            <Badge variant="outline">{student.subject || ""}</Badge>
            <EvidenceParticipationBadge student={student} peers={peers} />
          </div>
        </div>
        <CardAction className="student-actions">
          <nav className="student-nav" aria-label={t("student.navLabel")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={t("student.backToOverview")}>
                  <ArrowUp size={17} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("student.backToOverview")}</TooltipContent>
            </Tooltip>
            {previousPeer ? (
              <Button variant="ghost" size="icon" type="button" onClick={() => onScrollToStudent(previousPeer.id)} aria-label={t("student.previousInClass")}>
                <ChevronLeft size={17} aria-hidden="true" />
              </Button>
            ) : null}
            {nextPeer ? (
              <Button variant="ghost" size="icon" type="button" onClick={() => onScrollToStudent(nextPeer.id)} aria-label={t("student.nextInClass")}>
                <ChevronRight size={17} aria-hidden="true" />
              </Button>
            ) : null}
          </nav>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" type="button" onClick={() => onPrintStudent(student.id)} aria-label={t("student.printCard")}>
                <Printer size={17} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("student.printCard")}</TooltipContent>
          </Tooltip>
          <PriorYearButton student={student} prior={prior} displayName={displayName} onUpload={onUploadPriorYear} onRemove={onRemovePriorYear} />
          <Button variant="outline" type="button" onClick={() => onStartTour(student.id)}>{t("tour.button")}</Button>
          <div className={cn("grade-badge", student.thresholdBand.className)}>{formatGrade(student.finalWeighted)}</div>
        </CardAction>
      </CardHeader>

      <CardContent>
        <section className="card-section card-section--graph" data-tour-part="graph">
          <div className="section-row graph-section-heading">
            <h4>{t("student.visualContext")}</h4>
            <span>{t("chart.clickDots")}</span>
          </div>
          {prior ? <PriorSubjectLine priorSubject={priorSubject} current={student.finalWeighted} /> : null}
          <YearTrend trend={student.trend} student={student} onEvaluationClick={onEvaluationClick} priorValue={priorSubject?.value ?? null} />
          <Accordion
            type="single"
            collapsible
            className="duiding-accordion"
            value={sectionOpen.duiding ? "duiding" : ""}
            onValueChange={(value) => onSectionOpenChange?.("duiding", value === "duiding")}
          >
            <AccordionItem value="duiding">
              <AccordionTrigger>{t("chart.interpretationTitle")}</AccordionTrigger>
              <AccordionContent>
                <GraphInterpretation trend={student.trend} embedded />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Accordion
            type="single"
            collapsible
            className="context-charts-accordion"
            value={sectionOpen.contextCharts ? "context" : ""}
            onValueChange={(value) => onSectionOpenChange?.("contextCharts", value === "context")}
          >
            <AccordionItem value="context">
              <AccordionTrigger>{t("chart.classContext")}</AccordionTrigger>
              <AccordionContent>
                <div className="peer-chart-grid">
                  <div className="peer-chart-stack">
                    <DotPlot students={peers} selected={student} anonymised={anonymised} />
                    <QuartileStrip students={peers} selected={student} />
                  </div>
                  <MiniHistogram students={peers} selected={student} anonymised={anonymised} onBinClick={onHistogramClick} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section className="card-section card-section--summary" data-tour-part="advice">
          <PedagogicalSummary student={student} />
          {student.flags.length ? (
            <div className="flag-detail-list">
              {student.flags.map((flag, index) => (
                <FlagWithHandling
                  key={`${flag.type}-${index}`}
                  flag={flag}
                  state={decision.flagStates?.[flag.type] || null}
                  onChange={(value) => onDecisionChange?.(student.id, { flagStates: { ...(decision.flagStates || {}), [flag.type]: value } })}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="card-section notes-section" data-tour-part="notes">
          <div className="section-row notes-heading">
            <h4>{t("student.teacherJudgement")}</h4>
            <div className="notes-heading-actions">
              <Button variant="outline" size="sm" type="button" onClick={() => onOpenNoteSuggestion?.(student, peers, displayName)}>
                <Sparkles size={14} aria-hidden="true" />
                {t("noteSuggestion.button")}
              </Button>
              <span className={cn("note-save-state", noteStatus !== "idle" && `is-${noteStatus}`)}>
                {noteStatus === "saving" ? t("notes.saving") : noteStatus === "error" ? t("notes.error") : t("notes.saved")}
              </span>
            </div>
          </div>
          <Textarea
            value={note}
            onChange={(event) => onNoteChange(student.id, event.target.value)}
            placeholder={t("student.teacherPlaceholder")}
          />
        </section>

        <div className="card-grid compact-detail-grid">
          <section className="card-section compact-detail-section">
            <Accordion
              type="single"
              collapsible
              className="score-detail-accordion"
              value={sectionOpen.score ? "score" : ""}
              onValueChange={(value) => onSectionOpenChange?.("score", value === "score")}
            >
              <AccordionItem value="score">
                <AccordionTrigger>{t("student.calculationDetails")}</AccordionTrigger>
                <AccordionContent>
                  <div className="score-table-tour-target" data-tour-part="table">
                    <ScoreTable rows={student.categoryRows} />
                  </div>
                  <div className="calculation-note">
                    <p>{t("student.evidenceBody", {
                      available: student.evidence.availableRequired,
                      expected: student.evidence.expectedRequired,
                      coverage: formatPercent(student.evidenceCoverage),
                    })}</p>
                    <p>{t("student.traceBody")}</p>
                    <p>{t(`student.finalSource.${student.finalSource || "missing"}`)}</p>
                    {student.finalSource === "imported" && Number.isFinite(student.calculatedWeighted) ? (
                      <p>{t("student.calculatedFinal")}: {formatGrade(student.calculatedWeighted)}</p>
                    ) : null}
                    <p>{t("student.importedFinal")}: {student.importedFinal ? `${student.importedFinal.source} ${student.importedFinal.field} = ${formatNumber(student.importedFinal.value)}%` : t("student.noImportedFinal")}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          <section className="card-section print-optional compact-detail-section comments-static-section">
            <div className="section-row">
              <h4>{t("student.comments")}</h4>
            </div>
            {student.comments.length ? (
              <ul className="comment-list">
                {student.comments.map((comment, index) => (
                  <li key={`${comment.source}-${comment.field}-${index}`}>
                    <strong>{comment.source} - {comment.field}</strong>
                    {comment.text}
                  </li>
                ))}
              </ul>
            ) : <p className="muted">{t("student.noComments")}</p>}
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

export function EvidenceParticipationBadge({ student, peers }) {
  const context = evidenceParticipationContext(peers);
  return (
    <span className="participation-chip">
      <span>{t("student.participationMeta", { value: formatPercent(student.evidenceCoverage) })}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="participation-help" type="button" aria-label={t("student.participationHelpTitle")}>
            <HelpCircle size={14} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="participation-tooltip">
          <strong>{t("student.participationHelpTitle")}</strong>
          <span>{t("student.participationHelp", {
            threshold: formatPercent(context.concernThreshold),
            classMedian: formatPercent(context.classMedianPointsCoverage),
          })}</span>
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

export function ScoreTable({ rows }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("mapping.category")}</TableHead>
          <TableHead>{t("student.earned")}</TableHead>
          <TableHead>{t("student.possible")}</TableHead>
          <TableHead>{t("student.raw")}</TableHead>
          <TableHead>{t("mapping.weight")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.category}>
            <TableCell>{row.category}</TableCell>
            <TableCell>{formatNumber(row.pointsEarned)}</TableCell>
            <TableCell>{formatAvailablePoints(row)}</TableCell>
            <TableCell>{row.rawPercentage == null ? t("option.notAvailable") : `${formatNumber(row.rawPercentage)}%`}</TableCell>
            <TableCell>
              <span className="weight-cell-stack">
                <span>{formatPercent(row.effectiveWeight)}</span>
                {row.transferredWeight > 0 ? <small>{t("student.transferredWeight")}</small> : null}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function GraphInterpretation({ trend, embedded = false }) {
  return (
    <div className={cn("graph-interpretation-panel", embedded && "is-embedded")}>
      {embedded ? null : <h4>{t("chart.interpretationTitle")}</h4>}
      <dl>
        <div>
          <dt>{t("chart.monthAxisLabel")}</dt>
          <dd>{t("chart.monthAxisHelp")}</dd>
        </div>
        <div>
          <dt>{t("chart.solidLineLabel")}</dt>
          <dd>{t("chart.solidLineHelp")}</dd>
        </div>
        <div>
          <dt>{t("chart.dashedLineLabel")}</dt>
          <dd>{t("chart.dashedLineHelp")}</dd>
        </div>
        <div>
          <dt>{t("student.trend")}</dt>
          <dd>{renderTrendExplanation(trend)}</dd>
        </div>
        <div>
          <dt>{t("chart.volatilityLabel")}</dt>
          <dd>{renderVolatilityExplanation(trend)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function PedagogicalSummary({ student }) {
  const mainFlag = student.flags[0];
  const nextStep = mainFlag ? pedagogicalNextStep(student.flags) : "";
  return (
    <div className="advice-summary">
      <strong>{t("advice.summaryTitle")}</strong>
      <p>{mainFlag ? mainFlag.label : t("advice.noSignal")}</p>
      {nextStep ? <p>{nextStep}</p> : null}
    </div>
  );
}

/** One line above the chart: last year's TOT (DW / EX) for this subject and the change since. */
function PriorSubjectLine({ priorSubject, current }) {
  if (!priorSubject) return <p className="prior-subject muted">{t("prior.teacherNone")}</p>;
  const item = priorSubject.item;
  const fmt = (value) => (Number.isFinite(value) ? `${formatNumber(value)}%` : "–");
  const delta = Number.isFinite(current) ? Math.round((current - priorSubject.value) * 10) / 10 : null;
  return (
    <p className={cn("prior-subject", priorSubject.source === "leadIn" && "is-lead-in")}>
      <strong>{t("prior.teacherTitle")}:</strong>{" "}
      {priorSubject.source === "leadIn"
        ? t("prior.teacherLeadIn", { subject: priorSubject.fromSubject, tot: fmt(item.tot) })
        : t("prior.teacherLine", { subject: priorSubject.fromSubject, tot: fmt(item.tot), dw: fmt(item.dw), ex: fmt(item.ex) })}
      {delta !== null ? <span className={cn("prior-delta", delta < 0 ? "is-down" : "is-up")}> · {t("prior.delta", { delta: `${delta > 0 ? "+" : ""}${formatNumber(delta)}` })}</span> : null}
    </p>
  );
}

export function YearTrend({ trend, student, onEvaluationClick, priorValue = null }) {
  const trendRevealRef = useChartReveal(`${student?.id}-${trend?.points?.length || 0}`);
  const points = trend?.periodScores || [];
  if (points.length < 2) {
    return <p className="muted">{t("chart.noTrendData")}</p>;
  }
  const width = 720;
  const height = 184;
  const left = 48;
  const top = 30;
  const bottom = 132;
  const axisWidth = width - left - 28;
  const axisHeight = bottom - top;
  const positionedPoints = positionTrendPoints(points);
  const xFor = (value) => left + (clamp(value, 0, SCHOOL_YEAR_DOMAIN_END) / SCHOOL_YEAR_DOMAIN_END) * axisWidth;
  const yFor = (value) => bottom - (clamp(value, 0, 100) / 100) * axisHeight;
  const linePath = positionedPoints.map(({ point, x }, index) => `${index === 0 ? "M" : "L"} ${xFor(x)} ${yFor(point.value)}`).join(" ");
  const trendLine = linearTrendLineForPoints(positionedPoints);

  return (
    <figure className="year-chart">
      <svg ref={trendRevealRef} className="chart-svg chart-svg--interactive" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("chart.yearTrend")}>
        <line x1={left} y1={top} x2={left} y2={bottom} stroke="var(--chart-axis)" />
        <line x1={left} y1={bottom} x2={width - 20} y2={bottom} stroke="var(--chart-axis)" />
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line x1={left - 4} y1={yFor(value)} x2={width - 20} y2={yFor(value)} stroke="var(--chart-grid)" />
            <text x="10" y={yFor(value) + 4}>{value}%</text>
          </g>
        ))}
        {SCHOOL_YEAR_MONTHS.slice(1).map((month, index) => (
          <line key={`month-line-${month.labelKey}`} className="year-month-marker" x1={xFor(index + 1)} y1={top} x2={xFor(index + 1)} y2={bottom} />
        ))}
        {Number.isFinite(priorValue) ? (
          <g className="prior-reference">
            <line x1={left} y1={yFor(priorValue)} x2={width - 20} y2={yFor(priorValue)} />
            <text x={width - 22} y={yFor(priorValue) - 5} textAnchor="end">{t("prior.reference", { value: `${formatNumber(priorValue)}%` })}</text>
          </g>
        ) : null}
        <path data-draw d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
        {trendLine ? (
          <line
            className="year-trend-direction"
            x1={xFor(trendLine.startX)}
            y1={yFor(trendLine.start)}
            x2={xFor(trendLine.endX)}
            y2={yFor(trendLine.end)}
          />
        ) : null}
        {positionedPoints.map(({ point, x }, index) => {
          const dotX = xFor(x);
          const dotY = yFor(point.value);
          const label = chartPointLabelPosition(dotX, dotY, { width, top, bottom });
          return (
            <g
              key={`${point.assignmentId || point.label}-${index}`}
              className={cn("trend-dot", isExamPoint(point) && "is-exam-point", point.usage === "displayOnly" && "is-context-point")}
              role="button"
              tabIndex={0}
              transform={`translate(${dotX}, ${dotY})`}
              onClick={() => onEvaluationClick?.({ student, point })}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onEvaluationClick?.({ student, point });
                }
              }}
              aria-label={`${t("chart.evaluation")}: ${point.label}, ${formatNumber(point.value)}%`}
            >
              <text className="trend-dot-label chart-svg-tooltip" x={label.x} y={label.y} textAnchor={label.anchor}>
                {formatNumber(point.value)}%
              </text>
              <circle cx="0" cy="0" r="7" />
            </g>
          );
        })}
        {SCHOOL_YEAR_MONTHS.map((month, index) => (
          <text key={month.labelKey} className="axis-label month-axis-label" x={xFor(index + 0.5)} y={bottom + 26} textAnchor="middle">
            {t(month.labelKey)}
          </text>
        ))}
      </svg>
    </figure>
  );
}
