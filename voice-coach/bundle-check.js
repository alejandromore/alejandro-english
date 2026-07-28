// js/state.js
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5";
env.allowLocalModels = false;
var state = {
  lang: "english",
  size: "base",
  doSentiment: true,
  compareRead: false,
  voice: "system",
  docView: "simple",
  asr: null,
  asrKey: null,
  sentiment: null,
  recording: false,
  mediaRecorder: null,
  chunks: [],
  stream: null,
  timerId: null,
  startedAt: 0,
  last: null,
  docxUrl: null,
  wpImproveWords: [],
  analyzeCanceled: false
};
var $ = (id) => document.getElementById(id);
function wireSeg(segId, key) {
  $(segId).querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      $(segId).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      state[key] = b.dataset[key] || b.dataset.lang || b.dataset.size;
    });
  });
}
function fmtDur(s) {
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m ? `${m}m ${r}s` : `${r}s`;
}
var _statusEl = () => $("status");
var _bar = () => $("bar");
var _barFill = () => {
  const b = $("bar");
  return b ? b.querySelector("i") : null;
};
function setStatus(msg, isErr = false) {
  const el = _statusEl();
  if (!el) return;
  el.innerHTML = msg;
  el.classList.toggle("err", isErr);
}
function showBar(busy = true) {
  const b = _bar();
  if (!b) return;
  b.style.display = "block";
  b.classList.toggle("busy", busy);
}
function setBar2(p) {
  const f = _barFill();
  if (!f) return;
  f.style.width = Math.max(0, Math.min(100, p)) + "%";
}
function hideBar() {
  const b = _bar();
  if (!b) return;
  b.style.display = "none";
  setBar2(0);
}

// js/i18n.js
var UI_STRINGS = {
  english: {
    play: "Play",
    stop: "Stop",
    generating: "Generating.",
    dlmp3: "Download MP3",
    phon: "\u{1F524}\xA0Phonetics",
    words: "\u{1F3AF}\xA0Words",
    newq: "\u21BB\xA0New phrase",
    paragraph: "\xB6\xA0Paragraph",
    loading: "Fetching.",
    promptLbl: "Practice prompt",
    promptPh: "Type or paste the text you want to practice or hear.",
    setup: "Setup",
    accuracy: "Accuracy vs. speed",
    sentiment: "Sentiment analysis",
    compareRead: "Compare reading",
    readingVoice: "Reading voice",
    engine: "Engine (Words mode)",
    record: "Record",
    upload: "\u2191\xA0Upload audio",
    or: "or",
    pause: "Pause",
    resume: "Resume",
    docView: "Text view",
    docSimple: "Simple",
    docDoc: "Document",
    warmVoice: "\u2699\xA0Prepare voice",
    voiceSystem: "System",
    voiceOrator: "Orator",
    uploadHint: "Uploading a phone recording? In the picker, choose <b>More \u2192 Files</b>, then open <b>Recordings</b>."
  },
  spanish: {
    play: "Reproducir",
    stop: "Detener",
    generating: "Generando voz.",
    dlmp3: "Descargar MP3",
    phon: "\u{1F524}\xA0Fon\xE9tica",
    words: "\u{1F3AF}\xA0Palabras",
    newq: "\u21BB\xA0Nueva frase",
    paragraph: "\xB6\xA0P\xE1rrafo",
    loading: "Buscando.",
    promptLbl: "Texto de pr\xE1ctica",
    promptPh: "Escribe o pega el texto que quieres practicar o escuchar.",
    setup: "Configuraci\xF3n",
    accuracy: "Precisi\xF3n vs. velocidad",
    sentiment: "An\xE1lisis de sentimiento",
    compareRead: "Comparar lectura",
    readingVoice: "Voz de lectura",
    engine: "Motor (modo Palabras)",
    record: "Grabar",
    upload: "\u2191\xA0Subir audio",
    or: "o",
    pause: "Pausa",
    resume: "Reanudar",
    docView: "Vista del texto",
    docSimple: "Simple",
    docDoc: "Documento",
    warmVoice: "\u2699\xA0Preparar voz",
    voiceSystem: "Sistema",
    voiceOrator: "Orador",
    uploadHint: "\xBFSubir una grabaci\xF3n del tel\xE9fono? En el selector elige <b>More \u2192 Files</b> y abre <b>Recordings</b>."
  },
  portuguese: {
    play: "Reproduzir",
    stop: "Parar",
    generating: "Gerando voz...",
    dlmp3: "Baixar MP3",
    phon: "\u{1F524}\xA0Fonetica",
    words: "\u{1F3AF}\xA0Palavras",
    newq: "\u21BB\xA0Nova frase",
    paragraph: "\xB6\xA0Par\xE1grafo",
    loading: "Buscando...",
    promptLbl: "Texto de pratica",
    promptPh: "Escreva ou cole o texto que quer praticar ou ouvir...",
    setup: "Configuracao",
    accuracy: "Precisao vs. velocidade",
    sentiment: "Analise de sentimento",
    compareRead: "Comparar leitura",
    readingVoice: "Voz de leitura",
    engine: "Motor (modo Palabras)",
    record: "Gravar",
    upload: "Subir audio",
    or: "ou",
    pause: "Pausar",
    resume: "Retomar",
    docView: "Vista do texto",
    docSimple: "Simples",
    docDoc: "Documento",
    voiceSystem: "Sistema",
    voiceOrator: "Orador",
    uploadHint: "Subindo uma gravacao do telefone? No seletor escolha <b>More > Files</b> e abra <b>Recordings</b>."
  }
};
function t(key) {
  const s = UI_STRINGS[state.lang] || UI_STRINGS.english;
  return key in s ? s[key] : key;
}
function speakStopLabel() {
  return t("stop");
}

// js/docx.js
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => res();
    s.onerror = () => rej(new Error("No se pudo cargar " + src));
    document.head.appendChild(s);
  });
}
async function ensureDocxLibs() {
  if (!window.html2canvas) await loadScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");
  if (!window.docx) await loadScript("https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js");
}
async function elementToPng(el) {
  const canvas = await window.html2canvas(el, { backgroundColor: "#ffffff", scale: 2, logging: false, useCORS: true });
  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  const data = new Uint8Array(await blob.arrayBuffer());
  return { data, w: canvas.width, h: canvas.height };
}
function hexFor(p) {
  return p >= 0.6 ? "1f9d6b" : p <= 0.4 ? "d8232a" : "d39a14";
}
async function buildDocxBlob() {
  await ensureDocxLibs();
  const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } = window.docx;
  const last = state.last;
  const withSent = last.sentiment !== false;
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
    }
  }
  const metricsImg = await elementToPng($("metrics"));
  const arcImg = withSent ? await elementToPng(document.getElementById("sentWrap")) : null;
  const imgPara = (img, maxW = 600) => {
    const w = Math.min(maxW, img.w);
    const h = Math.round(w * img.h / img.w);
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [new ImageRun({ data: img.data, transformation: { width: Math.round(w), height: h } })]
    });
  };
  const langLabel = last.lang === "spanish" ? "Espa\xF1ol" : last.lang === "portuguese" ? "Portugu\xE9s" : "English";
  const meta = `Idioma: ${langLabel}  |  Duraci\xF3n: ${fmtDur(last.duration)}  |  Palabras: ${last.words}  |  Ritmo: ${last.wpm} ppm` + (withSent ? `  |  Positividad: ${(last.overall * 100).toFixed(0)}%` : "") + `  |  Muletillas: ${last.fillers.total}  |  Generado: ${(/* @__PURE__ */ new Date()).toLocaleString()}`;
  const sentenceRuns = last.sentences.map(
    (s) => new TextRun({ text: s.text + " ", color: withSent ? hexFor(s.positivity) : "1a2233" })
  );
  const children = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "Voice Coach - An\xE1lisis de voz" })] }),
    new Paragraph({ spacing: { after: 260 }, children: [new TextRun({ text: meta, italics: true, color: "6b7686", size: 18 })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "M\xE9tricas" })] }),
    imgPara(metricsImg)
  ];
  if (withSent) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Arco de sentimiento" })] }),
      imgPara(arcImg)
    );
  }
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: "Transcripci\xF3n" })] }),
    new Paragraph({ spacing: { line: 320 }, children: sentenceRuns })
  );
  if (withSent) {
    children.push(
      new Paragraph({ spacing: { before: 220 }, children: [new TextRun({ text: "Color del texto - Verde: positivo | Amarillo: neutral | Rojo: negativo", italics: true, color: "6b7686", size: 16 })] })
    );
  }
  const document_ = new Document({ sections: [{ properties: {}, children }] });
  return await Packer.toBlob(document_);
}

