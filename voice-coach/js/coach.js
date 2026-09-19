/* ---------------- coach: modos Take an Interview, Listen & Repeat, historial y corrección ----------------
   Se monta encima del flujo existente (Record → analyze → render) sin modificarlo:
   - dispara la grabación con el botón existente y la detiene con stopRecording()
   - escucha el evento "vc:analyzed" que analysis.js emite al terminar
   - guarda cada sesión en localStorage y calcula racha */
import { state, $, setStatus } from './state.js';
import { stopRecording } from './analysis.js';
import { pickVoice, synth, stopSpeaking } from './tts.js';
import { alignPh, editDistance } from './phonetics.js';
import { INTERVIEW_TOEFL, INTERVIEW_TECH, REPEAT_TRAPS, REPEAT_TOEFL, REPEAT_TEXTS, pick } from './banks.js';

/* ================= estado del coach ================= */
const coach = {
  mode: "free",            // free | interview | repeat | history
  // interview
  ivCat: "toefl",          // toefl | tech | mixed
  ivSecs: 45, ivPrep: 15,
  ivTopic: null, ivIdx: 0, ivQuestion: "",
  ivTimer: null, ivPhase: "idle",   // idle | prep | recording | analyzing | done
  // repeat
  rpSource: "traps",       // traps | toefl | texts
  rpItem: null, rpText: null, rpSentIdx: 0, rpTextScores: [],
  rpTimer: null, rpPhase: "idle",
  rpRevealed: false,
  // pending session (se completa cuando llega vc:analyzed)
  pending: null,
};

const LS_HIST = "vc_history_v1";
const LS_KEY  = "claude_api_key";
const LS_MODEL= "claude_coach_model";
const DEFAULT_MODEL = "claude-opus-5";

/* ================= historial ================= */
function loadHistory(){ try{ return JSON.parse(localStorage.getItem(LS_HIST)||"[]"); }catch(e){ return []; } }
function saveHistory(h){ try{ localStorage.setItem(LS_HIST, JSON.stringify(h.slice(-500))); }catch(e){ console.warn("history save failed", e); } }
function addSession(s){ const h=loadHistory(); s.id = Date.now()+"-"+Math.random().toString(36).slice(2,7); h.push(s); saveHistory(h); refreshStreakChip(); return s; }
function updateSession(id, patch){ const h=loadHistory(); const i=h.findIndex(x=>x.id===id); if(i>=0){ Object.assign(h[i], patch); saveHistory(h); } }
function dayKey(ts){ const d=new Date(ts); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function streakInfo(h){
  const days = new Set(h.map(s=>dayKey(s.ts)));
  const today = dayKey(Date.now());
  let streak=0, cursor=new Date();
  if(!days.has(today)) cursor.setDate(cursor.getDate()-1);     // si hoy aún no practicaste, cuenta hasta ayer
  while(days.has(dayKey(cursor.getTime()))){ streak++; cursor.setDate(cursor.getDate()-1); }
  return { streak, today: days.has(today) };
}

/* ================= UI helpers ================= */
const area = ()=>$("coachArea");
function h(html){ const t=document.createElement("template"); t.innerHTML=html.trim(); return t.content.firstElementChild; }
function esc(s){ return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function mmss(s){ s=Math.max(0,Math.round(s)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }
function setReadCompare(on){
  const b=$("readSeg") && $("readSeg").querySelector(on?'[data-read="on"]':'[data-read="off"]');
  if(b && b.getAttribute("aria-pressed")!=="true") b.click(); else state.compareRead=on;
}
function scrollToRec(){ const p=document.querySelector(".controls"); if(p) p.scrollIntoView({behavior:"smooth", block:"center"}); }
// initRecording() marca el estado con la clase "err" cuando el micrófono no se pudo abrir
function micFailed(){ const s=$("status"); return !!(s && s.classList.contains("err")); }
function clearMicError(){ const s=$("status"); if(s) s.classList.remove("err"); }
function speak(text, rate=0.9){
  if(!synth){ setStatus("Tu navegador no soporta la voz del sistema.", true); return; }
  try{ stopSpeaking(); }catch(e){}
  synth.cancel();
  const u=new SpeechSynthesisUtterance(text); u.lang="en-US"; u.rate=rate; u.pitch=1;
  const v=pickVoice("en"); if(v) u.voice=v;
  synth.speak(u);
}

/* ================= modo: selector ================= */
export function setMode(mode){
  coach.mode = mode;
  document.querySelectorAll("#modeSeg button").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.mode===mode)));
  clearTimers();
  if(mode==="free"){ setReadCompare(false); area().innerHTML=""; area().style.display="none"; return; }
  area().style.display="block";
  if(mode==="interview") renderInterview();
  else if(mode==="repeat") renderRepeat();
  else if(mode==="history") renderHistory();
}
function clearTimers(){ if(coach.ivTimer){ clearInterval(coach.ivTimer); coach.ivTimer=null; } if(coach.rpTimer){ clearTimeout(coach.rpTimer); coach.rpTimer=null; } }

