# Orbit 360 - Aplicar lote principal v1.88 de Claude sobre Backend LAB
# Fecha: 2026-07-03
# Restricciones: sin main, sin deploy, sin Hosting, sin producción, sin datos reales.
# Objetivo: aplicar solo archivos autorizados del paquete v1.88 preparado y subirlos a la rama backend estable.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Repo = Join-Path $env:USERPROFILE 'OneDrive\Documentos\GitHub\orbit360-core'
$Branch = 'ays/backend-tenant-lab-v99-20260703'
$ReportDir = Join-Path $Repo '_orbit360_reports'
$Report = Join-Path $ReportDir "aplicar_lote_v188_$Stamp.txt"
$TempRoot = Join-Path $env:TEMP "orbit360_v188_apply_$Stamp"

$ExpectedZipName = 'orbit360-v188-empalme-local-preparado.zip'
$ZipCandidates = @(
  (Join-Path $env:USERPROFILE "Downloads\$ExpectedZipName"),
  (Join-Path $env:USERPROFILE "OneDrive\Documentos\$ExpectedZipName"),
  (Join-Path $env:USERPROFILE "OneDrive\Escritorio\$ExpectedZipName"),
  (Join-Path $Repo $ExpectedZipName),
  (Join-Path (Get-Location).Path $ExpectedZipName)
)

function Log($Text) {
  $Text | Tee-Object -FilePath $Report -Append
}

function Fail($Text) {
  Log "ERROR: $Text"
  if (Test-Path $Report) {
    try { Get-Content $Report -Raw | Set-Clipboard } catch {}
    try { notepad $Report } catch {}
  }
  throw $Text
}

New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
"ORBIT 360 - APLICAR LOTE PRINCIPAL V1.88" | Set-Content -Path $Report -Encoding UTF8
Log "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Log "Repo esperado: $Repo"
Log "Rama esperada: $Branch"
Log "Restricciones: sin main, sin deploy, sin Hosting, sin producción, sin datos reales"
Log ""

if (!(Test-Path $Repo)) { Fail "No existe el repo local: $Repo" }
Set-Location $Repo

Log "== Verificar Git =="
$GitVersion = git --version 2>&1
if ($LASTEXITCODE -ne 0) { Fail "Git no está disponible." }
Log "OK: $GitVersion"

$CurrentBranch = (git branch --show-current).Trim()
Log "Rama actual: $CurrentBranch"
if ($CurrentBranch -ne $Branch) {
  Log "Cambiando a rama $Branch..."
  git checkout $Branch 2>&1 | Tee-Object -FilePath $Report -Append
  if ($LASTEXITCODE -ne 0) { Fail "No se pudo hacer checkout a $Branch." }
}

$CurrentBranch = (git branch --show-current).Trim()
if ($CurrentBranch -ne $Branch) { Fail "La rama activa no es $Branch; es $CurrentBranch." }
Log "OK: rama correcta."

Log ""
Log "== Validar estado limpio antes de aplicar =="
$StatusBefore = git status --porcelain
if ($StatusBefore) {
  Log $StatusBefore
  Fail "El repo tiene cambios locales sin commit. No se aplica el lote para evitar pérdida o mezcla."
}
Log "OK: working tree limpio."

Log ""
Log "== Localizar ZIP preparado =="
$ZipPath = $ZipCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (!$ZipPath) {
  Log "No encontré $ExpectedZipName en rutas comunes:"
  $ZipCandidates | ForEach-Object { Log "- $_" }
  Fail "Descarga el ZIP preparado y colócalo en Descargas o en la raíz del repo."
}
Log "OK: ZIP encontrado: $ZipPath"

