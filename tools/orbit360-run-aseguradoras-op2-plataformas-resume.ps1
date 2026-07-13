param([string]$Repo="C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core")

$ErrorActionPreference = 'Stop'
$Branch = 'ays/backend-tenant-lab-v99-20260703'
$Reports = Join-Path $Repo '_orbit360_reports'
$App = Join-Path $Repo 'orbit360-platform'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$Master = Join-Path $Reports "CLOSURE-CRM-OP1-ASEGURADORAS-OP2-$Stamp.txt"
$script:Port = 0
$script:CrmEvidence = $null
$script:Op2Evidence = $null

try {
  [Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
  $OutputEncoding = [Console]::OutputEncoding
  chcp 65001 | Out-Null
} catch {}

function Add([string]$Text = '') {
  Add-Content -Path $Master -Value $Text -Encoding UTF8
}

function Step([string]$Name, [scriptblock]$Block) {
  Add ''
  Add "== $Name =="
  try {
    & $Block
    Add "OK: $Name"
    return $true
  }
  catch {
    Add ("ERROR: {0}" -f $_.Exception.Message)
    return $false
  }
}

function Test-FreePort([int]$Port) {
  $Listener = $null
  try {
    $Listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
    $Listener.Start()
    return $true
  }
  catch { return $false }
  finally { if ($Listener) { try { $Listener.Stop() } catch {} } }
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

function Find-CrmEvidence {
  $Expected = @(
    'dir-clientes-desktop','dir-cliente-desktop','dir-calidad-desktop','dir-poliza-desktop',
    'op-cliente-tablet','op-calidad-tablet','ase-cliente-mobile','ase-calidad-mobile',
    'ase-poliza-mobile','dir-portal-mobile'
  )

  $Candidates = @(Get-ChildItem $Reports -Directory -Filter 'VISUAL-CRM-OP1-*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending)
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
  throw 'No complete CRM 10/10 JSONL + screenshot evidence was found. CRM was not rerun.'
}

function Find-Op2PartialEvidence {
  $Approved = @(
    'dir-directorio-desktop','dir-resumen-desktop','dir-contactos-desktop','dir-bancos-desktop',
    'dir-documentos-desktop','dir-tarifas-desktop','op-directorio-tablet','op-resumen-tablet',
    'op-bancos-tablet','ase-directorio-mobile','ase-resumen-mobile','ase-bancos-mobile'
  )
  $Pending = @('dir-plataformas-desktop','op-plataformas-tablet','ase-plataformas-mobile')
  $All = @($Approved + $Pending)

  $Candidates = @(Get-ChildItem $Reports -Directory -Filter 'VISUAL-ASEGURADORAS-OP2-*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending)
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
      return [pscustomobject]@{
        Directory=$Directory.FullName
        Results=(Join-Path $Directory.FullName 'results.jsonl')
        Approved=$Approved
        Pending=$Pending
      }
    }
  }
  throw 'No valid OP2 partial JSONL evidence with 12 approved and 3 pending scenarios was found.'
}

function Invoke-Native([string]$Exe, [string[]]$Arguments, [string]$FailureMessage) {
  & $Exe @Arguments 2>&1 | ForEach-Object { Add $_ }
  if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Master -Value '============================================================' -Encoding UTF8
Add 'ORBIT 360 - CIERRE FOCALIZADO CRM OP1 + ASEGURADORAS OP2 V1.218'
Add ("Local time: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add 'Evidence reuse is based on results.jsonl + PNG files, not report wording, accents or encoding.'
Add 'Reuses CRM 10/10 and OP2 12/15. Runs only 3 pending platform scenarios.'
Add 'No deploy, production, merge, main, real data, commit or push.'
Add '============================================================'

$Ok = Step '1. Verify branch and reusable JSONL evidence' {
  $CurrentBranch = (& git -C $Repo branch --show-current).Trim()
  if ($CurrentBranch -ne $Branch) { throw "Wrong branch: $CurrentBranch" }
  $script:CrmEvidence = Find-CrmEvidence
  $script:Op2Evidence = Find-Op2PartialEvidence
  Add ("CRM reused: {0}" -f $script:CrmEvidence.Directory)
  Add ("OP2 12/15 reused: {0}" -f $script:Op2Evidence.Directory)
  Add 'CRM evidence verified: 10 approved JSONL rows + 10 screenshots.'
  Add 'OP2 evidence verified: 12 approved JSONL rows + screenshots; 3 platform scenarios pending.'
}

if ($Ok) {
  $Ok = Step '2. Validate focused harness and evidence parser contracts' {
    Invoke-Native 'node' @((Join-Path $Repo 'tools\orbit360-validar-smoke-op2-plataformas-focused-v1218.mjs'),$Repo) 'Focused harness validator failed.'
    Invoke-Native 'node' @((Join-Path $Repo 'tools\orbit360-validar-resume-evidence-op1-op2-v1218.mjs'),$Repo) 'Evidence parser validator failed.'
  }
}

if ($Ok) {
  $Ok = Step '3. Select safe port automatically' {
    $script:Port = Resolve-Port
    Add ("Selected URL: http://127.0.0.1:{0}" -f $script:Port)
  }
}

if ($Ok) {
  $Ok = Step '4. Run only the 3 pending platform scenarios' {
    Invoke-Native 'node' @(
      (Join-Path $Repo 'tools\orbit360-smoke-op2-plataformas-focused-v1218.mjs'),
      '--repo',$Repo,'--app',$App,'--port',[string]$script:Port
    ) 'Focused platform smoke failed.'
  }
}

if ($Ok) {
  $Ok = Step '5. Verify focused JSONL evidence and combine 15/15' {
    $Expected = @('dir-plataformas-desktop','op-plataformas-tablet','ase-plataformas-mobile')
    $Candidate = Get-ChildItem $Reports -Directory -Filter 'VISUAL-OP2-PLATAFORMAS-*' -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $Candidate) { throw 'Focused evidence directory was not created.' }
    $Rows = Read-JsonLines (Join-Path $Candidate.FullName 'results.jsonl')
    $ByScenario = @{}
    foreach ($Row in $Rows) { if ($Row.scenario) { $ByScenario[[string]$Row.scenario] = $Row } }
    foreach ($Id in $Expected) {
      if (-not $ByScenario.ContainsKey($Id) -or $ByScenario[$Id].ok -ne $true) {
        throw "Focused scenario is not approved: $Id"
      }
    }
    $MissingShots = Test-ScreenshotSet $Candidate.FullName $Expected
    if ($MissingShots.Count -gt 0) { throw ('Missing focused screenshots: ' + ($MissingShots -join ', ')) }

    Add ("Focused evidence: {0}" -f $Candidate.FullName)
    Add 'COMBINED CRM OP1: 10/10'
    Add 'COMBINED ASEGURADORAS OP2: 12 reused + 3 focused = 15/15'
    Add 'VISUAL STATUS: CRM OP1 CLOSED'
    Add 'VISUAL STATUS: ASEGURADORAS OP2 CLOSED'
  }
}

Add ''
if ($Ok) {
  Add 'RESULT: CRM OP1 AND ASEGURADORAS OP2 VISUAL GATES CLOSED'
  Add 'Next operational action: separate GT and CO insurer-directory dry-runs, without mixing sources.'
}
else {
  Add 'RESULT: BLOCKED AT FIRST REAL FAILURE'
  Add 'Previously approved evidence remains valid and was not rerun.'
}
Add ("Final HEAD: {0}" -f ((& git -C $Repo rev-parse HEAD).Trim()))
Add 'No deploy, production, merge, main, secrets, real data, automatic commit or push.'
Add ("Master report: {0}" -f $Master)
try {
  Get-Content $Master -Raw -Encoding UTF8 | Set-Clipboard
  notepad $Master
} catch {}
if (-not $Ok) { exit 1 }