/* ================= TAKE AN INTERVIEW ================= */
function ivBank(){ return coach.ivCat==="toefl" ? INTERVIEW_TOEFL : coach.ivCat==="tech" ? INTERVIEW_TECH : INTERVIEW_TOEFL.concat(INTERVIEW_TECH); }
function ivNewTopic(){ coach.ivTopic = pick(ivBank(), coach.ivTopic); coach.ivIdx=0; coach.ivQuestion = coach.ivTopic.q[0]; coach.ivPhase="idle"; }
function ivNext(){ if(!coach.ivTopic) return ivNewTopic(); coach.ivIdx=(coach.ivIdx+1)%coach.ivTopic.q.length; if(coach.ivIdx===0) return ivNewTopic(); coach.ivQuestion=coach.ivTopic.q[coach.ivIdx]; coach.ivPhase="idle"; }

function renderInterview(){
  if(!coach.ivTopic) ivNewTopic();
  const el = area(); el.innerHTML="";
  el.appendChild(h(`
    <div class="coach-box">
      <div class="coach-head">
        <span class="coach-eyebrow">🎤 Take an Interview</span>
        <span class="coach-sub">Tarea 2 del TOEFL iBT 2026 · mismo formato que una entrevista de trabajo</span>
      </div>
      <div class="coach-config">
        <div class="field"><label>Banco</label>
          <div class="seg" id="ivCatSeg">
            <button data-v="toefl" aria-pressed="${coach.ivCat==="toefl"}">TOEFL</button>
            <button data-v="tech" aria-pressed="${coach.ivCat==="tech"}">Técnica</button>
            <button data-v="mixed" aria-pressed="${coach.ivCat==="mixed"}">Mixta</button>
          </div></div>
        <div class="field"><label>Respuesta</label>
          <div class="seg" id="ivSecSeg">
            <button data-v="45" aria-pressed="${coach.ivSecs===45}">45 s</button>
            <button data-v="60" aria-pressed="${coach.ivSecs===60}">60 s</button>
            <button data-v="90" aria-pressed="${coach.ivSecs===90}">90 s</button>
          </div></div>
        <div class="field"><label>Preparación</label>
          <div class="seg" id="ivPrepSeg">
            <button data-v="0" aria-pressed="${coach.ivPrep===0}">0 s</button>
            <button data-v="15" aria-pressed="${coach.ivPrep===15}">15 s</button>
            <button data-v="30" aria-pressed="${coach.ivPrep===30}">30 s</button>
          </div></div>
      </div>
      <div class="coach-card">
        <div class="coach-topic">${esc(coach.ivTopic.topic)} · pregunta ${coach.ivIdx+1} de ${coach.ivTopic.q.length}</div>
        <div class="coach-question" id="ivQ">${esc(coach.ivQuestion)}</div>
        <div class="coach-timer" id="ivTimer"></div>
        <div class="coach-actions">
          <button class="coach-btn primary" id="ivStart">▶ Empezar</button>
          <button class="coach-btn" id="ivListen">🔊 Escuchar pregunta</button>
          <button class="coach-btn" id="ivNext">↻ Siguiente pregunta</button>
          <button class="coach-btn" id="ivNewTopic">🎲 Otro tema</button>
        </div>
        <div class="coach-hint">Estructura que se evalúa: <b>afirmación → razón → ejemplo → cierre</b>. Sin auxiliares perdidos: <i>we <b>are</b> going</i>, <i>it <b>is</b> being processed</i>.</div>
      </div>
      <div id="ivResult"></div>
    </div>`));
  wireSeg("ivCatSeg", v=>{ coach.ivCat=v; ivNewTopic(); renderInterview(); });
  wireSeg("ivSecSeg", v=>{ coach.ivSecs=+v; });
  wireSeg("ivPrepSeg", v=>{ coach.ivPrep=+v; });
  $("ivStart").addEventListener("click", ivStart);
  $("ivListen").addEventListener("click", ()=>speak(coach.ivQuestion, 0.95));
  $("ivNext").addEventListener("click", ()=>{ clearTimers(); ivNext(); renderInterview(); });
  $("ivNewTopic").addEventListener("click", ()=>{ clearTimers(); ivNewTopic(); renderInterview(); });
}
function wireSeg(id, cb){ const seg=$(id); if(!seg) return; seg.querySelectorAll("button").forEach(b=>b.addEventListener("click", ()=>{ seg.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); cb(b.dataset.v); })); }

