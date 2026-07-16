(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var detailsId='asg-knowledge-details-v20260715';
  var timer=null;

  function params(){
    var hash=String(location.hash||'');
    var i=hash.indexOf('?');
    try{return new URLSearchParams(i>=0?hash.slice(i+1):'');}
    catch(e){return new URLSearchParams('');}
  }

  function apply(){
    if(String(location.hash||'').indexOf('#/aseguradoras')!==0)return false;
    var page=document.querySelector('#host .page.asg197');
    var panel=document.getElementById('asg-knowledge-p09f');
    if(!page||!panel)return false;

    if(params().get('ficha')){
      panel.style.display='none';
      return true;
    }

    panel.style.display='';
    var details=document.getElementById(detailsId);
    if(!details){
      details=document.createElement('details');
      details.id=detailsId;
      details.className='card pad';
      details.style.marginTop='16px';
      details.innerHTML='<summary style="cursor:pointer;font-weight:800">Gestión documental y tarifas <span class="muted" style="font-weight:400">· fuentes, reglas, lotes e historial</span></summary><div data-body style="margin-top:12px"></div>';
    }
    var body=details.querySelector('[data-body]');
    if(body&&!body.contains(panel))body.appendChild(panel);
    var grid=page.querySelector('.asg197-grid');
    if(grid&&grid.parentNode)grid.insertAdjacentElement('afterend',details);
    else if(!details.parentNode)page.appendChild(details);
    return true;
  }

  function schedule(){
    if(timer)clearTimeout(timer);
    timer=setTimeout(function retry(n){
      if(apply()||n>=20)return;
      timer=setTimeout(function(){retry(n+1);},120);
    }.bind(null,0),0);
  }

  window.addEventListener('hashchange',schedule);
  window.addEventListener('orbit:aseguradoras:knowledge-ready',schedule);
  document.addEventListener('orbit:store',schedule);
  if(window.MutationObserver){
    var host=document.getElementById('host');
    if(host)new MutationObserver(schedule).observe(host,{childList:true,subtree:true});
  }
  Orbit.aseguradorasDirectoryPriorityV20260715={apply:apply,schedule:schedule};
  schedule();
})();