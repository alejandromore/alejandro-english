/* ---------------- state: estado compartido y helpers ---------------- */
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5";

// Allow remote models from the Hugging Face Hub; disable local file lookups.
env.allowLocalModels = false;

export { pipeline, env };

export const state = {
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
  wpImproveWords: [],
  analyzeCanceled: false,
  podcastSegments: null,
  podcastRawText: null,
};

export const $ = (id) => document.getElementById(id);

export function wireSeg(segId, key){
  $(segId).querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", ()=>{
      $(segId).querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false"));
      b.setAttribute("aria-pressed","true");
      state[key] = b.dataset[key] || b.dataset.lang || b.dataset.size;
    });
  });
}

export function fmtDur(s){ const m=Math.floor(s/60), r=Math.round(s%60); return m?`${m}m ${r}s`:`${r}s`; }

/* ---------------- UI helpers compartidos ---------------- */
const _statusEl = () => $("status");
const _bar = () => $("bar");
const _barFill = () => { const b = $("bar"); return b ? b.querySelector("i") : null; };

export function setStatus(msg, isErr=false){
  const el = _statusEl(); if(!el) return;
  el.innerHTML = msg; el.classList.toggle("err", isErr);
}
export function showBar(busy=true){
  const b = _bar(); if(!b) return;
  b.style.display="block"; b.classList.toggle("busy",busy);
}
export function setBar(p){
  const f = _barFill(); if(!f) return;
  f.style.width = Math.max(0,Math.min(100,p))+"%";
}
export function hideBar(){ const b = _bar(); if(!b) return; b.style.display="none"; setBar(0); }
