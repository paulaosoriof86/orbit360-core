/* Gravicentra Insurance · Academia product catalog owner P0 · I6.5 B2.
   Composes approved static content with real hydrated catalog/progress.
   No automatic writes, no LAB seed, no browser Firestore mutation. */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var Orbit=window.Orbit;
  var VERSION='gravicentra-i65-b2-academia-product-catalog-20260923.1';
  var installed=false,storeRef=null,base=null,sessionProgress={};

  function text(v){return String(v==null?'':v).trim();}
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v&&typeof v==='object'?Object.assign({},v):v;}}
  function num(v,d){var n=Number(v);return Number.isFinite(n)?n:(d||0);}
  function catalog(){var c=Orbit.academiaProductCatalogV1;return c&&Array.isArray(c.courses)?c.courses:[];}
  function actorUid(){return text(Orbit.auth&&Orbit.auth.productUser&&Orbit.auth.productUser.uid);}
  function safeVisible(row){
    var blob='';try{blob=JSON.stringify(row);}catch(e){}
    return !/\bLAB\b|\bSHA\b|validator|release gate|release mechanics|bridge owner|seed writer|hardcod/i.test(blob);
  }
  function progressRows(){return base&&typeof base.all==='function'?(base.all('academyProgress')||[]):[];}
  function realCourses(){return base&&typeof base.all==='function'?(base.all('cursos')||[]):[];}
  function progressFor(id,row){
    var out={progreso:num(row&&(row.progreso!=null?row.progreso:row.avance),0),certificado:!!(row&&(row.certificado||row.completado))};
    var uid=actorUid();
    progressRows().forEach(function(p){
      var pUid=text(p&&(p.uid||p.userId)),courseId=text(p&&(p.courseId||p.cursoId));
      if(uid&&pUid&&pUid!==uid)return;
      if(courseId!==id)return;
      out.progreso=num(p.progreso!=null?p.progreso:(p.progress!=null?p.progress:p.avance),out.progreso);
      if(p.certificado!=null||p.completado!=null)out.certificado=!!(p.certificado||p.completado);
    });
    var local=sessionProgress[id]||{};
    if(local.progreso!=null||local.avance!=null)out.progreso=num(local.progreso!=null?local.progreso:local.avance,out.progreso);
    if(local.certificado!=null||local.completado!=null)out.certificado=!!(local.certificado||local.completado);
    out.progreso=Math.max(0,Math.min(100,out.progreso));
    return out;
  }
  function composed(){
    var map={},order=[];
    catalog().forEach(function(row){var id=text(row&&row.id);if(!id)return;map[id]=clone(row);order.push(id);});
    realCourses().filter(safeVisible).forEach(function(row){
      var id=text(row&&row.id);if(!id)return;
      map[id]=Object.assign({},map[id]||{},clone(row));
      if(order.indexOf(id)<0)order.push(id);
    });
    return order.map(function(id){
      var row=map[id],p=progressFor(id,row);
      return Object.assign({},clone(row),{progreso:p.progreso,certificado:p.certificado});
    }).filter(Boolean);
  }
  function getCourse(id){return composed().find(function(row){return text(row&&row.id)===text(id);})||null;}
  function progressOnly(patch){
    var allowed=['progreso','avance','certificado','completado','ultimaLeccion','fechaCertificacion','updatedByUserAt'];
    var keys=Object.keys(patch||{});
    return keys.length>0&&keys.every(function(k){return allowed.indexOf(k)>=0;});
  }
  function status(){
    return {
      version:VERSION,ready:installed===true,automaticWrites:false,seed:false,lab:false,
      staticCourseCount:catalog().length,realCourseCount:realCourses().filter(safeVisible).length,
      progressRowsRead:progressRows().length,catalogManagementDurable:false,
      progressPersistence:'existing_durable_read_plus_session_overlay',
      requiredCoursesPresent:!!getCourse('cur_p_clientes')&&!!getCourse('cur_p_aseg_cotiz')
    };
  }
  function install(store){
    if(installed&&store===storeRef)return status();
    if(!store||store.__productOperationalWriteP0!==true||typeof store.all!=='function'||typeof store.get!=='function')throw new Error('ACADEMIA_PRODUCT_STORE_REQUIRED');
    storeRef=store;
    base={
      all:store.all.bind(store),get:store.get.bind(store),
      where:store.where&&store.where.bind(store),find:store.find&&store.find.bind(store),
      insert:store.insert&&store.insert.bind(store),update:store.update&&store.update.bind(store),
      remove:store.remove&&store.remove.bind(store)
    };
    var all0=base.all,get0=base.get,where0=base.where,find0=base.find,insert0=base.insert,update0=base.update,remove0=base.remove;
    store.all=function(collection){return collection==='cursos'?composed().map(clone):all0(collection);};
    store.get=function(collection,id){return collection==='cursos'?clone(getCourse(id)):get0(collection,id);};
    store.where=function(collection,fieldOrPredicate,opOrValue,maybeValue){
      if(collection!=='cursos')return where0.apply(null,arguments);
      var rows=composed(),matches;
      if(typeof fieldOrPredicate==='function')matches=rows.filter(fieldOrPredicate);
      else if(fieldOrPredicate&&typeof fieldOrPredicate==='object')matches=rows.filter(function(row){return Object.keys(fieldOrPredicate).every(function(k){return row[k]===fieldOrPredicate[k];});});
      else{
        var field=fieldOrPredicate,op=arguments.length>=4?opOrValue:'==',value=arguments.length>=4?maybeValue:opOrValue;
        matches=rows.filter(function(row){if(op==='=='||op==='=')return row[field]===value;if(op==='!=')return row[field]!==value;return false;});
      }
      return matches.map(clone);
    };
    store.find=function(collection,predicate){
      if(collection!=='cursos')return find0(collection,predicate);
      var rows=composed(),row=typeof predicate==='function'?rows.find(predicate):(predicate&&typeof predicate==='object'?rows.find(function(x){return Object.keys(predicate).every(function(k){return x[k]===predicate[k];});}):null);
      return row?clone(row):null;
    };
    store.update=function(collection,id,patch){
      if(collection!=='cursos')return update0(collection,id,patch);
      if(!progressOnly(patch))throw new Error('ACADEMIA_PRODUCT_CATALOG_READ_ONLY');
      if(!getCourse(id))throw new Error('ACADEMIA_PRODUCT_COURSE_NOT_FOUND');
      sessionProgress[text(id)]=Object.assign({},sessionProgress[text(id)]||{},clone(patch)||{});
      if(typeof store._emit==='function')store._emit('cursos');
      return clone(getCourse(id));
    };
    store.insert=function(collection,payload){if(collection==='cursos')throw new Error('ACADEMIA_PRODUCT_CATALOG_READ_ONLY');return insert0(collection,payload);};
    store.remove=function(collection,id){if(collection==='cursos')throw new Error('ACADEMIA_PRODUCT_CATALOG_READ_ONLY');return remove0(collection,id);};
    installed=true;
    var st=status();
    if(!st.requiredCoursesPresent||st.staticCourseCount<2||st.automaticWrites!==false)throw new Error('ACADEMIA_PRODUCT_CATALOG_NOT_READY');
    try{window.dispatchEvent(new CustomEvent('orbit:academia:catalog-ready',{detail:st}));}catch(e){}
    return st;
  }
  Orbit.academiaProductCatalogP0=Object.freeze({VERSION:VERSION,install:install,status:status,automaticWrites:false,failClosed:true});
})();
