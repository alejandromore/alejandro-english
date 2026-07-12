import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5";

// Allow remote models from the Hugging Face Hub; disable local file lookups.
env.allowLocalModels = false;

/* ---------------- state ---------------- */
const state = {
  lang: "english",
  size: "base",
  doSentiment: true,
  compareRead: false,
  voice: "system",
  docView: "simple",
  asr: null, asrKey: null,
  sentiment: null,
  recording: false,
  mediaRecorder: null,
  chunks: [],
  stream: null,
  timerId: null,
  startedAt: 0,
  last: null,
  docxUrl: null,
};

/* ---------------- elements ---------------- */
const $ = (id) => document.getElementById(id);
const statusEl = $("status"), bar = $("bar"), barFill = bar.querySelector("i");
const recBtn = $("recBtn"), recLabel = $("recLabel"), timerEl = $("timer");
const fileInput = $("fileInput"), results = $("results");

/* ---------------- config toggles ---------------- */
function wireSeg(segId, key){
  $(segId).querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", ()=>{
      $(segId).querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false"));
      b.setAttribute("aria-pressed","true");
      state[key] = b.dataset[key] || b.dataset.lang || b.dataset.size;
    });
  });
}
wireSeg("langSeg","lang");
wireSeg("sizeSeg","size");
// esenciales (Whisper/sentimiento) solo se recargan si cambia idioma/tamaÃ±o/sentimiento
["langSeg","sizeSeg","sentSeg"].forEach(id=>{
  $(id).querySelectorAll("button").forEach(b=>b.addEventListener("click", ()=>{
    modelsReady=false;
    if(typeof warmupModels==="function") warmupModels();
  }));
});
// cambiar la voz o el idioma solo precarga la voz natural (no toca el badge de esenciales)
["voiceSeg","langSeg"].forEach(id=>{
  $(id).querySelectorAll("button").forEach(b=>b.addEventListener("click", ()=>{ if(typeof warmVoice==="function") warmVoice(); }));
});
// al cambiar de idioma: localiza la interfaz y trae una frase nueva en ese idioma
$("langSeg").querySelectorAll("button").forEach(b=>b.addEventListener("click", ()=>{
  if(typeof applyLang==="function") applyLang();
  if(typeof loadNewQuote==="function") loadNewQuote();
}));
$("sentSeg").querySelectorAll("button").forEach(b=>{
  b.addEventListener("click", ()=>{
    $("sentSeg").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false"));
    b.setAttribute("aria-pressed","true");
    state.doSentiment = b.dataset.sent === "on";
  });
});
$("readSeg").querySelectorAll("button").forEach(b=>{
  b.addEventListener("click", ()=>{
    $("readSeg").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false"));
    b.setAttribute("aria-pressed","true");
    state.compareRead = b.dataset.read === "on";
  });
});
$("voiceSeg").querySelectorAll("button").forEach(b=>{
  b.addEventListener("click", ()=>{
    $("voiceSeg").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false"));
    b.setAttribute("aria-pressed","true");
    if(typeof stopSpeaking==="function") stopSpeaking();
    state.voice = b.dataset.voice;
  });
});

/* ---------------- practice prompts ---------------- */
/* ---------------- frases de prÃ¡ctica (cÃ©lebres) + localizaciÃ³n ---------------- */
// Respaldo local de frases cÃ©lebres por idioma (si falla la bÃºsqueda en internet).
const FALLBACK_QUOTES = {
  english: [
    "The only way to do great work is to love what you do. â€” Steve Jobs",
    "Education is the most powerful weapon which you can use to change the world. â€” Nelson Mandela",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. â€” Winston Churchill",
    "The future belongs to those who believe in the beauty of their dreams. â€” Eleanor Roosevelt",
    "It always seems impossible until it's done. â€” Nelson Mandela",
    "Whether you think you can or you think you can't, you're right. â€” Henry Ford",
    "The best way to predict the future is to create it. â€” Peter Drucker",
    "In the middle of difficulty lies opportunity. â€” Albert Einstein",
    "Do what you can, with what you have, where you are. â€” Theodore Roosevelt",
    "Quality is not an act, it is a habit. â€” Aristotle"
  ],
  spanish: [
    "Al fin de la batalla, y muerto el combatiente, vino hacia Ã©l un hombre y le dijo: Â¡No mueras, te amo tanto! â€” CÃ©sar Vallejo",
    "Caminante, no hay camino, se hace camino al andar. â€” Antonio Machado",
    "La educaciÃ³n es el arma mÃ¡s poderosa que puedes usar para cambiar el mundo. â€” Nelson Mandela",
    "En un lugar de la Mancha, de cuyo nombre no quiero acordarmeâ€¦ â€” Miguel de Cervantes",
    "Solo sÃ© que no sÃ© nada. â€” SÃ³crates",
    "El que lee mucho y anda mucho, ve mucho y sabe mucho. â€” Miguel de Cervantes",
    "No hay mal que por bien no venga. â€” RefrÃ¡n popular",
    "La vida es sueÃ±o, y los sueÃ±os, sueÃ±os son. â€” CalderÃ³n de la Barca",
    "Lo esencial es invisible a los ojos. â€” Antoine de Saint-ExupÃ©ry",
    "Verde que te quiero verde. Verde viento. Verdes ramas. â€” Federico GarcÃ­a Lorca"
  ],
  portuguese: [
    "A educaÃ§Ã£o Ã© a arma mais poderosa que vocÃª pode usar para mudar o mundo. â€” Nelson Mandela",
    "O sucesso nÃ£o Ã© final, o fracasso nÃ£o Ã© fatal: Ã© a coragem de continuar que conta. â€” Winston Churchill",
    "O futuro pertence Ã queles que acreditam na beleza de seus sonhos. â€” Eleanor Roosevelt",
    "Sempre parece impossÃ­vel atÃ© que esteja feito. â€” Nelson Mandela",
    "O melhor jeito de prever o futuro Ã© criÃ¡-lo. â€” Peter Drucker",
    "No meio da dificuldade reside a oportunidade. â€” Albert Einstein",
    "FaÃ§a o que puder, com o que tem, onde estiver. â€” Theodore Roosevelt",
    "A jornada de mil milhas comeÃ§a com um Ãºnico passo. â€” Lao TsÃ©",
    "Quem lÃª muito e anda muito, vÃª muito e sabe muito. â€” Miguel de Cervantes",
    "A vida Ã© um sonho, e os sonhos, sonhos sÃ£o. â€” CalderÃ³n de la Barca"
  ]
};

/* ---------------- pÃ¡rrafos de prÃ¡ctica (mÃ¡s largos) por idioma ---------------- */
const FALLBACK_PARAGRAPHS = {
  english: [
    "Last year our team faced a critical production outage during a regulatory audit. The database replication lag caused inconsistent reports, and we had less than an hour to fix it before the auditors noticed. I decided to fail over to the standby node, even though it meant a brief downtime. It was risky, but the alternative â€” serving stale data during an audit â€” was worse. We recovered in twelve minutes, passed the audit, and I documented the incident so the team could prevent it next time.",
    "When I joined the company, the deployment process was entirely manual and took about three hours. Developers would SSH into the server, pull the latest code, run migrations, and restart services by hand. I proposed moving to a containerized setup with automated CI/CD pipelines. It took six weeks to build and test, but once we shipped it, deployments dropped to seven minutes and our release frequency went from twice a month to three times a week.",
    "I once had to give a presentation to the board about why our machine learning model was underperforming. The challenge was explaining technical concepts â€” like feature drift and training-serving skew â€” to an audience that cared about business outcomes, not algorithms. I restructured the talk around three KPIs they already tracked, showed how each one connected to a technical root cause, and proposed a concrete remediation plan with timelines. The board approved the budget I requested."
  ],
  spanish: [
    "El aÃ±o pasado nuestro equipo enfrentÃ³ una caÃ­da crÃ­tica de producciÃ³n durante una auditorÃ­a regulatoria. El retraso en la replicaciÃ³n de la base de datos causÃ³ informes inconsistentes, y tenÃ­amos menos de una hora para arreglarlo antes de que los auditores lo notaran. DecidÃ­ conmutar al nodo de respaldo, aunque eso significaba un breve tiempo de inactividad. Era arriesgado, pero la alternativa â€” servir datos obsoletos durante una auditorÃ­a â€” era peor. Nos recuperamos en doce minutos, pasamos la auditorÃ­a, y documentÃ© el incidente para que el equipo pudiera prevenirlo la prÃ³xima vez.",
    "Cuando me unÃ­ a la empresa, el proceso de despliegue era completamente manual y tomaba unas tres horas. Los desarrolladores entraban por SSH al servidor, descargaban el cÃ³digo, ejecutaban migraciones y reiniciaban servicios a mano. Propuse pasar a una arquitectura de contenedores con pipelines automatizados de CI/CD. TomÃ³ seis semanas construirlo y probarlo, pero una vez que lo lanzamos, los despliegues bajaron a siete minutos y nuestra frecuencia de liberaciÃ³n pasÃ³ de dos veces al mes a tres veces por semana.",
    "Una vez tuve que dar una presentaciÃ³n al consejo sobre por quÃ© nuestro modelo de aprendizaje automÃ¡tico tenÃ­a un rendimiento inferior al esperado. El desafÃ­o era explicar conceptos tÃ©cnicos â€” como la deriva de caracterÃ­sticas y el sesgo entre entrenamiento y producciÃ³n â€” a una audiencia que se interesaba por los resultados de negocio, no por los algoritmos. ReestructurÃ© la charla en torno a tres KPIs que ya seguÃ­an, mostrÃ© cÃ³mo cada uno se conectaba a una causa tÃ©cnica raÃ­z, y propuse un plan de remediaciÃ³n concreto con plazos. El consejo aprobÃ³ el presupuesto que solicitÃ©."
  ],
  portuguese: [
    "No ano passado, nossa equipe enfrentou uma queda crÃ­tica de produÃ§Ã£o durante uma auditoria regulatÃ³ria. O atraso na replicaÃ§Ã£o do banco de dados causou relatÃ³rios inconsistentes, e tÃ­nhamos menos de uma hora para corrigir antes que os auditores notassem. Decidi fazer failover para o nÃ³ de standby, embora isso significasse um breve tempo de inatividade. Era arriscado, mas a alternativa â€” servir dados desatualizados durante uma auditoria â€” era pior. Nos recuperamos em doze minutos, passamos na auditoria, e documentei o incidente para que a equipe pudesse preveni-lo da prÃ³xima vez.",
    "Quando entrei na empresa, o processo de deploy era inteiramente manual e levava cerca de trÃªs horas. Os desenvolvedores faziam SSH no servidor, baixavam o cÃ³digo, rodavam migraÃ§Ãµes e reiniciavam serviÃ§os Ã  mÃ£o. Propus mudar para uma arquitetura de contÃªineres com pipelines automatizados de CI/CD. Levou seis semanas para construir e testar, mas depois que lanÃ§amos, os deploys caÃ­ram para sete minutos e nossa frequÃªncia de release passou de duas vezes por mÃªs para trÃªs vezes por semana.",
    "Uma vez tive que fazer uma apresentaÃ§Ã£o para o conselho sobre por que nosso modelo de machine learning estava com desempenho abaixo do esperado. O desafio era explicar conceitos tÃ©cnicos â€” como feature drift e training-serving skew â€” para uma audiÃªncia que se importava com resultados de negÃ³cio, nÃ£o com algoritmos. Reestruturei a palestra em torno de trÃªs KPIs que eles jÃ¡ acompanhavam, mostrei como cada um se conectava a uma causa tÃ©cnica raiz, e propus um plano de remediaÃ§Ã£o concreto com prazos. O conselho aprovou o orÃ§amento que solicitei."
  ]
};
function randFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

// Trae una frase cÃ©lebre de internet segÃºn el idioma; si falla, usa el respaldo local.
async function fetchFamousQuote(lang){
  try{
    if(lang==="spanish"){
      const r = await fetch("https://frasedeldia.azurewebsites.net/api/phrase", { cache:"no-store" });
      if(r.ok){ const d = await r.json(); if(d && d.phrase) return `${d.phrase}${d.author?` â€” ${d.author}`:""}`; }
    } else if(lang==="portuguese"){
      const r = await fetch("https://api.quotable.io/random?maxLength=180", { cache:"no-store" });
      if(r.ok){ const d = await r.json(); if(d && d.content) return `${d.content}${d.author?` â€” ${d.author}`:""}`; }
    } else {
      const r = await fetch("https://api.quotable.io/random?maxLength=180", { cache:"no-store" });
      if(r.ok){ const d = await r.json(); if(d && d.content) return `${d.content}${d.author?` â€” ${d.author}`:""}`; }
    }
  }catch(e){ /* sin conexiÃ³n o CORS: caemos al respaldo */ }
  return randFrom(FALLBACK_QUOTES[lang] || FALLBACK_QUOTES.english);
}
async function loadNewQuote(){
  const btn = $("shuffleBtn"); const orig = btn ? btn.textContent : "";
  if(btn){ btn.disabled = true; btn.textContent = t("loading"); }
  const q = await fetchFamousQuote(state.lang);
  $("promptText").value = q;
  if(typeof updateClearBtn==="function") updateClearBtn();
  renderPhonetics();
  wpImproveWords = [];
  if(typeof wordPanel !== "undefined" && wordPanel.classList.contains("on")){ ensureDictThen(buildWpChips); }
  if(btn){ btn.disabled = false; btn.textContent = t("newq"); }
}
$("shuffleBtn").addEventListener("click", loadNewQuote);

/* Trae un pÃ¡rrafo de prÃ¡ctica (mÃ¡s largo que una frase) segÃºn el idioma. */
async function loadNewParagraph(){
  const btn = $("paragraphBtn"); const orig = btn ? btn.textContent : "";
  if(btn){ btn.disabled = true; btn.textContent = t("loading"); }
  const p = randFrom(FALLBACK_PARAGRAPHS[state.lang] || FALLBACK_PARAGRAPHS.english);
  $("promptText").value = p;
  if(typeof updateClearBtn==="function") updateClearBtn();
  renderPhonetics();
  wpImproveWords = [];
  if(typeof wordPanel !== "undefined" && wordPanel.classList.contains("on")){ ensureDictThen(buildWpChips); }
  if(btn){ btn.disabled = false; btn.textContent = t("paragraph"); }
}
const paragraphBtn = $("paragraphBtn");
if(paragraphBtn) paragraphBtn.addEventListener("click", loadNewParagraph);

/* LocalizaciÃ³n de la interfaz segÃºn el idioma seleccionado. */
const UI_STRINGS = {
  english: { play:"Play", stop:"Stop", generating:"Generatingâ€¦", dlmp3:"Download MP3",
    phon:"ðŸ”¤ Phonetics", words:"ðŸŽ¯ Words", newq:"â†» New phrase", loading:"Fetchingâ€¦",
    promptLbl:"Practice prompt", promptPh:"Type or paste the text you want to practice or hearâ€¦",
    setup:"Setup", accuracy:"Accuracy vs. speed", sentiment:"Sentiment analysis",
    compareRead:"Compare reading", readingVoice:"Reading voice", engine:"Engine (Words mode)",
    record:"Record", upload:"â­¡ Upload audio", or:"or", pause:"Pause", resume:"Resume",
    docView:"Text view", docSimple:"Simple", docDoc:"Document", warmVoice:"âš¡ Prepare voice",
    voiceSystem:"System", voiceNatural:"Natural",
    uploadHint:"Uploading a phone recording? In the picker, choose <b>More â†’ Files</b>, then open <b>Recordings</b>." },
  spanish: { play:"Reproducir", stop:"Detener", generating:"Generando vozâ€¦", dlmp3:"Descargar MP3",
    phon:"ðŸ”¤ FonÃ©tica", words:"ðŸŽ¯ Palabras", newq:"â†» Nueva frase", loading:"Buscandoâ€¦",
    promptLbl:"Texto de prÃ¡ctica", promptPh:"Escribe o pega el texto que quieres practicar o escucharâ€¦",
    setup:"ConfiguraciÃ³n", accuracy:"PrecisiÃ³n vs. velocidad", sentiment:"AnÃ¡lisis de sentimiento",
    compareRead:"Comparar lectura", readingVoice:"Voz de lectura", engine:"Motor (modo Palabras)",
    record:"Grabar", upload:"â­¡ Subir audio", or:"o", pause:"Pausa", resume:"Reanudar",
    docView:"Vista del texto", docSimple:"Simple", docDoc:"Documento", warmVoice:"âš¡ Preparar voz",
    voiceSystem:"Sistema", voiceNatural:"Natural",
    uploadHint:"Â¿Subir una grabaciÃ³n del telÃ©fono? En el selector elige <b>More â†’ Files</b> y abre <b>Recordings</b>." }
  ,
  portuguese: { play:"Reproduzir", stop:"Parar", generating:"Gerando voz...", dlmp3:"Baixar MP3",
    phon:"Fonetica", words:"Palavras", newq:"Nova frase", paragraph:"Paragrafo", loading:"Buscando...",
    promptLbl:"Texto de pratica", promptPh:"Escreva ou cole o texto que quer praticar ou ouvir...",
    setup:"Configuracao", accuracy:"Precisao vs. velocidade", sentiment:"Analise de sentimento",
    compareRead:"Comparar leitura", readingVoice:"Voz de leitura", engine:"Motor (modo Palavras)",
    record:"Gravar", upload:"Subir audio", or:"ou", pause:"Pausar", resume:"Retomar",
    docView:"Vista do texto", docSimple:"Simples", docDoc:"Documento", warmVoice:"Preparar voz",
    voiceSystem:"Sistema", voiceNatural:"Natural",
    uploadHint:"Subindo uma gravacao do telefone? No seletor escolha <b>More > Files</b> e abra <b>Recordings</b>." }
};
function t(key){ const s=UI_STRINGS[state.lang]||UI_STRINGS.english; return (key in s)?s[key]:key; }
function speakStopLabel(){ return t("stop"); }
function applyLang(){
  const S = UI_STRINGS[state.lang] || UI_STRINGS.english;
  // elementos con data-i18n (etiquetas de Setup, Record, Upload, etc.)
  document.querySelectorAll("[data-i18n]").forEach(el=>{ const k=el.getAttribute("data-i18n"); if(k in S) el.textContent=S[k]; });
  // etiqueta y placeholder del prompt
  const lbl = document.querySelector(".prompt .lbl"); if(lbl) lbl.textContent = S.promptLbl;
  const pt = $("promptText"); if(pt) pt.placeholder = S.promptPh;
  // botones de acciÃ³n del prompt (speakLabel solo si no estÃ¡ reproduciendo)
  if(!(ttsActive||naturalSource||(synth&&(synth.speaking||synth.pending)))) { const sl=$("speakLabel"); if(sl) sl.textContent=S.play; }
  const dl=$("dlAudioLabel"); if(dl && dl.textContent!=="Descargado âœ“") dl.textContent=S.dlmp3;
  const phon=$("phonBtn"); if(phon) phon.textContent = S.phon;
  const wb=$("wordBtn"); if(wb) wb.textContent = S.words;
  const nb=$("shuffleBtn"); if(nb && !nb.disabled) nb.textContent = S.newq;
  const rl=$("recLabel"); if(rl && !state.recording) rl.textContent = S.record;
  const pb=$("pauseBtn"); if(pb && pb.style.display!=="none"){ const pl=$("pauseLabel"); if(pl) pl.textContent = ttsPaused ? S.resume : S.pause; }
  const dvSeg=$("docViewSeg"); if(dvSeg){ const bs=dvSeg.querySelectorAll("button"); if(bs[0]) bs[0].textContent=S.docSimple; if(bs[1]) bs[1].textContent=S.docDoc; }
  const uh=$("uploadHint"); if(uh) uh.innerHTML = S.uploadHint;
  const wbtn=$("warmBtn"); if(wbtn && wbtn.dataset.busy!=="1" && wbtn.dataset.ready!=="1") wbtn.textContent = S.warmVoice;
  // Desactivar fonÃ©tica para portuguÃ©s (solo funciona para inglÃ©s/espaÃ±ol)
  const phBtn=$("phonBtn");
  if(phBtn){ phBtn.disabled = state.lang==="portuguese"; phBtn.title = state.lang==="portuguese" ? "FonÃ©tica no disponible para portuguÃ©s" : ""; }
  updateVoiceAvailability();
  preloadMMSWorker(state.lang);
}
function updateVoiceAvailability(){
  const seg=$("voiceSeg"); if(!seg) return;
  const natBtn=seg.querySelector('[data-voice="natural"]');
  if(!natBtn) return;
  natBtn.disabled=false; natBtn.style.opacity=""; natBtn.style.cursor=""; natBtn.title="";
}

/* ---------------- text-to-speech (reproducir + resaltar palabras) ---------------- */
const synth = window.speechSynthesis;
const speakBtn = $("speakBtn"), speakLabel = $("speakLabel");
let readingWords = [], activeWord = null;
let monitorTimer = null, lastBoundaryAt = 0;
let speechChunks = [], chunkIdx = 0, ttsActive = false, ttsRate = 0.8;

