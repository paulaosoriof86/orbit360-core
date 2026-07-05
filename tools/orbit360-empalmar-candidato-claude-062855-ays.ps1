<#
Orbit 360 A&S — Empalme seguro candidato Claude 062855

Uso desde raíz del repo local:
  powershell -ExecutionPolicy Bypass -File tools/orbit360-empalmar-candidato-claude-062855-ays.ps1 -CandidateRoot "C:\ruta\orbit360-platform" -DryRun
  powershell -ExecutionPolicy Bypass -File tools/orbit360-empalmar-candidato-claude-062855-ays.ps1 -CandidateRoot "C:\ruta\orbit360-platform" -Apply

Objetivo:
- Empalmar la candidata `Prototype Development Request - 2026-07-05T062855.313.zip`.
- Copiar frontend/docs seguros.
- Excluir backend protegido.
- Preservar inyección Backend LAB en index.html.
- Insertar/confirmar `modules/conciliaciones.js`.
- No commit, no merge, no deploy.
#>
param(
  [Parameter(Mandatory=$true)][string]$CandidateRoot,
  [string]$RepoRoot = (Get-Location).Path,
  [switch]$DryRun,
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$reports = Join-Path $RepoRoot '_orbit360_reports'
$backupDir = Join-Path $RepoRoot "_backups\pre-empalme-claude-062855-$ts"
New-Item -ItemType Directory -Force -Path $reports | Out-Null
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$lines = New-Object System.Collections.Generic.List[string]
function Log([string]$m){ $lines.Add($m); Write-Host $m }

if(!$DryRun -and !$Apply){ throw 'Indica -DryRun o -Apply.' }
if($DryRun -and $Apply){ throw 'Usa solo -DryRun o -Apply.' }
if(!(Test-Path $CandidateRoot)){ throw "No existe CandidateRoot: $CandidateRoot" }
if(!(Test-Path (Join-Path $CandidateRoot 'index.html'))){ throw 'CandidateRoot debe apuntar a carpeta orbit360-platform con index.html.' }
if(!(Test-Path (Join-Path $RepoRoot 'orbit360-platform/index.html'))){ throw 'RepoRoot no parece contener orbit360-platform/index.html.' }

$protected = @(
  'data/store.js',
  'data/store-firestore-lab.local.js',
  'core/backend-lab-loader.js',
  'core/backend-lab-init.js',
  'core/backend-lab-security-guard.js',
  'firestore.rules'
)

$skipPrefixes = @(
  'tools/orbit360-',
  '_orbit360_reports/',
  '_backups/'
)

function Norm([string]$p){ return ($p -replace '\\','/') }
function IsProtected([string]$rel){
  $r = Norm $rel
  if($protected -contains $r){ return $true }
  foreach($pref in $skipPrefixes){ if($r.StartsWith($pref)){ return $true } }
  return $false
}

Log '============================================================'
Log 'ORBIT 360 A&S — EMPALME SEGURO CANDIDATO CLAUDE 062855'
Log "Fecha: $(Get-Date -Format s)"
Log "RepoRoot: $RepoRoot"
Log "CandidateRoot: $CandidateRoot"
Log "DryRun: $DryRun"
Log "Apply: $Apply"
Log 'Restricciones: no commit, no merge, no deploy, no backend protegido.'
Log '============================================================'

$candidateFiles = Get-ChildItem -Path $CandidateRoot -Recurse -File
$copied = 0; $skipped = 0; $changed = 0
foreach($file in $candidateFiles){
  $rel = Norm ($file.FullName.Substring($CandidateRoot.Length).TrimStart('\','/'))
  if(IsProtected $rel){ Log "SKIP protegido: $rel"; $skipped++; continue }
  $dest = Join-Path (Join-Path $RepoRoot 'orbit360-platform') $rel
  $destDir = Split-Path $dest -Parent
  if($Apply){ New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
  $needs = $true
  if(Test-Path $dest){
    $srcHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash
    $dstHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $dest).Hash
    $needs = $srcHash -ne $dstHash
  }
  if($needs){
    Log "COPY: $rel"
    $changed++
    if($Apply){
      if(Test-Path $dest){
        $bak = Join-Path $backupDir $rel
        New-Item -ItemType Directory -Force -Path (Split-Path $bak -Parent) | Out-Null
        Copy-Item -LiteralPath $dest -Destination $bak -Force
      }
      Copy-Item -LiteralPath $file.FullName -Destination $dest -Force
    }
  }
  $copied++
}

# Preservar index LAB: tomar index candidato y reinyectar loader/init/store-firestore/auth labfix.
$idxCand = Join-Path $CandidateRoot 'index.html'
$idxRepo = Join-Path $RepoRoot 'orbit360-platform/index.html'
$idx = Get-Content -Raw -LiteralPath $idxCand
if($idx -notmatch 'core/backend-lab-loader.js'){
  $idx = $idx -replace '<script src="data/store.js\?v1291"></script>', "<script src=`"core/backend-lab-loader.js?v=lab-20260703`"></script>`n  <script src=`"core/backend-lab-init.js?v=lab-20260703`"></script>`n  <script src=`"data/store.js?v1291`"></script>`n  <script src=`"data/store-firestore-lab.local.js?v=lab-store-20260703`"></script>"
}
$idx = $idx -replace 'core/auth.js\?v[^"]+', 'core/auth.js?v1295-labfix-20260703'
if($idx -notmatch 'modules/conciliaciones.js'){
  $idx = $idx -replace '<script src="modules/cobros.js[^>]+></script>', '$0' + "`n  <script src=`"modules/conciliaciones.js?v1322`"></script>"
}
if($Apply){
  $bak = Join-Path $backupDir 'index.html'
  Copy-Item -LiteralPath $idxRepo -Destination $bak -Force
  Set-Content -LiteralPath $idxRepo -Value $idx -Encoding UTF8
}
Log 'INDEX: candidato + backend LAB preservado preparado.'

# Validaciones rápidas
$finalIndex = if($Apply){ Get-Content -Raw -LiteralPath $idxRepo } else { $idx }
$required = @('core/backend-lab-loader.js','core/backend-lab-init.js','data/store-firestore-lab.local.js','modules/conciliaciones.js','core/auth.js?v1295-labfix-20260703')
foreach($needle in $required){ if($finalIndex -notmatch [regex]::Escape($needle)){ throw "Index sin requisito: $needle" } }

$report = Join-Path $reports "EMPALME-CANDIDATO-CLAUDE-062855-AYS-$ts.txt"
$lines.Add('')
$lines.Add("Archivos revisados: $($candidateFiles.Count)")
$lines.Add("Archivos candidatos no protegidos: $copied")
$lines.Add("Protegidos omitidos: $skipped")
$lines.Add("Cambios detectados: $changed")
$lines.Add("Backup: $backupDir")
$lines.Add('Resultado: OK')
$lines | Set-Content -LiteralPath $report -Encoding UTF8
Log "Reporte: $report"
Log 'RESULTADO: OK'
