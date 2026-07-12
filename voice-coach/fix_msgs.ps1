$file = 'C:\apps\alejandro-english\voice-coach\js\app.js'
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

# Helper function to replace a line by finding it with a pattern and replacing
function ReplaceLine($pattern, $replacement, $minLine, $maxLine) {
  for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -ge $minLine -and $i -le $maxLine -and $lines[$i] -match $pattern) {
      Write-Output "  Replaced line $($i + 1): $($lines[$i].Substring(0, [Math]::Min(60, $lines[$i].Length)))..."
      $lines[$i] = $replacement
      return $true
    }
  }
  Write-Output "  NOT FOUND: $pattern"
  return $false
}

# 1. onGenProg message - "Cargando modelo de voz"
ReplaceLine 'state\.lang==="spanish"\?"Cargando modelo de voz "', '    const onGenProg=(pct)=>{ if(ttsActive && !started){ speakLabel.textContent=`Cargando voz ${pct}%`; setVoiceStage((state.lang==="spanish"?"Cargando modelo de voz ":state.lang==="portuguese"?"Carregando modelo de voz ":"Loading voice model ")+pct+"%"); resetWatchdog(60000); } };' 550 600

# 2. fallbackToSystem message
ReplaceLine 'stopVoiceStatus\(state\.lang==="spanish" \? "Voz natural no disponible aqu', '  stopVoiceStatus(state.lang==="spanish" ? "Voz natural no disponible aqui; leyendo con la voz del sistema." : state.lang==="portuguese" ? "Voz natural nao disponivel aqui; lendo com a voz do sistema." : "Natural voice unavailable here; reading with system voice.");' 850 870

# 3. speakBtn click - "Voz natural no disponible en este dispositivo"
ReplaceLine 'setVoiceStatus\(state\.lang==="spanish" \? "Voz natural no disponible en este dispositivo', '        setVoiceStatus(state.lang==="spanish" ? "Voz natural no disponible en este dispositivo; uso la del sistema." : state.lang==="portuguese" ? "Voz natural nao disponivel neste dispositivo; uso a do sistema." : "Natural voice unavailable on this device; using system voice.");' 880 900

# 4. decideTTSRoute - "Detectando WebGPU"
ReplaceLine 'const es = state\.lang==="spanish";\s*$' '    const es = state.lang==="spanish"; const pt = state.lang==="portuguese";' 430 450

# 5. warmVoice button text
ReplaceLine 'const es = state\.lang==="spanish";\s*$' '    const es = state.lang==="spanish"; const pt = state.lang==="portuguese";' 1210 1230

# 6. analyze - isEs
ReplaceLine 'const isEs = state\.lang==="spanish";\s*$' '    const isEs = state.lang==="spanish"; const isPt = state.lang==="portuguese";' 2340 2360

# 7. recBtn - es
ReplaceLine 'const es = state\.lang==="spanish";\s*$' '  const es = state.lang==="spanish"; const pt = state.lang==="portuguese";' 2230 2250

$enc = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, ($lines -join "`n") + "`n", $enc)
Write-Output "Done"
