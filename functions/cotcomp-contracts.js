'use strict';

const VERSION = 'ays-cotcomp-preimpl03-s01-v1';
const AUTO_READY = false;

const COMMON_FIELDS = Object.freeze({
  'contact.name': Object.freeze({ type: 'string', required: true }),
  'contact.whatsapp': Object.freeze({ type: 'phone', required: true }),
  'contact.email': Object.freeze({ type: 'email', required: true }),
  'consents.requestManagement': Object.freeze({ type: 'boolean', required: true, mustBeTrue: true })
});

const COMMON_ALIAS_RESOLUTION = Object.freeze({
  'consent.contact': 'consents.requestManagement'
});

const JOURNEYS = Object.freeze({
  GT_AUTO_MOTO_HYBRID: Object.freeze({
    country: 'GT',
    mode: 'HYBRID',
    autoReady: false,
    fields: Object.freeze({
      route: Object.freeze({ type: 'enum', required: true, values: Object.freeze(['AUTO', 'MOTO']) }),
      protectionGoal: Object.freeze({
        type: 'enum_by_field',
        required: true,
        discriminator: 'route',
        valuesByDiscriminator: Object.freeze({
          AUTO: Object.freeze(['FULL', 'RC', 'NEED_GUIDANCE']),
          MOTO: Object.freeze(['FULL', 'RC', 'THEFT_ONLY', 'NEED_GUIDANCE'])
        })
      }),
      vehicleType: Object.freeze({ type: 'string_or_catalog', required: true }),
      vehicleUse: Object.freeze({ type: 'string_or_catalog', required: true }),
      brand: Object.freeze({ type: 'string_or_catalog', required: true }),
      lineModel: Object.freeze({ type: 'string_or_catalog', required: true }),
      modelYear: Object.freeze({ type: 'integer', required: true }),
      insuredValue: Object.freeze({
        type: 'money',
        currency: 'GTQ',
        requiredWhen: Object.freeze({ field: 'protectionGoal', in: Object.freeze(['FULL', 'THEFT_ONLY']) })
      }),
      ...COMMON_FIELDS
    })
  }),

  GT_GASTOS_MEDICOS_HYBRID: Object.freeze({
    country: 'GT',
    mode: 'HYBRID',
    autoReady: false,
    fields: Object.freeze({
      coverageGroup: Object.freeze({ type: 'enum', required: true, values: Object.freeze(['INDIVIDUAL', 'FAMILY', 'NEED_GUIDANCE']) }),
      titularDob: Object.freeze({ type: 'date', required: true }),
      spouseIncluded: Object.freeze({ type: 'boolean' }),
      spouseDob: Object.freeze({ type: 'date', requiredWhen: Object.freeze({ field: 'spouseIncluded', equals: true }) }),
      childrenCount: Object.freeze({ type: 'integer', minimum: 0 }),
      dependentDobs: Object.freeze({
        type: 'array_date',
        requiredWhen: Object.freeze({ field: 'childrenCount', greaterThan: 0 }),
        lengthEqualsField: 'childrenCount'
      }),
      maternityPreference: Object.freeze({ type: 'enum', values: Object.freeze(['YES', 'NO', 'NOT_APPLICABLE', 'NEED_GUIDANCE']) }),
      geographyPreference: Object.freeze({ type: 'enum', values: Object.freeze(['CENTRAL_AMERICA', 'WORLDWIDE', 'NEED_GUIDANCE']) }),
      ...COMMON_FIELDS
    })
  }),

  CO_TRANSPORTE_CONSULTATIVE_HYBRID: Object.freeze({
    country: 'CO',
    mode: 'CONSULTATIVE_HYBRID',
    autoReady: false,
    fields: Object.freeze({
      operationRole: Object.freeze({
        type: 'enum',
        required: true,
        values: Object.freeze(['CARGO_GENERATOR', 'TRANSPORTER', 'LOGISTICS_OPERATOR', 'MULTIMODAL_OPERATOR', 'IMPORTER_EXPORTER', 'OTHER', 'NEED_GUIDANCE'])
      }),
      coverageModeNeed: Object.freeze({ type: 'enum', required: true, values: Object.freeze(['SPECIFIC_SHIPMENT', 'ANNUAL_PROGRAM', 'NEED_GUIDANCE']) }),
      cargoTypeGeneral: Object.freeze({ type: 'string_or_future_catalog', required: true }),
      transitScope: Object.freeze({ type: 'enum', required: true, values: Object.freeze(['URBAN', 'NATIONAL', 'IMPORT', 'EXPORT', 'MIXED', 'NEED_GUIDANCE']) }),
      transportModes: Object.freeze({ type: 'multi_enum', required: true, values: Object.freeze(['ROAD', 'AIR', 'MARITIME', 'FLUVIAL', 'RAIL', 'MULTIMODAL', 'OTHER', 'NEED_GUIDANCE']) }),
      origin: Object.freeze({ type: 'string', requiredWhen: Object.freeze({ field: 'coverageModeNeed', equals: 'SPECIFIC_SHIPMENT' }) }),
      destination: Object.freeze({ type: 'string', requiredWhen: Object.freeze({ field: 'coverageModeNeed', equals: 'SPECIFIC_SHIPMENT' }) }),
      valueToProtect: Object.freeze({ type: 'money', currency: 'COP', requiredWhen: Object.freeze({ field: 'coverageModeNeed', equals: 'SPECIFIC_SHIPMENT' }) }),
      maxValuePerShipment: Object.freeze({ type: 'money', currency: 'COP', requiredWhen: Object.freeze({ field: 'coverageModeNeed', equals: 'ANNUAL_PROGRAM' }) }),
      annualMovementBudget: Object.freeze({ type: 'money', currency: 'COP', requiredWhen: Object.freeze({ field: 'coverageModeNeed', equals: 'ANNUAL_PROGRAM' }) }),
      ...COMMON_FIELDS
    })
  }),

  CO_RC_PROFESIONAL_CONSULTATIVE_HYBRID: Object.freeze({
    country: 'CO',
    mode: 'CONSULTATIVE_HYBRID',
    autoReady: false,
    fields: Object.freeze({
      needTrigger: Object.freeze({ type: 'enum', required: true, values: Object.freeze(['CONTRACT_REQUIREMENT', 'PROFESSIONAL_ACTIVITY', 'LIABILITY_EXPOSURE', 'RENEWAL_REVIEW', 'NEED_GUIDANCE']) }),
      applicantType: Object.freeze({ type: 'enum', required: true, values: Object.freeze(['NATURAL_PERSON', 'LEGAL_ENTITY']) }),
      professionalActivity: Object.freeze({ type: 'string_or_future_catalog', required: true }),
      businessName: Object.freeze({ type: 'string', requiredWhen: Object.freeze({ field: 'applicantType', equals: 'LEGAL_ENTITY' }) }),
      contractRequirementSummary: Object.freeze({ type: 'string' }),
      ...COMMON_FIELDS
    })
  })
});

const AUTO_POLICY = Object.freeze({
  autoReady: AUTO_READY,
  defaultDeny: true,
  providerAdaptersAllowed: false,
  runtimeSideEffectsAllowed: false
});

module.exports = Object.freeze({
  VERSION,
  AUTO_READY,
  AUTO_POLICY,
  COMMON_ALIAS_RESOLUTION,
  JOURNEYS
});
