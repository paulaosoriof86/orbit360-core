/* Gravicentra · S5.09 · atención inmediata de nuevos leads asignados */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  if(window.Orbit.__advisorLeadAttentionS509)return;
  window.Orbit.__advisorLeadAttentionS509=true;

  const VERSION='advisor-lead-attention-s509-v1';
  const params=new URLSearchParams(window.location.search||'');
  const mode=params.get('orbitBackend')||(window.OrbitBackend&&OrbitBackend.mode)||'';
  const tenantId=params.get('tenant')||(window.OrbitBackend&&(OrbitBackend.tenantId||OrbitBackend.tenant))||'';
  if(mode!=='firestore-lab'||tenantId!=='alianzas-soluciones')return;

  const functionName=()=>window.OrbitBackend&&OrbitBackend.functionNames&&OrbitBackend.functionNames.leadAttention||'orbit360AdvisorLeadAttentionS509';
  const region=()=>window.OrbitBackend&&OrbitBackend.functionsRegion||'us-central1';
  let timer=null,startedUid='',polling=false;

  function authUser(){
    try{return window.firebase&&firebase.auth&&firebase.auth().currentUser||null;}catch(e){return null;}
  }
  function callable(){
    if(!window.firebase||!firebase.app||!firebase.app().functions)throw new Error('LEAD_ATTENTION_FUNCTIONS_NOT_READY');
    return firebase.app().functions(region()).httpsCallable(functionName());
  }
  async function invoke(action,payload){
    const fn=callable();
    const r=await fn(Object.assign({tenantId,action},payload||{}));
    return r&&r.data||{};
  }
  function removeBanner(){
    const old=document.getElementById('lead-attention-s509');
    if(old)old.remove();
  }
  function banner(count,onView,auto){
    removeBanner();
    const el=document.createElement('div');
    el.id='lead-attention-s509';
    el.setAttribute('role','status');
    el.style.cssText='position:fixed;right:18px;top:18px;z-index:12000;width:min(390px,calc(100vw - 36px));background:#171717;color:white;border-radius:14px;padding:15px 16px;box-shadow:0 14px 36px rgba(0,0,0,.28);font-family:inherit';
    el.innerHTML='<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.68">Gravicentra · nuevo lead</div>'
      +'<div style="font-weight:800;font-size:15px;margin-top:4px">'+(count===1?'Tienes un nuevo lead asignado.':'Tienes '+count+' nuevos leads asignados.')+'</div>'
      +'<div style="font-size:12px;line-height:1.45;opacity:.82;margin-top:5px">'+(auto?'Abriendo Leads para que lo gestiones de inmediato.':'Revísalo en Leads para darle seguimiento oportuno.')+'</div>'
      +(auto?'':'<button id="lead-attention-s509-open" style="margin-top:10px;border:0;border-radius:9px;padding:8px 11px;background:white;color:#171717;font-weight:700;cursor:pointer">Ver Leads</button>');
    document.body.appendChild(el);
    if(!auto){
      const b=el.querySelector('#lead-attention-s509-open');
      if(b)b.addEventListener('click',()=>{removeBanner();onView&&onView();});
    }else{
      setTimeout(removeBanner,5500);
    }
  }
  async function ack(ids){
    try{if(ids&&ids.length)await invoke('ack',{eventIds:ids});}catch(e){}
  }
  async function openLeads(ids,auto){
    banner(ids.length,()=>openLeads(ids,false),!!auto);
    if(location.hash!=='#/leads')location.hash='#/leads';
    setTimeout(()=>ack(ids),350);
  }
  async function poll(initial){
    if(polling)return;
    const u=authUser();
    if(!u)return;
    polling=true;
    try{
      const data=await invoke('poll',{limit:60});
      const rows=[].concat(data.unseen||[]);
      if(!rows.length)return;
      const ids=rows.map(x=>x&&x.eventId).filter(Boolean);
      if(!ids.length)return;
      if(initial){
        await openLeads(ids,true);
      }else if((location.hash||'').replace(/^#\/?/,'')==='leads'){
        banner(ids.length,null,true);
        await ack(ids);
      }else{
        banner(ids.length,()=>openLeads(ids,false),false);
      }
    }catch(e){
      try{console.warn('[S5.09 lead attention]',e&&e.message||e);}catch(_){}
    }finally{polling=false;}
  }
  function stop(){
    if(timer){clearInterval(timer);timer=null;}
    startedUid='';
    removeBanner();
  }
  function startForCurrentUser(){
    const u=authUser();
    if(!u||document.body.dataset.authStage!=='inside'){stop();return;}
    if(startedUid===u.uid)return;
    stop();
    startedUid=u.uid;
    const key='s509-login-poll:'+u.uid;
    let initial=true;
    try{initial=sessionStorage.getItem(key)!=='1';sessionStorage.setItem(key,'1');}catch(e){}
    poll(initial);
    timer=setInterval(()=>poll(false),30000);
  }
  setInterval(startForCurrentUser,700);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll(false);});
  window.addEventListener('focus',()=>poll(false));

  window.Orbit.advisorLeadAttentionS509=Object.freeze({VERSION,poll:()=>poll(false),status:()=>({version:VERSION,startedUid,polling})});
})();