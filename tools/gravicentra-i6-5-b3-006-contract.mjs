import fs from 'node:fs';

const need=(v,c)=>{if(!v)throw new Error(c);};
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

const importer=read('orbit360-platform/core/importa.js');
const engine=read('orbit360-platform/core/policy-receipts-engine.js');
const index=read('orbit360-platform/index.html');

new Function(importer);
new Function(engine);

const policyStart=importer.indexOf("'polizas': {");
const vehicleStart=importer.indexOf("'vehiculos': {",policyStart);
need(policyStart>=0&&vehicleStart>policyStart,'B3_006_POLICY_IMPORT_SECTION_MISSING');
const policySection=importer.slice(policyStart,vehicleStart);
need(!policySection.includes("Orbit.store.insert('cobros'"),'B3_006_POLICY_IMPORT_STILL_WRITES_COBROS');
need(policySection.includes("afterInsert() { return; }"),'B3_006_LEGACY_AFTER_INSERT_NOT_DISABLED');

need(importer.includes("async function applyPolicyImport"),'B3_006_CANONICAL_IMPORT_FUNCTION_MISSING');
need(importer.includes("const engine = Orbit.policyReceipts"),'B3_006_POLICY_RECEIPTS_OWNER_NOT_USED');
need(importer.includes("await engine.createPolicy(payload"),'B3_006_CANONICAL_CREATE_NOT_AWAITED');
need(importer.includes("await engine.updatePolicy(existing.id, payload"),'B3_006_CANONICAL_UPDATE_NOT_AWAITED');
need(importer.includes("result.atomicServerCommit !== true"),'B3_006_ATOMIC_COMMIT_REQUIRED_MISSING');
need(importer.includes("if (kind === 'polizas') return await applyPolicyImport(cfg, idx);"),'B3_006_POLICY_IMPORT_NOT_ROUTED');
need(importer.includes("const r = await applyImport(kind);"),'B3_006_UI_COMPLETION_NOT_AWAITED');
need(importer.includes("'polizas': { crea: ['polizas', 'recibosEsperados', 'carteraPrimas']"),'B3_006_SCOPE_CANONICAL_DOMAINS_MISSING');
need(importer.includes("'Cobros confirmados sin evidencia'"),'B3_006_SCOPE_COBROS_BOUNDARY_MISSING');
need(importer.includes("out.vigenciaInicio = out.vigenciaInicio || out.vigenciaIni"),'B3_006_VIGENCIA_ALIAS_MISSING');
need(importer.includes("out.fuente = 'importacion_poliza_controlada'"),'B3_006_IMPORT_PROVENANCE_MISSING');

need(engine.includes("function buildAtomicWritePlan"),'B3_006_CANONICAL_ATOMIC_PLAN_MISSING');
need(engine.includes("collection:'polizas'"),'B3_006_CANONICAL_POLICY_WRITE_MISSING');
need(engine.includes("collection:'recibosEsperados'"),'B3_006_CANONICAL_RECEIPT_WRITE_MISSING');
need(engine.includes("collection:'carteraPrimas'"),'B3_006_CANONICAL_PORTFOLIO_WRITE_MISSING');
const planStart=engine.indexOf('function buildAtomicWritePlan');
const createStart=engine.indexOf('async function createPolicy',planStart);
const planSection=engine.slice(planStart,createStart);
need(!/collection\s*:\s*['"]cobros['"]/.test(planSection),'B3_006_CANONICAL_PLAN_MUST_NOT_CREATE_COBROS');
need(engine.includes("await S().batchDurable(plan.mutations"),'B3_006_CANONICAL_BATCH_NOT_AWAITED');
need(engine.includes("atomicServerCommit:true"),'B3_006_CANONICAL_ATOMIC_READBACK_CONTRACT_MISSING');

need(index.includes('core/importa.js?v=20261001-b3006'),'B3_006_INDEX_ASSET_BINDING_MISSING');

console.log('B3_006_SOURCE_CONTRACT=PASS');
console.log('B3_006_POLICY_IMPORT_CANONICAL_OWNER=PASS');
console.log('B3_006_POLICY_RECEIPTS_PORTFOLIO_ATOMIC=PASS');
console.log('B3_006_NO_COBRO_WITHOUT_EVIDENCE=PASS');
