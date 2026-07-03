# Orbit 360 - Smoke v1.97 demo + Firestore LAB
# Fecha: 2026-07-03
# Restricciones: sin main, sin deploy, sin Hosting, sin producción.
# No usa git clean. Sincroniza solo archivos tracked con origin/branch y abre URLs locales.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$Repo = Join-Path $env:USERPROFILE 'OneDrive\Documentos\GitHub\orbit360-core'
$Branch = 'ays/backend-tenant-lab-v99-20260703'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$ReportDir = Join-Path $Repo '_orbit360_reports'
$Report = Join-Path $ReportDir "smoke_v197_demo_lab_$Stamp.txt"
$Port = 5177
$Platform = Join-Path $Repo 'orbit360-platform'

function Log($Text) { $Text | Tee-Object -FilePath $Report -Append }
function Fail($Text) {
  Log "ERROR: $Text"
  try { Get-Content $Report -Raw | Set-Clipboard } catch {}
  try { notepad $Report } catch {}
  throw $Text
}

if (!(Test-Path $Repo)) { throw "No existe el repo local: $Repo" }
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
"ORBIT 360 - SMOKE V1.97 DEMO + LAB" | Set-Content -Path $Report -Encoding UTF8

Log "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Log "Repo: $Repo"
Log "Rama esperada: $Branch"
Log "Puerto: $Port"
Log "Restricciones: sin main, sin deploy, sin Hosting, sin producción"
Log ""

Set-Location $Repo

Log "== Sincronizar rama sin git clean =="
$CurrentBranch = (git branch --show-current).Trim()
Log "Rama actual: $CurrentBranch"
if ($CurrentBranch -ne $Branch) {
  git checkout $Branch 2>&1 | Tee-Object -FilePath $Report -Append
  if ($LASTEXITCODE -ne 0) { Fail "No se pudo cambiar a $Branch" }
}

git fetch origin $Branch 2>&1 | Tee-Object -FilePath $Report -Append
if ($LASTEXITCODE -ne 0) { Fail "git fetch falló" }

git reset --hard "origin/$Branch" 2>&1 | Tee-Object -FilePath $Report -Append
if ($LASTEXITCODE -ne 0) { Fail "git reset --hard origin/$Branch falló" }

Log "OK: rama sincronizada con remoto. No se ejecutó git clean."
Log ""

Log "== Validar archivos críticos =="
$Required = @(
  'orbit360-platform\index.html',
  'orbit360-platform\core\auth.js',
  'orbit360-platform\core\backend-lab-loader.js',
  'orbit360-platform\core\backend-lab-init.js',
  'orbit360-platform\data\store.js',
  'orbit360-platform\data\store-firestore-lab.local.js',
  'orbit360-platform\data\seed.js',
  'orbit360-platform\modules\finanzas.js',
  'orbit360-platform\modules\configuracion.js'
)
foreach ($Rel in $Required) {
  if (!(Test-Path (Join-Path $Repo $Rel))) { Fail "Falta archivo requerido: $Rel" }
  Log "OK existe: $Rel"
}

$Index = Get-Content (Join-Path $Repo 'orbit360-platform\index.html') -Raw -Encoding UTF8
if ($Index -notmatch 'backend-lab-loader.js' -or $Index -notmatch 'backend-lab-init.js' -or $Index -notmatch 'store-firestore-lab.local.js') { Fail "index.html no conserva hooks LAB" }
if ($Index -match 'localStorage\.getItem|localStorage\.setItem') { Fail "index.html contiene localStorage ejecutable" }
if ($Index -notmatch 'v1291') { Fail "index.html no contiene versión v1291" }
Log "OK: index hooks LAB + sidebar sin localStorage ejecutable."

$Auth = Get-Content (Join-Path $Repo 'orbit360-platform\core\auth.js') -Raw -Encoding UTF8
if ($Auth -notmatch 'loginFirebase' -or $Auth -notmatch 'onAuthStateChanged' -or $Auth -notmatch 'orbit\.lab@demo\.com') { Fail "core/auth.js no conserva Auth Firebase LAB" }
if ($Auth -notmatch 'Andrea Beltrán') { Fail "core/auth.js no conserva identidad ficticia demo v1.97" }
Log "OK: Auth dual demo + Firebase LAB."

