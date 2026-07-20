/* ---------------- app: orquestador principal ---------------- */
import { state, $, wireSeg, setStatus, hideBar } from './state.js';
import { UI_STRINGS, t } from './i18n.js';
import { stopSpeaking, ttsActive, naturalSource, hfAudioEl, synth, ttsPaused, preloadMMSWorker, applyDocView, renderDocView, renderDocInto, warmVoice, setDocFormat, resetOratorVoices } from './tts.js';
import { renderPhonetics, buildWpChips, ensureDictThen, cmudict, wordPanel } from './phonetics.js';
import { warmupModels, initRecording, initModelsPanel, analyze } from './analysis.js';

window.addEventListener("error", e => console.error("RUNTIME ERROR:", e.message, e.filename, e.lineno));
window.addEventListener("unhandledrejection", e => console.error("UNHANDLED REJECTION:", e.reason));

/* ---------------- elements ---------------- */
const recBtn = $("recBtn"), recLabel = $("recLabel"), timerEl = $("timer"), cancelBtn = $("cancelBtn");
const fileInput = $("fileInput");

/* ---------------- config toggles ---------------- */
wireSeg("langSeg","lang");
["langSeg","sentSeg"].forEach(id=>{
  $(id).querySelectorAll("button").forEach(b=>b.addEventListener("click", ()=>{ warmupModels(); }));
});
["voiceSeg","langSeg"].forEach(id=>{
  $(id).querySelectorAll("button").forEach(b=>b.addEventListener("click", ()=>{ warmVoice(); }));
});
$("langSeg").querySelectorAll("button").forEach(b=>b.addEventListener("click", ()=>{ applyLang(); loadNewQuote(); }));
$("sentSeg").querySelectorAll("button").forEach(b=>{
  b.addEventListener("click", ()=>{ $("sentSeg").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); state.doSentiment = b.dataset.sent === "on"; });
});
$("readSeg").querySelectorAll("button").forEach(b=>{
  b.addEventListener("click", ()=>{ $("readSeg").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); state.compareRead = b.dataset.read === "on"; });
});
$("voiceSeg").querySelectorAll("button").forEach(b=>{
  b.addEventListener("click", ()=>{ $("voiceSeg").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); stopSpeaking(); state.voice = b.dataset.voice; });
});

/* ---------------- cancel analysis ---------------- */
if(cancelBtn) cancelBtn.addEventListener("click", ()=>{ state.analyzeCanceled = true; cancelBtn.style.display="none"; setStatus("Analysis canceled."); hideBar(); recBtn.disabled = false; });

