'use strict';

const VERSION='ays-siniestros-public-contract-s512-v0.1';

const INTERNAL_STATES=Object.freeze([
  'Reportado','En análisis','Documentación','Aprobado','Pagado','Rechazado'
]);

const PUBLIC_STATE=Object.freeze({
  'Reportado':Object.freeze({code:'REPORT_RECEIVED',label:'Reporte recibido',final:false}),
  'En análisis':Object.freeze({code:'UNDER_REVIEW',label:'En revisión',final:false}),
  'Documentación':Object.freeze({code:'DOCUMENTS_IN_PROGRESS',label:'Documentación en gestión',final:false}),
  'Aprobado':Object.freeze({code:'APPROVED',label:'Aprobado',final:true}),
  'Pagado':Object.freeze({code:'PAYMENT_RECORDED',label:'Pago registrado',final:true}),
  'Rechazado':Object.freeze({code:'REJECTED',label:'Rechazado',final:true})
});

const VALIDATED_GT_CHANNELS=Object.freeze({
  'aseguradora_general':Object.freeze({
    insurer:'ASEGURADORA GENERAL',channel:'1757',type:'emergency',scope:'general',
    reviewedAt:'2026-10-07',sourceUrl:'https://www.aseguradorageneral.com/telefonos-de-emergencia'
  }),
  'aseguradora_guatemalteca':Object.freeze({
    insurer:'ASEGURADORA GUATEMALTECA',channel:'2388-6868 Ext. 1',type:'emergency',scope:'general_24_7',
    reviewedAt:'2026-10-07',sourceUrl:'https://aseguate.com/blog/'
  }),
  'aseguradora_la_ceiba':Object.freeze({
    insurer:'ASEGURADORA LA CEIBA',channel:'2379-1818 / 2311-1223',type:'emergency',scope:'general',
    reviewedAt:'2026-10-07',sourceUrl:'https://www.aceiba.com.gt/'
  }),
  'aseguradora_rural':Object.freeze({
    insurer:'ASEGURADORA RURAL',channel:'2294-8811',type:'emergency',scope:'auto_danos',
    reviewedAt:'2026-10-07',sourceUrl:'https://www.aseguradorarural.com.gt/aseguradoradnn/ServiciosyAtenci%C3%B3n/Tel%C3%A9fonosdeEmergencia.aspx'
  }),
  'g_t_seguros':Object.freeze({
    insurer:'G&T SEGUROS',channel:'1778',type:'emergency',scope:'general_24_7',
    reviewedAt:'2026-10-07',sourceUrl:'https://landing.segurosgyt.com.gt/cotizar-seguro-de-auto'
  }),
  'mapfre_seguros':Object.freeze({
    insurer:'MAPFRE SEGUROS',channel:'2328-5060 / 2375-5060',type:'assistance',scope:'assistance_24_7',
    reviewedAt:'2026-10-07',sourceUrl:'https://www.mapfre.com.gt/sobre-mapfre-guatemala/contacto/'
  }),
  'seguros_el_roble':Object.freeze({
    insurer:'SEGUROS EL ROBLE',channel:'1797',type:'emergency',scope:'general',
    reviewedAt:'2026-10-07',sourceUrl:'https://www.elroble.com/'
  }),
  'seguros_bantrab':Object.freeze({
    insurer:'SEGUROS BANTRAB',channel:'2410-2696',type:'emergency',scope:'auto_incendios_vida',
    reviewedAt:'2026-10-07',sourceUrl:'https://www.bantrab.com.gt/tips/que-hacer-en-caso-de-emergencia/'
  })
});

const POLICY=Object.freeze({
  sourceOnly:true,
  publicWriteAllowed:false,
  directBrowserFirestoreWriteAllowed:false,
  publicDocumentUploadAllowed:false,
  coverageConfirmationFromReportAllowed:false,
  eligibilityConfirmationFromAssistanceAllowed:false,
  indemnityConfirmationFromOpenCaseAllowed:false,
  rawInternalBitacoraAllowed:false,
  rawDocumentStorageReferenceAllowed:false
});

