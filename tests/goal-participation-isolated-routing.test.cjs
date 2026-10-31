'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const oldHost='ays-orbit-360-lab--gi-i65-b4-sr-41066435386-r09pl1ti.web.app';
const goalsHost='ays-orbit-360-lab--gi-i65-b4-goals-1031-ab1234.web.app';
const liveHost='ays-orbit-360-lab.web.app';
let n=0;
function same(a,b,label){assert.equal(a,b,label);n++;}
function functionsFor(host,flag){
  const Orbit={auth:{productUser:{uid:'uid-demo'}},session:{rol:()=>'Dirección'},modules:{}};
  const window={Orbit,addEventListener:()=>{},__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{goalParticipationPreviewCandidate:flag}};
  const ctx={Orbit,window,location:{hostname:host},console,Date,CustomEvent:class{}};
  vm.runInNewContext(source('orbit360-platform/core/assignable-advisor-roster-client.js'),ctx);
  vm.runInNewContext(source('orbit360-platform/data/store-firestore-product-operational-p0.js'),ctx);
  return{roster:Orbit.assignableAdvisorRoster.status().functionName,
    writer:Orbit.productOperationalWriteP0.status().generalPreviewCommand};
}
same(functionsFor(liveHost,false).roster,'orbit360AssignableAdvisorRoster','LIVE roster no cambia');
same(functionsFor(liveHost,true).roster,'orbit360AssignableAdvisorRoster','Flag solo en LIVE no tiene efecto');
same(functionsFor(oldHost,false).roster,'orbit360AssignableAdvisorRosterPreview','Preview antigua mantiene su nombre');
same(functionsFor(oldHost,true).roster,'orbit360AssignableAdvisorRosterPreview','Flag no activa endpoint en Preview antigua');
same(functionsFor(goalsHost,false).roster,'orbit360AssignableAdvisorRosterPreview','Nuevo canal sin flag no altera la ruta');
same(functionsFor(goalsHost,true).roster,'orbit360AssignableAdvisorRosterGoalsPreview','El canal exacto y el flag seleccionan endpoint nuevo');
same(functionsFor(liveHost,true).writer,'orbit360ProductOperationalCommandPreview','Estado Preview no cambia en LIVE');
same(functionsFor(oldHost,true).writer,'orbit360ProductOperationalCommandPreview','Preview antigua conserva función original');
same(functionsFor(goalsHost,false).writer,'orbit360ProductOperationalCommandPreview','Sin flag la candidata falla cerrada');
same(functionsFor(goalsHost,true).writer,'orbit360ProductOperationalCommandGoalsPreview','Canal nuevo usa callable aislado');
const backendRoster=source('functions/assignable-advisor-roster.js');
const backendWriter=source('functions/product-operational-domain.js');
assert.match(backendRoster,/exports\.orbit360AssignableAdvisorRosterGoalsPreview=onCall/);n++;
assert.match(backendWriter,/exports\.orbit360ProductOperationalCommandGoalsPreview = onCall\([^\n]+executePreview\)/);n++;
assert.match(backendWriter,/syntheticId\(m&&\(m\.id/);n++;
process.stdout.write('PASS: '+n+' comprobaciones de enrutamiento aislado; Preview certificada y LIVE inalterados.\n');
