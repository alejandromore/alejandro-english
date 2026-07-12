/* ---------------- phonetics: fonética y práctica de palabras ---------------- */
import { state, $, pipeline, setStatus, showBar, hideBar } from './state.js';
import { t } from './i18n.js';
import { stopSpeaking, neuralBuffer, pickVoice, synth, getAudioCtx } from './tts.js';
import { getASR, decodeTo16k } from './analysis.js';
import { getCSS } from './render.js';

/* ---- diccionario de pronunciación ---- */
export let cmudict = null;
let phonDebounce = null;
async function ensureDict(){
  if(cmudict) return cmudict;
  const mod = await import("https://cdn.jsdelivr.net/npm/cmu-pronouncing-dictionary@3.0.0/index.js");
  cmudict = mod.dictionary || mod.default || mod;
  return cmudict;
}

export const PH_VOWELS = new Set(["AA","AE","AH","AO","AW","AY","EH","ER","EY","IH","IY","OW","OY","UH","UW"]);
export const ARPA_IPA = {
  AA:"ɑ",AE:"æ",AH:"ə",AO:"ɔ",AW:"aʊ",AY:"aɪ",EH:"ɛ",ER:"ɝ",EY:"eɪ",IH:"ɪ",IY:"i",OW:"oʊ",OY:"ɔɪ",UH:"ʊ",UW:"u",
  B:"b",CH:"tʃ",D:"d",DH:"ð",F:"f",G:"g",HH:"h",JH:"dʒ",K:"k",L:"l",M:"m",N:"n",NG:"ŋ",P:"p",R:"ɹ",S:"s",SH:"ʃ",T:"t",TH:"θ",V:"v",W:"w",Y:"j",Z:"z",ZH:"ʒ"
};
const ARPA_ES = {
  AA:"a",AE:"a",AH:"a",AO:"o",AW:"au",AY:"ai",EH:"e",ER:"er",EY:"ei",IH:"i",IY:"ii",OW:"ou",OY:"oi",UH:"u",UW:"uu",
  B:"b",CH:"ch",D:"d",DH:"d",F:"f",G:"g",HH:"j",JH:"y",K:"k",L:"l",M:"m",N:"n",NG:"ng",P:"p",R:"r",S:"s",SH:"sh",T:"t",TH:"z",V:"v",W:"u",Y:"y",Z:"z",ZH:"y"
};
const ACC = { a:"á",e:"é",i:"í",o:"ó",u:"ú" };

function esFallback(wordRaw){
  let s = (wordRaw||"").toLowerCase().replace(/[^a-z]/g,""); if(!s) return "";
  const rep = (re,to)=>{ s = s.replace(re,to); };
  rep(/tch/g,"C"); rep(/ch/g,"C"); rep(/sh/g,"S"); rep(/eigh/g,"Ei"); rep(/igh/g,"Ai"); rep(/augh|ough/g,"O"); rep(/tion\b/g,"Son"); rep(/sion\b/g,"Son"); rep(/cious\b|tious\b/g,"Sas"); rep(/ture\b/g,"Cer"); rep(/ph/g,"f"); rep(/th/g,"Z"); rep(/ck/g,"k"); rep(/qu/g,"ku"); rep(/wh/g,"u"); rep(/x/g,"ks"); rep(/^kn/g,"n"); rep(/^wr/g,"r"); rep(/mb\b/g,"m"); rep(/gh/g,""); rep(/c(?=[eiy])/g,"s"); rep(/c/g,"k"); rep(/g(?=[eiy])/g,"Y"); rep(/a([^aeiou])e\b/g,"Ei$1"); rep(/i([^aeiou])e\b/g,"Ai$1"); rep(/o([^aeiou])e\b/g,"Ou$1"); rep(/u([^aeiou])e\b/g,"Iu$1"); rep(/e([^aeiou])e\b/g,"Ii$1"); rep(/ee/g,"Ii"); rep(/ea/g,"Ii"); rep(/oo/g,"Uu"); rep(/ou/g,"Au"); rep(/ow/g,"Au"); rep(/oa/g,"Ou"); rep(/oi|oy/g,"Oi"); rep(/ai|ay/g,"Ei"); rep(/ey/g,"I"); rep(/au|aw/g,"O"); rep(/ew/g,"Iu"); rep(/ie/g,"Ai"); rep(/er|ir|ur/g,"Er"); rep(/^y/g,"Y"); rep(/j/g,"Y"); rep(/w/g,"u"); rep(/h/g,"y"); rep(/z/g,"s"); rep(/y/g,"i"); rep(/([^aeiou])e\b/g,"$1"); rep(/([bcdfgklmnprstv])\1/g,"$1"); rep(/C/g,"ch"); rep(/S/g,"sh"); rep(/Z/g,"z"); rep(/Y/g,"y");
  return s.toLowerCase();
}

