'use strict';
const assert=require('node:assert/strict');
const {scopedPolicyRead,validateArguments}=require('../functions/b4-003-scoped-policy-reader');
const {Denied}=require('../functions/b4-003-scoped-access-boundary');
const tenantId='alianzas-soluciones';
const policies=[
{id:'p1',tenantId,pais:'GT',asesorId:'a1',numero:'A'},
{id:'p2',tenantId,pais:'GT',asesorId:'a2',numero:'B'},
{id:'p3',tenantId,pais:'CO',asesorId:'a1',numero:'C'},
{id:'p4',tenantId,pais:'GT',asesorId:'a3',numero:'D'}
];
let activeMember={uid:'u1',tenantId,status:'active',roles:['Asesor','Operativo'],advisorId:'a1',countries:['GT','CO'],dataScopes:{default:'own'},teamAdvisorIds:['a2']};
const access={roleScopes:{asesor:'own',operativo:'all'}};
const doc=(data,id)=>({id,exists:!!data,data:()=>data});
function collectionOfPolicies(rows){
 const build=(constraints=[],cursor='',cap=99)=>({
  where:(field,op,value)=>build(constraints.concat([{field,op,value}]),cursor,cap),
  orderBy:(field)=>{assert.equal(field,'__name__');return build(constraints,cursor,cap);},
  startAfter:snap=>build(constraints,snap.id,cap),
  limit:n=>build(constraints,cursor,n),
  doc:id=>({get:async()=>doc(rows.find(x=>x.id===id),id)}),
  get:async()=>{
   let result=rows.filter(row=>constraints.every(c=>c.op==='=='?row[c.field]===c.value:c.op==='in'&&c.value.includes(row[c.field])));
   result=result.sort((a,b)=>a.id.localeCompare(b.id));
   if(cursor)result=result.filter(x=>x.id>cursor);
   return {docs:result.slice(0,cap).map(x=>doc(x,x.id))};
  }
 });
 return build();
}
const data={
 collection:key=>{
  assert.equal(key,'tenants');
  return {doc:id=>{
   assert.equal(id,tenantId);
   return {collection:key=>{
    if(key==='members')return {doc:uid=>({get:async()=>doc(uid==='u1'?activeMember:null,uid)})};
    if(key==='config')return {doc:()=>({get:async()=>doc(access,'access')})};
    if(key==='data')return {doc:table=>{assert.equal(table,'polizas');return {collection:items=>{assert.equal(items,'items');return collectionOfPolicies(policies);}}}};
    throw Error('UNEXPECTED_COLLECTION');
   }};
  }};
 }
};
const req=(activeRole,mode='list',more={})=>({db:data,auth:{uid:'u1',token:{giActiveRole:activeRole}},request:{tenantId,activeRole,country:'GT',mode,...more}});
const denied=async(fn,code)=>{
 let e;try{await fn()}catch(error){e=error}
 assert.ok(e instanceof Denied,'expected AccessDenied');
 assert.equal(e.code,code);
};
(async()=>{
 let count=0;
 const own=await scopedPolicyRead(req('asesor'));assert.deepEqual(own.rows.map(x=>x.id),['p1']);count++;
 const assignedRoleWithoutSpecialClaim=await scopedPolicyRead({...req('asesor'),auth:{uid:'u1',token:{}}});assert.deepEqual(assignedRoleWithoutSpecialClaim.rows.map(x=>x.id),['p1']);count++;

 const p1=await scopedPolicyRead(req('asesor','get',{policyId:'p1'}));assert.equal(p1.rows[0].id,'p1');count++;
 await denied(()=>scopedPolicyRead(req('asesor','get',{policyId:'p2'})),'POLICY_NOT_FOUND_OR_DENIED');count++;
 await denied(()=>scopedPolicyRead(req('asesor','get',{policyId:'p3'})),'POLICY_NOT_FOUND_OR_DENIED');count++;
 await denied(()=>scopedPolicyRead({...req('operativo'),auth:{uid:'u1',token:{giActiveRole:'asesor'}}}),'SIGNED_ACTIVE_ROLE_MISMATCH');count++;
 activeMember={...activeMember,dataScopes:{default:'team'}};
 const team=await scopedPolicyRead({...req('operativo'),auth:{uid:'u1',token:{giActiveRole:'operativo'}}});
 assert.deepEqual(team.rows.map(x=>x.id),['p1','p2']);count++;
 activeMember={...activeMember,dataScopes:{default:'all'}};
 const first=await scopedPolicyRead(req('operativo','list',{pageSize:1}));
 assert.deepEqual(first.rows.map(x=>x.id),['p1']);assert.equal(first.nextCursor,'p1');count++;
 const second=await scopedPolicyRead(req('operativo','list',{pageSize:1,cursor:first.nextCursor}));
 assert.deepEqual(second.rows.map(x=>x.id),['p2']);count++;
 // The lookahead document is never returned, yet it still has to pass
 // authorization. A foreign-tenant row must fail the entire page.
 policies.push({id:'p1-leak',tenantId:'another-tenant',pais:'GT',asesorId:'a3',numero:'FOREIGN'});
 await denied(()=>scopedPolicyRead(req('operativo','list',{pageSize:1})),'TENANT_DENIED');count++;
 policies.pop();
 await denied(()=>scopedPolicyRead(req('asesor','list',{cursor:'p3'})),'CURSOR_DENIED');count++;
 await denied(()=>scopedPolicyRead(req('asesor','list',{pageSize:51})),'PAGE_SIZE_INVALID');count++;
 await denied(()=>scopedPolicyRead(req('asesor','list',{policyId:'p1'})),'POLICY_GET_LIST_MIXED');count++;
 await denied(()=>scopedPolicyRead({...req('asesor'),auth:null}),'AUTH_REQUIRED');count++;
 activeMember={...activeMember,status:'inactive'};
 await denied(()=>scopedPolicyRead(req('asesor')),'MEMBERSHIP_DENIED');count++;
 assert.equal(validateArguments({tenantId,country:'CO',activeRole:'asesor',mode:'get',policyId:'p3'}).country,'CO');count++;
 console.log('B4_003_SCOPED_POLICY_READ_CONTRACT_PASS checks='+count+' mock_only_no_firestore_writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