// js/phonetics.js
var cmudict = null;
var phonDebounce = null;
async function ensureDict() {
  if (cmudict) return cmudict;
  const mod = await import("https://cdn.jsdelivr.net/npm/cmu-pronouncing-dictionary@3.0.0/index.js");
  cmudict = mod.dictionary || mod.default || mod;
  return cmudict;
}
var PH_VOWELS = /* @__PURE__ */ new Set(["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"]);
var ARPA_IPA = {
  AA: "\u0251",
  AE: "\xE6",
  AH: "\u0259",
  AO: "\u0254",
  AW: "a\u028A",
  AY: "a\u026A",
  EH: "\u025B",
  ER: "\u025D",
  EY: "e\u026A",
  IH: "\u026A",
  IY: "i",
  OW: "o\u028A",
  OY: "\u0254\u026A",
  UH: "\u028A",
  UW: "u",
  B: "b",
  CH: "t\u0283",
  D: "d",
  DH: "\xF0",
  F: "f",
  G: "g",
  HH: "h",
  JH: "d\u0292",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "\u014B",
  P: "p",
  R: "\u0279",
  S: "s",
  SH: "\u0283",
  T: "t",
  TH: "\u03B8",
  V: "v",
  W: "w",
  Y: "j",
  Z: "z",
  ZH: "\u0292"
};
var ARPA_ES = {
  AA: "a",
  AE: "a",
  AH: "a",
  AO: "o",
  AW: "au",
  AY: "ai",
  EH: "e",
  ER: "er",
  EY: "ei",
  IH: "i",
  IY: "ii",
  OW: "ou",
  OY: "oi",
  UH: "u",
  UW: "uu",
  B: "b",
  CH: "ch",
  D: "d",
  DH: "d",
  F: "f",
  G: "g",
  HH: "j",
  JH: "y",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ng",
  P: "p",
  R: "r",
  S: "s",
  SH: "sh",
  T: "t",
  TH: "z",
  V: "v",
  W: "u",
  Y: "y",
  Z: "z",
  ZH: "y"
};
var ACC = { a: "\xE1", e: "\xE9", i: "\xED", o: "\xF3", u: "\xFA" };
function esFallback(wordRaw) {
  let s = (wordRaw || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!s) return "";
  const rep = (re, to) => {
    s = s.replace(re, to);
  };
  rep(/tch/g, "C");
  rep(/ch/g, "C");
  rep(/sh/g, "S");
  rep(/eigh/g, "Ei");
  rep(/igh/g, "Ai");
  rep(/augh|ough/g, "O");
  rep(/tion\b/g, "Son");
  rep(/sion\b/g, "Son");
  rep(/cious\b|tious\b/g, "Sas");
  rep(/ture\b/g, "Cer");
  rep(/ph/g, "f");
  rep(/th/g, "Z");
  rep(/ck/g, "k");
  rep(/qu/g, "ku");
  rep(/wh/g, "u");
  rep(/x/g, "ks");
  rep(/^kn/g, "n");
  rep(/^wr/g, "r");
  rep(/mb\b/g, "m");
  rep(/gh/g, "");
  rep(/c(?=[eiy])/g, "s");
  rep(/c/g, "k");
  rep(/g(?=[eiy])/g, "Y");
  rep(/a([^aeiou])e\b/g, "Ei$1");
  rep(/i([^aeiou])e\b/g, "Ai$1");
  rep(/o([^aeiou])e\b/g, "Ou$1");
  rep(/u([^aeiou])e\b/g, "Iu$1");
  rep(/e([^aeiou])e\b/g, "Ii$1");
  rep(/ee/g, "Ii");
  rep(/ea/g, "Ii");
  rep(/oo/g, "Uu");
  rep(/ou/g, "Au");
  rep(/ow/g, "Au");
  rep(/oa/g, "Ou");
  rep(/oi|oy/g, "Oi");
  rep(/ai|ay/g, "Ei");
  rep(/ey/g, "I");
  rep(/au|aw/g, "O");
  rep(/ew/g, "Iu");
  rep(/ie/g, "Ai");
  rep(/er|ir|ur/g, "Er");
  rep(/^y/g, "Y");
  rep(/j/g, "Y");
  rep(/w/g, "u");
  rep(/h/g, "y");
  rep(/z/g, "s");
  rep(/y/g, "i");
  rep(/([^aeiou])e\b/g, "$1");
  rep(/([bcdfgklmnprstv])\1/g, "$1");
  rep(/C/g, "ch");
  rep(/S/g, "sh");
  rep(/Z/g, "z");
  rep(/Y/g, "y");
  return s.toLowerCase();
}
function stripStress(tok) {
  return tok.replace(/\d$/, "");
}
function isVowelPh(ph) {
  return PH_VOWELS.has(stripStress(ph || ""));
}
function editDistance(a, b) {
  const n = a.length, m = b.length, dp = [];
  for (let i = 0; i <= n; i++) dp[i] = [i];
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    dp[i][j] = Math.min(dp[i - 1][j - 1] + c, dp[i - 1][j] + 1, dp[i][j - 1] + 1);
  }
  return dp[n][m];
}
function alignPh(a, b) {
  const n = a.length, m = b.length, dp = [];
  for (let i2 = 0; i2 <= n; i2++) dp[i2] = [i2];
  for (let j2 = 0; j2 <= m; j2++) dp[0][j2] = j2;
  for (let i2 = 1; i2 <= n; i2++) for (let j2 = 1; j2 <= m; j2++) {
    const c = a[i2 - 1] === b[j2 - 1] ? 0 : 1;
    dp[i2][j2] = Math.min(dp[i2 - 1][j2 - 1] + c, dp[i2 - 1][j2] + 1, dp[i2][j2 - 1] + 1);
  }
  let i = n, j = m;
  const ops = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      ops.push({ t: a[i - 1], r: b[j - 1], op: a[i - 1] === b[j - 1] ? "match" : "sub" });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ t: a[i - 1], r: null, op: "del" });
      i--;
    } else {
      ops.push({ t: null, r: b[j - 1], op: "ins" });
      j--;
    }
  }
  return ops.reverse();
}
function syllabify(ph) {
  const isV = (p) => PH_VOWELS.has(stripStress(p));
  const V = [];
  ph.forEach((p, i) => {
    if (isV(p)) V.push(i);
  });
  if (V.length <= 1) return [ph];
  const bounds = [0];
  for (let k = 1; k < V.length; k++) {
    const prevV = V[k - 1], curV = V[k], nCons = curV - prevV - 1;
    bounds.push(nCons <= 0 ? curV : curV - 1);
  }
  bounds.push(ph.length);
  const syls = [];
  for (let i = 0; i < bounds.length - 1; i++) syls.push(ph.slice(bounds[i], bounds[i + 1]));
  return syls;
}
function sylRespell(tokens) {
  let out = "";
  tokens.forEach((tok, i) => {
    const st = (tok.match(/(\d)$/) || [])[1] || null, phn = tok.replace(/\d$/, "");
    let es = ARPA_ES[phn] || "";
    if (phn === "G") {
      const nxt = tokens[i + 1] ? tokens[i + 1].replace(/\d$/, "") : "";
      if (["IY", "IH", "EY", "EH", "AE"].includes(nxt)) es = "gu";
    }
    if (PH_VOWELS.has(phn) && st === "1") es = es.replace(/[aeiou]/, (c) => ACC[c] || c);
    out += es;
  });
  return out || "\u2022";
}
function syllabifySpanish(w) {
  w = (w || "").toLowerCase();
  const V = "aeiou\xE1\xE9\xED\xF3\xFA\xFC\xE0\xE8\xEC\xF2\xF9", weak = "iu\xFC", accented = "\xE1\xE9\xED\xF3\xFA";
  const isV = (c) => V.includes(c);
  const toks = [];
  for (let i2 = 0; i2 < w.length; ) {
    const c = w[i2], c2 = w[i2 + 1] || "", c3 = w[i2 + 2] || "";
    if (isV(c)) {
      toks.push({ t: "V", s: c, i: i2 });
      i2 += 1;
      continue;
    }
    if (c === "c" && c2 === "h" || c === "l" && c2 === "l" || c === "r" && c2 === "r") {
      toks.push({ t: "C", s: c + c2, i: i2 });
      i2 += 2;
      continue;
    }
    if (c === "q" && c2 === "u") {
      toks.push({ t: "C", s: "qu", i: i2 });
      i2 += 2;
      continue;
    }
    if (c === "g" && c2 === "u" && /[eié]/.test(c3)) {
      toks.push({ t: "C", s: "gu", i: i2 });
      i2 += 2;
      continue;
    }
    toks.push({ t: "C", s: c, i: i2 });
    i2 += 1;
  }
  const nuclei = [];
  let i = 0;
  while (i < toks.length) {
    if (toks[i].t === "V") {
      const group = [toks[i]];
      let j = i + 1;
      while (j < toks.length && toks[j].t === "V") {
        const a = group[group.length - 1].s, b = toks[j].s;
        const aStrong = !weak.includes(a), bStrong = !weak.includes(b);
        const aAcc = accented.includes(a), bAcc = accented.includes(b);
        if (aStrong && bStrong || weak.includes(a) && aAcc || weak.includes(b) && bAcc) break;
        group.push(toks[j]);
        j++;
      }
      nuclei.push({ toks: group });
      i = j;
    } else i++;
  }
  const insepar = /* @__PURE__ */ new Set(["pr", "br", "tr", "dr", "cr", "gr", "fr", "pl", "bl", "cl", "gl", "fl", "tl"]);
  const idxOf = (tok) => toks.indexOf(tok);
  const syls = [];
  for (let n = 0; n < nuclei.length; n++) {
    const nuc = nuclei[n];
    const firstTokIdx = idxOf(nuc.toks[0]);
    const lastTokIdx = idxOf(nuc.toks[nuc.toks.length - 1]);
    let onsetStart;
    if (n === 0) onsetStart = 0;
    else {
      const prevLast = idxOf(nuclei[n - 1].toks[nuclei[n - 1].toks.length - 1]);
      const cons = [];
      for (let k = prevLast + 1; k < firstTokIdx; k++) cons.push(toks[k]);
      const nc = cons.length;
      if (nc === 0) onsetStart = firstTokIdx;
      else if (nc === 1) onsetStart = firstTokIdx - 1;
      else {
        const lastTwo = cons[nc - 2].s + cons[nc - 1].s;
        onsetStart = insepar.has(lastTwo) ? firstTokIdx - 2 : firstTokIdx - 1;
      }
    }
    let end;
    if (n === nuclei.length - 1) end = toks.length;
    else {
      const nextFirst = idxOf(nuclei[n + 1].toks[0]);
      const cons = [];
      for (let k = lastTokIdx + 1; k < nextFirst; k++) cons.push(toks[k]);
      const nc = cons.length;
      if (nc === 0) end = lastTokIdx + 1;
      else if (nc === 1) end = lastTokIdx + 1;
      else {
        const lastTwo = cons[nc - 2].s + cons[nc - 1].s;
        end = insepar.has(lastTwo) ? nextFirst - 2 : nextFirst - 1;
      }
    }
    const start = n === 0 ? 0 : onsetStart;
    let str = "";
    for (let k = start; k < end; k++) str += toks[k].s;
    const cstart = toks[start] ? toks[start].i : 0;
    syls.push({ str, cstart, cend: cstart + str.length });
  }
  return syls.length ? syls : [{ str: w, cstart: 0, cend: w.length }];
}
function syllabifyEnglishSpelling(w) {
  w = (w || "").toLowerCase().replace(/[^a-z]/g, "");
  const V = "aeiouy", isV = (c) => V.includes(c);
  const nuclei = [];
  let i = 0;
  while (i < w.length) {
    if (isV(w[i])) {
      let j = i;
      while (j < w.length && isV(w[j])) j++;
      nuclei.push([i, j - 1]);
      i = j;
    } else i++;
  }
  if (nuclei.length <= 1) return [{ str: w, cstart: 0, cend: w.length }];
  const insepar = /* @__PURE__ */ new Set(["pr", "br", "tr", "dr", "cr", "gr", "fr", "pl", "bl", "cl", "gl", "fl", "sp", "st", "sk", "sh", "ch", "th", "wh", "ph", "sc", "sm", "sn", "sl", "sw", "tw"]);
  const bounds = [0];
  for (let k = 1; k < nuclei.length; k++) {
    const prevEnd = nuclei[k - 1][1], curStart = nuclei[k][0], nCons = curStart - prevEnd - 1;
    let b;
    if (nCons <= 0) b = curStart;
    else if (nCons === 1) b = curStart - 1;
    else {
      const lastTwo = w.slice(curStart - 2, curStart);
      b = insepar.has(lastTwo) ? curStart - 2 : curStart - 1;
    }
    bounds.push(b);
  }
  bounds.push(w.length);
  const syls = [];
  for (let k = 0; k < bounds.length - 1; k++) {
    const a = bounds[k], e = bounds[k + 1];
    syls.push({ str: w.slice(a, e), cstart: a, cend: e });
  }
  return syls;
}
function arpaToForms(pron) {
  const toks = pron.trim().split(/\s+/);
  const syls = syllabify(toks);
  let ipa = "";
  syls.forEach((syl) => {
    let stress = null;
    for (const tk of syl) {
      const p = tk.replace(/\d$/, "");
      if (PH_VOWELS.has(p)) {
        stress = (tk.match(/(\d)$/) || [])[1] || null;
        break;
      }
    }
    if (syls.length > 1 && stress === "1") ipa += "'";
    else if (syls.length > 1 && stress === "2") ipa += "\u02CC";
    for (const tk of syl) {
      const st = (tk.match(/(\d)$/) || [])[1] || null, ph = tk.replace(/\d$/, "");
      let sym = ARPA_IPA[ph] || "";
      if (ph === "AH" && st === "0") sym = "\u0259";
      if (ph === "ER" && st === "0") sym = "\u025A";
      ipa += sym;
    }
  });
  let es = "";
  toks.forEach((tok, i) => {
    const st = (tok.match(/(\d)$/) || [])[1] || null;
    const ph = tok.replace(/\d$/, "");
    let esSym = ARPA_ES[ph] || "";
    if (ph === "G") {
      const nxt = toks[i + 1] ? toks[i + 1].replace(/\d$/, "") : "";
      if (["IY", "IH", "EY", "EH", "AE"].includes(nxt)) esSym = "gu";
    }
    if (PH_VOWELS.has(ph) && st === "1") {
      esSym = esSym.replace(/[aeiou]/, (c) => ACC[c] || c);
    }
    es += esSym;
  });
  return { ipa: "/" + ipa + "/", es };
}
function renderPhonetics() {
  const panel = $("phoneticPanel");
  if (!panel.classList.contains("on")) return;
  const cont = $("phonWords");
  if (!cmudict) {
    return;
  }
  const words = ($("promptText").value || "").split(/\s+/).filter(Boolean).slice(0, 150);
  cont.innerHTML = "";
  if (!words.length) {
    cont.innerHTML = '<span class="phon-note">Escribe una palabra o frase arriba.</span>';
    return;
  }
  const frag = document.createDocumentFragment();
  words.forEach((w) => {
    const clean = w.toLowerCase().replace(/^[^a-z']+|[^a-z']+$/g, "");
    if (!clean) return;
    const pron = cmudict[clean];
    const div = document.createElement("div");
    div.className = "pw" + (pron ? "" : " unknown");
    const en = document.createElement("span");
    en.className = "pw-en";
    en.textContent = w;
    const es = document.createElement("span");
    es.className = "pw-es";
    const ipa = document.createElement("span");
    ipa.className = "pw-ipa";
    if (pron) {
      const f = arpaToForms(pron);
      es.textContent = f.es;
      ipa.textContent = f.ipa;
    } else {
      const fb = esFallback(clean);
      if (fb) {
        div.className = "pw approx";
        es.textContent = fb;
        ipa.textContent = "~ aprox.";
      } else {
        es.textContent = "-";
        ipa.textContent = "no est\xE1 en el diccionario";
      }
    }
    div.append(en, es, ipa);
    frag.appendChild(div);
  });
  cont.appendChild(frag);
}
var phonBtn = $("phonBtn");
if (phonBtn) {
  phonBtn.addEventListener("click", async () => {
    const panel = $("phoneticPanel");
    const on = panel.classList.toggle("on");
    phonBtn.setAttribute("aria-pressed", on ? "true" : "false");
    if (!on) return;
    if (!cmudict) {
      $("phonWords").innerHTML = '<span class="phon-note">Cargando diccionario de pronunciaci\xF3n\u2026</span>';
      try {
        await ensureDict();
      } catch (e) {
        console.error(e);
        $("phonWords").innerHTML = '<span class="phon-note err">No se pudo cargar el diccionario. Revisa tu conexi\xF3n.</span>';
        return;
      }
    }
    renderPhonetics();
  });
  $("promptText").addEventListener("input", () => {
    clearTimeout(phonDebounce);
    phonDebounce = setTimeout(renderPhonetics, 250);
  });
}
var wordBtn = $("wordBtn");
var wordPanel = $("wordPanel");
var wpChipsEl = $("wpChips");
var wpInput = $("wpInput");
var wpLoadBtn = $("wpLoadBtn");
var wpCard = $("wpCard");
var wpWordEl = $("wpWord");
var wpIpaEl = $("wpIpa");
var wpEsEl = $("wpEs");
var wpPhonEl = $("wpPhon");
var wpListen = $("wpListen");
var wpRecBtn = $("wpRec");
var wpRecLabel = $("wpRecLabel");
var wpResult = $("wpResult");
var wpTarget = "";
var wpTargetPh = null;
var wpSyllables = [];
var wpEngine = "whisper";
var acousticASR = null;
var ACOUSTIC_MODEL = "Xenova/wav2vec2-base-960h";
var WP_CONFUSIONS = [
  { set: ["IY", "IH"], tip: "Diferencia sheep /i\u02D0/ (largo y tenso) de ship /\u026A/ (corto y relajado)." },
  { set: ["V", "B"], tip: "La V se hace con los dientes sobre el labio inferior; no la vuelvas B." },
  { set: ["Z", "S"], tip: "La Z inglesa vibra (zumbido); la S es sorda, sin vibraci\xF3n." },
  { set: ["DH", "D"], tip: "En \xABth\xBB de this saca la lengua entre los dientes; no es una D." },
  { set: ["TH", "T"], tip: "En \xABth\xBB de think saca la lengua entre los dientes; no es una T." },
  { set: ["SH", "CH"], tip: "\xABsh\xBB es continua (shhh); \xABch\xBB es un golpe seco." },
  { set: ["NG", "N"], tip: "\xABng\xBB resuena en la nariz sin cerrar con una G dura al final." },
  { set: ["AE", "EH"], tip: "En cat la \xABa\xBB es m\xE1s abierta que la e; baja la mand\xEDbula." }
];
async function ensureAcoustic() {
  if (acousticASR) return acousticASR;
  setStatus(`Cargando modelo ac\xFAstico \u2014 ${ACOUSTIC_MODEL}`);
  showBar();
  acousticASR = await pipeline("automatic-speech-recognition", ACOUSTIC_MODEL, { progress_callback: (e) => {
    if (e.status === "progress" && e.progress != null) setBar(e.progress);
  } });
  return acousticASR;
}
var wpStream = null;
var wpRecorder = null;
var wpChunks = [];
var wpRecording = false;
var wpAutoStop = null;
function wpPhonemes(word) {
  if (!cmudict) return null;
  const clean = (word || "").toLowerCase().replace(/[^a-z']/g, "");
  const pron = cmudict[clean];
  return pron ? pron.trim().split(/\s+/) : null;
}
var PHON_CAT = { P: "together", B: "together", M: "together", F: "teethlip", V: "teethlip", TH: "th", DH: "th", T: "tip", D: "tip", N: "tip", L: "tip", S: "tip", Z: "tip", SH: "neutral", ZH: "neutral", CH: "neutral", JH: "neutral", R: "neutral", Y: "neutral", K: "neutral", G: "neutral", NG: "neutral", HH: "neutral", W: "round", UW: "round", UH: "round", OW: "round", AO: "round", OY: "round", AW: "round", IY: "spread", IH: "spread", EY: "spread", EH: "spread", AE: "open", AA: "open", AH: "open", AY: "open", ER: "neutral" };
var CAT_CUE = { together: "Junta los labios y su\xE9ltalos con un golpe de aire.", teethlip: "Apoya los dientes de arriba sobre el labio de abajo y sopla.", th: "Saca un poco la lengua entre los dientes y deja salir el aire.", round: "Redondea bien los labios, como para silbar.", spread: "Estira los labios hacia los lados, como sonriendo.", open: "Abre bien la boca y baja la mand\xEDbula.", tip: "Punta de la lengua tocando detr\xE1s de los dientes de arriba.", neutral: "Boca relajada, ligeramente abierta." };
function mouthSVG(cat) {
  const cx = 80, cy = 60, dur = "1.5s";
  const anim = (el, attr, vals) => `<animate attributeName="${attr}" values="${vals}" dur="${dur}" repeatCount="indefinite"/>`;
  const ell = (lrx, lry, crx, cry) => ({ lips: anim(0, "rx", lrx) + anim(0, "ry", lry), cav: anim(0, "rx", crx) + anim(0, "ry", cry) });
  let lipRX = 42, lipRY = 18, cavRX = 36, cavRY = 13, lipsAnim = "", cavAnim = "", teethEl = "", tongueEl = "", upperTeeth = "";
  const tr = (vals) => `<animateTransform attributeName="transform" type="translate" values="${vals}" dur="${dur}" repeatCount="indefinite"/>`;
  if (cat === "round") {
    const a = ell("44;24;44", "10;26;10", "38;20;38", "7;20;7");
    lipsAnim = a.lips;
    cavAnim = a.cav;
  } else if (cat === "spread") {
    lipRY = 9;
    cavRY = 6;
    const a = ell("36;56;36", "9;9;9", "30;50;30", "6;6;6");
    lipsAnim = a.lips;
    cavAnim = a.cav;
  } else if (cat === "open") {
    const a = ell("42;42;42", "7;34;7", "36;36;36", "5;28;5");
    lipsAnim = a.lips;
    cavAnim = a.cav;
    teethEl = `<rect x="${cx - 34}" y="${cy - 20}" width="68" height="9" rx="3" fill="#fff"/>`;
  } else if (cat === "together") {
    const a = ell("46;46;46", "9;2;9", "40;40;40", "6;1;6");
    lipsAnim = a.lips;
    cavAnim = a.cav;
  } else if (cat === "neutral") {
    const a = ell("42;42;42", "12;20;12", "36;36;36", "9;15;9");
    lipsAnim = a.lips;
    cavAnim = a.cav;
    teethEl = `<rect x="${cx - 32}" y="${cy - 14}" width="64" height="8" rx="3" fill="#fff"/>`;
  } else if (cat === "th") {
    teethEl = `<rect x="${cx - 30}" y="${cy - 15}" width="60" height="8" rx="3" fill="#fff"/><rect x="${cx - 28}" y="${cy + 7}" width="56" height="7" rx="3" fill="#eee"/>`;
    tongueEl = `<rect x="${cx - 16}" y="${cy - 4}" width="32" height="12" rx="6" fill="#e8899a">${tr("0 12; 0 -3; 0 12")}</rect>`;
  } else if (cat === "teethlip") {
    lipRY = 15;
    cavRY = 10;
    upperTeeth = `<rect x="${cx - 26}" y="${cy - 6}" width="52" height="10" rx="3" fill="#fff" stroke="#e0e0e0">${tr("0 -11; 0 2; 0 -11")}</rect>`;
  } else if (cat === "tip") {
    teethEl = `<rect x="${cx - 32}" y="${cy - 15}" width="64" height="8" rx="3" fill="#fff"/>`;
    tongueEl = `<ellipse cx="${cx}" cy="${cy + 4}" rx="28" ry="10" fill="#e8899a"/><rect x="${cx - 14}" y="${cy - 8}" width="28" height="9" rx="4" fill="#e8899a">${tr("0 12; 0 -1; 0 12")}</rect>`;
  } else {
    const a = ell("42;42;42", "12;18;12", "36;36;36", "9;14;9");
    lipsAnim = a.lips;
    cavAnim = a.cav;
  }
  const cavity = `<ellipse cx="${cx}" cy="${cy}" rx="${cavRX}" ry="${cavRY}" fill="#3a2230">${cavAnim}</ellipse>`;
  const lips = `<ellipse cx="${cx}" cy="${cy}" rx="${lipRX}" ry="${lipRY}" fill="none" stroke="#c96b7a" stroke-width="7">${lipsAnim}</ellipse>`;
  return `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">${cavity}${teethEl}${tongueEl}${lips}${upperTeeth}</svg>`;
}
var wpMouthIdx = -1;
function keyPhonemeOfSyllable(syl) {
  if (!syl || syl.start == null || !wpTargetPh) return null;
  const toks = wpTargetPh.slice(syl.start, syl.end).map(stripStress);
  const hard = ["TH", "DH", "V", "Z", "SH", "ZH", "JH", "R", "NG", "W"];
  for (const h of hard) {
    if (toks.includes(h)) return h;
  }
  const vowel = toks.find((t2) => PH_VOWELS.has(t2));
  if (vowel) return vowel;
  return toks[0] || null;
}
function letterCategory(s) {
  s = (s || "").toLowerCase();
  if (/th/.test(s)) return "th";
  if (/[fv]/.test(s)) return "teethlip";
  if (/^[pbm]/.test(s)) return "together";
  if (/[uo]/.test(s)) return "round";
  if (/i/.test(s)) return "spread";
  if (/a/.test(s)) return "open";
  return "neutral";
}
function showSyllableMouth(idx) {
  const syl = wpSyllables[idx];
  if (!syl) return;
  const m = $("wpMouth");
  if (wpMouthIdx === idx && m.style.display !== "none") {
    m.style.display = "none";
    wpMouthIdx = -1;
    [...wpPhonEl.children].forEach((c) => c.classList.remove("picked"));
    return;
  }
  wpMouthIdx = idx;
  [...wpPhonEl.children].forEach((c, i) => c.classList.toggle("picked", i === idx));
  let cat, label;
  const kp = keyPhonemeOfSyllable(syl);
  if (kp) {
    cat = PHON_CAT[kp] || "neutral";
    label = ARPA_IPA[kp] || kp.toLowerCase();
  } else {
    cat = letterCategory(syl.respell || syl.str || "");
    label = "";
  }
  m.innerHTML = mouthSVG(cat) + (label ? `<div class="mk">/${label}/</div>` : "") + `<div class="mc">${CAT_CUE[cat]}</div><button class="mslow" id="wpMouthSlow"><span>\u{1F422}</span> Escuchar \xAB${syl.respell || syl.str || wpTarget}\xBB lento</button>`;
  m.style.display = "flex";
  const b = $("wpMouthSlow");
  if (b) b.addEventListener("click", () => wpDoListen(0.55));
}
function renderTargetBlocks() {
  wpPhonEl.innerHTML = "";
  wpSyllables = [];
  wpMouthIdx = -1;
  const mm = $("wpMouth");
  if (mm) mm.style.display = "none";
  const addBlock = (txt) => {
    const b = document.createElement("div");
    b.className = "wp-syl";
    b.innerHTML = `<span class="txt">${txt}</span>`;
    const idx = wpSyllables.length - 1;
    b.addEventListener("click", () => showSyllableMouth(idx));
    wpPhonEl.appendChild(b);
  };
  if (state.lang === "spanish" || state.lang === "portuguese") {
    syllabifySpanish(wpTarget).forEach((s) => {
      wpSyllables.push({ cstart: s.cstart, cend: s.cend, respell: s.str, letters: true });
      addBlock(s.str);
    });
    return;
  }
  if (wpTargetPh && wpTargetPh.length) {
    let idx = 0;
    syllabify(wpTargetPh).forEach((g) => {
      const start = idx, end = idx + g.length;
      idx = end;
      const respell = sylRespell(g);
      wpSyllables.push({ start, end, respell });
      addBlock(respell);
    });
  } else {
    syllabifyEnglishSpelling(wpTarget).forEach((s) => {
      wpSyllables.push({ cstart: s.cstart, cend: s.cend, respell: s.str, letters: true });
      addBlock(s.str);
    });
  }
}
function loadWord(word) {
  const shown = (word || "").trim();
  if (!shown) return;
  wpStopRec();
  wpStopListen();
  const isEs = state.lang === "spanish" || state.lang === "portuguese";
  wpTarget = shown.toLowerCase().replace(isEs ? /[^a-z\p{L}'-]/g : /[^a-z']/g, "");
  wpTargetPh = isEs ? null : wpPhonemes(wpTarget);
  wpCard.style.display = "block";
  wpWordEl.textContent = shown;
  if (isEs) {
    wpIpaEl.textContent = syllabifySpanish(wpTarget).map((s) => s.str).join("\xB7");
    wpEsEl.textContent = "";
  } else if (wpTargetPh) {
    const f = arpaToForms(wpTargetPh.join(" "));
    wpIpaEl.textContent = f.ipa;
    wpEsEl.textContent = "~ " + f.es;
  } else {
    wpIpaEl.textContent = syllabifyEnglishSpelling(wpTarget).map((s) => s.str).join("\xB7");
    wpEsEl.textContent = "";
  }
  renderTargetBlocks();
  wpResult.innerHTML = "";
  const q = encodeURIComponent(wpTarget);
  const yg = state.lang === "spanish" ? "spanish" : state.lang === "portuguese" ? "portuguese" : "english/us";
  const ytq = state.lang === "spanish" ? "c\xF3mo+se+pronuncia+" : state.lang === "portuguese" ? "como+se+pronuncia+" : "how+to+pronounce+";
  $("wpYouglish").href = `https://youglish.com/pronounce/${q}/${yg}`;
  $("wpYoutube").href = `https://www.youtube.com/results?search_query=${ytq}${q}`;
  [...wpChipsEl.children].forEach((c) => {
    if (c.setAttribute) c.setAttribute("aria-pressed", (c.textContent || "").toLowerCase() === wpTarget ? "true" : "false");
  });
}
function buildWpChips() {
  wpChipsEl.innerHTML = "";
  const note = $("wpPickNote");
  if (state.wpImproveWords && state.wpImproveWords.length) {
    if (note) note.innerHTML = `<b>${state.wpImproveWords.length}</b> palabras a mejorar de tu \xFAltima lectura \xB7 <button type="button" class="wp-all-link" id="wpAllLink">ver todas</button>`;
    state.wpImproveWords.forEach(({ word, sev }) => {
      const b = document.createElement("button");
      b.className = "wp-chip sev" + sev;
      b.type = "button";
      b.setAttribute("aria-pressed", word === wpTarget ? "true" : "false");
      b.innerHTML = `<span class="dot"></span>${word}`;
      b.addEventListener("click", () => loadWord(word));
      wpChipsEl.appendChild(b);
    });
    const allLink = $("wpAllLink");
    if (allLink) allLink.addEventListener("click", () => buildWpChipsAll());
    return;
  }
  buildWpChipsAll();
}
function buildWpChipsAll() {
  const seen = /* @__PURE__ */ new Set(), words = [];
  const clean = state.lang === "spanish" || state.lang === "portuguese" ? /[^a-z\p{L}'-]/g : /[^a-z']/g;
  ($("promptText").value || "").split(/\s+/).forEach((w) => {
    const c = w.toLowerCase().replace(clean, "");
    if (c.length >= 2 && !seen.has(c)) {
      seen.add(c);
      words.push(c);
    }
  });
  wpChipsEl.innerHTML = "";
  const note = $("wpPickNote");
  if (!words.length) {
    if (note) note.textContent = "";
    wpChipsEl.innerHTML = '<span style="font-size:12px;color:var(--muted)">Escribe texto arriba, o teclea una palabra abajo.</span>';
    return;
  }
  if (note) note.textContent = state.wpImproveWords.length ? "" : "Todas las palabras del texto. Graba con \xABComparar lectura\xBB en On para ver solo las que fallaste.";
  words.slice(0, 40).forEach((w) => {
    const b = document.createElement("button");
    b.className = "wp-chip";
    b.type = "button";
    b.setAttribute("aria-pressed", w === wpTarget ? "true" : "false");
    b.textContent = w;
    b.addEventListener("click", () => loadWord(w));
    wpChipsEl.appendChild(b);
  });
}
function wpStopListen() {
  if (synth) synth.cancel();
  wpListen.classList.remove("on");
}
async function wpDoListen(rate = 1) {
  if (!wpTarget) return;
  const word = wpWordEl.textContent || wpTarget;
  try {
    stopSpeaking();
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();
    wpListen.classList.add("on");
    const buf = await neuralBuffer(state.lang, word);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    src.connect(ctx.destination);
    src.onended = () => wpListen.classList.remove("on");
    src.start();
    return;
  } catch (e) {
    console.warn("Voz neural no disponible para la palabra, uso sistema:", e);
    wpListen.classList.remove("on");
  }
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = state.lang === "spanish" ? "es-ES" : state.lang === "portuguese" ? "pt-BR" : "en-US";
  const v = pickVoice(state.lang === "spanish" ? "es" : state.lang === "portuguese" ? "pt" : "en");
  if (v) u.voice = v;
  u.rate = rate < 1 ? 0.5 : 0.75;
  synth.speak(u);
}
async function wpStartRec() {
  if (state.recording) {
    wpResult.innerHTML = '<span class="wp-tip err">Det\xE9n la grabaci\xF3n principal primero.</span>';
    return;
  }
  const md = navigator.mediaDevices;
  if (!window.isSecureContext || !md || !md.getUserMedia) {
    wpResult.innerHTML = '<span class="wp-tip err">El micr\xF3fono necesita una p\xE1gina segura (https). Usa <b>Upload audio</b>: graba con tu tel\xE9fono y sube el archivo.</span>';
    return;
  }
  try {
    wpStream = await md.getUserMedia({ audio: true });
  } catch (e) {
    let msg = "No se pudo abrir el micr\xF3fono. Usa <b>Upload audio</b> en su lugar.";
    if (e && (e.name === "NotAllowedError" || e.name === "SecurityError")) msg = "Permiso de micr\xF3fono denegado. Act\xEDvalo en los ajustes del sitio, o usa <b>Upload audio</b>.";
    else if (e && e.name === "NotFoundError") msg = "No se encontr\xF3 micr\xF3fono en este dispositivo. Usa <b>Upload audio</b>.";
    wpResult.innerHTML = '<span class="wp-tip err">' + msg + "</span>";
    return;
  }
  wpChunks = [];
  wpRecorder = new MediaRecorder(wpStream);
  wpRecorder.ondataavailable = (e) => {
    if (e.data.size) wpChunks.push(e.data);
  };
  wpRecorder.onstop = async () => {
    try {
      wpStream.getTracks().forEach((t2) => t2.stop());
    } catch (e) {
    }
    const blob = new Blob(wpChunks, { type: wpRecorder.mimeType || "audio/webm" });
    await wpScore(blob);
  };
  wpRecorder.start();
  wpRecording = true;
  wpRecBtn.classList.add("on");
  wpRecLabel.textContent = "Stop";
  wpResult.innerHTML = '<span class="wp-scoring">Escuchando\u2026 di la palabra.</span>';
  clearTimeout(wpAutoStop);
  wpAutoStop = setTimeout(() => {
    if (wpRecording) wpStopRec();
  }, 4e3);
}
function wpStopRec() {
  if (!wpRecording) return;
  wpRecording = false;
  clearTimeout(wpAutoStop);
  wpRecBtn.classList.remove("on");
  wpRecLabel.textContent = "Record";
  try {
    wpRecorder.stop();
  } catch (e) {
  }
}
async function wpScore(blob) {
  wpResult.innerHTML = '<span class="wp-scoring">Analizando\u2026</span>';
  try {
    const { audio } = await decodeTo16k(blob);
    if (!audio || audio.length < 1200) {
      wpResult.innerHTML = '<span class="wp-tip">Muy corto. Di la palabra completa y vuelve a intentarlo.</span>';
      return;
    }
    let heard;
    if (wpEngine === "acoustic") {
      const asr = await ensureAcoustic();
      const out = await asr(audio);
      heard = (out.text || "").trim();
    } else {
      const asr = await getASR();
      const opts = { chunk_length_s: 30 };
      if (state.lang !== "english") {
        opts.language = state.lang;
        opts.task = "transcribe";
      }
      const out = await asr(audio, opts);
      heard = (out.text || "").trim();
    }
    hideBar();
    setStatus("Listo \u2014 palabra analizada.");
    if (!heard || !/[a-z']/i.test(heard)) {
      wpResult.innerHTML = '<span class="wp-tip">No se capt\xF3 la palabra. ' + (wpEngine === "acoustic" ? "El motor ac\xFAstico a veces no la detecta \u2014 prueba \xABWhisper\xBB en Setup, o repite m\xE1s cerca del micr\xF3fono." : "Repite m\xE1s claro y cerca del micr\xF3fono.") + "</span>";
      return;
    }
    renderWordScore(heard, wpEngine);
  } catch (e) {
    console.error(e);
    hideBar();
    wpResult.innerHTML = '<span class="wp-tip err">No se pudo analizar: ' + (e && e.message || e) + "</span>";
  }
}
function renderWordScore(heard, engine) {
  const isEs = state.lang === "spanish" || state.lang === "portuguese";
  const wordRe = isEs ? /[a-záéíóúüñ']+/g : /[a-z']+/g;
  const tokens = heard.toLowerCase().match(wordRe) || [];
  let recog = tokens[0] || "";
  if (tokens.length > 1 && wpTarget) {
    let best = Infinity;
    for (const t2 of tokens) {
      const d = editDistance([...t2], [...wpTarget]);
      if (d < best) {
        best = d;
        recog = t2;
      }
    }
  }
  const blocks = [...wpPhonEl.children];
  blocks.forEach((c) => c.classList.remove("ok", "near", "bad"));
  const SEV = { ok: 0, near: 1, bad: 2 };
  let score = 0, tip = "", extraTip = "", suggestion = "";
  const deAccent = (s) => s.replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i").replace(/[óòö]/g, "o").replace(/[úùü]/g, "u");
  if (wpSyllables.length && wpSyllables[0] && wpSyllables[0].letters) {
    const tChars = [...deAccent(wpTarget)], rChars = [...deAccent(recog)];
    const ops = alignPh(tChars, rChars);
    const status = new Array(tChars.length).fill("ok");
    let ti = 0, matches = 0, ins = 0, worstI = -1, worstSev = -1;
    ops.forEach((o) => {
      if (o.op === "ins") {
        ins++;
        return;
      }
      const i = ti++;
      let st;
      if (o.op === "match") {
        st = "ok";
        matches++;
      } else if (o.op === "del") {
        st = "bad";
      } else st = "near";
      status[i] = st;
      if (SEV[st] > worstSev) {
        worstSev = SEV[st];
        worstI = i;
      }
    });
    score = Math.round(100 * matches / Math.max(1, tChars.length));
    score = Math.max(0, score - Math.min(20, ins * 8));
    wpSyllables.forEach((syl, si) => {
      let s = "ok";
      for (let i = syl.cstart; i < syl.cend; i++) if (status[i] && SEV[status[i]] > SEV[s]) s = status[i];
      if (blocks[si]) blocks[si].classList.add(s);
    });
    if (worstSev > 0) {
      const syl = wpSyllables.find((sy) => worstI >= sy.cstart && worstI < sy.cend);
      suggestion = `F\xEDjate en la s\xEDlaba <b>\xAB${syl ? syl.respell : wpTarget}\xBB</b>.`;
    }
  } else if (wpSyllables.length && wpSyllables[0] && wpSyllables[0].start != null) {
    const targetClean = (wpTargetPh || []).map(stripStress);
    const recogPh = wpPhonemes(recog);
    if (targetClean.length && recogPh && wpSyllables.length) {
      const recogClean = recogPh.map(stripStress);
      const ops = alignPh(targetClean, recogClean);
      const status = new Array(targetClean.length).fill("ok");
      let ti = 0, matches = 0, ins = 0, worst = { sev: -1, i: -1, t: null, r: null };
      ops.forEach((o) => {
        if (o.op === "ins") {
          ins++;
          return;
        }
        const i = ti++;
        let st;
        if (o.op === "match") {
          st = "ok";
          matches++;
        } else if (o.op === "del") {
          st = "bad";
        } else {
          const vowelMix = isVowelPh(o.t) !== isVowelPh(o.r);
          st = vowelMix ? "bad" : "near";
          if (!extraTip) {
            const c = WP_CONFUSIONS.find((x) => x.set.includes(o.t) && x.set.includes(o.r));
            if (c) extraTip = c.tip;
          }
        }
        status[i] = st;
        if (SEV[st] > worst.sev) worst = { sev: SEV[st], i, t: o.t, r: o.r };
      });
      score = Math.round(100 * matches / Math.max(1, targetClean.length));
      score = Math.max(0, score - Math.min(20, ins * 8));
      wpSyllables.forEach((syl, si) => {
        if (syl.fallback) return;
        let s = "ok";
        for (let i = syl.start; i < syl.end; i++) if (SEV[status[i]] > SEV[s]) s = status[i];
        if (blocks[si]) blocks[si].classList.add(s);
      });
      if (worst.sev > 0) {
        const syl = wpSyllables.find((sy) => !sy.fallback && worst.i >= sy.start && worst.i < sy.end);
        const ipaSym = ARPA_IPA[worst.t] || worst.t.toLowerCase();
        suggestion = `Mejora el sonido <b>/${ipaSym}/</b>${syl ? ` en \xAB${syl.respell}\xBB` : ""}.`;
      }
    } else if (wpTarget) {
      const d = editDistance([...recog], [...wpTarget]);
      score = Math.round(100 * (1 - d / Math.max(recog.length, wpTarget.length, 1)));
      blocks.forEach((c) => c.classList.add(score >= 85 ? "ok" : score >= 60 ? "near" : "bad"));
    }
  }
  const color = score >= 85 ? getCSS("--pos") : score >= 60 ? getCSS("--neu") : getCSS("--neg");
  if (score >= 90) tip = "\xA1Muy claro! \u{1F389}";
  else if (score >= 70) tip = "Bien, casi lo tienes.";
  else if (recog && recog !== wpTarget) tip = `Se entendi\xF3 \xAB${recog}\xBB. Escucha a nativos abajo y repite despacio.`;
  else tip = "Sigue practicando: escucha el modelo y repite despacio.";
  const heardLbl = engine === "acoustic" ? "Son\xF3 como" : "Reconocido";
  wpResult.innerHTML = `<div class="wp-score" style="color:${color}">${score}%</div>` + (recog ? `<div class="wp-heard">${heardLbl}: "${recog}"${recog === wpTarget ? " \u2713" : ""}</div>` : "") + (suggestion ? `<div class="wp-suggest">${suggestion}</div>` : "") + `<span class="wp-tip">${tip}</span>` + (extraTip ? `<span class="wp-tip">\u{1F4A1} ${extraTip}</span>` : "");
}
async function ensureDictThen(cb) {
  if (state.lang === "spanish" || state.lang === "portuguese" || cmudict) {
    cb();
    return;
  }
  wpChipsEl.innerHTML = '<span style="font-size:12px;color:var(--muted)">Cargando diccionario de pronunciaci\xF3n\u2026</span>';
  try {
    await ensureDict();
    cb();
  } catch (e) {
    console.error(e);
    wpChipsEl.innerHTML = '<span style="font-size:12px;color:var(--neg)">No se pudo cargar el diccionario. Revisa tu conexi\xF3n.</span>';
  }
}
if (wordBtn) {
  let updateWpLangUI = function() {
    if (wpInput) wpInput.placeholder = state.lang === "spanish" ? "\u2026o escribe cualquier palabra en espa\xF1ol" : state.lang === "portuguese" ? "\u2026ou escreva qualquer palavra em portugu\xEAs" : "\u2026or type any word in English";
  }, updateEngineMid = function() {
    if (wpEngineMid) wpEngineMid.textContent = wpEngine === "acoustic" ? ACOUSTIC_MODEL : `Xenova/whisper-${state.size}`;
  };
  updateWpLangUI();
  wordBtn.addEventListener("click", () => {
    const on = wordPanel.classList.toggle("on");
    wordBtn.setAttribute("aria-pressed", on ? "true" : "false");
    updateWpLangUI();
    if (on) ensureDictThen(buildWpChips);
    else {
      wpStopRec();
      wpStopListen();
    }
  });
  $("langSeg").querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      updateWpLangUI();
      state.wpImproveWords = [];
      if (wordPanel.classList.contains("on")) {
        const reload = wpTarget;
        ensureDictThen(() => {
          buildWpChips();
          if (reload) loadWord(reload);
        });
      }
    });
  });
  wpLoadBtn.addEventListener("click", () => {
    const v = wpInput.value.trim();
    if (v) ensureDictThen(() => loadWord(v));
  });
  wpInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      wpLoadBtn.click();
    }
  });
  wpListen.addEventListener("click", () => wpDoListen(1));
  const wpListenSlow = $("wpListenSlow");
  if (wpListenSlow) wpListenSlow.addEventListener("click", () => wpDoListen(0.55));
  if (!window.speechSynthesis) {
    wpListen.disabled = true;
    wpListen.title = "Tu navegador no soporta s\xEDntesis de voz.";
  }
  wpRecBtn.addEventListener("click", () => {
    wpRecording ? wpStopRec() : wpStartRec();
  });
  const wpFileInput = $("wpFileInput");
  if (wpFileInput) wpFileInput.addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (f) {
      if (wpRecording) wpStopRec();
      await wpScore(f);
    }
    e.target.value = "";
  });
  const wpEngineSel = $("wpEngineSel"), wpEngineMid = $("wpEngineMid");
  updateEngineMid();
  if (wpEngineSel) wpEngineSel.addEventListener("change", () => {
    wpEngine = wpEngineSel.value;
    updateEngineMid();
  });
  $("promptText").addEventListener("input", () => {
    state.wpImproveWords = [];
    if (wordPanel.classList.contains("on")) {
      clearTimeout(window.__wpDeb);
      window.__wpDeb = setTimeout(buildWpChips, 300);
    }
  });
}

