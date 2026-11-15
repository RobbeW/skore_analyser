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
import { anonymousName, bandColor, clamp, formatGrade, formatNumber, histogramTooltipLabel, quantile, shortLabel } from "../lib/app-helpers.jsx";
import { useChartReveal } from "../lib/use-motion.jsx";

export function DotPlot({ students, selected, anonymised }) {
  const revealRef = useChartReveal(`${students.length}-${selected?.id}`);
  const [hoveredId, setHoveredId] = useState(null);
  const width = 560;
  const height = 110;
  const left = 34;
  const axisWidth = 488;
  const y = 52;
  const values = students.filter((student) => Number.isFinite(student.finalWeighted));
  return (
    <svg ref={revealRef} className="chart-svg compact-chart dotplot-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("chart.dotPlot")}>
      <line x1={left} y1={y} x2={left + axisWidth} y2={y} stroke="var(--chart-axis)" />
      {[0, 50, 100].map((value) => (
        <g key={value}>
          <line x1={left + (value / 100) * axisWidth} y1={y - 8} x2={left + (value / 100) * axisWidth} y2={y + 8} stroke="var(--chart-axis)" />
          <text x={left + (value / 100) * axisWidth} y="88" textAnchor="middle">{value}</text>
        </g>
      ))}
      {values.map((student, index) => {
        const x = left + (clamp(student.finalWeighted, 0, 100) / 100) * axisWidth;
        const active = student.id === selected.id;
        const dotY = active ? y - 7 : y + (index % 5) * 3 - 6;
        const label = anonymised ? anonymousName(student) : student.name;
        const anchor = x < left + 90 ? "start" : x > left + axisWidth - 90 ? "end" : "middle";
        const labelX = anchor === "start" ? 8 : anchor === "end" ? -8 : 0;
        const isHovered = hoveredId === student.id;
        return (
          <g
            key={student.id}
            className={cn("peer-dot", active && "is-selected")}
            tabIndex={0}
            transform={`translate(${x}, ${dotY})`}
            aria-label={`${label}: ${formatGrade(student.finalWeighted)}`}
            onMouseEnter={() => setHoveredId(student.id)}
            onMouseLeave={() => setHoveredId(null)}
            onFocus={() => setHoveredId(student.id)}
            onBlur={() => setHoveredId(null)}
          >
            <text className={cn("peer-dot-label", isHovered && "is-visible")} x={labelX} y="-14" textAnchor={anchor}>{shortLabel(label, 24)} - {formatGrade(student.finalWeighted)}</text>
            <circle className="peer-dot-hit" cx="0" cy="0" r="13" />
            <circle data-pop className="peer-dot-circle" cx="0" cy="0" r={active ? 7 : 4} />
          </g>
        );
      })}
    </svg>
  );
}

