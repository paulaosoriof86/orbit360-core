'use strict';
// Read-only, bounded inventory for named assignment anomalies reported by
// Direction. No user IDs, email, phone, credentials or secret values printed.
const assert=require('node:assert/strict');
const admin=require('firebase-admin');
const {explicitAssignedRoles, resolveProductActiveRole} = require('../functions/product-active-role-contract');
const key=['SA_LAB','SA_ALT','SA_DEFAULT'].map(x=>process.env[x]).filter(Boolean)
  .map(x=>{try{return JSON.parse(x);}catch{return null;}})
  .find(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
assert.ok(key,'I66_ROSTER_CENSUS_AUTH_UNAVAILABLE');
admin.initializeApp({credential:admin.credential.cert(key),projectId:'ays-orbit-360-lab'});
const tenant=admin.firestore().collection('tenants').doc('alianzas-soluciones');
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const canon=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const unique=values=>[...new Set([].concat(values||[]).filter(Boolean))];
const active=row=>row?.activo!==false&&row?.active!==false&&row?.inactivo!==true&&
  !['inactivo','inactive','blocked','bloqueado','eliminado','deleted','pending','pendiente','invited','invitado','suspended','suspendido'].includes(canon(row?.estado||row?.status));
const roles=row=>unique([...(Array.isArray(row?.roles)?row.roles:[]),
  ...(Array.isArray(row?.rolesAsignados)?row.rolesAsignados:[]),row?.rol,row?.role,row?.rolDefault,row?.defaultRole]).map(canon);
const countries=row=>unique([...(Array.isArray(row?.paises)?row.paises:[]),
  ...(Array.isArray(row?.countries)?row.countries:[]),row?.pais,row?.country,row?.paisDefault,row?.countryDefault])
  .map(value=>String(value).toUpperCase()).filter(value=>value==='GT'||value==='CO');
const targets=[
  {label:'Paula Osorio',match:n=>n.includes('paula')&&n.includes('osorio')},
  {label:'German Reyes',match:n=>n.includes('german')&&n.includes('reyes')},
  {label:'Priscila',match:n=>n.includes('priscila')},
  {label:'Asesor asignado',match:n=>n==='asesor asignado'}
];

// Compare the currently selected role with explicit grants. Selecting a permitted
// secondary role in the UI is legitimate, but is not proof of a dedicated account.
async function advisorLoginCensus(members) {
  const byCountry = {};
  for (const country of ['GT', 'CO']) {
    byCountry[country] = {assigned: 0, currentVerified: 0, switchableVerified: 0,
      disabled: 0, emailUnverified: 0, missingAuth: 0};
  }
  for (const {id, row} of members) {
    const states = [row.status, row.estado].map(canon).filter(Boolean);
    if (row.tenantId !== tenant.id || !active(row) || !states.length ||
        !states.every(s => s === 'active' || s === 'activo')) continue;
    const assigned = explicitAssignedRoles(row);
    if (!assigned.some(role => role === 'asesor' || role === 'comercial')) continue;
    const scoped = unique(row.countries ?? row.paises ?? row.paisesAutorizados)
      .map(c => String(c).toUpperCase()).filter(c => Object.hasOwn(byCountry, c));
    if (!scoped.length) continue;
    let user;
    try { user = await admin.auth().getUser(id); }
    catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
    let currentRole;
    try { currentRole = resolveProductActiveRole(row).activeRole; }
    catch (error) { if (error.code !== 'PRODUCT_ACTIVE_ROLE_NOT_ASSIGNED') throw error; }
    const result = !user ? 'missingAuth' : user.disabled ? 'disabled' :
      !user.emailVerified ? 'emailUnverified' :
      ['asesor','comercial'].includes(currentRole) ? 'currentVerified' : 'switchableVerified';
    for (const country of new Set(scoped)) {
      byCountry[country].assigned++;
      byCountry[country][result]++;
    }
  }
  return byCountry;
}

(async()=>{
  const [a,m,access]=await Promise.all([
    tenant.collection('data').doc('asesores').collection('items').limit(450).get(),
    tenant.collection('members').limit(200).get(),
    tenant.collection('config').doc('access').get()
  ]);
  assert.ok(a.size<450&&m.size<200,'I66_ROSTER_CENSUS_UNBOUNDED');
  const advisors=a.docs.map(doc=>({id:doc.id,row:doc.data()||{}}));
  const members=m.docs.map(doc=>({id:doc.id,row:doc.data()||{}}));
  const summary={at:new Date().toISOString(),tenant:'alianzas-soluciones',
    totals:{advisorRecords:advisors.length,memberRecords:members.length},
    advisorLoginEligibility:await advisorLoginCensus(members),
    teamRoleConfigPresent:!!access.data()?.rolePermissions,
    targets:[]};
  for(const target of targets){
    const ad=advisors.filter(({row})=>[row.nombre,row.nombreCompleto,row.displayName,row.name].some(value=>target.match(norm(value))));
    const mb=members.filter(({row})=>[row.nombre,row.nombreCompleto,row.displayName,row.name,row.fullName].some(value=>target.match(norm(value))));
    const rows=ad.map(({id,row})=>{
      const r=roles(row),cs=countries(row),member=members.find(m=>m.row.advisorId===id||m.row.asesorId===id||
        [row.authUid,row.uid,row.userId].filter(Boolean).includes(m.id));
      return{active:active(row),advisorRole:r.includes('asesor')||r.includes('comercial'),
        countries:cs,gtEligible:active(row)&&cs.includes('GT')&&(r.includes('asesor')||r.includes('comercial')),
        linkedActiveMember:!!member&&active(member.row),
        roleLabels:r,canonicalDifferentFromDocumentId:!!row.canonicalDocumentId&&row.canonicalDocumentId!==id};
    });
    summary.targets.push({name:target.label,advisorProfiles:ad.length,memberProfiles:mb.length,
      assignableGTProfiles:rows.filter(x=>x.gtEligible).length,
      advisorStatus:rows,memberStatus:mb.map(({row})=>({
        active:active(row),activeRole:canon(row.activeRole),roles:roles(row),
        countries:countries(row),hasAdvisorIdentity:!!(row.advisorId||row.asesorId)}))});
  }
  console.log('I66_ADVISOR_ROSTER_CENSUS_READONLY '+JSON.stringify(summary));
  console.log('I66_ADVISOR_ROSTER_CENSUS_DATA_WRITES=0');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
