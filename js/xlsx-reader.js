import { t } from "./i18n.js";

const TEXT_DECODER = new TextDecoder("utf-8");
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export async function readXlsxWorkbook(source, options = {}) {
  const buffer = await toArrayBuffer(source);
  const entries = await readZipEntries(buffer, options.inflateRaw);
  const sharedStrings = parseSharedStrings(await readOptionalText(entries, "xl/sharedStrings.xml"));
  const dateStyles = parseDateStyles(await readOptionalText(entries, "xl/styles.xml"));
  const workbookXml = parseXml(await readRequiredText(entries, "xl/workbook.xml"), "workbook.xml");
  const relsXml = parseXml(await readRequiredText(entries, "xl/_rels/workbook.xml.rels"), "workbook relationships");
  const relationships = parseRelationships(relsXml);
  const sheets = [];

  for (const sheetEl of elements(workbookXml, "sheet")) {
    const name = sheetEl.getAttribute("name") || "Sheet";
    const relationshipId = sheetEl.getAttribute("r:id") || sheetEl.getAttributeNS(REL_NS, "id");
    const target = relationships.get(relationshipId);
    if (!target) continue;

    const path = normaliseZipPath(target.startsWith("/") ? target.slice(1) : `xl/${target}`);
    const sheetXml = parseXml(await readRequiredText(entries, path), name);
    sheets.push(parseWorksheet(sheetXml, name, sharedStrings, dateStyles));
  }

  return {
    fileName: options.fileName || source?.name || "workbook.xlsx",
    sheetNames: sheets.map((sheet) => sheet.name),
    sheets,
  };
}

async function toArrayBuffer(source) {
  if (source instanceof ArrayBuffer) return source;
  if (ArrayBuffer.isView(source)) {
    return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  }
  if (source && typeof source.arrayBuffer === "function") return source.arrayBuffer();
  throw new Error(t("xlsx.unsupported"));
}

async function readZipEntries(buffer, inflateRawOverride) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const eocdOffset = findEndOfCentralDirectory(view);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map();
  let pointer = centralDirectoryOffset;

  for (let i = 0; i < totalEntries; i += 1) {
    const signature = view.getUint32(pointer, true);
    if (signature !== 0x02014b50) {
      throw new Error(t("xlsx.invalidZip"));
    }

    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const uncompressedSize = view.getUint32(pointer + 24, true);
    const fileNameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localHeaderOffset = view.getUint32(pointer + 42, true);
    const nameBytes = bytes.slice(pointer + 46, pointer + 46 + fileNameLength);
    const name = TEXT_DECODER.decode(nameBytes);

    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);

    let data;
    if (method === 0) {
      data = compressed;
    } else if (method === 8) {
      data = await inflateRaw(compressed, inflateRawOverride);
    } else {
      throw new Error(t("xlsx.unsupportedCompression", { method, name }));
    }

    if (uncompressedSize && data.length !== uncompressedSize) {
      data = data.slice(0, uncompressedSize);
    }
    entries.set(normaliseZipPath(name), data);
    pointer += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(view) {
  const minOffset = Math.max(0, view.byteLength - 22 - 65535);
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error(t("xlsx.noDirectory"));
}

async function inflateRaw(bytes, override) {
  if (override) return override(bytes);
  if (typeof DecompressionStream !== "function") {
    throw new Error(t("xlsx.noDecompress"));
  }

  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (error) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
}

async function readRequiredText(entries, path) {
  const bytes = entries.get(normaliseZipPath(path));
  if (!bytes) throw new Error(t("xlsx.missingPart", { path }));
  return TEXT_DECODER.decode(bytes);
}

async function readOptionalText(entries, path) {
  const bytes = entries.get(normaliseZipPath(path));
  return bytes ? TEXT_DECODER.decode(bytes) : "";
}

function parseXml(text, label) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (elements(doc, "parsererror").length) {
    throw new Error(t("xlsx.parseXml", { label }));
  }
  return doc;
}

function parseRelationships(doc) {
  const result = new Map();
  for (const rel of elements(doc, "Relationship")) {
    result.set(rel.getAttribute("Id"), rel.getAttribute("Target"));
  }
  return result;
}

function parseSharedStrings(text) {
  if (!text) return [];
  const doc = parseXml(text, "shared strings");
  return elements(doc, "si").map((si) => elements(si, "t").map((node) => node.textContent || "").join(""));
}

