/* ============================================================
   CXOrbia · Liquidación derivada de la visita (sync)
   El estado de la visita determina el estado de la liquidación,
   tanto en Beneficios (shopper) como en Liquidaciones (admin).
   Estados (alineados con el export real de T&A):
     realizada            -> pendiente_cuestionario
     cuestionario enviado -> pendiente_submitir
     submitida/validada   -> validada (lista para lote)
     en lote pagado       -> pagada
   Fecha estimada de pago = fecha submit + project.pago.diasPago
   ============================================================ */
window.CX = window.CX || {};

CX.liq = {
  /* mapa visita.estado -> estado de liquidación */
  estadoFromVisita(v){
    switch(v.estado){
      case 'liquidada':     return 'pagada';
      case 'cuestionario':  return 'validada';      // cuestionario hecho, lista para lote
      case 'realizada':     return 'pendiente_cuestionario';
      default:              return null;            // aún no genera liquidación
    }
  },

  label(estado){
    return {
      pendiente_cuestionario:['Pend. cuestionario','a'],
      pendiente_submitir:    ['Pend. submitir','a'],
      validada:              ['Validada · lista para lote','b'],
      en_lote:               ['En lote','p'],
      pagada:                ['Pagada','g'],
    }[estado] || [estado,'n'];
  },

  /* días de pago configurados en el proyecto (default 30) */
  diasPago(p){ return (p && p.pago && p.pago.diasPago) || 30; },

  addDays(iso, n){
    if(!iso) return '';
    const d=new Date(iso+'T12:00:00'); if(isNaN(d)) return '';
    d.setDate(d.getDate()+(+n||0));
    return d.toISOString().slice(0,10);
  },

  /* día de la semana de pago configurable por proyecto (5 = viernes por defecto) */
  diaPago(p){ const d=(p && p.pago && p.pago.diaSemana); return Number.isFinite(d) ? d : 5; },

  /* avanza una fecha al próximo día-de-semana indicado (incluye el mismo día) */
  snapToWeekday(iso, weekday){
    if(!iso) return '';
    const d=new Date(iso+'T12:00:00'); if(isNaN(d)) return '';
    const delta=((+weekday - d.getDay())+7)%7;
    d.setDate(d.getDate()+delta);
    return d.toISOString().slice(0,10);
  },

  /* fecha estimada de pago = submit + diasPago, ajustada al día de pago (viernes por defecto) */
  fechaEstimadaPago(p, baseISO){
    if(!baseISO) return '';
    return this.snapToWeekday(this.addDays(baseISO, this.diasPago(p)), this.diaPago(p));
  },

  /* construye el objeto liquidación derivado de una visita */
  fromVisita(p, v){
    const estado=this.estadoFromVisita(v);
    if(!estado) return null;
    const reembolso=(v.boleto||0)+(v.comboAmt||0);
    const total=v.honorario+reembolso;
    const baseISO = v.realizada || v.agendada || v.cuestFecha || '';
    return {
      visitaId:v.id, projectId:p.id, shopper:v.shopper, shopperCode:v.shopperCode,
      sucursal:v.sucursal, pais:v.pais, moneda:v.currency,
      honorario:v.honorario, boleto:v.boleto||0, combo:v.comboAmt||0, reembolso, total,
      estado, freal:v.realizada||'', cuest:v.cuestFecha||'', submit:v.submit?(v.cuestFecha||''):'',
      fechaEstimadaPago: estado==='pagada' ? (v.fechaPago||v.realizada||'') : this.fechaEstimadaPago(p, baseISO),
      pagada: estado==='pagada',
    };
  },

  /* todas las liquidaciones del proyecto activo, derivadas de sus visitas */
  forProject(data){
    const p=data.project();
    return data.visitas().map(v=>this.fromVisita(p,v)).filter(Boolean);
  },

  /* resumen para KPIs de finanzas / beneficios */
  resumen(list){
    const r={pendiente_cuestionario:0,pendiente_submitir:0,validada:0,pagada:0,totalPorMoneda:{}};
    list.forEach(l=>{ r[l.estado]=(r[l.estado]||0)+1;
      r.totalPorMoneda[l.moneda]=(r.totalPorMoneda[l.moneda]||0)+l.total; });
    return r;
  },
};
