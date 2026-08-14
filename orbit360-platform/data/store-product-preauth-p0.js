/* Orbit 360 · Product pre-auth store P0 · fail-closed, no persistence, no fallback */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var WRITE_ERROR='WRITE_BLOCKED_PRODUCT_PREAUTH_P0';
  var listeners=[];
  function blocked(){var e=new Error(WRITE_ERROR);e.code=WRITE_ERROR;throw e;}
  function emit(c){listeners.slice().forEach(function(fn){try{fn(c||'*');}catch(_e){}});}
  var api={
    all:function(){return[];},
    get:function(){return null;},
    where:function(){return[];},
    find:function(){return null;},
    insert:blocked,update:blocked,remove:blocked,reseed:blocked,setPref:blocked,
    init:function(){return api;},
    pref:function(_key,def){return def===undefined?null:def;},
    raw:function(){return{__backend:{mode:'product-preauth',ready:false,noFallback:true,writeEnabled:false}};},
    on:function(collection,callback){if(typeof collection==='function'){callback=collection;}if(typeof callback!=='function')return function(){};listeners.push(callback);return function(){listeners=listeners.filter(function(x){return x!==callback;});};},
    subscribe:function(collection,callback){return api.on(collection,callback);},
    _subscribe:function(collection,callback){return api.on(collection,callback);},
    _emit:emit,
    _productStatus:function(){return{mode:'product-preauth',status:'waiting-auth',ready:false,noFallback:true,writeEnabled:false,attachedCollections:[],deniedCollections:[]};},
    __productPreAuthP0:true
  };
  window.Orbit.store=api;
})();
