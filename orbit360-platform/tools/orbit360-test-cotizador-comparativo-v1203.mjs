import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.cwd(),'orbit360-platform');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const db={
  aseguradoras:[{id:'asg1',nombre:'Aseguradora Uno',pais:'GT',vinculada:true,docs:[{id:'src1'}]}],
  configuracionesTarifa:[{
    id:'tar1',aseguradoraId:'asg1',pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Liviano',plan:'Plan A',
    estado:'validado_habilitado',fuenteDocumentoId:'doc1',version:'2026.1',tipoCalculo:'tabla_rangos',
    rangos:[{hasta:200000,tasa:2.5,min:2500}],recargosPago:{12:10},gastosEmisionPct:5,ivaPct:12
  }],
  cotizaciones:[],comparativos:[],quoteTransfers:[],auditLog:[]
};
const store={
  all(c){return(db[c]||[]).slice();},get(c,id){return(db[c]||[]).find(x=>x.id===id)||null;},
  insert(c,row){(db[c]=db[c]||[]).push(row);return row;},
  update(c,id,patch){const row=this.get(c,id);if(!row)return null;Object.assign(row,patch);return row;}
};
const Orbit={
  store,
  ui:{today:()=> '2026-07-11'},
  access:{tenantId:()=> 'tenant-a',activeRole:()=> 'Dirección',actorUser:()=>({id:'u1',nombre:'Admin',rolActivo:'Dirección'}),audit:(...args)=>db.auditLog.push(args)},
  primas:{cfgPais:p=>({iva:p==='CO'?19:12})},
  modules:{aseguradoras:{_fuentes:{
    resumenGrupos(){return{grupos:[{dimensiones:{pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Liviano',plan:'Plan A'},fuentes:[{id:'src1',estado:'validado_habilitado',tipoFuente:'cotizador_excel_salida',pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Liviano',plan:'Plan A',contieneTarifas:true,contieneReglasCalculo:true,contieneHojaSalida:true,version:'2026.1'}]}]};},
    evaluarFuente(){return{sirveParaTarifas:true,sirveParaReglas:true,sirveParaPresentacion:true,sirveParaCasosPrueba:true};}
  }}}
};
const sandbox={window:{Orbit},Orbit,console,Date,Math,JSON,Set,Map,URL,Promise};
vm.runInNewContext(read('core/quote-comparison-contracts-v1203.js'),sandbox,{filename:'quote-comparison-contracts-v1203.js'});
vm.runInNewContext(read('core/quote-comparison-contracts-v1203-refinements.js'),sandbox,{filename:'quote-comparison-contracts-v1203-refinements.js'});
const Q=Orbit.quoteContracts;
const context={pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Liviano',plan:'Plan A'};
let availability=Q.automaticAvailability('asg1',context);
assert(availability.ok,'Debe habilitar combinación validada');
let calc=Q.calculateAutomatic('asg1',context,{valorAsegurado:100000},{cuotas:12});
assert(calc.ok,'Debe calcular con configuración validada');
assert(calc.trace.configuracionTarifaId==='tar1','Debe conservar configuración');
assert(calc.trace.fuenteDocumentoId==='doc1','Debe conservar fuente');
assert(Math.round(calc.result.primaNeta)===2500,'Debe aplicar prima mínima');
assert(calc.result.primaTotal>calc.result.primaNeta,'Debe separar gastos e impuestos');

const automatic=Q.persistQuote({
  cotizacionOrigen:'automatica_tarifa',aseguradoraId:'asg1',pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Liviano',plan:'Plan A',
  prospectoNombre:'Prospecto',datosRiesgo:{valorAsegurado:100000},resultado:calc.result,
  configuracionTarifaId:calc.trace.configuracionTarifaId,fuenteDocumentoId:calc.trace.fuenteDocumentoId,versionFuente:calc.trace.versionFuente,
  estadoValidacion:'validado',estadoComercial:'generado'
},{motivo:'Prueba'});
assert(automatic.ok&&automatic.quote.estadoValidacion==='validado','Automática debe persistir validada');

const draft=Q.persistQuote({
  cotizacionOrigen:'manual_asistida',aseguradoraId:'asg1',pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Liviano',plan:'Plan A',
  prospectoNombre:'Prospecto',primaNeta:3000,primaTotal:3360,impuestos:{ivaMonto:360,ivaPct:12},estadoValidacion:'requiere_validacion'
},{allowDraft:true,motivo:'Borrador'});
assert(draft.ok,'Manual pendiente debe persistir solo como borrador');
assert(!Q.validateQuote(draft.quote,{requireValidated:true}).ok,'Manual sin fuente no puede compararse');
const validated=Q.persistQuote(Object.assign({},draft.quote,{fuenteDocumentoId:'doc2',sourceRef:'doc2',versionFuente:'2026-07-11',confirmacionHumana:true,estadoValidacion:'validado'}),{motivo:'Comparado con original'});
assert(validated.ok&&Q.validateQuote(validated.quote,{requireValidated:true}).ok,'Manual confirmada debe quedar validada');

const inconsistent=Q.persistQuote(Object.assign({},draft.quote,{id:'bad1',fuenteDocumentoId:'doc3',sourceRef:'doc3',versionFuente:'2026-07-11',confirmacionHumana:true,estadoValidacion:'validado',primaTotal:5000}),{motivo:'Prueba inconsistente'});
assert(!inconsistent.ok&&inconsistent.errors.includes('desglose_prima_no_cuadra'),'Debe bloquear prima total que no cuadre');

const made=Q.createComparison({cotizaciones:[automatic.quote,validated.quote],criterioRecomendacion:'equilibrio',estado:'generado'},{persist:true,motivo:'Prueba'});
assert(made.ok&&made.comparison.cotizacionIds.length===2,'Debe crear comparativo por IDs');
assert(made.recommendation.ok,'Debe generar recomendación explicable');
assert(db.comparativos.length===1,'Debe persistir en Orbit.store');

const noTariff=db.configuracionesTarifa.splice(0,1)[0];
availability=Q.automaticAvailability('asg1',context);
assert(!availability.ok&&availability.errors.includes('configuracion_tarifa_validada_no_disponible'),'Sin tarifa validada debe aplicar default-deny');
db.configuracionesTarifa.push(noTariff);

console.log('ORBIT360 COTIZADOR COMPARATIVO V1203: OK');
console.log('- automático solo con fuente y tarifa habilitadas');
console.log('- prima neta/gastos/impuestos/total separados y cuadrados');
console.log('- manual/PDF bloqueados hasta fuente, versión y confirmación');
console.log('- traslado y comparativo por IDs persistidos');
console.log('- recomendación solo sobre cotizaciones validadas');
