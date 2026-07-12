$file = 'C:\apps\alejandro-english\voice-coach\js\app.js'
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

$cleanLine = "  const clean = state.lang==='spanish' || state.lang==='portuguese' ? /[^a-z\p{L}'-]/g : /[^a-z']/g;"
$isEsLine = '  const isEs = state.lang==="spanish" || state.lang==="portuguese";'

for ($i = 0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match 'const clean = state\.lang.*"spanish"' -and $i -gt 1800 -and $i -lt 1900) {
    Write-Output "Found clean at line $($i + 1)"
    $lines[$i] = $cleanLine
    Write-Output "Replaced"
    break
  }
}

for ($i = 0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match 'const isEs = state\.lang.*"spanish"' -and $i -gt 1850 -and $i -lt 1970) {
    Write-Output "Found isEs in renderWordScore at line $($i + 1)"
    $lines[$i] = $isEsLine
    Write-Output "Replaced"
    break
  }
}

$enc = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, ($lines -join "`n") + "`n", $enc)
Write-Output "Done"