function parseDateStyles(text) {
  if (!text) return new Set();
  const doc = parseXml(text, "styles");
  const customFormats = new Map();
  const dateStyleIndexes = new Set();
  const builtinDateIds = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

  for (const fmt of elements(doc, "numFmt")) {
    const id = Number(fmt.getAttribute("numFmtId"));
    const code = fmt.getAttribute("formatCode") || "";
    if (Number.isFinite(id)) customFormats.set(id, code);
  }

  const cellXfs = elements(doc, "cellXfs")[0];
  if (!cellXfs) return dateStyleIndexes;

  Array.from(cellXfs.children).forEach((xf, index) => {
    if (localName(xf) !== "xf") return;
    const numFmtId = Number(xf.getAttribute("numFmtId"));
    const customCode = customFormats.get(numFmtId) || "";
    if (builtinDateIds.has(numFmtId) || looksLikeDateFormat(customCode)) {
      dateStyleIndexes.add(index);
    }
  });

  return dateStyleIndexes;
}

function looksLikeDateFormat(formatCode) {
  const cleaned = formatCode
    .replace(/"[^"]*"/g, "")
    .replace(/\\./g, "")
    .replace(/\[[^\]]+\]/g, "")
    .toLowerCase();
  return /(^|[^a-z])([ymdh]{1,4})([^a-z]|$)/.test(cleaned);
}

function parseWorksheet(doc, name, sharedStrings, dateStyles) {
  const rows = [];
  const sheetData = elements(doc, "sheetData")[0];
  if (!sheetData) return { name, rows: [], rowCount: 0, columnCount: 0 };

  for (const rowEl of elements(sheetData, "row")) {
    const declaredRow = Number(rowEl.getAttribute("r"));
    const rowIndex = Number.isFinite(declaredRow) && declaredRow > 0 ? declaredRow - 1 : rows.length;
    const row = rows[rowIndex] || [];

    for (const cellEl of elements(rowEl, "c")) {
      const ref = cellEl.getAttribute("r") || "";
      const colIndex = columnIndexFromRef(ref);
      row[colIndex] = parseCellValue(cellEl, sharedStrings, dateStyles);
    }
    rows[rowIndex] = row;
  }

  const trimmedRows = trimTrailingEmptyRows(rows.map(trimTrailingEmptyCells));
  return {
    name,
    rows: trimmedRows,
    rowCount: trimmedRows.length,
    columnCount: trimmedRows.reduce((max, row) => Math.max(max, row.length), 0),
  };
}

function parseCellValue(cellEl, sharedStrings, dateStyles) {
  const type = cellEl.getAttribute("t");
  const styleIndex = Number(cellEl.getAttribute("s"));

  if (type === "inlineStr") {
    const inline = elements(cellEl, "is")[0];
    return inline ? elements(inline, "t").map((node) => node.textContent || "").join("") : "";
  }

  const valueEl = elements(cellEl, "v")[0];
  if (!valueEl) return null;
  const raw = valueEl.textContent || "";

  if (type === "s") return sharedStrings[Number(raw)] ?? "";
  if (type === "b") return raw === "1";
  if (type === "str") return raw;

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    if (dateStyles.has(styleIndex)) return excelDateToIso(numeric);
    return numeric;
  }
  return raw;
}

function excelDateToIso(serial) {
  const millis = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return serial;
  return date.toISOString().slice(0, 10);
}

function elements(node, tagName) {
  return Array.from(node.getElementsByTagNameNS("*", tagName));
}

function localName(node) {
  return node.localName || node.nodeName;
}

function columnIndexFromRef(ref) {
  const letters = (ref.match(/[A-Z]+/i) || ["A"])[0].toUpperCase();
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return index - 1;
}

function trimTrailingEmptyCells(row) {
  const copy = row ? row.slice() : [];
  while (copy.length && isEmpty(copy[copy.length - 1])) copy.pop();
  return copy;
}

function trimTrailingEmptyRows(rows) {
  const copy = rows.slice();
  while (copy.length && copy[copy.length - 1].every(isEmpty)) copy.pop();
  return copy;
}

function isEmpty(value) {
  return value == null || value === "";
}

function normaliseZipPath(path) {
  const parts = [];
  for (const part of String(path).replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}
