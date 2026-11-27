'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const pkg = require('./gravicentra-i6-6-cloud-build-package.cjs');
const preview = require('./gravicentra-i6-6-cloud-build-preview.cjs');
const authority = require('./gravicentra-i6-6-frontend-preview-authority.cjs');
const nativeQa = require('./gravicentra-i6-6-cloud-build-source-admission.cjs');
const {C} = pkg;
const schema = 'GI_I66_FOCAL_HOSTING_PACKAGE_V1';
const product = 'orbit360-platform/';
const members = [pkg.F.archive, pkg.F.digest, pkg.F.proof];
const generated = ['__recovery__/build.json', 'core/pwa.js', 'index.html', 'product-runtime-config.js', 'sw.js'];
const git = (cwd, args, options = {}) => execFileSync('git', args, {cwd, maxBuffer: 64*1024*1024, ...options});
const oid = (repo, rev) => git(repo, ['rev-parse', '--verify', rev]).toString().trim();
const read = (repo, rev, file) => git(repo, ['cat-file', 'blob', rev + ':' + file]);
const jsonAt = (repo, rev, file) => JSON.parse(read(repo, rev, file));
const requestUrl = (kind, id) => 'https://cloudbuild.googleapis.com/v1/projects/' + C.projectId + '/locations/' + C.region + '/' + kind + '/' + id;

function plan(repo, head) {
  assert.match(head, /^[a-f0-9]{40}$/);
  const transport = jsonAt(repo, head, C.transport);
  const request = transport.focalHostingRequest;
  assert.ok(request, 'FOCAL_SIGNED_REQUEST_REQUIRED');
  const source = request.sourceSha;
  assert.match(source, /^[a-f0-9]{40}$/);
  git(repo, ['merge-base', '--is-ancestor', source, head]);
  const control = jsonAt(repo, head, C.control);
  const receipt = jsonAt(repo, head, request.previousReceiptPath);
  const target = receipt.target;
  const baselineTree = target.compositionTree || target.sourceTree;
  assert.match(baselineTree,/^[a-f0-9]{40}$/);
  git(repo, ['merge-base','--is-ancestor', target.sourceSha, source]);
  assert.equal(oid(repo, head + ':' + request.previousReceiptPath), request.previousReceiptBlob);
  assert.equal(oid(repo, source + ':' + C.manifest), request.manifestBlob);
  assert.equal(oid(repo, head + ':' + C.manifest), request.manifestBlob);
  assert.equal(request.baselineArchive.sha256, target.artifactDigest.slice(7));
  preview.objectRef(request.baselineArchive);
  const originalTransport = jsonAt(repo, source, C.transport);
  assert.deepEqual(transport.frontendPreviewRequest, originalTransport.frontendPreviewRequest);
  const changes = jsonAt(repo, source, C.manifest).changes.filter(row => request.changes.includes(row.id));
  const firstPreimages = new Map();
  for (const change of changes) {
    const seal = jsonAt(repo, source, change.receipt);
    assert.equal(seal.changeId,change.id);
    for (const row of change.paths.filter(pin=>pin.path.startsWith(product))) {
      if (firstPreimages.has(row.path)) continue;
      const pin = seal.pins?.find(item=>item.path===row.path);
      assert.ok(pin && /^[0-9a-f]{40}$/.test(pin.beforeBlob),'FOCAL_SOURCE_PREIMAGE_RECEIPT');
      assert.equal(pin.gitBlobSha || pin.afterBlob,row.gitBlobSha,'FOCAL_FIRST_APPROVED_BLOB');
      firstPreimages.set(row.path,pin.beforeBlob);
    }
  }
  const files = [...new Set(changes.flatMap(change => change.paths.map(row => row.path)).filter(file => file.startsWith(product)))].sort();
  const pins = files.map(file => {
    const result = read(repo, source, file);
    const after = pkg.blob(result);
    assert.equal(oid(repo, head + ':' + file), after, 'FOCAL_CONCURRENT_OWNER_CHANGE');
    const before=oid(repo,baselineTree+':'+file);
    assert.equal(before,firstPreimages.get(file),'FOCAL_PREIMAGE_REQUIRES_APPROVED_RECOMPOSITION_'+file);
    return {path:file, before, after, sha256:pkg.sha(result)};
  });
  authority.admitFocalHostingRequest({request, control, transport, receipt, manifestChanges:changes, pins});
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gi-focal-index-'));
  let compositionTree;
  try {
    const options = {env:{...process.env, GIT_INDEX_FILE:path.join(temp, 'index')}};
    git(repo, ['read-tree', baselineTree], options);
    const records = pins.map(row => '100644 ' + row.after + '\t' + row.path + '\0').join('');
    git(repo, ['update-index', '-z', '--index-info'], {...options, input:records});
    compositionTree = git(repo, ['write-tree'], options).toString().trim();
    const diff = git(repo, ['diff-tree', '-r', '--name-only', '-z', baselineTree, compositionTree]).toString().split('\0').filter(Boolean);
    assert.deepEqual(diff, files, 'FOCAL_EXACT_TREE_DELTA');
  } finally { fs.rmSync(temp, {recursive:true, force:true}); }
  return {schema, mechanismSha:head, sourceSha:source, sourceTreeSha:oid(repo, source + '^{tree}'),
    requestVersion:request.generation, requestDigest:pkg.digest(request), request, baseline:target,
    manifestDigest:receipt.physical.manifestDigest, compositionTree, pins};
}

