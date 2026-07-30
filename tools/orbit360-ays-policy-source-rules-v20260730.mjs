export const AYS_POLICY_SOURCE_RULES_VERSION = '2026-07-30';
export const AYS_COP_LARGE_AMOUNT_THRESHOLD = 1_000_000;

function text(v){ return String(v == null ? '' : v).trim(); }
function norm(v){
  return text(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function amount(v){
  if (typeof v === 'number' && Number.isFinite(v)) return Math.abs(v);
  const raw=text(v).replace(/[^0-9,.-]/g,'');
  if(!raw) return 0;
  let s=raw;
  if(s.includes(',') && s.includes('.')) s=s.lastIndexOf('.')>s.lastIndexOf(',')?s.replace(/,/g,''):s.replace(/\./g,'').replace(',','.');
  else if(s.includes(',')) s=/,\d{2}$/.test(s)?s.replace(',','.'):s.replace(/,/g,'');
  const n=Number.parseFloat(s);
  return Number.isFinite(n)?Math.abs(n):0;
}

export function resolveAysPolicyCountryCurrency(input={}){
  const explicit=norm(input.moneda || input.divisa || input.currency);
  const group=norm(input.grupo || input.group || input.pais || input.country);
  const maxAmount=Math.max(amount(input.primaNeta), amount(input.primaTotal), amount(input.monto));
  const out={pais:'',moneda:'',inferred:false,requiresValidation:false,provenance:''};

  if(explicit==='GTQ' || explicit.includes('QUETZAL')){
    return {...out,pais:'GT',moneda:'GTQ',provenance:'explicit_currency'};
  }
  if(explicit==='COP' || explicit.includes('PESO COLOMB')){
    return {...out,pais:'CO',moneda:'COP',provenance:'explicit_currency'};
  }
  if(explicit==='USD' || explicit.includes('DOLAR')){
    const pais=group.includes('COLOMBIA')||group==='CO'?'CO':(group.includes('GUATEMALA')||group==='GT'?'GT':'');
    return {...out,pais,moneda:'USD',provenance:pais?'explicit_currency_plus_country_hint':'explicit_currency',requiresValidation:!pais};
  }

  if(group.includes('COLOMBIA') || group==='CO'){
    return {...out,pais:'CO',moneda:'COP',inferred:true,provenance:'country_hint_without_currency'};
  }
  if(group.includes('GUATEMALA') || group==='GT'){
    return {...out,pais:'GT',moneda:'GTQ',inferred:true,provenance:'country_hint_without_currency'};
  }

  if(maxAmount >= AYS_COP_LARGE_AMOUNT_THRESHOLD){
    return {...out,pais:'CO',moneda:'COP',inferred:true,provenance:'ays_large_amount_rule_20260730'};
  }
  return {...out,pais:'GT',moneda:'GTQ',inferred:true,provenance:'ays_default_gt_rule_20260730'};
}

export function missingClientDecision(input={}){
  if(text(input.clienteId) || input.existingClient === true){
    return {create:false,calidadDatos:'existente',requiresValidation:false};
  }
  const nombre=text(input.nombre || input.asegurado || input.contratante);
  if(!nombre){
    return {create:false,calidadDatos:'requiere_validacion',requiresValidation:true,reason:'nombre_cliente_faltante'};
  }
  return {
    create:true,
    calidadDatos:'pendiente_completar',
    requiresValidation:false,
    record:{
      nombre,
      documento:text(input.documento),
      telefono:text(input.telefono),
      whatsapp:text(input.whatsapp),
      correo:text(input.correo),
      pais:text(input.pais),
      moneda:text(input.moneda),
      asesorId:text(input.asesorId),
      calidad_datos:'pendiente_completar',
      source_ref:text(input.sourceRef),
      origen:'poliza_fuente_ays_20260730'
    }
  };
}
