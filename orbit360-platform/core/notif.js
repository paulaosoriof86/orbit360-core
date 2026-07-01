/* ============================================================
   CXOrbia · Notificaciones (centro de eventos)
   Una sola fuente que alimenta Mi Día, Tablón/Drill y badges,
   tanto para admin como para shopper. Bidireccional:
   el equipo pide acciones al shopper y gestiona lo que el shopper pide.
   ============================================================ */
window.CX = window.CX || {};

CX.notif = {
  _items: [
    {id:'n1', to:'admin',   tipo:'postulacion', icon:'📩', tono:'b', titulo:'Nueva postulación', txt:'Evaluador 02 se postuló a Sucursal 03', fecha:'hace 12 min', leida:false, nav:'postulaciones'},
    {id:'n2', to:'admin',   tipo:'reprog',      icon:'🔄', tono:'a', titulo:'Solicitud de reprogramación', txt:'Evaluador 05 pide nueva fecha', fecha:'hace 1 h', leida:false, nav:'postulaciones'},
    {id:'n3', to:'admin',   tipo:'realizada',   icon:'✅', tono:'g', titulo:'Visita realizada', txt:'Evaluador 01 marcó realizada · validar cuestionario', fecha:'hace 3 h', leida:false, nav:'postulaciones'},
    {id:'n4', to:'shopper', tipo:'aprobada',    icon:'✅', tono:'g', titulo:'Postulación aprobada', txt:'Tu visita a Sucursal 03 fue aprobada', fecha:'hace 20 min', leida:false, nav:'misvisitas'},
    {id:'n5', to:'shopper', tipo:'pide_fecha',  icon:'📅', tono:'a', titulo:'El equipo pide confirmar fecha', txt:'Confirma o propone fecha para Sucursal 07', fecha:'hace 40 min', leida:false, nav:'misvisitas', accion:'confirmar_fecha'},
    {id:'n6', to:'shopper', tipo:'pago',        icon:'💰', tono:'g', titulo:'Liquidación actualizada', txt:'Tu pago de Sucursal 06 pasó a "pagada"', fecha:'ayer', leida:true, nav:'beneficios'},
  ],

  for(role){ return this._items.filter(n=>n.to===role); },
  unread(role){ return this.for(role).filter(n=>!n.leida).length; },

  push(n){
    this._items.unshift(Object.assign({id:'n'+Date.now().toString(36), fecha:'ahora', leida:false}, n));
    CX.bus && CX.bus.emit('notif');
  },
  markRead(id){ const n=this._items.find(x=>x.id===id); if(n)n.leida=true; CX.bus&&CX.bus.emit('notif'); },
  markAllRead(role){ this.for(role).forEach(n=>n.leida=true); CX.bus&&CX.bus.emit('notif'); },

  toneVar(t){ return {r:'red',a:'amber',g:'green',b:'brand',p:'purple'}[t]||'brand'; },
};
