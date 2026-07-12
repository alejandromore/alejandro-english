/* ---------------- docx export (todo en el navegador) ---------------- */
import { state, $, fmtDur } from './state.js';

export function loadScript(src){
  return new Promise((res,rej)=>{
    const s=document.createElement("script");
    s.src=src; s.onload=()=>res(); s.onerror=()=>rej(new Error("No se pudo cargar "+src));
    document.head.appendChild(s);
  });
}

// Carga perezosa: solo se descargan estas librerías cuando pides el Word.
export async function ensureDocxLibs(){
  if(!window.html2canvas) await loadScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");
  if(!window.docx)        await loadScript("https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js");
}

// Rasteriza un elemento del DOM a PNG (Uint8Array) para incrustarlo en el Word.
export async function elementToPng(el){
  const canvas = await window.html2canvas(el, { backgroundColor:"#ffffff", scale:2, logging:false, useCORS:true });
  const blob = await new Promise(r=>canvas.toBlob(r,"image/png"));
  const data = new Uint8Array(await blob.arrayBuffer());
  return { data, w:canvas.width, h:canvas.height };
}

export function hexFor(p){ return p>=0.6 ? "1f9d6b" : (p<=0.4 ? "d8232a" : "d39a14"); }

export async function buildDocxBlob(){
  await ensureDocxLibs();
  const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } = window.docx;
  const last = state.last;
  const withSent = last.sentiment !== false;

  // Espera a que las fuentes carguen para que el texto se rasterice nítido.
  if(document.fonts && document.fonts.ready){ try{ await document.fonts.ready; }catch(e){} }

  // Imágenes del análisis: bloque de métricas + (si aplica) arco de sentimiento.
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

  const langLabel = last.lang==="spanish" ? "Español" : last.lang==="portuguese" ? "Portugués" : "English";
  const meta = `Idioma: ${langLabel}  |  Duración: ${fmtDur(last.duration)}  |  Palabras: ${last.words}  |  Ritmo: ${last.wpm} ppm`
    + (withSent ? `  |  Positividad: ${(last.overall*100).toFixed(0)}%` : "")
    + `  |  Muletillas: ${last.fillers.total}  |  Generado: ${new Date().toLocaleString()}`;

  // Transcripción: coloreada por sentimiento solo si el análisis está activo.
  const sentenceRuns = last.sentences.map(s=>
    new TextRun({ text: s.text + " ", color: withSent ? hexFor(s.positivity) : "1a2233" })
  );

  const children = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children:[ new TextRun({ text:"Voice Coach - Análisis de voz" }) ] }),
    new Paragraph({ spacing:{ after: 260 }, children:[ new TextRun({ text: meta, italics:true, color:"6b7686", size:18 }) ] }),

    new Paragraph({ heading: HeadingLevel.HEADING_2, children:[ new TextRun({ text:"Métricas" }) ] }),
    imgPara(metricsImg),
  ];

  if(withSent){
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children:[ new TextRun({ text:"Arco de sentimiento" }) ] }),
      imgPara(arcImg)
    );
  }

  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing:{ before: 200 }, children:[ new TextRun({ text:"Transcripción" }) ] }),
    new Paragraph({ spacing:{ line: 320 }, children: sentenceRuns })
  );

  if(withSent){
    children.push(
      new Paragraph({ spacing:{ before: 220 }, children:[ new TextRun({ text:"Color del texto - Verde: positivo | Amarillo: neutral | Rojo: negativo", italics:true, color:"6b7686", size:16 }) ] })
    );
  }

  const document_ = new Document({ sections:[{ properties:{}, children }] });
  return await Packer.toBlob(document_);
}
