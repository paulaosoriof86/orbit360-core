param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = "Stop"

$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Tenant = "alianzas-soluciones"
$App = Join-Path $Repo "orbit360-platform"
$Reports = Join-Path $Repo "_orbit360_reports"
$Tmp = Join-Path $Repo "_orbit360_tmp"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "SMOKE-AYS-LAB-V99-$Stamp.txt"
$ServerJs = Join-Path $Tmp "smoke-ays-lab-v99-server-$Stamp.js"
$ServerOut = Join-Path $Tmp "smoke-ays-lab-v99-server-out-$Stamp.log"
$ServerErr = Join-Path $Tmp "smoke-ays-lab-v99-server-err-$Stamp.log"
$ResultJson = Join-Path $Tmp "smoke-ays-lab-v99-result-$Stamp.json"
$ChromeProfile = Join-Path $Tmp "chrome-smoke-ays-lab-v99-$Stamp"

function Add-Report([string]$Text) {
  Add-Content -Path $Report -Value $Text -Encoding UTF8
}

function Free-Port([int[]]$Ports) {
  foreach ($p in $Ports) {
    try {
      $c = New-Object Net.Sockets.TcpClient
      $c.Connect("127.0.0.1", $p)
      $c.Close()
    } catch { return $p }
  }
  return $null
}

function Stop-Orbit-NodeServers {
  try {
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
      Where-Object { $_.CommandLine -match "orbit360|smoke-ays-lab|static-server" } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  } catch {}
}

New-Item -ItemType Directory -Force -Path $Reports, $Tmp | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - SMOKE A&S BACKEND LAB V99"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Rama esperada: $ExpectedBranch"
Add-Report "Tenant: $Tenant"
Add-Report "Restricciones: NO deploy, NO Hosting, NO produccion, NO secretos, NO datos reales en codigo"
Add-Report "============================================================"
Add-Report ""

$ServerProc = $null
$ChromeProc = $null

