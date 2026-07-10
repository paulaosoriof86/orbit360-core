param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core",
  [string]$SourceRoot = "",
  [int]$Port = 8765
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Reports = Join-Path $Repo "_orbit360_private_reports"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReadyFile = Join-Path $Reports "P09L-HOST-READY-$Stamp.json"
$PidFile = Join-Path $Reports "P09L-HOST-PID.json"
$StdOut = Join-Path $Reports "P09L-HOST-OUT-$Stamp.log"
$StdErr = Join-Path $Reports "P09L-HOST-ERR-$Stamp.log"
$Report = Join-Path $Reports "P09L-INICIAR-ASEGURADORAS-$Stamp.txt"
$ExpectedSourceName = "Tasas AseGuate.xlsx"

function Add-Report([string]$Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }

function Test-Xlsx([string]$Path) {
  if (-not (Test-Path $Path -PathType Leaf)) { return $false }
  $item = Get-Item $Path
  if ($item.Length -lt 100) { return $false }
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $b1 = $stream.ReadByte()
    $b2 = $stream.ReadByte()
    return ($b1 -eq 0x50 -and $b2 -eq 0x4B)
  } finally {
    $stream.Dispose()
  }
}

function Find-AseGuateFile {
  param([string[]]$Roots)
  $matches = @()
  foreach ($root in $Roots) {
    if (-not $root -or -not (Test-Path $root)) { continue }
    try {
      $matches += Get-ChildItem -Path $root -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -ieq ".xlsx" -and $_.Name -match "AseGuate" }
    } catch {}
  }
  return $matches | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - INICIAR VALIDACION ASEGURADORAS"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Rama obligatoria: $ExpectedBranch"
Add-Report "Restricciones: loopback, sin deploy, sin commit, sin push, sin produccion, sin rutas en UI"
Add-Report "============================================================"

