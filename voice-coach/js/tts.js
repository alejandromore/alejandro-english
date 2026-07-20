/* ---------------- tts: síntesis de voz y reproducción ---------------- */
import { state, $, pipeline, env, setStatus } from './state.js';
import { t, speakStopLabel } from './i18n.js';
import { setMS } from './analysis.js';

export const synth = window.speechSynthesis;
const speakBtn = $("speakBtn"), speakLabel = $("speakLabel");

export let readingWords = [], activeWord = null;
let monitorTimer = null, lastBoundaryAt = 0;
export let speechChunks = [], chunkIdx = 0;
export let ttsActive = false, ttsRate = 0.8;
export let audioCtx=null, naturalSource=null, naturalRAF=null, natRAF=null, natSchedule=null, natWatchdog=null;
const neuralCache = new Map();
export let hfAudioEl = null;
const hfCache = new Map();
export let ttsPaused = false;
let naturalBroken = false;

let EL_API_KEY = localStorage.getItem("el_api_key") || "";
const EL_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
// Voces "premade" públicas de ElevenLabs (funcionan con cualquier API key, es+en vía eleven_multilingual_v2).
const ORATOR_VOICES = [
  "JBFqnCBsd6RMkjVDRZzb", // George (voz por defecto, hombre)
  "21m00Tcm4TlvDq8ikWAM", // Rachel (mujer)
  "pNInz6obpgDQGcFmaJgB", // Adam (hombre)
  "EXAVITQu4vr4xnSDxMaL", // Bella (mujer)
  "ErXwobaYiN019PkySvjV", // Antoni (hombre)
  "MF3mGyEYCl7XYWbV9V6O", // Elli (mujer)
];
let orVoiceMap = new Map();
export function resetOratorVoices(){ orVoiceMap = new Map(); }
function voiceForSpeaker(speaker){
  const key = (speaker||"").toLowerCase();
  if(!orVoiceMap.has(key)) orVoiceMap.set(key, ORATOR_VOICES[orVoiceMap.size % ORATOR_VOICES.length]);
  return orVoiceMap.get(key);
}

let voiceStage="", voiceHB=null, voiceT0=0;

function setVoiceStatus(msg, isErr){ const el=$("voiceStatus"); if(!el) return; el.textContent=msg||""; el.classList.toggle("err", !!isErr); }
function voiceTick(){ if(!voiceStage) return; const s=Math.floor((Date.now()-voiceT0)/1000); setVoiceStatus(`${voiceStage} · ${s}s`); }
function startVoiceStatus(stage){ voiceStage=stage; voiceT0=Date.now(); if(voiceHB)clearInterval(voiceHB); voiceHB=setInterval(voiceTick,1000); voiceTick(); }
function setVoiceStage(stage){ voiceStage=stage; voiceTick(); }
function stopVoiceStatus(finalMsg, isErr){ if(voiceHB){clearInterval(voiceHB);voiceHB=null;} voiceStage=""; setVoiceStatus(finalMsg||"", isErr); }

function setMediaSession(active){
  if(!("mediaSession" in navigator)) return;
  try{
    const ms = navigator.mediaSession;
    if(active){
      try{ ms.metadata = new MediaMetadata({ title:"Voice Coach", artist: state.lang==="spanish"?"Práctica de lectura":state.lang==="portuguese"?"Prática de leitura":"Reading practice" }); }catch(e){}
      ms.playbackState = "playing";
      ms.setActionHandler("pause", ()=>{ try{ if($("pauseBtn") && !ttsPaused) togglePause(); }catch(e){} });
      ms.setActionHandler("play",  ()=>{ try{ if($("pauseBtn") && ttsPaused) togglePause(); }catch(e){} });
      ms.setActionHandler("stop",  ()=>{ try{ stopSpeaking(); }catch(e){} });
    } else { try{ ms.playbackState = "none"; }catch(e){} }
  }catch(e){}
}

function clearActiveWord(){ if(activeWord){ activeWord.classList.remove("reading"); activeWord = null; } }
function highlightWordByIndex(i){
  const w = readingWords[i];
  if(!w || w.el === activeWord) return;
  clearActiveWord(); w.el.classList.add("reading"); activeWord = w.el;
  w.el.scrollIntoView({ block:"nearest" });
}
function stopMonitor(){ if(monitorTimer){ clearInterval(monitorTimer); monitorTimer = null; } }
function exitReadingView(){
  clearActiveWord();
  const pr = $("promptRead"), pt = $("promptText"), pd = $("promptDoc");
  if(pr){ pr.style.display = "none"; pr.classList.remove("doc-view"); }
  if(state.docView==="document"){ if(pt) pt.style.display = "none"; if(pd) pd.style.display = "block"; renderDocView(); }
  else { if(pt) pt.style.display = ""; if(pd) pd.style.display = "none"; }
}

export function stopSpeaking(){
  ttsActive = false;
  stopMonitor(); stopNatural(); stopHfOrator();
  if(audioCtx && audioCtx.state==="suspended"){ try{ audioCtx.resume(); }catch(e){} }
  if(synth){ try{ synth.resume(); }catch(e){} synth.cancel(); }
  hidePause(); setMediaSession(false);
  speakBtn.classList.remove("speaking"); const sic=speakBtn.querySelector(".ic"); if(sic) sic.textContent="\u25B6";
  speakLabel.textContent = (typeof t==="function") ? t("play") : "Reproducir";
  exitReadingView();
}

