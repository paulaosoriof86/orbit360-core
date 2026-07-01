/* ============================================================
   CXOrbia · Motor de estructura de costos y pricing (comercial)
   Genérico/white-label, inspirado en la lógica real de costeo de
   consultoras (honorario por ubicación, viáticos, overhead de
   coordinación/RRHH/revisión, regalías y retención fuente),
   mejorado con: multi-modalidad, multi-país/moneda, margen→precio
   y comparador de escenarios. NO contiene datos reales de clientes.
   ============================================================ */
window.CX = window.CX || {};

(function(){
  /* modalidades de servicio con multiplicador sobre el honorario base del shopper */
  const MODALIDADES = {
    tradicional: {label:'Presencial tradicional', mult:1.00},
    audio:       {label:'Presencial con audio',   mult:1.25},
    video:       {label:'Presencial con video',   mult:1.55},
    online:      {label:'Online (remoto)',         mult:0.55},
    auditoria:   {label:'Auditoría',               mult:1.70},
    call:        {label:'Mystery call',            mult:0.60},
  };

  /* preset de parámetros por defecto (editable en la UI) */
  function defaults(){
    return {
      modalidad:'tradicional',
      visitasMes: 100,
      honShopperCapital: 8,      // honorario base por visita (capital)
      incrUbicacionPct: 35,      // % incremento para interior
      mixInteriorPct: 30,        // % de visitas en interior
      viaticoInterior: 4,        // viático por visita interior
      reembolsoPorVisita: 6,     // consumo/boleto (pass-through, no es utilidad)
      // overhead operativo
      revisionPorVisita: 1.2,    // QA / revisión de cuestionario
      rrhhLqPorVisita: 0.8,      // gestión RRHH / liquidación
      coordinacionMes: 1200,     // costo fijo de coordinación / mes
      plataformaMes: 400,        // licencia/plataforma / mes
      // fiscal / contractual
      regaliasPct: 8,            // regalías de marca (sobre precio)
      retencionPct: 5,           // retención en la fuente / ISR (sobre precio)
      // pricing
      margenObjetivoPct: 35,     // margen objetivo → define el precio sugerido
      moneda:'$',
    };
  }

  CX.costos = {
    MODALIDADES, defaults,
    modalidadList(){ return Object.keys(MODALIDADES).map(k=>({k, ...MODALIDADES[k]})); },

    /* calcula la estructura completa a partir de los parámetros */
    calc(i){
      const m = MODALIDADES[i.modalidad] || MODALIDADES.tradicional;
      const v = +i.visitasMes||0;
      const interior = v*((+i.mixInteriorPct||0)/100);
      const capital  = v-interior;
      // honorario shopper por visita según modalidad y ubicación
      const honCap = (+i.honShopperCapital||0)*m.mult;
      const honInt = honCap*(1+(+i.incrUbicacionPct||0)/100);
      const honTotal = capital*honCap + interior*honInt;
      const viaticos = interior*(+i.viaticoInterior||0);
      const reembolsos = v*(+i.reembolsoPorVisita||0);          // pass-through
      const revision = v*(+i.revisionPorVisita||0);
      const rrhh = v*(+i.rrhhLqPorVisita||0);
      const fijos = (+i.coordinacionMes||0)+(+i.plataformaMes||0);

      // costo directo (lo que cuesta producir el servicio, sin reembolso pass-through)
      const costoDirecto = honTotal + viaticos + revision + rrhh + fijos;
      const costoPorVisita = v? costoDirecto/v : 0;

      // precio sugerido: el costo debe quedar después de margen, regalías y retención.
      // precio = costoDirecto / (1 - margen% - regalías% - retención%)
      const cargasPct = ((+i.margenObjetivoPct||0)+(+i.regaliasPct||0)+(+i.retencionPct||0))/100;
      const precioBase = cargasPct<1 ? costoDirecto/(1-cargasPct) : costoDirecto*2;
      const regalias = precioBase*((+i.regaliasPct||0)/100);
      const retencion = precioBase*((+i.retencionPct||0)/100);
      const margen = precioBase - costoDirecto - regalias - retencion;
      // precio al cliente: servicio + reembolsos (pass-through facturable)
      const precioCliente = precioBase + reembolsos;

      return {
        moneda:i.moneda||'$', visitas:v, capital, interior, modalidad:m.label,
        honCap, honInt, honTotal, viaticos, reembolsos, revision, rrhh, fijos,
        costoDirecto, costoPorVisita,
        precioBase, precioPorVisita: v?precioBase/v:0, precioCliente,
        regalias, retencion, margen,
        margenPct: precioBase? Math.round(margen/precioBase*100):0,
        // honorario sugerido al shopper (promedio ponderado) — para propuesta a campo
        honShopperProm: v? honTotal/v : 0,
      };
    },

    /* compara todas las modalidades con los mismos parámetros */
    compararModalidades(i){
      return this.modalidadList().map(m=>{ const r=this.calc({...i, modalidad:m.k}); return {modalidad:m.label, key:m.k, costoPorVisita:r.costoPorVisita, precioPorVisita:r.precioPorVisita, margenPct:r.margenPct}; });
    },

    fmt(cur,n){ return (cur||'$')+' '+Math.round(n).toLocaleString('es-GT'); },
  };
})();
