(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var timer=null;
  var relevant={
    cliente360:['clientes','asesores','polizas','cobros','vehiculos'],
    aseguradoras:['aseguradoras','asesores']
  };

  function currentRoute(){
    var hash=String(location.hash||'');
    if(hash.indexOf('#/cliente360')===0&&!/[?&]c=/.test(hash))return 'cliente360';
    if(hash.indexOf('#/aseguradoras')===0&&!/[?&]ficha=/.test(hash))return 'aseguradoras';
    return '';
  }

  function rerender(collection){
    var route=currentRoute();
    if(!route)return;
    if(collection&&collection!=='*'&&relevant[route].indexOf(collection)<0)return;
    if(timer)clearTimeout(timer);
    timer=setTimeout(function(){
      var mod=Orbit.modules&&Orbit.modules[route];
      var host=document.getElementById('host');
      if(mod&&typeof mod.render==='function'&&host)mod.render(host);
    },80);
  }

  window.addEventListener('orbit:store:emit',function(event){
    rerender(event&&event.detail&&event.detail.collection||'*');
  });
  window.addEventListener('orbit:backend:write-ok',function(event){
    rerender(event&&event.detail&&event.detail.collection||'*');
  });
  Orbit.storeViewRefreshV20260715={rerender:rerender,currentRoute:currentRoute};
})();