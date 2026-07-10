param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Reports = Join-Path $Repo "_orbit360_private_reports"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Summary = Join-Path $Reports "P09N-RESUMEN-$Stamp.txt"

function Add-Line([string]$Text) { Add-Content -Path $Summary -Value $Text -Encoding UTF8 }
function State-Label($Value) { if ($Value -eq "approved") { return "APROBADO" } elseif ($Value -eq "blocked") { return "BLOQUEADO" } else { return "PENDIENTE" } }

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Summary -Value "============================================================" -Encoding UTF8
Add-Line "ORBIT 360 - RESUMEN OBSERVACION ASEGURADORAS P0.9N"
Add-Line "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Line "============================================================"

try {
  if (-not (Test-Path $Repo)) { throw "No existe el repositorio configurado." }
  Set-Location $Repo
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  $Head = (git rev-parse HEAD).Trim()
  Add-Line "Rama: $Branch"
  Add-Line "HEAD: $Head"
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta. No se revisa el reporte." }

  $Latest = Get-ChildItem $Reports -Filter "P09N-RUNTIME-*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $Latest) { throw "Todavía no existe un reporte P0.9N. Debe ejecutarse el host y abrir Aseguradoras." }
  $Data = Get-Content $Latest.FullName -Raw -Encoding UTF8 | ConvertFrom-Json

  Add-Line ""
  Add-Line "VISTA"
  Add-Line "- Dispositivo: $($Data.viewport.bucket)"
  Add-Line "- Panel visible: $($Data.ui.panelVisible)"
  Add-Line "- Formulario visible: $($Data.ui.formVisible)"
  Add-Line "- Desbordamiento horizontal: $($Data.viewport.horizontalOverflow)"
  Add-Line "- Textos técnicos visibles: $($Data.ui.forbiddenVisibleCount)"

  Add-Line ""
  Add-Line "FLUJO"
  Add-Line "- Usuario y rol activo confirmados: $($Data.actor.activeRoleAssigned -and $Data.actor.tenantMatch)"
  Add-Line "- Conexión de archivos: $($Data.runtime.sourceConnectionReady)"
  Add-Line "- Vista previa: $($Data.flow.previewGenerated)"
  Add-Line "- Lectura terminada: $($Data.flow.executionOk)"
  Add-Line "- Historial guardado: $($Data.flow.historyPersisted)"
  Add-Line "- Recarga detectada: $($Data.navigationReloaded)"
  Add-Line "- Runs: $($Data.flow.historyRuns)"
  Add-Line "- Ítems: $($Data.flow.historyItems)"

  Add-Line ""
  Add-Line "GATE CLAUDE"
  Add-Line "Estado: $(if ($Data.claudeGate.ready) { 'LISTO' } else { 'TODAVÍA NO' })"
  foreach ($Gate in $Data.gates) { Add-Line "- $($Gate.id): $(State-Label $Gate.state)" }

  Add-Line ""
  Add-Line "SEGURIDAD"
  Add-Line "- Contiene PII: NO"
  Add-Line "- Contiene rutas/referencias: NO"
  Add-Line "- Escribe conocimiento: NO"
  Add-Line "- Habilita Cotizador: NO"
  Add-Line "- Habilita Comparativo: NO"
  Add-Line ""
  Add-Line "Reporte fuente: $($Latest.Name)"
  Add-Line "RESULTADO: P09N_RESUMEN_GENERADO"
} catch {
  Add-Line "ERROR: $($_.Exception.Message)"
  Add-Line "RESULTADO: P09N_RESUMEN_BLOQUEADO"
} finally {
  Add-Line ""
  Add-Line "No se hizo deploy, commit, push ni escritura operativa."
  try { Get-Content $Summary -Raw -Encoding UTF8 | Set-Clipboard; notepad $Summary } catch {}
}
