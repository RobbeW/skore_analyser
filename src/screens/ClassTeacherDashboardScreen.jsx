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
  MessageSquareText,
  Presentation,
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
import { SortHeader, StatCard } from "../components/student-card.jsx";
import { CLASS_TEACHER_LINE_COLORS } from "../lib/app-constants.jsx";
import { anonymousName, clamp, classTeacherAxisTicks, classTeacherChartDomain, formatGrade, formatNumber, shortLabel, unique } from "../lib/app-helpers.jsx";
import { classTeacherDefaultSubjects, classTeacherDetailFlags, classTeacherFlagVariant, classTeacherHasMainSubjectDanger, classTeacherMainSubjectDangerLabel, classTeacherPolishNotices, classTeacherStudentSummary, filterClassTeacherStudents, normaliseSelectedClassTeacherSubjects, sortClassTeacherStudents } from "../lib/class-teacher-helpers.jsx";
import { SlideIndicator, useChartReveal } from "../lib/use-motion.jsx";
import { ClassTeacherNoticeList } from "./ClassTeacherReviewScreen.jsx";
import { ClassCouncilPrint, ClassHeatmap, FlagWithHandling, MeetingMode, SubjectFeedbackList, feedbackForStudent, isDiscussionStudent } from "../components/class-council.jsx";

