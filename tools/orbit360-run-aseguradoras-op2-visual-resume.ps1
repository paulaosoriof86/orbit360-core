param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = 'Stop'
$ExpectedBranch = 'ays/backend-tenant-lab-v99-20260703'
$Reports = Join-Path $Repo '_orbit360_reports'
$App = Join-Path $Repo 'orbit360-platform'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$MasterReport = Join-Path $Reports "RESUME-ASEGURADORAS-OP2-$Stamp.txt"
$script:VisualPort = 0
$script:ApprovedCrmReport = $null

try {
  [Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
  $OutputEncoding = [Console]::OutputEncoding
  chcp 65001 | Out-Null
} catch {}

function Add-Report([string]$Text = '') {
  Add-Content -Path $MasterReport -Value $Text -Encoding UTF8
}

function Quote-NativeArg([string]$Value) {
  if ($Value -notmatch '[\s"]') { return $Value }
  return '"' + $Value.Replace('"', '\"') + '"'
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
  try {
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
      if ($Text) { Add-Report $Text.TrimEnd() }
    }
    if (Test-Path $Stderr) {
      $Text = Get-Content $Stderr -Raw -Encoding UTF8
      if ($Text) { Add-Report $Text.TrimEnd() }
    }
    if ($Process.ExitCode -ne 0) { throw "$FailureMessage Exit code: $($Process.ExitCode)." }
  }
  finally {
    Remove-Item $Stdout,$Stderr -Force -ErrorAction SilentlyContinue
  }
}

function Read-ReportText([string]$Path) {
  $Bytes = [System.IO.File]::ReadAllBytes($Path)
  try {
    $Utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
    return $Utf8Strict.GetString($Bytes)
  }
  catch {
    return [System.Text.Encoding]::Default.GetString($Bytes)
  }
}

