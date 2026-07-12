$file = 'C:\apps\alejandro-english\voice-coach\js\app.js'
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Find and remove the leftover lines between the new closing brace and updateWpLangUI
# The pattern is: the new updateWpLangUI ends with "  }" then leftover text then "  }\n  updateWpLangUI();"
# We need to find the broken section and fix it

# Look for the pattern of leftover text after our new closing brace
$pattern = '(?s)(  \}\s*\n)      \? "[^"]*"\s*\n      : "[^"]*";\s*\n  \}\s*\n  updateWpLangUI\(\);'
$replacement = '$1  updateWpLangUI();'

$newContent = [regex]::Replace($content, $pattern, $replacement)

if ($newContent -eq $content) {
  Write-Output "Pattern not found, trying alternate approach"
  # Try line-by-line approach
  $lines = $content -split "`n"
  $result = New-Object System.Collections.Generic.List[string]
  $skip = $false
  for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    # Detect the leftover line starting with "  }      ?"
    if ($line -match '^\s*\}\s+\?') {
      # Skip this line and the next one (the ": "..." line)
      $skip = $true
      continue
    }
    if ($skip) {
      $skip = $false
      # Check if this is the ": " line
      if ($line -match '^\s*:\s*"') { continue }
      # Otherwise it's the "}" and "updateWpLangUI();" which we want to keep
    }
    $result.Add($line)
  }
  $newContent = ($result -join "`n") + "`n"
}

$enc = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, $newContent, $enc)
Write-Output "Done"
