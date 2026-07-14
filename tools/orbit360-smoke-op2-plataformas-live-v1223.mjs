#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const arg = (name, fallback = '') => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] || fallback : fallback; };
const repo = path.resolve(arg('--repo', process.cwd()));
const app = path.resolve(arg('--app', path.join(repo, 'orbit360-platform')));
const port = Number(arg('--port', '5000'));
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const reports = path.join(repo, '_orbit360_reports');
const evidence = path.join(reports, `VISUAL-OP2-PLATAFORMAS-LIVE-V1223-${stamp}`);
const results = path.join(evidence, 'results.jsonl');
const report = path.join(reports, `VISUAL-OP2-PLATAFORMAS-LIVE-V1223-${stamp}.txt`);
const profiles = path.join(os.tmpdir(), `o2p23-${stamp}-${process.pid}`);
fs.mkdirSync(evidence, { recursive:true });
fs.mkdirSync(profiles, { recursive:true });

const logRows = [];
const log = (text = '') => { logRows.push(String(text)); console.log(text); };
const browser = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find(fs.existsSync);
if (!browser) {
  log('BLOQUEADO: navegador no encontrado');
  fs.writeFileSync(report, logRows.join('\n'));
  process.exit(1);
}

const scenarios = [
  ['dir-plataformas-desktop','Dirección',1366,900],
  ['op-plataformas-tablet','Operativo',768,950]
];

function page(url) {
  const role = url.searchParams.get('role');
  const scenario = url.searchParams.get('scenario');
  return `<!doctype html><html><body style="margin:0"><iframe id="app" src="/index.html?op2Live=1" style="border:0;width:100vw;height:100vh"></iframe><script>
const ROLE=${JSON.stringify(role)},SCENARIO=${JSON.stringify(scenario)},sleep=ms=>new Promise(r=>setTimeout(r,ms)),errors=[];
async function wait(fn,ms=12000){const start=Date.now();while(Date.now()-start<ms){try{const value=fn();if(value)return value}catch(e){}await sleep(100)}return null}
async function send(row){await fetch('/result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(row)})}
document.getElementById('app').addEventListener('load',async()=>{
 const frame=document.getElementById('app'),w=frame.contentWindow,d=frame.contentDocument;
 w.addEventListener('error',e=>errors.push({type:'error',message:e.message||''}));
 try{
  await sleep(250);
  const form=d.getElementById('login-form');
  if(form&&!d.getElementById('login').classList.contains('hidden')){
   d.getElementById('lg-user').value='admin@demo.com';d.getElementById('lg-pass').value='demo123';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  }
  await wait(()=>!d.body.classList.contains('pre-auth')&&d.getElementById('host'));
  const roleSelect=d.getElementById('rol-sel');
  const option=roleSelect&&[...roleSelect.options].find(x=>x.value===ROLE||x.textContent.trim()===ROLE);
  const roleAvailable=!!option;
  if(option){roleSelect.value=option.value;roleSelect.dispatchEvent(new Event('change',{bubbles:true}));}
  await sleep(600);
  const O=w.Orbit,S=O&&O.store,R=O&&O.secureResources;
  const username='operacion.demo',password='DEMO_ONLY_VALUE';
  R.registerCredentialProvider({
   status:()=>({status:'disponible',available:true,revealAvailable:true,copyAvailable:true,requiresReauth:false}),
   reveal:async()=>({ok:true,username,password,value:password,expiresInMs:15000}),
   copy:async()=>({ok:true})
  });
  let insurer=S.get('aseguradoras','asg_smoke_op2_v1223');
  if(!insurer){S.insert('aseguradoras',{id:'asg_smoke_op2_v1223',nombre:'Aseguradora Ficticia OP2',pais:'GT',portales:[{nombre:'Portal Ficticio',credentialRef:'cred_smoke_op2_v1223',usuarioHint:'op***',estadoAcceso:'Acceso disponible'}],cuentas:[],contactos:[],docs:[],actividad:[]});}
  insurer=S.get('aseguradoras','asg_smoke_op2_v1223');
  w.location.hash='#/aseguradoras?ficha='+encodeURIComponent(insurer.id);
  await wait(()=>d.querySelector('.asg197-ficha'));
  const tab=await wait(()=>d.querySelector('[data-tab="plataformas"]'));if(tab)tab.click();
  const findRow=()=>[...d.querySelectorAll('[data-op2-platform]')].find(x=>(x.innerText||'').includes('Portal Ficticio'))||null;
  let row=await wait(findRow,8000);
  const platform=!!row;
  const button=row&&row.querySelector('[data-op2-view-credential]');
  const present=!!button,enabled=!!(button&&!button.disabled),buttons=!!(row&&row.querySelector('[data-op2-view-credential],[data-op2-copy-user],[data-op2-copy-password]'));
  if(enabled)button.click();
  const revealed=!!(await wait(()=>{
   const current=findRow();
   const user=current&&current.querySelector('[data-op2-username]');
   const pass=current&&current.querySelector('[data-op2-password]');
   if(current&&user&&pass&&user.textContent.trim()===username&&pass.textContent.trim()===password){row=current;return true}
   return false;
  },7000));
  const directOut=await R.revealCredential('cred_smoke_op2_v1223',{module:'aseguradoras',fieldType:'portal_credential',insurerId:insurer.id,platformIndex:0});
  const direct=!!(directOut&&directOut.ok&&directOut.username===username&&(directOut.password===password||directOut.value===password));
  await sleep(100);
  const liveRow=findRow()||row;
  const connected=!!(liveRow&&d.documentElement.contains(liveRow));
  const text=(liveRow&&liveRow.innerText)||'';
  const secretVisible=text.includes(username)&&text.includes(password);
  const policy=O.aseguradorasOperationalAccess.status();
  const overflow=d.documentElement.scrollWidth>w.innerWidth+3;
  await send({scenario:SCENARIO,role:ROLE,roleAvailable,platform,present,enabled,revealed,direct,buttons,connected,secretVisible,policy,overflow,errors,ok:roleAvailable&&platform&&present&&enabled&&revealed&&direct&&buttons&&connected&&secretVisible&&policy.credentialsVisible===true&&!overflow&&!errors.length});
 }catch(e){await send({scenario:SCENARIO,role:ROLE,errors:[...errors,{type:'harness',message:String(e&&e.message||e)}],ok:false});}
});
</script></body></html>`;
}

