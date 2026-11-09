#!/usr/bin/env node
// Read-only full-payload verifier for exact B4-007 retained LIVE Hosting.
// Does not build, deploy, import data or infer authenticated acceptance.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [root, origin, sourceSha, buildId, outputFile] = process.argv.slice(2);
if (!root || !origin?.startsWith('https://') || !sourceSha || !buildId || !outputFile) {
  throw Error('B4007_READBACK_ARGUMENTS_REQUIRED');
}
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const files = [];
function collect(dir) {
  for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
    const absolute = path.join(dir, item.name);
    if (item.isDirectory()) collect(absolute);
    else if (item.isFile()) files.push({
      path:path.relative(root, absolute).split(path.sep).join('/'),
      sha256:sha(fs.readFileSync(absolute))
    });
  }
}
collect(root);
if(files.length < 200)throw Error('B4007_INCOMPLETE_RETAINED_SITE_FILE_COUNT');

const failures = [];
let cursor = 0;
async function verify(file) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const rel = file.path.split('/').map(encodeURIComponent).join('/');
      const url = origin.replace(/\/$/, '') + '/' + rel + '?b4007=' + encodeURIComponent(buildId+'-'+attempt);
      const response = await fetch(url, {
        headers: {'Cache-Control':'no-cache', 'Pragma':'no-cache'},
        signal: AbortSignal.timeout(24000)
      });
      if (!response.ok) throw Error('HTTP_'+response.status);
      const actual = sha(Buffer.from(await response.arrayBuffer()));
      if (actual !== file.sha256) throw Error('SHA256_DIFFERENCE');
      return;
    } catch (error) {
      if (attempt === 3) failures.push({path:file.path,reason:String(error.message).slice(0,90)});
    }
  }
}
await Promise.all(Array.from({length:12}, async () => {
  while(cursor < files.length) await verify(files[cursor++]);
}));
const marker = JSON.parse(fs.readFileSync(path.join(root, '__recovery__/build.json')));
const result = {
  schema:'GRAVICENTRA_B4_007_LIVE_HOSTING_BYTE_READBACK_V1',
  status:failures.length ? 'HOLD_EXACT_BYTES_MISMATCH' : 'PASS_ALL_RETAINED_BYTES',
  sourceSha, buildId, origin, fileCount:files.length,
  exactCount:files.length-failures.length, failures, retainedManifestSha256:sha(
    files.slice().sort((a,b)=>a.path.localeCompare(b.path))
      .map(x=>x.sha256+'  '+x.path).join('\n')+'\n'
  ),
  bundleMarkerMatches:marker.sourceSha === sourceSha && marker.buildId === buildId,
  authenticatedRoleAcceptance:'PENDING',
  insurerRealWriteReloadAcceptance:'PENDING',
  productionAccepted:false
};
fs.writeFileSync(outputFile, JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,count:result.fileCount,exactCount:result.exactCount}));
if(result.failures.length||!result.bundleMarkerMatches)
  throw Error('B4007_FULL_LIVE_READBACK_NOT_EXACT');
