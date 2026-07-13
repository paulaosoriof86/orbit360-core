param([string]$Repo="C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core")
$ErrorActionPreference='Stop';$Branch='ays/backend-tenant-lab-v99-20260703';$Reports=Join-Path $Repo '_orbit360_reports';$App=Join-Path $Repo 'orbit360-platform';$Stamp=Get-Date -Format 'yyyyMMdd_HHmmss';$Master=Join-Path $Reports "CLOSURE-CRM-OP1-ASEGURADORAS-OP2-$Stamp.txt";$script:Port=0;$script:Crm=$null;$script:Op2=$null
try{[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false);chcp 65001|Out-Null}catch{}
function Add([string]$t=''){Add-Content $Master $t -Encoding UTF8}
function Step([string]$n,[scriptblock]$b){Add '';Add "== $n ==";try{&$b;Add "OK: $n";$true}catch{Add("ERROR: "+$_.Exception.Message);$false}}
function Free([int]$p){$l=$null;try{$l=New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback,$p);$l.Start();$true}catch{$false}finally{if($l){try{$l.Stop()}catch{}}}}
function Port(){for($p=5000;$p-le 5040;$p++){if(Free $p){return $p}};throw 'No free loopback port between 5000 and 5040.'}
function Text($f){[System.IO.File]::ReadAllText($f.FullName)}
function HasScenarios($txt,$ids,$prefix='OK'){foreach($id in $ids){if($txt-notmatch('(?m)^'+[regex]::Escape($prefix)+'\s+'+[regex]::Escape($id)+'\s')){return $false}};return $true}
function FindCrm(){
 $ids=@('dir-clientes-desktop','dir-cliente-desktop','dir-calidad-desktop','dir-poliza-desktop','op-cliente-tablet','op-calidad-tablet','ase-cliente-mobile','ase-calidad-mobile','ase-poliza-mobile','dir-portal-mobile')
 foreach($f in @(Get-ChildItem $Reports -File -Filter 'VISUAL-CRM-OP1-*.txt'|Sort-Object LastWriteTime -Descending)){$t=Text $f;$d=Join-Path $Reports $f.BaseName;$shots=@($ids|Where-Object{-not(Test-Path(Join-Path $d($_+'.png'))) });if($t-match'10/10' -and (HasScenarios $t $ids) -and !$shots.Count){return $f}}
 throw 'No complete CRM 10/10 evidence was found.'
}
function FindPartialOp2(){
 $ok=@('dir-directorio-desktop','dir-resumen-desktop','dir-contactos-desktop','dir-bancos-desktop','dir-documentos-desktop','dir-tarifas-desktop','op-directorio-tablet','op-resumen-tablet','op-bancos-tablet','ase-directorio-mobile','ase-resumen-mobile','ase-bancos-mobile')
 $failed=@('dir-plataformas-desktop','op-plataformas-tablet','ase-plataformas-mobile')
 foreach($f in @(Get-ChildItem $Reports -File -Filter 'VISUAL-ASEGURADORAS-OP2-*.txt'|Sort-Object LastWriteTime -Descending)){$t=Text $f;$d=Join-Path $Reports $f.BaseName;$shots=@($ok|Where-Object{-not(Test-Path(Join-Path $d($_+'.png'))) });$validators=$t-match'orbit360-validar-aseguradoras-op2-v1218' -and $t-match'orbit360-validar-politica-recursos-aseguradoras-v1218';if($t-match'12/15' -and (HasScenarios $t $ok) -and (HasScenarios $t $failed 'FALLÓ') -and !$shots.Count -and $validators){return $f}}
 throw 'No valid OP2 12/15 partial evidence was found.'
}
function Native([string]$exe,[string[]]$args,[string]$fail){&$exe @args 2>&1|ForEach-Object{Add $_};if($LASTEXITCODE-ne0){throw $fail}}
New-Item -ItemType Directory -Force $Reports|Out-Null;Set-Content $Master '============================================================' -Encoding UTF8;Add 'ORBIT 360 - CIERRE FOCALIZADO CRM OP1 + ASEGURADORAS OP2 V1.218';Add('Local time: '+(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'));Add 'Reuses CRM 10/10 and OP2 12/15. Runs only 3 pending platform scenarios.';Add 'No deploy, production, merge, main, real data, commit or push.';Add '============================================================'
$ok=Step '1. Verify branch and reusable evidence' {if((git -C $Repo branch --show-current).Trim()-ne$Branch){throw 'Wrong branch.'};$script:Crm=FindCrm;$script:Op2=FindPartialOp2;Add('CRM reused: '+$script:Crm.FullName);Add('OP2 12/15 reused: '+$script:Op2.FullName)}
if($ok){$ok=Step '2. Validate focused harness syntax and contract' {Native node @((Join-Path $Repo 'tools\orbit360-validar-smoke-op2-plataformas-focused-v1218.mjs'),$Repo) 'Focused harness validator failed.'}}
if($ok){$ok=Step '3. Select safe port automatically' {$script:Port=Port;Add("Selected URL: http://127.0.0.1:$script:Port")}}
if($ok){$ok=Step '4. Run only the 3 pending platform scenarios' {Native node @((Join-Path $Repo 'tools\orbit360-smoke-op2-plataformas-focused-v1218.mjs'),'--repo',$Repo,'--app',$App,'--port',[string]$script:Port) 'Focused platform smoke failed.'}}
if($ok){$ok=Step '5. Verify focused 3/3 evidence and combine 15/15' {$f=Get-ChildItem $Reports -File -Filter 'VISUAL-OP2-PLATAFORMAS-*.txt'|Sort-Object LastWriteTime -Descending|Select-Object -First 1;if(!$f){throw 'Focused report missing.'};$t=Text $f;$ids=@('dir-plataformas-desktop','op-plataformas-tablet','ase-plataformas-mobile');if($t-notmatch'3/3' -or -not(HasScenarios $t $ids)){throw 'Focused evidence is not 3/3.'};Add('Focused evidence: '+$f.FullName);Add 'COMBINED CRM OP1: 10/10';Add 'COMBINED ASEGURADORAS OP2: 12 reused + 3 focused = 15/15';Add 'VISUAL STATUS: CRM OP1 CLOSED';Add 'VISUAL STATUS: ASEGURADORAS OP2 CLOSED'}}
Add '';if($ok){Add 'RESULT: CRM OP1 AND ASEGURADORAS OP2 VISUAL GATES CLOSED';Add 'Next operational action: separate GT/CO insurer-directory dry-runs, without mixing sources.'}else{Add 'RESULT: BLOCKED AT FIRST REAL FAILURE';Add 'Previously approved evidence remains valid and was not rerun.'};Add('Final HEAD: '+(git -C $Repo rev-parse HEAD).Trim());Add 'No deploy, production, merge, main, secrets, real data, automatic commit or push.';Add('Master report: '+$Master);try{Get-Content $Master -Raw|Set-Clipboard;notepad $Master}catch{};if(!$ok){exit 1}