$Seed = Get-Content (Join-Path $Repo 'orbit360-platform\data\seed.js') -Raw -Encoding UTF8
if ($Seed -notmatch '__v:\s*36') { Fail "seed.js no marca __v: 36" }
Log "OK: seed.__v = 36."

$Lab = Get-Content (Join-Path $Repo 'orbit360-platform\data\store-firestore-lab.local.js') -Raw -Encoding UTF8
if ($Lab -notmatch 'v1\.74-firestore-lab-write-status') { Fail "Firestore LAB no está en v1.74" }
if ($Lab -notmatch 'writeQueue' -or $Lab -notmatch 'writeErrors' -or $Lab -notmatch 'orbit:backend:write-ok') { Fail "Firestore LAB no conserva trazabilidad de escrituras" }
Log "OK: Firestore LAB v1.74 con write status."

Log ""
Log "== node --check críticos =="
$NodeOk = $false
try { node --version | Out-Null; if ($LASTEXITCODE -eq 0) { $NodeOk = $true } } catch {}
if ($NodeOk) {
  $Checks = @(
    'orbit360-platform\core\auth.js',
    'orbit360-platform\data\store.js',
    'orbit360-platform\data\store-firestore-lab.local.js',
    'orbit360-platform\data\seed.js',
    'orbit360-platform\modules\finanzas.js',
    'orbit360-platform\modules\configuracion.js'
  )
  foreach ($Rel in $Checks) {
    node --check $Rel 2>&1 | Tee-Object -FilePath $Report -Append
    if ($LASTEXITCODE -ne 0) { Fail "node --check falló: $Rel" }
    Log "OK node --check: $Rel"
  }
} else {
  Log "ALERTA: Node no disponible; se omite node --check."
}

Log ""
Log "== Levantar servidor local =="
$Existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($Existing) {
  Log "Puerto $Port ya está ocupado. Se intentará usar servidor existente."
} else {
  $Python = $null
  try { py --version | Out-Null; if ($LASTEXITCODE -eq 0) { $Python = 'py' } } catch {}
  if (!$Python) { try { python --version | Out-Null; if ($LASTEXITCODE -eq 0) { $Python = 'python' } } catch {} }
  if (!$Python) { Fail "No encontré py ni python para levantar servidor local." }
  Start-Process powershell -ArgumentList @('-NoExit','-Command',"cd '$Platform'; $Python -m http.server $Port") | Out-Null
  Start-Sleep -Seconds 3
  Log "OK: servidor local solicitado en puerto $Port."
}

$DemoUrl = "http://127.0.0.1:$Port/index.html"
$LabUrl = "http://127.0.0.1:$Port/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones"

Log ""
Log "== Probar HTTP index =="
try {
  $Resp = Invoke-WebRequest -Uri $DemoUrl -UseBasicParsing -TimeoutSec 10
  Log "HTTP demo: $($Resp.StatusCode)"
} catch { Log "ALERTA: no pude validar HTTP demo: $($_.Exception.Message)" }

Log ""
Log "== Abrir navegador =="
Start-Process $DemoUrl
Start-Sleep -Seconds 2
Start-Process $LabUrl
Log "Demo URL: $DemoUrl"
Log "LAB URL: $LabUrl"

Log ""
Log "== Checklist visual/manual =="
Log "1. Demo normal: debe mostrar login Orbit 360 sin errores visibles."
Log "2. Ingresar demo: admin@demo.com / demo123. Debe entrar con usuario Andrea Beltrán."
Log "3. LAB: debe mostrar login con orbit.lab@demo.com y contraseña vacía para ingresar la clave local."
Log "4. LAB después de login: abrir consola y ejecutar: OrbitBackend.status()"
Log "5. Confirmar apiVersion: v1.74-firestore-lab-write-status."
Log "6. Confirmar tenantId: alianzas-soluciones."
Log "7. Ejecutar prueba ficticia: Orbit.store.insert('actividades',{titulo:'smoke v197',tipo:'smoke'})"
Log "8. Luego revisar: OrbitBackend.status().writeQueue y writeErrors."
Log ""
Log "RESULTADO: smoke estático/local preparado. Falta confirmación visual y consola por Paula."
Log "Reporte: $Report"

try { Get-Content $Report -Raw | Set-Clipboard } catch {}
try { notepad $Report } catch {}
