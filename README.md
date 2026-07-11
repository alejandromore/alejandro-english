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

## 🛠️ Tecnologías

- HTML5 + CSS3 + JavaScript (vanilla, sin frameworks)
- Todo self-contained (inline CSS/JS en cada HTML)
- Diseño consistente: navy (#1a2744), teal (#00b4a6), coral (#e74c3c), amber (#f39c12)
- CASE SENSITIVE en todos los self-checks
- Font: Segoe UI

## 📌 Git

- **Repo:** https://github.com/alejandromore/alejandro-english
- **Branch:** main