function checkPlan(p) {
  assert.equal(p.schema, schema);
  for (const value of [p.mechanismSha,p.sourceSha,p.sourceTreeSha,p.compositionTree]) assert.match(value, /^[a-f0-9]{40}$/);
  assert.equal(p.requestDigest, pkg.digest(p.request));
  assert.equal(p.requestVersion, p.request.generation);
  assert.equal(p.sourceSha, p.request.sourceSha);
  assert.ok(Number.isSafeInteger(p.requestVersion) && p.requestVersion > 0);
  return p;
}

function prefix(p, id) {
  assert.ok(id === '$BUILD_ID' || /^[a-f0-9-]{36}$/.test(id));
  return 'i66/packages/focal-hosting/' + p.requestDigest + '/' + p.sourceSha + '/' + id + '/';
}

function unpackBaseline(bytes,p,dir) {
  const previous = p.baseline;
  assert.equal(pkg.sha(bytes),p.request.baselineArchive.sha256);
  if (Number.isSafeInteger(previous.artifactId)) {
    assert.equal(previous.artifactId,preview.IMPORTS.live.artifactId);
    preview.unpackHistorical(bytes,dir,'live');
  } else {
    const ref=p.request.baselineArchive;
    assert.equal(previous.executionProvider,'CLOUD_BUILD');
    assert.equal(previous.artifactId,ref.uri+'#'+ref.generation);
    assert.match(previous.compositionTree,/^[a-f0-9]{40}$/);
    assert.ok(ref.uri.startsWith('gs://'+C.bucket+'/i66/packages/focal-hosting/'));
    fs.mkdirSync(dir); const archive=path.join(dir,pkg.F.archive);
    fs.writeFileSync(archive,bytes,{flag:'wx'}); preview.safeUnpack(archive,dir);
  }
  return preview.loadBundle(dir,previous);
}

function rebind(relative, data, previous, next) {
  assert.ok(generated.includes(relative));
  let text = data.toString('utf8');
  assert.ok(text.includes(previous.buildId), 'FOCAL_GENERATED_BUILD_PREIMAGE_' + relative);
  text = text.replaceAll(previous.buildId, next.buildId);
  if (relative === '__recovery__/build.json' || relative === 'product-runtime-config.js') {
    assert.ok(text.includes(previous.sourceSha), 'FOCAL_GENERATED_SOURCE_PREIMAGE');
    text = text.replaceAll(previous.sourceSha, next.sourceSha);
  }
  return Buffer.from(text);
}

