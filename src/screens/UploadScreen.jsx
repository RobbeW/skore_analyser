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
import { APP_MODES } from "../lib/app-constants.jsx";
import { BrandMark } from "../components/brand.jsx";
import { SlideIndicator } from "../lib/use-motion.jsx";

export function UploadScreen({
  c,
  appMode,
  onModeChange,
  status,
  isBusy,
  isDragging,
  setIsDragging,
  fileInputRef,
  projectInputRef,
  uploadSummary,
  onLoadWorkbook,
  onLoadClassTeacherFiles,
  onLoadProject,
}) {
  const isClassTeacherMode = appMode === "klassenleraar";
  const modeRef = useRef(null);

  function handleIncomingFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (files.length === 1 && /\.json$/i.test(files[0].name)) {
      onLoadProject(files[0]);
      return;
    }
    if (isClassTeacherMode) {
      onLoadClassTeacherFiles(files);
      return;
    }
    onLoadWorkbook(files[0], files[0].name);
  }

  function handleFileSelection(event) {
    handleIncomingFiles(event.target.files);
    event.target.value = "";
  }

  function handleProjectSelection(event) {
    const [file] = event.target.files || [];
    if (file) onLoadProject(file);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleIncomingFiles(event.dataTransfer.files);
  }

  return (
    <section className="upload-screen">
      <div className="splash-topbar">
        <div className="brand-heading brand-heading--light">
          <BrandMark size={36} className="brand-mark-svg" />
          <span>{t("app.brand")}</span>
        </div>
      </div>

      <div className="upload-stage">
        <div className="upload-copy">
          <h2>{t("upload.title")}</h2>
          <p>{t("upload.subtitle")}</p>
          <div className="mode-toggle" ref={modeRef} role="group" aria-label={t("upload.roleLabel")}>
            <SlideIndicator containerRef={modeRef} className="mode-indicator" withHeight deps={[appMode]} />
            {APP_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn("mode-choice", appMode === mode && "is-active")}
                onClick={() => onModeChange(mode)}
                aria-pressed={appMode === mode}
              >
                <span>{t(`upload.mode.${mode}`)}</span>
              </button>
            ))}
          </div>
        </div>

        <Card className={cn("upload-card", uploadSummary && "is-complete")}>
          <CardContent>
            <button
              type="button"
              className={cn("drop-zone", isDragging && "is-dragging")}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".xlsx,.xls,.json,application/json"
                multiple={isClassTeacherMode}
                onChange={handleFileSelection}
              />
              <span className="drop-zone-icon" aria-hidden="true">
                <UploadCloud size={28} />
              </span>
              <span className="drop-zone-title">{isClassTeacherMode ? t("upload.classTeacherDropTitle") : t("upload.dropTitle")}</span>
            </button>

            {uploadSummary ? (
              <div className="upload-success-panel" aria-live="polite">
                <div className="upload-success-icon" aria-hidden="true">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <UploadSummaryContent uploadSummary={uploadSummary} />
                </div>
              </div>
            ) : null}

            <div className="project-import-row">
              <input ref={projectInputRef} className="sr-only" type="file" accept=".json,application/json" onChange={handleProjectSelection} />
              <Button variant="ghost" type="button" onClick={() => projectInputRef.current?.click()}>
                <FolderOpen size={16} aria-hidden="true" />
                {t("button.importProject")}
              </Button>
            </div>

            <div className={cn("status-pill", `status-pill--${status.kind}`)} aria-live="polite">
              {isBusy ? <Spinner /> : <ShieldCheck size={15} aria-hidden="true" />}
              <span>{status.text}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function UploadSummaryContent({ uploadSummary }) {
  if (uploadSummary.mode === "klassenleraar") {
    return (
      <>
        <strong>{t("upload.classTeacherDetectedTitle")}</strong>
        <p>{t("upload.classTeacherDetectedHelp", {
          fileCount: uploadSummary.fileCount,
          classCode: uploadSummary.classCode,
        })}</p>
        <dl className="upload-summary-grid upload-summary-grid--class-teacher">
          <div>
            <dt>{t("detected.files")}</dt>
            <dd>{uploadSummary.fileCount}</dd>
          </div>
          <div>
            <dt>{t("detected.periods")}</dt>
            <dd>{uploadSummary.periods}</dd>
          </div>
          <div>
            <dt>{t("detected.students")}</dt>
            <dd>{uploadSummary.students}</dd>
          </div>
          <div>
            <dt>{t("detected.year")}</dt>
            <dd>{uploadSummary.year}</dd>
          </div>
          <div>
            <dt>{t("detected.track")}</dt>
            <dd>{uploadSummary.track}</dd>
          </div>
          <div>
            <dt>{t("detected.keySubjects")}</dt>
            <dd>{uploadSummary.keySubjects}</dd>
          </div>
        </dl>
      </>
    );
  }

  return (
    <>
      <strong>{t("upload.detectedTitle")}</strong>
      <p>{t("upload.detectedHelp", { fileName: uploadSummary.fileName })}</p>
      <dl className="upload-summary-grid">
        <div>
          <dt>{t("detected.students")}</dt>
          <dd>{uploadSummary.students}</dd>
        </div>
        <div>
          <dt>{t("detected.classes")}</dt>
          <dd>{uploadSummary.classes}</dd>
        </div>
        <div>
          <dt>{t("detected.assignments")}</dt>
          <dd>{uploadSummary.assignments}</dd>
        </div>
      </dl>
    </>
  );
}
