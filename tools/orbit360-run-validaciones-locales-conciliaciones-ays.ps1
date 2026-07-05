<#
Orbit 360 A&S — Wrapper PowerShell para runner local de Conciliaciones.
No deploy. No merge. No datos reales. No writes Firestore/Orbit.store. No aplicación de pagos.
Ejecutar desde la raíz del repo: .\tools\orbit360-run-validaciones-locales-conciliaciones-ays.ps1
#>
[CmdletBinding()]
param(
  [switch]$AllowWarnings
)

$ErrorActionPreference = 'Stop'
$StartedAt = Get-Date
$Root = (Get-Location).Path
$ReportsDir = Join-Path $Root '_orbit360_reports'
$Runner = Join-Path $Root 'tools\orbit360-run-validaciones-locales-conciliaciones-ays.mjs'

function Write-Section($Title) {
  Write-Host ''
  Write-Host ('=' * 88)
  Write-Host $Title
  Write-Host ('=' * 88)
}

Write-Section 'ORBIT 360 A&S — RUN VALIDACIONES LOCALES CONCILIACIONES'
Write-Host "Fecha local: $($StartedAt.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Host "Repo: $Root"
Write-Host 'Restricciones: no deploy, no merge, no datos reales, no Firestore writes, no aplicación de pagos.'

if (-not (Test-Path (Join-Path $Root 'orbit360-platform'))) {
  throw 'No parece estar en la raíz del repo: falta orbit360-platform.'
}
if (-not (Test-Path $Runner)) {
  throw "No existe runner Node: $Runner"
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw 'Node no está disponible en PATH. No se ejecutó ninguna validación.'
}
Write-Host "Node: $($node.Source)"

if (-not (Test-Path $ReportsDir)) {
  New-Item -ItemType Directory -Path $ReportsDir | Out-Null
}

$ArgsNode = @($Runner)
if ($AllowWarnings) { $ArgsNode += '--allow-warnings' }

Write-Section 'EJECUTAR RUNNER NODE'
$Output = & node @ArgsNode 2>&1
$ExitCode = $LASTEXITCODE
$OutputText = ($Output | Out-String).Trim()
Write-Host $OutputText

$LatestTxt = Get-ChildItem -Path $ReportsDir -Filter 'RUN-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-*.txt' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$LatestJson = Get-ChildItem -Path $ReportsDir -Filter 'RUN-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-*.json' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

Write-Section 'REPORTE MÁS RECIENTE'
if ($LatestTxt) { Write-Host "TXT:  $($LatestTxt.FullName)" } else { Write-Host 'TXT:  no encontrado' }
if ($LatestJson) { Write-Host "JSON: $($LatestJson.FullName)" } else { Write-Host 'JSON: no encontrado' }

$SummaryLines = @()
$SummaryLines += 'ORBIT 360 A&S — RESUMEN RUNNER LOCAL CONCILIACIONES'
$SummaryLines += "Fecha local: $($StartedAt.ToString('yyyy-MM-dd HH:mm:ss'))"
$SummaryLines += "Repo: $Root"
$SummaryLines += "ExitCode: $ExitCode"
$SummaryLines += "TXT: $($LatestTxt.FullName)"
$SummaryLines += "JSON: $($LatestJson.FullName)"
$SummaryLines += ''
$SummaryLines += 'SALIDA CONSOLA:'
$SummaryLines += $OutputText

$SummaryPath = Join-Path $ReportsDir ('POWERSHELL-RUN-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-{0}.txt' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$SummaryLines -join [Environment]::NewLine | Set-Content -Path $SummaryPath -Encoding UTF8
Write-Host "Resumen PowerShell: $SummaryPath"

try {
  $SummaryLines -join [Environment]::NewLine | Set-Clipboard
  Write-Host 'Resumen copiado al portapapeles.'
} catch {
  Write-Host 'No se pudo copiar al portapapeles; usa el TXT del resumen.'
}

if ($ExitCode -ne 0) {
  Write-Host ''
  Write-Host 'RESULTADO: FAIL — no avanzar a smoke visual, adapter LAB, Firestore, pagos ni datos reales.'
  exit $ExitCode
}

Write-Host ''
Write-Host 'RESULTADO: OK — revisar TXT/JSON antes de smoke visual. No autoriza adapter LAB ni pagos.'
exit 0
