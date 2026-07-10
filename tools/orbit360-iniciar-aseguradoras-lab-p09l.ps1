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

function Add-Report([string]$Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - INICIAR ASEGURADORAS LAB P0.9L/P0.9N"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Rama obligatoria: $ExpectedBranch"
Add-Report "Restricciones: loopback, sin deploy, sin commit, sin push, sin produccion, sin rutas en UI, sin habilitar Cotizador/Comparativo"
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
  foreach ($Path in @($HostTool, $App, $Catalog)) { if (-not (Test-Path $Path)) { throw "Falta un componente P0.9L/P0.9N requerido." } }
  if (-not (Test-Path $Config)) { throw "Falta la configuración Firebase LAB local ignorada por Git." }

  if (-not $SourceRoot) {
    $Candidates = @(
      (Join-Path $Repo "_orbit360_private_sources\aseguradoras"),
      (Join-Path $Repo "_orbit360_imports\aseguradoras"),
      (Join-Path $Repo "_orbit360_imports\ays_real")
    )
    $SourceRoot = $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  }
  if (-not $SourceRoot -or -not (Test-Path $SourceRoot)) {
    throw "No existe una carpeta privada autorizada de fuentes. El host no escaneará Descargas ni otras carpetas personales automáticamente."
  }
  $SourceRoot = (Resolve-Path $SourceRoot).Path
  Add-Report "OK: raíz privada autorizada localizada. La ruta no se copiará al reporte público ni a la UI."

  if (Test-Path $PidFile) {
    try {
      $Old = Get-Content $PidFile -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($Old.pid -and (Get-Process -Id ([int]$Old.pid) -ErrorAction SilentlyContinue)) {
        throw "Ya existe un host P0.9L activo. Usa el script de detención antes de iniciar otro."
      }
    } catch {
      if ($_.Exception.Message -like "Ya existe*") { throw }
      Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
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
    throw ("El host no confirmó inicio. Código: " + ($ErrorText | Select-Object -First 1))
  }

  $Ready = Get-Content $ReadyFile -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $Ready.bootstrapUrl) { throw "El host inició sin URL de sesión válida." }
  Add-Report "OK: host loopback iniciado."
  Add-Report "PID: $($Process.Id)"
  Add-Report "Fuentes localizadas: $($Ready.discovery.records)"
  Add-Report "Fuentes pendientes: $($Ready.discovery.issues)"
  Add-Report "Observador P0.9N: activo; guardará solo estructura, estados y conteos sanitizados."
  Add-Report "La URL de sesión, rutas y referencias permanecen en archivos privados ignorados por Git."
  Add-Report "Se abrirá Aseguradoras en el navegador."
  Start-Process $Ready.bootstrapUrl

  Add-Report ""
  Add-Report "RESULTADO: HOST_P09L_P09N_INICIADO"
  Add-Report "El formulario debe mostrar disponibilidad de archivos y permitir preview/dry-run sin persistir conocimiento."
  Add-Report "Los reportes P09N se guardarán en la carpeta privada de reportes."
  Add-Report "Cotizador y Comparativo permanecen deshabilitados."
} catch {
  Add-Report "ERROR: $($_.Exception.Message)"
  Add-Report "RESULTADO: HOST_P09L_P09N_BLOQUEADO"
} finally {
  Add-Report ""
  Add-Report "Reporte privado: $Report"
  Add-Report "No se hizo deploy, commit, push ni producción."
  try { Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard; notepad $Report } catch {}
}