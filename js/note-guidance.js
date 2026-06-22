export const RULE_ORIGINS = {
  SOURCE_BASED: "source_based",
  LOCAL_SCHOOL_POLICY: "local_school_policy",
  PRODUCT_HEURISTIC: "product_heuristic",
  TEACHER_INTERPRETATION: "teacher_interpretation",
};

export const DATA_SUPPORT_LEVELS = {
  LIMITED: "limited",
  SUFFICIENT: "sufficient",
  RICH: "rich",
};

export const NOTE_GUIDANCE_SOURCE = {
  title: "Feedback die het leren verbetert",
  publisher: "Stichting Leerpunt",
  recommendations: {
    foundation: { recommendation: 1, pages: [14, 23] },
    timingAndFocus: { recommendation: 2, pages: [24, 33] },
    uptakeAndAction: { recommendation: 3, pages: [34, 45] },
    writtenFeedback: { recommendation: 4, pages: [46, 49] },
    oralFeedback: { recommendation: 5, pages: [50, 53] },
    policy: { recommendation: 6, pages: [54, 57] },
  },
};

export const NOTE_RULES = {
  avoidPersonLabels: sourceRule("avoid_person_labels", "timingAndFocus"),
  separateStrengthsAndWorkPoints: sourceRule("separate_strengths_and_work_points", "timingAndFocus"),
  makeMissingInformationVisible: sourceRule("make_missing_information_visible", "foundation"),
  includePossibleNextStep: sourceRule("include_a_possible_next_step", "uptakeAndAction"),
  requireTeacherReview: sourceRule("require_teacher_review", "uptakeAndAction"),
  threshold50: {
    id: "result_threshold_50",
    origin: RULE_ORIGINS.LOCAL_SCHOOL_POLICY,
    source: null,
    configuredValue: 50,
  },
  threshold65: {
    id: "result_threshold_65",
    origin: RULE_ORIGINS.LOCAL_SCHOOL_POLICY,
    source: null,
    configuredValue: 65,
  },
  mainSubjectDefinitions: {
    id: "hoofdvak_definitions",
    origin: RULE_ORIGINS.LOCAL_SCHOOL_POLICY,
    source: null,
  },
  selectOnePrimaryPattern: {
    id: "selection_of_one_primary_pattern",
    origin: RULE_ORIGINS.PRODUCT_HEURISTIC,
    source: null,
  },
  trendDetection: {
    id: "trend_detection",
    origin: RULE_ORIGINS.PRODUCT_HEURISTIC,
    source: null,
  },
  volatilityDetection: {
    id: "volatility_detection",
    origin: RULE_ORIGINS.PRODUCT_HEURISTIC,
    source: null,
  },
  examDailyWorkGap: {
    id: "exam_daily_work_gap",
    origin: RULE_ORIGINS.PRODUCT_HEURISTIC,
    source: null,
  },
  missingEvaluationFlag: {
    id: "missing_evaluation_flag",
    origin: RULE_ORIGINS.PRODUCT_HEURISTIC,
    source: null,
  },
};

const SUBJECT_THRESHOLD = 65;
const VERY_LOW_THRESHOLD = 50;
const MAIN_SUBJECT_THRESHOLD = 60;
const CATEGORY_WEAK_THRESHOLD = 55;
const HIGH_VOLATILITY = 16;
const STRONG_GAP = 18;
const MISSING_EVALUATION_LIMIT = 2;

