/* CXOrbia · Ficha de visita + flujo de postulación (shopper)
   Adaptable por proyecto: escenario, restricción, canal, combo, honorario,
   y propuesta de fecha con validación de franja/disponibilidad. */
window.CX = window.CX || {};

CX.shopperVisitDetail = function(data, p, v, ui){
  if(!v) return;
  const field=(l,val)=>`<div style="background:#fff;border:1px solid var(--border);border-radius:11px;padding:10px 13px">
    <div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--t3);margin-bottom:3px">${l}</div>
    <div style="font-size:13.5px;font-weight:700;color:var(--t1)">${val}</div></div>`;
  const honor=`${v.currency} ${v.honorario}`+(v.combo?' + combo':'')+(v.boleto?' + boleto':'');

  ui.modal(`${v.sucursal}<div style="font-size:12px;font-weight:500;color:var(--t3);margin-top:2px">📍 ${v.ciudad}, ${v.pais}</div>`, `
    <div class="ai-box" style="margin-bottom:14px"><div class="ai-l">RESUMEN DEL PROYECTO / ESCENARIO</div>
      <p>${p.conocimiento||p.industry}. Escenario: <b>${v.escenario}</b>.</p></div>
    <div class="grid g2" style="gap:10px;margin-bottom:12px">
      ${field('Proyecto',p.name)}${field('Ronda',p.ronda||'—')}
      ${field('Formato',v.formato||p.formato||'—')}${field('Quincena',v.quincena)}
      ${field('Franja',v.franja)}${field('Canal',v.canal||'—')}
    </div>
    ${v.combo?`<div style="background:var(--amber-bg);border-radius:11px;padding:11px 14px;margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--amber)">🍿 TIPO DE COMBO / REEMBOLSO</div><div style="font-size:13px;color:var(--t1);margin-top:2px">${v.combo}</div></div>`:''}
    <div style="background:var(--green-bg);border-radius:11px;padding:11px 14px;margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--green)">💲 HONORARIO</div>
      <div style="font-size:16px;font-weight:800;color:var(--green);font-family:var(--disp)">${honor}</div>
      <div style="font-size:11px;color:var(--t3)">Honorario${v.combo?' + combo':''}${v.boleto?' + boleto':''} reembolsados según programa.</div></div>
    ${p.restriccion?`<div style="background:var(--amber-bg);border-radius:11px;padding:10px 13px;margin-bottom:10px;font-size:12.5px;color:#8a5b00">⚠️ ${p.restriccion}</div>`:''}
    <div style="background:var(--brand-light);border-radius:11px;padding:10px 13px;margin-bottom:14px;font-size:12px;color:var(--brand-dark)">📄 El instructivo completo lo recibirás ${CX.BRAND.clientName?'por WhatsApp':'en la plataforma'} al ser aprobada, y estará disponible en la sección Documentos del proyecto.</div>
    <div class="flex" style="gap:10px"><button class="btn btn-green" id="goPost" style="flex:1;justify-content:center">📩 Postularme</button><button class="btn btn-ghost" data-x2>Cerrar</button></div>
  `, {onMount:(ov,close)=>{
    ov.querySelector('[data-x2]').addEventListener('click',close);
    ov.querySelector('#goPost').addEventListener('click',()=>{close();CX.shopperPostForm(data,p,v,ui);});
  }});
};