const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server = http.createServer((request,response)=>{
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  if(request.method==='GET'&&url.pathname==='/h'){response.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return response.end(page(url));}
  if(request.method==='POST'&&url.pathname==='/result'){
    let body='';request.on('data',c=>{body+=c});request.on('end',()=>{fs.appendFileSync(results,`${body||'{}'}\n`);response.end('ok')});return;
  }
  const name=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const file=path.normalize(path.join(app,name));
  if(!file.startsWith(path.normalize(app))){response.writeHead(403);return response.end();}
  fs.readFile(file,(error,data)=>{if(error){response.writeHead(404);return response.end();}response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});response.end(data);});
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});

function remove(target){try{fs.rmSync(target,{recursive:true,force:true,maxRetries:4,retryDelay:150})}catch(e){log(`ADVERTENCIA: no se pudo eliminar ${target}: ${e.message}`)}}
async function launch([scenario,role,width,height]){
  const profile=path.join(profiles,scenario),screenshot=path.join(evidence,`${scenario}.png`);fs.mkdirSync(profile,{recursive:true});
  const url=`http://127.0.0.1:${port}/h?scenario=${encodeURIComponent(scenario)}&role=${encodeURIComponent(role)}`;
  const browserArgs=['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--no-default-browser-check','--disable-background-networking',`--user-data-dir=${profile}`,`--window-size=${width},${height}`,'--virtual-time-budget=20000',`--screenshot=${screenshot}`,url];
  return new Promise(resolve=>{const child=spawn(browser,browserArgs,{stdio:'ignore'});const timer=setTimeout(()=>{try{child.kill('SIGKILL')}catch{}},38000);child.on('close',code=>{clearTimeout(timer);remove(profile);resolve({scenario,code,screenshot})});});
}

log('============================================================');
log('ORBIT 360 - SMOKE OP2 PLATAFORMAS VIVAS V1.223');
log('Solo Direccion desktop y Operativo tablet; evidencia previa no se repite.');
log('Exige tarjeta conectada al DOM después de auditoría y re-render.');
log('============================================================');
const launches=[];
try{for(const scenario of scenarios){log(`Ejecutando ${scenario[0]}`);launches.push(await launch(scenario));}}finally{server.close();remove(profiles);}
const rows=fs.existsSync(results)?fs.readFileSync(results,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse):[];
const by=new Map(rows.map(x=>[x.scenario,x]));let failures=0;
for(const item of launches){const row=by.get(item.scenario);const ok=item.code===0&&row&&row.ok&&fs.existsSync(item.screenshot);if(!ok)failures++;log(`${ok?'OK':'FALLO'} ${item.scenario}`);log(row?JSON.stringify(row):'Sin resultado');}
log(`Resumen delta vivo: ${2-failures}/2 escenarios aprobados.`);
log(failures?'RESULTADO OP2 V1.223: BLOQUEADO':'RESULTADO OP2 V1.223: APROBADO');
log('Sin deploy, datos reales ni repetición de CRM/12 vistas/Asesor.');
fs.writeFileSync(report,logRows.join('\n'));
log(`Reporte: ${report}`);
process.exit(failures?1:0);