function Normalize-ReportText([string]$Text) {
  if ($null -eq $Text) { return '' }
  $FormD = $Text.Normalize([System.Text.NormalizationForm]::FormD)
  $Builder = New-Object System.Text.StringBuilder
  foreach ($Char in $FormD.ToCharArray()) {
    $Category = [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($Char)
    if ($Category -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$Builder.Append($Char)
    }
  }
  return $Builder.ToString().Normalize([System.Text.NormalizationForm]::FormC).ToUpperInvariant()
}

function Test-CrmReportApproval([System.IO.FileInfo]$Report) {
  $ExpectedScenarios = @(
    'dir-clientes-desktop',
    'dir-cliente-desktop',
    'dir-calidad-desktop',
    'dir-poliza-desktop',
    'op-cliente-tablet',
    'op-calidad-tablet',
    'ase-cliente-mobile',
    'ase-calidad-mobile',
    'ase-poliza-mobile',
    'dir-portal-mobile'
  )

  $Raw = Read-ReportText $Report.FullName
  $Normalized = Normalize-ReportText $Raw
  $Missing = @()
  foreach ($Scenario in $ExpectedScenarios) {
    $Pattern = '(?m)^OK\s+' + [regex]::Escape($Scenario.ToUpperInvariant()) + '\s+'
    if ($Normalized -notmatch $Pattern) { $Missing += $Scenario }
  }

  $HasTenOfTen = $Normalized -match '10/10\s+ESCENARIOS\s+APROBADOS'
  $HasApprovedResult = $Normalized -match 'RESULTADO\s+CRM\s+OP-1:' -and $Normalized -match 'APROBADA'
  $HasScenarioFailure = $Normalized -match '(?m)^FALL(?:O|Ó)\s+(DIR|OP|ASE)-'

  $EvidenceDir = Join-Path $Reports $Report.BaseName
  $MissingScreenshots = @()
  foreach ($Scenario in $ExpectedScenarios) {
    $Shot = Join-Path $EvidenceDir ($Scenario + '.png')
    if (-not (Test-Path $Shot)) { $MissingScreenshots += $Scenario }
  }

  $Approved = $HasTenOfTen -and $HasApprovedResult -and -not $HasScenarioFailure -and $Missing.Count -eq 0 -and $MissingScreenshots.Count -eq 0
  return [pscustomobject]@{
    Approved = $Approved
    Report = $Report.FullName
    EvidenceDir = $EvidenceDir
    MissingScenarios = $Missing
    MissingScreenshots = $MissingScreenshots
    HasTenOfTen = $HasTenOfTen
    HasApprovedResult = $HasApprovedResult
    HasScenarioFailure = $HasScenarioFailure
  }
}

function Find-ApprovedCrmEvidence {
  $Candidates = @(Get-ChildItem $Reports -File -Filter 'VISUAL-CRM-OP1-*.txt' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending)
  if (-not $Candidates.Count) { throw 'No previous CRM visual report was found. The common runner is required.' }

  $Evaluated = @()
  foreach ($Candidate in $Candidates) {
    $Check = Test-CrmReportApproval $Candidate
    $Evaluated += $Check
    if ($Check.Approved) { return $Check }
  }

  Add-Report 'CRM reports evaluated automatically:'
  foreach ($Check in $Evaluated) {
    Add-Report ("- {0} | 10/10={1} | approvedResult={2} | missingScenarios={3} | missingScreenshots={4} | scenarioFailure={5}" -f `
      $Check.Report, $Check.HasTenOfTen, $Check.HasApprovedResult, $Check.MissingScenarios.Count, $Check.MissingScreenshots.Count, $Check.HasScenarioFailure)
  }
  throw 'No approved CRM 10/10 evidence set was found. CRM was not rerun.'
}

function Test-LocalPortAvailable([int]$Port) {
  $Listener = $null
  try {
    $Listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
    $Listener.Start()
    return $true
  }
  catch { return $false }
  finally { if ($Listener) { try { $Listener.Stop() } catch {} } }
}

function Resolve-VisualPort([int]$PreferredPort = 5000) {
  for ($Port = $PreferredPort; $Port -le ($PreferredPort + 40); $Port++) {
    if (Test-LocalPortAvailable $Port) { return $Port }
  }
  throw "No free loopback port was found between $PreferredPort and $($PreferredPort + 40)."
}

function Run-Step([string]$Name, [scriptblock]$Block) {
  Add-Report ''
  Add-Report "== $Name =="
  try {
    & $Block
    Add-Report "OK: $Name"
    return $true
  }
  catch {
    Add-Report ("ERROR: {0}" -f $_.Exception.Message)
    return $false
  }
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $MasterReport -Value '============================================================' -Encoding UTF8
Add-Report 'ORBIT 360 - RESUME ONLY INSURERS OP2 VISUAL GATE V1.218'
Add-Report ("Local time: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Report ("Repo: {0}" -f $Repo)
Add-Report 'CRM OP1 is reused from verified 10/10 report + 10 screenshots; CRM is not rerun.'
Add-Report 'Report matching is encoding-tolerant and does not depend on accents or only the latest file.'
Add-Report 'No deploy, production, merge, main, real data, commit or push.'
Add-Report '============================================================'

$AllOk = Run-Step '1. Verify repository, branch and prior CRM approval' {
  if (-not (Test-Path (Join-Path $Repo '.git'))) { throw "Git repository not found: $Repo" }
  Set-Location $Repo
  $Branch = (& git branch --show-current 2>$null).Trim()
  if ($Branch -ne $ExpectedBranch) { throw "Wrong branch: $Branch" }

  $script:ApprovedCrmReport = Find-ApprovedCrmEvidence
  Add-Report "CRM reused without rerun: $($script:ApprovedCrmReport.Report)"
  Add-Report "CRM screenshot evidence: $($script:ApprovedCrmReport.EvidenceDir)"
  Add-Report 'CRM evidence verified: 10/10 scenario IDs, approved result, no scenario failures and 10 screenshots.'
}

if ($AllOk) {
  $AllOk = Run-Step '2. Confirm integration remains idempotent' {
    $Integration = Join-Path $Repo 'tools\orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1'
    Invoke-CapturedNative 'powershell' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Integration,'-Repo',$Repo) 'Safe integration failed.'
  }
}

if ($AllOk) {
  $AllOk = Run-Step '3. Validate the corrected visual harness contract' {
    $Validator = Join-Path $Repo 'tools\orbit360-validar-smoke-aseguradoras-op2-v1218.mjs'
    Invoke-CapturedNative 'node' @($Validator,$Repo) 'Smoke harness contract failed.'
  }
}

if ($AllOk) {
  $AllOk = Run-Step '4. Validate Insurers OP2 and resource access policy' {
    Invoke-CapturedNative 'node' @((Join-Path $Repo 'tools\orbit360-validar-aseguradoras-op2.mjs'),$App) 'Insurers OP2 validation failed.'
    Invoke-CapturedNative 'node' @((Join-Path $Repo 'tools\orbit360-validar-politica-recursos-aseguradoras-v1218.mjs'),$App) 'Account and credential policy validation failed.'
  }
}

if ($AllOk) {
  $AllOk = Run-Step '5. Select a safe visual port automatically' {
    $script:VisualPort = Resolve-VisualPort 5000
    Add-Report "Selected visual URL: http://127.0.0.1:$script:VisualPort"
  }
}

if ($AllOk) {
  $AllOk = Run-Step '6. Run only the Insurers OP2 visual matrix' {
    $Smoke = Join-Path $Repo 'tools\orbit360-smoke-visual-aseguradoras-op2.mjs'
    Invoke-CapturedNative 'node' @($Smoke,'--repo',$Repo,'--app',$App,'--port',[string]$script:VisualPort,'--skip-validators') 'Insurers OP2 visual matrix failed.'
  }
}

Run-Step '7. Final evidence paths' {
  Add-Report ("Final HEAD: {0}" -f ((& git rev-parse HEAD 2>$null).Trim()))
  if ($script:ApprovedCrmReport) { Add-Report "Reused CRM evidence: $($script:ApprovedCrmReport.Report)" }
  Add-Report 'Latest Insurers evidence:'
  Get-ChildItem $Reports -Directory -Filter 'VISUAL-ASEGURADORAS-OP2-*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 2 |
    ForEach-Object { Add-Report $_.FullName }
} | Out-Null

Add-Report ''
if ($AllOk) {
  Add-Report 'RESULT OP2 RESUME: AUTOMATIC VISUAL VALIDATION PASSED'
  Add-Report 'CRM OP1 was not rerun; its verified 10/10 evidence and screenshots were reused.'
  Add-Report 'Real GT/CO dry-runs were not executed.'
}
else {
  Add-Report 'RESULT OP2 RESUME: BLOCKED'
  Add-Report 'Execution stopped at the first real failing step.'
}
Add-Report 'No deploy, production, merge, main, secrets, real data, automatic commit or push.'
Add-Report ("Master report: {0}" -f $MasterReport)

try {
  Get-Content $MasterReport -Raw -Encoding UTF8 | Set-Clipboard
  notepad $MasterReport
} catch {}

if (-not $AllOk) { exit 1 }
