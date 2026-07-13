param(
  [string]$Repo = ''
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
    $Full = [System.IO.Path]::GetFullPath($Candidate)
    if ($Seen.ContainsKey($Full)) { continue }
    $Seen[$Full] = $true
    if (-not (Test-Path (Join-Path $Full '.git'))) { continue }
    $Origin = (& git -C $Full remote get-url origin 2>$null | Out-String).Trim()
    if ($Origin -match 'paulaosoriof86[/\\:]orbit360-core') { return $Full }
  }
  return $null
}

$Repo = Find-OrbitRepo $Repo
if (-not $Repo) {
  Write-Host 'ORBIT 360: repository orbit360-core was not found.'
  exit 1
}

$Reports = Join-Path $Repo '_orbit360_reports'
$App = Join-Path $Repo 'orbit360-platform'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$Master = Join-Path $Reports "CLOSURE-CRM-OP1-ASEGURADORAS-OP2-V1220-$Stamp.txt"
$script:Port = 0
$script:CrmEvidence = $null
$script:Op2Evidence = $null

New-Item -ItemType Directory -Force -Path $Reports | Out-Null

function Add([string]$Text = '') { Add-Content -Path $Master -Value $Text -Encoding UTF8 }

function Step([string]$Name, [scriptblock]$Block) {
  Add ''
  Add "== $Name =="
  try {
    & $Block
    Add "[OK] $Name"
    return $true
  } catch {
    Add ("[FAIL] {0} | {1}" -f $Name,$_.Exception.Message)
    return $false
  }
}

function Quote-NativeArg([string]$Value) {
  if ($null -eq $Value) { return '""' }
  if ($Value -notmatch '[\s"]') { return $Value }
  return '"' + $Value.Replace('"','\"') + '"'
}