/* ---------------- frases de práctica ---------------- */
const FALLBACK_QUOTES = {
  english: ["The only way to do great work is to love what you do. - Steve Jobs","Education is the most powerful weapon which you can use to change the world. - Nelson Mandela","Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill","The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt","It always seems impossible until it's done. - Nelson Mandela","Whether you think you can or you think you can't, you're right. - Henry Ford","The best way to predict the future is to create it. - Peter Drucker","In the middle of difficulty lies opportunity. - Albert Einstein","Do what you can, with what you have, where you are. - Theodore Roosevelt","Quality is not an act, it is a habit. - Aristotle"],
  spanish: ["Al fin de la batalla, y muerto el combatiente, vino hacia él un hombre y le dijo: ¡No mueras, te amo tanto! - César Vallejo","Caminante, no hay camino, se hace camino al andar. - Antonio Machado","La educación es el arma más poderosa que puedes usar para cambiar el mundo. - Nelson Mandela","En un lugar de la Mancha, de cuyo nombre no quiero acordarme. - Miguel de Cervantes","Solo sé que no sé nada. - Sócrates","El que lee mucho y anda mucho, ve mucho y sabe mucho. - Miguel de Cervantes","No hay mal que por bien no venga. - Refrán popular","La vida es sueño, y los sueños, sueños son. - Calderón de la Barca","Lo esencial es invisible a los ojos. - Antoine de Saint-Exupéry","Verde que te quiero verde. Verde viento. Verdes ramas. - Federico García Lorca"],
  portuguese: ["A educação é a arma mais poderosa que você pode usar para mudar o mundo. - Nelson Mandela","O sucesso não é final, o fracasso não é fatal: é a coragem de continuar que conta. - Winston Churchill","O futuro pertence àqueles que acreditam na beleza de seus sonhos. - Eleanor Roosevelt","Sempre parece impossível até que esteja feito. - Nelson Mandela","O melhor jeito de prever o futuro é criá-lo. - Peter Drucker","No meio da dificuldade reside a oportunidade. - Albert Einstein","Faça o que puder, com o que tem, onde estiver. - Theodore Roosevelt","A jornada de mil milhas começa com um único passo. - Lao Tsé","Quem lê muito e anda muito, vê muito e sabe muito. - Miguel de Cervantes","A vida é um sonho, e os sonhos, sonhos são. - Calderón de la Barca"]
};
const FALLBACK_PARAGRAPHS = {
  english: ["Last year our team faced a critical production outage during a regulatory audit. The database replication lag caused inconsistent reports, and we had less than an hour to fix it before the auditors noticed. I decided to fail over to the standby node, even though it meant a brief downtime. It was risky, but the alternative - serving stale data during an audit - was worse. We recovered in twelve minutes, passed the audit, and I documented the incident so the team could prevent it next time.","When I joined the company, the deployment process was entirely manual and took about three hours. Developers would SSH into the server, pull the latest code, run migrations, and restart services by hand. I proposed moving to a containerized setup with automated CI/CD pipelines. It took six weeks to build and test, but once we shipped it, deployments dropped to seven minutes and our release frequency went from twice a month to three times a week.","I once had to give a presentation to the board about why our machine learning model was underperforming. The challenge was explaining technical concepts - like feature drift and training-serving skew - to an audience that cared about business outcomes, not algorithms. I restructured the talk around three KPIs they already tracked, showed how each one connected to a technical root cause, and proposed a concrete remediation plan with timelines. The board approved the budget I requested."],
  spanish: ["El año pasado nuestro equipo enfrentó una caída crítica de producción durante una auditoría regulatoria. El retraso en la replicación de la base de datos causó informes inconsistentes, y teníamos menos de una hora para arreglarlo antes de que los auditores lo notaran. Decidí conmutar al nodo de respaldo, aunque eso significaba un breve tiempo de inactividad. Era arriesgado, pero la alternativa - servir datos obsoletos durante una auditoría - era peor. Nos recuperamos en doce minutos, pasamos la auditoría, y documenté el incidente para que el equipo pudiera prevenirlo la próxima vez.","Cuando me uní a la empresa, el proceso de despliegue era completamente manual y tomaba unas tres horas. Los desarrolladores entraban por SSH al servidor, descargaban el código, ejecutaban migraciones y reiniciaban servicios a mano. Propuse pasar a una arquitectura de contenedores con pipelines automatizados de CI/CD. Tomó seis semanas construirlo y probarlo, pero una vez que lo lanzamos, los despliegues bajaron a siete minutos y nuestra frecuencia de liberación pasó de dos veces al mes a tres veces por semana.","Una vez tuve que dar una presentación al consejo sobre por qué nuestro modelo de aprendizaje automático tenía un rendimiento inferior al esperado. El desafío era explicar conceptos técnicos - como la deriva de características y el sesgo entre entrenamiento y producción - a una audiencia que se interesaba por los resultados de negocio, no por los algoritmos. Reestructuré la charla en torno a tres KPIs que ya seguían, mostré cómo cada uno se conectaba a una causa técnica raíz, y propuse un plan de remediación concreto con plazos. El consejo aprobó el presupuesto que solicité."],
  portuguese: ["No ano passado, nossa equipe enfrentou uma queda crítica de produção durante uma auditoria regulatória. O atraso na replicação do banco de dados causou relatórios inconsistentes, e tínhamos menos de uma hora para corrigir antes que os auditores notassem. Decidi fazer failover para o nó de standby, embora isso significasse um breve tempo de inatividade. Era arriscado, mas a alternativa - servir dados desatualizados durante uma auditoria - era pior. Nos recuperamos em doze minutos, passamos na auditoria, e documentei o incidente para que a equipe pudesse preveni-lo da próxima vez.","Quando entrei na empresa, o processo de deploy era inteiramente manual e levava cerca de três horas. Os desenvolvedores faziam SSH no servidor, baixavam o código, rodavam migrações e reiniciavam serviços à mão. Propus mudar para uma arquitetura de contêineres com pipelines automatizados de CI/CD. Levou seis semanas para construir e testar, mas depois que lançamos, os deploys caíram para sete minutos e nossa frequência de release passou de duas vezes por mês para três vezes por semana.","Uma vez tive que fazer uma apresentação para o conselho sobre por que nosso modelo de machine learning estava com desempenho abaixo do esperado. O desafio era explicar conceitos técnicos - como feature drift e training-serving skew - para uma audiência que se importava com resultados de negócio, não com algoritmos. Reestruturei a palestra em torno de três KPIs que eles já acompanhavam, mostrei como cada um se conectava a uma causa técnica raiz, e propus um plano de remediação concreto com prazos. O conselho aprovou o orçamento que solicitei."]
};
function randFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
async function fetchFamousQuote(lang){
  try{
    if(lang==="spanish"){ const r = await fetch("https://frasedeldia.azurewebsites.net/api/phrase", { cache:"no-store" }); if(r.ok){ const d = await r.json(); if(d && d.phrase) return `${d.phrase}${d.author?` - ${d.author}`:""}`; } }
    else { const r = await fetch("https://api.quotable.io/random?maxLength=180", { cache:"no-store" }); if(r.ok){ const d = await r.json(); if(d && d.content) return `${d.content}${d.author?` - ${d.author}`:""}`; } }
  }catch(e){}
  return randFrom(FALLBACK_QUOTES[lang] || FALLBACK_QUOTES.english);
}
async function loadNewQuote(){
  const btn = $("shuffleBtn"); const orig = btn ? btn.textContent : "";
  if(btn){ btn.disabled = true; btn.textContent = t("loading"); }
  const q = await fetchFamousQuote(state.lang); $("promptText").value = q;
  updateClearBtn(); renderPhonetics(); state.wpImproveWords = [];
  if(wordPanel.classList.contains("on")){ ensureDictThen(buildWpChips); }
  if(btn){ btn.disabled = false; btn.textContent = t("newq"); }
}
$("shuffleBtn").addEventListener("click", loadNewQuote);
async function loadNewParagraph(){
  const btn = $("paragraphBtn"); const orig = btn ? btn.textContent : "";
  if(btn){ btn.disabled = true; btn.textContent = t("loading"); }
  const p = randFrom(FALLBACK_PARAGRAPHS[state.lang] || FALLBACK_PARAGRAPHS.english); $("promptText").value = p;
  updateClearBtn(); renderPhonetics(); state.wpImproveWords = [];
  if(wordPanel.classList.contains("on")){ ensureDictThen(buildWpChips); }
  if(btn){ btn.disabled = false; btn.textContent = t("paragraph"); }
}
const paragraphBtn = $("paragraphBtn");
if(paragraphBtn) paragraphBtn.addEventListener("click", loadNewParagraph);

