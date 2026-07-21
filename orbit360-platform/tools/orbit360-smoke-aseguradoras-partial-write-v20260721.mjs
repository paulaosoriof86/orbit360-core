import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const source = fs.readFileSync(path.join(root, 'core/backend-lab-aseguradoras-partial-write-v20260721.js'), 'utf8');
const rows = { aseguradoras: [{ id:'asg_1', tenantId:'alianzas-soluciones', contactos:[{id:'c1'}], portales:[{id:'p1',credentialRef:'backend_required'}], cuentas:[{id:'a1',accountRef:'acct_0123456789abcdef0123456789abcdef'}] }], actividades: [] };
let remotePayload=null, remoteOptions=null, delegated=false;
const emitted=[], events=[];
const store={
  get(c,id){return (rows[c]||[]).find(x=>x.id===id)||null;}, raw(){return rows;}, _emit(c){emitted.push(c);},
  update(c,id,patch){delegated=c!=='aseguradoras'; const row=this.get(c,id)||{id}; Object.assign(row,patch||{}); return row;}
};
const firestore={collection(){return{doc(){return{collection(){return{doc(){return{set(payload,options){remotePayload=JSON.parse(JSON.stringify(payload));remoteOptions=options;return Promise.resolve();}};}};}};}};};
const Orbit={store};
const windowObject={Orbit,OrbitBackend:{mode:'firestore-lab',tenantId:'alianzas-soluciones'},location:{search:'?orbitBackend=firestore-lab&tenant=alianzas-soluciones'},firebase:{firestore:()=>firestore},dispatchEvent(e){events.push(e);}};
const sandbox={window:windowObject,Orbit,OrbitBackend:windowObject.OrbitBackend,firebase:windowObject.firebase,URLSearchParams,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init&&init.detail;}},Date,JSON,Promise,console,setTimeout,clearTimeout};
vm.runInNewContext(source,sandbox,{filename:'backend-lab-aseguradoras-partial-write-v20260721.js'});
const marker=Orbit.store.__aseguradorasPartialWriteV20260721;
assert.ok(marker); assert.equal(marker.version,'20260721.2'); assert.equal(marker.remoteWritesPatchOnly,true); assert.equal(marker.sanitizesSensitiveFields,true);
const sanitized=marker.sanitizePatch({portales:[{id:'p2',usuario:'user-real',password:'secret-real'}],cuentas:[{id:'a2',numero:'123456789'}]});
const serializedSanitized=JSON.stringify(sanitized);
assert.ok(!serializedSanitized.includes('user-real')); assert.ok(!serializedSanitized.includes('secret-real')); assert.ok(!serializedSanitized.includes('123456789'));
assert.equal(sanitized.portales[0].credentialRef,'backend_required'); assert.equal(sanitized.cuentas[0].accountRef,'backend_required');
const nextPortals=[{id:'p1',credentialRef:'cred_0123456789abcdef0123456789abcdef'}];
const returned=Orbit.store.update('aseguradoras','asg_1',{portales:nextPortals,sensitiveImportStatus:{status:'stored_securely'}});
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(returned._syncOp,'update-partial'); assert.deepEqual(rows.aseguradoras[0].portales,nextPortals);
assert.equal(rows.aseguradoras[0].cuentas[0].accountRef,'acct_0123456789abcdef0123456789abcdef'); assert.equal(rows.aseguradoras[0].contactos[0].id,'c1');
assert.ok(remotePayload); assert.deepEqual(remotePayload.portales,nextPortals); assert.equal(remotePayload.sensitiveImportStatus.status,'stored_securely');
assert.equal(Object.prototype.hasOwnProperty.call(remotePayload,'cuentas'),false); assert.equal(Object.prototype.hasOwnProperty.call(remotePayload,'contactos'),false); assert.deepEqual(remoteOptions,{merge:true});
assert.ok(emitted.includes('aseguradoras')); assert.ok(events.some(e=>e.type==='orbit:backend:write-ok'));
Orbit.store.update('actividades','act_1',{titulo:'Prueba'}); assert.equal(delegated,true);
console.log('ORBIT360 ASEGURADORAS PARTIAL WRITE: OK');
console.log('- payload remoto limitado al patch');
console.log('- cuentas y contactos preservados');
console.log('- campos sensibles saneados dentro del owner');
