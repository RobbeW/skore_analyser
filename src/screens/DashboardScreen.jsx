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
  Send,
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
import { Histogram } from "../components/charts.jsx";
import { EmptyState } from "../components/layout.jsx";
import { FlowIndicator } from "../components/setup-parts.jsx";
import { ClassTiles, StatCard, StudentCard, StudentTable } from "../components/student-card.jsx";
import { BELOW_THRESHOLD_FILTER, formatNumber, unique } from "../lib/app-helpers.jsx";

export function DashboardScreen({
  c,
  analysis,
  filters,
  filteredStudents,
  anonymised,
  compactCards,
  openCardSections,
  notes,
  noteSaveStatus,
  onCardSectionOpenChange,
  onFiltersChange,
  onNoteChange,
  onOpenNoteSuggestion,
  onScrollToStudent,
  onStartTour,
  onPrintStudent,
  printStudentId,
  onEvaluationClick,
  onHistogramClick,
  decisions = {},
  onDecisionChange,
  onExportFeedback,
  priorYear = {},
  onUploadPriorYear,
  onRemovePriorYear,
}) {
  const [teacherName, setTeacherName] = useState("");
  const toggleFlag = (flag) => onFiltersChange({ flag: filters.flag === flag ? "all" : flag });
  const classes = unique(analysis.students.map((student) => student.classCode));
  const flags = unique(analysis.students.flatMap((student) => student.flags.map((flag) => flag.type)));
  const stats = summariseStudents(filteredStudents, filters.threshold ?? 50);
  const peerGroups = useMemo(() => {
    const groups = new Map();
    for (const student of analysis.students) {
      if (!groups.has(student.classCode)) {
        groups.set(student.classCode, analysis.students.filter((peer) => peer.classCode === student.classCode));
      }
    }
    return groups;
  }, [analysis.students]);

  return (
    <section className="workflow-screen dashboard-screen">
      <FlowIndicator active="dashboard" c={c} />
      <div className="dashboard-header">
        <div className="screen-heading">
          <div>
            <p className="eyebrow">{t("step.4")}</p>
            <h2>{analysis.subject || t("dashboard.fallbackTitle")}</h2>
            <p>{t("dashboard.detectedLine", {
              fileName: analysis.fileName,
              students: analysis.students.length,
              assignments: analysis.assignments.length,
            })}</p>
          </div>
        </div>

        <ClassTiles classes={classes} students={analysis.students} selectedClass={filters.classCode} threshold={filters.threshold ?? 50} onSelect={(classCode) => onFiltersChange({ classCode })} />

        <div className="stats-grid">
          <StatCard label={t("detected.students")} value={stats.count} />
          <StatCard label={t("dashboard.classAverage")} value={`${formatNumber(stats.mean)}%`} />
          <StatCard label={t("dashboard.below", { threshold: filters.threshold ?? 50 })} value={stats.belowThreshold} tone={stats.belowThreshold ? "alert" : undefined} onClick={() => toggleFlag(BELOW_THRESHOLD_FILTER)} pressed={filters.flag === BELOW_THRESHOLD_FILTER} hint={t("dashboard.kpiFilterHint")} />
          <StatCard label={t("dashboard.incomplete")} value={stats.incomplete} onClick={() => toggleFlag("low_evidence_coverage")} pressed={filters.flag === "low_evidence_coverage"} hint={t("dashboard.kpiFilterHint")} />
        </div>

        <div className="filters" aria-label={t("filter.label")}>
          <Select value={filters.band} onChange={(event) => onFiltersChange({ band: event.target.value })} aria-label={t("filter.allBands")}>
            <option value="all">{t("filter.allBands")}</option>
            {THRESHOLD_BANDS.map((band) => (
              <option key={band.id} value={band.id}>{t(`band.${band.id}`)}</option>
            ))}
          </Select>
          <Select value={filters.flag} onChange={(event) => onFiltersChange({ flag: event.target.value })} aria-label={t("filter.allFlags")}>
            <option value="all">{t("filter.allFlags")}</option>
            <option value={BELOW_THRESHOLD_FILTER}>{t("dashboard.below", { threshold: filters.threshold ?? 50 })}</option>
            {flags.map((flag) => (
              <option key={flag} value={flag}>{t(`flag.${flag}`)}</option>
            ))}
          </Select>
          <Button variant="outline" type="button" onClick={() => onFiltersChange({ band: "all", flag: "all" })}>
            {t("filter.clear")}
          </Button>
        </div>
      </div>

      <Card className="handover-panel">
        <CardContent>
          <div className="handover">
            <div className="handover__text">
              <strong>{t("feedback.exportTitle")}</strong>
              <p>{t("feedback.exportBody")}</p>
            </div>
            <label className="handover__field">
              <span className="sr-only">{t("feedback.teacherName")}</span>
              <Input value={teacherName} onChange={(event) => setTeacherName(event.target.value)} placeholder={t("feedback.teacherName")} />
            </label>
            <Button type="button" variant="outline" onClick={() => onExportFeedback?.(filteredStudents, teacherName.trim())} disabled={!filteredStudents.length}>
              <Send size={16} aria-hidden="true" />
              {t("feedback.exportButton", { count: filteredStudents.length })}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="overview-grid">
        <Card className="chart-panel">
          <CardHeader>
            <CardTitle>{t("chart.histogramTitle")}</CardTitle>
            <CardDescription>{c("visibleAdvice")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Histogram students={filteredStudents} anonymised={anonymised} onBinClick={onHistogramClick} />
          </CardContent>
        </Card>
        <Card className="students-panel">
          <CardHeader>
            <CardTitle>{t("student.tableTitle")}</CardTitle>
            <CardDescription>{t("student.openCard")}</CardDescription>
          </CardHeader>
          <CardContent>
            <StudentTable
              students={filteredStudents}
              anonymised={anonymised}
              filters={filters}
              onFiltersChange={onFiltersChange}
              onOpen={onScrollToStudent}
            />
          </CardContent>
        </Card>
      </div>

      <div className="cards-heading">
        <div>
          <h3>{t("student.cardsTitle")}</h3>
          <span>{filteredStudents.length} {t("detected.students").toLowerCase()}</span>
        </div>
      </div>

      <div className={cn("student-cards", compactCards && "student-cards--compact")}>
        {filteredStudents.length ? filteredStudents.map((student, index) => (
          <StudentCard
            key={student.id}
            student={student}
            decision={decisions[student.id] || {}}
            onDecisionChange={onDecisionChange}
            prior={priorYear[student.id] || null}
            onUploadPriorYear={onUploadPriorYear}
            onRemovePriorYear={onRemovePriorYear}
            peers={peerGroups.get(student.classCode) || filteredStudents}
            anonymised={anonymised}
            compact={compactCards}
            openSections={openCardSections}
            displayIndex={index}
            note={notes[student.id] || ""}
            noteStatus={noteSaveStatus[student.id] || "idle"}
            onNoteChange={onNoteChange}
            onOpenNoteSuggestion={onOpenNoteSuggestion}
            onSectionOpenChange={onCardSectionOpenChange}
            onScrollToStudent={onScrollToStudent}
            onStartTour={onStartTour}
            onPrintStudent={onPrintStudent}
            isPrintTarget={printStudentId === student.id}
            onEvaluationClick={onEvaluationClick}
            onHistogramClick={onHistogramClick}
          />
        )) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}
