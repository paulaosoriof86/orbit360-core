param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = "Stop"

$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$App = Join-Path $Repo "orbit360-platform"
$Reports = Join-Path $Repo "_orbit360_reports"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "PREPARAR-CONFIG-FIREBASE-LAB-LOCAL-$Stamp.txt"

function Add-Report([string]$Text) {
  Add-Content -Path $Report -Value $Text -Encoding UTF8
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - PREPARAR CONFIG FIREBASE LAB LOCAL"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Rama esperada: $ExpectedBranch"
Add-Report "Restricciones: NO deploy, NO Hosting, NO produccion, NO commit, NO push, NO mostrar secretos en reporte"
Add-Report "============================================================"
Add-Report ""

try {
  if (-not (Test-Path $Repo)) { throw "No existe repo: $Repo" }
  if (-not (Test-Path $App)) { throw "No existe app: $App" }
  Set-Location $Repo

  Add-Report "== 1. Verificar rama obligatoria =="
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  Add-Report "Rama actual: $Branch"
  if ($Branch -ne $ExpectedBranch) {
    throw "Rama incorrecta. Debes cambiar a: $ExpectedBranch. No se crea config local."
  }
  Add-Report "OK: rama obligatoria confirmada."
  Add-Report ""

  Add-Report "== 2. Verificar .gitignore =="
  $Gitignore = Join-Path $Repo ".gitignore"
  if (-not (Test-Path $Gitignore)) { throw "No existe .gitignore" }
  $GitignoreText = Get-Content $Gitignore -Raw -Encoding UTF8
  if ($GitignoreText -notmatch "auth-firebase\.config\.local\.js") {
    throw ".gitignore no protege auth-firebase.config.local.js. No se crea config local."
  }
  Add-Report "OK: .gitignore protege auth-firebase.config.local.js"
  Add-Report ""

  Add-Report "== 3. Preparar archivo local ignorado por Git =="
  $Example = Join-Path $App "core\auth-firebase.config.local.example.js"
  $Local = Join-Path $App "core\auth-firebase.config.local.js"
  if (-not (Test-Path $Example)) { throw "No existe plantilla: $Example" }

  if (-not (Test-Path $Local)) {
    Copy-Item -Path $Example -Destination $Local -Force
    Add-Report "OK: se creo archivo local desde plantilla: $Local"
    Add-Report "ACCION REQUERIDA: reemplazar placeholders con config Firebase LAB autorizada."
  } else {
    Add-Report "OK: ya existe archivo local: $Local"
    Add-Report "No se sobrescribio para no borrar config local existente."
  }

  $LocalText = Get-Content $Local -Raw -Encoding UTF8
  if ($LocalText -match "REEMPLAZAR_") {
    Add-Report "ESTADO CONFIG LOCAL: PENDIENTE_REEMPLAZAR_PLACEHOLDERS"
  } else {
    Add-Report "ESTADO CONFIG LOCAL: SIN_PLACEHOLDERS_VISIBLES"
  }
  Add-Report ""

  Add-Report "== 4. Abrir archivo local en Notepad =="
  Add-Report "Se abre Notepad con el archivo local. No pegues secretos en chats ni reportes."
  notepad $Local

  Add-Report "RESULTADO: CONFIG_LOCAL_PREPARADA_O_EXISTENTE"

} catch {
  Add-Report "ERROR GENERAL: $($_.Exception.Message)"
} finally {
  Add-Report ""
  Add-Report "Reporte: $Report"
  Add-Report "Restricciones respetadas: NO deploy, NO Hosting, NO produccion, NO commit, NO push, NO mostrar secretos en reporte."
  try {
    Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard
    notepad $Report
  } catch {}
}
