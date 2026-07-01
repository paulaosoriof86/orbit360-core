/* ============================================================
   CXOrbia · Deduplicación (llave natural estable)
   CRÍTICO para la doble vía HR↔plataforma: NUNCA deduplicar por
   campos mutables (fecha, estado, shopper) porque al agendar/asignar
   cambian y la fila "parece nueva" → duplicado. La identidad de una
   visita es inmutable: ref/extId, o sucursal+ciudad+escenario+quincena.
   ============================================================ */
window.CX = window.CX || {};

CX.dedupe = {
  _norm(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim(); },

  /* id externo de fila (ref/extId) si existe */
  idKey(o){ const e=o&&(o.extId||o.ref); return e?('id:'+this._norm(e)):null; },
  /* llave compuesta de campos INMUTABLES */
  natKey(o){ if(!o)return ''; return 'n:'+[o.sucursal,o.ciudad,o.escenario,o.quincena].map(x=>this._norm(x)).join('|'); },
  /* llave principal (compatibilidad): id si hay, si no natural */
  key(o){ return this.idKey(o)||this.natKey(o); },

  /* índice de visitas existentes del proyecto bajo AMBAS llaves */
  indexProject(pid){
    pid = pid || CX.data.currentProjectId;
    const idx={};
    (CX.data._visitas||[]).filter(v=>v.projectId===pid).forEach(v=>{
      const ik=this.idKey(v); if(ik) idx[ik]=v;
      idx[this.natKey(v)]=v;
    });
    return idx;
  },

  /* ¿ya existe una visita para esta fila? prueba id externo y llave natural */
  match(row, pid){ const idx=this.indexProject(pid); return (this.idKey(row)&&idx[this.idKey(row)]) || idx[this.natKey(row)] || null; },
};
