/* ---------------- i18n: traducciones de la interfaz ---------------- */
import { state } from './state.js';

export const UI_STRINGS = {
  english: { play:"Play", stop:"Stop", generating:"Generating.", dlmp3:"Download MP3",
    phon:"\u{1F524}\u00A0Phonetics", words:"\u{1F3AF}\u00A0Words", newq:"\u21BB\u00A0New phrase", paragraph:"\u00B6\u00A0Paragraph", loading:"Fetching.",
    promptLbl:"Practice prompt", promptPh:"Type or paste the text you want to practice or hear.",
    setup:"Setup", accuracy:"Accuracy vs. speed", sentiment:"Sentiment analysis",
    compareRead:"Compare reading", readingVoice:"Reading voice", engine:"Engine (Words mode)",
    record:"Record", upload:"\u2191\u00A0Upload audio", or:"or", pause:"Pause", resume:"Resume",
    docView:"Text view", docSimple:"Simple", docDoc:"Document", warmVoice:"\u2699\u00A0Prepare voice",
    voiceSystem:"System", voiceOrator:"Orator",
    uploadDoc:"\u2191\u00A0Upload", newDoc:"\u21BB\u00A0New",
    chooseWord:"Word document (.docx)", chooseJson:"Podcast script (JSON)",
    choosePhrase:"Phrase", chooseParagraph:"Paragraph",
    uploadHint:"Uploading a phone recording? In the picker, choose <b>More \u2192 Files</b>, then open <b>Recordings</b>." },
  spanish: { play:"Reproducir", stop:"Detener", generating:"Generando voz.", dlmp3:"Descargar MP3",
    phon:"\u{1F524}\u00A0Fon\u00E9tica", words:"\u{1F3AF}\u00A0Palabras", newq:"\u21BB\u00A0Nueva frase", paragraph:"\u00B6\u00A0P\u00E1rrafo", loading:"Buscando.",
    promptLbl:"Texto de pr\u00E1ctica", promptPh:"Escribe o pega el texto que quieres practicar o escuchar.",
    setup:"Configuraci\u00F3n", accuracy:"Precisi\u00F3n vs. velocidad", sentiment:"An\u00E1lisis de sentimiento",
    compareRead:"Comparar lectura", readingVoice:"Voz de lectura", engine:"Motor (modo Palabras)",
    record:"Grabar", upload:"\u2191\u00A0Subir audio", or:"o", pause:"Pausa", resume:"Reanudar",
    docView:"Vista del texto", docSimple:"Simple", docDoc:"Documento", warmVoice:"\u2699\u00A0Preparar voz",
    voiceSystem:"Sistema", voiceOrator:"Orador",
    uploadDoc:"\u2191\u00A0Subir", newDoc:"\u21BB\u00A0Nuevo",
    chooseWord:"Documento Word (.docx)", chooseJson:"Guion de podcast (JSON)",
    choosePhrase:"Frase", chooseParagraph:"P\u00E1rrafo",
    uploadHint:"\u00BFSubir una grabaci\u00F3n del tel\u00E9fono? En el selector elige <b>More \u2192 Files</b> y abre <b>Recordings</b>." }
  ,
  portuguese: { play:"Reproduzir", stop:"Parar", generating:"Gerando voz...", dlmp3:"Baixar MP3",
    phon:"\u{1F524}\u00A0Fonetica", words:"\u{1F3AF}\u00A0Palavras", newq:"\u21BB\u00A0Nova frase", paragraph:"\u00B6\u00A0Par\u00E1grafo", loading:"Buscando...",
    promptLbl:"Texto de pratica", promptPh:"Escreva ou cole o texto que quer praticar ou ouvir...",
    setup:"Configuracao", accuracy:"Precisao vs. velocidade", sentiment:"Analise de sentimento",
    compareRead:"Comparar leitura", readingVoice:"Voz de leitura", engine:"Motor (modo Palabras)",
    record:"Gravar", upload:"Subir audio", or:"ou", pause:"Pausar", resume:"Retomar",
    docView:"Vista do texto", docSimple:"Simples", docDoc:"Documento",
    voiceSystem:"Sistema", voiceOrator:"Orador",
    uploadDoc:"\u2191\u00A0Enviar", newDoc:"\u21BB\u00A0Novo",
    chooseWord:"Documento Word (.docx)", chooseJson:"Roteiro de podcast (JSON)",
    choosePhrase:"Frase", chooseParagraph:"Par\u00E1grafo",
    uploadHint:"Subindo uma gravacao do telefone? No seletor escolha <b>More > Files</b> e abra <b>Recordings</b>." }
};

export function t(key){
  const s = UI_STRINGS[state.lang] || UI_STRINGS.english;
  return (key in s) ? s[key] : key;
}

export function speakStopLabel(){
  return t("stop");
}