function compose(repo, p, baseline, work) {
  assert.equal('sha256:' + baseline.manifestSha256, p.manifestDigest);
  assert.equal(baseline.marker.buildId, p.baseline.buildId);
  assert.equal(baseline.manifest.length, p.baseline.files);
  const bundle = path.join(work,'bundle'), site = path.join(bundle,'site'), evidence = path.join(work,'evidence');
  fs.mkdirSync(site,{recursive:true}); fs.mkdirSync(evidence);
  const target = {sourceSha:p.sourceSha, buildId:'gi-i66-' + p.sourceSha.slice(0,12) + '-' + p.compositionTree.slice(0,12)};
  const selected = new Map(p.pins.map(row => [row.path.slice(product.length),row]));
  assert.equal(selected.size,p.pins.length);
  const changed = [], rows = [];
  for (const {relative,hash} of baseline.manifest) {
    const original = fs.readFileSync(path.join(baseline.site,relative));
    assert.equal(pkg.sha(original),hash);
    let result = original;
    if (selected.has(relative)) {
      const pin = selected.get(relative);
      assert.equal(pkg.blob(original),pin.before,'FOCAL_SERVED_PREIMAGE_' + relative);
      result = read(repo,p.sourceSha,pin.path);
      assert.equal(pkg.blob(result),pin.after); assert.equal(pkg.sha(result),pin.sha256);
    } else if (generated.includes(relative)) result = rebind(relative,original,p.baseline,target);
    const digest = pkg.sha(result);
    if (digest !== hash) changed.push(relative);
    const dest = path.join(site,relative);
    fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.writeFileSync(dest,result,{flag:'wx'});
    rows.push(digest + '  ' + relative);
  }
  assert.deepEqual(changed.sort(),[...selected.keys(),...generated].sort(),'FOCAL_OUTPUT_DIFF');
  const output = Buffer.from(rows.join('\n') + '\n');
  fs.writeFileSync(path.join(evidence,'site-manifest.sha256'),output);
  for (const file of ['firebase.json','.firebaserc']) fs.copyFileSync(path.join(baseline.dir,'bundle',file),path.join(bundle,file));
  const firebase = JSON.parse(fs.readFileSync(path.join(bundle,'firebase.json')));
  assert.equal(firebase.hosting.public,'site');
  return {...target,files:rows.length,changed,siteManifestSha256:pkg.sha(output)};
}

async function worker(p) {
  checkPlan(p);
  const root = process.cwd(), id = await pkg.workerIdentity(), io = await preview.cloudIo(id.headers);
  const build = await io.api(requestUrl('builds',id.buildId));
  pkg.validateBuild(p,build,{finished:false});
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'gi-focal-worker-')), repo = path.join(tmp,'source');
  git(tmp,['clone','--no-checkout','--single-branch','--branch',C.branch,C.repositoryUrl,repo]);
  const checkHead = () => {
    const h = git(repo,['ls-remote','--exit-code','origin','refs/heads/'+C.branch]).toString().trim().split(/\s+/)[0];
    assert.equal(h,p.mechanismSha,'FOCAL_AUTHORITY_HEAD_CHANGED');
  };
  checkHead(); assert.deepEqual(plan(repo,p.mechanismSha),p);
  const commit = await pkg.requestJson('https://api.github.com/repos/'+C.repository+'/commits/'+p.mechanismSha);
  assert.equal(commit.commit.verification.verified,true);
  assert.equal(commit.commit.tree.sha,oid(repo,p.mechanismSha+'^{tree}'));
  const q = p.request.qa, previousBuild = await io.api(requestUrl('builds',q.buildId));
  const qp = nativeQa.sourcePlanFromBuild(previousBuild);
  assert.equal(qp.sourceQaHead,p.sourceSha);
  const verified = await nativeQa.verify(qp,q.buildId,path.join(tmp,'retained-source-qa'),io);
  assert.deepEqual([verified.manifest.generation,verified.manifest.sha256],[q.generation,q.sha256]);
  const archive = await io.object(p.request.baselineArchive);
  const baselineDir = path.join(tmp,'baseline');
  const baseline = unpackBaseline(archive.data,p,baselineDir);
  const hosting = require('./gravicentra-i66-frontend-hosting-io.cjs').hosting({getRequestHeaders:async()=>id.headers});
  assert.equal(await hosting.current('live'),p.baseline.hostingVersion);
  const releaseReadbacks = [];
  for (const origin of require('./gravicentra-i6-6-preview-package-readback.cjs').LIVE) releaseReadbacks.push(await preview.readFiles(origin.origin,baseline));
  const location = path.join(tmp,'output'), output = compose(repo,p,baseline,location);
  checkHead(); assert.equal(await hosting.current('live'),p.baseline.hostingVersion);
  execFileSync('tar',['--sort=name','--format=gnu','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',path.join(root,pkg.F.archive),'bundle','evidence'],{cwd:location});
  const bytes = fs.readFileSync(pkg.F.archive), archiveSha256 = pkg.sha(bytes);
  const lock = {provider:C.provider,buildId:id.buildId,sourceSha:p.sourceSha,mechanismSha:p.mechanismSha,
    planSha256:pkg.digest(p),requestDigest:p.requestDigest,compositionTree:p.compositionTree,archiveSha256};
  // Save the exact result before claiming it. After a lost ACK the claim
  // identifies the original build and its immutable output, including its bytes.
  const retained = await io.retain('i66/package-staging/focal-hosting/'+p.requestDigest+'/'+id.buildId+'/'+pkg.F.archive,bytes);
  checkHead(); assert.equal(await hosting.current('live'),p.baseline.hostingVersion);
  const claim = await io.uploadClaim(pkg.lockName(p),{...lock,retained});
  const proof = {schema,status:'PACKAGE_PREPARED_FOR_RETENTION',buildId:id.buildId,requestDigest:p.requestDigest,
    compositionTree:p.compositionTree,sourceSha:p.sourceSha,archiveSha256,lock:{generation:String(claim.generation),retained},releaseReadbacks,output,sourceQa:q};
  fs.writeFileSync(pkg.F.digest,archiveSha256+'  '+pkg.F.archive+'\n',{flag:'wx'});
  fs.writeFileSync(pkg.F.proof,JSON.stringify(proof)+'\n',{flag:'wx'});
  console.log('I66_FOCAL_HOSTING_PACKAGE '+id.buildId+' '+archiveSha256+' '+pkg.digest(proof));

}

