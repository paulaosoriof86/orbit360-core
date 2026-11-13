'use strict';
// Signed production status diagnostic only. No document upload, payments,
// Firestore writes, OAuth credential materialization, or user consent action.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const admin=require('firebase-admin');
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const json=JSON.parse(fs.readFileSync(process.env.FIREBASE_WEB_SDK_CONFIG,'utf8'));
function webKeys(x,out=new Set()){
  if(!x)return out;
  if(typeof x==='string'){
    if(x.startsWith('{')){try{webKeys(JSON.parse(x),out);}catch{}}
    return out;
  }
  if(Array.isArray(x)){x.forEach(y=>webKeys(y,out));return out;}
  if(typeof x==='object')for(const[k,v]of Object.entries(x)){
    if(k==='apiKey'&&typeof v==='string'&&v.length>12)out.add(v);
    else webKeys(v,out);
  }
  return out;
}
const keys=[...webKeys(json)];assert.equal(keys.length,1,'DRIVE_LIVE_PUBLIC_FIREBASE_API_KEY_CARDINALITY');
const credential=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
assert.equal(credential.project_id,PROJECT);
admin.initializeApp({credential:admin.credential.cert(credential),projectId:PROJECT});
const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT);
async function actors(){
  const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),tenant.collection('data').doc('asesores').collection('items').limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400,'DRIVE_LIVE_SIGNED_ACTOR_SCAN_BOUND');
  const pick=(test,role)=>{
    const ids=new Set(),uids=new Set();
    for(const a of advisors.docs){const r=a.data()||{};
      if([r.nombre,r.nombreCompleto,r.displayName,r.name].some(v=>test(norm(v)))){
        ids.add(a.id);for(const v of [r.authUid,r.uid,r.userId])if(v)uids.add(String(v));
      }
    }
    const rows=members.docs.filter(d=>{const m=d.data()||{};
      const identity=[m.nombre,m.nombreCompleto,m.name,m.displayName,m.fullName].some(v=>test(norm(v)))||
        ids.has(String(m.advisorId||m.asesorId||''))||uids.has(d.id);
      const assigned=[].concat(m.roles||[],m.activeRole||'',m.defaultRole||'').some(v=>norm(v)===norm(role));
      const states=[m.status,m.estado].filter(Boolean).map(norm);
      return identity&&assigned&&m.active!==false&&m.activo!==false&&m.inactivo!==true&&
        states.length>0&&states.every(v=>['active','activo'].includes(v));
    });
    assert.equal(rows.length,1,'DRIVE_LIVE_SIGNED_ACTOR_NON_UNIQUE_'+norm(role));
    return rows[0].id;
  };
  return[{uid:pick(v=>v.includes('paula')&&v.includes('osorio'),'Dirección'),role:'Dirección',key:'direccion'},
    {uid:pick(v=>v.startsWith('carloscastro'),'Operativo'),role:'Operativo',key:'carlos'}];
}
async function tokenFor(uid){
  const u=await auth.getUser(uid);assert.ok(!u.disabled&&u.emailVerified,'DRIVE_LIVE_STAFF_AUTH_DISABLED');
  const custom=await auth.createCustomToken(uid);
  const res=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key='+encodeURIComponent(keys[0]),{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:custom,returnSecureToken:true})});
  const data=await res.json().catch(()=>({}));
  assert.ok(res.ok&&data.idToken,'DRIVE_LIVE_SIGNED_FIREBASE_EXCHANGE_FAILED');
  return data.idToken;
}
async function statusFor(actor){
  const token=await tokenFor(actor.uid);
  const res=await fetch('https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360DocumentDriveStatus',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    body:JSON.stringify({data:{tenantId:TENANT,activeRole:actor.role}})});
  const data=await res.json().catch(()=>({}));
  if(res.status!==200){
    const er=data.error&&typeof data.error==='object'?data.error:{};
    const details=er.details&&typeof er.details==='object'?er.details:{};
    console.error('DRIVE_LIVE_SIGNED_STATUS_BACKEND_ERROR '+JSON.stringify({
      actor:actor.key,http:res.status,
      status:String(er.status||'').slice(0,60),
      message:String(er.message||'').slice(0,170),
      vaultState:String(details.vaultState||'').slice(0,50),
      code:String(details.code||'').slice(0,12)
    }));
  }
  assert.equal(res.status,200,'DRIVE_LIVE_SIGNED_STATUS_CALL_FAILED_'+actor.key);
  const out=data.result||{};
  const safe={actor:actor.key,callableHttp:res.status,status:String(out.status||''),available:out.available===true,
    bootstrapRequired:out.bootstrapRequired===true,bootstrapClientIdPresent:!!String(out.bootstrapClientId||'').trim(),
    configured:out.configured===true};
  console.log('DRIVE_LIVE_SIGNED_STATUS '+JSON.stringify(safe));
  assert.ok(['tenant_setup_required','connected','disponible'].includes(safe.status),'DRIVE_LIVE_SIGNED_UNEXPECTED_STATUS_'+actor.key);
  if(actor.key==='direccion'&&safe.bootstrapRequired)assert.equal(safe.bootstrapClientIdPresent,true,'DRIVE_LIVE_DIRECTION_OAUTH_CLIENT_ID_UNAVAILABLE');
}
(async()=>{for(const actor of await actors())await statusFor(actor);console.log('DRIVE_LIVE_PAULA_CARLOS_SIGNED_STATUS_READONLY_COMPLETE_WRITES_0');})()
  .catch(e=>{console.error(String(e&&e.message||e));process.exit(1);});
