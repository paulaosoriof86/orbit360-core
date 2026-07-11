param(
  [int]$Port = 5177
)

$ErrorActionPreference = 'Continue'
try {
  $utf8 = [Text.UTF8Encoding]::new($false)
  [Console]::InputEncoding = $utf8
  [Console]::OutputEncoding = $utf8
  $OutputEncoding = $utf8
  chcp 65001 | Out-Null
} catch {}

$Repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$App = Join-Path $Repo 'orbit360-platform'
$BranchRequired = 'ays/backend-tenant-lab-v99-20260703'
$ReportDir = Join-Path $Repo '_orbit360_reports'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$ReportPath = Join-Path $ReportDir "VALIDACION-INTEGRADA-V1203-$Stamp.txt"
$ServerPath = Join-Path $ReportDir 'orbit360-static-server-v1203.cjs'
$LauncherPath = Join-Path $ReportDir 'orbit360-static-server-v1203-launcher.ps1'
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

$lines = [System.Collections.Generic.List[string]]::new()
$failedChecks = [System.Collections.Generic.List[string]]::new()
$passedChecks = [System.Collections.Generic.List[string]]::new()
function Add-Line([string]$Text = '') { $lines.Add($Text); Write-Host $Text }
function Save-Report {
  [IO.File]::WriteAllLines($ReportPath, $lines, [Text.UTF8Encoding]::new($false))
  try { ($lines -join "`r`n") | Set-Clipboard } catch {}
}
function Fail([string]$Cause) {
  Add-Line ''
  Add-Line 'RESULTADO: BLOQUEADO'
  Add-Line ("CAUSA: " + $Cause)
  if ($failedChecks.Count) {
    Add-Line 'CHECKS FALLIDOS:'
    $failedChecks | ForEach-Object { Add-Line ("  - " + $_) }
  }
  Add-Line ("Reporte: " + $ReportPath)
  Add-Line 'No repita Git ni todos los validadores. Diagnostique este reporte y corrija solo la causa indicada.'
  Save-Report
  exit 1
}
function Run-Node([string]$RelativePath, [switch]$CheckOnly) {
  $full = Join-Path $Repo $RelativePath
  $label = if ($CheckOnly) { "node --check $RelativePath" } else { "node $RelativePath" }
  if (-not (Test-Path $full)) {
    Add-Line ("[FALLO] " + $label + " · archivo inexistente")
    $failedChecks.Add($label + ' · archivo inexistente')
    return $false
  }
  Add-Line ''
  Add-Line ("=== " + $label + " ===")
  $exitCode = 1
  try {
    if ($CheckOnly) { $output = & node --check $full 2>&1 }
    else { $output = & node $full 2>&1 }
    $exitCode = $LASTEXITCODE
  } catch {
    $output = @($_.Exception.Message)
    $exitCode = 1
  }
  $output | ForEach-Object { Add-Line ([string]$_) }
  if ($exitCode -eq 0) {
    Add-Line ("[OK] " + $label + " · exit 0")
    $passedChecks.Add($label)
    return $true
  }
  Add-Line ("[FALLO] " + $label + " · exit " + $exitCode)
  $failedChecks.Add($label + " · exit " + $exitCode)
  return $false
}

Add-Line '============================================================'
Add-Line 'ORBIT 360 - VALIDACION INTEGRADA v1.203'
Add-Line ("Fecha local: " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Line ("Repo: " + $Repo)
Add-Line ("Rama obligatoria: " + $BranchRequired)
Add-Line 'Restricciones: loopback | sin deploy | sin merge | sin push | sin produccion | sin aplicar directorios reales'
Add-Line '============================================================'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'Node.js no esta disponible en esta terminal.' }
if (-not (Test-Path (Join-Path $Repo '.git'))) { Fail 'No se encontro el repositorio Git.' }
Set-Location $Repo
$branch = (& git branch --show-current 2>$null).Trim()
$head = (& git rev-parse HEAD 2>$null).Trim()
Add-Line ("Rama actual: " + $branch)
Add-Line ("HEAD: " + $head)
if ($branch -ne $BranchRequired) { Fail 'Rama incorrecta. El script no cambia ramas automaticamente.' }

