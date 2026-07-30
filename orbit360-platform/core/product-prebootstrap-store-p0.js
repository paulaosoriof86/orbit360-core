/* ============================================================
   Orbit 360 · Product prebootstrap store P0
   Volatile only. No localStorage, no backend, no fallback.
   Allows only explicitly marked static Academia content before
   the authenticated product store is installed.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var db = { cursos: [] };
  var listeners = [];
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
  function rows(c){return (db[c]||[]);}
  function emit(c){listeners.slice().forEach(function(fn){try{fn(c||'*');}catch(e){}});}
  function blocked(){var e=new Error('PRODUCT_PREBOOTSTRAP_WRITE_BLOCKED');e.code='PRODUCT_PREBOOTSTRAP_WRITE_BLOCKED';throw e;}
  function staticCourse(row){return !!(row && row._staticCourse===true && Number.isFinite(Number(row._cv)) && String(row.id||'').indexOf('cur_')===0);}
  var api={
    all:function(c){return rows(c).map(clone);},
    get:function(c,id){return api.all(c).find(function(r){return r&&r.id===id;})||null;},
    where:function(c,fn){return typeof fn==='function'?api.all(c).filter(fn):[];},
    find:function(c,fn){return typeof fn==='function'?(api.all(c).find(fn)||null):null;},
    insert:function(c,row){if(c!=='cursos'||!staticCourse(row))return blocked();db.cursos.push(clone(row));emit('cursos');return clone(row);},
    update:blocked,
    remove:blocked,
    setPref:blocked,
    reseed:blocked,
    init:function(){return api;},
    pref:function(_key,def){return def===undefined?null:def;},
    on:function(fn){listeners.push(fn);return function(){listeners=listeners.filter(function(x){return x!==fn;});};},
    _emit:emit,
    raw:function(){return {cursos:api.all('cursos'),__backend:{mode:'product-prebootstrap',noFallback:true,writeEnabled:false,volatile:true}};},
    _exportStaticCourses:function(){return api.all('cursos');},
    __productPrebootstrapP0:true
  };
  window.Orbit.store=api;
  window.Orbit.SEED=window.Orbit.SEED||{__v:'product-runtime',cursos:[]};
})();