export function stripStress(tok){ return tok.replace(/\d$/,""); }
export function isVowelPh(ph){ return PH_VOWELS.has(stripStress(ph||"")); }
export function editDistance(a,b){
  const n=a.length,m=b.length,dp=[];
  for(let i=0;i<=n;i++) dp[i]=[i]; for(let j=0;j<=m;j++) dp[0][j]=j;
  for(let i=1;i<=n;i++) for(let j=1;j<=m;j++){ const c=a[i-1]===b[j-1]?0:1; dp[i][j]=Math.min(dp[i-1][j-1]+c, dp[i-1][j]+1, dp[i][j-1]+1); }
  return dp[n][m];
}
export function alignPh(a,b){
  const n=a.length,m=b.length,dp=[];
  for(let i=0;i<=n;i++) dp[i]=[i]; for(let j=0;j<=m;j++) dp[0][j]=j;
  for(let i=1;i<=n;i++) for(let j=1;j<=m;j++){ const c=a[i-1]===b[j-1]?0:1; dp[i][j]=Math.min(dp[i-1][j-1]+c, dp[i-1][j]+1, dp[i][j-1]+1); }
  let i=n,j=m; const ops=[];
  while(i>0||j>0){ if(i>0&&j>0 && dp[i][j]===dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1)){ ops.push({t:a[i-1],r:b[j-1],op:a[i-1]===b[j-1]?"match":"sub"}); i--; j--; } else if(i>0 && dp[i][j]===dp[i-1][j]+1){ ops.push({t:a[i-1],r:null,op:"del"}); i--; } else { ops.push({t:null,r:b[j-1],op:"ins"}); j--; } }
  return ops.reverse();
}

function syllabify(ph){
  const isV = p => PH_VOWELS.has(stripStress(p)); const V = []; ph.forEach((p,i)=>{ if(isV(p)) V.push(i); });
  if(V.length <= 1) return [ph]; const bounds = [0];
  for(let k=1;k<V.length;k++){ const prevV=V[k-1], curV=V[k], nCons=curV-prevV-1; bounds.push(nCons<=0 ? curV : curV-1); }
  bounds.push(ph.length); const syls=[];
  for(let i=0;i<bounds.length-1;i++) syls.push(ph.slice(bounds[i], bounds[i+1]));
  return syls;
}
function sylRespell(tokens){
  let out=""; tokens.forEach((tok,i)=>{ const st=(tok.match(/(\d)$/)||[])[1]||null, phn=tok.replace(/\d$/,""); let es=ARPA_ES[phn]||""; if(phn==="G"){ const nxt=tokens[i+1]?tokens[i+1].replace(/\d$/,""):""; if(["IY","IH","EY","EH","AE"].includes(nxt)) es="gu"; } if(PH_VOWELS.has(phn) && st==="1") es=es.replace(/[aeiou]/, c=>ACC[c]||c); out+=es; });
  return out||"•";
}
function syllabifySpanish(w){
  w=(w||"").toLowerCase(); const V="aeiouáéíóúüàèìòù", weak="iuü", accented="áéíóú"; const isV=c=>V.includes(c); const toks=[];
  for(let i=0;i<w.length;){ const c=w[i], c2=w[i+1]||"", c3=w[i+2]||""; if(isV(c)){ toks.push({t:'V',s:c,i}); i+=1; continue; } if((c==='c'&&c2==='h')||(c==='l'&&c2==='l')||(c==='r'&&c2==='r')){ toks.push({t:'C',s:c+c2,i}); i+=2; continue; } if(c==='q'&&c2==='u'){ toks.push({t:'C',s:'qu',i}); i+=2; continue; } if(c==='g'&&c2==='u'&&/[eié]/.test(c3)){ toks.push({t:'C',s:'gu',i}); i+=2; continue; } toks.push({t:'C',s:c,i}); i+=1; }
  const nuclei=[]; let i=0;
  while(i<toks.length){ if(toks[i].t==='V'){ const group=[toks[i]]; let j=i+1; while(j<toks.length && toks[j].t==='V'){ const a=group[group.length-1].s, b=toks[j].s; const aStrong=!weak.includes(a), bStrong=!weak.includes(b); const aAcc=accented.includes(a), bAcc=accented.includes(b); if((aStrong&&bStrong)||(weak.includes(a)&&aAcc)||(weak.includes(b)&&bAcc)) break; group.push(toks[j]); j++; } nuclei.push({toks:group}); i=j; } else i++; }
  const insepar=new Set(["pr","br","tr","dr","cr","gr","fr","pl","bl","cl","gl","fl","tl"]); const idxOf=tok=>toks.indexOf(tok); const syls=[];
  for(let n=0;n<nuclei.length;n++){ const nuc=nuclei[n]; const firstTokIdx=idxOf(nuc.toks[0]); const lastTokIdx=idxOf(nuc.toks[nuc.toks.length-1]); let onsetStart; if(n===0) onsetStart=0; else { const prevLast=idxOf(nuclei[n-1].toks[nuclei[n-1].toks.length-1]); const cons=[]; for(let k=prevLast+1;k<firstTokIdx;k++) cons.push(toks[k]); const nc=cons.length; if(nc===0) onsetStart=firstTokIdx; else if(nc===1) onsetStart=firstTokIdx-1; else { const lastTwo=cons[nc-2].s+cons[nc-1].s; onsetStart=insepar.has(lastTwo)?(firstTokIdx-2):(firstTokIdx-1); } } let end; if(n===nuclei.length-1) end=toks.length; else { const nextFirst=idxOf(nuclei[n+1].toks[0]); const cons=[]; for(let k=lastTokIdx+1;k<nextFirst;k++) cons.push(toks[k]); const nc=cons.length; if(nc===0) end=lastTokIdx+1; else if(nc===1) end=lastTokIdx+1; else { const lastTwo=cons[nc-2].s+cons[nc-1].s; end=insepar.has(lastTwo)?(nextFirst-2):(nextFirst-1); } } const start=(n===0)?0:onsetStart; let str=""; for(let k=start;k<end;k++) str+=toks[k].s; const cstart=toks[start]?toks[start].i:0; syls.push({str, cstart, cend:cstart+str.length}); }
  return syls.length ? syls : [{str:w, cstart:0, cend:w.length}];
}
function syllabifyEnglishSpelling(w){
  w=(w||"").toLowerCase().replace(/[^a-z]/g,""); const V="aeiouy", isV=c=>V.includes(c); const nuclei=[]; let i=0;
  while(i<w.length){ if(isV(w[i])){ let j=i; while(j<w.length&&isV(w[j])) j++; nuclei.push([i,j-1]); i=j; } else i++; }
  if(nuclei.length<=1) return [{str:w,cstart:0,cend:w.length}];
  const insepar=new Set(["pr","br","tr","dr","cr","gr","fr","pl","bl","cl","gl","fl","sp","st","sk","sh","ch","th","wh","ph","sc","sm","sn","sl","sw","tw"]); const bounds=[0];
  for(let k=1;k<nuclei.length;k++){ const prevEnd=nuclei[k-1][1], curStart=nuclei[k][0], nCons=curStart-prevEnd-1; let b; if(nCons<=0) b=curStart; else if(nCons===1) b=curStart-1; else { const lastTwo=w.slice(curStart-2,curStart); b=insepar.has(lastTwo)?curStart-2:curStart-1; } bounds.push(b); }
  bounds.push(w.length); const syls=[];
  for(let k=0;k<bounds.length-1;k++){ const a=bounds[k],e=bounds[k+1]; syls.push({str:w.slice(a,e),cstart:a,cend:e}); }
  return syls;
}

