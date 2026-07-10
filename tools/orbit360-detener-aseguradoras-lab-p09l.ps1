param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = "Stop"
$Reports = Join-Path $Repo "_orbit360_private_reports"
$PidFile = Join-Path $Reports "P09L-HOST-PID.json"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "P09L-DETENER-ASEGURADORAS-$Stamp.txt"

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Report -Value "ORBIT 360 - DETENER HOST ASEGURADORAS P0.9L" -Encoding UTF8

try {
  if (-not (Test-Path $PidFile)) {
    Add-Content $Report "No existe registro de host activo." -Encoding UTF8
  } else {
    $Info = Get-Content $PidFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $Process = Get-Process -Id ([int]$Info.pid) -ErrorAction SilentlyContinue
    if ($Process) {
      Stop-Process -Id $Process.Id -Force
      Add-Content $Report "Host detenido correctamente." -Encoding UTF8
    } else {
      Add-Content $Report "El proceso ya no estaba activo." -Encoding UTF8
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  }
  Add-Content $Report "No se hizo deploy, commit, push ni producción." -Encoding UTF8
} catch {
  Add-Content $Report "ERROR: $($_.Exception.Message)" -Encoding UTF8
} finally {
  try { Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard; notepad $Report } catch {}
}