function clearActiveWord(){
  if(activeWord){ activeWord.classList.remove("reading"); activeWord = null; }
}
function highlightWordByIndex(i){
  const w = readingWords[i];
  if(!w || w.el === activeWord) return;
  clearActiveWord();
  w.el.classList.add("reading");
  activeWord = w.el;
  w.el.scrollIntoView({ block:"nearest" });
}
function stopMonitor(){
  if(monitorTimer){ clearInterval(monitorTimer); monitorTimer = null; }
}
function exitReadingView(){
  clearActiveWord();
  const pr = $("promptRead"), pt = $("promptText"), pd = $("promptDoc");
  if(pr){ pr.style.display = "none"; pr.classList.remove("doc-view"); }
  if(state.docView==="document"){
    if(pt) pt.style.display = "none";
    if(pd) pd.style.display = "block";
    if(typeof renderDocView==="function") renderDocView();
  } else {
    if(pt) pt.style.display = "";
    if(pd) pd.style.display = "none";
  }
}
function stopSpeaking(){
  ttsActive = false;
  stopMonitor();
  stopNatural();
  if(audioCtx && audioCtx.state==="suspended"){ try{ audioCtx.resume(); }catch(e){} }  // deja el contexto listo para la prÃ³xima
  if(synth){ try{ synth.resume(); }catch(e){} synth.cancel(); }                          // si estaba en pausa, reanuda antes de cancelar
  hidePause();
  if(typeof setMediaSession==="function") setMediaSession(false);
  speakBtn.classList.remove("speaking");
  speakLabel.textContent = (typeof t==="function") ? t("play") : "Reproducir";
  exitReadingView();
}

/* ---------------- pausar / reanudar la reproducciÃ³n ----------------
   Voz natural (Web Audio): se suspende el AudioContext â€” el audio y el resaltado se
   congelan y reanudan exactos, sin perder el punto. Voz del sistema: pause()/resume(). */
const pauseBtn = $("pauseBtn"), pauseLabel = $("pauseLabel"), pauseIc = $("pauseIc");
let ttsPaused = false;
function showPause(){
  ttsPaused = false;
  if(!pauseBtn) return;
  pauseBtn.style.display = "";
  pauseBtn.classList.remove("paused");
  if(pauseLabel) pauseLabel.textContent = t("pause");
  if(pauseIc) pauseIc.textContent = "â¸";
}
function hidePause(){
  ttsPaused = false;
  if(!pauseBtn) return;
  pauseBtn.style.display = "none";
  pauseBtn.classList.remove("paused");
}
async function togglePause(){
  if(!pauseBtn) return;
  if(!ttsPaused){                                    // ---- PAUSAR ----
    ttsPaused = true;
    if(state.voice === "natural"){
      try{ if(audioCtx && audioCtx.state==="running") await audioCtx.suspend(); }catch(e){}
    } else if(synth){
      try{ synth.pause(); }catch(e){}
    }
    pauseBtn.classList.add("paused");
    if(pauseLabel) pauseLabel.textContent = t("resume");
    if(pauseIc) pauseIc.textContent = "â–¶";
  } else {                                           // ---- REANUDAR ----
    ttsPaused = false;
    if(state.voice === "natural"){
      try{ if(audioCtx && audioCtx.state==="suspended") await audioCtx.resume(); }catch(e){}
    } else if(synth){
      try{ synth.resume(); }catch(e){}
    }
    pauseBtn.classList.remove("paused");
    if(pauseLabel) pauseLabel.textContent = t("pause");
    if(pauseIc) pauseIc.textContent = "â¸";
  }
}
if(pauseBtn) pauseBtn.addEventListener("click", togglePause);
/* Voz natural con Kokoro (neural, offline), con STREAMING: genera la primera frase y
   empieza a sonar, mientras genera la siguiente en paralelo. AsÃ­ el tiempo hasta el primer
   sonido baja de "todo el texto" a "una frase". La primera vez descarga el modelo (~80 MB). */
let audioCtx=null, naturalSource=null, naturalRAF=null, natRAF=null, natSchedule=null, natWatchdog=null;
const neuralCache = new Map();   // cache de audio neural por (idioma|texto): reproducciÃ³n instantÃ¡nea
// ---- lÃ­nea de estado de la voz (etapa + cronÃ³metro), para ver dÃ³nde se traba ----
let voiceStage="", voiceHB=null, voiceT0=0;
function setVoiceStatus(msg, isErr){ const el=$("voiceStatus"); if(!el) return; el.textContent=msg||""; el.classList.toggle("err", !!isErr); }
function voiceTick(){ if(!voiceStage) return; const s=Math.floor((Date.now()-voiceT0)/1000); setVoiceStatus(`${voiceStage} Â· ${s}s`); }
function startVoiceStatus(stage){ voiceStage=stage; voiceT0=Date.now(); if(voiceHB)clearInterval(voiceHB); voiceHB=setInterval(voiceTick,1000); voiceTick(); }
function setVoiceStage(stage){ voiceStage=stage; voiceTick(); }
function stopVoiceStatus(finalMsg, isErr){ if(voiceHB){clearInterval(voiceHB);voiceHB=null;} voiceStage=""; setVoiceStatus(finalMsg||"", isErr); }
// MediaSession: muestra controles en pantalla de bloqueo y ayuda a que el audio (Web Audio)
// no se suspenda al cambiar de pantalla. Para la voz natural (Web Audio); la del sistema no aplica.
function setMediaSession(active){
  if(!("mediaSession" in navigator)) return;
  try{
    const ms = navigator.mediaSession;
    if(active){
      try{ ms.metadata = new MediaMetadata({ title:"Voice Coach", artist: state.lang==="spanish"?"PrÃ¡ctica de lectura":state.lang==="portuguese"?"PrÃ¡tica de leitura":"Reading practice" }); }catch(e){}
      ms.playbackState = "playing";
      ms.setActionHandler("pause", ()=>{ try{ if($("pauseBtn") && !ttsPaused) togglePause(); }catch(e){} });
      ms.setActionHandler("play",  ()=>{ try{ if($("pauseBtn") && ttsPaused) togglePause(); }catch(e){} });
      ms.setActionHandler("stop",  ()=>{ try{ stopSpeaking(); }catch(e){} });
    } else {
      try{ ms.playbackState = "none"; }catch(e){}
    }
  }catch(e){}
}
// al volver a la pestaÃ±a, si el navegador suspendiÃ³ el audio, reanÃºdalo
document.addEventListener("visibilitychange", ()=>{
  if(!document.hidden && audioCtx && audioCtx.state==="suspended" && natSchedule && !ttsPaused){ audioCtx.resume().catch(()=>{}); }
});
function stopNatural(){
  if(naturalRAF){ cancelAnimationFrame(naturalRAF); naturalRAF=null; }
  if(natRAF){ cancelAnimationFrame(natRAF); natRAF=null; }
  if(natWatchdog){ clearTimeout(natWatchdog); natWatchdog=null; }
  stopVoiceStatus("");
  if(natSchedule && natSchedule.sources){ for(const s of natSchedule.sources){ try{ s.onended=null; s.stop(); }catch(e){} } }
  natSchedule=null;
  if(naturalSource){ try{ naturalSource.stop(); }catch(e){} naturalSource=null; }
}
async function neuralBuffer(lang, txt){
  const key = lang+"|"+txt;
  if(neuralCache.has(key)) return neuralCache.get(key);   // instantÃ¡neo si ya se generÃ³
  let { samples, sr } = await neuralSamples(lang, txt);
  // recuperaciÃ³n: si Kokoro por WebGPU devolviÃ³ silencio, cambia a WASM y regenera
  if(lang!=="spanish" && lang!=="portuguese" && kokoroDevice==="webgpu" && isSilent(samples)){
    console.warn("Kokoro WebGPU devolviÃ³ silencio; cambio a WASM y regenero.");
    kokoroTTS=null; kokoroForceWasm=true; neuralCache.clear();
    ({ samples, sr } = await neuralSamples(lang, txt));
  }
  if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  const buf=audioCtx.createBuffer(1, samples.length, sr);
  if(buf.copyToChannel) buf.copyToChannel(samples,0); else buf.getChannelData(0).set(samples);
  if(neuralCache.size>60){ neuralCache.delete(neuralCache.keys().next().value); }
  neuralCache.set(key, buf);
  return buf;
}

/* ---------------- generaciÃ³n de voz en segundo plano (Web Worker) ----------------
   Kokoro/MMS en el hilo principal bloquean la reproducciÃ³n entre bloques (huecos).
   Este worker genera el audio de cada bloque en paralelo; el hilo principal solo
   AGENDA los buffers pegados en la lÃ­nea de tiempo del audio â†’ lectura fluida. */
