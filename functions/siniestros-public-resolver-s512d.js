'use strict';

const {onRequest}=require('firebase-functions/v2/https');
const s=require('./siniestros-public-contract-s512');

const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const VERSION='ays-siniestros-s512d-public-resolver-v1';

const ALLOWED_ORIGINS=new Set([
  'https://ays-orbit-360-lab.web.app',
  'https://ays-orbit-360-lab.firebaseapp.com'
]);

function clean(v,m=220){return String(v==null?'':v).trim().slice(0,m);}
function allowOrigin(req,res){
  const origin=clean(req.get('origin'),300);
  if(!origin)return true;
  if(!ALLOWED_ORIGINS.has(origin))return false;
  res.set('Access-Control-Allow-Origin',origin);
  res.set('Vary','Origin');
  res.set('Access-Control-Allow-Methods','GET, OPTIONS');
  res.set('Access-Control-Allow-Headers','Content-Type');
  return true;
}
function publicResolved(insurerName){
  const r=s.resolveValidatedGtAssistance({
    insurerName,
    aysWhatsapp:'+502 5614 9048',
    aysEmail:'info@aysseguros.com'
  });
  return {
    insurerName:r.insurerName,
    insurerChannel:r.insurerChannel?{
      type:r.insurerChannel.type,
      value:r.insurerChannel.value,
      scope:r.insurerChannel.scope,
      validated:r.insurerChannel.validated===true,
      reviewedAt:r.insurerChannel.reviewedAt
    }:null,
    insurerChannelStatus:r.insurerChannelStatus,
    fallbackChannels:r.fallbackChannels,
    truth:r.truth
  };
}
async function handler(req,res){
  res.set('Cache-Control','no-store, max-age=0');
  res.set('Pragma','no-cache');
  res.set('X-Content-Type-Options','nosniff');
  if((process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID)!==PROJECT_ID){
    return res.status(503).json({ok:false,code:'WRONG_ENVIRONMENT'});
  }
  if(!allowOrigin(req,res))return res.status(403).json({ok:false,code:'ORIGIN_DENY'});
  if(req.method==='OPTIONS')return res.status(204).send('');
  if(req.method!=='GET'){
    res.set('Allow','GET, OPTIONS');
    return res.status(405).json({ok:false,code:'METHOD_NOT_ALLOWED'});
  }

  const country=clean(req.query&&req.query.country||'GT',8).toUpperCase();
  if(country!=='GT')return res.status(400).json({ok:false,code:'COUNTRY_NOT_SUPPORTED'});

  const action=clean(req.query&&req.query.action||'resolve',40).toLowerCase();
  if(action==='list'){
    const summary=s.validatedChannelRegistrySummary();
    return res.status(200).json({
      ok:true,
      schemaVersion:VERSION,
      country:'GT',
      reviewedAt:summary.reviewedAt,
      insurerNames:summary.insurerNames,
      count:summary.count,
      fallbackChannels:[
        {type:'whatsapp',owner:'A&S',value:'+502 5614 9048',validated:true},
        {type:'email',owner:'A&S',value:'info@aysseguros.com',validated:true}
      ],
      truth:{coverageConfirmed:false,eligibilityConfirmed:false}
    });
  }

  const insurerName=clean(req.query&&req.query.insurer,180);
  if(!insurerName)return res.status(400).json({ok:false,code:'INSURER_REQUIRED'});
  return res.status(200).json(Object.assign({
    ok:true,
    schemaVersion:VERSION,
    country:'GT'
  },publicResolved(insurerName)));
}

const siniestrosPublicResolverS512D=onRequest({
  region:REGION,
  timeoutSeconds:20,
  memory:'256MiB',
  maxInstances:2,
  invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,ALLOWED_ORIGINS,clean,allowOrigin,publicResolved,handler,siniestrosPublicResolverS512D
});