$status = & git status --porcelain 2>$null
if ($status) {
  Add-Line 'AVISO: existen cambios locales. No se modificaron ni se descartaron.'
  $status | Select-Object -First 20 | ForEach-Object { Add-Line ("  " + $_) }
}

$syntaxFiles = @(
  'orbit360-platform\core\quote-comparison-contracts-v1203.js',
  'orbit360-platform\modules\cotizador-v1203-source-gate.js',
  'orbit360-platform\modules\comparativo-v1203-operational-bridge.js',
  'orbit360-platform\core\insurer-directory-import-v1202.js',
  'orbit360-platform\core\insurer-directory-import-v1202-security.js',
  'orbit360-platform\modules\aseguradoras-v1202-import-bridge.js',
  'orbit360-platform\modules\aseguradoras-v1202-resources-bridge.js'
)
$ok = $true
foreach ($file in $syntaxFiles) { if (-not (Run-Node $file -CheckOnly)) { $ok = $false } }

$checks = @(
  'orbit360-platform\tools\orbit360-test-directorio-aseguradoras-v1202.mjs',
  'orbit360-platform\tools\orbit360-validar-directorio-aseguradoras-v1202.mjs',
  'orbit360-platform\tools\orbit360-test-cotizador-comparativo-v1203.mjs',
  'orbit360-platform\tools\orbit360-validar-cotizador-comparativo-v1203.mjs',
  'orbit360-platform\tools\orbit360-validar-emision-endosos-v1201.mjs',
  'orbit360-platform\tools\orbit360-validar-policy-receipts-v1199b.mjs'
)
foreach ($check in $checks) {
  if (Test-Path (Join-Path $Repo $check)) {
    if (-not (Run-Node $check)) { $ok = $false }
  } else {
    Add-Line ("[FALLO] node " + $check + " · archivo inexistente")
    $failedChecks.Add("node $check · archivo inexistente")
    $ok = $false
  }
}
Add-Line ''
Add-Line ("RESUMEN VALIDADORES: " + $passedChecks.Count + " OK · " + $failedChecks.Count + " fallido(s)")
if (-not $ok) { Fail 'Uno o mas validadores fallaron. El servidor no se intento iniciar.' }

try {
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Add-Line ("Cerrando servidor previo en puerto ${Port}: PID " + $_.OwningProcess)
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
} catch {}
Start-Sleep -Milliseconds 500

$serverCode = @'
const http = require('http');
const fs = require('fs');
const path = require('path');
const port = Number(process.argv[2] || 5177);
const root = path.resolve(process.argv[3]);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const server = http.createServer((req,res)=>{
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = raw === '/' ? '/index.html' : raw;
  const target = path.resolve(root, '.' + rel);
  if (!target.startsWith(root + path.sep) && target !== path.join(root,'index.html')) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(target,(err,st)=>{
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200,{'Content-Type':types[path.extname(target).toLowerCase()] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(target).pipe(res);
  });
});
server.on('error',err=>{ console.error('SERVER ERROR:',err.message); process.exitCode=1; });
server.listen(port,'127.0.0.1',()=>{
  console.log('============================================================');
  console.log(`Orbit 360 disponible en http://127.0.0.1:${port}`);
  console.log('Mantenga esta ventana abierta durante la validacion.');
  console.log('Cierre esta ventana al terminar.');
  console.log('============================================================');
});
'@
[IO.File]::WriteAllText($ServerPath, $serverCode, [Text.UTF8Encoding]::new($false))

$launcherCode = @"
try {
  `$utf8 = [Text.UTF8Encoding]::new(`$false)
  [Console]::InputEncoding = `$utf8
  [Console]::OutputEncoding = `$utf8
  `$OutputEncoding = `$utf8
  chcp 65001 | Out-Null
} catch {}
`$Host.UI.RawUI.WindowTitle = 'ORBIT 360 - SERVIDOR LOCAL v1.203'
Write-Host 'Iniciando servidor local Orbit 360...' -ForegroundColor Cyan
& node '$($ServerPath.Replace("'","''"))' $Port '$($App.Replace("'","''"))'
if (`$LASTEXITCODE -ne 0) {
  Write-Host ''
  Write-Host 'El servidor se detuvo con error. No cierre esta ventana y comparta el mensaje.' -ForegroundColor Red
}
"@
[IO.File]::WriteAllText($LauncherPath, $launcherCode, [Text.UTF8Encoding]::new($false))