try {
  if (-not (Test-Path $Repo)) { throw "No existe repo: $Repo" }
  if (-not (Test-Path $App)) { throw "No existe app: $App" }

  Set-Location $Repo

  Add-Report "== 1. Verificar rama obligatoria =="
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  Add-Report "Rama actual: $Branch"
  if ($Branch -ne $ExpectedBranch) {
    throw "Rama incorrecta. Debes cambiar a: $ExpectedBranch. No se ejecuta smoke para evitar tocar rama equivocada."
  }
  $Head = (git rev-parse HEAD).Trim()
  Add-Report "HEAD actual: $Head"
  Add-Report "OK: rama obligatoria confirmada."
  Add-Report ""

  Add-Report "== 2. Verificar archivos backend LAB =="
  $Index = Join-Path $App "index.html"
  $Loader = Join-Path $App "core\backend-lab-loader.js"
  $Init = Join-Path $App "core\backend-lab-init.js"
  $StoreLab = Join-Path $App "data\store-firestore-lab.local.js"
  $Rules = Join-Path $Repo "firestore.rules"
  $ConfigLocal = Join-Path $App "core\auth-firebase.config.local.js"

  foreach ($Path in @($Index, $Loader, $Init, $StoreLab, $Rules)) {
    if (Test-Path $Path) { Add-Report "OK: existe $Path" }
    else { throw "Falta archivo requerido: $Path" }
  }

  if (Test-Path $ConfigLocal) {
    Add-Report "OK: existe config local ignorada por Git: core/auth-firebase.config.local.js"
  } else {
    Add-Report "BLOQUEO: no existe core/auth-firebase.config.local.js local. Se puede validar estructura, pero no Auth/Firebase real."
  }
  Add-Report ""

  Add-Report "== 3. Verificar reglas Firestore alineadas con adapter LAB =="
  $RulesText = Get-Content $Rules -Raw -Encoding UTF8
  if ($RulesText.Contains("match /tenantId/{tenantId}/{document=**}")) {
    Add-Report "OK: firestore.rules permite ruta real adapter LAB: tenantId/{tenantId}/{document=**}"
  } else {
    throw "firestore.rules no contiene ruta real adapter LAB tenantId/{tenantId}/{document=**}"
  }
  if ($RulesText.Contains("match /tenants/{tenantId}/data/{document=**}")) {
    Add-Report "OK: firestore.rules conserva ruta documental/futura: tenants/{tenantId}/data/{document=**}"
  } else {
    Add-Report "ADVERTENCIA: no se encontro ruta documental/futura tenants/{tenantId}/data/{document=**}"
  }
  Add-Report ""

  Add-Report "== 4. Verificar sintaxis JS =="
  foreach ($Js in @($Loader, $Init, $StoreLab)) {
    $Out = & node --check $Js 2>&1
    if ($LASTEXITCODE -ne 0) {
      Add-Report ($Out | Out-String)
      throw "Error node --check en $Js"
    }
    Add-Report "OK: node --check $Js"
  }
  Add-Report ""

  Add-Report "== 5. Verificar index central y estrategia de smoke =="
  $IndexText = Get-Content $Index -Raw -Encoding UTF8
  $HasLoader = $IndexText.Contains("core/backend-lab-loader.js")
  $HasInit = $IndexText.Contains("core/backend-lab-init.js")
  $HasStore = $IndexText.Contains("data/store.js")
  $HasLab = $IndexText.Contains("data/store-firestore-lab.local.js")
  $HasSeed = $IndexText.Contains("data/seed.js")

  Add-Report "Index contiene backend-lab-loader.js: $HasLoader"
  Add-Report "Index contiene backend-lab-init.js: $HasInit"
  Add-Report "Index contiene data/store.js: $HasStore"
  Add-Report "Index contiene store-firestore-lab.local.js: $HasLab"
  Add-Report "Index contiene data/seed.js: $HasSeed"

  if (-not $HasStore) { throw "index.html no carga data/store.js" }
  if (-not $HasLab) { throw "index.html no carga data/store-firestore-lab.local.js" }
  if (-not $HasSeed) { throw "index.html no carga data/seed.js" }

  if (-not ($HasLoader -and $HasInit)) {
    Add-Report "ADVERTENCIA CONTROLADA: index.html aun no carga loader/init LAB."
    Add-Report "El servidor temporal de este smoke inyectara loader/init solo en memoria para validar backend sin modificar index.html."
    Add-Report "Pendiente permanente: integrar loader/init en index central cuando Paula autorice cambio funcional."
  } else {
    Add-Report "OK: index.html ya contiene loader/init LAB."
  }
  Add-Report ""

  Add-Report "== 6. Levantar servidor local temporal =="
  Stop-Orbit-NodeServers
  $Port = Free-Port @(5177,5178,5179,5180,5181)
  if (-not $Port) { throw "No hay puerto libre entre 5177-5181" }
  Add-Report "Puerto seleccionado: $Port"

  $ServerCode = @'
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const port = Number(process.argv[3]);
const resultPath = process.argv[4];
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp'};
function send(res,status,type,body){res.writeHead(status,{'content-type':type,'cache-control':'no-store, no-cache, must-revalidate','pragma':'no-cache','expires':'0'});res.end(body);}
function injectLab(html){
  const loader = '<script src="core/backend-lab-loader.js?v=smoke-ays-lab-v99"></script>\n  <script src="core/backend-lab-init.js?v=smoke-ays-lab-v99"></script>';
  if (!html.includes('core/backend-lab-loader.js')) {
    html = html.replace('<script src="data/store.js', loader + '\n  <script src="data/store.js');
  }
  if (html.includes('core/backend-lab-loader.js') && !html.includes('core/backend-lab-init.js')) {
    html = html.replace('<script src="data/store.js', '<script src="core/backend-lab-init.js?v=smoke-ays-lab-v99"></script>\n  <script src="data/store.js');
  }
  return html;
}
const smokeHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Orbit 360 Smoke A&S LAB v99</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:24px;background:#f6f7f8;color:#1E2227}.card{background:#fff;border:1px solid #ddd;border-radius:12px;padding:18px;margin-bottom:16px}pre{background:#111;color:#0f0;padding:12px;border-radius:8px;white-space:pre-wrap;max-height:360px;overflow:auto}iframe{width:100%;height:720px;border:1px solid #ccc;border-radius:10px}</style></head><body><div class="card"><h1>Orbit 360 - Smoke A&S LAB v99</h1><p>Si aparece login, ingresa con usuario LAB. El smoke espera hasta 90 segundos y genera reporte automatico.</p><pre id="out">Iniciando...</pre></div><iframe id="app" src="/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&smoke=ays-lab-v99"></iframe><script>
const out=document.getElementById('out'); const start=Date.now(); const errors=[]; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
window.addEventListener('error',e=>errors.push({type:'outer-error',message:e.message||'',source:e.filename||'',line:e.lineno||0}));
async function post(obj){out.textContent=JSON.stringify(obj,null,2); try{await fetch('/__smoke_result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(obj)}); out.textContent+='\n\nResultado enviado. Puedes cerrar esta ventana.';}catch(e){out.textContent+='\nERROR POST: '+(e.message||String(e));}}
function safe(obj){try{return JSON.parse(JSON.stringify(obj));}catch(e){return String(obj);} }
async function inspect(){try{const frame=document.getElementById('app'); const w=frame.contentWindow; const store=w.Orbit&&w.Orbit.store; const backend=w.OrbitBackend||w.ORBIT_BACKEND||{}; const status=backend.status?backend.status():(store&&store._labStatus?store._labStatus():{}); const api=['all','get','where','find','insert','update','remove','on','_emit','pref','setPref','init','reseed','raw']; const apiStatus={}; api.forEach(k=>apiStatus[k]=!!(store&&typeof store[k]==='function')); let fb=false, apps=0, authUser=null; try{fb=!!w.firebase; apps=w.firebase&&w.firebase.apps?w.firebase.apps.length:0; const u=w.firebase&&w.firebase.auth?w.firebase.auth().currentUser:null; authUser=u?{uid:u.uid,email:u.email}:null;}catch(e){}
const base={href:w.location.href,title:w.document.title,readyState:w.document.readyState,orbitExists:!!w.Orbit,storeExists:!!store,apiStatus,apiComplete:api.every(k=>apiStatus[k]),backendMode:backend.mode||null,backendTenant:backend.tenantId||backend.tenant||null,backendApiVersion:backend.apiVersion||null,collectionsLength:backend.collections?backend.collections.length:null,firebaseDetected:fb,firebaseApps:apps,authUser,status:safe(status),errors,elapsedMs:Date.now()-start};
const ready=base.apiComplete&&base.backendMode==='firestore-lab'&&base.backendTenant==='alianzas-soluciones'&&fb&&apps>0&&authUser&&status&&status.snapshotAttachedCount>0;
if(!ready){ if(Date.now()-start>90000){base.contractOk=false; base.blockedReason='LAB no llego a estado listo antes de timeout'; return post(base);} out.textContent='Esperando Auth/Firebase LAB... '+Math.round((Date.now()-start)/1000)+'s\n'+JSON.stringify(base,null,2); setTimeout(inspect,1200); return; }
const smokeId='smoke_ays_lab_'+Date.now(); const row={id:smokeId,tipo:'smoke_ays_lab',titulo:'Smoke A&S LAB v99',tenantId:'alianzas-soluciones',fecha:new Date().toISOString(),ficticio:true,createdBySmoke:true};
let crud={insert:false,get:false,update:false,remove:false,afterRemoveGone:false,error:null};
try{ store.insert('actividades',row); crud.insert=true; await sleep(1800); const got=store.get('actividades',smokeId); crud.get=!!got; store.update('actividades',smokeId,{estado:'actualizado_smoke',updatedBySmoke:true}); crud.update=true; await sleep(900); store.remove('actividades',smokeId); crud.remove=true; await sleep(900); crud.afterRemoveGone=!store.get('actividades',smokeId);}catch(e){crud.error=String(e&&e.message||e);} 
const result=Object.assign({},base,{crudSmoke:crud,contractOk:ready&&crud.insert&&crud.get&&crud.update&&crud.remove&&crud.afterRemoveGone});
post(result);
}catch(e){if(Date.now()-start>90000)post({contractOk:false,error:String(e&&e.message||e),errors,elapsedMs:Date.now()-start}); else setTimeout(inspect,1200);}}
setTimeout(inspect,1500);
</script></body></html>`;
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method==='GET'&&url.pathname==='/__smoke.html')return send(res,200,'text/html; charset=utf-8',smokeHtml);
  if(req.method==='POST'&&url.pathname==='/__smoke_result'){
    let body=''; req.on('data',c=>body+=c); req.on('end',()=>{fs.writeFileSync(resultPath,body||'{}','utf8'); send(res,200,'application/json; charset=utf-8','{"ok":true}');}); return;
  }
  let filePath=decodeURIComponent(url.pathname); if(filePath==='/')filePath='/index.html';
  const full=path.normalize(path.join(root,filePath));
  if(!full.startsWith(path.normalize(root)))return send(res,403,'text/plain; charset=utf-8','Forbidden');
  fs.readFile(full,(err,data)=>{
    if(err)return send(res,404,'text/plain; charset=utf-8','Not found: '+filePath);
    if(filePath==='/index.html' && url.searchParams.get('orbitBackend')==='firestore-lab'){
      return send(res,200,'text/html; charset=utf-8',injectLab(data.toString('utf8')));
    }
    send(res,200,types[path.extname(full).toLowerCase()]||'application/octet-stream',data);
  });
});
server.listen(port,'127.0.0.1',()=>console.log('SMOKE_AYS_LAB_SERVER_READY http://127.0.0.1:'+port));
'@

  Set-Content -Path $ServerJs -Value $ServerCode -Encoding UTF8
  $ServerProc = Start-Process -FilePath "node" -ArgumentList "`"$ServerJs`" `"$App`" $Port `"$ResultJson`"" -RedirectStandardOutput $ServerOut -RedirectStandardError $ServerErr -WindowStyle Hidden -PassThru
  Start-Sleep -Seconds 2

  $Health = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/index.html?orbitBackend=firestore-lab&tenant=$Tenant" -UseBasicParsing -TimeoutSec 10
  Add-Report "HTTP index central LAB con inyeccion temporal: $($Health.StatusCode)"

  $ChromeCandidates = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )
  $Chrome = $ChromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $Chrome) { throw "No se encontro Google Chrome" }
  New-Item -ItemType Directory -Force -Path $ChromeProfile | Out-Null

  $SmokeUrl = "http://127.0.0.1:$Port/__smoke.html"
  $ChromeProc = Start-Process -FilePath $Chrome -ArgumentList @("--new-window","--no-first-run","--no-default-browser-check","--user-data-dir=$ChromeProfile",$SmokeUrl) -PassThru
  Add-Report "Smoke URL: $SmokeUrl"
  Add-Report "Chrome abierto. Si pide login, usa credenciales LAB. Esperando resultado hasta 105 segundos."
  Add-Report ""

  $Got = $false
  for ($i = 0; $i -lt 110; $i++) {
    if (Test-Path $ResultJson) { $Got = $true; break }
    Start-Sleep -Seconds 1
  }

  if (-not $Got) {
    Add-Report "RESULTADO: BLOQUEADO_TIMEOUT"
    throw "No llego resultado del smoke en el tiempo esperado"
  }

  $ResultRaw = Get-Content $ResultJson -Raw -Encoding UTF8
  $Result = $ResultRaw | ConvertFrom-Json
  Add-Report "== 7. Resultado navegador =="
  Add-Report ($Result | ConvertTo-Json -Depth 40)
  Add-Report ""

  if ($Result.contractOk -eq $true) {
    Add-Report "RESULTADO SMOKE A&S LAB V99: COMPLETADO"
    Add-Report "OK: Orbit.store LAB responde con API completa, tenant correcto y CRUD ficticio controlado en actividades."
  } else {
    Add-Report "RESULTADO SMOKE A&S LAB V99: FALLIDO_O_BLOQUEADO"
    Add-Report "Revisar JSON anterior. No se hace commit, push, deploy ni cambios automaticos."
  }

} catch {
  Add-Report "ERROR GENERAL: $($_.Exception.Message)"
} finally {
  try { if ($ChromeProc -and -not $ChromeProc.HasExited) { Stop-Process -Id $ChromeProc.Id -Force -ErrorAction SilentlyContinue; Add-Report "OK: Chrome temporal cerrado." } } catch {}
  try { if ($ServerProc -and -not $ServerProc.HasExited) { Stop-Process -Id $ServerProc.Id -Force -ErrorAction SilentlyContinue; Add-Report "OK: servidor temporal cerrado." } } catch {}
  Add-Report ""
  Add-Report "Reporte: $Report"
  Add-Report "Restricciones respetadas: NO deploy, NO Hosting, NO produccion, NO secretos, NO datos reales en codigo."
  try {
    Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard
    notepad $Report
  } catch {}
}
