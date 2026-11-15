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
import { ASSIGNMENT_USAGE_OPTIONS } from "../lib/app-constants.jsx";
import { SlideIndicator } from "../lib/use-motion.jsx";
import { assignmentUsage, assignmentUsagePatch, formatNumber, inferBasketCategory, unique } from "../lib/app-helpers.jsx";

export function SetupProgressRail() {
  const steps = [
    { number: 1, title: t("mapping.stepCourse"), body: t("mapping.railCourse") },
    { number: 2, title: t("mapping.stepBaskets"), body: t("mapping.railBaskets") },
    { number: 3, title: t("mapping.stepCheck"), body: t("mapping.railGenerate") },
  ];

  return (
    <div className="setup-progress-rail" aria-label={t("mapping.progressLabel")}>
      {steps.map((step) => (
        <div className="setup-progress-step" key={step.number}>
          <span>{step.number}</span>
          <div>
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FlowIndicator({ active, c, onNavigate }) {
  const listRef = useRef(null);
  const steps = active === "classTeacherReview" || active === "classTeacherDashboard"
    ? [
        ["upload", c("uploadFlow")],
        ["classTeacherReview", c("classTeacherReviewFlow")],
        ["classTeacherDashboard", c("dashboardFlow")],
      ]
    : [
        ["upload", c("uploadFlow")],
        ["review", c("reviewFlow")],
        ["map", c("mapFlow")],
        ["dashboard", c("dashboardFlow")],
      ];
  const activeIndex = steps.findIndex(([id]) => id === active);
  return (
    <ol className="flow-indicator" ref={listRef} aria-label={t("nav.steps")}>
      {steps.map(([id, label], index) => (
        <li key={id} className={cn(index < activeIndex && "is-complete", id === active && "is-active")} aria-current={id === active ? "step" : undefined}>
          <span>{index < activeIndex ? "✓" : index + 1}</span>
          {onNavigate && index < activeIndex && id !== "upload" ? (
            <button type="button" className="flow-indicator__link" onClick={() => onNavigate(id)}>{label}</button>
          ) : (
            <strong>{label}</strong>
          )}
        </li>
      ))}
      <SlideIndicator containerRef={listRef} activeSelector=".is-active" className="flow-indicator__bar" as="li" deps={[active]} />
    </ol>
  );
}

export function Field({ label, help, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {help ? <small>{help}</small> : null}
    </label>
  );
}

export function DetectedSummary({ model }) {
  const primarySubject = model.subjects[0]?.value || t("option.none");
  const classList = model.classes.map((entry) => `${entry.value} (${entry.count})`).join(", ") || t("option.none");
  return (
    <Card className="detected-summary-card">
      <CardHeader>
        <div>
          <CardTitle>{primarySubject}</CardTitle>
          <CardDescription>{t("detected.simpleLine", {
            fileName: model.fileName,
            students: model.students.length,
            classes: model.classes.length,
            assignments: model.assignments.length,
          })}</CardDescription>
        </div>
        <CardAction>
          <Badge>{model.totals.missingCells} {t("detected.blankScores").toLowerCase()}</Badge>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

export function WarningsPanel({ warnings }) {
  if (!warnings.length) {
    return (
      <Card className="warning-card">
        <CardHeader>
          <CardTitle>{t("warnings.title")}</CardTitle>
          <CardDescription>{t("quality.retakeBody")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Accordion type="single" collapsible className="warning-accordion">
      <AccordionItem value="warnings">
        <AccordionTrigger>
          {t("warnings.title")}
          <Badge variant="warning">{t("warnings.count", { count: warnings.length })}</Badge>
        </AccordionTrigger>
        <AccordionContent>
          <ul className="warning-list">
            {warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function EvaluationUsageTable({ assignments, config, onAssignmentChange }) {
  return (
    <Table className="evaluation-usage-table">
      <TableHeader>
        <TableRow>
          <TableHead>{t("mapping.assignment")}</TableHead>
          <TableHead>{t("table.sheet")}</TableHead>
          <TableHead>{t("mapping.date")}</TableHead>
          <TableHead>{t("mapping.category")}</TableHead>
          <TableHead>{t("mapping.max")}</TableHead>
          <TableHead>{t("review.useFor")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((assignment) => {
          const override = config.assignments?.[assignment.id] || {};
          const usage = assignmentUsage(override);
          return (
            <TableRow key={assignment.id} className={cn("evaluation-usage-row", usage !== "include" && "is-muted")}>
              <TableCell>
                <strong>{assignment.title}</strong>
              </TableCell>
              <TableCell>{assignment.sheetName}</TableCell>
              <TableCell>{assignment.date || t("option.notAvailable")}</TableCell>
              <TableCell>{override.category || assignment.category || "OTHER"}</TableCell>
              <TableCell>{formatNumber(override.maxPoints ?? assignment.maxPoints)}</TableCell>
              <TableCell>
                <UsageSegmentedControl
                  value={usage}
                  onChange={(nextUsage) => onAssignmentChange(assignment.id, assignmentUsagePatch(nextUsage, override))}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function UsageSegmentedControl({ value, onChange }) {
  const ref = useRef(null);
  return (
    <div className="usage-segment" ref={ref} role="group" aria-label={t("review.useFor")}>
      <SlideIndicator containerRef={ref} activeSelector=".is-active" className="seg-indicator" withHeight deps={[value]} />
      {ASSIGNMENT_USAGE_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={cn(value === option && "is-active")}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {t(`usage.${option}`)}
        </button>
      ))}
    </div>
  );
}

export function AssignmentMappingTable({ model, config, categoryOptions, onAssignmentChange }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("mapping.use")}</TableHead>
          <TableHead>{t("mapping.required")}</TableHead>
          <TableHead>{t("table.sheet")}</TableHead>
          <TableHead>{t("mapping.assignment")}</TableHead>
          <TableHead>{t("mapping.date")}</TableHead>
          <TableHead>{t("mapping.category")}</TableHead>
          <TableHead>{t("mapping.max")}</TableHead>
          <TableHead>{t("detected.classes")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {model.assignments.map((assignment, index) => {
          const override = config.assignments?.[assignment.id] || {};
          const usage = assignmentUsage(override);
          const category = override.category || inferBasketCategory(assignment, index, model.assignments, categoryOptions);
          const options = unique([...categoryOptions, category, assignment.category, "OTHER"]);
          return (
            <TableRow key={assignment.id}>
              <TableCell>
                <Select value={usage} onChange={(event) => onAssignmentChange(assignment.id, assignmentUsagePatch(event.target.value, override))}>
                  {ASSIGNMENT_USAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{t(`usage.${option}`)}</option>
                  ))}
                </Select>
              </TableCell>
              <TableCell>
                <input
                  type="checkbox"
                  disabled={usage !== "include"}
                  checked={override.required !== false}
                  onChange={(event) => onAssignmentChange(assignment.id, { required: event.target.checked })}
                />
              </TableCell>
              <TableCell>{assignment.sheetName}</TableCell>
              <TableCell>{assignment.title}</TableCell>
              <TableCell>{assignment.date || ""}</TableCell>
              <TableCell>
                <Select value={category} onChange={(event) => onAssignmentChange(assignment.id, { category: event.target.value })}>
                  {options.map((name) => <option key={name} value={name}>{name}</option>)}
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={override.maxPoints ?? assignment.maxPoints}
                  onChange={(event) => onAssignmentChange(assignment.id, { maxPoints: Number(event.target.value) })}
                />
              </TableCell>
              <TableCell>{Array.from(assignment.classCodes || []).join(", ")}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
