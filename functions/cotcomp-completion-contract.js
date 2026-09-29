'use strict';

const VERSION = 'ays-cotcomp-completion-contract-s410-v0.1';

const PHASES = Object.freeze({
  JOURNEY: 'JOURNEY_COMPLETION',
  HANDOFF: 'HANDOFF_CONTACT'
});

const FIELDS = Object.freeze({
  GT_AUTO_MOTO_HYBRID: Object.freeze([
    { id:'brand', label:'Marca', control:'text', phase:PHASES.JOURNEY, required:true },
    { id:'lineModel', label:'Línea / modelo', control:'text', phase:PHASES.JOURNEY, required:true },
    { id:'contact.name', label:'Nombre', control:'text', phase:PHASES.HANDOFF, required:true },
    { id:'contact.whatsapp', label:'WhatsApp', control:'tel', phase:PHASES.HANDOFF, required:true },
    { id:'contact.email', label:'Correo electrónico', control:'email', phase:PHASES.HANDOFF, required:true },
    { id:'consents.requestManagement', label:'Autorizo gestionar esta solicitud y contactarme', control:'checkbox', phase:PHASES.HANDOFF, required:true }
  ]),
  GT_GASTOS_MEDICOS_HYBRID: Object.freeze([
    { id:'titularDob', label:'Fecha de nacimiento del titular', control:'date', phase:PHASES.JOURNEY, required:true },
    { id:'spouseDob', label:'Fecha de nacimiento del cónyuge', control:'date', phase:PHASES.JOURNEY, requiredWhen:{field:'spouseIncluded',equals:true} },
    { id:'dependentDobs', label:'Fechas de nacimiento de dependientes', control:'date-list', phase:PHASES.JOURNEY, requiredWhen:{field:'childrenCount',greaterThan:0} },
    { id:'contact.name', label:'Nombre', control:'text', phase:PHASES.HANDOFF, required:true },
    { id:'contact.whatsapp', label:'WhatsApp', control:'tel', phase:PHASES.HANDOFF, required:true },
    { id:'contact.email', label:'Correo electrónico', control:'email', phase:PHASES.HANDOFF, required:true },
    { id:'consents.requestManagement', label:'Autorizo gestionar esta solicitud y contactarme', control:'checkbox', phase:PHASES.HANDOFF, required:true }
  ]),
  CO_TRANSPORTE_CONSULTATIVE_HYBRID: Object.freeze([
    { id:'coverageModeNeed', label:'¿Es un despacho específico o un programa anual?', control:'select', phase:PHASES.JOURNEY, required:true, options:['SPECIFIC_SHIPMENT','ANNUAL_PROGRAM','NEED_GUIDANCE'] },
    { id:'transportModes', label:'Medios de transporte', control:'multi-select', phase:PHASES.JOURNEY, required:true, options:['ROAD','AIR','MARITIME','FLUVIAL','RAIL','MULTIMODAL','OTHER','NEED_GUIDANCE'] },
    { id:'origin', label:'Origen', control:'text', phase:PHASES.JOURNEY, requiredWhen:{field:'coverageModeNeed',equals:'SPECIFIC_SHIPMENT'} },
    { id:'destination', label:'Destino', control:'text', phase:PHASES.JOURNEY, requiredWhen:{field:'coverageModeNeed',equals:'SPECIFIC_SHIPMENT'} },
    { id:'valueToProtect', label:'Valor a proteger', control:'money', phase:PHASES.JOURNEY, requiredWhen:{field:'coverageModeNeed',equals:'SPECIFIC_SHIPMENT'} },
    { id:'maxValuePerShipment', label:'Valor máximo por despacho', control:'money', phase:PHASES.JOURNEY, requiredWhen:{field:'coverageModeNeed',equals:'ANNUAL_PROGRAM'} },
    { id:'annualMovementBudget', label:'Movimiento anual estimado', control:'money', phase:PHASES.JOURNEY, requiredWhen:{field:'coverageModeNeed',equals:'ANNUAL_PROGRAM'} },
    { id:'contact.name', label:'Nombre', control:'text', phase:PHASES.HANDOFF, required:true },
    { id:'contact.whatsapp', label:'WhatsApp', control:'tel', phase:PHASES.HANDOFF, required:true },
    { id:'contact.email', label:'Correo electrónico', control:'email', phase:PHASES.HANDOFF, required:true },
    { id:'consents.requestManagement', label:'Autorizo gestionar esta solicitud y contactarme', control:'checkbox', phase:PHASES.HANDOFF, required:true }
  ]),
  CO_RC_PROFESIONAL_CONSULTATIVE_HYBRID: Object.freeze([
    { id:'needTrigger', label:'¿Qué origina la necesidad?', control:'select', phase:PHASES.JOURNEY, required:true, options:['CONTRACT_REQUIREMENT','PROFESSIONAL_ACTIVITY','LIABILITY_EXPOSURE','RENEWAL_REVIEW','NEED_GUIDANCE'] },
    { id:'applicantType', label:'Tipo de solicitante', control:'select', phase:PHASES.JOURNEY, required:true, options:['NATURAL_PERSON','LEGAL_ENTITY'] },
    { id:'professionalActivity', label:'Actividad profesional', control:'text', phase:PHASES.JOURNEY, required:true },
    { id:'businessName', label:'Razón social', control:'text', phase:PHASES.JOURNEY, requiredWhen:{field:'applicantType',equals:'LEGAL_ENTITY'} },
    { id:'contact.name', label:'Nombre', control:'text', phase:PHASES.HANDOFF, required:true },
    { id:'contact.whatsapp', label:'WhatsApp', control:'tel', phase:PHASES.HANDOFF, required:true },
    { id:'contact.email', label:'Correo electrónico', control:'email', phase:PHASES.HANDOFF, required:true },
    { id:'consents.requestManagement', label:'Autorizo gestionar esta solicitud y contactarme', control:'checkbox', phase:PHASES.HANDOFF, required:true }
  ])
});

function applies(field, data = {}) {
  if (field.required) return true;
  const c = field.requiredWhen;
  if (!c) return false;
  const value = data[c.field];
  if (Object.prototype.hasOwnProperty.call(c,'equals')) return value === c.equals;
  if (Object.prototype.hasOwnProperty.call(c,'greaterThan')) return Number(value) > c.greaterThan;
  return false;
}

function fieldsFor(journeyId, data = {}, phase = null) {
  const fields = FIELDS[journeyId] || [];
  return fields.filter(field => (!phase || field.phase === phase) && applies(field,data));
}

module.exports = Object.freeze({
  VERSION,
  PHASES,
  FIELDS,
  fieldsFor
});
