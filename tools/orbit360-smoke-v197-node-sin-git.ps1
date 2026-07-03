# Orbit 360 - Smoke v1.97 con Node, sin Git
# Fecha: 2026-07-03
# Restricciones: sin main, sin deploy, sin Hosting, sin producción.
# No ejecuta git fetch, git reset ni git clean. Usa Node como servidor local.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$Repo = Join-Path $env:USERPROFILE 'OneDrive\Documentos\GitHub\orbit360-core'
$Port = 5177
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$ReportDir = Join-Path $Repo '_orbit360_reports'
$Report = Join-Path $ReportDir "smoke_v197_node_sin_git_$Stamp.txt"
$Platform = Join-Path $Repo 'orbit360-platform'

function Add-Line($Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }
function Fail($Text) {
  Add-Line "ERROR: $Text"
  try { Get-Content $Report -Raw | Set-Clipboard } catch {}
  try { notepad $Report } catch {}
  throw $Text
}

if (!(Test-Path $Repo)) { throw "No existe el repo local: $Repo" }
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
Set-Content -Path $Report -Value 'ORBIT 360 - SMOKE V1.97 NODE SIN GIT' -Encoding UTF8

Set-Location $Repo
Add-Line "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Line "Repo: $Repo"
Add-Line "Puerto: $Port"
Add-Line "Restricciones: sin main, sin deploy, sin Hosting, sin producción"
Add-Line ""

Add-Line "== Validar Node =="
try { $NodeVersion = node --version } catch { Fail 'Node no está disponible.' }
if ($LASTEXITCODE -ne 0) { Fail 'Node no está disponible.' }
Add-Line "OK Node: $NodeVersion"
Add-Line ""

Add-Line "== Validar archivos críticos =="
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
  Add-Line "OK existe: $Rel"
}

$Index = Get-Content (Join-Path $Repo 'orbit360-platform\index.html') -Raw -Encoding UTF8
if ($Index -notmatch 'backend-lab-loader.js' -or $Index -notmatch 'backend-lab-init.js' -or $Index -notmatch 'store-firestore-lab.local.js') { Fail 'index.html no conserva hooks LAB.' }
if ($Index -match 'localStorage\.getItem|localStorage\.setItem') { Fail 'index.html contiene localStorage ejecutable.' }
if ($Index -notmatch 'v1291') { Fail 'index.html no contiene v1291.' }
Add-Line 'OK index: hooks LAB + v1291 + sidebar sin localStorage ejecutable.'

$Auth = Get-Content (Join-Path $Repo 'orbit360-platform\core\auth.js') -Raw -Encoding UTF8
if ($Auth -notmatch 'loginFirebase' -or $Auth -notmatch 'onAuthStateChanged' -or $Auth -notmatch 'orbit\.lab@demo\.com') { Fail 'core/auth.js no conserva Auth Firebase LAB.' }
if ($Auth -notmatch 'Andrea Beltrán') { Fail 'core/auth.js no conserva identidad ficticia demo.' }
Add-Line 'OK auth: demo + Firebase LAB.'

$Seed = Get-Content (Join-Path $Repo 'orbit360-platform\data\seed.js') -Raw -Encoding UTF8
if ($Seed -notmatch '__v:\s*36') { Fail 'seed.js no marca __v: 36.' }
Add-Line 'OK seed.__v = 36.'

$Lab = Get-Content (Join-Path $Repo 'orbit360-platform\data\store-firestore-lab.local.js') -Raw -Encoding UTF8
if ($Lab -notmatch 'v1\.74-firestore-lab-write-status') { Fail 'Firestore LAB no está en v1.74.' }
if ($Lab -notmatch 'writeQueue' -or $Lab -notmatch 'writeErrors' -or $Lab -notmatch 'orbit:backend:write-ok') { Fail 'Firestore LAB no conserva trazabilidad.' }
Add-Line 'OK Firestore LAB v1.74 con writeQueue/writeErrors.'
Add-Line ''

Add-Line '== node --check críticos =='
$Checks = @(
  'orbit360-platform\core\auth.js',
  'orbit360-platform\data\store.js',
  'orbit360-platform\data\store-firestore-lab.local.js',
  'orbit360-platform\data\seed.js',
  'orbit360-platform\modules\finanzas.js',
  'orbit360-platform\modules\configuracion.js'
)
foreach ($Rel in $Checks) {
  node --check $Rel
  if ($LASTEXITCODE -ne 0) { Fail "node --check falló: $Rel" }
  Add-Line "OK node --check: $Rel"
}
Add-Line ''

Add-Line '== Levantar servidor local Node =='
$Existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($Existing) {
  Add-Line "Puerto $Port ocupado. Se usará servidor existente."
} else {
  Start-Process powershell -ArgumentList @('-NoExit','-Command',"cd '$Platform'; node -e \"const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};http.createServer((req,res)=>{let u=decodeURIComponent((req.url||'/').split('?')[0]);if(u==='/' )u='/index.html';let f=path.join(root,u);if(!f.startsWith(root)){res.writeHead(403);return res.end('403')}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end('404 '+u)}res.writeHead(200,{'Content-Type':types[path.extname(f).toLowerCase()]||'application/octet-stream'});res.end(b)})}).listen($Port,'127.0.0.1',()=>console.log('Orbit 360 server http://127.0.0.1:$Port'))\"") | Out-Null
  Start-Sleep -Seconds 3
  Add-Line "OK servidor Node solicitado en puerto $Port."
}

$DemoUrl = "http://127.0.0.1:$Port/index.html"
$LabUrl = "http://127.0.0.1:$Port/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones"

Add-Line ''
Add-Line '== Probar HTTP demo =='
try {
  $Resp = Invoke-WebRequest -Uri $DemoUrl -UseBasicParsing -TimeoutSec 10
  Add-Line "HTTP demo: $($Resp.StatusCode)"
} catch { Add-Line "ALERTA HTTP demo: $($_.Exception.Message)" }

Add-Line ''
Add-Line '== Abrir navegador =='
Start-Process $DemoUrl
Start-Sleep -Seconds 2
Start-Process $LabUrl
Add-Line "Demo URL: $DemoUrl"
Add-Line "LAB URL: $LabUrl"
Add-Line ''
Add-Line 'Checklist:'
Add-Line '1. Demo: login Orbit 360; entrar admin@demo.com / demo123; usuario Andrea Beltrán.'
Add-Line '2. LAB: login orbit.lab@demo.com; usar clave local LAB.'
Add-Line '3. Consola LAB: OrbitBackend.status() debe mostrar apiVersion v1.74-firestore-lab-write-status y tenantId alianzas-soluciones.'
Add-Line '4. Prueba ficticia: Orbit.store.insert("actividades",{titulo:"smoke v197",tipo:"smoke"}) y revisar writeQueue/writeErrors.'
Add-Line ''
Add-Line 'RESULTADO: smoke Node preparado. Falta confirmación visual/consola.'
Add-Line "Reporte: $Report"

try { Get-Content $Report -Raw | Set-Clipboard } catch {}
try { notepad $Report } catch {}
