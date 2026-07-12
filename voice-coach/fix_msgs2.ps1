$file = 'C:\apps\alejandro-english\voice-coach\js\app.js'
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

# Find lines by simple patterns and replace
$changes = @()

for ($i = 0; $i -lt $lines.Length; $i++) {
  $l = $lines[$i]
  
  # onGenProg - look for "Cargando modelo de voz" in setVoiceStage
  if ($l -match 'Cargando modelo de voz' -and $l -match 'setVoiceStage') {
    $lines[$i] = '    const onGenProg=(pct)=>{ if(ttsActive && !started){ speakLabel.textContent=`Cargando voz ${pct}%`; setVoiceStage((state.lang==="spanish"?"Cargando modelo de voz ":state.lang==="portuguese"?"Carregando modelo de voz ":"Loading voice model ")+pct+"%"); resetWatchdog(60000); } };'
    $changes += "onGenProg at line $($i+1)"
  }
  
  # fallbackToSystem - look for "Voz natural no disponible aqu" (stopVoiceStatus)
  if ($l -match 'Voz natural no disponible aqu' -and $l -match 'stopVoiceStatus') {
    $lines[$i] = '  stopVoiceStatus(state.lang==="spanish" ? "Voz natural no disponible aqui; leyendo con la voz del sistema." : state.lang==="portuguese" ? "Voz natural nao disponivel aqui; lendo com a voz do sistema." : "Natural voice unavailable here; reading with system voice.");'
    $changes += "fallbackToSystem at line $($i+1)"
  }
  
  # speakBtn click - "Voz natural no disponible en este dispositivo"
  if ($l -match 'Voz natural no disponible en este dispositivo' -and $l -match 'setVoiceStatus') {
    $lines[$i] = '        setVoiceStatus(state.lang==="spanish" ? "Voz natural no disponible en este dispositivo; uso la del sistema." : state.lang==="portuguese" ? "Voz natural nao disponivel neste dispositivo; uso a do sistema." : "Natural voice unavailable on this device; using system voice.");'
    $changes += "speakBtnClick at line $($i+1)"
  }
  
  # decideTTSRoute - "Detectando WebGPU"
  if ($l -match 'Detectando WebGPU' -and $l -match 'setVoiceStage') {
    $lines[$i] = '    setVoiceStage(es||pt ? "Detectando WebGPU" : "Detecting WebGPU");'
    $changes += "decideTTSRoute at line $($i+1)"
  }
  
  # warmVoice button - "Preparando" / "Preparing"
  if ($l -match 'Preparando' -and $l -match 'btn.textContent' -and $l -match 'es \?') {
    $lines[$i] = '    btn.textContent = es ? "Preparando..." : pt ? "Preparando..." : "Preparing...";'
    $changes += "warmVoiceBtn at line $($i+1)"
  }
  
  # warmVoice - "Preparando la voz"
  if ($l -match 'Preparando la voz' -and $l -match 'setVoiceStatus') {
    $lines[$i] = '    setVoiceStatus(es ? "Preparando la voz - la pantalla puede congelarse unos segundos." : pt ? "Preparando a voz - a tela pode congelar por alguns segundos." : "Preparing the voice - the screen may freeze for a few seconds.");'
    $changes += "warmVoiceStatus at line $($i+1)"
  }
  
  # warmVoice - "Descargando modelo de voz"
  if ($l -match 'Descargando modelo de voz' -and $l -match 'ttsDownloadTarget') {
    $lines[$i] = '    ttsDownloadTarget = (pct)=>{ setVoiceStatus((es?"Descargando modelo de voz ":pt?"Baixando modelo de voz ":"Downloading voice model ")+pct+"%"); };'
    $changes += "warmVoiceDownload at line $($i+1)"
  }
  
  # warmVoice - "Voz lista"
  if ($l -match 'Voz lista' -and $l -match 'btn.textContent' -and $l -match 'es \?') {
    $lines[$i] = '      btn.textContent = es ? "Voz lista" : pt ? "Voz pronta" : "Voice ready";'
    $changes += "warmVoiceReady at line $($i+1)"
  }
  
  # warmVoice - "Voz lista. Ahora"
  if ($l -match 'Voz lista. Ahora' -and $l -match 'setVoiceStatus') {
    $lines[$i] = '      setVoiceStatus(es ? "Voz lista. Ahora Reproducir en Natural es inmediato." : pt ? "Voz pronta. Agora Reproduzir em Natural e imediato." : "Voice ready. Play (Natural) is now instant.");'
    $changes += "warmVoiceReadyStatus at line $($i+1)"
  }
  
  # warmVoice - "No se pudo preparar"
  if ($l -match 'No se pudo preparar' -and $l -match 'setVoiceStatus') {
    $lines[$i] = '      setVoiceStatus((es?"No se pudo preparar la voz: ":pt?"Nao foi possivel preparar a voz: ":"Couldn''t prepare voice: ")+((e&&e.message)||e), true);'
    $changes += "warmVoiceError at line $($i+1)"
  }
  
  # warmVoice - "Preparar voz" fallback
  if ($l -match 'Preparar voz' -and $l -match 'btn.textContent' -and $l -match 'es \?') {
    $lines[$i] = '      btn.textContent = es ? "Preparar voz" : pt ? "Preparar voz" : "Prepare voice";'
    $changes += "warmVoiceFallback at line $($i+1)"
  }
  
  # analyze - decodeFail message
  if ($l -match 'No pude leer ese archivo' -and $l -match 'setStatus') {
    $lines[$i] = '      setStatus(state.lang==="spanish" ? "No pude leer ese archivo de audio. Prueba con un .m4a, .mp3, .wav o .ogg." : state.lang==="portuguese" ? "Nao pude ler esse arquivo de audio. Tente um .m4a, .mp3, .wav ou .ogg." : "I couldn''t read that audio file. Try a .m4a, .mp3, .wav or .ogg.", true);'
    $changes += "decodeFail at line $($i+1)"
  }
  
  # recBtn - localFileMsg
  if ($l -match 'El micr' -and $l -match 'esta bloqueado' -and $l -match 'es \?') {
    $lines[$i] = '  const localFileMsg = es ? "El microfono esta bloqueado porque abriste el archivo desde Descargas. Para grabar, abre la pagina por https o usa Subir audio." : pt ? "O microfone esta bloqueado porque voce abriu o arquivo de Downloads. Para gravar, abra a pagina por https ou use Subir audio." : "The mic is blocked because you opened the file from Downloads. To record, open the page over https, or use Upload audio.";'
    $changes += "localFileMsg at line $($i+1)"
  }
  
  # fileInput - image/video message
  if ($l -match 'Eso es una imagen' -and $l -match 'setStatus') {
    $lines[$i] = '    const msg = state.lang==="spanish" ? "Eso es una imagen o un video, no audio. Elige tu grabacion." : state.lang==="portuguese" ? "Isso e uma imagem ou video, nao audio. Escolha sua gravacao." : "That''s an image or video, not audio. Pick your recording.";'
    $changes += "fileInputMsg at line $($i+1)"
  }
  
  # buildWpChips - "Cargando diccionario"
  if ($l -match 'Cargando diccionario' -and $l -match 'wpChipsEl.innerHTML' -and $l -match 'ensureDictThen') {
    # skip - this is in ensureDictThen which already handles portuguese
  }
}

$enc = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, ($lines -join "`n") + "`n", $enc)
Write-Output "Changes: $($changes.Count)"
foreach ($c in $changes) { Write-Output "  $c" }
Write-Output "Done"
