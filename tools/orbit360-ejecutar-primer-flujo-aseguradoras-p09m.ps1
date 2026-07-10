param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core",
  [string]$SourceRoot = ""
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Reports = Join-Path $Repo "_orbit360_private_reports"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$MasterReport = Join-Path $Reports "P09M-MAESTRO-$Stamp.txt"

function Add-Report([string]$Text) { Add-Content -Path $MasterReport -Value $Text -Encoding UTF8 }

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $MasterReport -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - PRIMER FLUJO DOCUMENTAL ASEGURADORAS P0.9M"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Rama obligatoria: $ExpectedBranch"
Add-Report "Restricciones: sin deploy, sin commit, sin push, sin producción, sin escritura de conocimiento, sin habilitar Cotizador/Comparativo"
Add-Report "============================================================"

try {
  if (-not (Test-Path $Repo)) { throw "No existe el repositorio configurado." }
  Set-Location $Repo
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  $Head = (git rev-parse HEAD).Trim()
  Add-Report "Rama actual: $Branch"
  Add-Report "HEAD: $Head"
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta. No se ejecuta P0.9M." }

  $Status = git status --porcelain
  if ($Status) {
    Add-Report "BLOQUEO: existen cambios locales sin confirmar. P0.9M no los descarta ni modifica."
    throw "El árbol de trabajo debe estar limpio para proteger el reporte."
  }

  $App = Join-Path $Repo "orbit360-platform"
  $Catalog = Join-Path $App "data\tenant-alianzas-soluciones-source-catalog-p09k.json"
  $Config = Join-Path $App "core\auth-firebase.config.local.js"
  $Cli = Join-Path $Repo "tools\orbit360-run-aseguradoras-first-flow-p09m-cli.mjs"
  foreach ($Path in @($App, $Catalog, $Cli)) { if (-not (Test-Path $Path)) { throw "Falta un componente P0.9M requerido." } }
  if (-not (Test-Path $Config)) { throw "Falta la configuración Firebase LAB local ignorada por Git." }

  if (-not $SourceRoot) {
    $Candidates = @(
      (Join-Path $Repo "_orbit360_private_sources\aseguradoras"),
      (Join-Path $Repo "_orbit360_imports\aseguradoras"),
      (Join-Path $Repo "_orbit360_imports\ays_real")
    )
    $SourceRoot = $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  }
  if (-not $SourceRoot -or -not (Test-Path $SourceRoot)) {
    throw "No existe una carpeta privada autorizada de fuentes. No se buscará automáticamente en Descargas ni carpetas personales."
  }
  $SourceRoot = (Resolve-Path $SourceRoot).Path
  Add-Report "OK: raíz privada autorizada localizada. La ruta no se imprime ni se copia al reporte sanitizado."

  $Before = Get-ChildItem $Reports -Filter "P09M-FIRST-FLOW-*.md" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $Args = @(
    $Cli,
    "--app", $App,
    "--catalog", $Catalog,
    "--root", $SourceRoot,
    "--report-dir", $Reports,
    "--document-id", "ays_aseguate_tarifario_2026_v1",
    "--insurer-id", "ins_gt_aseguradora_guatemalteca"
  )
  $Output = & node @Args 2>&1
  $Exit = $LASTEXITCODE
  $Output | ForEach-Object { Add-Report $_ }
  if ($Exit -ne 0) { throw "P0.9M terminó bloqueado. Revisa el código sanitizado del reporte maestro." }

  $After = Get-ChildItem $Reports -Filter "P09M-FIRST-FLOW-*.md" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $After -or ($Before -and $After.FullName -eq $Before.FullName -and $After.LastWriteTime -le $Before.LastWriteTime)) {
    throw "No se generó un reporte P0.9M nuevo."
  }
  Add-Report "OK: reporte sanitizado generado."
  Add-Report "Reporte legible: $($After.Name)"
  Add-Report "El reporte no contiene rutas, referencias, PII, tasas ni credenciales."
  Add-Report "Cotizador y Comparativo permanecen deshabilitados."
  Add-Report ""
  Add-Report "RESULTADO: P09M_PRECHECK_COMPLETADO"

  try {
    Get-Content $After.FullName -Raw -Encoding UTF8 | Set-Clipboard
    notepad $After.FullName
  } catch {}
} catch {
  Add-Report "ERROR: $($_.Exception.Message)"
  Add-Report "RESULTADO: P09M_BLOQUEADO"
} finally {
  Add-Report ""
  Add-Report "Reporte maestro privado: $MasterReport"
  Add-Report "No se hizo deploy, commit, push, producción ni escritura operativa."
  try { Get-Content $MasterReport -Raw -Encoding UTF8 | Set-Clipboard } catch {}
}
