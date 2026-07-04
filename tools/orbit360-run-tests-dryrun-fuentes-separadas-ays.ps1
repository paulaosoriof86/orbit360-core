$ErrorActionPreference = 'Stop'
$repo = (Get-Location).Path
$script = Join-Path $repo 'tools\orbit360-test-dryrun-fuentes-separadas-ays.mjs'
$reports = Join-Path $repo '_orbit360_reports'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runnerReport = Join-Path $reports "RUN-TEST-DRYRUN-FUENTES-SEPARADAS-AYS-$timestamp.txt"

New-Item -ItemType Directory -Force -Path $reports | Out-Null

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('============================================================')
$lines.Add('ORBIT 360 - RUN TESTS DRYRUN FUENTES SEPARADAS A&S')
$lines.Add("Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$lines.Add("Repo: $repo")
$lines.Add('Restricciones: tests sinteticos, sin datos reales, sin deploy, sin merge, sin Firestore.')
$lines.Add('============================================================')
$lines.Add('')

try {
  if (!(Test-Path $script)) { throw "No existe script: $script" }
  $node = Get-Command node -ErrorAction Stop
  $lines.Add("Node: $($node.Source)")
  $lines.Add('')

  $output = & node $script 2>&1
  $exit = $LASTEXITCODE
  $lines.AddRange([string[]]$output)
  $lines.Add('')
  $lines.Add("ExitCode: $exit")
  if ($exit -ne 0) {
    $lines.Add('RESULTADO: FAIL / REVISAR')
  } else {
    $lines.Add('RESULTADO: OK')
  }
} catch {
  $lines.Add("ERROR RUNNER: $($_.Exception.Message)")
  $lines.Add('RESULTADO: FAIL')
}

$text = $lines -join [Environment]::NewLine
Set-Content -Path $runnerReport -Value $text -Encoding UTF8
Set-Clipboard -Value $text
Start-Process notepad.exe $runnerReport
Write-Host $text
