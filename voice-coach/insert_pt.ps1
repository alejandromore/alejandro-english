$file = 'C:\apps\alejandro-english\voice-coach\js\app.js'
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

# Find the line with "};" right after the spanish UI_STRINGS entry (closing UI_STRINGS)
$insertAt = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
  if ($lines[$i].Trim() -eq '};' -and $i -gt 190 -and $i -lt 215) {
    $insertAt = $i
    break
  }
}
if ($insertAt -eq -1) { Write-Error "Could not find UI_STRINGS closing"; exit 1 }
Write-Output "Inserting at line $insertAt"

$ptBlock = @(
'  ,'
'  portuguese: { play:"Reproduzir", stop:"Parar", generating:"Gerando voz...", dlmp3:"Baixar MP3",'
'    phon:"Fonetica", words:"Palavras", newq:"Nova frase", paragraph:"Paragrafo", loading:"Buscando...",'
'    promptLbl:"Texto de pratica", promptPh:"Escreva ou cole o texto que quer praticar ou ouvir...",'
'    setup:"Configuracao", accuracy:"Precisao vs. velocidade", sentiment:"Analise de sentimento",'
'    compareRead:"Comparar leitura", readingVoice:"Voz de leitura", engine:"Motor (modo Palavras)",'
'    record:"Gravar", upload:"Subir audio", or:"ou", pause:"Pausar", resume:"Retomar",'
'    docView:"Vista do texto", docSimple:"Simples", docDoc:"Documento", warmVoice:"Preparar voz",'
'    voiceSystem:"Sistema", voiceNatural:"Natural",'
'    uploadHint:"Subindo uma gravacao do telefone? No seletor escolha <b>More > Files</b> e abra <b>Recordings</b>." }'
)

$newLines = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $insertAt; $i++) { $newLines.Add($lines[$i]) }
foreach ($line in $ptBlock) { $newLines.Add($line) }
for ($i = $insertAt; $i -lt $lines.Length; $i++) { $newLines.Add($lines[$i]) }

$enc = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, ($newLines -join "`n") + "`n", $enc)
Write-Output "Done - inserted $($ptBlock.Count) lines"
