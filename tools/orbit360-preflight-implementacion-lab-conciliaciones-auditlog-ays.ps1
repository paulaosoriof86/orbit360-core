Param(
  [string]$Repo = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
Set-Location $Repo

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$logDir = Join-Path $Repo '_orbit360_reports'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "PREFLIGHT-IMPLEMENTACION-LAB-CONCILIACIONES-AUDITLOG-AYS-$stamp.log"

"ORBIT 360 A&S - PREFLIGHT IMPLEMENTACION LAB CONCILIACIONES AUDITLOG" | Tee-Object -FilePath $log
"Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Tee-Object -FilePath $log -Append
"Repo: $Repo" | Tee-Object -FilePath $log -Append
"Restricciones: no escribe datos, no modifica archivos, no deploy, no merge" | Tee-Object -FilePath $log -Append
"" | Tee-Object -FilePath $log -Append

node tools/orbit360-preflight-implementacion-lab-conciliaciones-auditlog-ays.mjs 2>&1 | Tee-Object -FilePath $log -Append
$code = $LASTEXITCODE

"" | Tee-Object -FilePath $log -Append
"ExitCode: $code" | Tee-Object -FilePath $log -Append
"Log: $log" | Tee-Object -FilePath $log -Append

try {
  Get-Content $log -Raw | Set-Clipboard
  "Resumen copiado al portapapeles." | Tee-Object -FilePath $log -Append
} catch {
  "No se pudo copiar al portapapeles." | Tee-Object -FilePath $log -Append
}

exit $code
