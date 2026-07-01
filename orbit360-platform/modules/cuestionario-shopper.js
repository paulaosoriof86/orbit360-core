/* CXOrbia · Cuestionario del shopper (interno / externo / link)
   El modo lo define el proyecto: p.cuestionario.modo = interna|externa|link */
window.CX = window.CX || {};

CX.shopperQuestionnaire = function(data, p, visita, ui){
  const cfg=p.cuestionario||{modo:'interna'};
  /* ----- Cuestionario EXTERNO o por LINK ----- */
  if(cfg.modo==='externa' || cfg.modo==='link'){
    const cred = (CX.session.user.name||'evaluador').toLowerCase().replace(/\s+/g,'.').replace(/[^a-z.]/g,'');
    ui.modal('Cuestionario del proyecto', `
      <div style="background:var(--brand-light);border-radius:11px;padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:var(--brand-dark)">
        Este proyecto usa un <b>cuestionario ${cfg.modo==='link'?'con link propio por visita':'en plataforma externa'}</b> (${cfg.label||'externo'}). Complétalo y luego marca la visita como cuestionario enviado.</div>
      ${cfg.modo==='externa'?`<div class="card-p" style="border:1px solid var(--border);border-radius:11px;margin-bottom:12px">
        <div class="lbl">Tus credenciales (autogeneradas)</div>
        <div class="between" style="padding:6px 0"><span style="font-size:12px;color:var(--t2)">Usuario</span><b class="mono">${cred}</b></div>
        <div class="between" style="padding:6px 0;border-top:1px solid var(--border-2)"><span style="font-size:12px;color:var(--t2)">Contraseña</span><b class="mono">••••••</b></div>
      </div>`:''}
      <a href="${cfg.url||'#'}" target="_blank" class="btn btn-pr" style="width:100%;justify-content:center;margin-bottom:10px">🌐 Abrir cuestionario ${cfg.modo==='link'?'(link de esta visita)':'externo'}</a>
      <button class="btn btn-green" id="markDone" style="width:100%;justify-content:center">✅ Marcar cuestionario como enviado</button>
    `, {onMount:(ov,close)=>{
      ov.querySelector('#markDone').addEventListener('click',()=>{close();ui.toast('Cuestionario marcado como enviado · liquidación pasa a "pend. validar"','ok');CX.bus.emit('visit-flow');});
    }});
    return;
  }

  /* ----- Cuestionario INTERNO (se llena en la plataforma · score real ponderado) ----- */
  const sections = CX.programa ? CX.programa.sections(p.id) : [];
  const inputFor=(q)=>{
    if(q.tipo==='Escala 1–5') return `<div class="flex qans" data-qid="${q.id}" data-tipo="${q.tipo}" style="gap:6px">${[1,2,3,4,5].map(n=>`<button class="btn btn-ghost btn-sm qopt" data-v="${n}" style="width:38px;justify-content:center">${n}</button>`).join('')}</div>`;
    if(q.tipo==='Sí / No') return `<div class="flex qans" data-qid="${q.id}" data-tipo="${q.tipo}" style="gap:6px"><button class="btn btn-ghost btn-sm qopt" data-v="Sí">Sí</button><button class="btn btn-ghost btn-sm qopt" data-v="No">No</button></div>`;
    if(q.tipo==='Numérico') return `<input class="inp qans" data-qid="${q.id}" data-tipo="${q.tipo}" type="number" min="0" max="100" placeholder="0–100" style="max-width:120px">`;
    if(q.tipo==='Texto + foto') return `<div class="qans" data-qid="${q.id}" data-tipo="${q.tipo}"><textarea class="inp" data-txt rows="2" placeholder="Comentario…"></textarea><input type="file" accept="image/*" class="inp" style="padding:6px;margin-top:6px"></div>`;
    return `<textarea class="inp qans" data-qid="${q.id}" data-tipo="${q.tipo}" rows="2" placeholder="Escribe aquí…"></textarea>`;
  };
  const evidBlock=(q)=>{
    if(!q.evidencia||q.evidencia==='none') return '';
    const accept=q.evidencia==='video'?'video/*':q.evidencia==='audio'?'audio/*':'image/*';
    const multi=q.evidencia==='varios'?'multiple':'';
    const geo=q.evidencia==='foto_geo';
    return `<div style="margin-top:8px;background:var(--panel-2);border:1px dashed var(--border);border-radius:9px;padding:9px 11px">
      <div class="between" style="margin-bottom:6px"><span style="font-size:11px;font-weight:800;color:var(--brand-dark)">${CX.programa.evidIcon(q.evidencia)} Evidencia requerida: ${CX.programa.evidLabel(q.evidencia)}</span>${geo?'<button class="btn btn-ghost btn-sm geoBtn" type="button">📍 Capturar ubicación</button>':''}</div>
      ${q.evidNota?`<div style="font-size:11px;color:var(--t3);margin-bottom:6px">${q.evidNota}</div>`:''}
      <input type="file" accept="${accept}" ${multi} class="inp" style="padding:6px;font-size:11px">
    </div>`;
  };
  const secHTML=sections.map(s=>`
    <div style="margin-bottom:16px">
      <div class="between" style="margin-bottom:8px"><div style="font-size:12px;font-weight:800;color:var(--brand-dark);text-transform:uppercase;letter-spacing:.5px">${s.name}</div><span class="bdg bdg-n">peso ${s.weight}%</span></div>
      ${s.questions.map((q,i)=>`<div style="margin-bottom:12px"><div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:7px">${i+1}. ${q.name}${q.req?' <span style="color:var(--accent)">*</span>':''}${q.critico?' <span class="bdg bdg-r" style="font-size:9px">KO</span>':''}</div>${inputFor(q)}${evidBlock(q)}</div>`).join('')}
    </div>`).join('');

  ui.modal('Cuestionario · '+(visita?visita.sucursal:p.name), `
    <div style="background:var(--brand-light);border-radius:11px;padding:10px 13px;margin-bottom:14px;font-size:12px;color:var(--brand-dark)">Cuestionario ponderado de <b>${p.name}</b>. Al enviarlo se calcula tu <b>score</b> y la liquidación se actualiza.</div>
    <div id="qForm">${secHTML||'<div style="font-size:13px;color:var(--t3)">Sin secciones configuradas.</div>'}</div>
    <button class="btn btn-green" id="qSubmit" style="width:100%;justify-content:center;margin-top:6px">✅ Enviar cuestionario</button>
  `, {onMount:(ov,close)=>{
    ov.querySelectorAll('.qopt').forEach(b=>b.addEventListener('click',()=>{
      b.parentElement.querySelectorAll('.qopt').forEach(x=>x.classList.replace('btn-pr','btn-ghost'));
      b.classList.replace('btn-ghost','btn-pr'); b.parentElement.dataset.val=b.dataset.v;
    }));
    ov.querySelectorAll('.geoBtn').forEach(b=>b.addEventListener('click',()=>{b.textContent='✅ Ubicación capturada';b.disabled=true;ui.toast('Ubicación y hora registradas (demo)','ok');}));
    ov.querySelector('#qSubmit').addEventListener('click',()=>{
      const answers={};
      ov.querySelectorAll('.qans').forEach(el=>{
        const qid=el.dataset.qid, tipo=el.dataset.tipo;
        if(tipo==='Escala 1–5'||tipo==='Sí / No') answers[qid]=el.dataset.val;
        else if(tipo==='Numérico') answers[qid]=el.value;
        else answers[qid]=(el.querySelector('[data-txt]')||el).value;
      });
      const res=CX.programa.score(sections, answers);
      if(visita){ visita.score=res.total; visita.scoreBySection=res.bySection; visita.evaluada=true; visita.koFail=res.koFail;
        /* #198 — cuestionario INTERNO: actualiza estado automáticamente (no requiere acción manual como el externo) */
        if(data.setVisitState) data.setVisitState(visita.id,'cuestionario','cuestFecha',new Date().toISOString().slice(0,10));
        visita.submit=true;
      }
      close(); CX.bus.emit('visit-flow');
      CX.automations&&CX.automations.fire('cuestionario',{shopper:visita&&visita.shopper||CX.session.user.name,sucursal:visita?visita.sucursal:p.name,score:res.total});
      ui.modal('Cuestionario enviado', `
        <div style="text-align:center;padding:8px 0">
          <div style="font-size:13px;color:var(--t2);margin-bottom:10px">Score de la visita</div>
          ${CX.cliUI?CX.cliUI.donut(res.total,96):'<div style="font-size:40px;font-weight:800">'+res.total+'</div>'}
          ${res.koFail?'<div class="bdg bdg-r" style="margin-top:10px">Pregunta crítica (KO) incumplida</div>':''}
          <div style="font-size:12.5px;color:var(--t3);margin-top:12px">La liquidación pasa a "pend. validar". El resultado alimenta el Portal del Cliente.</div>
        </div>
        <div style="text-align:right;margin-top:8px"><button class="btn btn-pr" data-okk>Entendido</button></div>
      `, {onMount:(o2,c2)=>{o2.querySelector('[data-okk]').addEventListener('click',c2);}});
      ui.toast('Cuestionario enviado · score '+res.total+'/100','ok',3200);
    });
  }});
};