/* ---- pausar / reanudar ---- */
const pauseBtn = $("pauseBtn"), pauseLabel = $("pauseLabel"), pauseIc = $("pauseIc");
function showPause(){
  ttsPaused = false; if(!pauseBtn) return;
  pauseBtn.style.display = ""; pauseBtn.classList.remove("paused");
  if(pauseLabel) pauseLabel.textContent = t("pause"); if(pauseIc) pauseIc.textContent = "⏸";
}
function hidePause(){
  ttsPaused = false; if(!pauseBtn) return;
  pauseBtn.style.display = "none"; pauseBtn.classList.remove("paused");
}
async function togglePause(){
  if(!pauseBtn) return;
  if(!ttsPaused){
    ttsPaused = true;
    if(state.voice === "natural"){ try{ if(audioCtx && audioCtx.state==="running") await audioCtx.suspend(); }catch(e){} }
    else if(hfAudioEl){ try{ hfAudioEl.pause(); }catch(e){} }
    else if(synth){ try{ synth.pause(); }catch(e){} }
    pauseBtn.classList.add("paused"); if(pauseLabel) pauseLabel.textContent = t("resume"); if(pauseIc) pauseIc.textContent = "▶";
  } else {
    ttsPaused = false;
    if(state.voice === "natural"){ try{ if(audioCtx && audioCtx.state==="suspended") await audioCtx.resume(); }catch(e){} }
    else if(hfAudioEl){ try{ hfAudioEl.play(); }catch(e){} }
    else if(synth){ try{ synth.resume(); }catch(e){} }
    pauseBtn.classList.remove("paused"); if(pauseLabel) pauseLabel.textContent = t("pause"); if(pauseIc) pauseIc.textContent = "⏸";
  }
}
if(pauseBtn) pauseBtn.addEventListener("click", togglePause);

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

/* ---- modelos TTS (Kokoro en/MMS es+pt) ---- */
let kokoroTTS = null, mmsTTS = null, lame = null, ttsAudioUrl = null, kokoroDevice = "", kokoroForceWasm = false;
let ttsDownloadTarget=null, ttsSeen={}, _kokoroP=null, _mmsP=null;
let mmsPtTTS = null, _mmsPtP = null;