const SUBJECT_TEMPLATES = {
  below_configured_threshold: {
    observation: "De jaarscore ligt onder de ingestelde opvolgingsgrens.",
    strength: "",
    concern: "Bekijk samen met de leerling welke onderdelen de resultaten het sterkst beinvloeden.",
    nextAction: "Bepaal een concrete vervolgstap en vul deze notitie aan met relevante observaties uit de klas.",
  },
  well_below_configured_threshold: {
    observation: "De jaarscore ligt ruim onder de ingestelde grenswaarde.",
    strength: "",
    concern: "Bespreek welke ondersteuning al werd aangeboden en welke onderdelen verdere remediering vragen.",
    nextAction: "Gebruik orientering alleen wanneer dit deel uitmaakt van de lokale procedure en jij dit zelf bevestigt.",
  },
  exam_lower_than_daily_work: {
    observation: "De examenresultaten liggen lager dan de resultaten voor dagelijks werk.",
    strength: "Voor kleinere of tussentijdse evaluaties is er bruikbaar resultaatbewijs.",
    concern: "Het verschil tussen beide evaluatievormen verdient verdere bespreking.",
    nextAction: "Bespreek welke verschillen in leerstofomvang, voorbereiding of toetsvorm mogelijk een rol spelen en spreek een aanpak af voor de volgende vergelijkbare evaluatie.",
  },
  daily_work_lower_than_exam: {
    observation: "De examenresultaten liggen hoger dan de resultaten voor dagelijks werk.",
    strength: "Bij grotere of samenvattende evaluaties toont de leerling sterker resultaatbewijs.",
    concern: "Het verschil met dagelijks werk verdient verdere bespreking.",
    nextAction: "Ga na welke factoren het verschil mogelijk verklaren en bespreek hoe de sterkere aanpak ook tijdens het semester kan worden toegepast.",
  },
  high_variation: {
    observation: "De resultaten schommelen sterk tussen de beschikbare evaluaties.",
    strength: "",
    concern: "Het patroon vraagt context voordat er een inhoudelijk besluit aan wordt gekoppeld.",
    nextAction: "Ga samen na of verschillen in leerstof, toetsvorm, afwezigheid of voorbereiding hierbij een rol spelen.",
  },
  weak_category: {
    observation: "De resultaten liggen het laagst binnen de categorie '{categoryName}'.",
    strength: "",
    concern: "Controleer welke leerdoelen en evaluatieonderdelen hierin zijn opgenomen.",
    nextAction: "Bepaal daarna welke oefening, herhaling of ondersteuning het meest relevant is.",
  },
  stable_strong_results: {
    observation: "De beschikbare resultaten zijn sterk en stabiel.",
    strength: "De leerling toont over meerdere evaluaties heen een betrouwbaar resultaatpatroon.",
    concern: "",
    nextAction: "Benoem concreet voor welke onderdelen de leerling goed presteert en voorzie een volgende opdracht die voldoende uitdaging biedt.",
  },
  missing_results: {
    observation: "Voor meerdere verwachte evaluaties ontbreekt momenteel een resultaat.",
    strength: "",
    concern: "De gegevensbasis is daardoor te beperkt voor een stevig inhoudelijk besluit.",
    nextAction: "Controleer eerst afwezigheden, inhaalmomenten en administratieve gegevens.",
  },
  no_clear_pattern: {
    observation: "De beschikbare gegevens tonen geen opvallend resultaatpatroon.",
    strength: "",
    concern: "",
    nextAction: "Vul de notitie alleen aan wanneer observaties uit de klas of andere relevante informatie verdere bespreking nodig maken.",
  },
};

