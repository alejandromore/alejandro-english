# Alejandro English — TOEFL Preparation Hub

Proyecto de preparación TOEFL iBT para Alejandro (Cloud Solutions Architect at Huawei).
Nivel actual: **B1-high / B2-low** (TOEFL Speaking ~18-23/30).

## 📁 Estructura del Proyecto

```
alejandro-english/
├── index.html                  # Hub principal — menú de navegación
├── README.md                   # Este archivo
│
├── voice-coach/                # Voice Coach app (análisis local de voz)
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
│
├── preparation/                # Sección TOEFL Preparation (basada en libros)
│   ├── reading/
│   │   └── index.html          # Reading practice (passages + preguntas)
│   ├── listening/
│   │   └── index.html          # Listening practice (transcripts + preguntas)
│   ├── speaking/
│   │   └── index.html          # Speaking practice (4 tasks + rubrics oficiales)
│   ├── writing/
│   │   └── index.html          # Writing practice (integrated + independent)
│   └── vocabulary/
│       └── index.html          # Vocabulary drills (essential words)
│
├── drills/                     # Speaking Drills (entrenamiento por semanas)
│   ├── drill-1/
│   │   └── index.html          # Semana 1: Task 1 Independent (3 prompts)
│   ├── drill-2/
│   │   └── index.html          # Semana 2: Task 1 Fluency (5 prompts)
│   ├── drill-3/
│   │   └── index.html          # Semana 3: Tasks 2-3 Integrated
│   └── drill-4/
│       └── index.html          # Semana 4: Full Mock + Band Report
│
├── practices/                  # Carpeta para guardar resultados de prácticas
│                               # (los archivos .txt se descargan aquí)
│
├── books/                      # Libros de estudio (PDFs)
│   ├── Official Guide to TOEFL iBT 2021
│   ├── Official TOEFL iBT Tests Vol.1
│   ├── Speaking and Writing Strategies
│   └── Collins Skills for TOEFL Listening & Speaking
│
└── preparation_source/         # Materiales fuente originales
    ├── Evaluacion.docx         # Análisis de nivel de inglés
    └── TOEFL_Speaking_Drill_1.docx
```

## 🎯 Diagnóstico Inicial

| Patrón | Problema | Ejemplo |
|--------|----------|---------|
| Consonantes finales | Se pierden al final | "projects"→"projets", "platform"→"path" |
| Auxiliar "be" | Desaparece bajo presión | "we going" en vez de "we are going" |
| Coherencia | Colapsa en opiniones | La idea se pierde a mitad de frase |

**Nivel hablado:** B1-alto / B2-bajo · TOEFL Speaking ~18-23/30
**Nivel escrito:** Más fuerte que el hablado espontáneo

## 📚 Libros Utilizados

| Libro | Uso |
|-------|-----|
| The Official Guide to the TOEFL iBT Test 2021 | Formatos, rubrics, ejemplos auténticos |
| Official TOEFL iBT Tests Vol.1 | Tests reales para practice |
| Speaking and Writing Strategies for TOEFL iBT | Estrategias específicas Speaking/Writing |
| Collins Skills for TOEFL Listening & Speaking | Ejercicios de listening/speaking |

## 🗣️ Drills de Speaking (4 semanas)

| Drill | Semana | Foco | Contenido |
|-------|--------|------|-----------|
| #1 | Semana 1 | Auxiliares "be" + consonantes finales | 3 prompts Task 1, timers 15s/45s |
| #2 | Semana 2 | Fluidez bajo presión + coherencia | 5 prompts Task 1, connectors count |
| #3 | Semana 3 | Tasks 2-3 Integrated + conectores | 2 items Task 2 + 2 items Task 3 |
| #4 | Semana 4 | Simulacro completo + diagnóstico | 4 tasks completos, band report |

## 📖 Secciones de Preparation

