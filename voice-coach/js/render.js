/* ---------------- render: visualización de resultados del análisis ---------------- */
import { state, $, fmtDur, setStatus } from './state.js';
import { buildDocxBlob } from './docx.js';
import { FILLERS, countFillers, wordCount } from './analysis.js';
import { alignPh, editDistance } from './phonetics.js';

export function getCSS(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

export function colorFor(p){
  if(p>=0.6) return getCSS("--pos");
  if(p<=0.4) return getCSS("--neg");
  return getCSS("--neu");
}

export function escapeHtml(s){ return s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }

export function highlight(i, on, fromArc=true){
  const bars = $("arc").children, sents = document.querySelectorAll(".sent");
  if(bars[i]) bars[i].classList.toggle("active", on);
  if(sents[i]) sents[i].classList.toggle("active", on);
}

export function metric(v,k,hint,color){
  return `<div class="metric"><div class="v"${color?` style="color:${color}"`:""}>${v}</div><div class="k">${k}</div>${hint?`<div class="hint">${hint}</div>`:""}</div>`;
}

export function render({text, sentences, duration, sentiment=true, timedWords=null, compareRead=false, promptTarget=""}){
  const results = $("results");
  results.style.display="block";

  const words = wordCount(text);
  const wpm = duration>0 ? Math.round(words/(duration/60)) : 0;
  const fillers = countFillers(text, state.lang);
  const fillerRate = words ? (fillers.total/words*100) : 0;
  const overall = sentiment
    ? sentences.reduce((a,s)=> a + s.positivity*wordCount(s.text), 0)
      / Math.max(1, sentences.reduce((a,s)=>a+wordCount(s.text),0))
    : null;

  // metrics (la de positividad solo si el análisis está activo)
  const paceHint = wpm===0 ? "" : wpm<110 ? "a touch slow" : wpm>160 ? "a touch fast" : "good range";
  const sentLabel = overall>=0.6?"Positive":overall<=0.4?"Negative":"Neutral";
  $("metrics").innerHTML = `
    ${sentiment ? metric((overall*100).toFixed(0)+"%", "Positivity", sentLabel, colorFor(overall)) : ""}
    ${metric(wpm||"-", "Words / min", paceHint)}
    ${metric(words, "Words", fmtDur(duration))}
    ${metric(fillers.total, "Filler words", fillerRate.toFixed(1)+"% of words", fillers.total>0?getCSS("--accent"):null)}
  `;

  // evaluación de lectura (texto del prompt vs. lo grabado)
  renderReadEval(compareRead ? promptTarget : "", text);

  // sentiment arc (oculto si el análisis está apagado)
  const arcWrap = $("sentWrap");
  arcWrap.style.display = sentiment ? "" : "none";
  const arc = $("arc"); arc.innerHTML="";
  if(sentiment){
    sentences.forEach((s,i)=>{
      const b = document.createElement("div");
      b.className="seg-bar";
      const h = 26 + s.positivity*36;       // 26..62px
      b.style.height = h+"px";
      b.style.background = colorFor(s.positivity);
      b.title = `${(s.positivity*100).toFixed(0)}% - ${s.text.slice(0,60)}${s.text.length>60?".":""}`;
      b.addEventListener("mouseenter", ()=>highlight(i,true));
      b.addEventListener("mouseleave", ()=>highlight(i,false));
      arc.appendChild(b);
    });
  }

  // ritmo y pausas (necesita timestamps por palabra)
  renderRhythm(timedWords, duration);

  // transcript with per-sentence wrappers + filler highlight
  const doc = $("doc"); doc.innerHTML="";
  const fillerSet = FILLERS[state.lang]||FILLERS.english;
  sentences.forEach((s,i)=>{
    const span = document.createElement("span");
    span.className="sent"; span.dataset.i=i;
    span.style.borderBottomColor = sentiment ? colorFor(s.positivity) : "transparent";
    span.innerHTML = highlightFillers(s.text, fillerSet) + " ";
    span.addEventListener("mouseenter", ()=>highlight(i,true,false));
    span.addEventListener("mouseleave", ()=>highlight(i,false,false));
    doc.appendChild(span);
  });

  // ---- docx export setup ----
  state.last = { text, sentences, duration, words, wpm, fillers, overall, lang: state.lang, sentiment };
  if(state.docxUrl){ URL.revokeObjectURL(state.docxUrl); state.docxUrl = null; }
  const da = $("docxArea");
  da.innerHTML = `<button class="copy" id="docxGenBtn">📄 Generar Word (.docx)</button>`;
  $("docxGenBtn").addEventListener("click", onDocxClick);

  results.scrollIntoView({behavior:"smooth", block:"start"});
}

/* ---------------- evaluación de lectura: texto del prompt vs. grabado ----------------
   Con el toggle "Comparar lectura" en On, alinea palabra por palabra el texto objetivo
   contra la transcripción y colorea cada palabra: correcta / aproximada / fallada. */
function normReadWord(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9']/g,""); }

export function renderReadEval(promptTarget, transcript){
  const wrap = $("readWrap");
  state.wpImproveWords = [];   // se recalcula en cada análisis
  const tgtRaw = (promptTarget||"").match(/[A-Za-z\u00C0-\u00FF0-9\x27\u2019-]+/g) || [];
  const spkRaw = (transcript||"").match(/[A-Za-z\u00C0-\u00FF0-9\x27\u2019-]+/g) || [];
  if(tgtRaw.length < 1 || spkRaw.length < 1){ wrap.style.display = "none"; return; }

  const tgt = tgtRaw.map(normReadWord), spk = spkRaw.map(normReadWord);
  const ops = alignPh(tgt, spk);   // reutiliza la alineación (funciona sobre arrays de strings)

  let ti = 0, ok = 0, near = 0, bad = 0, extra = 0;
  const parts = [];
  const improve = [];   // {word, sev}
  const noteImprove = (word, sev)=>{ if(word && word.length>=3) improve.push({word, sev}); };
  ops.forEach(o=>{
    if(o.op === "ins"){                       // dijiste una palabra que no está en el texto
      extra++;
      parts.push(`<span class="rw extra" title="dijiste de más">${escapeHtml(spkRaw[spk.indexOf(o.r)]||o.r)}</span>`);
      return;
    }
    const disp = tgtRaw[ti]; ti++;
    if(o.op === "match"){ ok++; parts.push(`<span class="rw ok">${escapeHtml(disp)}</span>`); }
    else if(o.op === "del"){ bad++; noteImprove(o.t, 2); parts.push(`<span class="rw bad" title="no se detectó">${escapeHtml(disp)}</span>`); }
    else {                                    // sustitución: ¿lo intentó (parecido) o falló feo?
      const d = editDistance([...o.t], [...o.r]);
      const ratio = 1 - d / Math.max(o.t.length, o.r.length, 1);
      if(ratio >= 0.5){ near++; noteImprove(o.t, 1); parts.push(`<span class="rw near" title="dijiste: ${escapeHtml(o.r)}">${escapeHtml(disp)}</span>`); }
      else { bad++; noteImprove(o.t, 2); parts.push(`<span class="rw bad" title="dijiste: ${escapeHtml(o.r)}">${escapeHtml(disp)}</span>`); }
    }
  });

  // dedup (mayor severidad gana), primero las falladas, top 20
  const seen = new Map();
  improve.forEach(({word,sev})=>{ if(!seen.has(word) || sev>seen.get(word)) seen.set(word, sev); });
  state.wpImproveWords = [...seen.entries()]
    .map(([word,sev])=>({word,sev}))
    .sort((a,b)=> b.sev - a.sev)
    .slice(0,20);

  const score = Math.max(0, Math.round(100*(ok + near*0.5)/Math.max(1, tgt.length) - Math.min(15, extra*3)));
  const color = score>=85 ? getCSS("--pos") : score>=60 ? getCSS("--neu") : getCSS("--neg");

  $("readScore").innerHTML = `<span style="color:${color}">${score}%</span>`
    + ` <span style="font-size:13px;color:var(--muted);font-family:'Inter',sans-serif;font-weight:600">de lectura correcta</span>`;
  $("readDiff").innerHTML = parts.join(" ");
  $("readNote").textContent = `${ok} correctas · ${near} aproximadas · ${bad} falladas/omitidas`
    + (extra ? ` · ${extra} de más` : "")
    + ".  Pasa el cursor sobre una palabra para ver qué se entendió.";
  wrap.style.display = "";
}

/* ---------------- ritmo y pausas ---------------- */
// Normaliza la salida de Whisper (out.chunks con timestamps) a [{text,start,end}].
export function extractTimedWords(out){
  const chunks = (out && (out.chunks || out.words)) || null;
  if(!Array.isArray(chunks) || !chunks.length) return null;
  const words = [];
  for(const c of chunks){
    const t = (c.text || "").trim();
    if(!t) continue;
    const ts = c.timestamp || c.timestamps || null;
    let start = ts ? ts[0] : (c.start != null ? c.start : null);
    let end   = ts ? ts[1] : (c.end   != null ? c.end   : null);
    if(start == null || isNaN(start)) continue;
    if(end == null || isNaN(end) || end < start) end = start;
    words.push({ text:t, start, end });
  }
  return words.length ? words : null;
}

// Color por ritmo conversacional (palabras por minuto de la ventana).
function paceColorFor(wpm){
  if(wpm <= 0)  return getCSS("--line-strong");   // silencio
  if(wpm < 90 || wpm > 185) return getCSS("--neg");
  if(wpm < 110 || wpm > 165) return getCSS("--neu");
  return getCSS("--pos");
}

export function renderRhythm(words, duration){
  const wrap = $("rhythmWrap");
  if(!words || words.length < 3 || !duration || duration <= 0){
    if(wrap) wrap.style.display = "none";
    return;
  }
  wrap.style.display = "";
  const T = duration;

  // --- pausas: huecos entre el fin de una palabra y el inicio de la siguiente ---
  const PAUSE_MIN = 0.35;   // umbral para contarla como pausa perceptible
  const PAUSE_LONG = 0.6;   // umbral para "pausa larga"
  const pauses = [];
  for(let i=1;i<words.length;i++){
    const gap = words[i].start - words[i-1].end;
    if(gap >= PAUSE_MIN) pauses.push({ at: words[i-1].end, len: gap });
  }
  const longPauses = pauses.filter(p=>p.len >= PAUSE_LONG);
  const longest = pauses.reduce((m,p)=>Math.max(m,p.len), 0);

  // --- ritmo por ventanas de ~1s (palabras cuyo punto medio cae en la ventana) ---
  const BIN = 1.0;
  const nBins = Math.max(6, Math.min(48, Math.ceil(T / BIN)));
  const binDur = T / nBins;
  const counts = new Array(nBins).fill(0);
  for(const w of words){
    const mid = (w.start + w.end) / 2;
    let idx = Math.floor(mid / binDur);
    if(idx < 0) idx = 0; if(idx >= nBins) idx = nBins - 1;
    counts[idx]++;
  }
  const wpmBins = counts.map(c => c / binDur * 60);
  const maxWpm = Math.max(180, ...wpmBins);

  // --- barras de ritmo ---
  const bars = $("rhythmBars"); bars.innerHTML = "";
  wpmBins.forEach((wpm,i)=>{
    const b = document.createElement("i");
    const h = wpm <= 0 ? 3 : Math.max(6, Math.round(wpm / maxWpm * 60));
    b.style.height = h + "px";
    b.style.background = paceColorFor(wpm);
    const t0 = (i*binDur), t1 = ((i+1)*binDur);
    b.title = `${t0.toFixed(1)}-${t1.toFixed(1)}s · ${Math.round(wpm)} ppm`;
    bars.appendChild(b);
  });

  // --- marcadores de pausa (posición por % de tiempo) ---
  const pausesEl = $("rhythmPauses"); pausesEl.innerHTML = "";
  pauses.forEach(p=>{
    const m = document.createElement("b");
    m.style.left = (p.at / T * 100) + "%";
    m.style.opacity = p.len >= PAUSE_LONG ? "0.6" : "0.32";
    m.title = `Pausa de ${p.len.toFixed(1)}s a los ${p.at.toFixed(1)}s`;
    pausesEl.appendChild(m);
  });

  // --- eje de tiempo ---
  const axis = $("rhythmAxis"); axis.innerHTML = "";
  const ticks = 4;
  for(let k=0;k<=ticks;k++){
    const s = document.createElement("span");
    s.textContent = fmtDur(T * k / ticks);
    axis.appendChild(s);
  }

  // --- métricas + consistencia del ritmo ---
  const active = wpmBins.filter(w=>w>0);
  const mean = active.reduce((a,b)=>a+b,0) / Math.max(1, active.length);
  const variance = active.reduce((a,b)=>a+(b-mean)*(b-mean),0) / Math.max(1, active.length);
  const cv = mean > 0 ? Math.sqrt(variance)/mean : 0;   // coeficiente de variación
  const steady = cv < 0.35 ? "Estable" : cv < 0.6 ? "Algo irregular" : "Irregular";
  const steadyColor = cv < 0.35 ? getCSS("--pos") : cv < 0.6 ? getCSS("--neu") : getCSS("--neg");

  $("rhythmMetrics").innerHTML = `
    <div class="rm"><span class="v">${longPauses.length}</span><span class="k">Pausas largas (≥${PAUSE_LONG}s)</span></div>
    <div class="rm"><span class="v">${longest ? longest.toFixed(1)+"s" : "-"}</span><span class="k">Pausa más larga</span></div>
    <div class="rm"><span class="v">${Math.round(mean)||"-"}</span><span class="k">Ritmo medio (ppm)</span></div>
    <div class="rm"><span class="v" style="color:${steadyColor}">${steady}</span><span class="k">Consistencia</span></div>
  `;

  // Nota interpretativa breve.
  let note = "";
  if(longPauses.length >= 3) note = "Varias pausas largas — respira, pero evita quedarte en blanco entre ideas.";
  else if(cv >= 0.6) note = "Tu velocidad cambia bastante; intenta un ritmo más parejo.";
  else if(mean > 165) note = "Vas rápido; baja un poco para que se te entienda mejor.";
  else if(mean > 0 && mean < 110) note = "Vas algo lento; puedes ganar algo de energía.";
  else note = "Buen ritmo y pausas naturales. 👍";
  $("rhythmNote").textContent = note;
}

function highlightFillers(text, fillers){
  let html = escapeHtml(text);
  // longest first so multi-word fillers match before single words
  [...fillers].sort((a,b)=>b.length-a.length).forEach(f=>{
    const re = new RegExp("(^|\\b)("+f.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")(\\b)","gi");
    html = html.replace(re, (m,p1,p2,p3)=>`${p1}<span class="filler">${p2}</span>${p3}`);
  });
  return html;
}

export async function onDocxClick(){
  const btn = $("docxGenBtn");
  if(!btn) return;
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = "Generando…";
  try{
    const blob = await buildDocxBlob();
    if(state.docxUrl) URL.revokeObjectURL(state.docxUrl);
    state.docxUrl = URL.createObjectURL(blob);
    const da = $("docxArea");
    da.innerHTML = `<a class="docx-link" id="docxLink" href="${state.docxUrl}" download="voice-coach-analisis.docx">⬇ Descargar voice-coach-analisis.docx</a>`;
    $("docxLink").click(); // descarga automática; el enlace queda para volver a bajarlo
  }catch(err){
    console.error(err);
    btn.disabled = false;
    btn.textContent = orig;
    setStatus("No se pudo generar el Word: " + err.message, true);
  }
}
