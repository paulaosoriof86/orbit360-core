const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const candidatePath = fs.existsSync(path.join(root,'tools/gravicentra-i6-1-preview-package.mjs'))
  ? path.join(root,'tools/gravicentra-i6-1-preview-package.mjs')
  : path.join(__dirname,'package_candidate.mjs');
const candidate = fs.readFileSync(candidatePath, 'utf8');
const start = candidate.indexOf('const configuredFavicon=');
const end = candidate.indexOf('const generatedBranding=', start);
assert(start > -1 && end > start, 'Package must contain canonical tenant icon materializer');
const materializer = candidate.slice(start, end);
const rawManifest = { name: 'Gravicentra Insurance', short_name: 'Gravicentra', id: '/', start_url: '/', scope: '/', icons: [] };

function prepare({tenantId='alianzas-soluciones', favicon='assets/tenant/alianzas-soluciones/logo-bolita-96.png', invalidSize=false}={}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'gi-tenant-icon-'));
  const site = path.join(base, 'site');
  const evidence = path.join(base, 'evidence');
  fs.mkdirSync(path.join(site,'assets/tenant/alianzas-soluciones'), {recursive:true});
  fs.mkdirSync(evidence,{recursive:true});
  fs.writeFileSync(path.join(site,'manifest.webmanifest'), JSON.stringify(rawManifest));
  for (const size of [192,512]) {
    const source = fs.existsSync(path.join(root,'orbit360-platform/assets/tenant/alianzas-soluciones/logo-bolita-'+size+'.png'))
      ? path.join(root,'orbit360-platform/assets/tenant/alianzas-soluciones/logo-bolita-'+size+'.png')
      : path.join(__dirname,'logo-bolita-'+size+'.png');
    fs.copyFileSync(source,path.join(site,'assets/tenant/alianzas-soluciones/logo-bolita-'+size+'.png'));
  }
  if(invalidSize){const f=path.join(site,'assets/tenant/alianzas-soluciones/logo-bolita-192.png');const b=fs.readFileSync(f);b.writeUInt32BE(96,16);fs.writeFileSync(f,b);}
  return {base,site,evidence,tenantId,favicon};
}

function run(args) {
  const a=prepare(args);
  try {
    const brandingSnapshot={ tenantId:a.tenantId, branding:{ displayName:'Alianzas & Soluciones', favicon:a.favicon}, hash:'b'.repeat(64)};
    vm.runInNewContext(materializer,{ brandingSnapshot, fs,path,crypto,Buffer,SITE:a.site,EVIDENCE:a.evidence,TENANT_HINT:a.tenantId,read:p=>fs.readFileSync(p,'utf8') },{timeout:2000});
    return {manifest:JSON.parse(fs.readFileSync(path.join(a.site,'manifest.webmanifest'),'utf8')),proof:JSON.parse(fs.readFileSync(path.join(a.evidence,'tenant-pwa-icon-descriptor.json'),'utf8'))};
  } finally { fs.rmSync(a.base,{recursive:true,force:true}); }
}

test('build selects tenant icons and keeps the stable PWA identity',()=>{
  const {manifest,proof}=run();
  assert.equal(manifest.id,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/');
  assert.equal(manifest.name,'Gravicentra Insurance · Alianzas & Soluciones');
  assert.deepEqual(Array.from(manifest.icons,x=>x.sizes),['192x192','512x512']);
  assert.deepEqual(Array.from(manifest.icons,x=>x.src),['/assets/tenant/alianzas-soluciones/logo-bolita-192.png?brand='+('b'.repeat(12)),'/assets/tenant/alianzas-soluciones/logo-bolita-512.png?brand='+('b'.repeat(12))]);
  assert.equal(proof.tenantId,'alianzas-soluciones');
  assert.deepEqual(Array.from(proof.icons,x=>x.size),[192,512]);
});

test('build rejects icon from another tenant',()=>{
  assert.throws(()=>run({tenantId:'another-tenant'}),/TENANT_PWA_FAVICON_PATH_NOT_REGISTERED/);
});

test('build rejects incorrect image dimensions rather than shipping broken installation',()=>{
  assert.throws(()=>run({invalidSize:true}),/TENANT_PWA_ICON_SIZE_OR_FORMAT_INVALID:192/);
});

test('runtime uses configured tenant favicon instead of overwriting with product icon',()=>{
  const runtimePath=fs.existsSync(path.join(root,'orbit360-platform/core/pwa.js'))
    ? path.join(root,'orbit360-platform/core/pwa.js') : path.join(__dirname,'pwa_candidate.js');
  const runtime=fs.readFileSync(runtimePath,'utf8');
  assert.match(runtime,/function tenantIcon\(\) \{ var b=publicBrand\(\)/);
  assert.match(runtime,/document\.addEventListener\('orbit:company-branding'/);
  assert.match(runtime,/function tenantAppleTouchIcon\(\)/);
});
