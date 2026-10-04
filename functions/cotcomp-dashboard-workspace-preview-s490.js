'use strict';

const {onRequest}=require('firebase-functions/v2/https');
const S486=require('./cotcomp-product-family-completeness-preview-s486');
const C=require('./cotcomp-gravicentra-provider-contract-s484');

const VERSION='ays-cotcomp-s490-dashboard-workspace-recovery-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompDashboardWorkspacePreviewS490';
const CATALOG_PATH=S486.CATALOG_PATH;

const VISUAL_REFERENCE_LOCK=Object.freeze({
  ref1Sha256:'b854a5a8c2bc6fd9f50339a31b98914bfa25a3dcdbb9c95a76905442f1cf36b0',
  ref2Sha256:'bad94a30d5c2f209c3efa9cedfccfa5e57c52deb270d5150cfac5e7f9cbcb735',
  rejectedS488ScreenshotSha256:'bb8e43ed25de8b89c5e1ec6d05c18230084f604ccf9d071f2fca50687bfa3e65'
});

function manifest(){
  const m=S486.fixtureManifest();
  const v=C.validateProviderManifest(m);
  if(!v.ok) throw new Error('S490_FIXTURE_MANIFEST_INVALID:'+v.errors.join(','));
  return m;
}

function routes(){
  return S486.ROUTES.map(r=>({...r}));
}

function securityHeaders(res){
  res.set('Cache-Control','no-store, max-age=0');
  res.set('Pragma','no-cache');
  res.set('Referrer-Policy','no-referrer');
  res.set('X-Content-Type-Options','nosniff');
  res.set('X-Frame-Options','DENY');
  res.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  res.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
}