/* ---------------- localización ---------------- */
function applyLang(){
  const S = UI_STRINGS[state.lang] || UI_STRINGS.english;
  document.querySelectorAll("[data-i18n]").forEach(el=>{ const k=el.getAttribute("data-i18n"); if(k in S) el.textContent=S[k]; });
  const lbl = document.querySelector(".prompt .lbl"); if(lbl) lbl.textContent = S.promptLbl;
  const pt = $("promptText"); if(pt) pt.placeholder = S.promptPh;
  if(!(ttsActive||naturalSource||(synth&&(synth.speaking||synth.pending)))) { const sl=$("speakLabel"); if(sl) sl.textContent=S.play; }
  const dl=$("dlAudioLabel"); if(dl && dl.textContent!=="Descargado ✓") dl.textContent=S.dlmp3;
  const phon=$("phonBtn"); if(phon) phon.textContent = S.phon;
  const wb=$("wordBtn"); if(wb) wb.textContent = S.words;
  const nb=$("shuffleBtn"); if(nb && !nb.disabled) nb.textContent = S.newq;
  const pgb=$("paragraphBtn"); if(pgb) pgb.textContent = S.paragraph;
  const rl=$("recLabel"); if(rl && !state.recording) rl.textContent = S.record;
  const pb=$("pauseBtn"); if(pb && pb.style.display!=="none"){ const pl=$("pauseLabel"); if(pl) pl.textContent = ttsPaused ? S.resume : S.pause; }
  const dvSeg=$("docViewSeg"); if(dvSeg){ const bs=dvSeg.querySelectorAll("button"); if(bs[0]) bs[0].textContent=S.docSimple; if(bs[1]) bs[1].textContent=S.docDoc; }
  const uh=$("uploadHint"); if(uh) uh.innerHTML = S.uploadHint;
  const phBtn=$("phonBtn"); if(phBtn){ phBtn.disabled = state.lang==="portuguese"; phBtn.title = state.lang==="portuguese" ? "Fonética no disponible para portugués" : ""; }
  updateVoiceAvailability(); preloadMMSWorker(state.lang);
}
function updateVoiceAvailability(){
  const seg=$("voiceSeg"); if(!seg) return;
  const natBtn=seg.querySelector('[data-voice="natural"]'); if(!natBtn) return;
  natBtn.disabled=false; natBtn.style.opacity=""; natBtn.style.cursor=""; natBtn.title="";
}

