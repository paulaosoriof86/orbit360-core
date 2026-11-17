'use strict';
// Causal regression: a single artifact selected by IDs is nested by default.
// Only the already pinned QA artifact is merged into its dedicated directory.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const WORKFLOW='.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml';
const source=fs.readFileSync(WORKFLOW,'utf8');
function qaDownload(body){
  const blocks=body.split(/(?=      - uses: actions\/download-artifact@v4)/);
  const selected=blocks.filter(x=>x.includes('artifact-ids: ${{ env.I66_PREVIEW_QA_ARTIFACT_ID }}'));
  assert.equal(selected.length,1,'Exactly one pinned signed QA artifact download');
  return selected[0].split(/\n      - name:/)[0];
}
test('single pinned QA proof is extracted at the literal verifier path',()=>{
  const download=qaDownload(source);
  assert.match(download,/artifact-ids: \$\{\{ env\.I66_PREVIEW_QA_ARTIFACT_ID \}\}/);
  assert.match(download,/run-id: \$\{\{ env\.I66_PREVIEW_QA_RUN_ID \}\}/);
  assert.match(download,/merge-multiple: true/);
  assert.match(download,/path: \$\{\{ runner\.temp \}\}\/gi-i66-operational-preview-proof/);
  assert.doesNotMatch(download,/\bpattern:/);
  assert.match(source,/gi-i66-operational-preview-proof\/i66-operational-preview-proof\.json/);
  assert.match(source,/g\.validateProof\(p,proof\)/);
  assert.match(source,/proof\.runId!==p\.previewQa\.runId\|\|proof\.headSha!==p\.previewQa\.headSha/);
});
test('reproduces ENOENT for the old ID layout and exact readback for the correction',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gi-proof-layout-'));
  const artifact='gi-i66-operational-preview-proof-123';
  const name='i66-operational-preview-proof.json';
  const bytes=JSON.stringify({sourceSha:'a'.repeat(40),runId:123});
  try{
    const old=path.join(temp,'old'),fixed=path.join(temp,'fixed');
    fs.mkdirSync(path.join(old,artifact),{recursive:true});
    fs.writeFileSync(path.join(old,artifact,name),bytes);
    assert.throws(()=>fs.readFileSync(path.join(old,name)),{code:'ENOENT'});
    fs.mkdirSync(fixed);
    fs.writeFileSync(path.join(fixed,name),bytes);
    assert.equal(fs.readFileSync(path.join(fixed,name),'utf8'),bytes);
    assert.equal(fs.readFileSync(path.join(old,artifact,name),'utf8'),bytes);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('fix does not change gates, three-function target, exact artifact or rollback',()=>{
  assert.match(source,/node tools\/gravicentra-i6-6-operational-release-candidate\.cjs live/);
  assert.match(source,/artifact-ids: \$\{\{ env\.I66_ROLE_ARTIFACT_ID \}\}/);
  assert.match(source,/--only functions:orbit360ProductOperationalCommand,functions:orbit360CobrosReconciliationCommand,functions:orbit360ScopedPolicyRead/);
  assert.match(source,/trap rollback EXIT/);
  assert.match(source,/gi-role-live-old-revisions\.tsv/);
  assert.match(source,/hosting:clone.*I66_ROLE_ROLLBACK_HOSTING_VERSION/);
  assert.match(source,/g\.validateBuildMarker/);
  assert.match(source,/previewFiles!==223/);
});
