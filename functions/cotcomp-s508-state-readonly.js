'use strict';

const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');

const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const STATE_PATH='tenants/alianzas-soluciones/cotcomp/pilotIntake/items/s508';

async function main(){
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'';
  if(project!==PROJECT_ID)throw new Error('WRONG_PROJECT');
  const app=getApps()[0]||initializeApp({projectId:PROJECT_ID});
  const db=getFirestore(app);
  const s=await db.doc(STATE_PATH).get();
  const d=s.exists?s.data()||{}:{};
  process.stdout.write(JSON.stringify({
    schemaVersion:'ays-cotcomp-s508-state-readonly-v1',
    projectId:PROJECT_ID,
    tenantId:TENANT_ID,
    stateExists:s.exists,
    used:d.used===true,
    attempts:Number(d.attempts||0),
    processing:d.processing===true,
    containsPii:false
  },null,2)+'\n');
}
main().catch(e=>{console.error(JSON.stringify({ok:false,error:String(e&&e.message||e),containsPii:false}));process.exit(1);});
