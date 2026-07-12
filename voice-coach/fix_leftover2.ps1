$file = 'C:\apps\alejandro-english\voice-coach\js\app.js'
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

# Find and remove the leftover line (line 1317 - the partial old setVoiceStatus line)
for ($i = 0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match '^\s*:\s*"Preparing the voice' -and $i -gt 1310 -and $i -lt 1325) {
    Write-Output "Removing leftover line $($i + 1)"
    $lines = $lines[0..($i-1)] + $lines[($i+1)..($lines.Length-1)]
    break
  }
}

# Also fix the neuralSamples call to handle portuguese
for ($i = 0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match 'neuralSamples\(state\.lang, es \? "hola"' -and $i -gt 1315 -and $i -lt 1330) {
    Write-Output "Fixing neuralSamples warmup at line $($i + 1)"
    $lines[$i] = '      await neuralSamples(state.lang, es ? "hola" : state.lang==="portuguese" ? "ola" : "hello");  // frase minima: descarga + compila + 1 inferencia'
    break
  }
}

$enc = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, ($lines -join "`n") + "`n", $enc)
Write-Output "Done"
