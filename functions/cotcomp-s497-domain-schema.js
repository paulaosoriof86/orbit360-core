'use strict';

/*
 * CotComp S4.97 domain schema.
 * Source basis: recovered S4.10/S4.18 public adapter + PREIMPL public contracts.
 * This module carries public intake/comparison truth only. It does NOT calculate premiums,
 * call insurer raters, write to Gravicentra, or authorize real transport.
 */

const YEARS=Object.freeze(Array.from({length:32},(_,i)=>String(2026-i)));

const PRIORITIES=Object.freeze({
  auto:['Balance costo/protección','Menor deducible','Mayor alcance de cobertura','Mejor asistencia','Responsabilidad civil'],
  salud:['Red / acceso','Deducible o copago','Cobertura internacional','Maternidad / carencias','Exclusiones / preexistencias'],
  hogar:['Estructura y contenido','Responsabilidad civil familiar','Eventos naturales','Robo / hurto','Alojamiento temporal'],
  vida:['Continuidad económica','Protección de dependientes','Invalidez / enfermedades graves','Plazo / suma asegurada'],
  empresa:['Patrimonio','Personas / beneficios','Responsabilidad civil','Flotillas / movilidad','Continuidad','Contratos / obligaciones'],
  transporte:['Carga y mercancía','Responsabilidad civil','Flota','Patios / maniobras','Almacenamiento','Continuidad'],
  contrato:['Amparos / alcance','Requisitos / contragarantías','Vigencia','Costo total'],
  revision:['Cobertura','Costo','Deducible','Servicio','Renovación / cambios']
});

const field=(id,label,type,options,def,help,when)=>Object.freeze({
  id,label,type,options:Object.freeze(options||[]),default:def==null?'':def,help:help||'',when:when||null
});

function auto(country){
  const gt=country==='gt';
  return {
    id:'auto',
    family:'vehicle',
    title:'Vehículo / Movilidad',
    eligibility:gt?'HYBRID_REQUIRED':'CONSULTATIVE_REQUIRED',
    groups:[
      {title:'Vehículo y uso',kicker:'RIESGO',fields:[
        field('tipoVehiculo','Tipo de vehículo','select',gt?['Automóvil','Motocicleta','Camioneta agrícola','Microbús hasta 9 pasajeros','Panel / camión liviano','Bus','Camión pesado','Cabezal','Transporte por plataforma']:['Automóvil','Camioneta / SUV','Motocicleta','Vehículo comercial','Otro / requiere revisión'],'Automóvil','La disponibilidad se resuelve contra producto/fuente habilitada.'),
        field('usoVehiculo','Uso','select',gt?['Particular','Comercial','Transporte por plataforma']:['Particular','Comercial','Plataforma / aplicación','Otro / requiere revisión'],'Particular','La fuente puede restringir usos.'),
        field('marca','Marca','text',[],gt?'Toyota':'Renault','Nos ayuda a identificar correctamente el vehículo.'),
        field('lineaModelo','Línea / modelo','text',[],gt?'Corolla':'Duster','Completa la referencia del vehículo para continuar.'),
        field('anioModelo','Año','select',YEARS,'2024','La antigüedad puede cambiar las opciones disponibles.'),
        field('valorAsegurado','Valor aproximado','number',[],gt?'185000':'95000000','Referencia del riesgo; la propuesta final depende de la alternativa validada.')
      ]},
      {title:'Condiciones que cambian la tarifa o la ruta',kicker:'APLICABILIDAD',fields:[
        field('conductorJoven','Conductor joven / recargo potencial','select',['No','Sí','No aplica'],'No','Algunas fuentes manejan recargo o condición por conductor joven.'),
        field('equipoEspecial','Equipo especial','select',['No','Sí / requiere declarar'],'No','Puede requerir suma o validación adicional según producto.'),
        field('coberturaObjetivo','Enfoque de cobertura','select',['Cobertura amplia','Daños a terceros / RC','Robo','Revisar opciones disponibles'],'Cobertura amplia','La ruta final depende de los productos habilitados.'),
        field('formaPago','Preferencia de pago','select',['Contado','Cuotas / fraccionamiento','Revisar opciones'],'Contado','La fuente define recargos, cuotas y mecanismos permitidos.')
      ]},
      {title:'Qué pesa más en tu decisión',kicker:'PRIORIDAD',fields:[
        field('prioridad','Prioridad principal','select',PRIORITIES.auto,'Balance costo/protección','Organiza la explicación del comparador; no crea un ranking universal.')
      ]}
    ]
  };
}

