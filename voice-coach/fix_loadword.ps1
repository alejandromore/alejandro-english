$file = 'C:\apps\alejandro-english\voice-coach\js\app.js'
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

# Find the line with "const isEs = state.lang==="spanish";" in loadWord
for ($i = 0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match 'const isEs = state\.lang==="spanish";' -and $i -gt 1700 -and $i -lt 1800) {
    Write-Output "Found isEs at line $($i + 1): $($lines[$i])"
    # Replace this line and the next two lines
    $lines[$i] = '  const isEs = state.lang==="spanish" || state.lang==="portuguese";'
    # The next line has the regex with special chars - replace it
    $lines[$i + 1] = '  wpTarget=shown.toLowerCase().replace(isEs?/[^a-z\p{L}''-]/g:/[^a-z'']/g,"");'
    Write-Output "Replaced with: $($lines[$i])"
    Write-Output "Replaced next with: $($lines[$i + 1])"
    break
  }
}

$enc = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, ($lines -join "`n") + "`n", $enc)
Write-Output "Done"
