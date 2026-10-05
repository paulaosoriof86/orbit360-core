'use strict';

const {onRequest}=require('firebase-functions/v2/https');
const S497=require('./cotcomp-clean-parent-s497');

const VERSION='ays-cotcomp-s498-owner-review-lab-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const FUNCTION_NAME='cotcompOwnerReviewS498';

const AUTH=Object.freeze({
  status:'OWNER_REVIEW_LAB_ONLY',
  sourceParent:S497.VERSION,
  internalManualVisualAuditPassed:true,
  ownerReviewUrlAuthorized:true,
  providerDeploymentAuthorized:false,
  cotcompRealTransportAuthorized:false,
  production:false,
  liveCatalogDependency:'cotcompVehicleCatalogS479',
  writes:false
});

function securityHeaders(res){
  res.set('Cache-Control','no-store, max-age=0');
  res.set('Pragma','no-cache');
  res.set('Referrer-Policy','no-referrer');
  res.set('X-Content-Type-Options','nosniff');
  res.set('X-Frame-Options','DENY');
  res.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  res.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; img-src data:; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
}

function html(){
  let h=S497.html();
  h=h.replace(
    '<meta name="ays-status" content="SOURCE_ONLY_NOT_OWNER_REVIEW">',
    '<meta name="ays-status" content="OWNER_REVIEW_LAB_ONLY"><meta name="ays-owner-review-authorized" content="true">'
  );
  h=h.replace(
    '<title>A&S · Cotiza y compara con criterio · S4.97 clean parent</title>',
    '<title>A&S · Cotiza y compara con criterio · Owner Review LAB S4.98</title>'
  );
  h=h.replace(
    'Este artefacto no está autorizado para URL de Owner Review.',
    'Vista de revisión Owner en LAB. No constituye aprobación de producción.'
  );
  const payload=JSON.stringify(AUTH).replace(/</g,'\\u003c');
  h=h.replace('</body>','<script type="application/json" id="s498-owner-review-auth">'+payload+'</script></body>');
  return h;
}

function handler(req,res){
  securityHeaders(res);
  if(req.method!=='GET'){
    res.set('Allow','GET');
    return res.status(405).send('Método no permitido.');
  }
  res.set('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(html());
}

const cotcompOwnerReviewS498=onRequest({
  region:REGION,
  timeoutSeconds:30,
  memory:'256MiB',
  maxInstances:2,
  concurrency:40,
  invoker:'public'
},handler);

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,FUNCTION_NAME,AUTH,securityHeaders,html,handler,cotcompOwnerReviewS498
});