function clean(v,m=500){return String(v==null?'':v).trim().slice(0,m);}
function norm(v){return clean(v,160).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}

function publicState(internalState){
  const x=PUBLIC_STATE[clean(internalState,80)];
  if(!x)return {ok:false,code:'STATE_NOT_PUBLICABLE'};
  return {ok:true,state:x};
}

function publicClaimProjection(claim={}){
  const mapped=publicState(claim.estado);
  if(!mapped.ok)return {ok:false,code:mapped.code};
  return {
    ok:true,
    value:Object.freeze({
      claimRef:clean(claim.id,180),
      claimNumber:clean(claim.numero,120),
      type:clean(claim.tipo,180),
      line:clean(claim.ramo,140),
      reportedAt:clean(claim.fecha,40),
      publicStatus:mapped.state,
      approvedAmountPresent:Number(claim.montoAprobado||0)>0,
      nextActionRequired:mapped.state.code==='DOCUMENTS_IN_PROGRESS'
    })
  };
}

function assistanceTruth({requestCreated,coverageVerified,eligibilityVerified}={}){
  return Object.freeze({
    requestCreated:requestCreated===true,
    coverageConfirmed:coverageVerified===true,
    eligibilityConfirmed:eligibilityVerified===true,
    safeMessage:coverageVerified===true&&eligibilityVerified===true
      ? 'Solicitud de asistencia registrada con validación confirmada.'
      : 'Solicitud de asistencia registrada. La cobertura y elegibilidad quedan sujetas a validación.'
  });
}

function documentRequestAllowed({claimExists,customerScopeResolved,requestReason}={}){
  const errors=[];
  if(claimExists!==true)errors.push('CLAIM_REQUIRED');
  if(customerScopeResolved!==true)errors.push('CUSTOMER_SCOPE_REQUIRED');
  if(!clean(requestReason,240))errors.push('REQUEST_REASON_REQUIRED');
  return {ok:errors.length===0,errors};
}

function insurerKey(name){
  return norm(name).replace(/^seguros_de_?/,'').replace(/^seguros_?/,m=>m);
}

function validatedGtChannel(insurerName){
  const key=norm(insurerName);
  if(VALIDATED_GT_CHANNELS[key])return VALIDATED_GT_CHANNELS[key];
  const aliases={
    'mapfre':'mapfre_seguros',
    'mapfre_seguros_guatemala':'mapfre_seguros',
    'seguros_g_t':'g_t_seguros',
    'g_t':'g_t_seguros',
    'el_roble':'seguros_el_roble',
    'bantrab':'seguros_bantrab',
    'la_ceiba':'aseguradora_la_ceiba',
    'rural':'aseguradora_rural',
    'aseguate':'aseguradora_guatemalteca'
  };
  const canonical=aliases[key]||'';
  return canonical&&VALIDATED_GT_CHANNELS[canonical]||null;
}

function validatedChannelRegistrySummary(){
  const rows=Object.values(VALIDATED_GT_CHANNELS);
  return Object.freeze({
    country:'GT',
    reviewedAt:'2026-10-07',
    count:rows.length,
    insurerNames:Object.freeze(rows.map(r=>r.insurer))
  });
}

function resolveValidatedGtAssistance({insurerName,aysWhatsapp,aysEmail}={}){
  const row=validatedGtChannel(insurerName);
  const fallbacks=[];
  const wa=clean(aysWhatsapp,40),email=clean(aysEmail,220);
  if(wa)fallbacks.push(Object.freeze({type:'whatsapp',owner:'A&S',value:wa,validated:true}));
  if(email)fallbacks.push(Object.freeze({type:'email',owner:'A&S',value:email,validated:true}));
  return Object.freeze({
    country:'GT',
    insurerName:clean(insurerName,180),
    insurerChannel:row?Object.freeze({
      type:row.type,
      owner:'insurer',
      value:row.channel,
      scope:row.scope,
      validated:true,
      reviewedAt:row.reviewedAt,
      sourceUrl:row.sourceUrl
    }):null,
    insurerChannelStatus:row?'CURRENT_CHANNEL_VALIDATED':'NO_VALIDATED_INSURER_CHANNEL',
    fallbackChannels:Object.freeze(fallbacks),
    truth:Object.freeze({
      channelIsContactOnly:true,
      coverageConfirmed:false,
      eligibilityConfirmed:false
    })
  });
}

