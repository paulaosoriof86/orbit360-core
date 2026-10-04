'use strict';

const fs=require('fs');
const path=require('path');
const DOMAIN=require('./cotcomp-s497-domain-schema');

/*
 * CotComp S4.97 CLEAN VISUAL PARENT — SOURCE ONLY
 * No deployment export. No legacy visual parent. No real provider transport.
 * Visual authority: S4.10/S4.18 forensic recovery anchor + later Owner-authorized deltas.
 */

const VERSION='ays-cotcomp-s497-clean-parent-v0.1-source-only';
const DEPLOYMENT_EXPORT=false;

const PACKAGED=Object.freeze({
  logo:'data:image/webp;base64,'+fs.readFileSync(path.join(__dirname,'cotcomp-s497-logo-derived-official.b64'),'utf8').trim(),
  hero:'data:image/webp;base64,'+fs.readFileSync(path.join(__dirname,'cotcomp-s497-hero-governed.b64'),'utf8').trim(),
  scenes:'data:image/webp;base64,'+fs.readFileSync(path.join(__dirname,'cotcomp-s497-family-scenes-governed.b64'),'utf8').trim()
});

const SCENES=Object.freeze({
  vehicle:{x:'0%',y:'0%'},
  home:{x:'33.333%',y:'0%'},
  health:{x:'66.667%',y:'0%'},
  life:{x:'100%',y:'0%'},
  business:{x:'0%',y:'100%'},
  cargo:{x:'33.333%',y:'100%'},
  other:{x:'66.667%',y:'100%'}
});

const FAMILIES=Object.freeze([
  {id:'vehicle',label:'Vehículo / Movilidad',desc:'Vehículo, uso y condiciones que influyen en tus opciones',icon:'🚗'},
  {id:'home',label:'Hogar',desc:'Vivienda, contenido y responsabilidad familiar',icon:'⌂'},
  {id:'health',label:'Salud / Gastos médicos',desc:'Red, plan y condiciones relevantes',icon:'✚'},
  {id:'life',label:'Vida / Ingreso',desc:'Dependientes y continuidad económica',icon:'♥'},
  {id:'business',label:'Empresa',desc:'Operación, exposición y prioridad',icon:'▦'},
  {id:'cargo',label:'Transporte / Carga',desc:'Rol en la cadena, carga y puntos críticos',icon:'▰'},
  {id:'other',label:'Otros / No sé cuál necesito',desc:'Orientación antes de pedir datos de producto',icon:'?'}
]);

function manifest(){
  return Object.freeze({
    version:VERSION,
    sourceOnly:true,
    cleanVisualParent:true,
    visualAnchor:'OWNER_REVIEW_COTCOMP_S4_10_STANDALONE.html',
    visualAnchorSha256:'a7f1be79cdb6d8144f608dc559d69ebc38bb6347a03ad2733eac2bb914a4673d',
    providerDeploymentAuthorized:false,
    cotcompRealTransportAuthorized:false,
    production:false,
    ownerReviewUrlAuthorized:false,
    packagedAssets:{
      logoSha256:'dfac6f73cf0a6ca54956bcb1f00a0385980ace685ef5366515317f7e5220d0f8',
      heroSha256:'a80c5458137e2914a6e8d43f8212ea1997ea5d8ba8d4a44136c36ef28cb927bd',
      familySpriteSha256:'4209a06de9b030c0f81d5b004fbf995018f8b050418c22913daaf1f73ead4800'
    }
  });
}

function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function familyCards(){
  return FAMILIES.map((f,i)=>`<button class="cc-family${i===0?' is-selected':''}" type="button" data-family="${f.id}" aria-pressed="${i===0?'true':'false'}" data-visual-asset="family:${f.id}">
    <span class="cc-icon cc-icon--${f.id}" aria-hidden="true">${f.icon}</span>
    <span><strong>${esc(f.label)}</strong><small>${esc(f.desc)}</small></span>
  </button>`).join('');
}