function ivStart(){
  if(coach.ivPhase!=="idle" && coach.ivPhase!=="done") return;
  setReadCompare(false);
  $("ivResult").innerHTML="";
  const timerEl=$("ivTimer"), startBtn=$("ivStart");
  startBtn.disabled=true;
  let left = coach.ivPrep;
  coach.ivPhase="prep";
  const tick = ()=>{
    if(coach.ivPhase==="prep"){
      if(left<=0){ beginRecording(); return; }
      timerEl.innerHTML = `<span class="ct-lbl">Prepara</span><span class="ct-num">${left}</span>`;
      left--;
    }else if(coach.ivPhase==="recording"){
      if(!state.recording){
        if(recStarted){ // el usuario paró con el botón Stop: el análisis ya está en marcha
          clearTimers(); coach.ivPhase="analyzing"; timerEl.innerHTML = `<span class="ct-lbl">Analizando…</span>`; return;
        }
        if(micFailed()){ // initRecording ya mostró el motivo en el estado
          clearTimers(); coach.ivPhase="idle"; coach.pending=null; startBtn.disabled=false;
          timerEl.innerHTML = `<span class="ct-lbl err">No se pudo iniciar el micrófono — revisa el mensaje de estado más abajo.</span>`; return;
        }
        timerEl.innerHTML = `<span class="ct-lbl">Esperando micrófono…</span>`; return;   // permiso pendiente: no descontar
      }
      if(!recStarted){ recStarted=true; left=coach.ivSecs; }   // el reloj arranca cuando el micro de verdad graba
      if(left<=0){ endRecording(); return; }
      timerEl.innerHTML = `<span class="ct-lbl rec">Hablando</span><span class="ct-num">${mmss(left)}</span>`;
      left--;
    }
  };
  let recStarted=false;
  const beginRecording = ()=>{
    coach.ivPhase="recording"; left=coach.ivSecs; recStarted=false;
    coach.pending = { mode:"interview", ts:Date.now(), prompt:coach.ivQuestion, topic:coach.ivTopic.topic, cat:coach.ivCat, secs:coach.ivSecs };
    clearMicError();
    if(!state.recording) $("recBtn").click();
    tick();
  };
  const endRecording = ()=>{
    clearTimers(); coach.ivPhase="analyzing";
    timerEl.innerHTML = `<span class="ct-lbl">Analizando…</span>`;
    if(state.recording) stopRecording();
  };
  if(coach.ivPrep===0){ beginRecording(); }
  else { tick(); }
  coach.ivTimer = setInterval(tick, 1000);
  scrollToRec();
}

/* ---- resultado de la entrevista ---- */
function longPauses(timedWords){
  if(!timedWords || timedWords.length<2) return 0;
  let n=0; for(let i=1;i<timedWords.length;i++){ if(timedWords[i].start - timedWords[i-1].end >= 0.6) n++; } return n;
}
async function onInterviewAnalyzed(d){
  const p = coach.pending; coach.pending=null;
  coach.ivPhase="done"; clearTimers();
  const startBtn=$("ivStart"); if(startBtn) startBtn.disabled=false;
  const last = state.last || {};
  const sess = addSession(Object.assign(p, {
    transcript: d.text, duration: Math.round(d.duration), words: last.words||0, wpm: last.wpm||0,
    fillers: last.fillers ? last.fillers.total : 0, longPauses: longPauses(d.timedWords), band: null,
  }));
  const timerEl=$("ivTimer"); if(timerEl) timerEl.innerHTML = `<span class="ct-lbl">Listo · ${mmss(d.duration)} · ${last.wpm||0} ppm</span>`;
  renderCoachBox(sess);
  if(getApiKey()) runCoach(sess);
}
function getApiKey(){ try{ return localStorage.getItem(LS_KEY)||""; }catch(e){ return ""; } }
function getModel(){ try{ return localStorage.getItem(LS_MODEL)||DEFAULT_MODEL; }catch(e){ return DEFAULT_MODEL; } }

export function renderCoachBox(sess){
  const box=$("ivResult"); if(!box) return;
  box.innerHTML="";
  box.appendChild(h(`
    <div class="coach-result" id="coachResult">
      <div class="coach-result-head">
        <span class="coach-eyebrow">Corrección</span>
        <span class="coach-mini">${sess.words} palabras · ${sess.wpm} ppm · ${sess.fillers} muletillas · ${sess.longPauses} pausas largas</span>
      </div>
      <div class="coach-result-body" id="coachBody">
        <div class="coach-empty">
          ${getApiKey() ? "Corrigiendo con Claude…" : "Sin API key: pega tu clave para corrección automática, o copia el prompt y pégalo en Claude."}
        </div>
        <div class="coach-actions">
          <button class="coach-btn primary" id="coachRun">${getApiKey() ? "↻ Corregir de nuevo" : "🔑 Configurar API key"}</button>
          <button class="coach-btn" id="coachCopy">📋 Copiar prompt de corrección</button>
          <button class="coach-btn" id="coachKey" title="Cambiar o borrar la clave">⚙ Clave / modelo</button>
        </div>
      </div>
    </div>`));
  $("coachRun").addEventListener("click", ()=>{ if(!getApiKey()){ if(!askApiKey()) return; } runCoach(sess); });
  $("coachCopy").addEventListener("click", ()=>{ navigator.clipboard.writeText(buildUserPrompt(sess)+"\n\n"+SYSTEM_PROMPT).then(()=>{ $("coachCopy").textContent="Copiado ✓"; setTimeout(()=>$("coachCopy").textContent="📋 Copiar prompt de corrección",1500); }); });
  $("coachKey").addEventListener("click", askApiKey);
}
function askApiKey(){
  const cur=getApiKey();
  const k = prompt("API key de Anthropic (se guarda solo en este navegador). Deja vacío para borrarla:", cur ? cur.slice(0,12)+"…" : "");
  if(k===null) return false;
  if(k.trim()==="" ){ localStorage.removeItem(LS_KEY); return false; }
  if(!k.includes("…")) localStorage.setItem(LS_KEY, k.trim());
  const m = prompt("Modelo (Enter para dejar "+getModel()+"):", getModel());
  if(m && m.trim()) localStorage.setItem(LS_MODEL, m.trim());
  return true;
}