function arpaToForms(pron){
  const toks = pron.trim().split(/\s+/);
  const syls = syllabify(toks); let ipa = "";
  syls.forEach(syl=>{ let stress = null; for(const tk of syl){ const p=tk.replace(/\d$/,""); if(PH_VOWELS.has(p)){ stress=(tk.match(/(\d)$/)||[])[1]||null; break; } } if(syls.length>1 && stress==="1") ipa += "'"; else if(syls.length>1 && stress==="2") ipa += "ˌ"; for(const tk of syl){ const st=(tk.match(/(\d)$/)||[])[1]||null, ph=tk.replace(/\d$/,""); let sym = ARPA_IPA[ph] || ""; if(ph==="AH" && st==="0") sym = "ə"; if(ph==="ER" && st==="0") sym = "ɚ"; ipa += sym; } });
  let es = "";
  toks.forEach((tok,i)=>{ const st = (tok.match(/(\d)$/)||[])[1] || null; const ph = tok.replace(/\d$/,""); let esSym = ARPA_ES[ph] || ""; if(ph==="G"){ const nxt = toks[i+1] ? toks[i+1].replace(/\d$/,"") : ""; if(["IY","IH","EY","EH","AE"].includes(nxt)) esSym = "gu"; } if(PH_VOWELS.has(ph) && st==="1"){ esSym = esSym.replace(/[aeiou]/, c=>ACC[c]||c); } es += esSym; });
  return { ipa: "/"+ipa+"/", es };
}

/* ---- render del panel de fonética ---- */
export function renderPhonetics(){
  const panel = $("phoneticPanel"); if(!panel.classList.contains("on")) return;
  const cont = $("phonWords"); if(!cmudict){ return; }
  const words = ($("promptText").value || "").split(/\s+/).filter(Boolean).slice(0,150);
  cont.innerHTML = "";
  if(!words.length){ cont.innerHTML = '<span class="phon-note">Escribe una palabra o frase arriba.</span>'; return; }
  const frag = document.createDocumentFragment();
  words.forEach(w=>{ const clean = w.toLowerCase().replace(/^[^a-z']+|[^a-z']+$/g,""); if(!clean) return; const pron = cmudict[clean]; const div = document.createElement("div"); div.className = "pw" + (pron ? "" : " unknown"); const en = document.createElement("span"); en.className="pw-en"; en.textContent = w; const es = document.createElement("span"); es.className="pw-es"; const ipa = document.createElement("span"); ipa.className="pw-ipa"; if(pron){ const f = arpaToForms(pron); es.textContent = f.es; ipa.textContent = f.ipa; } else { const fb = esFallback(clean); if(fb){ div.className = "pw approx"; es.textContent = fb; ipa.textContent = "~ aprox."; } else { es.textContent = "-"; ipa.textContent = "no está en el diccionario"; } } div.append(en, es, ipa); frag.appendChild(div); });
  cont.appendChild(frag);
}

