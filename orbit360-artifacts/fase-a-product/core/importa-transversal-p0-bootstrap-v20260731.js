/* ============================================================
   Orbit 360 · Bootstrap transversal importadores P0
   Fecha: 2026-08-01

   Hace activos los owners P0 reutilizables sin tocar core/importa.js.
   Carga normalizadores -> conciliación -> evidencia temporal ->
   matriz multievidencia -> cola controlada -> paquete autorización ->
   materialización privada -> identidad/upsert -> wires -> writer ->
   dry-run wire, en orden determinista.
   ============================================================ */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  if(Orbit.__importaTransversalP0BootstrapV20260731)return;
  Orbit.__importaTransversalP0BootstrapV20260731=true;

  const VERSION='20260801.6';
  const scripts=[
    'core/importa-clientes-p0.js',
    'core/importa-polizas-p0.js',
    'core/importa-cartera-p0.js',
    'core/importa-cobros-conciliacion-p0.js',
    'core/importa-cobros-evidencia-temporal-p0.js',
    'core/importa-cobros-matriz-multievidencia-p0.js',
    'core/cobros-proposal-queue-p0.js',
    'core/cobros-authorization-package-p0.js',
    'core/cobros-private-authorization-materializer-p0.js',
    'core/importer-controlled-write-contract-v20260721.js',
    'core/importa-identity-upsert-v20260731.js',
    'core/importa-clientes-p0-wire.js',
    'core/importa-polizas-p0-wire.js',
    'core/importa-cartera-p0-wire.js',
    'core/importa-write-p0.js',
    'core/importa-identity-dryrun-wire-v20260731.js',
    'core/importa-identity-writer-wire-v20260731.js',
    'core/importa-dryrun-p0-wire.js'
  ];

  function loaded(src){
    try{return !!document.querySelector('script[data-orbit-p0-owner="'+src+'"]');}
    catch(e){return false;}
  }
  function markup(src){return '<script data-orbit-p0-owner="'+src+'" src="'+src+'?v='+VERSION+'"><\/script>';}
  function loadSequential(index){
    if(index>=scripts.length){
      Orbit.__importaTransversalP0Ready=true;
      try{
        if(Orbit.importaCobrosConciliacionP0&&Orbit.importaCobrosConciliacionP0.patchDryRunContracts)Orbit.importaCobrosConciliacionP0.patchDryRunContracts();
        document.dispatchEvent(new CustomEvent('orbit:importa-p0-ready',{detail:{version:VERSION}}));
      }catch(e){}
      return;
    }
    const src=scripts[index];
    if(loaded(src))return loadSequential(index+1);
    const script=document.createElement('script');
    script.src=src+'?v='+VERSION;
    script.dataset.orbitP0Owner=src;
    script.onload=()=>loadSequential(index+1);
    script.onerror=()=>{Orbit.__importaTransversalP0LoadError=src;};
    (document.head||document.documentElement).appendChild(script);
  }

  if(typeof document==='undefined')return;
  if(document.readyState==='loading'&&typeof document.write==='function'){
    scripts.forEach(function(src){if(!loaded(src))document.write(markup(src));});
    Orbit.__importaTransversalP0Ready=true;
  }else loadSequential(0);

  Orbit.importaTransversalP0Bootstrap=Object.freeze({VERSION,scripts:scripts.slice()});
})();
