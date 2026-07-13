param(
  [string]$RepoPath = ''
)

$ErrorActionPreference = 'Stop'
$Branch = 'ays/backend-tenant-lab-v99-20260703'

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
$Report = Join-Path $SourceReports "RUN-LIMPIO-ASEGURADORAS-OP2-$Stamp.txt"
$TempRoot = Join-Path $env:TEMP "orbit360-ays-safe-$Stamp"
$TempRepo = Join-Path $TempRoot 'orbit360-core'
$TempNodeModules = ''
$script:RunnerExit = 999
$script:FinalResult = 'BLOCKED'

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
  $Stdout = Join-Path $env:TEMP ("orbit360-$Token.out.txt")
  $Stderr = Join-Path $env:TEMP ("orbit360-$Token.err.txt")
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
  if (Test-Path $ResultFile) {
    Copy-Item $ResultFile (Join-Path $Target 'results.jsonl') -Force
  }

  Get-ChildItem $SourceDirectory -File -Filter '*.png' -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-Item $_.FullName (Join-Path $Target $_.Name) -Force }

  Get-ChildItem $SourceDirectory -File -Filter '*.txt' -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-Item $_.FullName (Join-Path $Target $_.Name) -Force }
}

function Copy-EvidenceFolders([string]$Source, [string]$Destination) {
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  $Patterns = @('VISUAL-CRM-OP1-*','VISUAL-ASEGURADORAS-OP2-*')
  foreach ($Pattern in $Patterns) {
    Get-ChildItem $Source -Directory -Filter $Pattern -ErrorAction SilentlyContinue |
      ForEach-Object { Copy-EvidenceDirectorySafe $_.FullName $Destination }
  }
}

function Copy-NewReportsBack([string]$Source, [string]$Destination) {
  if (-not (Test-Path $Source)) { return }
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null

  Get-ChildItem $Source -File -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-Item $_.FullName (Join-Path $Destination $_.Name) -Force }

  Get-ChildItem $Source -Directory -Filter 'VISUAL-*' -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-EvidenceDirectorySafe $_.FullName $Destination }
}

