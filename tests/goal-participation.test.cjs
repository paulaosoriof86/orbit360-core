'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {estadoParticipacion,validarCambioParticipacion}=require('../functions/goal-participation-contract');
const root=path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
let assertions=0;
function same(actual,expected,label){assert.deepEqual(actual,expected,label);assertions++;}
function yes(value,label){assert.ok(value,label);assertions++;}
function fails(fn,code){assert.throws(fn,error=>error?.code===code,code);assertions++;}
same(estadoParticipacion({}).pendienteClasificacion,true,'Sin clasificación inicial');
same(estadoParticipacion({nombre:'Johanna'}).participaMetas,false,'Los nombres no clasifican');
same(estadoParticipacion({tipoVinculacion:'interno'}).participaMetas,true,'Interno participa');
same(estadoParticipacion({tipoVinculacion:'freelance'}).participaMetas,false,'Freelance excluido por defecto');
same(estadoParticipacion({tipoVinculacion:'freelance',participaMetas:true}).participaMetas,true,'Freelance habilitado explícitamente');
same(estadoParticipacion({tipoVinculacion:'sin_clasificar',participaMetas:true}).participaMetas,false,'Pendiente siempre excluido');
same(estadoParticipacion({tipoVinculacion:'externo'}).pendienteClasificacion,true,'Tipo legado desconocido queda pendiente');
same(validarCambioParticipacion({}, {nombre:'Cambio de contacto'},'Asesor'),null,'Guardar datos no reconfigura participación');
same(validarCambioParticipacion({tipoVinculacion:'sin_clasificar'},{tipoVinculacion:'freelance',participaMetas:false},'Dirección').after.participaMetas,false,'Clasificar freelance no lo habilita');
same(validarCambioParticipacion({tipoVinculacion:'freelance',participaMetas:false},{participaMetas:true},'Dirección').after.participaMetas,true,'Dirección habilita freelance');
same(validarCambioParticipacion({tipoVinculacion:'freelance',participaMetas:true},{tipoVinculacion:'interno',participaMetas:false},'Dirección').after.participaMetas,true,'Interno siempre participa');
same(validarCambioParticipacion({tipoVinculacion:'interno',participaMetas:false},{tipoVinculacion:'interno',participaMetas:false},'Dirección'),null,'Repetir un dato igual no genera falso evento');
fails(()=>validarCambioParticipacion({}, {tipoVinculacion:'interno'},'Admin'),'DIRECCION_REQUERIDA');
fails(()=>validarCambioParticipacion({}, {participaMetas:true},'SuperAdmin'),'DIRECCION_REQUERIDA');
fails(()=>validarCambioParticipacion({}, {tipoVinculacion:'otro'},'Dirección'),'VINCULACION_INVALIDA');
fails(()=>validarCambioParticipacion({}, {participaMetas:'true'},'Dirección'),'HABILITACION_INVALIDA');
fails(()=>validarCambioParticipacion({}, {tipoVinculacion:'interno',participaMetas:true},'Dirección'),'HABILITACION_SOLO_FREELANCE');
fails(()=>validarCambioParticipacion({tipoVinculacion:'freelance',participaMetas:true},{tipoVinculacion:'sin_clasificar'},'Dirección'),'HABILITACION_SOLO_FREELANCE');
const server=source('functions/product-operational-domain.js');
const roster=source('functions/assignable-advisor-roster.js');
const ui=source('orbit360-platform/modules/equipo.js');
const dashboard=source('orbit360-platform/modules/inicio.js');
const insights=source('orbit360-platform/modules/insights.js');
const finanzas=source('orbit360-platform/modules/finanzas.js');
yes(server.includes('validarCambioParticipacion(before,mutation.payload,actor.activeRole)'),'El servidor valida rol activo y valores');
yes(server.includes("accion:'editar_participacion_metas'"),'Auditoría de servidor');
yes(roster.includes('...estadoParticipacion(r)'),'El roster nunca infiere por nombres');
yes(ui.includes('id="eu-vinculacion"')&&ui.includes('id="eu-participa-metas"'),'Controles visibles en ficha');
yes(ui.includes('puedeConfigurarParticipacion()&&!isMetaPreview()'),'Control editable solo Dirección fuera de Preview');
yes(ui.includes("tipoVinculacion=data")===false,'Las clasificaciones no se infieren del perfil');
yes(dashboard.includes('institucionClasificada')&&dashboard.includes('participacionInstitucional'),'Porcentaje institucional a partir de elegibles');
yes(insights.includes('Clasificación o meta por validar')&&insights.includes('eligibleIds'),'Insights no inventa metas ni participantes');
yes(finanzas.includes('Clasificación o lectura pendientes')&&finanzas.includes('eligibleIds'),'Finanzas filtra participación y evita porcentajes ficticios');
process.stdout.write('PASS: '+assertions+' comprobaciones de clasificación, permisos, auditoría y metas.\n');

