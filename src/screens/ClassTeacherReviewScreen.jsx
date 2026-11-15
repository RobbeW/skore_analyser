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
import { findSchoolWeights } from "../../js/school-weights.js";
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
import { FlowIndicator } from "../components/setup-parts.jsx";
import { StatCard } from "../components/student-card.jsx";
import { formatNumber } from "../lib/app-helpers.jsx";
import { formatPeriodCount, classTeacherBlockingIssues, classTeacherPolishNotices, classTeacherSubjectOptions } from "../lib/class-teacher-helpers.jsx";

export function ClassTeacherReviewScreen({
  c,
  status,
  reports,
  analyses,
  trackOverrides,
  subjectOverrides,
  onTrackChange,
  onPeriodChange,
  onSubjectChange,
  onConfirm,
}) {
  const blockingIssues = classTeacherBlockingIssues(analyses);
  const primaryAnalysis = analyses[0];
  const classesLabel = analyses.map((analysis) => analysis.classCode).join(", ");
  const periodLabel = analyses.map((analysis) => formatPeriodCount(analysis.totals)).join(", ");
  const studentCount = analyses.reduce((sum, analysis) => sum + analysis.totals.studentCount, 0);
  const polishNotices = analyses.flatMap((analysis) => classTeacherPolishNotices(analysis, c));

  return (
    <section className="workflow-screen class-teacher-review-screen">
      <FlowIndicator active="classTeacherReview" c={c} />
      <div className="screen-heading">
        <div>
          <p className="eyebrow">{t("upload.mode.klassenleraar")}</p>
          <h2>{c("classTeacherReviewTitle")}</h2>
          <p>{c("classTeacherReviewBody")}</p>
        </div>
        <Button type="button" onClick={onConfirm} disabled={Boolean(blockingIssues.length)}>
          <ArrowRight size={16} aria-hidden="true" />
          {c("classTeacherConfirmMapping")}
        </Button>
      </div>

      <div className="class-teacher-review-grid">
        <Card className="review-overview-card">
          <CardHeader>
            <div>
              <CardTitle>{classesLabel || t("option.notAvailable")}</CardTitle>
              <CardDescription>{status.text}</CardDescription>
            </div>
            <CardAction>
              <Badge variant={blockingIssues.length ? "warning" : "default"}>
                {blockingIssues.length ? c("classTeacherBlocked") : t("detected.ready")}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="detected-grid">
              <StatCard label={t("detected.files")} value={reports.length} compact />
              <StatCard label={t("detected.periods")} value={periodLabel} compact />
              <StatCard label={t("detected.students")} value={studentCount} compact />
              <StatCard label={t("detected.subject")} value={primaryAnalysis?.totals?.subjectCount || 0} compact />
            </div>
            {blockingIssues.length ? (
              <ul className="class-teacher-issue-list">
                {blockingIssues.map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
            ) : null}
            {polishNotices.length ? <ClassTeacherNoticeList notices={polishNotices} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("detected.track")}</CardTitle>
            <CardDescription>{c("classTeacherTrackHelp")}</CardDescription>
          </CardHeader>
          <CardContent className="class-teacher-stack">
            {analyses.map((analysis) => {
              const options = trackOptionsForYear(analysis.year);
              const selectedTrackId = trackOverrides[analysis.classCode] || analysis.track?.id || "";
              const selectedTrack = trackById(selectedTrackId) || analysis.track;
              return (
                <div className="track-review-row" key={analysis.classCode}>
                  <div>
                    <strong>{analysis.classCode}</strong>
                    <p>{t("detected.year")} {analysis.year || t("option.notAvailable")}</p>
                  </div>
                  <Select value={selectedTrackId} onChange={(event) => onTrackChange(analysis.classCode, event.target.value)}>
                    <option value="">{t("option.notAvailable")}</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </Select>
                  <div className="key-subject-list" aria-label={t("detected.keySubjects")}>
                    {(selectedTrack?.keySubjects || []).map((subject) => <Badge key={subject}>{subject}</Badge>)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <SchoolWeightsCard c={c} table={analyses[0]?.schoolWeights || findSchoolWeights({ year: analyses[0]?.year, trackId: analyses[0]?.track?.id, classCode: analyses[0]?.classCode })} />

        <Card className="class-teacher-wide-card">
          <CardHeader>
            <CardTitle>{t("detected.files")}</CardTitle>
            <CardDescription>{t("review.tableHelp")}</CardDescription>
          </CardHeader>
          <CardContent className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("detected.classes")}</TableHead>
                  <TableHead>{t("detected.workbook")}</TableHead>
                  <TableHead>{t("detected.periods")}</TableHead>
                  <TableHead>{t("detected.students")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const periods = periodSchemaForYear(report.year)?.periods || [];
                  return (
                    <TableRow key={report.fileName}>
                      <TableCell>{report.classCode}</TableCell>
                      <TableCell>{report.fileName}</TableCell>
                      <TableCell>
                        <Select value={report.periodId || ""} onChange={(event) => onPeriodChange(report.fileName, event.target.value)}>
                          <option value="">{t("option.notAvailable")}</option>
                          {periods.map((period) => (
                            <option key={period.id} value={period.id}>{period.label}</option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>{report.totals.studentCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("detected.subject")}</CardTitle>
            <CardDescription>{c("classTeacherSubjectHelp")}</CardDescription>
          </CardHeader>
          <CardContent className="class-teacher-stack">
            {analyses.map((analysis) => {
              const unknownSubjects = analysis.subjects.filter((subject) => !subject.known);
              const subjectOptions = classTeacherSubjectOptions(analysis);
              if (!unknownSubjects.length) {
                return <p className="muted" key={analysis.classCode}>{analysis.classCode}: {t("review.suggestedEmpty")}</p>;
              }
              return unknownSubjects.slice(0, 8).map((subject) => (
                <div className="subject-alias-row" key={`${analysis.classCode}-${subject.subject}`}>
                  <div>
                    <strong>{subject.subject}</strong>
                    <p>{analysis.classCode}</p>
                  </div>
                  <Select
                    value={subjectOverrides[analysis.classCode]?.[subject.subject] || ""}
                    onChange={(event) => onSubjectChange(analysis.classCode, subject.subject, event.target.value)}
                  >
                    <option value="">{t("option.none")}</option>
                    {subjectOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </Select>
                </div>
              ));
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("detected.students")}</CardTitle>
            <CardDescription>{c("classTeacherStudentsHelp")}</CardDescription>
          </CardHeader>
          <CardContent className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("student.student")}</TableHead>
                  <TableHead>{t("detected.periods")}</TableHead>
                  <TableHead>{t("student.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(primaryAnalysis?.students || []).slice(0, 8).map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.periods.filter((period) => !period.missing).length}/{primaryAnalysis.periods.filter((period) => !period.missing).length}</TableCell>
                    <TableCell>{formatNumber(student.finalWeighted)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function ClassTeacherNoticeList({ notices }) {
  if (!notices.length) return null;
  return (
    <div className="class-teacher-notice-list">
      {notices.map((notice) => (
        <div className="class-teacher-notice" key={notice.id}>
          <ShieldCheck size={17} aria-hidden="true" />
          <div>
            <strong>{notice.title}</strong>
            <p>{notice.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The school weights used for this class (grade 1 for now), so the klastitularis can check them. */
export function SchoolWeightsCard({ c, table }) {
  const hasExpa = Boolean(table?.subjects.some((item) => Number.isFinite(item.expa)));
  return (
    <Card className="class-teacher-wide-card weights-card">
      <CardHeader>
        <CardTitle>{c("weightsTitle")}</CardTitle>
        <CardDescription>{table ? c("weightsDescription", { track: table.trackCode, period: table.period }) : c("weightsNone")}</CardDescription>
      </CardHeader>
      {table ? (
        <CardContent className="table-scroll">
          <Table className="weights-table">
            <TableHeader>
              <TableRow>
                <TableHead>{c("weightsSubject")}</TableHead>
                <TableHead className="table-cell-numeric">{c("weightsHours")}</TableHead>
                <TableHead className="table-cell-numeric">DW</TableHead>
                <TableHead className="table-cell-numeric">EX</TableHead>
                {hasExpa ? <TableHead className="table-cell-numeric">EXPA</TableHead> : null}
                <TableHead className="table-cell-numeric">{t("student.total")}</TableHead>
                <TableHead className="table-cell-numeric">{c("weightsShare")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...table.subjects].sort((a, b) => b.total - a.total || a.subject.localeCompare(b.subject)).map((item) => (
                <TableRow key={item.code}>
                  <TableCell>
                    <strong>{item.subject}</strong>
                    {item.isMajor ? <small> · major</small> : item.isMinor ? <small> · minor</small> : null}
                  </TableCell>
                  <TableCell className="table-cell-numeric">{item.hours}</TableCell>
                  <TableCell className="table-cell-numeric">{item.hasExam || table.noExamMultiplier === 1 ? item.dw : `${item.dw} x ${table.noExamMultiplier}`}</TableCell>
                  <TableCell className="table-cell-numeric">{Number.isFinite(item.ex) ? item.ex : "–"}</TableCell>
                  {hasExpa ? <TableCell className="table-cell-numeric">{Number.isFinite(item.expa) ? item.expa : "–"}</TableCell> : null}
                  <TableCell className="table-cell-numeric"><strong>{item.total}</strong></TableCell>
                  <TableCell className="table-cell-numeric">{Math.round(item.share * 1000) / 10}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      ) : null}
    </Card>
  );
}
