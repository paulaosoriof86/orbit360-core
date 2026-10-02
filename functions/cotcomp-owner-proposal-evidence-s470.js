'use strict';

const crypto=require('node:crypto');
const s469=require('./cotcomp-real-proposal-evidence-s469');

const VERSION='ays-cotcomp-s470-owner-proposal-evidence-ready-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const JOURNEY_ID='GT_AUTO_MOTO_HYBRID';
const COUNTRY='GT';
const PRODUCT='AUTO';

const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const REAL_DATA_ALLOWED=false;
const PROVIDER_OR_RATER_CALLS_ALLOWED=false;
const PRODUCTION_ALLOWED=false;

const CASE_MATCH_COMMITMENT_SHA256='23dd6ec29b3c255fb3ce5c48e5b64cf012333f1626ccb8495bf3520bb0c6349a';

const DOCUMENTS=Object.freeze({
  ASEGUATE:Object.freeze({
    insurerId:'aseguradora-guatemalteca',
    insurerDisplayName:'Aseguradora Guatemalteca',
    documentSha256:'0bad818159c0b16f72ba1f697b8224b6fed5107f1cd12b8f5b50d8ef612c05ca',
    referenceCommitmentSha256:'4b874f71d8c45b8680b9bc9ebd2db06aedcc0beb3aec4f2fbce3e1173c18acf0',
    issueDate:'2026-09-30',
    validFrom:'2026-09-30T00:00:00-06:00',
    validUntil:'2026-10-15T23:59:59-06:00',
    origin:'pdf_externo'
  }),
  MAPFRE:Object.freeze({
    insurerId:'mapfre-seguros-guatemala',
    insurerDisplayName:'MAPFRE Seguros Guatemala',
    documentSha256:'ba1b1ef624f96d26ddf5bea85cd9ef25cec238d4743cb09d1ea4609dfc6431e2',
    referenceCommitmentSha256:'b4f8342c7723206a69ee54c29f9d9fab8b6de9c48e7bd8358987e7a491116e0a',
    issueDate:'2026-09-30',
    validFrom:'2026-09-30T00:00:00-06:00',
    validUntil:'2026-10-15T23:59:59-06:00',
    origin:'pdf_externo'
  })
});

