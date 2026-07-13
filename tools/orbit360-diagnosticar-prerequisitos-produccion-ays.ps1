param(
  [string]$RepoPath = ''
)

$ErrorActionPreference = 'Continue'
$ExpectedBranch = 'ays/backend-tenant-lab-v99-20260703'

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

function Quote-NativeArg([string]$Value) {
  if ($null -eq $Value) { return '""' }
  if ($Value -notmatch '[\s"]') { return $Value }
  return '"' + $Value.Replace('"','\"') + '"'
}

function Invoke-CapturedNative(
  [string]$FilePath,
  [string[]]$Arguments,
  [string]$WorkingDirectory
) {
  $Token = [guid]::NewGuid().ToString('N')
  $Stdout = Join-Path $env:TEMP ("orbit360-$Token.out.txt")
  $Stderr = Join-Path $env:TEMP ("orbit360-$Token.err.txt")
  $ArgumentText = (($Arguments | ForEach-Object { Quote-NativeArg ([string]$_) }) -join ' ')
  $Result = [ordered]@{ ExitCode = 999; Stdout = ''; Stderr = '' }

  try {
    $Process = Start-Process -FilePath $FilePath `
      -ArgumentList $ArgumentText `
      -WorkingDirectory $WorkingDirectory `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $Stdout `
      -RedirectStandardError $Stderr
    $Result.ExitCode = $Process.ExitCode
  } catch {
    $Result.Stderr = $_.Exception.Message
  }

  if (Test-Path $Stdout) {
    try { $Result.Stdout = Get-Content $Stdout -Raw -Encoding UTF8 } catch {}
  }
  if (Test-Path $Stderr) {
    try { $Result.Stderr = Get-Content $Stderr -Raw -Encoding UTF8 } catch {}
  }
  Remove-Item $Stdout,$Stderr -Force -ErrorAction SilentlyContinue
  return [pscustomobject]$Result
}

function Get-PropertyValue($Object, [string]$Name) {
  if ($null -eq $Object) { return $null }
  $Property = $Object.PSObject.Properties[$Name]
  if ($Property) { return $Property.Value }
  return $null
}

$Repo = Find-OrbitRepo $RepoPath
if (-not $Repo) {
  $Text = @"
ORBIT360_PRODUCTION_PREFLIGHT
STATUS=REPO_NOT_FOUND
ACTION=Open PowerShell from the computer that contains orbit360-core and run the same block again.
NO_DEPLOY=YES
NO_WRITES=YES
"@
  $Text | Set-Clipboard
  Write-Host $Text
  exit 0
}

$Reports = Join-Path $Repo '_orbit360_reports'
New-Item -ItemType Directory -Force -Path $Reports | Out-Null
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$Report = Join-Path $Reports "DIAGNOSTICO-PREREQUISITOS-PRODUCCION-AYS-$Stamp.txt"

$Lines = New-Object System.Collections.Generic.List[string]
function Add-Line([string]$Text = '') { $Lines.Add($Text) }

