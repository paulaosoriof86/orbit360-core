#!/usr/bin/env node
'use strict';
import fs from 'node:fs';

const ownerPath='tools/orbit360-vehicles-canonical-apply-v20260730.mjs';
const freezePath='tools/orbit360-vehicles-write-freeze-v20260730.json';
const owner=fs.readFileSync(ownerPath,'utf8');
const freeze=JSON.parse(fs.readFileSync(freezePath,'utf8'));
const checks=[];
const check=(name,ok)=>checks.push({name,ok:!!ok});

check('freeze_schema',freeze.schemaVersion==='orbit360-vehicles-write-freeze-v1');
check('freeze_tenant',freeze.tenantId==='alianzas-soluciones');
check('freeze_gate',freeze.gateId==='block8-vehicles-static-v20260730'&&freeze.contractVersion==='8.0.1');
check('freeze_prewrite_ready',freeze.prewriteEvidence?.status==='PREWRITE_READY'&&freeze.prewriteEvidence?.firestoreWrites===0&&freeze.prewriteEvidence?.operationalWrites===0);
check('freeze_baseline',freeze.baseline?.clientes===430&&freeze.baseline?.aseguradoras===30&&freeze.baseline?.asesores===7&&freeze.baseline?.polizas===1373&&freeze.baseline?.vehiculos===0&&freeze.baseline?.recibosEsperados===0&&freeze.baseline?.carteraPrimas===0&&freeze.baseline?.cobros===0&&freeze.baseline?.finmovs===0);
check('freeze_scope',freeze.writePlan?.vehiculosCreate===1032&&freeze.writePlan?.pendingQuality===60&&freeze.writePlan?.excluded===4&&freeze.writePlan?.auditWrites===1&&freeze.writePlan?.clientWrites===0&&freeze.writePlan?.insurerWrites===0&&freeze.writePlan?.policyWrites===0&&freeze.writePlan?.receiptWrites===0&&freeze.writePlan?.carteraWrites===0&&freeze.writePlan?.cobroWrites===0&&freeze.writePlan?.finmovWrites===0);
check('freeze_digests',freeze.package?.logicalSha256==='4e9545dc580782470ea2e1b2b8a421a16f8cd152ed03264f7b7a30ea14fadc0d'&&freeze.package?.targetIdDigest==='c5a5eb51b69eedef33588c6e3bb8bb3746ceac8bffc4a7a9181ebcbe4995682d');
check('freeze_authorization',freeze.authorization?.required===true&&freeze.authorization?.requestExistsAtFreeze===false&&freeze.realWriteExecuted===false);

check('owner_phrase',owner.includes("AUTORIZO ESCRITURA CONTROLADA VEHICULOS AYS 20260730"));
check('owner_write_mode',owner.includes("else if(mode==='WRITE')"));
check('owner_request_schema',owner.includes("orbit360-vehicles-write-request-v1"));
check('owner_request_digest',owner.includes("req.targetIdDigest")&&owner.includes("req.logicalSha256"));
check('owner_create_only',owner.includes("b.create(db.collection('tenantId').doc(TENANT).collection(op.coll).doc(op.id),op.data)"));
check('owner_vehicle_collection',owner.includes("coll:'vehiculos'"));
check('owner_audit_collection',owner.includes("collection('auditoriaImportaciones')"));
check('owner_post_invariant',owner.includes("POSTWRITE_INVARIANT")&&owner.includes("POSTWRITE_TARGET_IDS"));
check('owner_rollback',owner.includes("await deleteCreated(db,created)")&&owner.includes("ROLLBACK_INCOMPLETE"));
check('owner_no_downstream',owner.includes("noReceiptWrites:true")&&owner.includes("noCarteraWrites:true")&&owner.includes("noCobroWrites:true")&&owner.includes("noFinmovWrites:true"));
check('owner_exact_expected',owner.includes("vehiclesCreate:1032")&&owner.includes("pendingVehicles:60")&&owner.includes("excluded:4"));

const failed=checks.filter(x=>!x.ok);
const result={schemaVersion:'orbit360-vehicles-controlled-write-static-v1',status:failed.length?'BLOCKED':'STATIC_WRITE_READY',ok:failed.length===0,checks,failed:failed.length,operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(result,null,2));
if(failed.length)process.exit(41);