| Sección | Contenido | Basado en |
|---------|-----------|-----------|
| Reading | 2 passages académicos, 10 preguntas, timers | Official Guide 2021 |
| Listening | 2 sets (conversation + lecture), transcripts | Official Tests + Collins |
| Speaking | 4 tasks completos, rubrics oficiales, strategies | Official Guide + SW Strategies |
| Writing | Integrated + Independent, rubrics, model essays | Official Guide 2021 |
| Vocabulary | 3 drills (definitions, sentences, word families) | Barron's Essential Words |

## 💾 Guardado de Resultados

Cada app tiene un botón **"💾 Save Results to .txt"** que:
- Recopila todas las respuestas escritas
- Recopila los resultados del self-check
- Genera un archivo `.txt` con timestamp
- Se descarga automáticamente

**Formato del archivo:** `{seccion}-results-{YYYY-MM-DD-HH-MM-SS}.txt`
**Carpeta de destino:** `practices/`

## 🔄 Cómo Agregar Nuevos Drills

1. Crear carpeta `drills/drill-N/index.html`
2. Actualizar `index.html` raíz: cambiar el drill de "Pending" a "Active" con el link
3. Git commit + push

## 🎯 Voice Coach — modos de entrenamiento (sept 2026)

El voice coach tiene ahora tres modos encima del flujo original (que se mantiene intacto como modo **Libre**):

| Modo | Qué es | Qué mide |
|------|--------|----------|
| 🎤 **Take an Interview** | Tarea 2 del TOEFL iBT 2026 = entrevista de trabajo. Pregunta → preparación (0/15/30 s) → respuesta cronometrada (45/60/90 s) con corte automático → transcripción → **corrección** | Banda 1–6, errores de forma (dijiste → mejor → regla), estructura (afirmación/razón/ejemplo/cierre), tu respuesta reescrita en ≈45 s, 3 frases para repetir, un foco para la siguiente |
| 🔁 **Listen & Repeat** | Tarea 1 del TOEFL iBT 2026. Texto oculto → escuchar → repetir → alinear palabra por palabra. Tres fuentes: **Trampas** (consonantes finales y auxiliar *be*), **Frases TOEFL**, **Textos TOEFL** (párrafos académicos, oración por oración) | % de palabras correctas y **trampas acertadas** (`components`, `are`, `being`…) |
| 📈 **Historial** | Cada sesión se guarda en `localStorage` | Racha de días, plan de hoy (4 ítems), sesiones en 14 días, tendencia de banda y de precisión, exportar/importar JSON |

**Corrección con Claude.** Con una API key de Anthropic (botón ⚙ Clave / modelo; se guarda solo en el navegador) la corrección es automática, modelo por defecto `claude-opus-5`. Sin clave, el botón **Copiar prompt de corrección** copia transcripción + instrucciones para pegarlas en Claude.

**Limitación conocida.** Whisper normaliza lo que oye: en habla libre puede transcribir "we going" como "we're going" y "replace" como "replaced". Por eso los errores de forma se cazan mejor en **Listen & Repeat** (texto conocido) y la coherencia en **Take an Interview** (corrección por LLM). Los `-ed` finales se le escapan al modelo; las `-s` finales y el auxiliar *be* sí se detectan.

Banco de preguntas y frases: `voice-coach/js/banks.js`. Lógica de los modos: `voice-coach/js/coach.js`. Gancho con el flujo original: evento `vc:analyzed` al final de `analyze()` en `analysis.js`.

## 🛠️ Tecnologías

- HTML5 + CSS3 + JavaScript (vanilla, sin frameworks)
- Todo self-contained (inline CSS/JS en cada HTML)
- Diseño consistente: navy (#1a2744), teal (#00b4a6), coral (#e74c3c), amber (#f39c12)
- CASE SENSITIVE en todos los self-checks
- Font: Segoe UI

## 📌 Git

- **Repo:** https://github.com/alejandromore/alejandro-english
- **Branch:** main