Add-Line '============================================================'
Add-Line 'ORBIT 360 - DIAGNOSTICO READ-ONLY DE PREREQUISITOS PRODUCCION A&S'
Add-Line ("Fecha local: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Line ("Repo: {0}" -f $Repo)
Add-Line 'No deploy. No writes. No imports. No rules changes. No secrets printed.'
Add-Line '============================================================'

$Branch = (& git -C $Repo branch --show-current 2>$null | Out-String).Trim()
$LocalHead = (& git -C $Repo rev-parse HEAD 2>$null | Out-String).Trim()
$RemoteHead = (& git -C $Repo rev-parse "origin/$ExpectedBranch" 2>$null | Out-String).Trim()
$StatusRows = @(& git -C $Repo status --short 2>$null)
$Origin = (& git -C $Repo remote get-url origin 2>$null | Out-String).Trim()

Add-Line ''
Add-Line '== GIT =='
Add-Line ("origin={0}" -f $Origin)
Add-Line ("branch={0}" -f $Branch)
Add-Line ("required_branch={0}" -f $ExpectedBranch)
Add-Line ("local_head={0}" -f $LocalHead)
Add-Line ("remote_head={0}" -f $RemoteHead)
Add-Line ("local_changes_count={0}" -f $StatusRows.Count)
if ($StatusRows.Count -gt 0) {
  Add-Line 'Local changes are preserved. No switch, reset, clean, pull or merge was executed.'
}

$ConfigPath = Join-Path $Repo 'orbit360-platform\core\auth-firebase.config.local.js'
$ConfigExists = Test-Path $ConfigPath
$ConfigPlaceholders = $false
$ConfigProjectId = ''
$ConfigAuthDomain = ''
if ($ConfigExists) {
  $ConfigRaw = Get-Content $ConfigPath -Raw -ErrorAction SilentlyContinue
  $ConfigPlaceholders = [bool]($ConfigRaw -match 'REEMPLAZAR_|PLACEHOLDER|YOUR_|CHANGEME')
  $ProjectMatch = [regex]::Match($ConfigRaw, 'projectId\s*:\s*["'']([^"'']+)["'']')
  $AuthMatch = [regex]::Match($ConfigRaw, 'authDomain\s*:\s*["'']([^"'']+)["'']')
  if ($ProjectMatch.Success) { $ConfigProjectId = $ProjectMatch.Groups[1].Value }
  if ($AuthMatch.Success) { $ConfigAuthDomain = $AuthMatch.Groups[1].Value }
}

Add-Line ''
Add-Line '== FIREBASE LOCAL CONFIG =='
Add-Line ("config_exists={0}" -f $ConfigExists)
Add-Line ("config_has_placeholders={0}" -f $ConfigPlaceholders)
Add-Line ("config_project_id={0}" -f $(if ($ConfigProjectId) { $ConfigProjectId } else { 'NOT_DETECTED' }))
Add-Line ("config_auth_domain_detected={0}" -f [bool]$ConfigAuthDomain)
Add-Line 'apiKey, appId and other config values were not printed.'

$FirebaseCommand = Get-Command firebase.cmd -ErrorAction SilentlyContinue
if (-not $FirebaseCommand) { $FirebaseCommand = Get-Command firebase -ErrorAction SilentlyContinue }
$FirebaseExists = [bool]$FirebaseCommand
$FirebaseVersion = ''
$ProjectsOk = $false
$ProjectsError = ''
$Projects = @()

if ($FirebaseExists) {
  $VersionResult = Invoke-CapturedNative $FirebaseCommand.Source @('--version') $Repo
  if ($VersionResult.ExitCode -eq 0) { $FirebaseVersion = ($VersionResult.Stdout | Out-String).Trim() }

  $ProjectsResult = Invoke-CapturedNative $FirebaseCommand.Source @('projects:list','--json') $Repo
  if ($ProjectsResult.ExitCode -eq 0) {
    try {
      $Parsed = $ProjectsResult.Stdout | ConvertFrom-Json
      $RootResult = Get-PropertyValue $Parsed 'result'
      if ($RootResult -is [System.Array]) { $Projects = @($RootResult) }
      elseif ($RootResult -and (Get-PropertyValue $RootResult 'projects')) { $Projects = @(Get-PropertyValue $RootResult 'projects') }
      elseif ($Parsed -and (Get-PropertyValue $Parsed 'projects')) { $Projects = @(Get-PropertyValue $Parsed 'projects') }
      elseif ($RootResult -and (Get-PropertyValue $RootResult 'projectId')) { $Projects = @($RootResult) }
      $ProjectsOk = $true
    } catch {
      $ProjectsError = 'Firebase returned success but JSON could not be parsed.'
    }
  } else {
    $ProjectsError = (($ProjectsResult.Stderr + "`n" + $ProjectsResult.Stdout) | Out-String).Trim()
    if ($ProjectsError.Length -gt 500) { $ProjectsError = $ProjectsError.Substring(0,500) }
  }
}

$ProjectRows = @()
foreach ($Project in $Projects) {
  $Id = [string](Get-PropertyValue $Project 'projectId')
  $Name = [string](Get-PropertyValue $Project 'displayName')
  if (-not $Id) { continue }
  $ProjectRows += [pscustomobject]@{ projectId=$Id; displayName=$Name }
}

$Candidates = @($ProjectRows | Where-Object {
  (($_.projectId + ' ' + $_.displayName).ToLowerInvariant()) -match 'orbit|alianzas|ays|soluciones'
})
if ($ConfigProjectId) {
  $ConfigMatch = @($ProjectRows | Where-Object { $_.projectId -eq $ConfigProjectId })
  if ($ConfigMatch.Count -gt 0) { $Candidates = $ConfigMatch }
}
if ($Candidates.Count -eq 0 -and $ProjectRows.Count -eq 1) { $Candidates = @($ProjectRows[0]) }

Add-Line ''
Add-Line '== FIREBASE CLI =='
Add-Line ("firebase_cli_exists={0}" -f $FirebaseExists)
Add-Line ("firebase_version={0}" -f $(if ($FirebaseVersion) { $FirebaseVersion } else { 'NOT_AVAILABLE' }))
Add-Line ("firebase_projects_query_ok={0}" -f $ProjectsOk)
Add-Line ("accessible_projects_count={0}" -f $ProjectRows.Count)
Add-Line ("candidate_projects_count={0}" -f $Candidates.Count)
foreach ($Candidate in $Candidates) {
  Add-Line ("candidate_project={0} | {1}" -f $Candidate.projectId,$Candidate.displayName)
}
if ($ProjectsError) { Add-Line ("firebase_error={0}" -f ($ProjectsError -replace "`r|`n",' ')) }

$FirebaseJsonPath = Join-Path $Repo 'firebase.json'
$FirebasercPath = Join-Path $Repo '.firebaserc'
$FirebaseJsonExists = Test-Path $FirebaseJsonPath
$FirebasercExists = Test-Path $FirebasercPath
$HostingConfigured = $false
$DefaultProject = ''
if ($FirebaseJsonExists) {
  try {
    $FirebaseJson = Get-Content $FirebaseJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $HostingConfigured = [bool](Get-PropertyValue $FirebaseJson 'hosting')
  } catch {}
}
if ($FirebasercExists) {
  try {
    $Rc = Get-Content $FirebasercPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $RcProjects = Get-PropertyValue $Rc 'projects'
    if ($RcProjects) { $DefaultProject = [string](Get-PropertyValue $RcProjects 'default') }
  } catch {}
}

Add-Line ''
Add-Line '== HOSTING CONFIG =='
Add-Line ("firebase_json_exists={0}" -f $FirebaseJsonExists)
Add-Line ("hosting_configured={0}" -f $HostingConfigured)
Add-Line ("firebaserc_exists={0}" -f $FirebasercExists)
Add-Line ("firebaserc_default_project={0}" -f $(if ($DefaultProject) { $DefaultProject } else { 'NOT_CONFIGURED' }))

$GateScript = Join-Path $Repo 'tools\orbit360-run-aseguradoras-op2-plataformas-resume.ps1'
$GateExists = Test-Path $GateScript
$CrmEvidence = @(Get-ChildItem $Reports -Directory -Filter 'VISUAL-CRM-OP1-*' -ErrorAction SilentlyContinue).Count
$InsurerEvidence = @(Get-ChildItem $Reports -Directory -Filter 'VISUAL-ASEGURADORAS-OP2-*' -ErrorAction SilentlyContinue).Count

Add-Line ''
Add-Line '== REUSABLE EVIDENCE =='
Add-Line ("aseguradoras_gate_script_exists={0}" -f $GateExists)
Add-Line ("crm_evidence_folders={0}" -f $CrmEvidence)
Add-Line ("aseguradoras_evidence_folders={0}" -f $InsurerEvidence)

$Readiness = 'READY_FOR_NEXT_AUTOMATED_BLOCK'
$NextAction = 'Run the corrected focused Aseguradoras gate, then prepare production backend/Auth/Hosting.'
if ($Branch -ne $ExpectedBranch) {
  $Readiness = 'BLOCKED_WRONG_BRANCH'
  $NextAction = 'Use a safe worktree or switch only after preserving local changes. Do not reset or clean.'
} elseif (-not $ConfigExists -or $ConfigPlaceholders) {
  $Readiness = 'BLOCKED_FIREBASE_CONFIG_LOCAL'
  $NextAction = 'Recover or complete the ignored local Firebase config without sharing its contents.'
} elseif (-not $FirebaseExists) {
  $Readiness = 'BLOCKED_FIREBASE_CLI_MISSING'
  $NextAction = 'Install or restore firebase.cmd before deploy work.'
} elseif (-not $ProjectsOk) {
  $Readiness = 'BLOCKED_FIREBASE_SESSION'
  $NextAction = 'Authenticate Firebase CLI locally; do not paste tokens.'
} elseif ($Candidates.Count -eq 0) {
  $Readiness = 'BLOCKED_PROJECT_NOT_IDENTIFIED'
  $NextAction = 'Identify the Firebase project from the accessible project list; no project will be created automatically.'
} elseif ($StatusRows.Count -gt 0) {
  $Readiness = 'READY_WITH_LOCAL_CHANGES_PRESERVED'
  $NextAction = 'Use the existing branch only if fast-forward is safe; otherwise create a clean worktree automatically.'
}

Add-Line ''
Add-Line '== RESULT =='
Add-Line ("status={0}" -f $Readiness)
Add-Line ("next_action={0}" -f $NextAction)
Add-Line 'No deploy, writes, imports, Auth changes, rules changes, commit, push or merge were executed.'
Add-Line ("report={0}" -f $Report)

$Lines | Set-Content -Path $Report -Encoding UTF8

$Compact = @()
$Compact += 'ORBIT360_PRODUCTION_PREFLIGHT'
$Compact += "status=$Readiness"
$Compact += "repo=$Repo"
$Compact += "branch=$Branch"
$Compact += "required_branch=$ExpectedBranch"
$Compact += "local_head=$LocalHead"
$Compact += "remote_head=$RemoteHead"
$Compact += "local_changes_count=$($StatusRows.Count)"
$Compact += "config_exists=$ConfigExists"
$Compact += "config_has_placeholders=$ConfigPlaceholders"
$Compact += "config_project_id=$(if ($ConfigProjectId) { $ConfigProjectId } else { 'NOT_DETECTED' })"
$Compact += "firebase_cli_exists=$FirebaseExists"
$Compact += "firebase_version=$(if ($FirebaseVersion) { $FirebaseVersion } else { 'NOT_AVAILABLE' })"
$Compact += "firebase_projects_query_ok=$ProjectsOk"
$Compact += "accessible_projects_count=$($ProjectRows.Count)"
$Compact += "candidate_projects_count=$($Candidates.Count)"
foreach ($Candidate in $Candidates) { $Compact += "candidate_project=$($Candidate.projectId)|$($Candidate.displayName)" }
$Compact += "hosting_configured=$HostingConfigured"
$Compact += "firebaserc_exists=$FirebasercExists"
$Compact += "crm_evidence_folders=$CrmEvidence"
$Compact += "aseguradoras_evidence_folders=$InsurerEvidence"
$Compact += "next_action=$NextAction"
$Compact += "report=$Report"
$ClipboardText = $Compact -join "`r`n"
try { $ClipboardText | Set-Clipboard } catch {}

Write-Host ''
Write-Host $ClipboardText
Write-Host ''
Write-Host 'Resultado copiado al portapapeles. Pegalo completo en el chat.'
exit 0