function html(){
  const safeManifest=JSON.stringify(manifest()).replace(/</g,'\\u003c');
  const safeRoutes=JSON.stringify(routes()).replace(/</g,'\\u003c');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>A&S · Cotizador y Comparador</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--red:#c1121f;--red-dark:#9e0e19;--ink:#111318;--nav:#10141e;--nav2:#171c27;--text:#20242c;--muted:#727985;--line:#e7e9ed;--soft:#f6f7f9;--white:#fff;--green:#1b7f5a;--amber:#b67713}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;font-family:Inter,system-ui,sans-serif;background:#eef0f3;color:var(--text)}
button,input,select{font:inherit}button{cursor:pointer}:focus-visible{outline:3px solid rgba(193,18,31,.28);outline-offset:2px}
.app{min-height:100vh;display:grid;grid-template-columns:236px 1fr;background:#eef0f3}
.sidebar{background:linear-gradient(180deg,var(--nav),#0b0e15);color:#d9dde5;padding:22px 16px;display:flex;flex-direction:column;border-right:1px solid #202633;position:sticky;top:0;height:100vh}
.brand{padding:4px 8px 22px;border-bottom:1px solid #252b37}.brand strong{display:block;color:#fff;font-size:17px;letter-spacing:-.02em}.brand span{display:block;margin-top:4px;color:#8f97a6;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.nav-label{margin:20px 10px 8px;color:#697282;font-size:10px;text-transform:uppercase;letter-spacing:.11em;font-weight:700}
.nav-btn{width:100%;border:0;background:transparent;color:#aeb5c0;display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:9px;text-align:left;font-size:13px;margin:2px 0}
.nav-btn svg{width:18px;height:18px;flex:none}.nav-btn.active{background:rgba(193,18,31,.17);color:#fff;box-shadow:inset 3px 0 0 var(--red)}.nav-btn:hover{background:#1a202c;color:#fff}
.sidebar-footer{margin-top:auto;padding:14px 10px;border-top:1px solid #252b37}.sidebar-footer .support{font-size:11px;color:#8e97a5;line-height:1.45}.sidebar-footer strong{display:block;color:#fff;margin-top:4px;font-size:12px}
.main{min-width:0}
.topbar{height:70px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:40}
.top-title{display:flex;align-items:center;gap:12px}.top-title h1{font-size:18px;margin:0;color:#111318}.crumb{font-size:12px;color:var(--muted)}
.top-actions{display:flex;align-items:center;gap:10px}.country{border:1px solid var(--line);background:#fff;border-radius:9px;padding:9px 12px;font-size:12px;font-weight:600;color:#323843}.status-pill{display:inline-flex;align-items:center;gap:7px;border:1px solid #dce8e2;background:#f1f8f5;color:#256548;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:700}.status-pill::before{content:"";width:7px;height:7px;border-radius:50%;background:#39a66f}
.content{padding:24px 28px 40px;max-width:1480px;margin:0 auto}
.pagehead{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-bottom:18px}.pagehead h2{font-size:24px;letter-spacing:-.03em;margin:0;color:#111318}.pagehead p{font-size:13px;color:var(--muted);margin:6px 0 0}.mode-toggle{display:flex;background:#e7e9ed;border-radius:10px;padding:3px;gap:3px}.mode-toggle button{border:0;border-radius:8px;background:transparent;padding:8px 13px;font-size:12px;font-weight:700;color:#68707d}.mode-toggle button.active{background:#fff;color:#111318;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.metric{background:#fff;border:1px solid var(--line);border-radius:12px;padding:15px 16px;min-height:92px}.metric .k{font-size:11px;color:var(--muted);font-weight:600}.metric .v{margin-top:8px;font-size:19px;font-weight:800;color:#171a20}.metric .s{margin-top:5px;font-size:11px;color:#8a909a}.metric.accent{border-left:4px solid var(--red)}
.progress-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:13px 16px;margin-bottom:14px}.progress-title{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--muted);margin-bottom:10px}.progress-row{display:grid;grid-template-columns:repeat(8,1fr);gap:7px}.progress-step{min-width:0}.progress-step .bar{height:5px;border-radius:999px;background:#eceef1}.progress-step.active .bar{background:var(--red)}.progress-step.done .bar{background:#353b45}.progress-step span{display:block;margin-top:6px;font-size:9.5px;color:#8b919b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.progress-step.active span{color:#111318;font-weight:700}
.workspace{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(300px,.72fr);gap:14px;align-items:start}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 2px 8px rgba(18,24,31,.03)}.card-head{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:15px 17px;border-bottom:1px solid var(--line)}.card-head h3{font-size:14px;margin:0;color:#171a20}.card-head p{font-size:11px;color:var(--muted);margin:4px 0 0}.card-body{padding:17px}
.family-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.family{appearance:none;position:relative;text-align:left;border:1px solid #dfe2e7;background:#fff;border-radius:10px;padding:13px;min-height:94px;color:#20242c;transition:.15s}.family:hover{border-color:#bec4cc;transform:translateY(-1px)}.family.active{border-color:var(--red);box-shadow:0 0 0 1px var(--red);background:#fff9fa}.family .eyebrow{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#8a9099;font-weight:700}.family strong{display:block;font-size:13px;margin-top:8px;color:#171a20}.family p{font-size:10.5px;line-height:1.35;color:#7c838d;margin:5px 0 0}.family.active::after{content:"✓";position:absolute;top:9px;right:10px;width:19px;height:19px;border-radius:50%;display:grid;place-items:center;background:var(--red);color:#fff;font-size:10px;font-weight:800}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field.full{grid-column:1/-1}.field label{display:block;font-size:11px;font-weight:700;color:#4b525d;margin-bottom:6px}.field input,.field select{width:100%;min-height:42px;border:1px solid #dfe2e7;background:#fff;border-radius:9px;padding:0 12px;font-size:12.5px;color:#1f2329}.field input:focus,.field select:focus{border-color:var(--red);outline:3px solid rgba(193,18,31,.09)}.hint{font-size:10.5px;color:#8a909a;margin-top:5px;line-height:1.35}
.combo{position:relative}.combo .chev{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#7e8490;pointer-events:none}.combo-list{position:absolute;z-index:30;left:0;right:0;top:calc(100% + 4px);display:none;background:#fff;border:1px solid #cfd3da;border-radius:9px;box-shadow:0 12px 30px rgba(10,15,25,.12);padding:5px;max-height:220px;overflow:auto}.combo-list.open{display:block}.opt{padding:9px 10px;border-radius:7px;font-size:12px}.opt:hover{background:#f3f4f6}.opt.fallback{border-top:1px solid #eceef0;margin-top:4px;color:var(--red);font-weight:700}
.actions{display:flex;justify-content:flex-end;gap:8px;padding-top:16px;margin-top:16px;border-top:1px solid var(--line)}.btn{min-height:40px;border-radius:9px;padding:0 15px;border:1px solid #dfe2e7;background:#fff;color:#363c45;font-size:12px;font-weight:700}.btn.primary{background:var(--red);border-color:var(--red);color:#fff}.btn.primary:hover{background:var(--red-dark)}.btn:disabled{opacity:.45;cursor:not-allowed}
.summary{position:sticky;top:88px}.summary-list{display:flex;flex-direction:column}.summary-row{display:flex;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid #eff1f3;font-size:11.5px}.summary-row:last-child{border-bottom:0}.summary-row span{color:#7c838d}.summary-row strong{color:#262b33;text-align:right}.callout{border-radius:10px;padding:12px 13px;margin-top:12px;font-size:11px;line-height:1.45}.callout.info{background:#f6f7f9;color:#5b626c;border:1px solid #e6e8eb}.callout.assist{background:#fff6f6;border:1px solid #f2cfd3;color:#74424a}.callout.assist strong{color:#a00f1c}
.table-card{margin-top:14px}.table-wrap{overflow:auto}.compare-table{width:100%;border-collapse:collapse;font-size:11px}.compare-table th,.compare-table td{padding:11px 12px;border-bottom:1px solid #eceef1;text-align:left;white-space:nowrap}.compare-table th{background:#fafbfc;color:#69717c;font-size:10px;text-transform:uppercase;letter-spacing:.04em}.compare-table td strong{color:#181c22}.badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:9.5px;font-weight:700}.badge.green{background:#edf7f2;color:#247051}.badge.amber{background:#fff7e9;color:#9a6818}.badge.red{background:#fff0f1;color:#a1131f}
.empty{padding:24px 12px;text-align:center;color:#858c96;font-size:12px}.empty strong{display:block;color:#343a43;margin-bottom:6px}
@media(max-width:1180px){.family-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.metrics{grid-template-columns:repeat(2,1fr)}.workspace{grid-template-columns:1fr}.summary{position:static}}
@media(max-width:820px){.app{grid-template-columns:76px 1fr}.sidebar{padding:18px 9px}.brand strong{font-size:12px}.brand span,.nav-btn span,.nav-label,.sidebar-footer{display:none}.nav-btn{justify-content:center;padding:11px}.topbar{padding:0 16px}.content{padding:18px 16px}.progress-row{grid-template-columns:repeat(4,1fr)}}
@media(max-width:620px){.app{display:block}.sidebar{display:none}.topbar{height:auto;min-height:62px;gap:10px;flex-wrap:wrap;padding:12px 14px}.pagehead{align-items:flex-start;flex-direction:column}.metrics{grid-template-columns:1fr 1fr}.family-grid,.form-grid{grid-template-columns:1fr}.field.full{grid-column:auto}.content{padding:14px}.progress-row{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand"><strong>Alianzas &amp; Soluciones</strong><span>Corredores de Seguros</span></div>
    <div class="nav-label">Cotizador</div>
    <button class="nav-btn active" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg><span>Nueva cotización</span></button>
    <button class="nav-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 18V6m5 12V9m5 9V4m5 14v-7"/></svg><span>Comparar</span></button>
    <button class="nav-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l3 6 6 .9-4.5 4.4 1.1 6.2L12 17.5 6.4 20.5l1.1-6.2L3 9.9 9 9z"/></svg><span>Recomendación</span></button>
    <div class="nav-label">Ayuda</div>
    <button id="assistNav" class="nav-btn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v11H8l-4 3z"/></svg><span>Hablar con un asesor</span></button>
    <div class="sidebar-footer"><div class="support">¿Necesitas apoyo?</div><strong>A&S te acompaña</strong></div>
  </aside>

  <main class="main">
    <header class="topbar">
      <div class="top-title"><div><div class="crumb">Cotizador / Nueva solicitud</div><h1>Cotizador &amp; Comparador</h1></div></div>
      <div class="top-actions">
        <select id="countrySelect" class="country" aria-label="País"><option value="GT">Guatemala</option><option value="CO">Colombia</option></select>
        <span class="status-pill">Sesión de cotización</span>
      </div>
    </header>

    <div class="content">
      <div class="pagehead">
        <div><h2>Nueva cotización</h2><p>Selecciona la necesidad y completa únicamente los datos que correspondan.</p></div>
        <div class="mode-toggle"><button id="onlineMode" class="active" type="button">En línea</button><button id="assistedMode" type="button">Con acompañamiento</button></div>
      </div>

      <section class="metrics">
        <div class="metric accent"><div class="k">Etapa actual</div><div id="metricStage" class="v">1 de 8</div><div id="metricStageName" class="s">Necesidad</div></div>
        <div class="metric"><div class="k">País</div><div id="metricCountry" class="v">Guatemala</div><div class="s">Contexto del recorrido</div></div>
        <div class="metric"><div class="k">Producto</div><div id="metricProduct" class="v">Sin seleccionar</div><div class="s">Elige una familia para comenzar</div></div>
        <div class="metric"><div class="k">Estado</div><div id="metricStatus" class="v">En preparación</div><div class="s">Vista previa LAB · sin envío</div></div>
      </section>

      <section class="progress-card">
        <div class="progress-title"><span>Progreso de cotización</span><span id="progressPct">12%</span></div>
        <div id="progressRow" class="progress-row"></div>
      </section>

      <div class="workspace">
        <section class="card">
          <div class="card-head"><div><h3 id="mainTitle">¿Qué quieres proteger?</h3><p id="mainSubtitle">Empieza por la necesidad. El recorrido se adapta al producto y al país.</p></div><span id="schemaBadge" class="badge green" style="display:none">Ruta estructurada</span></div>
          <div class="card-body">
            <div id="familyGrid" class="family-grid"></div>
            <div id="formArea" style="display:none;margin-top:16px"></div>
            <div class="actions"><button id="backBtn" class="btn" type="button" disabled>Volver</button><button id="nextBtn" class="btn primary" type="button" disabled>Continuar</button></div>
          </div>
        </section>

        <aside class="card summary">
          <div class="card-head"><div><h3>Resumen</h3><p>Contexto de esta cotización</p></div></div>
          <div class="card-body">
            <div class="summary-list">
              <div class="summary-row"><span>País</span><strong id="sumCountry">Guatemala</strong></div>
              <div class="summary-row"><span>Familia</span><strong id="sumFamily">Pendiente</strong></div>
              <div class="summary-row"><span>Modalidad</span><strong id="sumMode">En línea</strong></div>
              <div class="summary-row"><span>Autoridad</span><strong>Gravicentra</strong></div>
            </div>
            <div id="summaryCallout" class="callout info">Todavía no se ha seleccionado una familia de protección.</div>
          </div>
        </aside>
      </div>

      <section class="card table-card">
        <div class="card-head"><div><h3>Alternativas y comparación</h3><p>Esta zona se activa cuando existen propuestas validadas y comparables.</p></div><span class="badge amber">Pendiente</span></div>
        <div id="compareArea" class="table-wrap"><div class="empty"><strong>Aún no hay propuestas para comparar</strong>Primero completa el recorrido de cotización.</div></div>
      </section>
    </div>
  </main>
</div>

<script>
(()=>{
  const MANIFEST=${safeManifest};
  const ROUTES=${safeRoutes};
  const API='${CATALOG_PATH}';
  const STAGES=['Necesidad','Elegibilidad','Datos','Mercado','Propuestas','Validación','Comparar','Recomendación'];

  const familyGrid=document.getElementById('familyGrid');
  const formArea=document.getElementById('formArea');
  const nextBtn=document.getElementById('nextBtn');
  const backBtn=document.getElementById('backBtn');
  const countrySelect=document.getElementById('countrySelect');
  const onlineMode=document.getElementById('onlineMode');
  const assistedMode=document.getElementById('assistedMode');
  const assistNav=document.getElementById('assistNav');
  const progressRow=document.getElementById('progressRow');
  const compareArea=document.getElementById('compareArea');
  const schemaBadge=document.getElementById('schemaBadge');
  const mainTitle=document.getElementById('mainTitle');
  const mainSubtitle=document.getElementById('mainSubtitle');

  let country='GT',step=0,route=null,schema=null,mode='ONLINE';
  let brands=[],models=[],brand=null,model=null,year='';

  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean=v=>String(v==null?'':v).trim(),up=v=>clean(v).toUpperCase();
  const norm=s=>String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
  const compact=s=>norm(s).replace(/[^A-Z0-9]/g,'');
  const qp=o=>new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([,v])=>v!==''&&v!=null))).toString();

  function resolveSchema(r){
    if(!r||r.mode!=='SCHEMA')return null;
    return (MANIFEST.intakeSchemas||[]).find(s=>s.enabled===true &&
      up(s.scope.country)===up(country) &&
      up(s.scope.lineOfBusiness)===up(r.context.lineOfBusiness) &&
      clean(s.scope.productId)===clean(r.context.productId) &&
      up(s.scope.riskType)===up(r.context.riskType)
    )||null;
  }

  function labelFor(r){return r?r.label:'Sin seleccionar'}
  function renderFamilies(){
    familyGrid.innerHTML=ROUTES.map(r=>'<button type="button" class="family'+(route&&route.id===r.id?' active':'')+'" data-route="'+esc(r.id)+'"><span class="eyebrow">'+esc(r.group)+'</span><strong>'+esc(r.label)+'</strong><p>'+esc(r.description)+'</p></button>').join('');
    familyGrid.querySelectorAll('[data-route]').forEach(btn=>btn.addEventListener('click',()=>{
      route=ROUTES.find(r=>r.id===btn.dataset.route)||null;
      schema=resolveSchema(route);
      step=0;mode=schema?'ONLINE':'ASSISTED';brand=null;model=null;year='';
      renderAll();
    }));
  }

  function renderProgress(){
    progressRow.innerHTML=STAGES.map((s,i)=>'<div class="progress-step '+(i<step?'done ':i===step?'active ':'')+'"><div class="bar"></div><span>'+esc(s)+'</span></div>').join('');
    document.getElementById('progressPct').textContent=Math.round(((step+1)/STAGES.length)*100)+'%';
    document.getElementById('metricStage').textContent=(step+1)+' de '+STAGES.length;
    document.getElementById('metricStageName').textContent=STAGES[step];
  }

  function updateSummary(){
    const countryName=country==='GT'?'Guatemala':'Colombia';
    document.getElementById('metricCountry').textContent=countryName;
    document.getElementById('sumCountry').textContent=countryName;
    document.getElementById('metricProduct').textContent=route?route.label:'Sin seleccionar';
    document.getElementById('sumFamily').textContent=route?route.label:'Pendiente';
    document.getElementById('sumMode').textContent=mode==='ONLINE'?'En línea':'Con acompañamiento';
    onlineMode.classList.toggle('active',mode==='ONLINE');
    assistedMode.classList.toggle('active',mode==='ASSISTED');
    schemaBadge.style.display=schema?'inline-flex':'none';
    const c=document.getElementById('summaryCallout');
    if(!route){c.className='callout info';c.textContent='Todavía no se ha seleccionado una familia de protección.'}
    else if(!schema){c.className='callout assist';c.innerHTML='<strong>Continuará con acompañamiento.</strong><br>No cargamos un formulario autoritativo para esta combinación; no se inventarán preguntas ni tarifas.'}
    else{c.className='callout info';c.textContent='Ruta estructurada disponible para este ejemplo LAB. La conexión real con Gravicentra sigue bloqueada.'}
  }

  function genericForm(){
    if(!schema)return '';
    return '<div class="form-grid">'+schema.fields.map(f=>{
      if(f.type==='SELECT'){const opts=((f.ui&&f.ui.options)||[]).map(v=>'<option>'+esc(v)+'</option>').join('');return '<div class="field"><label>'+esc(f.label)+'</label><select><option value="">Selecciona una opción</option>'+opts+'</select></div>'}
      if(f.type==='BOOLEAN')return '<div class="field"><label>'+esc(f.label)+'</label><select><option value="">Selecciona</option><option>Sí</option><option>No</option></select></div>';
      if(f.type==='MONEY')return '<div class="field full"><label>'+esc(f.label)+'</label><input type="number" min="0" placeholder="Valor aproximado"><div class="hint">No calcula prima localmente.</div></div>';
      return '<div class="field"><label>'+esc(f.label)+'</label><input type="text"></div>';
    }).join('')+'</div>';
  }

  async function getCatalog(op,args={}){
    const r=await fetch(API+'?'+qp({op,...args}),{headers:{accept:'application/json'}});const j=await r.json();
    if(!r.ok||!j.ok)throw new Error(j.code||'CATALOG_UNAVAILABLE');return j;
  }
  function open(list){list.classList.add('open')}function close(list){list.classList.remove('open')}
  function renderBrands(){
    const input=document.getElementById('brandInput'),list=document.getElementById('brandList');if(!input||!list)return;
    const q=norm(input.value),rows=brands.filter(x=>!q||norm(x.label).includes(q)).slice(0,50);
    list.innerHTML=rows.map(x=>'<div class="opt" data-id="'+esc(x.brandId)+'" data-label="'+esc(x.label)+'">'+esc(x.label)+'</div>').join('')+'<div class="opt fallback" data-fallback="brand">No encuentro mi marca</div>';open(list);
  }
  function renderModels(){
    const input=document.getElementById('modelInput'),list=document.getElementById('modelList');if(!input||!list)return;
    const q=compact(input.value),rows=models.filter(x=>!q||compact(x.label).includes(q)).slice(0,70);
    list.innerHTML=rows.map(x=>'<div class="opt" data-id="'+esc(x.modelId)+'" data-label="'+esc(x.label)+'">'+esc(x.label)+'</div>').join('')+'<div class="opt fallback" data-fallback="model">No encuentro mi línea / modelo</div>';open(list);
  }
  async function loadBrands(){try{brands=(await getCatalog('brands',{vehicleClass:'AUTO_LIGHT',limit:200})).items||[]}catch{}}
  async function loadModels(){if(!brand)return;try{models=(await getCatalog('models',{vehicleClass:'AUTO_LIGHT',brandId:brand.brandId,limit:200})).items||[]}catch{}}
  async function loadYears(){const el=document.getElementById('yearSelect');if(!el)return;try{const j=await getCatalog('years');el.innerHTML='<option value="">Selecciona el año</option>'+(j.items||[]).map(v=>'<option value="'+v+'">'+v+'</option>').join('')}catch{}}

  function vehicleForm(){
    return '<div class="form-grid"><div class="field full"><label>Marca</label><div class="combo"><input id="brandInput" type="text" role="combobox" autocomplete="off" placeholder="Escribe para buscar"><span class="chev">⌄</span><div id="brandList" class="combo-list"></div></div><div class="hint">Busca y selecciona en el mismo control.</div></div><div class="field full"><label>Línea / modelo</label><div class="combo"><input id="modelInput" type="text" role="combobox" autocomplete="off" placeholder="Selecciona primero la marca" disabled><span class="chev">⌄</span><div id="modelList" class="combo-list"></div></div></div><div class="field"><label>Año</label><select id="yearSelect"><option value="">Selecciona el año</option></select></div><div class="field"><label>Uso</label><select><option>Particular</option><option>Comercial</option></select></div></div>';
  }

  function bindVehicle(){
    const bi=document.getElementById('brandInput'),bl=document.getElementById('brandList'),mi=document.getElementById('modelInput'),ml=document.getElementById('modelList'),ys=document.getElementById('yearSelect');
    if(bi&&bl){loadBrands();bi.addEventListener('focus',renderBrands);bi.addEventListener('input',()=>{brand=null;model=null;if(mi){mi.disabled=true;mi.value=''}renderBrands()});bl.addEventListener('mousedown',e=>{e.preventDefault();const x=e.target.closest('[data-id],[data-fallback]');if(!x)return;if(x.dataset.fallback){mode='ASSISTED';updateSummary();close(bl);return}brand={brandId:x.dataset.id,label:x.dataset.label};bi.value=brand.label;close(bl);if(mi){mi.disabled=false;mi.value='';mi.placeholder='Escribe para buscar'}loadModels()})}
    if(mi&&ml){mi.addEventListener('focus',()=>{if(brand)renderModels()});mi.addEventListener('input',()=>{model=null;renderModels()});ml.addEventListener('mousedown',e=>{e.preventDefault();const x=e.target.closest('[data-id],[data-fallback]');if(!x)return;if(x.dataset.fallback){mode='ASSISTED';updateSummary();close(ml);return}model={modelId:x.dataset.id,label:x.dataset.label};mi.value=model.label;close(ml)})}
    if(ys){loadYears();ys.addEventListener('change',()=>year=ys.value)}
  }

  function renderForm(){
    if(!route){formArea.style.display='none';nextBtn.disabled=true;return}
    formArea.style.display='block';
    if(!schema){
      formArea.innerHTML='<div class="callout assist"><strong>'+esc(route.label)+'</strong><br>Esta familia seguirá por acompañamiento mientras no exista un schema autoritativo disponible para esta combinación.</div>';
      nextBtn.disabled=false;nextBtn.textContent='Continuar con acompañamiento';return;
    }
    mainTitle.textContent=step===0?'Completa los datos iniciales':STAGES[step];
    mainSubtitle.textContent='La captura es progresiva y mantiene separada la autoridad de negocio.';
    formArea.innerHTML=route.id==='vehicle'?vehicleForm():genericForm();
    if(route.id==='vehicle')bindVehicle();
    nextBtn.disabled=false;nextBtn.textContent='Continuar';
  }

  function renderComparison(){
    if(step<6){compareArea.innerHTML='<div class="empty"><strong>Aún no hay propuestas para comparar</strong>Primero completa el recorrido de cotización.</div>';return}
    compareArea.innerHTML='<table class="compare-table"><thead><tr><th>Aspecto</th><th>Alternativa A</th><th>Alternativa B</th><th>Estado</th></tr></thead><tbody><tr><td><strong>Prima total</strong></td><td>Dato de Proposal</td><td>Dato de Proposal</td><td><span class="badge green">Validada</span></td></tr><tr><td>Deducible</td><td>Normalizado</td><td>Normalizado</td><td><span class="badge green">Comparable</span></td></tr><tr><td>Asistencia</td><td>Fact normalizado</td><td>Fact normalizado</td><td><span class="badge amber">Según fuente</span></td></tr><tr><td>Dato faltante</td><td>MISSING</td><td>Presente</td><td><span class="badge red">No equivale a no cubierto</span></td></tr></tbody></table>';
  }

  function renderAll(){
    renderFamilies();renderProgress();updateSummary();renderForm();renderComparison();
    backBtn.disabled=step===0;
    document.getElementById('metricStatus').textContent=mode==='ASSISTED'?'Acompañamiento':'En preparación';
  }

  nextBtn.addEventListener('click',()=>{if(!route)return;if(mode==='ASSISTED'){document.getElementById('summaryCallout').innerHTML='<strong>Listo para acompañamiento.</strong><br>Esta vista previa no envía datos.';return}if(step<7){step++;renderAll()}});
  backBtn.addEventListener('click',()=>{if(step>0){step--;renderAll()}});
  countrySelect.addEventListener('change',()=>{country=countrySelect.value;route=null;schema=null;step=0;mode='ONLINE';renderAll()});
  onlineMode.addEventListener('click',()=>{if(schema){mode='ONLINE';renderAll()}});
  assistedMode.addEventListener('click',()=>{mode='ASSISTED';renderAll()});
  assistNav.addEventListener('click',()=>{mode='ASSISTED';renderAll()});

  renderAll();
})();
</script>
</body>
</html>`;
}

function handler(req,res){
  securityHeaders(res);
  if(req.method!=='GET'){res.set('Allow','GET');return res.status(405).send('Método no permitido.');}
  res.set('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html());
}

const cotcompDashboardWorkspacePreviewS490=onRequest({
  region:REGION,timeoutSeconds:30,memory:'256MiB',maxInstances:2,concurrency:40,invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,CATALOG_PATH,VISUAL_REFERENCE_LOCK,
  manifest,routes,securityHeaders,html,handler,cotcompDashboardWorkspacePreviewS490
});
