param([string]$RepoPath='')

$ErrorActionPreference='Continue'
try {
  [Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
  $OutputEncoding=[Console]::OutputEncoding
  chcp 65001 | Out-Null
} catch {}

function Find-OrbitRepo([string]$Requested) {
  $Candidates=@(
    $Requested,
    (Get-Location).Path,
    (Join-Path $env:USERPROFILE 'OneDrive\Documentos\GitHub\orbit360-core'),
    (Join-Path $env:USERPROFILE 'Documents\GitHub\orbit360-core'),
    (Join-Path $env:USERPROFILE 'OneDrive\Documents\GitHub\orbit360-core'),
    'C:\orbit360-core'
  ) | Where-Object { $_ }
  foreach($Candidate in $Candidates){
    try { $Full=[IO.Path]::GetFullPath($Candidate) } catch { continue }
    if(-not (Test-Path (Join-Path $Full '.git'))){ continue }
    $Origin=(& git -C $Full remote get-url origin 2>$null | Out-String).Trim()
    if($Origin -match 'paulaosoriof86[/\\:]orbit360-core'){ return $Full }
  }
  return $null
}

function Add([System.Collections.Generic.List[string]]$Lines,[string]$Text=''){ $Lines.Add($Text) }
function Add-FileExcerpt([System.Collections.Generic.List[string]]$Lines,[string]$Label,$File){
  Add $Lines ''
  Add $Lines ("== {0} ==" -f $Label)
  if(-not $File){ Add $Lines 'NOT_FOUND'; return }
  Add $Lines ("path={0}" -f $File.FullName)
  $Content=@(Get-Content $File.FullName -Encoding UTF8 -ErrorAction SilentlyContinue)
  if(-not $Content.Count){ Add $Lines 'EMPTY'; return }
  $Signals=@($Content | Where-Object { $_ -match '(?i)\[FAIL\]|ERROR|FALL|BLOQUEAD|RESULT|exit code|scenario|resumen|protected|policy|contract|harness' })
  if($Signals.Count){
    $Signals | Select-Object -Last 120 | ForEach-Object { Add $Lines ([string]$_) }
  } else {
    $Content | Select-Object -Last 80 | ForEach-Object { Add $Lines ([string]$_) }
  }
}

$Repo=Find-OrbitRepo $RepoPath
if(-not $Repo){
  $Text="ORBIT360_OP2_DIAGNOSIS`nstatus=REPO_NOT_FOUND`nno_rerun=YES`nno_changes=YES"
  $Text | Set-Clipboard
  Write-Host $Text
  exit 0
}

$Reports=Join-Path $Repo '_orbit360_reports'
$Stamp=Get-Date -Format 'yyyyMMdd_HHmmss'
$Out=Join-Path $Reports "DIAGNOSTICO-ULTIMO-FALLO-OP2-$Stamp.txt"
$Lines=New-Object 'System.Collections.Generic.List[string]'

Add $Lines '============================================================'
Add $Lines 'ORBIT 360 - DIAGNOSTICO READ-ONLY DEL ULTIMO FALLO OP2'
Add $Lines ("Fecha local: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add $Lines ("Repo: {0}" -f $Repo)
Add $Lines 'No rerun. No git changes. No deploy. No writes. No secrets.'
Add $Lines '============================================================'

$Outer=Get-ChildItem $Reports -File -Filter 'RUN-LIMPIO-ASEGURADORAS-OP2-*.txt' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$Closure=Get-ChildItem $Reports -File -Filter 'CLOSURE-CRM-OP1-ASEGURADORAS-OP2-V1220-*.txt' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$Visual=Get-ChildItem $Reports -File -Filter 'VISUAL-OP2-PLATAFORMAS-*.txt' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$Evidence=Get-ChildItem $Reports -Directory -Filter 'VISUAL-OP2-PLATAFORMAS-*' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1

Add-FileExcerpt $Lines 'OUTER RUNNER' $Outer
Add-FileExcerpt $Lines 'FOCUSED CLOSURE' $Closure
Add-FileExcerpt $Lines 'FOCUSED VISUAL REPORT' $Visual

Add $Lines ''
Add $Lines '== RESULTS JSONL =='
if($Evidence){
  $Jsonl=Join-Path $Evidence.FullName 'results.jsonl'
  Add $Lines ("evidence={0}" -f $Evidence.FullName)
  if(Test-Path $Jsonl){
    $Rows=@(Get-Content $Jsonl -Encoding UTF8 -ErrorAction SilentlyContinue | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    Add $Lines ("rows={0}" -f $Rows.Count)
    foreach($Row in $Rows){
      try {
        $Obj=$Row | ConvertFrom-Json
        Add $Lines ("scenario={0} ok={1} role={2} errors={3}" -f $Obj.scenario,$Obj.ok,$Obj.role,(@($Obj.errors).Count))
        if($Obj.ok -ne $true){ Add $Lines $Row }
      } catch { Add $Lines ("invalid_jsonl={0}" -f $Row) }
    }
  } else { Add $Lines 'results_jsonl=NOT_FOUND' }
} else { Add $Lines 'evidence=NOT_FOUND' }

Add $Lines ''
Add $Lines '== SAFE TEMP CLEANUP =='
$TempPath=''
if($Outer){
  $OuterRaw=Get-Content $Outer.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
  $Match=[regex]::Match($OuterRaw,'temporary_workspace_removed=NO \| path=([^\r\n]+)')
  if($Match.Success){ $TempPath=$Match.Groups[1].Value.Trim() }
}
if($TempPath -and $TempPath.StartsWith((Join-Path $env:TEMP 'orbit360-ays-safe-'),[StringComparison]::OrdinalIgnoreCase)){
  try {
    Remove-Item $TempPath -Recurse -Force -ErrorAction Stop
    Add $Lines 'stale_temp_removed=YES'
  } catch {
    Add $Lines ("stale_temp_removed=NO | path={0} | reason={1}" -f $TempPath,($_.Exception.Message -replace "`r|`n",' '))
  }
} elseif($TempPath){
  Add $Lines ("stale_temp_removed=SKIPPED_UNSAFE_PATH | path={0}" -f $TempPath)
} else { Add $Lines 'stale_temp_removed=NOT_REQUIRED' }

Add $Lines ''
Add $Lines 'status=DIAGNOSIS_ONLY_COMPLETE'
Add $Lines 'next_action=Correct only the exact failed check; do not rerun broad validation.'
Add $Lines ("report={0}" -f $Out)

[IO.File]::WriteAllLines($Out,$Lines,(New-Object Text.UTF8Encoding($false)))
$Text=[IO.File]::ReadAllText($Out,[Text.Encoding]::UTF8)
$Text | Set-Clipboard
Write-Host $Text
try { Start-Process notepad.exe -ArgumentList ('"'+$Out+'"') } catch {}
exit 0
