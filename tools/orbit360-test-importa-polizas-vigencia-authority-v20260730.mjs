#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

global.window=global;
global.Orbit={ui:{today:()=> '2026-07-30'}};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-polizas-p0.js','utf8'),{filename:'importa-polizas-p0.js'});

const base={aseguradoraNombre:'Demo',clienteNombre:'Cliente',vigenciaIni:'2026-01-01',vigenciaFin:'2026-12-31',pais:'GT',moneda:'GTQ',primaNeta:1000,formaPago:'Mensual'};

const activeVencida=Orbit.importaPolizasP0.normalizePolicy({...base,numero:'POL-ACTIVA-001',estadoFuenteOriginal:'Vencida'},{today:'2026-07-30'});
assert.equal(activeVencida.estadoOperativoOrbit,'vigente_operativa');
assert.equal(activeVencida.estado,'Vigente');
assert.equal(activeVencida.estadoFuenteOriginal,'Vencida');
assert.equal(activeVencida.estadoFuenteContradiceVigencia,true);
assert.equal(activeVencida.estadoCartera,'genera_recibos_esperados');
assert.equal(activeVencida.requiereValidacion,false);

const expiredVencida=Orbit.importaPolizasP0.normalizePolicy({...base,numero:'POL-HIST-001',vigenciaIni:'2025-01-01',vigenciaFin:'2025-12-31',estadoFuenteOriginal:'Vencida'},{today:'2026-07-30'});
assert.equal(expiredVencida.estadoOperativoOrbit,'historica_vencida');
assert.equal(expiredVencida.estadoCartera,'recibo_analitico_no_cartera_viva');
assert.equal(expiredVencida.estadoFuenteContradiceVigencia,false);

for(const sourceStatus of ['Terminada','Reexpedida']){
  const row=Orbit.importaPolizasP0.normalizePolicy({...base,numero:`POL-${sourceStatus.toUpperCase()}`,estadoFuenteOriginal:sourceStatus},{today:'2026-07-30'});
  assert.equal(row.estadoOperativoOrbit,'historica_estado_no_activo');
  assert.equal(row.estadoCartera,'no_exigible');
  assert.equal(row.estadoFuenteContradiceVigencia,false);
}

console.log(JSON.stringify({status:'PASS',vigenciaAuthorityForVencida:true,sourceStatusPreserved:true,activeVencidaBecomesVigente:true,expiredVencidaStaysHistorical:true,terminatedAndReissuedRemainHistorical:true,firestoreWrites:0,operationalWrites:0},null,2));