const SYSTEM_PROMPT = `You are an English speaking coach for Alejandro, a Spanish-speaking senior software architect preparing for the TOEFL iBT 2026 "Take an Interview" speaking task and for technical job interviews in English. Target level: CEFR B2+ / C1.
Known weaknesses: (1) drops the auxiliary "be" under pressure ("we going" instead of "we are going"); (2) drops final consonants when speaking (this is NOT visible in an ASR transcript — do not comment on pronunciation); (3) loses coherence when giving opinions: ideas start and are not finished.
You receive the question, the ASR transcript (may contain minor recognition errors — ignore obvious ASR artifacts), duration and words per minute.
Return ONLY a JSON object, no prose, with this exact shape:
{"band": <number 1-6 in 0.5 steps, TOEFL 2026 speaking scale>,
 "summary_es": "<2 frases en español: qué hizo bien y qué le costó>",
 "form_errors": [{"said":"<fragment as said>","fix":"<corrected fragment>","rule_es":"<regla en una línea>"}],   // max 6, only real grammar/word-choice errors
 "structure": {"claim":<bool>,"reason":<bool>,"example":<bool>,"close":<bool>,"note_es":"<una línea>"},
 "better_version": "<the same ideas as a natural spoken answer of about 45 seconds (90-110 words), first person, B2+ register, English>",
 "drills": ["<short English sentence to repeat aloud that fixes the top error>","<...>","<...>"],
 "next_focus_es": "<una sola cosa para la próxima respuesta>"}
Explanations in Spanish; all corrected English in English. Be specific and concrete, never generic.`;

function buildUserPrompt(sess){
  return `QUESTION: ${sess.prompt}\nCATEGORY: ${sess.cat}\nDURATION: ${sess.duration}s · WORDS/MIN: ${sess.wpm} · FILLERS: ${sess.fillers} · LONG PAUSES: ${sess.longPauses}\n\nTRANSCRIPT:\n${sess.transcript}`;
}

let _sdkPromise=null;
async function loadSdk(){
  if(!_sdkPromise) _sdkPromise = import("https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk/+esm").then(m=>m.default||m.Anthropic||m);
  return _sdkPromise;
}
async function callClaude(system, user){
  const apiKey=getApiKey(), model=getModel();
  try{
    const Anthropic = await loadSdk();
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser:true });
    const res = await client.messages.create({ model, max_tokens:4000, system, messages:[{role:"user", content:user}] });
    return res.content.filter(b=>b.type==="text").map(b=>b.text).join("");
  }catch(sdkErr){
    console.warn("SDK path failed, using fetch:", sdkErr);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "content-type":"application/json", "x-api-key":apiKey, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
      body: JSON.stringify({ model, max_tokens:4000, system, messages:[{role:"user", content:user}] })
    });
    if(!r.ok){ const t=await r.text(); throw new Error("API "+r.status+": "+t.slice(0,300)); }
    const j=await r.json();
    return (j.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
  }
}
function parseJson(txt){
  const a=txt.indexOf("{"), b=txt.lastIndexOf("}");
  if(a<0||b<0) throw new Error("La respuesta no trae JSON.");
  return JSON.parse(txt.slice(a,b+1));
}

