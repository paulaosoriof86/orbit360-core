'use strict';

const LOCK=Object.freeze({
  schemaVersion:'ays-cotcomp-s497-visual-contract-gate-v1.0',
  anchorSha256:'a7f1be79cdb6d8144f608dc559d69ebc38bb6347a03ad2733eac2bb914a4673d',
  cotcompSectionSha256:'758dcf6871fb3e3e03844f736ee0a99c5d0d76d1ed4a124b65e90abbe9a07928',
  visualCssSha256:'94a23c292fb6f271aaccf1ab6fe47b0506082de1d724c9688510a3be663fafbb',
  requiredStages:['Lo que necesitas','Tus datos','Revisar opciones','Comparar y continuar'],
  requiredFamilies:[
    'Vehículo / Movilidad','Hogar','Salud / Gastos médicos','Vida / Ingreso',
    'Empresa','Transporte / Carga','Otros / No sé cuál necesito'
  ],
  requiredHeadline:['Cotiza y compara','con criterio'],
  requiredVehicleFields:['Marca','Línea / modelo','Año'],
  forbiddenSourceTokens:[
    "require('./cotcomp-premium-visual-preview-s494')",
    "require('./cotcomp-premium-visual-preview-s495')",
    "require('./cotcomp-premium-journey-preview-s496')",
    "require('./cotcomp-frontend-recovery-preview-s496b')",
    'data-s494','data-s495','data-s496=','data-s496b',
    "font-family:'Newsreader',serif;font-weight:600",
    'aspect-ratio:4/3'
  ]
});

function push(out,ok,code,detail){out.push({ok,code,detail});}
function hasAll(h,tokens){return tokens.every(x=>h.includes(x));}

function validateSource(source){
  const out=[];
  for(const token of LOCK.forbiddenSourceTokens){
    push(out,!source.includes(token),'FORBIDDEN_SOURCE_TOKEN',token);
  }
  push(out,!/S49[456]\.html\s*\(/.test(source),'NO_LEGACY_HTML_PARENT','must not compose from S4.94-S4.96B');
  push(out,!/data-s49[456]/.test(source),'NO_VERSION_OVERRIDE_STACK','version-scoped visual overrides forbidden');
  return verdict(out);
}

function validateHtml(html,manifest){
  const out=[];
  push(out,hasAll(html,LOCK.requiredHeadline),'HEADLINE','Cotiza y compara con criterio');
  push(out,/\.cc-hero__title\{[^}]*font-family:'Archivo'[^}]*font-weight:900/.test(html),'H1_TYPOGRAPHY','Archivo 900');
  push(out,!/\.cc-hero__title\{[^}]*Newsreader/.test(html),'NO_NEWSREADER_H1','Newsreader cannot own CotComp H1');
  push(out,/\.cc-hero\{[^}]*height:390px;min-height:390px/.test(html),'HERO_HEIGHT_LOCK','desktop target locked within frozen 350–390px range');
  push(out,/\.cc-hero__media img\{[^}]*object-fit:cover/.test(html),'HERO_OBJECT_FIT','cover');
  push(out,/\.cc-hero__media\{[^}]*grid-area:media/.test(html),'HERO_INTEGRATED_MEDIA','right-side integrated media region');
  push(out,!/\.cc-hero__media\{[^}]*aspect-ratio:4\/3/.test(html),'NO_FLOATING_4_3_HERO','4:3 hero card forbidden');

  push(out,hasAll(html,LOCK.requiredStages),'FOUR_STAGE_JOURNEY',LOCK.requiredStages.join(' | '));
  push(out,hasAll(html,LOCK.requiredFamilies),'SEVEN_FAMILIES',LOCK.requiredFamilies.join(' | '));
  push(out,/\.cc-family-grid\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/.test(html),'FAMILY_GRID_DESKTOP','4-column first row / natural 4+3 wrap');
  push(out,/@media\(max-width:820px\)\{[\s\S]*\.cc-family-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(html),'FAMILY_GRID_TABLET','2 columns');
  push(out,/@media\(max-width:560px\)\{[\s\S]*\.cc-family-grid\{grid-template-columns:1fr/.test(html),'FAMILY_GRID_MOBILE','1 column');
  push(out,/\.cc-family\{[^}]*min-height:108px/.test(html),'FAMILY_CARD_MIN_HEIGHT','>=108px');
  push(out,/\.cc-family\{[^}]*padding:16px/.test(html),'FAMILY_CARD_PADDING','16px');

  push(out,hasAll(html,LOCK.requiredVehicleFields),'VEHICLE_PATTERN','Marca → Línea/modelo → Año');
  push(out,html.includes('data-vehicle-combo="brand"') && html.includes('data-vehicle-combo="model"') && html.includes('role="combobox"'),'VEHICLE_SEARCHABLE_COMBOBOX','searchable dependent Marca → Línea/modelo');
  push(out,html.includes('No encuentro mi marca') && html.includes('No encuentro mi línea / modelo'),'VEHICLE_ASSISTED_FALLBACK','explicit assisted fallback');
  push(out,html.includes("CATALOG_API='/cotcompVehicleCatalogS479'"),'VEHICLE_CATALOG_BOUNDARY','LAB read-only catalog boundary');
  push(out,html.includes('SOURCE_ONLY_VISUAL_FIXTURE_NOT_REAL_PROPOSALS') && html.includes('Según propuesta') && !html.includes('Q 2,180') && !html.includes('Q 2,540'),'VISUAL_FIXTURE_TRUTH','visual comparison fixture has no invented monetary values');
  push(out,/\.cc-control\{[^}]*font-size:15px/.test(html),'FORM_CONTROL_SIZE','15px');
  push(out,/\.cc-label\{[^}]*font-size:12px/.test(html),'FORM_LABEL_SIZE','12px');

  push(out,html.includes('Recomendación A&amp;S'),'RECOMMENDATION_AS','visible explainable recommendation');
  push(out,html.includes('Cambiar mi prioridad') && html.includes('Ajustar datos del caso') && html.includes('Revisar otra necesidad'),'CONTEXTUAL_REPLAN','context-preserving replanning');
  push(out,html.includes('Costo total') && html.includes('Deducible') && html.includes('Asistencia / servicio'),'CRITERION_FIRST_COMPARE','criterion-first comparison');

  const repeatedAsset=[...html.matchAll(/data-visual-asset="([^"]+)"/g)].map(m=>m[1]);
  const familyAssets=repeatedAsset.filter(x=>x.startsWith('family:'));
  push(out,new Set(familyAssets).size===familyAssets.length,'NO_FAMILY_VISUAL_REUSE','family visual keys must be unique');

  push(out,manifest && manifest.providerDeploymentAuthorized===false,'PROVIDER_DEPLOYMENT_DENY','false');
  push(out,manifest && manifest.cotcompRealTransportAuthorized===false,'REAL_TRANSPORT_DENY','false');
  push(out,manifest && manifest.production===false,'PRODUCTION_DENY','false');
  push(out,manifest && manifest.ownerReviewUrlAuthorized===false,'OWNER_URL_DENY','false until full visual gate');

  return verdict(out);
}

function verdict(checks){
  const failed=checks.filter(x=>!x.ok);
  return Object.freeze({ok:failed.length===0,failedCount:failed.length,failed,checks});
}

module.exports=Object.freeze({LOCK,validateSource,validateHtml});
