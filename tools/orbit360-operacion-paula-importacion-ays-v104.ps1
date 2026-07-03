param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core",
  [ValidateSet("ensayo","preflight","escribir-lab","smoke-post-carga")]
  [string]$Modo = "ensayo",
  [string]$ProjectId = "",
  [string]$Confirmacion = ""
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Reports = Join-Path $Repo "_orbit360_reports"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "OPERACION-PAULA-IMPORTACION-AYS-V104-$Modo-$Stamp.txt"

function Add-Report([string]$Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }
function Run-Local([string]$Name, [string]$Script, [string[]]$ArgsList) {
  Add-Report ""
  Add-Report "== $Name =="
  if (-not (Test-Path $Script)) { throw "Falta script: $Script" }
  & powershell -NoProfile -ExecutionPolicy Bypass -File $Script @ArgsList | ForEach-Object { Add-Report $_ }
  $Code = $LASTEXITCODE
  Add-Report "ExitCode ${Name}: $Code"
  if ($Code -ne 0) { Add-Report "ADVERTENCIA: el script retorno exit code $Code. Revisar reporte interno." }
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - OPERACION PAULA IMPORTACION A&S v1.104"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Modo: $Modo"
Add-Report "Rama esperada: $ExpectedBranch"
Add-Report "Restricciones por defecto: NO deploy, NO produccion, NO main, NO datos reales en repo, NO secretos en repo, NO commit, NO push"
Add-Report "============================================================"

try {
  if (-not (Test-Path $Repo)) { throw "No existe repo: $Repo" }
  Set-Location $Repo
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  Add-Report "Rama actual antes: $Branch"
  if ($Branch -ne $ExpectedBranch) {
    Add-Report "Cambiando a rama obligatoria..."
    git fetch origin $ExpectedBranch | ForEach-Object { Add-Report $_ }
    git checkout $ExpectedBranch | ForEach-Object { Add-Report $_ }
    git pull --ff-only origin $ExpectedBranch | ForEach-Object { Add-Report $_ }
  }
  $After = (git rev-parse --abbrev-ref HEAD).Trim()
  $Head = (git rev-parse HEAD).Trim()
  Add-Report "Rama actual despues: $After"
  Add-Report "HEAD: $Head"
  if ($After -ne $ExpectedBranch) { throw "No quedo en la rama obligatoria." }

  switch ($Modo) {
    "ensayo" {
      $Script = Join-Path $Repo "tools\orbit360-run-primer-ensayo-importacion-ays-v104.ps1"
      Run-Local "Primer ensayo sin escritura" $Script @("-Repo", $Repo)
      Add-Report "RESULTADO OPERACION: ENSAYO_SOLICITADO_SIN_ESCRITURA"
    }
    "preflight" {
      $Script = Join-Path $Repo "tools\orbit360-autorizar-carga-ays-lab-v104.ps1"
      Run-Local "Preflight autorizacion sin escritura" $Script @("-Repo", $Repo)
      Add-Report "RESULTADO OPERACION: PREFLIGHT_SOLICITADO_SIN_ESCRITURA"
    }
    "escribir-lab" {
      if ($Confirmacion -ne "ESCRIBIR_LAB_AYS") { throw "Para escribir LAB debes usar -Confirmacion ESCRIBIR_LAB_AYS." }
      if (-not $ProjectId) { throw "Para escribir LAB debes indicar -ProjectId <PROJECT_ID_LAB>." }
      $Script = Join-Path $Repo "tools\orbit360-autorizar-carga-ays-lab-v104.ps1"
      Run-Local "Escritura LAB controlada" $Script @("-Repo", $Repo, "-ProjectId", $ProjectId, "-EscribirLab", "-Confirmacion", "ESCRIBIR_LAB_AYS")
      Add-Report "RESULTADO OPERACION: ESCRITURA_LAB_SOLICITADA_CON_CONFIRMACION"
    }
    "smoke-post-carga" {
      if (-not $ProjectId) { throw "Para smoke post carga debes indicar -ProjectId <PROJECT_ID_LAB>." }
      $Script = Join-Path $Repo "tools\orbit360-smoke-post-carga-ays-lab-v104.ps1"
      Run-Local "Smoke post carga solo lectura" $Script @("-Repo", $Repo, "-ProjectId", $ProjectId)
      Add-Report "RESULTADO OPERACION: SMOKE_POST_CARGA_SOLICITADO"
    }
  }
} catch {
  Add-Report "ERROR GENERAL: $($_.Exception.Message)"
} finally {
  Add-Report ""
  Add-Report "Reporte: $Report"
  Add-Report "Restricciones respetadas: NO deploy, NO produccion, NO main, NO datos reales en repo, NO secretos en repo, NO commit, NO push."
  try { Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard; notepad $Report } catch {}
}
