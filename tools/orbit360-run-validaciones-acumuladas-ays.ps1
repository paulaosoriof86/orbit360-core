Param(
  [string]$Repo = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
Set-Location $Repo

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$logDir = Join-Path $Repo '_orbit360_reports'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "VALIDACIONES-ACUMULADAS-AYS-$stamp.log"

"ORBIT 360 A&S - VALIDACIONES ACUMULADAS" | Tee-Object -FilePath $log
"Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Tee-Object -FilePath $log -Append
"Repo: $Repo" | Tee-Object -FilePath $log -Append
"Restricciones: no merge, no deploy, no produccion, no datos reales" | Tee-Object -FilePath $log -Append
"" | Tee-Object -FilePath $log -Append

node tools/orbit360-run-validaciones-acumuladas-ays.mjs 2>&1 | Tee-Object -FilePath $log -Append
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
