// Minimal, offline PDF text extractor for Skore report printouts (ReportLab output).
// Returns text runs with page positions. It follows the graphics state (q/Q/cm), the text
// matrix (Tm/Td/T*) and each font's ToUnicode table. No network, no third-party library.
// `inflate(bytes) -> Promise<Uint8Array>` must decode zlib/Flate data (browser: DecompressionStream).

const textDecoderUtf16 = typeof TextDecoder === "function" ? new TextDecoder("utf-16be") : null;

function toBinaryString(bytes) {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return out;
}

function fromBinaryString(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function ascii85Decode(text) {
  let input = text.replace(/\s+/g, "");
  if (input.startsWith("<~")) input = input.slice(2);
  const end = input.indexOf("~>");
  if (end >= 0) input = input.slice(0, end);
  const out = [];
  let group = [];
  for (const char of input) {
    if (char === "z" && group.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    group.push(char.charCodeAt(0) - 33);
    if (group.length === 5) {
      let value = 0;
      for (const digit of group) value = value * 85 + digit;
      out.push((value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255);
      group = [];
    }
  }
  if (group.length) {
    const missing = 5 - group.length;
    for (let i = 0; i < missing; i += 1) group.push(84);
    let value = 0;
    for (const digit of group) value = value * 85 + digit;
    const bytes = [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
    out.push(...bytes.slice(0, 4 - missing));
  }
  return new Uint8Array(out);
}

function parseObjects(binary) {
  const objects = new Map();
  const re = /(\d+)\s+0\s+obj\b/g;
  let match;
  while ((match = re.exec(binary))) {
    const start = match.index + match[0].length;
    const end = binary.indexOf("endobj", start);
    if (end < 0) break;
    objects.set(Number(match[1]), { body: binary.slice(start, end), offset: start });
    re.lastIndex = end;
  }
  return objects;
}

async function streamOf(object, binary, inflate) {
  if (!object) return null;
  const { body } = object;
  const streamMatch = /stream\r?\n/.exec(body);
  if (!streamMatch) return null;
  const startInBody = streamMatch.index + streamMatch[0].length;
  const endInBody = body.lastIndexOf("endstream");
  let data = body.slice(startInBody, endInBody).replace(/\r?\n$/, "");
  const dict = body.slice(0, streamMatch.index);
  const filters = (dict.match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/)?.[1] || "").match(/\/\w+/g) || [];
  let bytes = fromBinaryString(data);
  for (const filter of filters) {
    if (filter === "/ASCII85Decode" || filter === "/A85") bytes = ascii85Decode(toBinaryString(bytes));
    else if (filter === "/FlateDecode" || filter === "/Fl") bytes = await inflate(bytes);
    else throw new Error(`UNSUPPORTED_PDF_FILTER ${filter}`);
  }
  return toBinaryString(bytes);
}

function decodeHex(hex) {
  const clean = hex.replace(/\s+/g, "");
  const bytes = [];
  for (let i = 0; i < clean.length; i += 2) bytes.push(parseInt(clean.slice(i, i + 2).padEnd(2, "0"), 16));
  return bytes;
}

function utf16(hex) {
  const bytes = new Uint8Array(decodeHex(hex));
  if (textDecoderUtf16) return textDecoderUtf16.decode(bytes);
  let out = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
  return out;
}

function parseToUnicode(cmap) {
  const map = new Map();
  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      map.set(parseInt(pair[1], 16), utf16(pair[2]));
    }
  }
  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const range of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const from = parseInt(range[1], 16);
      const to = parseInt(range[2], 16);
      const base = utf16(range[3]);
      const baseCode = base.charCodeAt(base.length - 1);
      for (let code = from; code <= to; code += 1) {
        map.set(code, base.slice(0, -1) + String.fromCharCode(baseCode + (code - from)));
      }
    }
  }
  return map;
}

// ---- content stream tokenizer ----

