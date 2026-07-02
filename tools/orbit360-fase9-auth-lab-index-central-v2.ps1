param([string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core")

$ErrorActionPreference = "Stop"

$App = Join-Path $Repo "orbit360-platform"
$Reports = Join-Path $Repo "_orbit360_reports"
$Tmp = Join-Path $Repo "_orbit360_tmp"
$ExpectedBranch = "backend/v99-clean-claude-lab-20260701"

New-Item -ItemType Directory -Force -Path $Reports, $Tmp | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "FASE9-V2-AUTH-FIREBASE-LAB-INDEX-CENTRAL-$Stamp.txt"
$ServerJs = Join-Path $Tmp "fase9-v2-auth-lab-server-$Stamp.js"
$ServerOut = Join-Path $Tmp "fase9-v2-auth-lab-server-out-$Stamp.log"
$ServerErr = Join-Path $Tmp "fase9-v2-auth-lab-server-err-$Stamp.log"
$ResultJson = Join-Path $Tmp "fase9-v2-auth-lab-result-$Stamp.json"
$ChromeProfile = Join-Path $Tmp "chrome-fase9-v2-auth-lab-$Stamp"

function Add-Report($Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }
function Free-Port($Ports) {
  foreach ($p in $Ports) {
    try { $c = New-Object Net.Sockets.TcpClient; $c.Connect("127.0.0.1", $p); $c.Close() }
    catch { return $p }
  }
  return $null
}

Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - FASE 9 V2 - AUTH FIREBASE LAB SOBRE INDEX CENTRAL"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "App: $App"
Add-Report "Restricciones: no deploy, no Hosting, no producción, no datos reales nuevos"
Add-Report "============================================================"
Add-Report ""

$ServerProc = $null
$ChromeProc = $null

try {
  Set-Location $Repo

  Add-Report "== 1. Sincronizar rama =="
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  Add-Report "Rama actual: $Branch"
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta. Esperada: $ExpectedBranch" }
  git pull | ForEach-Object { Add-Report $_ }
  $Head = (git rev-parse --short HEAD).Trim()
  Add-Report "HEAD tras pull: $Head"
  Add-Report ""

  Add-Report "== 2. Verificar archivos Fase 9 V2 =="
  $Index = Join-Path $App "index.html"
  $Loader = Join-Path $App "core\backend-lab-loader.js"
  $Init = Join-Path $App "core\backend-lab-init.js"
  $Auth = Join-Path $App "core\auth.js"
  $ConfigLocal = Join-Path $App "core\auth-firebase.config.local.js"

  foreach ($Path in @($Index, $Loader, $Init, $Auth)) {
    if (Test-Path $Path) { Add-Report "OK: existe $($Path.Replace($App,''))" }
    else { throw "Falta archivo requerido: $Path" }
  }
  if (Test-Path $ConfigLocal) { Add-Report "OK: existe config local ignorada por Git." }
  else { throw "Falta core/auth-firebase.config.local.js local" }
  Add-Report ""

  Add-Report "== 3. Enlazar loader + init LAB en index.html =="
  $IndexText = Get-Content $Index -Raw
  $LoaderTag = '<script src="core/backend-lab-loader.js?v1268"></script>'
  $InitTag = '<script src="core/backend-lab-init.js?v1268"></script>'
  $Needle = '<script src="core/comisiones-eng.js?v1268"></script>'

  if ($IndexText -notmatch "core/backend-lab-loader\.js") {
    if (-not $IndexText.Contains($Needle)) { throw "No se encontró punto para insertar loader LAB" }
    $IndexText = $IndexText.Replace($Needle, $Needle + "`r`n  " + $LoaderTag)
    Add-Report "OK: loader LAB insertado."
  } else {
    Add-Report "OK: loader LAB ya estaba en index."
  }

  if ($IndexText -notmatch "core/backend-lab-init\.js") {
    if ($IndexText.Contains($LoaderTag)) {
      $IndexText = $IndexText.Replace($LoaderTag, $LoaderTag + "`r`n  " + $InitTag)
      Add-Report "OK: init LAB insertado después del loader."
    } else {
      $IndexText = $IndexText -replace '(<script src="core/backend-lab-loader\.js[^>]*></script>)', '$1' + "`r`n  " + $InitTag
      Add-Report "OK: init LAB insertado por patrón."
    }
  } else {
    Add-Report "OK: init LAB ya estaba en index."
  }

  Set-Content -Path $Index -Value $IndexText -Encoding UTF8
  $IndexText = Get-Content $Index -Raw
  $LoaderPos = $IndexText.IndexOf("core/backend-lab-loader.js")
  $InitPos = $IndexText.IndexOf("core/backend-lab-init.js")
  $StorePos = $IndexText.IndexOf("data/store.js")
  $LabPos = $IndexText.IndexOf("data/store-firestore-lab.local.js")
  $SeedPos = $IndexText.IndexOf("data/seed.js")
  Add-Report "Orden: loader=$LoaderPos init=$InitPos store=$StorePos lab=$LabPos seed=$SeedPos"
  if (-not ($LoaderPos -ge 0 -and $InitPos -gt $LoaderPos -and $StorePos -gt $InitPos -and $LabPos -gt $StorePos -and $SeedPos -gt $LabPos)) {
    throw "Orden loader/init/store/lab/seed incorrecto"
  }
  Add-Report "OK: orden loader -> init -> store -> lab -> seed correcto."
  Add-Report ""

  Add-Report "== 4. Validar sintaxis JS =="
  foreach ($Js in @($Loader, $Init, $Auth, (Join-Path $App "data\store-firestore-lab.local.js"))) {
    $Out = & node --check $Js 2>&1
    if ($LASTEXITCODE -ne 0) { Add-Report ($Out | Out-String); throw "Error node --check en $Js" }
    Add-Report "OK: node --check $($Js.Replace($App,''))"
  }
  Add-Report ""

  Add-Report "== 5. Servidor y smoke visible =="
  $Port = Free-Port @(5177,5178,5179,5180)
  if (-not $Port) { throw "Sin puerto libre" }
  Add-Report "Puerto: $Port"

  $ServerCode = @'
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const port = Number(process.argv[3]);
const resultPath = process.argv[4];
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
function send(res,status,type,body){res.writeHead(status,{'content-type':type});res.end(body);}
const smokeHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Orbit Fase 9 V2 Auth LAB</title><style>body{font-family:Arial;margin:24px;background:#f6f7f8}.card{background:#fff;border:1px solid #ddd;border-radius:12px;padding:18px}pre{background:#111;color:#0f0;padding:12px;border-radius:8px;white-space:pre-wrap;max-height:540px;overflow:auto}</style></head><body><div class="card"><h1>Orbit 360 - Fase 9 V2 Auth LAB</h1><p>Si aparece login dentro de la ventana, ingresa con el usuario LAB. El smoke esperará hasta 90 segundos.</p><pre id="out">Esperando...</pre><iframe id="app" src="/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&smoke=fase9v2" style="width:100%;height:720px;border:1px solid #ccc;border-radius:10px"></iframe></div><script>
const out=document.getElementById('out'); const start=Date.now(); const errors=[];
window.addEventListener('error',e=>errors.push({type:'outer-error',message:e.message||'',source:e.filename||'',line:e.lineno||0}));
async function post(obj){out.textContent=JSON.stringify(obj,null,2); try{await fetch('/__fase9v2_result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(obj)}); out.textContent+='\\n\\nResultado enviado. Puedes cerrar esta ventana.';}catch(e){out.textContent+='\\nERROR POST: '+(e.message||String(e));}}
function inspect(){try{const w=document.getElementById('app').contentWindow; const store=w.Orbit&&w.Orbit.store; const backend=w.OrbitBackend||w.ORBIT_BACKEND||{}; const status=backend.status?backend.status():(store&&store._labStatus?store._labStatus():{}); const api=['all','get','where','find','insert','update','remove','on','_emit','pref','setPref','init','reseed','raw']; const apiStatus={}; api.forEach(k=>apiStatus[k]=!!(store&&typeof store[k]==='function')); let fb=false, apps=0, authUser=null; try{fb=!!w.firebase; apps=w.firebase&&w.firebase.apps?w.firebase.apps.length:0; const u=w.firebase&&w.firebase.auth?w.firebase.auth().currentUser:null; authUser=u?{uid:u.uid,email:u.email}:null;}catch(e){} const result={href:w.location.href,title:w.document.title,readyState:w.document.readyState,orbitExists:!!w.Orbit,storeExists:!!store,apiStatus,apiComplete:api.every(k=>apiStatus[k]),backendMode:backend.mode||null,backendTenant:backend.tenantId||backend.tenant||null,backendApiVersion:backend.apiVersion||null,collectionsLength:backend.collections?backend.collections.length:null,firebaseDetected:fb,firebaseApps:apps,firebaseInit:backend.firebaseInit||null,firebaseInitError:backend.firebaseInitError||null,firebaseProjectId:backend.firebaseProjectId||null,authUser,status,errors,elapsedMs:Date.now()-start}; const ok=result.apiComplete&&result.backendMode==='firestore-lab'&&result.backendTenant==='alianzas-soluciones'&&result.firebaseDetected&&result.firebaseApps>0&&result.authUser&&result.status&&result.status.snapshotAttachedCount>0; if(ok||Date.now()-start>90000){result.contractOk=!!ok; post(result);} else {out.textContent='Esperando Auth/Firebase LAB... '+Math.round((Date.now()-start)/1000)+'s\\n'+JSON.stringify(result,null,2); setTimeout(inspect,1200);}}catch(e){if(Date.now()-start>90000)post({contractOk:false,error:String(e&&e.message||e),errors,elapsedMs:Date.now()-start}); else setTimeout(inspect,1200);}}
setTimeout(inspect,1500);
</script></body></html>`;
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://127.0.0.1'); if(req.method==='GET'&&url.pathname==='/__fase9v2_smoke.html')return send(res,200,'text/html; charset=utf-8',smokeHtml); if(req.method==='POST'&&url.pathname==='/__fase9v2_result'){let body=''; req.on('data',c=>body+=c); req.on('end',()=>{fs.writeFileSync(resultPath,body||'{}','utf8'); send(res,200,'application/json; charset=utf-8','{"ok":true}');}); return;} let filePath=decodeURIComponent(url.pathname); if(filePath==='/')filePath='/index.html'; const full=path.normalize(path.join(root,filePath)); if(!full.startsWith(path.normalize(root)))return send(res,403,'text/plain','Forbidden'); fs.readFile(full,(err,data)=>{if(err)return send(res,404,'text/plain; charset=utf-8','Not found: '+filePath); send(res,200,types[path.extname(full).toLowerCase()]||'application/octet-stream',data);});});
server.listen(port,'127.0.0.1',()=>console.log('FASE9V2_SERVER_READY http://127.0.0.1:'+port));
'@
  Set-Content -Path $ServerJs -Value $ServerCode -Encoding UTF8
  $ServerProc = Start-Process -FilePath "node" -ArgumentList "`"$ServerJs`" `"$App`" $Port `"$ResultJson`"" -RedirectStandardOutput $ServerOut -RedirectStandardError $ServerErr -WindowStyle Hidden -PassThru
  Start-Sleep -Seconds 2

  $Health = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones" -UseBasicParsing -TimeoutSec 10
  Add-Report "HTTP index central LAB: $($Health.StatusCode)"

  $ChromeCandidates = @("C:\Program Files\Google\Chrome\Application\chrome.exe", "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
  $Chrome = $ChromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $Chrome) { throw "No se encontró Google Chrome" }
  New-Item -ItemType Directory -Force -Path $ChromeProfile | Out-Null
  $SmokeUrl = "http://127.0.0.1:$Port/__fase9v2_smoke.html"
  $ChromeProc = Start-Process -FilePath $Chrome -ArgumentList @("--new-window","--no-first-run","--no-default-browser-check","--user-data-dir=$ChromeProfile",$SmokeUrl) -PassThru
  Add-Report "Smoke URL: $SmokeUrl"
  Add-Report "Chrome abierto. Si pide login, usa credenciales LAB. Esperando resultado hasta 90 segundos."

  $Got = $false
  for($i=0; $i -lt 100; $i++) { if(Test-Path $ResultJson){$Got=$true; break}; Start-Sleep -Seconds 1 }
  if(-not $Got){ throw "No llegó resultado POST Fase 9 V2" }

  $Result = Get-Content $ResultJson -Raw | ConvertFrom-Json
  Add-Report "Resultado JSON:"
  Add-Report ($Result | ConvertTo-Json -Depth 30)

  if($Result.contractOk){
    Add-Report "RESULTADO FASE 9 V2: COMPLETADO"
    git add orbit360-platform/index.html orbit360-platform/core/auth.js orbit360-platform/core/backend-lab-loader.js orbit360-platform/core/backend-lab-init.js tools/orbit360-fase9-auth-lab-index-central.ps1 tools/orbit360-fase9-auth-lab-index-central-v2.ps1 tools/orbit360-recuperar-config-firebase-lab.ps1 orbit360-platform/docs/GATE-FASE9-AUTH-FIREBASE-LAB-INDEX-CENTRAL.md
    git commit -m "feat: conectar Auth Firebase LAB en index central"
    git push -u origin $ExpectedBranch
    Add-Report "OK: commit/push Fase 9 V2 completado."
  } else {
    Add-Report "RESULTADO FASE 9 V2: FALLIDO_O_BLOQUEADO"
    Add-Report "No se hace commit/push automático porque el contrato no pasó."
  }

} catch {
  Add-Report "ERROR GENERAL: $($_.Exception.Message)"
} finally {
  if($ChromeProc -and -not $ChromeProc.HasExited){ try{Stop-Process -Id $ChromeProc.Id -Force; Add-Report "OK: Chrome temporal cerrado."}catch{} }
  if($ServerProc -and -not $ServerProc.HasExited){ try{Stop-Process -Id $ServerProc.Id -Force; Add-Report "OK: servidor temporal cerrado."}catch{} }
  Add-Report ""
  Add-Report "FIN FASE 9 V2. Reporte: $Report"
  Get-Content $Report -Raw | Set-Clipboard
  notepad $Report
}