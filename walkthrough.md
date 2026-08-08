# Resumen de Cambios - Spelling Bee para Colegio Santa Cruz (Niños de 6 años)

## Problemas Identificados y Solucionados

1. **Alucinación / Bucle de repetición ("Se Raya"):**
   - **Causa:** Cuando el niño dudaba, hacía una pausa o alargaba una vocal al grabar, el modelo Whisper de reconocimiento de voz se quedaba atrapado en bucles infinitos de la misma letra (ej: `E-C-E-O-O-E-E-E-E-E-E-E-E...`), lo que llenaba la pantalla de texto y arruinaba la evaluación.
   - **Solución implementada:**
     - Se añadió la función `collapseRepetitions(tokens)` y se actualizó `transcriptTokens` y `spokenLettersToText` para colapsar repeticiones consecutivas de más de 2 letras/palabras idénticas.
     - En `showSpellingReview`, el texto mostrado en `🧠 I heard` se recorta elegantemente a un número máximo de tokens legibles (máx. 15 palabras), evitando desbordamientos gráficos.

2. **Evaluación Demasiado Estricta para Niños de 6 Años:**
   - **Causa:** El sistema anterior exigía deletreo perfecto en inglés y calificaba con rojo o fallo cualquier pequeña falla de pronunciación o confusión común en la edad infantil (ej: B por V, C por K, E por I).
   - **Solución implementada:**
     - **Mapeo fonético ampliado (`SPELL_LETTER_ALIASES`):** Se agregaron alias infantiles y de articulación en español (ej. 'ay', 'ei' para A; 'ee', 'eh', 'i' para E; 'eye', 'ai' para I; 've', 'vee', 'bi' para B/V; 'see', 'ci', 'se' para C, etc.).
     - **Matriz de equivalencias fonéticas (`operateSimilarLetters`):** Reconoce pares de letras equivalentes o parecidas para niños de 6 años (C/K/S, B/V/P, G/J, S/Z, E/I/A, U/O/W, M/N).
     - **Reconocimiento por palabra o aproximación:** Si el niño pronuncia la palabra completa ("cat", "apple", "book") o una aproximación clara, el sistema la reconoce y aprueba con puntaje máximo.
     - **Flexibilidad en puntaje:**
       - Las letras similares ("close / sounds close") ahora otorgan **85% de puntaje** (antes 65%).
       - El umbral de aprobación para niños de 6 años se ajustó a **>= 50%** (en lugar de 65%).

## Verificación
- **Pruebas de alucinación:** Se probó con entradas ruidosas/repetidas (`E-C-E-O-O-E-E-E...`) verificando que el texto se limpia a `ECEOOEE` y no satura la pantalla.
- **Pruebas de deletreo por letras (ASR):** Entradas como `"see ay tee"` para `CAT` o `"bee oo book kay"` para `BOOK` son evaluadas correctamente con 100%.
- **Pruebas de equivalencia 6 años:** Entradas como `"K A T"` para `CAT` o `"B O K"` para `BOOK` son aceptadas y aprobadas.