CX.shopperPostForm = function(data, p, v, ui){
  const franjaHelp = v.franja==='Semana' ? 'semana = lunes a viernes' : 'fin de semana = sábado y domingo';
  ui.modal('📩 Enviar postulación', `
    <div style="background:var(--amber-bg);border-radius:10px;padding:10px 13px;margin-bottom:12px;font-size:12px;color:#8a5b00">${p.restriccion||'Confirma que cumples los requisitos del proyecto.'}</div>
    <div class="grid g2" style="gap:10px;margin-bottom:14px">
      <div style="background:var(--green-bg);border-radius:11px;padding:11px 13px"><div style="font-size:9.5px;font-weight:700;text-transform:uppercase;color:var(--t3)">Disponible a partir de</div>
        <div style="font-size:15px;font-weight:800;color:var(--green);font-family:var(--disp)">${v.disponibleDesde}</div>
        <div style="font-size:10.5px;color:var(--t3)">Tu visita puede realizarse desde esta fecha</div></div>
      <div style="background:var(--brand-light);border-radius:11px;padding:11px 13px"><div style="font-size:9.5px;font-weight:700;text-transform:uppercase;color:var(--t3)">Franja requerida</div>
        <div style="font-size:15px;font-weight:800;color:var(--brand-dark);font-family:var(--disp)">${v.franja}</div>
        <div style="font-size:10.5px;color:var(--t3)">Canal: ${v.canal||'—'}</div></div>
    </div>
    <div style="background:var(--amber-bg);border-radius:10px;padding:9px 12px;margin-bottom:14px;font-size:12px;color:#8a5b00">🗓️ Al postularte propones la fecha; el equipo la <b>autoriza y gestiona</b> desde Gestión de Postulaciones.</div>
    <label class="lbl">Fecha propuesta *</label>
    <input class="inp" id="postDate" type="date" value="${v.disponibleDesde}" min="${v.disponibleDesde}" style="margin-bottom:6px">
    <div id="dateErr" style="font-size:11.5px;color:var(--red);margin-bottom:10px;display:none"></div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:14px">Debe ser posterior a "Disponible a partir de" y en la franja correcta (${franjaHelp}).</div>
    <label class="lbl">¿Visitaste esta sucursal recientemente?</label>
    <select class="sel" id="postRecent" style="margin-bottom:12px"><option>No / hace más de 2 meses</option><option>Sí, en los últimos 2 meses</option></select>
    <label class="lbl">Nota (opcional)</label>
    <textarea class="inp" id="postNote" rows="2" placeholder="Disponibilidad, comentarios…" style="margin-bottom:12px"></textarea>
    <label class="flex" style="gap:8px;font-size:12.5px;color:var(--t2);margin-bottom:16px"><input type="checkbox" id="postOk"> Confirmo que cumplo los requisitos del proyecto.</label>
    <div class="flex" style="gap:10px"><button class="btn btn-green" id="postSend" style="flex:1;justify-content:center">📩 Enviar postulación</button><button class="btn btn-ghost" data-x3>Cancelar</button></div>
  `, {onMount:(ov,close)=>{
    ov.querySelector('[data-x3]').addEventListener('click',close);
    const di=ov.querySelector('#postDate'), err=ov.querySelector('#dateErr');
    const validate=()=>{
      err.style.display='none';
      const d=new Date(di.value+'T12:00:00'); if(isNaN(d)) return false;
      if(di.value < v.disponibleDesde){err.textContent='La fecha debe ser posterior al '+v.disponibleDesde+'.';err.style.display='block';return false;}
      const dow=d.getDay(), isWknd=(dow===0||dow===6);
      if(v.franja==='Semana' && isWknd){err.textContent='Este escenario requiere franja semana (lun–vie).';err.style.display='block';return false;}
      if(v.franja==='Fin de semana' && !isWknd){err.textContent='Este escenario requiere franja fin de semana (sáb–dom).';err.style.display='block';return false;}
      return true;
    };
    di.addEventListener('change',validate);
    ov.querySelector('#postSend').addEventListener('click',()=>{
      if(!ov.querySelector('#postOk').checked){ui.toast('Confirma los requisitos para continuar','warn');return;}
      if(ov.querySelector('#postRecent').selectedIndex===1){ui.toast('No cumples la restricción de recencia para esta sucursal','err');return;}
      if(!validate())return;
      close(); ui.toast('Postulación enviada · fecha propuesta '+di.value+' · pendiente de autorización','ok');
    });
  }});
};