Log ""
Log "== Extraer ZIP temporal =="
if (Test-Path $TempRoot) { Remove-Item $TempRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
Expand-Archive -Path $ZipPath -DestinationPath $TempRoot -Force
$SourcePlatform = Join-Path $TempRoot 'orbit360-platform'
if (!(Test-Path $SourcePlatform)) { Fail "El ZIP no contiene orbit360-platform en raíz." }
Log "OK: extraído en $TempRoot"

Log ""
Log "== Validar que NO se toque data/store.js ni backend LAB =="
$Protected = @(
  'orbit360-platform\data\store.js',
  'orbit360-platform\core\backend-lab-loader.js',
  'orbit360-platform\core\backend-lab-init.js',
  'orbit360-platform\data\store-firestore-lab.local.js',
  'orbit360-platform\core\auth-firebase.config.local.js'
)
$Protected | ForEach-Object { Log "Protegido: $_" }

$FilesToApply = @(
  'orbit360-platform\core\config.js',
  'orbit360-platform\data\seed.js',
  'orbit360-platform\modules\configuracion.js',
  'orbit360-platform\modules\finanzas.js',
  'orbit360-platform\docs\BITACORA-CAMBIOS.md',
  'orbit360-platform\CHANGELOG.md'
)

Log ""
Log "== Copiar solo archivos autorizados =="
foreach ($Rel in $FilesToApply) {
  $Src = Join-Path $TempRoot $Rel
  $Dst = Join-Path $Repo $Rel
  if (!(Test-Path $Src)) { Fail "Falta en ZIP preparado: $Rel" }
  Copy-Item -Path $Src -Destination $Dst -Force
  Log "OK copiado: $Rel"
}

Log ""
Log "== Validaciones de texto y reglas =="
$BadEncodingHits = @()
foreach ($Rel in $FilesToApply) {
  $Path = Join-Path $Repo $Rel
  $Txt = Get-Content $Path -Raw -Encoding UTF8
  if ($Txt -match 'Ã|Â') { $BadEncodingHits += $Rel }
}
if ($BadEncodingHits.Count -gt 0) {
  $BadEncodingHits | ForEach-Object { Log "ALERTA mojibake posible: $_" }
  Fail "Se detectó posible mojibake en archivos aplicados. Revertir antes de continuar."
}
Log "OK: sin patrones mojibake Ã/Â en archivos aplicados."

$ConfigTxt = Get-Content (Join-Path $Repo 'orbit360-platform\modules\configuracion.js') -Raw -Encoding UTF8
if ($ConfigTxt -match 'localStorage') { Fail "modules/configuracion.js todavía contiene localStorage." }
Log "OK: modules/configuracion.js sin localStorage."

$IndexTxt = Get-Content (Join-Path $Repo 'orbit360-platform\index.html') -Raw -Encoding UTF8
if ($IndexTxt -notmatch 'backend-lab-loader.js' -or $IndexTxt -notmatch 'backend-lab-init.js' -or $IndexTxt -notmatch 'store-firestore-lab.local.js') {
  Fail "index.html no conserva hooks backend LAB."
}
if ($IndexTxt -notmatch 'v1287') { Fail "index.html no conserva versión v1287." }
Log "OK: index.html conserva hooks backend LAB y v1287."

$SeedTxt = Get-Content (Join-Path $Repo 'orbit360-platform\data\seed.js') -Raw -Encoding UTF8
if ($SeedTxt -notmatch '__v:\s*35') { Fail "seed.js no marca __v: 35." }
Log "OK: seed.__v = 35."

Log ""
Log "== node --check archivos críticos =="
$NodeAvailable = $false
try {
  $NodeVersion = node --version 2>$null
  if ($LASTEXITCODE -eq 0) { $NodeAvailable = $true; Log "Node: $NodeVersion" }
} catch {}
if ($NodeAvailable) {
  $JsChecks = @(
    'orbit360-platform\core\config.js',
    'orbit360-platform\data\seed.js',
    'orbit360-platform\modules\configuracion.js',
    'orbit360-platform\modules\finanzas.js',
    'orbit360-platform\data\store.js',
    'orbit360-platform\data\store-firestore-lab.local.js'
  )
  foreach ($Rel in $JsChecks) {
    if (Test-Path $Rel) {
      node --check $Rel 2>&1 | Tee-Object -FilePath $Report -Append
      if ($LASTEXITCODE -ne 0) { Fail "node --check falló en $Rel" }
      Log "OK node --check: $Rel"
    } else {
      Log "OMITIDO node --check no existe local/repo: $Rel"
    }
  }
} else {
  Log "ALERTA: Node no disponible; se omite node --check local."
}

Log ""
Log "== Diff stat =="
git diff --stat 2>&1 | Tee-Object -FilePath $Report -Append

$Changed = git status --porcelain
if (!$Changed) { Fail "No hubo cambios después de copiar lote; nada para commit." }
Log ""
Log "Cambios detectados:"
$Changed | Tee-Object -FilePath $Report -Append

Log ""
Log "== Commit y push a rama backend estable =="
git add -- `
  orbit360-platform/core/config.js `
  orbit360-platform/data/seed.js `
  orbit360-platform/modules/configuracion.js `
  orbit360-platform/modules/finanzas.js `
  orbit360-platform/docs/BITACORA-CAMBIOS.md `
  orbit360-platform/CHANGELOG.md
if ($LASTEXITCODE -ne 0) { Fail "git add falló." }

git commit -m "feat(v188): empalmar lote principal del prototipo Claude" 2>&1 | Tee-Object -FilePath $Report -Append
if ($LASTEXITCODE -ne 0) { Fail "git commit falló." }

$NewHead = (git rev-parse HEAD).Trim()
Log "Nuevo HEAD local: $NewHead"

git push origin $Branch 2>&1 | Tee-Object -FilePath $Report -Append
if ($LASTEXITCODE -ne 0) { Fail "git push falló." }
Log "OK: push realizado a origin/$Branch"

Log ""
Log "== Estado final =="
git status --short 2>&1 | Tee-Object -FilePath $Report -Append
Log ""
Log "RESULTADO: Lote v1.88 aplicado y subido a GitHub en rama backend estable."
Log "No se tocó main. No hubo deploy. No se tocó Hosting. No se tocaron datos reales."

try { Get-Content $Report -Raw | Set-Clipboard } catch {}
try { notepad $Report } catch {}