function tokenize(content) {
  const tokens = [];
  let i = 0;
  const n = content.length;
  const isDelimiter = (c) => " \t\r\n\f\0()<>[]{}/%".includes(c);
  while (i < n) {
    const c = content[i];
    if (" \t\r\n\f\0".includes(c)) { i += 1; continue; }
    if (c === "%") { while (i < n && content[i] !== "\n" && content[i] !== "\r") i += 1; continue; }
    if (c === "(") {
      let depth = 1;
      let out = "";
      i += 1;
      while (i < n && depth > 0) {
        const ch = content[i];
        if (ch === "\\") {
          const next = content[i + 1];
          const escapes = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
          if (next in escapes) { out += escapes[next]; i += 2; continue; }
          if (/[0-7]/.test(next)) {
            const oct = content.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)[0];
            out += String.fromCharCode(parseInt(oct, 8));
            i += 1 + oct.length;
            continue;
          }
          if (next === "\r" || next === "\n") { i += next === "\r" && content[i + 2] === "\n" ? 3 : 2; continue; }
          i += 1;
          continue;
        }
        if (ch === "(") depth += 1;
        if (ch === ")") { depth -= 1; if (depth === 0) { i += 1; break; } }
        out += ch;
        i += 1;
      }
      tokens.push({ type: "string", value: out });
      continue;
    }
    if (c === "<" && content[i + 1] === "<") { tokens.push({ type: "op", value: "<<" }); i += 2; continue; }
    if (c === ">" && content[i + 1] === ">") { tokens.push({ type: "op", value: ">>" }); i += 2; continue; }
    if (c === "<") {
      const end = content.indexOf(">", i);
      tokens.push({ type: "hex", value: content.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (c === "[" || c === "]") { tokens.push({ type: c }); i += 1; continue; }
    if (c === "/") {
      let j = i + 1;
      while (j < n && !isDelimiter(content[j])) j += 1;
      tokens.push({ type: "name", value: content.slice(i + 1, j) });
      i = j;
      continue;
    }
    let j = i;
    while (j < n && !isDelimiter(content[j])) j += 1;
    if (j === i) { i += 1; continue; }
    const word = content.slice(i, j);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) tokens.push({ type: "number", value: Number(word) });
    else tokens.push({ type: "op", value: word });
    i = j;
  }
  return tokens;
}

const multiply = (m, n) => [
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
];

function runsFromContent(content, fonts) {
  // Inline images carry binary data between ID and EI: drop them before tokenizing.
  // The real EI stands on its own (whitespace around it); "EI" can also occur inside the image data.
  const tokens = tokenize(content.replace(/\bBI\b[\s\S]*?\sID\s[\s\S]*?\sEI(?=\s)/g, " "));
  const runs = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let tm = [1, 0, 0, 1, 0, 0];
  let lm = [1, 0, 0, 1, 0, 0];
  let leading = 0;
  let font = null;
  let size = 0;
  let operands = [];
  let current = null; // { text, x, y, cellX, cellY }

  const decode = (bytes) => {
    const cmap = fonts.get(font);
    return bytes.map((code) => (cmap?.has(code) ? cmap.get(code) : String.fromCharCode(code))).join("");
  };
  const flush = () => {
    if (current && current.text.trim()) runs.push({ ...current, text: current.text.replace(/\s+/g, " ").trim() });
    current = null;
  };
  const cellOrigin = () => multiply(lm, ctm);
  const show = (text) => {
    const pos = multiply(tm, ctm);
    if (!current) {
      const cell = cellOrigin();
      current = { text: "", x: pos[4], y: pos[5], cellX: cellX ?? cell[4], cellY: cellY ?? cell[5], size, font };
    }
    current.text += text;
  };
  let cellX = null;
  let cellY = null;

  for (const token of tokens) {
    if (token.type !== "op") {
      if (token.type === "[") operands.push({ type: "array-open", array: null });
      else if (token.type === "]") {
        const arr = [];
        while (operands.length && operands[operands.length - 1].type !== "array-open") arr.unshift(operands.pop());
        if (!operands.length) continue; // stray "]": ignore
        const holder = operands.pop();
        operands.push({ type: "array", array: arr });
      } else operands.push(token);
      continue;
    }
    const op = token.value;
    const num = (k) => operands[operands.length - k]?.value;
    switch (op) {
      case "q": stack.push(ctm); break;
      case "Q": ctm = stack.pop() || [1, 0, 0, 1, 0, 0]; break;
      case "cm": ctm = multiply([num(6), num(5), num(4), num(3), num(2), num(1)], ctm); break;
      case "BT": tm = [1, 0, 0, 1, 0, 0]; lm = [1, 0, 0, 1, 0, 0]; cellX = null; cellY = null; break;
      case "ET": flush(); break;
      case "Tf": font = operands[operands.length - 2]?.value; size = num(1); break;
      case "TL": leading = num(1); break;
      case "Tm": {
        flush();
        tm = [num(6), num(5), num(4), num(3), num(2), num(1)];
        lm = tm;
        const cell = multiply(lm, ctm);
        cellX = cell[4];
        cellY = cell[5];
        break;
      }
      case "Td": case "TD": {
        flush();
        if (op === "TD") leading = -num(1);
        lm = multiply([1, 0, 0, 1, num(2), num(1)], lm);
        tm = lm;
        break;
      }
      case "T*": flush(); lm = multiply([1, 0, 0, 1, 0, -leading], lm); tm = lm; break;
      case "Tj": case "'": case "\"": {
        if (op !== "Tj") { flush(); lm = multiply([1, 0, 0, 1, 0, -leading], lm); tm = lm; }
        const str = operands[operands.length - 1];
        if (str?.type === "string") show(decode([...str.value].map((ch) => ch.charCodeAt(0))));
        else if (str?.type === "hex") show(decode(decodeHex(str.value)));
        break;
      }
      case "TJ": {
        const arr = operands[operands.length - 1]?.array || [];
        let text = "";
        for (const part of arr) {
          if (part.type === "string") text += decode([...part.value].map((ch) => ch.charCodeAt(0)));
          else if (part.type === "hex") text += decode(decodeHex(part.value));
          else if (part.type === "number" && part.value < -200) text += " ";
        }
        show(text);
        break;
      }
      default: break;
    }
    operands = [];
  }
  flush();
  return runs;
}

/**
 * Extracts text runs per page: [{ page, runs: [{ text, x, y, cellX, cellY, size }] }].
 * `cellX/cellY` is the origin of the table cell (before centring), handy to find columns.
 */
export async function extractPdfTextRuns(bytes, { inflate }) {
  const binary = toBinaryString(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  if (!binary.startsWith("%PDF")) throw new Error("NOT_A_PDF");
  const objects = parseObjects(binary);

  // Font resource name -> ToUnicode map (from every font dictionary that names itself).
  const fonts = new Map();
  for (const [, object] of objects) {
    const name = object.body.match(/\/Name\s*\/([^\s/<>[\]()]+)/)?.[1];
    const toUnicode = object.body.match(/\/ToUnicode\s+(\d+)\s+0\s+R/)?.[1];
    if (/\/Type\s*\/Font/.test(object.body) && name && toUnicode) {
      const cmap = await streamOf(objects.get(Number(toUnicode)), binary, inflate);
      if (cmap) fonts.set(name, parseToUnicode(cmap));
    }
  }

  // Pages in document order (via the Kids of the page tree, falling back to object order).
  const pageObjects = [...objects.entries()].filter(([, object]) => /\/Type\s*\/Page\b/.test(object.body));
  const pages = [];
  for (const [, page] of pageObjects) {
    const refs = [];
    const single = page.body.match(/\/Contents\s+(\d+)\s+0\s+R/);
    const many = page.body.match(/\/Contents\s*\[([^\]]*)\]/);
    if (single) refs.push(Number(single[1]));
    else if (many) for (const ref of many[1].matchAll(/(\d+)\s+0\s+R/g)) refs.push(Number(ref[1]));
    let content = "";
    for (const ref of refs) content += `${await streamOf(objects.get(ref), binary, inflate) || ""}\n`;
    pages.push({ page: pages.length + 1, runs: runsFromContent(content, fonts) });
  }
  return pages;
}

/** Browser inflate (zlib) via DecompressionStream. */
export async function browserInflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