$argLine = "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$LauncherPath`""
$serverWindow = Start-Process -FilePath 'powershell.exe' -ArgumentList $argLine -PassThru
Add-Line ''
Add-Line ("Ventana servidor iniciada: PID " + $serverWindow.Id)

$baseUrl = "http://127.0.0.1:$Port/index.html"
$responded = $false
for ($i = 1; $i -le 20; $i++) {
  Start-Sleep -Milliseconds 500
  if ($serverWindow.HasExited) { break }
  try {
    $response = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) { $responded = $true; break }
  } catch {}
}
if (-not $responded) {
  Add-Line ("Ventana servidor activa: " + (-not $serverWindow.HasExited))
  try {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Add-Line ("Listener detectado: PID " + $_.OwningProcess) }
  } catch {}
  Fail 'El servidor no respondio despues de 10 segundos. La ventana visible queda abierta para mostrar el error.'
}

$listenerPid = ''
try { $listenerPid = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1 -ExpandProperty OwningProcess) } catch {}
$urlAseg = "$baseUrl#/aseguradoras"
$urlCot = "$baseUrl#/cotizador"
Add-Line ("Servidor local: OK · HTTP 200")
Add-Line ("PID ventana: " + $serverWindow.Id)
Add-Line ("PID listener: " + $listenerPid)
Add-Line ("Aseguradoras: " + $urlAseg)
Add-Line ("Cotizador: " + $urlCot)
Add-Line 'IMPORTANTE: mantenga abierta la ventana ORBIT 360 - SERVIDOR LOCAL v1.203.'

Start-Process $urlAseg | Out-Null
Start-Sleep -Seconds 1
Start-Process $urlCot | Out-Null

Add-Line ''
Add-Line 'VALIDACION VISUAL - UNA SOLA RONDA'
Add-Line 'A. ASEGURADORAS'
Add-Line '1. Directorio y KPI en escritorio.'
Add-Line '2. Ficha en pagina completa y opcion Regresar.'
Add-Line '3. Pestanas Contactos, Plataformas, Bancos/pagos y Documentos.'
Add-Line '4. Importar Guatemala y Colombia por separado; solo revisar el resultado.'
Add-Line '5. El boton de aplicar debe indicar Conexion segura requerida y permanecer deshabilitado.'
Add-Line ''
Add-Line 'B. COTIZADOR / COMPARATIVO'
Add-Line '1. Verificar que Automatico aparezca bloqueado si no existe fuente tarifaria validada.'
Add-Line '2. Registrar dos primas manuales ficticias, pulsar Cotizar y validar cada una con referencias ficticias.'
Add-Line '3. Seleccionar ambas y generar Comparativo.'
Add-Line '4. Cambiar criterio y confirmar que cambia la sugerencia sin perder propuestas.'
Add-Line '5. No registrar aceptacion real del cliente durante esta prueba.'
Add-Line ''
Add-Line 'C. RESPONSIVE'
Add-Line '1. Captura a 390 px del login.'
Add-Line '2. Captura a 390 px de Aseguradoras.'
Add-Line '3. Captura a 390 px del Cotizador o Comparativo.'
Add-Line ''
Add-Line 'CAPTURAS MINIMAS A COMPARTIR: 7'
Add-Line '1. Aseguradoras escritorio.'
Add-Line '2. Ficha Bancos/pagos.'
Add-Line '3. Resultado importador GT.'
Add-Line '4. Resultado importador CO con bloqueos.'
Add-Line '5. Cotizador con estados de fuente.'
Add-Line '6. Comparativo generado.'
Add-Line '7. Vista movil.'
Add-Line ''
Add-Line 'RESULTADO: LISTO PARA VALIDACION VISUAL'
Add-Line ("Reporte: " + $ReportPath)
Save-Report
Add-Line 'El reporte quedo copiado al portapapeles.'
