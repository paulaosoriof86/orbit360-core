#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
function arg(name, fallback='') { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; }
const repo = path.resolve(arg('--repo', process.cwd()));
const app = path.resolve(arg('--app', path.join(repo, 'orbit360-platform')));
const port = Number(arg('--port', '5000'));
const skipValidators = argv.includes('--skip-validators');
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const reportsRoot = path.join(repo, '_orbit360_reports');
const outDir = path.join(reportsRoot, `VISUAL-ASEGURADORAS-OP2-${stamp}`);
const reportPath = path.join(reportsRoot, `VISUAL-ASEGURADORAS-OP2-${stamp}.txt`);
const resultPath = path.join(outDir, 'results.jsonl');
fs.mkdirSync(outDir, { recursive:true });

const log=[];
function add(line='') { log.push(line); console.log(line); }
function runNode(name, script, args=[]) {
  const full = path.join(repo, script);
  if (!fs.existsSync(full)) return { name, ok:false, output:`Falta ${full}` };
  const out = spawnSync(process.execPath, [full, ...args], { cwd:repo, encoding:'utf8' });
  return { name, ok:out.status === 0, output:`${out.stdout || ''}${out.stderr || ''}`.trim() };
}
function browserCandidates() {
  const home = process.env.LOCALAPPDATA || '';
  if (process.platform === 'win32') return [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    home ? path.join(home,'Google','Chrome','Application','chrome.exe') : '',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);
  if (process.platform === 'darwin') return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'];
  return ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/microsoft-edge'];
}
const browser = browserCandidates().find(fs.existsSync);
if (!browser) {
  add('RESULTADO: BLOQUEADO'); add('No se encontró Chrome o Edge.');
  fs.writeFileSync(reportPath, log.join('\n'), 'utf8'); process.exit(1);
}

const validators = skipValidators ? [] : [
  runNode('Backend protegido','tools/orbit360-validar-backend-lab-contrato.mjs'),
  runNode('Aseguradoras OP-2 v1.218','tools/orbit360-validar-aseguradoras-op2.mjs',[app])
];
add('============================================================');
add('ORBIT 360 - VALIDACION VISUAL ASEGURADORAS OP-2 V1.218');
add(`Fecha: ${new Date().toISOString()}`); add(`Repo: ${repo}`); add(`Browser: ${browser}`);
add(`URL: http://127.0.0.1:${port}`);
add('Regla: cuentas para todos los usuarios del directorio; credenciales solo Dirección/Admin/Operativo.');
add('Modo demo y datos ficticios; sin deploy, producción, secretos ni fuentes reales.');
if (skipValidators) add('Validadores previos omitidos porque fueron aprobados por el ejecutor de reanudación.');
add('============================================================');
for (const v of validators) { add(`\n== ${v.name} ==`); add(v.ok ? 'OK' : 'FALLÓ'); if (v.output) add(v.output); }
if (validators.some(v => !v.ok)) {
  add('\nRESULTADO: BLOQUEADO POR VALIDADORES'); fs.writeFileSync(reportPath, log.join('\n'),'utf8'); process.exit(1);
}

const scenarios = [
  { id:'dir-directorio-desktop', role:'Dirección', view:'directory', width:1366, height:900 },
  { id:'dir-resumen-desktop', role:'Dirección', view:'resumen', width:1366, height:900 },
  { id:'dir-contactos-desktop', role:'Dirección', view:'contactos', width:1366, height:900 },
  { id:'dir-plataformas-desktop', role:'Dirección', view:'plataformas', width:1366, height:900 },
  { id:'dir-bancos-desktop', role:'Dirección', view:'bancos', width:1366, height:900 },
  { id:'dir-documentos-desktop', role:'Dirección', view:'documentos', width:1366, height:900 },
  { id:'dir-tarifas-desktop', role:'Dirección', view:'tarifas', width:1366, height:900 },
  { id:'op-directorio-tablet', role:'Operativo', view:'directory', width:768, height:950 },
  { id:'op-resumen-tablet', role:'Operativo', view:'resumen', width:768, height:950 },
  { id:'op-plataformas-tablet', role:'Operativo', view:'plataformas', width:768, height:950 },
  { id:'op-bancos-tablet', role:'Operativo', view:'bancos', width:768, height:950 },
  { id:'ase-directorio-mobile', role:'Asesor', view:'directory', width:390, height:844 },
  { id:'ase-resumen-mobile', role:'Asesor', view:'resumen', width:390, height:844 },
  { id:'ase-plataformas-mobile', role:'Asesor', view:'plataformas', width:390, height:844 },
  { id:'ase-bancos-mobile', role:'Asesor', view:'bancos', width:390, height:844 }
];

