/* Orbit 360 · Academia static content write policy · LAB only */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var Orbit=window.Orbit;
  var VERSION='20260729.1';
  var transientByCollection={};
  var recent=[];
  var installed=false;
  var reapplying=false;

  function clone(value){
    if(!value||typeof value!=='object')return value;
    try{return JSON.parse(JSON.stringify(value));}catch(e){return Object.assign({},value);}
  }
  function rowId(row){return row&&(row.id||row.uid||row.codigo||row.numero||row.key)||'';}
  function hasVersionMarker(value){
    if(!value||typeof value!=='object')return false;
    return Object.keys(value).some(function(key){
      if(!/^_(?:cv|.*v)$/i.test(key))return false;
      var marker=value[key];
      return marker!==undefined&&marker!==null&&String(marker).trim()!=='';
    });
  }
  function hasAny(value,keys){return !!(value&&typeof value==='object'&&keys.some(function(key){return Object.prototype.hasOwnProperty.call(value,key);}));}
  function classify(operation,collection,id,payload){
    var op=String(operation||'').toLowerCase();
    var col=String(collection||'').toLowerCase();
    var key=String(id||rowId(payload)||'');
    var patch=payload&&typeof payload==='object'?payload:{};
    if(op==='remove')return {mode:'durable_operational',reason:'removal_requires_explicit_persistence'};
    if(col==='cursos'){
      var staticCourseId=/^(cur_|curso_base_|academia_)/i.test(key);
      var contentShape=hasAny(patch,['titulo','cat','emoji','color','desc','destinatarios','recursos','metaLeccion','lecciones']);
      if(staticCourseId&&hasVersionMarker(patch)&&contentShape)return {mode:'transient_static_content',reason:'versioned_static_course'};
    }
    if(col==='lecciones'||col==='evaluaciones'){
      var staticLessonId=/^(m\d|m1|eval_|lesson_|leccion_|academia_)/i.test(key);
      var lessonShape=hasAny(patch,['titulo','rol','secciones','preguntas','obligatoria','tipo','min']);
      if((staticLessonId||hasVersionMarker(patch))&&lessonShape)return {mode:'transient_static_content',reason:'versioned_static_'+col};
    }
    if(col==='config'&&key==='academia'&&Object.keys(patch).some(function(name){return /^contenido[A-Z0-9_]/i.test(name);})){
      return {mode:'transient_static_content',reason:'static_academia_content_version'};
    }
    return {mode:'durable_operational',reason:'user_or_operational_mutation'};
  }
  function preserveUserState(existing,staticRow){
    var merged=Object.assign({},existing||{},staticRow||{});
    ['progreso','certificado','completado','avance','fechaCertificacion','ultimaLeccion','updatedByUserAt'].forEach(function(key){
      if(existing&&Object.prototype.hasOwnProperty.call(existing,key))merged[key]=existing[key];
    });
    return merged;
  }
  function remember(collection,row,operation,reason){
    var col=String(collection||'');
    var id=String(rowId(row)||'');
    transientByCollection[col]=transientByCollection[col]||{};
    transientByCollection[col][id]=clone(row);
    recent.push({collection:col,operation:String(operation||''),reason:String(reason||'')});
    if(recent.length>100)recent=recent.slice(-100);
  }
  function upsertTransient(store,collection,id,payload,operation,reason){
    var rows=store.all(collection)||[];
    var key=String(id||rowId(payload)||'');
    var idx=rows.findIndex(function(row){return String(rowId(row))===key;});
    var current=idx>=0?rows[idx]:null;
    var next=operation==='update'?Object.assign({},current||{id:key},clone(payload)||{}):clone(payload)||{};
    if(!next.id)next.id=key;
    next=preserveUserState(current,next);
    if(idx>=0)rows[idx]=next;else rows.push(next);
    remember(collection,next,operation,reason);
    try{if(store._emit)store._emit(collection);}catch(e){}
    return next;
  }
  function reapplyCollection(store,collection){
    if(reapplying||!transientByCollection[collection])return;
    reapplying=true;
    try{
      var rows=store.all(collection)||[];
      Object.keys(transientByCollection[collection]).forEach(function(id){
        var idx=rows.findIndex(function(row){return String(rowId(row))===String(id);});
        var staticRow=transientByCollection[collection][id];
        if(idx>=0)rows[idx]=preserveUserState(rows[idx],staticRow);else rows.push(clone(staticRow));
      });
    }finally{reapplying=false;}
  }
  function install(){
    var store=Orbit.store;
    if(!store||store.__firestoreLabExplicit!==true||typeof store.insert!=='function'||typeof store.update!=='function')return false;
    if(store.__academiaStaticWritePolicyVersion===VERSION)return true;
    var originalInsert=store.insert.bind(store);
    var originalUpdate=store.update.bind(store);
    var originalRemove=store.remove&&store.remove.bind(store);
    store._writePolicy=classify;
    store.insert=function(collection,payload){
      var id=String(rowId(payload)||'');
      var policy=classify('insert',collection,id,payload);
      if(policy.mode==='transient_static_content')return upsertTransient(store,collection,id,payload,'insert',policy.reason);
      return originalInsert(collection,payload);
    };
    store.update=function(collection,id,patch){
      var policy=classify('update',collection,id,patch);
      if(policy.mode==='transient_static_content')return upsertTransient(store,collection,id,patch,'update',policy.reason);
      return originalUpdate(collection,id,patch);
    };
    if(originalRemove)store.remove=function(collection,id){return originalRemove(collection,id);};
    store._transientStaticStatus=function(){
      return {version:VERSION,installed:true,total:recent.length,collections:Object.keys(transientByCollection).sort(),recent:recent.slice(-20)};
    };
    store.__academiaStaticWritePolicyVersion=VERSION;
    if(typeof store.on==='function')store.on('*',function(collection){
      if(collection&&collection!=='*')reapplyCollection(store,collection);
      else Object.keys(transientByCollection).forEach(function(col){reapplyCollection(store,col);});
    });
    installed=true;
    Orbit.academiaStaticContentWritePolicy={version:VERSION,installed:true,classify:classify,status:store._transientStaticStatus};
    try{document.dispatchEvent(new CustomEvent('orbit:academia-static-write-policy',{detail:{version:VERSION,installed:true}}));}catch(e){}
    return true;
  }
  Orbit.academiaStaticContentWritePolicy={version:VERSION,installed:false,classify:classify,install:install,status:function(){return {version:VERSION,installed:installed,total:recent.length};}};
  var attempts=0;(function waitForStore(){if(install())return;if(attempts++<400)setTimeout(waitForStore,5);}());
}());