async function runCoach(sess){
  const body=$("coachBody"); if(!body) return;
  body.innerHTML = `<div class="coach-empty">Corrigiendo con ${esc(getModel())}…</div>`;
  try{
    const txt = await callClaude(SYSTEM_PROMPT, buildUserPrompt(sess));
    const r = parseJson(txt);
    updateSession(sess.id, { band:r.band, coach:r });
    renderCorrection(r, sess);
  }catch(err){
    console.error(err);
    body.innerHTML = `<div class="coach-empty err">No se pudo corregir: ${esc(err.message||err)}</div>`;
    body.appendChild(h(`<div class="coach-actions"><button class="coach-btn primary" id="coachRetry">↻ Reintentar</button><button class="coach-btn" id="coachKey2">⚙ Clave / modelo</button><button class="coach-btn" id="coachCopy2">📋 Copiar prompt</button></div>`));
    $("coachRetry").addEventListener("click", ()=>runCoach(sess));
    $("coachKey2").addEventListener("click", askApiKey);
    $("coachCopy2").addEventListener("click", ()=>navigator.clipboard.writeText(buildUserPrompt(sess)+"\n\n"+SYSTEM_PROMPT));
  }
}
function bandColor(b){ return b>=4.5 ? "var(--pos)" : b>=3.5 ? "var(--neu)" : "var(--neg)"; }
export function renderCorrection(r, sess){
  const body=$("coachBody"); if(!body) return;
  const st=r.structure||{};
  const chip=(ok,label)=>`<span class="st-chip ${ok?"ok":"no"}">${ok?"✓":"✗"} ${label}</span>`;
  body.innerHTML = `
    <div class="coach-grid">
      <div class="coach-band" style="color:${bandColor(r.band)}"><span class="cb-num">${esc(r.band)}</span><span class="cb-lbl">banda / 6</span></div>
      <div class="coach-summary">${esc(r.summary_es)}</div>
    </div>
    <div class="coach-section"><div class="cs-title">Estructura</div>
      <div class="st-chips">${chip(st.claim,"Afirmación")}${chip(st.reason,"Razón")}${chip(st.example,"Ejemplo")}${chip(st.close,"Cierre")}</div>
      <div class="cs-note">${esc(st.note_es||"")}</div></div>
    ${(r.form_errors&&r.form_errors.length) ? `<div class="coach-section"><div class="cs-title">Errores de forma</div>
      <table class="err-table"><thead><tr><th>Dijiste</th><th>Mejor</th><th>Regla</th></tr></thead><tbody>
      ${r.form_errors.map(e=>`<tr><td class="said">${esc(e.said)}</td><td class="fix">${esc(e.fix)}</td><td class="rule">${esc(e.rule_es)}</td></tr>`).join("")}
      </tbody></table></div>` : `<div class="coach-section"><div class="cs-title">Errores de forma</div><div class="cs-note">Sin errores gramaticales relevantes. 👍</div></div>`}
    <div class="coach-section"><div class="cs-title">Tu respuesta, mejor dicha (≈45 s)</div>
      <div class="better" id="betterTxt">${esc(r.better_version)}</div>
      <div class="coach-actions"><button class="coach-btn" id="betterPlay">🔊 Escuchar</button><button class="coach-btn" id="betterSlow">🐢 Lento</button><button class="coach-btn" id="betterRepeat">🔁 Practicar en Listen & Repeat</button></div></div>
    <div class="coach-section"><div class="cs-title">Repite en voz alta</div>
      <ol class="drills">${(r.drills||[]).map((d,i)=>`<li><span>${esc(d)}</span><button class="coach-btn small" data-d="${i}">🔊</button></li>`).join("")}</ol></div>
    <div class="coach-section focus"><div class="cs-title">Próxima respuesta: un solo foco</div><div class="cs-note big">${esc(r.next_focus_es)}</div></div>
    <div class="coach-actions"><button class="coach-btn primary" id="ivAgain">🎤 Siguiente pregunta</button><button class="coach-btn" id="ivRetry">↻ Repetir esta pregunta</button></div>`;
  $("betterPlay").addEventListener("click", ()=>speak(r.better_version, 0.95));
  $("betterSlow").addEventListener("click", ()=>speak(r.better_version, 0.75));
  $("betterRepeat").addEventListener("click", ()=>{ loadCustomText("Tu respuesta mejorada", r.better_version); });
  body.querySelectorAll("[data-d]").forEach(b=>b.addEventListener("click", ()=>speak(r.drills[+b.dataset.d], 0.9)));
  $("ivAgain").addEventListener("click", ()=>{ ivNext(); renderInterview(); });
  $("ivRetry").addEventListener("click", ()=>{ coach.ivPhase="idle"; renderInterview(); });
}