function harnessHtml(url) {
  const role = url.searchParams.get('role') || 'Dirección';
  const view = url.searchParams.get('view') || 'directory';
  const scenario = url.searchParams.get('scenario') || 'scenario';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${scenario}</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#fff}iframe{border:0;width:100%;height:100%;display:block}#status{position:fixed;left:6px;bottom:6px;z-index:9999;background:rgba(30,34,39,.9);color:#fff;padding:4px 7px;border-radius:6px;font:10px Arial}</style></head><body><iframe id="app" src="/index.html?op2Smoke=1"></iframe><div id="status">Preparando ${scenario}</div><script>
  const ROLE=${JSON.stringify(role)}, VIEW=${JSON.stringify(view)}, SCENARIO=${JSON.stringify(scenario)};
  const errors=[], sleep=ms=>new Promise(r=>setTimeout(r,ms)), status=document.getElementById('status');
  async function waitFor(fn,timeout=12000){const start=Date.now();while(Date.now()-start<timeout){try{const v=fn();if(v)return v;}catch(e){}await sleep(120);}return null;}
  async function post(result){status.textContent=result.ok?'OK '+SCENARIO:'FALLÓ '+SCENARIO;try{await fetch('/__op2_result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(result)});}catch(e){status.textContent+=' · resultado no guardado';}}
  document.getElementById('app').addEventListener('load',async()=>{
    const frame=document.getElementById('app'), w=frame.contentWindow, d=frame.contentDocument;
    w.addEventListener('error',e=>errors.push({type:'error',message:e.message||'',source:e.filename||'',line:e.lineno||0}));
    w.addEventListener('unhandledrejection',e=>errors.push({type:'rejection',message:String(e.reason&&e.reason.message||e.reason||'')}));
    try{
      await sleep(300);
      const form=d.getElementById('login-form');
      if(form && !d.getElementById('login').classList.contains('hidden')){
        const email=d.getElementById('lg-user'),pass=d.getElementById('lg-pass');if(email)email.value='admin@demo.com';if(pass)pass.value='demo123';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      }
      await waitFor(()=>!d.body.classList.contains('pre-auth')&&d.getElementById('host'),10000);await sleep(800);
      const chk=d.getElementById('conf-chk');if(chk){chk.checked=true;chk.dispatchEvent(new Event('change',{bubbles:true}));const ok=d.getElementById('conf-ok');if(ok)ok.click();}
      const roleSel=d.getElementById('rol-sel');let roleAvailable=false;
      if(roleSel){const opt=Array.from(roleSel.options).find(o=>o.value===ROLE||o.textContent.trim()===ROLE);if(opt){roleAvailable=true;roleSel.value=opt.value;roleSel.dispatchEvent(new Event('change',{bubbles:true}));}}
      await sleep(700);
      const store=w.Orbit&&w.Orbit.store, secure=w.Orbit&&w.Orbit.secureResources;
      if(secure&&secure.registerFieldProvider)secure.registerFieldProvider({status:()=>({status:'disponible',available:true,revealAvailable:true,copyAvailable:true,requiresReauth:false}),reveal:async()=>({ok:true,value:'000123456789',expiresInMs:60000}),copy:async()=>({ok:true})});
      if(secure&&secure.registerCredentialProvider)secure.registerCredentialProvider({status:()=>({status:'disponible',available:true,revealAvailable:true,copyAvailable:true,requiresReauth:true}),reveal:async()=>({ok:true,username:'operacion.demo',password:'ClaveDemoSegura!',value:'ClaveDemoSegura!',expiresInMs:15000}),copy:async()=>({ok:true})});
      let synthetic=store&&store.get('aseguradoras','asg_smoke_op2_v1218');
      if(store&&!synthetic){store.insert('aseguradoras',{id:'asg_smoke_op2_v1218',nombre:'Aseguradora Ficticia OP2',pais:'GT',monedaBase:'GTQ',vinculada:true,contactos:[{nombre:'Contacto Ficticio',area:'Operaciones',email:'contacto@example.invalid',principal:true}],portales:[{id:'portal_smoke',nombre:'Portal Ficticio',tipo:'Operaciones',url:'https://example.invalid',credentialRef:'cred_smoke_op2',usuarioHint:'op***@demo.invalid',estadoAcceso:'Acceso disponible'}],cuentas:[{id:'account_smoke',banco:'Banco Ficticio',tipo:'Monetaria',moneda:'GTQ',titular:'Aseguradora Ficticia',accountRef:'account_smoke_op2',numeroHint:'•••• 6789',uso:'Pago de primas',estado:'Disponible'}],ramos:['Autos'],docs:[],actividad:[],ultimaRevision:'2026-07-13'});}
      synthetic=store&&store.get('aseguradoras','asg_smoke_op2_v1218');
      const insurers=store?store.all('aseguradoras')||[]:[];
      const insurer=synthetic||insurers.find(x=>x&&x.id)||null;
      w.location.hash=VIEW==='directory'?'#/aseguradoras':(insurer?'#/aseguradoras?ficha='+encodeURIComponent(insurer.id):'#/aseguradoras');
      await sleep(1500);
      if(VIEW!=='directory'&&VIEW!=='resumen'){
        const tab=d.querySelector('[data-tab="'+VIEW+'"]');if(tab){tab.click();await sleep(1200);}
      }
      if(VIEW==='plataformas'&&ROLE!=='Asesor'){
        const reveal=d.querySelector('[data-op2-view-credential]');if(reveal){reveal.click();await sleep(500);}
      }
      const host=d.getElementById('host'), text=(host&&host.innerText||'').trim();
      const directory=!!d.querySelector('.asg197-grid'), page=!!d.querySelector('.asg197-ficha'), body=!!d.querySelector('.asg197-tab-body');
      const quick=!!d.querySelector('[data-asg-op2-summary]');
      const editVisible=!!d.querySelector('[data-edit-asg],[data-op2-directory-actions]');
      const bankRows=d.querySelectorAll('[data-op2-bank]').length;
      const accountText=(d.querySelector('[data-op2-account-value]')||{}).textContent||'';
      const accountFull=accountText.trim()==='000123456789';
      const accountCopy=!!d.querySelector('[data-op2-copy-account]:not([disabled])');
      const credentialButtons=!!d.querySelector('[data-op2-view-credential],[data-op2-copy-password],[data-op2-copy-user]');
      const usernameText=(d.querySelector('[data-op2-username]')||{}).textContent||'';
      const passwordText=(d.querySelector('[data-op2-password]')||{}).textContent||'';
      const credentialRevealed=usernameText.trim()==='operacion.demo'&&passwordText.trim()==='ClaveDemoSegura!';
      const credentialRestricted=/Credenciales disponibles para Dirección, Administración y Operativo/.test(text);
      const technical=/backend_required|accountRef|credentialRef|Orbit\.store|Firebase|Firestore|localStorage|sessionStorage|Storage pendiente/i.test(d.body.innerText||'');
      const overflow=d.documentElement.scrollWidth>w.innerWidth+3;
      let required=VIEW==='directory'?directory:(page&&body);
      if(VIEW==='resumen')required=required&&quick;
      let roleRules=true;
      if(ROLE==='Asesor'){
        roleRules=!editVisible;
        if(VIEW==='plataformas')roleRules=roleRules&&!credentialButtons&&credentialRestricted&&!/operacion\.demo|ClaveDemoSegura/.test(text);
        if(VIEW==='bancos')roleRules=roleRules&&bankRows>0&&accountFull&&accountCopy;
      }else{
        if(VIEW==='plataformas')roleRules=credentialButtons&&credentialRevealed;
        if(VIEW==='bancos')roleRules=bankRows>0&&accountFull&&accountCopy;
      }
      const result={scenario:SCENARIO,roleRequested:ROLE,roleAvailable,view:VIEW,route:w.location.hash,insurers:insurers.length,directory,page,body,quick,editVisible,bankRows,accountFull,accountCopy,credentialButtons,credentialRevealed,credentialRestricted,technicalCopyVisible:technical,documentOverflow:overflow,textLength:text.length,errors,ok:roleAvailable&&insurer&&required&&roleRules&&!technical&&!overflow&&errors.length===0,at:new Date().toISOString()};
      await post(result);
    }catch(e){await post({scenario:SCENARIO,roleRequested:ROLE,view:VIEW,errors:errors.concat([{type:'harness',message:String(e&&e.message||e)}]),ok:false,at:new Date().toISOString()});}
  });
</script></body></html>`;
}

const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  if(req.method==='GET'&&url.pathname==='/__op2_harness.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(harnessHtml(url));return;}
  if(req.method==='POST'&&url.pathname==='/__op2_result'){
    let body='';req.on('data',c=>body+=c);req.on('end',()=>{try{fs.appendFileSync(resultPath,`${body||'{}'}\n`,'utf8');}catch(e){}res.writeHead(200,{'content-type':'application/json'});res.end('{"ok":true}');});return;
  }
  const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname),full=path.normalize(path.join(app,pathname));
  if(!full.startsWith(path.normalize(app))){res.writeHead(403);res.end('Forbidden');return;}
  fs.readFile(full,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'content-type':mime[path.extname(full).toLowerCase()]||'application/octet-stream','cache-control':'no-store, no-cache, must-revalidate'});res.end(data);});
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
add(`\nServidor visual listo en http://127.0.0.1:${port}`);

async function runScenario(s){
  const screenshot=path.join(outDir,`${s.id}.png`),profile=path.join(outDir,`profile-${s.id}`);fs.mkdirSync(profile,{recursive:true});
  const url=`http://127.0.0.1:${port}/__op2_harness.html?scenario=${encodeURIComponent(s.id)}&role=${encodeURIComponent(s.role)}&view=${encodeURIComponent(s.view)}`;
  const args=['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--metrics-recording-only',`--user-data-dir=${profile}`,`--window-size=${s.width},${s.height}`,'--virtual-time-budget=16000',`--screenshot=${screenshot}`,url];
  return new Promise(resolve=>{const child=spawn(browser,args,{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);const timer=setTimeout(()=>{try{child.kill('SIGKILL');}catch(e){}},32000);child.on('close',code=>{clearTimeout(timer);resolve({...s,code,screenshot,stdout:stdout.trim(),stderr:stderr.trim()});});});
}
const launches=[];
for(const s of scenarios){add(`Ejecutando ${s.id} · ${s.role} · ${s.width}x${s.height}`);launches.push(await runScenario(s));await new Promise(r=>setTimeout(r,250));}
server.close();
let results=[];
if(fs.existsSync(resultPath))results=fs.readFileSync(resultPath,'utf8').split(/\r?\n/).filter(Boolean).map(line=>{try{return JSON.parse(line);}catch(e){return{ok:false,parseError:String(e),raw:line};}});
const byScenario=new Map(results.map(r=>[r.scenario,r]));let failures=0;
add('\n== RESULTADOS VISUALES ==');
for(const launch of launches){const result=byScenario.get(launch.id),ok=launch.code===0&&result&&result.ok===true&&fs.existsSync(launch.screenshot);if(!ok)failures++;add(`${ok?'OK':'FALLÓ'} ${launch.id} · screenshot=${path.basename(launch.screenshot)} · browserExit=${launch.code}`);add(result?JSON.stringify(result):'Sin resultado del harness.');}
add(`\nCapturas: ${outDir}`);add(`Resumen: ${scenarios.length-failures}/${scenarios.length} escenarios aprobados.`);
add(failures?'RESULTADO ASEGURADORAS OP-2: BLOQUEADO POR VALIDACIÓN VISUAL':'RESULTADO ASEGURADORAS OP-2: VALIDACIÓN VISUAL AUTOMÁTICA APROBADA');
add('No se hizo deploy, producción, commit, push ni carga de datos reales.');
fs.writeFileSync(reportPath,log.join('\n'),'utf8');add(`Reporte: ${reportPath}`);
process.exit(failures?1:0);
