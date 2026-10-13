'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ui=fs.readFileSync('orbit360-platform/modules/issuance-endosos-v1201-bridge.js','utf8');
const ops=fs.readFileSync('orbit360-platform/core/ciclo.js','utf8');
const html=fs.readFileSync('orbit360-platform/index.html','utf8');
for(const x of ['id="emi-quote"','id="emi-ramo" class="o-sel"','id="emi-prod" class="o-sel"',
 'Orbit.cat.ramosDe(country.value)','Orbit.cat.subramosDe(country.value, ramo.value)',
 'id="emi-files" type="file" multiple','persistManagementDocuments(result.request,clientId',
 'id="reni-files"','persistManagementDocuments(result.request,source.clienteId',
 'DOCUMENT_DURABLE_READBACK_REQUIRED','documentaryUploadReady(files, clientId)'])
 assert(ui.includes(x),'MISSING_ACCEPTANCE_CONTRACT:'+x);
for(const x of ['id="gs-new-files"','id="gs-upload-files"','GESTION_DOCUMENT_CANONICAL_READBACK_REQUIRED',
 'documentUploadStatus','updateDurable(\'gestiones\',id'])
 assert(ops.includes(x),'MISSING_OPS_DOCUMENT_CONTRACT:'+x);
assert(!ui.includes('id="emi-ramo" class="o-sel" value='),'RAMO_TEXT_INPUT_REGRESSION');
assert(!ui.includes('id="emi-prod" class="o-sel" value='),'PRODUCT_TEXT_INPUT_REGRESSION');
assert(html.includes('b4003-modal-docs-20261013'),'NEW_ASSET_CACHE_BINDING_MISSING');
const cmp=fs.readFileSync('orbit360-platform/modules/comparativo.js','utf8');
assert(cmp.includes('acceptanceSnapshot'),'COMPARATIVO_LIVE_OFFERS_BRIDGE_MISSING');
assert(ui.includes('quoteRows(compared)'),'ACCEPTED_OFFER_NOT_BOUND_TO_COMPARATIVO');
assert(ui.includes('— Seleccionar cliente —'),'CLIENT_SELECTION_NOT_EXPLICIT');
assert(ui.includes('updateInsurerOptions()'),'INSURER_COUNTRY_REPAINT_MISSING');
assert(ui.includes('Gestión operativa · Comparativo'),'WRONG_MODAL_ORIGIN');
console.log('B4_003_MODAL_CATALOG_AND_DOC_SOURCE_CONTRACT_PASS; functional Preview pending');
