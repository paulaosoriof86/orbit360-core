import assert from 'node:assert/strict';
import {resolveAysPolicyCountryCurrency,missingClientDecision,AYS_COP_LARGE_AMOUNT_THRESHOLD} from './orbit360-ays-policy-source-rules-v20260730.mjs';

assert.equal(AYS_COP_LARGE_AMOUNT_THRESHOLD,1_000_000);
assert.deepEqual(resolveAysPolicyCountryCurrency({divisa:'GTQ',primaTotal:2000}),{pais:'GT',moneda:'GTQ',inferred:false,requiresValidation:false,provenance:'explicit_currency'});
assert.deepEqual(resolveAysPolicyCountryCurrency({divisa:'COP',primaTotal:2200000}),{pais:'CO',moneda:'COP',inferred:false,requiresValidation:false,provenance:'explicit_currency'});
let r=resolveAysPolicyCountryCurrency({primaTotal:25000});
assert.equal(r.pais,'GT'); assert.equal(r.moneda,'GTQ'); assert.equal(r.inferred,true); assert.equal(r.provenance,'ays_default_gt_rule_20260730');
r=resolveAysPolicyCountryCurrency({primaTotal:2500000});
assert.equal(r.pais,'CO'); assert.equal(r.moneda,'COP'); assert.equal(r.inferred,true); assert.equal(r.provenance,'ays_large_amount_rule_20260730');
r=resolveAysPolicyCountryCurrency({divisa:'USD',primaTotal:5000});
assert.equal(r.moneda,'USD'); assert.equal(r.pais,''); assert.equal(r.requiresValidation,true);
const nc=missingClientDecision({asegurado:'Cliente Nuevo',telefono:'5555',pais:'GT',moneda:'GTQ',sourceRef:'fixture#1'});
assert.equal(nc.create,true); assert.equal(nc.calidadDatos,'pendiente_completar'); assert.equal(nc.record.documento,''); assert.equal(nc.record.calidad_datos,'pendiente_completar');
assert.equal(missingClientDecision({clienteId:'cli_1',asegurado:'Ya existe'}).create,false);
assert.equal(missingClientDecision({}).requiresValidation,true);
console.log(JSON.stringify({status:'PASS',tenant:'alianzas-soluciones',currencyInference:true,missingClientQualityPending:true,realRows:0,writes:0},null,2));