// js/render.js
function getCSS(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}
function colorFor(p) {
  if (p >= 0.6) return getCSS("--pos");
  if (p <= 0.4) return getCSS("--neg");
  return getCSS("--neu");
}
function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
}
function highlight(i, on, fromArc = true) {
  const bars = $("arc").children, sents = document.querySelectorAll(".sent");
  if (bars[i]) bars[i].classList.toggle("active", on);
  if (sents[i]) sents[i].classList.toggle("active", on);
}
function metric(v, k, hint, color) {
  return `<div class="metric"><div class="v"${color ? ` style="color:${color}"` : ""}>${v}</div><div class="k">${k}</div>${hint ? `<div class="hint">${hint}</div>` : ""}</div>`;
}
function render({ text, sentences, duration, sentiment = true, timedWords = null, compareRead = false, promptTarget = "" }) {
  const results = $("results");
  results.style.display = "block";
  const words = wordCount(text);
  const wpm = duration > 0 ? Math.round(words / (duration / 60)) : 0;
  const fillers = countFillers(text, state.lang);
  const fillerRate = words ? fillers.total / words * 100 : 0;
  const overall = sentiment ? sentences.reduce((a, s) => a + s.positivity * wordCount(s.text), 0) / Math.max(1, sentences.reduce((a, s) => a + wordCount(s.text), 0)) : null;
  const paceHint = wpm === 0 ? "" : wpm < 110 ? "a touch slow" : wpm > 160 ? "a touch fast" : "good range";
  const sentLabel = overall >= 0.6 ? "Positive" : overall <= 0.4 ? "Negative" : "Neutral";
  $("metrics").innerHTML = `
    ${sentiment ? metric((overall * 100).toFixed(0) + "%", "Positivity", sentLabel, colorFor(overall)) : ""}
    ${metric(wpm || "-", "Words / min", paceHint)}
    ${metric(words, "Words", fmtDur(duration))}
    ${metric(fillers.total, "Filler words", fillerRate.toFixed(1) + "% of words", fillers.total > 0 ? getCSS("--accent") : null)}
  `;
  renderReadEval(compareRead ? promptTarget : "", text);
  const arcWrap = $("sentWrap");
  arcWrap.style.display = sentiment ? "" : "none";
  const arc = $("arc");
  arc.innerHTML = "";
  if (sentiment) {
    sentences.forEach((s, i) => {
      const b = document.createElement("div");
      b.className = "seg-bar";
      const h = 26 + s.positivity * 36;
      b.style.height = h + "px";
      b.style.background = colorFor(s.positivity);
      b.title = `${(s.positivity * 100).toFixed(0)}% - ${s.text.slice(0, 60)}${s.text.length > 60 ? "." : ""}`;
      b.addEventListener("mouseenter", () => highlight(i, true));
      b.addEventListener("mouseleave", () => highlight(i, false));
      arc.appendChild(b);
    });
  }
  renderRhythm(timedWords, duration);
  const doc = $("doc");
  doc.innerHTML = "";
  const fillerSet = FILLERS[state.lang] || FILLERS.english;
  sentences.forEach((s, i) => {
    const span = document.createElement("span");
    span.className = "sent";
    span.dataset.i = i;
    span.style.borderBottomColor = sentiment ? colorFor(s.positivity) : "transparent";
    span.innerHTML = highlightFillers(s.text, fillerSet) + " ";
    span.addEventListener("mouseenter", () => highlight(i, true, false));
    span.addEventListener("mouseleave", () => highlight(i, false, false));
    doc.appendChild(span);
  });
  state.last = { text, sentences, duration, words, wpm, fillers, overall, lang: state.lang, sentiment };
  if (state.docxUrl) {
    URL.revokeObjectURL(state.docxUrl);
    state.docxUrl = null;
  }
  const da = $("docxArea");
  da.innerHTML = `<button class="copy" id="docxGenBtn">\u{1F4C4} Generar Word (.docx)</button>`;
  $("docxGenBtn").addEventListener("click", onDocxClick);
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}
function normReadWord(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9']/g, "");
}
function renderReadEval(promptTarget, transcript) {
  const wrap = $("readWrap");
  state.wpImproveWords = [];
  const tgtRaw = (promptTarget || "").match(/[A-Za-z\u00C0-\u00FF0-9\x27\u2019-]+/g) || [];
  const spkRaw = (transcript || "").match(/[A-Za-z\u00C0-\u00FF0-9\x27\u2019-]+/g) || [];
  if (tgtRaw.length < 1 || spkRaw.length < 1) {
    wrap.style.display = "none";
    return;
  }
  const tgt = tgtRaw.map(normReadWord), spk = spkRaw.map(normReadWord);
  const ops = alignPh(tgt, spk);
  let ti = 0, ok = 0, near = 0, bad = 0, extra = 0;
  const parts = [];
  const improve = [];
  const noteImprove = (word, sev) => {
    if (word && word.length >= 3) improve.push({ word, sev });
  };
  ops.forEach((o) => {
    if (o.op === "ins") {
      extra++;
      parts.push(`<span class="rw extra" title="dijiste de m\xE1s">${escapeHtml(spkRaw[spk.indexOf(o.r)] || o.r)}</span>`);
      return;
    }
    const disp = tgtRaw[ti];
    ti++;
    if (o.op === "match") {
      ok++;
      parts.push(`<span class="rw ok">${escapeHtml(disp)}</span>`);
    } else if (o.op === "del") {
      bad++;
      noteImprove(o.t, 2);
      parts.push(`<span class="rw bad" title="no se detect\xF3">${escapeHtml(disp)}</span>`);
    } else {
      const d = editDistance([...o.t], [...o.r]);
      const ratio = 1 - d / Math.max(o.t.length, o.r.length, 1);
      if (ratio >= 0.5) {
        near++;
        noteImprove(o.t, 1);
        parts.push(`<span class="rw near" title="dijiste: ${escapeHtml(o.r)}">${escapeHtml(disp)}</span>`);
      } else {
        bad++;
        noteImprove(o.t, 2);
        parts.push(`<span class="rw bad" title="dijiste: ${escapeHtml(o.r)}">${escapeHtml(disp)}</span>`);
      }
    }
  });
  const seen = /* @__PURE__ */ new Map();
  improve.forEach(({ word, sev }) => {
    if (!seen.has(word) || sev > seen.get(word)) seen.set(word, sev);
  });
  state.wpImproveWords = [...seen.entries()].map(([word, sev]) => ({ word, sev })).sort((a, b) => b.sev - a.sev).slice(0, 20);
  const score = Math.max(0, Math.round(100 * (ok + near * 0.5) / Math.max(1, tgt.length) - Math.min(15, extra * 3)));
  const color = score >= 85 ? getCSS("--pos") : score >= 60 ? getCSS("--neu") : getCSS("--neg");
  $("readScore").innerHTML = `<span style="color:${color}">${score}%</span> <span style="font-size:13px;color:var(--muted);font-family:'Inter',sans-serif;font-weight:600">de lectura correcta</span>`;
  $("readDiff").innerHTML = parts.join(" ");
  $("readNote").textContent = `${ok} correctas \xB7 ${near} aproximadas \xB7 ${bad} falladas/omitidas` + (extra ? ` \xB7 ${extra} de m\xE1s` : "") + ".  Pasa el cursor sobre una palabra para ver qu\xE9 se entendi\xF3.";
  wrap.style.display = "";
}
function extractTimedWords(out) {
  const chunks = out && (out.chunks || out.words) || null;
  if (!Array.isArray(chunks) || !chunks.length) return null;
  const words = [];
  for (const c of chunks) {
    const t2 = (c.text || "").trim();
    if (!t2) continue;
    const ts = c.timestamp || c.timestamps || null;
    let start = ts ? ts[0] : c.start != null ? c.start : null;
    let end = ts ? ts[1] : c.end != null ? c.end : null;
    if (start == null || isNaN(start)) continue;
    if (end == null || isNaN(end) || end < start) end = start;
    words.push({ text: t2, start, end });
  }
  return words.length ? words : null;
}
function paceColorFor(wpm) {
  if (wpm <= 0) return getCSS("--line-strong");
  if (wpm < 90 || wpm > 185) return getCSS("--neg");
  if (wpm < 110 || wpm > 165) return getCSS("--neu");
  return getCSS("--pos");
}
function renderRhythm(words, duration) {
  const wrap = $("rhythmWrap");
  if (!words || words.length < 3 || !duration || duration <= 0) {
    if (wrap) wrap.style.display = "none";
    return;
  }
  wrap.style.display = "";
  const T = duration;
  const PAUSE_MIN = 0.35;
  const PAUSE_LONG = 0.6;
  const pauses = [];
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap >= PAUSE_MIN) pauses.push({ at: words[i - 1].end, len: gap });
  }
  const longPauses = pauses.filter((p) => p.len >= PAUSE_LONG);
  const longest = pauses.reduce((m, p) => Math.max(m, p.len), 0);
  const BIN = 1;
  const nBins = Math.max(6, Math.min(48, Math.ceil(T / BIN)));
  const binDur = T / nBins;
  const counts = new Array(nBins).fill(0);
  for (const w of words) {
    const mid = (w.start + w.end) / 2;
    let idx = Math.floor(mid / binDur);
    if (idx < 0) idx = 0;
    if (idx >= nBins) idx = nBins - 1;
    counts[idx]++;
  }
  const wpmBins = counts.map((c) => c / binDur * 60);
  const maxWpm = Math.max(180, ...wpmBins);
  const bars = $("rhythmBars");
  bars.innerHTML = "";
  wpmBins.forEach((wpm, i) => {
    const b = document.createElement("i");
    const h = wpm <= 0 ? 3 : Math.max(6, Math.round(wpm / maxWpm * 60));
    b.style.height = h + "px";
    b.style.background = paceColorFor(wpm);
    const t0 = i * binDur, t1 = (i + 1) * binDur;
    b.title = `${t0.toFixed(1)}-${t1.toFixed(1)}s \xB7 ${Math.round(wpm)} ppm`;
    bars.appendChild(b);
  });
  const pausesEl = $("rhythmPauses");
  pausesEl.innerHTML = "";
  pauses.forEach((p) => {
    const m = document.createElement("b");
    m.style.left = p.at / T * 100 + "%";
    m.style.opacity = p.len >= PAUSE_LONG ? "0.6" : "0.32";
    m.title = `Pausa de ${p.len.toFixed(1)}s a los ${p.at.toFixed(1)}s`;
    pausesEl.appendChild(m);
  });
  const axis = $("rhythmAxis");
  axis.innerHTML = "";
  const ticks = 4;
  for (let k = 0; k <= ticks; k++) {
    const s = document.createElement("span");
    s.textContent = fmtDur(T * k / ticks);
    axis.appendChild(s);
  }
  const active = wpmBins.filter((w) => w > 0);
  const mean = active.reduce((a, b) => a + b, 0) / Math.max(1, active.length);
  const variance = active.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, active.length);
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  const steady = cv < 0.35 ? "Estable" : cv < 0.6 ? "Algo irregular" : "Irregular";
  const steadyColor = cv < 0.35 ? getCSS("--pos") : cv < 0.6 ? getCSS("--neu") : getCSS("--neg");
  $("rhythmMetrics").innerHTML = `
    <div class="rm"><span class="v">${longPauses.length}</span><span class="k">Pausas largas (\u2265${PAUSE_LONG}s)</span></div>
    <div class="rm"><span class="v">${longest ? longest.toFixed(1) + "s" : "-"}</span><span class="k">Pausa m\xE1s larga</span></div>
    <div class="rm"><span class="v">${Math.round(mean) || "-"}</span><span class="k">Ritmo medio (ppm)</span></div>
    <div class="rm"><span class="v" style="color:${steadyColor}">${steady}</span><span class="k">Consistencia</span></div>
  `;
  let note = "";
  if (longPauses.length >= 3) note = "Varias pausas largas \u2014 respira, pero evita quedarte en blanco entre ideas.";
  else if (cv >= 0.6) note = "Tu velocidad cambia bastante; intenta un ritmo m\xE1s parejo.";
  else if (mean > 165) note = "Vas r\xE1pido; baja un poco para que se te entienda mejor.";
  else if (mean > 0 && mean < 110) note = "Vas algo lento; puedes ganar algo de energ\xEDa.";
  else note = "Buen ritmo y pausas naturales. \u{1F44D}";
  $("rhythmNote").textContent = note;
}
function highlightFillers(text, fillers) {
  let html = escapeHtml(text);
  [...fillers].sort((a, b) => b.length - a.length).forEach((f) => {
    const re = new RegExp("(^|\\b)(" + f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(\\b)", "gi");
    html = html.replace(re, (m, p1, p2, p3) => `${p1}<span class="filler">${p2}</span>${p3}`);
  });
  return html;
}
async function onDocxClick() {
  const btn = $("docxGenBtn");
  if (!btn) return;
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = "Generando\u2026";
  try {
    const blob = await buildDocxBlob();
    if (state.docxUrl) URL.revokeObjectURL(state.docxUrl);
    state.docxUrl = URL.createObjectURL(blob);
    const da = $("docxArea");
    da.innerHTML = `<a class="docx-link" id="docxLink" href="${state.docxUrl}" download="voice-coach-analisis.docx">\u2B07 Descargar voice-coach-analisis.docx</a>`;
    $("docxLink").click();
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.textContent = orig;
    setStatus("No se pudo generar el Word: " + err.message, true);
  }
}

// js/analysis.js
var modelsReady = false;
var _warmupRunning = false;
var _warmupPending = false;
var _warmupKey = null;
var MODELS = {
  whisper: { label: "Reconocimiento (Whisper)", state: "idle" },
  sentiment: { label: "Analisis de sentimiento", state: "idle" }
};
var MS_LABEL = { idle: "No cargado", loading: "Cargando\u2026", ready: "Listo \u2713", error: "Error" };
function setMS(key, st) {
  if (MODELS[key]) {
    MODELS[key].state = st;
    updateBadge();
    renderModelsPanel(true);
  }
}
function setModelBadge(st, text) {
  const el = $("modelBadge");
  if (!el) return;
  el.dataset.state = st;
  const t2 = $("modelBadgeText");
  if (t2) t2.textContent = text;
}
function updateBadge() {
  const ess = [MODELS.whisper.state];
  if (state.doSentiment) ess.push(MODELS.sentiment.state);
  if (ess.includes("error")) setModelBadge("error", "Modelos: revisar \u26A0");
  else if (ess.every((s) => s === "ready")) setModelBadge("ready", "Modelos: listos \u2713");
  else if (ess.includes("loading")) setModelBadge("loading", "Modelos: cargando\u2026");
  else setModelBadge("idle", "Modelos: en espera");
}
function renderModelsPanel(onlyIfOpen) {
  const panel = $("modelsPanel");
  if (!panel) return;
  if (onlyIfOpen && panel.style.display === "none") return;
  const rows = Object.entries(MODELS).map(([k, m]) => `
    <div class="ms-row">
      <span class="ms-dot ${m.state}"></span>
      <span class="ms-name">${m.label}</span>
      <span class="ms-state ${m.state}">${MS_LABEL[m.state] || m.state}</span>
      <button class="ms-reload" data-k="${k}" title="Recargar">\u21BB</button>
    </div>`).join("");
  const el = panel.querySelector(".ms-list");
  if (el) el.innerHTML = rows;
}
async function reloadModel(key) {
  setMS(key, "idle");
  try {
    if (key === "whisper") {
      state.asr = null;
      state.asrKey = null;
      state._asrPromise = null;
      await getASR();
    } else if (key === "sentiment") {
      state.sentiment = null;
      state._sentPromise = null;
      await getSentiment();
    }
  } catch (e) {
    console.error("reload " + key, e);
    setMS(key, "error");
  }
}
function initModelsPanel() {
  if ($("modelBadge")) {
    $("modelBadge").addEventListener("click", () => {
      const p = $("modelsPanel");
      if (!p) return;
      if (p.style.display !== "none") {
        p.style.display = "none";
        return;
      }
      renderModelsPanel(false);
      p.style.display = "block";
    });
  }
  if ($("modelsPanel")) {
    $("modelsPanel").addEventListener("click", (e) => {
      const b = e.target.closest(".ms-reload");
      if (b) {
        reloadModel(b.dataset.k);
        return;
      }
      if (e.target.closest(".ms-close")) {
        $("modelsPanel").style.display = "none";
      }
    });
  }
}
async function getASR() {
  const model = `Xenova/whisper-${state.size}${state.lang === "english" ? ".en" : ""}`;
  const key = model;
  if (state.asr && state.asrKey === key) return state.asr;
  if (state._asrPromise && state._asrPromiseKey === key) return state._asrPromise;
  state._asrPromiseKey = key;
  state._asrPromise = (async () => {
    setMS("whisper", "loading");
    setStatus(`Loading speech model - ${model}`);
    showBar();
    const seen = {};
    try {
      const asr = await pipeline("automatic-speech-recognition", model, {
        dtype: "q8",
        progress_callback: (e) => {
          if (e.status === "progress" && e.file) {
            seen[e.file] = e.progress || 0;
            const vals = Object.values(seen);
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            setBar2(avg);
            setStatus(`Downloading speech model - ${Math.round(avg)}%`);
          }
        }
      });
      state.asr = asr;
      state.asrKey = key;
      setMS("whisper", "ready");
      return asr;
    } catch (e) {
      setMS("whisper", "error");
      state._asrPromise = null;
      throw e;
    }
  })();
  return state._asrPromise;
}
var ASR_WORKER_SRC = `
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5";
env.allowLocalModels = false;

let asr=null, curKey=null;
self.onmessage = async (e)=>{
  const d = e.data, id = d.id;
  try{
    if(!asr || curKey!==d.model){
      asr = await pipeline("automatic-speech-recognition", d.model, {
        dtype:"q8",
        progress_callback:(p)=>{ if(p && p.status==="progress" && p.file) self.postMessage({type:"progress", id, progress:p.progress||0}); }
      });
      curKey = d.model;
      self.postMessage({type:"loaded", id});
    }
    const out = await asr(d.audio, d.opts);
    self.postMessage({type:"result", id, out:{ text: out.text, chunks: out.chunks||null }});
  }catch(err){
    self.postMessage({type:"error", id, error:(err&&err.message)||String(err)});
  }
};
`;
var _asrWorker = null;
var _asrJobs = /* @__PURE__ */ new Map();
var _asrJobSeq = 0;
function getASRWorker() {
  if (_asrWorker) return _asrWorker;
  const url = URL.createObjectURL(new Blob([ASR_WORKER_SRC], { type: "text/javascript" }));
  const w = new Worker(url, { type: "module" });
  w.onmessage = (e) => {
    const d = e.data, job = _asrJobs.get(d.id);
    if (!job) return;
    if (d.type === "progress") {
      job.onProgress && job.onProgress(d.progress);
    } else if (d.type === "loaded") {
      job.onLoaded && job.onLoaded();
    } else if (d.type === "result") {
      _asrJobs.delete(d.id);
      job.resolve(d.out);
    } else if (d.type === "error") {
      _asrJobs.delete(d.id);
      job.reject(new Error(d.error));
    }
  };
  w.onerror = () => {
    const err = new Error("asr worker crashed");
    for (const [, job] of _asrJobs) job.reject(err);
    _asrJobs.clear();
    try {
      w.terminate();
    } catch (_) {
    }
    _asrWorker = null;
  };
  _asrWorker = w;
  return w;
}
function transcribeInWorker(model, audio, opts, onProgress, onLoaded) {
  return new Promise((resolve, reject) => {
    let w;
    try {
      w = getASRWorker();
    } catch (e) {
      reject(e);
      return;
    }
    const id = ++_asrJobSeq;
    _asrJobs.set(id, { resolve, reject, onProgress, onLoaded });
    w.postMessage({ id, model, audio, opts });
  });
}
async function transcribeAudio(audio, opts, onProgress) {
  const model = `Xenova/whisper-${state.size}${state.lang === "english" ? ".en" : ""}`;
  try {
    setMS("whisper", "loading");
    const out = await transcribeInWorker(model, audio, opts, onProgress, () => setMS("whisper", "ready"));
    setMS("whisper", "ready");
    return out;
  } catch (e) {
    console.warn("Worker de transcripci\xF3n fall\xF3, uso el hilo principal:", e);
    const asr = await getASR();
    return await asr(audio, opts);
  }
}
async function getSentiment() {
  if (state.sentiment) return state.sentiment;
  if (state._sentPromise) return state._sentPromise;
  const model = "Xenova/distilbert-base-multilingual-cased-sentiments-student";
  state._sentPromise = (async () => {
    setMS("sentiment", "loading");
    setStatus(`Loading sentiment model - ${model}`);
    showBar();
    try {
      const sent = await pipeline("text-classification", model, {
        progress_callback: (e) => {
          if (e.status === "progress" && e.progress != null) {
            setBar2(e.progress);
          }
        }
      });
      state.sentiment = sent;
      setMS("sentiment", "ready");
      return sent;
    } catch (e) {
      setMS("sentiment", "error");
      state._sentPromise = null;
      throw e;
    }
  })();
  return state._sentPromise;
}
async function warmupModels() {
  const key = `${state.lang}|${state.size}|${state.doSentiment ? 1 : 0}`;
  if (!(modelsReady && _warmupKey === key)) {
    if (_warmupRunning) {
      _warmupPending = true;
    } else {
      _warmupRunning = true;
      _warmupKey = key;
      modelsReady = false;
      try {
        await getASR();
        if (state.doSentiment) await getSentiment();
        const nowKey = `${state.lang}|${state.size}|${state.doSentiment ? 1 : 0}`;
        if (nowKey !== key) {
          _warmupRunning = false;
          return warmupModels();
        }
        modelsReady = true;
        if (!state.recording) {
          hideBar();
          setStatus("Listo para grabar.");
        }
      } catch (e) {
        console.error(e);
      } finally {
        _warmupRunning = false;
        if (_warmupPending) {
          _warmupPending = false;
          warmupModels();
        }
      }
    }
  }
  warmVoice();
}
async function decodeTo16k(blob) {
  const arrayBuf = await blob.arrayBuffer();
  const tmp = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await tmp.decodeAudioData(arrayBuf);
  tmp.close();
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * 16e3)), 16e3);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  const audio = rendered.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < audio.length; i++) {
    const a = Math.abs(audio[i]);
    if (a > peak) peak = a;
  }
  if (peak > 15e-4 && peak < 0.75) {
    const g = Math.min(10, 0.95 / peak);
    for (let i = 0; i < audio.length; i++) audio[i] *= g;
  }
  return { audio, duration: decoded.duration };
}
function setBusy(disabled) {
  const r = $("recBtn");
  if (r) r.disabled = disabled;
}
function initRecording() {
  const recBtn2 = $("recBtn"), recLabel2 = $("recLabel"), timerEl2 = $("timer"), fileInput2 = $("fileInput");
  recBtn2.addEventListener("click", async () => {
    if (state.recording) {
      stopRecording();
      return;
    }
    const md = navigator.mediaDevices;
    const es = state.lang === "spanish";
    const localFileMsg = es ? "El micr\xF3fono est\xE1 bloqueado porque abriste el archivo desde Descargas. Para grabar con el micro, abre la p\xE1gina por https (s\xFAbela gratis a Netlify Drop o GitHub Pages) o usa \xABSubir audio\xBB." : 'The mic is blocked because you opened the file from Downloads. To record, open the page over https (host it free on Netlify Drop or GitHub Pages), or use "Upload audio".';
    const looksLocal = !window.isSecureContext || location.protocol === "content:" || location.protocol === "file:";
    if (looksLocal || !md || !md.getUserMedia) {
      setStatus(localFileMsg, true);
      return;
    }
    try {
      state.stream = await md.getUserMedia({ audio: true });
    } catch (err) {
      let msg = es ? "No se pudo abrir el micr\xF3fono. Usa \xABSubir audio\xBB." : 'Could not start the microphone. Use "Upload audio" instead.';
      if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) msg = localFileMsg;
      else if (err && err.name === "NotFoundError") msg = es ? "No se encontr\xF3 micr\xF3fono en este dispositivo. Usa \xABSubir audio\xBB." : 'No microphone was found on this device. Use "Upload audio" instead.';
      setStatus(msg, true);
      return;
    }
    state.chunks = [];
    state.mediaRecorder = new MediaRecorder(state.stream);
    state.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size) state.chunks.push(e.data);
    };
    state.mediaRecorder.onstop = async () => {
      state.stream.getTracks().forEach((t2) => t2.stop());
      const blob = new Blob(state.chunks, { type: state.mediaRecorder.mimeType || "audio/webm" });
      await analyze(blob);
    };
    state.mediaRecorder.start();
    state.recording = true;
    recBtn2.classList.add("recording");
    recLabel2.textContent = "Stop";
    timerEl2.style.display = "inline";
    state.startedAt = Date.now();
    state.timerId = setInterval(() => {
      const s = Math.floor((Date.now() - state.startedAt) / 1e3);
      timerEl2.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }, 250);
    setStatus("Recording\u2026 speak your answer, then press Stop.");
  });
  fileInput2.addEventListener("change", async (e) => {
    const f = e.target.files[0];
    fileInput2.value = "";
    if (!f) return;
    if (/^(image|video)\//.test(f.type || "")) {
      const msg = state.lang === "spanish" ? "Eso es una imagen o un video, no audio. Elige tu grabaci\xF3n (por ej. un archivo de la carpeta Recordings)." : "That's an image or video, not audio. Pick your recording (e.g. a file in the Recordings folder).";
      setStatus(msg, true);
      return;
    }
    await analyze(f);
  });
}
function stopRecording() {
  state.recording = false;
  clearInterval(state.timerId);
  const recBtn2 = $("recBtn"), recLabel2 = $("recLabel"), timerEl2 = $("timer");
  recBtn2.classList.remove("recording");
  recLabel2.textContent = "Record";
  timerEl2.style.display = "none";
  try {
    state.mediaRecorder.stop();
  } catch (e) {
  }
}
async function transcribeLong(audio, sr, opts, onSeg) {
  const segLen = 120 * sr;
  const n = Math.ceil(audio.length / segLen);
  let fullText = "", chunks = [];
  for (let i = 0; i < n; i++) {
    const start = i * segLen;
    const slice = audio.slice(start, Math.min(audio.length, start + segLen));
    const segOut = await transcribeAudio(slice, opts);
    const segText = (segOut.text || "").trim();
    if (segText) fullText += (fullText ? " " : "") + segText;
    const offset = start / sr;
    if (segOut.chunks) {
      for (const c of segOut.chunks) {
        const ts = Array.isArray(c.timestamp) ? [(c.timestamp[0] ?? 0) + offset, (c.timestamp[1] ?? 0) + offset] : c.timestamp;
        chunks.push({ text: c.text, timestamp: ts });
      }
    }
    if (onSeg) onSeg((i + 1) / n, i + 1, n);
  }
  return { text: fullText, chunks };
}
async function analyze(blob) {
  state.analyzeCanceled = false;
  const cancelBtn2 = $("cancelBtn");
  if (cancelBtn2) cancelBtn2.style.display = "inline-block";
  setBusy(true);
  try {
    setStatus("Decoding audio\u2026");
    showBar(false);
    setBar2(8);
    const { audio, duration } = await decodeTo16k(blob);
    if (audio.length < 1600) {
      setStatus("That clip was too short to analyze. Try a few seconds of speech.", true);
      hideBar();
      setBusy(false);
      if (cancelBtn2) cancelBtn2.style.display = "none";
      return;
    }
    if (state.analyzeCanceled) {
      if (cancelBtn2) cancelBtn2.style.display = "none";
      return;
    }
    setStatus("Transcribing\u2026");
    showBar();
    setBar2(20);
    const asrOpts = {
      chunk_length_s: 30,
      stride_length_s: 5,
      no_repeat_ngram_size: 3,
      return_timestamps: "word"
    };
    if (state.lang !== "english") {
      asrOpts.language = state.lang;
      asrOpts.task = "transcribe";
    }
    const isEs = state.lang === "spanish";
    const longAudio = duration > 180;
    const t0 = Date.now();
    const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    let segInfo = "";
    const heartbeat = setInterval(() => {
      const el = mmss((Date.now() - t0) / 1e3);
      setStatus((isEs ? "Transcribiendo" : "Transcribing") + (segInfo ? ` \xB7 ${segInfo}` : "") + ` \xB7 ${el}`);
    }, 1e3);
    const onSeg = (frac, i, nSeg) => {
      setBar2(20 + frac * 45);
      segInfo = isEs ? `parte ${i}/${nSeg}` : `part ${i}/${nSeg}`;
    };
    const onDl = (p) => {
      if (p != null) setBar2(Math.min(60, 20 + p * 0.4));
    };
    if (longAudio) setStatus((isEs ? "Audio largo" : "Long audio") + ` (${mmss(duration)}) - ${isEs ? "transcribiendo por partes; puede tardar unos minutos" : "transcribing in parts; this can take a few minutes"}.`);
    const run = (o) => longAudio ? transcribeLong(audio, 16e3, o, onSeg) : transcribeAudio(audio, o, onDl);
    let out;
    try {
      out = await run(asrOpts);
    } catch (e) {
      console.warn("Timestamps por palabra no disponibles, reintentando:", e);
      delete asrOpts.return_timestamps;
      out = await run(asrOpts);
    } finally {
      clearInterval(heartbeat);
    }
    const timedWords = extractTimedWords(out);
    let text = (out.text || "").trim();
    text = text.replace(/\((?:speaking[^)]*|inaudible|music|applause|foreign[^)]*|silence|no audio)\)/gi, "").replace(/\[[^\]]{0,40}\]/g, "").replace(/\s{2,}/g, " ").trim();
    if (!text) {
      setStatus("No speech was detected in that audio.", true);
      hideBar();
      setBusy(false);
      if (cancelBtn2) cancelBtn2.style.display = "none";
      return;
    }
    if (state.analyzeCanceled) {
      if (cancelBtn2) cancelBtn2.style.display = "none";
      return;
    }
    const sentences = splitSentences(text);
    let scored;
    if (state.doSentiment) {
      const classifier = await getSentiment();
      setStatus("Scoring sentiment\u2026");
      setBar2(70);
      scored = [];
      for (const s of sentences) {
        const r = await classifier(s, { top_k: 3 });
        scored.push({ text: s, positivity: sentimentPositivity(r) });
      }
    } else {
      setStatus("Finishing\u2026");
      setBar2(80);
      scored = sentences.map((s) => ({ text: s, positivity: null }));
    }
    setBar2(100);
    render({
      text,
      sentences: scored,
      duration,
      sentiment: state.doSentiment,
      timedWords,
      compareRead: state.compareRead,
      promptTarget: $("promptText").value
    });
    setStatus(`Done \u2014 analyzed ${duration.toFixed(1)}s of audio.`);
    hideBar();
  } catch (err) {
    console.error(err);
    const decodeFail = /decode|EncodingError|Unable to decode|decodeAudioData/i.test(err && err.message || "") || err && err.name === "EncodingError";
    if (decodeFail) {
      setStatus(state.lang === "spanish" ? "No pude leer ese archivo de audio. Prueba con un .m4a, .mp3, .wav o .ogg (por ej. tu grabaci\xF3n en la carpeta Recordings)." : "I couldn't read that audio file. Try a .m4a, .mp3, .wav or .ogg (e.g. your recording in the Recordings folder).", true);
    } else {
      setStatus(`Something went wrong: ${err.message}. If this is the first run, check your connection \u2014 the models download once.`, true);
    }
    hideBar();
  } finally {
    setBusy(false);
    const cancelBtn3 = $("cancelBtn");
    if (cancelBtn3) cancelBtn3.style.display = "none";
  }
}
function sentimentPositivity(result) {
  const arr = Array.isArray(result) ? result : [result];
  let pos = 0, neu = 0, neg = 0;
  for (const r of arr) {
    const l = (r.label || "").toLowerCase();
    if (l.startsWith("pos")) pos = r.score;
    else if (l.startsWith("neu")) neu = r.score;
    else if (l.startsWith("neg")) neg = r.score;
  }
  const tot = pos + neu + neg;
  if (tot <= 0) return 0.5;
  return (pos * 1 + neu * 0.5 + neg * 0) / tot;
}
function splitSentences(text) {
  const parts = text.match(/[^.!?]+[.!?]*/g) || [text];
  return parts.map((s) => s.trim()).filter((s) => s.length);
}
var FILLERS = {
  english: ["um", "uh", "uhh", "umm", "er", "ah", "hmm", "like", "basically", "actually", "literally", "you know", "i mean", "kind of", "sort of"],
  spanish: ["este", "eh", "em", "mmm", "o sea", "pues", "bueno", "digamos", "tipo", "verdad", "no s\xE9"],
  portuguese: ["\xE9", "hum", "eh", "mmm", "tipo", "n\xE9", "ent\xE3o", "quer dizer", "assim", "olha", "vejam", "bom"]
};
function countFillers(text, lang) {
  const lower = " " + text.toLowerCase().replace(/[.,!?;:]/g, " ") + " ";
  let total = 0;
  const hits = {};
  for (const f of FILLERS[lang] || FILLERS.english) {
    const re = new RegExp("(^|\\s)" + f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=\\s)", "g");
    const n = (lower.match(re) || []).length;
    if (n) {
      total += n;
      hits[f] = n;
    }
  }
  return { total, hits };
}
function wordCount(text) {
  return (text.trim().match(/\S+/g) || []).length;
}

