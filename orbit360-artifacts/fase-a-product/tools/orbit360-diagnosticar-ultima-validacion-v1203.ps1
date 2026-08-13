param(
  [string]$ReportPath = ''
)

$ErrorActionPreference = 'Stop'
try {
  $utf8 = [Text.UTF8Encoding]::new($false)
  [Console]::InputEncoding = $utf8
  [Console]::OutputEncoding = $utf8
  $OutputEncoding = $utf8
  chcp 65001 | Out-Null
} catch {}

$Repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$ReportDir = Join-Path $Repo '_orbit360_reports'

if (-not $ReportPath) {
  $latest = Get-ChildItem -LiteralPath $ReportDir -Filter 'VALIDACION-INTEGRADA-V1203-*.txt' -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (-not $latest) { throw "No se encontro un reporte VALIDACION-INTEGRADA-V1203 en $ReportDir" }
  $ReportPath = $latest.FullName
}

if (-not (Test-Path -LiteralPath $ReportPath)) { throw "No existe el reporte: $ReportPath" }

$content = [IO.File]::ReadAllText($ReportPath, [Text.UTF8Encoding]::new($false))
$sourceLines = [Regex]::Split($content, '\r?\n')
$sections = [System.Collections.Generic.List[object]]::new()
$currentTitle = ''
$currentLines = [System.Collections.Generic.List[string]]::new()

function Save-Section {
  if ($script:currentTitle) {
    $script:sections.Add([pscustomobject]@{
      Title = $script:currentTitle
      Lines = @($script:currentLines)
      Body = ($script:currentLines -join "`n")
    })
  }
  $script:currentLines = [System.Collections.Generic.List[string]]::new()
}

foreach ($line in $sourceLines) {
  if ($line -match '^===\s+(.+?)\s+===$') {
    Save-Section
    $currentTitle = $Matches[1]
  } elseif ($currentTitle) {
    $currentLines.Add($line)
  }
}
Save-Section

$failurePattern = '(?im)(BLOQUEADO|AssertionError|SyntaxError|ReferenceError|TypeError|RangeError|ERR_[A-Z_]+|(^|\s)Error:|Falta\s|no carga\s|no usa\s|no existe\s|failed|fall[oó]|exit(?:code)?\s*[=:]?\s*[1-9])'
$diagnostics = [System.Collections.Generic.List[object]]::new()

foreach ($section in $sections) {
  $isNode = $section.Title -match '^node\s'
  if (-not $isNode) { continue }
  $isCheckOnly = $section.Title -match '^node\s+--check\s'
  $hasFailure = $section.Body -match $failurePattern
  $hasOk = $section.Body -match '(?im)(:\s*OK\b|^OK\b|\bRESULTADO\s*:\s*OK\b)'
  $hasOutput = -not [string]::IsNullOrWhiteSpace($section.Body)
  $suspect = $hasFailure -or ((-not $isCheckOnly) -and $hasOutput -and (-not $hasOk))
  if ($suspect) { $diagnostics.Add($section) }
}

if (-not $diagnostics.Count) {
  $matches = Select-String -InputObject $content -Pattern $failurePattern -AllMatches
  if ($matches) {
    $diagnostics.Add([pscustomobject]@{
      Title = 'Coincidencias generales'
      Lines = @($sourceLines | Where-Object { $_ -match $failurePattern })
      Body = (($sourceLines | Where-Object { $_ -match $failurePattern }) -join "`n")
    })
  }
}

$out = [System.Collections.Generic.List[string]]::new()
$out.Add('============================================================')
$out.Add('ORBIT 360 - DIAGNOSTICO DE ULTIMA VALIDACION v1.203')
$out.Add('No se ejecutaron validadores, Git ni servidor.')
$out.Add(('Reporte analizado: ' + $ReportPath))
$out.Add('============================================================')
$out.Add('')

if ($diagnostics.Count) {
  $out.Add(('SECCIONES SOSPECHOSAS/FALLIDAS: ' + $diagnostics.Count))
  foreach ($section in $diagnostics) {
    $out.Add('')
    $out.Add(('--- ' + $section.Title + ' ---'))
    $bodyLines = @($section.Lines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($bodyLines.Count -gt 40) { $bodyLines = $bodyLines | Select-Object -Last 40 }
    foreach ($line in $bodyLines) { $out.Add([string]$line) }
  }
} else {
  $out.Add('No fue posible aislar un check fallido porque el runner anterior no registraba estado por archivo.')
  $out.Add('Comparte el reporte completo; no vuelvas a ejecutar la validacion integrada.')
}

$out.Add('')
$out.Add('ACCION: compartir este diagnostico. No repetir fetch, pull ni validadores hasta corregir la causa exacta.')
$result = $out -join "`r`n"
Write-Host $result
try { $result | Set-Clipboard } catch {}

$diagPath = Join-Path $ReportDir ('DIAGNOSTICO-' + [IO.Path]::GetFileName($ReportPath))
[IO.File]::WriteAllText($diagPath, $result, [Text.UTF8Encoding]::new($false))
Write-Host ''
Write-Host ('Diagnostico guardado: ' + $diagPath)
Write-Host 'El diagnostico quedo copiado al portapapeles.'