const CLASS_TEACHER_TEMPLATES = {
  main_subject_below_threshold: {
    observation: "De resultaten voor een of meer hoofdvakken liggen onder de ingestelde opvolgingsgrens.",
    strength: "",
    concern: "Dit vraagt overleg met de betrokken vakleraren voordat er conclusies worden geformuleerd.",
    nextAction: "Bepaal samen welke vakgerichte ondersteuning of bijkomende informatie nodig is.",
  },
  multiple_subjects_below_threshold: {
    observation: "De resultaten voor meerdere vakken liggen onder de ingestelde opvolgingsgrens.",
    strength: "",
    concern: "Bekijk in de klassenraad of er een gemeenschappelijk patroon zichtbaar is.",
    nextAction: "Vermijd conclusies over oorzaken zonder aanvullende informatie en breng in kaart welke ondersteuning al werd aangeboden.",
  },
  overall_result_requires_follow_up: {
    observation: "Het algemene resultatenoverzicht vraagt verdere opvolging.",
    strength: "",
    concern: "Bekijk dit samen met de resultaten en observaties per vak.",
    nextAction: "Formuleer pas daarna een besluit of afspraak.",
  },
  limited_data: {
    observation: "Er zijn te weinig volledige evaluatiegegevens beschikbaar om een voldoende onderbouwd besluit te formuleren.",
    strength: "",
    concern: "Ontbrekende of administratieve gegevens kunnen het beeld vertekenen.",
    nextAction: "Controleer afwezigheden, inhaalmomenten en ontbrekende resultaten.",
  },
  stable_overall_results: {
    observation: "De resultaten zijn over de verschillende vakken heen stabiel.",
    strength: "Het algemene beeld toont geen brede alarmzone.",
    concern: "Controleer wel of er binnen afzonderlijke vakken nog aandachtspunten zijn.",
    nextAction: "Benoem waar nodig concrete sterke punten en stem verdere opvolging af met de betrokken vakleraren.",
  },
  no_clear_pattern: {
    observation: "De beschikbare gegevens tonen geen opvallend breed patroon.",
    strength: "",
    concern: "",
    nextAction: "Vul de notitie alleen aan wanneer observaties van vakleraren verdere bespreking nodig maken.",
  },
};

const PROHIBITED_PATTERNS = [
  /\blui\b/i,
  /\bslim\b/i,
  /\bdom\b/i,
  /\bongemotiveerd\b/i,
  /\bgeen inzet\b/i,
  /\bwerkt niet\b/i,
  /\bkan dit niet\b/i,
  /\bzwakke leerling\b/i,
  /\bsterke leerling\b/i,
  /\bgeen talent\b/i,
  /\bniet geschikt voor\b/i,
  /\bheeft geen inzicht\b/i,
];

const CAUSAL_PATTERNS = [
  /\bdoordat\b/i,
  /\bomdat\b/i,
  /\bbewijst\b/i,
  /\btoont aan dat\b/i,
  /\bis het gevolg van\b/i,
  /\bheeft moeite met\b/i,
];

export function buildSubjectTeacherNoteContext(student, peers = []) {
  const finalWeighted = numberOrNull(student?.finalWeighted);
  const dataSupportLevel = subjectDataSupportLevel(student);
  const categoryRows = student?.categoryRows || [];
  const weakestCategory = weakestCategoryRow(categoryRows);
  const missingCount = student?.evidence?.missingRequired || 0;
  const trend = student?.trend || {};
  const dwExamGap = student?.dwExamGap || null;
  const primaryPattern = deriveSubjectTeacherPrimaryPattern({
    student,
    finalWeighted,
    dataSupportLevel,
    weakestCategory,
    missingCount,
    trend,
    dwExamGap,
  });
  const samePatternShare = peers.length
    ? peers.filter((peer) => deriveSubjectTeacherPrimaryPattern({
      student: peer,
      finalWeighted: numberOrNull(peer?.finalWeighted),
      dataSupportLevel: subjectDataSupportLevel(peer),
      weakestCategory: weakestCategoryRow(peer?.categoryRows || []),
      missingCount: peer?.evidence?.missingRequired || 0,
      trend: peer?.trend || {},
      dwExamGap: peer?.dwExamGap || null,
    }) === primaryPattern).length / peers.length
    : 0;

  const supportingData = [
    finalWeighted != null ? `Jaarscore: ${formatScore(finalWeighted)}%.` : "",
    missingCount ? `Ontbrekende evaluaties: ${missingCount}.` : "",
    Number.isFinite(trend?.volatility) ? `Schommeling tussen evaluaties: ${formatScore(trend.volatility)} punten.` : "",
    dwExamGap ? `Verschil dagelijks werk en examen: ${formatScore(Math.abs(dwExamGap.gap))} punten.` : "",
    weakestCategory ? `Laagste categorie: ${weakestCategory.category} (${formatScore(weakestCategory.rawPercentage)}%).` : "",
  ].filter(Boolean);

  return {
    mode: "vakdocent",
    studentId: student?.id || "",
    dataSupportLevel,
    primaryPattern,
    recipientScope: deriveRecipientScope(samePatternShare),
    supportingData,
    missingInformation: missingInformationForSubject(student, dataSupportLevel),
    observableStrengths: subjectStrengths(student, primaryPattern),
    observableConcerns: subjectConcerns(primaryPattern, weakestCategory),
    possibleNextActions: [],
    warnings: warningsForContext(dataSupportLevel),
    appliedRules: baseAppliedRules(primaryPattern),
    details: {
      finalWeighted,
      weakestCategory,
      missingCount,
      trend,
      dwExamGap,
      samePatternShare,
    },
  };
}

