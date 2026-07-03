param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = "Stop"

$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$App = Join-Path $Repo "orbit360-platform"
$Reports = Join-Path $Repo "_orbit360_reports"
$Backups = Join-Path $Repo "_orbit360_backups"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "INTEGRAR-BACKEND-LAB-INDEX-$Stamp.txt"

function Add-Report([string]$Text) {
  Add-Content -Path $Report -Value $Text -Encoding UTF8
}

New-Item -ItemType Directory -Force -Path $Reports, $Backups | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - INTEGRAR BACKEND LAB EN INDEX CENTRAL v1.104"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Rama esperada: $ExpectedBranch"
Add-Report "Restricciones: NO deploy, NO Hosting, NO produccion, NO secretos, NO datos reales, NO commit automatico, NO push automatico"
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
    throw "Rama incorrecta. Debes cambiar a: $ExpectedBranch. No se modifica index.html."
  }
  $Head = (git rev-parse HEAD).Trim()
  Add-Report "HEAD actual: $Head"
  Add-Report "OK: rama obligatoria confirmada."
  Add-Report ""

  Add-Report "== 2. Verificar archivos requeridos =="
  $Index = Join-Path $App "index.html"
  $Loader = Join-Path $App "core\backend-lab-loader.js"
  $Init = Join-Path $App "core\backend-lab-init.js"
  $Guard = Join-Path $App "core\backend-lab-security-guard.js"
  $Store = Join-Path $App "data\store.js"
  $StoreLab = Join-Path $App "data\store-firestore-lab.local.js"

  foreach ($Path in @($Index, $Loader, $Init, $Guard, $Store, $StoreLab)) {
    if (Test-Path $Path) { Add-Report "OK: existe $Path" }
    else { throw "Falta archivo requerido: $Path" }
  }
  Add-Report ""

  Add-Report "== 3. Backup index.html =="
  $BackupIndex = Join-Path $Backups "index-pre-backend-lab-$Stamp.html"
  Copy-Item -Path $Index -Destination $BackupIndex -Force
  Add-Report "Backup creado: $BackupIndex"
  Add-Report ""

  Add-Report "== 4. Insertar loader/init/guard si faltan =="
  $Text = Get-Content $Index -Raw -Encoding UTF8
  $Original = $Text

  $LoaderTag = '  <script src="core/backend-lab-loader.js?v=lab-v104"></script>'
  $InitTag = '  <script src="core/backend-lab-init.js?v=lab-v104"></script>'
  $GuardTag = '  <script src="core/backend-lab-security-guard.js?v=lab-v104"></script>'
  $StoreNeedle = '  <script src="data/store.js?v1268"></script>'
  $StoreLabNeedle = '  <script src="data/store-firestore-lab.local.js?v=lab-v99"></script>'

  if (-not $Text.Contains($StoreNeedle)) {
    throw "No se encontro punto de insercion exacto: $StoreNeedle"
  }

  if (-not $Text.Contains('core/backend-lab-loader.js')) {
    $Text = $Text.Replace($StoreNeedle, "$LoaderTag`r`n$InitTag`r`n$StoreNeedle")
    Add-Report "OK: backend-lab-loader.js y backend-lab-init.js insertados antes de data/store.js."
  } elseif ($Text.Contains('core/backend-lab-loader.js') -and -not $Text.Contains('core/backend-lab-init.js')) {
    $Text = $Text.Replace($StoreNeedle, "$InitTag`r`n$StoreNeedle")
    Add-Report "OK: backend-lab-init.js insertado antes de data/store.js."
  } else {
    Add-Report "OK: index.html ya tenia loader/init LAB. No se insertaron duplicados."
  }

  if (-not $Text.Contains('data/store-firestore-lab.local.js')) {
    throw "No se encontro data/store-firestore-lab.local.js en index. Este script no insertara el store LAB para evitar orden incorrecto."
  }

  if (-not $Text.Contains('core/backend-lab-security-guard.js')) {
    if ($Text.Contains($StoreLabNeedle)) {
      $Text = $Text.Replace($StoreLabNeedle, "$StoreLabNeedle`r`n$GuardTag")
    } else {
      $Text = $Text.Replace('  <script src="data/store-firestore-lab.local.js', "$GuardTag`r`n  <script src=\"data/store-firestore-lab.local.js")
    }
    Add-Report "OK: backend-lab-security-guard.js insertado despues del store LAB."
  } else {
    Add-Report "OK: index.html ya tenia backend-lab-security-guard.js."
  }

  if ($Text -ne $Original) {
    Set-Content -Path $Index -Value $Text -Encoding UTF8
    Add-Report "OK: index.html actualizado localmente."
  } else {
    Add-Report "OK: sin cambios necesarios en index.html."
  }
  Add-Report ""

  Add-Report "== 5. Verificar orden final =="
  $Final = Get-Content $Index -Raw -Encoding UTF8
  $LoaderPos = $Final.IndexOf('core/backend-lab-loader.js')
  $InitPos = $Final.IndexOf('core/backend-lab-init.js')
  $StorePos = $Final.IndexOf('data/store.js')
  $LabPos = $Final.IndexOf('data/store-firestore-lab.local.js')
  $GuardPos = $Final.IndexOf('core/backend-lab-security-guard.js')
  $SeedPos = $Final.IndexOf('data/seed.js')
  Add-Report "Orden: loader=$LoaderPos init=$InitPos store=$StorePos lab=$LabPos guard=$GuardPos seed=$SeedPos"

  if (-not ($LoaderPos -ge 0 -and $InitPos -gt $LoaderPos -and $StorePos -gt $InitPos -and $LabPos -gt $StorePos -and $GuardPos -gt $LabPos -and $SeedPos -gt $GuardPos)) {
    throw "Orden final incorrecto. Esperado: loader -> init -> store -> store-firestore-lab -> security-guard -> seed"
  }
  Add-Report "OK: orden final correcto."
  Add-Report ""

  Add-Report "== 6. Verificar diff local =="
  $Diff = git diff -- orbit360-platform/index.html
  if ($Diff) {
    Add-Report "Diff detectado en index.html:"
    $Diff | ForEach-Object { Add-Report $_ }
  } else {
    Add-Report "Sin diff en index.html."
  }
  Add-Report ""

  Add-Report "RESULTADO: INDEX LAB INTEGRADO_LOCALMENTE_V104"
  Add-Report "Siguiente paso recomendado: ejecutar tools/orbit360-validar-backend-lab-contrato.mjs y tools/orbit360-smoke-ays-lab-v99.ps1."

} catch {
  Add-Report "ERROR GENERAL: $($_.Exception.Message)"
} finally {
  Add-Report ""
  Add-Report "Reporte: $Report"
  Add-Report "Restricciones respetadas: NO deploy, NO Hosting, NO produccion, NO secretos, NO datos reales, NO commit automatico, NO push automatico."
  try {
    Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard
    notepad $Report
  } catch {}
}