const TTS_WORKER_SRC = `
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5";
env.allowLocalModels = false;
let kokoro=null, mms=null, mmsPt=null, kokoroWasm=false, _kp=null, _mp=null, _mpp=null, _pid=null;
function prog(p){ if(p&&p.status==="progress"&&p.file&&_pid!=null) self.postMessage({type:"progress",id:_pid,progress:p.progress||0}); }
function norm(s){ let pk=0; for(let i=0;i<s.length;i++){const a=Math.abs(s[i]); if(a>pk)pk=a;} if(pk>0.02&&pk<0.98){const g=0.92/pk; for(let i=0;i<s.length;i++)s[i]*=g;} return s; }
function silent(s){ let m=0,st=Math.max(1,Math.floor(s.length/4000)); for(let i=0;i<s.length;i+=st){const a=Math.abs(s[i]); if(a>m)m=a;} return m<1e-3; }
async function ensureKokoro(){
  if(kokoro) return kokoro; if(_kp) return _kp;
  _kp=(async()=>{
    const mod=await import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.0/+esm");
    const K=mod.KokoroTTS||(mod.default&&mod.default.KokoroTTS);
    if(!K) throw new Error("kokoro load failed");
    const id="onnx-community/Kokoro-82M-v1.0-ONNX";
    if(self.navigator&&self.navigator.gpu&&!kokoroWasm){
      try{ kokoro=await K.from_pretrained(id,{dtype:"fp32",device:"webgpu",progress_callback:prog}); return kokoro; }
      catch(e){ kokoro=null; }
    }
    kokoro=await K.from_pretrained(id,{dtype:"q8",progress_callback:prog}); return kokoro;
  })();
  return _kp;
}
async function ensureMMS(){
  if(mms) return mms; if(_mp) return _mp;
  _mp=(async()=>{ mms=await pipeline("text-to-speech","Xenova/mms-tts-spa",{dtype:"q8",progress_callback:prog}); return mms; })();
  return _mp;
}
async function ensureMMSPt(){
  if(mmsPt) return mmsPt; if(_mpp) return _mpp;
  _mpp=(async()=>{ mmsPt=await pipeline("text-to-speech","Xenova/mms-tts-por",{dtype:"q8",progress_callback:prog}); return mmsPt; })();
  return _mpp;
}
self.onmessage=async(e)=>{
  const d=e.data, id=d.id;
  if(d.type==="probe"){                       // Â¿este worker puede WebGPU? (sin cargar modelo)
    let gpu=false;
    try{ gpu = !!(self.navigator && self.navigator.gpu && await self.navigator.gpu.requestAdapter()); }catch(_){}
    self.postMessage({type:"probe", id, gpu}); return;
  }
  _pid=id;
  try{
    let samples, sr;
    if(d.lang==="spanish"){
      try{ const s=await ensureMMS(); const o=await s(d.text); samples=o.audio; sr=o.sampling_rate||16000; }
      catch(err){ mms=null; _mp=null; const s=await ensureMMS(); const o=await s(d.text); samples=o.audio; sr=o.sampling_rate||16000; }
    } else if(d.lang==="portuguese"){
      try{ const s=await ensureMMSPt(); const o=await s(d.text); samples=o.audio; sr=o.sampling_rate||16000; }
      catch(err){ mmsPt=null; _mpp=null; const s=await ensureMMSPt(); const o=await s(d.text); samples=o.audio; sr=o.sampling_rate||16000; }
    } else {
      let tts=await ensureKokoro();
      let o=await tts.generate(d.text,{voice:"af_heart",speed:0.9});
      samples=o.audio; sr=o.sampling_rate||24000;
      if(silent(samples)&&!kokoroWasm){ kokoroWasm=true; kokoro=null; _kp=null; tts=await ensureKokoro(); o=await tts.generate(d.text,{voice:"af_heart",speed:0.9}); samples=o.audio; sr=o.sampling_rate||24000; }
    }
    const f=samples instanceof Float32Array?samples:Float32Array.from(samples);
    norm(f);
    self.postMessage({type:"audio",id,samples:f,sr},[f.buffer]);
  }catch(err){ self.postMessage({type:"error",id,error:(err&&err.message)||String(err)}); }
};
`;
let _ttsWorker=null; const _ttsJobs=new Map(); let _ttsSeq=0;
function getTTSWorker(){
  if(_ttsWorker) return _ttsWorker;
  const url=URL.createObjectURL(new Blob([TTS_WORKER_SRC],{type:"text/javascript"}));
  const w=new Worker(url,{type:"module"});
  w.onmessage=(e)=>{ const d=e.data, job=_ttsJobs.get(d.id); if(!job) return;
    if(d.type==="progress"){ job.onProgress&&job.onProgress(d.progress); }
    else if(d.type==="audio"){ _ttsJobs.delete(d.id); job.resolve({samples:d.samples, sr:d.sr}); }
    else if(d.type==="probe"){ _ttsJobs.delete(d.id); job.resolve(d.gpu); }
    else if(d.type==="error"){ _ttsJobs.delete(d.id); job.reject(new Error(d.error)); } };
  w.onerror=()=>{ const err=new Error("tts worker crashed"); for(const[,j]of _ttsJobs)j.reject(err); _ttsJobs.clear(); try{w.terminate();}catch(_){}_ttsWorker=null; };
  _ttsWorker=w; return w;
}
function genInWorker(lang, text, onProgress){
  return new Promise((resolve,reject)=>{
    let w; try{ w=getTTSWorker(); }catch(e){ reject(e); return; }
    const id=++_ttsSeq; _ttsJobs.set(id,{resolve,reject,onProgress});
    w.postMessage({id, lang, text});
  });
}
// ---- enrutamiento de la voz neuronal ----
// Muchos Android exponen WebGPU en el hilo principal pero NO dentro del worker â†’ el worker
// caerÃ­a a WASM (lento). Si detectamos eso, generamos en el hilo principal con WebGPU (rÃ¡pido).
let ttsUseMain=false, _ttsRouteP=null;
function probeWorkerGPU(){
  return new Promise((resolve)=>{
    let w; try{ w=getTTSWorker(); }catch(e){ resolve(false); return; }
    const id=++_ttsSeq;
    _ttsJobs.set(id,{ resolve:(v)=>resolve(!!v), reject:()=>resolve(false) });
    w.postMessage({id, type:"probe"});
    setTimeout(()=>{ if(_ttsJobs.has(id)){ _ttsJobs.delete(id); resolve(false); } }, 8000);
  });
}
function withTimeout(p, ms){
  return Promise.race([ p, new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")), ms)) ]);
}
function decideTTSRoute(){
  if(_ttsRouteP) return _ttsRouteP;
  _ttsRouteP=(async()=>{
    const es = state.lang==="spanish";
    const pt = state.lang==="portuguese";
    setVoiceStage(es||pt ? "Detectando WebGPU" : "Detecting WebGPU");
    let workerGPU=false, mainGPU=false;
    try{ workerGPU = await probeWorkerGPU(); }catch(e){}
    try{ mainGPU = navigator.gpu ? !!(await withTimeout(navigator.gpu.requestAdapter(), 4000)) : false; }catch(e){ mainGPU=false; }
    ttsUseMain = (!workerGPU && mainGPU);   // worker sin GPU pero main con GPU real â†’ main
    return ttsUseMain;
  })();
  return _ttsRouteP;
}
async function genMain(lang, txt, onProgress){        // genera en el hilo principal (WebGPU/WASM)
  const loaded = lang==="spanish" ? !!mmsTTS : lang==="portuguese" ? !!mmsPtTTS : !!kokoroTTS;
  if(!loaded && onProgress) ttsDownloadTarget = (pct)=>onProgress(pct);
  try{ return await neuralSamples(lang, txt); }        // {samples, sr}
  finally{ ttsDownloadTarget=null; }
}
// El worker es la ruta FIABLE (nunca cuelga el hilo principal). El hilo principal con WebGPU
// es mÃ¡s rÃ¡pido, pero en algunas GPUs mÃ³viles se cuelga â†’ watchdog de 16 s y cambio al worker.
let _ttsPinned=false, naturalBroken=false;
// Cola de serializacion: Kokoro/ONNX Runtime NO soporta inferencia concurrente.
// Sin esto, pump() lanza 3 bloques a la vez (LOOKAHEAD=2) y tts.generate() se cuelga.
// Serializamos para que solo un generate() ejecute a la vez en el hilo principal.
let _bgQueue=Promise.resolve();
function runBG(task){ const p=_bgQueue.then(task); _bgQueue=p.catch(()=>{}); return p; }
async function neuralBufferBG(lang, txt, onProgress){
  const key=lang+"|"+txt;
  if(neuralCache.has(key)) return neuralCache.get(key);
  return runBG(async()=>{
    if(neuralCache.has(key)) return neuralCache.get(key);  // pudo cacharse mientras esperaba
    const es = state.lang==="spanish";
    const pt = state.lang==="portuguese";
    setVoiceStage(es ? "Generando voz" : pt ? "Gerando voz" : "Generating voice");
    // MMS (es/pt) corre en WASM â€” se ejecuta en el worker para no congelar el hilo principal.
    // Kokoro (en) usa WebGPU en el hilo principal (rapido).
    let samples, sr;
    if(es || pt){
      const r = await genInWorker(lang, txt, onProgress);
      samples = r.samples; sr = r.sr;
    } else {
      const r = await genMain(lang, txt, onProgress);
      samples = r.samples; sr = r.sr;
    }
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const buf=audioCtx.createBuffer(1, samples.length, sr);
    if(buf.copyToChannel) buf.copyToChannel(samples,0); else buf.getChannelData(0).set(samples);
    if(neuralCache.size>60){ neuralCache.delete(neuralCache.keys().next().value); }
    neuralCache.set(key, buf);
    return buf;
  });
}
// Precarga el modelo MMS en el worker cuando se selecciona espanol/portugues.
// Asi, al pulsar Reproducir, el modelo ya esta listo y la reproduccion es inmediata.
let _preloadedMMS = null;
function preloadMMSWorker(lang){
  if(lang !== "spanish" && lang !== "portuguese") return;
  if(_preloadedMMS === lang) return;
  _preloadedMMS = lang;
  genInWorker(lang, lang === "spanish" ? "hola" : "ola").then(()=>{
    console.log("MMS precargado en worker para", lang);
  }).catch(()=>{ _preloadedMMS = null; });
}
// (Precarga desactivada: en este equipo el worker se cuelga y el modelo del hilo principal
//  se compila al primer Reproducir â€” una sola vez, luego queda en cachÃ©.)

// Resalta la palabra del bloque segÃºn la fracciÃ³n ya reproducida (0..1).
function highlightChunkWord(ch, frac){
  const [first,last]=chunkWordRange(ch);
  if(first<0) return;
  const weights=[];
  for(let i=first;i<=last;i++){ const w=readingWords[i]; let x=w.text.length+1; const c=w.text.slice(-1); if(/[,;:]/.test(c))x+=3; else if(/[.?!â€¦]/.test(c))x+=6; weights.push(x); }
  const tot=weights.reduce((a,b)=>a+b,0)||1;
  let acc=0, idx=first;
  for(let k=0;k<weights.length;k++){ if(acc/tot<=frac) idx=first+k; else break; acc+=weights[k]; }
  highlightWordByIndex(idx);
}
// Un solo rAF: resalta segÃºn el reloj del audio y actualiza el contador de bloque.
function natTick(){
  if(!ttsActive || !natSchedule){ natRAF=null; return; }
  const now=audioCtx.currentTime, s=natSchedule;
  for(let i=0;i<s.N;i++){
    const st=s.startTimes[i], d=s.durations[i];
    if(!d) continue;
    if(now>=st && now<st+d){
      highlightChunkWord(s.chunks[i], (now-st)/d);
      if(speakLabel) speakLabel.textContent = `${t("stop")} Â· ${i+1}/${s.N}`;
      if(s.playIndex!==i){ s.playIndex=i; if(s.pump) s.pump(); }   // avanza la generaciÃ³n con la lectura
      break;
    }
  }
  natRAF=requestAnimationFrame(natTick);
}
// Reproduce un fragmento y resalta sus palabras segÃºn su duraciÃ³n real; resuelve al terminar.
function playNaturalChunk(buf, ch){
  return new Promise((resolve)=>{
    const [first,last]=chunkWordRange(ch);
    const dur=buf.duration, times=[];
    if(first>=0){
      const weights=[];
      for(let i=first;i<=last;i++){ const w=readingWords[i]; let x=w.text.length+1; const c=w.text.slice(-1); if(/[,;:]/.test(c))x+=3; else if(/[.?!â€¦]/.test(c))x+=6; weights.push(x); }
      const tot=weights.reduce((a,b)=>a+b,0)||1; let acc=0;
      for(let k=0;k<weights.length;k++){ times.push(acc/tot*dur); acc+=weights[k]; }
    }
    naturalSource=audioCtx.createBufferSource();
    naturalSource.buffer=buf;
    naturalSource.connect(audioCtx.destination);
    const startT=audioCtx.currentTime+0.02;
    naturalSource.onended=()=>{ if(naturalRAF){cancelAnimationFrame(naturalRAF);naturalRAF=null;} resolve(); };
    naturalSource.start(startT);
    if(first>=0){
      const tick=()=>{
        if(!ttsActive) return;
        const el=audioCtx.currentTime-startT;
        let idx=first; for(let k=0;k<times.length;k++){ if(times[k]<=el) idx=first+k; else break; }
        highlightWordByIndex(idx);
        naturalRAF=requestAnimationFrame(tick);
      };
      naturalRAF=requestAnimationFrame(tick);
    }
  });
}
// Voz natural por bloques, generados en el worker (segundo plano) y encadenados sin huecos.
async function speakNatural(raw){
  try{
    speakBtn.classList.add("speaking"); speakLabel.textContent=t("generating");
    startVoiceStatus(state.lang==="spanish" ? "Preparando voz" : state.lang==="portuguese" ? "Preparando voz" : "Preparing voice");
    const lang = state.lang;
    const chunks = buildSpeechChunks(raw);
    if(!chunks.length){ stopSpeaking(); return; }
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended") await audioCtx.resume();

    const N = chunks.length;
    const buffers = new Array(N).fill(null);
    natSchedule = { sources:[], startTimes:new Array(N).fill(0), durations:new Array(N).fill(0), chunks, N, playIndex:0, pump:null };
    let genPtr=0, schedPtr=0, nextStart=0, started=false;
    const LOOKAHEAD = 2;

    const fail=(err)=>{ if(!ttsActive) return; console.error(err); ttsDownloadTarget=null; fallbackToSystem(raw); };
    const chunkFail=(i, err)=>{
      if(!ttsActive) return;
      console.warn("bloque", i, "fallo:", err);
      if(!started){ fail(err); return; }
      stopVoiceStatus(state.lang==="spanish" ? "Se interrumpio la voz natural. Toca Reproducir otra vez o usa Sistema." : "Natural voice was interrupted. Press Play again or use System.", true);
      stopSpeaking();
    };
    const resetWatchdog=(ms)=>{ if(natWatchdog) clearTimeout(natWatchdog); natWatchdog=setTimeout(()=>{ if(ttsActive && !started) fallbackToSystem(raw); }, ms); };
    const onGenProg=(pct)=>{ if(ttsActive && !started){ speakLabel.textContent=`Cargando voz ${pct}%`; setVoiceStage((state.lang==="spanish"?"Cargando modelo de voz ":state.lang==="portuguese"?"Carregando modelo de voz ":"Loading voice model ")+pct+"%"); resetWatchdog(60000); } };
    const genChunk=(i)=> neuralBufferBG(lang, chunks[i].text, onGenProg).catch(()=> neuralBufferBG(lang, chunks[i].text));

    const pump=()=>{
      while(genPtr<N && (genPtr - natSchedule.playIndex) <= LOOKAHEAD){
        const i=genPtr++;
        genChunk(i).then(buf=>{ if(!ttsActive) return; buffers[i]=buf; schedule(); }).catch(err=>chunkFail(i, err));
      }
    };
    natSchedule.pump = pump;
    const schedule=()=>{
      while(schedPtr<N && buffers[schedPtr]){
        const i=schedPtr++;
        const buf=buffers[i]; buffers[i]=null;
        const src=audioCtx.createBufferSource();
        src.buffer=buf; src.connect(audioCtx.destination);
        if(!started){ nextStart=audioCtx.currentTime+0.10; started=true; showPause(); if(natWatchdog){clearTimeout(natWatchdog);natWatchdog=null;} stopVoiceStatus(""); setMediaSession(true); }
        if(nextStart < audioCtx.currentTime){ nextStart=audioCtx.currentTime+0.02; }
        natSchedule.startTimes[i]=nextStart;
        natSchedule.durations[i]=buf.duration;
        try{ src.start(nextStart); }catch(e){}
        natSchedule.sources.push(src);
        nextStart += buf.duration;
        if(i===N-1){ src.onended=()=>{ if(ttsActive) stopSpeaking(); }; }
        speakLabel.textContent=`${t("stop")} \u00b7 ${i+1}/${N}`;
      }
      if(!natRAF) natRAF=requestAnimationFrame(natTick);
      pump();
    };

    pump();
    if(natWatchdog) clearTimeout(natWatchdog);
    natWatchdog = setTimeout(()=>{ if(ttsActive && !started) fallbackToSystem(raw); }, 150000);
  }catch(e){
    console.error(e); ttsDownloadTarget=null;
    fallbackToSystem(raw);
  }
}
// Construye la vista de lectura: cada palabra en un <span> con su rango de caracteres.
function buildReadingView(text){
  const container = $("promptRead");
  container.innerHTML = "";
  const words = [];
  const frag = document.createDocumentFragment();
  const re = /\S+/g;
  let last = 0, m;
  while((m = re.exec(text))){
    if(m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
    const span = document.createElement("span");
    span.className = "w";
    span.textContent = m[0];
    frag.appendChild(span);
    words.push({ el: span, start: m.index, end: m.index + m[0].length, text: m[0] });
    last = m.index + m[0].length;
  }
  if(last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  container.appendChild(frag);
  return words;
}

/* ---------------- modo "Documento": formato parecido al .docx ----------------
   Detecta tÃ­tulo, subtÃ­tulo, encabezados de secciÃ³n, viÃ±etas y negritas SIN insertar
   ni quitar caracteres, asÃ­ la lectura y el resaltado (que usan las posiciones exactas
   de cada palabra) siguen intactos. Las viÃ±etas/negritas reales del .docx se guardan en
   mapas aparte (por Ã­ndice de lÃ­nea); si no hay .docx, se infieren del texto. */
let docListLines = new Set();     // lÃ­neas que eran viÃ±etas en el .docx
let docBoldRanges = new Map();    // lÃ­nea -> [[ini,fin], ...] rangos de negrita reales

function isDocHeading(t){
  return /^[A-ZÃ‘ÃÃ‰ÃÃ“Ãš]\.\s/.test(t)
    || /^\(\d+\)/.test(t)
    || /^(fase|phase|wave|move|tier|escenario|scenario|modelo|model|paso|step|parte|part|secci[oÃ³]n|section)\b/i.test(t)
    || (t.length<72 && /\(\s*\d+\s*[â€“-]\s*\d+\s*min\s*\)\s*$/.test(t));
}
function classifyDocLines(text){
  const lines = text.split("\n");
  const out=[]; let offset=0, nonEmpty=0;
  for(let i=0;i<lines.length;i++){
    const raw=lines[i], t=raw.trim();
    let kind, marker=false;
    if(!t){ kind="blank"; }
    else{
      nonEmpty++;
      marker=/^\s*[-â€¢*â€“]\s+/.test(raw);
      if(docListLines.has(i) || marker){ kind="li"; }
      else if(nonEmpty===1){ kind="h1"; }
      else if(nonEmpty===2 && /[Â·â€”|]/.test(t) && t.length<140){ kind="sub"; }
      else if(isDocHeading(t)){ kind="h2"; }
      else{ kind="p"; }
    }
    out.push({ kind, text:raw, start:offset, index:i, marker });
    offset += raw.length + 1;   // +1 por el "\n" que split() quitÃ³
  }
  return out;
}
// Negrita de arranque inferida para viÃ±etas sin datos del .docx ("Lado ingresos:", "Corte 1 â€”"â€¦)
function leadInBold(text){
  const m=/^(\s*)(\S.{1,46}?[.:â€”])(\s|$)/.exec(text);
  if(!m) return null;
  const s=m[1].length; return [[s, s+m[2].length]];
}
function rangesOverlap(ranges, a, b){
  if(!ranges) return false;
  for(const [s,e] of ranges){ if(a<e && b>s) return true; }
  return false;
}
function fillDocLine(el, ln, withWords, words){
  const text = ln.text;
  const bold = docBoldRanges.get(ln.index) || (ln.kind==="li" ? leadInBold(text) : null);
  if(withWords){
    const re=/\S+/g; let m, cursor=0;
    while((m=re.exec(text))){
      if(m.index>cursor) el.appendChild(document.createTextNode(text.slice(cursor,m.index)));
      const span=document.createElement("span");
      span.className = "w" + (rangesOverlap(bold, m.index, m.index+m[0].length) ? " dv-b" : "");
      span.textContent=m[0];
      el.appendChild(span);
      words.push({ el:span, start: ln.start+m.index, end: ln.start+m.index+m[0].length, text:m[0] });
      cursor=m.index+m[0].length;
    }
    if(cursor<text.length) el.appendChild(document.createTextNode(text.slice(cursor)));
  } else if(bold){
    let cursor=0;
    [...bold].sort((a,b)=>a[0]-b[0]).forEach(([s,e])=>{
      if(s>cursor) el.appendChild(document.createTextNode(text.slice(cursor,s)));
      const b=document.createElement("span"); b.className="dv-b"; b.textContent=text.slice(s,e); el.appendChild(b);
      cursor=e;
    });
    if(cursor<text.length) el.appendChild(document.createTextNode(text.slice(cursor)));
  } else {
    el.textContent=text;
  }
}
// Renderiza el texto con formato dentro de `container`. Si withWords, envuelve cada
// palabra en <span class="w"> con su offset real (para resaltado + sincronÃ­a de voz)
// y devuelve el arreglo readingWords.
function renderDocInto(container, text, withWords){
  container.innerHTML="";
  const words=[];
  let curUl=null;
  for(const ln of classifyDocLines(text)){
    if(ln.kind==="blank"){ curUl=null; continue; }
    if(ln.kind==="li"){
      if(!curUl){ curUl=document.createElement("ul"); curUl.className="dv-ul"; container.appendChild(curUl); }
      const li=document.createElement("li");
      if(ln.marker) li.className="nomark";
      fillDocLine(li, ln, withWords, words);
      curUl.appendChild(li);
      continue;
    }
    curUl=null;
    const el=document.createElement("div");
    el.className = ln.kind==="h1" ? "dv-h1" : ln.kind==="sub" ? "dv-sub" : ln.kind==="h2" ? "dv-h2" : "dv-p";
    fillDocLine(el, ln, withWords, words);
    container.appendChild(el);
  }
  return words;
}
function renderDocView(){
  if(state.docView!=="document") return;
  renderDocInto($("promptDoc"), $("promptText").value||"", false);
  const hint=document.createElement("span"); hint.className="dv-hint";
  hint.textContent = (typeof t==="function" && state.lang==="english") ? "Tap to edit" : "Toca para editar";
  $("promptDoc").appendChild(hint);
}
// Muestra la caja correcta segÃºn el modo (fuera de la reproducciÃ³n).
function applyDocView(){
  const playing = ttsActive || naturalSource || (synth && (synth.speaking||synth.pending));
  if(playing) return;   // durante la lectura manda promptRead
  const isDoc = state.docView==="document";
  $("promptText").style.display = isDoc ? "none" : "";
  $("promptDoc").style.display  = isDoc ? "block" : "none";
  if(isDoc) renderDocView();
}
// Toggle Simple / Documento
$("docViewSeg").querySelectorAll("button").forEach(b=>{
  b.addEventListener("click", ()=>{
    $("docViewSeg").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false"));
    b.setAttribute("aria-pressed","true");
    state.docView = b.dataset.docview;
    applyDocView();
  });
});
// Tocar la vista Documento vuelve a ediciÃ³n (Simple) y enfoca el textarea
$("promptDoc").addEventListener("click", ()=>{
  const simpleBtn=$("docViewSeg").querySelector('[data-docview="simple"]');
  if(simpleBtn) simpleBtn.click();
  $("promptText").focus();
});
// Editar el texto invalida el formato real del .docx (las lÃ­neas se movieron)
$("promptText").addEventListener("input", ()=>{
  docListLines = new Set(); docBoldRanges = new Map();
});
// Divide el texto en fragmentos cortos (<=180 car) cortando en fin de frase, salto de
// lÃ­nea o espacio, guardando el desplazamiento exacto en el texto original. Necesario
// porque speechSynthesis en Chrome/Android corta las locuciones largas (~15 s); con
// fragmentos cortos ya no se corta Y el resaltado va sincronizado (offset por fragmento).
function buildSpeechChunks(text){
  const MAX = 180, chunks = [];
  const pushSeg = (start, end)=>{
    let s = start;
    while(end - s > MAX){
      let cut = s + MAX;
      const sp = text.lastIndexOf(" ", cut);
      if(sp > s) cut = sp;
      if(text.slice(s, cut).trim()) chunks.push({ text: text.slice(s, cut), start: s });
      s = cut;
    }
    if(text.slice(s, end).trim()) chunks.push({ text: text.slice(s, end), start: s });
  };
  let segStart = 0;
  for(let i=0;i<text.length;i++){
    const c = text[i];
    if(c === "\n" || c === "." || c === "!" || c === "?" || c === "\u2026"){
      pushSeg(segStart, i+1); segStart = i+1;
    }
  }
  if(segStart < text.length) pushSeg(segStart, text.length);
  return chunks.length ? chunks : [{ text, start:0 }];
}
function chunkWordRange(ch){
  const lo = ch.start, hi = ch.start + ch.text.length;
  let first = -1, last = -1;
  for(let i=0;i<readingWords.length;i++){
    const w = readingWords[i];
    if(w.start >= lo && w.start < hi){ if(first < 0) first = i; last = i; }
  }
  return [first, last];
}
// Respaldo por tiempo, por fragmento (para voces que no emiten eventos de lÃ­mite de palabra).
function startChunkMonitor(ch){
  stopMonitor();
  const [first, last] = chunkWordRange(ch);
  if(first < 0) return;
  const cps = 14 * (ttsRate || 1);
  const times = []; let t = 0;
  for(let i=first;i<=last;i++){
    times.push(t);
    const w = readingWords[i];
    t += (w.text.length + 1) / cps;
    const c = w.text.slice(-1);
    if(/[,;:]/.test(c)) t += 0.15; else if(/[.?!\u2026]/.test(c)) t += 0.30;
  }
  const startMs = Date.now();
  monitorTimer = setInterval(()=>{
    if(lastBoundaryAt && Date.now() - lastBoundaryAt < 1000) return;   // el evento manda si es reciente
    const el = (Date.now() - startMs) / 1000 + 0.10;
    let idx = first;
    for(let k=0;k<times.length;k++){ if(times[k] <= el) idx = first + k; else break; }
    highlightWordByIndex(idx);
  }, 60);
}
function speakChunk(){
  if(!ttsActive) return;
  if(chunkIdx >= speechChunks.length){ stopSpeaking(); return; }
  const ch = speechChunks[chunkIdx];
  const u = new SpeechSynthesisUtterance(ch.text);
  u.lang = state.lang==="spanish" ? "es-ES" : state.lang==="portuguese" ? "pt-BR" : "en-US";
  const v = pickVoice(state.lang==="spanish" ? "es" : state.lang==="portuguese" ? "pt" : "en"); if(v) u.voice = v;
  u.rate = ttsRate;
  u.onboundary = (e)=>{
    if(e.name && e.name !== "word") return;
    const gi = ch.start + (e.charIndex || 0);
    let w = null;
    for(let i=0;i<readingWords.length;i++){ const x = readingWords[i]; if(gi >= x.start && gi < x.end){ w = i; break; } }
    if(w == null){ for(let i=0;i<readingWords.length;i++){ if(readingWords[i].start >= gi){ w = i; break; } } }
    if(w != null){ lastBoundaryAt = Date.now(); highlightWordByIndex(w); }
  };
  u.onstart = ()=>{ startChunkMonitor(ch); };
  u.onend = ()=>{ if(!ttsActive) return; chunkIdx++; speakChunk(); };
  u.onerror = ()=>{ if(!ttsActive) return; chunkIdx++; speakChunk(); };
  synth.speak(u);
}
function pickVoice(langCode){
  const voices = synth.getVoices() || [];
  return voices.find(v=>v.lang && v.lang.toLowerCase().startsWith(langCode))
      || voices.find(v=>v.lang && v.lang.toLowerCase().startsWith(langCode.slice(0,2)))
      || null;
}
// Lee con la voz del sistema (speechSynthesis): instantÃ¡nea, sin modelos.
function speakSystem(raw){
  if(!synth){ setStatus("Tu navegador no soporta la voz del sistema.", true); stopSpeaking(); return; }
  speechChunks = buildSpeechChunks(raw);
  chunkIdx = 0; ttsRate = 0.8;
  speakBtn.classList.add("speaking");
  speakLabel.textContent = speakStopLabel();
  synth.cancel();
  speakChunk();
  showPause();
}
// La voz natural no arrancÃ³ en este dispositivo â†’ cae a la voz del sistema sin apagar la lectura.
function fallbackToSystem(raw){
  naturalBroken = true;                       // no volver a intentar la natural en esta sesiÃ³n
  if(natWatchdog){ clearTimeout(natWatchdog); natWatchdog=null; }
  if(natRAF){ cancelAnimationFrame(natRAF); natRAF=null; }
  if(natSchedule && natSchedule.sources){ for(const s of natSchedule.sources){ try{ s.onended=null; s.stop(); }catch(e){} } }
  natSchedule=null;
  stopVoiceStatus(state.lang==="spanish" ? "Voz natural no disponible aqui; leyendo con la voz del sistema." : state.lang==="portuguese" ? "Voz natural nao disponivel aqui; lendo com a voz do sistema." : "Natural voice unavailable here; reading with system voice.");
  ttsActive = true;                           // seguimos leyendo
  speakSystem(raw);
}
if(speakBtn){

  speakBtn.addEventListener("click", async ()=>{
    if(ttsActive || (synth && (synth.speaking||synth.pending)) || naturalSource){ stopSpeaking(); return; }
    const raw = $("promptText").value;
    if(!raw.trim()) return;

    if(state.docView==="document"){
      readingWords = renderDocInto($("promptRead"), raw, true);
      $("promptRead").classList.add("doc-view");
    } else {
      readingWords = buildReadingView(raw);
      $("promptRead").classList.remove("doc-view");
    }
    $("promptText").style.display = "none";
    $("promptDoc").style.display = "none";
    $("promptRead").style.display = "block";
    ttsActive = true; lastBoundaryAt = 0;

    if(state.voice === "natural" && !naturalBroken){
      // prepara el AudioContext dentro del gesto del usuario (polÃ­tica de autoplay)
      try{ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==="suspended") await audioCtx.resume(); }catch(e){}
      speakNatural(raw);
    } else {
      if(state.voice === "natural"){   // ya sabemos que la natural no funciona aquÃ­
        setVoiceStatus(state.lang==="spanish" ? "Voz natural no disponible en este dispositivo; uso la del sistema." : state.lang==="portuguese" ? "Voz natural nao disponivel neste dispositivo; uso a do sistema." : "Natural voice unavailable on this device; using system voice.");
      }
      speakSystem(raw);
    }
  });
  if(synth && synth.onvoiceschanged !== undefined){ synth.onvoiceschanged = ()=>{}; }
}

/* ---------------- botÃ³n X: borrar el texto del prompt (estilo Google Translate) ---------------- */
const clearBtn = $("clearBtn"), promptTextEl = $("promptText");
function updateClearBtn(){ clearBtn.style.display = promptTextEl.value.trim() ? "flex" : "none"; }
if(clearBtn){
  clearBtn.addEventListener("click", ()=>{
    if(synth && (ttsActive || synth.speaking || synth.pending)) stopSpeaking();
    promptTextEl.value = "";
    updateClearBtn();
    promptTextEl.focus();
    // refresca los paneles que dependen del texto, si estÃ¡n abiertos
    if(typeof renderPhonetics === "function") renderPhonetics();
    wpImproveWords = [];
    if(typeof wordPanel !== "undefined" && wordPanel.classList.contains("on") && cmudict) buildWpChips();
  });
  promptTextEl.addEventListener("input", updateClearBtn);
  updateClearBtn();
}

/* ---------------- subir un .docx: detectar bloques (pÃ¡rrafos) y cargarlos ---------------- */
let JSZipLib=null;
async function ensureJSZip(){
  if(JSZipLib) return JSZipLib;
  const m = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
  JSZipLib = m.default || m;
  return JSZipLib;
}
// Extrae cada pÃ¡rrafo (<w:p>) como un bloque; marca viÃ±etas (numPr/ListParagraph) y
// captura los rangos de negrita (offsets locales al texto ya normalizado del bloque),
// para poder reproducir el formato del .docx sin modificar el texto que se lee en voz.
function parseDocxBlocks(xmlString){
  const doc = new DOMParser().parseFromString(xmlString, "application/xml");
  const ps = doc.getElementsByTagName("w:p");
  const blocks=[];
  for(const p of ps){
    // reconstruye el texto por runs, llevando en paralelo quÃ© caracteres van en negrita
    const runs = p.getElementsByTagName("w:r");
    const rawChars=[], rawBold=[];
    for(const r of runs){
      const rpr = r.getElementsByTagName("w:rPr")[0];
      let bold=false;
      if(rpr){
        for(const bEl of rpr.getElementsByTagName("w:b")){
          const v=bEl.getAttribute("w:val");
          if(v===null || /^(true|1|on)$/i.test(v)) bold=true;   // <w:b/> = negrita; ignora val="false"/"0"
        }
      }
      for(const tEl of r.getElementsByTagName("w:t")){
        const s=tEl.textContent||"";
        for(const ch of s){ rawChars.push(ch); rawBold.push(bold); }
      }
    }
    const st = p.getElementsByTagName("w:pStyle")[0];
    const isList = !!(st && /list/i.test(st.getAttribute("w:val")||"")) || (p.getElementsByTagName("w:numPr").length>0);
    if(!rawChars.length) continue;
    // normaliza (nbspâ†’espacio, colapsa espacios, recorta) manteniendo la marca de negrita alineada
    const outC=[], outB=[]; let prevSpace=false;
    for(let k=0;k<rawChars.length;k++){
      let c=rawChars[k]; if(c==="\u00a0") c=" ";
      if(/\s/.test(c)){ if(prevSpace) continue; outC.push(" "); outB.push(false); prevSpace=true; }
      else { outC.push(c); outB.push(rawBold[k]); prevSpace=false; }
    }
    while(outC.length && outC[0]===" "){ outC.shift(); outB.shift(); }
    while(outC.length && outC[outC.length-1]===" "){ outC.pop(); outB.pop(); }
    const text=outC.join(""); if(!text) continue;
    const bold=[]; let s=-1;
    for(let k=0;k<=outB.length;k++){
      if(k<outB.length && outB[k]){ if(s<0) s=k; }
      else if(s>=0){ bold.push([s,k]); s=-1; }
    }
    blocks.push({ text, isList, bold });
  }
  return blocks;
}
function isDocxHeader(t){
  return /^(\(\d+\)|open\b|close\b|wave\s*\d|move\s*\d|tier\s*(one|two|three|\d))/i.test(t) && t.length<70;
}
function loadBlockIntoBox(text, metaLines){
  $("promptText").value = text;
  docListLines = new Set(); docBoldRanges = new Map();
  if(metaLines && metaLines.length){                       // formato real del .docx, por lÃ­nea
    metaLines.forEach((mb,i)=>{
      if(mb.isList) docListLines.add(i);
      if(mb.bold && mb.bold.length) docBoldRanges.set(i, mb.bold);
    });
  }
  if(typeof updateClearBtn==="function") updateClearBtn();
  if(typeof renderPhonetics==="function") renderPhonetics();
  wpImproveWords = [];
  if(typeof wordPanel!=="undefined" && wordPanel.classList.contains("on") && (cmudict||state.lang==="spanish")) buildWpChips();
  $("docxPanel").style.display="none";
  if(typeof applyDocView==="function") applyDocView();
  document.querySelector(".prompt").scrollIntoView({behavior:"smooth", block:"start"});
}
function updateDocxSelCount(){
  const n=$("docxList").querySelectorAll(".docx-item.sel").length;
  const b=$("docxSel"); if(b){ b.textContent=`Cargar selecciÃ³n (${n})`; b.disabled=n===0; }
}
function renderDocxBlocks(blocks, name){
  const list=$("docxList"); list.innerHTML="";
  $("docxName").textContent = name ? ("Â· "+name) : "";
  window.__docxBlocks = blocks;
  if(!blocks.length){ list.innerHTML='<div class="docx-empty">No se detectÃ³ texto en el documento.</div>'; }
  const mkItem=(b,i,isHead)=>{
    const it=document.createElement("button"); it.type="button";
    it.className="docx-item"+(isHead?" head":(b.isList?" list":"")); it.dataset.i=i;
    const ck=document.createElement("span"); ck.className="docx-check"; ck.textContent="âœ“";
    const tx=document.createElement("span"); tx.textContent=b.text;
    it.appendChild(ck); it.appendChild(tx);
    return it;
  };
  blocks.forEach((b,i)=>{
    const isHead = isDocxHeader(b.text) && !b.isList;
    const it=mkItem(b,i,isHead);
    if(isHead){
      it.addEventListener("click", ()=>{                 // el tÃ­tulo selecciona toda su secciÃ³n
        const on=!it.classList.contains("sel");
        it.classList.toggle("sel", on);
        let el=it.nextElementSibling;
        while(el && !el.classList.contains("head")){
          if(el.classList.contains("docx-item")) el.classList.toggle("sel", on);
          el=el.nextElementSibling;
        }
        updateDocxSelCount();
      });
    } else {
      it.addEventListener("click", ()=>{ it.classList.toggle("sel"); updateDocxSelCount(); });
    }
    list.appendChild(it);
  });
  updateDocxSelCount();
  $("docxPanel").style.display="block";
}
function loadDocxSelected(){
  const sel=[...$("docxList").querySelectorAll(".docx-item.sel")];
  const blocks=window.__docxBlocks||[];
  if(!sel.length) return;
  const chosen = sel.map(el=>blocks[+el.dataset.i]);
  loadBlockIntoBox(chosen.map(b=>b.text).join("\n"), chosen);
}
if($("docxBtn")){
  $("docxBtn").addEventListener("click", ()=>$("docxInput").click());
  $("docxInput").addEventListener("change", async (e)=>{
    const f=e.target.files[0]; e.target.value="";
    if(!f) return;
    const list=$("docxList");
    $("docxName").textContent=""; list.innerHTML='<div class="docx-empty">Leyendo documentoâ€¦</div>'; $("docxPanel").style.display="block";
    try{
      const zip = await (await ensureJSZip()).loadAsync(await f.arrayBuffer());
      const entry = zip.file("word/document.xml");
      if(!entry){ list.innerHTML='<div class="docx-empty">No parece un .docx vÃ¡lido.</div>'; return; }
      const xml = await entry.async("string");
      renderDocxBlocks(parseDocxBlocks(xml), f.name.replace(/\.docx$/i,""));
    }catch(err){
      console.error(err);
      list.innerHTML='<div class="docx-empty" style="color:var(--neg)">No se pudo leer el documento: '+((err&&err.message)||err)+'</div>';
    }
  });
  $("docxClose").addEventListener("click", ()=>{ $("docxPanel").style.display="none"; });
  $("docxSel").addEventListener("click", loadDocxSelected);
  $("docxAll").addEventListener("click", ()=>{
    const blocks=window.__docxBlocks||[];
    if(blocks.length) loadBlockIntoBox(blocks.map(b=>b.text).join("\n"), blocks);
  });
}

/* ---------------- descargar pronunciaciÃ³n como .mp3 (TTS neural, local) ----------------
   speechSynthesis no se puede grabar a archivo, asÃ­ que sintetizamos con Kokoro (ONNX)
   vÃ­a Transformers.js y codificamos a MP3 con lamejs â€” formato que WhatsApp acepta y
   Android reproduce nativamente (el WAV no lo soporta WhatsApp). Carga perezosa: el
   modelo (~80 MB) y el codificador solo se bajan la primera vez, luego quedan en cachÃ©. */
let kokoroTTS = null, mmsTTS = null, lame = null, ttsAudioUrl = null, kokoroDevice = "", kokoroForceWasm = false;
const dlAudioBtn = $("dlAudioBtn"), dlAudioLabel = $("dlAudioLabel");

let ttsDownloadTarget=null, ttsSeen={}, _kokoroP=null, _mmsP=null;
function ttsProgress(e){
  if(!ttsDownloadTarget) return;
  if(e && e.status==="progress" && e.file){
    ttsSeen[e.file]=e.progress||0;
    const vals=Object.values(ttsSeen); const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
    ttsDownloadTarget(Math.round(avg));
  }
}
async function ensureKokoro(){
  if(kokoroTTS) return kokoroTTS;
  if(_kokoroP) return _kokoroP;
  _kokoroP=(async()=>{
    setMS && setMS("voiceEn","loading"); ttsSeen={};
    try{
      const mod = await import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.0/+esm");
      const KokoroTTS = mod.KokoroTTS || (mod.default && mod.default.KokoroTTS);
      if(!KokoroTTS) throw new Error("No se pudo cargar el motor de voz.");
      const modelId = "onnx-community/Kokoro-82M-v1.0-ONNX";
      if(navigator.gpu && !kokoroForceWasm){
        try{
          kokoroTTS = await KokoroTTS.from_pretrained(modelId, { dtype:"fp32", device:"webgpu", progress_callback:ttsProgress });
          kokoroDevice = "webgpu"; setMS && setMS("voiceEn","ready"); return kokoroTTS;
        }catch(e){ console.warn("Kokoro WebGPU fallÃ³, uso WASM:", e); kokoroTTS = null; ttsSeen={}; }
      }
      kokoroTTS = await KokoroTTS.from_pretrained(modelId, { dtype:"q8", progress_callback:ttsProgress });
      kokoroDevice = "wasm"; setMS && setMS("voiceEn","ready"); return kokoroTTS;
    }catch(e){ setMS && setMS("voiceEn","error"); _kokoroP=null; throw e; }
  })();
  return _kokoroP;
}
// Voz natural en espaÃ±ol: MMS-TTS (VITS neural, Transformers.js). 16 kHz.
// Nota: este modelo NO corre en WebGPU â€” usa GatherND con enteros int64, que el backend
// WebGPU de ONNX Runtime no soporta ("Unsupported data type: 7"). Se ejecuta siempre en
// WASM, que sÃ­ lo admite; para frases cortas el tiempo es prÃ¡cticamente el mismo.
async function ensureMMS(){
  if(mmsTTS) return mmsTTS;
  if(_mmsP) return _mmsP;
  _mmsP=(async()=>{
    setMS && setMS("voiceEs","loading"); ttsSeen={};
    try{
      mmsTTS = await pipeline("text-to-speech", "Xenova/mms-tts-spa", { dtype:"q8", progress_callback:ttsProgress });
      setMS && setMS("voiceEs","ready"); return mmsTTS;
    }catch(e){ setMS && setMS("voiceEs","error"); _mmsP=null; throw e; }
  })();
  return _mmsP;
}
// Voz natural en portuguÃ©s: MMS-TTS (VITS neural, Transformers.js). 16 kHz.
let mmsPtTTS = null, _mmsPtP = null;
async function ensureMMSPt(){
  if(mmsPtTTS) return mmsPtTTS;
  if(_mmsPtP) return _mmsPtP;
  _mmsPtP=(async()=>{
    setMS && setMS("voicePt","loading"); ttsSeen={};
    try{
      mmsPtTTS = await pipeline("text-to-speech", "Xenova/mms-tts-por", { dtype:"q8", progress_callback:ttsProgress });
      setMS && setMS("voicePt","ready"); return mmsPtTTS;
    }catch(e){ setMS && setMS("voicePt","error"); _mmsPtP=null; throw e; }
  })();
  return _mmsPtP;
}
// Sube el volumen al mismo nivel (MMS sale mÃ¡s bajo que Kokoro). Preserva el silencio.
function normalizeSamples(samples){
  let peak=0; for(let i=0;i<samples.length;i++){ const a=Math.abs(samples[i]); if(a>peak) peak=a; }
  if(peak>0.02 && peak<0.98){ const g=0.92/peak; for(let i=0;i<samples.length;i++) samples[i]*=g; }
  return samples;
}
// Genera muestras de audio con el motor neural del idioma actual.
async function neuralSamples(lang, text){
  if(lang==="spanish"){
    let s = await ensureMMS();
    try{
      const out = await s(text);
      return { samples: normalizeSamples(out.audio), sr: out.sampling_rate || 16000 };
    }catch(e){
      console.warn("MMS fallÃ³ en inferencia; rehago en WASM y reintento:", e);
      mmsTTS=null; _mmsP=null;
      s = await ensureMMS();
      const out = await s(text);
      return { samples: normalizeSamples(out.audio), sr: out.sampling_rate || 16000 };
    }
  }
  if(lang==="portuguese"){
    let s = await ensureMMSPt();
    try{
      const out = await s(text);
      return { samples: normalizeSamples(out.audio), sr: out.sampling_rate || 16000 };
    }catch(e){
      console.warn("MMS-PT fallÃ³ en inferencia; rehago y reintento:", e);
      mmsPtTTS=null; _mmsPtP=null;
      s = await ensureMMSPt();
      const out = await s(text);
      return { samples: normalizeSamples(out.audio), sr: out.sampling_rate || 16000 };
    }
  }
  const tts = await ensureKokoro();
  const out = await tts.generate(text, { voice:"af_heart", speed:0.9 });
  return { samples: normalizeSamples(out.audio), sr: out.sampling_rate || 24000 };
}
function isSilent(samples){
  let m=0; const step=Math.max(1, Math.floor(samples.length/4000));
  for(let i=0;i<samples.length;i+=step){ const a=Math.abs(samples[i]); if(a>m) m=a; }
  return m < 1e-3;
}

async function ensureLame(){
  if(lame) return lame;
  const mod = await import("https://cdn.jsdelivr.net/npm/@breezystack/lamejs@1.2.7/+esm");
  lame = mod.default || mod;
  if(!lame.Mp3Encoder && mod.Mp3Encoder) lame = mod;
  if(!lame.Mp3Encoder) throw new Error("No se pudo cargar el codificador MP3.");
  return lame;
}

// Float32 [-1,1] mono â†’ Blob MP3 (128 kbps). lamejs admite 24 kHz (salida de Kokoro).
function float32ToMp3Blob(lamejs, samples, sampleRate){
  const enc = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const int16 = new Int16Array(samples.length);
  for(let i=0;i<samples.length;i++){
    const s = Math.max(-1, Math.min(1, samples[i]));
    int16[i] = s<0 ? s*0x8000 : s*0x7FFF;
  }
  const data = [], block = 1152;
  for(let i=0;i<int16.length;i+=block){
    const buf = enc.encodeBuffer(int16.subarray(i, i+block));
    if(buf.length>0) data.push(new Uint8Array(buf));
  }
  const end = enc.flush();
  if(end.length>0) data.push(new Uint8Array(end));
  return new Blob(data, { type:"audio/mpeg" });
}

async function onDownloadAudio(){
  if(!dlAudioBtn) return;
  const text = ($("promptText").value || "").trim();
  if(!text){ setStatus("Escribe primero el texto que quieres descargar.", true); return; }
  dlAudioBtn.disabled = true;
  const orig = t("dlmp3");
  try{
    dlAudioLabel.textContent = "Cargando modeloâ€¦";
    dlAudioLabel.textContent = "Generandoâ€¦";
    const { samples, sr } = await neuralSamples(state.lang, text);   // Kokoro (en) / MMS (es)

    dlAudioLabel.textContent = "Codificandoâ€¦";
    const lamejs = await ensureLame();
    const blob = float32ToMp3Blob(lamejs, samples, sr);

    if(ttsAudioUrl) URL.revokeObjectURL(ttsAudioUrl);
    ttsAudioUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = ttsAudioUrl;
    a.download = (state.lang==="spanish" ? "pronunciacion-es" : state.lang==="portuguese" ? "pronunciacao-pt" : "pronunciation-en") + ".mp3";
    document.body.appendChild(a); a.click(); a.remove();

    dlAudioLabel.textContent = "Descargado âœ“";
    setTimeout(()=>{ dlAudioLabel.textContent = orig; }, 1800);
  }catch(err){
    console.error(err);
    dlAudioLabel.textContent = orig;
    setStatus("No se pudo generar el audio: " + ((err && err.message) || err), true);
  }finally{
    dlAudioBtn.disabled = false;
  }
}
if(dlAudioBtn) dlAudioBtn.addEventListener("click", onDownloadAudio);

// "Preparar voz": compila el modelo (hilo principal) una sola vez, cuando el usuario decide,
// para que despuÃ©s Reproducir sea inmediato. Congela unos segundos durante la compilaciÃ³n.
if($("warmBtn")){
  $("warmBtn").addEventListener("click", async ()=>{
    const btn=$("warmBtn");
    if(btn.dataset.busy==="1") return;
    btn.dataset.busy="1";
    const es = state.lang==="spanish";
    const pt = state.lang==="portuguese";
    btn.textContent = es ? "Preparando..." : pt ? "Preparando..." : "Preparing...";
    setVoiceStatus(es ? "Preparando la voz en segundo plano..." : pt ? "Preparando a voz em segundo plano..." : "Preparing the voice - the screen may freeze for a few seconds.");
    await new Promise(r=>setTimeout(r, 60));                 // deja pintar el estado antes de compilar
    ttsDownloadTarget = (pct)=>{ setVoiceStatus((es?"Descargando modelo de voz ":pt?"Baixando modelo de voz ":"Downloading voice model ")+pct+"%"); };
    try{
      if(es || pt){
        await genInWorker(state.lang, es ? "hola" : "ola", (pct)=>{ setVoiceStatus((es?"Descargando modelo de voz ":pt?"Baixando modelo de voz ":"Downloading voice model ")+pct+"%"); });
      } else {
        await neuralSamples(state.lang, "hello");  // Kokoro: frase minima en hilo principal
      }
    }catch(e){
      console.error(e); ttsDownloadTarget=null;
      btn.dataset.ready="";
      btn.textContent = es ? "Preparar voz" : pt ? "Preparar voz" : "Prepare voice";
      setVoiceStatus((es?"No se pudo preparar la voz: ":pt?"Nao foi possivel preparar a voz: ":"Couldn't prepare voice: ")+((e&&e.message)||e), true);
    }finally{
      btn.dataset.busy="0";
    }
  });
}

/* ---------------- fonÃ©tica: inglÃ©s â†’ IPA + re-deletreo para hispanohablante ---------------- */
const phonBtn = $("phonBtn");
let cmudict = null, phonDebounce = null;

async function ensureDict(){
  if(cmudict) return cmudict;
  const mod = await import("https://cdn.jsdelivr.net/npm/cmu-pronouncing-dictionary@3.0.0/index.js");
  cmudict = mod.dictionary || mod.default || mod;
  return cmudict;
}

const PH_VOWELS = new Set(["AA","AE","AH","AO","AW","AY","EH","ER","EY","IH","IY","OW","OY","UH","UW"]);
// ARPABET â†’ IPA
const ARPA_IPA = {
  AA:"É‘",AE:"Ã¦",AH:"ÊŒ",AO:"É”",AW:"aÊŠ",AY:"aÉª",EH:"É›",ER:"É",EY:"eÉª",IH:"Éª",IY:"i",OW:"oÊŠ",OY:"É”Éª",UH:"ÊŠ",UW:"u",
  B:"b",CH:"tÊƒ",D:"d",DH:"Ã°",F:"f",G:"É¡",HH:"h",JH:"dÊ’",K:"k",L:"l",M:"m",N:"n",NG:"Å‹",P:"p",R:"É¹",S:"s",SH:"Êƒ",T:"t",TH:"Î¸",V:"v",W:"w",Y:"j",Z:"z",ZH:"Ê’"
};
// ARPABET â†’ re-deletreo "a la latina" (se lee con valores del espaÃ±ol)
const ARPA_ES = {
  AA:"a",AE:"a",AH:"a",AO:"o",AW:"au",AY:"ai",EH:"e",ER:"er",EY:"ei",IH:"i",IY:"ii",OW:"ou",OY:"oi",UH:"u",UW:"uu",
  B:"b",CH:"ch",D:"d",DH:"d",F:"f",G:"g",HH:"j",JH:"y",K:"k",L:"l",M:"m",N:"n",NG:"ng",P:"p",R:"r",S:"s",SH:"sh",T:"t",TH:"z",V:"v",W:"u",Y:"y",Z:"z",ZH:"y"
};
const ACC = { a:"Ã¡",e:"Ã©",i:"Ã­",o:"Ã³",u:"Ãº" };

// Respaldo: palabra inglesa fuera del diccionario â†’ re-deletreo aproximado por reglas.
function esFallback(wordRaw){
  let s = (wordRaw||"").toLowerCase().replace(/[^a-z]/g,"");
  if(!s) return "";
  const rep = (re,to)=>{ s = s.replace(re,to); };
  rep(/tch/g,"C"); rep(/ch/g,"C"); rep(/sh/g,"S");              // dÃ­grafos conservados
  rep(/eigh/g,"Ei"); rep(/igh/g,"Ai"); rep(/augh|ough/g,"O");
  rep(/tion\b/g,"Son"); rep(/sion\b/g,"Son");
  rep(/cious\b|tious\b/g,"Sas"); rep(/ture\b/g,"Cer");
  rep(/ph/g,"f"); rep(/th/g,"Z");
  rep(/ck/g,"k"); rep(/qu/g,"ku"); rep(/wh/g,"u"); rep(/x/g,"ks");
  rep(/^kn/g,"n"); rep(/^wr/g,"r"); rep(/mb\b/g,"m"); rep(/gh/g,"");
  rep(/c(?=[eiy])/g,"s"); rep(/c/g,"k"); rep(/g(?=[eiy])/g,"Y");  // c/g suaves
  rep(/a([^aeiou])e\b/g,"Ei$1"); rep(/i([^aeiou])e\b/g,"Ai$1");   // "magic e"
  rep(/o([^aeiou])e\b/g,"Ou$1"); rep(/u([^aeiou])e\b/g,"Iu$1");
  rep(/e([^aeiou])e\b/g,"Ii$1");
  rep(/ee/g,"Ii"); rep(/ea/g,"Ii"); rep(/oo/g,"Uu");             // equipos de vocales
  rep(/ou/g,"Au"); rep(/ow/g,"Au"); rep(/oa/g,"Ou");
  rep(/oi|oy/g,"Oi"); rep(/ai|ay/g,"Ei"); rep(/ey/g,"I");
  rep(/au|aw/g,"O"); rep(/ew/g,"Iu"); rep(/ie/g,"Ai");
  rep(/er|ir|ur/g,"Er");                                          // vocales con r
  rep(/^y/g,"Y"); rep(/j/g,"Y"); rep(/w/g,"u"); rep(/h/g,"y"); rep(/z/g,"s"); rep(/y/g,"i");
  rep(/([^aeiou])e\b/g,"$1");                                     // e muda final
  rep(/([bcdfgklmnprstv])\1/g,"$1");                             // colapsar dobles
  rep(/C/g,"ch"); rep(/S/g,"sh"); rep(/Z/g,"z"); rep(/Y/g,"y");   // restaurar
  return s.toLowerCase();
}

function arpaToForms(pron){
  const toks = pron.trim().split(/\s+/);
  // ---- IPA americano con acento en la sÃ­laba correcta (rÃ³tico: É tÃ³nico / Éš Ã¡tono) ----
  const syls = syllabify(toks);
  let ipa = "";
  syls.forEach(syl=>{
    let stress = null;                                    // el acento de la sÃ­laba = el de su vocal
    for(const tk of syl){ const p=tk.replace(/\d$/,""); if(PH_VOWELS.has(p)){ stress=(tk.match(/(\d)$/)||[])[1]||null; break; } }
    if(syls.length>1 && stress==="1") ipa += "Ëˆ";         // acento primario (no en monosÃ­labos)
    else if(syls.length>1 && stress==="2") ipa += "ËŒ";    // acento secundario
    for(const tk of syl){
      const st=(tk.match(/(\d)$/)||[])[1]||null, ph=tk.replace(/\d$/,"");
      let sym = ARPA_IPA[ph] || "";
      if(ph==="AH" && st==="0") sym = "É™";
      if(ph==="ER" && st==="0") sym = "Éš";                // vocal r-color Ã¡tona (americano)
      ipa += sym;
    }
  });
  // ---- EspaÃ±ol (re-deletreo) ----
  let es = "";
  toks.forEach((tok,i)=>{
    const st = (tok.match(/(\d)$/)||[])[1] || null;
    const ph = tok.replace(/\d$/,"");
    let esSym = ARPA_ES[ph] || "";
    if(ph==="G"){                       // g dura ante e/i â†’ "gu"
      const nxt = toks[i+1] ? toks[i+1].replace(/\d$/,"") : "";
      if(["IY","IH","EY","EH","AE"].includes(nxt)) esSym = "gu";
    }
    if(PH_VOWELS.has(ph) && st==="1"){  // acento en la vocal tÃ³nica
      esSym = esSym.replace(/[aeiou]/, c=>ACC[c]||c);
    }
    es += esSym;
  });
  return { ipa: "/"+ipa+"/", es };
}

function renderPhonetics(){
  const panel = $("phoneticPanel");
  if(!panel.classList.contains("on")) return;
  const cont = $("phonWords");
  if(!cmudict){ return; }
  const words = ($("promptText").value || "").split(/\s+/).filter(Boolean).slice(0,150);
  cont.innerHTML = "";
  if(!words.length){ cont.innerHTML = '<span class="phon-note">Escribe una palabra o frase arriba.</span>'; return; }
  const frag = document.createDocumentFragment();
  words.forEach(w=>{
    const clean = w.toLowerCase().replace(/^[^a-z']+|[^a-z']+$/g,"");
    if(!clean) return;                  // salta signos de puntuaciÃ³n sueltos
    const pron = cmudict[clean];
    const div = document.createElement("div");
    div.className = "pw" + (pron ? "" : " unknown");
    const en = document.createElement("span"); en.className="pw-en"; en.textContent = w;
    const es = document.createElement("span"); es.className="pw-es";
    const ipa = document.createElement("span"); ipa.className="pw-ipa";
    if(pron){
      const f = arpaToForms(pron);
      es.textContent = f.es; ipa.textContent = f.ipa;
    } else {
      const fb = esFallback(clean);
      if(fb){ div.className = "pw approx"; es.textContent = fb; ipa.textContent = "â‰ˆ aprox."; }
      else  { es.textContent = "â€”"; ipa.textContent = "no estÃ¡ en el diccionario"; }
    }
    div.append(en, es, ipa);
    frag.appendChild(div);
  });
  cont.appendChild(frag);
}

if(phonBtn){
  phonBtn.addEventListener("click", async ()=>{
    const panel = $("phoneticPanel");
    const on = panel.classList.toggle("on");
    phonBtn.setAttribute("aria-pressed", on ? "true" : "false");
    if(!on) return;
    if(!cmudict){
      $("phonWords").innerHTML = '<span class="phon-note">Cargando diccionario de pronunciaciÃ³nâ€¦</span>';
      try{ await ensureDict(); }
      catch(e){ console.error(e); $("phonWords").innerHTML = '<span class="phon-note err">No se pudo cargar el diccionario. Revisa tu conexiÃ³n.</span>'; return; }
    }
    renderPhonetics();
  });
  $("promptText").addEventListener("input", ()=>{
    clearTimeout(phonDebounce);
    phonDebounce = setTimeout(renderPhonetics, 250);
  });
}

/* ---------------- prÃ¡ctica de palabras (estilo ELSA) ----------------
   Escuchar el modelo (TTS) + grabarte + feedback por fonema. El scoring es una
   aproximaciÃ³n offline: Whisper transcribe lo que dijiste y comparamos su
   pronunciaciÃ³n (vÃ­a cmudict, alineaciÃ³n por fonemas) contra la palabra objetivo.
   Nota honesta: Whisper suele "corregir" al oÃ­do, asÃ­ que un % alto = se entiende;
   un % bajo o una palabra distinta = error de pronunciaciÃ³n claro. */
const wordBtn=$("wordBtn"), wordPanel=$("wordPanel");
const wpChipsEl=$("wpChips"), wpInput=$("wpInput"), wpLoadBtn=$("wpLoadBtn");
const wpCard=$("wpCard"), wpWordEl=$("wpWord"), wpIpaEl=$("wpIpa"), wpEsEl=$("wpEs");
const wpPhonEl=$("wpPhon"), wpListen=$("wpListen"), wpRecBtn=$("wpRec"), wpRecLabel=$("wpRecLabel"), wpResult=$("wpResult");
let wpTarget="", wpTargetPh=null, wpSyllables=[];
let wpImproveWords=[];   // palabras falladas/aproximadas de la Ãºltima evaluaciÃ³n de lectura
let wpEngine="whisper", acousticASR=null;

/* Motor acÃºstico: wav2vec2 SIN modelo de lenguaje (CTC de caracteres). A diferencia de
   Whisper, no "autocorrige" â€” transcribe literalmente lo que suena, asÃ­ que detecta mejor
   una mala pronunciaciÃ³n. Port ONNX oficial, corre en el navegador vÃ­a Transformers.js.
   NOTA para el salto a fonemas reales: reemplaza el model_id por un modelo de fonemas
   convertido a ONNX (p.ej. facebook/wav2vec2-lv-60-espeak-cv-ft exportado con Optimum) y
   mapea su IPA a ARPABET; el resto del pipeline (alineaciÃ³n, chips) ya sirve. */
const ACOUSTIC_MODEL = "Xenova/wav2vec2-base-960h";
async function ensureAcoustic(){
  if(acousticASR) return acousticASR;
  setStatus(`Cargando modelo acÃºstico â€” ${ACOUSTIC_MODEL}`); showBar();
  // PrecisiÃ³n completa (q8 degradaba mucho la calidad de wav2vec2). Como en Palabras el
  // audio es corto (una palabra), no hay problema de memoria. WASM por defecto (estable).
  acousticASR = await pipeline("automatic-speech-recognition", ACOUSTIC_MODEL, {
    progress_callback:(e)=>{ if(e.status==="progress" && e.progress!=null) setBar(e.progress); }
  });
  return acousticASR;
}
let wpStream=null, wpRecorder=null, wpChunks=[], wpRecording=false, wpAutoStop=null;

// Confusiones tÃ­picas ESâ†’EN â†’ tip especÃ­fico cuando se detecta el cambio de fonema.
const WP_CONFUSIONS = [
  { set:["IY","IH"], tip:"Diferencia sheep /iË/ (largo y tenso) de ship /Éª/ (corto y relajado)." },
  { set:["V","B"],   tip:"La V se hace con los dientes sobre el labio inferior; no la vuelvas B." },
  { set:["Z","S"],   tip:"La Z inglesa vibra (zumbido); la S es sorda, sin vibraciÃ³n." },
  { set:["DH","D"],  tip:"En Â«thÂ» de this saca la lengua entre los dientes; no es una D." },
  { set:["TH","T"],  tip:"En Â«thÂ» de think saca la lengua entre los dientes; no es una T." },
  { set:["SH","CH"], tip:"Â«shÂ» es continua (shhh); Â«chÂ» es un golpe seco." },
  { set:["NG","N"],  tip:"Â«ngÂ» resuena en la nariz sin cerrar con una G dura al final." },
  { set:["AE","EH"], tip:"En cat la Â«aÂ» es mÃ¡s abierta que la e; baja la mandÃ­bula." },
];

function wpPhonemes(word){
  if(!cmudict) return null;
  const clean=(word||"").toLowerCase().replace(/[^a-z']/g,"");
  const pron=cmudict[clean];
  return pron ? pron.trim().split(/\s+/) : null;   // conserva dÃ­gitos de acento
}
function stripStress(tok){ return tok.replace(/\d$/,""); }
function isVowelPh(ph){ return PH_VOWELS.has(stripStress(ph||"")); }
function editDistance(a,b){
  const n=a.length,m=b.length,dp=[];
  for(let i=0;i<=n;i++) dp[i]=[i];
  for(let j=0;j<=m;j++) dp[0][j]=j;
  for(let i=1;i<=n;i++) for(let j=1;j<=m;j++){
    const c=a[i-1]===b[j-1]?0:1;
    dp[i][j]=Math.min(dp[i-1][j-1]+c, dp[i-1][j]+1, dp[i][j-1]+1);
  }
  return dp[n][m];
}
// Alinea fonemas objetivo (a) vs reconocidos (b) â†’ operaciones en orden del objetivo.
function alignPh(a,b){
  const n=a.length,m=b.length,dp=[];
  for(let i=0;i<=n;i++) dp[i]=[i];
  for(let j=0;j<=m;j++) dp[0][j]=j;
  for(let i=1;i<=n;i++) for(let j=1;j<=m;j++){
    const c=a[i-1]===b[j-1]?0:1;
    dp[i][j]=Math.min(dp[i-1][j-1]+c, dp[i-1][j]+1, dp[i][j-1]+1);
  }
  let i=n,j=m; const ops=[];
  while(i>0||j>0){
    if(i>0&&j>0 && dp[i][j]===dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1)){ ops.push({t:a[i-1],r:b[j-1],op:a[i-1]===b[j-1]?"match":"sub"}); i--; j--; }
    else if(i>0 && dp[i][j]===dp[i-1][j]+1){ ops.push({t:a[i-1],r:null,op:"del"}); i--; }
    else { ops.push({t:null,r:b[j-1],op:"ins"}); j--; }
  }
  return ops.reverse();
}

// Divide fonemas ARPABET (con dÃ­gitos de acento) en sÃ­labas: una vocal por sÃ­laba,
// con una consonante de "ataque" para la siguiente sÃ­laba (regla de onset mÃ¡ximo simple).
function syllabify(ph){
  const isV = p => PH_VOWELS.has(stripStress(p));
  const V = []; ph.forEach((p,i)=>{ if(isV(p)) V.push(i); });
  if(V.length <= 1) return [ph];
  const bounds = [0];
  for(let k=1;k<V.length;k++){
    const prevV=V[k-1], curV=V[k], nCons=curV-prevV-1;
    bounds.push(nCons<=0 ? curV : curV-1);
  }
  bounds.push(ph.length);
  const syls=[];
  for(let i=0;i<bounds.length-1;i++) syls.push(ph.slice(bounds[i], bounds[i+1]));
  return syls;
}
// Re-deletreo legible (espaÃ±ol-ish) de una sÃ­laba, con acento en la vocal tÃ³nica.
function sylRespell(tokens){
  let out="";
  tokens.forEach((tok,i)=>{
    const st=(tok.match(/(\d)$/)||[])[1]||null, phn=tok.replace(/\d$/,"");
    let es=ARPA_ES[phn]||"";
    if(phn==="G"){ const nxt=tokens[i+1]?tokens[i+1].replace(/\d$/,""):""; if(["IY","IH","EY","EH","AE"].includes(nxt)) es="gu"; }
    if(PH_VOWELS.has(phn) && st==="1") es=es.replace(/[aeiou]/, c=>ACC[c]||c);
    out+=es;
  });
  return out||"Â·";
}
// SilabificaciÃ³n del espaÃ±ol por reglas (el espaÃ±ol es casi fonÃ©mico). Maneja dÃ­grafos
// (ch, ll, rr, qu, gu), diptongos/hiatos y grupos consonÃ¡nticos inseparables (pr, tr, blâ€¦).
function syllabifySpanish(w){
  w=(w||"").toLowerCase();
  const V="aeiouÃ¡Ã©Ã­Ã³ÃºÃ¼Ã Ã¨Ã¬Ã²Ã¹", weak="iuÃ¼", accented="Ã¡Ã©Ã­Ã³Ãº";
  const isV=c=>V.includes(c);
  const toks=[];
  for(let i=0;i<w.length;){
    const c=w[i], c2=w[i+1]||"", c3=w[i+2]||"";
    if(isV(c)){ toks.push({t:'V',s:c,i}); i+=1; continue; }
    if((c==='c'&&c2==='h')||(c==='l'&&c2==='l')||(c==='r'&&c2==='r')){ toks.push({t:'C',s:c+c2,i}); i+=2; continue; }
    if(c==='q'&&c2==='u'){ toks.push({t:'C',s:'qu',i}); i+=2; continue; }
    if(c==='g'&&c2==='u'&&/[eiÃ©Ã­]/.test(c3)){ toks.push({t:'C',s:'gu',i}); i+=2; continue; }
    toks.push({t:'C',s:c,i}); i+=1;
  }
  const nuclei=[]; let i=0;
  while(i<toks.length){
    if(toks[i].t==='V'){
      const group=[toks[i]]; let j=i+1;
      while(j<toks.length && toks[j].t==='V'){
        const a=group[group.length-1].s, b=toks[j].s;
        const aStrong=!weak.includes(a), bStrong=!weak.includes(b);
        const aAcc=accented.includes(a), bAcc=accented.includes(b);
        if((aStrong&&bStrong)||(weak.includes(a)&&aAcc)||(weak.includes(b)&&bAcc)) break;
        group.push(toks[j]); j++;
      }
      nuclei.push({toks:group}); i=j;
    } else i++;
  }
  const insepar=new Set(["pr","br","tr","dr","cr","gr","fr","pl","bl","cl","gl","fl","tl"]);
  const idxOf=tok=>toks.indexOf(tok);
  const syls=[];
  for(let n=0;n<nuclei.length;n++){
    const nuc=nuclei[n];
    const firstTokIdx=idxOf(nuc.toks[0]);
    const lastTokIdx=idxOf(nuc.toks[nuc.toks.length-1]);
    let onsetStart;
    if(n===0) onsetStart=0;
    else {
      const prevLast=idxOf(nuclei[n-1].toks[nuclei[n-1].toks.length-1]);
      const cons=[]; for(let k=prevLast+1;k<firstTokIdx;k++) cons.push(toks[k]);
      const nc=cons.length;
      if(nc===0) onsetStart=firstTokIdx;
      else if(nc===1) onsetStart=firstTokIdx-1;
      else { const lastTwo=cons[nc-2].s+cons[nc-1].s; onsetStart=insepar.has(lastTwo)?(firstTokIdx-2):(firstTokIdx-1); }
    }
    let end;
    if(n===nuclei.length-1) end=toks.length;
    else {
      const nextFirst=idxOf(nuclei[n+1].toks[0]);
      const cons=[]; for(let k=lastTokIdx+1;k<nextFirst;k++) cons.push(toks[k]);
      const nc=cons.length;
      if(nc===0) end=lastTokIdx+1;
      else if(nc===1) end=lastTokIdx+1;
      else { const lastTwo=cons[nc-2].s+cons[nc-1].s; end=insepar.has(lastTwo)?(nextFirst-2):(nextFirst-1); }
    }
    const start=(n===0)?0:onsetStart;
    let str=""; for(let k=start;k<end;k++) str+=toks[k].s;
    const cstart=toks[start]?toks[start].i:0;
    syls.push({str, cstart, cend:cstart+str.length});
  }
  return syls.length ? syls : [{str:w, cstart:0, cend:w.length}];
}
// Bloques silÃ¡bicos (estilo Fluently). Guarda el rango (fonemas en inglÃ©s, letras en
// espaÃ±ol) de cada bloque para poder colorearlo luego segÃºn el anÃ¡lisis.
// SilabificaciÃ³n de respaldo por letras (inglÃ©s) para palabras fuera del diccionario (marcas).
function syllabifyEnglishSpelling(w){
  w=(w||"").toLowerCase().replace(/[^a-z]/g,"");
  const V="aeiouy", isV=c=>V.includes(c);
  const nuclei=[]; let i=0;
  while(i<w.length){ if(isV(w[i])){ let j=i; while(j<w.length&&isV(w[j])) j++; nuclei.push([i,j-1]); i=j; } else i++; }
  if(nuclei.length<=1) return [{str:w,cstart:0,cend:w.length}];
  const insepar=new Set(["pr","br","tr","dr","cr","gr","fr","pl","bl","cl","gl","fl","sp","st","sk","sh","ch","th","wh","ph","sc","sm","sn","sl","sw","tw"]);
  const bounds=[0];
  for(let k=1;k<nuclei.length;k++){
    const prevEnd=nuclei[k-1][1], curStart=nuclei[k][0], nCons=curStart-prevEnd-1;
    let b;
    if(nCons<=0) b=curStart; else if(nCons===1) b=curStart-1;
    else { const lastTwo=w.slice(curStart-2,curStart); b=insepar.has(lastTwo)?curStart-2:curStart-1; }
    bounds.push(b);
  }
  bounds.push(w.length);
  const syls=[];
  for(let k=0;k<bounds.length-1;k++){ const a=bounds[k],e=bounds[k+1]; syls.push({str:w.slice(a,e),cstart:a,cend:e}); }
  return syls;
}

/* ---- boca esquemÃ¡tica (cÃ³mo articular el sonido de la sÃ­laba) ---- */
const PHON_CAT = {
  P:"together",B:"together",M:"together", F:"teethlip",V:"teethlip", TH:"th",DH:"th",
  T:"tip",D:"tip",N:"tip",L:"tip",S:"tip",Z:"tip",
  SH:"neutral",ZH:"neutral",CH:"neutral",JH:"neutral",R:"neutral",Y:"neutral",K:"neutral",G:"neutral",NG:"neutral",HH:"neutral",
  W:"round",UW:"round",UH:"round",OW:"round",AO:"round",OY:"round",AW:"round",
  IY:"spread",IH:"spread",EY:"spread",EH:"spread",
  AE:"open",AA:"open",AH:"open",AY:"open", ER:"neutral"
};
const CAT_CUE = {
  together:"Junta los labios y suÃ©ltalos con un golpe de aire.",
  teethlip:"Apoya los dientes de arriba sobre el labio de abajo y sopla.",
  th:"Saca un poco la lengua entre los dientes y deja salir el aire.",
  round:"Redondea bien los labios, como para silbar.",
  spread:"Estira los labios hacia los lados, como sonriendo.",
  open:"Abre bien la boca y baja la mandÃ­bula.",
  tip:"Punta de la lengua tocando detrÃ¡s de los dientes de arriba.",
  neutral:"Boca relajada, ligeramente abierta."
};
function mouthSVG(cat){
  const cx=80, cy=60, dur="1.5s";
  const anim=(el,attr,vals)=>`<animate attributeName="${attr}" values="${vals}" dur="${dur}" repeatCount="indefinite"/>`;
  const ell=(lrx,lry,crx,cry)=>({
    lips: anim(0,"rx",lrx)+anim(0,"ry",lry),
    cav:  anim(0,"rx",crx)+anim(0,"ry",cry)
  });
  let lipRX=42, lipRY=18, cavRX=36, cavRY=13, lipsAnim="", cavAnim="", teethEl="", tongueEl="", upperTeeth="";
  const tr=(vals)=>`<animateTransform attributeName="transform" type="translate" values="${vals}" dur="${dur}" repeatCount="indefinite"/>`;
  if(cat==="round"){ const a=ell("44;24;44","10;26;10","38;20;38","7;20;7"); lipsAnim=a.lips; cavAnim=a.cav; }
  else if(cat==="spread"){ lipRY=9; cavRY=6; const a=ell("36;56;36","9;9;9","30;50;30","6;6;6"); lipsAnim=a.lips; cavAnim=a.cav; }
  else if(cat==="open"){ const a=ell("42;42;42","7;34;7","36;36;36","5;28;5"); lipsAnim=a.lips; cavAnim=a.cav; teethEl=`<rect x="${cx-34}" y="${cy-20}" width="68" height="9" rx="3" fill="#fff"/>`; }
  else if(cat==="together"){ const a=ell("46;46;46","9;2;9","40;40;40","6;1;6"); lipsAnim=a.lips; cavAnim=a.cav; }
  else if(cat==="neutral"){ const a=ell("42;42;42","12;20;12","36;36;36","9;15;9"); lipsAnim=a.lips; cavAnim=a.cav; teethEl=`<rect x="${cx-32}" y="${cy-14}" width="64" height="8" rx="3" fill="#fff"/>`; }
  else if(cat==="th"){ teethEl=`<rect x="${cx-30}" y="${cy-15}" width="60" height="8" rx="3" fill="#fff"/><rect x="${cx-28}" y="${cy+7}" width="56" height="7" rx="3" fill="#eee"/>`; tongueEl=`<rect x="${cx-16}" y="${cy-4}" width="32" height="12" rx="6" fill="#e8899a">${tr("0 12; 0 -3; 0 12")}</rect>`; }
  else if(cat==="teethlip"){ lipRY=15; cavRY=10; upperTeeth=`<rect x="${cx-26}" y="${cy-6}" width="52" height="10" rx="3" fill="#fff" stroke="#e0e0e0">${tr("0 -11; 0 2; 0 -11")}</rect>`; }
  else if(cat==="tip"){ teethEl=`<rect x="${cx-32}" y="${cy-15}" width="64" height="8" rx="3" fill="#fff"/>`; tongueEl=`<ellipse cx="${cx}" cy="${cy+4}" rx="28" ry="10" fill="#e8899a"/><rect x="${cx-14}" y="${cy-8}" width="28" height="9" rx="4" fill="#e8899a">${tr("0 12; 0 -1; 0 12")}</rect>`; }
  else { const a=ell("42;42;42","12;18;12","36;36;36","9;14;9"); lipsAnim=a.lips; cavAnim=a.cav; }
  const cavity=`<ellipse cx="${cx}" cy="${cy}" rx="${cavRX}" ry="${cavRY}" fill="#3a2230">${cavAnim}</ellipse>`;
  const lips=`<ellipse cx="${cx}" cy="${cy}" rx="${lipRX}" ry="${lipRY}" fill="none" stroke="#c96b7a" stroke-width="7">${lipsAnim}</ellipse>`;
  return `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">${cavity}${teethEl}${tongueEl}${lips}${upperTeeth}</svg>`;
}
let wpMouthIdx = -1;
function keyPhonemeOfSyllable(syl){
  if(!syl || syl.start==null || !wpTargetPh) return null;
  const toks=wpTargetPh.slice(syl.start, syl.end).map(stripStress);
  const hard=["TH","DH","V","Z","SH","ZH","JH","R","NG","W"];
  for(const h of hard){ if(toks.includes(h)) return h; }
  const vowel=toks.find(t=>PH_VOWELS.has(t)); if(vowel) return vowel;
  return toks[0]||null;
}
function letterCategory(s){
  s=(s||"").toLowerCase();
  if(/th/.test(s)) return "th";
  if(/[fv]/.test(s)) return "teethlip";
  if(/^[pbm]/.test(s)) return "together";
  if(/[uo]/.test(s)) return "round";
  if(/i/.test(s)) return "spread";
  if(/a/.test(s)) return "open";
  return "neutral";
}
function showSyllableMouth(idx){
  const syl=wpSyllables[idx]; if(!syl) return;
  const m=$("wpMouth");
  // volver a tocar la misma sÃ­laba oculta la boca
  if(wpMouthIdx===idx && m.style.display!=="none"){
    m.style.display="none"; wpMouthIdx=-1;
    [...wpPhonEl.children].forEach(c=>c.classList.remove("picked"));
    return;
  }
  wpMouthIdx=idx;
  [...wpPhonEl.children].forEach((c,i)=>c.classList.toggle("picked", i===idx));
  let cat, label;
  const kp=keyPhonemeOfSyllable(syl);
  if(kp){ cat=PHON_CAT[kp]||"neutral"; label=ARPA_IPA[kp]||kp.toLowerCase(); }
  else { cat=letterCategory(syl.respell||syl.str||""); label=""; }
  m.innerHTML = mouthSVG(cat)
    + (label?`<div class="mk">/${label}/</div>`:"")
    + `<div class="mc">${CAT_CUE[cat]}</div>`
    + `<button class="mslow" id="wpMouthSlow"><span>ðŸ¢</span> Escuchar Â«${syl.respell||syl.str||wpTarget}Â» lento</button>`;
  m.style.display="flex";
  const b=$("wpMouthSlow"); if(b) b.addEventListener("click", ()=>wpDoListen(0.55));
}

function renderTargetBlocks(){
  wpPhonEl.innerHTML=""; wpSyllables=[]; wpMouthIdx=-1;
  const mm=$("wpMouth"); if(mm) mm.style.display="none";
  const addBlock=(txt)=>{
    const b=document.createElement("div"); b.className="wp-syl"; b.innerHTML=`<span class="txt">${txt}</span>`;
    const idx=wpSyllables.length-1;
    b.addEventListener("click", ()=>showSyllableMouth(idx));
    wpPhonEl.appendChild(b);
  };
  if(state.lang==="spanish" || state.lang==="portuguese"){
    syllabifySpanish(wpTarget).forEach(s=>{ wpSyllables.push({ cstart:s.cstart, cend:s.cend, respell:s.str, letters:true }); addBlock(s.str); });
    return;
  }
  if(wpTargetPh && wpTargetPh.length){
    let idx=0;
    syllabify(wpTargetPh).forEach(g=>{ const start=idx, end=idx+g.length; idx=end; const respell=sylRespell(g); wpSyllables.push({start,end,respell}); addBlock(respell); });
  } else {
    // inglÃ©s fuera del diccionario: silabificaciÃ³n por letras (marcas, nombres propios)
    syllabifyEnglishSpelling(wpTarget).forEach(s=>{ wpSyllables.push({ cstart:s.cstart, cend:s.cend, respell:s.str, letters:true }); addBlock(s.str); });
  }
}
function loadWord(word){
  const shown=(word||"").trim();
  if(!shown) return;
  wpStopRec(); wpStopListen();
  const isEs = state.lang==="spanish" || state.lang==="portuguese";
  wpTarget=shown.toLowerCase().replace(isEs?/[^a-z\p{L}'-]/g:/[^a-z']/g,"");
  wpTargetPh = isEs ? null : wpPhonemes(wpTarget);
  wpCard.style.display="block";
  wpWordEl.textContent=shown;
  if(isEs){
    // en espaÃ±ol la palabra ya es su propia guÃ­a; mostramos la divisiÃ³n silÃ¡bica
    wpIpaEl.textContent = syllabifySpanish(wpTarget).map(s=>s.str).join("Â·");
    wpEsEl.textContent = "";
  } else if(wpTargetPh){
    const f=arpaToForms(wpTargetPh.join(" "));
    wpIpaEl.textContent=f.ipa; wpEsEl.textContent="â‰ˆ "+f.es;
  } else {
    // inglÃ©s fuera del diccionario (marca/nombre): mostramos la divisiÃ³n por letras
    wpIpaEl.textContent = syllabifyEnglishSpelling(wpTarget).map(s=>s.str).join("Â·");
    wpEsEl.textContent = "";
  }
  renderTargetBlocks();
  wpResult.innerHTML="";
  // Recursos externos de pronunciaciÃ³n (nativos reales), Ãºtil sobre todo para palabras
  // que no estÃ¡n en el diccionario, como nombres de marca (p. ej. "revolut").
  const q = encodeURIComponent(wpTarget);
  const yg = state.lang==="spanish" ? "spanish" : state.lang==="portuguese" ? "portuguese" : "english/us";
  const ytq = state.lang==="spanish" ? "cÃ³mo+se+pronuncia+" : state.lang==="portuguese" ? "como+se+pronuncia+" : "how+to+pronounce+";
  $("wpYouglish").href = `https://youglish.com/pronounce/${q}/${yg}`;
  $("wpYoutube").href  = `https://www.youtube.com/results?search_query=${ytq}${q}`;
  [...wpChipsEl.children].forEach(c=>{ if(c.setAttribute) c.setAttribute("aria-pressed",(c.textContent||"").toLowerCase()===wpTarget?"true":"false"); });
}
function buildWpChips(){
  wpChipsEl.innerHTML="";
  const note = $("wpPickNote");

  // Si hubo una evaluaciÃ³n de lectura, muestra solo las palabras a mejorar (top 20).
  if(wpImproveWords && wpImproveWords.length){
    if(note) note.innerHTML = `<b>${wpImproveWords.length}</b> palabras a mejorar de tu Ãºltima lectura Â· <button type="button" class="wp-all-link" id="wpAllLink">ver todas</button>`;
    wpImproveWords.forEach(({word,sev})=>{
      const b=document.createElement("button"); b.className="wp-chip sev"+sev; b.type="button";
      b.setAttribute("aria-pressed", word===wpTarget?"true":"false");
      b.innerHTML = `<span class="dot"></span>${word}`;
      b.addEventListener("click", ()=>loadWord(word));
      wpChipsEl.appendChild(b);
    });
    const allLink = $("wpAllLink");
    if(allLink) allLink.addEventListener("click", ()=>buildWpChipsAll());
    return;
  }
  buildWpChipsAll();
}
// Todas las palabras del texto (respaldo si no hay evaluaciÃ³n de lectura).
function buildWpChipsAll(){
  const seen=new Set(), words=[];
  const clean = state.lang==='spanish' || state.lang==='portuguese' ? /[^a-z\p{L}'-]/g : /[^a-z']/g;
  ($("promptText").value||"").split(/\s+/).forEach(w=>{
    const c=w.toLowerCase().replace(clean,"");
    if(c.length>=2 && !seen.has(c)){ seen.add(c); words.push(c); }
  });
  wpChipsEl.innerHTML="";
  const note = $("wpPickNote");
  if(!words.length){
    if(note) note.textContent="";
    wpChipsEl.innerHTML='<span style="font-size:12px;color:var(--muted)">Escribe texto arriba, o teclea una palabra abajo.</span>';
    return;
  }
  if(note) note.textContent = wpImproveWords.length ? "" : "Todas las palabras del texto. Graba con Â«Comparar lecturaÂ» en On para ver solo las que fallaste.";
  words.slice(0,40).forEach(w=>{
    const b=document.createElement("button"); b.className="wp-chip"; b.type="button";
    b.setAttribute("aria-pressed", w===wpTarget?"true":"false"); b.textContent=w;
    b.addEventListener("click", ()=>loadWord(w));
    wpChipsEl.appendChild(b);
  });
}

/* ---- escuchar el modelo (TTS lento) ---- */
function wpStopListen(){ if(synth) synth.cancel(); wpListen.classList.remove("on"); }
async function wpDoListen(rate=1){
  if(!wpTarget) return;
  const word = wpWordEl.textContent || wpTarget;
  // Voz neural (Kokoro inglÃ©s / MMS espaÃ±ol): garantiza el idioma correcto de la palabra.
  try{
    stopSpeaking();
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended") await audioCtx.resume();
    wpListen.classList.add("on");
    const buf = await neuralBuffer(state.lang, word);
    const src = audioCtx.createBufferSource();
    src.buffer = buf; src.playbackRate.value = rate; src.connect(audioCtx.destination);
    src.onended = ()=> wpListen.classList.remove("on");
    src.start();
    return;
  }catch(e){ console.warn("Voz neural no disponible para la palabra, uso sistema:", e); wpListen.classList.remove("on"); }
  // Respaldo: voz del sistema
  if(!synth) return;
  synth.cancel();
  const u=new SpeechSynthesisUtterance(word);
  u.lang=state.lang==="spanish"?"es-ES":state.lang==="portuguese"?"pt-BR":"en-US";
  const v=pickVoice(state.lang==="spanish"?"es":state.lang==="portuguese"?"pt":"en"); if(v) u.voice=v;
  u.rate = rate<1 ? 0.5 : 0.75;
  synth.speak(u);
}

/* ---- grabar solo la palabra (o subir un audio) ---- */
async function wpStartRec(){
  if(state.recording){ wpResult.innerHTML='<span class="wp-tip err">DetÃ©n la grabaciÃ³n principal primero.</span>'; return; }
  const md=navigator.mediaDevices;
  // El micrÃ³fono exige contexto seguro (https). En el mÃ³vil, si el navegador lo bloquea,
  // usa â€œUpload audioâ€: graba con la app de voz del telÃ©fono y sube el archivo.
  if(!window.isSecureContext || !md || !md.getUserMedia){
    wpResult.innerHTML='<span class="wp-tip err">El micrÃ³fono necesita una pÃ¡gina segura (https). Usa <b>Upload audio</b>: graba con tu telÃ©fono y sube el archivo.</span>'; return;
  }
  try{ wpStream=await md.getUserMedia({audio:true}); }
  catch(e){
    let msg="No se pudo abrir el micrÃ³fono. Usa <b>Upload audio</b> en su lugar.";
    if(e && (e.name==="NotAllowedError" || e.name==="SecurityError"))
      msg="Permiso de micrÃ³fono denegado. ActÃ­valo en los ajustes del sitio, o usa <b>Upload audio</b>.";
    else if(e && e.name==="NotFoundError")
      msg="No se encontrÃ³ micrÃ³fono en este dispositivo. Usa <b>Upload audio</b>.";
    wpResult.innerHTML='<span class="wp-tip err">'+msg+'</span>'; return;
  }
  wpChunks=[]; wpRecorder=new MediaRecorder(wpStream);
  wpRecorder.ondataavailable=e=>{ if(e.data.size) wpChunks.push(e.data); };
  wpRecorder.onstop=async ()=>{
    try{ wpStream.getTracks().forEach(t=>t.stop()); }catch(e){}
    const blob=new Blob(wpChunks,{type:wpRecorder.mimeType||"audio/webm"});
    await wpScore(blob);
  };
  wpRecorder.start(); wpRecording=true;
  wpRecBtn.classList.add("on"); wpRecLabel.textContent="Stop";
  wpResult.innerHTML='<span class="wp-scoring">Escuchandoâ€¦ di la palabra.</span>';
  clearTimeout(wpAutoStop); wpAutoStop=setTimeout(()=>{ if(wpRecording) wpStopRec(); }, 4000);
}
function wpStopRec(){
  if(!wpRecording) return;
  wpRecording=false; clearTimeout(wpAutoStop);
  wpRecBtn.classList.remove("on"); wpRecLabel.textContent="Record";
  try{ wpRecorder.stop(); }catch(e){}
}
async function wpScore(blob){
  wpResult.innerHTML='<span class="wp-scoring">Analizandoâ€¦</span>';
  try{
    const { audio }=await decodeTo16k(blob);
    if(!audio || audio.length<1200){ wpResult.innerHTML='<span class="wp-tip">Muy corto. Di la palabra completa y vuelve a intentarlo.</span>'; return; }
    let heard;
    if(wpEngine==="acoustic"){
      const asr=await ensureAcoustic();
      const out=await asr(audio);              // CTC literal, sin modelo de lenguaje
      heard=(out.text||"").trim();
    } else {
      const asr=await getASR();
      const opts={ chunk_length_s:30 };
      if(state.lang!=="english"){ opts.language=state.lang; opts.task="transcribe"; }
      const out=await asr(audio, opts);
      heard=(out.text||"").trim();
    }
    hideBar(); setStatus("Listo â€” palabra analizada.");
    if(!heard || !/[a-z']/i.test(heard)){
      wpResult.innerHTML = '<span class="wp-tip">No se captÃ³ la palabra. '
        + (wpEngine==="acoustic"
            ? 'El motor acÃºstico a veces no la detecta â€” prueba Â«WhisperÂ» en Setup, o repite mÃ¡s cerca del micrÃ³fono.'
            : 'Repite mÃ¡s claro y cerca del micrÃ³fono.')
        + '</span>';
      return;
    }
    renderWordScore(heard, wpEngine);
  }catch(e){
    console.error(e); hideBar();
    wpResult.innerHTML='<span class="wp-tip err">No se pudo analizar: '+((e&&e.message)||e)+'</span>';
  }
}
function renderWordScore(heard, engine){
  const isEs = state.lang==="spanish" || state.lang==="portuguese";
  const wordRe = isEs ? /[a-zÃ¡Ã©Ã­Ã³ÃºÃ¼Ã±']+/g : /[a-z']+/g;
  const tokens=(heard.toLowerCase().match(wordRe))||[];
  let recog=tokens[0]||"";
  if(tokens.length>1 && wpTarget){
    let best=Infinity;
    for(const t of tokens){ const d=editDistance([...t],[...wpTarget]); if(d<best){ best=d; recog=t; } }
  }
  const blocks=[...wpPhonEl.children];
  blocks.forEach(c=>c.classList.remove("ok","near","bad"));

  const SEV={ok:0, near:1, bad:2};
  let score=0, tip="", extraTip="", suggestion="";
  const deAccent = s => s.replace(/[Ã¡Ã Ã¤]/g,"a").replace(/[Ã©Ã¨Ã«]/g,"e").replace(/[Ã­Ã¬Ã¯]/g,"i").replace(/[Ã³Ã²Ã¶]/g,"o").replace(/[ÃºÃ¹Ã¼]/g,"u");

  if(wpSyllables.length && wpSyllables[0] && wpSyllables[0].letters){
    // comparaciÃ³n por LETRAS (espaÃ±ol, o inglÃ©s fuera del diccionario), coloreando
    // cada sÃ­laba por el rango de letras que contiene (ignora tildes).
    const tChars=[...deAccent(wpTarget)], rChars=[...deAccent(recog)];
    const ops=alignPh(tChars, rChars);
    const status=new Array(tChars.length).fill("ok");
    let ti=0, matches=0, ins=0, worstI=-1, worstSev=-1;
    ops.forEach(o=>{
      if(o.op==="ins"){ ins++; return; }
      const i=ti++; let st;
      if(o.op==="match"){ st="ok"; matches++; }
      else if(o.op==="del"){ st="bad"; }
      else st="near";
      status[i]=st;
      if(SEV[st]>worstSev){ worstSev=SEV[st]; worstI=i; }
    });
    score=Math.round(100*matches/Math.max(1,tChars.length));
    score=Math.max(0, score-Math.min(20, ins*8));
    wpSyllables.forEach((syl,si)=>{
      let s="ok";
      for(let i=syl.cstart;i<syl.cend;i++) if(status[i] && SEV[status[i]]>SEV[s]) s=status[i];
      if(blocks[si]) blocks[si].classList.add(s);
    });
    if(worstSev>0){
      const syl=wpSyllables.find(sy=>worstI>=sy.cstart && worstI<sy.cend);
      suggestion=`FÃ­jate en la sÃ­laba <b>Â«${syl?syl.respell:wpTarget}Â»</b>.`;
    }
  } else if(wpSyllables.length && wpSyllables[0] && wpSyllables[0].start!=null){
    const targetClean=(wpTargetPh||[]).map(stripStress);
    const recogPh=wpPhonemes(recog);
    if(targetClean.length && recogPh && wpSyllables.length){
      const recogClean=recogPh.map(stripStress);
      const ops=alignPh(targetClean, recogClean);
      const status=new Array(targetClean.length).fill("ok");   // estado por fonema del objetivo
      let ti=0, matches=0, ins=0, worst={sev:-1,i:-1,t:null,r:null};
      ops.forEach(o=>{
        if(o.op==="ins"){ ins++; return; }
        const i=ti++; let st;
        if(o.op==="match"){ st="ok"; matches++; }
        else if(o.op==="del"){ st="bad"; }
        else { const vowelMix=isVowelPh(o.t)!==isVowelPh(o.r); st=vowelMix?"bad":"near";
               if(!extraTip){ const c=WP_CONFUSIONS.find(x=>x.set.includes(o.t)&&x.set.includes(o.r)); if(c) extraTip=c.tip; } }
        status[i]=st;
        if(SEV[st]>worst.sev) worst={sev:SEV[st], i, t:o.t, r:o.r};
      });
      score=Math.round(100*matches/Math.max(1,targetClean.length));
      score=Math.max(0, score-Math.min(20, ins*8));
      wpSyllables.forEach((syl,si)=>{
        if(syl.fallback) return;
        let s="ok";
        for(let i=syl.start;i<syl.end;i++) if(SEV[status[i]]>SEV[s]) s=status[i];
        if(blocks[si]) blocks[si].classList.add(s);
      });
      if(worst.sev>0){
        const syl=wpSyllables.find(sy=>!sy.fallback && worst.i>=sy.start && worst.i<sy.end);
        const ipaSym=ARPA_IPA[worst.t]||worst.t.toLowerCase();
        suggestion=`Mejora el sonido <b>/${ipaSym}/</b>${syl?` en Â«${syl.respell}Â»`:""}.`;
      }
    } else if(wpTarget){
      const d=editDistance([...recog],[...wpTarget]);
      score=Math.round(100*(1-d/Math.max(recog.length,wpTarget.length,1)));
      blocks.forEach(c=>c.classList.add(score>=85?"ok":score>=60?"near":"bad"));
    }
  }

  const color=score>=85?getCSS("--pos"):score>=60?getCSS("--neu"):getCSS("--neg");
  if(score>=90) tip="Â¡Muy claro! ðŸ‘Œ";
  else if(score>=70) tip="Bien, casi lo tienes.";
  else if(recog && recog!==wpTarget) tip=`Se entendiÃ³ Â«${recog}Â». Escucha a nativos abajo y repite despacio.`;
  else tip="Sigue practicando: escucha el modelo y repite despacio.";

  const heardLbl = engine==="acoustic" ? "SonÃ³ como" : "Reconocido";
  wpResult.innerHTML=
    `<div class="wp-score" style="color:${color}">${score}%</div>`+
    (recog?`<div class="wp-heard">${heardLbl}: â€œ${recog}â€${recog===wpTarget?" âœ“":""}</div>`:"")+
    (suggestion?`<div class="wp-suggest">${suggestion}</div>`:"")+
    `<span class="wp-tip">${tip}</span>`+
    (extraTip?`<span class="wp-tip">ðŸ’¡ ${extraTip}</span>`:"");
}

async function ensureDictThen(cb){
  if(state.lang==="spanish" || state.lang==="portuguese" || cmudict){ cb(); return; }   // espaÃ±ol/portuguÃ©s no usan el diccionario inglÃ©s
  wpChipsEl.innerHTML='<span style="font-size:12px;color:var(--muted)">Cargando diccionario de pronunciaciÃ³nâ€¦</span>';
  try{ await ensureDict(); cb(); }
  catch(e){ console.error(e); wpChipsEl.innerHTML='<span style="font-size:12px;color:var(--neg)">No se pudo cargar el diccionario. Revisa tu conexiÃ³n.</span>'; }
}

if(wordBtn){
  function updateWpLangUI(){
    if(wpInput) wpInput.placeholder = state.lang==="spanish"
      ? "...o escribe cualquier palabra en espaÃ±ol"
      : state.lang==="portuguese"
      ? "...ou escreva qualquer palavra em portuguÃªs"
      : "...or type any word in English";
  }
  updateWpLangUI();
  wordBtn.addEventListener("click", ()=>{
    const on=wordPanel.classList.toggle("on");
    wordBtn.setAttribute("aria-pressed", on?"true":"false");
    updateWpLangUI();
    if(on) ensureDictThen(buildWpChips);
    else { wpStopRec(); wpStopListen(); }
  });
  // al cambiar de idioma, refresca el modo Palabras (placeholder, chips y palabra actual)
  $("langSeg").querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", ()=>{
      updateWpLangUI();
      wpImproveWords = [];
      if(wordPanel.classList.contains("on")){
        const reload = wpTarget;
        ensureDictThen(()=>{ buildWpChips(); if(reload) loadWord(reload); });
      }
    });
  });
  wpLoadBtn.addEventListener("click", ()=>{ const v=wpInput.value.trim(); if(v) ensureDictThen(()=>loadWord(v)); });
  wpInput.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); wpLoadBtn.click(); } });
  wpListen.addEventListener("click", ()=>wpDoListen(1));
  const wpListenSlow=$("wpListenSlow"); if(wpListenSlow) wpListenSlow.addEventListener("click", ()=>wpDoListen(0.55));
  if(!synth){ wpListen.disabled=true; wpListen.title="Tu navegador no soporta sÃ­ntesis de voz."; }
  wpRecBtn.addEventListener("click", ()=>{ wpRecording ? wpStopRec() : wpStartRec(); });
  const wpFileInput = $("wpFileInput");
  if(wpFileInput) wpFileInput.addEventListener("change", async (e)=>{
    const f = e.target.files[0];
    if(f){ if(wpRecording) wpStopRec(); await wpScore(f); }   // sube un audio grabado con el telÃ©fono
    e.target.value = "";
  });
  const wpEngineSel = $("wpEngineSel"), wpEngineMid = $("wpEngineMid");
  function updateEngineMid(){
    wpEngineMid.textContent = wpEngine==="acoustic" ? ACOUSTIC_MODEL : `Xenova/whisper-${state.size}`;
  }
  updateEngineMid();
  wpEngineSel.addEventListener("change", ()=>{ wpEngine = wpEngineSel.value; updateEngineMid(); });
  $("promptText").addEventListener("input", ()=>{
    wpImproveWords = [];   // el texto cambiÃ³: la lista de "a mejorar" ya no aplica
    if(wordPanel.classList.contains("on")){ clearTimeout(window.__wpDeb); window.__wpDeb=setTimeout(buildWpChips,300); }
  });
}