export function buildClassTeacherNoteContext(student, analysis = {}) {
  const finalWeighted = numberOrNull(student?.finalWeighted);
  const dataSupportLevel = classTeacherDataSupportLevel(student, analysis);
  const alarmLists = classTeacherAlarmLists(student);
  const primaryPattern = deriveClassTeacherPrimaryPattern({ student, finalWeighted, dataSupportLevel, alarmLists });
  const samePatternShare = analysis?.students?.length
    ? analysis.students.filter((peer) => deriveClassTeacherPrimaryPattern({
      student: peer,
      finalWeighted: numberOrNull(peer?.finalWeighted),
      dataSupportLevel: classTeacherDataSupportLevel(peer, analysis),
      alarmLists: classTeacherAlarmLists(peer),
    }) === primaryPattern).length / analysis.students.length
    : 0;

  const supportingData = [
    finalWeighted != null ? `Jaartotaal: ${formatScore(finalWeighted)}%.` : "",
    alarmLists.mainSubjects.length ? `Hoofdvakken onder opvolgingsgrens: ${alarmLists.mainSubjects.join(", ")}.` : "",
    alarmLists.otherSubjects.length ? `Andere vakken onder opvolgingsgrens: ${alarmLists.otherSubjects.join(", ")}.` : "",
    Number.isFinite(student?.subjectSpread?.stddev) ? `Spreiding tussen vakken: ${formatScore(student.subjectSpread.stddev)} punten.` : "",
  ].filter(Boolean);

  return {
    mode: "klassenleraar",
    studentId: student?.id || "",
    dataSupportLevel,
    primaryPattern,
    recipientScope: deriveRecipientScope(samePatternShare),
    supportingData,
    missingInformation: missingInformationForClassTeacher(student, analysis, dataSupportLevel),
    observableStrengths: classTeacherStrengths(student, primaryPattern),
    observableConcerns: classTeacherConcerns(primaryPattern, alarmLists),
    possibleNextActions: [],
    warnings: warningsForContext(dataSupportLevel),
    appliedRules: baseAppliedRules(primaryPattern).concat([NOTE_RULES.mainSubjectDefinitions]),
    details: {
      finalWeighted,
      alarmLists,
      samePatternShare,
    },
  };
}

export function derivePrimaryPattern(context) {
  return context?.primaryPattern || "no_clear_pattern";
}

export function deriveRecipientScope(patternShare = 0) {
  if (patternShare >= 0.5) return "whole_class";
  if (patternShare >= 0.25) return "subject_group";
  return "individual";
}

export function generateNoteSuggestion(context) {
  const templates = context.mode === "klassenleraar" ? CLASS_TEACHER_TEMPLATES : SUBJECT_TEMPLATES;
  const template = templates[context.primaryPattern] || templates.no_clear_pattern;
  const text = composeSuggestionText(template, context);
  const suggestion = {
    mode: context.mode,
    primaryPattern: context.primaryPattern,
    dataSupportLevel: context.dataSupportLevel,
    recipientScope: context.recipientScope,
    text,
    supportingData: context.supportingData,
    missingInformation: context.missingInformation,
    possibleNextAction: template.nextAction,
    warnings: context.warnings,
    appliedRules: context.appliedRules,
  };
  return {
    ...suggestion,
    validation: validateNoteSuggestion(suggestion, context),
  };
}

