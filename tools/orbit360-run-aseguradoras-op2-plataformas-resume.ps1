param([string]$Repo="C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core")

$ErrorActionPreference = 'Stop'
$Branch = 'ays/backend-tenant-lab-v99-20260703'
$Reports = Join-Path $Repo '_orbit360_reports'
$App = Join-Path $Repo 'orbit360-platform'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$Master = Join-Path $Reports "CLOSURE-CRM-OP1-ASEGURADORAS-OP2-V1220-$Stamp.txt"
$script:Port = 0
$script:CrmEvidence = $null
$script:Op2Evidence = $null

try {
  [Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
  $OutputEncoding = [Console]::OutputEncoding
  chcp 65001 | Out-Null
} catch {}

function Add([string]$Text = '') { Add-Content -Path $Master -Value $Text -Encoding UTF8 }
function Step([string]$Name, [scriptblock]$Block) {
  Add ''
  Add "== $Name =="
  try { & $Block; Add "OK: $Name"; return $true }
  catch { Add ("ERROR: {0}" -f $_.Exception.Message); return $false }
}
function Test-FreePort([int]$Port) {
  $Listener = $null
  try {
    $Listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
    $Listener.Start(); return $true
  }
  catch { return $false }
  finally { if ($Listener) { try { $Listener.Stop() } catch {} } }
}
function Resolve-Port {
  for ($Port = 5000; $Port -le 5040; $Port++) { if (Test-FreePort $Port) { return $Port } }
  throw 'No se encontró un puerto local libre entre 5000 y 5040.'
}
function Read-JsonLines([string]$Path) {
  if (-not (Test-Path $Path)) { return @() }
  $Rows = @()
  foreach ($Line in Get-Content -Path $Path -Encoding UTF8) {
    if ([string]::IsNullOrWhiteSpace($Line)) { continue }
    try { $Rows += ($Line | ConvertFrom-Json) }
    catch { throw "Línea JSONL inválida en $Path" }
  }
  return @($Rows)
}
function Test-ScreenshotSet([string]$Directory, [string[]]$ScenarioIds) {
  $Missing = @()
  foreach ($Id in $ScenarioIds) {
    if (-not (Test-Path (Join-Path $Directory ($Id + '.png')))) { $Missing += $Id }
  }
  return @($Missing)
}
function Invoke-Native([string]$Exe, [string[]]$Arguments, [string]$FailureMessage) {
  & $Exe @Arguments 2>&1 | ForEach-Object { Add $_ }
  if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
}
function Sync-BranchSafe {
  $CurrentBranch = (& git -C $Repo branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or $CurrentBranch -ne $Branch) { throw "Rama incorrecta: $CurrentBranch" }
  Invoke-Native 'git' @('-C',$Repo,'fetch','origin',$Branch) 'No fue posible actualizar la referencia remota.'
  $Local = (& git -C $Repo rev-parse HEAD).Trim()
  $Remote = (& git -C $Repo rev-parse "origin/$Branch").Trim()
  if ($Local -ne $Remote) {
    Invoke-Native 'git' @('-C',$Repo,'merge','--ff-only',"origin/$Branch") 'La rama local no pudo actualizarse por avance rápido.'
  }
  Add ("HEAD sincronizado: {0}" -f ((& git -C $Repo rev-parse HEAD).Trim()))
}
function Find-CrmEvidence {
  $Expected = @(
    'dir-clientes-desktop','dir-cliente-desktop','dir-calidad-desktop','dir-poliza-desktop',
    'op-cliente-tablet','op-calidad-tablet','ase-cliente-mobile','ase-calidad-mobile',
    'ase-poliza-mobile','dir-portal-mobile'
  )
  $Candidates = @(Get-ChildItem $Reports -Directory -Filter 'VISUAL-CRM-OP1-*' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
  foreach ($Directory in $Candidates) {
    $Rows = Read-JsonLines (Join-Path $Directory.FullName 'results.jsonl')
    if ($Rows.Count -lt $Expected.Count) { continue }
    $ByScenario = @{}; foreach ($Row in $Rows) { if ($Row.scenario) { $ByScenario[[string]$Row.scenario] = $Row } }
    $AllApproved = $true
    foreach ($Id in $Expected) { if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -ne $true) { $AllApproved = $false; break } }
    $MissingShots = Test-ScreenshotSet $Directory.FullName $Expected
    if ($AllApproved -and $MissingShots.Count -eq 0) {
      return [pscustomobject]@{ Directory=$Directory.FullName; Results=(Join-Path $Directory.FullName 'results.jsonl'); Scenarios=$Expected }
    }
  }
  throw 'No se encontró evidencia completa CRM 10/10. CRM no se repitió.'
}
function Find-Op2PartialEvidence {
  $Approved = @(
    'dir-directorio-desktop','dir-resumen-desktop','dir-contactos-desktop','dir-bancos-desktop',
    'dir-documentos-desktop','dir-tarifas-desktop','op-directorio-tablet','op-resumen-tablet',
    'op-bancos-tablet','ase-directorio-mobile','ase-resumen-mobile','ase-bancos-mobile'
  )
  $Pending = @('dir-plataformas-desktop','op-plataformas-tablet','ase-plataformas-mobile')
  $All = @($Approved + $Pending)
  $Candidates = @(Get-ChildItem $Reports -Directory -Filter 'VISUAL-ASEGURADORAS-OP2-*' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
  foreach ($Directory in $Candidates) {
    $Rows = Read-JsonLines (Join-Path $Directory.FullName 'results.jsonl')
    if ($Rows.Count -lt $All.Count) { continue }
    $ByScenario = @{}; foreach ($Row in $Rows) { if ($Row.scenario) { $ByScenario[[string]$Row.scenario] = $Row } }
    $ApprovedOk = $true
    foreach ($Id in $Approved) { if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -ne $true) { $ApprovedOk = $false; break } }
    if (-not $ApprovedOk) { continue }
    $PendingPresent = $true
    foreach ($Id in $Pending) { if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -eq $true) { $PendingPresent = $false; break } }
    if (-not $PendingPresent) { continue }
    $MissingApprovedShots = Test-ScreenshotSet $Directory.FullName $Approved
    if ($MissingApprovedShots.Count -eq 0) {
      return [pscustomobject]@{ Directory=$Directory.FullName; Results=(Join-Path $Directory.FullName 'results.jsonl'); Approved=$Approved; Pending=$Pending }
    }
  }
  throw 'No se encontró evidencia OP-2 válida con 12 aprobados y 3 pendientes.'
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Master -Value '============================================================' -Encoding UTF8
Add 'ORBIT 360 - CIERRE FOCALIZADO CRM OP1 + ASEGURADORAS OP2 V1.220'
Add ("Fecha local: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add 'Reutiliza CRM 10/10 y OP2 12/15. Ejecuta solo 3 vistas de Plataformas.'
Add 'Sin deploy, producción, merge, main, datos reales, commit ni push.'
Add '============================================================'

$Ok = Step '1. Sincronizar rama obligatoria sin merge no lineal' { Sync-BranchSafe }

if ($Ok) {
  $Ok = Step '2. Aplicar integración local idempotente con backup' {
    $Integration = Join-Path $Repo 'tools\orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1'
    if (-not (Test-Path $Integration)) { throw 'No se encontró el pipeline de integración local.' }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $Integration -Repo $Repo 2>&1 | ForEach-Object { Add $_ }
    if ($LASTEXITCODE -ne 0) { throw 'Falló la integración local segura.' }
  }
}

if ($Ok) {
  $Ok = Step '3. Validar contratos OP-2 v1.220 y backend protegido' {
    Invoke-Native 'node' @((Join-Path $Repo 'tools\orbit360-validar-aseguradoras-op2-v1220.mjs'),$App) 'Falló el contrato canónico Aseguradoras v1.220.'
    Invoke-Native 'node' @((Join-Path $Repo 'tools\orbit360-validar-politica-recursos-aseguradoras-v1218.mjs'),$App) 'Falló la política de recursos Aseguradoras.'
    Invoke-Native 'node' @((Join-Path $Repo 'tools\orbit360-validar-cuarentena-hojas-aseguradoras-v1219.mjs'),$Repo) 'Falló la cuarentena de hojas.'
    Invoke-Native 'node' @((Join-Path $Repo 'tools\orbit360-validar-alias-directorios-aseguradoras-v1219.mjs'),$Repo) 'Falló el control de identidad y duplicados.'
    Invoke-Native 'node' @((Join-Path $Repo 'tools\orbit360-validar-copy-importador-aseguradoras-v1220.mjs'),$Repo) 'Falló el control de mensajes operativos.'
    Invoke-Native 'node' @((Join-Path $Repo 'tools\orbit360-validar-backend-lab-contrato.mjs')) 'Falló el contrato de backend protegido.'
    Invoke-Native 'node' @((Join-Path $Repo 'tools\orbit360-validar-smoke-op2-plataformas-focused-v1218.mjs'),$Repo) 'Falló el harness focalizado.'
    Invoke-Native 'node' @((Join-Path $Repo 'tools\orbit360-validar-resume-evidence-op1-op2-v1218.mjs'),$Repo) 'Falló el lector de evidencia estructurada.'
  }
}

if ($Ok) {
  $Ok = Step '4. Verificar evidencia reutilizable sin repetir escenarios' {
    $script:CrmEvidence = Find-CrmEvidence
    $script:Op2Evidence = Find-Op2PartialEvidence
    Add ("CRM reutilizado: {0}" -f $script:CrmEvidence.Directory)
    Add ("OP2 12/15 reutilizado: {0}" -f $script:Op2Evidence.Directory)
    Add 'CRM: 10 filas JSONL aprobadas + 10 capturas.'
    Add 'OP2: 12 filas JSONL aprobadas + capturas; 3 Plataformas pendientes.'
  }
}

if ($Ok) {
  $Ok = Step '5. Seleccionar puerto local libre automáticamente' {
    $script:Port = Resolve-Port
    Add ("URL seleccionada: http://127.0.0.1:{0}" -f $script:Port)
  }
}

if ($Ok) {
  $Ok = Step '6. Ejecutar solo las 3 vistas pendientes de Plataformas' {
    Invoke-Native 'node' @(
      (Join-Path $Repo 'tools\orbit360-smoke-op2-plataformas-focused-v1218.mjs'),
      '--repo',$Repo,'--app',$App,'--port',[string]$script:Port
    ) 'Falló el smoke focalizado de Plataformas.'
  }
}

if ($Ok) {
  $Ok = Step '7. Verificar JSONL y combinar cierre 15/15' {
    $Expected = @('dir-plataformas-desktop','op-plataformas-tablet','ase-plataformas-mobile')
    $Candidate = Get-ChildItem $Reports -Directory -Filter 'VISUAL-OP2-PLATAFORMAS-*' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $Candidate) { throw 'No se creó la carpeta de evidencia focalizada.' }
    $Rows = Read-JsonLines (Join-Path $Candidate.FullName 'results.jsonl')
    $ByScenario = @{}; foreach ($Row in $Rows) { if ($Row.scenario) { $ByScenario[[string]$Row.scenario] = $Row } }
    foreach ($Id in $Expected) {
      if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -ne $true) { throw "Escenario no aprobado: $Id" }
    }
    $MissingShots = Test-ScreenshotSet $Candidate.FullName $Expected
    if ($MissingShots.Count -gt 0) { throw ('Faltan capturas: ' + ($MissingShots -join ', ')) }
    Add ("Evidencia focalizada: {0}" -f $Candidate.FullName)
    Add 'COMBINADO CRM OP1: 10/10'
    Add 'COMBINADO ASEGURADORAS OP2: 12 reutilizados + 3 focalizados = 15/15'
    Add 'ESTADO VISUAL: CRM OP1 CERRADO'
    Add 'ESTADO VISUAL: ASEGURADORAS OP2 CERRADO'
  }
}

Add ''
if ($Ok) {
  Add 'RESULTADO: GATES VISUALES CRM OP1 Y ASEGURADORAS OP2 CERRADOS'
  Add 'Siguiente acción: dry-run Guatemala y luego Colombia, separados y sin escritura.'
} else {
  Add 'RESULTADO: BLOQUEADO EN EL PRIMER FALLO REAL'
  Add 'La evidencia previamente aprobada permanece válida y no fue repetida.'
}
Add ("HEAD final: {0}" -f ((& git -C $Repo rev-parse HEAD).Trim()))
Add 'Sin deploy, producción, merge, main, secretos, datos reales, commit ni push.'
Add ("Reporte maestro: {0}" -f $Master)
try { Get-Content $Master -Raw -Encoding UTF8 | Set-Clipboard; notepad $Master } catch {}
if (-not $Ok) { exit 1 }
