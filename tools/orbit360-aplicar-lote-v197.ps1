# Orbit 360 - Aplicar lote v1.97 de Claude sobre Backend LAB
# Fecha: 2026-07-03
# Restricciones: sin main, sin deploy, sin Hosting, sin producción, sin datos reales.
# Uso: ejecuta desde el repo local. Requiere el ZIP Claude v1.97 en Descargas o raíz del repo.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Repo = Join-Path $env:USERPROFILE 'OneDrive\Documentos\GitHub\orbit360-core'
$Branch = 'ays/backend-tenant-lab-v99-20260703'
$ReportDir = Join-Path $Repo '_orbit360_reports'
$Report = Join-Path $ReportDir "aplicar_lote_v197_$Stamp.txt"
$TempRoot = Join-Path $env:TEMP "orbit360_v197_apply_$Stamp"
$ZipName = 'Prototype Development Request - 2026-07-03T090030.154.zip'

function Log($Text) { $Text | Tee-Object -FilePath $Report -Append }
function Fail($Text) {
  Log "ERROR: $Text"
  try { Get-Content $Report -Raw | Set-Clipboard } catch {}
  try { notepad $Report } catch {}
  throw $Text
}

New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
"ORBIT 360 - APLICAR LOTE V1.97" | Set-Content -Path $Report -Encoding UTF8
Log "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Log "Repo: $Repo"
Log "Rama esperada: $Branch"
Log "Restricciones: sin main, sin deploy, sin Hosting, sin producción"
Log ""

if (!(Test-Path $Repo)) { Fail "No existe el repo local: $Repo" }
Set-Location $Repo

$CurrentBranch = (git branch --show-current).Trim()
Log "Rama actual: $CurrentBranch"
if ($CurrentBranch -ne $Branch) {
  git checkout $Branch 2>&1 | Tee-Object -FilePath $Report -Append
  if ($LASTEXITCODE -ne 0) { Fail "No se pudo cambiar a $Branch" }
}

$Dirty = git status --porcelain
if ($Dirty) {
  Log "Working tree no limpio. No se aplica lote para evitar sobrescribir cambios:"
  $Dirty | Tee-Object -FilePath $Report -Append
  Fail "Primero respalda/limpia cambios locales o usa el bloque de recuperación segura."
}

$ZipCandidates = @(
  (Join-Path $env:USERPROFILE "Downloads\$ZipName"),
  (Join-Path $Repo $ZipName),
  (Join-Path (Get-Location).Path $ZipName)
)
$ZipPath = $ZipCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (!$ZipPath) {
  Log "No encontré el ZIP v1.97 en:"
  $ZipCandidates | ForEach-Object { Log "- $_" }
  Fail "Descarga el ZIP v1.97 en Descargas o raíz del repo."
}
Log "ZIP encontrado: $ZipPath"

