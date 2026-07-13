#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
function arg(name, fallback = '') {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}
const repo = path.resolve(arg('--repo', process.cwd()));
const app = path.resolve(arg('--app', path.join(repo, 'orbit360-platform')));
const port = Number(arg('--port', '5000'));
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const reportsRoot = path.join(repo, '_orbit360_reports');
const outDir = path.join(reportsRoot, `VISUAL-CRM-OP1-${stamp}`);
const reportPath = path.join(reportsRoot, `VISUAL-CRM-OP1-${stamp}.txt`);
const resultPath = path.join(outDir, 'results.jsonl');
fs.mkdirSync(outDir, { recursive: true });

const log = [];
function add(line = '') { log.push(line); console.log(line); }
function runNode(name, script, args = []) {
  const full = path.join(repo, script);
  if (!fs.existsSync(full)) return { name, ok: false, output: `Falta ${full}` };
  const out = spawnSync(process.execPath, [full, ...args], { cwd: repo, encoding: 'utf8' });
  return { name, ok: out.status === 0, output: `${out.stdout || ''}${out.stderr || ''}`.trim() };
}
function browserCandidates() {
  const home = process.env.LOCALAPPDATA || '';
  if (process.platform === 'win32') return [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    home ? path.join(home, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);
  if (process.platform === 'darwin') return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'];
  return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
}
const browser = browserCandidates().find(fs.existsSync);
if (!browser) {
  add('RESULTADO: BLOQUEADO');
  add('No se encontró Chrome o Edge para la validación visual.');
  fs.writeFileSync(reportPath, log.join('\n'), 'utf8');
  process.exit(1);
}

const validators = [
  runNode('Backend LAB protegido', 'tools/orbit360-validar-backend-lab-contrato.mjs'),
  runNode('CRM OP-1', 'tools/orbit360-validar-crm-op1.mjs', [app]),
  runNode('Cotizador/Comparativo v1.215', 'tools/orbit360-validar-cierre-cotizador-comparativo-v1215.mjs', [app])
];

add('============================================================');
add('ORBIT 360 - VALIDACION VISUAL CRM OP-1');
add(`Fecha: ${new Date().toISOString()}`);
add(`Repo: ${repo}`);
add(`App: ${app}`);
add(`Browser: ${browser}`);
add(`URL: http://127.0.0.1:${port}`);
add('Modo: demo con datos ficticios; sin deploy, sin producción, sin secretos.');
add('============================================================');
for (const v of validators) {
  add(`\n== ${v.name} ==`);
  add(v.ok ? 'OK' : 'FALLÓ');
  if (v.output) add(v.output);
}
if (validators.some(v => !v.ok)) {
  add('\nRESULTADO: BLOQUEADO POR VALIDADORES');
  fs.writeFileSync(reportPath, log.join('\n'), 'utf8');
  process.exit(1);
}

const scenarios = [
  { id: 'dir-clientes-desktop', role: 'Dirección', kind: 'clientList', width: 1366, height: 900 },
  { id: 'dir-cliente-desktop', role: 'Dirección', kind: 'clientDetail', width: 1366, height: 900 },
  { id: 'dir-calidad-desktop', role: 'Dirección', kind: 'quality', width: 1366, height: 900 },
  { id: 'dir-poliza-desktop', role: 'Dirección', kind: 'policyDetail', width: 1366, height: 900 },
  { id: 'op-cliente-tablet', role: 'Operativo', kind: 'clientDetail', width: 768, height: 950 },
  { id: 'op-calidad-tablet', role: 'Operativo', kind: 'quality', width: 768, height: 950 },
  { id: 'ase-cliente-mobile', role: 'Asesor', kind: 'clientDetail', width: 390, height: 844 },
  { id: 'ase-calidad-mobile', role: 'Asesor', kind: 'quality', width: 390, height: 844 },
  { id: 'ase-poliza-mobile', role: 'Asesor', kind: 'policyDetail', width: 390, height: 844 },
  { id: 'dir-portal-mobile', role: 'Dirección', kind: 'portal', width: 390, height: 844 }
];

function harnessHtml(url) {
  const role = url.searchParams.get('role') || 'Dirección';
  const kind = url.searchParams.get('kind') || 'clientList';
  const scenario = url.searchParams.get('scenario') || 'scenario';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CRM OP1 ${scenario}</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#fff}iframe{border:0;width:100%;height:100%;display:block}#status{position:fixed;left:6px;bottom:6px;z-index:9999;background:rgba(30,34,39,.88);color:#fff;padding:4px 7px;border-radius:6px;font:10px Arial;max-width:90vw}</style></head><body><iframe id="app" src="/index.html?crmSmoke=op1"></iframe><div id="status">Preparando ${scenario}</div><script>
  const ROLE=${JSON.stringify(role)}, KIND=${JSON.stringify(kind)}, SCENARIO=${JSON.stringify(scenario)};
  const errors=[]; const status=document.getElementById('status'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function waitFor(fn, timeout=12000){const start=Date.now();while(Date.now()-start<timeout){try{const v=fn();if(v)return v;}catch(e){}await sleep(120);}return null;}
  async function post(result){status.textContent=result.ok?'OK '+SCENARIO:'FALLÓ '+SCENARIO;try{await fetch('/__crm_result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(result)});}catch(e){status.textContent+=' · no se guardó resultado';}}
  document.getElementById('app').addEventListener('load', async()=>{
    const frame=document.getElementById('app'); const w=frame.contentWindow; const d=frame.contentDocument;
    w.addEventListener('error',e=>errors.push({type:'error',message:e.message||'',source:e.filename||'',line:e.lineno||0}));
    w.addEventListener('unhandledrejection',e=>errors.push({type:'rejection',message:String(e.reason&&e.reason.message||e.reason||'')}));
    try{
      await sleep(300);
      const form=d.getElementById('login-form');
      if(form && !d.getElementById('login').classList.contains('hidden')){
        const email=d.getElementById('lg-user'), pass=d.getElementById('lg-pass');
        if(email)email.value='admin@demo.com'; if(pass)pass.value='demo123';
        form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      }
      await waitFor(()=>!d.body.classList.contains('pre-auth')&&d.getElementById('host'),10000);
      await sleep(800);
      const chk=d.getElementById('conf-chk'); if(chk){chk.checked=true;chk.dispatchEvent(new Event('change',{bubbles:true}));const ok=d.getElementById('conf-ok');if(ok)ok.click();}
      await sleep(300);
      const roleSel=d.getElementById('rol-sel'); let roleAvailable=false;
      if(roleSel){const opt=Array.from(roleSel.options).find(o=>o.value===ROLE||o.textContent.trim()===ROLE);if(opt){roleAvailable=true;roleSel.value=opt.value;roleSel.dispatchEvent(new Event('change',{bubbles:true}));}}
      await sleep(700);
      const store=w.Orbit&&w.Orbit.store, access=w.Orbit&&w.Orbit.access;
      const visibleClients=store&&access&&access.filter?access.filter('clientes',store.all('clientes')||[],'cliente360'):(store?store.all('clientes')||[]:[]);
      const visiblePolicies=store&&access&&access.filter?access.filter('polizas',store.all('polizas')||[],'polizas'):(store?store.all('polizas')||[]:[]);
      let route='#/cliente360';
      if(KIND==='clientDetail') route=visibleClients[0]?'#/cliente360?c='+encodeURIComponent(visibleClients[0].id):'#/cliente360';
      else if(KIND==='quality') route='#/calidad';
      else if(KIND==='policyDetail') route=visiblePolicies[0]?'#/polizas?p='+encodeURIComponent(visiblePolicies[0].id):'#/polizas';
      else if(KIND==='portal') route=visibleClients[0]?'#/portal?cliente='+encodeURIComponent(visibleClients[0].id):'#/portal';
      w.location.hash=route;
      await sleep(1600);
      const host=d.getElementById('host'); const text=(host&&host.innerText||'').trim();
      const required = KIND==='clientDetail' ? !!d.getElementById('crm-op1-client-panel') : KIND==='quality' ? !!d.getElementById('q-vig') : KIND==='policyDetail' ? /Ficha de Póliza/.test(text) : KIND==='portal' ? !!d.querySelector('.pt-shell') : !!d.querySelector('.tbl');
      const technical=/Firebase|Firestore|localStorage|Storage pendiente|API key|token visible|backend conectado/i.test(d.body.innerText||'');
      const overflow=d.documentElement.scrollWidth>w.innerWidth+3;
      const activeRole=access&&access.activeRole?access.activeRole():(roleSel?roleSel.value:'');
      const result={scenario:SCENARIO,roleRequested:ROLE,roleAvailable,activeRole,kind:KIND,route:w.location.hash,visibleClients:visibleClients.length,visiblePolicies:visiblePolicies.length,hostTextLength:text.length,requiredElement:required,technicalCopyVisible:technical,documentOverflow:overflow,errors,ok:roleAvailable&&text.length>20&&required&&!technical&&!overflow&&errors.length===0,at:new Date().toISOString()};
      await post(result);
    }catch(e){await post({scenario:SCENARIO,roleRequested:ROLE,kind:KIND,errors:errors.concat([{type:'harness',message:String(e&&e.message||e)}]),ok:false,at:new Date().toISOString()});}
  });
</script></body></html>`;
}

const mime = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (req.method === 'GET' && url.pathname === '/__crm_harness.html') {
    res.writeHead(200, { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' });
    res.end(harnessHtml(url)); return;
  }
  if (req.method === 'POST' && url.pathname === '/__crm_result') {
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      try { fs.appendFileSync(resultPath, `${body || '{}'}\n`, 'utf8'); } catch (e) {}
      res.writeHead(200, { 'content-type':'application/json' }); res.end('{"ok":true}');
    }); return;
  }
  let pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const full = path.normalize(path.join(app, pathname));
  if (!full.startsWith(path.normalize(app))) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(full).toLowerCase()] || 'application/octet-stream', 'cache-control':'no-store, no-cache, must-revalidate' });
    res.end(data);
  });
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', resolve);
});
add(`\nServidor visual listo en http://127.0.0.1:${port}`);

async function runScenario(s) {
  const screenshot = path.join(outDir, `${s.id}.png`);
  const profile = path.join(outDir, `profile-${s.id}`);
  fs.mkdirSync(profile, { recursive: true });
  const url = `http://127.0.0.1:${port}/__crm_harness.html?scenario=${encodeURIComponent(s.id)}&role=${encodeURIComponent(s.role)}&kind=${encodeURIComponent(s.kind)}`;
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-sync', '--metrics-recording-only',
    `--user-data-dir=${profile}`, `--window-size=${s.width},${s.height}`, '--virtual-time-budget=14000',
    `--screenshot=${screenshot}`, url
  ];
  return new Promise(resolve => {
    const child = spawn(browser, args, { stdio:['ignore','pipe','pipe'] });
    let stdout='', stderr=''; child.stdout.on('data',d=>stdout+=d); child.stderr.on('data',d=>stderr+=d);
    const timer=setTimeout(()=>{try{child.kill('SIGKILL');}catch(e){}},30000);
    child.on('close', code => { clearTimeout(timer); resolve({ ...s, code, screenshot, stdout:stdout.trim(), stderr:stderr.trim() }); });
  });
}

const launches=[];
for (const scenario of scenarios) {
  add(`Ejecutando ${scenario.id} · ${scenario.role} · ${scenario.width}x${scenario.height}`);
  launches.push(await runScenario(scenario));
  await new Promise(r=>setTimeout(r,250));
}
server.close();

let results=[];
if (fs.existsSync(resultPath)) {
  results=fs.readFileSync(resultPath,'utf8').split(/\r?\n/).filter(Boolean).map(line=>{try{return JSON.parse(line);}catch(e){return {ok:false,parseError:String(e),raw:line};}});
}
const byScenario=new Map(results.map(r=>[r.scenario,r]));
add('\n== RESULTADOS VISUALES ==');
let visualFail=0;
for (const launch of launches) {
  const result=byScenario.get(launch.id);
  const ok=launch.code===0 && result && result.ok===true && fs.existsSync(launch.screenshot);
  if(!ok)visualFail++;
  add(`${ok?'OK':'FALLÓ'} ${launch.id} · screenshot=${path.basename(launch.screenshot)} · browserExit=${launch.code}`);
  if(result)add(JSON.stringify(result));
  else add('Sin resultado del harness.');
}
add(`\nCapturas: ${outDir}`);
add(`Resumen: ${scenarios.length-visualFail}/${scenarios.length} escenarios aprobados.`);
add(visualFail ? 'RESULTADO CRM OP-1: BLOQUEADO POR VALIDACIÓN VISUAL' : 'RESULTADO CRM OP-1: VALIDACIÓN VISUAL AUTOMÁTICA APROBADA');
add('No se hizo deploy, commit, push, producción ni carga de datos reales.');
fs.writeFileSync(reportPath, log.join('\n'), 'utf8');
add(`Reporte: ${reportPath}`);
process.exit(visualFail ? 1 : 0);
