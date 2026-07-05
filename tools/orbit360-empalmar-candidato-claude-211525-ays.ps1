<#
Orbit 360 A&S — Empalme seguro candidato Claude 211525
Modo: local/sandbox. No hace commit, no merge, no deploy.

Uso sugerido desde la raíz del repo:
  powershell -ExecutionPolicy Bypass -File tools/orbit360-empalmar-candidato-claude-211525-ays.ps1 -ZipPath "C:\ruta\Prototype Development Request - 2026-07-04T211525.464.zip"

Qué hace:
- Verifica que el ZIP tenga raíz orbit360-platform/.
- Copia archivos del candidato al repo excluyendo backend protegido.
- Preserva loader/init/store Firestore LAB en index.html.
- Preserva auth LAB fix en index.html.
- Ejecuta node --check sobre JS si Node está disponible.
- Genera reporte en _orbit360_reports/.
#>
param(
  [Parameter(Mandatory=$true)] [string]$ZipPath,
  [string]$RepoRoot = (Get-Location).Path,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$reports = Join-Path $RepoRoot '_orbit360_reports'
$tmp = Join-Path $RepoRoot "_orbit360_tmp\empalme-claude-211525-$ts"
New-Item -ItemType Directory -Force -Path $reports | Out-Null
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$report = New-Object System.Collections.Generic.List[string]
function Add-Report([string]$line){ $report.Add($line); Write-Host $line }

Add-Report '============================================================'
Add-Report 'ORBIT 360 A&S — EMPALME SEGURO CANDIDATO CLAUDE 211525'
Add-Report "Fecha: $(Get-Date -Format s)"
Add-Report "RepoRoot: $RepoRoot"
Add-Report "ZipPath: $ZipPath"
Add-Report "DryRun: $DryRun"
Add-Report 'Restricciones: no commit, no merge, no deploy, no main, no backend protegido.'
Add-Report '============================================================'

if(!(Test-Path $ZipPath)){ throw "No existe ZIP: $ZipPath" }
if(!(Test-Path (Join-Path $RepoRoot 'orbit360-platform'))){ throw 'No se encontró orbit360-platform/ en RepoRoot.' }

Expand-Archive -LiteralPath $ZipPath -DestinationPath $tmp -Force
$srcRoot = Join-Path $tmp 'orbit360-platform'
if(!(Test-Path $srcRoot)){ throw 'ZIP inválido: no contiene raíz orbit360-platform/.' }

$protected = @(
  'orbit360-platform/data/store.js',
  'orbit360-platform/data/store-firestore-lab.local.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-security-guard.js',
  'firestore.rules',
  'tools/orbit360-smoke-ays-lab-v99.ps1',
  'tools/orbit360-integrar-backend-lab-index.ps1',
  'tools/orbit360-run-flujo-ays-lab-v99.ps1',
  'tools/orbit360-validar-backend-lab-contrato.mjs',
  'tools/orbit360-preflight-candidato-claude-ays.mjs',
  'tools/orbit360-plan-empalme-candidato-claude-ays.mjs',
  'tools/orbit360-preview-overlay-candidato-claude-ays.mjs',
  'tools/orbit360-diff-preview-overlay-ays.mjs',
  'tools/orbit360-pipeline-empalme-candidato-claude-ays.mjs',
  'tools/orbit360-validar-manifest-fuente-ays.mjs',
  'tools/orbit360-normalizar-pais-moneda-ays.mjs',
  'tools/orbit360-calcular-score-conciliacion-ays.mjs',
  'tools/orbit360-validar-dryrun-report-ays.mjs',
  'tools/orbit360-validar-conciliacion-propuesta-ays.mjs',
  'tools/orbit360-generar-propuestas-conciliacion-ays.mjs',
  'tools/orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs'
) | ForEach-Object { $_.Replace('\\','/') }
$protectedSet = @{}
foreach($p in $protected){ $protectedSet[$p] = $true }

$copied = 0
$skipped = 0
$errors = 0

Get-ChildItem -Path $srcRoot -Recurse -File | ForEach-Object {
  $relInside = $_.FullName.Substring($srcRoot.Length).TrimStart('\\','/')
  $rel = ('orbit360-platform/' + $relInside).Replace('\\','/')
  if($protectedSet.ContainsKey($rel)){
    Add-Report "SKIP protegido: $rel"
    $script:skipped++
    return
  }
  $dest = Join-Path $RepoRoot $rel
  if($DryRun){
    Add-Report "DRYRUN copiaría: $rel"
    $script:copied++
  } else {
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
    $script:copied++
  }
}

# Preservar integración backend LAB dentro de index.html después de copiar candidato.
$indexPath = Join-Path $RepoRoot 'orbit360-platform/index.html'
if(!$DryRun -and (Test-Path $indexPath)){
  $idx = Get-Content -Raw -LiteralPath $indexPath
  if($idx -notmatch 'core/backend-lab-loader\.js'){
    $idx = $idx -replace '<script src="data/store\.js\?v1291"></script>\s*<script src="data/seed\.js\?v1291"></script>', '<script src="core/backend-lab-loader.js?v=lab-20260703"></script>`n  <script src="core/backend-lab-init.js?v=lab-20260703"></script>`n  <script src="data/store.js?v1291"></script>`n  <script src="data/store-firestore-lab.local.js?v=lab-store-20260703"></script>`n  <script src="data/seed.js?v1291"></script>'
  }
  $idx = $idx -replace '<script src="core/auth\.js\?v1304"></script>', '<script src="core/auth.js?v1295-labfix-20260703"></script>'
  Set-Content -LiteralPath $indexPath -Value $idx -Encoding UTF8
  Add-Report 'INDEX: backend LAB loader/init/store LAB y auth labfix preservados/verificados.'
}

# Validación JS.
$node = Get-Command node -ErrorAction SilentlyContinue
if($node){
  $jsFiles = Get-ChildItem -Path (Join-Path $RepoRoot 'orbit360-platform') -Recurse -File -Filter '*.js'
  foreach($f in $jsFiles){
    $p = Start-Process -FilePath $node.Source -ArgumentList @('--check', $f.FullName) -NoNewWindow -Wait -PassThru -RedirectStandardError (Join-Path $tmp 'node.err') -RedirectStandardOutput (Join-Path $tmp 'node.out')
    if($p.ExitCode -ne 0){
      Add-Report "ERROR JS: $($f.FullName)"
      Get-Content (Join-Path $tmp 'node.err') | ForEach-Object { Add-Report $_ }
      $errors++
    }
  }
  Add-Report "NODE CHECK: $($jsFiles.Count) archivos JS revisados; errores=$errors"
} else {
  Add-Report 'WARN: Node no disponible; no se ejecutó node --check.'
}

Add-Report "Copiados/planificados: $copied"
Add-Report "Omitidos protegidos: $skipped"
Add-Report "Errores: $errors"
Add-Report 'Resultado: ' + ($(if($errors -eq 0){'OK'}else{'REVISAR'}))

$outTxt = Join-Path $reports "EMPALME-CANDIDATO-CLAUDE-211525-$ts.txt"
$outJson = Join-Path $reports "EMPALME-CANDIDATO-CLAUDE-211525-$ts.json"
$report | Set-Content -LiteralPath $outTxt -Encoding UTF8
@{
  fecha = (Get-Date).ToString('s')
  candidato = 'Prototype Development Request - 2026-07-04T211525.464.zip'
  copied = $copied
  skippedProtected = $skipped
  errors = $errors
  dryRun = [bool]$DryRun
  protected = $protected
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $outJson -Encoding UTF8

if($errors -ne 0){ exit 1 }
exit 0