const ALTERNATIVES=Object.freeze([
  Object.freeze({
    evidenceId:'S470_A',
    documentKey:'ASEGUATE',
    planName:'Aseguate Premium',
    currency:'GTQ',
    premium:2508.80,
    coverages:Object.freeze({
      ownDamage:'COVERED',
      totalTheft:'COVERED',
      riotStrikeEarthquake:'COVERED',
      occupantLiabilityExtension:'COVERED',
      agreedValue:'COVERED',
      zeroDeductibleResponsibleThirdParty:'COVERED',
      accidentalDeathDriver:'COVERED',
      crystals:'COVERED'
    }),
    limits:Object.freeze({
      insuredVehicle:37500,
      liability:1200000,
      occupantMedicalPerPerson:50000,
      occupantMedicalPerAccident:250000,
      occupantPersonalAccidentPerPerson:50000,
      occupantPersonalAccidentPerAccident:250000,
      accidentalDeathDriver:200000,
      crystals:20000,
      bail:25000,
      lockDamage:10000,
      tireDamage:10000
    }),
    sublimits:Object.freeze({
      rentalTotalLossDaily:100,
      rentalTotalLossDays:30,
      rentalTheftDaily:100,
      rentalTheftDays:30
    }),
    deductibles:Object.freeze({
      ownDamage:Object.freeze({percent:3,minimum:2000}),
      totalTheft:Object.freeze({percent:3,minimum:2000}),
      lockDamage:Object.freeze({percent:10,minimum:200}),
      tireDamage:Object.freeze({percent:10,minimum:200})
    }),
    assistance:Object.freeze({
      mechanicalTow:Object.freeze({events:'UNLIMITED',perEvent:3500}),
      accidentTow:Object.freeze({events:'UNLIMITED',maneuversIncluded:true}),
      roadsideBasic:Object.freeze({events:'UNLIMITED',perEvent:800}),
      locksmith:Object.freeze({eventsPerYear:10,perEvent:400}),
      guardian:Object.freeze({eventsPerMonth:2}),
      territorialExtension:'CENTRAL_AMERICA_PANAMA_MEXICO'
    }),
    conditions:Object.freeze([
      'QUOTE_VALID_15_DAYS',
      'AGREED_VALUE_SUBJECT_TO_UNDERWRITING_CONFIRMATION',
      'ROAD_ASSISTANCE_EXCLUDES_VEHICLES_OVER_3_5_TONS',
      'DRIVER_AGE_FROM_18',
      'EXPIRED_LICENSE_UP_TO_12_MONTHS'
    ]),
    exclusions:Object.freeze([])
  }),
  Object.freeze({
    evidenceId:'S470_B',
    documentKey:'ASEGUATE',
    planName:'Aseguate Plus',
    currency:'GTQ',
    premium:2273.60,
    coverages:Object.freeze({
      ownDamage:'COVERED',
      totalTheft:'COVERED',
      riotStrikeEarthquake:'COVERED',
      occupantLiabilityExtension:'NOT_COVERED',
      agreedValue:'MARKET_VALUE_AT_LOSS',
      zeroDeductibleResponsibleThirdParty:'COVERED',
      accidentalDeathDriver:'COVERED',
      crystals:'COVERED',
      lockDamage:'NOT_COVERED',
      tireDamage:'NOT_COVERED'
    }),
    limits:Object.freeze({
      insuredVehicle:37500,
      liability:500000,
      occupantMedicalPerPerson:20000,
      occupantMedicalPerAccident:100000,
      occupantPersonalAccidentPerPerson:20000,
      occupantPersonalAccidentPerAccident:100000,
      accidentalDeathDriver:150000,
      crystals:20000,
      bail:25000
    }),
    sublimits:Object.freeze({
      rentalTheftDaily:100,
      rentalTheftDays:30
    }),
    deductibles:Object.freeze({
      ownDamage:Object.freeze({percent:3,minimum:1800}),
      totalTheft:Object.freeze({percent:3,minimum:1800})
    }),
    assistance:Object.freeze({
      mechanicalTow:Object.freeze({eventsPerYear:5,perEvent:3500}),
      accidentTow:Object.freeze({events:'UNLIMITED',maneuversIncluded:true}),
      roadsideBasic:Object.freeze({eventsPerYear:5,perEvent:800}),
      locksmith:Object.freeze({eventsPerYear:5,perEvent:400}),
      guardian:Object.freeze({eventsPerMonth:1}),
      territorialExtension:'CENTRAL_AMERICA_PANAMA_MEXICO'
    }),
    conditions:Object.freeze([
      'QUOTE_VALID_15_DAYS',
      'ROAD_ASSISTANCE_EXCLUDES_VEHICLES_OVER_3_5_TONS',
      'DRIVER_AGE_FROM_18',
      'EXPIRED_LICENSE_UP_TO_6_MONTHS'
    ]),
    exclusions:Object.freeze([
      'OCCUPANT_LIABILITY_EXTENSION',
      'LOCK_DAMAGE',
      'TIRE_DAMAGE',
      'RENTAL_TOTAL_LOSS'
    ])
  }),
  Object.freeze({
    evidenceId:'S470_C',
    documentKey:'MAPFRE',
    planName:'Seguro de Automóvil',
    currency:'GTQ',
    premium:3292.80,
    coverages:Object.freeze({
      ownDamage:'COVERED',
      otherDamage:'COVERED',
      totalTheft:'COVERED',
      riotStrike:'COVERED',
      earthquake:'COVERED',
      agreedValue:'COVERED',
      zeroDeductibleResponsibleThirdParty:'COVERED',
      accidentalDeath:'COVERED',
      crystals:'COVERED',
      crossLiability:'COVERED',
      offRoadDriving:'COVERED'
    }),
    limits:Object.freeze({
      insuredVehicle:37500,
      liability:1300000,
      occupantInjuryPerPerson:50000,
      occupantInjuryPerAccident:250000,
      crystals:30000,
      accidentalDeath:200000,
      funeralAdvance:30000,
      legalOwnCounsel:5000,
      judicialYardDamage:20000,
      paperworkReimbursement:1000,
      rentalCollision:4000,
      rentalTheft:9000,
      crossLiability:75000,
      lockDamage:3000,
      tireDamage:3000
    }),
    sublimits:Object.freeze({
      towAccidentOrBreakdown:5000,
      towEvents:2,
      consultationsGeneralMedicine:10
    }),
    deductibles:Object.freeze({
      ownDamage:Object.freeze({percent:3,minimum:3000}),
      otherDamage:Object.freeze({percent:3,minimum:3000}),
      totalTheft:Object.freeze({percent:3,minimum:3000}),
      riotStrike:Object.freeze({percent:3,minimum:3000}),
      earthquake:Object.freeze({percent:3,minimum:3000}),
      crystals:Object.freeze({percent:10,minimum:500,base:'SPFA'}),
      judicialYardDamage:Object.freeze({fixed:1000}),
      rentalCollision:Object.freeze({fixed:300}),
      rentalTheft:Object.freeze({fixed:300}),
      lockDamage:Object.freeze({fixed:250}),
      tireDamage:Object.freeze({fixed:100})
    }),
    assistance:Object.freeze({
      towAccidentOrBreakdown:Object.freeze({limit:5000,events:2}),
      territorialExtension:'GUATEMALA_AND_CENTRAL_AMERICA_EXCEPT_BELIZE_PANAMA'
    }),
    conditions:Object.freeze([
      'QUOTE_VALID_15_CALENDAR_DAYS',
      'INSPECTION_REQUIRED_AND_MUST_BE_SATISFACTORY_BEFORE_COVERAGE',
      'ISSUANCE_REQUEST_REQUIRED_BEFORE_COVERAGE',
      'INSURER_MAY_ACCEPT_OR_REJECT',
      'DRIVER_AGE_FROM_18',
      'EXPIRED_LICENSE_UP_TO_12_MONTHS'
    ]),
    exclusions:Object.freeze([
      'DRIVER_AGE_16_TO_17',
      'ABSENCE_OF_CONTROL'
    ])
  })
]);

