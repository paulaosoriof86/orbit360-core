import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const files = ['core/policy-receipts-engine.js'];
const data = {
  asesores: [
    { id:'a1', nombre:'Operativo Uno', rol:'Operativo', equipoId:'e1' },
    { id:'a2', nombre:'Asesor Dos', rol:'Asesor', equipoId:'e1' }
  ],
  aseguradoras: [
    { id:'asg1', nombre:'Aseguradora Uno', pais:'GT', vinculada:true },
    { id:'asg2', nombre:'No vinculada', pais:'GT', vinculada:false }
  ],
  clientes: [{ id:'c1', nombre:'Cliente Uno', pais:'GT', moneda:'GTQ', asesorId:'a1', identificacion:'ID1' }],
  polizas: [], cobros: [], vehiculos: [], actividades: [], auditLog: [], conciliaciones: [], gestiones: [], finmovs: []
};
const store = {
  all: c => (data[c] || []).slice(), get: (c,id) => (data[c] || []).find(x => x.id === id) || null,
  where: (c,p) => (data[c] || []).filter(p), find: (c,p) => (data[c] || []).find(p) || null,
  insert: (c,row) => { data[c]=data[c]||[]; data[c].push(row); return row; },
  update: (c,id,patch) => { const r=(data[c]||[]).find(x=>x.id===id); if(!r)return null; Object.assign(r,patch); return r; },
  remove: (c,id) => { data[c]=(data[c]||[]).filter(x=>x.id!==id); }
};
let role='Operativo', advisor='a1';
const r2=n=>Math.round((n+Number.EPSILON)*100)/100;
const cuotasDe=f=>({Contado:1,Anual:1,Semestral:2,Cuatrimestral:3,Trimestral:4,Bimestral:6,Mensual:12}[f]||1);
const primas={
  cuotasDe,r2,
  desglose:(n,p,o={})=>{const neta=+n||0,gastosEmision=+o.gastosEmision||0,otros=+o.otros||0,recargoPct=o.recargoFinPct!=null?+o.recargoFinPct:5,gastosFinan=o.fraccionado?r2(neta*recargoPct/100):0,baseGravable=r2(neta+gastosEmision+gastosFinan+otros),ivaPct=o.ivaPct!=null?+o.ivaPct:12,iva=r2(baseGravable*ivaPct/100);return{neta:r2(neta),gastosEmision:r2(gastosEmision),gastosFinan,otros:r2(otros),baseGravable,iva,ivaPct,recargoPct,total:r2(baseGravable+iva),fraccionado:!!o.fraccionado};},
  recibos:(d,o={})=>{const n=Math.max(1,+o.cuotas||cuotasDe(o.frecuencia)),rows=[];for(let i=0;i<n;i++){const split=v=>i===n-1?r2(v-r2(v/n)*(n-1)):r2(v/n),neta=split(d.neta),gastosEmision=split(d.gastosEmision),gastosFinan=split(d.gastosFinan),otros=split(d.otros),iva=i===n-1?r2(d.iva-rows.reduce((s,r)=>s+r.iva,0)):r2((neta+gastosEmision+gastosFinan+otros)*d.ivaPct/100),total=r2(neta+gastosEmision+gastosFinan+otros+iva);const due=new Date((o.vigenciaInicio||'2026-07-11')+'T00:00:00');due.setMonth(due.getMonth()+Math.round(i*12/n));const lim=new Date(due);lim.setDate(lim.getDate()+15);rows.push({n:(i+1)+'/'+n,neta,gastosEmision,gastosFinan,otros,iva,total,comAseguradora:0,comVendedor:0,vence:due.toISOString().slice(0,10),fechaLimite:lim.toISOString().slice(0,10)});}return rows;}
};
const norm=v=>String(v==null?'':v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const access={
  norm, tenantId:()=> 'tenant-test', activeRole:()=>role,
  actorUser:()=>({id:'u1',nombre:'Usuario',rolActivo:role,asesorId:advisor}), actorAdvisor:()=>store.get('asesores',advisor)||{},
  currencyFor:p=>p==='CO'?'COP':'GTQ',
  deriveClientState:id=>{const ps=store.where('polizas',p=>p.clienteId===id);if(!ps.length)return'pendiente_polizas';const active=ps.filter(p=>['vigente','porrenovar'].includes(norm(p.estado)));if(active.length){const ids=new Set(active.map(p=>p.id));return store.all('cobros').some(c=>ids.has(c.polizaId)&&norm(c.estado)==='vencido')?'activo_en_mora':'activo';}return ps.some(p=>['cancelada','vencida','anulada','rechazada','norenovada'].includes(norm(p.estado)))?'reactivable':'inactivo';},
  audit:(accion,coleccion,id,antes,despues,motivo,detalle)=>store.insert('auditLog',{id:'aud'+Date.now()+Math.random(),accion,coleccion,registroId:id,antes,despues,motivo,detalle})
};
const Orbit = {
  store, session:{ rol:()=>role, asesorId:()=>advisor }, auth:{ user:()=>({id:'u1',nombre:'Usuario',email:'u@example.test',rol:role}) },
  tenant:{ get:()=>({id:'tenant-test',paisesCfg:{GT:{moneda:'GTQ',iva:12,recargoFinanciero:5,gastosEmision:0}}}) },
  PAISES:[{id:'GT',moneda:'GTQ',iva:12,recargoFinanciero:5,gastosEmision:0}], paisCfg:()=>({moneda:'GTQ',iva:12,recargoFinanciero:5,gastosEmision:0}),
  ui:{ today:()=> '2026-07-11' }, cat:{ all:()=>({}) }, q:{ postRecaudo:()=>{} }, primas, access
};
const context=vm.createContext({ window:{Orbit}, Orbit, console, CustomEvent:function(){}, document:{dispatchEvent(){}}, setTimeout, clearTimeout });
for(const rel of files) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});
const E=context.Orbit.policyReceipts, failures=[], ok=(cond,msg)=>{if(!cond)failures.push(msg);};
const base={ numero:'P-001',clienteId:'c1',asesorId:'a1',aseguradoraId:'asg1',pais:'GT',moneda:'GTQ',ramo:'Automóviles',subramo:'Vehículo Liviano',producto:'Vehículo Liviano',estado:'Vigente',vigenciaInicio:'2026-07-11',vigenciaFin:'2027-07-11',frecuencia:'Mensual',formaPago:'Transferencia',conducto:'Cobro directo del intermediario',cuotas:12,primaNeta:1200,gastosEmision:60,otros:0,recargoFinPct:5 };
const created=E.createPolicy(base,{motivo:'Alta de prueba'});
ok(created.ok,'Debe crear póliza válida'); ok(data.polizas.length===1,'Debe insertar una póliza'); ok(data.cobros.length===12,'Debe generar 12 recibos');
ok(data.cobros.every((c,i)=>c.id===`cob_${created.policy.id}_${String(i+1).padStart(3,'0')}`),'IDs de recibo deterministas');
ok(Math.abs(data.cobros.reduce((s,c)=>s+c.monto,0)-created.policy.primaTotal)<0.02,'Recibos deben cuadrar con prima total');
const duplicate=E.createPolicy(base,{motivo:'Duplicado'}); ok(!duplicate.ok&&duplicate.errors.some(x=>String(x).startsWith('poliza_duplicada')),'Debe bloquear llave canónica duplicada');
const first=data.cobros[0], paid=E.applyPayment(first.id,{fecha:'2026-07-11',metodo:'Transferencia bancaria'},{motivo:'Confirmado'});
ok(paid.ok&&data.cobros[0].estado==='Pagado','Debe aplicar pago'); ok(data.cobros[0].conciliado===false,'Pago no debe quedar conciliado automáticamente'); ok(data.finmovs.length===0,'Recaudo no debe crear finmovs');
const blocked=E.updatePolicy(created.policy.id,{primaNeta:1300},{motivo:'Cambio de prima'}); ok(!blocked.ok&&blocked.errors.includes('pagos_existentes_requieren_endoso'),'Debe bloquear cambio financiero con pagos existentes');
const cancelled=E.updatePolicy(created.policy.id,{estado:'Cancelada'},{motivo:'Cancelación confirmada'}); ok(cancelled.ok,'Debe permitir pasar a histórico'); ok(data.cobros.filter(c=>c.estado==='Pagado').length===1,'Debe preservar recibo pagado'); ok(data.cobros.filter(c=>c.estado==='Anulado').length===11,'Debe anular sin borrar recibos no pagados'); ok(data.clientes[0].estadoOperativo==='reactivable','Cliente debe quedar reactivable');
const historical=E.createPolicy({...base,numero:'P-HIST',estado:'Vencida',frecuencia:'Contado',cuotas:1},{motivo:'Histórico'}); ok(historical.ok,'Debe aceptar póliza histórica válida'); ok(data.cobros.filter(c=>c.polizaId===historical.policy.id).length===0,'Histórica no debe generar cartera');
const proposal=E.createReconciliationProposal(first.id,{fuente:'estado_cuenta_bancario',archivo:'estado.xlsx'}); ok(proposal.ok,'Debe crear propuesta de conciliación'); ok(data.cobros[0].conciliado===false,'Propuesta no debe conciliar el cobro'); ok(proposal.proposal.bloqueos.includes('documento_soporte_requerido'),'Sin documentRef debe quedar bloqueada');
role='Asesor';advisor='a2';const denied=E.createPolicy({...base,numero:'P-ASESOR',clienteId:'c1',asesorId:'a2'},{motivo:'No permitido'});ok(!denied.ok&&denied.errors.includes('permiso_poliza_denegado'),'Asesor no debe modificar pólizas');
if(failures.length){console.error('POLICY RECEIPTS V1199: BLOQUEADO');failures.forEach(x=>console.error('- '+x));process.exit(1);}
console.log('POLICY RECEIPTS V1199: OK');
console.log('- llave canónica e idempotencia'); console.log('- prima separada y recibos deterministas'); console.log('- pagos preservados; sin finmovs'); console.log('- histórico anula cartera sin borrar'); console.log('- conciliación como propuesta'); console.log('- permiso Asesor bloqueado');
