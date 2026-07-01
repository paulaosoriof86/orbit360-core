/* CXOrbia · Mis Beneficios (shopper) — honorarios vs reembolsos + beneficios en especie */
CX.module('beneficios', ({data,ui})=>{
  const p=data.project();
  /* P0.1: SOLO los beneficios del shopper autenticado (por shopperId, no por nombre) */
  const sid=(CX.session.user&&CX.session.user.shopperId)||'sh1';
  const myVisitIds=new Set((data.visitsForShopper?data.visitsForShopper(sid):[]).map(v=>v.id));
  const allProj=CX.liq.forProject(data);
  const all=allProj.filter(l=>myVisitIds.size?myVisitIds.has(l.visitaId):true);
  const cur=p.currency[p.countries[0]];
  /* totales separados */
  const hon = all.reduce((a,l)=>a+l.honorario,0);
  const reemb = all.reduce((a,l)=>a+l.reembolso,0);
  const porCobrar = all.filter(l=>l.estado!=='pagada').reduce((a,l)=>a+l.total,0);
  const pagado = all.filter(l=>l.estado==='pagada').reduce((a,l)=>a+l.total,0);
  const combo = all.reduce((a,l)=>a+(l.combo||0),0);
  const boleto = all.reduce((a,l)=>a+(l.boleto||0),0);

  const row=(l)=>{
    const lb=CX.liq.label(l.estado);
    return `<tr><td><b>${l.sucursal}</b><div style="font-size:10px;color:var(--t3)">${CX.paisFlag(l.pais)} ${l.shopper||''}</div></td>
      <td style="font-size:12px">${l.freal||'—'}</td>
      <td style="color:var(--green);font-weight:700">${ui.money(l.moneda,l.honorario)}</td>
      <td style="color:var(--purple);font-weight:600">${l.reembolso?ui.money(l.moneda,l.reembolso):'—'}</td>
      <td style="font-weight:700;color:var(--t1)">${ui.money(l.moneda,l.total)}</td>
      <td>${ui.bdg(lb[0],lb[1])}</td>
      <td style="font-size:12px;${l.estado==='pagada'?'color:var(--green);font-weight:700':''}">${l.estado==='pagada'?'✓ '+(l.fechaEstimadaPago||''):(l.fechaEstimadaPago||'—')}</td></tr>`;
  };

  /* conceptos de reembolso GENÉRICOS: cada programa define qué se reembolsa.
     comboAmt → concepto principal (p.combo); boleto → gasto secundario del programa. */
  const conceptoReemb = p.combo || 'Consumo del programa';
  const especie=[];
  if(combo) especie.push(['🧾','Reembolso: '+conceptoReemb, ui.money(cur,combo)]);
  if(boleto) especie.push(['🎟️','Gasto reembolsado del programa', ui.money(cur,boleto)]);
  especie.push(['💵','Honorario neto (tu ganancia)',ui.money(cur,hon)]);

  setTimeout(()=>{
    const benDrill=(title,arr)=>ui.modal(title+' · '+arr.length+' visita(s)', arr.length?`<table class="tbl"><thead><tr><th>Visita</th><th>Honorario</th><th>Reembolso</th><th>Total</th><th>Estado</th><th>Pago</th></tr></thead><tbody>${arr.map(l=>{const lb=CX.liq.label(l.estado);return `<tr><td><b style="font-size:12.5px">${l.sucursal}</b><div style="font-size:10px;color:var(--t3)">${CX.paisFlag(l.pais)} ${l.freal||''}</div></td><td style="color:var(--green);font-weight:700">${ui.money(l.moneda,l.honorario)}</td><td style="color:var(--purple)">${l.reembolso?ui.money(l.moneda,l.reembolso):'—'}</td><td style="font-weight:700">${ui.money(l.moneda,l.total)}</td><td>${ui.bdg(lb[0],lb[1])}</td><td style="font-size:11px">${l.fechaEstimadaPago||'—'}</td></tr>`;}).join('')}</tbody></table>`:ui.empty('💰','Sin visitas en esta categoría.'));
    const benKp={hon:['💵 Honorarios',all],reemb:['🎁 Reembolsos',all.filter(l=>l.reembolso>0)],cobrar:['⏳ Por cobrar',all.filter(l=>l.estado!=='pagada')],pagado:['✅ Pagado',all.filter(l=>l.estado==='pagada')]};
    document.querySelectorAll('#benKpis [data-k]').forEach(el=>el.addEventListener('click',()=>{const d=benKp[el.dataset.k];benDrill(d[0],d[1]);}));
  },0);

  return `
    ${ui.ph('Mis Beneficios', p.name+' · lo que ganas y lo que disfrutas, claro y separado')}

    <div class="grid g4" style="margin-bottom:16px" id="benKpis">
      <div data-k="hon" style="cursor:pointer">${ui.kpi('💵 Honorarios',ui.money(cur,hon),'g','tu ganancia en efectivo')}</div>
      <div data-k="reemb" style="cursor:pointer">${ui.kpi('🎁 Reembolsos',ui.money(cur,reemb),'p','gastos del programa cubiertos')}</div>
      <div data-k="cobrar" style="cursor:pointer">${ui.kpi('⏳ Por cobrar',ui.money(cur,porCobrar),'a')}</div>
      <div data-k="pagado" style="cursor:pointer">${ui.kpi('✅ Pagado',ui.money(cur,pagado),'b')}</div>
    </div>

    <div class="grid g2" style="margin-bottom:16px">
      <div class="card card-p" style="background:linear-gradient(135deg,#eafaf1,#f3eeff);border-color:#d7ead9">
        <div class="card-t" style="margin-bottom:6px">🎉 Tu beneficio total como evaluador</div>
        <div style="font-size:12.5px;color:var(--t2);margin-bottom:12px">No solo cobras honorarios: el programa también <b>cubre los gastos/consumos requeridos por la evaluación</b>. Así se ve tu beneficio real:</div>
        ${especie.map(e=>`<div class="between" style="padding:8px 0;border-bottom:1px solid var(--border-2)">
          <span style="font-size:13px;color:var(--t1)">${e[0]} ${e[1]}</span><b style="font-size:13px;color:var(--t1)">${e[2]}</b></div>`).join('')}
        <div class="between" style="padding:11px 0 0">
          <span style="font-size:13px;font-weight:800;color:var(--t1)">Beneficio total percibido</span>
          <b style="font-family:var(--disp);font-size:20px;color:var(--green)">${ui.money(cur,hon+reemb)}</b></div>
      </div>
      <div class="card card-p">
        <div class="card-t" style="margin-bottom:10px">💡 Honorarios vs reembolsos</div>
        <div style="font-size:12px;color:var(--t2);margin-bottom:12px">El <b style="color:var(--green)">honorario</b> es tu pago por evaluar. El <b style="color:var(--purple)">reembolso</b> te devuelve los gastos o consumos que el programa requiere (no salen de tu bolsillo). Cada proyecto define qué se reembolsa.</div>
        ${ui.bar(hon+reemb?Math.round(hon/(hon+reemb)*100):0,'Honorario',ui.money(cur,hon))}
        ${ui.bar(hon+reemb?Math.round(reemb/(hon+reemb)*100):0,'Reembolso',ui.money(cur,reemb))}
        <div style="margin-top:12px">${ui.aiBox('El reembolso es flujo: te devuelve los gastos/consumos que el programa requiere. El honorario es tu ganancia real. Cada proyecto define sus conceptos de reembolso (genérico, no fijo).','Beneficio claro')}</div>
      </div>
    </div>

    <div class="card card-p">
      <div class="card-h"><div class="card-t">Detalle por visita</div><button class="btn btn-ghost btn-sm">⤓ Descargar comprobante</button></div>
      <table class="tbl"><thead><tr><th>Visita</th><th>Realizada</th><th>💵 Honorario</th><th>🎁 Reembolso</th><th>Total</th><th>Estado</th><th>Pago estimado</th></tr></thead>
      <tbody>${all.length?all.map(row).join(''):'<tr><td colspan="7">'+ui.empty('💰','Sin liquidaciones aún')+'</td></tr>'}</tbody></table>
    </div>`;
});
