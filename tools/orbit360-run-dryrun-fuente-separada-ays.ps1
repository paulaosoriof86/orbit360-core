param(
  [Parameter(Mandatory=$true)]
  [string]$ManifestPath
)

$ErrorActionPreference = 'Stop'
$repo = (Get-Location).Path
$script = Join-Path $repo 'tools\orbit360-dryrun-fuente-separada-ays.mjs'
$reports = Join-Path $repo '_orbit360_reports'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runnerReport = Join-Path $reports "RUN-DRYRUN-FUENTE-SEPARADA-AYS-$timestamp.txt"

New-Item -ItemType Directory -Force -Path $reports | Out-Null

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('============================================================')
$lines.Add('ORBIT 360 - RUN DRYRUN FUENTE SEPARADA A&S')
$lines.Add("Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$lines.Add("Repo: $repo")
$lines.Add("Manifest: $ManifestPath")
$lines.Add('Restricciones: sin deploy, sin merge, sin Firestore, sin carga LAB, sin datos reales en repo.')
$lines.Add('============================================================')
$lines.Add('')

try {
  if (!(Test-Path $script)) { throw "No existe script: $script" }
  if (!(Test-Path $ManifestPath)) { throw "No existe manifest: $ManifestPath" }
  $node = Get-Command node -ErrorAction Stop
  $lines.Add("Node: $($node.Source)")
  $lines.Add('')

  $output = & node $script --manifest $ManifestPath 2>&1
  $exit = $LASTEXITCODE
  $lines.AddRange([string[]]$output)
  $lines.Add('')
  $lines.Add("ExitCode: $exit")
  if ($exit -ne 0) {
    $lines.Add('RESULTADO: REQUIERE REVISION / BLOQUEADO')
  } else {
    $lines.Add('RESULTADO: OK ESTRUCTURAL')
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