try {
  if (-not (Test-Path $Repo)) { throw "No existe el repositorio configurado." }
  Set-Location $Repo

  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  $Head = (git rev-parse HEAD).Trim()
  Add-Report "Rama actual: $Branch"
  Add-Report "HEAD: $Head"
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta. No se inicia el host." }

  $HostTool = Join-Path $Repo "tools\orbit360-aseguradoras-same-origin-host-p09l.mjs"
  $App = Join-Path $Repo "orbit360-platform"
  $Catalog = Join-Path $App "data\tenant-alianzas-soluciones-source-catalog-p09k.json"
  $Config = Join-Path $App "core\auth-firebase.config.local.js"
  foreach ($Path in @($HostTool, $App, $Catalog)) {
    if (-not (Test-Path $Path)) { throw "Falta un componente requerido de la validacion." }
  }
  if (-not (Test-Path $Config)) { throw "Falta la configuracion local de acceso." }

  # Puente local y reversible para configuraciones declaradas como const firebaseConfig.
  $ConfigText = Get-Content $Config -Raw -Encoding UTF8
  foreach ($key in @("apiKey", "authDomain", "projectId")) {
    if ($ConfigText -notmatch [regex]::Escape($key)) {
      throw "La configuracion local existe, pero le falta la clave requerida: $key."
    }
  }
  $BridgeMarker = "ORBIT360_CONFIG_BRIDGE_P09_FIX"
  if ($ConfigText -notmatch $BridgeMarker) {
    $ConfigBackup = Join-Path $Reports "auth-firebase.config.local.backup-$Stamp.js"
    Copy-Item -LiteralPath $Config -Destination $ConfigBackup -Force
    $Bridge = @'

;/* ORBIT360_CONFIG_BRIDGE_P09_FIX */
(function(){
  'use strict';
  var cfg = null;
  try { if (typeof firebaseConfig !== 'undefined') cfg = firebaseConfig; } catch(e) {}
  try { if (!cfg && typeof firebaseConfigLab !== 'undefined') cfg = firebaseConfigLab; } catch(e) {}
  try { if (!cfg && typeof ORBIT_FIREBASE_LAB_CONFIG !== 'undefined') cfg = ORBIT_FIREBASE_LAB_CONFIG; } catch(e) {}
  if (cfg && typeof cfg === 'object') {
    window.firebaseConfigLab = cfg;
    window.ORBIT_FIREBASE_LAB_CONFIG = cfg;
  }
})();
'@
    Add-Content -LiteralPath $Config -Value $Bridge -Encoding UTF8
    Add-Report "OK: puente local de configuracion preparado. Se creo backup privado."
  } else {
    Add-Report "OK: puente local de configuracion ya estaba preparado."
  }

  if (-not $SourceRoot) {
    $SourceRoot = Join-Path $Repo "_orbit360_private_sources\aseguradoras"
  }
  New-Item -ItemType Directory -Force -Path $SourceRoot | Out-Null
  $SourceRoot = (Resolve-Path $SourceRoot).Path
  $TargetSource = Join-Path $SourceRoot $ExpectedSourceName

  if (-not (Test-Xlsx $TargetSource)) {
    $SearchRoots = @(
      (Join-Path $env:USERPROFILE "Downloads"),
      (Join-Path $env:USERPROFILE "Desktop"),
      $env:OneDrive,
      (Join-Path $Repo "_orbit360_imports")
    ) | Where-Object { $_ -and (Test-Path $_) }
    $Found = Find-AseGuateFile -Roots $SearchRoots
    if (-not $Found) {
      throw "No se encontro un archivo Excel de AseGuate descargado."
    }
    Copy-Item -LiteralPath $Found.FullName -Destination $TargetSource -Force
  }

  if (-not (Test-Xlsx $TargetSource)) {
    throw "El archivo AseGuate encontrado no es un XLSX valido."
  }
  Add-Report "OK: fuente AseGuate validada y normalizada con el nombre esperado."

  # Detiene solo el host anterior registrado por Orbit 360.
  if (Test-Path $PidFile) {
    try {
      $Old = Get-Content $PidFile -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($Old.pid) {
        $OldProcess = Get-Process -Id ([int]$Old.pid) -ErrorAction SilentlyContinue
        if ($OldProcess) {
          Stop-Process -Id ([int]$Old.pid) -Force
          Start-Sleep -Milliseconds 400
          Add-Report "OK: host anterior detenido."
        }
      }
    } catch {}
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  }

  $Arguments = @(
    $HostTool,
    "--app", $App,
    "--catalog", $Catalog,
    "--root", $SourceRoot,
    "--report-dir", $Reports,
    "--port", $Port,
    "--ready-file", $ReadyFile
  )
  $Process = Start-Process -FilePath "node" -ArgumentList $Arguments -WorkingDirectory $Repo -RedirectStandardOutput $StdOut -RedirectStandardError $StdErr -PassThru -WindowStyle Hidden
  @{ pid = $Process.Id; startedAt = (Get-Date).ToString("o"); head = $Head } | ConvertTo-Json | Set-Content -Path $PidFile -Encoding UTF8

  $Deadline = (Get-Date).AddSeconds(25)
  while (-not (Test-Path $ReadyFile) -and (Get-Date) -lt $Deadline) {
    if ($Process.HasExited) { break }
    Start-Sleep -Milliseconds 250
    $Process.Refresh()
  }
  if (-not (Test-Path $ReadyFile)) {
    $ErrorText = if (Test-Path $StdErr) { Get-Content $StdErr -Raw -Encoding UTF8 } else { "" }
    throw ("El host no confirmo inicio. " + ($ErrorText | Select-Object -First 1))
  }

  $Ready = Get-Content $ReadyFile -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $Ready.bootstrapUrl) { throw "El host inicio sin URL de sesion valida." }
  if ([int]$Ready.discovery.records -lt 1) {
    Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    throw "El host no reconocio la fuente AseGuate. No se abrira una validacion incompleta."
  }

  Add-Report "OK: host loopback iniciado."
  Add-Report "PID: $($Process.Id)"
  Add-Report "Fuentes localizadas: $($Ready.discovery.records)"
  Add-Report "Fuentes pendientes: $($Ready.discovery.issues)"
  Add-Report "La URL, rutas y referencias permanecen privadas."
  Add-Report "Se abrira Aseguradoras en el navegador."
  Start-Process $Ready.bootstrapUrl

  Add-Report ""
  Add-Report "RESULTADO: VALIDACION_ASEGURADORAS_INICIADA"
  Add-Report "Cotizador y Comparativo permanecen deshabilitados."
} catch {
  Add-Report "ERROR: $($_.Exception.Message)"
  Add-Report "RESULTADO: VALIDACION_ASEGURADORAS_BLOQUEADA"
} finally {
  Add-Report ""
  Add-Report "Reporte privado: $Report"
  Add-Report "No se hizo deploy, commit, push ni produccion."
  try { Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard; notepad $Report } catch {}
}