function ttsProgress(e){
  if(!ttsDownloadTarget) return;
  if(e && e.status==="progress" && e.file){
    ttsSeen[e.file]=e.progress||0;
    const vals=Object.values(ttsSeen); const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
    ttsDownloadTarget(Math.round(avg));
  }
}
async function ensureKokoro(){
  if(kokoroTTS) return kokoroTTS; if(_kokoroP) return _kokoroP;
  _kokoroP=(async()=>{
    setMS && setMS("voiceEn","loading"); ttsSeen={};
    try{
      const mod = await import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.0/+esm");
      const KokoroTTS = mod.KokoroTTS || (mod.default && mod.default.KokoroTTS);
      if(!KokoroTTS) throw new Error("No se pudo cargar el motor de voz.");
      const modelId = "onnx-community/Kokoro-82M-v1.0-ONNX";
      if(navigator.gpu && !kokoroForceWasm){
        try{ kokoroTTS = await KokoroTTS.from_pretrained(modelId, { dtype:"fp32", device:"webgpu", progress_callback:ttsProgress }); kokoroDevice = "webgpu"; setMS && setMS("voiceEn","ready"); return kokoroTTS; }
        catch(e){ console.warn("Kokoro WebGPU falló, uso WASM:", e); kokoroTTS = null; ttsSeen={}; }
      }
      kokoroTTS = await KokoroTTS.from_pretrained(modelId, { dtype:"q8", progress_callback:ttsProgress });
      kokoroDevice = "wasm"; setMS && setMS("voiceEn","ready"); return kokoroTTS;
    }catch(e){ setMS && setMS("voiceEn","error"); _kokoroP=null; throw e; }
  })();
  return _kokoroP;
}
async function ensureMMS(){
  if(mmsTTS) return mmsTTS; if(_mmsP) return _mmsP;
  _mmsP=(async()=>{ setMS && setMS("voiceEs","loading"); ttsSeen={};
    try{ mmsTTS = await pipeline("text-to-speech", "Xenova/mms-tts-spa", { dtype:"q8", progress_callback:ttsProgress }); setMS && setMS("voiceEs","ready"); return mmsTTS; }
    catch(e){ setMS && setMS("voiceEs","error"); _mmsP=null; throw e; } })();
  return _mmsP;
}
async function ensureMMSPt(){
  if(mmsPtTTS) return mmsPtTTS; if(_mmsPtP) return _mmsPtP;
  _mmsPtP=(async()=>{ setMS && setMS("voicePt","loading"); ttsSeen={};
    try{ mmsPtTTS = await pipeline("text-to-speech", "Xenova/mms-tts-por", { dtype:"q8", progress_callback:ttsProgress }); setMS && setMS("voicePt","ready"); return mmsPtTTS; }
    catch(e){ setMS && setMS("voicePt","error"); _mmsPtP=null; throw e; } })();
  return _mmsPtP;
}
function normalizeSamples(samples){
  let peak=0; for(let i=0;i<samples.length;i++){ const a=Math.abs(samples[i]); if(a>peak) peak=a; }
  if(peak>0.02 && peak<0.98){ const g=0.92/peak; for(let i=0;i<samples.length;i++) samples[i]*=g; }
  return samples;
}
export async function neuralSamples(lang, text){
  if(lang==="spanish"){
    let s = await ensureMMS();
    try{ const out = await s(text); return { samples: normalizeSamples(out.audio), sr: out.sampling_rate || 16000 }; }
    catch(e){ console.warn("MMS falló en inferencia; rehago en WASM y reintento:", e); mmsTTS=null; _mmsP=null; s = await ensureMMS(); const out = await s(text); return { samples: normalizeSamples(out.audio), sr: out.sampling_rate || 16000 }; }
  }
  if(lang==="portuguese"){
    let s = await ensureMMSPt();
    try{ const out = await s(text); return { samples: normalizeSamples(out.audio), sr: out.sampling_rate || 16000 }; }
    catch(e){ console.warn("MMS-PT falló en inferencia; rehago y reintento:", e); mmsPtTTS=null; _mmsPtP=null; s = await ensureMMSPt(); const out = await s(text); return { samples: normalizeSamples(out.audio), sr: out.sampling_rate || 16000 }; }
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

export async function neuralBuffer(lang, txt){
  const key = lang+"|"+txt;
  if(neuralCache.has(key)) return neuralCache.get(key);
  let { samples, sr } = await neuralSamples(lang, txt);
  if(lang!=="spanish" && lang!=="portuguese" && kokoroDevice==="webgpu" && isSilent(samples)){
    console.warn("Kokoro WebGPU devolvió silencio; cambio a WASM y regenero.");
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

/* ---- generación de voz en segundo plano (Web Worker) ---- */
const TTS_WORKER_SRC = `
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
  return new Promise((resolve,reject)=>{ let w; try{ w=getTTSWorker(); }catch(e){ reject(e); return; } const id=++_ttsSeq; _ttsJobs.set(id,{resolve,reject,onProgress}); w.postMessage({id, lang, text}); });
}
let ttsUseMain=false, _ttsRouteP=null;
function probeWorkerGPU(){
  return new Promise((resolve)=>{ let w; try{ w=getTTSWorker(); }catch(e){ resolve(false); return; } const id=++_ttsSeq; _ttsJobs.set(id,{ resolve:(v)=>resolve(!!v), reject:()=>resolve(false) }); w.postMessage({id, type:"probe"}); setTimeout(()=>{ if(_ttsJobs.has(id)){ _ttsJobs.delete(id); resolve(false); } }, 8000); });
}
function withTimeout(p, ms){ return Promise.race([ p, new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")), ms)) ]); }
function decideTTSRoute(){
  if(_ttsRouteP) return _ttsRouteP;
  _ttsRouteP=(async()=>{ const es = state.lang==="spanish"; const pt = state.lang==="portuguese"; setVoiceStage(es||pt ? "Detectando WebGPU" : "Detecting WebGPU"); let workerGPU=false, mainGPU=false; try{ workerGPU = await probeWorkerGPU(); }catch(e){} try{ mainGPU = navigator.gpu ? !!(await withTimeout(navigator.gpu.requestAdapter(), 4000)) : false; }catch(e){ mainGPU=false; } ttsUseMain = (!workerGPU && mainGPU); return ttsUseMain; })();
  return _ttsRouteP;
}
async function genMain(lang, txt, onProgress){
  const loaded = lang==="spanish" ? !!mmsTTS : lang==="portuguese" ? !!mmsPtTTS : !!kokoroTTS;
  if(!loaded && onProgress) ttsDownloadTarget = (pct)=>onProgress(pct);
  try{ return await neuralSamples(lang, txt); } finally{ ttsDownloadTarget=null; }
}
let _bgQueue=Promise.resolve();
function runBG(task){ const p=_bgQueue.then(task); _bgQueue=p.catch(()=>{}); return p; }
async function neuralBufferBG(lang, txt, onProgress){
  const key=lang+"|"+txt;
  if(neuralCache.has(key)) return neuralCache.get(key);
  return runBG(async()=>{
    if(neuralCache.has(key)) return neuralCache.get(key);
    const es = state.lang==="spanish"; const pt = state.lang==="portuguese";
    setVoiceStage(es ? "Generando voz" : pt ? "Gerando voz" : "Generating voice");
    let samples, sr;
    if(es || pt){ const r = await genInWorker(lang, txt, onProgress); samples = r.samples; sr = r.sr; }
    else { const r = await genMain(lang, txt, onProgress); samples = r.samples; sr = r.sr; }
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const buf=audioCtx.createBuffer(1, samples.length, sr);
    if(buf.copyToChannel) buf.copyToChannel(samples,0); else buf.getChannelData(0).set(samples);
    if(neuralCache.size>60){ neuralCache.delete(neuralCache.keys().next().value); }
    neuralCache.set(key, buf);
    return buf;
  });
}
let _preloadedMMS = null;
export function preloadMMSWorker(lang){
  if(lang !== "spanish" && lang !== "portuguese") return;
  if(_preloadedMMS === lang) return;
  _preloadedMMS = lang;
  genInWorker(lang, lang === "spanish" ? "hola" : "ola").then(()=>{ console.log("MMS precargado en worker para", lang); }).catch(()=>{ _preloadedMMS = null; });
}

/* ---- resaltado y reproducción natural por bloques ---- */
function highlightChunkWord(ch, frac){
  const [first,last]=chunkWordRange(ch); if(first<0) return;
  const weights=[];
  for(let i=first;i<=last;i++){ const w=readingWords[i]; let x=w.text.length+1; const c=w.text.slice(-1); if(/[,;:]/.test(c))x+=3; else if(/[.?!…]/.test(c))x+=6; weights.push(x); }
  const tot=weights.reduce((a,b)=>a+b,0)||1; let acc=0, idx=first;
  for(let k=0;k<weights.length;k++){ if(acc/tot<=frac) idx=first+k; else break; acc+=weights[k]; }
  highlightWordByIndex(idx);
}
function natTick(){
  if(!ttsActive || !natSchedule){ natRAF=null; return; }
  const now=audioCtx.currentTime, s=natSchedule;
  for(let i=0;i<s.N;i++){ const st=s.startTimes[i], d=s.durations[i]; if(!d) continue; if(now>=st && now<st+d){ highlightChunkWord(s.chunks[i], (now-st)/d); if(speakLabel) speakLabel.textContent = `${t("stop")} · ${i+1}/${s.N}`; if(s.playIndex!==i){ s.playIndex=i; if(s.pump) s.pump(); } break; } }
  natRAF=requestAnimationFrame(natTick);
}
function playNaturalChunk(buf, ch){
  return new Promise((resolve)=>{
    const [first,last]=chunkWordRange(ch); const dur=buf.duration, times=[];
    if(first>=0){ const weights=[]; for(let i=first;i<=last;i++){ const w=readingWords[i]; let x=w.text.length+1; const c=w.text.slice(-1); if(/[,;:]/.test(c))x+=3; else if(/[.?!…]/.test(c))x+=6; weights.push(x); } const tot=weights.reduce((a,b)=>a+b,0)||1; let acc=0; for(let k=0;k<weights.length;k++){ times.push(acc/tot*dur); acc+=weights[k]; } }
    naturalSource=audioCtx.createBufferSource(); naturalSource.buffer=buf; naturalSource.connect(audioCtx.destination);
    const startT=audioCtx.currentTime+0.02;
    naturalSource.onended=()=>{ if(naturalRAF){cancelAnimationFrame(naturalRAF);naturalRAF=null;} resolve(); };
    naturalSource.start(startT);
    if(first>=0){ const tick=()=>{ if(!ttsActive) return; const el=audioCtx.currentTime-startT; let idx=first; for(let k=0;k<times.length;k++){ if(times[k]<=el) idx=first+k; else break; } highlightWordByIndex(idx); naturalRAF=requestAnimationFrame(tick); }; naturalRAF=requestAnimationFrame(tick); }
  });
}
async function speakNatural(raw){
  try{
    speakBtn.classList.add("speaking"); const sic=speakBtn.querySelector(".ic"); if(sic) sic.textContent="\u25A0"; speakLabel.textContent=t("generating");
    startVoiceStatus(state.lang==="spanish" ? "Preparando voz" : state.lang==="portuguese" ? "Preparando voz" : "Preparing voice");
    const lang = state.lang; const chunks = buildSpeechChunks(raw);
    if(!chunks.length){ stopSpeaking(); return; }
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended") await audioCtx.resume();
    const N = chunks.length; const buffers = new Array(N).fill(null);
    natSchedule = { sources:[], startTimes:new Array(N).fill(0), durations:new Array(N).fill(0), chunks, N, playIndex:0, pump:null };
    let genPtr=0, schedPtr=0, nextStart=0, started=false; const LOOKAHEAD = 2;
    const fail=(err)=>{ if(!ttsActive) return; console.error(err); ttsDownloadTarget=null; fallbackToSystem(raw); };
    const chunkFail=(i, err)=>{ if(!ttsActive) return; console.warn("bloque", i, "fallo:", err); if(!started){ fail(err); return; } stopVoiceStatus(state.lang==="spanish" ? "Se interrumpió la voz natural. Toca Reproducir otra vez o usa Sistema." : "Natural voice was interrupted. Press Play again or use System.", true); stopSpeaking(); };
    const resetWatchdog=(ms)=>{ if(natWatchdog) clearTimeout(natWatchdog); natWatchdog=setTimeout(()=>{ if(ttsActive && !started) fallbackToSystem(raw); }, ms); };
    const onGenProg=(pct)=>{ if(ttsActive && !started){ speakLabel.textContent=`Cargando voz ${pct}%`; setVoiceStage((state.lang==="spanish"?"Cargando modelo de voz ":state.lang==="portuguese"?"Carregando modelo de voz ":"Loading voice model ")+pct+"%"); resetWatchdog(60000); } };
    const genChunk=(i)=> neuralBufferBG(lang, chunks[i].text, onGenProg).catch(()=> neuralBufferBG(lang, chunks[i].text));
    const pump=()=>{ while(genPtr<N && (genPtr - natSchedule.playIndex) <= LOOKAHEAD){ const i=genPtr++; genChunk(i).then(buf=>{ if(!ttsActive) return; buffers[i]=buf; schedule(); }).catch(err=>chunkFail(i, err)); } };
    natSchedule.pump = pump;
    const schedule=()=>{ while(schedPtr<N && buffers[schedPtr]){ const i=schedPtr++; const buf=buffers[i]; buffers[i]=null; const src=audioCtx.createBufferSource(); src.buffer=buf; src.connect(audioCtx.destination); if(!started){ nextStart=audioCtx.currentTime+0.10; started=true; showPause(); if(natWatchdog){clearTimeout(natWatchdog);natWatchdog=null;} stopVoiceStatus(""); setMediaSession(true); } if(nextStart < audioCtx.currentTime){ nextStart=audioCtx.currentTime+0.02; } natSchedule.startTimes[i]=nextStart; natSchedule.durations[i]=buf.duration; try{ src.start(nextStart); }catch(e){} natSchedule.sources.push(src); nextStart += buf.duration; if(i===N-1){ src.onended=()=>{ if(ttsActive) stopSpeaking(); }; } speakLabel.textContent=`${t("stop")} · ${i+1}/${N}`; } if(!natRAF) natRAF=requestAnimationFrame(natTick); pump(); };
    pump();
    if(natWatchdog) clearTimeout(natWatchdog);
    natWatchdog = setTimeout(()=>{ if(ttsActive && !started) fallbackToSystem(raw); }, 150000);
  }catch(e){ console.error(e); ttsDownloadTarget=null; fallbackToSystem(raw); }
}

/* ---- vista de lectura ---- */
export function buildReadingView(text){
  const container = $("promptRead"); container.innerHTML = ""; const words = [];
  const frag = document.createDocumentFragment(); const re = /\S+/g; let last = 0, m;
  while((m = re.exec(text))){ if(m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index))); const span = document.createElement("span"); span.className = "w"; span.textContent = m[0]; frag.appendChild(span); words.push({ el: span, start: m.index, end: m.index + m[0].length, text: m[0] }); last = m.index + m[0].length; }
  if(last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  container.appendChild(frag); return words;
}

/* ---- modo "Documento" ---- */
let docListLines = new Set();
let docBoldRanges = new Map();
export function setDocFormat(listLines, boldRanges){ docListLines = listLines || new Set(); docBoldRanges = boldRanges || new Map(); }
function isDocHeading(t){ return /^[A-ZÁÉÍÓÚÑ]\.\s/.test(t) || /^\(\d+\)/.test(t) || /^(fase|phase|wave|move|tier|escenario|scenario|modelo|model|paso|step|parte|part|secci[oó]n|section)\b/i.test(t) || (t.length<72 && /\(\s*\d+\s*[–-]\s*\d+\s*min\s*\)\s*$/.test(t)); }
function classifyDocLines(text){
  const lines = text.split("\n"); const out=[]; let offset=0, nonEmpty=0;
  for(let i=0;i<lines.length;i++){ const raw=lines[i], t=raw.trim(); let kind, marker=false; if(!t){ kind="blank"; } else { nonEmpty++; marker=/^\s*[-*–]\s+/.test(raw); if(docListLines.has(i) || marker){ kind="li"; } else if(nonEmpty===1){ kind="h1"; } else if(nonEmpty===2 && /[·–|]/.test(t) && t.length<140){ kind="sub"; } else if(isDocHeading(t)){ kind="h2"; } else{ kind="p"; } } out.push({ kind, text:raw, start:offset, index:i, marker }); offset += raw.length + 1; }
  return out;
}
function leadInBold(text){ const m=/^(\s*)(\S.{1,46}?[.:—])(\s|$)/.exec(text); if(!m) return null; const s=m[1].length; return [[s, s+m[2].length]]; }
function rangesOverlap(ranges, a, b){ if(!ranges) return false; for(const [s,e] of ranges){ if(a<e && b>s) return true; } return false; }
function fillDocLine(el, ln, withWords, words){
  const text = ln.text; const bold = docBoldRanges.get(ln.index) || (ln.kind==="li" ? leadInBold(text) : null);
  if(withWords){ const re=/\S+/g; let m, cursor=0; while((m=re.exec(text))){ if(m.index>cursor) el.appendChild(document.createTextNode(text.slice(cursor,m.index))); const span=document.createElement("span"); span.className = "w" + (rangesOverlap(bold, m.index, m.index+m[0].length) ? " dv-b" : ""); span.textContent=m[0]; el.appendChild(span); words.push({ el:span, start: ln.start+m.index, end: ln.start+m.index+m[0].length, text:m[0] }); cursor=m.index+m[0].length; } if(cursor<text.length) el.appendChild(document.createTextNode(text.slice(cursor))); }
  else if(bold){ let cursor=0; [...bold].sort((a,b)=>a[0]-b[0]).forEach(([s,e])=>{ if(s>cursor) el.appendChild(document.createTextNode(text.slice(cursor,s))); const b=document.createElement("span"); b.className="dv-b"; b.textContent=text.slice(s,e); el.appendChild(b); cursor=e; }); if(cursor<text.length) el.appendChild(document.createTextNode(text.slice(cursor))); }
  else { el.textContent=text; }
}
export function renderDocInto(container, text, withWords){
  container.innerHTML=""; const words=[]; let curUl=null;
  for(const ln of classifyDocLines(text)){ if(ln.kind==="blank"){ curUl=null; continue; } if(ln.kind==="li"){ if(!curUl){ curUl=document.createElement("ul"); curUl.className="dv-ul"; container.appendChild(curUl); } const li=document.createElement("li"); if(ln.marker) li.className="nomark"; fillDocLine(li, ln, withWords, words); curUl.appendChild(li); continue; } curUl=null; const el=document.createElement("div"); el.className = ln.kind==="h1" ? "dv-h1" : ln.kind==="sub" ? "dv-sub" : ln.kind==="h2" ? "dv-h2" : "dv-p"; fillDocLine(el, ln, withWords, words); container.appendChild(el); }
  return words;
}
export function renderDocView(){
  if(state.docView!=="document") return;
  renderDocInto($("promptDoc"), $("promptText").value||"", false);
  const hint=document.createElement("span"); hint.className="dv-hint";
  hint.textContent = (typeof t==="function" && state.lang==="english") ? "Tap to edit" : "Toca para editar";
  $("promptDoc").appendChild(hint);
}
export function applyDocView(){
  const playing = ttsActive || naturalSource || hfAudioEl || (synth && (synth.speaking||synth.pending));
  if(playing) return;
  const isDoc = state.docView==="document";
  $("promptText").style.display = isDoc ? "none" : ""; $("promptDoc").style.display  = isDoc ? "block" : "none";
  if(isDoc) renderDocView();
}
$("docViewSeg").querySelectorAll("button").forEach(b=>{ b.addEventListener("click", ()=>{ $("docViewSeg").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); state.docView = b.dataset.docview; applyDocView(); }); });
$("promptDoc").addEventListener("click", ()=>{ const simpleBtn=$("docViewSeg").querySelector('[data-docview="simple"]'); if(simpleBtn) simpleBtn.click(); $("promptText").focus(); });
$("promptText").addEventListener("input", ()=>{ docListLines = new Set(); docBoldRanges = new Map(); });

/* ---- chunks de habla ---- */
function buildSpeechChunks(text){
  const MAX = 180, chunks = [];
  const pushSeg = (start, end)=>{ let s = start; while(end - s > MAX){ let cut = s + MAX; const sp = text.lastIndexOf(" ", cut); if(sp > s) cut = sp; if(text.slice(s, cut).trim()) chunks.push({ text: text.slice(s, cut), start: s }); s = cut; } if(text.slice(s, end).trim()) chunks.push({ text: text.slice(s, end), start: s }); };
  let segStart = 0;
  for(let i=0;i<text.length;i++){ const c = text[i]; if(c === "\n" || c === "." || c === "!" || c === "?" || c === "\u2026"){ pushSeg(segStart, i+1); segStart = i+1; } }
  if(segStart < text.length) pushSeg(segStart, text.length);
  return chunks.length ? chunks : [{ text, start:0 }];
}
function chunkWordRange(ch){
  const lo = ch.start, hi = ch.start + ch.text.length; let first = -1, last = -1;
  for(let i=0;i<readingWords.length;i++){ const w = readingWords[i]; if(w.start >= lo && w.start < hi){ if(first < 0) first = i; last = i; } }
  return [first, last];
}
function startChunkMonitor(ch){
  stopMonitor(); const [first, last] = chunkWordRange(ch); if(first < 0) return;
  const cps = 14 * (ttsRate || 1); const times = []; let tm = 0;
  for(let i=first;i<=last;i++){ times.push(tm); const w = readingWords[i]; tm += (w.text.length + 1) / cps; const c = w.text.slice(-1); if(/[,;:]/.test(c)) tm += 0.15; else if(/[.?!\u2026]/.test(c)) tm += 0.30; }
  const startMs = Date.now();
  monitorTimer = setInterval(()=>{ if(lastBoundaryAt && Date.now() - lastBoundaryAt < 1000) return; const el = (Date.now() - startMs) / 1000 + 0.10; let idx = first; for(let k=0;k<times.length;k++){ if(times[k] <= el) idx = first + k; else break; } highlightWordByIndex(idx); }, 60);
}
function speakChunk(){
  if(!ttsActive) return; if(chunkIdx >= speechChunks.length){ stopSpeaking(); return; }
  const ch = speechChunks[chunkIdx]; const u = new SpeechSynthesisUtterance(ch.text);
  u.lang = state.lang==="spanish" ? "es-ES" : state.lang==="portuguese" ? "pt-BR" : "en-US";
  const v = pickVoice(state.lang==="spanish" ? "es" : state.lang==="portuguese" ? "pt" : "en"); if(v) u.voice = v;
  u.rate = ttsRate; u.pitch = 1.0;
  u.onboundary = (e)=>{ if(e.name && e.name !== "word") return; const gi = ch.start + (e.charIndex || 0); let w = null; for(let i=0;i<readingWords.length;i++){ const x = readingWords[i]; if(gi >= x.start && gi < x.end){ w = i; break; } } if(w == null){ for(let i=0;i<readingWords.length;i++){ if(readingWords[i].start >= gi){ w = i; break; } } } if(w != null){ lastBoundaryAt = Date.now(); highlightWordByIndex(w); } };
  u.onstart = ()=>{ startChunkMonitor(ch); };
  u.onend = ()=>{ if(!ttsActive) return; chunkIdx++; speakChunk(); };
  u.onerror = ()=>{ if(!ttsActive) return; chunkIdx++; speakChunk(); };
  synth.speak(u);
}
export function pickVoice(langCode){
  const voices = synth.getVoices() || [];
  return voices.find(v=>v.lang && v.lang.toLowerCase().startsWith(langCode)) || voices.find(v=>v.lang && v.lang.toLowerCase().startsWith(langCode.slice(0,2))) || null;
}

/* ---- ElevenLabs / orator ---- */
function stopHfOrator(){ if(hfAudioEl){ try{ hfAudioEl.pause(); }catch(e){} hfAudioEl=null; } stopVoiceStatus(""); }
async function elTtsChunk(text, voiceId){
  const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/"+(voiceId||EL_VOICE_ID), { method: "POST", headers: { "xi-api-key": EL_API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg" }, body: JSON.stringify({ text: text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.15, similarity_boost: 0.70, style: 0.90, use_speaker_boost: true } }) });
  if(!res.ok){ const errText = await res.text(); throw new Error("ElevenLabs API "+res.status+": "+errText.slice(0,200)); }
  return await res.blob();
}
function playHfAudio(blob, chunkStart, chunkText){
  return new Promise(resolve=>{ const url = URL.createObjectURL(blob); hfAudioEl = new Audio(url);
    if(chunkStart != null && chunkText && typeof highlightWordByIndex === "function"){ hfAudioEl.ontimeupdate = ()=>{ if(!hfAudioEl || !hfAudioEl.duration) return; const frac = hfAudioEl.currentTime / hfAudioEl.duration; const chunkWords = []; for(let i=0;i<readingWords.length;i++){ if(readingWords[i].start >= chunkStart && readingWords[i].start < chunkStart + chunkText.length){ chunkWords.push(i); } } if(chunkWords.length > 0){ const idx = Math.min(Math.floor(frac * chunkWords.length), chunkWords.length-1); highlightWordByIndex(chunkWords[idx]); } }; }
    hfAudioEl.onended = ()=>{ URL.revokeObjectURL(url); hfAudioEl=null; resolve(); };
    hfAudioEl.onerror = ()=>{ URL.revokeObjectURL(url); hfAudioEl=null; resolve(); };
    hfAudioEl.play().catch(()=>{ URL.revokeObjectURL(url); hfAudioEl=null; resolve(); });
  });
}
function buildOratorChunks(raw){
  const segs = state.podcastSegments;
  const usePodcast = segs && segs.length && state.podcastRawText === raw && new Set(segs.map(s=>(s.speaker||"").toLowerCase())).size > 1;
  if(!usePodcast) return buildSpeechChunks(raw).map(c=>({ text:c.text, start:c.start, voiceId:EL_VOICE_ID }));
  const chunks = [];
  for(const seg of segs){
    const segText = raw.slice(seg.start, seg.end);
    const voiceId = voiceForSpeaker(seg.speaker);
    for(const c of buildSpeechChunks(segText)) chunks.push({ text:c.text, start: seg.start + c.start, voiceId });
  }
  return chunks;
}
async function speakHfOrator(raw){
  if(!EL_API_KEY){ const tok = prompt(state.lang==="spanish" ? "Pega tu API key de ElevenLabs (gratis en elevenlabs.io):" : state.lang==="portuguese" ? "Cole sua API key do ElevenLabs (gratis em elevenlabs.io):" : "Paste your ElevenLabs API key (free at elevenlabs.io):"); if(!tok) return; EL_API_KEY = tok.trim(); localStorage.setItem("el_api_key", EL_API_KEY); }
  const chunks = buildOratorChunks(raw); ttsActive = true; lastBoundaryAt = 0;
  speakLabel.textContent = speakStopLabel(); showPause();
  const stageMsg = state.lang==="spanish" ? "Generando voz" : state.lang==="portuguese" ? "Gerando voz" : "Generating voice";
  startVoiceStatus(stageMsg);
  const prefetch = new Map();
  function getChunk(i){ if(i >= chunks.length) return Promise.resolve(null); if(prefetch.has(i)) return prefetch.get(i); const key = chunks[i].voiceId+"|"+chunks[i].text.trim(); if(hfCache.has(key)){ const p = Promise.resolve(hfCache.get(key)); prefetch.set(i, p); return p; } const p = elTtsChunk(chunks[i].text, chunks[i].voiceId).then(blob => { if(!ttsActive) return null; hfCache.set(key, blob); return blob; }); prefetch.set(i, p); return p; }
  let retried = false;
  for(let i=0; i<chunks.length; i++){ if(!ttsActive) break; setVoiceStage(stageMsg+" "+(i+1)+"/"+chunks.length); getChunk(i+1); getChunk(i+2); try{ const blob = await getChunk(i); if(!ttsActive || !blob) break; if(i === 0){ speakBtn.classList.add("speaking"); const sic=speakBtn.querySelector(".ic"); if(sic) sic.textContent="\u25A0"; } stopVoiceStatus(""); await playHfAudio(blob, chunks[i].start, chunks[i].text); }catch(err){ console.error("ElevenLabs TTS error:", err); if(!ttsActive) break; if(!retried){ retried = true; stopVoiceStatus(state.lang==="spanish" ? "Reintentando..." : state.lang==="portuguese" ? "Tentando novamente..." : "Retrying...", false); const key = chunks[i].voiceId+"|"+chunks[i].text.trim(); hfCache.delete(key); prefetch.delete(i); i--; continue; } stopVoiceStatus(state.lang==="spanish" ? "Error de voz IA; cancelando." : state.lang==="portuguese" ? "Erro de voz IA; cancelando." : "AI voice error; cancelling.", true); stopSpeaking(); return; } }
  if(ttsActive) stopSpeaking();
}

/* ---- voz del sistema ---- */
function speakSystem(raw){
  if(state.lang !== "english" && !pickVoice(state.lang==="spanish"?"es":"pt")){ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==="suspended") audioCtx.resume(); speakNatural(raw); return; }
  if(!synth){ setStatus("Tu navegador no soporta la voz del sistema.", true); stopSpeaking(); return; }
  speechChunks = buildSpeechChunks(raw); chunkIdx = 0; ttsRate = 0.8;
  speakBtn.classList.add("speaking"); const sic=speakBtn.querySelector(".ic"); if(sic) sic.textContent="\u25A0"; speakLabel.textContent = speakStopLabel(); synth.cancel(); speakChunk(); showPause();
}
function fallbackToSystem(raw){
  naturalBroken = true;
  if(natWatchdog){ clearTimeout(natWatchdog); natWatchdog=null; }
  if(natRAF){ cancelAnimationFrame(natRAF); natRAF=null; }
  if(natSchedule && natSchedule.sources){ for(const s of natSchedule.sources){ try{ s.onended=null; s.stop(); }catch(e){} } }
  natSchedule=null;
  stopVoiceStatus(state.lang==="spanish" ? "Voz natural no disponible aquí; leyendo con la voz del sistema." : state.lang==="portuguese" ? "Voz natural não disponível aqui; lendo com a voz do sistema." : "Natural voice unavailable here; reading with system voice.");
  ttsActive = true; speakSystem(raw);
}

/* ---- botón Reproducir ---- */
if(speakBtn){
  speakBtn.addEventListener("click", async ()=>{
    if(ttsActive || (synth && (synth.speaking||synth.pending)) || naturalSource || hfAudioEl){ stopSpeaking(); return; }
    const raw = $("promptText").value; if(!raw.trim()) return;
    if(state.docView==="document"){ readingWords = renderDocInto($("promptRead"), raw, true); $("promptRead").classList.add("doc-view"); }
    else { readingWords = buildReadingView(raw); $("promptRead").classList.remove("doc-view"); }
    $("promptText").style.display = "none"; $("promptDoc").style.display = "none"; $("promptRead").style.display = "block";
    ttsActive = true; lastBoundaryAt = 0;
    if(state.voice === "natural" && !naturalBroken){ try{ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==="suspended") await audioCtx.resume(); }catch(e){} speakNatural(raw); }
    else if(state.voice === "orator"){ speakHfOrator(raw); }
    else { if(state.voice === "natural"){ setVoiceStatus(state.lang==="spanish" ? "Voz natural no disponible en este dispositivo; uso la del sistema." : state.lang==="portuguese" ? "Voz natural não disponível neste dispositivo; uso a do sistema." : "Natural voice unavailable on this device; using system voice."); } speakSystem(raw); }
  });
  if(synth && synth.onvoiceschanged !== undefined){ synth.onvoiceschanged = ()=>{}; }
}

/* ---- descargar MP3 ---- */
async function ensureLame(){
  if(lame) return lame; const mod = await import("https://cdn.jsdelivr.net/npm/@breezystack/lamejs@1.2.7/+esm"); lame = mod.default || mod; if(!lame.Mp3Encoder && mod.Mp3Encoder) lame = mod; if(!lame.Mp3Encoder) throw new Error("No se pudo cargar el codificador MP3."); return lame;
}
function float32ToMp3Blob(lamejs, samples, sampleRate){
  const enc = new lamejs.Mp3Encoder(1, sampleRate, 128); const int16 = new Int16Array(samples.length);
  for(let i=0;i<samples.length;i++){ const s = Math.max(-1, Math.min(1, samples[i])); int16[i] = s<0 ? s*0x8000 : s*0x7FFF; }
  const data = [], block = 1152;
  for(let i=0;i<int16.length;i+=block){ const buf = enc.encodeBuffer(int16.subarray(i, i+block)); if(buf.length>0) data.push(new Uint8Array(buf)); }
  const end = enc.flush(); if(end.length>0) data.push(new Uint8Array(end));
  return new Blob(data, { type:"audio/mpeg" });
}
async function onDownloadAudio(){
  const dlAudioBtn = $("dlAudioBtn"); if(!dlAudioBtn) return;
  const text = ($("promptText").value || "").trim(); if(!text){ setStatus("Escribe primero el texto que quieres descargar.", true); return; }
  dlAudioBtn.disabled = true; const orig = t("dlmp3");
  try{ const dlAudioLabel = $("dlAudioLabel"); if(dlAudioLabel) dlAudioLabel.textContent = "Generando…"; const { samples, sr } = await neuralSamples(state.lang, text); if(dlAudioLabel) dlAudioLabel.textContent = "Codificando…"; const lamejs = await ensureLame(); const blob = float32ToMp3Blob(lamejs, samples, sr); if(ttsAudioUrl) URL.revokeObjectURL(ttsAudioUrl); ttsAudioUrl = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = ttsAudioUrl; a.download = (state.lang==="spanish" ? "pronunciacion-es" : state.lang==="portuguese" ? "pronunciacao-pt" : "pronunciation-en") + ".mp3"; document.body.appendChild(a); a.click(); a.remove(); if(dlAudioLabel) dlAudioLabel.textContent = "Descargado ✓"; setTimeout(()=>{ if(dlAudioLabel) dlAudioLabel.textContent = orig; }, 1800); }
  catch(err){ console.error(err); const dlAudioLabel = $("dlAudioLabel"); if(dlAudioLabel) dlAudioLabel.textContent = orig; setStatus("No se pudo generar el audio: " + ((err && err.message) || err), true); }
  finally{ dlAudioBtn.disabled = false; }
}
const dlAudioBtn = $("dlAudioBtn");
if(dlAudioBtn) dlAudioBtn.addEventListener("click", onDownloadAudio);

/* ---- warmVoice (desactivado por ahora) ---- */
export async function warmVoice(){}

export function getAudioCtx(){
  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  return audioCtx;
}