if (Test-Path $TempRoot) { Remove-Item $TempRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
Expand-Archive -Path $ZipPath -DestinationPath $TempRoot -Force
$SrcPlatform = Join-Path $TempRoot 'orbit360-platform'
if (!(Test-Path $SrcPlatform)) { Fail "El ZIP no contiene orbit360-platform/ en raíz." }

$FilesToApply = @(
  'orbit360-platform\CHANGELOG.md',
  'orbit360-platform\core\auth.js',
  'orbit360-platform\core\ciclo.js',
  'orbit360-platform\core\ia.js',
  'orbit360-platform\core\importa.js',
  'orbit360-platform\data\seed.js',
  'orbit360-platform\docs\BITACORA-CAMBIOS.md',
  'orbit360-platform\modules\academia.js',
  'orbit360-platform\modules\configuracion.js',
  'orbit360-platform\modules\finanzas.js',
  'orbit360-platform\modules\marketing.js'
)

Log "Copiando archivos v1.97 autorizados..."
foreach ($Rel in $FilesToApply) {
  $Src = Join-Path $TempRoot $Rel
  $Dst = Join-Path $Repo $Rel
  if (!(Test-Path $Src)) { Fail "Falta archivo en ZIP: $Rel" }
  Copy-Item -Path $Src -Destination $Dst -Force
  Log "OK: $Rel"
}

Log "Empalmando index.html v1.97 con backend LAB..."
$IndexSrc = Join-Path $TempRoot 'orbit360-platform\index.html'
$IndexDst = Join-Path $Repo 'orbit360-platform\index.html'
$Index = Get-Content $IndexSrc -Raw -Encoding UTF8
$OldLayer = @'
  <script src="core/comisiones-eng.js?v1291"></script>
  <!-- ============ DATA LAYER (depende de config + primas) ============ -->
  <script src="data/store.js?v1291"></script>
  <script src="data/seed.js?v1291"></script>
'@
$NewLayer = @'
  <script src="core/comisiones-eng.js?v1291"></script>
  <!-- ============ DATA LAYER (depende de config + primas) ============ -->
  <script src="core/backend-lab-loader.js?v=lab-20260703"></script>
  <script src="core/backend-lab-init.js?v=lab-20260703"></script>
  <script src="data/store.js?v1291"></script>
  <script src="data/store-firestore-lab.local.js?v=lab-store-20260703"></script>
  <script src="data/seed.js?v1291"></script>
'@
if (!$Index.Contains($OldLayer)) { Fail "No encontré bloque DATA LAYER esperado en index v1.97." }
$Index = $Index.Replace($OldLayer, $NewLayer)

$OldSidebar = @'
    // mostrar / ocultar sidebar (persistente)
    (function () {
      var b = document.getElementById('burger');
      function paint() { document.body.classList.toggle('sb-hidden', localStorage.getItem('orbit360_sbhide') === '1'); }
      b.addEventListener('click', function () {
        var h = localStorage.getItem('orbit360_sbhide') === '1';
        try { localStorage.setItem('orbit360_sbhide', h ? '0' : '1'); } catch (e) {}
        paint();
      });
      paint();
    })();
'@
$NewSidebar = @'
    // mostrar / ocultar sidebar (persistente vía Orbit.store, sin localStorage directo en shell)
    (function () {
      var b = document.getElementById('burger');
      function hidden() {
        try { return Orbit.store && Orbit.store.pref && Orbit.store.pref('orbit360_sbhide', '0') === '1'; }
        catch (e) { return false; }
      }
      function saveHidden(value) {
        try { if (Orbit.store && Orbit.store.setPref) Orbit.store.setPref('orbit360_sbhide', value ? '1' : '0'); }
        catch (e) {}
      }
      function paint() { document.body.classList.toggle('sb-hidden', hidden()); }
      b.addEventListener('click', function () {
        saveHidden(!hidden());
        paint();
      });
      paint();
    })();
'@
if (!$Index.Contains($OldSidebar)) { Fail "No encontré bloque sidebar esperado en index v1.97." }
$Index = $Index.Replace($OldSidebar, $NewSidebar)
Set-Content -Path $IndexDst -Value $Index -Encoding UTF8
Log "OK: index.html empalmado."

Log "Validaciones..."
$IndexNow = Get-Content $IndexDst -Raw -Encoding UTF8
if ($IndexNow -notmatch 'backend-lab-loader.js' -or $IndexNow -notmatch 'backend-lab-init.js' -or $IndexNow -notmatch 'store-firestore-lab.local.js') { Fail "index.html no conserva hooks LAB." }
if ($IndexNow -match 'localStorage\.getItem|localStorage\.setItem') { Fail "index.html aún usa localStorage ejecutable." }

$SeedTxt = Get-Content (Join-Path $Repo 'orbit360-platform\data\seed.js') -Raw -Encoding UTF8
if ($SeedTxt -notmatch '__v:\s*36') { Fail "seed.js no marca __v: 36." }

$ConfigTxt = Get-Content (Join-Path $Repo 'orbit360-platform\modules\configuracion.js') -Raw -Encoding UTF8
if ($ConfigTxt -match 'localStorage') { Fail "modules/configuracion.js contiene localStorage." }

$FinTxt = Get-Content (Join-Path $Repo 'orbit360-platform\modules\finanzas.js') -Raw -Encoding UTF8
if ($FinTxt -match 'localStorage') { Fail "modules/finanzas.js contiene localStorage." }

$BackendLab = Join-Path $Repo 'orbit360-platform\data\store-firestore-lab.local.js'
if (!(Test-Path $BackendLab)) { Fail "Falta store-firestore-lab.local.js protegido." }
$BackendTxt = Get-Content $BackendLab -Raw -Encoding UTF8
if ($BackendTxt -notmatch 'v1\.74-firestore-lab-write-status') { Fail "No se preservó Firestore LAB v1.74." }

$NodeOk = $false
try { node --version | Out-Null; if ($LASTEXITCODE -eq 0) { $NodeOk = $true } } catch {}
if ($NodeOk) {
  $Checks = @(
    'orbit360-platform\core\auth.js',
    'orbit360-platform\core\ciclo.js',
    'orbit360-platform\core\ia.js',
    'orbit360-platform\core\importa.js',
    'orbit360-platform\data\seed.js',
    'orbit360-platform\modules\academia.js',
    'orbit360-platform\modules\configuracion.js',
    'orbit360-platform\modules\finanzas.js',
    'orbit360-platform\modules\marketing.js',
    'orbit360-platform\data\store-firestore-lab.local.js'
  )
  foreach ($Rel in $Checks) {
    node --check $Rel 2>&1 | Tee-Object -FilePath $Report -Append
    if ($LASTEXITCODE -ne 0) { Fail "node --check falló: $Rel" }
    Log "OK node --check: $Rel"
  }
} else {
  Log "ALERTA: Node no disponible; se omite node --check."
}

git diff --stat 2>&1 | Tee-Object -FilePath $Report -Append
$Changed = git status --porcelain
if (!$Changed) { Fail "No hubo cambios para commit." }

git add -- orbit360-platform/index.html orbit360-platform/CHANGELOG.md orbit360-platform/core/auth.js orbit360-platform/core/ciclo.js orbit360-platform/core/ia.js orbit360-platform/core/importa.js orbit360-platform/data/seed.js orbit360-platform/docs/BITACORA-CAMBIOS.md orbit360-platform/modules/academia.js orbit360-platform/modules/configuracion.js orbit360-platform/modules/finanzas.js orbit360-platform/modules/marketing.js
if ($LASTEXITCODE -ne 0) { Fail "git add falló." }

git commit -m "feat(v197): empalmar prototipo Claude con backend LAB" 2>&1 | Tee-Object -FilePath $Report -Append
if ($LASTEXITCODE -ne 0) { Fail "git commit falló." }

git push origin $Branch 2>&1 | Tee-Object -FilePath $Report -Append
if ($LASTEXITCODE -ne 0) { Fail "git push falló." }

Log "RESULTADO: lote v1.97 aplicado y subido a GitHub en $Branch."
try { Get-Content $Report -Raw | Set-Clipboard } catch {}
try { notepad $Report } catch {}
