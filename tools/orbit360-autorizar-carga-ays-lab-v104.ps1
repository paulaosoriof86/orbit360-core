param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core",
  [string]$ProjectId = "",
  [switch]$EscribirLab,
  [string]$Confirmacion = ""
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Reports = Join-Path $Repo "_orbit360_reports"
$ImportDir = Join-Path $Repo "_orbit360_imports\ays_real"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "AUTORIZAR-CARGA-AYS-LAB-V104-$Stamp.txt"

function Add-Report([string]$Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }
function LatestJsonSummary {
  Get-ChildItem -Path $Reports -Filter "RESUMEN-EJECUTIVO-IMPORTACION-AYS-V104-*.json" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - AUTORIZAR CARGA A&S LAB v1.104"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Rama esperada: $ExpectedBranch"
Add-Report "Modo escritura solicitado: $EscribirLab"
Add-Report "Restricciones: NO deploy, NO produccion, NO main, NO secretos en repo, NO datos reales en repo, NO commit, NO push"
Add-Report "============================================================"

try {
  if (-not (Test-Path $Repo)) { throw "No existe repo: $Repo" }
  Set-Location $Repo

  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  $Head = (git rev-parse HEAD).Trim()
  Add-Report "Rama actual: $Branch"
  Add-Report "HEAD: $Head"
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta. Debe ser $ExpectedBranch." }

  $SummaryScript = Join-Path $Repo "tools\orbit360-resumen-ejecutivo-importacion-ays-v104.mjs"
  if (-not (Test-Path $SummaryScript)) { throw "Falta resumen ejecutivo: $SummaryScript" }
  node $SummaryScript --reports $Reports | ForEach-Object { Add-Report $_ }

  $SummaryFile = LatestJsonSummary
  if (-not $SummaryFile) { throw "No existe resumen ejecutivo JSON. Ejecuta primero el ensayo." }
  Add-Report "Resumen usado: $($SummaryFile.FullName)"
  $Summary = Get-Content $SummaryFile.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  Add-Report "Decision resumen: $($Summary.decision)"

  if ($Summary.decision -ne "APTO_PARA_SOLICITAR_AUTORIZACION_LAB") {
    throw "No se autoriza escritura LAB porque el resumen no esta APTO."
  }

  $Loader = Join-Path $Repo "tools\orbit360-cargar-importacion-ays-lab-v104.mjs"
  if (-not (Test-Path $Loader)) { throw "Falta cargador LAB: $Loader" }

  if (-not $EscribirLab) {
    Add-Report ""
    Add-Report "RESULTADO: PREFLIGHT_OK_SIN_ESCRITURA"
    Add-Report "Para escribir LAB se requiere ejecutar con -EscribirLab -Confirmacion ESCRIBIR_LAB_AYS -ProjectId <PROJECT_ID_LAB>."
    return
  }

  if ($Confirmacion -ne "ESCRIBIR_LAB_AYS") { throw "Confirmacion invalida. Debe ser ESCRIBIR_LAB_AYS." }
  if (-not $ProjectId) { throw "Falta -ProjectId <PROJECT_ID_LAB>." }
  if (-not $env:GOOGLE_APPLICATION_CREDENTIALS) { throw "Falta variable local GOOGLE_APPLICATION_CREDENTIALS." }
  if (-not (Test-Path $env:GOOGLE_APPLICATION_CREDENTIALS)) { throw "GOOGLE_APPLICATION_CREDENTIALS no apunta a un archivo local existente." }

  Add-Report ""
  Add-Report "INICIO ESCRITURA LAB CONTROLADA"
  Add-Report "ProjectId: $ProjectId"
  Add-Report "InputDir: $ImportDir"
  Add-Report "No se imprime contenido de credenciales."

  node $Loader --input $ImportDir --tenant alianzas-soluciones --project $ProjectId --write --confirm ESCRIBIR_LAB_AYS | ForEach-Object { Add-Report $_ }
  $Code = $LASTEXITCODE
  Add-Report "ExitCode cargador LAB: $Code"
  if ($Code -ne 0) { throw "Carga LAB fallo. Revisar reporte y considerar rollback por batchId si hubo escrituras parciales." }

  $Lister = Join-Path $Repo "tools\orbit360-listar-lotes-importacion-ays-v104.mjs"
  if (Test-Path $Lister) { node $Lister (Join-Path $Repo "_orbit360_exports") | ForEach-Object { Add-Report $_ } }

  $Smoke = Join-Path $Repo "tools\orbit360-smoke-post-carga-ays-lab-v104.mjs"
  if (Test-Path $Smoke) {
    Add-Report ""
    Add-Report "INICIO SMOKE POST CARGA LAB SOLO LECTURA"
    node $Smoke --tenant alianzas-soluciones --project $ProjectId | ForEach-Object { Add-Report $_ }
    $SmokeCode = $LASTEXITCODE
    Add-Report "ExitCode smoke post carga: $SmokeCode"
    if ($SmokeCode -ne 0) { throw "Smoke post carga fallo. No continuar a siguiente fase sin revisar/rollback." }
  }

  Add-Report ""
  Add-Report "RESULTADO: ESCRITURA_LAB_Y_SMOKE_EJECUTADOS"
  Add-Report "Revisar reportes, batchId y smoke antes de cualquier siguiente fase."
} catch {
  Add-Report "ERROR GENERAL: $($_.Exception.Message)"
} finally {
  Add-Report ""
  Add-Report "Reporte: $Report"
  Add-Report "Restricciones respetadas: NO deploy, NO produccion, NO main, NO secretos en repo, NO datos reales en repo, NO commit, NO push."
  try { Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard; notepad $Report } catch {}
}