function channelFreshnessStatus({emergencyContact,lastReviewedAt,officialEvidenceVerified}={}){
  const contact=clean(emergencyContact,220);
  const reviewed=clean(lastReviewedAt,40);
  if(!contact)return Object.freeze({publishable:false,code:'NO_DIRECTORY_CHANNEL'});
  if(!reviewed||!Number.isFinite(Date.parse(reviewed)))return Object.freeze({publishable:false,code:'REVIEW_DATE_REQUIRED'});
  if(officialEvidenceVerified!==true)return Object.freeze({publishable:false,code:'OFFICIAL_EVIDENCE_REQUIRED'});
  return Object.freeze({publishable:true,code:'CURRENT_CHANNEL_VALIDATED',lastReviewedAt:reviewed});
}

function resolvePublicAssistanceChannels({insurer,aysWhatsapp,aysEmail,officialEvidenceVerified}={}){
  const whatsapp=clean(aysWhatsapp,40);
  const email=clean(aysEmail,220);
  const emergency=clean(insurer&&(insurer.emergencia||insurer.assistance||insurer.emergency),220);
  const reviewed=clean(insurer&&(insurer.ultimaRevision||insurer.lastReviewedAt),40);
  const freshness=channelFreshnessStatus({emergencyContact:emergency,lastReviewedAt:reviewed,officialEvidenceVerified});
  const base=[];
  if(whatsapp)base.push(Object.freeze({type:'whatsapp',value:whatsapp,owner:'A&S',validated:true}));
  if(email)base.push(Object.freeze({type:'email',value:email,owner:'A&S',validated:true}));
  return Object.freeze({
    channels:Object.freeze(base),
    insurerChannel:freshness.publishable?Object.freeze({type:'insurer_emergency',value:emergency,owner:'insurer',validated:true,lastReviewedAt:reviewed}):null,
    insurerChannelStatus:freshness.code,
    truth:Object.freeze({
      requestChannelDoesNotConfirmCoverage:true,
      requestChannelDoesNotConfirmEligibility:true
    })
  });
}

function assistanceChannelProjection({insurer,aysWhatsapp,aysEmail}={}){
  const emergency=clean(insurer&&(insurer.emergencia||insurer.assistance||insurer.emergency),220);
  const lastReviewedAt=clean(insurer&&(insurer.ultimaRevision||insurer.lastReviewedAt),40);
  return Object.freeze({
    ays:Object.freeze({
      whatsapp:clean(aysWhatsapp,40),
      email:clean(aysEmail,220)
    }),
    insurer:Object.freeze({
      emergencyContactRegistered:!!emergency,
      emergencyContact:emergency,
      lastReviewedAt:lastReviewedAt,
      verifiedCurrent:false
    }),
    truth:Object.freeze({
      aysFallbackIsOperationalChannel:true,
      insurerContactIsDirectoryDataNotCoverageConfirmation:true,
      insurerContactFreshnessMustBeValidated:true
    })
  });
}

module.exports=Object.freeze({
  VERSION,INTERNAL_STATES,PUBLIC_STATE,VALIDATED_GT_CHANNELS,POLICY,
  clean,norm,publicState,publicClaimProjection,assistanceTruth,documentRequestAllowed,insurerKey,validatedGtChannel,validatedChannelRegistrySummary,resolveValidatedGtAssistance,channelFreshnessStatus,resolvePublicAssistanceChannels,assistanceChannelProjection
});