function html(){
  const mf=manifest();
  const domainSnapshot={};
  for(const country of ['gt','co']){
    for(const product of ['auto','hogar','salud','vida','empresa','transporte','duda','contrato','revision']){
      domainSnapshot[country+':'+product]={
        schema:DOMAIN.schema(country,product),
        comparison:DOMAIN.comparison(country,product),
        execution:DOMAIN.execution(country,product)
      };
    }
  }
  const familyToProduct=DOMAIN.FAMILY_TO_PRODUCT;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="ays-candidate" content="${VERSION}">
<meta name="ays-status" content="SOURCE_ONLY_NOT_OWNER_REVIEW">
<title>A&S · Cotiza y compara con criterio · S4.97 clean parent</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--red:#E4002B;--red2:#C4001F;--ink:#12110F;--graph:#0E0D10;--ivory:#F4F1EA;--soft:#FAF7F2;--muted:#6E655C;--line:#E7E2D6;--green:#285B3B;--amber:#C98718;--purple:#7955B3}
*{box-sizing:border-box}html,body{margin:0;background:var(--ivory);color:var(--ink);font-family:'Instrument Sans',system-ui,sans-serif}button,input,select{font:inherit}button{cursor:pointer}
:focus-visible{outline:3px solid rgba(228,0,43,.28);outline-offset:3px}
.cc-header{position:sticky;top:0;z-index:40;background:#fff;border-bottom:1px solid var(--line)}
.cc-header__inner{max-width:1600px;height:82px;margin:auto;padding:0 clamp(20px,3vw,44px);display:flex;align-items:center;gap:28px}
.cc-brand{display:flex;align-items:center;flex:0 0 auto}.cc-brand img{display:block;width:190px;height:auto;max-height:58px;object-fit:contain}
.cc-nav{display:flex;gap:22px;align-items:center;margin-right:auto}.cc-nav button{border:0;background:none;color:#3D3832;font-size:14px;font-weight:600;padding:10px 0}.cc-nav .is-active{color:var(--red2);border-bottom:2px solid var(--red)}
.cc-country{display:flex;border:1px solid var(--line);border-radius:11px;overflow:hidden}.cc-country button{min-height:42px;border:0;background:#fff;padding:0 12px;font-size:12px;font-weight:700}.cc-country .is-active{background:var(--graph);color:#fff}
.cc-advisor{min-height:44px;border:0;border-radius:11px;background:var(--red);color:#fff;padding:0 17px;font-weight:700}

.cc-hero{min-height:370px;background:var(--graph);color:#fff;display:grid;grid-template-columns:minmax(0,1.02fr) minmax(0,.98fr);grid-template-areas:"copy media";overflow:hidden}
.cc-hero__copy{grid-area:copy;z-index:2;align-self:center;padding:48px 32px 68px max(34px,calc((100vw - 1500px)/2 + 34px));max-width:780px}
.cc-kicker{font-family:'IBM Plex Mono';font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:#FF7C8C;display:flex;align-items:center;gap:10px}.cc-kicker:before{content:"";width:30px;height:2px;background:var(--red)}
.cc-hero__title{font-family:'Archivo';font-weight:900;font-size:clamp(46px,4.6vw,72px);line-height:.92;letter-spacing:-.045em;max-width:10ch;margin:18px 0 18px}.cc-hero__title em{font-style:normal;color:#FF3B54}
.cc-hero__lead{font-size:17px;line-height:1.55;color:#D7D1C4;max-width:52ch;margin:0}
.cc-hero__benefits{display:flex;gap:28px;flex-wrap:wrap;margin-top:26px}.cc-hero__benefit{font-size:12.5px;line-height:1.35;color:#EFE9DD;border-top:1px solid rgba(255,255,255,.22);padding-top:9px}
.cc-hero__media{grid-area:media;position:relative;min-height:370px;overflow:hidden;background:#201B1E}
.cc-hero__media:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,var(--graph) 0%,rgba(14,13,16,.67) 16%,rgba(14,13,16,.10) 48%,rgba(14,13,16,0) 100%)}
.cc-hero__media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 42%;display:block}

.cc-wrap{max-width:1240px;margin:-28px auto 64px;padding:0 24px;position:relative;z-index:5}
.cc-workspace{display:grid;grid-template-columns:220px minmax(0,1fr);background:#fff;border-radius:26px;overflow:hidden;box-shadow:0 26px 80px -48px rgba(18,17,15,.52);border:1px solid rgba(231,226,214,.9)}
.cc-rail{background:#121015;color:#fff;padding:28px 18px;display:flex;flex-direction:column;gap:18px}.cc-rail__label{font-family:'IBM Plex Mono';font-size:10px;letter-spacing:.15em;color:#A99FA6;text-transform:uppercase;margin:0 10px 2px}
.cc-step{display:flex;gap:12px;align-items:center;min-height:62px;border-radius:14px;padding:10px 12px;color:#8F898F}.cc-step__n{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#201D24;font-family:'IBM Plex Mono';font-size:11px}.cc-step strong{font-size:13px;line-height:1.25}.cc-step.is-active{background:#fff;color:var(--ink)}.cc-step.is-active .cc-step__n{background:var(--red);color:#fff}
.cc-stage{min-width:0;background:#F8F4ED}.cc-stage__head{background:#151217;color:#fff;padding:26px 28px;display:flex;align-items:center;gap:18px}.cc-stage__number{font-family:'Archivo';font-size:58px;font-weight:900;line-height:.85;color:#E5002D}.cc-stage__head small{display:block;font-family:'IBM Plex Mono';font-size:10px;letter-spacing:.13em;color:#FF8594;text-transform:uppercase;margin-bottom:5px}.cc-stage__head h2{font-family:'Archivo';font-weight:800;font-size:24px;line-height:1.05;margin:0}.cc-stage__body{padding:28px}
.cc-truth{border:1px solid #E9C98F;background:#FFF7E8;color:#6D5430;border-radius:14px;padding:13px 15px;font-size:12.5px;line-height:1.5;margin-bottom:16px}
.cc-mode-toggle{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:26px}.cc-mode{min-height:44px;border:1px solid #D8D0C5;background:#fff;border-radius:12px;padding:0 15px;font-size:12.5px;font-weight:700;color:#4F4740}.cc-mode small{display:block;font-size:10px;font-weight:500;color:#83796F;margin-top:2px}.cc-mode.is-active{background:#17141A;border-color:#17141A;color:#fff}.cc-mode.is-active small{color:#D4CBC2}
.cc-paths{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}.cc-path{min-height:42px;border:1px solid #D8D0C5;background:#fff;border-radius:999px;padding:0 14px;font-size:12px;font-weight:700}.cc-path.is-active{background:#17141A;color:#fff;border-color:#17141A}
.cc-section-kicker{font-family:'IBM Plex Mono';font-size:10px;letter-spacing:.13em;color:var(--red2);text-transform:uppercase}.cc-section-title{font-family:'Archivo';font-weight:900;font-size:32px;letter-spacing:-.025em;line-height:1.02;margin:8px 0 8px}.cc-section-lead{font-size:14.5px;line-height:1.55;color:#5F5750;margin:0 0 20px}
.cc-family-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.cc-family{min-height:108px;padding:16px;border:1.5px solid #DED6CA;background:#fff;border-radius:18px;text-align:left;display:flex;align-items:center;gap:13px;color:var(--ink)}.cc-family strong{display:block;font-family:'Archivo';font-weight:800;font-size:14px;line-height:1.1}.cc-family small{display:block;font-size:11.5px;color:#6E655C;line-height:1.35;margin-top:5px}.cc-family.is-selected{border-color:var(--red);box-shadow:0 10px 26px -20px rgba(228,0,43,.65);background:#FFF7F8}
.cc-icon{flex:none;width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:#fff;font-family:'Archivo';font-weight:900;font-size:20px;box-shadow:inset 0 1px 1px rgba(255,255,255,.6),0 10px 20px -13px rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.45)}
.cc-icon--vehicle{background:linear-gradient(145deg,#FF7085,#B0002A)}.cc-icon--home{background:linear-gradient(145deg,#FF8D82,#A83830)}.cc-icon--health{background:linear-gradient(145deg,#F68CC3,#8F225E)}.cc-icon--life{background:linear-gradient(145deg,#BB86E8,#65339A)}.cc-icon--business{background:linear-gradient(145deg,#FF985F,#AF4B14)}.cc-icon--cargo{background:linear-gradient(145deg,#89AEE8,#325EAA)}.cc-icon--other{background:linear-gradient(145deg,#B8B1C2,#5A5260)}

.cc-route-context{display:grid;grid-template-columns:minmax(240px,.72fr) minmax(0,1.28fr);gap:16px;align-items:stretch;margin:20px 0 4px}.cc-route-photo{min-height:178px;border-radius:16px;background-image:url("${PACKAGED.scenes}");background-repeat:no-repeat;background-size:400% 200%;background-position:0% 0%;box-shadow:0 18px 36px -30px rgba(0,0,0,.55)}.cc-route-copy{background:#17141A;color:#fff;border-radius:16px;padding:18px;display:flex;flex-direction:column;justify-content:center}.cc-route-copy small{font-family:'IBM Plex Mono';font-size:10px;letter-spacing:.12em;color:#FF8997;text-transform:uppercase}.cc-route-copy strong{font-family:'Archivo';font-size:20px;line-height:1.1;margin:7px 0}.cc-route-copy p{font-size:12.5px;line-height:1.5;color:#DCD3C8;margin:0}
.cc-stage-panel{margin-top:18px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px}.cc-stage-panel__head{display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--line);padding-bottom:13px;margin-bottom:15px}.cc-stage-panel__head b{font-family:'Archivo';font-size:18px}.cc-stage-panel__head span{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:#17131D;color:#fff;font-family:'IBM Plex Mono';font-size:10px}
.cc-field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.cc-field{display:flex;flex-direction:column;gap:7px}.cc-label{font-size:12px;font-weight:700}.cc-control{min-height:48px;border:1px solid #D9CFC2;border-radius:12px;background:#fff;padding:0 14px;font-size:15px;color:var(--ink)}.cc-help{font-size:10.5px;line-height:1.4;color:#8A7F74}
.cc-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0}.cc-summary{background:#17141A;color:#fff;border-radius:14px;padding:14px}.cc-summary small{font-size:10px;color:#A79EA8}.cc-summary strong{display:block;font-size:14px;margin-top:5px}
.cc-review-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.cc-review-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px}.cc-review-card b{font-family:'Archivo';font-size:17px}.cc-review-card strong{display:block;font-family:'Archivo';font-size:24px;margin:14px 0 6px}
.cc-compare{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid var(--line);border-radius:16px}.cc-compare th{background:#17141A;color:#fff;text-align:left;padding:14px;font-size:13px}.cc-compare td{padding:13px 14px;border-top:1px solid var(--line);font-size:13px;background:#fff}.cc-compare td:first-child{font-weight:700;background:#F5F0E8;width:35%}
.cc-no-compare{margin-top:16px;background:#17141A;color:#fff;border-radius:16px;padding:20px;border-left:4px solid #C98718}.cc-no-compare small{font-family:'IBM Plex Mono';font-size:10px;letter-spacing:.12em;color:#E7C27B;text-transform:uppercase}.cc-no-compare h3{font-family:'Archivo';font-size:21px;line-height:1.15;margin:9px 0 7px}.cc-no-compare p{font-size:13px;line-height:1.55;color:#DED6CC;margin:0}
.cc-rec{margin-top:16px;background:#111014;color:#fff;border-left:4px solid var(--red);border-radius:15px;padding:20px}.cc-rec small{font-family:'IBM Plex Mono';font-size:10px;letter-spacing:.13em;color:#FF8997;text-transform:uppercase}.cc-rec h3{font-family:'Archivo';font-size:21px;line-height:1.15;margin:10px 0 8px}.cc-rec p{font-size:13px;line-height:1.55;color:#E6DED3;margin:0}
.cc-actions{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--line);margin-top:22px;padding-top:18px;flex-wrap:wrap}.cc-btn{min-height:46px;border-radius:12px;padding:0 18px;border:1px solid #D9D0C5;background:#fff;font-weight:700}.cc-btn--primary{background:var(--red);border-color:var(--red);color:#fff}
.cc-replan{margin-top:18px;border:1px dashed #D2C5B5;border-radius:15px;padding:16px;background:#FFFCF8}.cc-replan b{font-family:'Archivo';font-size:16px}.cc-replan__choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.cc-replan__choices button{min-height:58px;border:1px solid var(--line);background:#fff;border-radius:12px;text-align:left;padding:10px 12px;font-weight:700;font-size:12px}
.cc-lab{max-width:1240px;margin:-42px auto 54px;padding:0 24px;font-size:11px;color:#73695E;line-height:1.5}

[data-stage-panel]{display:none}[data-stage-panel].is-visible{display:block}
@media(max-width:980px){.cc-nav{display:none}.cc-workspace{grid-template-columns:1fr}.cc-rail{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:12px}.cc-rail__label{display:none}.cc-step{min-height:56px;padding:8px;justify-content:center}.cc-step strong{font-size:11px}.cc-family-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:820px){.cc-hero{grid-template-columns:1fr;grid-template-areas:"copy" "media";min-height:0}.cc-route-context{grid-template-columns:1fr}.cc-route-photo{min-height:210px}.cc-hero__copy{padding:42px 24px 34px}.cc-hero__media{min-height:260px}.cc-hero__media:after{background:linear-gradient(180deg,var(--graph),rgba(14,13,16,.12) 32%,rgba(14,13,16,0))}.cc-family-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cc-summary-grid,.cc-review-grid{grid-template-columns:1fr}.cc-field-grid{grid-template-columns:1fr}}
@media(max-width:560px){.cc-header__inner{height:68px;padding:0 16px}.cc-country,.cc-advisor{display:none}.cc-brand{margin-right:auto}.cc-wrap{padding:0 12px;margin-top:-14px}.cc-hero__title{font-size:44px}.cc-hero__lead{font-size:15px}.cc-hero__benefits{gap:14px}.cc-hero__media{min-height:220px}.cc-rail{grid-template-columns:1fr 1fr}.cc-step{justify-content:flex-start}.cc-stage__head{padding:20px}.cc-stage__number{font-size:44px}.cc-stage__body{padding:18px 15px}.cc-section-title{font-size:26px}.cc-family-grid{grid-template-columns:1fr}.cc-family{min-height:96px}.cc-replan__choices{grid-template-columns:1fr}}
</style>
</head>
<body>
<header class="cc-header">
  <div class="cc-header__inner">
    <a class="cc-brand" href="#" aria-label="Alianzas y Soluciones"><img src="${PACKAGED.logo}" alt="Alianzas y Soluciones · Broker de Seguros"></a>
    <nav class="cc-nav" aria-label="Principal">
      <button type="button">Empresas</button><button type="button">Personas y familias</button><button class="is-active" type="button">Cotizar y comparar</button><button type="button">Siniestros y asistencia</button><button type="button">Recursos</button><button type="button">Sobre A&amp;S</button>
    </nav>
    <div class="cc-country"><button class="is-active" type="button" data-country="gt">Guatemala</button><button type="button" data-country="co">Colombia</button></div>
    <button class="cc-advisor" type="button">Hablar con un asesor</button>
  </div>
</header>

<section class="cc-hero">
  <div class="cc-hero__copy">
    <div class="cc-kicker" id="heroKicker">COTIZAR Y COMPARAR · GUATEMALA</div>
    <h1 class="cc-hero__title">Cotiza y compara <em>con criterio</em></h1>
    <p class="cc-hero__lead">Cuéntanos qué quieres proteger. A&amp;S te ayuda a ordenar la información, revisar alternativas comparables y entender las diferencias que sí cambian tu decisión.</p>
    <div class="cc-hero__benefits"><div class="cc-hero__benefit">Compara opciones<br>sobre bases equivalentes</div><div class="cc-hero__benefit">Entiende coberturas,<br>deducibles y condiciones</div><div class="cc-hero__benefit">Continúa con asesoría<br>cuando haga falta</div></div>
  </div>
  <figure class="cc-hero__media" data-visual-asset="hero:consultation">
    <img src="${PACKAGED.hero}" alt="Equipo A&amp;S en una conversación de asesoría">
  </figure>
</section>

<div class="cc-wrap">
<section class="cc-workspace">
  <aside class="cc-rail" aria-label="Tu recorrido">
    <div class="cc-rail__label">Tu recorrido</div>
    <div class="cc-step is-active" data-step="1"><span class="cc-step__n">1</span><strong>Lo que necesitas</strong></div>
    <div class="cc-step" data-step="2"><span class="cc-step__n">2</span><strong>Tus datos</strong></div>
    <div class="cc-step" data-step="3"><span class="cc-step__n">3</span><strong>Revisar opciones</strong></div>
    <div class="cc-step" data-step="4"><span class="cc-step__n">4</span><strong>Comparar y continuar</strong></div>
  </aside>
  <main class="cc-stage">
    <div class="cc-stage__head"><div class="cc-stage__number" id="stageNumber">01</div><div><small id="stageKicker">EMPEZAR</small><h2 id="stageHeading">Elige el punto de partida</h2></div></div>
    <div class="cc-stage__body">
      <div class="cc-truth">Tus respuestas se conservan mientras avanzas. Si el caso requiere revisión, un asesor puede continuar desde aquí sin pedirte empezar de cero.</div>
      <div class="cc-mode-toggle" aria-label="Cómo quieres continuar">
        <button class="cc-mode is-active" type="button" data-mode="online">Cotización en línea<small>Cuando la fuente permite avanzar digitalmente</small></button>
        <button class="cc-mode" type="button" data-mode="assisted">Con acompañamiento A&amp;S<small>Un asesor continúa con tu mismo contexto</small></button>
      </div>

      <section data-stage-panel="1" class="is-visible">
        <div class="cc-section-kicker">01 · PUNTO DE PARTIDA</div>
        <h3 class="cc-section-title">¿Qué quieres proteger o revisar?</h3>
        <p class="cc-section-lead">Empieza por la necesidad. Las preguntas cambian según el país y lo que quieras proteger.</p>
        <div class="cc-family-grid">${familyCards()}</div>
        <div class="cc-actions"><button class="cc-btn" type="button">Hablar con un asesor</button><button class="cc-btn cc-btn--primary" type="button" data-next="2">Continuar →</button></div>
      </section>

      <section data-stage-panel="2">
        <div class="cc-section-kicker">02 · DATOS DEL CASO</div>
        <h3 class="cc-section-title" id="intakeTitle">Cuéntanos solo lo necesario.</h3>
        <p class="cc-section-lead" id="intakeLead">Las preguntas cambian según el país y la necesidad seleccionada.</p>
        <div class="cc-summary-grid"><div class="cc-summary"><small>País</small><strong id="selectedCountry">Guatemala</strong></div><div class="cc-summary"><small>Necesidad</small><strong id="selectedNeed">Vehículo / Movilidad</strong></div><div class="cc-summary"><small>Cómo seguimos</small><strong id="selectedMode">En línea con asesoría disponible</strong></div></div>
        <div class="cc-route-context">
          <div id="routePhoto" class="cc-route-photo" data-visual-asset="route:vehicle" aria-label="Contexto visual de Vehículo / Movilidad"></div>
          <div class="cc-route-copy"><small>CONTEXTO DE LA NECESIDAD</small><strong id="routeVisualTitle">Vehículo / Movilidad</strong><p id="routeVisualText">La imagen acompaña la necesidad seleccionada. No sustituye los datos que requiere una cotización real.</p></div>
        </div>
        <div id="otherPaths" class="cc-paths" hidden></div>
        <div id="intakeGroups"></div>
        <div class="cc-actions"><button class="cc-btn" type="button" data-prev="1">← Volver</button><button class="cc-btn cc-btn--primary" type="button" data-next="3">Revisar opciones →</button></div>
      </section>

      <section data-stage-panel="3">
        <div class="cc-section-kicker">03 · REVISIÓN DE OPCIONES</div>
        <h3 class="cc-section-title">Revisamos las opciones antes de compararlas.</h3>
        <p class="cc-section-lead">Solo entran al comparador alternativas con información suficiente y bases equivalentes. Si todavía no existen dos propuestas validadas, no inventamos una comparación.</p>
        <div id="reviewContent"></div>
        <div class="cc-actions"><button class="cc-btn" type="button" data-prev="2">← Volver</button><button id="compareNext" class="cc-btn cc-btn--primary" type="button" data-next="4">Comparar y continuar →</button></div>
      </section>

      <section data-stage-panel="4">
        <div class="cc-section-kicker">04 · COMPARAR Y CONTINUAR</div>
        <h3 class="cc-section-title">Compara diferencias que sí cambian la decisión.</h3>
        <p class="cc-section-lead">El comparador solo se habilita cuando existen al menos dos alternativas validadas. La prioridad organiza la explicación; no crea un ranking universal.</p>
        <div id="compareContent"></div>
        <div class="cc-replan"><b>¿Quieres reconsiderar algo sin empezar de cero?</b><div class="cc-replan__choices"><button type="button" data-replan="priority">Cambiar mi prioridad</button><button type="button" data-replan="data">Ajustar datos del caso</button><button type="button" data-replan="need">Revisar otra necesidad</button></div></div>
        <div class="cc-actions"><button class="cc-btn" type="button" data-prev="3">← Volver</button><div><button class="cc-btn" type="button">Hablar con un asesor</button> <button id="decisionBtn" class="cc-btn cc-btn--primary" type="button">Continuar →</button></div></div>
      </section>
    </div>
  </main>
</section>
</div>
<div id="replanModal" hidden style="position:fixed;inset:0;z-index:80;background:rgba(14,13,16,.72);display:none;align-items:center;justify-content:center;padding:20px">
  <div style="width:min(560px,100%);background:#fff;border-radius:20px;padding:24px;box-shadow:0 30px 80px rgba(0,0,0,.35)">
    <div class="cc-section-kicker">REPLANTEAR SIN PERDER EL CONTEXTO</div>
    <h3 id="replanTitle" style="font-family:'Archivo';font-size:26px;line-height:1.05;margin:8px 0">Ajusta lo necesario</h3>
    <p id="replanText" style="font-size:14px;line-height:1.55;color:#5F5750;margin:0 0 18px">Conservamos la información ya ingresada.</p>
    <div class="cc-actions" style="margin-top:0"><button id="replanClose" class="cc-btn" type="button">Cerrar</button><button id="replanConfirm" class="cc-btn cc-btn--primary" type="button">Continuar con el ajuste →</button></div>
  </div>
</div>
<div class="cc-lab">SOURCE-ONLY LAB · No constituye oferta, emisión ni conexión real con aseguradoras. Gravicentra conserva la autoridad operativa. Este artefacto no está autorizado para URL de Owner Review.</div>
<script>
(()=>{
  const DOMAIN=${JSON.stringify(domainSnapshot)};
  const FAMILY_TO_PRODUCT=${JSON.stringify(familyToProduct)};
  const scenePos=${JSON.stringify(SCENES)};
  const sceneMeta={
    vehicle:{label:'Vehículo / Movilidad',text:'Vehículo, uso y condiciones que influyen en tus opciones.'},
    home:{label:'Hogar',text:'Vivienda, contenido y responsabilidad familiar.'},
    health:{label:'Salud / Gastos médicos',text:'Red, plan y condiciones relevantes para tu protección de salud.'},
    life:{label:'Vida / Ingreso',text:'Dependientes y continuidad económica.'},
    business:{label:'Empresa',text:'Operación, exposición y prioridades de tu empresa.'},
    cargo:{label:'Transporte / Carga',text:'Rol en la cadena, carga y puntos críticos del trayecto.'},
    other:{label:'Otros / No sé cuál necesito',text:'A&S te ayuda a identificar la necesidad antes de pedir datos de producto.'}
  };
  const state={country:'gt',family:'vehicle',product:'auto',mode:'online',stage:1,form:{}};
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const countryName=()=>state.country==='co'?'Colombia':'Guatemala';
  const key=()=>state.country+':'+state.product;
  const current=()=>DOMAIN[key()]||DOMAIN[state.country+':duda];

  function stageMeta(n){
    return {
      1:['01','EMPEZAR','Elige el punto de partida'],
      2:['02','TUS DATOS','Responde solo lo necesario'],
      3:['03','REVISAR','Revisamos las opciones'],
      4:['04','COMPARAR','Compara y elige cómo continuar']
    }[n];
  }

  function go(n){
    state.stage=n;
    document.querySelectorAll('[data-stage-panel]').forEach(x=>x.classList.toggle('is-visible',x.dataset.stagePanel===String(n)));
    document.querySelectorAll('.cc-step').forEach(x=>x.classList.toggle('is-active',x.dataset.step===String(n)));
    const m=stageMeta(n);document.getElementById('stageNumber').textContent=m[0];document.getElementById('stageKicker').textContent=m[1];document.getElementById('stageHeading').textContent=m[2];
    if(n===2)renderIntake();
    if(n===3)renderReview();
    if(n===4)renderCompare();
    window.scrollTo({top:document.querySelector('.cc-wrap').offsetTop-72,behavior:'smooth'});
  }

  function fieldHtml(f){
    const id='f_'+f.id;
    let control='';
    if(f.type==='select'){
      control='<select class="cc-control" id="'+id+'" data-field="'+esc(f.id)+'">'+(f.options||[]).map(o=>'<option'+(String(o)===String(f.default)?' selected':'')+'>'+esc(o)+'</option>').join('')+'</select>';
    }else{
      control='<input class="cc-control" id="'+id+'" data-field="'+esc(f.id)+'" type="'+esc(f.type||'text')+'" value="'+esc(f.default||'')+'">';
    }
    return '<label class="cc-field"><span class="cc-label">'+esc(f.label)+'</span>'+control+(f.help?'<span class="cc-help">'+esc(f.help)+'</span>':'')+'</label>';
  }

  function bindFields(){
    document.querySelectorAll('[data-field]').forEach(el=>{
      el.addEventListener('change',()=>{
        state.form[el.dataset.field]=el.value;
        if(state.product==='salud' && el.dataset.field==='hijos') renderIntake();
      });
    });
  }

  function otherPaths(){
    const box=document.getElementById('otherPaths');
    if(state.family!=='other'){box.hidden=true;box.innerHTML='';return;}
    box.hidden=false;
    const paths=[
      ['duda','Necesito orientación'],
      ['contrato','Contrato / obligación / proyecto'],
      ['revision','Revisar póliza existente']
    ];
    box.innerHTML=paths.map(([id,label])=>'<button type="button" class="cc-path'+(state.product===id?' is-active':'')+'" data-path="'+id+'">'+label+'</button>').join('');
    box.querySelectorAll('[data-path]').forEach(b=>b.addEventListener('click',()=>{state.product=b.dataset.path;state.form={};renderIntake();}));
  }

  function renderIntake(){
    const base=DOMAIN[key()]||DOMAIN[state.country+':duda];
    let sc=base.schema;
    if(state.product==='salud'){
      const hijos=state.form.hijos!=null?state.form.hijos:((sc.groups[0].fields.find(x=>x.id==='hijos')||{}).default||0);
      const n=Math.max(0,Math.min(6,parseInt(hijos,10)||0));
      sc=JSON.parse(JSON.stringify(sc));
      const comp=sc.groups[0],idx=comp.fields.findIndex(x=>x.id==='hijos');
      comp.fields=comp.fields.filter(x=>!/^dependentDob/.test(x.id));
      const additions=[];for(let i=0;i<n;i++) additions.push({id:'dependentDob'+(i+1),label:'Fecha de nacimiento · hijo '+(i+1),type:'date',options:[],default:i===0?'2018-06-10':'',help:'Solo si aplica a esta composición familiar.'});
      if(idx>=0)comp.fields.splice(idx+1,0,...additions);
    }
    const meta=sceneMeta[state.family];
    document.getElementById('intakeTitle').textContent='Cuéntanos solo lo necesario sobre '+(state.family==='other'?'tu necesidad':meta.label.toLowerCase())+'.';
    document.getElementById('intakeLead').textContent='Pedimos datos comunes que cambian disponibilidad, condiciones o comparación. Los requisitos propios de una aseguradora se solicitan solo si la fuente los necesita.';
    document.getElementById('selectedCountry').textContent=countryName();
    document.getElementById('selectedNeed').textContent=sc.title;
    document.getElementById('selectedMode').textContent=state.mode==='assisted'?'Con acompañamiento A&S':'En línea con asesoría disponible';
    document.getElementById('routeVisualTitle').textContent=meta.label;
    document.getElementById('routeVisualText').textContent=meta.text;
    const photo=document.getElementById('routePhoto'),pos=scenePos[state.family];
    photo.style.backgroundPosition=pos.x+' '+pos.y;photo.dataset.visualAsset='route:'+state.family;photo.setAttribute('aria-label','Contexto visual de '+meta.label);
    otherPaths();
    document.getElementById('intakeGroups').innerHTML=sc.groups.map((g,i)=>'<div class="cc-stage-panel"><div class="cc-stage-panel__head"><span>'+String(i+1).padStart(2,'0')+'</span><b>'+esc(g.title)+'</b></div><div class="cc-field-grid">'+g.fields.map(fieldHtml).join('')+'</div></div>').join('');
    bindFields();
  }

  function renderReview(){
    const info=current();
    const c=info.comparison;
    let html='';
    if(c.quotes.length){
      html='<div class="cc-review-grid">'+c.quotes.map(q=>'<article class="cc-review-card"><b>'+esc(q.name)+'</b><strong>'+esc(q.total)+'</strong><span>'+(q.status==='VALIDATED'?'Revisada y lista para comparar':'Pendiente de validación')+'</span></article>').join('')+'</div>';
    }
    if(!c.comparable){
      html+='<aside class="cc-no-compare"><small>VALIDACIÓN ANTES DE COMPARAR</small><h3>Todavía no hay dos alternativas validadas para comparar.</h3><p>No mostramos precios ni “ganadores” inventados. A&S continúa por la ruta '+(state.mode==='assisted'?'acompañada':'correspondiente')+' hasta contar con propuestas comparables.</p></aside>';
    }else{
      html+='<div class="cc-truth" style="margin-top:16px;margin-bottom:0">Hay dos alternativas validadas en este ejemplo LAB. La comparación se habilita sin ranking silencioso.</div>';
    }
    document.getElementById('reviewContent').innerHTML=html;
    document.getElementById('compareNext').textContent=c.comparable?'Comparar opciones →':'Ver cómo continúa →';
  }

  function renderCompare(){
    const c=current().comparison;
    const box=document.getElementById('compareContent');
    if(c.comparable){
      const a=c.validated[0],b=c.validated[1];
      box.innerHTML='<table class="cc-compare"><thead><tr><th>CRITERIO</th><th>'+esc(a.name)+'</th><th>'+esc(b.name)+'</th></tr></thead><tbody>'+
        '<tr><td>Costo total</td><td>'+esc(a.total)+'</td><td>'+esc(b.total)+'</td></tr>'+
        '<tr><td>Deducible</td><td>'+esc(a.deductible)+'</td><td>'+esc(b.deductible)+'</td></tr>'+
        '<tr><td>Asistencia / servicio</td><td>'+esc(a.assistance)+'</td><td>'+esc(b.assistance)+'</td></tr>'+
        '<tr><td>Alcance</td><td>'+esc(a.coverage)+'</td><td>'+esc(b.coverage)+'</td></tr>'+
        '</tbody></table>'+
        '<aside class="cc-rec"><small>Recomendación A&amp;S</small><h3>Orientación según lo que dijiste que más pesa en tu decisión.</h3><p>No elegimos automáticamente por ti. Explicamos los trade-offs entre propuestas validadas y qué diferencia conviene revisar antes de continuar.</p></aside>';
      document.getElementById('decisionBtn').textContent='Elegir y continuar →';
    }else{
      box.innerHTML='<aside class="cc-no-compare"><small>SIN COMPARACIÓN FICTICIA</small><h3>Esta ruta necesita validación o acompañamiento antes de comparar.</h3><p>La experiencia conserva tu contexto y continúa con A&S. No inventamos primas, coberturas ni alternativas cuando la fuente todavía no está validada para web.</p></aside>';
      document.getElementById('decisionBtn').textContent='Continuar con A&S →';
    }
  }

  document.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.next))));
  document.querySelectorAll('[data-prev]').forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.prev))));

  document.querySelectorAll('.cc-family').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.cc-family').forEach(x=>{x.classList.remove('is-selected');x.setAttribute('aria-pressed','false');});
    b.classList.add('is-selected');b.setAttribute('aria-pressed','true');
    state.family=b.dataset.family;state.product=FAMILY_TO_PRODUCT[state.family];state.form={};
  }));

  document.querySelectorAll('[data-country]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('[data-country]').forEach(x=>x.classList.toggle('is-active',x===b));
    state.country=b.dataset.country;state.form={};
    document.getElementById('heroKicker').textContent='COTIZAR Y COMPARAR · '+countryName().toUpperCase();
    if(state.stage>1){renderIntake();if(state.stage>2)renderReview();if(state.stage>3)renderCompare();}
  }));

  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{
    state.mode=b.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('is-active',x===b));
    if(state.stage===2)renderIntake();
    if(state.stage===3)renderReview();
    if(state.stage===4)renderCompare();
  }));

  const modal=document.getElementById('replanModal'),rt=document.getElementById('replanTitle'),rx=document.getElementById('replanText');
  const replanCopy={
    priority:['Cambiar mi prioridad','Conservamos la necesidad y los datos del caso; solo revisamos qué pesa más en tu decisión.'],
    data:['Ajustar datos del caso','Vuelves a tus datos sin perder la necesidad seleccionada ni el contexto del recorrido.'],
    need:['Revisar otra necesidad','Puedes cambiar la necesidad y conservar el resto del contexto mientras A&S recalcula qué preguntas corresponden.']
  };
  document.querySelectorAll('[data-replan]').forEach(b=>b.addEventListener('click',()=>{const c=replanCopy[b.dataset.replan];rt.textContent=c[0];rx.textContent=c[1];modal.hidden=false;modal.style.display='flex';modal.dataset.mode=b.dataset.replan;}));
  document.getElementById('replanClose').addEventListener('click',()=>{modal.style.display='none';modal.hidden=true;});
  document.getElementById('replanConfirm').addEventListener('click',()=>{
    const mode=modal.dataset.mode;modal.style.display='none';modal.hidden=true;
    if(mode==='priority'||mode==='data')go(2);
    if(mode==='need')go(1);
  });
})();
</script>
<script type="application/json" id="cc-manifest">${JSON.stringify(mf).replace(/</g,'\\u003c')}</script>
</body>
</html>`;
}

module.exports=Object.freeze({VERSION,DEPLOYMENT_EXPORT,PACKAGED,SCENES,FAMILIES,manifest,html});