/* ---------------- botón X: borrar texto ---------------- */
const clearBtn = $("clearBtn"), promptTextEl = $("promptText");
function updateClearBtn(){ clearBtn.style.display = promptTextEl.value.trim() ? "flex" : "none"; }
if(clearBtn){
  clearBtn.addEventListener("click", ()=>{
    if(ttsActive || hfAudioEl || (synth && (synth.speaking || synth.pending))) stopSpeaking();
    promptTextEl.value = ""; updateClearBtn(); promptTextEl.focus();
    renderPhonetics(); state.wpImproveWords = [];
    if(wordPanel.classList.contains("on") && cmudict) buildWpChips();
  });
  promptTextEl.addEventListener("input", ()=>{ if(promptTextEl.value !== state.podcastRawText){ state.podcastSegments = null; state.podcastRawText = null; } });
  promptTextEl.addEventListener("input", updateClearBtn); updateClearBtn();
}

/* ---------------- subir .docx ---------------- */
let JSZipLib=null;
async function ensureJSZip(){ if(JSZipLib) return JSZipLib; const m = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm"); JSZipLib = m.default || m; return JSZipLib; }
function parseDocxBlocks(xmlString){
  const doc = new DOMParser().parseFromString(xmlString, "application/xml"); const ps = doc.getElementsByTagName("w:p"); const blocks=[];
  for(const p of ps){ const runs = p.getElementsByTagName("w:r"); const rawChars=[], rawBold=[];
    for(const r of runs){ const rpr = r.getElementsByTagName("w:rPr")[0]; let bold=false; if(rpr){ for(const bEl of rpr.getElementsByTagName("w:b")){ const v=bEl.getAttribute("w:val"); if(v===null || /^(true|1|on)$/i.test(v)) bold=true; } } for(const tEl of r.getElementsByTagName("w:t")){ const s=tEl.textContent||""; for(const ch of s){ rawChars.push(ch); rawBold.push(bold); } } }
    const st = p.getElementsByTagName("w:pStyle")[0]; const isList = !!(st && /list/i.test(st.getAttribute("w:val")||"")) || (p.getElementsByTagName("w:numPr").length>0);
    if(!rawChars.length) continue; const outC=[], outB=[]; let prevSpace=false;
    for(let k=0;k<rawChars.length;k++){ let c=rawChars[k]; if(c==="\u00a0") c=" "; if(/\s/.test(c)){ if(prevSpace) continue; outC.push(" "); outB.push(false); prevSpace=true; } else { outC.push(c); outB.push(rawBold[k]); prevSpace=false; } }
    while(outC.length && outC[0]===" "){ outC.shift(); outB.shift(); } while(outC.length && outC[outC.length-1]===" "){ outC.pop(); outB.pop(); }
    const text=outC.join(""); if(!text) continue; const bold=[]; let s=-1;
    for(let k=0;k<=outB.length;k++){ if(k<outB.length && outB[k]){ if(s<0) s=k; } else if(s>=0){ bold.push([s,k]); s=-1; } }
    blocks.push({ text, isList, bold });
  }
  return blocks;
}
function isDocxHeader(t){ return /^(\(\d+\)|open\b|close\b|wave\s*\d|move\s*\d|tier\s*(one|two|three|\d))/i.test(t) && t.length<70; }
function loadBlockIntoBox(text, metaLines){
  $("promptText").value = text;
  state.podcastSegments = null; state.podcastRawText = null;
  const listLines = new Set(), boldRanges = new Map();
  if(metaLines && metaLines.length){ metaLines.forEach((mb,i)=>{ if(mb.isList) listLines.add(i); if(mb.bold && mb.bold.length) boldRanges.set(i, mb.bold); }); }
  setDocFormat(listLines, boldRanges);
  updateClearBtn(); renderPhonetics(); state.wpImproveWords = [];
  if(wordPanel.classList.contains("on") && (cmudict||state.lang==="spanish")) buildWpChips();
  $("docxPanel").style.display="none"; applyDocView();
  document.querySelector(".prompt").scrollIntoView({behavior:"smooth", block:"start"});
}
function updateDocxSelCount(){ const n=$("docxList").querySelectorAll(".docx-item.sel").length; const b=$("docxSel"); if(b){ b.textContent=`Cargar selección (${n})`; b.disabled=n===0; } }
function renderDocxBlocks(blocks, name){
  const list=$("docxList"); list.innerHTML=""; $("docxName").textContent = name ? ("📄 "+name) : ""; window.__docxBlocks = blocks;
  if(!blocks.length){ list.innerHTML='<div class="docx-empty">No se detectó texto en el documento.</div>'; }
  const mkItem=(b,i,isHead)=>{ const it=document.createElement("button"); it.type="button"; it.className="docx-item"+(isHead?" head":(b.isList?" list":"")); it.dataset.i=i; const ck=document.createElement("span"); ck.className="docx-check"; ck.textContent="✓"; const tx=document.createElement("span"); tx.textContent=b.text; it.appendChild(ck); it.appendChild(tx); return it; };
  blocks.forEach((b,i)=>{ const isHead = isDocxHeader(b.text) && !b.isList; const it=mkItem(b,i,isHead);
    if(isHead){ it.addEventListener("click", ()=>{ const on=!it.classList.contains("sel"); it.classList.toggle("sel", on); let el=it.nextElementSibling; while(el && !el.classList.contains("head")){ if(el.classList.contains("docx-item")) el.classList.toggle("sel", on); el=el.nextElementSibling; } updateDocxSelCount(); }); }
    else { it.addEventListener("click", ()=>{ it.classList.toggle("sel"); updateDocxSelCount(); }); }
    list.appendChild(it);
  });
  updateDocxSelCount(); $("docxPanel").style.display="block";
}
function loadDocxSelected(){
  const sel=[...$("docxList").querySelectorAll(".docx-item.sel")]; const blocks=window.__docxBlocks||[]; if(!sel.length) return;
  const chosen = sel.map(el=>blocks[+el.dataset.i]); loadBlockIntoBox(chosen.map(b=>b.text).join("\n"), chosen);
}
if($("docxBtn")){
  $("docxBtn").addEventListener("click", ()=>$("docxInput").click());
  $("docxInput").addEventListener("change", async (e)=>{
    const f=e.target.files[0]; e.target.value=""; if(!f) return;
    const list=$("docxList"); $("docxName").textContent=""; list.innerHTML='<div class="docx-empty">Leyendo documento…</div>'; $("docxPanel").style.display="block";
    try{ const zip = await (await ensureJSZip()).loadAsync(await f.arrayBuffer()); const entry = zip.file("word/document.xml"); if(!entry){ list.innerHTML='<div class="docx-empty">No parece un .docx válido.</div>'; return; } const xml = await entry.async("string"); renderDocxBlocks(parseDocxBlocks(xml), f.name.replace(/\.docx$/i,"")); }
    catch(err){ console.error(err); list.innerHTML='<div class="docx-empty" style="color:var(--neg)">No se pudo leer el documento: '+((err&&err.message)||err)+'</div>'; }
  });
  $("docxClose").addEventListener("click", ()=>{ $("docxPanel").style.display="none"; });
  $("docxSel").addEventListener("click", loadDocxSelected);
  $("docxAll").addEventListener("click", ()=>{ const blocks=window.__docxBlocks||[]; if(blocks.length) loadBlockIntoBox(blocks.map(b=>b.text).join("\n"), blocks); });
}

/* ---------------- subir .json (guion tipo podcast) ---------------- */
function validatePodcastJSON(data){
  if(!data || !Array.isArray(data.segments) || !data.segments.length) return null;
  const segs = data.segments
    .filter(s=>s && typeof s.text==="string" && s.text.trim() && typeof s.speaker==="string" && s.speaker.trim())
    .map(s=>({ speaker: s.speaker.trim(), text: s.text.trim() }));
  return segs.length ? segs : null;
}
function buildPodcastText(segments){
  const multi = new Set(segments.map(s=>s.speaker.toLowerCase())).size > 1;
  let text = ""; const segMeta = [];
  segments.forEach((seg,i)=>{
    const prefix = multi ? `${seg.speaker}: ` : "";
    const start = text.length;
    text += prefix + seg.text;
    segMeta.push({ speaker: seg.speaker, start, end: text.length });
    if(i < segments.length-1) text += "\n\n";
  });
  return { text, segMeta };
}
if($("jsonBtn")){
  $("jsonBtn").addEventListener("click", ()=>$("jsonInput").click());
  $("jsonInput").addEventListener("change", async (e)=>{
    const f=e.target.files[0]; e.target.value=""; if(!f) return;
    try{
      const data = JSON.parse(await f.text());
      const segments = validatePodcastJSON(data);
      if(!segments){ setStatus("El JSON no tiene el formato esperado: { \"segments\": [{ \"speaker\": \"...\", \"text\": \"...\" }] }.", true); return; }
      const { text, segMeta } = buildPodcastText(segments);
      resetOratorVoices();
      loadBlockIntoBox(text, null);
      state.podcastSegments = segMeta; state.podcastRawText = text;
      setStatus(segMeta.length ? `Guion cargado (${new Set(segments.map(s=>s.speaker.toLowerCase())).size} orador(es)).` : "");
    }catch(err){ console.error(err); setStatus("No se pudo leer el JSON: " + ((err&&err.message)||err), true); }
  });
}

/* ---------------- copy transcript ---------------- */
$("copyBtn").addEventListener("click", ()=>{
  const txt = $("doc").innerText.trim();
  navigator.clipboard.writeText(txt).then(()=>{ $("copyBtn").textContent="Copied ✓"; setTimeout(()=>$("copyBtn").textContent="Copy transcript",1500); });
});

/* ---------------- init modules + startup ---------------- */
initRecording();
initModelsPanel();
applyLang();
setTimeout(()=>{ warmupModels(); }, 400);
