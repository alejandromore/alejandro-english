// js/state.js
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5";
env.allowLocalModels = false;
var state = {
  lang: "english",
  size: "base",
  doSentiment: true,
  compareRead: false,
  voice: "system",
  docView: "simple",
  asr: null,
  asrKey: null,
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
  analyzeCanceled: false
};

// js/i18n.js
var UI_STRINGS = {
  english: {
    play: "Play",
    stop: "Stop",
    generating: "Generating.",
    dlmp3: "Download MP3",
    phon: "\u{1F524}\xA0Phonetics",
    words: "\u{1F3AF}\xA0Words",
    newq: "\u21BB\xA0New phrase",
    paragraph: "\xB6\xA0Paragraph",
    loading: "Fetching.",
    promptLbl: "Practice prompt",
    promptPh: "Type or paste the text you want to practice or hear.",
    setup: "Setup",
    accuracy: "Accuracy vs. speed",
    sentiment: "Sentiment analysis",
    compareRead: "Compare reading",
    readingVoice: "Reading voice",
    engine: "Engine (Words mode)",
    record: "Record",
    upload: "\u2191\xA0Upload audio",
    or: "or",
    pause: "Pause",
    resume: "Resume",
    docView: "Text view",
    docSimple: "Simple",
    docDoc: "Document",
    warmVoice: "\u2699\xA0Prepare voice",
    voiceSystem: "System",
    voiceOrator: "Orator",
    uploadHint: "Uploading a phone recording? In the picker, choose <b>More \u2192 Files</b>, then open <b>Recordings</b>."
  },
  spanish: {
    play: "Reproducir",
    stop: "Detener",
    generating: "Generando voz.",
    dlmp3: "Descargar MP3",
    phon: "\u{1F524}\xA0Fon\xE9tica",
    words: "\u{1F3AF}\xA0Palabras",
    newq: "\u21BB\xA0Nueva frase",
    paragraph: "\xB6\xA0P\xE1rrafo",
    loading: "Buscando.",
    promptLbl: "Texto de pr\xE1ctica",
    promptPh: "Escribe o pega el texto que quieres practicar o escuchar.",
    setup: "Configuraci\xF3n",
    accuracy: "Precisi\xF3n vs. velocidad",
    sentiment: "An\xE1lisis de sentimiento",
    compareRead: "Comparar lectura",
    readingVoice: "Voz de lectura",
    engine: "Motor (modo Palabras)",
    record: "Grabar",
    upload: "\u2191\xA0Subir audio",
    or: "o",
    pause: "Pausa",
    resume: "Reanudar",
    docView: "Vista del texto",
    docSimple: "Simple",
    docDoc: "Documento",
    warmVoice: "\u2699\xA0Preparar voz",
    voiceSystem: "Sistema",
    voiceOrator: "Orador",
    uploadHint: "\xBFSubir una grabaci\xF3n del tel\xE9fono? En el selector elige <b>More \u2192 Files</b> y abre <b>Recordings</b>."
  },
  portuguese: {
    play: "Reproduzir",
    stop: "Parar",
    generating: "Gerando voz...",
    dlmp3: "Baixar MP3",
    phon: "\u{1F524}\xA0Fonetica",
    words: "\u{1F3AF}\xA0Palavras",
    newq: "\u21BB\xA0Nova frase",
    paragraph: "\xB6\xA0Par\xE1grafo",
    loading: "Buscando...",
    promptLbl: "Texto de pratica",
    promptPh: "Escreva ou cole o texto que quer praticar ou ouvir...",
    setup: "Configuracao",
    accuracy: "Precisao vs. velocidade",
    sentiment: "Analise de sentimento",
    compareRead: "Comparar leitura",
    readingVoice: "Voz de leitura",
    engine: "Motor (modo Palabras)",
    record: "Gravar",
    upload: "Subir audio",
    or: "ou",
    pause: "Pausar",
    resume: "Retomar",
    docView: "Vista do texto",
    docSimple: "Simples",
    docDoc: "Documento",
    voiceSystem: "Sistema",
    voiceOrator: "Orador",
    uploadHint: "Subindo uma gravacao do telefone? No seletor escolha <b>More > Files</b> e abra <b>Recordings</b>."
  }
};
function t(key) {
  const s = UI_STRINGS[state.lang] || UI_STRINGS.english;
  return key in s ? s[key] : key;
}
function speakStopLabel() {
  return t("stop");
}
export {
  UI_STRINGS,
  speakStopLabel,
  t
};
