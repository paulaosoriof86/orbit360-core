'use strict';
// Explicit commercial participation; never infer classification from names or roles.
const TYPES=new Set(['sin_clasificar','interno','freelance']);
const has=(r,k)=>Object.prototype.hasOwnProperty.call(r||{},k);
function tipoVinculacion(row){
  const value=String(row?.tipoVinculacion||'sin_clasificar').trim().toLowerCase();
  return TYPES.has(value)?value:'sin_clasificar';
}
function estadoParticipacion(row){
  const tipo=tipoVinculacion(row);
  return Object.freeze({
    tipoVinculacion:tipo,
    participaMetas:tipo==='interno'||(tipo==='freelance'&&row?.participaMetas===true),
    pendienteClasificacion:tipo==='sin_clasificar',
    freelanceHabilitado:tipo==='freelance'&&row?.participaMetas===true
  });
}
class ParticipacionInvalida extends Error {
  constructor(code){super(code);this.code=code;}
}
function validarCambioParticipacion(before,payload,activeRole){
  if(!has(payload,'tipoVinculacion')&&!has(payload,'participaMetas'))return null;
  if(String(activeRole||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()!=='direccion')
    throw new ParticipacionInvalida('DIRECCION_REQUERIDA');
  if(has(payload,'tipoVinculacion')&&!TYPES.has(payload.tipoVinculacion))
    throw new ParticipacionInvalida('VINCULACION_INVALIDA');
  if(has(payload,'participaMetas')&&typeof payload.participaMetas!=='boolean')
    throw new ParticipacionInvalida('HABILITACION_INVALIDA');
  const next={...(before||{}),...(payload||{})},tipo=tipoVinculacion(next);
  if(tipo!=='freelance'&&next.participaMetas===true)
    throw new ParticipacionInvalida('HABILITACION_SOLO_FREELANCE');
  const previous=estadoParticipacion(before),after=estadoParticipacion(next);
  // Editing contact data cannot manufacture a second classification event.
  if(before&&previous.tipoVinculacion===after.tipoVinculacion&&
    previous.participaMetas===after.participaMetas)return null;
  return Object.freeze({before:previous,after});
}
module.exports=Object.freeze({TYPES,tipoVinculacion,estadoParticipacion,validarCambioParticipacion,ParticipacionInvalida});

