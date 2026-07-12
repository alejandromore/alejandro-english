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