export function ClassTeacherDashboardScreen({
  c,
  analysis,
  anonymised,
  compactCards,
  notes,
  noteSaveStatus,
  onNoteChange,
  onOpenNoteSuggestion,
  onScrollToStudent,
  onStartTour,
  onPrintStudent,
  printStudentId,
  onHistogramClick,
  decisions = {},
  onDecisionChange,
  subjectFeedback = {},
  onImportFeedback,
  onPrintOverview,
}) {
  const students = useMemo(
    () => [...analysis.students].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [analysis.students],
  );
  const [dashboardFilters, setDashboardFilters] = useState({
    focus: "all",
    band: "all",
    subject: "all",
    sortKey: "name",
    sortDirection: "asc",
  });
  const [meeting, setMeeting] = useState({ open: false, ids: [], index: 0 });
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const feedbackInputRef = useRef(null);
  const subjectOptions = useMemo(() => unique((analysis.subjects || []).map((subject) => subject.subject)), [analysis.subjects]);
  const filteredStudents = useMemo(() => (
    sortClassTeacherStudents(filterClassTeacherStudents(students, dashboardFilters), dashboardFilters)
  ), [dashboardFilters, students]);
  const stats = analysis.stats || {};
  const mainSubjectDangerStudents = students.filter(classTeacherHasMainSubjectDanger);
  const discussionStudents = students.filter(isDiscussionStudent);
  // Same rule as the filter it opens, so the number always matches the list.
  const keyRiskCount = mainSubjectDangerStudents.length;
  const positiveCount = students.filter((student) => student.flags?.some((flag) => flag.type === "positive_stable_profile")).length;
  const polishNotices = classTeacherPolishNotices(analysis, c);
  const updateDashboardFilters = (patch) => setDashboardFilters((current) => ({ ...current, ...patch }));
  const toggleFocus = (focus) => updateDashboardFilters({ focus: dashboardFilters.focus === focus ? "all" : focus });
  const feedbackCount = Object.keys(subjectFeedback).length;
  const meetingStudents = meeting.ids.map((id) => students.find((student) => student.id === id)).filter(Boolean);

  function startMeeting(list, startId = null) {
    if (!list.length) return;
    const ids = list.map((student) => student.id);
    setMeeting({ open: true, ids, index: Math.max(0, startId ? ids.indexOf(startId) : 0) });
  }

  async function handleFeedbackFiles(event) {
    const files = event.target.files;
    if (!files?.length) return;
    const result = await onImportFeedback?.(files);
    event.target.value = "";
    if (!result) return;
    setFeedbackMessage(result.failed.length
      ? t("feedback.importPartial", { subjects: result.imported.join(", ") || "-", failed: result.failed.join(", ") })
      : t("feedback.imported", { subjects: result.imported.join(", ") }));
  }

  return (
    <section className="workflow-screen dashboard-screen class-teacher-dashboard-screen">
      <FlowIndicator active="classTeacherDashboard" c={c} />
      <div className="dashboard-header">
        <div className="screen-heading">
          <div>
            <p className="eyebrow">{t("upload.mode.klassenleraar")}</p>
            <h2>{c("classTeacherDashboardTitle")}: {analysis.classCode}</h2>
            <p>{c("classTeacherDashboardBody")}</p>
          </div>
          <Badge variant="secondary">{analysis.track?.label || t("option.notAvailable")}</Badge>
        </div>

        <div className="council-actions">
          <Button type="button" onClick={() => startMeeting(discussionStudents.length ? discussionStudents : filteredStudents)}>
            <Presentation size={16} aria-hidden="true" />
            {t("meeting.start", { count: discussionStudents.length || filteredStudents.length })}
          </Button>
          <Button variant="outline" type="button" onClick={() => startMeeting(filteredStudents)}>
            {t("meeting.startAll", { count: filteredStudents.length })}
          </Button>
          <Button variant="outline" type="button" onClick={onPrintOverview}>
            <Printer size={16} aria-hidden="true" />
            {t("print.overviewButton")}
          </Button>
          <input ref={feedbackInputRef} className="sr-only" type="file" accept=".json,application/json" multiple onChange={handleFeedbackFiles} />
          <Button variant="ghost" type="button" onClick={() => feedbackInputRef.current?.click()}>
            <MessageSquareText size={16} aria-hidden="true" />
            {feedbackCount ? t("feedback.importMore", { count: feedbackCount }) : t("feedback.import")}
          </Button>
        </div>
        {feedbackMessage ? <p className="council-message" role="status">{feedbackMessage}</p> : null}

        <div className="stats-grid">
          <StatCard label={t("detected.students")} value={stats.count || students.length} onClick={() => updateDashboardFilters({ focus: "all" })} pressed={dashboardFilters.focus === "all"} />
          <StatCard label={t("dashboard.classAverage")} value={`${formatNumber(stats.mean)}%`} />
          <StatCard label={c("classTeacherMainSubjectDanger")} value={keyRiskCount} tone={keyRiskCount ? "alert" : undefined} onClick={() => toggleFocus("mainSubjectDanger")} pressed={dashboardFilters.focus === "mainSubjectDanger"} />
          <StatCard label={c("classTeacherBelow65")} value={students.filter((student) => Number.isFinite(student.finalWeighted) && student.finalWeighted < 65).length} onClick={() => toggleFocus("below65")} pressed={dashboardFilters.focus === "below65"} />
          <StatCard label={c("classTeacherPositiveProfiles")} value={positiveCount} onClick={() => toggleFocus("positive")} pressed={dashboardFilters.focus === "positive"} />
          <StatCard label={t("print.discussionCount")} value={discussionStudents.length} hint={t("meeting.discussionHint")} />
        </div>

        {polishNotices.length ? <ClassTeacherNoticeList notices={polishNotices} /> : null}

        <ClassTeacherDashboardFilters
          c={c}
          filters={dashboardFilters}
          subjectOptions={subjectOptions}
          counts={{
            all: students.length,
            mainSubjectDanger: mainSubjectDangerStudents.length,
            below65: students.filter((student) => Number.isFinite(student.finalWeighted) && student.finalWeighted < 65).length,
            positive: students.filter((student) => student.flags?.some((flag) => flag.type === "positive_stable_profile")).length,
          }}
          onChange={updateDashboardFilters}
        />
      </div>

      <Card className="heatmap-panel">
        <CardHeader>
          <CardTitle>{t("heatmap.title")}</CardTitle>
          <CardDescription>{t("heatmap.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ClassHeatmap
            c={c}
            analysis={analysis}
            students={filteredStudents}
            anonymised={anonymised}
            feedback={subjectFeedback}
            decisions={decisions}
            onOpenStudent={(id) => startMeeting(filteredStudents, id)}
          />
        </CardContent>
      </Card>

      <div className="overview-grid">
        <Card className="chart-panel">
          <CardHeader>
            <CardTitle>{t("chart.histogramTitle")}</CardTitle>
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
            <ClassTeacherStudentTable
              c={c}
              students={filteredStudents}
              anonymised={anonymised}
              filters={dashboardFilters}
              onFiltersChange={updateDashboardFilters}
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

      <div className={cn("student-cards", "class-teacher-student-cards", compactCards && "student-cards--compact")}>
        {filteredStudents.length ? filteredStudents.map((student, index) => (
          <ClassTeacherStudentCard
            key={student.id}
            c={c}
            student={student}
            analysis={analysis}
            peers={filteredStudents}
            anonymised={anonymised}
            displayIndex={index}
            compact={compactCards}
            note={notes[student.id] || ""}
            noteStatus={noteSaveStatus[student.id] || "idle"}
            decision={decisions[student.id] || {}}
            onDecisionChange={onDecisionChange}
            feedbackEntries={feedbackForStudent(subjectFeedback, student)}
            onOpenMeeting={() => startMeeting(filteredStudents, student.id)}
            onNoteChange={onNoteChange}
            onOpenNoteSuggestion={onOpenNoteSuggestion}
            onScrollToStudent={onScrollToStudent}
            onStartTour={onStartTour}
            onPrintStudent={onPrintStudent}
            isPrintTarget={printStudentId === student.id}
          />
        )) : <EmptyState />}
      </div>

      <MeetingMode
        c={c}
        open={meeting.open && meetingStudents.length > 0}
        students={meetingStudents}
        index={Math.min(meeting.index, Math.max(meetingStudents.length - 1, 0))}
        analysis={analysis}
        anonymised={anonymised}
        notes={notes}
        decisions={decisions}
        feedback={subjectFeedback}
        onIndexChange={(index) => setMeeting((current) => ({ ...current, index }))}
        onClose={() => setMeeting((current) => ({ ...current, open: false }))}
        onNoteChange={onNoteChange}
        onDecisionChange={onDecisionChange}
        onOpenNoteSuggestion={onOpenNoteSuggestion}
      />

      <ClassCouncilPrint c={c} analysis={analysis} students={students} anonymised={anonymised} notes={notes} decisions={decisions} />
    </section>
  );
}

export function ClassTeacherDashboardFilters({ c, filters, subjectOptions, counts, onChange }) {
  return (
    <div className="class-teacher-dashboard-filters" aria-label={t("filter.label")}>
      <div className="filters">
        <Select value={filters.band} onChange={(event) => onChange({ band: event.target.value })} aria-label={t("filter.allBands")}>
          <option value="all">{t("filter.allBands")}</option>
          {THRESHOLD_BANDS.map((band) => (
            <option key={band.id} value={band.id}>{t(`band.${band.id}`)}</option>
          ))}
        </Select>
        <Select value={filters.subject} onChange={(event) => onChange({ subject: event.target.value })} aria-label={c("classTeacherSubjectFilter")}>
          <option value="all">{c("classTeacherSubjectFilter")}</option>
          {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
        </Select>
        <Button variant="outline" type="button" onClick={() => onChange({ focus: "all", band: "all", subject: "all" })}>
          {t("filter.clear")}
        </Button>
      </div>
    </div>
  );
}

export function ClassTeacherStudentTable({ c, students, anonymised, filters, onFiltersChange, onOpen }) {
  return (
    <Table className="student-table class-teacher-student-table">
      <TableHeader>
        <TableRow>
          <SortHeader field="name" label={t("student.student")} filters={filters} onFiltersChange={onFiltersChange} />
          <SortHeader field="total" label={t("student.total")} filters={filters} onFiltersChange={onFiltersChange} align="right" />
          <SortHeader field="trend" label={t("student.trend")} filters={filters} onFiltersChange={onFiltersChange} />
          <SortHeader field="mainSubjectDanger" label={c("classTeacherMainSubjectDanger")} filters={filters} onFiltersChange={onFiltersChange} />
          <SortHeader field="flags" label={c("visibleAdvice")} filters={filters} onFiltersChange={onFiltersChange} align="right" className="class-teacher-interesting-column" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student, index) => (
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
            <TableCell className="table-cell-numeric">{formatGrade(student.finalWeighted)}</TableCell>
            <TableCell>{translateTrend(student.overallTrend?.direction || "insufficient")}</TableCell>
            <TableCell>{classTeacherMainSubjectDangerLabel(student, c)}</TableCell>
            <TableCell className="table-cell-numeric class-teacher-interesting-column">{student.flags?.length || 0}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ClassTeacherStudentCard({
  c,
  student,
  analysis,
  peers,
  anonymised,
  displayIndex,
  compact,
  note,
  noteStatus,
  decision = {},
  onDecisionChange,
  feedbackEntries = [],
  onOpenMeeting,
  onNoteChange,
  onOpenNoteSuggestion,
  onScrollToStudent,
  onStartTour,
  onPrintStudent,
  isPrintTarget,
}) {
  const displayName = anonymised ? anonymousName(student) : student.name;
  const peerIndex = peers.findIndex((peer) => peer.id === student.id);
  const previousPeer = peerIndex > 0 ? peers[peerIndex - 1] : null;
  const nextPeer = peerIndex >= 0 && peerIndex < peers.length - 1 ? peers[peerIndex + 1] : null;
  const defaultSubjects = classTeacherDefaultSubjects(student);
  const [selectedSubjects, setSelectedSubjects] = useState(defaultSubjects);
  const [scaleMode, setScaleMode] = useState("full");
  const visibleSubjects = normaliseSelectedClassTeacherSubjects(student, selectedSubjects);
  const summary = classTeacherStudentSummary(student, c);
  const detailFlags = classTeacherDetailFlags(student);

  function toggleSubject(subject) {
    setSelectedSubjects((current) => {
      if (current.includes(subject)) return current.filter((item) => item !== subject);
      return [...current, subject];
    });
  }

  function showKeySubjects() {
    setSelectedSubjects(classTeacherDefaultSubjects(student, true));
  }

  function showAllSubjects() {
    setSelectedSubjects((student.subjectLines || []).map((line) => line.subject));
  }

  function showNoSubjects() {
    setSelectedSubjects([]);
  }

  return (
    <Card className={cn("student-card", "class-teacher-student-card", compact && "student-card--compact", isPrintTarget && "is-print-target")} id={`student-card-${student.id}`} data-student-id={student.id}>
      <CardHeader className="student-card-header" data-tour-part="total">
        <div>
          <CardTitle className="student-title">{displayName}</CardTitle>
          <div className="student-meta">
            <Badge variant="outline">{student.classCode}</Badge>
            <Badge variant="outline">{analysis.track?.label || t("option.notAvailable")}</Badge>
            <Badge variant="secondary">{formatGrade(student.finalWeighted)}</Badge>
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
          {onOpenMeeting ? <Button variant="outline" type="button" onClick={onOpenMeeting}><Presentation size={15} aria-hidden="true" />{t("meeting.open")}</Button> : null}
          <Button variant="ghost" type="button" onClick={() => onStartTour(student.id)}>{t("tour.button")}</Button>
          <div className={cn("grade-badge", student.thresholdBand?.className)}>{formatGrade(student.finalWeighted)}</div>
        </CardAction>
      </CardHeader>

      <CardContent>
        <section className="card-section card-section--graph class-teacher-lines-section" data-tour-part="graph">
          <div className="section-row graph-section-heading">
            <h4>{t("student.visualContext")}</h4>
            <div className="class-teacher-scale-toggle" aria-label={t("chart.yearTrend")}>
              <Button variant={scaleMode === "full" ? "default" : "outline"} size="sm" type="button" onClick={() => setScaleMode("full")}>{c("classTeacherScaleFull")}</Button>
              <Button variant={scaleMode === "zoom" ? "default" : "outline"} size="sm" type="button" onClick={() => setScaleMode("zoom")}>{c("classTeacherScaleZoom")}</Button>
            </div>
          </div>
          <ClassTeacherSubjectPicker
            c={c}
            student={student}
            selectedSubjects={visibleSubjects}
            onToggle={toggleSubject}
            onKeySubjects={showKeySubjects}
            onAllSubjects={showAllSubjects}
            onNone={showNoSubjects}
          />
          <p className="class-teacher-graph-hint">{c("classTeacherGraphHint")}</p>
          <ClassTeacherLinesChart c={c} student={student} periods={analysis.periods} selectedSubjects={visibleSubjects} scaleMode={scaleMode} />
        </section>

        <section className="card-section card-section--summary" data-tour-part="advice">
          <div className="advice-summary">
            <strong>{t("advice.summaryTitle")}</strong>
            <p>{summary.title}</p>
            <p>{summary.body}</p>
          </div>
          {detailFlags.length ? (
            <div className="flag-detail-list">
              {detailFlags.map((flag, index) => (
                <FlagWithHandling
                  key={`${flag.type}-${index}`}
                  flag={flag}
                  state={decision.flagStates?.[flag.type] || null}
                  onChange={(value) => onDecisionChange?.(student.id, { flagStates: { ...(decision.flagStates || {}), [flag.type]: value } })}
                />
              ))}
            </div>
          ) : null}
          <SubjectFeedbackList entries={feedbackEntries} />
        </section>

        <section className="card-section class-teacher-subject-matrix" data-tour-part="table">
          <div className="section-row">
            <h4>{c("classTeacherSubjectMatrix")}</h4>
            <span>{analysis.track?.label || ""}</span>
          </div>
          <ClassTeacherSubjectMatrix c={c} student={student} periods={analysis.periods} />
        </section>

        <section className="card-section notes-section" data-tour-part="notes">
          <div className="section-row notes-heading">
            <h4>{t("student.teacherJudgement")}</h4>
            <div className="notes-heading-actions">
              <Button variant="outline" size="sm" type="button" onClick={() => onOpenNoteSuggestion?.(student, analysis, displayName)}>
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
      </CardContent>
    </Card>
  );
}

export function ClassTeacherSubjectPicker({ c, student, selectedSubjects, onToggle, onKeySubjects, onAllSubjects, onNone }) {
  const subjects = student.subjectLines || [];
  return (
    <details className="class-teacher-subject-picker">
      <summary>
        <span>{c("classTeacherSubjectPicker")}</span>
        <Badge>{selectedSubjects.length}</Badge>
      </summary>
      <div className="class-teacher-subject-picker-body">
        <div className="subject-picker-actions">
          <Button variant="outline" size="sm" type="button" onClick={onKeySubjects}>{c("classTeacherKeySubjectsOnly")}</Button>
          <Button variant="outline" size="sm" type="button" onClick={onAllSubjects}>{c("classTeacherAllSubjects")}</Button>
          <Button variant="outline" size="sm" type="button" onClick={onNone}>{c("classTeacherNoSubjectLines")}</Button>
        </div>
        <div className="subject-checkbox-grid">
          {subjects.map((line) => (
            <label key={line.subject} className={cn("subject-checkbox", line.isKeySubject && "is-key-subject")}>
              <input type="checkbox" checked={selectedSubjects.includes(line.subject)} onChange={() => onToggle(line.subject)} />
              <span>{line.subject}</span>
              {line.isKeySubject ? <small>{c("classTeacherKeySubject")}</small> : null}
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

export function ClassTeacherLinesChart({ c, student, periods, selectedSubjects, scaleMode = "full" }) {
  const linesRevealRef = useChartReveal(`${student.id}-${selectedSubjects.join("|")}-${scaleMode}`);
  const width = 760;
  const height = 252;
  const left = 48;
  const right = 24;
  const top = 28;
  const bottom = 194;
  const axisWidth = width - left - right;
  const periodList = periods || [];
  const xForIndex = (index) => left + (periodList.length <= 1 ? 0 : (index / (periodList.length - 1)) * axisWidth);
  const subjectLines = (student.subjectLines || []).filter((line) => selectedSubjects.includes(line.subject));
  const overallPoints = (student.overallTrend?.points || []).map((point) => ({
    subject: c("classTeacherOverallLine"),
    periodId: point.periodId,
    periodLabel: point.periodLabel,
    value: point.value,
    isOverall: true,
  }));
  const chartValues = [
    ...overallPoints.map((point) => point.value),
    ...subjectLines.flatMap((line) => (line.points || []).map((point) => point.value)),
  ].filter(Number.isFinite);
  const domain = classTeacherChartDomain(chartValues, scaleMode);
  const axisHeight = bottom - top;
  const yFor = (value) => bottom - ((clamp(value, domain.min, domain.max) - domain.min) / (domain.max - domain.min)) * axisHeight;
  const axisTicks = classTeacherAxisTicks(domain);

  return (
    <figure className="class-teacher-lines-chart">
      <svg ref={linesRevealRef} className="chart-svg chart-svg--interactive" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("chart.yearTrend")}>
        <line x1={left} y1={top} x2={left} y2={bottom} stroke="var(--chart-axis)" />
        <line x1={left} y1={bottom} x2={width - right} y2={bottom} stroke="var(--chart-axis)" />
        {axisTicks.map((value) => (
          <g key={value}>
            <line x1={left - 4} y1={yFor(value)} x2={width - right} y2={yFor(value)} stroke="var(--chart-grid)" />
            <text x="10" y={yFor(value) + 4}>{formatNumber(value)}%</text>
          </g>
        ))}
        {periodList.map((period, index) => (
          <g key={period.id}>
            <line className="class-teacher-period-line" x1={xForIndex(index)} y1={top} x2={xForIndex(index)} y2={bottom} />
            <text className="axis-label" x={xForIndex(index)} y={bottom + 28} textAnchor="middle">{shortLabel(period.label, 16)}</text>
          </g>
        ))}
        {subjectLines.map((line, index) => (
          <ClassTeacherLinePath
            key={line.subject}
            line={line}
            periods={periodList}
            color={CLASS_TEACHER_LINE_COLORS[index % CLASS_TEACHER_LINE_COLORS.length]}
            xForIndex={xForIndex}
            yFor={yFor}
            muted
          />
        ))}
        <ClassTeacherLinePath
          line={{ subject: c("classTeacherOverallLine"), points: overallPoints }}
          periods={periodList}
          color="var(--primary)"
          xForIndex={xForIndex}
          yFor={yFor}
          overall
        />
      </svg>
      <figcaption className="class-teacher-chart-legend">
        <span><i style={{ background: "var(--primary)" }} />{c("classTeacherOverallLine")}</span>
        <span><i />{selectedSubjects.length} {c("classTeacherSubjectLines").toLowerCase()}</span>
      </figcaption>
    </figure>
  );
}

export function ClassTeacherLinePath({ line, periods, color, xForIndex, yFor, overall = false, muted = false }) {
  const points = periods.map((period, index) => {
    const point = (line.points || []).find((item) => item.periodId === period.id);
    return {
      ...point,
      index,
      periodLabel: point?.periodLabel || period.label,
      value: point?.value,
    };
  }).filter((point) => Number.isFinite(point.value));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xForIndex(point.index)} ${yFor(point.value)}`).join(" ");
  if (!points.length) return null;
  return (
    <g className={cn("class-teacher-line-group", overall && "is-overall", muted && "is-muted-line")}>
      {points.length > 1 ? <path data-draw d={path} fill="none" stroke={color} /> : null}
      {points.map((point) => {
        const x = xForIndex(point.index);
        const y = yFor(point.value);
        const label = `${line.subject} - ${point.periodLabel}: ${formatNumber(point.value)}%`;
        return (
          <g
            key={`${line.subject}-${point.periodId}`}
            className="class-teacher-line-dot"
            transform={`translate(${x}, ${y})`}
            tabIndex={0}
            aria-label={label}
          >
            <text className="chart-svg-tooltip class-teacher-line-label" x="0" y="-14" textAnchor="middle">
              {shortLabel(`${line.subject}: ${formatNumber(point.value)}%`, 34)}
            </text>
            <title>{label}</title>
            <circle data-pop cx="0" cy="0" r={overall ? 6 : 4.5} fill={color} />
          </g>
        );
      })}
    </g>
  );
}

export function ClassTeacherSubjectMatrix({ c, student, periods }) {
  const periodIds = (periods || []).map((period) => period.id);
  return (
    <div className="table-scroll">
      <Table className="class-teacher-subject-matrix-table">
        <TableHeader>
          <TableRow>
            <TableHead>{t("detected.subject")}</TableHead>
            {periods.map((period) => <TableHead key={period.id}>{shortLabel(period.label, 12)}</TableHead>)}
            <TableHead>{t("student.total")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(student.subjectLines || []).map((line) => (
            <TableRow key={line.subject} className={line.isKeySubject ? "is-key-subject-row" : ""}>
              <TableCell>
                <strong>{line.subject}</strong>
                {line.isKeySubject ? <small>{c("classTeacherKeySubject")}</small> : null}
              </TableCell>
              {periodIds.map((periodId) => {
                const point = line.points.find((item) => item.periodId === periodId);
                return <TableCell key={periodId}>{Number.isFinite(point?.value) ? `${formatNumber(point.value)}%` : t("option.notAvailable")}</TableCell>;
              })}
              <TableCell>{Number.isFinite(line.yearScore) ? `${formatNumber(line.yearScore)}%` : formatGrade(line.latestScore)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