function salud(country){
  const gt=country==='gt';
  return {
    id:'salud',family:'health',title:'Salud / Gastos médicos',
    eligibility:gt?'HYBRID_REQUIRED':'CONSULTATIVE_REQUIRED',
    groups:[
      {title:'Composición',kicker:'ASEGURADOS',fields:[
        field('modalidad','Modalidad','select',['Individual','Familiar'],'Familiar','La composición puede cambiar plan y tarifa.'),
        field('titularDob','Fecha de nacimiento del titular','date',[],'1988-05-12','La fecha exacta evita aproximaciones al validar la solicitud.'),
        field('generoTitular','Género tarifario titular','select',['Femenino','Masculino'],'Femenino','Se conserva cuando la fuente final lo requiere.'),
        field('conyuge','¿Incluye cónyuge?','select',['No','Sí'],'Sí','Activa datos adicionales cuando corresponda.'),
        field('spouseDob','Fecha de nacimiento del cónyuge','date',[],'1986-09-21','Completar solo si incluyes cónyuge.'),
        field('hijos','Cantidad de hijos','number',[],'1','La composición modifica plan/tarifa en fuentes auditadas.')
      ]},
      {title:'Opciones del plan',kicker:'COBERTURAS',fields:[
        field('maternidad','Maternidad','select',['No','Sí / revisar aplicabilidad'],'No','La disponibilidad depende del plan/fuente.'),
        field('dental','Dental','select',['No','Sí'],'No','Puede ser cargo individual o familiar según fuente.'),
        field('territorio','Territorio','select',gt?['Guatemala','Guatemala + internacional','Revisar territorio']:['Colombia','Colombia + internacional','Revisar territorio'],gt?'Guatemala':'Colombia','El producto/fuente final define red y territorio.'),
        field('prioridad','Prioridad principal','select',PRIORITIES.salud,'Red / acceso','En Colombia esta ruta representa seguro privado; no sustituye EPS.')
      ]}
    ]
  };
}

function hogar(country){
  return {id:'hogar',family:'home',title:'Hogar',eligibility:'HYBRID_REQUIRED',groups:[
    {title:'Vivienda',kicker:'RIESGO',fields:[
      field('tipoInmueble','Tipo de inmueble','select',['Casa','Apartamento','Otro / revisar'],'Casa',''),
      field('usoInmueble','Uso','select',['Vivienda propia','Arrendada','Segunda vivienda','Otro / revisar'],'Vivienda propia',''),
      field('valorEstructura','Valor aproximado de estructura','number',[],country==='gt'?'850000':'420000000',''),
      field('valorContenido','Valor aproximado de contenido','number',[],country==='gt'?'150000':'65000000','')
    ]},
    {title:'Prioridad',kicker:'DECISIÓN',fields:[
      field('prioridad','Prioridad principal','select',PRIORITIES.hogar,'Estructura y contenido','')
    ]}
  ]};
}

function vida(country){
  return {id:'vida',family:'life',title:'Vida / Ingreso',eligibility:'CONSULTATIVE_REQUIRED',groups:[
    {title:'Contexto',kicker:'NECESIDAD',fields:[
      field('momentoVida','Momento de vida','select',['Empiezo mi camino','Familia en crecimiento','Patrimonio consolidado','Trabajo por mi cuenta'],'Familia en crecimiento',''),
      field('dependientes','Personas que dependen de ti','number',[],'2',''),
      field('ingreso','Ingreso mensual a proteger','number',[],country==='gt'?'18000':'8000000',''),
      field('horizonte','Horizonte que quieres revisar','select',['1–5 años','6–10 años','Más de 10 años','No estoy seguro'],'6–10 años','')
    ]},
    {title:'Prioridad',kicker:'DECISIÓN',fields:[
      field('prioridad','Prioridad principal','select',PRIORITIES.vida,'Continuidad económica','')
    ]}
  ]};
}

function empresa(country){
  return {id:'empresa',family:'business',title:'Empresa',eligibility:'CONSULTATIVE_REQUIRED',groups:[
    {title:'Operación',kicker:'EMPRESA',fields:[
      field('sector','Sector / actividad','select',['Servicios','Comercio','Industria / manufactura','Logística / transporte','Construcción / proyectos','Profesional / oficina','Otro / revisar'],'Servicios',''),
      field('tamano','Tamaño','select',['Microempresa','Pequeña empresa','Mediana empresa','Corporativo'],'Pequeña empresa',''),
      field('empleados','Personas / colaboradores','number',[],'12','')
    ]},
    {title:'Exposición',kicker:'PRIORIDAD',fields:[
      field('exposicion','Exposición principal','select',PRIORITIES.empresa,'Continuidad',''),
      field('valorActivos','Valor aproximado de activos','number',[],country==='gt'?'1200000':'650000000','')
    ]}
  ]};
}

