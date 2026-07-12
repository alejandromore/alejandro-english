$file = 'C:\apps\alejandro-english\voice-coach\js\app.js'
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

# Find the voiceEs line in MODELS
$insertAfter = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match 'voiceEs.*label.*MMS' -and $lines[$i] -match 'state:"idle"') {
    $insertAfter = $i
    break
  }
}
if ($insertAfter -eq -1) { Write-Error "Could not find voiceEs line"; exit 1 }
Write-Output "Inserting after line $($insertAfter + 1)"

$ptLine = '  voicePt:{ label:"Voz natural - portugues (MMS)", state:"idle" },'

$newLines = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -le $insertAfter; $i++) { $newLines.Add($lines[$i]) }
$newLines.Add($ptLine)
for ($i = $insertAfter + 1; $i -lt $lines.Length; $i++) { $newLines.Add($lines[$i]) }

$enc = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, ($newLines -join "`n") + "`n", $enc)
Write-Output "Done"