export function generateSubjectTeacherNoteSuggestion(student, peers = []) {
  return generateNoteSuggestion(buildSubjectTeacherNoteContext(student, peers));
}

export function generateClassTeacherNoteSuggestion(student, analysis = {}) {
  return generateNoteSuggestion(buildClassTeacherNoteContext(student, analysis));
}

export function validateNoteSuggestion(suggestion, context = {}) {
  const warnings = [];
  const text = suggestion?.text || "";
  if (!suggestion?.supportingData?.length) warnings.push("Geen concrete gegevensverwijzing gevonden.");
  if (!suggestion?.possibleNextAction) warnings.push("Geen mogelijke vervolgstap gevonden.");
  if (!suggestion?.missingInformation?.length) warnings.push("Ontbrekende informatie is niet expliciet vermeld.");
  if (PROHIBITED_PATTERNS.some((pattern) => pattern.test(text))) {
    warnings.push("Het voorstel bevat mogelijk persoonsgerichte taal.");
  }
  if (context.dataSupportLevel !== DATA_SUPPORT_LEVELS.RICH && CAUSAL_PATTERNS.some((pattern) => pattern.test(text))) {
    warnings.push("Het voorstel bevat mogelijk oorzakelijke taal terwijl de gegevens alleen een patroon tonen.");
  }
  return {
    ok: !warnings.length,
    warnings,
  };
}

export function appendSuggestionToNote(existingNote, suggestionText) {
  const current = String(existingNote || "").trimEnd();
  const addition = String(suggestionText || "").trim();
  if (!addition) return current;
  return current ? `${current}\n\n${addition}` : addition;
}

function sourceRule(id, recommendationKey) {
  const source = NOTE_GUIDANCE_SOURCE.recommendations[recommendationKey];
  return {
    id,
    origin: RULE_ORIGINS.SOURCE_BASED,
    source: {
      title: NOTE_GUIDANCE_SOURCE.title,
      recommendation: source.recommendation,
      pages: source.pages,
    },
  };
}

function subjectDataSupportLevel(student) {
  const periodScores = student?.trend?.periodScores || [];
  const categoryRows = student?.categoryRows || [];
  const expected = student?.evidence?.expectedRequired || 0;
  const missing = student?.evidence?.missingRequired || 0;
  const coverage = expected ? 1 - (missing / expected) : 0;
  const hasCategoryData = categoryRows.some((row) => Number.isFinite(row?.rawPercentage));
  if (periodScores.length < 2 || !hasCategoryData || coverage < 0.7 || missing >= MISSING_EVALUATION_LIMIT) {
    return DATA_SUPPORT_LEVELS.LIMITED;
  }
  return DATA_SUPPORT_LEVELS.SUFFICIENT;
}

function classTeacherDataSupportLevel(student, analysis) {
  const subjectLines = student?.subjectLines || [];
  const availableSubjectScores = subjectLines.filter((line) => Number.isFinite(scoreForSubjectLine(line)));
  const periods = analysis?.periods || [];
  const overallPoints = student?.overallTrend?.points || [];
  if (availableSubjectScores.length < 3 || (periods.length && overallPoints.filter((point) => Number.isFinite(point?.value)).length < Math.min(2, periods.length))) {
    return DATA_SUPPORT_LEVELS.LIMITED;
  }
  return DATA_SUPPORT_LEVELS.SUFFICIENT;
}

