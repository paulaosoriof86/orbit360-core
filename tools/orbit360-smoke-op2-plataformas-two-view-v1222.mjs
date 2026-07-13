#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const repo = path.resolve(arg('--repo', process.cwd()));
const app = path.resolve(arg('--app', path.join(repo, 'orbit360-platform')));
const port = Number(arg('--port', '5000'));
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const reportsRoot = path.join(repo, '_orbit360_reports');
const evidenceDir = path.join(reportsRoot, `VISUAL-OP2-PLATAFORMAS-TWO-VIEWS-V1222-${stamp}`);
const reportPath = path.join(reportsRoot, `VISUAL-OP2-PLATAFORMAS-TWO-VIEWS-V1222-${stamp}.txt`);
const resultsPath = path.join(evidenceDir, 'results.jsonl');
const profileRoot = path.join(os.tmpdir(), `o2p22-${stamp}-${process.pid}`);

fs.mkdirSync(evidenceDir, { recursive: true });
fs.mkdirSync(profileRoot, { recursive: true });

const logs = [];
const log = (value = '') => {
  logs.push(value);
  console.log(value);
};

const browserCandidates = process.platform === 'win32'
  ? [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ]
  : ['/usr/bin/google-chrome', '/usr/bin/chromium'];

const browser = browserCandidates.find(fs.existsSync);
if (!browser) {
  log('BLOQUEADO: navegador no encontrado');
  fs.writeFileSync(reportPath, logs.join('\n'));
  process.exit(1);
}

const cases = [
  ['dir-plataformas-desktop', 'Dirección', 1366, 900],
  ['op-plataformas-tablet', 'Operativo', 768, 950]
];

log('============================================================');
log('ORBIT 360 - SMOKE DELTA PLATAFORMAS OP2 V1.222');
log(`URL: http://127.0.0.1:${port}`);
log('Solo Direccion desktop y Operativo tablet. Asesor movil se reutiliza.');
log('La credencial se verifica dentro de la misma tarjeta accionada.');
log('Perfiles temporales fuera de evidencia y con limpieza automatica.');
log('============================================================');

function harnessHtml(url) {
  const role = url.searchParams.get('role');
  const id = url.searchParams.get('id');
  return `<!doctype html><html><body style="margin:0"><iframe id="f" src="/index.html?op2Focused=1" style="border:0;width:100vw;height:100vh"></iframe><script>
const ROLE=${JSON.stringify(role)},ID=${JSON.stringify(id)},sleep=m=>new Promise(r=>setTimeout(r,m)),errs=[];
async function wait(fn,t=12000){const s=Date.now();while(Date.now()-s<t){try{const v=fn();if(v)return v}catch(e){}await sleep(120)}return null}
async function send(r){await fetch('/result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(r)})}
document.getElementById('f').addEventListener('load',async()=>{
  const f=document.getElementById('f'),w=f.contentWindow,d=f.contentDocument;
  w.addEventListener('error',e=>errs.push({type:'error',message:e.message||''}));
  try{
    await sleep(300);
    const form=d.getElementById('login-form');
    if(form&&!d.getElementById('login').classList.contains('hidden')){
      d.getElementById('lg-user').value='admin@demo.com';
      d.getElementById('lg-pass').value='demo123';
      form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    }
    await wait(()=>!d.body.classList.contains('pre-auth')&&d.getElementById('host'));
    await sleep(700);
    const rs=d.getElementById('rol-sel');
    let roleAvailable=false;
    if(rs){
      const option=[...rs.options].find(x=>x.value===ROLE||x.textContent.trim()===ROLE);
      if(option){
        roleAvailable=true;
        rs.value=option.value;
        rs.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    await sleep(700);

    const O=w.Orbit,S=O&&O.store,R=O&&O.secureResources;
    const user=['operacion','demo'].join('.');
    const secret=['DEMO','ONLY','VALUE'].join('_');
    if(R&&R.registerCredentialProvider){
      R.registerCredentialProvider({
        status:()=>({status:'disponible',available:true,revealAvailable:true,copyAvailable:true,requiresReauth:false}),
        reveal:async()=>({ok:true,username:user,password:secret,value:secret,expiresInMs:15000}),
        copy:async()=>({ok:true})
      });
    }

    let insurer=S&&S.get('aseguradoras','asg_smoke_op2_v1222');
    if(S&&!insurer){
      S.insert('aseguradoras',{
        id:'asg_smoke_op2_v1222',
        nombre:'Aseguradora Ficticia OP2',
        pais:'GT',
        portales:[{nombre:'Portal Ficticio',credentialRef:'cred_smoke_op2_v1222',usuarioHint:'op***',estadoAcceso:'Acceso disponible'}],
        cuentas:[],contactos:[],docs:[],actividad:[]
      });
    }
    insurer=S&&S.get('aseguradoras','asg_smoke_op2_v1222');
    w.location.hash='#/aseguradoras?ficha='+encodeURIComponent(insurer.id);
    await wait(()=>d.querySelector('.asg197-ficha'));
    const tab=await wait(()=>d.querySelector('[data-tab="plataformas"]'));
    if(tab)tab.click();

    const row=await wait(()=>{
      const rows=[...d.querySelectorAll('[data-op2-platform]')];
      return rows.find(x=>(x.innerText||'').includes('Portal Ficticio'))||rows[0]||null;
    },8000);
    const platform=!!row;
    const policy=O&&O.aseguradorasOperationalAccess&&O.aseguradorasOperationalAccess.status
      ? O.aseguradorasOperationalAccess.status()
      : {};

    const button=row&&row.querySelector('[data-op2-view-credential]');
    const present=!!button;
    const enabled=!!(button&&!button.disabled);
    const buttons=!!(row&&row.querySelector('[data-op2-view-credential],[data-op2-copy-password],[data-op2-copy-user]'));
    let revealed=false;
    if(enabled){
      button.click();
      revealed=!!(await wait(()=>{
        const username=row.querySelector('[data-op2-username]');
        const password=row.querySelector('[data-op2-password]');
        return username&&password&&username.textContent.trim()===user&&password.textContent.trim()===secret;
      },6000));
    }

    let direct=false;
    if(R&&R.revealCredential){
      const out=await R.revealCredential('cred_smoke_op2_v1222',{
        module:'aseguradoras',
        fieldType:'portal_credential',
        insurerId:insurer.id,
        platformIndex:0
      });
      direct=!!(out&&out.ok&&out.username===user&&(out.password===secret||out.value===secret));
    }

    const rowText=(row&&row.innerText)||'';
    const secretVisible=rowText.includes(user)&&rowText.includes(secret);
    const overflow=d.documentElement.scrollWidth>w.innerWidth+3;
    const roleOk=platform&&present&&enabled&&revealed&&direct&&buttons&&secretVisible&&policy.credentialsVisible===true;
    await send({
      scenario:ID,
      role:ROLE,
      roleAvailable,
      platform,
      present,
      enabled,
      revealed,
      direct,
      buttons,
      secretVisible,
      policy,
      overflow,
      errors:errs,
      ok:roleAvailable&&roleOk&&!overflow&&!errs.length
    });
  }catch(e){
    await send({scenario:ID,role:ROLE,errors:errs.concat([{type:'harness',message:String(e&&e.message||e)}]),ok:false});
  }
});
</script></body></html>`;
}

