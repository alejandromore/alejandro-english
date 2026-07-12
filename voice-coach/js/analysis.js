/* ---------------- analysis: modelos, transcripción, grabación y métricas ---------------- */
import { state, $, pipeline, env, setStatus, showBar, setBar, hideBar } from './state.js';
import { render, extractTimedWords } from './render.js';
import { warmVoice } from './tts.js';

/* ---- estado de modelos + panel con recarga ---- */
let modelsReady=false, _warmupRunning=false, _warmupPending=false, _warmupKey=null;

const MODELS = {
  whisper:{ label:"Reconocimiento (Whisper)", state:"idle" },
  sentiment:{ label:"Analisis de sentimiento", state:"idle" },
};
const MS_LABEL={ idle:"No cargado", loading:"Cargando…", ready:"Listo ✓", error:"Error" };

export function setMS(key, st){ if(MODELS[key]){ MODELS[key].state=st; updateBadge(); renderModelsPanel(true); } }

function setModelBadge(st, text){
  const el=$("modelBadge"); if(!el) return;
  el.dataset.state=st; const t=$("modelBadgeText"); if(t) t.textContent=text;
}
function updateBadge(){
  const ess=[MODELS.whisper.state]; if(state.doSentiment) ess.push(MODELS.sentiment.state);
  if(ess.includes("error")) setModelBadge("error","Modelos: revisar ⚠");
  else if(ess.every(s=>s==="ready")) setModelBadge("ready","Modelos: listos ✓");
  else if(ess.includes("loading")) setModelBadge("loading","Modelos: cargando…");
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
      <button class="ms-reload" data-k="${k}" title="Recargar">↻</button>
    </div>`).join("");
  const el=panel.querySelector(".ms-list"); if(el) el.innerHTML=rows;
}
async function reloadModel(key){
  setMS(key,"idle");
  try{
    if(key==="whisper"){ state.asr=null; state.asrKey=null; state._asrPromise=null; await getASR(); }
    else if(key==="sentiment"){ state.sentiment=null; state._sentPromise=null; await getSentiment(); }
  }catch(e){ console.error("reload "+key, e); setMS(key,"error"); }
}
export function initModelsPanel(){
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
}

/* ---------------- carga de modelos ---------------- */
export async function getASR(){
  const model = `Xenova/whisper-${state.size}${state.lang==="english" ? ".en" : ""}`;
  const key = model;
  if (state.asr && state.asrKey === key) return state.asr;
  if (state._asrPromise && state._asrPromiseKey === key) return state._asrPromise;
  state._asrPromiseKey = key;
  state._asrPromise = (async ()=>{
    setMS("whisper","loading");
    setStatus(`Loading speech model - ${model}`); showBar();
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
            setStatus(`Downloading speech model - ${Math.round(avg)}%`);
          }
        }
      });
      state.asr = asr; state.asrKey = key; setMS("whisper","ready");
      return asr;
    }catch(e){ setMS("whisper","error"); state._asrPromise=null; throw e; }
  })();
  return state._asrPromise;
}

/* ---- transcripción en segundo plano (Web Worker) ---- */
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
  w.onerror = ()=>{
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
    w.postMessage({ id, model, audio, opts });
  });
}
export async function transcribeAudio(audio, opts, onProgress){
  const model = `Xenova/whisper-${state.size}${state.lang==="english" ? ".en" : ""}`;
  try{
    setMS("whisper","loading");
    const out = await transcribeInWorker(model, audio, opts, onProgress, ()=>setMS("whisper","ready"));
    setMS("whisper","ready");
    return out;
  }catch(e){
    console.warn("Worker de transcripción falló, uso el hilo principal:", e);
    const asr = await getASR();
    return await asr(audio, opts);
  }
}

export async function getSentiment(){
  if (state.sentiment) return state.sentiment;
  if (state._sentPromise) return state._sentPromise;
  const model = "Xenova/distilbert-base-multilingual-cased-sentiments-student";
  state._sentPromise = (async ()=>{
    setMS("sentiment","loading");
    setStatus(`Loading sentiment model - ${model}`); showBar();
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

export async function warmupModels(){
  const key=`${state.lang}|${state.size}|${state.doSentiment?1:0}`;
  if(!(modelsReady && _warmupKey===key)){
    if(_warmupRunning){ _warmupPending=true; }
    else {
      _warmupRunning=true; _warmupKey=key; modelsReady=false;
      try{
        await getASR();
        if(state.doSentiment) await getSentiment();
        const nowKey=`${state.lang}|${state.size}|${state.doSentiment?1:0}`;
        if(nowKey!==key){ _warmupRunning=false; return warmupModels(); }
        modelsReady=true;
        if(!state.recording){ hideBar(); setStatus("Listo para grabar."); }
      }catch(e){ console.error(e); }
      finally{ _warmupRunning=false; if(_warmupPending){ _warmupPending=false; warmupModels(); } }
    }
  }
  warmVoice();
}

/* ---------------- audio decode + resample to 16k mono ---------------- */
export async function decodeTo16k(blob){
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
  let peak=0; for(let i=0;i<audio.length;i++){ const a=Math.abs(audio[i]); if(a>peak) peak=a; }
  if(peak>0.0015 && peak<0.75){ const g=Math.min(10, 0.95/peak); for(let i=0;i<audio.length;i++) audio[i]*=g; }
  return { audio, duration: decoded.duration };
}

/* ---------------- grabación ---------------- */
function setBusy(disabled){ const r=$("recBtn"); if(r) r.disabled = disabled; }

export function initRecording(){
  const recBtn = $("recBtn"), recLabel = $("recLabel"), timerEl = $("timer"), fileInput = $("fileInput");
  recBtn.addEventListener("click", async ()=>{
    if(state.recording){ stopRecording(); return; }
    const md = navigator.mediaDevices;
    const es = state.lang==="spanish";
    const localFileMsg = es
      ? "El micrófono está bloqueado porque abriste el archivo desde Descargas. Para grabar con el micro, abre la página por https (súbela gratis a Netlify Drop o GitHub Pages) o usa «Subir audio»."
      : "The mic is blocked because you opened the file from Downloads. To record, open the page over https (host it free on Netlify Drop or GitHub Pages), or use \"Upload audio\".";
    const looksLocal = !window.isSecureContext || location.protocol==="content:" || location.protocol==="file:";
    if(looksLocal || !md || !md.getUserMedia){ setStatus(localFileMsg, true); return; }
    try{ state.stream = await md.getUserMedia({audio:true}); }
    catch(err){
      let msg = es ? "No se pudo abrir el micrófono. Usa «Subir audio»." : "Could not start the microphone. Use \"Upload audio\" instead.";
      if(err && (err.name==="NotAllowedError" || err.name==="SecurityError")) msg = localFileMsg;
      else if(err && err.name==="NotFoundError") msg = es ? "No se encontró micrófono en este dispositivo. Usa «Subir audio»." : "No microphone was found on this device. Use \"Upload audio\" instead.";
      setStatus(msg, true); return;
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
    setStatus("Recording… speak your answer, then press Stop.");
  });

  fileInput.addEventListener("change", async (e)=>{
    const f = e.target.files[0];
    fileInput.value = "";
    if(!f) return;
    if(/^(image|video)\//.test(f.type||"")){
      const msg = state.lang==="spanish"
        ? "Eso es una imagen o un video, no audio. Elige tu grabación (por ej. un archivo de la carpeta Recordings)."
        : "That's an image or video, not audio. Pick your recording (e.g. a file in the Recordings folder).";
      setStatus(msg, true); return;
    }
    await analyze(f);
  });
}

function stopRecording(){
  state.recording = false;
  clearInterval(state.timerId);
  const recBtn = $("recBtn"), recLabel = $("recLabel"), timerEl = $("timer");
  recBtn.classList.remove("recording");
  recLabel.textContent = "Record";
  timerEl.style.display="none";
  try{ state.mediaRecorder.stop(); }catch(e){}
}
export { stopRecording };

/* ---------------- transcripción larga por segmentos ---------------- */
async function transcribeLong(audio, sr, opts, onSeg){
  const segLen = 120 * sr;
  const n = Math.ceil(audio.length / segLen);
  let fullText = "", chunks = [];
  for(let i=0;i<n;i++){
    const start = i*segLen;
    const slice = audio.slice(start, Math.min(audio.length, start+segLen));
    const segOut = await transcribeAudio(slice, opts);
    const segText = (segOut.text || "").trim();
    if(segText) fullText += (fullText ? " " : "") + segText;
    const offset = start / sr;
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

/* ---------------- análisis principal ---------------- */
export async function analyze(blob){
  state.analyzeCanceled = false;
  const cancelBtn = $("cancelBtn");
  if(cancelBtn) cancelBtn.style.display = "inline-block";
  setBusy(true);
  try{
    setStatus("Decoding audio…"); showBar(false); setBar(8);
    const { audio, duration } = await decodeTo16k(blob);
    if(audio.length < 1600){ setStatus("That clip was too short to analyze. Try a few seconds of speech.", true); hideBar(); setBusy(false); if(cancelBtn) cancelBtn.style.display="none"; return; }
    if(state.analyzeCanceled){ if(cancelBtn) cancelBtn.style.display="none"; return; }

    setStatus("Transcribing…"); showBar(); setBar(20);
    const asrOpts = {
      chunk_length_s: 30, stride_length_s: 5,
      no_repeat_ngram_size: 3,
      return_timestamps: "word"
    };
    if(state.lang!=="english"){ asrOpts.language = state.lang; asrOpts.task = "transcribe"; }

    const isEs = state.lang==="spanish";
    const longAudio = duration > 180;
    const t0 = Date.now();
    const mmss = (s)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
    let segInfo = "";
    const heartbeat = setInterval(()=>{
      const el = mmss((Date.now()-t0)/1000);
      setStatus((isEs?"Transcribiendo":"Transcribing") + (segInfo?` · ${segInfo}`:"") + ` · ${el}`);
    }, 1000);
    const onSeg = (frac,i,nSeg)=>{ setBar(20 + frac*45); segInfo = isEs?`parte ${i}/${nSeg}`:`part ${i}/${nSeg}`; };
    const onDl  = (p)=>{ if(p!=null) setBar(Math.min(60, 20 + p*0.4)); };
    if(longAudio) setStatus((isEs?"Audio largo":"Long audio")+` (${mmss(duration)}) - ${isEs?"transcribiendo por partes; puede tardar unos minutos":"transcribing in parts; this can take a few minutes"}.`);

    const run = (o)=> longAudio ? transcribeLong(audio, 16000, o, onSeg) : transcribeAudio(audio, o, onDl);
    let out;
    try{ out = await run(asrOpts); }
    catch(e){
      console.warn("Timestamps por palabra no disponibles, reintentando:", e);
      delete asrOpts.return_timestamps;
      out = await run(asrOpts);
    }
    finally{ clearInterval(heartbeat); }
    const timedWords = extractTimedWords(out);
    let text = (out.text || "").trim();
    text = text.replace(/\((?:speaking[^)]*|inaudible|music|applause|foreign[^)]*|silence|no audio)\)/gi,"")
               .replace(/\[[^\]]{0,40}\]/g,"")
               .replace(/\s{2,}/g," ").trim();
    if(!text){ setStatus("No speech was detected in that audio.", true); hideBar(); setBusy(false); if(cancelBtn) cancelBtn.style.display="none"; return; }
    if(state.analyzeCanceled){ if(cancelBtn) cancelBtn.style.display="none"; return; }

    const sentences = splitSentences(text);
    let scored;
    if(state.doSentiment){
      const classifier = await getSentiment();
      setStatus("Scoring sentiment…"); setBar(70);
      scored = [];
      for(const s of sentences){
        const r = await classifier(s, { top_k: 3 });
        scored.push({ text:s, positivity: sentimentPositivity(r) });
      }
    } else {
      setStatus("Finishing…"); setBar(80);
      scored = sentences.map(s=>({ text:s, positivity:null }));
    }
    setBar(100);

    render({ text, sentences:scored, duration, sentiment: state.doSentiment, timedWords,
             compareRead: state.compareRead, promptTarget: $("promptText").value });
    setStatus(`Done — analyzed ${duration.toFixed(1)}s of audio.`);
    hideBar();
  }catch(err){
    console.error(err);
    const decodeFail = /decode|EncodingError|Unable to decode|decodeAudioData/i.test((err&&err.message)||"") || (err&&err.name==="EncodingError");
    if(decodeFail){
      setStatus(state.lang==="spanish"
        ? "No pude leer ese archivo de audio. Prueba con un .m4a, .mp3, .wav o .ogg (por ej. tu grabación en la carpeta Recordings)."
        : "I couldn't read that audio file. Try a .m4a, .mp3, .wav or .ogg (e.g. your recording in the Recordings folder).", true);
    } else {
      setStatus(`Something went wrong: ${err.message}. If this is the first run, check your connection — the models download once.`, true);
    }
    hideBar();
  }finally{
    setBusy(false);
    const cancelBtn = $("cancelBtn");
    if(cancelBtn) cancelBtn.style.display="none";
  }
}

/* ---------------- métricas de entrega ---------------- */
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

export function splitSentences(text){
  const parts = text.match(/[^.!?]+[.!?]*/g) || [text];
  return parts.map(s=>s.trim()).filter(s=>s.length);
}

export const FILLERS = {
  english: ["um","uh","uhh","umm","er","ah","hmm","like","basically","actually","literally","you know","i mean","kind of","sort of"],
  spanish: ["este","eh","em","mmm","o sea","pues","bueno","digamos","tipo","verdad","no sé"],
  portuguese: ["é","hum","eh","mmm","tipo","né","então","quer dizer","assim","olha","vejam","bom"],
};

export function countFillers(text, lang){
  const lower = " " + text.toLowerCase().replace(/[.,!?;:]/g," ") + " ";
  let total=0; const hits={};
  for(const f of FILLERS[lang]||FILLERS.english){
    const re = new RegExp("(^|\\s)"+f.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?=\\s)","g");
    const n = (lower.match(re)||[]).length;
    if(n){ total+=n; hits[f]=n; }
  }
  return { total, hits };
}

export function wordCount(text){ return (text.trim().match(/\S+/g)||[]).length; }