function deriveSubjectTeacherPrimaryPattern(input) {
  if (input.dataSupportLevel === DATA_SUPPORT_LEVELS.LIMITED && (input.missingCount >= MISSING_EVALUATION_LIMIT || !input.student?.categoryRows?.length)) {
    return "missing_results";
  }
  if (input.finalWeighted != null && input.finalWeighted < VERY_LOW_THRESHOLD) return "well_below_configured_threshold";
  if (input.finalWeighted != null && input.finalWeighted < SUBJECT_THRESHOLD) return "below_configured_threshold";
  if (input.dwExamGap && input.dwExamGap.gap <= -STRONG_GAP) return "exam_lower_than_daily_work";
  if (input.dwExamGap && input.dwExamGap.gap >= STRONG_GAP) return "daily_work_lower_than_exam";
  if (Number.isFinite(input.trend?.volatility) && input.trend.volatility >= HIGH_VOLATILITY) return "high_variation";
  if (input.weakestCategory && input.weakestCategory.rawPercentage < CATEGORY_WEAK_THRESHOLD) return "weak_category";
  if (input.finalWeighted != null && input.finalWeighted >= 75 && input.trend?.volatility != null && input.trend.volatility < 8) {
    return "stable_strong_results";
  }
  return "no_clear_pattern";
}

function deriveClassTeacherPrimaryPattern({ student, finalWeighted, dataSupportLevel, alarmLists }) {
  if (dataSupportLevel === DATA_SUPPORT_LEVELS.LIMITED) return "limited_data";
  if (alarmLists.mainSubjects.length) return "main_subject_below_threshold";
  if ((alarmLists.mainSubjects.length + alarmLists.otherSubjects.length) >= 2) return "multiple_subjects_below_threshold";
  if (finalWeighted != null && finalWeighted < SUBJECT_THRESHOLD) return "overall_result_requires_follow_up";
  if (student?.flags?.some((flag) => flag.type === "positive_stable_profile")) return "stable_overall_results";
  return "no_clear_pattern";
}

function composeSuggestionText(template, context) {
  const values = {
    categoryName: context.details?.weakestCategory?.category || "deze categorie",
  };
  const parts = [
    replaceTemplate(template.observation, values),
    replaceTemplate(template.strength, values),
    replaceTemplate(template.concern, values),
    replaceTemplate(template.nextAction, values),
  ].filter(Boolean);
  return parts.join(" ");
}