/* ================= LISTEN & REPEAT ================= */
function rpBank(){ return coach.rpSource==="traps" ? REPEAT_TRAPS : REPEAT_TOEFL; }
function rpCurrentSentence(){
  if(coach.rpSource==="texts" && coach.rpText) return { text: coach.rpText.sentences[coach.rpSentIdx], traps:[] };
  return coach.rpItem;
}
function rpNew(){
  coach.rpRevealed=false; coach.rpPhase="idle";
  if(coach.rpSource==="texts"){ coach.rpText = pick(REPEAT_TEXTS, coach.rpText); coach.rpSentIdx=0; coach.rpTextScores=[]; }
  else { coach.rpItem = pick(rpBank(), coach.rpItem); }
}
function loadCustomText(title, text){
  // divide un texto libre en oraciones y lo carga como "texto" en Listen & Repeat
  const sentences = (text.match(/[^.!?]+[.!?]*/g)||[text]).map(s=>s.trim()).filter(s=>s.length>3);
  coach.rpSource="texts"; coach.rpText={ title, sentences }; coach.rpSentIdx=0; coach.rpTextScores=[]; coach.rpRevealed=false; coach.rpPhase="idle";
  setMode("repeat");
}
function normW(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9']/g,""); }
function wordsOf(s){ return (s||"").match(/[A-Za-z0-9'’-]+/g)||[]; }

function renderRepeat(){
  if(!coach.rpItem && coach.rpSource!=="texts") rpNew();
  if(coach.rpSource==="texts" && !coach.rpText) rpNew();
  const cur = rpCurrentSentence();
  const el=area(); el.innerHTML="";
  const isText = coach.rpSource==="texts";
  const nWords = wordsOf(cur.text).length;
  el.appendChild(h(`
    <div class="coach-box">
      <div class="coach-head">
        <span class="coach-eyebrow">🔁 Listen & Repeat</span>
        <span class="coach-sub">Tarea 1 del TOEFL iBT 2026 · escucha, repite, compara</span>
      </div>
      <div class="coach-config">
        <div class="field"><label>Fuente</label>
          <div class="seg" id="rpSrcSeg">
            <button data-v="traps" aria-pressed="${coach.rpSource==="traps"}">Trampas</button>
            <button data-v="toefl" aria-pressed="${coach.rpSource==="toefl"}">Frases TOEFL</button>
            <button data-v="texts" aria-pressed="${coach.rpSource==="texts"}">Textos TOEFL</button>
          </div></div>
      </div>
      <div class="coach-card">
        <div class="coach-topic">${isText ? esc(coach.rpText.title)+" · oración "+(coach.rpSentIdx+1)+" de "+coach.rpText.sentences.length : (coach.rpItem.focus==="be" ? "Foco: auxiliar be" : coach.rpItem.focus==="final" ? "Foco: consonantes finales" : "Foco: mixto")} · ${nWords} palabras</div>
        <div class="coach-sentence ${coach.rpRevealed?"":"hidden"}" id="rpSentence">${coach.rpRevealed ? esc(cur.text) : "🔒 Escucha primero. El texto se muestra después de grabar."}</div>
        ${(!isText && cur.traps.length) ? `<div class="coach-traps">Ojo con: ${cur.traps.map(t=>`<span class="trap-chip">${esc(t)}</span>`).join("")}</div>` : ""}
        <div class="coach-timer" id="rpTimer"></div>
        <div class="coach-actions">
          <button class="coach-btn" id="rpListen">🔊 Escuchar</button>
          <button class="coach-btn" id="rpSlow">🐢 Lento</button>
          <button class="coach-btn primary" id="rpRec">🎙 Repetir (grabar)</button>
          <button class="coach-btn" id="rpReveal">👁 Ver texto</button>
          <button class="coach-btn" id="rpNext">${isText ? "→ Siguiente oración" : "↻ Nueva frase"}</button>
          ${isText ? `<button class="coach-btn" id="rpNewText">🎲 Otro texto</button>` : ""}
        </div>
        <div class="coach-hint">Con texto conocido, Whisper ya no puede “arreglarte” las consonantes: lo que no se oye, se marca.</div>
      </div>
      <div id="rpResult"></div>
      ${isText && coach.rpTextScores.length ? `<div class="coach-mini" style="margin-top:10px">Promedio del texto: <b>${Math.round(coach.rpTextScores.reduce((a,b)=>a+b,0)/coach.rpTextScores.length)}%</b> en ${coach.rpTextScores.length} oración(es)</div>` : ""}
    </div>`));
  wireSeg("rpSrcSeg", v=>{ coach.rpSource=v; rpNew(); renderRepeat(); });
  $("rpListen").addEventListener("click", ()=>speak(cur.text, 0.9));
  $("rpSlow").addEventListener("click", ()=>speak(cur.text, 0.7));
  $("rpReveal").addEventListener("click", ()=>{ coach.rpRevealed=true; renderRepeat(); });
  $("rpNext").addEventListener("click", ()=>{ clearTimers(); if(isText){ coach.rpSentIdx=(coach.rpSentIdx+1)%coach.rpText.sentences.length; coach.rpRevealed=false; coach.rpPhase="idle"; } else rpNew(); renderRepeat(); });
  const nt=$("rpNewText"); if(nt) nt.addEventListener("click", ()=>{ clearTimers(); rpNew(); renderRepeat(); });
  $("rpRec").addEventListener("click", rpStart);
}
function rpStart(){
  if(state.recording) return;
  const cur = rpCurrentSentence();
  // el flujo existente compara la transcripción contra el texto del prompt
  $("promptText").value = cur.text;
  setReadCompare(true);
  coach.pending = { mode:"repeat", ts:Date.now(), prompt:cur.text, source:coach.rpSource, traps:cur.traps||[], title: coach.rpText ? coach.rpText.title : null };
  coach.rpPhase="recording";
  clearMicError();
  $("recBtn").click();
  const secs = Math.min(30, Math.max(6, Math.round(wordsOf(cur.text).length*0.7)+3));
  let left=secs, started=false; const timerEl=$("rpTimer");
  const tick=()=>{
    if(!state.recording){
      if(started){ clearTimers(); timerEl.innerHTML=`<span class="ct-lbl">Analizando…</span>`; return; }
      if(micFailed()){ clearTimers(); coach.pending=null; coach.rpPhase="idle"; timerEl.innerHTML=`<span class="ct-lbl err">No se pudo iniciar el micrófono — revisa el mensaje de estado más abajo.</span>`; return; }
      timerEl.innerHTML=`<span class="ct-lbl">Esperando micrófono…</span>`; return;
    }
    if(!started){ started=true; left=secs; }
    timerEl.innerHTML=`<span class="ct-lbl rec">Repite</span><span class="ct-num">${left}</span>`;
    if(left<=0){ clearTimers(); stopRecording(); timerEl.innerHTML=`<span class="ct-lbl">Analizando…</span>`; return; }
    left--;
  };
  tick(); coach.ivTimer=setInterval(tick,1000);
}
function evalRepeat(target, transcript, traps){
  const tgtRaw=wordsOf(target), spkRaw=wordsOf(transcript);
  const tgt=tgtRaw.map(normW), spk=spkRaw.map(normW);
  if(!tgt.length || !spk.length) return { score:0, perWord:[], trapHits:[] };
  const ops=alignPh(tgt, spk);
  const perWord=[]; let ti=0, ok=0, near=0;
  ops.forEach(o=>{
    if(o.op==="ins") return;
    const w=tgtRaw[ti]; ti++;
    if(o.op==="match"){ ok++; perWord.push({w, st:"ok", heard:o.r}); }
    else if(o.op==="del"){ perWord.push({w, st:"bad", heard:""}); }
    else { const d=editDistance([...o.t],[...o.r]); const ratio=1-d/Math.max(o.t.length,o.r.length,1); if(ratio>=0.5){ near++; perWord.push({w, st:"near", heard:o.r}); } else perWord.push({w, st:"bad", heard:o.r}); }
  });
  const score=Math.round(100*(ok+near*0.5)/Math.max(1,tgt.length));
  const trapHits=(traps||[]).map(t=>{ const n=normW(t); const hit=perWord.find(p=>normW(p.w)===n); return { t, st: hit ? hit.st : "bad", heard: hit ? hit.heard : "" }; });
  return { score, perWord, trapHits };
}
function onRepeatAnalyzed(d){
  const p=coach.pending; coach.pending=null; clearTimers(); coach.rpPhase="done"; coach.rpRevealed=true;
  const r=evalRepeat(p.prompt, d.text, p.traps);
  const trapOk=r.trapHits.filter(x=>x.st==="ok").length;
  const sess=addSession(Object.assign(p, { transcript:d.text, duration:Math.round(d.duration), score:r.score, trapOk, trapN:r.trapHits.length }));
  if(coach.rpSource==="texts") coach.rpTextScores.push(r.score);
  renderRepeat();
  const timerEl=$("rpTimer"); if(timerEl) timerEl.innerHTML="";
  const box=$("rpResult"); if(!box) return;
  const color = r.score>=85?"var(--pos)":r.score>=60?"var(--neu)":"var(--neg)";
  box.innerHTML = `
    <div class="coach-result">
      <div class="coach-grid">
        <div class="coach-band" style="color:${color}"><span class="cb-num">${r.score}%</span><span class="cb-lbl">palabras correctas</span></div>
        <div class="coach-summary">
          ${r.trapHits.length ? `<div class="cs-title">Trampas: ${trapOk} de ${r.trapHits.length}</div><div class="st-chips">${r.trapHits.map(x=>`<span class="st-chip ${x.st==="ok"?"ok":x.st==="near"?"near":"no"}" title="${esc(x.heard?("se oyó: "+x.heard):"no se detectó")}">${x.st==="ok"?"✓":x.st==="near"?"≈":"✗"} ${esc(x.t)}</span>`).join("")}</div>` : `<div class="cs-note">Oración ${coach.rpSentIdx+1} de ${coach.rpText ? coach.rpText.sentences.length : 1}.</div>`}
          <div class="cs-note" style="margin-top:8px">El detalle palabra por palabra está abajo, en <b>Lectura vs. texto</b>.</div>
        </div>
      </div>
      <div class="coach-actions">
        <button class="coach-btn" id="rpAgainListen">🔊 Escuchar otra vez</button>
        <button class="coach-btn primary" id="rpAgainRec">🎙 Repetir de nuevo</button>
        <button class="coach-btn" id="rpGoNext">${coach.rpSource==="texts" ? "→ Siguiente oración" : "↻ Nueva frase"}</button>
      </div>
    </div>`;
  $("rpAgainListen").addEventListener("click", ()=>speak(p.prompt, 0.9));
  $("rpAgainRec").addEventListener("click", rpStart);
  $("rpGoNext").addEventListener("click", ()=>{ $("rpNext").click(); });
}

/* ================= HISTORIAL ================= */
function renderHistory(){
  const hist=loadHistory().slice().sort((a,b)=>b.ts-a.ts);
  const { streak, today } = streakInfo(hist);
  const todayKey=dayKey(Date.now());
  const todaySess=hist.filter(s=>dayKey(s.ts)===todayKey);
  const weekAgo=Date.now()-6*86400000;
  const week=hist.filter(s=>s.ts>=weekAgo);
  // plan de hoy
  const plan=[
    { k:"repeat-traps", label:"Listen & Repeat · trampas", done: todaySess.some(s=>s.mode==="repeat" && s.source==="traps") },
    { k:"repeat-texts", label:"Listen & Repeat · texto TOEFL", done: todaySess.some(s=>s.mode==="repeat" && (s.source==="texts"||s.source==="toefl")) },
    { k:"iv-toefl", label:"Take an Interview · TOEFL", done: todaySess.some(s=>s.mode==="interview" && s.cat!=="tech") },
    { k:"iv-tech", label:"Take an Interview · técnica", done: todaySess.some(s=>s.mode==="interview" && s.cat==="tech") },
  ];
  // 14 días
  const days=[]; for(let i=13;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=dayKey(d.getTime()); days.push({ k, n: hist.filter(s=>dayKey(s.ts)===k).length, lbl: d.getDate() }); }
  const maxN=Math.max(1,...days.map(d=>d.n));
  // tendencia banda (entrevistas con corrección) y score (repeat)
  const bands=hist.filter(s=>s.mode==="interview" && s.band!=null).slice(0,10).reverse();
  const scores=hist.filter(s=>s.mode==="repeat" && s.score!=null).slice(0,15).reverse();
  const el=area(); el.innerHTML="";
  el.appendChild(h(`
    <div class="coach-box">
      <div class="coach-head"><span class="coach-eyebrow">📈 Historial</span><span class="coach-sub">Lo que no se mide, no se practica</span></div>
      <div class="hist-stats">
        <div class="metric"><div class="v" style="color:${streak>0?"var(--pos)":"var(--muted)"}">${streak}</div><div class="k">días seguidos</div><div class="hint">${today ? "hoy ya practicaste ✓" : "hoy todavía no"}</div></div>
        <div class="metric"><div class="v">${todaySess.length}</div><div class="k">sesiones hoy</div></div>
        <div class="metric"><div class="v">${week.length}</div><div class="k">últimos 7 días</div></div>
        <div class="metric"><div class="v">${hist.length}</div><div class="k">total</div></div>
      </div>
      <div class="coach-section"><div class="cs-title">Plan de hoy</div>
        <ul class="plan">${plan.map(p=>`<li class="${p.done?"done":""}"><span class="pl-ck">${p.done?"✓":"○"}</span>${p.label}</li>`).join("")}</ul></div>
      <div class="coach-section"><div class="cs-title">Últimos 14 días</div>
        <div class="days">${days.map(d=>`<div class="day" title="${d.k}: ${d.n} sesión(es)"><i style="height:${Math.max(3,Math.round(d.n/maxN*46))}px;background:${d.n?"var(--pos)":"var(--line-strong)"}"></i><span>${d.lbl}</span></div>`).join("")}</div></div>
      ${bands.length ? `<div class="coach-section"><div class="cs-title">Banda en entrevistas (últimas ${bands.length})</div><div class="trend">${bands.map(s=>`<div class="tb" title="${esc(s.prompt)}"><i style="height:${Math.round(s.band/6*46)}px;background:${bandColor(s.band)}"></i><span>${s.band}</span></div>`).join("")}</div></div>` : ""}
      ${scores.length ? `<div class="coach-section"><div class="cs-title">Precisión en Listen & Repeat (últimas ${scores.length})</div><div class="trend">${scores.map(s=>`<div class="tb" title="${esc(s.prompt)}"><i style="height:${Math.round(s.score/100*46)}px;background:${s.score>=85?"var(--pos)":s.score>=60?"var(--neu)":"var(--neg)"}"></i><span>${s.score}</span></div>`).join("")}</div></div>` : ""}
      <div class="coach-section"><div class="cs-title">Sesiones recientes</div>
        <table class="hist-table"><thead><tr><th>Cuándo</th><th>Modo</th><th>Qué</th><th>Resultado</th></tr></thead><tbody>
        ${hist.slice(0,15).map(s=>`<tr><td>${new Date(s.ts).toLocaleString("es-PE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</td><td>${s.mode==="interview"?"🎤":"🔁"}</td><td class="what">${esc(s.prompt)}</td><td class="res">${s.mode==="interview" ? (s.band!=null?`banda ${s.band}`:`${s.wpm} ppm`) : `${s.score}%${s.trapN?` · ${s.trapOk}/${s.trapN} trampas`:""}`}</td></tr>`).join("") || `<tr><td colspan="4" class="what">Todavía no hay sesiones. Empieza con Listen & Repeat.</td></tr>`}
        </tbody></table></div>
      <div class="coach-actions">
        <button class="coach-btn" id="histExport">⬇ Exportar JSON</button>
        <button class="coach-btn" id="histImport">⬆ Importar JSON</button>
        <input type="file" id="histFile" accept=".json" hidden>
        <button class="coach-btn danger" id="histClear">Borrar historial</button>
      </div>
    </div>`));
  $("histExport").addEventListener("click", ()=>{
    const blob=new Blob([JSON.stringify(loadHistory(),null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`voice-coach-history-${todayKey}.json`; document.body.appendChild(a); a.click(); a.remove();
  });
  $("histImport").addEventListener("click", ()=>$("histFile").click());
  $("histFile").addEventListener("change", async e=>{
    const f=e.target.files[0]; e.target.value=""; if(!f) return;
    try{ const arr=JSON.parse(await f.text()); if(!Array.isArray(arr)) throw new Error("formato"); const cur=loadHistory(); const ids=new Set(cur.map(s=>s.id)); arr.forEach(s=>{ if(s && s.ts && !ids.has(s.id)) cur.push(s); }); cur.sort((a,b)=>a.ts-b.ts); saveHistory(cur); renderHistory(); }
    catch(err){ setStatus("No se pudo importar: "+(err.message||err), true); }
  });
  $("histClear").addEventListener("click", ()=>{ if(confirm("¿Borrar todo el historial de este navegador? Exporta antes si lo quieres conservar.")){ localStorage.removeItem(LS_HIST); renderHistory(); } });
}

/* ================= evento del análisis ================= */
document.addEventListener("vc:analyzed", (e)=>{
  const p=coach.pending; if(!p) return;
  if(p.mode==="interview") onInterviewAnalyzed(e.detail);
  else if(p.mode==="repeat") onRepeatAnalyzed(e.detail);
});
// si la grabación se cancela o falla, no dejar el coach colgado
document.addEventListener("vc:analyze-failed", ()=>{ coach.pending=null; clearTimers(); coach.ivPhase="idle"; coach.rpPhase="idle"; const b=$("ivStart"); if(b) b.disabled=false; });

/* ================= init ================= */
function refreshStreakChip(){
  const { streak, today } = streakInfo(loadHistory());
  const chip=$("streakChip"); if(chip){ chip.textContent = `🔥 ${streak} día${streak===1?"":"s"}${today?"":" · hoy pendiente"}`; chip.dataset.on = String(streak>0); }
}
export function initCoach(){
  const seg=$("modeSeg"); if(!seg) return;
  seg.querySelectorAll("button").forEach(b=>b.addEventListener("click", ()=>setMode(b.dataset.mode)));
  refreshStreakChip();
  setMode("free");
}
initCoach();