const phonBtn = $("phonBtn");
if(phonBtn){
  phonBtn.addEventListener("click", async ()=>{
    const panel = $("phoneticPanel"); const on = panel.classList.toggle("on");
    phonBtn.setAttribute("aria-pressed", on ? "true" : "false"); if(!on) return;
    if(!cmudict){ $("phonWords").innerHTML = '<span class="phon-note">Cargando diccionario de pronunciación…</span>'; try{ await ensureDict(); } catch(e){ console.error(e); $("phonWords").innerHTML = '<span class="phon-note err">No se pudo cargar el diccionario. Revisa tu conexión.</span>'; return; } }
    renderPhonetics();
  });
  $("promptText").addEventListener("input", ()=>{ clearTimeout(phonDebounce); phonDebounce = setTimeout(renderPhonetics, 250); });
}

/* ==================== práctica de palabras (estilo ELSA) ==================== */
const wordBtn=$("wordBtn"), wordPanel=$("wordPanel");
export { wordPanel };
const wpChipsEl=$("wpChips"), wpInput=$("wpInput"), wpLoadBtn=$("wpLoadBtn");
const wpCard=$("wpCard"), wpWordEl=$("wpWord"), wpIpaEl=$("wpIpa"), wpEsEl=$("wpEs");
const wpPhonEl=$("wpPhon"), wpListen=$("wpListen"), wpRecBtn=$("wpRec"), wpRecLabel=$("wpRecLabel"), wpResult=$("wpResult");
let wpTarget="", wpTargetPh=null, wpSyllables=[];
let wpEngine="whisper", acousticASR=null;
const ACOUSTIC_MODEL = "Xenova/wav2vec2-base-960h";

const WP_CONFUSIONS = [
  { set:["IY","IH"], tip:"Diferencia sheep /iː/ (largo y tenso) de ship /ɪ/ (corto y relajado)." },
  { set:["V","B"],   tip:"La V se hace con los dientes sobre el labio inferior; no la vuelvas B." },
  { set:["Z","S"],   tip:"La Z inglesa vibra (zumbido); la S es sorda, sin vibración." },
  { set:["DH","D"],  tip:"En «th» de this saca la lengua entre los dientes; no es una D." },
  { set:["TH","T"],  tip:"En «th» de think saca la lengua entre los dientes; no es una T." },
  { set:["SH","CH"], tip:"«sh» es continua (shhh); «ch» es un golpe seco." },
  { set:["NG","N"],  tip:"«ng» resuena en la nariz sin cerrar con una G dura al final." },
  { set:["AE","EH"], tip:"En cat la «a» es más abierta que la e; baja la mandíbula." },
];

async function ensureAcoustic(){
  if(acousticASR) return acousticASR;
  setStatus(`Cargando modelo acústico — ${ACOUSTIC_MODEL}`); showBar();
  acousticASR = await pipeline("automatic-speech-recognition", ACOUSTIC_MODEL, { progress_callback:(e)=>{ if(e.status==="progress" && e.progress!=null) setBar(e.progress); } });
  return acousticASR;
}
let wpStream=null, wpRecorder=null, wpChunks=[], wpRecording=false, wpAutoStop=null;