export function QuartileStrip({ students, selected }) {
  const values = students.map((student) => student.finalWeighted).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length || !Number.isFinite(selected.finalWeighted)) return null;
  const q1 = quantile(values, 0.25);
  const q2 = quantile(values, 0.5);
  const q3 = quantile(values, 0.75);
  const x = clamp(selected.finalWeighted, 0, 100);
  return (
    <div className="quartile-strip" aria-label={t("chart.quartile")}>
      <QuartileMarker value={q1} label={t("chart.q1")} help={t("chart.q1Help")} />
      <QuartileMarker value={q2} label={t("chart.median")} help={t("chart.medianHelp")} />
      <QuartileMarker value={q3} label={t("chart.q3")} help={t("chart.q3Help")} />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="quartile-selected"
            type="button"
            style={{ left: `${x}%` }}
            aria-label={`${t("chart.selectedStudent")}: ${formatNumber(selected.finalWeighted)}%`}
          >
            {formatNumber(selected.finalWeighted)}%
          </button>
        </TooltipTrigger>
        <TooltipContent className="quartile-tooltip">
          <strong>{t("chart.selectedStudent")}: {formatNumber(selected.finalWeighted)}%</strong>
          <span>{t("chart.selectedStudentHelp")}</span>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function QuartileMarker({ value, label, help }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="quartile-marker"
          type="button"
          style={{ left: `${clamp(value, 0, 100)}%` }}
          aria-label={`${label}: ${formatNumber(value)}%`}
        />
      </TooltipTrigger>
      <TooltipContent className="quartile-tooltip">
        <strong>{label}: {formatNumber(value)}%</strong>
        <span>{help}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export function MiniHistogram({ students, selected, anonymised, onBinClick }) {
  return (
    <div aria-label={t("chart.classDistribution")}>
      <Histogram students={students} selected={selected} compact anonymised={anonymised} onBinClick={onBinClick} />
    </div>
  );
}

export function Histogram({ students, selected, compact = false, anonymised = false, onBinClick }) {
  const revealRef = useChartReveal(`${students.length}-${students.map((s) => s.id).join(",").length}-${selected?.id || ""}`);
  const bins = [
    [0, 49.999, t("band.low")],
    [50, 59.999, "50-59"],
    [60, 69.999, "60-69"],
    [70, 79.999, "70-79"],
    [80, 89.999, "80-89"],
    [90, 100, "90+"],
  ];
  const binStudents = bins.map(([min, max]) => students.filter((student) => (
    Number.isFinite(student.finalWeighted) && student.finalWeighted >= min && student.finalWeighted <= max
  )));
  const counts = binStudents.map((items) => items.length);
  const max = Math.max(1, ...counts);
  const width = 560;
  const height = compact ? 134 : 230;
  const left = 42;
  const bottom = compact ? 106 : 188;
  const barWidth = 64;
  const gap = 20;
  const bars = bins.map((bin, index) => {
    const x = left + 16 + index * (barWidth + gap);
    const barHeight = (counts[index] / max) * (compact ? 62 : 140);
    const y = bottom - barHeight;
    const band = thresholdBand((bin[0] + Math.min(bin[1], 100)) / 2);
    const studentsInBin = binStudents[index];
    return { bin, index, x, y, barHeight, band, studentsInBin };
  });
  const selectedBar = selected ? bars.find((bar) => bar.studentsInBin.some((student) => student.id === selected.id)) : null;
  const selectedMarker = selectedBar ? {
    x: selectedBar.x + barWidth / 2,
    y: Math.max(42, selectedBar.y - 24),
  } : null;

  return (
    <svg ref={revealRef} className={cn("chart-svg", compact && "compact-chart")} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("chart.histogramAria")}>
      <line x1={left} y1="18" x2={left} y2={bottom} stroke="var(--chart-axis)" />
      <line x1={left} y1={bottom} x2="535" y2={bottom} stroke="var(--chart-axis)" />
      {bars.map(({ bin, index, x, y, barHeight, band, studentsInBin }) => {
        const isInteractive = Boolean(onBinClick && studentsInBin.length);
        const openBin = () => {
          if (isInteractive) {
            onBinClick({ label: bin[2], students: studentsInBin, anonymised });
          }
        };
        return (
          <g
            key={bin[2]}
            className={cn(isInteractive && "histogram-bin")}
            role={isInteractive ? "button" : "presentation"}
            tabIndex={isInteractive ? 0 : undefined}
            aria-label={isInteractive ? `${bin[2]}: ${studentsInBin.length} ${t("detected.students").toLowerCase()}` : undefined}
            onClick={openBin}
            onKeyDown={(event) => {
              if (!isInteractive) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openBin();
              }
            }}
          >
            <rect data-grow x={x} y={y} width={barWidth} height={barHeight} rx="6" fill={bandColor(band.id)} />
            <text x={x + barWidth / 2} y={Math.max(14, y - 8)} textAnchor="middle">{counts[index]}</text>
            <text className="histogram-bin-tooltip chart-svg-tooltip" x={x + barWidth / 2} y={Math.max(14, y - 24)} textAnchor="middle">
              {histogramTooltipLabel(bin[2], studentsInBin, anonymised)}
            </text>
            <text x={x + barWidth / 2} y={bottom + 22} textAnchor="middle">{bin[2]}</text>
          </g>
        );
      })}
      {selectedMarker ? (
        <g className="histogram-selected-marker" transform={`translate(${selectedMarker.x}, ${selectedMarker.y})`}>
          <g className="histogram-selected-arrow">
            <path d="M 0 18 L -9 4 L -3 4 L -3 -8 L 3 -8 L 3 4 L 9 4 Z" />
            <text className="histogram-selected-label chart-svg-tooltip" x="0" y="-12" textAnchor="middle">{formatGrade(selected.finalWeighted)}</text>
          </g>
        </g>
      ) : null}
    </svg>
  );
}
