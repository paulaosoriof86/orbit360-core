/* Gravicentra Insurance · Product operational write facade P0 · Iteration 2 · 2026-09-01
   Read authority remains store-firestore-product-readonly-p0.
   Writes are a separate fail-closed facade over authenticated Firestore membership.
   No LAB mode, URL tenant, seed, localStorage or silent fallback. */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var VERSION='fase-a-i2-product-operational-write-20260901.1';
  var base=null, facade=null, provider=null, paths=null, installed=false;
  var listeners=[], pending={}, deleted={}, prefOverlay={};
  var state={ready:false,failClosed:true,pending:0,committed:0,failed:0,lastError:'',lastCommittedAt:'',tenantId:'',version:VERSION};

  var SURFACE=Object.freeze({
    clientes:'cliente360',
    aseguradoras:'aseguradoras',
    polizas:'polizas',
    vehiculos:'polizas',
    recibosEsperados:'polizas',
    carteraPrimas:'polizas',
    cobros:'cobros',
    negocios:'leads',
    gestiones:'ops',
    reclamos:'siniestros',
    cancelaciones:'cancelaciones',
    comisiones:'comisiones',
    actividades:'cliente360'
  });

  function text(v){return String(v==null?'':v).trim();}
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v&&typeof v==='object'?Object.assign({},v):v;}}
  function idOf(row){return row&&(row.id||row.uid||row.codigo||row.numero||row.key);}
  function error(code){var e=new Error(code);e.code=code;state.lastError=code;throw e;}
  function member(){
    var m=Orbit.auth&&Orbit.auth.productUser;
    if(!m||m.productReadOnly!==true||!text(m.uid)||!text(m.tenantId)||!Array.isArray(m.roles)||!m.roles.length||m.roles.indexOf(m.activeRole)<0)error('PRODUCT_WRITE_MEMBERSHIP_REQUIRED');
    return m;
  }
  function moduleFor(collection){
    var moduleKey=SURFACE[collection];
    if(!moduleKey)error('PRODUCT_WRITE_COLLECTION_NOT_AUTHORIZED');
    return moduleKey;
  }
  function sensitiveInsurerPatch(collection,payload){
    if(collection!=='aseguradoras'||!payload||typeof payload!=='object')return false;
    return Object.keys(payload).some(function(k){return /(pass(word)?|contrasena|contraseña|secret|token|credential|credencial|username|usuario|login)/i.test(k);});
  }
  function authorize(collection,action,row){
    var moduleKey=moduleFor(collection);
    if(sensitiveInsurerPatch(collection,row))error('PRODUCT_WRITE_SECURE_INSURER_OWNER_REQUIRED');
    if(!Orbit.access||typeof Orbit.access.can!=='function')error('PRODUCT_WRITE_ACCESS_OWNER_MISSING');
    var accessAction=action==='insert'?'create':'edit';
    if(Orbit.access.can(moduleKey,accessAction)!==true)error('PRODUCT_WRITE_ACCESS_DENIED');
    if(row&&typeof Orbit.access.canAccessRecord==='function'&&Orbit.access.canAccessRecord(row,moduleKey,{collection:collection})!==true)error('PRODUCT_WRITE_RECORD_SCOPE_DENIED');
    return true;
  }
  function emit(collection){
    listeners.slice().forEach(function(fn){try{fn(collection||'*');}catch(e){}});
    try{document.dispatchEvent(new CustomEvent('orbit:store',{detail:{collection:collection||'*',operationalWrite:true}}));}catch(e){}
  }
  function pendingBucket(collection){return pending[collection]||(pending[collection]={});}
  function deletedBucket(collection){return deleted[collection]||(deleted[collection]={});}
  function reconcile(collection){
    var cols=collection&&collection!=='*'?[collection]:Object.keys(pending);
    cols.forEach(function(c){
      var rows=base.all(c)||[], ids={};rows.forEach(function(r){var id=text(idOf(r));if(id)ids[id]=r;});
      Object.keys(pending[c]||{}).forEach(function(id){if(ids[id])delete pending[c][id];});
      Object.keys(deleted[c]||{}).forEach(function(id){if(!ids[id])delete deleted[c][id];});
    });
  }
  function mergedAll(collection){
    var map={};
    (base.all(collection)||[]).forEach(function(row){var id=text(idOf(row));if(id)map[id]=clone(row);});
    Object.keys(pending[collection]||{}).forEach(function(id){map[id]=clone(pending[collection][id]);});
    Object.keys(deleted[collection]||{}).forEach(function(id){delete map[id];});
    return Object.keys(map).map(function(id){return map[id];});
  }
  function get(collection,id){
    id=text(id);
    if((deleted[collection]||{})[id])return null;
    if((pending[collection]||{})[id])return clone(pending[collection][id]);
    return base.get(collection,id);
  }
  function where(collection,fieldOrPredicate,opOrValue,maybeValue){
    var rows=mergedAll(collection);
    if(typeof fieldOrPredicate==='function')return rows.filter(fieldOrPredicate).map(clone);
    if(fieldOrPredicate&&typeof fieldOrPredicate==='object')return rows.filter(function(row){return Object.keys(fieldOrPredicate).every(function(k){return row&&row[k]===fieldOrPredicate[k];});}).map(clone);
    var op=arguments.length>=4?opOrValue:'==', value=arguments.length>=4?maybeValue:opOrValue, field=fieldOrPredicate;
    return rows.filter(function(row){if(!row)return false;if(op==='=='||op==='=')return row[field]===value;if(op==='!=')return row[field]!==value;if(op==='>')return row[field]>value;if(op==='>=')return row[field]>=value;if(op==='<')return row[field]<value;if(op==='<=')return row[field]<=value;if(op==='array-contains')return Array.isArray(row[field])&&row[field].indexOf(value)>=0;return false;}).map(clone);
  }
  function find(collection,predicate){var rows=typeof predicate==='function'?mergedAll(collection).filter(predicate):where(collection,predicate);return rows.length?clone(rows[0]):null;}
  function durable(action,collection,id,payload){
    var m=member(), p=provider, canonical=paths;
    state.pending+=1;state.tenantId=text(m.tenantId);state.lastError='';
    return p.initialize().then(function(ctx){
      if(!ctx||!ctx.auth||!ctx.auth.currentUser||text(ctx.auth.currentUser.uid)!==text(m.uid))throw new Error('PRODUCT_WRITE_AUTH_CONTEXT_MISMATCH');
      if(!canonical||typeof canonical.dataCollectionPath!=='function')throw new Error('PRODUCT_WRITE_CANONICAL_PATH_OWNER_MISSING');
      var path=canonical.dataCollectionPath(m.tenantId,collection);
      if(!path)throw new Error('PRODUCT_WRITE_CANONICAL_PATH_INVALID');
      var ref=ctx.modules.store.doc(ctx.db,path+'/'+id);
      if(action==='remove')return ctx.modules.store.deleteDoc(ref);
      return ctx.modules.store.setDoc(ref,clone(payload),{merge:action==='update'});
    }).then(function(){
      state.pending=Math.max(0,state.pending-1);state.committed+=1;state.lastCommittedAt=new Date().toISOString();state.lastError='';
      try{window.dispatchEvent(new CustomEvent('orbit:operational-write:committed',{detail:{collection:collection,id:id,action:action,version:VERSION}}));}catch(e){}
      return true;
    }).catch(function(e){
      state.pending=Math.max(0,state.pending-1);state.failed+=1;state.lastError=text(e&&e.message||e)||'PRODUCT_WRITE_FAILED';
      delete (pending[collection]||{})[id];delete (deleted[collection]||{})[id];emit(collection);
      try{window.dispatchEvent(new CustomEvent('orbit:operational-write:failed',{detail:{collection:collection,id:id,action:action,error:state.lastError,version:VERSION}}));}catch(_e){}
      throw e;
    });
  }
  function insert(collection,payload){
    var row=clone(payload)||{}, m=member();
    if(!row.id)row.id=collection+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    row.tenantId=text(m.tenantId);row.createdAt=row.createdAt||new Date().toISOString();row.updatedAt=new Date().toISOString();row.ownerUid=row.ownerUid||text(m.uid);row.ownerEmail=row.ownerEmail||text(m.email);
    authorize(collection,'insert',row);
    pendingBucket(collection)[row.id]=clone(row);delete deletedBucket(collection)[row.id];emit(collection);
    durable('insert',collection,row.id,row).catch(function(){});
    return clone(row);
  }
  function update(collection,id,patch){
    id=text(id);if(!id)error('PRODUCT_WRITE_ID_REQUIRED');
    var prior=get(collection,id);if(!prior)error('PRODUCT_WRITE_RECORD_NOT_FOUND');
    var m=member(), row=Object.assign({},prior,clone(patch)||{},{id:id,tenantId:text(m.tenantId),updatedAt:new Date().toISOString(),updatedByUid:text(m.uid),updatedByEmail:text(m.email)});
    authorize(collection,'update',row);
    pendingBucket(collection)[id]=clone(row);delete deletedBucket(collection)[id];emit(collection);
    durable('update',collection,id,row).catch(function(){});
    return clone(row);
  }
  function remove(collection,id){
    id=text(id);if(!id)error('PRODUCT_WRITE_ID_REQUIRED');
    var prior=get(collection,id);if(!prior)error('PRODUCT_WRITE_RECORD_NOT_FOUND');
    authorize(collection,'remove',prior);
    deletedBucket(collection)[id]=true;delete pendingBucket(collection)[id];emit(collection);
    durable('remove',collection,id,null).catch(function(){});
    return true;
  }
  function status(){
    var bs=base&&typeof base._productStatus==='function'?base._productStatus():{};
    return Object.assign({},state,{ready:installed===true&&bs.ready===true&&bs.status==='ready-read-only',readAuthority:'store-firestore-product-readonly-p0',writeAuthority:'product-operational-write-p0',writeTransport:'firebase-firestore-membership',urlTenantAllowed:false,labModeAllowed:false,seedFallback:false,localStorageBusinessPersistence:false});
  }
  function install(readStore){
    if(installed)return status();
    if(!readStore||readStore.__productReadOnlyP0!==true||typeof readStore._productStatus!=='function')error('PRODUCT_WRITE_READ_AUTHORITY_INVALID');
    var bs=readStore._productStatus();
    if(bs.ready!==true||bs.status!=='ready-read-only'||bs.noFallback!==true||bs.writeEnabled!==false)error('PRODUCT_WRITE_READ_AUTHORITY_NOT_READY');
    provider=Orbit.productRuntimeBrowserProvidersP0;paths=Orbit.tenantCanonicalPathsP0;
    if(!provider||typeof provider.initialize!=='function')error('PRODUCT_WRITE_PROVIDER_MISSING');
    member();
    base=readStore;
    if(typeof base.on==='function')base.on('*',function(changed){reconcile(changed);emit(changed);});
    facade={
      all:mergedAll,get:get,where:where,find:find,insert:insert,update:update,remove:remove,
      on:function(collection,callback){if(typeof collection==='function'){callback=collection;}if(typeof callback!=='function')return function(){};listeners.push(callback);return function(){listeners=listeners.filter(function(x){return x!==callback;});};},
      subscribe:function(collection,callback){return facade.on(collection,callback);},
      _subscribe:function(collection,callback){return facade.on(collection,callback);},
      _emit:emit,
      pref:function(k,def){return Object.prototype.hasOwnProperty.call(prefOverlay,k)?clone(prefOverlay[k]):(base.pref?base.pref(k,def):def);},
      setPref:function(k,v){prefOverlay[k]=clone(v);return clone(v);},
      init:function(){return facade;},
      reseed:function(){return error('PRODUCT_WRITE_RESEED_FORBIDDEN');},
      raw:function(){var out=base.raw?base.raw():{};out.__operationalWrite=status();return out;},
      _productStatus:function(){var out=base._productStatus();out.operationalWriteAdapter=true;out.operationalWriteReady=true;return out;},
      _operationalWriteStatus:status,
      _detachSnapshots:base._detachSnapshots?base._detachSnapshots.bind(base):function(){},
      __productReadOnlyP0:true,
      __productOperationalWriteP0:true
    };
    Orbit.store=facade;installed=true;state.ready=true;state.tenantId=text(member().tenantId);state.lastError='';
    try{window.dispatchEvent(new CustomEvent('orbit:operational-write:ready',{detail:status()}));}catch(e){}
    return status();
  }
  window.Orbit.productOperationalWriteP0=Object.freeze({VERSION:VERSION,install:install,status:status,failClosed:true,noFallback:true,urlTenantAllowed:false,labModeAllowed:false});
})();