const mime = {
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.png':'image/png',
  '.svg':'image/svg+xml'
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  if (request.method === 'GET' && url.pathname === '/h') {
    response.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    return response.end(harnessHtml(url));
  }
  if (request.method === 'POST' && url.pathname === '/result') {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      fs.appendFileSync(resultsPath, `${body || '{}'}\n`);
      response.end('ok');
    });
    return;
  }
  const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const file = path.normalize(path.join(app, name));
  if (!file.startsWith(path.normalize(app))) {
    response.writeHead(403);
    return response.end();
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404);
      return response.end();
    }
    response.writeHead(200, {
      'content-type': mime[path.extname(file)] || 'application/octet-stream',
      'cache-control':'no-store'
    });
    response.end(data);
  });
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', resolve);
});

function removeProfile(profile) {
  try {
    fs.rmSync(profile, { recursive:true, force:true, maxRetries:4, retryDelay:150 });
  } catch (error) {
    log(`ADVERTENCIA: no se pudo eliminar perfil temporal ${profile}: ${error.message}`);
  }
}

async function run(testCase) {
  const [id, role, width, height] = testCase;
  const screenshot = path.join(evidenceDir, `${id}.png`);
  const profile = path.join(profileRoot, id.replace(/[^a-z0-9-]/gi, '-'));
  fs.mkdirSync(profile, { recursive:true });
  const url = `http://127.0.0.1:${port}/h?id=${encodeURIComponent(id)}&role=${encodeURIComponent(role)}`;
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    '--virtual-time-budget=19000',
    `--screenshot=${screenshot}`,
    url
  ];
  return new Promise(resolve => {
    const handle = spawn(browser, args, { stdio:'ignore' });
    const timeout = setTimeout(() => {
      try { handle.kill('SIGKILL'); } catch {}
    }, 36000);
    handle.on('close', code => {
      clearTimeout(timeout);
      removeProfile(profile);
      resolve({id, code, screenshot});
    });
  });
}

const launches = [];
try {
  for (const testCase of cases) {
    log(`Ejecutando ${testCase[0]}`);
    launches.push(await run(testCase));
    await new Promise(resolve => setTimeout(resolve, 250));
  }
} finally {
  server.close();
  removeProfile(profileRoot);
}

const rows = fs.existsSync(resultsPath)
  ? fs.readFileSync(resultsPath, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
  : [];
const byScenario = new Map(rows.map(row => [row.scenario, row]));
let failures = 0;
for (const launch of launches) {
  const result = byScenario.get(launch.id);
  const ok = launch.code === 0 && result && result.ok && fs.existsSync(launch.screenshot);
  if (!ok) failures += 1;
  log(`${ok ? 'OK' : 'FALLO'} ${launch.id}`);
  log(result ? JSON.stringify(result) : 'Sin resultado');
}

log(`Resumen delta: ${2 - failures}/2 escenarios aprobados.`);
log(failures ? 'RESULTADO PLATAFORMAS OP2 DELTA: BLOQUEADO' : 'RESULTADO PLATAFORMAS OP2 DELTA: APROBADO');
log('No se repitieron CRM, las 12 vistas previas ni Asesor movil. Sin deploy ni datos reales.');
fs.writeFileSync(reportPath, logs.join('\n'));
log(`Reporte: ${reportPath}`);
process.exit(failures ? 1 : 0);