function transporte(country){
  const groups=[
    {title:'Rol y operación',kicker:'CADENA',fields:[
      field('rolCadena','Rol en la cadena','select',['Transportador','Generador / propietario de carga','Operador logístico','Almacenamiento','Importador / exportador'],'Transportador',''),
      field('unidades','Unidades / vehículos','number',[],'12',''),
      field('carga','Tipo de carga','select',['Mercancía general','Alimentos / perecederos','Maquinaria / equipo','Carga de alto valor','Otra / revisar'],'Mercancía general',''),
      field('trayecto','Alcance del trayecto','select',country==='gt'?['Guatemala','Centroamérica','Mixto / revisar']:['Colombia','Regional / internacional','Mixto / revisar'],country==='gt'?'Guatemala':'Colombia','')
    ]}
  ];
  if(country==='co'){
    groups.push(
      {title:'Cómo quieres proteger la operación',kicker:'MODALIDAD',fields:[
        field('coverageModeNeed','Tipo de necesidad','select',['SPECIFIC_SHIPMENT','ANNUAL_PROGRAM','NEED_GUIDANCE'],'SPECIFIC_SHIPMENT','Define si revisamos un despacho puntual o un programa continuo.'),
        field('transportModePrimary','Medio principal de transporte','select',['ROAD','AIR','MARITIME','MULTIMODAL','OTHER','NEED_GUIDANCE'],'ROAD','Puedes ampliar los medios cuando el caso requiera más de uno.')
      ]},
      {title:'Datos de la modalidad',kicker:'DETALLE',fields:[
        field('origin','Origen','text',[],'Bogotá','Punto de inicio del despacho.'),
        field('destination','Destino','text',[],'Medellín','Punto de destino del despacho.'),
        field('valueToProtect','Valor a proteger','number',[],'180000000','Valor estimado del despacho específico.'),
        field('maxValuePerShipment','Valor máximo por despacho','number',[],'180000000','Para un programa anual, indica el máximo estimado por despacho.'),
        field('annualMovementBudget','Movimiento anual estimado','number',[],'1500000000','Para un programa anual, indica el movimiento total aproximado.')
      ]}
    );
  }
  groups.push({title:'Punto crítico',kicker:'EXPOSICIÓN',fields:[
    field('punto','Dónde se concentra la exposición','select',['Origen / cargue','Tránsito','Nodos / transferencias','Almacenamiento','Destino / entrega'],'Tránsito',''),
    field('valorCarga','Valor aproximado por despacho','number',[],country==='gt'?'250000':'180000000',''),
    field('prioridad','Prioridad principal','select',PRIORITIES.transporte,'Carga y mercancía','')
  ]});
  return {id:'transporte',family:'cargo',title:'Transporte / Carga',eligibility:country==='gt'?'HYBRID_REQUIRED':'CONSULTATIVE_REQUIRED',groups};
}

function contrato(country){
  return {id:'contrato',family:'other',title:'Contrato / obligación / proyecto',eligibility:'CONSULTATIVE_REQUIRED',groups:[
    {title:'Obligación',kicker:'CONTRATO',fields:[
      field('tipoContrato','Tipo de obligación','select',['Cumplimiento contractual','Obra / construcción','Suministro','Servicios','Otra / revisar'],'Cumplimiento contractual',''),
      field('monto','Monto de la obligación','number',[],country==='gt'?'500000':'150000000',''),
      field('vigencia','Vigencia estimada','select',['Hasta 6 meses','7–12 meses','13–24 meses','Más de 24 meses'],'7–12 meses','')
    ]},
    {title:'Qué revisar',kicker:'DECISIÓN',fields:[
      field('prioridad','Prioridad principal','select',PRIORITIES.contrato,'Amparos / alcance','')
    ]}
  ]};
}

function revision(country){
  return {id:'revision',family:'other',title:'Revisar póliza existente',eligibility:'HYBRID_REQUIRED',groups:[
    {title:'Póliza actual',kicker:'CONTEXTO',fields:[
      field('ramoActual','Qué quieres revisar','select',country==='gt'?['Auto / movilidad','Gastos Médicos','Vida','Hogar','Empresa / corporativo']:['Autos / automotores','Seguro / póliza de salud','Vida','Hogar / multirriesgo','Empresa / corporativo'],'Auto / movilidad',''),
      field('renovacion','Fecha de renovación','date',[],'2026-12-31',''),
      field('primaActual','Prima aproximada actual','number',[],country==='gt'?'2500':'1350000','')
    ]},
    {title:'Motivo',kicker:'CAMBIO',fields:[
      field('motivo','Qué cambió','select',['Precio / prima','Cobertura','Deducible','Servicio','Datos del riesgo','Quiero comparar alternativas'],'Quiero comparar alternativas',''),
      field('prioridad','Prioridad principal','select',PRIORITIES.revision,'Cobertura','')
    ]}
  ]};
}

