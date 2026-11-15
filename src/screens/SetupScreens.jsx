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
import { AssignmentMappingTable, DetectedSummary, EvaluationUsageTable, Field, FlowIndicator, SetupProgressRail, WarningsPanel } from "../components/setup-parts.jsx";
import { StatCard } from "../components/student-card.jsx";
import { BASKET_PRESETS, GENERATION_STEPS } from "../lib/app-constants.jsx";
import { assignmentUsageCounts, basketCategoriesFromConfig, basketTransferHints, normaliseBasketPercentages, presetLabel, reviewSuggestionItems } from "../lib/app-helpers.jsx";

export function EvaluationReviewScreen({
  c,
  model,
  config,
  status,
  onAssignmentChange,
  onContinue,
}) {
  const counts = assignmentUsageCounts(model.assignments, config);
  const suggestions = reviewSuggestionItems(model.assignments);
  return (
    <section className="workflow-screen review-screen">
      <FlowIndicator active="review" c={c} />
      <div className="screen-heading">
        <div>
          <p className="eyebrow">{t("step.2")}</p>
          <h2>{t("review.title")}</h2>
          <p>{t("review.subtitle")}</p>
        </div>
        <Button type="button" onClick={onContinue}>
          <ChevronRight size={16} aria-hidden="true" />
          {t("review.continue")}
        </Button>
      </div>

      <div className="review-layout">
        <Card className="review-guidance-card">
          <CardContent>
            <div className="usage-summary-grid">
              <StatCard label={t("usage.include")} value={counts.include} compact />
              <StatCard label={t("usage.displayOnly")} value={counts.displayOnly} compact />
              <StatCard label={t("usage.exclude")} value={counts.exclude} compact />
            </div>
            <div className="review-suggestions">
              <strong>{t("review.suggestedTitle")}</strong>
              {suggestions.length ? (
                <ul>
                  {suggestions.map((item) => (
                    <li key={`${item.assignment.id}-${item.reasonKey}`}>
                      <span>{item.assignment.title}</span>
                      <small>{t(item.reasonKey)}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{t("review.suggestedEmpty")}</p>
              )}
            </div>
            <div className={cn("status-pill", `status-pill--${status.kind}`)}>{status.text}</div>
          </CardContent>
        </Card>

        <Card className="evaluation-review-card">
          <CardHeader>
            <CardTitle>{t("review.tableTitle")}</CardTitle>
            <CardDescription>{t("review.tableHelp")}</CardDescription>
          </CardHeader>
          <CardContent>
            <EvaluationUsageTable
              assignments={model.assignments}
              config={config}
              onAssignmentChange={onAssignmentChange}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function MappingScreen({
  c,
  model,
  config,
  presets,
  isBusy,
  status,
  onConfigChange,
  onAssignmentChange,
  onBasketWeightChange,
  onApplyBasketPreset,
  onSavePreset,
  onApplySavedPreset,
  onGenerate,
}) {
  const [presetName, setPresetName] = useState("");
  const basketCategories = basketCategoriesFromConfig(config);
  const categoryOptions = basketCategories.map((category) => category.name);
  const normalised = normaliseBasketPercentages(basketCategories);
  const transferPairs = basketTransferHints(basketCategories);

  return (
    <section className="workflow-screen map-screen">
      <FlowIndicator active="map" c={c} />
      <div className="screen-heading">
        <div>
          <p className="eyebrow">{t("step.3")}</p>
          <h2>{t("mapping.title")}</h2>
        </div>
        <Button type="button" disabled={isBusy} onClick={onGenerate}>
          {isBusy ? <Spinner /> : <Sparkles size={16} aria-hidden="true" />}
          {isBusy ? t("mapping.generating") : t("mapping.generate")}
        </Button>
      </div>

      <SetupProgressRail />

      <div className="map-grid">
        <DetectedSummary model={model} />
        <WarningsPanel warnings={model.warnings} />
      </div>

      <div className="setup-wizard">
        <Card className="wizard-card">
          <CardHeader>
            <div className="step-number">1</div>
            <div>
              <CardTitle>{t("mapping.stepCourse")}</CardTitle>
              <CardDescription>{t("mapping.stepCourseHelp")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="form-grid">
            <Field label={t("mapping.subject")}>
              <Input value={config.subject || ""} onChange={(event) => onConfigChange({ subject: event.target.value })} />
            </Field>
            <Field label={t("mapping.threshold")}>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={config.threshold ?? 50}
                onChange={(event) => onConfigChange({ threshold: Number(event.target.value) })}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="wizard-card">
          <CardHeader>
            <div className="step-number">2</div>
            <div>
              <CardTitle>{t("mapping.stepBaskets")}</CardTitle>
              <CardDescription>{t("mapping.stepBasketsHelp")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="form-grid">
              <Field label={t("mapping.basketPreset")}>
                <Select value={config.basketPreset || "custom"} onChange={(event) => onApplyBasketPreset(event.target.value)}>
                  {config.schoolPreset ? <option value="school">{config.schoolPreset.label}</option> : null}
                  {Object.entries(BASKET_PRESETS).filter(([, preset]) => !preset.hidden).map(([key, preset]) => (
                    <option key={key} value={key}>{presetLabel(preset)}</option>
                  ))}
                  <option value="custom">{t("preset.custom")}</option>
                </Select>
              </Field>
            </div>
            <div className="basket-grid">
              {basketCategories.map((category) => (
                <label key={category.name} className="basket-row">
                  <span>{category.name}</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder={t("mapping.basketPlaceholder")}
                    value={category.weight || ""}
                    onChange={(event) => onBasketWeightChange(category.name, Number(event.target.value) || 0)}
                  />
                  <strong>{c("basketNormalised")} {normalised.get(category.name) || "0%"}</strong>
                </label>
              ))}
            </div>
            {transferPairs.length ? (
              <div className="basket-transfer-panel">
                <div>
                  <p className="eyebrow">{t("mapping.transferTitle")}</p>
                  <strong>{t("mapping.transferIntro")}</strong>
                </div>
                <div className="basket-transfer-list">
                  {transferPairs.map((pair) => (
                    <span key={`${pair.dw}-${pair.ex}`} className="basket-transfer-chip">
                      <span>{pair.ex}</span>
                      <ArrowDown size={14} aria-hidden="true" />
                      <span>{pair.dw}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <Accordion type="single" collapsible className="preset-tools-accordion">
              <AccordionItem value="preset-tools">
                <AccordionTrigger>{t("mapping.presetTools")}</AccordionTrigger>
                <AccordionContent>
                  <div className="form-grid">
                    <Field label={t("mapping.savePreset")}>
                      <div className="inline-field">
                        <Input
                          value={presetName}
                          placeholder={t("mapping.presetPlaceholder")}
                          onChange={(event) => setPresetName(event.target.value)}
                        />
                        <Button variant="outline" type="button" onClick={() => {
                          onSavePreset(presetName);
                          setPresetName("");
                        }}>
                          <Save size={16} aria-hidden="true" />
                          {t("button.savePreset")}
                        </Button>
                      </div>
                    </Field>
                    <Field label={t("mapping.savedPreset")}>
                      <Select defaultValue="" onChange={(event) => onApplySavedPreset(event.target.value)}>
                        <option value="">{t("mapping.noPreset")}</option>
                        {presets.map((preset) => (
                          <option key={preset.name} value={preset.name}>{preset.name}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="wizard-card">
          <CardHeader>
            <div className="step-number">3</div>
            <div>
              <CardTitle>{t("mapping.stepCheck")}</CardTitle>
              <CardDescription>{t("mapping.stepCheckHelp")}</CardDescription>
            </div>
            <CardAction>
              <Button type="button" disabled={isBusy} onClick={onGenerate}>
                {isBusy ? <Spinner /> : <Sparkles size={16} aria-hidden="true" />}
                {t("mapping.generate")}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className={cn("status-pill", `status-pill--${status.kind}`)}>{status.text}</div>
          </CardContent>
        </Card>
      </div>

      <Accordion type="single" collapsible className="advanced-accordion">
        <AccordionItem value="assignments">
          <AccordionTrigger>{c("advancedAssignment")}</AccordionTrigger>
          <AccordionContent>
            <AssignmentMappingTable model={model} config={config} categoryOptions={categoryOptions} onAssignmentChange={onAssignmentChange} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}

export function GenerationScreen({ c, model, config, generationStep }) {
  return (
    <section className="workflow-screen generation-screen">
      <FlowIndicator active="dashboard" c={c} />
      <div className="generation-shell">
        <div className="generation-copy">
          <p className="eyebrow">{t("generation.eyebrow")}</p>
          <h2>{t("generation.title")}</h2>
          <p>{t("generation.body", {
            students: model.students.length,
            subject: config.subject || model.subjects?.[0]?.value || t("dashboard.fallbackTitle"),
          })}</p>
        </div>
        <div className="generation-steps" aria-live="polite">
          {GENERATION_STEPS.map((step, index) => {
            const isComplete = index < generationStep;
            const isActive = index === generationStep;
            return (
              <div key={step.key} className={cn("generation-step", isComplete && "is-complete", isActive && "is-active")}>
                <span>{isComplete ? "OK" : index + 1}</span>
                <div>
                  <strong>{t(step.titleKey)}</strong>
                  <p>{t(step.bodyKey)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ClassTeacherGenerationScreen({ c, analysis, generationStep }) {
  const steps = [
    { key: "reports", title: c("classTeacherGeneratingReports"), body: `${analysis.totals.periodCount}/${analysis.totals.expectedPeriodCount} ${t("detected.periods").toLowerCase()}` },
    { key: "subjects", title: c("classTeacherGeneratingSubjects"), body: `${analysis.totals.subjectCount} ${t("detected.subject").toLowerCase()}` },
    { key: "cards", title: c("classTeacherGeneratingCards"), body: `${analysis.totals.studentCount} ${t("detected.students").toLowerCase()}` },
  ];

  return (
    <section className="workflow-screen generation-screen class-teacher-generation-screen">
      <FlowIndicator active="classTeacherGenerating" c={c} />
      <div className="generation-shell class-teacher-generation-shell">
        <div className="generation-copy">
          <p className="eyebrow">{t("upload.mode.klassenleraar")}</p>
          <h2>{c("classTeacherGeneratingTitle")}</h2>
          <p>{c("classTeacherGeneratingBody", {
            students: analysis.totals.studentCount,
            subjects: analysis.totals.subjectCount,
            periods: analysis.totals.periodCount,
          })}</p>
        </div>
        <div className="generation-steps" aria-live="polite">
          {steps.map((step, index) => {
            const isComplete = index < generationStep;
            const isActive = index === generationStep;
            return (
              <div key={step.key} className={cn("generation-step", isComplete && "is-complete", isActive && "is-active")}>
                <span>{isComplete ? "OK" : index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
