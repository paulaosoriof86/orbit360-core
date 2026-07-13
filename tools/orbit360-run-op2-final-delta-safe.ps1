param(
  [string]$RepoPath = ''
)

$ErrorActionPreference = 'Stop'
$Branch = 'ays/backend-tenant-lab-v99-20260703'
$ValidatedHead = '3f1bbcc675a20af059204741b0f273a57b390078'

try {
  [Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
  $OutputEncoding = [Console]::OutputEncoding
  chcp 65001 | Out-Null
} catch {}

function Find-OrbitRepo([string]$Requested) {
  $Candidates = New-Object System.Collections.Generic.List[string]
  if ($Requested) { $Candidates.Add($Requested) }
  $Candidates.Add((Get-Location).Path)
  $Candidates.Add((Join-Path $env:USERPROFILE 'OneDrive\Documentos\GitHub\orbit360-core'))
  $Candidates.Add((Join-Path $env:USERPROFILE 'Documents\GitHub\orbit360-core'))
  $Candidates.Add((Join-Path $env:USERPROFILE 'OneDrive\Documents\GitHub\orbit360-core'))
  $Candidates.Add('C:\orbit360-core')

  $Seen = @{}
  foreach ($Candidate in $Candidates) {
    if (-not $Candidate) { continue }
    try { $Full = [System.IO.Path]::GetFullPath($Candidate) } catch { continue }
    if ($Seen.ContainsKey($Full)) { continue }
    $Seen[$Full] = $true
    if (-not (Test-Path (Join-Path $Full '.git'))) { continue }
    $Origin = (& git -C $Full remote get-url origin 2>$null | Out-String).Trim()
    if ($Origin -match 'paulaosoriof86[/\\:]orbit360-core') { return $Full }
  }
  return $null
}

function Quote-NativeArg([string]$Value) {
  if ($null -eq $Value) { return '""' }
  if ($Value -notmatch '[\s"]') { return $Value }
  return '"' + $Value.Replace('"','\"') + '"'
}

$Repo = Find-OrbitRepo $RepoPath
if (-not $Repo) {
  Write-Host 'BLOQUEADO: no se encontro orbit360-core. No se modifico nada.'
  exit 0
}

$SourceReports = Join-Path $Repo '_orbit360_reports'
New-Item -ItemType Directory -Force -Path $SourceReports | Out-Null
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$Report = Join-Path $SourceReports "RUN-OP2-FINAL-DELTA-$Stamp.txt"
$TempRoot = Join-Path $env:TEMP "orbit360-op2-final-$Stamp"
$TempRepo = Join-Path $TempRoot 'orbit360-core'
$TempReports = Join-Path $TempRepo '_orbit360_reports'
$script:FinalResult = 'BLOCKED'
$script:Port = 0

function Add([string]$Text = '') {
  Add-Content -Path $Report -Value $Text -Encoding UTF8
}

function Invoke-CapturedNative(
  [string]$FilePath,
  [string[]]$Arguments,
  [string]$WorkingDirectory,
  [string]$FailureMessage
) {
  $Token = [guid]::NewGuid().ToString('N')
  $Stdout = Join-Path $env:TEMP "orbit360-$Token.out.txt"
  $Stderr = Join-Path $env:TEMP "orbit360-$Token.err.txt"
  $ArgumentText = (($Arguments | ForEach-Object { Quote-NativeArg ([string]$_) }) -join ' ')
  try {
    $Process = Start-Process -FilePath $FilePath `
      -ArgumentList $ArgumentText `
      -WorkingDirectory $WorkingDirectory `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $Stdout `
      -RedirectStandardError $Stderr

    if (Test-Path $Stdout) {
      $Text = Get-Content $Stdout -Raw -Encoding UTF8
      if ($Text) { Add $Text.TrimEnd() }
    }
    if (Test-Path $Stderr) {
      $Text = Get-Content $Stderr -Raw -Encoding UTF8
      if ($Text) { Add $Text.TrimEnd() }
    }
    if ($Process.ExitCode -ne 0) {
      throw "$FailureMessage Exit code: $($Process.ExitCode)."
    }
    return $Process.ExitCode
  }
  finally {
    Remove-Item $Stdout,$Stderr -Force -ErrorAction SilentlyContinue
  }
}

function Copy-EvidenceDirectorySafe([string]$SourceDirectory, [string]$DestinationRoot) {
  if (-not (Test-Path $SourceDirectory)) { return }
  $Target = Join-Path $DestinationRoot (Split-Path $SourceDirectory -Leaf)
  New-Item -ItemType Directory -Force -Path $Target | Out-Null
  $ResultFile = Join-Path $SourceDirectory 'results.jsonl'
  if (Test-Path $ResultFile) { Copy-Item $ResultFile (Join-Path $Target 'results.jsonl') -Force }
  Get-ChildItem $SourceDirectory -File -Filter '*.png' -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-Item $_.FullName (Join-Path $Target $_.Name) -Force }
  Get-ChildItem $SourceDirectory -File -Filter '*.txt' -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-Item $_.FullName (Join-Path $Target $_.Name) -Force }
}

