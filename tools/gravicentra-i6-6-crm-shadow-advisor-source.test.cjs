'use strict';
// I6.6 existing release gate: effective CRM Nuevo Cliente override, no LIVE writes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const crm=fs.readFileSync('orbit360-platform/modules/crm-v1198-operational-bridge.js','utf8');
const client=fs.readFileSync('orbit360-platform/modules/cliente360.js','utf8');
test('Detect real Nuevo Cliente execution override and require signed Equpo roster',()=>{
 assert.match(crm,/mod\.nuevoCliente = openNewClient/);
 assert.match(crm,/function openNewClient\(\)/);
 assert.match(crm,/Orbit\.assignableAdvisorRoster\.list\(country,\{force:true\}\)/);
 const block=crm.slice(crm.indexOf('function eligibleAdvisors('),crm.indexOf('function completeMissingClient('));
 assert.doesNotMatch(block,/baseStore\(\)\.all\('asesores'\)/);
 assert.match(block,/advisorRosterReady=true/);
 assert.match(block,/advisorSelectionValid/);
});
test('Filter assigns only eligible current-country and current-role advisors',()=>{
 assert.match(crm,/A\.dataScope\('cliente360'\)/);
 assert.match(crm,/A\.teamAdvisorIds\(\)/);
 assert.match(crm,/A\.actorAdvisorId\(\)/);
 assert.match(crm,/a\.assignable!==true\|\|a\.roleEligible!==true/);
 assert.match(crm,/!\[\]\.concat\(a\.paises\|\|\[\]\)\.includes\(country\)/);
 assert.match(crm,/advisorSave\.disabled=true/);
 assert.match(crm,/!advisorSelectionValid\(\)/);
 assert.match(crm,/raw\.asesorId!==advisorEl\.value/);
});
test('Edit and active Nuevo Cliente both refer to central roster; no hardcoded identities',()=>{
 assert.match(client,/bindAssignableClientAdvisors\(back,'ce-ase',selPais,'ce-save'/);
 assert.match(crm,/advisorEl\.dataset\.rosterState='ready'/);
 assert.doesNotMatch(crm,/Germ[aá]n Reyes|Priscila L[oó]pez/);
 new vm.Script(crm,{filename:'crm-v1198-operational-bridge.js'});
});