function duda(){
  return {id:'duda',family:'other',title:'Otros / No sé cuál necesito',eligibility:'MORE_DATA_REQUIRED',groups:[
    {title:'Empecemos por el cambio',kicker:'ORIENTACIÓN',fields:[
      field('queProtege','Qué quieres proteger','select',['Una persona / familia','Un vehículo / movilidad','Una vivienda','Una empresa / operación','Carga / transporte','Un contrato / proyecto','No sé todavía'],'No sé todavía',''),
      field('queCambio','Qué cambió','select',['Compré / adquirí algo','Mi familia cambió','Mi empresa creció o cambió','Tengo varias pólizas y quiero ordenar','Tengo una obligación o contrato','Solo quiero entender mis opciones'],'Solo quiero entender mis opciones','')
    ]}
  ]};
}

const FAMILY_TO_PRODUCT=Object.freeze({
  vehicle:'auto',home:'hogar',health:'salud',life:'vida',business:'empresa',cargo:'transporte',other:'duda'
});

function schema(country,product){
  country=String(country||'gt').toLowerCase();
  product=String(product||'auto').toLowerCase();
  if(product==='auto') return auto(country);
  if(product==='salud') return salud(country);
  if(product==='hogar') return hogar(country);
  if(product==='vida') return vida(country);
  if(product==='empresa') return empresa(country);
  if(product==='transporte') return transporte(country);
  if(product==='contrato') return contrato(country);
  if(product==='revision') return revision(country);
  return duda(country);
}

const DEMO_QUOTES=Object.freeze({
  'gt:auto':Object.freeze([
    Object.freeze({id:'lab_auto_a',status:'VALIDATED',name:'Alternativa A',total:'Q 2,180',deductible:'20%',assistance:'Básica',coverage:'Cobertura amplia'}),
    Object.freeze({id:'lab_auto_b',status:'VALIDATED',name:'Alternativa B',total:'Q 2,540',deductible:'10%',assistance:'Ampliada',coverage:'Cobertura amplia'})
  ]),
  'gt:salud':Object.freeze([
    Object.freeze({id:'lab_salud_a',status:'VALIDATED',name:'Alternativa A',total:'Según propuesta',deductible:'Según plan',assistance:'Red / servicio según propuesta',coverage:'Plan privado'}),
    Object.freeze({id:'lab_salud_b',status:'REQUIRES_VALIDATION',name:'Alternativa B',total:'Dato pendiente',deductible:'Dato pendiente',assistance:'Dato pendiente',coverage:'En revisión'})
  ])
});

function comparison(country,product){
  const key=String(country||'gt').toLowerCase()+':'+String(product||'auto').toLowerCase();
  const quotes=(DEMO_QUOTES[key]||[]).map(x=>({...x}));
  const validated=quotes.filter(x=>x.status==='VALIDATED');
  return Object.freeze({
    comparable:validated.length>=2,
    quotes:Object.freeze(quotes),
    validated:Object.freeze(validated),
    reason:validated.length>=2?'VALIDATED_OPTIONS_AVAILABLE':'comparativo_requiere_dos_cotizaciones_validadas',
    rankingPolicy:'NONE_BY_DEFAULT',
    noSilentWeighting:true
  });
}

const EXECUTION_CONTRACTS=Object.freeze({
  'gt:auto':Object.freeze({journeyId:'GT_AUTO_MOTO_HYBRID',status:'UX_FIELDS_ALIGNED_SOURCE_ONLY'}),
  'gt:salud':Object.freeze({journeyId:'GT_GASTOS_MEDICOS_HYBRID',status:'UX_FIELDS_ALIGNED_SOURCE_ONLY'}),
  'co:transporte':Object.freeze({journeyId:'CO_TRANSPORTE_CONSULTATIVE_HYBRID',status:'UX_FIELDS_ALIGNED_SOURCE_ONLY'}),
  'co:empresa':Object.freeze({journeyId:'CO_RC_PROFESIONAL_CONSULTATIVE_HYBRID',status:'ROUTE_REQUIRES_EXPLICIT_RC_PROFESIONAL_SELECTION'})
});

function execution(country,product){
  const key=String(country||'gt').toLowerCase()+':'+String(product||'auto').toLowerCase();
  return EXECUTION_CONTRACTS[key]||Object.freeze({journeyId:null,status:'CONSULTATIVE_ONLY_NO_EXECUTABLE_PUBLIC_CONTRACT'});
}

module.exports=Object.freeze({
  YEARS,PRIORITIES,FAMILY_TO_PRODUCT,schema,comparison,execution
});