/* ---------------- status helpers ---------------- */
function setStatus(msg, isErr=false){ statusEl.innerHTML = msg; statusEl.classList.toggle("err", isErr); }
function showBar(busy=true){ bar.style.display="block"; bar.classList.toggle("busy",busy); }
function setBar(p){ barFill.style.width = Math.max(0,Math.min(100,p))+"%"; }
function hideBar(){ bar.style.display="none"; setBar(0); }

/* ---------------- model loading ---------------- */
async function getASR(){
  const model = `Xenova/whisper-${state.size}${state.lang==="english" ? ".en" : ""}`;
  const key = model;
  if (state.asr && state.asrKey === key) return state.asr;
  if (state._asrPromise && state._asrPromiseKey === key) return state._asrPromise;  // ya se estÃ¡ cargando
  state._asrPromiseKey = key;
  state._asrPromise = (async ()=>{
    setMS("whisper","loading");
    setStatus(`Loading speech model â€” ${model}`); showBar();
    const seen = {};
    try{
      const asr = await pipeline("automatic-speech-recognition", model, {
        dtype: "q8",
        progress_callback: (e)=>{
          if(e.status==="progress" && e.file){
            seen[e.file] = e.progress || 0;
            const vals = Object.values(seen);
            const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
            setBar(avg);
            setStatus(`Downloading speech model â€” ${Math.round(avg)}%`);
          }
        }
      });
      state.asr = asr; state.asrKey = key; setMS("whisper","ready");
      return asr;
    }catch(e){ setMS("whisper","error"); state._asrPromise=null; throw e; }
  })();
  return state._asrPromise;
}

