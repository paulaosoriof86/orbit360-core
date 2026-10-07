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
  VERSION,INTERNAL_STATES,PUBLIC_STATE,POLICY,
  clean,publicState,publicClaimProjection,assistanceTruth,documentRequestAllowed,assistanceChannelProjection
});
