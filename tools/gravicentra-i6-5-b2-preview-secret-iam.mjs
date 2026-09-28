import fs from 'node:fs';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const PROJECT='ays-orbit-360-lab';
const TENANT=String(process.env.TENANT_HINT||'').trim();
const OUT=process.env.B2_PREVIEW_SECRET_IAM_PROOF_FILE||((process.env.RUNNER_TEMP||'.')+'/b2-preview-secret-iam.json');
const RUNTIME_SA='orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com';
const SECRET_IDS=[
  'orbit360-insurer-credentials-preview-'+TENANT,
  'orbit360-drive-oauth-preview-'+TENANT
];
const MEMBER='serviceAccount:'+RUNTIME_SA;
const REQUIRED_ROLES=['roles/secretmanager.viewer','roles/secretmanager.secretAccessor','roles/secretmanager.secretVersionAdder'];
const need=(v,c)=>{if(!v)throw new Error(c);};

function sa(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{
      const x=JSON.parse(process.env[k]||'');
      if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;
    }catch{}
  }
  throw new Error('B2_PREVIEW_SECRET_IAM_SERVICE_ACCOUNT');
}
function bindingState(policy){
  const out={};
  for(const role of REQUIRED_ROLES){
    const b=[].concat(policy?.bindings||[]).find(x=>x.role===role);
    out[role]=[].concat(b?.members||[]).includes(MEMBER);
  }
  return out;
}
function aggregate(states){
  const out={};
  for(const role of REQUIRED_ROLES)out[role]=states.every(x=>x?.[role]===true);
  return out;
}

need(TENANT==='alianzas-soluciones','B2_PREVIEW_SECRET_IAM_TENANT_INVALID');
const creds=sa();
const client=new SecretManagerServiceClient({projectId:PROJECT,credentials:{client_email:creds.client_email,private_key:creds.private_key}});
const proof={
  schema:'GRAVICENTRA_B2_PREVIEW_SECRET_IAM_V2',
  status:'FAIL',
  projectId:PROJECT,
  tenantId:TENANT,
  secretId:SECRET_IDS[0],
  driveSecretId:SECRET_IDS[1],
  runtimeServiceAccount:RUNTIME_SA,
  productionSecretTouched:false,
  payloadRead:false,
  created:false,
  bindingsAdded:[],
  before:{},
  after:{},
  secrets:{}
};

async function provision(secretId){
  const name='projects/'+PROJECT+'/secrets/'+secretId;
  const row={secretId,created:false,bindingsAdded:[],before:{},after:{}};
  let exists=true;
  try{await client.getSecret({name});}
  catch(e){
    if(Number(e?.code)===5){
      exists=false;
      await client.createSecret({parent:'projects/'+PROJECT,secretId,secret:{replication:{automatic:{}}}});
      row.created=true;
    }else{
      throw new Error('B2_PREVIEW_SECRET_DESCRIBE_FAILED:'+secretId+':CODE_'+String(e?.code||'unknown'));
    }
  }
  row.existed=exists;
  const [beforeResp]=await client.getIamPolicy({resource:name});
  const before=beforeResp||{bindings:[]};
  row.before=bindingState(before);
  const policy={...before,bindings:[].concat(before.bindings||[]).map(x=>({role:x.role,members:[].concat(x.members||[])}))};
  for(const role of REQUIRED_ROLES){
    let b=policy.bindings.find(x=>x.role===role);
    if(!b){b={role,members:[]};policy.bindings.push(b);}
    if(!b.members.includes(MEMBER)){b.members.push(MEMBER);row.bindingsAdded.push(role);}
  }
  if(row.bindingsAdded.length)await client.setIamPolicy({resource:name,policy});
  const [afterResp]=await client.getIamPolicy({resource:name});
  row.after=bindingState(afterResp||{});
  need(REQUIRED_ROLES.every(r=>row.after[r]===true),'B2_PREVIEW_SECRET_RUNTIME_IAM_NOT_EFFECTIVE:'+secretId);
  return row;
}

try{
  for(const secretId of SECRET_IDS){
    const row=await provision(secretId);
    proof.secrets[secretId]=row;
    proof.created=proof.created||row.created;
    row.bindingsAdded.forEach(role=>proof.bindingsAdded.push(secretId+':'+role));
  }
  const rows=Object.values(proof.secrets);
  proof.before=aggregate(rows.map(x=>x.before));
  proof.after=aggregate(rows.map(x=>x.after));
  need(REQUIRED_ROLES.every(r=>proof.after[r]===true),'B2_PREVIEW_SECRET_RUNTIME_IAM_AGGREGATE_NOT_EFFECTIVE');
  proof.status='PASS';
  fs.writeFileSync(OUT,JSON.stringify(proof,null,2)+'\n');
  console.log('B2_PREVIEW_SECRET_IAM=PASS '+JSON.stringify({created:proof.created,bindingsAdded:proof.bindingsAdded,after:proof.after,driveSecretId:proof.driveSecretId,productionSecretTouched:false,payloadRead:false}));
}catch(e){
  proof.error={code:String(e?.code||''),message:String(e?.message||e)};
  fs.writeFileSync(OUT,JSON.stringify(proof,null,2)+'\n');
  console.error('B2_PREVIEW_SECRET_IAM=FAIL '+JSON.stringify(proof.error));
  process.exitCode=1;
}finally{
  await client.close().catch(()=>{});
}
