param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = "Stop"

$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Reports = Join-Path $Repo "_orbit360_reports"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "STABILITY-GATE-AYS-V99-$Stamp.txt"

$Blockers = New-Object System.Collections.Generic.List[string]
$Warnings = New-Object System.Collections.Generic.List[string]

function Add-Report([string]$Text) {
  Add-Content -Path $Report -Value $Text -Encoding UTF8
}

function Add-Blocker([string]$Text) {
  $Blockers.Add($Text) | Out-Null
  Add-Report "BLOQUEO: $Text"
}

function Add-Warning([string]$Text) {
  $Warnings.Add($Text) | Out-Null
  Add-Report "ADVERTENCIA: $Text"
}

function ReadText([string]$Path) {
  if (-not (Test-Path $Path)) { return $null }
  return Get-Content $Path -Raw -Encoding UTF8
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - STABILITY GATE A&S V99"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Rama esperada: $ExpectedBranch"
Add-Report "Restricciones: NO deploy, NO Hosting, NO produccion, NO secretos, NO datos reales, NO commit, NO push"
Add-Report "============================================================"
Add-Report ""

try {
  if (-not (Test-Path $Repo)) { throw "No existe repo: $Repo" }
  Set-Location $Repo

  Add-Report "== 1. Rama obligatoria =="
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  $Head = (git rev-parse HEAD).Trim()
  Add-Report "Rama actual: $Branch"
  Add-Report "HEAD: $Head"
  if ($Branch -ne $ExpectedBranch) { Add-Blocker "Rama incorrecta. Debe ser $ExpectedBranch" }
  Add-Report ""

  Add-Report "== 2. Estado Git local =="
  $Status = git status --short
  if ($Status) {
    Add-Warning "Hay cambios locales sin commit. Revisar antes de cerrar entrega."
    $Status | ForEach-Object { Add-Report $_ }
  } else {
    Add-Report "OK: sin cambios locales."
  }
  Add-Report ""

  Add-Report "== 3. Archivos críticos =="
  $Critical = @(
    "firestore.rules",
    "orbit360-platform\index.html",
    "orbit360-platform\data\store.js",
    "orbit360-platform\data\store-firestore-lab.local.js",
    "orbit360-platform\core\backend-lab-loader.js",
    "orbit360-platform\core\backend-lab-init.js",
    "orbit360-platform\data\seed.js"
  )
  foreach ($Rel in $Critical) {
    $Path = Join-Path $Repo $Rel
    if (Test-Path $Path) { Add-Report "OK: existe $Rel" }
    else { Add-Blocker "Falta archivo critico: $Rel" }
  }
  Add-Report ""

  Add-Report "== 4. Reglas Firestore =="
  $Rules = ReadText (Join-Path $Repo "firestore.rules")
  if ($Rules) {
    if ($Rules.Contains("match /tenantId/{tenantId}/{document=**}")) { Add-Report "OK: ruta adapter LAB permitida." } else { Add-Blocker "firestore.rules no contiene ruta adapter LAB tenantId/{tenantId}/{document=**}" }
    if ($Rules.Contains("match /tenants/{tenantId}/data/{document=**}")) { Add-Report "OK: ruta documental futura conservada." } else { Add-Warning "No se encontro ruta documental futura tenants/{tenantId}/data/{document=**}" }
    if ($Rules -match "allow read, write: if true") { Add-Blocker "Regla abierta detectada: allow read, write: if true" }
  }
  Add-Report ""

  Add-Report "== 5. Index / backend LAB =="
  $Index = ReadText (Join-Path $Repo "orbit360-platform\index.html")
  if ($Index) {
    $HasLoader = $Index.Contains("core/backend-lab-loader.js")
    $HasInit = $Index.Contains("core/backend-lab-init.js")
    $HasStore = $Index.Contains("data/store.js")
    $HasLab = $Index.Contains("data/store-firestore-lab.local.js")
    $HasSeed = $Index.Contains("data/seed.js")
    Add-Report "loader=$HasLoader init=$HasInit store=$HasStore lab=$HasLab seed=$HasSeed"
    if (-not $HasStore) { Add-Blocker "index.html no carga data/store.js" }
    if (-not $HasLab) { Add-Blocker "index.html no carga store-firestore-lab.local.js" }
    if (-not $HasSeed) { Add-Blocker "index.html no carga data/seed.js" }
    if (-not ($HasLoader -and $HasInit)) { Add-Warning "index.html aun no integra loader/init LAB permanente. Ejecutar integrador local antes del smoke." }
    if ($HasLoader -and $HasInit) {
      $LoaderPos = $Index.IndexOf("core/backend-lab-loader.js")
      $InitPos = $Index.IndexOf("core/backend-lab-init.js")
      $StorePos = $Index.IndexOf("data/store.js")
      $LabPos = $Index.IndexOf("data/store-firestore-lab.local.js")
      $SeedPos = $Index.IndexOf("data/seed.js")
      Add-Report "Orden: loader=$LoaderPos init=$InitPos store=$StorePos lab=$LabPos seed=$SeedPos"
      if (-not ($LoaderPos -lt $InitPos -and $InitPos -lt $StorePos -and $StorePos -lt $LabPos -and $LabPos -lt $SeedPos)) {
        Add-Blocker "Orden incorrecto en index. Esperado loader -> init -> store -> lab -> seed."
      }
    }
  }
  Add-Report ""

  Add-Report "== 6. Store API contract =="
  $StoreLab = ReadText (Join-Path $Repo "orbit360-platform\data\store-firestore-lab.local.js")
  if ($StoreLab) {
    foreach ($Fn in @("all","get","where","find","insert","update","remove","on","_emit","pref","setPref","init","reseed","raw")) {
      if ($StoreLab -match "\b$Fn\s*[:=]\s*function|\bfunction\s+$Fn\b|\b$Fn\s*\(") { Add-Report "OK: API detectada $Fn" }
      else { Add-Warning "No se detecto claramente API $Fn en store-firestore-lab.local.js" }
    }
    if ($StoreLab.Contains("localStorage")) { Add-Blocker "store-firestore-lab.local.js no debe usar localStorage como fuente LAB." }
    if ($StoreLab.Contains("tenantId/{tenantId}")) { Add-Report "OK: comentario/ruta tenantId detectada." }
  }
  Add-Report ""

  Add-Report "== 7. Modulos no deben tocar localStorage =="
  $ModulesDir = Join-Path $Repo "orbit360-platform\modules"
  if (Test-Path $ModulesDir) {
    $ModuleHits = Select-String -Path (Join-Path $ModulesDir "*.js") -Pattern "localStorage" -SimpleMatch -ErrorAction SilentlyContinue
    if ($ModuleHits) {
      foreach ($Hit in $ModuleHits) { Add-Report ("{0}:{1}: {2}" -f $Hit.Path.Replace($Repo + "\", ""), $Hit.LineNumber, $Hit.Line.Trim()) }
      Add-Blocker "Hay modulos usando localStorage. Deben pasar por Orbit.store/Orbit.store.pref/core helper."
    } else {
      Add-Report "OK: modulos sin localStorage directo."
    }
  }
  Add-Report ""

  Add-Report "== 8. Recaudo no debe crear finmov automatico =="
  $Queries = ReadText (Join-Path $Repo "orbit360-platform\core\queries.js")
  if ($Queries) {
    if ($Queries -match "function\s+postRecaudo[\s\S]{0,260}return\s*;") {
      Add-Report "OK: postRecaudo parece no-op/return."
    } else {
      Add-Warning "No se confirmo postRecaudo como no-op. Revisar que recaudo no cree finmov automatico."
    }
    if ($Queries -match "postRecaudo[\s\S]{0,900}finmov") {
      Add-Blocker "Riesgo: postRecaudo menciona finmov cerca. Revisar separacion cartera/caja."
    }
  } else {
    Add-Warning "No se encontro core/queries.js para validar postRecaudo."
  }
  Add-Report ""

  Add-Report "== 9. Seed demo sin marcadores obvios de datos reales =="
  $Seed = ReadText (Join-Path $Repo "orbit360-platform\data\seed.js")
  if ($Seed) {
    $RiskTerms = @("NIT","DPI","cedula","cédula","pasaporte","iban","cuenta bancaria","Alianzas y Soluciones Corredores")
    foreach ($Term in $RiskTerms) {
      if ($Seed -match [regex]::Escape($Term)) { Add-Warning "Seed contiene termino sensible o real-like: $Term. Revisar que sea ficticio." }
    }
    Add-Report "OK: revision seed completada."
  }
  Add-Report ""

  Add-Report "== 10. Sintaxis JS crítica con node --check =="
  $Node = Get-Command node -ErrorAction SilentlyContinue
  if ($Node) {
    $JsFiles = @(
      "orbit360-platform\core\backend-lab-loader.js",
      "orbit360-platform\core\backend-lab-init.js",
      "orbit360-platform\data\store-firestore-lab.local.js"
    )
    foreach ($Rel in $JsFiles) {
      $Path = Join-Path $Repo $Rel
      if (Test-Path $Path) {
        $Out = & node --check $Path 2>&1
        if ($LASTEXITCODE -eq 0) { Add-Report "OK: node --check $Rel" }
        else { Add-Blocker "node --check fallo en $Rel :: $Out" }
      }
    }
  } else {
    Add-Warning "Node no disponible; no se pudo hacer node --check."
  }
  Add-Report ""

} catch {
  Add-Blocker "Error general del gate: $($_.Exception.Message)"
}

Add-Report "============================================================"
Add-Report "RESUMEN STABILITY GATE"
Add-Report "Bloqueos: $($Blockers.Count)"
Add-Report "Advertencias: $($Warnings.Count)"
if ($Blockers.Count -gt 0) {
  Add-Report "RESULTADO: BLOQUEADO"
  $Blockers | ForEach-Object { Add-Report "- $_" }
} elseif ($Warnings.Count -gt 0) {
  Add-Report "RESULTADO: APROBADO_CON_ADVERTENCIAS"
  $Warnings | ForEach-Object { Add-Report "- $_" }
} else {
  Add-Report "RESULTADO: APROBADO"
}
Add-Report ""
Add-Report "Reporte: $Report"
Add-Report "Restricciones respetadas: NO deploy, NO Hosting, NO produccion, NO secretos, NO datos reales, NO commit, NO push."

try {
  Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard
  notepad $Report
} catch {}

if ($Blockers.Count -gt 0) { exit 2 }
if ($Warnings.Count -gt 0) { exit 1 }
exit 0
