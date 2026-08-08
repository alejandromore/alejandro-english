# Plan de Mejora: Evaluación y Estabilidad de Spelling Bee (Para niños de 6 años)

## Resumen del Problema
1. **"Se raya" / Bucle de repetición en ASR (Whisper):** Cuando el niño se frena, duda o alarga una vocal, el reconocedor de voz (Whisper) alucina y repite letras incansablemente (`E-C-E-O-O-E-E-E-E-E-E-E-E...`), saturando la pantalla y arruinando el análisis.
2. **Evaluación demasiado estricta para niños de 6 años:** La aplicación requiere precisión exacta de nombres de letras en inglés, cuando los niños de 6 años a menudo:
   - Dicen palabras enteras o sonidos fonéticos (/k/ /a/ /t/ en lugar de C-A-T).
   - Confunden letras con sonidos similares o pronunciaciones en español (p. ej. 'E' pronunciado como 'I', 'V' como 'B', 'K' como 'C').
   - El umbral de aprobación actual (65%) es muy rígido.

## Cambios Propuestos

### 1. Limpieza de Transcripción y Prevención de Bucles ("Se raya")
- **Sanitización de texto:** Crear/actualizar funciones de limpieza para colapsar repeticiones consecutivas de tokens (ej. `E E E E E` -> `E E`).
- **Límite de visualización:** Formatear el texto de "I heard" para que no rompa la interfaz gráfica ni desborde la pantalla.
- **Filtro de alucinaciones:** Eliminar secuencias redundantes antes de pasarlas al motor de análisis.

### 2. Flexibilidad e Indulgenicia en la Evaluación (Niños de 6 años)
- **Mapeo Fonético Ampliado:** Expandir `SPELL_LETTER_ALIASES` con pronunciaciones en español e inglés infantil (ej. A -> 'a', 'ay', 'ei'; E -> 'e', 'ee', 'eh', 'i'; I -> 'i', 'eye', 'ai'; etc.).
- **Tolerancia de letras equivalentes (Near-Matches):**
  - C y K, S y Z, B y V, G y J, U y O/W.
  - Si el niño usa una letra fonéticamente equivalente, se cuenta como correcta o casi correcta (`mid` con alta puntuación) en lugar de error.
- **Reconocimiento por Palabra Completa o Sonido:** Si el niño pronuncia la palabra completa o una variante muy cercana (ej. "cat", "khat", "kat"), aprobar automáticamente con 100% o puntuación alta.
- **Umbral de Aprobación Reducido:** Cambiar el umbral de aprobación (`result.ok`) de `0.65` a `0.50` (50% de precisión o mejor), permitiendo que pequeñeces no castiguen la experiencia del niño.
- **Mejor Puntaje en "Close":** Incrementar el valor de coincidencia parcial (`mid`) de `0.65` a `0.80`.

### 3. Modificaciones en Archivos
- `colegio-emilia/ingles/ingles.html`: Actualizar las funciones `transcriptTokens`, `spokenLettersToText`, `analyzeSpellingText`, `automaticLetterStatuses`, `statusScore` y `showSpellingReview`.

## Plan de Verificación
1. **Probar repeticiones de voz:** Probar con entradas con letras repetidas (ej. "e-e-e-e-e-c-e-o-o-e-e-e") para asegurar que no se raye la pantalla y que filtre correctamente.
2. **Probar tolerancia de 6 años:** Probar respuestas con ligeros errores de pronunciación o equivalencias (ej. "k-a-t" para "cat", "b-o-k" para "book", "a-p-l" para "apple") y verificar que sean aceptadas como correctas o aprobadas.
3. **Revisar interfaz:** Verificar que la interfaz se mantenga limpia y amigable para el niño.
