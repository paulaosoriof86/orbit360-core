param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core",
  [switch]$PrepararConfig
)

$ErrorActionPreference = "Stop"

$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Reports = Join-Path $Repo "_orbit360_reports"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "RUN-FLUJO-AYS-LAB-V99-$Stamp.txt"

function Add-Report([string]$Text) {
  Add-Content -Path $Report -Value $Text -Encoding UTF8
}

function Run-Step([string]$Name, [scriptblock]$Block) {
  Add-Report ""
  Add-Report "== $Name =="
  try {
    & $Block
    Add-Report "OK: $Name"
    return $true
  } catch {
    Add-Report "ERROR en $Name: $($_.Exception.Message)"
    return $false
  }
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - RUN FLUJO A&S LAB V99"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Rama obligatoria: $ExpectedBranch"
Add-Report "Preparar config local si falta: $PrepararConfig"
Add-Report "Restricciones: NO deploy, NO Hosting, NO produccion, NO secretos, NO datos reales, NO commit automatico, NO push automatico"
Add-Report "============================================================"

$AllOk = $true

$AllOk = (Run-Step "1. Verificar repo" {
  if (-not (Test-Path $Repo)) { throw "No existe repo: $Repo" }
  Set-Location $Repo
  Add-Report "OK: repo encontrado."
}) -and $AllOk

$AllOk = (Run-Step "2. Sincronizar rama obligatoria" {
  Set-Location $Repo
  git fetch origin $ExpectedBranch | ForEach-Object { Add-Report $_ }

  $Current = (git rev-parse --abbrev-ref HEAD).Trim()
  Add-Report "Rama actual antes: $Current"

  $Status = (git status --porcelain)
  if ($Status) {
    Add-Report "ADVERTENCIA: hay cambios locales antes de cambiar/pullar:"
    $Status | ForEach-Object { Add-Report $_ }
    Add-Report "No se descartan cambios locales. Si hay conflicto, Git bloqueara y el reporte lo indicara."
  }

  git checkout $ExpectedBranch | ForEach-Object { Add-Report $_ }
  git pull --ff-only origin $ExpectedBranch | ForEach-Object { Add-Report $_ }

  $After = (git rev-parse --abbrev-ref HEAD).Trim()
  $Head = (git rev-parse HEAD).Trim()
  Add-Report "Rama actual despues: $After"
  Add-Report "HEAD: $Head"
  if ($After -ne $ExpectedBranch) { throw "No quedo en la rama obligatoria." }
}) -and $AllOk

$AllOk = (Run-Step "3. Verificar config Firebase LAB local" {
  $Config = Join-Path $Repo "orbit360-platform\core\auth-firebase.config.local.js"
  $PrepScript = Join-Path $Repo "tools\orbit360-preparar-config-firebase-lab-local.ps1"

  if (-not (Test-Path $Config)) {
    Add-Report "BLOQUEO: no existe config local: $Config"
    if ($PrepararConfig) {
      if (-not (Test-Path $PrepScript)) { throw "Falta preparador: $PrepScript" }
      Add-Report "Se ejecutara preparador local para crear plantilla y abrir Notepad."
      & powershell -NoProfile -ExecutionPolicy Bypass -File $PrepScript -Repo $Repo | ForEach-Object { Add-Report $_ }
      Add-Report "Config local preparada. Reemplaza placeholders y vuelve a ejecutar este flujo sin -PrepararConfig."
      throw "Config local preparada, pendiente reemplazar valores LAB autorizados."
    } else {
      throw "Ejecuta este flujo con -PrepararConfig o crea auth-firebase.config.local.js con valores LAB autorizados."
    }
  }

  $ConfigText = Get-Content $Config -Raw -Encoding UTF8
  if ($ConfigText -match "REEMPLAZAR_") {
    throw "Config local existe pero aun tiene placeholders REEMPLAZAR_. Abre el archivo local, completa config LAB y vuelve a ejecutar."
  }

  Add-Report "OK: config local existe y no muestra placeholders visibles. No se imprime contenido por seguridad."
}) -and $AllOk

if ($AllOk) {
  $AllOk = (Run-Step "4. Ejecutar integracion local backend LAB en index" {
    $Script = Join-Path $Repo "tools\orbit360-integrar-backend-lab-index.ps1"
    if (-not (Test-Path $Script)) { throw "Falta script: $Script" }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $Script -Repo $Repo | ForEach-Object { Add-Report $_ }
    Add-Report "Script integracion ejecutado. Revisa su reporte detallado en _orbit360_reports."
  }) -and $AllOk
}

if ($AllOk) {
  $AllOk = (Run-Step "5. Ejecutar stability gate A&S v99" {
    $Script = Join-Path $Repo "tools\orbit360-stability-gate-ays-v99.ps1"
    if (-not (Test-Path $Script)) { throw "Falta script: $Script" }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $Script -Repo $Repo | ForEach-Object { Add-Report $_ }
    $Code = $LASTEXITCODE
    Add-Report "ExitCode stability gate: $Code"
    if ($Code -eq 2) { throw "Stability gate bloqueado. Revisar reporte STABILITY-GATE-AYS-V99." }
    if ($Code -eq 1) { Add-Report "Stability gate con advertencias. Se permite continuar, pero revisar reporte." }
    if ($Code -eq 0) { Add-Report "Stability gate aprobado." }
  }) -and $AllOk
}

if ($AllOk) {
  $AllOk = (Run-Step "6. Ejecutar smoke A&S LAB v99" {
    $Script = Join-Path $Repo "tools\orbit360-smoke-ays-lab-v99.ps1"
    if (-not (Test-Path $Script)) { throw "Falta script: $Script" }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $Script -Repo $Repo | ForEach-Object { Add-Report $_ }
    Add-Report "Script smoke ejecutado. Revisa su reporte detallado en _orbit360_reports."
  }) -and $AllOk
}

Run-Step "7. Estado Git posterior" {
  Set-Location $Repo
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  Add-Report "Rama final: $Branch"
  $Status = (git status --short)
  if ($Status) {
    Add-Report "Cambios locales despues del flujo:"
    $Status | ForEach-Object { Add-Report $_ }
  } else {
    Add-Report "Sin cambios locales."
  }
}

Add-Report ""
if ($AllOk) {
  Add-Report "RESULTADO FLUJO A&S LAB V99: EJECUTADO"
  Add-Report "Revisar reportes individuales de stability gate y smoke para confirmar aprobacion final."
} else {
  Add-Report "RESULTADO FLUJO A&S LAB V99: BLOQUEADO_O_CON_ERRORES"
  Add-Report "No se hizo deploy, commit, push ni produccion. Revisar seccion de errores."
}

Add-Report ""
Add-Report "Reporte maestro: $Report"
Add-Report "Restricciones respetadas: NO deploy, NO Hosting, NO produccion, NO secretos, NO datos reales, NO commit automatico, NO push automatico."

try {
  Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard
  notepad $Report
} catch {}
