param(
  [int]$Port = 5177
)

$ErrorActionPreference = 'Continue'
$Repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$App = Join-Path $Repo 'orbit360-platform'
$BranchRequired = 'ays/backend-tenant-lab-v99-20260703'
$ReportDir = Join-Path $Repo '_orbit360_reports'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$ReportPath = Join-Path $ReportDir "VALIDACION-ASEGURADORAS-V1202-$Stamp.txt"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

$lines = [System.Collections.Generic.List[string]]::new()
function Add-Line([string]$Text = '') { $lines.Add($Text); Write-Host $Text }
function Run-Node([string]$RelativePath) {
  $full = Join-Path $Repo $RelativePath
  Add-Line ""
  Add-Line "=== node $RelativePath ==="
  if (-not (Test-Path $full)) { Add-Line "BLOQUEADO: no existe $RelativePath"; return $false }
  $output = & node $full 2>&1
  $output | ForEach-Object { Add-Line ([string]$_) }
  return ($LASTEXITCODE -eq 0)
}

Add-Line '============================================================'
Add-Line 'ORBIT 360 - VALIDACION VISUAL ASEGURADORAS v1.202'
Add-Line ("Fecha local: " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Line ("Repo: " + $Repo)
Add-Line ("Rama obligatoria: " + $BranchRequired)
Add-Line 'Restricciones: loopback | sin deploy | sin commit | sin push | sin produccion | sin escritura real'
Add-Line '============================================================'

if (-not (Test-Path (Join-Path $Repo '.git'))) {
  Add-Line 'RESULTADO: BLOQUEADO'
  Add-Line 'CAUSA: no se encontro el repositorio Git.'
  [IO.File]::WriteAllLines($ReportPath, $lines, [Text.UTF8Encoding]::new($false))
  $lines -join "`r`n" | Set-Clipboard
  exit 1
}

Set-Location $Repo
$branch = (& git branch --show-current 2>$null).Trim()
$head = (& git rev-parse HEAD 2>$null).Trim()
Add-Line ("Rama actual: " + $branch)
Add-Line ("HEAD: " + $head)
if ($branch -ne $BranchRequired) {
  Add-Line 'RESULTADO: BLOQUEADO'
  Add-Line 'CAUSA: rama incorrecta. No se cambio automaticamente.'
  [IO.File]::WriteAllLines($ReportPath, $lines, [Text.UTF8Encoding]::new($false))
  $lines -join "`r`n" | Set-Clipboard
  exit 1
}

$checks = @(
  'orbit360-platform\tools\orbit360-test-directorio-aseguradoras-v1202.mjs',
  'orbit360-platform\tools\orbit360-validar-directorio-aseguradoras-v1202.mjs',
  'orbit360-platform\tools\orbit360-validar-emision-endosos-v1201.mjs',
  'orbit360-platform\tools\orbit360-validar-policy-receipts-v1199b.mjs'
)
$ok = $true
foreach ($check in $checks) { if (-not (Run-Node $check)) { $ok = $false } }
if (-not $ok) {
  Add-Line ''
  Add-Line 'RESULTADO: BLOQUEADO POR VALIDADORES'
  Add-Line 'No se inicia el servidor. Comparte el reporte copiado al portapapeles.'
  [IO.File]::WriteAllLines($ReportPath, $lines, [Text.UTF8Encoding]::new($false))
  $lines -join "`r`n" | Set-Clipboard
  exit 1
}

try {
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Add-Line ("Cerrando proceso previo en puerto ${Port}: PID " + $_.OwningProcess)
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
} catch {}

$serverPath = Join-Path $env:TEMP 'orbit360-static-server-v1202.cjs'
$serverCode = @'
const http = require('http');
const fs = require('fs');
const path = require('path');
const port = Number(process.argv[2] || 5177);
const root = path.resolve(process.argv[3]);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = raw === '/' ? '/index.html' : raw;
  const target = path.resolve(root, '.' + rel);
  if (!target.startsWith(root + path.sep) && target !== path.join(root,'index.html')) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(target,(err,st)=>{
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200,{'Content-Type':types[path.extname(target).toLowerCase()] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(target).pipe(res);
  });
}).listen(port,'127.0.0.1',()=>console.log(`Orbit 360 local: http://127.0.0.1:${port}`));
'@
[IO.File]::WriteAllText($serverPath, $serverCode, [Text.UTF8Encoding]::new($false))
$proc = Start-Process -FilePath 'node' -ArgumentList @($serverPath, [string]$Port, $App) -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2

$url = "http://127.0.0.1:$Port/index.html#/aseguradoras"
try {
  $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/index.html" -UseBasicParsing -TimeoutSec 10
  Add-Line ''
  Add-Line ("Servidor local: OK · HTTP " + $response.StatusCode)
  Add-Line ("PID servidor: " + $proc.Id)
  Add-Line ("URL: " + $url)
  Add-Line 'Modo: prototipo local. El dry-run funciona; la aplicacion de datos reales debe quedar deshabilitada.'
  Add-Line ''
  Add-Line 'ARCHIVOS A SELECCIONAR POR SEPARADO EN IMPORTAR:'
  Add-Line '1. Directorio Aseguradoras Guatemala 2026.xlsx · pais Guatemala'
  Add-Line '2. Directorio - Aseguradoras Colombia 2024.xlsx · pais Colombia'
  Add-Line ''
  Add-Line 'CAPTURAS REQUERIDAS:'
  Add-Line '1. Directorio/KPI en escritorio.'
  Add-Line '2. Ficha en pagina completa, pestana Bancos/pagos.'
  Add-Line '3. Dry-run Guatemala completo.'
  Add-Line '4. Dry-run Colombia mostrando bloqueos.'
  Add-Line '5. Vista movil 390 px del directorio o ficha.'
  Add-Line ''
  Add-Line 'NO PULSAR APLICAR. En modo local el boton debe estar deshabilitado.'
  Add-Line 'RESULTADO: LISTO PARA VALIDACION VISUAL'
  Start-Process $url | Out-Null
} catch {
  Add-Line ''
  Add-Line 'RESULTADO: BLOQUEADO'
  Add-Line ("CAUSA: servidor local no respondio. " + $_.Exception.Message)
}

[IO.File]::WriteAllLines($ReportPath, $lines, [Text.UTF8Encoding]::new($false))
$lines -join "`r`n" | Set-Clipboard
Add-Line ("Reporte: " + $ReportPath)
Add-Line 'El reporte principal quedo copiado al portapapeles.'