function verifyLog(proof,bytes) {
  const line = 'I66_FOCAL_HOSTING_PACKAGE '+proof.buildId+' '+proof.archiveSha256+' '+pkg.digest(proof);
  assert.equal(bytes.toString().split('\n').filter(row=>row.trimEnd().endsWith(line)).length,1);
}

function verifyContent(p,build,proof,files,out,previousBytes,sourceRepo=process.cwd()) {
  assert.deepEqual([proof.schema,proof.buildId,proof.requestDigest,proof.compositionTree,proof.sourceSha],
    [schema,build.id,p.requestDigest,p.compositionTree,p.sourceSha]);
  assert.deepEqual(proof.sourceQa,p.request.qa);
  const hash = pkg.sha(files[pkg.F.archive]);
  assert.equal(proof.archiveSha256, hash);
  assert.equal(files[pkg.F.digest].toString(),hash+'  '+pkg.F.archive+'\n');
  preview.objectRef(proof.lock.retained);
  assert.equal(proof.lock.retained.sha256,hash);
  assert.equal(proof.lock.retained.bytes,files[pkg.F.archive].length);
  assert.deepEqual(proof.releaseReadbacks.map(row=>[row.origin,row.files,'sha256:'+row.manifestSha256]),
    require('./gravicentra-i6-6-preview-package-readback.cjs').LIVE.map(row=>[row.origin,p.baseline.files,p.manifestDigest]));
  assert.equal(pkg.sha(previousBytes),p.request.baselineArchive.sha256);
  const prior = path.join(out,'previous');
  const baseline = unpackBaseline(previousBytes,p,prior);
  const expected = compose(sourceRepo,p,baseline,path.join(out,'expected-content'));
  assert.deepEqual(proof.output,expected,'FOCAL_INDEPENDENT_COMPOSITION');
  const dir=path.join(out,'contents'); fs.mkdirSync(dir);
  preview.safeUnpack(path.join(out,pkg.F.archive),dir);
  const recovered=preview.loadBundle(dir,{sourceSha:p.sourceSha});
  assert.equal(recovered.marker.buildId,proof.output.buildId);
  assert.equal(recovered.manifestSha256,proof.output.siteManifestSha256);
  assert.deepEqual(proof.output.changed,[...p.pins.map(row=>row.path.slice(product.length)),...generated].sort());
  for(const pin of p.pins) assert.equal(pkg.blob(fs.readFileSync(path.join(recovered.site,pin.path.slice(product.length)))),pin.after);
  assert.deepEqual(fs.readdirSync(path.join(dir,'bundle')).sort(),['.firebaserc','firebase.json','site']);
}

module.exports = {schema,members,generated,plan,checkPlan,prefix,unpackBaseline,rebind,compose,worker,verifyLog,verifyContent};