function Invoke-CapturedNative(
  [string]$FilePath,
  [string[]]$Arguments,
  [string]$FailureMessage
) {
  $Token = [guid]::NewGuid().ToString('N')
  $Stdout = Join-Path $Reports ("native-$Token.out.txt")
  $Stderr = Join-Path $Reports ("native-$Token.err.txt")
  $ArgumentText = (($Arguments | ForEach-Object { Quote-NativeArg ([string]$_) }) -join ' ')

  $Process = Start-Process -FilePath $FilePath `
    -ArgumentList $ArgumentText `
    -WorkingDirectory $Repo `
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

  Remove-Item $Stdout,$Stderr -Force -ErrorAction SilentlyContinue
  if ($Process.ExitCode -ne 0) { throw "$FailureMessage Exit code: $($Process.ExitCode)." }
  return $Process.ExitCode
}

function Test-FreePort([int]$Port) {
  $Listener = $null
  try {
    $Listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
    $Listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($Listener) { try { $Listener.Stop() } catch {} }
  }
}

function Resolve-Port {
  for ($Port = 5000; $Port -le 5040; $Port++) {
    if (Test-FreePort $Port) { return $Port }
  }
  throw 'No free loopback port was found between 5000 and 5040.'
}

function Read-JsonLines([string]$Path) {
  if (-not (Test-Path $Path)) { return @() }
  $Rows = @()
  foreach ($Line in Get-Content -Path $Path -Encoding UTF8) {
    if ([string]::IsNullOrWhiteSpace($Line)) { continue }
    try { $Rows += ($Line | ConvertFrom-Json) }
    catch { throw "Invalid JSONL line in $Path" }
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

function Sync-BranchSafe {
  $CurrentBranch = (& git -C $Repo branch --show-current 2>$null | Out-String).Trim()
  if ($CurrentBranch -ne $Branch) { throw "Wrong branch: $CurrentBranch. Required: $Branch" }

  $LocalStatus = @(& git -C $Repo status --short 2>$null)
  if ($LocalStatus.Count -gt 0) {
    Add 'Local changes detected and preserved:'
    $LocalStatus | ForEach-Object { Add ([string]$_) }
  }

  Invoke-CapturedNative 'git' @('-C',$Repo,'fetch','--quiet','origin',$Branch) 'git fetch failed.' | Out-Null
  $Local = (& git -C $Repo rev-parse HEAD 2>$null | Out-String).Trim()
  $Remote = (& git -C $Repo rev-parse "origin/$Branch" 2>$null | Out-String).Trim()
  Add "Local HEAD before sync: $Local"
  Add "Remote HEAD: $Remote"

  if ($Local -ne $Remote) {
    if ($LocalStatus.Count -gt 0) {
      throw 'Remote updates exist but local changes are present. Nothing was reset, cleaned, switched or merged.'
    }
    Invoke-CapturedNative 'git' @('-C',$Repo,'merge','--ff-only',"origin/$Branch") 'Safe fast-forward failed.' | Out-Null
    $Updated = (& git -C $Repo rev-parse HEAD 2>$null | Out-String).Trim()
    Add "Local HEAD after sync: $Updated"

    if ($env:ORBIT_OP2_RESUME_REEXEC -ne '1') {
      $UpdatedScript = Join-Path $Repo 'tools\orbit360-run-aseguradoras-op2-plataformas-resume.ps1'
      if (-not (Test-Path $UpdatedScript)) { throw 'Updated focused runner was not found after sync.' }
      Add 'Runner updated during sync. Relaunching the updated local file once.'
      $env:ORBIT_OP2_RESUME_REEXEC = '1'
      Invoke-CapturedNative 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$UpdatedScript,'-Repo',$Repo) 'Updated focused runner failed.' | Out-Null
      Remove-Item Env:ORBIT_OP2_RESUME_REEXEC -ErrorAction SilentlyContinue
      Add 'Updated runner completed. Bootstrap execution will stop without duplicating the smoke.'
      Get-Content $Master -Raw -Encoding UTF8 | Set-Clipboard
      exit 0
    }
  }

  Add ("HEAD synchronized: {0}" -f ((& git -C $Repo rev-parse HEAD 2>$null | Out-String).Trim()))
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
    $ByScenario = @{}
    foreach ($Row in $Rows) { if ($Row.scenario) { $ByScenario[[string]$Row.scenario] = $Row } }
    $AllApproved = $true
    foreach ($Id in $Expected) {
      if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -ne $true) { $AllApproved = $false; break }
    }
    $MissingShots = Test-ScreenshotSet $Directory.FullName $Expected
    if ($AllApproved -and $MissingShots.Count -eq 0) {
      return [pscustomobject]@{ Directory=$Directory.FullName; Results=(Join-Path $Directory.FullName 'results.jsonl'); Scenarios=$Expected }
    }
  }
  throw 'Complete CRM 10/10 evidence was not found. CRM was not repeated.'
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
    $ByScenario = @{}
    foreach ($Row in $Rows) { if ($Row.scenario) { $ByScenario[[string]$Row.scenario] = $Row } }
    $ApprovedOk = $true
    foreach ($Id in $Approved) {
      if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -ne $true) { $ApprovedOk = $false; break }
    }
    if (-not $ApprovedOk) { continue }
    $PendingPresent = $true
    foreach ($Id in $Pending) {
      if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -eq $true) { $PendingPresent = $false; break }
    }
    if (-not $PendingPresent) { continue }
    $MissingApprovedShots = Test-ScreenshotSet $Directory.FullName $Approved
    if ($MissingApprovedShots.Count -eq 0) {
      return [pscustomobject]@{ Directory=$Directory.FullName; Results=(Join-Path $Directory.FullName 'results.jsonl'); Approved=$Approved; Pending=$Pending }
    }
  }
  throw 'Valid OP2 evidence with 12 approved and 3 pending scenarios was not found.'
}

Set-Content -Path $Master -Value '============================================================' -Encoding UTF8
Add 'ORBIT 360 - FOCUSED CLOSURE CRM OP1 + INSURERS OP2 V1.220'
Add ("Local time: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add ("Repo: {0}" -f $Repo)
Add 'Reuses CRM 10/10 and OP2 12/15. Runs only 3 pending Platform views.'
Add 'No deploy, production, merge to main, real-data writes, commit or push.'
Add '============================================================'

$Ok = Step '1. Verify and safely synchronize required branch' { Sync-BranchSafe }

if ($Ok) {
  $Ok = Step '2. Apply idempotent local integration with backup' {
    $Integration = Join-Path $Repo 'tools\orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1'
    if (-not (Test-Path $Integration)) { throw 'Safe integration pipeline was not found.' }
    Invoke-CapturedNative 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Integration,'-Repo',$Repo) 'Safe local integration failed.' | Out-Null
  }
}

if ($Ok) {
  $Ok = Step '3. Validate OP2 v1.220 contracts and protected backend' {
    Invoke-CapturedNative 'node.exe' @((Join-Path $Repo 'tools\orbit360-validar-aseguradoras-op2-v1220.mjs'),$App) 'Canonical Insurers v1.220 contract failed.' | Out-Null
    Invoke-CapturedNative 'node.exe' @((Join-Path $Repo 'tools\orbit360-validar-politica-recursos-aseguradoras-v1218.mjs'),$App) 'Insurer resource policy failed.' | Out-Null
    Invoke-CapturedNative 'node.exe' @((Join-Path $Repo 'tools\orbit360-validar-cuarentena-hojas-aseguradoras-v1219.mjs'),$Repo) 'Sheet quarantine control failed.' | Out-Null
    Invoke-CapturedNative 'node.exe' @((Join-Path $Repo 'tools\orbit360-validar-alias-directorios-aseguradoras-v1219.mjs'),$Repo) 'Identity and duplicate control failed.' | Out-Null
    Invoke-CapturedNative 'node.exe' @((Join-Path $Repo 'tools\orbit360-validar-copy-importador-aseguradoras-v1220.mjs'),$Repo) 'Operational copy control failed.' | Out-Null
    Invoke-CapturedNative 'node.exe' @((Join-Path $Repo 'tools\orbit360-validar-backend-lab-contrato.mjs')) 'Protected backend contract failed.' | Out-Null
    Invoke-CapturedNative 'node.exe' @((Join-Path $Repo 'tools\orbit360-validar-smoke-op2-plataformas-focused-v1218.mjs'),$Repo) 'Focused smoke harness failed.' | Out-Null
    Invoke-CapturedNative 'node.exe' @((Join-Path $Repo 'tools\orbit360-validar-resume-evidence-op1-op2-v1218.mjs'),$Repo) 'Reusable evidence reader failed.' | Out-Null
  }
}

if ($Ok) {
  $Ok = Step '4. Reuse approved evidence without repeating scenarios' {
    $script:CrmEvidence = Find-CrmEvidence
    $script:Op2Evidence = Find-Op2PartialEvidence
    Add ("CRM reused: {0}" -f $script:CrmEvidence.Directory)
    Add ("OP2 12/15 reused: {0}" -f $script:Op2Evidence.Directory)
  }
}

if ($Ok) {
  $Ok = Step '5. Select a free loopback port automatically' {
    $script:Port = Resolve-Port
    Add ("Selected URL: http://127.0.0.1:{0}" -f $script:Port)
  }
}

if ($Ok) {
  $Ok = Step '6. Run only the 3 pending Platform views' {
    Invoke-CapturedNative 'node.exe' @(
      (Join-Path $Repo 'tools\orbit360-smoke-op2-plataformas-focused-v1218.mjs'),
      '--repo',$Repo,'--app',$App,'--port',[string]$script:Port
    ) 'Focused Platform smoke failed.' | Out-Null
  }
}

if ($Ok) {
  $Ok = Step '7. Verify JSONL and combine OP2 closure 15/15' {
    $Expected = @('dir-plataformas-desktop','op-plataformas-tablet','ase-plataformas-mobile')
    $Candidate = Get-ChildItem $Reports -Directory -Filter 'VISUAL-OP2-PLATAFORMAS-*' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $Candidate) { throw 'Focused evidence folder was not created.' }
    $Rows = Read-JsonLines (Join-Path $Candidate.FullName 'results.jsonl')
    $ByScenario = @{}
    foreach ($Row in $Rows) { if ($Row.scenario) { $ByScenario[[string]$Row.scenario] = $Row } }
    foreach ($Id in $Expected) {
      if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -ne $true) { throw "Scenario not approved: $Id" }
    }
    $MissingShots = Test-ScreenshotSet $Candidate.FullName $Expected
    if ($MissingShots.Count -gt 0) { throw ('Missing screenshots: ' + ($MissingShots -join ', ')) }
    Add ("Focused evidence: {0}" -f $Candidate.FullName)
    Add 'COMBINED CRM OP1: 10/10'
    Add 'COMBINED INSURERS OP2: 12 reused + 3 focused = 15/15'
  }
}

Add ''
if ($Ok) {
  Add 'RESULT: CRM OP1 AND INSURERS OP2 VISUAL GATES CLOSED'
  Add 'Next action: Guatemala dry-run, then Colombia dry-run, separated and read-only.'
} else {
  Add 'RESULT: BLOCKED AT THE FIRST REAL FAILURE'
  Add 'Previously approved evidence remains valid and was not repeated.'
}
Add ("Final HEAD: {0}" -f ((& git -C $Repo rev-parse HEAD 2>$null | Out-String).Trim()))
Add 'No deploy, production, merge to main, secrets, real data, automatic commit or push.'
Add ("Master report: {0}" -f $Master)

try {
  Get-Content $Master -Raw -Encoding UTF8 | Set-Clipboard
  Start-Process notepad.exe -ArgumentList ('"' + $Master + '"')
} catch {}

if (-not $Ok) { exit 1 }
exit 0