function clean(v,max=260){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function isSha(v){return /^[a-f0-9]{64}$/i.test(clean(v,80));}

function sourceBundleReadiness(){
  const errors=[];
  for(const [key,doc] of Object.entries(DOCUMENTS)){
    if(!isSha(doc.documentSha256))errors.push(key+'_DOCUMENT_SHA_INVALID');
    if(!isSha(doc.referenceCommitmentSha256))errors.push(key+'_REFERENCE_COMMITMENT_INVALID');
    if(doc.origin!=='pdf_externo')errors.push(key+'_ORIGIN_INVALID');
  }
  if(!isSha(CASE_MATCH_COMMITMENT_SHA256))errors.push('CASE_MATCH_COMMITMENT_INVALID');
  if(ALTERNATIVES.length!==3)errors.push('EXPECTED_THREE_ALTERNATIVES');
  for(const alt of ALTERNATIVES){
    if(!DOCUMENTS[alt.documentKey])errors.push(alt.evidenceId+'_DOCUMENT_LINK_INVALID');
    if(!(Number(alt.premium)>0))errors.push(alt.evidenceId+'_PREMIUM_INVALID');
    for(const field of ['coverages','limits','sublimits','deductibles','assistance']){
      if(!alt[field]||typeof alt[field]!=='object'||Array.isArray(alt[field]))errors.push(alt.evidenceId+'_'+field.toUpperCase()+'_INVALID');
    }
    if(!Array.isArray(alt.conditions)||!Array.isArray(alt.exclusions))errors.push(alt.evidenceId+'_ARRAYS_INVALID');
  }
  return Object.freeze({
    version:VERSION,
    sourceBundleReady:errors.length===0,
    errors:Object.freeze(errors),
    documentaryAlternatives:ALTERNATIVES.length,
    uniqueSourceDocuments:Object.keys(DOCUMENTS).length,
    caseMatchCommitmentSha256:CASE_MATCH_COMMITMENT_SHA256,
    ownerHumanValidationRequired:true,
    ownerHumanValidationPresent:false,
    appDataReads:0,
    appDataWrites:0,
    realDataTouched:false,
    providerOrRaterCalls:0,
    productionTouched:false,
    realProposalCreated:false,
    comparisonSetCreated:false
  });
}

function buildValidatedPackets({caseId,ownerAttestationSha256,validatedAt}={}){
  if(!clean(caseId,180))return {ok:false,code:'CASE_ID_REQUIRED'};
  if(!isSha(ownerAttestationSha256))return {ok:false,code:'OWNER_HUMAN_VALIDATION_REQUIRED'};
  const instant=clean(validatedAt,80);
  if(!instant||!Number.isFinite(Date.parse(instant)))return {ok:false,code:'VALIDATED_AT_REQUIRED'};

  const packets=[];
  for(const alt of ALTERNATIVES){
    const doc=DOCUMENTS[alt.documentKey];
    const validatorCommitmentSha256=sha([
      'S470_OWNER_VALIDATED_REAL_QUOTE',
      ownerAttestationSha256,
      alt.evidenceId,
      doc.documentSha256
    ].join('|'));

    const packet={
      tenantId:TENANT_ID,
      journeyId:JOURNEY_ID,
      caseId:clean(caseId,180),
      country:COUNTRY,
      product:PRODUCT,
      insurerId:doc.insurerId,
      insurerDisplayName:doc.insurerDisplayName,
      planName:alt.planName,
      currency:alt.currency,
      premium:alt.premium,
      coverages:alt.coverages,
      limits:alt.limits,
      sublimits:alt.sublimits,
      deductibles:alt.deductibles,
      assistance:alt.assistance,
      conditions:alt.conditions,
      exclusions:alt.exclusions,
      validity:{validFrom:doc.validFrom,validUntil:doc.validUntil},
      sourceEvidence:{
        origin:doc.origin,
        documentSha256:doc.documentSha256,
        referenceCommitmentSha256:doc.referenceCommitmentSha256,
        validatorCommitmentSha256,
        validatedAt:instant,
        humanValidated:true,
        providerOrRaterCallsExecuted:0,
        rawDocumentStoredInCotComp:false,
        piiCopiedToProposal:false
      }
    };
    const check=s469.validateEvidencePacket(packet);
    if(!check.ok)return {ok:false,code:'S470_PACKET_INVALID',evidenceId:alt.evidenceId,errors:check.errors};
    packets.push(Object.freeze(packet));
  }
  return Object.freeze({ok:true,packets:Object.freeze(packets)});
}

function buildSourceOnlyCandidates({caseId,ownerAttestationSha256,validatedAt,asOf}={}){
  const packets=buildValidatedPackets({caseId,ownerAttestationSha256,validatedAt});
  if(!packets.ok)return packets;
  const candidates=[];
  for(const packet of packets.packets){
    const c=s469.buildRealProposalCandidate(packet,asOf);
    if(!c.ok)return {ok:false,code:'S470_CANDIDATE_INVALID',detail:c};
    candidates.push(c);
  }
  return Object.freeze({ok:true,candidates:Object.freeze(candidates)});
}

module.exports=Object.freeze({
  VERSION,PROJECT_ID,TENANT_ID,JOURNEY_ID,COUNTRY,PRODUCT,
  EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,REAL_DATA_ALLOWED,
  PROVIDER_OR_RATER_CALLS_ALLOWED,PRODUCTION_ALLOWED,
  CASE_MATCH_COMMITMENT_SHA256,DOCUMENTS,ALTERNATIVES,
  clean,sha,isSha,sourceBundleReadiness,buildValidatedPackets,buildSourceOnlyCandidates
});
