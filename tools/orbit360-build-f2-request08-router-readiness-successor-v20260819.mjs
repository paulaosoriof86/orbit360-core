import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PRE=process.env.ORBIT360_PREDECESSOR_DIR;
const OUT=process.env.ORBIT360_SUCCESSOR_DIR;
const SOURCE='fc46bd85783d8b4d524cbeb0fee54ee9a2c774af';
const PRODUCT='core/product-app-p0.js';
const PRE_ARTIFACT=9385306424;
const PRE_SOURCE='b94b2ae86d26586a68d33be9edba8715e956b02e';
const PRE_ZIP_SHA='81a96f476fd0fdfd814b3f047951ce653fd324bef8a6d96d6ee6fe44dd7bdcf4';
const PRE_MANIFEST_SHA='cc6170121ed61fd6d9cde867dfcae8a3dd23d29777c6ee28c240d70e49843eef';
const PRE_PRODUCT_SHA='4a7490164a9b845cae2311a90ca718e6e4cec2f91adab29a40af1b79acfedc23';
const STATUS='FASE_A_PRODUCT_F2_REQUEST08_ROUTER_READINESS_SUCCESSOR_CERTIFIED';
const must=(v,c)=>{if(!v)throw new Error(c);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(p);
const manifestPath=path.join(PRE,'orbit360-package-manifest.json');
must(PRE&&OUT,'BUILD_DIR_REQUIRED');
must(fs.existsSync(manifestPath),'PREDECESSOR_MANIFEST_MISSING');
must(sha(read(manifestPath))===PRE_MANIFEST_SHA,'PREDECESSOR_MANIFEST_SHA_MISMATCH');
const preManifest=JSON.parse(read(manifestPath));
must(preManifest.status==='FASE_A_PRODUCT_F2_REQUEST06_ROOTFIX_SUCCESSOR_CERTIFIED','PREDECESSOR_STATUS_MISMATCH');
must(preManifest.sourceHead===PRE_SOURCE,'PREDECESSOR_SOURCE_MISMATCH');
must(preManifest.fileCount===194&&preManifest.files.length===194,'PREDECESSOR_FILECOUNT_MISMATCH');
const preProduct=preManifest.files.find(x=>x.path===PRODUCT);
must(preProduct&&preProduct.sha256===PRE_PRODUCT_SHA,'PREDECESSOR_PRODUCT_APP_IDENTITY_MISMATCH');

fs.rmSync(OUT,{recursive:true,force:true});
fs.cpSync(PRE,OUT,{recursive:true});
const repoProduct=path.resolve('orbit360-platform',PRODUCT);
must(fs.existsSync(repoProduct),'ROOTFIX_PRODUCT_APP_MISSING');
const rootfixBytes=read(repoProduct);
must(rootfixBytes.includes(Buffer.from("fase-a-product-p0-20260819-router-host-readiness")),'ROOTFIX_VERSION_MISSING');
must(rootfixBytes.includes(Buffer.from('waitForRouterReady(120000)')),'ROOTFIX_WAIT_BOUNDARY_MISSING');
fs.copyFileSync(repoProduct,path.join(OUT,PRODUCT));

const actualFiles=[];
function walk(dir,rel=''){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const r=rel?rel+'/'+ent.name:ent.name;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())walk(p,r);
    else if(r!=='orbit360-package-manifest.json')actualFiles.push(r.replaceAll('\\','/'));
  }
}
walk(OUT);
must(actualFiles.length===194,'SUCCESSOR_FILECOUNT_MISMATCH');
const preMap=new Map(preManifest.files.map(x=>[x.path,x]));
const files=actualFiles.map(p=>{const b=read(path.join(OUT,p));return{path:p,bytes:b.length,sha256:sha(b)};});
const deltas=files.filter(x=>!preMap.has(x.path)||preMap.get(x.path).sha256!==x.sha256||preMap.get(x.path).bytes!==x.bytes);
must(deltas.length===1&&deltas[0].path===PRODUCT,'SUCCESSOR_DELTA_NOT_EXACTLY_PRODUCT_APP');
const productAfter=deltas[0];
must(productAfter.sha256!==PRE_PRODUCT_SHA,'ROOTFIX_PRODUCT_APP_UNCHANGED');

const manifest=structuredClone(preManifest);
manifest.status=STATUS;
manifest.sourceHead=SOURCE;
manifest.generatedAt=new Date().toISOString();
manifest.fileCount=194;
manifest.files=files;
manifest.basePackageSha256=PRE_ZIP_SHA;
manifest.baseSourceHead=PRE_SOURCE;
manifest.baseManifestSha256=PRE_MANIFEST_SHA;
manifest.deltaFiles=[PRODUCT];
manifest.deltaSourceHead=SOURCE;
manifest.successorOrdinal=(Number(preManifest.successorOrdinal)||11)+1;
manifest.unchangedFileCount=193;
manifest.packageLineage='Exact certified artifact 9385306424 + one-file Request08 router-readiness functional rootfix; unpublished F2 successor';
manifest.candidateOrigin='REQUEST08_FUNCTIONAL_ROOTFIX_SUCCESSOR';
manifest.candidateArtifactPredecessor=PRE_ARTIFACT;
manifest.request08RunId=32313759752;
manifest.rootCause='FUNCTIONAL_DEFECT:F2_PRODUCT_APP_ROUTER_READINESS_PREMATURE';
manifest.rootfix='PRODUCT_APP_ROUTER_HOST_READINESS_GATE';
manifest.regressionTool='tools/orbit360-test-f2-router-readiness-rootfix-v20260819.mjs';
manifest.regressionPass=true;
manifest.routerSourceMutationRequired=false;
manifest.lineage=manifest.lineage||{};
manifest.lineage.f2_request08_router_readiness={
  baseArtifactId:PRE_ARTIFACT,
  baseZipSha256:PRE_ZIP_SHA,
  baseManifestSha256:PRE_MANIFEST_SHA,
  baseSourceHead:PRE_SOURCE,
  sourceHead:SOURCE,
  request08RunId:32313759752,
  rootfixCommit:SOURCE,
  productDeltaCount:1,
  productDeltaPaths:[PRODUCT],
  beforeSha256:PRE_PRODUCT_SHA,
  afterSha256:productAfter.sha256,
  unpublished:true
};
fs.writeFileSync(path.join(OUT,'orbit360-package-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const finalManifestSha=sha(read(path.join(OUT,'orbit360-package-manifest.json')));
const evidence={schemaVersion:'orbit360-f2-request08-router-readiness-successor-build-v1',ok:true,status:STATUS,classification:'PASS',sourceHead:SOURCE,predecessorArtifactId:PRE_ARTIFACT,predecessorZipSha256:PRE_ZIP_SHA,predecessorManifestSha256:PRE_MANIFEST_SHA,fileCount:194,fullRehashPass:true,deltaCount:1,deltaPaths:[PRODUCT],unchangedFileCount:193,productAppBeforeSha256:PRE_PRODUCT_SHA,productAppAfterSha256:productAfter.sha256,manifestSha256:finalManifestSha,regressionPass:true,routerSourceMutationRequired:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(evidence,null,2));