/* ---------------- transcripciÃ³n en segundo plano (Web Worker) ----------------
   Whisper en WASM bloquea el hilo principal â†’ la interfaz se congela. Movemos la
   transcripciÃ³n del anÃ¡lisis a un worker (creado desde un Blob, sin archivo aparte).
   Si el worker falla por cualquier motivo, cae al hilo principal (funciona, aunque
   congele). El audio se envÃ­a por copia â€” asÃ­ el buffer sigue disponible para el fallback. */
const ASR_WORKER_SRC = `
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
let _asrWorker=null; const _asrJobs=new Map(); let _asrJobSeq=0;
function getASRWorker(){
  if(_asrWorker) return _asrWorker;
  const url = URL.createObjectURL(new Blob([ASR_WORKER_SRC], {type:"text/javascript"}));
  const w = new Worker(url, {type:"module"});
  w.onmessage = (e)=>{
    const d=e.data, job=_asrJobs.get(d.id); if(!job) return;
    if(d.type==="progress"){ job.onProgress && job.onProgress(d.progress); }
    else if(d.type==="loaded"){ job.onLoaded && job.onLoaded(); }
    else if(d.type==="result"){ _asrJobs.delete(d.id); job.resolve(d.out); }
    else if(d.type==="error"){ _asrJobs.delete(d.id); job.reject(new Error(d.error)); }
  };
  w.onerror = ()=>{                        // el worker muriÃ³: rechaza lo pendiente â†’ fallback
    const err=new Error("asr worker crashed");
    for(const [,job] of _asrJobs) job.reject(err);
    _asrJobs.clear();
    try{ w.terminate(); }catch(_){}
    _asrWorker=null;
  };
  _asrWorker=w;
  return w;
}
function transcribeInWorker(model, audio, opts, onProgress, onLoaded){
  return new Promise((resolve,reject)=>{
    let w; try{ w=getASRWorker(); }catch(e){ reject(e); return; }
    const id=++_asrJobSeq;
    _asrJobs.set(id,{resolve,reject,onProgress,onLoaded});
    w.postMessage({ id, model, audio, opts });   // copia (sin transferir): buffer sigue vivo
  });
}
// Transcribe en el worker; ante cualquier fallo, usa el hilo principal.
async function transcribeAudio(audio, opts, onProgress){
  const model = `Xenova/whisper-${state.size}${state.lang==="english" ? ".en" : ""}`;
  try{
    setMS("whisper","loading");
    const out = await transcribeInWorker(model, audio, opts, onProgress, ()=>setMS("whisper","ready"));
    setMS("whisper","ready");
    return out;
  }catch(e){
    console.warn("Worker de transcripciÃ³n fallÃ³, uso el hilo principal:", e);
    const asr = await getASR();
    return await asr(audio, opts);
  }
}

async function getSentiment(){
  if (state.sentiment) return state.sentiment;
  if (state._sentPromise) return state._sentPromise;
  const model = "Xenova/distilbert-base-multilingual-cased-sentiments-student";
  state._sentPromise = (async ()=>{
    setMS("sentiment","loading");
    setStatus(`Loading sentiment model â€” ${model}`); showBar();
    try{
      const sent = await pipeline("text-classification", model, {
        progress_callback:(e)=>{ if(e.status==="progress" && e.progress!=null){ setBar(e.progress); } }
      });
      state.sentiment = sent; setMS("sentiment","ready");
      return sent;
    }catch(e){ setMS("sentiment","error"); state._sentPromise=null; throw e; }
  })();
  return state._sentPromise;
}

/* ---------------- precarga de modelos en background con indicador de estado ---------------- */
let modelsReady=false, _warmupRunning=false, _warmupPending=false, _warmupKey=null;
function setModelBadge(st, text){
  const el=$("modelBadge"); if(!el) return;
  el.dataset.state=st; const t=$("modelBadgeText"); if(t) t.textContent=text;
}
/* ---- estado de cada modelo + panel con recarga ---- */
const MODELS = {
  whisper:{ label:"Reconocimiento (Whisper)", state:"idle" },
  sentiment:{ label:"AnÃ¡lisis de sentimiento", state:"idle" },
  voiceEn:{ label:"Voz natural Â· inglÃ©s (Kokoro)", state:"idle" },
  voiceEs:{ label:"Voz natural Â· espaÃ±ol (MMS)", state:"idle" },
  voicePt:{ label:"Voz natural - portugues (MMS)", state:"idle" },
};
const MS_LABEL={ idle:"No cargado", loading:"Cargandoâ€¦", ready:"Listo âœ“", error:"Error" };
function setMS(key, st){ if(MODELS[key]){ MODELS[key].state=st; updateBadge(); renderModelsPanel(true); } }
function updateBadge(){
  const ess=[MODELS.whisper.state]; if(state.doSentiment) ess.push(MODELS.sentiment.state);
  if(ess.includes("error")) setModelBadge("error","Modelos: revisar â–¸");
  else if(ess.every(s=>s==="ready")) setModelBadge("ready","Modelos: listos âœ“");
  else if(ess.includes("loading")) setModelBadge("loading","Modelos: cargandoâ€¦");
  else setModelBadge("idle","Modelos: en espera");
}
function renderModelsPanel(onlyIfOpen){
  const panel=$("modelsPanel"); if(!panel) return;
  if(onlyIfOpen && panel.style.display==="none") return;
  const rows=Object.entries(MODELS).map(([k,m])=>`
    <div class="ms-row">
      <span class="ms-dot ${m.state}"></span>
      <span class="ms-name">${m.label}</span>
      <span class="ms-state ${m.state}">${MS_LABEL[m.state]||m.state}</span>
      <button class="ms-reload" data-k="${k}" title="Recargar">â†»</button>
    </div>`).join("");
  const el=panel.querySelector(".ms-list"); if(el) el.innerHTML=rows;
}
async function reloadModel(key){
  setMS(key,"idle");
  try{
    if(key==="whisper"){ state.asr=null; state.asrKey=null; state._asrPromise=null; await getASR(); }
    else if(key==="sentiment"){ state.sentiment=null; state._sentPromise=null; await getSentiment(); }
    else if(key==="voiceEn"){ kokoroTTS=null; kokoroForceWasm=false; [...neuralCache.keys()].forEach(k=>{ if(!k.startsWith("spanish|") && !k.startsWith("portuguese|")) neuralCache.delete(k); }); await ensureKokoro(); }
    else if(key==="voiceEs"){ mmsTTS=null; [...neuralCache.keys()].forEach(k=>{ if(k.startsWith("spanish|")) neuralCache.delete(k); }); await ensureMMS(); }
    else if(key==="voicePt"){ mmsPtTTS=null; [...neuralCache.keys()].forEach(k=>{ if(k.startsWith("portuguese|")) neuralCache.delete(k); }); await ensureMMSPt(); }
  }catch(e){ console.error("reload "+key, e); setMS(key,"error"); }
}
if($("modelBadge")){
  $("modelBadge").addEventListener("click", ()=>{
    const p=$("modelsPanel"); if(!p) return;
    if(p.style.display!=="none"){ p.style.display="none"; return; }
    renderModelsPanel(false); p.style.display="block";
  });
}
if($("modelsPanel")){
  $("modelsPanel").addEventListener("click", (e)=>{
    const b=e.target.closest(".ms-reload"); if(b){ reloadModel(b.dataset.k); return; }
    if(e.target.closest(".ms-close")){ $("modelsPanel").style.display="none"; }
  });
}
async function warmupModels(){
  const key=`${state.lang}|${state.size}|${state.doSentiment?1:0}`;
  if(!(modelsReady && _warmupKey===key)){
    if(_warmupRunning){ _warmupPending=true; }
    else {
      _warmupRunning=true; _warmupKey=key; modelsReady=false;
      try{
        await getASR();                                  // esencial: reconocimiento
        if(state.doSentiment) await getSentiment();       // esencial: anÃ¡lisis (si estÃ¡ On)
        const nowKey=`${state.lang}|${state.size}|${state.doSentiment?1:0}`;
        if(nowKey!==key){ _warmupRunning=false; return warmupModels(); }
        modelsReady=true;
        if(!state.recording){ hideBar(); setStatus("Listo para grabar."); }
      }catch(e){ console.error(e); }
      finally{ _warmupRunning=false; if(_warmupPending){ _warmupPending=false; warmupModels(); } }
    }
  }
  warmVoice();   // la voz natural carga aparte, sin bloquear el badge de "listos"
}
let _voiceLoading=false;
async function warmVoice(){
  /* Desactivado a propÃ³sito: la voz natural se compila en el hilo principal y eso congela
     la pantalla unos segundos. Para no hacerlo sin avisar, ahora se prepara SOLO cuando el
     usuario toca el botÃ³n "âš¡ Preparar voz". */
}

/* ---------------- audio decode + resample to 16k mono ---------------- */
async function decodeTo16k(blob){
  const arrayBuf = await blob.arrayBuffer();
  const tmp = new (window.AudioContext||window.webkitAudioContext)();
  const decoded = await tmp.decodeAudioData(arrayBuf);
  tmp.close();
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration*16000)), 16000);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  const audio = rendered.getChannelData(0);
  // normaliza el volumen: si grabaste bajito, Whisper transcribe mucho mejor.
  let peak=0; for(let i=0;i<audio.length;i++){ const a=Math.abs(audio[i]); if(a>peak) peak=a; }
  if(peak>0.0015 && peak<0.75){ const g=Math.min(10, 0.95/peak); for(let i=0;i<audio.length;i++) audio[i]*=g; }
  return { audio, duration: decoded.duration };
}

/* ---------------- recording ---------------- */
recBtn.addEventListener("click", async ()=>{
  if(state.recording){ stopRecording(); return; }
  const md = navigator.mediaDevices;
  const es = state.lang==="spanish";
  // El micrÃ³fono exige contexto seguro (https/localhost). Al abrir el archivo descargado
  // (content:// o file://), Android Chrome bloquea el micro y NO se puede habilitar en ajustes.
  const localFileMsg = es
    ? "El micrÃ³fono estÃ¡ bloqueado porque abriste el archivo desde Descargas. Para grabar con el micro, abre la pÃ¡gina por https (sÃºbela gratis a Netlify Drop o GitHub Pages) o usa Â«Subir audioÂ»."
    : "The mic is blocked because you opened the file from Downloads. To record, open the page over https (host it free on Netlify Drop or GitHub Pages), or use â€œUpload audioâ€.";
  const looksLocal = !window.isSecureContext || location.protocol==="content:" || location.protocol==="file:";
  if(looksLocal || !md || !md.getUserMedia){
    setStatus(localFileMsg, true);
    return;
  }
  try{
    state.stream = await md.getUserMedia({audio:true});
  }catch(err){
    let msg = es ? "No se pudo abrir el micrÃ³fono. Usa Â«Subir audioÂ»." : "Could not start the microphone. Use â€œUpload audioâ€ instead.";
    if(err && (err.name==="NotAllowedError" || err.name==="SecurityError"))
      msg = localFileMsg;   // en content:// no hay ajustes de sitio para permitirlo
    else if(err && err.name==="NotFoundError")
      msg = es ? "No se encontrÃ³ micrÃ³fono en este dispositivo. Usa Â«Subir audioÂ»." : "No microphone was found on this device. Use â€œUpload audioâ€ instead.";
    setStatus(msg, true);
    return;
  }
  state.chunks = [];
  state.mediaRecorder = new MediaRecorder(state.stream);
  state.mediaRecorder.ondataavailable = (e)=>{ if(e.data.size) state.chunks.push(e.data); };
  state.mediaRecorder.onstop = async ()=>{
    state.stream.getTracks().forEach(t=>t.stop());
    const blob = new Blob(state.chunks, {type: state.mediaRecorder.mimeType || "audio/webm"});
    await analyze(blob);
  };
  state.mediaRecorder.start();
  state.recording = true;
  recBtn.classList.add("recording");
  recLabel.textContent = "Stop";
  timerEl.style.display="inline";
  state.startedAt = Date.now();
  state.timerId = setInterval(()=>{
    const s = Math.floor((Date.now()-state.startedAt)/1000);
    timerEl.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  }, 250);
  setStatus("Recordingâ€¦ speak your answer, then press Stop.");
});

function stopRecording(){
  state.recording = false;
  clearInterval(state.timerId);
  recBtn.classList.remove("recording");
  recLabel.textContent = "Record";
  timerEl.style.display="none";
  try{ state.mediaRecorder.stop(); }catch(e){}
}

fileInput.addEventListener("change", async (e)=>{
  const f = e.target.files[0];
  fileInput.value = "";
  if(!f) return;
  if(/^(image|video)\//.test(f.type||"")){
    const msg = state.lang==="spanish"
      ? "Eso es una imagen o un video, no audio. Elige tu grabaciÃ³n (por ej. un archivo de la carpeta Recordings)."
      : "That's an image or video, not audio. Pick your recording (e.g. a file in the Recordings folder).";
    setStatus(msg, true);
    return;
  }
  await analyze(f);
});

/* ---------------- core analysis ---------------- */
function setBusy(disabled){ recBtn.disabled = disabled; }

// Transcribe audio largo por segmentos, con progreso real (parte i/N). Cada segmento usa
// el troceado interno de Whisper (30 s + solape) para buena calidad; solo hay una uniÃ³n
// cada ~2 min. Devuelve { text, chunks } con los timestamps ya desplazados al tiempo global.
async function transcribeLong(audio, sr, opts, onSeg){
  const segLen = 120 * sr;                       // ~2 min por segmento
  const n = Math.ceil(audio.length / segLen);
  let fullText = "", chunks = [];
  for(let i=0;i<n;i++){
    const start = i*segLen;
    const slice = audio.slice(start, Math.min(audio.length, start+segLen));
    const segOut = await transcribeAudio(slice, opts);
    const segText = (segOut.text || "").trim();
    if(segText) fullText += (fullText ? " " : "") + segText;
    const offset = start / sr;                    // desplaza timestamps al tiempo global
    if(segOut.chunks){
      for(const c of segOut.chunks){
        const ts = Array.isArray(c.timestamp)
          ? [ (c.timestamp[0]??0)+offset, (c.timestamp[1]??0)+offset ]
          : c.timestamp;
        chunks.push({ text:c.text, timestamp:ts });
      }
    }
    if(onSeg) onSeg((i+1)/n, i+1, n);
  }
  return { text: fullText, chunks };
}

async function analyze(blob){
  setBusy(true);
  try{
    setStatus("Decoding audioâ€¦"); showBar(false); setBar(8);
    const { audio, duration } = await decodeTo16k(blob);
    if(audio.length < 1600){ setStatus("That clip was too short to analyze. Try a few seconds of speech.", true); hideBar(); setBusy(false); return; }

    // La transcripciÃ³n principal siempre usa Whisper: es fiable en habla larga y con acento.
    // El motor acÃºstico (wav2vec2) se reserva para el modo Palabras, donde el audio es corto.
    setStatus("Transcribingâ€¦"); showBar(); setBar(20);
    const asrOpts = {
      chunk_length_s: 30, stride_length_s: 5,
      no_repeat_ngram_size: 3,                         // corta los loops de repeticiÃ³n de Whisper
      return_timestamps: "word"                        // cobertura completa del audio + resaltado por palabra
    };
    if(state.lang!=="english"){ asrOpts.language = state.lang; asrOpts.task = "transcribe"; }

    const isEs = state.lang==="spanish";
    const longAudio = duration > 180;                  // > 3 min â†’ por segmentos con progreso real
    const t0 = Date.now();
    const mmss = (s)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
    let segInfo = "";
    // latido: muestra el tiempo transcurrido (y la parte) cada segundo, para que se vea que avanza
    const heartbeat = setInterval(()=>{
      const el = mmss((Date.now()-t0)/1000);
      setStatus((isEs?"Transcribiendo":"Transcribing") + (segInfo?` Â· ${segInfo}`:"") + ` Â· ${el}`);
    }, 1000);
    const onSeg = (frac,i,nSeg)=>{ setBar(20 + frac*45); segInfo = isEs?`parte ${i}/${nSeg}`:`part ${i}/${nSeg}`; };
    const onDl  = (p)=>{ if(p!=null) setBar(Math.min(60, 20 + p*0.4)); };
    if(longAudio) setStatus((isEs?"Audio largo":"Long audio")+` (${mmss(duration)}) â€” ${isEs?"transcribiendo por partes; puede tardar unos minutos":"transcribing in parts; this can take a few minutes"}â€¦`);

    const run = (o)=> longAudio ? transcribeLong(audio, 16000, o, onSeg) : transcribeAudio(audio, o, onDl);
    let out;
    try{
      out = await run(asrOpts);
    }
    catch(e){ // si el modelo no soporta timestamps de palabra, reintenta sin ellos
      console.warn("Timestamps por palabra no disponibles, reintentando:", e);
      delete asrOpts.return_timestamps;
      out = await run(asrOpts);
    }
    finally{ clearInterval(heartbeat); }
    const timedWords = extractTimedWords(out);
    let text = (out.text || "").trim();
    // quita artefactos de Whisper (no son habla) que ensucian el transcript y la comparaciÃ³n
    text = text.replace(/\((?:speaking[^)]*|inaudible|music|applause|foreign[^)]*|silence|no audio)\)/gi,"")
               .replace(/\[[^\]]{0,40}\]/g,"")
               .replace(/\s{2,}/g," ").trim();
    if(!text){ setStatus("No speech was detected in that audio.", true); hideBar(); setBusy(false); return; }

    const sentences = splitSentences(text);
    let scored;
    if(state.doSentiment){
      const classifier = await getSentiment();
      setStatus("Scoring sentimentâ€¦"); setBar(70);
      scored = [];
      for(const s of sentences){
        const r = await classifier(s, { top_k: 3 });
        scored.push({ text:s, positivity: sentimentPositivity(r) });
      }
    } else {
      setStatus("Finishingâ€¦"); setBar(80);
      scored = sentences.map(s=>({ text:s, positivity:null }));
    }
    setBar(100);

    render({ text, sentences:scored, duration, sentiment: state.doSentiment, timedWords,
             compareRead: state.compareRead, promptTarget: $("promptText").value });
    setStatus(`Done â€” analyzed ${duration.toFixed(1)}s of audio.`);
    hideBar();
  }catch(err){
    console.error(err);
    const decodeFail = /decode|EncodingError|Unable to decode|decodeAudioData/i.test((err&&err.message)||"") || (err&&err.name==="EncodingError");
    if(decodeFail){
      setStatus(state.lang==="spanish"
        ? "No pude leer ese archivo de audio. Prueba con un .m4a, .mp3, .wav o .ogg (por ej. tu grabaciÃ³n en la carpeta Recordings)."
        : "I couldn't read that audio file. Try a .m4a, .mp3, .wav or .ogg (e.g. your recording in the Recordings folder).", true);
    } else {
      setStatus(`Something went wrong: ${err.message}. If this is the first run, check your connection â€” the models download once.`, true);
    }
    hideBar();
  }finally{
    setBusy(false);
  }
}

/* Modelo de 3 clases: positive/neutral/negative â†’ positividad 0..1 (valor esperado). */
function sentimentPositivity(result){
  const arr = Array.isArray(result) ? result : [result];
  let pos=0, neu=0, neg=0;
  for(const r of arr){
    const l=(r.label||"").toLowerCase();
    if(l.startsWith("pos")) pos=r.score;
    else if(l.startsWith("neu")) neu=r.score;
    else if(l.startsWith("neg")) neg=r.score;
  }
  const tot = pos+neu+neg;
  if(tot<=0) return 0.5;
  return (pos*1 + neu*0.5 + neg*0)/tot;
}

function splitSentences(text){
  const parts = text.match(/[^.!?]+[.!?]*/g) || [text];
  return parts.map(s=>s.trim()).filter(s=>s.length);
}

/* ---------------- delivery metrics ---------------- */
const FILLERS = {
  english: ["um","uh","uhh","umm","er","ah","hmm","like","basically","actually","literally","you know","i mean","kind of","sort of"],
  spanish: ["este","eh","em","mmm","o sea","pues","bueno","digamos","tipo","verdad","no sÃ©"],
  portuguese: ["Ã©","hum","eh","mmm","tipo","nÃ©","entÃ£o","quer dizer","assim","olha","vejam","bom"],
};
function countFillers(text, lang){
  const lower = " " + text.toLowerCase().replace(/[.,!?;:]/g," ") + " ";
  let total=0; const hits={};
  for(const f of FILLERS[lang]||FILLERS.english){
    const re = new RegExp("(^|\\s)"+f.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?=\\s)","g");
    const n = (lower.match(re)||[]).length;
    if(n){ total+=n; hits[f]=n; }
  }
  return { total, hits };
}
function wordCount(text){ return (text.trim().match(/\S+/g)||[]).length; }

function colorFor(p){
  if(p>=0.6) return getCSS("--pos");
  if(p<=0.4) return getCSS("--neg");
  return getCSS("--neu");
}
function getCSS(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

/* ---------------- render ---------------- */
function render({text, sentences, duration, sentiment=true, timedWords=null, compareRead=false, promptTarget=""}){
  results.style.display="block";

  const words = wordCount(text);
  const wpm = duration>0 ? Math.round(words/(duration/60)) : 0;
  const fillers = countFillers(text, state.lang);
  const fillerRate = words ? (fillers.total/words*100) : 0;
  const overall = sentiment
    ? sentences.reduce((a,s)=> a + s.positivity*wordCount(s.text), 0)
      / Math.max(1, sentences.reduce((a,s)=>a+wordCount(s.text),0))
    : null;

  // metrics (la de positividad solo si el anÃ¡lisis estÃ¡ activo)
  const paceHint = wpm===0 ? "" : wpm<110 ? "a touch slow" : wpm>160 ? "a touch fast" : "good range";
  const sentLabel = overall>=0.6?"Positive":overall<=0.4?"Negative":"Neutral";
  $("metrics").innerHTML = `
    ${sentiment ? metric((overall*100).toFixed(0)+"%", "Positivity", sentLabel, colorFor(overall)) : ""}
    ${metric(wpm||"â€”", "Words / min", paceHint)}
    ${metric(words, "Words", fmtDur(duration))}
    ${metric(fillers.total, "Filler words", fillerRate.toFixed(1)+"% of words", fillers.total>0?getCSS("--accent"):null)}
  `;

  // evaluaciÃ³n de lectura (texto del prompt vs. lo grabado)
  renderReadEval(compareRead ? promptTarget : "", text);

  // sentiment arc (oculto si el anÃ¡lisis estÃ¡ apagado)
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
      b.title = `${(s.positivity*100).toFixed(0)}% â€” ${s.text.slice(0,60)}${s.text.length>60?"â€¦":""}`;
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
  da.innerHTML = `<button class="copy" id="docxGenBtn">â¬‡ Generar Word (.docx)</button>`;
  $("docxGenBtn").addEventListener("click", onDocxClick);

  results.scrollIntoView({behavior:"smooth", block:"start"});
}

function metric(v,k,hint,color){
  return `<div class="metric"><div class="v"${color?` style="color:${color}"`:""}>${v}</div><div class="k">${k}</div>${hint?`<div class="hint">${hint}</div>`:""}</div>`;
}
function fmtDur(s){ const m=Math.floor(s/60), r=Math.round(s%60); return m?`${m}m ${r}s`:`${r}s`; }

/* ---------------- evaluaciÃ³n de lectura: texto del prompt vs. grabado ----------------
   Con el toggle "Comparar lectura" en On, alinea palabra por palabra el texto objetivo
   contra la transcripciÃ³n y colorea cada palabra: correcta / aproximada / fallada. */
function normReadWord(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9']/g,""); }
function renderReadEval(promptTarget, transcript){
  const wrap = $("readWrap");
  wpImproveWords = [];   // se recalcula en cada anÃ¡lisis
  const tgtRaw = (promptTarget||"").match(/[A-Za-z\u00C0-\u00FF0-9\x27\u2019-]+/g) || [];
  const spkRaw = (transcript||"").match(/[A-Za-z\u00C0-\u00FF0-9\x27\u2019-]+/g) || [];
  if(tgtRaw.length < 1 || spkRaw.length < 1){ wrap.style.display = "none"; return; }

  const tgt = tgtRaw.map(normReadWord), spk = spkRaw.map(normReadWord);
  const ops = alignPh(tgt, spk);   // reutiliza la alineaciÃ³n (funciona sobre arrays de strings)

  let ti = 0, ok = 0, near = 0, bad = 0, extra = 0;
  const parts = [];
  const improve = [];   // {word, sev}
  const noteImprove = (word, sev)=>{ if(word && word.length>=3) improve.push({word, sev}); };
  ops.forEach(o=>{
    if(o.op === "ins"){                       // dijiste una palabra que no estÃ¡ en el texto
      extra++;
      parts.push(`<span class="rw extra" title="dijiste de mÃ¡s">${escapeHtml(spkRaw[spk.indexOf(o.r)]||o.r)}</span>`);
      return;
    }
    const disp = tgtRaw[ti]; ti++;
    if(o.op === "match"){ ok++; parts.push(`<span class="rw ok">${escapeHtml(disp)}</span>`); }
    else if(o.op === "del"){ bad++; noteImprove(o.t, 2); parts.push(`<span class="rw bad" title="no se detectÃ³">${escapeHtml(disp)}</span>`); }
    else {                                    // sustituciÃ³n: Â¿lo intentÃ³ (parecido) o fallÃ³ feo?
      const d = editDistance([...o.t], [...o.r]);
      const ratio = 1 - d / Math.max(o.t.length, o.r.length, 1);
      if(ratio >= 0.5){ near++; noteImprove(o.t, 1); parts.push(`<span class="rw near" title="dijiste: ${escapeHtml(o.r)}">${escapeHtml(disp)}</span>`); }
      else { bad++; noteImprove(o.t, 2); parts.push(`<span class="rw bad" title="dijiste: ${escapeHtml(o.r)}">${escapeHtml(disp)}</span>`); }
    }
  });

  // dedup (mayor severidad gana), primero las falladas, top 20
  const seen = new Map();
  improve.forEach(({word,sev})=>{ if(!seen.has(word) || sev>seen.get(word)) seen.set(word, sev); });
  wpImproveWords = [...seen.entries()]
    .map(([word,sev])=>({word,sev}))
    .sort((a,b)=> b.sev - a.sev)
    .slice(0,20);

  const score = Math.max(0, Math.round(100*(ok + near*0.5)/Math.max(1, tgt.length) - Math.min(15, extra*3)));
  const color = score>=85 ? getCSS("--pos") : score>=60 ? getCSS("--neu") : getCSS("--neg");

  $("readScore").innerHTML = `<span style="color:${color}">${score}%</span>`
    + ` <span style="font-size:13px;color:var(--muted);font-family:'Inter',sans-serif;font-weight:600">de lectura correcta</span>`;
  $("readDiff").innerHTML = parts.join(" ");
  $("readNote").textContent = `${ok} correctas Â· ${near} aproximadas Â· ${bad} falladas/omitidas`
    + (extra ? ` Â· ${extra} de mÃ¡s` : "")
    + ".  Pasa el cursor sobre una palabra para ver quÃ© se entendiÃ³.";
  wrap.style.display = "";
}

/* ---------------- ritmo y pausas ---------------- */
// Normaliza la salida de Whisper (out.chunks con timestamps) a [{text,start,end}].
function extractTimedWords(out){
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
function renderRhythm(words, duration){
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
    b.title = `${t0.toFixed(1)}â€“${t1.toFixed(1)}s Â· ${Math.round(wpm)} ppm`;
    bars.appendChild(b);
  });

  // --- marcadores de pausa (posiciÃ³n por % de tiempo) ---
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

  // --- mÃ©tricas + consistencia del ritmo ---
  const active = wpmBins.filter(w=>w>0);
  const mean = active.reduce((a,b)=>a+b,0) / Math.max(1, active.length);
  const variance = active.reduce((a,b)=>a+(b-mean)*(b-mean),0) / Math.max(1, active.length);
  const cv = mean > 0 ? Math.sqrt(variance)/mean : 0;   // coeficiente de variaciÃ³n
  const steady = cv < 0.35 ? "Estable" : cv < 0.6 ? "Algo irregular" : "Irregular";
  const steadyColor = cv < 0.35 ? getCSS("--pos") : cv < 0.6 ? getCSS("--neu") : getCSS("--neg");

  $("rhythmMetrics").innerHTML = `
    <div class="rm"><span class="v">${longPauses.length}</span><span class="k">Pausas largas (â‰¥${PAUSE_LONG}s)</span></div>
    <div class="rm"><span class="v">${longest ? longest.toFixed(1)+"s" : "â€”"}</span><span class="k">Pausa mÃ¡s larga</span></div>
    <div class="rm"><span class="v">${Math.round(mean)||"â€”"}</span><span class="k">Ritmo medio (ppm)</span></div>
    <div class="rm"><span class="v" style="color:${steadyColor}">${steady}</span><span class="k">Consistencia</span></div>
  `;

  // Nota interpretativa breve.
  let note = "";
  if(longPauses.length >= 3) note = "Varias pausas largas â€” respira, pero evita quedarte en blanco entre ideas.";
  else if(cv >= 0.6) note = "Tu velocidad cambia bastante; intenta un ritmo mÃ¡s parejo.";
  else if(mean > 165) note = "Vas rÃ¡pido; baja un poco para que se te entienda mejor.";
  else if(mean > 0 && mean < 110) note = "Vas algo lento; puedes ganar algo de energÃ­a.";
  else note = "Buen ritmo y pausas naturales. ðŸ‘Œ";
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
function escapeHtml(s){ return s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }

function highlight(i, on, fromArc=true){
  const bars = $("arc").children, sents = document.querySelectorAll(".sent");
  if(bars[i]) bars[i].classList.toggle("active", on);
  if(sents[i]) sents[i].classList.toggle("active", on);
}

$("copyBtn").addEventListener("click", ()=>{
  const txt = $("doc").innerText.trim();
  navigator.clipboard.writeText(txt).then(()=>{
    $("copyBtn").textContent="Copied âœ“";
    setTimeout(()=>$("copyBtn").textContent="Copy transcript",1500);
  });
});

/* ---------------- docx export (todo en el navegador) ---------------- */
function loadScript(src){
  return new Promise((res,rej)=>{
    const s=document.createElement("script");
    s.src=src; s.onload=()=>res(); s.onerror=()=>rej(new Error("No se pudo cargar "+src));
    document.head.appendChild(s);
  });
}
// Carga perezosa: solo se descargan estas librerÃ­as cuando pides el Word.
async function ensureDocxLibs(){
  if(!window.html2canvas) await loadScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");
  if(!window.docx)        await loadScript("https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js");
}
// Rasteriza un elemento del DOM a PNG (Uint8Array) para incrustarlo en el Word.
async function elementToPng(el){
  const canvas = await window.html2canvas(el, { backgroundColor:"#ffffff", scale:2, logging:false, useCORS:true });
  const blob = await new Promise(r=>canvas.toBlob(r,"image/png"));
  const data = new Uint8Array(await blob.arrayBuffer());
  return { data, w:canvas.width, h:canvas.height };
}
function hexFor(p){ return p>=0.6 ? "1f9d6b" : (p<=0.4 ? "d8232a" : "d39a14"); }

async function buildDocxBlob(){
  await ensureDocxLibs();
  const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } = window.docx;
  const last = state.last;
  const withSent = last.sentiment !== false;

  // Espera a que las fuentes carguen para que el texto se rasterice nÃ­tido.
  if(document.fonts && document.fonts.ready){ try{ await document.fonts.ready; }catch(e){} }

  // ImÃ¡genes del anÃ¡lisis: bloque de mÃ©tricas + (si aplica) arco de sentimiento.
  const metricsImg = await elementToPng($("metrics"));
  const arcImg = withSent ? await elementToPng(document.getElementById("sentWrap")) : null;

  const imgPara = (img, maxW=600)=>{
    const w = Math.min(maxW, img.w);
    const h = Math.round(w * img.h / img.w);
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:{ after: 220 },
      children:[ new ImageRun({ data: img.data, transformation:{ width: Math.round(w), height: h } }) ]
    });
  };

  const langLabel = last.lang==="spanish" ? "EspaÃ±ol" : last.lang==="portuguese" ? "PortuguÃªs" : "English";
  const meta = `Idioma: ${langLabel}  Â·  DuraciÃ³n: ${fmtDur(last.duration)}  Â·  Palabras: ${last.words}  Â·  Ritmo: ${last.wpm} ppm`
    + (withSent ? `  Â·  Positividad: ${(last.overall*100).toFixed(0)}%` : "")
    + `  Â·  Muletillas: ${last.fillers.total}  Â·  Generado: ${new Date().toLocaleString()}`;

  // TranscripciÃ³n: coloreada por sentimiento solo si el anÃ¡lisis estÃ¡ activo.
  const sentenceRuns = last.sentences.map(s=>
    new TextRun({ text: s.text + " ", color: withSent ? hexFor(s.positivity) : "1a2233" })
  );

  const children = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children:[ new TextRun({ text:"Voice Coach â€” AnÃ¡lisis de voz" }) ] }),
    new Paragraph({ spacing:{ after: 260 }, children:[ new TextRun({ text: meta, italics:true, color:"6b7686", size:18 }) ] }),

    new Paragraph({ heading: HeadingLevel.HEADING_2, children:[ new TextRun({ text:"MÃ©tricas" }) ] }),
    imgPara(metricsImg),
  ];

  if(withSent){
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children:[ new TextRun({ text:"Arco de sentimiento" }) ] }),
      imgPara(arcImg)
    );
  }

  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing:{ before: 200 }, children:[ new TextRun({ text:"TranscripciÃ³n" }) ] }),
    new Paragraph({ spacing:{ line: 320 }, children: sentenceRuns })
  );

  if(withSent){
    children.push(
      new Paragraph({ spacing:{ before: 220 }, children:[ new TextRun({ text:"Color del texto â€” Verde: positivo Â· Amarillo: neutral Â· Rojo: negativo", italics:true, color:"6b7686", size:16 }) ] })
    );
  }

  const document_ = new Document({ sections:[{ properties:{}, children }] });
  return await Packer.toBlob(document_);
}

async function onDocxClick(){
  const btn = $("docxGenBtn");
  if(!btn) return;
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = "Generandoâ€¦";
  try{
    const blob = await buildDocxBlob();
    if(state.docxUrl) URL.revokeObjectURL(state.docxUrl);
    state.docxUrl = URL.createObjectURL(blob);
    const da = $("docxArea");
    da.innerHTML = `<a class="docx-link" id="docxLink" href="${state.docxUrl}" download="voice-coach-analisis.docx">â¬‡ Descargar voice-coach-analisis.docx</a>`;
    $("docxLink").click(); // descarga automÃ¡tica; el enlace queda para volver a bajarlo
  }catch(err){
    console.error(err);
    btn.disabled = false;
    btn.textContent = orig;
    setStatus("No se pudo generar el Word: " + err.message, true);
  }
}

/* ---------------- arranque: precarga los modelos en background ---------------- */
// Localiza la interfaz al idioma inicial y calienta los modelos tras un instante.
if(typeof applyLang==="function") applyLang();
setTimeout(()=>{ warmupModels(); }, 400);


