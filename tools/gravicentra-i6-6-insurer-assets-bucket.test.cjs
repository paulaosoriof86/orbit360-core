'use strict';
// Fixed project-owned GCS asset bucket: no default-bucket assumptions.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('functions/product-operational-domain.js','utf8');
const bucket="gravicentra-insurance-assets-60e88ed5a1";
assert.ok(source.includes("const INSURER_ASSET_BUCKET = '"+bucket+"';"),'approved storage bucket missing');
assert.equal((source.match(/projectId==='ays-orbit-360-lab'\?INSURER_ASSET_BUCKET:''/g)||[]).length,2,'write/read must use same project-scoped fallback');
assert.equal((source.match(/process\.env\.ORBIT360_STORAGE_BUCKET/g)||[]).length,2,'storage environment override preserved');
assert.match(source,/await candidateFile\.save\(bytes,saveOptions\)/,'upload must persist actual bytes');
assert.match(source,/await file\.download\(\)/,'read must download stored bytes');
assert.match(source,/if\(!withinScope\(actor,'aseguradoras','aseguradoras'/,'upload scope must remain server enforced');
assert.match(source,/await authorizeRead\(request,tenantId,'aseguradoras'\)/,'read authorization must remain server enforced');
assert.match(source,/await insurerRef\.set\(\{logo:url,logoAssetRef:assetRef,logoContentHash:contentHash/,'logo Firestore linkage preserved');
console.log('GI_I66_INSURER_LOGO_EXISTING_PROJECT_ASSET_BUCKET_WRITE_READ_SCOPE_8_PASS');