// js/tts.js
var synth = window.speechSynthesis;
var speakBtn = $("speakBtn");
var speakLabel = $("speakLabel");
var readingWords = [];
var activeWord = null;
var monitorTimer = null;
var lastBoundaryAt = 0;
var speechChunks = [];
var chunkIdx = 0;
var ttsActive = false;
var ttsRate = 0.8;
var audioCtx = null;
var naturalSource = null;
var naturalRAF = null;
var natRAF = null;
var natSchedule = null;
var natWatchdog = null;
var neuralCache = /* @__PURE__ */ new Map();
var hfAudioEl = null;
var hfCache = /* @__PURE__ */ new Map();
var ttsPaused = false;
var naturalBroken = false;
var EL_API_KEY = localStorage.getItem("el_api_key") || "";
var EL_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
var voiceStage = "";
var voiceHB = null;
var voiceT0 = 0;
function setVoiceStatus(msg, isErr) {
  const el = $("voiceStatus");
  if (!el) return;
  el.textContent = msg || "";
  el.classList.toggle("err", !!isErr);
}
function voiceTick() {
  if (!voiceStage) return;
  const s = Math.floor((Date.now() - voiceT0) / 1e3);
  setVoiceStatus(`${voiceStage} \xB7 ${s}s`);
}
function startVoiceStatus(stage) {
  voiceStage = stage;
  voiceT0 = Date.now();
  if (voiceHB) clearInterval(voiceHB);
  voiceHB = setInterval(voiceTick, 1e3);
  voiceTick();
}
function setVoiceStage(stage) {
  voiceStage = stage;
  voiceTick();
}
function stopVoiceStatus(finalMsg, isErr) {
  if (voiceHB) {
    clearInterval(voiceHB);
    voiceHB = null;
  }
  voiceStage = "";
  setVoiceStatus(finalMsg || "", isErr);
}
function setMediaSession(active) {
  if (!("mediaSession" in navigator)) return;
  try {
    const ms = navigator.mediaSession;
    if (active) {
      try {
        ms.metadata = new MediaMetadata({ title: "Voice Coach", artist: state.lang === "spanish" ? "Pr\xE1ctica de lectura" : state.lang === "portuguese" ? "Pr\xE1tica de leitura" : "Reading practice" });
      } catch (e) {
      }
      ms.playbackState = "playing";
      ms.setActionHandler("pause", () => {
        try {
          if ($("pauseBtn") && !ttsPaused) togglePause();
        } catch (e) {
        }
      });
      ms.setActionHandler("play", () => {
        try {
          if ($("pauseBtn") && ttsPaused) togglePause();
        } catch (e) {
        }
      });
      ms.setActionHandler("stop", () => {
        try {
          stopSpeaking();
        } catch (e) {
        }
      });
    } else {
      try {
        ms.playbackState = "none";
      } catch (e) {
      }
    }
  } catch (e) {
  }
}
function clearActiveWord() {
  if (activeWord) {
    activeWord.classList.remove("reading");
    activeWord = null;
  }
}
function highlightWordByIndex(i) {
  const w = readingWords[i];
  if (!w || w.el === activeWord) return;
  clearActiveWord();
  w.el.classList.add("reading");
  activeWord = w.el;
  w.el.scrollIntoView({ block: "nearest" });
}
function stopMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}
function exitReadingView() {
  clearActiveWord();
  const pr = $("promptRead"), pt = $("promptText"), pd = $("promptDoc");
  if (pr) {
    pr.style.display = "none";
    pr.classList.remove("doc-view");
  }
  if (state.docView === "document") {
    if (pt) pt.style.display = "none";
    if (pd) pd.style.display = "block";
    renderDocView();
  } else {
    if (pt) pt.style.display = "";
    if (pd) pd.style.display = "none";
  }
}
function stopSpeaking() {
  ttsActive = false;
  stopMonitor();
  stopNatural();
  stopHfOrator();
  if (audioCtx && audioCtx.state === "suspended") {
    try {
      audioCtx.resume();
    } catch (e) {
    }
  }
  if (synth) {
    try {
      synth.resume();
    } catch (e) {
    }
    synth.cancel();
  }
  hidePause();
  setMediaSession(false);
  speakBtn.classList.remove("speaking");
  const sic = speakBtn.querySelector(".ic");
  if (sic) sic.textContent = "\u25B6";
  speakLabel.textContent = typeof t === "function" ? t("play") : "Reproducir";
  exitReadingView();
}
var pauseBtn = $("pauseBtn");
var pauseLabel = $("pauseLabel");
var pauseIc = $("pauseIc");
function showPause() {
  ttsPaused = false;
  if (!pauseBtn) return;
  pauseBtn.style.display = "";
  pauseBtn.classList.remove("paused");
  if (pauseLabel) pauseLabel.textContent = t("pause");
  if (pauseIc) pauseIc.textContent = "\u23F8";
}
function hidePause() {
  ttsPaused = false;
  if (!pauseBtn) return;
  pauseBtn.style.display = "none";
  pauseBtn.classList.remove("paused");
}
async function togglePause() {
  if (!pauseBtn) return;
  if (!ttsPaused) {
    ttsPaused = true;
    if (state.voice === "natural") {
      try {
        if (audioCtx && audioCtx.state === "running") await audioCtx.suspend();
      } catch (e) {
      }
    } else if (hfAudioEl) {
      try {
        hfAudioEl.pause();
      } catch (e) {
      }
    } else if (synth) {
      try {
        synth.pause();
      } catch (e) {
      }
    }
    pauseBtn.classList.add("paused");
    if (pauseLabel) pauseLabel.textContent = t("resume");
    if (pauseIc) pauseIc.textContent = "\u25B6";
  } else {
    ttsPaused = false;
    if (state.voice === "natural") {
      try {
        if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
      } catch (e) {
      }
    } else if (hfAudioEl) {
      try {
        hfAudioEl.play();
      } catch (e) {
      }
    } else if (synth) {
      try {
        synth.resume();
      } catch (e) {
      }
    }
    pauseBtn.classList.remove("paused");
    if (pauseLabel) pauseLabel.textContent = t("pause");
    if (pauseIc) pauseIc.textContent = "\u23F8";
  }
}
if (pauseBtn) pauseBtn.addEventListener("click", togglePause);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && audioCtx && audioCtx.state === "suspended" && natSchedule && !ttsPaused) {
    audioCtx.resume().catch(() => {
    });
  }
});
function stopNatural() {
  if (naturalRAF) {
    cancelAnimationFrame(naturalRAF);
    naturalRAF = null;
  }
  if (natRAF) {
    cancelAnimationFrame(natRAF);
    natRAF = null;
  }
  if (natWatchdog) {
    clearTimeout(natWatchdog);
    natWatchdog = null;
  }
  stopVoiceStatus("");
  if (natSchedule && natSchedule.sources) {
    for (const s of natSchedule.sources) {
      try {
        s.onended = null;
        s.stop();
      } catch (e) {
      }
    }
  }
  natSchedule = null;
  if (naturalSource) {
    try {
      naturalSource.stop();
    } catch (e) {
    }
    naturalSource = null;
  }
}
var kokoroTTS = null;
var mmsTTS = null;
var lame = null;
var ttsAudioUrl = null;
var kokoroDevice = "";
var kokoroForceWasm = false;
var ttsDownloadTarget = null;
var ttsSeen = {};
var _kokoroP = null;
var _mmsP = null;
var mmsPtTTS = null;
var _mmsPtP = null;
function ttsProgress(e) {
  if (!ttsDownloadTarget) return;
  if (e && e.status === "progress" && e.file) {
    ttsSeen[e.file] = e.progress || 0;
    const vals = Object.values(ttsSeen);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    ttsDownloadTarget(Math.round(avg));
  }
}
async function ensureKokoro() {
  if (kokoroTTS) return kokoroTTS;
  if (_kokoroP) return _kokoroP;
  _kokoroP = (async () => {
    setMS && setMS("voiceEn", "loading");
    ttsSeen = {};
    try {
      const mod = await import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.0/+esm");
      const KokoroTTS = mod.KokoroTTS || mod.default && mod.default.KokoroTTS;
      if (!KokoroTTS) throw new Error("No se pudo cargar el motor de voz.");
      const modelId = "onnx-community/Kokoro-82M-v1.0-ONNX";
      if (navigator.gpu && !kokoroForceWasm) {
        try {
          kokoroTTS = await KokoroTTS.from_pretrained(modelId, { dtype: "fp32", device: "webgpu", progress_callback: ttsProgress });
          kokoroDevice = "webgpu";
          setMS && setMS("voiceEn", "ready");
          return kokoroTTS;
        } catch (e) {
          console.warn("Kokoro WebGPU fall\xF3, uso WASM:", e);
          kokoroTTS = null;
          ttsSeen = {};
        }
      }
      kokoroTTS = await KokoroTTS.from_pretrained(modelId, { dtype: "q8", progress_callback: ttsProgress });
      kokoroDevice = "wasm";
      setMS && setMS("voiceEn", "ready");
      return kokoroTTS;
    } catch (e) {
      setMS && setMS("voiceEn", "error");
      _kokoroP = null;
      throw e;
    }
  })();
  return _kokoroP;
}
async function ensureMMS() {
  if (mmsTTS) return mmsTTS;
  if (_mmsP) return _mmsP;
  _mmsP = (async () => {
    setMS && setMS("voiceEs", "loading");
    ttsSeen = {};
    try {
      mmsTTS = await pipeline("text-to-speech", "Xenova/mms-tts-spa", { dtype: "q8", progress_callback: ttsProgress });
      setMS && setMS("voiceEs", "ready");
      return mmsTTS;
    } catch (e) {
      setMS && setMS("voiceEs", "error");
      _mmsP = null;
      throw e;
    }
  })();
  return _mmsP;
}
async function ensureMMSPt() {
  if (mmsPtTTS) return mmsPtTTS;
  if (_mmsPtP) return _mmsPtP;
  _mmsPtP = (async () => {
    setMS && setMS("voicePt", "loading");
    ttsSeen = {};
    try {
      mmsPtTTS = await pipeline("text-to-speech", "Xenova/mms-tts-por", { dtype: "q8", progress_callback: ttsProgress });
      setMS && setMS("voicePt", "ready");
      return mmsPtTTS;
    } catch (e) {
      setMS && setMS("voicePt", "error");
      _mmsPtP = null;
      throw e;
    }
  })();
  return _mmsPtP;
}
function normalizeSamples(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  if (peak > 0.02 && peak < 0.98) {
    const g = 0.92 / peak;
    for (let i = 0; i < samples.length; i++) samples[i] *= g;
  }
  return samples;
}
async function neuralSamples(lang, text) {
  if (lang === "spanish") {
    let s = await ensureMMS();
    try {
      const out2 = await s(text);
      return { samples: normalizeSamples(out2.audio), sr: out2.sampling_rate || 16e3 };
    } catch (e) {
      console.warn("MMS fall\xF3 en inferencia; rehago en WASM y reintento:", e);
      mmsTTS = null;
      _mmsP = null;
      s = await ensureMMS();
      const out2 = await s(text);
      return { samples: normalizeSamples(out2.audio), sr: out2.sampling_rate || 16e3 };
    }
  }
  if (lang === "portuguese") {
    let s = await ensureMMSPt();
    try {
      const out2 = await s(text);
      return { samples: normalizeSamples(out2.audio), sr: out2.sampling_rate || 16e3 };
    } catch (e) {
      console.warn("MMS-PT fall\xF3 en inferencia; rehago y reintento:", e);
      mmsPtTTS = null;
      _mmsPtP = null;
      s = await ensureMMSPt();
      const out2 = await s(text);
      return { samples: normalizeSamples(out2.audio), sr: out2.sampling_rate || 16e3 };
    }
  }
  const tts = await ensureKokoro();
  const out = await tts.generate(text, { voice: "af_heart", speed: 0.9 });
  return { samples: normalizeSamples(out.audio), sr: out.sampling_rate || 24e3 };
}
function isSilent(samples) {
  let m = 0;
  const step = Math.max(1, Math.floor(samples.length / 4e3));
  for (let i = 0; i < samples.length; i += step) {
    const a = Math.abs(samples[i]);
    if (a > m) m = a;
  }
  return m < 1e-3;
}
async function neuralBuffer(lang, txt) {
  const key = lang + "|" + txt;
  if (neuralCache.has(key)) return neuralCache.get(key);
  let { samples, sr } = await neuralSamples(lang, txt);
  if (lang !== "spanish" && lang !== "portuguese" && kokoroDevice === "webgpu" && isSilent(samples)) {
    console.warn("Kokoro WebGPU devolvi\xF3 silencio; cambio a WASM y regenero.");
    kokoroTTS = null;
    kokoroForceWasm = true;
    neuralCache.clear();
    ({ samples, sr } = await neuralSamples(lang, txt));
  }
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = audioCtx.createBuffer(1, samples.length, sr);
  if (buf.copyToChannel) buf.copyToChannel(samples, 0);
  else buf.getChannelData(0).set(samples);
  if (neuralCache.size > 60) {
    neuralCache.delete(neuralCache.keys().next().value);
  }
  neuralCache.set(key, buf);
  return buf;
}
var TTS_WORKER_SRC = `
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5";
env.allowLocalModels = false;
let kokoro=null, mms=null, mmsPt=null, kokoroWasm=false, _kp=null, _mp=null, _mpp=null, _pid=null;
function prog(p){ if(p&&p.status==="progress"&&p.file&&_pid!=null) self.postMessage({type:"progress",id:_pid,progress:p.progress||0}); }
function norm(s){ let pk=0; for(let i=0;i<s.length;i++){const a=Math.abs(s[i]); if(a>pk)pk=a;} if(pk>0.02&&pk<0.98){const g=0.92/pk; for(let i=0;i<s.length;i++)s[i]*=g;} return s; }
function silent(s){ let m=0,st=Math.max(1,Math.floor(s.length/4000)); for(let i=0;i<s.length;i+=st){const a=Math.abs(s[i]); if(a>m)m=a;} return m<1e-3; }
async function ensureKokoro(){
  if(kokoro) return kokoro; if(_kp) return _kp;
  _kp=(async()=>{ const mod=await import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.0/+esm"); const K=mod.KokoroTTS||(mod.default&&mod.default.KokoroTTS); if(!K) throw new Error("kokoro load failed"); const id="onnx-community/Kokoro-82M-v1.0-ONNX"; if(self.navigator&&self.navigator.gpu&&!kokoroWasm){ try{ kokoro=await K.from_pretrained(id,{dtype:"fp32",device:"webgpu",progress_callback:prog}); return kokoro; }catch(e){ kokoro=null; } } kokoro=await K.from_pretrained(id,{dtype:"q8",progress_callback:prog}); return kokoro; })(); return _kp;
}
async function ensureMMS(){ if(mms) return mms; if(_mp) return _mp; _mp=(async()=>{ mms=await pipeline("text-to-speech","Xenova/mms-tts-spa",{dtype:"q8",progress_callback:prog}); return mms; })(); return _mp; }
async function ensureMMSPt(){ if(mmsPt) return mmsPt; if(_mpp) return _mpp; _mpp=(async()=>{ mmsPt=await pipeline("text-to-speech","Xenova/mms-tts-por",{dtype:"q8",progress_callback:prog}); return mmsPt; })(); return _mpp; }
self.onmessage=async(e)=>{ const d=e.data, id=d.id; if(d.type==="probe"){ let gpu=false; try{ gpu = !!(self.navigator && self.navigator.gpu && await self.navigator.gpu.requestAdapter()); }catch(_){} self.postMessage({type:"probe", id, gpu}); return; } _pid=id; try{ let samples, sr; if(d.lang==="spanish"){ try{ const s=await ensureMMS(); const o=await s(d.text); samples=o.audio; sr=o.sampling_rate||16000; }catch(err){ mms=null; _mp=null; const s=await ensureMMS(); const o=await s(d.text); samples=o.audio; sr=o.sampling_rate||16000; } } else if(d.lang==="portuguese"){ try{ const s=await ensureMMSPt(); const o=await s(d.text); samples=o.audio; sr=o.sampling_rate||16000; }catch(err){ mmsPt=null; _mpp=null; const s=await ensureMMSPt(); const o=await s(d.text); samples=o.audio; sr=o.sampling_rate||16000; } } else { let tts=await ensureKokoro(); let o=await tts.generate(d.text,{voice:"af_heart",speed:0.9}); samples=o.audio; sr=o.sampling_rate||24000; if(silent(samples)&&!kokoroWasm){ kokoroWasm=true; kokoro=null; _kp=null; tts=await ensureKokoro(); o=await tts.generate(d.text,{voice:"af_heart",speed:0.9}); samples=o.audio; sr=o.sampling_rate||24000; } } const f=samples instanceof Float32Array?samples:Float32Array.from(samples); norm(f); self.postMessage({type:"audio",id,samples:f,sr},[f.buffer]); }catch(err){ self.postMessage({type:"error",id,error:(err&&err.message)||String(err)}); } };
`;
var _ttsWorker = null;
var _ttsJobs = /* @__PURE__ */ new Map();
var _ttsSeq = 0;
function getTTSWorker() {
  if (_ttsWorker) return _ttsWorker;
  const url = URL.createObjectURL(new Blob([TTS_WORKER_SRC], { type: "text/javascript" }));
  const w = new Worker(url, { type: "module" });
  w.onmessage = (e) => {
    const d = e.data, job = _ttsJobs.get(d.id);
    if (!job) return;
    if (d.type === "progress") {
      job.onProgress && job.onProgress(d.progress);
    } else if (d.type === "audio") {
      _ttsJobs.delete(d.id);
      job.resolve({ samples: d.samples, sr: d.sr });
    } else if (d.type === "probe") {
      _ttsJobs.delete(d.id);
      job.resolve(d.gpu);
    } else if (d.type === "error") {
      _ttsJobs.delete(d.id);
      job.reject(new Error(d.error));
    }
  };
  w.onerror = () => {
    const err = new Error("tts worker crashed");
    for (const [, j] of _ttsJobs) j.reject(err);
    _ttsJobs.clear();
    try {
      w.terminate();
    } catch (_) {
    }
    _ttsWorker = null;
  };
  _ttsWorker = w;
  return w;
}
function genInWorker(lang, text, onProgress) {
  return new Promise((resolve, reject) => {
    let w;
    try {
      w = getTTSWorker();
    } catch (e) {
      reject(e);
      return;
    }
    const id = ++_ttsSeq;
    _ttsJobs.set(id, { resolve, reject, onProgress });
    w.postMessage({ id, lang, text });
  });
}
async function genMain(lang, txt, onProgress) {
  const loaded = lang === "spanish" ? !!mmsTTS : lang === "portuguese" ? !!mmsPtTTS : !!kokoroTTS;
  if (!loaded && onProgress) ttsDownloadTarget = (pct) => onProgress(pct);
  try {
    return await neuralSamples(lang, txt);
  } finally {
    ttsDownloadTarget = null;
  }
}
var _bgQueue = Promise.resolve();
function runBG(task) {
  const p = _bgQueue.then(task);
  _bgQueue = p.catch(() => {
  });
  return p;
}
async function neuralBufferBG(lang, txt, onProgress) {
  const key = lang + "|" + txt;
  if (neuralCache.has(key)) return neuralCache.get(key);
  return runBG(async () => {
    if (neuralCache.has(key)) return neuralCache.get(key);
    const es = state.lang === "spanish";
    const pt = state.lang === "portuguese";
    setVoiceStage(es ? "Generando voz" : pt ? "Gerando voz" : "Generating voice");
    let samples, sr;
    if (es || pt) {
      const r = await genInWorker(lang, txt, onProgress);
      samples = r.samples;
      sr = r.sr;
    } else {
      const r = await genMain(lang, txt, onProgress);
      samples = r.samples;
      sr = r.sr;
    }
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = audioCtx.createBuffer(1, samples.length, sr);
    if (buf.copyToChannel) buf.copyToChannel(samples, 0);
    else buf.getChannelData(0).set(samples);
    if (neuralCache.size > 60) {
      neuralCache.delete(neuralCache.keys().next().value);
    }
    neuralCache.set(key, buf);
    return buf;
  });
}
var _preloadedMMS = null;
function preloadMMSWorker(lang) {
  if (lang !== "spanish" && lang !== "portuguese") return;
  if (_preloadedMMS === lang) return;
  _preloadedMMS = lang;
  genInWorker(lang, lang === "spanish" ? "hola" : "ola").then(() => {
    console.log("MMS precargado en worker para", lang);
  }).catch(() => {
    _preloadedMMS = null;
  });
}
function highlightChunkWord(ch, frac) {
  const [first, last] = chunkWordRange(ch);
  if (first < 0) return;
  const weights = [];
  for (let i = first; i <= last; i++) {
    const w = readingWords[i];
    let x = w.text.length + 1;
    const c = w.text.slice(-1);
    if (/[,;:]/.test(c)) x += 3;
    else if (/[.?!…]/.test(c)) x += 6;
    weights.push(x);
  }
  const tot = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0, idx = first;
  for (let k = 0; k < weights.length; k++) {
    if (acc / tot <= frac) idx = first + k;
    else break;
    acc += weights[k];
  }
  highlightWordByIndex(idx);
}
function natTick() {
  if (!ttsActive || !natSchedule) {
    natRAF = null;
    return;
  }
  const now = audioCtx.currentTime, s = natSchedule;
  for (let i = 0; i < s.N; i++) {
    const st = s.startTimes[i], d = s.durations[i];
    if (!d) continue;
    if (now >= st && now < st + d) {
      highlightChunkWord(s.chunks[i], (now - st) / d);
      if (speakLabel) speakLabel.textContent = `${t("stop")} \xB7 ${i + 1}/${s.N}`;
      if (s.playIndex !== i) {
        s.playIndex = i;
        if (s.pump) s.pump();
      }
      break;
    }
  }
  natRAF = requestAnimationFrame(natTick);
}
async function speakNatural(raw) {
  try {
    speakBtn.classList.add("speaking");
    const sic = speakBtn.querySelector(".ic");
    if (sic) sic.textContent = "\u25A0";
    speakLabel.textContent = t("generating");
    startVoiceStatus(state.lang === "spanish" ? "Preparando voz" : state.lang === "portuguese" ? "Preparando voz" : "Preparing voice");
    const lang = state.lang;
    const chunks = buildSpeechChunks(raw);
    if (!chunks.length) {
      stopSpeaking();
      return;
    }
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    const N = chunks.length;
    const buffers = new Array(N).fill(null);
    natSchedule = { sources: [], startTimes: new Array(N).fill(0), durations: new Array(N).fill(0), chunks, N, playIndex: 0, pump: null };
    let genPtr = 0, schedPtr = 0, nextStart = 0, started = false;
    const LOOKAHEAD = 2;
    const fail = (err) => {
      if (!ttsActive) return;
      console.error(err);
      ttsDownloadTarget = null;
      fallbackToSystem(raw);
    };
    const chunkFail = (i, err) => {
      if (!ttsActive) return;
      console.warn("bloque", i, "fallo:", err);
      if (!started) {
        fail(err);
        return;
      }
      stopVoiceStatus(state.lang === "spanish" ? "Se interrumpi\xF3 la voz natural. Toca Reproducir otra vez o usa Sistema." : "Natural voice was interrupted. Press Play again or use System.", true);
      stopSpeaking();
    };
    const resetWatchdog = (ms) => {
      if (natWatchdog) clearTimeout(natWatchdog);
      natWatchdog = setTimeout(() => {
        if (ttsActive && !started) fallbackToSystem(raw);
      }, ms);
    };
    const onGenProg = (pct) => {
      if (ttsActive && !started) {
        speakLabel.textContent = `Cargando voz ${pct}%`;
        setVoiceStage((state.lang === "spanish" ? "Cargando modelo de voz " : state.lang === "portuguese" ? "Carregando modelo de voz " : "Loading voice model ") + pct + "%");
        resetWatchdog(6e4);
      }
    };
    const genChunk = (i) => neuralBufferBG(lang, chunks[i].text, onGenProg).catch(() => neuralBufferBG(lang, chunks[i].text));
    const pump = () => {
      while (genPtr < N && genPtr - natSchedule.playIndex <= LOOKAHEAD) {
        const i = genPtr++;
        genChunk(i).then((buf) => {
          if (!ttsActive) return;
          buffers[i] = buf;
          schedule();
        }).catch((err) => chunkFail(i, err));
      }
    };
    natSchedule.pump = pump;
    const schedule = () => {
      while (schedPtr < N && buffers[schedPtr]) {
        const i = schedPtr++;
        const buf = buffers[i];
        buffers[i] = null;
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(audioCtx.destination);
        if (!started) {
          nextStart = audioCtx.currentTime + 0.1;
          started = true;
          showPause();
          if (natWatchdog) {
            clearTimeout(natWatchdog);
            natWatchdog = null;
          }
          stopVoiceStatus("");
          setMediaSession(true);
        }
        if (nextStart < audioCtx.currentTime) {
          nextStart = audioCtx.currentTime + 0.02;
        }
        natSchedule.startTimes[i] = nextStart;
        natSchedule.durations[i] = buf.duration;
        try {
          src.start(nextStart);
        } catch (e) {
        }
        natSchedule.sources.push(src);
        nextStart += buf.duration;
        if (i === N - 1) {
          src.onended = () => {
            if (ttsActive) stopSpeaking();
          };
        }
        speakLabel.textContent = `${t("stop")} \xB7 ${i + 1}/${N}`;
      }
      if (!natRAF) natRAF = requestAnimationFrame(natTick);
      pump();
    };
    pump();
    if (natWatchdog) clearTimeout(natWatchdog);
    natWatchdog = setTimeout(() => {
      if (ttsActive && !started) fallbackToSystem(raw);
    }, 15e4);
  } catch (e) {
    console.error(e);
    ttsDownloadTarget = null;
    fallbackToSystem(raw);
  }
}
function buildReadingView(text) {
  const container = $("promptRead");
  container.innerHTML = "";
  const words = [];
  const frag = document.createDocumentFragment();
  const re = /\S+/g;
  let last = 0, m;
  while (m = re.exec(text)) {
    if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
    const span = document.createElement("span");
    span.className = "w";
    span.textContent = m[0];
    frag.appendChild(span);
    words.push({ el: span, start: m.index, end: m.index + m[0].length, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  container.appendChild(frag);
  return words;
}
var docListLines = /* @__PURE__ */ new Set();
var docBoldRanges = /* @__PURE__ */ new Map();
function setDocFormat(listLines, boldRanges) {
  docListLines = listLines || /* @__PURE__ */ new Set();
  docBoldRanges = boldRanges || /* @__PURE__ */ new Map();
}
function isDocHeading(t2) {
  return /^[A-ZÁÉÍÓÚÑ]\.\s/.test(t2) || /^\(\d+\)/.test(t2) || /^(fase|phase|wave|move|tier|escenario|scenario|modelo|model|paso|step|parte|part|secci[oó]n|section)\b/i.test(t2) || t2.length < 72 && /\(\s*\d+\s*[–-]\s*\d+\s*min\s*\)\s*$/.test(t2);
}
function classifyDocLines(text) {
  const lines = text.split("\n");
  const out = [];
  let offset = 0, nonEmpty = 0;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i], t2 = raw.trim();
    let kind, marker = false;
    if (!t2) {
      kind = "blank";
    } else {
      nonEmpty++;
      marker = /^\s*[-*–]\s+/.test(raw);
      if (docListLines.has(i) || marker) {
        kind = "li";
      } else if (nonEmpty === 1) {
        kind = "h1";
      } else if (nonEmpty === 2 && /[·–|]/.test(t2) && t2.length < 140) {
        kind = "sub";
      } else if (isDocHeading(t2)) {
        kind = "h2";
      } else {
        kind = "p";
      }
    }
    out.push({ kind, text: raw, start: offset, index: i, marker });
    offset += raw.length + 1;
  }
  return out;
}
function leadInBold(text) {
  const m = /^(\s*)(\S.{1,46}?[.:—])(\s|$)/.exec(text);
  if (!m) return null;
  const s = m[1].length;
  return [[s, s + m[2].length]];
}
function rangesOverlap(ranges, a, b) {
  if (!ranges) return false;
  for (const [s, e] of ranges) {
    if (a < e && b > s) return true;
  }
  return false;
}
function fillDocLine(el, ln, withWords, words) {
  const text = ln.text;
  const bold = docBoldRanges.get(ln.index) || (ln.kind === "li" ? leadInBold(text) : null);
  if (withWords) {
    const re = /\S+/g;
    let m, cursor = 0;
    while (m = re.exec(text)) {
      if (m.index > cursor) el.appendChild(document.createTextNode(text.slice(cursor, m.index)));
      const span = document.createElement("span");
      span.className = "w" + (rangesOverlap(bold, m.index, m.index + m[0].length) ? " dv-b" : "");
      span.textContent = m[0];
      el.appendChild(span);
      words.push({ el: span, start: ln.start + m.index, end: ln.start + m.index + m[0].length, text: m[0] });
      cursor = m.index + m[0].length;
    }
    if (cursor < text.length) el.appendChild(document.createTextNode(text.slice(cursor)));
  } else if (bold) {
    let cursor = 0;
    [...bold].sort((a, b) => a[0] - b[0]).forEach(([s, e]) => {
      if (s > cursor) el.appendChild(document.createTextNode(text.slice(cursor, s)));
      const b = document.createElement("span");
      b.className = "dv-b";
      b.textContent = text.slice(s, e);
      el.appendChild(b);
      cursor = e;
    });
    if (cursor < text.length) el.appendChild(document.createTextNode(text.slice(cursor)));
  } else {
    el.textContent = text;
  }
}
function renderDocInto(container, text, withWords) {
  container.innerHTML = "";
  const words = [];
  let curUl = null;
  for (const ln of classifyDocLines(text)) {
    if (ln.kind === "blank") {
      curUl = null;
      continue;
    }
    if (ln.kind === "li") {
      if (!curUl) {
        curUl = document.createElement("ul");
        curUl.className = "dv-ul";
        container.appendChild(curUl);
      }
      const li = document.createElement("li");
      if (ln.marker) li.className = "nomark";
      fillDocLine(li, ln, withWords, words);
      curUl.appendChild(li);
      continue;
    }
    curUl = null;
    const el = document.createElement("div");
    el.className = ln.kind === "h1" ? "dv-h1" : ln.kind === "sub" ? "dv-sub" : ln.kind === "h2" ? "dv-h2" : "dv-p";
    fillDocLine(el, ln, withWords, words);
    container.appendChild(el);
  }
  return words;
}
function renderDocView() {
  if (state.docView !== "document") return;
  renderDocInto($("promptDoc"), $("promptText").value || "", false);
  const hint = document.createElement("span");
  hint.className = "dv-hint";
  hint.textContent = typeof t === "function" && state.lang === "english" ? "Tap to edit" : "Toca para editar";
  $("promptDoc").appendChild(hint);
}
function applyDocView() {
  const playing = ttsActive || naturalSource || hfAudioEl || synth && (synth.speaking || synth.pending);
  if (playing) return;
  const isDoc = state.docView === "document";
  $("promptText").style.display = isDoc ? "none" : "";
  $("promptDoc").style.display = isDoc ? "block" : "none";
  if (isDoc) renderDocView();
}
$("docViewSeg").querySelectorAll("button").forEach((b) => {
  b.addEventListener("click", () => {
    $("docViewSeg").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    state.docView = b.dataset.docview;
    applyDocView();
  });
});
$("promptDoc").addEventListener("click", () => {
  const simpleBtn = $("docViewSeg").querySelector('[data-docview="simple"]');
  if (simpleBtn) simpleBtn.click();
  $("promptText").focus();
});
$("promptText").addEventListener("input", () => {
  docListLines = /* @__PURE__ */ new Set();
  docBoldRanges = /* @__PURE__ */ new Map();
});
function buildSpeechChunks(text) {
  const MAX = 180, chunks = [];
  const pushSeg = (start, end) => {
    let s = start;
    while (end - s > MAX) {
      let cut = s + MAX;
      const sp = text.lastIndexOf(" ", cut);
      if (sp > s) cut = sp;
      if (text.slice(s, cut).trim()) chunks.push({ text: text.slice(s, cut), start: s });
      s = cut;
    }
    if (text.slice(s, end).trim()) chunks.push({ text: text.slice(s, end), start: s });
  };
  let segStart = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\n" || c === "." || c === "!" || c === "?" || c === "\u2026") {
      pushSeg(segStart, i + 1);
      segStart = i + 1;
    }
  }
  if (segStart < text.length) pushSeg(segStart, text.length);
  return chunks.length ? chunks : [{ text, start: 0 }];
}
function chunkWordRange(ch) {
  const lo = ch.start, hi = ch.start + ch.text.length;
  let first = -1, last = -1;
  for (let i = 0; i < readingWords.length; i++) {
    const w = readingWords[i];
    if (w.start >= lo && w.start < hi) {
      if (first < 0) first = i;
      last = i;
    }
  }
  return [first, last];
}
function startChunkMonitor(ch) {
  stopMonitor();
  const [first, last] = chunkWordRange(ch);
  if (first < 0) return;
  const cps = 14 * (ttsRate || 1);
  const times = [];
  let tm = 0;
  for (let i = first; i <= last; i++) {
    times.push(tm);
    const w = readingWords[i];
    tm += (w.text.length + 1) / cps;
    const c = w.text.slice(-1);
    if (/[,;:]/.test(c)) tm += 0.15;
    else if (/[.?!\u2026]/.test(c)) tm += 0.3;
  }
  const startMs = Date.now();
  monitorTimer = setInterval(() => {
    if (lastBoundaryAt && Date.now() - lastBoundaryAt < 1e3) return;
    const el = (Date.now() - startMs) / 1e3 + 0.1;
    let idx = first;
    for (let k = 0; k < times.length; k++) {
      if (times[k] <= el) idx = first + k;
      else break;
    }
    highlightWordByIndex(idx);
  }, 60);
}
function speakChunk() {
  if (!ttsActive) return;
  if (chunkIdx >= speechChunks.length) {
    stopSpeaking();
    return;
  }
  const ch = speechChunks[chunkIdx];
  const u = new SpeechSynthesisUtterance(ch.text);
  u.lang = state.lang === "spanish" ? "es-ES" : state.lang === "portuguese" ? "pt-BR" : "en-US";
  const v = pickVoice(state.lang === "spanish" ? "es" : state.lang === "portuguese" ? "pt" : "en");
  if (v) u.voice = v;
  u.rate = ttsRate;
  u.pitch = 1;
  u.onboundary = (e) => {
    if (e.name && e.name !== "word") return;
    const gi = ch.start + (e.charIndex || 0);
    let w = null;
    for (let i = 0; i < readingWords.length; i++) {
      const x = readingWords[i];
      if (gi >= x.start && gi < x.end) {
        w = i;
        break;
      }
    }
    if (w == null) {
      for (let i = 0; i < readingWords.length; i++) {
        if (readingWords[i].start >= gi) {
          w = i;
          break;
        }
      }
    }
    if (w != null) {
      lastBoundaryAt = Date.now();
      highlightWordByIndex(w);
    }
  };
  u.onstart = () => {
    startChunkMonitor(ch);
  };
  u.onend = () => {
    if (!ttsActive) return;
    chunkIdx++;
    speakChunk();
  };
  u.onerror = () => {
    if (!ttsActive) return;
    chunkIdx++;
    speakChunk();
  };
  synth.speak(u);
}
function pickVoice(langCode) {
  const voices = synth.getVoices() || [];
  return voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(langCode)) || voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(langCode.slice(0, 2))) || null;
}
function stopHfOrator() {
  if (hfAudioEl) {
    try {
      hfAudioEl.pause();
    } catch (e) {
    }
    hfAudioEl = null;
  }
  stopVoiceStatus("");
}
async function elTtsChunk(text) {
  const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + EL_VOICE_ID, { method: "POST", headers: { "xi-api-key": EL_API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg" }, body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.15, similarity_boost: 0.7, style: 0.9, use_speaker_boost: true } }) });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error("ElevenLabs API " + res.status + ": " + errText.slice(0, 200));
  }
  return await res.blob();
}
function playHfAudio(blob, chunkStart, chunkText) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    hfAudioEl = new Audio(url);
    if (chunkStart != null && chunkText && typeof highlightWordByIndex === "function") {
      hfAudioEl.ontimeupdate = () => {
        if (!hfAudioEl || !hfAudioEl.duration) return;
        const frac = hfAudioEl.currentTime / hfAudioEl.duration;
        const chunkWords = [];
        for (let i = 0; i < readingWords.length; i++) {
          if (readingWords[i].start >= chunkStart && readingWords[i].start < chunkStart + chunkText.length) {
            chunkWords.push(i);
          }
        }
        if (chunkWords.length > 0) {
          const idx = Math.min(Math.floor(frac * chunkWords.length), chunkWords.length - 1);
          highlightWordByIndex(chunkWords[idx]);
        }
      };
    }
    hfAudioEl.onended = () => {
      URL.revokeObjectURL(url);
      hfAudioEl = null;
      resolve();
    };
    hfAudioEl.onerror = () => {
      URL.revokeObjectURL(url);
      hfAudioEl = null;
      resolve();
    };
    hfAudioEl.play().catch(() => {
      URL.revokeObjectURL(url);
      hfAudioEl = null;
      resolve();
    });
  });
}
async function speakHfOrator(raw) {
  if (!EL_API_KEY) {
    const tok = prompt(state.lang === "spanish" ? "Pega tu API key de ElevenLabs (gratis en elevenlabs.io):" : state.lang === "portuguese" ? "Cole sua API key do ElevenLabs (gratis em elevenlabs.io):" : "Paste your ElevenLabs API key (free at elevenlabs.io):");
    if (!tok) return;
    EL_API_KEY = tok.trim();
    localStorage.setItem("el_api_key", EL_API_KEY);
  }
  const chunks = buildSpeechChunks(raw);
  ttsActive = true;
  lastBoundaryAt = 0;
  speakLabel.textContent = speakStopLabel();
  showPause();
  const stageMsg = state.lang === "spanish" ? "Generando voz" : state.lang === "portuguese" ? "Gerando voz" : "Generating voice";
  startVoiceStatus(stageMsg);
  const prefetch = /* @__PURE__ */ new Map();
  function getChunk(i) {
    if (i >= chunks.length) return Promise.resolve(null);
    if (prefetch.has(i)) return prefetch.get(i);
    const key = chunks[i].text.trim();
    if (hfCache.has(key)) {
      const p2 = Promise.resolve(hfCache.get(key));
      prefetch.set(i, p2);
      return p2;
    }
    const p = elTtsChunk(chunks[i].text).then((blob) => {
      if (!ttsActive) return null;
      hfCache.set(key, blob);
      return blob;
    });
    prefetch.set(i, p);
    return p;
  }
  let retried = false;
  for (let i = 0; i < chunks.length; i++) {
    if (!ttsActive) break;
    setVoiceStage(stageMsg + " " + (i + 1) + "/" + chunks.length);
    getChunk(i + 1);
    getChunk(i + 2);
    try {
      const blob = await getChunk(i);
      if (!ttsActive || !blob) break;
      if (i === 0) {
        speakBtn.classList.add("speaking");
        const sic = speakBtn.querySelector(".ic");
        if (sic) sic.textContent = "\u25A0";
      }
      stopVoiceStatus("");
      await playHfAudio(blob, chunks[i].start, chunks[i].text);
    } catch (err) {
      console.error("ElevenLabs TTS error:", err);
      if (!ttsActive) break;
      if (!retried) {
        retried = true;
        stopVoiceStatus(state.lang === "spanish" ? "Reintentando..." : state.lang === "portuguese" ? "Tentando novamente..." : "Retrying...", false);
        const key = chunks[i].text.trim();
        hfCache.delete(key);
        prefetch.delete(i);
        i--;
        continue;
      }
      stopVoiceStatus(state.lang === "spanish" ? "Error de voz IA; cancelando." : state.lang === "portuguese" ? "Erro de voz IA; cancelando." : "AI voice error; cancelling.", true);
      stopSpeaking();
      return;
    }
  }
  if (ttsActive) stopSpeaking();
}
function speakSystem(raw) {
  if (state.lang !== "english" && !pickVoice(state.lang === "spanish" ? "es" : "pt")) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    speakNatural(raw);
    return;
  }
  if (!synth) {
    setStatus("Tu navegador no soporta la voz del sistema.", true);
    stopSpeaking();
    return;
  }
  speechChunks = buildSpeechChunks(raw);
  chunkIdx = 0;
  ttsRate = 0.8;
  speakBtn.classList.add("speaking");
  const sic = speakBtn.querySelector(".ic");
  if (sic) sic.textContent = "\u25A0";
  speakLabel.textContent = speakStopLabel();
  synth.cancel();
  speakChunk();
  showPause();
}
function fallbackToSystem(raw) {
  naturalBroken = true;
  if (natWatchdog) {
    clearTimeout(natWatchdog);
    natWatchdog = null;
  }
  if (natRAF) {
    cancelAnimationFrame(natRAF);
    natRAF = null;
  }
  if (natSchedule && natSchedule.sources) {
    for (const s of natSchedule.sources) {
      try {
        s.onended = null;
        s.stop();
      } catch (e) {
      }
    }
  }
  natSchedule = null;
  stopVoiceStatus(state.lang === "spanish" ? "Voz natural no disponible aqu\xED; leyendo con la voz del sistema." : state.lang === "portuguese" ? "Voz natural n\xE3o dispon\xEDvel aqui; lendo com a voz do sistema." : "Natural voice unavailable here; reading with system voice.");
  ttsActive = true;
  speakSystem(raw);
}
if (speakBtn) {
  speakBtn.addEventListener("click", async () => {
    if (ttsActive || synth && (synth.speaking || synth.pending) || naturalSource || hfAudioEl) {
      stopSpeaking();
      return;
    }
    const raw = $("promptText").value;
    if (!raw.trim()) return;
    if (state.docView === "document") {
      readingWords = renderDocInto($("promptRead"), raw, true);
      $("promptRead").classList.add("doc-view");
    } else {
      readingWords = buildReadingView(raw);
      $("promptRead").classList.remove("doc-view");
    }
    $("promptText").style.display = "none";
    $("promptDoc").style.display = "none";
    $("promptRead").style.display = "block";
    ttsActive = true;
    lastBoundaryAt = 0;
    if (state.voice === "natural" && !naturalBroken) {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") await audioCtx.resume();
      } catch (e) {
      }
      speakNatural(raw);
    } else if (state.voice === "orator") {
      speakHfOrator(raw);
    } else {
      if (state.voice === "natural") {
        setVoiceStatus(state.lang === "spanish" ? "Voz natural no disponible en este dispositivo; uso la del sistema." : state.lang === "portuguese" ? "Voz natural n\xE3o dispon\xEDvel neste dispositivo; uso a do sistema." : "Natural voice unavailable on this device; using system voice.");
      }
      speakSystem(raw);
    }
  });
  if (synth && synth.onvoiceschanged !== void 0) {
    synth.onvoiceschanged = () => {
    };
  }
}
async function ensureLame() {
  if (lame) return lame;
  const mod = await import("https://cdn.jsdelivr.net/npm/@breezystack/lamejs@1.2.7/+esm");
  lame = mod.default || mod;
  if (!lame.Mp3Encoder && mod.Mp3Encoder) lame = mod;
  if (!lame.Mp3Encoder) throw new Error("No se pudo cargar el codificador MP3.");
  return lame;
}
function float32ToMp3Blob(lamejs, samples, sampleRate) {
  const enc = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const int16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    int16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  const data = [], block = 1152;
  for (let i = 0; i < int16.length; i += block) {
    const buf = enc.encodeBuffer(int16.subarray(i, i + block));
    if (buf.length > 0) data.push(new Uint8Array(buf));
  }
  const end = enc.flush();
  if (end.length > 0) data.push(new Uint8Array(end));
  return new Blob(data, { type: "audio/mpeg" });
}
async function onDownloadAudio() {
  const dlAudioBtn2 = $("dlAudioBtn");
  if (!dlAudioBtn2) return;
  const text = ($("promptText").value || "").trim();
  if (!text) {
    setStatus("Escribe primero el texto que quieres descargar.", true);
    return;
  }
  dlAudioBtn2.disabled = true;
  const orig = t("dlmp3");
  try {
    const dlAudioLabel = $("dlAudioLabel");
    if (dlAudioLabel) dlAudioLabel.textContent = "Generando\u2026";
    const { samples, sr } = await neuralSamples(state.lang, text);
    if (dlAudioLabel) dlAudioLabel.textContent = "Codificando\u2026";
    const lamejs = await ensureLame();
    const blob = float32ToMp3Blob(lamejs, samples, sr);
    if (ttsAudioUrl) URL.revokeObjectURL(ttsAudioUrl);
    ttsAudioUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = ttsAudioUrl;
    a.download = (state.lang === "spanish" ? "pronunciacion-es" : state.lang === "portuguese" ? "pronunciacao-pt" : "pronunciation-en") + ".mp3";
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (dlAudioLabel) dlAudioLabel.textContent = "Descargado \u2713";
    setTimeout(() => {
      if (dlAudioLabel) dlAudioLabel.textContent = orig;
    }, 1800);
  } catch (err) {
    console.error(err);
    const dlAudioLabel = $("dlAudioLabel");
    if (dlAudioLabel) dlAudioLabel.textContent = orig;
    setStatus("No se pudo generar el audio: " + (err && err.message || err), true);
  } finally {
    dlAudioBtn2.disabled = false;
  }
}
var dlAudioBtn = $("dlAudioBtn");
if (dlAudioBtn) dlAudioBtn.addEventListener("click", onDownloadAudio);
async function warmVoice() {
}
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// js/app.js
window.addEventListener("error", (e) => console.error("RUNTIME ERROR:", e.message, e.filename, e.lineno));
window.addEventListener("unhandledrejection", (e) => console.error("UNHANDLED REJECTION:", e.reason));
var recBtn = $("recBtn");
var recLabel = $("recLabel");
var timerEl = $("timer");
var cancelBtn = $("cancelBtn");
var fileInput = $("fileInput");
wireSeg("langSeg", "lang");
["langSeg", "sentSeg"].forEach((id) => {
  $(id).querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    warmupModels();
  }));
});
["voiceSeg", "langSeg"].forEach((id) => {
  $(id).querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    warmVoice();
  }));
});
$("langSeg").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
  applyLang();
  loadNewQuote();
}));
$("sentSeg").querySelectorAll("button").forEach((b) => {
  b.addEventListener("click", () => {
    $("sentSeg").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    state.doSentiment = b.dataset.sent === "on";
  });
});
$("readSeg").querySelectorAll("button").forEach((b) => {
  b.addEventListener("click", () => {
    $("readSeg").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    state.compareRead = b.dataset.read === "on";
  });
});
$("voiceSeg").querySelectorAll("button").forEach((b) => {
  b.addEventListener("click", () => {
    $("voiceSeg").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    stopSpeaking();
    state.voice = b.dataset.voice;
  });
});
if (cancelBtn) cancelBtn.addEventListener("click", () => {
  state.analyzeCanceled = true;
  cancelBtn.style.display = "none";
  setStatus("Analysis canceled.");
  hideBar();
  recBtn.disabled = false;
});
var FALLBACK_QUOTES = {
  english: ["The only way to do great work is to love what you do. - Steve Jobs", "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela", "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill", "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt", "It always seems impossible until it's done. - Nelson Mandela", "Whether you think you can or you think you can't, you're right. - Henry Ford", "The best way to predict the future is to create it. - Peter Drucker", "In the middle of difficulty lies opportunity. - Albert Einstein", "Do what you can, with what you have, where you are. - Theodore Roosevelt", "Quality is not an act, it is a habit. - Aristotle"],
  spanish: ["Al fin de la batalla, y muerto el combatiente, vino hacia \xE9l un hombre y le dijo: \xA1No mueras, te amo tanto! - C\xE9sar Vallejo", "Caminante, no hay camino, se hace camino al andar. - Antonio Machado", "La educaci\xF3n es el arma m\xE1s poderosa que puedes usar para cambiar el mundo. - Nelson Mandela", "En un lugar de la Mancha, de cuyo nombre no quiero acordarme. - Miguel de Cervantes", "Solo s\xE9 que no s\xE9 nada. - S\xF3crates", "El que lee mucho y anda mucho, ve mucho y sabe mucho. - Miguel de Cervantes", "No hay mal que por bien no venga. - Refr\xE1n popular", "La vida es sue\xF1o, y los sue\xF1os, sue\xF1os son. - Calder\xF3n de la Barca", "Lo esencial es invisible a los ojos. - Antoine de Saint-Exup\xE9ry", "Verde que te quiero verde. Verde viento. Verdes ramas. - Federico Garc\xEDa Lorca"],
  portuguese: ["A educa\xE7\xE3o \xE9 a arma mais poderosa que voc\xEA pode usar para mudar o mundo. - Nelson Mandela", "O sucesso n\xE3o \xE9 final, o fracasso n\xE3o \xE9 fatal: \xE9 a coragem de continuar que conta. - Winston Churchill", "O futuro pertence \xE0queles que acreditam na beleza de seus sonhos. - Eleanor Roosevelt", "Sempre parece imposs\xEDvel at\xE9 que esteja feito. - Nelson Mandela", "O melhor jeito de prever o futuro \xE9 cri\xE1-lo. - Peter Drucker", "No meio da dificuldade reside a oportunidade. - Albert Einstein", "Fa\xE7a o que puder, com o que tem, onde estiver. - Theodore Roosevelt", "A jornada de mil milhas come\xE7a com um \xFAnico passo. - Lao Ts\xE9", "Quem l\xEA muito e anda muito, v\xEA muito e sabe muito. - Miguel de Cervantes", "A vida \xE9 um sonho, e os sonhos, sonhos s\xE3o. - Calder\xF3n de la Barca"]
};
var FALLBACK_PARAGRAPHS = {
  english: ["Last year our team faced a critical production outage during a regulatory audit. The database replication lag caused inconsistent reports, and we had less than an hour to fix it before the auditors noticed. I decided to fail over to the standby node, even though it meant a brief downtime. It was risky, but the alternative - serving stale data during an audit - was worse. We recovered in twelve minutes, passed the audit, and I documented the incident so the team could prevent it next time.", "When I joined the company, the deployment process was entirely manual and took about three hours. Developers would SSH into the server, pull the latest code, run migrations, and restart services by hand. I proposed moving to a containerized setup with automated CI/CD pipelines. It took six weeks to build and test, but once we shipped it, deployments dropped to seven minutes and our release frequency went from twice a month to three times a week.", "I once had to give a presentation to the board about why our machine learning model was underperforming. The challenge was explaining technical concepts - like feature drift and training-serving skew - to an audience that cared about business outcomes, not algorithms. I restructured the talk around three KPIs they already tracked, showed how each one connected to a technical root cause, and proposed a concrete remediation plan with timelines. The board approved the budget I requested."],
  spanish: ["El a\xF1o pasado nuestro equipo enfrent\xF3 una ca\xEDda cr\xEDtica de producci\xF3n durante una auditor\xEDa regulatoria. El retraso en la replicaci\xF3n de la base de datos caus\xF3 informes inconsistentes, y ten\xEDamos menos de una hora para arreglarlo antes de que los auditores lo notaran. Decid\xED conmutar al nodo de respaldo, aunque eso significaba un breve tiempo de inactividad. Era arriesgado, pero la alternativa - servir datos obsoletos durante una auditor\xEDa - era peor. Nos recuperamos en doce minutos, pasamos la auditor\xEDa, y document\xE9 el incidente para que el equipo pudiera prevenirlo la pr\xF3xima vez.", "Cuando me un\xED a la empresa, el proceso de despliegue era completamente manual y tomaba unas tres horas. Los desarrolladores entraban por SSH al servidor, descargaban el c\xF3digo, ejecutaban migraciones y reiniciaban servicios a mano. Propuse pasar a una arquitectura de contenedores con pipelines automatizados de CI/CD. Tom\xF3 seis semanas construirlo y probarlo, pero una vez que lo lanzamos, los despliegues bajaron a siete minutos y nuestra frecuencia de liberaci\xF3n pas\xF3 de dos veces al mes a tres veces por semana.", "Una vez tuve que dar una presentaci\xF3n al consejo sobre por qu\xE9 nuestro modelo de aprendizaje autom\xE1tico ten\xEDa un rendimiento inferior al esperado. El desaf\xEDo era explicar conceptos t\xE9cnicos - como la deriva de caracter\xEDsticas y el sesgo entre entrenamiento y producci\xF3n - a una audiencia que se interesaba por los resultados de negocio, no por los algoritmos. Reestructur\xE9 la charla en torno a tres KPIs que ya segu\xEDan, mostr\xE9 c\xF3mo cada uno se conectaba a una causa t\xE9cnica ra\xEDz, y propuse un plan de remediaci\xF3n concreto con plazos. El consejo aprob\xF3 el presupuesto que solicit\xE9."],
  portuguese: ["No ano passado, nossa equipe enfrentou uma queda cr\xEDtica de produ\xE7\xE3o durante uma auditoria regulat\xF3ria. O atraso na replica\xE7\xE3o do banco de dados causou relat\xF3rios inconsistentes, e t\xEDnhamos menos de uma hora para corrigir antes que os auditores notassem. Decidi fazer failover para o n\xF3 de standby, embora isso significasse um breve tempo de inatividade. Era arriscado, mas a alternativa - servir dados desatualizados durante uma auditoria - era pior. Nos recuperamos em doze minutos, passamos na auditoria, e documentei o incidente para que a equipe pudesse preveni-lo da pr\xF3xima vez.", "Quando entrei na empresa, o processo de deploy era inteiramente manual e levava cerca de tr\xEAs horas. Os desenvolvedores faziam SSH no servidor, baixavam o c\xF3digo, rodavam migra\xE7\xF5es e reiniciavam servi\xE7os \xE0 m\xE3o. Propus mudar para uma arquitetura de cont\xEAineres com pipelines automatizados de CI/CD. Levou seis semanas para construir e testar, mas depois que lan\xE7amos, os deploys ca\xEDram para sete minutos e nossa frequ\xEAncia de release passou de duas vezes por m\xEAs para tr\xEAs vezes por semana.", "Uma vez tive que fazer uma apresenta\xE7\xE3o para o conselho sobre por que nosso modelo de machine learning estava com desempenho abaixo do esperado. O desafio era explicar conceitos t\xE9cnicos - como feature drift e training-serving skew - para uma audi\xEAncia que se importava com resultados de neg\xF3cio, n\xE3o com algoritmos. Reestruturei a palestra em torno de tr\xEAs KPIs que eles j\xE1 acompanhavam, mostrei como cada um se conectava a uma causa t\xE9cnica raiz, e propus um plano de remedia\xE7\xE3o concreto com prazos. O conselho aprovou o or\xE7amento que solicitei."]
};
function randFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
async function fetchFamousQuote(lang) {
  try {
    if (lang === "spanish") {
      const r = await fetch("https://frasedeldia.azurewebsites.net/api/phrase", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        if (d && d.phrase) return `${d.phrase}${d.author ? ` - ${d.author}` : ""}`;
      }
    } else {
      const r = await fetch("https://api.quotable.io/random?maxLength=180", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        if (d && d.content) return `${d.content}${d.author ? ` - ${d.author}` : ""}`;
      }
    }
  } catch (e) {
  }
  return randFrom(FALLBACK_QUOTES[lang] || FALLBACK_QUOTES.english);
}
async function loadNewQuote() {
  const btn = $("shuffleBtn");
  const orig = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = t("loading");
  }
  const q = await fetchFamousQuote(state.lang);
  $("promptText").value = q;
  updateClearBtn();
  renderPhonetics();
  state.wpImproveWords = [];
  if (wordPanel.classList.contains("on")) {
    ensureDictThen(buildWpChips);
  }
  if (btn) {
    btn.disabled = false;
    btn.textContent = t("newq");
  }
}
$("shuffleBtn").addEventListener("click", loadNewQuote);
async function loadNewParagraph() {
  const btn = $("paragraphBtn");
  const orig = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = t("loading");
  }
  const p = randFrom(FALLBACK_PARAGRAPHS[state.lang] || FALLBACK_PARAGRAPHS.english);
  $("promptText").value = p;
  updateClearBtn();
  renderPhonetics();
  state.wpImproveWords = [];
  if (wordPanel.classList.contains("on")) {
    ensureDictThen(buildWpChips);
  }
  if (btn) {
    btn.disabled = false;
    btn.textContent = t("paragraph");
  }
}
var paragraphBtn = $("paragraphBtn");
if (paragraphBtn) paragraphBtn.addEventListener("click", loadNewParagraph);
function applyLang() {
  const S = UI_STRINGS[state.lang] || UI_STRINGS.english;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    if (k in S) el.textContent = S[k];
  });
  const lbl = document.querySelector(".prompt .lbl");
  if (lbl) lbl.textContent = S.promptLbl;
  const pt = $("promptText");
  if (pt) pt.placeholder = S.promptPh;
  if (!(ttsActive || naturalSource || synth && (synth.speaking || synth.pending))) {
    const sl = $("speakLabel");
    if (sl) sl.textContent = S.play;
  }
  const dl = $("dlAudioLabel");
  if (dl && dl.textContent !== "Descargado \u2713") dl.textContent = S.dlmp3;
  const phon = $("phonBtn");
  if (phon) phon.textContent = S.phon;
  const wb = $("wordBtn");
  if (wb) wb.textContent = S.words;
  const nb = $("shuffleBtn");
  if (nb && !nb.disabled) nb.textContent = S.newq;
  const pgb = $("paragraphBtn");
  if (pgb) pgb.textContent = S.paragraph;
  const rl = $("recLabel");
  if (rl && !state.recording) rl.textContent = S.record;
  const pb = $("pauseBtn");
  if (pb && pb.style.display !== "none") {
    const pl = $("pauseLabel");
    if (pl) pl.textContent = ttsPaused ? S.resume : S.pause;
  }
  const dvSeg = $("docViewSeg");
  if (dvSeg) {
    const bs = dvSeg.querySelectorAll("button");
    if (bs[0]) bs[0].textContent = S.docSimple;
    if (bs[1]) bs[1].textContent = S.docDoc;
  }
  const uh = $("uploadHint");
  if (uh) uh.innerHTML = S.uploadHint;
  const phBtn = $("phonBtn");
  if (phBtn) {
    phBtn.disabled = state.lang === "portuguese";
    phBtn.title = state.lang === "portuguese" ? "Fon\xE9tica no disponible para portugu\xE9s" : "";
  }
  updateVoiceAvailability();
  preloadMMSWorker(state.lang);
}
function updateVoiceAvailability() {
  const seg = $("voiceSeg");
  if (!seg) return;
  const natBtn = seg.querySelector('[data-voice="natural"]');
  if (!natBtn) return;
  natBtn.disabled = false;
  natBtn.style.opacity = "";
  natBtn.style.cursor = "";
  natBtn.title = "";
}
var clearBtn = $("clearBtn");
var promptTextEl = $("promptText");
function updateClearBtn() {
  clearBtn.style.display = promptTextEl.value.trim() ? "flex" : "none";
}
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (ttsActive || hfAudioEl || synth && (synth.speaking || synth.pending)) stopSpeaking();
    promptTextEl.value = "";
    updateClearBtn();
    promptTextEl.focus();
    renderPhonetics();
    state.wpImproveWords = [];
    if (wordPanel.classList.contains("on") && cmudict) buildWpChips();
  });
  promptTextEl.addEventListener("input", updateClearBtn);
  updateClearBtn();
}
var JSZipLib = null;
async function ensureJSZip() {
  if (JSZipLib) return JSZipLib;
  const m = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
  JSZipLib = m.default || m;
  return JSZipLib;
}
function parseDocxBlocks(xmlString) {
  const doc = new DOMParser().parseFromString(xmlString, "application/xml");
  const ps = doc.getElementsByTagName("w:p");
  const blocks = [];
  for (const p of ps) {
    const runs = p.getElementsByTagName("w:r");
    const rawChars = [], rawBold = [];
    for (const r of runs) {
      const rpr = r.getElementsByTagName("w:rPr")[0];
      let bold2 = false;
      if (rpr) {
        for (const bEl of rpr.getElementsByTagName("w:b")) {
          const v = bEl.getAttribute("w:val");
          if (v === null || /^(true|1|on)$/i.test(v)) bold2 = true;
        }
      }
      for (const tEl of r.getElementsByTagName("w:t")) {
        const s2 = tEl.textContent || "";
        for (const ch of s2) {
          rawChars.push(ch);
          rawBold.push(bold2);
        }
      }
    }
    const st = p.getElementsByTagName("w:pStyle")[0];
    const isList = !!(st && /list/i.test(st.getAttribute("w:val") || "")) || p.getElementsByTagName("w:numPr").length > 0;
    if (!rawChars.length) continue;
    const outC = [], outB = [];
    let prevSpace = false;
    for (let k = 0; k < rawChars.length; k++) {
      let c = rawChars[k];
      if (c === "\xA0") c = " ";
      if (/\s/.test(c)) {
        if (prevSpace) continue;
        outC.push(" ");
        outB.push(false);
        prevSpace = true;
      } else {
        outC.push(c);
        outB.push(rawBold[k]);
        prevSpace = false;
      }
    }
    while (outC.length && outC[0] === " ") {
      outC.shift();
      outB.shift();
    }
    while (outC.length && outC[outC.length - 1] === " ") {
      outC.pop();
      outB.pop();
    }
    const text = outC.join("");
    if (!text) continue;
    const bold = [];
    let s = -1;
    for (let k = 0; k <= outB.length; k++) {
      if (k < outB.length && outB[k]) {
        if (s < 0) s = k;
      } else if (s >= 0) {
        bold.push([s, k]);
        s = -1;
      }
    }
    blocks.push({ text, isList, bold });
  }
  return blocks;
}
function isDocxHeader(t2) {
  return /^(\(\d+\)|open\b|close\b|wave\s*\d|move\s*\d|tier\s*(one|two|three|\d))/i.test(t2) && t2.length < 70;
}
function loadBlockIntoBox(text, metaLines) {
  $("promptText").value = text;
  const listLines = /* @__PURE__ */ new Set(), boldRanges = /* @__PURE__ */ new Map();
  if (metaLines && metaLines.length) {
    metaLines.forEach((mb, i) => {
      if (mb.isList) listLines.add(i);
      if (mb.bold && mb.bold.length) boldRanges.set(i, mb.bold);
    });
  }
  setDocFormat(listLines, boldRanges);
  updateClearBtn();
  renderPhonetics();
  state.wpImproveWords = [];
  if (wordPanel.classList.contains("on") && (cmudict || state.lang === "spanish")) buildWpChips();
  $("docxPanel").style.display = "none";
  applyDocView();
  document.querySelector(".prompt").scrollIntoView({ behavior: "smooth", block: "start" });
}
function updateDocxSelCount() {
  const n = $("docxList").querySelectorAll(".docx-item.sel").length;
  const b = $("docxSel");
  if (b) {
    b.textContent = `Cargar selecci\xF3n (${n})`;
    b.disabled = n === 0;
  }
}
function renderDocxBlocks(blocks, name) {
  const list = $("docxList");
  list.innerHTML = "";
  $("docxName").textContent = name ? "\u{1F4C4} " + name : "";
  window.__docxBlocks = blocks;
  if (!blocks.length) {
    list.innerHTML = '<div class="docx-empty">No se detect\xF3 texto en el documento.</div>';
  }
  const mkItem = (b, i, isHead) => {
    const it = document.createElement("button");
    it.type = "button";
    it.className = "docx-item" + (isHead ? " head" : b.isList ? " list" : "");
    it.dataset.i = i;
    const ck = document.createElement("span");
    ck.className = "docx-check";
    ck.textContent = "\u2713";
    const tx = document.createElement("span");
    tx.textContent = b.text;
    it.appendChild(ck);
    it.appendChild(tx);
    return it;
  };
  blocks.forEach((b, i) => {
    const isHead = isDocxHeader(b.text) && !b.isList;
    const it = mkItem(b, i, isHead);
    if (isHead) {
      it.addEventListener("click", () => {
        const on = !it.classList.contains("sel");
        it.classList.toggle("sel", on);
        let el = it.nextElementSibling;
        while (el && !el.classList.contains("head")) {
          if (el.classList.contains("docx-item")) el.classList.toggle("sel", on);
          el = el.nextElementSibling;
        }
        updateDocxSelCount();
      });
    } else {
      it.addEventListener("click", () => {
        it.classList.toggle("sel");
        updateDocxSelCount();
      });
    }
    list.appendChild(it);
  });
  updateDocxSelCount();
  $("docxPanel").style.display = "block";
}
function loadDocxSelected() {
  const sel = [...$("docxList").querySelectorAll(".docx-item.sel")];
  const blocks = window.__docxBlocks || [];
  if (!sel.length) return;
  const chosen = sel.map((el) => blocks[+el.dataset.i]);
  loadBlockIntoBox(chosen.map((b) => b.text).join("\n"), chosen);
}
if ($("docxBtn")) {
  $("docxBtn").addEventListener("click", () => $("docxInput").click());
  $("docxInput").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const list = $("docxList");
    $("docxName").textContent = "";
    list.innerHTML = '<div class="docx-empty">Leyendo documento\u2026</div>';
    $("docxPanel").style.display = "block";
    try {
      const zip = await (await ensureJSZip()).loadAsync(await f.arrayBuffer());
      const entry = zip.file("word/document.xml");
      if (!entry) {
        list.innerHTML = '<div class="docx-empty">No parece un .docx v\xE1lido.</div>';
        return;
      }
      const xml = await entry.async("string");
      renderDocxBlocks(parseDocxBlocks(xml), f.name.replace(/\.docx$/i, ""));
    } catch (err) {
      console.error(err);
      list.innerHTML = '<div class="docx-empty" style="color:var(--neg)">No se pudo leer el documento: ' + (err && err.message || err) + "</div>";
    }
  });
  $("docxClose").addEventListener("click", () => {
    $("docxPanel").style.display = "none";
  });
  $("docxSel").addEventListener("click", loadDocxSelected);
  $("docxAll").addEventListener("click", () => {
    const blocks = window.__docxBlocks || [];
    if (blocks.length) loadBlockIntoBox(blocks.map((b) => b.text).join("\n"), blocks);
  });
}
$("copyBtn").addEventListener("click", () => {
  const txt = $("doc").innerText.trim();
  navigator.clipboard.writeText(txt).then(() => {
    $("copyBtn").textContent = "Copied \u2713";
    setTimeout(() => $("copyBtn").textContent = "Copy transcript", 1500);
  });
});
initRecording();
initModelsPanel();
applyLang();
setTimeout(() => {
  warmupModels();
}, 400);