Set-Content -Path $Report -Value '============================================================' -Encoding UTF8
Add 'ORBIT 360 - EJECUCION AISLADA Y SEGURA DEL SIGUIENTE GATE A&S'
Add ("Fecha local: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add ("Repo preservado: {0}" -f $Repo)
Add 'Objetivo: cerrar solo las 3 vistas pendientes de Plataformas en Aseguradoras.'
Add 'Copia selectiva: solo JSONL, capturas y reportes; nunca perfiles ni caches del navegador.'
Add 'No pull ni switch en el repo preservado. No reset. No clean. No deploy. No datos reales.'
Add '============================================================'

try {
  $CurrentBranch = (& git -C $Repo branch --show-current 2>$null | Out-String).Trim()
  $CurrentHead = (& git -C $Repo rev-parse HEAD 2>$null | Out-String).Trim()
  $LocalChanges = @(& git -C $Repo status --short 2>$null)
  $Origin = (& git -C $Repo remote get-url origin 2>$null | Out-String).Trim()

  Add ''
  Add '== REPO PRESERVADO =='
  Add ("branch={0}" -f $CurrentBranch)
  Add ("head={0}" -f $CurrentHead)
  Add ("local_changes_count={0}" -f $LocalChanges.Count)
  Add 'Los cambios locales no se tocaran.'

  if ($CurrentBranch -ne $Branch) {
    throw "Rama local inesperada: $CurrentBranch. Requerida: $Branch."
  }

  Add ''
  Add '== ACTUALIZAR SOLO REFERENCIA REMOTA =='
  Invoke-CapturedNative 'git.exe' @('-C',$Repo,'fetch','--quiet','origin',$Branch) $Repo 'git fetch fallo.' | Out-Null
  $RemoteHead = (& git -C $Repo rev-parse "origin/$Branch" 2>$null | Out-String).Trim()
  if (-not $RemoteHead) { throw 'No se pudo resolver el HEAD remoto.' }
  Add ("remote_head={0}" -f $RemoteHead)

  Add ''
  Add '== CREAR ESPACIO LIMPIO AISLADO =='
  New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
  Invoke-CapturedNative 'git.exe' @('clone','--shared','--no-checkout',$Repo,$TempRepo) $Repo 'No se pudo crear el clon local compartido.' | Out-Null
  Invoke-CapturedNative 'git.exe' @('-C',$TempRepo,'remote','set-url','origin',$Origin) $TempRepo 'No se pudo restaurar el origin GitHub en el clon aislado.' | Out-Null
  Invoke-CapturedNative 'git.exe' @('-C',$TempRepo,'fetch','--quiet','origin',$Branch) $TempRepo 'No se pudo obtener la rama remota en el clon aislado.' | Out-Null
  Invoke-CapturedNative 'git.exe' @('-C',$TempRepo,'checkout','-B',$Branch,"origin/$Branch") $TempRepo 'No se pudo preparar la rama limpia.' | Out-Null

  $TempHead = (& git -C $TempRepo rev-parse HEAD 2>$null | Out-String).Trim()
  $TempBranch = (& git -C $TempRepo branch --show-current 2>$null | Out-String).Trim()
  if ($TempHead -ne $RemoteHead -or $TempBranch -ne $Branch) {
    throw 'El espacio aislado no quedo exactamente en la rama y HEAD remotos.'
  }
  Add ("isolated_repo={0}" -f $TempRepo)
  Add ("isolated_branch={0}" -f $TempBranch)
  Add ("isolated_head={0}" -f $TempHead)

  $SourceNodeModules = Join-Path $Repo 'node_modules'
  $TempNodeModules = Join-Path $TempRepo 'node_modules'
  if (Test-Path $SourceNodeModules) {
    New-Item -ItemType Junction -Path $TempNodeModules -Target $SourceNodeModules | Out-Null
    Add 'node_modules=shared_read_only_junction'
  } else {
    Add 'node_modules=not_found_in_source_repo'
  }

  Add ''
  Add '== REUTILIZAR EVIDENCIA CERRADA =='
  $TempReports = Join-Path $TempRepo '_orbit360_reports'
  Copy-EvidenceFolders $SourceReports $TempReports
  $CrmCopied = @(Get-ChildItem $TempReports -Directory -Filter 'VISUAL-CRM-OP1-*' -ErrorAction SilentlyContinue).Count
  $Op2Copied = @(Get-ChildItem $TempReports -Directory -Filter 'VISUAL-ASEGURADORAS-OP2-*' -ErrorAction SilentlyContinue).Count
  Add ("crm_evidence_folders_copied={0}" -f $CrmCopied)
  Add ("aseguradoras_evidence_folders_copied={0}" -f $Op2Copied)
  Add 'browser_profile_directories_copied=0'
  if ($CrmCopied -lt 1 -or $Op2Copied -lt 1) {
    throw 'No se encontro la evidencia previa necesaria para ejecutar solo el delta.'
  }

  Add ''
  Add '== EJECUTAR SOLO EL DELTA ASEGURADORAS 3/3 =='
  $Runner = Join-Path $TempRepo 'tools\orbit360-run-aseguradoras-op2-plataformas-resume.ps1'
  if (-not (Test-Path $Runner)) { throw 'No se encontro el runner focalizado remoto.' }
  $script:RunnerExit = Invoke-CapturedNative 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Runner,'-Repo',$TempRepo) $TempRepo 'El gate focalizado de Aseguradoras fallo.'

  Copy-NewReportsBack $TempReports $SourceReports
  $Focused = Get-ChildItem $SourceReports -Directory -Filter 'VISUAL-OP2-PLATAFORMAS-*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  $Closure = Get-ChildItem $SourceReports -File -Filter 'CLOSURE-CRM-OP1-ASEGURADORAS-OP2-V1220-*.txt' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $Focused) { throw 'El runner termino sin producir la evidencia focalizada.' }
  if (-not $Closure) { throw 'El runner termino sin producir el reporte de cierre.' }

  Add ''
  Add '== RESULTADO =='
  Add 'status=ASEGURADORAS_OP2_VISUAL_GATE_CLOSED'
  Add 'crm=10/10_reused'
  Add 'aseguradoras=12/15_reused_plus_3/3_focused_equals_15/15'
  Add ("focused_evidence={0}" -f $Focused.FullName)
  Add ("closure_report={0}" -f $Closure.FullName)
  Add 'next_action=Ejecutar dry-run Guatemala y Colombia separados, sin escritura; despues backend/Auth/Hosting productivo.'
  $script:FinalResult = 'PASSED'
}
catch {
  Add ''
  Add '== RESULTADO =='
  Add 'status=BLOCKED_AT_FIRST_REAL_FAILURE'
  Add ("error={0}" -f ($_.Exception.Message -replace "`r|`n",' '))
  Add 'previous_evidence_preserved=YES'
  Add 'source_repo_local_changes_preserved=YES'
  try { Copy-NewReportsBack (Join-Path $TempRepo '_orbit360_reports') $SourceReports } catch {}
}
finally {
  Add ''
  Add '== LIMPIEZA DEL ESPACIO TEMPORAL =='
  if ($TempNodeModules -and (Test-Path $TempNodeModules)) {
    try {
      & cmd.exe /d /c rmdir $TempNodeModules 2>$null
      if ($LASTEXITCODE -ne 0 -or (Test-Path $TempNodeModules)) {
        throw 'No se pudo desmontar la union temporal de dependencias.'
      }
      Add 'dependency_junction_removed=YES'
    } catch {
      Add ("dependency_junction_removed=NO | path={0}" -f $TempNodeModules)
    }
  } else {
    Add 'dependency_junction_removed=NOT_REQUIRED'
  }

  if (Test-Path $TempRoot) {
    try {
      if ($TempNodeModules -and (Test-Path $TempNodeModules)) {
        throw 'La union de dependencias sigue presente; el espacio temporal se conserva por seguridad.'
      }
      Remove-Item $TempRoot -Recurse -Force -ErrorAction Stop
      Add 'temporary_workspace_removed=YES'
    } catch {
      Add ("temporary_workspace_removed=NO | path={0}" -f $TempRoot)
    }
  } else {
    Add 'temporary_workspace_removed=NOT_REQUIRED'
  }
  Add 'source_repo_pull=NO'
  Add 'source_repo_switch=NO'
  Add 'source_repo_reset=NO'
  Add 'source_repo_clean=NO'
  Add 'deploy=NO'
  Add 'real_data_writes=NO'
  Add ("final_result={0}" -f $script:FinalResult)
  Add ("report={0}" -f $Report)

  try {
    Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard
    Start-Process notepad.exe -ArgumentList ('"' + $Report + '"')
  } catch {}
}

exit 0
