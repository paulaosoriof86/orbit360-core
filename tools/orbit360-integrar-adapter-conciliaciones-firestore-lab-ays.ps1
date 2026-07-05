<#
Orbit 360 A&S — Integrar colecciones conciliaciones/auditLog al Store Firestore LAB
Modo local seguro. No commit, no merge, no deploy, no secretos.

Uso desde raíz del repo:
  powershell -ExecutionPolicy Bypass -File tools/orbit360-integrar-adapter-conciliaciones-firestore-lab-ays.ps1 -DryRun
  powershell -ExecutionPolicy Bypass -File tools/orbit360-integrar-adapter-conciliaciones-firestore-lab-ays.ps1 -Apply

Qué hace:
- Crea backup del store Firestore LAB.
- Agrega `conciliaciones` y `auditLog` al arreglo COLLECTIONS si faltan.
- No toca reglas, no despliega, no ejecuta writes.
- Ejecuta validador estático si Node está disponible.
#>
param(
  [string]$RepoRoot = (Get-Location).Path,
  [switch]$Apply,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$storeRel = 'orbit360-platform/data/store-firestore-lab.local.js'
$storePath = Join-Path $RepoRoot $storeRel
$reports = Join-Path $RepoRoot '_orbit360_reports'
$backupDir = Join-Path $RepoRoot "_backups\firestore-lab-conciliaciones-$ts"
New-Item -ItemType Directory -Force -Path $reports | Out-Null
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$lines = New-Object System.Collections.Generic.List[string]
function Log([string]$m){ $lines.Add($m); Write-Host $m }

Log '============================================================'
Log 'ORBIT 360 A&S — INTEGRAR ADAPTER CONCILIACIONES FIRESTORE LAB'
Log "Fecha: $(Get-Date -Format s)"
Log "RepoRoot: $RepoRoot"
Log "Store: $storeRel"
Log "Apply: $Apply"
Log "DryRun: $DryRun"
Log 'Restricciones: no commit, no merge, no deploy, no secretos, no writes Firestore.'
Log '============================================================'

if(!$Apply -and !$DryRun){ throw 'Debes indicar -DryRun o -Apply.' }
if($Apply -and $DryRun){ throw 'Usa solo -DryRun o -Apply, no ambos.' }
if(!(Test-Path $storePath)){ throw "No existe $storeRel" }

$txt = Get-Content -Raw -LiteralPath $storePath
$original = $txt
$needsConc = $txt -notmatch "['\"]conciliaciones['\"]"
$needsAudit = $txt -notmatch "['\"]auditLog['\"]"

if(!$needsConc -and !$needsAudit){
  Log 'Colecciones conciliaciones y auditLog ya están presentes. No hay cambios necesarios.'
} else {
  $insert = @()
  if($needsConc){ $insert += "'conciliaciones'" }
  if($needsAudit){ $insert += "'auditLog'" }
  $insertText = ($insert -join ',')
  $pattern = "'avisos','correos','cancelaciones','novedades','tareas'"
  if($txt.Contains($pattern)){
    $replacement = "'avisos','correos','cancelaciones','novedades','tareas',$insertText"
    $txt = $txt.Replace($pattern, $replacement)
    Log "Preparado cambio en COLLECTIONS: agrega $insertText"
  } else {
    throw 'No se encontró patrón esperado en COLLECTIONS. Revisión manual requerida.'
  }
}

if($DryRun){
  if($txt -ne $original){ Log 'DRYRUN: se detectó cambio requerido, no se escribió archivo.' }
  else { Log 'DRYRUN: sin cambios.' }
} else {
  Copy-Item -LiteralPath $storePath -Destination (Join-Path $backupDir 'store-firestore-lab.local.js.bak') -Force
  if($txt -ne $original){
    Set-Content -LiteralPath $storePath -Value $txt -Encoding UTF8
    Log "APPLY: archivo actualizado. Backup: $backupDir"
  } else {
    Log 'APPLY: sin cambios; backup creado igualmente.'
  }
}

$node = Get-Command node -ErrorAction SilentlyContinue
if($node){
  $validator = Join-Path $RepoRoot 'tools/orbit360-validar-adapter-conciliaciones-firestore-lab-ays.mjs'
  if(Test-Path $validator){
    Log 'Ejecutando validador estático adapter...'
    $p = Start-Process -FilePath $node.Source -ArgumentList @($validator, '--store', $storeRel) -WorkingDirectory $RepoRoot -NoNewWindow -Wait -PassThru -RedirectStandardOutput (Join-Path $reports "VALIDADOR-ADAPTER-CONCILIACIONES-$ts.out") -RedirectStandardError (Join-Path $reports "VALIDADOR-ADAPTER-CONCILIACIONES-$ts.err")
    Log "Validador exit code: $($p.ExitCode)"
    if($p.ExitCode -ne 0){ Log 'WARN: validador reportó fallos; revisar reporte generado.' }
  } else {
    Log 'WARN: no existe validador estático adapter.'
  }
} else {
  Log 'WARN: Node no disponible; no se ejecutó validador.'
}

$out = Join-Path $reports "INTEGRAR-ADAPTER-CONCILIACIONES-FIRESTORE-LAB-AYS-$ts.txt"
$lines | Set-Content -LiteralPath $out -Encoding UTF8
Log "Reporte: $out"
