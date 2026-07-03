# Orbit 360 - Recuperación segura + aplicar lote v1.97
# Fecha: 2026-07-03
# Restricciones: sin main, sin deploy, sin Hosting, sin producción.
# Este script respalda cambios locales, sincroniza la rama backend estable y ejecuta tools/orbit360-aplicar-lote-v197.ps1.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Repo = Join-Path $env:USERPROFILE 'OneDrive\Documentos\GitHub\orbit360-core'
$Branch = 'ays/backend-tenant-lab-v99-20260703'
$BackupRoot = Join-Path $env:USERPROFILE 'OneDrive\Documentos\Orbit360_Backups_Locales'
$Backup = Join-Path $BackupRoot "backup_pre_v197_$Stamp"
$ReportDir = Join-Path $Repo '_orbit360_reports'
$Report = Join-Path $ReportDir "recuperar_y_aplicar_v197_$Stamp.txt"
$ZipName = 'Prototype Development Request - 2026-07-03T090030.154.zip'

function Log($Text) { $Text | Tee-Object -FilePath $Report -Append }
function Fail($Text) {
  Log "ERROR: $Text"
  try { Get-Content $Report -Raw | Set-Clipboard } catch {}
  try { notepad $Report } catch {}
  throw $Text
}

if (!(Test-Path $Repo)) { throw "No existe el repo local: $Repo" }
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

"ORBIT 360 - RECUPERAR Y APLICAR V1.97" | Set-Content -Path $Report -Encoding UTF8
Log "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Log "Repo: $Repo"
Log "Rama esperada: $Branch"
Log "Backup: $Backup"
Log "Restricciones: sin main, sin deploy, sin Hosting, sin producción"
Log ""

Set-Location $Repo

Log "== Verificar ZIP v1.97 =="
$ZipCandidates = @(
  (Join-Path $env:USERPROFILE "Downloads\$ZipName"),
  (Join-Path $Repo $ZipName),
  (Join-Path (Get-Location).Path $ZipName)
)
$ZipPath = $ZipCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (!$ZipPath) {
  Log "No encontré el ZIP v1.97 en rutas esperadas:"
  $ZipCandidates | ForEach-Object { Log "- $_" }
  Fail "Descarga el ZIP v1.97 en Descargas o raíz del repo antes de continuar."
}
Log "OK: ZIP encontrado: $ZipPath"
Log ""

Log "== Crear backup completo local antes de limpiar =="
New-Item -ItemType Directory -Force -Path $Backup | Out-Null
robocopy $Repo $Backup /E /XD ".git" "node_modules" "_orbit360_reports" /XF "*.zip" /R:1 /W:1 | Out-Null
if ($LASTEXITCODE -gt 7) { Fail "Robocopy falló. Código: $LASTEXITCODE" }
git status --porcelain | Set-Content -Path (Join-Path $Backup 'git-status-before-reset.txt') -Encoding UTF8
git diff > (Join-Path $Backup 'git-diff-before-reset.patch')
git diff --staged > (Join-Path $Backup 'git-diff-staged-before-reset.patch')
Log "OK: backup creado en $Backup"
Log ""

Log "== Sincronizar rama backend estable =="
$CurrentBranch = (git branch --show-current).Trim()
Log "Rama actual: $CurrentBranch"
if ($CurrentBranch -ne $Branch) {
  git checkout $Branch 2>&1 | Tee-Object -FilePath $Report -Append
  if ($LASTEXITCODE -ne 0) { Fail "No se pudo hacer checkout a $Branch" }
}

git fetch origin $Branch 2>&1 | Tee-Object -FilePath $Report -Append
if ($LASTEXITCODE -ne 0) { Fail "git fetch falló." }

git reset --hard "origin/$Branch" 2>&1 | Tee-Object -FilePath $Report -Append
if ($LASTEXITCODE -ne 0) { Fail "git reset --hard origin/$Branch falló." }

git clean -fd 2>&1 | Tee-Object -FilePath $Report -Append
if ($LASTEXITCODE -ne 0) { Fail "git clean falló." }
Log "OK: rama sincronizada."
Log ""

Log "== Ejecutar aplicador v1.97 =="
$Script = Join-Path $Repo 'tools\orbit360-aplicar-lote-v197.ps1'
if (!(Test-Path $Script)) { Fail "No existe el aplicador esperado: $Script" }
powershell -ExecutionPolicy Bypass -File $Script 2>&1 | Tee-Object -FilePath $Report -Append
if ($LASTEXITCODE -ne 0) { Fail "El aplicador v1.97 falló." }

Log ""
Log "== Estado final =="
git status --short 2>&1 | Tee-Object -FilePath $Report -Append
git log --oneline -5 2>&1 | Tee-Object -FilePath $Report -Append
Log ""
Log "RESULTADO: recuperación segura + lote v1.97 completados."
Log "Backup local conservado en: $Backup"
Log "Reporte: $Report"
try { Get-Content $Report -Raw | Set-Clipboard } catch {}
try { notepad $Report } catch {}
