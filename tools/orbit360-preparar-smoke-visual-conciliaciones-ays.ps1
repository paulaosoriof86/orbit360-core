<#
Orbit 360 A&S — Helper para preparar reporte de smoke visual Conciliaciones.
No deploy. No merge. No datos reales. No Firestore writes. No Orbit.store writes. No aplicación de pagos.
Ejecutar desde la raíz del repo: .\tools\orbit360-preparar-smoke-visual-conciliaciones-ays.ps1
Opcional: -LocalUrl http://localhost:5173/orbit360-platform/index.html -OpenBrowser
#>
[CmdletBinding()]
param(
  [string]$LocalUrl = 'http://localhost:5173/orbit360-platform/index.html',
  [switch]$OpenBrowser
)

$ErrorActionPreference = 'Stop'
$StartedAt = Get-Date
$Root = (Get-Location).Path
$ReportsDir = Join-Path $Root '_orbit360_reports'

function Write-Section($Title) {
  Write-Host ''
  Write-Host ('=' * 88)
  Write-Host $Title
  Write-Host ('=' * 88)
}

Write-Section 'ORBIT 360 A&S — PREPARAR SMOKE VISUAL CONCILIACIONES'
Write-Host "Fecha local: $($StartedAt.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Host "Repo: $Root"
Write-Host 'Restricciones: no deploy, no merge, no datos reales, no writes, no aplicación de pagos.'

if (-not (Test-Path (Join-Path $Root 'orbit360-platform'))) {
  throw 'No parece estar en la raíz del repo: falta orbit360-platform.'
}
if (-not (Test-Path $ReportsDir)) {
  New-Item -ItemType Directory -Path $ReportsDir | Out-Null
}

$LatestRunnerTxt = Get-ChildItem -Path $ReportsDir -Filter 'RUN-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-*.txt' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$LatestRunnerJson = Get-ChildItem -Path $ReportsDir -Filter 'RUN-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-*.json' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

$Checklist = @"
ORBIT 360 A&S — REPORTE SMOKE VISUAL CONCILIACIONES
Fecha local: $($StartedAt.ToString('yyyy-MM-dd HH:mm:ss'))
Repo: $Root
URL local usada: $LocalUrl
Runner TXT previo: $($LatestRunnerTxt.FullName)
Runner JSON previo: $($LatestRunnerJson.FullName)

RESTRICCIONES DEL SMOKE
[ ] No deploy
[ ] No merge
[ ] No datos reales
[ ] No Firestore writes
[ ] No Orbit.store writes fuera de conciliaciones
[ ] No aplicación de pagos
[ ] No marcar cobros como pagados
[ ] No generar cartera
[ ] No generar producción

PRECONDICIONES
[ ] Runner local ejecutado antes del smoke
[ ] Runner local con RESULTADO: OK
[ ] Runner local con Fallidos: 0
[ ] Runner local con Archivos protegidos con cambios: 0
[ ] Runner local con can_write_now=false
[ ] Runner local con can_apply_payments=false
[ ] Si hubo advertencias, fueron revisadas y no son de contrato

ACCESO / NAVEGACIÓN
[ ] Login/entrada LAB carga sin pantalla rota
[ ] Menú principal conserva Orbit 360 en chrome
[ ] No aparecen textos técnicos visibles tipo Firebase, Firestore, backend, LAB, localStorage, mock, smoke, credenciales
[ ] Ruta/módulo Conciliaciones aparece para Dirección
[ ] Ruta/módulo Conciliaciones aparece para Admin
[ ] Ruta/módulo Conciliaciones aparece para Finanzas
[ ] Ruta/módulo Conciliaciones NO aparece para roles no autorizados

ESTADO VACÍO HONESTO
[ ] Si no hay propuestas, muestra estado vacío claro
[ ] El estado vacío no dice que no hay pagos pendientes de aplicar
[ ] El estado vacío no promete aplicación automática
[ ] No muestra pago aplicado sin backend real
[ ] No muestra producción/cartera generada desde conciliaciones

CONTENIDO / COPY SEGURO
[ ] Usa estados honestos: propuesta, revisión, pendiente de validación, validada, rechazada o bloqueada
[ ] Validada no significa pagada
[ ] No aparece copy de aplicación de pagos sin confirmación
[ ] No aparece copy de pago finalizado/productivo
[ ] Moneda visible respeta país si aparece GT/GTQ o CO/COP

ACCIONES SEGURAS
[ ] Ver detalle no muta cobros
[ ] Aprobar/validar propuesta no marca cobro pagado
[ ] Rechazar propuesta no borra cobros/pólizas/comisiones/finmovs
[ ] Enviar a revisión no genera cartera
[ ] Ninguna acción genera producción
[ ] Ninguna acción muestra Firestore/backend/LAB en UI cliente

TRAZABILIDAD VISUAL
[ ] Cada propuesta visible muestra fuente o referencia si hay datos sintéticos
[ ] Cada propuesta visible conserva estado de revisión
[ ] No hay mezcla de fuentes separadas en una misma acción
[ ] No hay suma cruda de monedas distintas

RESULTADO DEL SMOKE VISUAL
Decision visual: PENDIENTE / OK / OK_CON_OBSERVACIONES / BLOQUEADO
Observaciones:
- 

CAPTURAS / EVIDENCIA
Ruta o nombre de capturas si aplica:
- 

CRITERIO FINAL
[ ] Puede pasar a revisión técnica posterior, NO a adapter LAB automático
[ ] Debe bloquearse y corregirse antes de continuar

NOTA FIJA
Aunque este smoke salga OK, no autoriza deploy, merge, datos reales, adapter Firestore LAB, aplicación de pagos, cartera ni producción.
"@

$ReportPath = Join-Path $ReportsDir ('SMOKE-VISUAL-CONCILIACIONES-AYS-{0}.txt' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$Checklist | Set-Content -Path $ReportPath -Encoding UTF8

Write-Section 'PLANTILLA GENERADA'
Write-Host "Reporte: $ReportPath"
try {
  $Checklist | Set-Clipboard
  Write-Host 'Plantilla copiada al portapapeles.'
} catch {
  Write-Host 'No se pudo copiar al portapapeles; usa el TXT generado.'
}

if ($OpenBrowser) {
  Write-Section 'ABRIR NAVEGADOR'
  Write-Host "Abriendo: $LocalUrl"
  Start-Process $LocalUrl
} else {
  Write-Host "URL sugerida para abrir manualmente: $LocalUrl"
}

Write-Host ''
Write-Host 'RESULTADO: PLANTILLA_LISTA — no ejecuta writes ni valida visual automáticamente.'
exit 0
