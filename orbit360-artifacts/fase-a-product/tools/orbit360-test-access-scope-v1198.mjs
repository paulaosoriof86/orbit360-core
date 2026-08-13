import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const code = fs.readFileSync(path.join(root, 'core/access-scope.js'), 'utf8');
const data = {
  asesores: [
    { id:'a1', nombre:'Asesor Uno', rol:'Asesor', equipoId:'e1' },
    { id:'a2', nombre:'Asesor Dos', rol:'Asesor', equipoId:'e1' },
    { id:'a3', nombre:'Asesor Tres', rol:'Asesor', equipoId:'e2' }
  ],
  clientes: [
    { id:'c1', nombre:'Cliente Uno', pais:'GT', moneda:'GTQ', asesorId:'a1', identificacion:'ID1', email:'uno@example.test' },
    { id:'c2', nombre:'Cliente Dos', pais:'GT', moneda:'GTQ', asesorId:'a2' },
    { id:'c3', nombre:'Cliente Tres', pais:'CO', moneda:'COP', asesorId:'a3' }
  ],
  polizas: [
    { id:'p1', clienteId:'c1', asesorId:'a1', estado:'Vigente' },
    { id:'p2', clienteId:'c2', asesorId:'a2', estado:'Cancelada' }
  ],
  cobros: [{ id:'r1', polizaId:'p1', clienteId:'c1', asesorId:'a1', estado:'Vencido' }],
  auditLog: [], gestiones: [], actividades: []
};
const store = {
  all: c => data[c] || [],
  get: (c,id) => (data[c] || []).find(x => x.id === id) || null,
  where: (c,p) => (data[c] || []).filter(p),
  insert: (c,row) => { data[c] = data[c] || []; data[c].push(row); return row; },
  update: (c,id,patch) => { const r=(data[c]||[]).find(x=>x.id===id); if(r) Object.assign(r,patch); return r; },
  remove: (c,id) => { data[c]=(data[c]||[]).filter(x=>x.id!==id); }
};
let role='Asesor', advisor='a1';
const Orbit = {
  store,
  session: { rol:()=>role, asesorId:()=>advisor },
  auth: { user:()=>({ id:'u1', nombre:'Usuario Uno', email:'u@example.test', rol:role }) },
  tenant: { get:()=>({ id:'tenant-test', paisesCfg:{ GT:{moneda:'GTQ'}, CO:{moneda:'COP'} } }) },
  PAISES:[{id:'GT',moneda:'GTQ'},{id:'CO',moneda:'COP'}],
  paisCfg:p=>({moneda:p==='CO'?'COP':'GTQ'}),
  ui:{ today:()=> '2026-07-11' },
  cat:{ all:()=>({}) }
};
const context = vm.createContext({ window:{ Orbit }, Orbit, console, CustomEvent:function(){}, document:{ dispatchEvent(){} } });
vm.runInContext(code, context, { filename:'access-scope.js' });
const A = context.Orbit.access;
const fail = [];
const ok = (cond,msg) => { if(!cond) fail.push(msg); };

ok(A.dataScope('cliente360') === 'own', 'Asesor debe iniciar con scope own');
ok(A.filter('clientes', data.clientes, 'cliente360').map(x=>x.id).join(',') === 'c1', 'Scope own filtra solo cliente propio');
role='Operativo';
ok(A.dataScope('cliente360') === 'team', 'Operativo debe usar team por defecto');
ok(A.filter('clientes', data.clientes, 'cliente360').map(x=>x.id).sort().join(',') === 'c1,c2', 'Scope team incluye equipo, no otros equipos');
role='Dirección';
ok(A.dataScope('cliente360') === 'all', 'Dirección debe usar all');
ok(A.filter('clientes', data.clientes, 'cliente360').length === 3, 'Scope all incluye todos');
role='Asesor'; advisor='a1';
ok(A.deriveClientState('c1') === 'activo_en_mora', 'Cliente con póliza activa y cobro vencido debe estar activo_en_mora');
ok(A.deriveClientState('c2') === 'reactivable', 'Cliente con póliza cancelada debe estar reactivable');
ok(A.deriveClientState('c3') === 'pendiente_polizas', 'Cliente sin póliza debe estar pendiente_polizas');
const manual=A.prepareManual('clientes',{id:'c4',nombre:'Nuevo',pais:'GT',asesorId:'a1'});
ok(manual.tenantId==='tenant-test','Alta manual hereda tenantId');
ok(manual.moneda==='GTQ','Alta manual deriva moneda del tenant');
ok(manual.fuente==='ingreso_manual_plataforma','Alta manual registra fuente');
ok(manual.estadoOperativo==='pendiente_polizas','Alta manual inicia pendiente_polizas');
ok(manual.requiereValidacion===true,'Alta incompleta requiere validación');
ok(A.duplicateCandidates({identificacion:'ID1',email:'',nombre:'Otro',pais:'GT'}).some(x=>x.id==='c1'&&x.exact),'Deduplicación exacta por identificación');

if (fail.length) {
  console.error('ACCESS SCOPE V1198: BLOQUEADO'); fail.forEach(x=>console.error('- '+x)); process.exit(1);
}
console.log('ACCESS SCOPE V1198: OK');
console.log('- own/team/all');
console.log('- estados derivados');
console.log('- alta manual tenant-aware');
console.log('- deduplicación exacta');