function Copy-ReusableEvidence([string]$Source, [string]$Destination) {
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  foreach ($Pattern in @('VISUAL-CRM-OP1-*','VISUAL-ASEGURADORAS-OP2-*')) {
    Get-ChildItem $Source -Directory -Filter $Pattern -ErrorAction SilentlyContinue |
      ForEach-Object { Copy-EvidenceDirectorySafe $_.FullName $Destination }
  }
}

function Copy-NewEvidenceBack([string]$Source, [string]$Destination) {
  if (-not (Test-Path $Source)) { return }
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Get-ChildItem $Source -File -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-Item $_.FullName (Join-Path $Destination $_.Name) -Force }
  Get-ChildItem $Source -Directory -Filter 'VISUAL-OP2-PLATAFORMAS-*' -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-EvidenceDirectorySafe $_.FullName $Destination }
}

function Read-JsonLines([string]$Path) {
  if (-not (Test-Path $Path)) { return @() }
  $Rows = @()
  foreach ($Line in Get-Content -Path $Path -Encoding UTF8) {
    if ([string]::IsNullOrWhiteSpace($Line)) { continue }
    try { $Rows += ($Line | ConvertFrom-Json) }
    catch { throw "JSONL invalido en $Path" }
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

function Find-CrmEvidence([string]$ReportsRoot) {
  $Expected = @(
    'dir-clientes-desktop','dir-cliente-desktop','dir-calidad-desktop','dir-poliza-desktop',
    'op-cliente-tablet','op-calidad-tablet','ase-cliente-mobile','ase-calidad-mobile',
    'ase-poliza-mobile','dir-portal-mobile'
  )
  $Candidates = @(Get-ChildItem $ReportsRoot -Directory -Filter 'VISUAL-CRM-OP1-*' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
  foreach ($Directory in $Candidates) {
    $Rows = Read-JsonLines (Join-Path $Directory.FullName 'results.jsonl')
    $ByScenario = @{}
    foreach ($Row in $Rows) { if ($Row.scenario) { $ByScenario[[string]$Row.scenario] = $Row } }
    $Approved = $true
    foreach ($Id in $Expected) {
      if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -ne $true) { $Approved = $false; break }
    }
    if ($Approved -and (Test-ScreenshotSet $Directory.FullName $Expected).Count -eq 0) { return $Directory.FullName }
  }
  throw 'No se encontro evidencia CRM 10/10 reutilizable.'
}

function Find-Op2PartialEvidence([string]$ReportsRoot) {
  $ApprovedIds = @(
    'dir-directorio-desktop','dir-resumen-desktop','dir-contactos-desktop','dir-bancos-desktop',
    'dir-documentos-desktop','dir-tarifas-desktop','op-directorio-tablet','op-resumen-tablet',
    'op-bancos-tablet','ase-directorio-mobile','ase-resumen-mobile','ase-bancos-mobile'
  )
  $PendingIds = @('dir-plataformas-desktop','op-plataformas-tablet','ase-plataformas-mobile')
  $Candidates = @(Get-ChildItem $ReportsRoot -Directory -Filter 'VISUAL-ASEGURADORAS-OP2-*' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
  foreach ($Directory in $Candidates) {
    $Rows = Read-JsonLines (Join-Path $Directory.FullName 'results.jsonl')
    $ByScenario = @{}
    foreach ($Row in $Rows) { if ($Row.scenario) { $ByScenario[[string]$Row.scenario] = $Row } }
    $Approved = $true
    foreach ($Id in $ApprovedIds) {
      if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -ne $true) { $Approved = $false; break }
    }
    if (-not $Approved) { continue }
    $PendingPresent = $true
    foreach ($Id in $PendingIds) {
      if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -eq $true) { $PendingPresent = $false; break }
    }
    if ($PendingPresent -and (Test-ScreenshotSet $Directory.FullName $ApprovedIds).Count -eq 0) { return $Directory.FullName }
  }
  throw 'No se encontro evidencia Aseguradoras 12/15 reutilizable.'
}

function Test-FreePort([int]$Port) {
  $Listener = $null
  try {
    $Listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
    $Listener.Start()
    return $true
  } catch { return $false }
  finally { if ($Listener) { try { $Listener.Stop() } catch {} } }
}

function Resolve-Port {
  for ($Port = 5000; $Port -le 5040; $Port++) {
    if (Test-FreePort $Port) { return $Port }
  }
  throw 'No se encontro un puerto libre entre 5000 y 5040.'
}

Set-Content -Path $Report -Value '============================================================' -Encoding UTF8
Add 'ORBIT 360 - CIERRE FINAL DELTA OP2 SIN REPETIR VALIDADORES APROBADOS'
Add ("Fecha local: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add ("Repo preservado: {0}" -f $Repo)
Add 'Reutiliza validadores aprobados en 3f1bbcc6; ejecuta solo el validador corregido y las 3 vistas pendientes.'
Add 'No pull, switch, reset ni clean en el repo original. No deploy. No datos reales.'
Add '============================================================'

try {
  $CurrentBranch = (& git -C $Repo branch --show-current 2>$null | Out-String).Trim()
  $CurrentHead = (& git -C $Repo rev-parse HEAD 2>$null | Out-String).Trim()
  $LocalChanges = @(& git -C $Repo status --short 2>$null)
  $Origin = (& git -C $Repo remote get-url origin 2>$null | Out-String).Trim()
  Add ''
  Add '== REPO ORIGINAL PRESERVADO =='
  Add "branch=$CurrentBranch"
  Add "head=$CurrentHead"
  Add "local_changes_count=$($LocalChanges.Count)"
  if ($CurrentBranch -ne $Branch) { throw "Rama incorrecta: $CurrentBranch" }

  Add ''
  Add '== REFERENCIA REMOTA =='
  Invoke-CapturedNative 'git.exe' @('-C',$Repo,'fetch','--quiet','origin',$Branch) $Repo 'git fetch fallo.' | Out-Null
  $RemoteHead = (& git -C $Repo rev-parse "origin/$Branch" 2>$null | Out-String).Trim()
  Add "remote_head=$RemoteHead"

  Add ''
  Add '== VERIFICAR QUE NO CAMBIO LA APLICACION DESDE LOS CHECKS APROBADOS =='
  $Changed = @(& git -C $Repo diff --name-only "$ValidatedHead..$RemoteHead" 2>$null)
  $Allowed = @(
    'tools/orbit360-diagnosticar-ultimo-fallo-op2.ps1',
    'tools/orbit360-validar-resume-evidence-op1-op2-v1218.mjs',
    'tools/orbit360-run-op2-final-delta-safe.ps1'
  )
  $Unexpected = @($Changed | Where-Object { $_ -and $_ -notin $Allowed })
  Add ("changed_since_validated_head={0}" -f ($Changed -join ','))
  if ($Unexpected.Count -gt 0) { throw ('Cambios inesperados desde el HEAD validado: ' + ($Unexpected -join ', ')) }
  Add 'previous_static_validators_reused=YES'

  Add ''
  Add '== CLON AISLADO =='
  New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
  Invoke-CapturedNative 'git.exe' @('clone','--shared','--no-checkout',$Repo,$TempRepo) $Repo 'No se pudo crear el clon aislado.' | Out-Null
  Invoke-CapturedNative 'git.exe' @('-C',$TempRepo,'remote','set-url','origin',$Origin) $TempRepo 'No se pudo restaurar origin.' | Out-Null
  Invoke-CapturedNative 'git.exe' @('-C',$TempRepo,'fetch','--quiet','origin',$Branch) $TempRepo 'No se pudo leer la rama remota.' | Out-Null
  Invoke-CapturedNative 'git.exe' @('-C',$TempRepo,'checkout','-B',$Branch,"origin/$Branch") $TempRepo 'No se pudo preparar el clon aislado.' | Out-Null
  $TempHead = (& git -C $TempRepo rev-parse HEAD 2>$null | Out-String).Trim()
  if ($TempHead -ne $RemoteHead) { throw 'El clon aislado no quedo en el HEAD remoto.' }
  Add "isolated_head=$TempHead"

  Add ''
  Add '== EVIDENCIA REUTILIZABLE MINIMA =='
  Copy-ReusableEvidence $SourceReports $TempReports
  $CrmEvidence = Find-CrmEvidence $TempReports
  $Op2Evidence = Find-Op2PartialEvidence $TempReports
  Add "crm_reused=$CrmEvidence"
  Add "op2_12_of_15_reused=$Op2Evidence"

  Add ''
  Add '== INTEGRACION LOCAL IDEMPOTENTE =='
  $Integration = Join-Path $TempRepo 'tools\orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1'
  if (-not (Test-Path $Integration)) { throw 'No se encontro el integrador seguro.' }
  Invoke-CapturedNative 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Integration,'-Repo',$TempRepo) $TempRepo 'La integracion local fallo.' | Out-Null

  Add ''
  Add '== SOLO VALIDADOR CORREGIDO =='
  $Validator = Join-Path $TempRepo 'tools\orbit360-validar-resume-evidence-op1-op2-v1218.mjs'
  Invoke-CapturedNative 'node.exe' @($Validator,$TempRepo) $TempRepo 'El validador corregido fallo.' | Out-Null

  Add ''
  Add '== SOLO TRES VISTAS PENDIENTES =='
  $script:Port = Resolve-Port
  Add "selected_url=http://127.0.0.1:$script:Port"
  $Smoke = Join-Path $TempRepo 'tools\orbit360-smoke-op2-plataformas-focused-v1218.mjs'
  Invoke-CapturedNative 'node.exe' @($Smoke,'--repo',$TempRepo,'--app',(Join-Path $TempRepo 'orbit360-platform'),'--port',[string]$script:Port) $TempRepo 'El smoke focalizado fallo.' | Out-Null

  Add ''
  Add '== VERIFICACION 3/3 =='
  $Expected = @('dir-plataformas-desktop','op-plataformas-tablet','ase-plataformas-mobile')
  $Focused = Get-ChildItem $TempReports -Directory -Filter 'VISUAL-OP2-PLATAFORMAS-*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $Focused) { throw 'No se produjo carpeta de evidencia focalizada.' }
  $Rows = Read-JsonLines (Join-Path $Focused.FullName 'results.jsonl')
  $ByScenario = @{}
  foreach ($Row in $Rows) { if ($Row.scenario) { $ByScenario[[string]$Row.scenario] = $Row } }
  foreach ($Id in $Expected) {
    if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -ne $true) { throw "Escenario no aprobado: $Id" }
  }
  $Missing = Test-ScreenshotSet $Focused.FullName $Expected
  if ($Missing.Count -gt 0) { throw ('Capturas faltantes: ' + ($Missing -join ', ')) }

  Copy-NewEvidenceBack $TempReports $SourceReports
  $CopiedFocused = Get-ChildItem $SourceReports -Directory -Filter 'VISUAL-OP2-PLATAFORMAS-*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  Add "focused_evidence=$($CopiedFocused.FullName)"
  Add 'crm=10/10_reused'
  Add 'aseguradoras=12/15_reused_plus_3/3_focused_equals_15/15'
  Add 'status=ASEGURADORAS_OP2_VISUAL_GATE_CLOSED'
  Add 'next_action=Dry-run Guatemala y Colombia separados; luego backend/Auth/Hosting productivo.'
  $script:FinalResult = 'PASSED'
}
catch {
  Add ''
  Add '== RESULTADO =='
  Add 'status=BLOCKED_AT_FIRST_REAL_FAILURE'
  Add ("error={0}" -f ($_.Exception.Message -replace "`r|`n",' '))
  Add 'previous_approved_evidence_preserved=YES'
  Add 'source_repo_local_changes_preserved=YES'
  try { Copy-NewEvidenceBack $TempReports $SourceReports } catch {}
}
finally {
  Add ''
  Add '== LIMPIEZA =='
  if (Test-Path $TempRoot) {
    try {
      Remove-Item $TempRoot -Recurse -Force -ErrorAction Stop
      Add 'temporary_workspace_removed=YES'
    }
    catch {
      try {
        & cmd.exe /d /c rd /s /q "`"$TempRoot`"" 2>$null
        if (Test-Path $TempRoot) { throw 'La carpeta temporal sigue presente.' }
        Add 'temporary_workspace_removed=YES_FALLBACK'
      }
      catch { Add "temporary_workspace_removed=NO | path=$TempRoot" }
    }
  } else { Add 'temporary_workspace_removed=NOT_REQUIRED' }
  Add 'source_repo_pull=NO'
  Add 'source_repo_switch=NO'
  Add 'source_repo_reset=NO'
  Add 'source_repo_clean=NO'
  Add 'deploy=NO'
  Add 'real_data_writes=NO'
  Add "final_result=$script:FinalResult"
  Add "report=$Report"
  try {
    Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard
    Start-Process notepad.exe -ArgumentList ('"' + $Report + '"')
  } catch {}
}

exit 0