function replaceTemplate(text, values) {
  return String(text || "").replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function weakestCategoryRow(rows = []) {
  return rows
    .filter((row) => Number.isFinite(row?.rawPercentage) && row?.hasAvailableEvidence !== false)
    .sort((a, b) => a.rawPercentage - b.rawPercentage)[0] || null;
}

function classTeacherAlarmLists(student) {
  const mainSubjects = [];
  const otherSubjects = [];
  for (const line of student?.subjectLines || []) {
    const score = scoreForSubjectLine(line);
    if (!Number.isFinite(score) || score >= MAIN_SUBJECT_THRESHOLD) continue;
    const entry = `${line.subject} ${formatScore(score)}%`;
    if (line.isKeySubject) mainSubjects.push(entry);
    else otherSubjects.push(entry);
  }
  return { mainSubjects, otherSubjects };
}

function scoreForSubjectLine(line) {
  if (Number.isFinite(line?.yearScore)) return line.yearScore;
  if (Number.isFinite(line?.latestScore)) return line.latestScore;
  return null;
}

function missingInformationForSubject(student, dataSupportLevel) {
  const missing = [];
  if (dataSupportLevel === DATA_SUPPORT_LEVELS.LIMITED) {
    missing.push("Controleer of alle relevante evaluaties, inhaalmomenten en administratieve gegevens correct zijn verwerkt.");
  }
  if (!(student?.categoryRows || []).length) {
    missing.push("Er zijn geen bruikbare categoriegegevens beschikbaar.");
  }
  if ((student?.trend?.periodScores || []).length < 2) {
    missing.push("Er zijn te weinig evaluatiemomenten voor een betrouwbaar verloop doorheen het jaar.");
  }
  if (!missing.length) {
    missing.push("Voeg indien nodig klasobservaties toe, want cijfers verklaren geen oorzaken.");
  }
  return missing;
}

function missingInformationForClassTeacher(student, analysis, dataSupportLevel) {
  const missing = [];
  if (dataSupportLevel === DATA_SUPPORT_LEVELS.LIMITED) {
    missing.push("Controleer of alle rapportperiodes, vakken en ontbrekende resultaten correct gekoppeld zijn.");
  }
  if (!analysis?.track?.id) {
    missing.push("De richting of hoofdvakken zijn nog niet volledig bevestigd.");
  }
  if (!missing.length) {
    missing.push("Voeg input van betrokken vakleraren toe voordat je een besluit formuleert.");
  }
  return missing;
}

function subjectStrengths(student, primaryPattern) {
  if (primaryPattern === "stable_strong_results") return ["Sterk en stabiel resultaatpatroon."];
  if (primaryPattern === "exam_lower_than_daily_work") return ["Dagelijks werk bevat bruikbaar positief resultaatbewijs."];
  if (primaryPattern === "daily_work_lower_than_exam") return ["Examenresultaat bevat bruikbaar positief resultaatbewijs."];
  if (numberOrNull(student?.finalWeighted) >= 75) return ["Jaarscore ligt in een sterke zone."];
  return [];
}

function subjectConcerns(primaryPattern, weakestCategory) {
  if (primaryPattern === "weak_category" && weakestCategory) return [`Laagste categorie: ${weakestCategory.category}.`];
  if (primaryPattern === "missing_results") return ["Ontbrekende resultaten beperken de interpretatie."];
  return [];
}

function classTeacherStrengths(student, primaryPattern) {
  if (primaryPattern === "stable_overall_results") return ["Stabiel algemeen resultatenbeeld."];
  if (numberOrNull(student?.finalWeighted) >= 75) return ["Algemeen jaartotaal ligt in een sterke zone."];
  return [];
}

function classTeacherConcerns(primaryPattern, alarmLists) {
  if (primaryPattern === "main_subject_below_threshold") return [`Hoofdvakken onder opvolgingsgrens: ${alarmLists.mainSubjects.join(", ")}.`];
  if (primaryPattern === "multiple_subjects_below_threshold") return [`Vakken onder opvolgingsgrens: ${alarmLists.mainSubjects.concat(alarmLists.otherSubjects).join(", ")}.`];
  if (primaryPattern === "limited_data") return ["Beperkte gegevensbasis."];
  return [];
}

function warningsForContext(dataSupportLevel) {
  if (dataSupportLevel === DATA_SUPPORT_LEVELS.LIMITED) {
    return ["Beperkte gegevensbasis: formuleer voorzichtig en controleer ontbrekende informatie."];
  }
  return ["Dit voorstel beschrijft resultaatpatronen, geen oorzaken. Leraargoedkeuring blijft nodig."];
}

function baseAppliedRules(primaryPattern) {
  const rules = [
    NOTE_RULES.avoidPersonLabels,
    NOTE_RULES.separateStrengthsAndWorkPoints,
    NOTE_RULES.makeMissingInformationVisible,
    NOTE_RULES.includePossibleNextStep,
    NOTE_RULES.requireTeacherReview,
    NOTE_RULES.selectOnePrimaryPattern,
  ];
  if (primaryPattern.includes("threshold")) rules.push(NOTE_RULES.threshold65);
  if (primaryPattern === "well_below_configured_threshold") rules.push(NOTE_RULES.threshold50);
  if (primaryPattern.includes("variation")) rules.push(NOTE_RULES.volatilityDetection);
  if (primaryPattern.includes("exam") || primaryPattern.includes("daily_work")) rules.push(NOTE_RULES.examDailyWorkGap);
  if (primaryPattern.includes("missing") || primaryPattern === "limited_data") rules.push(NOTE_RULES.missingEvaluationFlag);
  return rules;
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function formatScore(value) {
  if (!Number.isFinite(value)) return "n.v.t.";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