function wpPhonemes(word){ if(!cmudict) return null; const clean=(word||"").toLowerCase().replace(/[^a-z']/g,""); const pron=cmudict[clean]; return pron ? pron.trim().split(/\s+/) : null; }

/* ---- boca esquemática ---- */
const PHON_CAT = { P:"together",B:"together",M:"together", F:"teethlip",V:"teethlip", TH:"th",DH:"th", T:"tip",D:"tip",N:"tip",L:"tip",S:"tip",Z:"tip", SH:"neutral",ZH:"neutral",CH:"neutral",JH:"neutral",R:"neutral",Y:"neutral",K:"neutral",G:"neutral",NG:"neutral",HH:"neutral", W:"round",UW:"round",UH:"round",OW:"round",AO:"round",OY:"round",AW:"round", IY:"spread",IH:"spread",EY:"spread",EH:"spread", AE:"open",AA:"open",AH:"open",AY:"open", ER:"neutral" };
const CAT_CUE = { together:"Junta los labios y suéltalos con un golpe de aire.", teethlip:"Apoya los dientes de arriba sobre el labio de abajo y sopla.", th:"Saca un poco la lengua entre los dientes y deja salir el aire.", round:"Redondea bien los labios, como para silbar.", spread:"Estira los labios hacia los lados, como sonriendo.", open:"Abre bien la boca y baja la mandíbula.", tip:"Punta de la lengua tocando detrás de los dientes de arriba.", neutral:"Boca relajada, ligeramente abierta." };
function mouthSVG(cat){
  const cx=80, cy=60, dur="1.5s"; const anim=(el,attr,vals)=>`<animate attributeName="${attr}" values="${vals}" dur="${dur}" repeatCount="indefinite"/>`; const ell=(lrx,lry,crx,cry)=>({ lips: anim(0,"rx",lrx)+anim(0,"ry",lry), cav: anim(0,"rx",crx)+anim(0,"ry",cry) });
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
function keyPhonemeOfSyllable(syl){ if(!syl || syl.start==null || !wpTargetPh) return null; const toks=wpTargetPh.slice(syl.start, syl.end).map(stripStress); const hard=["TH","DH","V","Z","SH","ZH","JH","R","NG","W"]; for(const h of hard){ if(toks.includes(h)) return h; } const vowel=toks.find(t=>PH_VOWELS.has(t)); if(vowel) return vowel; return toks[0]||null; }
function letterCategory(s){ s=(s||"").toLowerCase(); if(/th/.test(s)) return "th"; if(/[fv]/.test(s)) return "teethlip"; if(/^[pbm]/.test(s)) return "together"; if(/[uo]/.test(s)) return "round"; if(/i/.test(s)) return "spread"; if(/a/.test(s)) return "open"; return "neutral"; }
function showSyllableMouth(idx){
  const syl=wpSyllables[idx]; if(!syl) return; const m=$("wpMouth");
  if(wpMouthIdx===idx && m.style.display!=="none"){ m.style.display="none"; wpMouthIdx=-1; [...wpPhonEl.children].forEach(c=>c.classList.remove("picked")); return; }
  wpMouthIdx=idx; [...wpPhonEl.children].forEach((c,i)=>c.classList.toggle("picked", i===idx));
  let cat, label; const kp=keyPhonemeOfSyllable(syl);
  if(kp){ cat=PHON_CAT[kp]||"neutral"; label=ARPA_IPA[kp]||kp.toLowerCase(); } else { cat=letterCategory(syl.respell||syl.str||""); label=""; }
  m.innerHTML = mouthSVG(cat) + (label?`<div class="mk">/${label}/</div>`:"") + `<div class="mc">${CAT_CUE[cat]}</div>` + `<button class="mslow" id="wpMouthSlow"><span>🐢</span> Escuchar «${syl.respell||syl.str||wpTarget}» lento</button>`;
  m.style.display="flex"; const b=$("wpMouthSlow"); if(b) b.addEventListener("click", ()=>wpDoListen(0.55));
}
function renderTargetBlocks(){
  wpPhonEl.innerHTML=""; wpSyllables=[]; wpMouthIdx=-1; const mm=$("wpMouth"); if(mm) mm.style.display="none";
  const addBlock=(txt)=>{ const b=document.createElement("div"); b.className="wp-syl"; b.innerHTML=`<span class="txt">${txt}</span>`; const idx=wpSyllables.length-1; b.addEventListener("click", ()=>showSyllableMouth(idx)); wpPhonEl.appendChild(b); };
  if(state.lang==="spanish" || state.lang==="portuguese"){ syllabifySpanish(wpTarget).forEach(s=>{ wpSyllables.push({ cstart:s.cstart, cend:s.cend, respell:s.str, letters:true }); addBlock(s.str); }); return; }
  if(wpTargetPh && wpTargetPh.length){ let idx=0; syllabify(wpTargetPh).forEach(g=>{ const start=idx, end=idx+g.length; idx=end; const respell=sylRespell(g); wpSyllables.push({start,end,respell}); addBlock(respell); }); } else { syllabifyEnglishSpelling(wpTarget).forEach(s=>{ wpSyllables.push({ cstart:s.cstart, cend:s.cend, respell:s.str, letters:true }); addBlock(s.str); }); }
}
function loadWord(word){
  const shown=(word||"").trim(); if(!shown) return; wpStopRec(); wpStopListen();
  const isEs = state.lang==="spanish" || state.lang==="portuguese";
  wpTarget=shown.toLowerCase().replace(isEs?/[^a-z\p{L}'-]/g:/[^a-z']/g,""); wpTargetPh = isEs ? null : wpPhonemes(wpTarget);
  wpCard.style.display="block"; wpWordEl.textContent=shown;
  if(isEs){ wpIpaEl.textContent = syllabifySpanish(wpTarget).map(s=>s.str).join("·"); wpEsEl.textContent = ""; }
  else if(wpTargetPh){ const f=arpaToForms(wpTargetPh.join(" ")); wpIpaEl.textContent=f.ipa; wpEsEl.textContent="~ "+f.es; }
  else { wpIpaEl.textContent = syllabifyEnglishSpelling(wpTarget).map(s=>s.str).join("·"); wpEsEl.textContent = ""; }
  renderTargetBlocks(); wpResult.innerHTML="";
  const q = encodeURIComponent(wpTarget); const yg = state.lang==="spanish" ? "spanish" : state.lang==="portuguese" ? "portuguese" : "english/us"; const ytq = state.lang==="spanish" ? "cómo+se+pronuncia+" : state.lang==="portuguese" ? "como+se+pronuncia+" : "how+to+pronounce+";
  $("wpYouglish").href = `https://youglish.com/pronounce/${q}/${yg}`; $("wpYoutube").href  = `https://www.youtube.com/results?search_query=${ytq}${q}`;
  [...wpChipsEl.children].forEach(c=>{ if(c.setAttribute) c.setAttribute("aria-pressed",(c.textContent||"").toLowerCase()===wpTarget?"true":"false"); });
}

export function buildWpChips(){
  wpChipsEl.innerHTML=""; const note = $("wpPickNote");
  if(state.wpImproveWords && state.wpImproveWords.length){
    if(note) note.innerHTML = `<b>${state.wpImproveWords.length}</b> palabras a mejorar de tu última lectura · <button type="button" class="wp-all-link" id="wpAllLink">ver todas</button>`;
    state.wpImproveWords.forEach(({word,sev})=>{ const b=document.createElement("button"); b.className="wp-chip sev"+sev; b.type="button"; b.setAttribute("aria-pressed", word===wpTarget?"true":"false"); b.innerHTML = `<span class="dot"></span>${word}`; b.addEventListener("click", ()=>loadWord(word)); wpChipsEl.appendChild(b); });
    const allLink = $("wpAllLink"); if(allLink) allLink.addEventListener("click", ()=>buildWpChipsAll()); return;
  }
  buildWpChipsAll();
}
function buildWpChipsAll(){
  const seen=new Set(), words=[]; const clean = state.lang==='spanish' || state.lang==='portuguese' ? /[^a-z\p{L}'-]/g : /[^a-z']/g;
  ($("promptText").value||"").split(/\s+/).forEach(w=>{ const c=w.toLowerCase().replace(clean,""); if(c.length>=2 && !seen.has(c)){ seen.add(c); words.push(c); } });
  wpChipsEl.innerHTML=""; const note = $("wpPickNote");
  if(!words.length){ if(note) note.textContent=""; wpChipsEl.innerHTML='<span style="font-size:12px;color:var(--muted)">Escribe texto arriba, o teclea una palabra abajo.</span>'; return; }
  if(note) note.textContent = state.wpImproveWords.length ? "" : "Todas las palabras del texto. Graba con «Comparar lectura» en On para ver solo las que fallaste.";
  words.slice(0,40).forEach(w=>{ const b=document.createElement("button"); b.className="wp-chip"; b.type="button"; b.setAttribute("aria-pressed", w===wpTarget?"true":"false"); b.textContent=w; b.addEventListener("click", ()=>loadWord(w)); wpChipsEl.appendChild(b); });
}

/* ---- escuchar el modelo ---- */
function wpStopListen(){ if(synth) synth.cancel(); wpListen.classList.remove("on"); }
async function wpDoListen(rate=1){
  if(!wpTarget) return; const word = wpWordEl.textContent || wpTarget;
  try{ stopSpeaking(); const ctx = getAudioCtx(); if(ctx.state==="suspended") await ctx.resume(); wpListen.classList.add("on"); const buf = await neuralBuffer(state.lang, word); const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate; src.connect(ctx.destination); src.onended = ()=> wpListen.classList.remove("on"); src.start(); return; }catch(e){ console.warn("Voz neural no disponible para la palabra, uso sistema:", e); wpListen.classList.remove("on"); }
  if(!synth) return; synth.cancel(); const u=new SpeechSynthesisUtterance(word); u.lang=state.lang==="spanish"?"es-ES":state.lang==="portuguese"?"pt-BR":"en-US"; const v=pickVoice(state.lang==="spanish"?"es":state.lang==="portuguese"?"pt":"en"); if(v) u.voice=v; u.rate = rate<1 ? 0.5 : 0.75; synth.speak(u);
}

/* ---- grabar ---- */
async function wpStartRec(){
  if(state.recording){ wpResult.innerHTML='<span class="wp-tip err">Detén la grabación principal primero.</span>'; return; }
  const md=navigator.mediaDevices;
  if(!window.isSecureContext || !md || !md.getUserMedia){ wpResult.innerHTML='<span class="wp-tip err">El micrófono necesita una página segura (https). Usa <b>Upload audio</b>: graba con tu teléfono y sube el archivo.</span>'; return; }
  try{ wpStream=await md.getUserMedia({audio:true}); }catch(e){ let msg="No se pudo abrir el micrófono. Usa <b>Upload audio</b> en su lugar."; if(e && (e.name==="NotAllowedError" || e.name==="SecurityError")) msg="Permiso de micrófono denegado. Actívalo en los ajustes del sitio, o usa <b>Upload audio</b>."; else if(e && e.name==="NotFoundError") msg="No se encontró micrófono en este dispositivo. Usa <b>Upload audio</b>."; wpResult.innerHTML='<span class="wp-tip err">'+msg+'</span>'; return; }
  wpChunks=[]; wpRecorder=new MediaRecorder(wpStream); wpRecorder.ondataavailable=e=>{ if(e.data.size) wpChunks.push(e.data); }; wpRecorder.onstop=async ()=>{ try{ wpStream.getTracks().forEach(t=>t.stop()); }catch(e){} const blob=new Blob(wpChunks,{type:wpRecorder.mimeType||"audio/webm"}); await wpScore(blob); }; wpRecorder.start(); wpRecording=true; wpRecBtn.classList.add("on"); wpRecLabel.textContent="Stop"; wpResult.innerHTML='<span class="wp-scoring">Escuchando… di la palabra.</span>'; clearTimeout(wpAutoStop); wpAutoStop=setTimeout(()=>{ if(wpRecording) wpStopRec(); }, 4000);
}
function wpStopRec(){ if(!wpRecording) return; wpRecording=false; clearTimeout(wpAutoStop); wpRecBtn.classList.remove("on"); wpRecLabel.textContent="Record"; try{ wpRecorder.stop(); }catch(e){} }
async function wpScore(blob){
  wpResult.innerHTML='<span class="wp-scoring">Analizando…</span>';
  try{
    const { audio }=await decodeTo16k(blob); if(!audio || audio.length<1200){ wpResult.innerHTML='<span class="wp-tip">Muy corto. Di la palabra completa y vuelve a intentarlo.</span>'; return; }
    let heard;
    if(wpEngine==="acoustic"){ const asr=await ensureAcoustic(); const out=await asr(audio); heard=(out.text||"").trim(); }
    else { const asr=await getASR(); const opts={ chunk_length_s:30 }; if(state.lang!=="english"){ opts.language=state.lang; opts.task="transcribe"; } const out=await asr(audio, opts); heard=(out.text||"").trim(); }
    hideBar(); setStatus("Listo — palabra analizada.");
    if(!heard || !/[a-z']/i.test(heard)){ wpResult.innerHTML = '<span class="wp-tip">No se captó la palabra. ' + (wpEngine==="acoustic" ? 'El motor acústico a veces no la detecta — prueba «Whisper» en Setup, o repite más cerca del micrófono.' : 'Repite más claro y cerca del micrófono.') + '</span>'; return; }
    renderWordScore(heard, wpEngine);
  }catch(e){ console.error(e); hideBar(); wpResult.innerHTML='<span class="wp-tip err">No se pudo analizar: '+((e&&e.message)||e)+'</span>'; }
}
function renderWordScore(heard, engine){
  const isEs = state.lang==="spanish" || state.lang==="portuguese"; const wordRe = isEs ? /[a-záéíóúüñ']+/g : /[a-z']+/g; const tokens=(heard.toLowerCase().match(wordRe))||[]; let recog=tokens[0]||"";
  if(tokens.length>1 && wpTarget){ let best=Infinity; for(const t of tokens){ const d=editDistance([...t],[...wpTarget]); if(d<best){ best=d; recog=t; } } }
  const blocks=[...wpPhonEl.children]; blocks.forEach(c=>c.classList.remove("ok","near","bad")); const SEV={ok:0, near:1, bad:2}; let score=0, tip="", extraTip="", suggestion="";
  const deAccent = s => s.replace(/[áàä]/g,"a").replace(/[éèë]/g,"e").replace(/[íìï]/g,"i").replace(/[óòö]/g,"o").replace(/[úùü]/g,"u");
  if(wpSyllables.length && wpSyllables[0] && wpSyllables[0].letters){
    const tChars=[...deAccent(wpTarget)], rChars=[...deAccent(recog)]; const ops=alignPh(tChars, rChars); const status=new Array(tChars.length).fill("ok"); let ti=0, matches=0, ins=0, worstI=-1, worstSev=-1;
    ops.forEach(o=>{ if(o.op==="ins"){ ins++; return; } const i=ti++; let st; if(o.op==="match"){ st="ok"; matches++; } else if(o.op==="del"){ st="bad"; } else st="near"; status[i]=st; if(SEV[st]>worstSev){ worstSev=SEV[st]; worstI=i; } });
    score=Math.round(100*matches/Math.max(1,tChars.length)); score=Math.max(0, score-Math.min(20, ins*8));
    wpSyllables.forEach((syl,si)=>{ let s="ok"; for(let i=syl.cstart;i<syl.cend;i++) if(status[i] && SEV[status[i]]>SEV[s]) s=status[i]; if(blocks[si]) blocks[si].classList.add(s); });
    if(worstSev>0){ const syl=wpSyllables.find(sy=>worstI>=sy.cstart && worstI<sy.cend); suggestion=`Fíjate en la sílaba <b>«${syl?syl.respell:wpTarget}»</b>.`; }
  } else if(wpSyllables.length && wpSyllables[0] && wpSyllables[0].start!=null){
    const targetClean=(wpTargetPh||[]).map(stripStress); const recogPh=wpPhonemes(recog);
    if(targetClean.length && recogPh && wpSyllables.length){
      const recogClean=recogPh.map(stripStress); const ops=alignPh(targetClean, recogClean); const status=new Array(targetClean.length).fill("ok"); let ti=0, matches=0, ins=0, worst={sev:-1,i:-1,t:null,r:null};
      ops.forEach(o=>{ if(o.op==="ins"){ ins++; return; } const i=ti++; let st; if(o.op==="match"){ st="ok"; matches++; } else if(o.op==="del"){ st="bad"; } else { const vowelMix=isVowelPh(o.t)!==isVowelPh(o.r); st=vowelMix?"bad":"near"; if(!extraTip){ const c=WP_CONFUSIONS.find(x=>x.set.includes(o.t)&&x.set.includes(o.r)); if(c) extraTip=c.tip; } } status[i]=st; if(SEV[st]>worst.sev) worst={sev:SEV[st], i, t:o.t, r:o.r}; });
      score=Math.round(100*matches/Math.max(1,targetClean.length)); score=Math.max(0, score-Math.min(20, ins*8));
      wpSyllables.forEach((syl,si)=>{ if(syl.fallback) return; let s="ok"; for(let i=syl.start;i<syl.end;i++) if(SEV[status[i]]>SEV[s]) s=status[i]; if(blocks[si]) blocks[si].classList.add(s); });
      if(worst.sev>0){ const syl=wpSyllables.find(sy=>!sy.fallback && worst.i>=sy.start && worst.i<sy.end); const ipaSym=ARPA_IPA[worst.t]||worst.t.toLowerCase(); suggestion=`Mejora el sonido <b>/${ipaSym}/</b>${syl?` en «${syl.respell}»`:""}.`; }
    } else if(wpTarget){ const d=editDistance([...recog],[...wpTarget]); score=Math.round(100*(1-d/Math.max(recog.length,wpTarget.length,1))); blocks.forEach(c=>c.classList.add(score>=85?"ok":score>=60?"near":"bad")); }
  }
  const color=score>=85?getCSS("--pos"):score>=60?getCSS("--neu"):getCSS("--neg");
  if(score>=90) tip="¡Muy claro! 🎉"; else if(score>=70) tip="Bien, casi lo tienes."; else if(recog && recog!==wpTarget) tip=`Se entendió «${recog}». Escucha a nativos abajo y repite despacio.`; else tip="Sigue practicando: escucha el modelo y repite despacio.";
  const heardLbl = engine==="acoustic" ? "Sonó como" : "Reconocido";
  wpResult.innerHTML=`<div class="wp-score" style="color:${color}">${score}%</div>`+(recog?`<div class="wp-heard">${heardLbl}: "${recog}"${recog===wpTarget?" ✓":""}</div>`:"")+(suggestion?`<div class="wp-suggest">${suggestion}</div>`:"")+`<span class="wp-tip">${tip}</span>`+(extraTip?`<span class="wp-tip">💡 ${extraTip}</span>`:"");
}

export async function ensureDictThen(cb){
  if(state.lang==="spanish" || state.lang==="portuguese" || cmudict){ cb(); return; }
  wpChipsEl.innerHTML='<span style="font-size:12px;color:var(--muted)">Cargando diccionario de pronunciación…</span>';
  try{ await ensureDict(); cb(); } catch(e){ console.error(e); wpChipsEl.innerHTML='<span style="font-size:12px;color:var(--neg)">No se pudo cargar el diccionario. Revisa tu conexión.</span>'; }
}

/* ---- wiring ---- */
if(wordBtn){
  function updateWpLangUI(){ if(wpInput) wpInput.placeholder = state.lang==="spanish" ? "…o escribe cualquier palabra en español" : state.lang==="portuguese" ? "…ou escreva qualquer palavra em português" : "…or type any word in English"; }
  updateWpLangUI();
  wordBtn.addEventListener("click", ()=>{ const on=wordPanel.classList.toggle("on"); wordBtn.setAttribute("aria-pressed", on?"true":"false"); updateWpLangUI(); if(on) ensureDictThen(buildWpChips); else { wpStopRec(); wpStopListen(); } });
  $("langSeg").querySelectorAll("button").forEach(b=>{ b.addEventListener("click", ()=>{ updateWpLangUI(); state.wpImproveWords = []; if(wordPanel.classList.contains("on")){ const reload = wpTarget; ensureDictThen(()=>{ buildWpChips(); if(reload) loadWord(reload); }); } }); });
  wpLoadBtn.addEventListener("click", ()=>{ const v=wpInput.value.trim(); if(v) ensureDictThen(()=>loadWord(v)); });
  wpInput.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); wpLoadBtn.click(); } });
  wpListen.addEventListener("click", ()=>wpDoListen(1));
  const wpListenSlow=$("wpListenSlow"); if(wpListenSlow) wpListenSlow.addEventListener("click", ()=>wpDoListen(0.55));
  if(!synth){ wpListen.disabled=true; wpListen.title="Tu navegador no soporta síntesis de voz."; }
  wpRecBtn.addEventListener("click", ()=>{ wpRecording ? wpStopRec() : wpStartRec(); });
  const wpFileInput = $("wpFileInput"); if(wpFileInput) wpFileInput.addEventListener("change", async (e)=>{ const f = e.target.files[0]; if(f){ if(wpRecording) wpStopRec(); await wpScore(f); } e.target.value = ""; });
  const wpEngineSel = $("wpEngineSel"), wpEngineMid = $("wpEngineMid");
  function updateEngineMid(){ if(wpEngineMid) wpEngineMid.textContent = wpEngine==="acoustic" ? ACOUSTIC_MODEL : `Xenova/whisper-${state.size}`; }
  updateEngineMid();
  if(wpEngineSel) wpEngineSel.addEventListener("change", ()=>{ wpEngine = wpEngineSel.value; updateEngineMid(); });
  $("promptText").addEventListener("input", ()=>{ state.wpImproveWords = []; if(wordPanel.classList.contains("on")){ clearTimeout(window.__wpDeb); window.__wpDeb=setTimeout(buildWpChips,300); } });
}
