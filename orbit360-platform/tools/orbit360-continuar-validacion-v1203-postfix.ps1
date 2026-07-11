param([int]$Port = 5177)

$ErrorActionPreference = 'Stop'
try {
  $utf8 = [Text.UTF8Encoding]::new($false)
  [Console]::InputEncoding = $utf8
  [Console]::OutputEncoding = $utf8
  $OutputEncoding = $utf8
  chcp 65001 | Out-Null
} catch {}

$Repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$App = Join-Path $Repo 'orbit360-platform'
$Target = Join-Path $App 'modules\cotizador-v1203-source-gate.js'
$BranchRequired = 'ays/backend-tenant-lab-v99-20260703'
$ReportDir = Join-Path $Repo '_orbit360_reports'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$ReportPath = Join-Path $ReportDir "CONTINUACION-V1203-POSTFIX-$Stamp.txt"
$ServerPath = Join-Path $ReportDir 'orbit360-static-server-v1203-postfix.cjs'
$LauncherPath = Join-Path $ReportDir 'orbit360-static-server-v1203-postfix-launcher.ps1'
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

$lines = [System.Collections.Generic.List[string]]::new()
function Add-Line([string]$Text = '') { $lines.Add($Text); Write-Host $Text }
function Save-Report {
  [IO.File]::WriteAllLines($ReportPath, $lines, [Text.UTF8Encoding]::new($false))
  try { ($lines -join "`r`n") | Set-Clipboard } catch {}
}
function Stop-WithError([string]$Cause) {
  Add-Line ''
  Add-Line 'RESULTADO: BLOQUEADO'
  Add-Line ("CAUSA: " + $Cause)
  Add-Line 'No se ejecutaron los validadores que ya habían pasado.'
  Add-Line ("Reporte: " + $ReportPath)
  Save-Report
  exit 1
}

Add-Line '============================================================'
Add-Line 'ORBIT 360 - CONTINUAR VALIDACION v1.203 POSTFIX'
Add-Line 'Solo verifica el archivo corregido y levanta/reutiliza servidor.'
Add-Line 'No repite Git, directorios, comparativo, emisión ni pólizas.'
Add-Line '============================================================'

if (-not (Test-Path (Join-Path $Repo '.git'))) { Stop-WithError 'No se encontró el repositorio Git.' }
Set-Location $Repo
$branch = (& git branch --show-current 2>$null).Trim()
$head = (& git rev-parse HEAD 2>$null).Trim()
Add-Line ("Rama: " + $branch)
Add-Line ("HEAD: " + $head)
if ($branch -ne $BranchRequired) { Stop-WithError 'Rama incorrecta. No se cambió automáticamente.' }
if (-not (Test-Path $Target)) { Stop-WithError 'No existe cotizador-v1203-source-gate.js.' }

Add-Line ''
Add-Line '=== ÚNICO CHECK: sintaxis cotizador-v1203-source-gate.js ==='
$output = & node --check $Target 2>&1
$exitCode = $LASTEXITCODE
$output | ForEach-Object { Add-Line ([string]$_) }
if ($exitCode -ne 0) { Stop-WithError ("El único archivo corregido aún falla sintaxis · exit " + $exitCode) }
Add-Line '[OK] cotizador-v1203-source-gate.js · exit 0'

$baseUrl = "http://127.0.0.1:$Port/index.html"
$serverReady = $false
try {
  $existing = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing -TimeoutSec 2
  if ($existing.StatusCode -eq 200) {
    $serverReady = $true
    Add-Line ''
    Add-Line 'Servidor existente reutilizado · HTTP 200'
  }
} catch {}

if (-not $serverReady) {
  try {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
      Add-Line ("Cerrando listener sin respuesta en puerto ${Port}: PID " + $_.OwningProcess)
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  } catch {}

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
  console.log('Mantenga esta ventana abierta durante la validación.');
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
& node '$($ServerPath.Replace("'","''"))' $Port '$($App.Replace("'","''"))'
if (`$LASTEXITCODE -ne 0) { Write-Host 'Servidor detenido con error. Mantenga esta ventana abierta.' -ForegroundColor Red }
"@
  [IO.File]::WriteAllText($LauncherPath, $launcherCode, [Text.UTF8Encoding]::new($false))
  $args = "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$LauncherPath`""
  $serverWindow = Start-Process -FilePath 'powershell.exe' -ArgumentList $args -PassThru
  Add-Line ("Ventana de servidor iniciada · PID " + $serverWindow.Id)

  for ($i = 1; $i -le 20; $i++) {
    Start-Sleep -Milliseconds 500
    if ($serverWindow.HasExited) { break }
    try {
      $response = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) { $serverReady = $true; break }
    } catch {}
  }
  if (-not $serverReady) { Stop-WithError 'El servidor no respondió. La ventana visible conserva el error.' }
  Add-Line 'Servidor nuevo · HTTP 200'
}

$urlAseg = "$baseUrl#/aseguradoras"
$urlCot = "$baseUrl#/cotizador"
Start-Process $urlAseg | Out-Null
Start-Sleep -Milliseconds 800
Start-Process $urlCot | Out-Null

Add-Line ''
Add-Line 'RESULTADO: LISTO PARA VALIDACIÓN VISUAL'
Add-Line ("Aseguradoras: " + $urlAseg)
Add-Line ("Cotizador: " + $urlCot)
Add-Line 'Mantenga abierta la ventana ORBIT 360 - SERVIDOR LOCAL v1.203.'
Add-Line 'No aplique directorios reales ni registre aceptación real de cliente.'
Add-Line ("Reporte: " + $ReportPath)
Save-Report
Add-Line 'El resultado quedó copiado al portapapeles.'
