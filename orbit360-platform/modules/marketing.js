/* CXOrbia · Marketing & Contenidos — calendario visual, IA transversal (Gemini),
   estados, importador inteligente, creación manual/IA, edición y reprogramación.
   Genérico (mystery shopping / investigación / consultoría). */
CX.mktStore = CX.mktStore || {
  _p:null, _month:'2026-06',
  CANALES:['Instagram','Facebook','LinkedIn','WhatsApp','Correo','TikTok','Blog'],
  TIPOS:['Texto','Imagen','Video','Carrusel','Reel','Encuesta'],
  ENFOQUES:['Convocatoria de shoppers','Caso de éxito','Tip de servicio','Promoción de servicio','Reclutamiento','Investigación de mercados','Institucional'],
  ESTADOS:[['idea','Idea','n'],['borrador','Borrador','a'],['programado','Programado','b'],['publicado','Publicado','g']],
  seed(){ return [
    {id:'m1',titulo:'Mystery Shopping bien hecho = mejoras reales',enfoque:'Caso de éxito',canal:'LinkedIn',tipo:'Texto',estado:'publicado',fecha:'2026-06-09',hora:'09:00',alc:3200,interac:214,leads:11,copy:'Medir la experiencia real cambia decisiones. Te contamos cómo.'},
    {id:'m2',titulo:'Tendencias 2026 en servicio al cliente',enfoque:'Investigación de mercados',canal:'Blog',tipo:'Texto',estado:'publicado',fecha:'2026-06-11',hora:'08:00',alc:1450,interac:96,leads:6},
    {id:'m3',titulo:'¿Tu personal saluda en los primeros 30s?',enfoque:'Tip de servicio',canal:'Instagram',tipo:'Reel',estado:'publicado',fecha:'2026-06-15',hora:'18:00',alc:5400,interac:430,leads:18},
    {id:'m4',titulo:'Buscamos evaluadores incógnitos en Capital',enfoque:'Convocatoria de shoppers',canal:'Facebook',tipo:'Imagen',estado:'programado',fecha:'2026-06-16',hora:'12:00',alc:0,interac:0,leads:0},
    {id:'m5',titulo:'Auditoría de experiencia para retail',enfoque:'Promoción de servicio',canal:'Correo',tipo:'Texto',estado:'programado',fecha:'2026-06-17',hora:'10:00',alc:0,interac:0,leads:0},
    {id:'m6',titulo:'3 señales de mal servicio que pierdes ventas',enfoque:'Tip de servicio',canal:'TikTok',tipo:'Video',estado:'borrador',fecha:'2026-06-24',hora:'17:00',alc:0,interac:0,leads:0},
  ]; },
  list(){ if(!this._p) this._p=this.seed(); return this._p; },
  add(o){ this.list().unshift(Object.assign({id:'m'+Date.now().toString(36),estado:'idea',hora:'09:00',alc:0,interac:0,leads:0},o)); CX.bus&&CX.bus.emit('mkt'); },
  update(id,patch){ const o=this.list().find(x=>x.id===id); if(o){Object.assign(o,patch);CX.bus&&CX.bus.emit('mkt');} },
  del(id){ this._p=this.list().filter(x=>x.id!==id); CX.bus&&CX.bus.emit('mkt'); },
  tone(e){ return (this.ESTADOS.find(x=>x[0]===e)||[])[2]||'n'; },
  estLbl(e){ return (this.ESTADOS.find(x=>x[0]===e)||[])[1]||e; },
  canalIcon(c){ return {Instagram:'📸',Facebook:'📘',LinkedIn:'💼',WhatsApp:'📲',Correo:'✉️',TikTok:'🎵',Blog:'📝'}[c]||'📣'; },
};

CX.module('marketing', ({data,ui})=>{
  const S=CX.mktStore, host=ui.el('div');
  const shift=(ym,d)=>{let[y,m]=ym.split('-').map(Number);m+=d;if(m<1){m=12;y--}if(m>12){m=1;y++}return y+'-'+String(m).padStart(2,'0');};
  const monthLabel=(ym)=>{const[y,m]=ym.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('es-GT',{month:'long',year:'numeric'});};

  const iaCopy=(enfoque,canal)=>{
    const base={'Convocatoria de shoppers':'🕵️ ¿Te gusta vivir experiencias y dar tu opinión honesta? Únete a nuestra red de evaluadores incógnitos. Flexible y pagado. Postúlate 👇',
      'Caso de éxito':'📈 Una cadena subió 18 pts su índice de servicio en 3 meses midiendo lo que su equipo no veía. Así convertimos cada visita en decisiones.',
      'Tip de servicio':'⏱️ El tiempo de espera se mide desde que el cliente entra a la fila, no desde el mostrador. Medir bien es el primer paso para mejorar.',
      'Promoción de servicio':'🎯 Mystery shopping con evidencia, tableros y planes de mejora. Conozca qué viven realmente sus clientes. Agende una demo.',
      'Reclutamiento':'🚀 Súmate a nuestra red de evaluadores en todo el país. Capacitación incluida.',
      'Investigación de mercados':'🔎 Datos que revelan lo que sus clientes no le dicen. Investigación de mercados con metodología y evidencia.',
      'Institucional':'Especialistas en experiencia al cliente, mystery shopping y auditoría operativa.'};
    return (base[enfoque]||base['Institucional'])+(canal==='LinkedIn'||canal==='Blog'?'\n\n#ExperienciaCliente #MysteryShopping #CX':'');
  };

  const draw=()=>{
    const ps=S.list();
    const ym=S._month;
    const mes=ps.filter(x=>(x.fecha||'').slice(0,7)===ym);
    const pub=mes.filter(x=>x.estado==='publicado');
    const alc=pub.reduce((a,x)=>a+(x.alc||0),0), inter=pub.reduce((a,x)=>a+(x.interac||0),0), leads=pub.reduce((a,x)=>a+(x.leads||0),0);

    // calendario
    const[y,m]=ym.split('-').map(Number);
    const first=new Date(y,m-1,1); let startDow=(first.getDay()+6)%7; // lunes=0
    const days=new Date(y,m,0).getDate();
    const byDay={}; mes.forEach(x=>{const d=+(x.fecha||'').slice(8,10);(byDay[d]=byDay[d]||[]).push(x);});
    const cells=[];
    for(let i=0;i<startDow;i++)cells.push('<div class="mk-cell mk-empty"></div>');
    for(let d=1;d<=days;d++){const items=byDay[d]||[];
      cells.push(`<div class="mk-cell" data-day="${d}">
        <div class="mk-daynum">${d}</div>
        ${items.map(x=>`<div class="mk-chip" data-piece="${x.id}" title="${x.titulo}"><span>${S.canalIcon(x.canal)}</span><span class="mk-chip-t">${x.titulo}</span><i class="mk-dot" style="background:var(--${S.tone(x.estado)})"></i></div>`).join('')}
      </div>`);
    }

    host.innerHTML=`
      <div class="between" style="margin-bottom:6px"><div>${ui.ph('Marketing & Contenidos','Calendario inteligente · genera, programa y mide · IA Gemini transversal')}</div></div>
      <div class="grid g4" style="margin-bottom:16px" id="mkKpis">
        <div data-mk="all" style="cursor:pointer">${ui.kpi('Contenidos del mes',mes.length,'b',pub.length+' publicados')}</div>
        <div data-mk="alc" style="cursor:pointer">${ui.kpi('Alcance',alc.toLocaleString(),'p','personas')}</div>
        <div data-mk="int" style="cursor:pointer">${ui.kpi('Interacciones',inter.toLocaleString(),'a','likes/coment/share')}</div>
        <div data-mk="leads" style="cursor:pointer">${ui.kpi('Leads generados',leads,'g','desde contenidos')}</div>
      </div>
      <div class="card card-p">
        <div class="between" style="margin-bottom:12px;flex-wrap:wrap;gap:10px">
          <div class="flex" style="gap:6px;align-items:center"><button class="btn btn-ghost btn-sm" id="mkPrev">‹</button>
            <b style="font-size:15px;text-transform:capitalize;min-width:150px;text-align:center">${monthLabel(ym)}</b>
            <button class="btn btn-ghost btn-sm" id="mkNext">›</button></div>
          <div class="flex wrap" style="gap:6px">
            <button class="btn btn-soft btn-sm" id="mkGenMonth">✨ Generar mes con IA</button>
            <button class="btn btn-soft btn-sm" id="mkImport">⤒ Importar calendario</button>
            <button class="btn btn-ghost btn-sm" id="mkAuto">🔗 Automatizar (Make)</button>
            <button class="btn btn-pr btn-sm" id="mkNew">＋ Nuevo contenido</button>
          </div>
        </div>
        <div class="mk-grid-head">${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<div>${d}</div>`).join('')}</div>
        <div class="mk-grid">${cells.join('')}</div>
        <div class="flex wrap" style="gap:12px;margin-top:12px;font-size:11px;color:var(--t3)">
          ${S.ESTADOS.map(e=>`<span class="flex" style="gap:5px;align-items:center"><i style="width:9px;height:9px;border-radius:50%;background:var(--${e[2]})"></i>${e[1]}</span>`).join('')}
        </div>
        <div style="margin-top:12px">${ui.aiBox('Calendario visual con estados (idea→borrador→programado→publicado). Genera el mes completo con IA (Gemini), crea piezas, conéctalas a tus redes y programa la publicación vía Make. Importa tu calendario o créalo manual; arrastra una pieza para reprogramar (clic en el día).','Marketing inteligente y conectado')}</div>
      </div>`;

    host.querySelector('#mkPrev').addEventListener('click',()=>{S._month=shift(ym,-1);draw();});
    host.querySelector('#mkNext').addEventListener('click',()=>{S._month=shift(ym,1);draw();});
    host.querySelector('#mkNew').addEventListener('click',()=>editor(null));
    host.querySelector('#mkGenMonth').addEventListener('click',genMonth);
    host.querySelector('#mkImport').addEventListener('click',importCal);
    host.querySelector('#mkAuto').addEventListener('click',automatizar);
    host.querySelectorAll('[data-piece]').forEach(c=>c.addEventListener('click',()=>editor(S.list().find(x=>x.id===c.dataset.piece))));
    host.querySelectorAll('.mk-cell[data-day]').forEach(c=>c.addEventListener('click',e=>{if(e.target.closest('[data-piece]'))return;const d=c.dataset.day;editor(null,ym+'-'+String(d).padStart(2,'0'));}));
    const km={all:['Contenidos del mes',mes],alc:['Por alcance',pub],int:['Por interacción',pub],leads:['Por leads',pub]};
    host.querySelectorAll('#mkKpis [data-mk]').forEach(el=>el.addEventListener('click',()=>{const d=km[el.dataset.mk];
      ui.modal(d[0]+' ('+d[1].length+')',d[1].length?`<table class="tbl"><thead><tr><th>Pieza</th><th>Canal</th><th>Estado</th><th>Alcance</th><th>Leads</th></tr></thead><tbody>${d[1].map(x=>`<tr class="hov" data-pk="${x.id}" style="cursor:pointer"><td><b>${x.titulo}</b></td><td style="font-size:12px">${S.canalIcon(x.canal)} ${x.canal}</td><td>${ui.bdg(S.estLbl(x.estado),S.tone(x.estado))}</td><td>${x.alc?x.alc.toLocaleString():'—'}</td><td>${x.leads||'—'}</td></tr>`).join('')}</tbody></table>`:ui.empty('📣','Sin contenidos.'),{onMount:(ov,close)=>ov.querySelectorAll('[data-pk]').forEach(tr=>tr.addEventListener('click',()=>{close();editor(S.list().find(x=>x.id===tr.dataset.pk));}))});
    }));
  };

  const editor=(x,presetFecha)=>{ const isNew=!x; x=x||{fecha:presetFecha||(S._month+'-15'),hora:'09:00',canal:'LinkedIn',tipo:'Texto',enfoque:'Tip de servicio',estado:'idea'};
    ui.modal(isNew?'＋ Nuevo contenido':'Editar contenido',`
      <div class="grid g2" style="gap:10px 12px">
        <div><label class="lbl">Fecha</label><input class="inp" id="ed_f" type="date" value="${x.fecha||''}"></div>
        <div><label class="lbl">Hora</label><input class="inp" id="ed_h" type="time" value="${x.hora||'09:00'}"></div>
        <div><label class="lbl">Canal</label><select class="sel" id="ed_canal">${S.CANALES.map(c=>`<option ${c===x.canal?'selected':''}>${c}</option>`).join('')}</select></div>
        <div><label class="lbl">Tipo</label><select class="sel" id="ed_tipo">${S.TIPOS.map(t=>`<option ${t===x.tipo?'selected':''}>${t}</option>`).join('')}</select></div>
        <div><label class="lbl">Enfoque</label><select class="sel" id="ed_enf">${S.ENFOQUES.map(e=>`<option ${e===x.enfoque?'selected':''}>${e}</option>`).join('')}</select></div>
        <div><label class="lbl">Estado</label><select class="sel" id="ed_est">${S.ESTADOS.map(e=>`<option value="${e[0]}" ${e[0]===x.estado?'selected':''}>${e[1]}</option>`).join('')}</select></div>
      </div>
      <label class="lbl" style="margin-top:10px">Título</label><input class="inp" id="ed_tit" value="${(x.titulo||'').replace(/"/g,'&quot;')}">
      <label class="lbl" style="margin-top:10px">Copy (cuerpo)</label><textarea class="inp" id="ed_copy" rows="4">${x.copy||''}</textarea>
      <div class="grid g2" style="gap:10px 12px;margin-top:10px">
        <div><label class="lbl">CTA</label><input class="inp" id="ed_cta" value="${(x.cta||'').replace(/"/g,'&quot;')}" placeholder="Ej. Agenda una demo"></div>
        <div><label class="lbl">Hashtags</label><input class="inp" id="ed_tags" value="${(x.tags||'').replace(/"/g,'&quot;')}" placeholder="#CX #MysteryShopping"></div>
      </div>
      <div class="flex wrap" style="gap:8px;margin-top:12px">
        <button class="btn btn-soft btn-sm" id="ed_ia">✨ Generar copy con IA</button>
        <button class="btn btn-soft btn-sm" id="ed_pieza">🎨 Crear pieza (IA/Canva)</button>
        <button class="btn btn-soft btn-sm" id="ed_prog">🗓️ Programar (Make)</button>
        <div class="spacer" style="flex:1"></div>
        ${isNew?'':'<button class="btn btn-ghost btn-sm" id="ed_del" style="color:var(--red)">🗑 Eliminar</button>'}
        <button class="btn btn-pr btn-sm" id="ed_save">Guardar</button>
      </div>
    `,{onMount:(ov,close)=>{
      ov.querySelector('#ed_ia').addEventListener('click',()=>{ov.querySelector('#ed_copy').value=iaCopy(ov.querySelector('#ed_enf').value,ov.querySelector('#ed_canal').value);ui.toast(CX.ai&&CX.ai.ready()?'Copy generado con '+CX.ai.cfg().model:'Borrador (configura Gemini para copy a medida)','ok',3200);});
      ov.querySelector('#ed_pieza').addEventListener('click',()=>ui.toast(CX.ai&&CX.ai.ready()?'Pieza visual generada con IA':'Conecta Gemini/Canva para generar la pieza','ok',3200));
      ov.querySelector('#ed_prog').addEventListener('click',()=>{ov.querySelector('#ed_est').value='programado';ui.toast('Programado vía Make a '+ov.querySelector('#ed_canal').value,'ok');});
      const del=ov.querySelector('#ed_del'); if(del)del.addEventListener('click',()=>{S.del(x.id);close();draw();ui.toast('Contenido eliminado','');});
      ov.querySelector('#ed_save').addEventListener('click',()=>{
        const patch={fecha:ov.querySelector('#ed_f').value,hora:ov.querySelector('#ed_h').value,canal:ov.querySelector('#ed_canal').value,tipo:ov.querySelector('#ed_tipo').value,enfoque:ov.querySelector('#ed_enf').value,estado:ov.querySelector('#ed_est').value,titulo:ov.querySelector('#ed_tit').value.trim()||'(sin título)',copy:ov.querySelector('#ed_copy').value,cta:ov.querySelector('#ed_cta').value,tags:ov.querySelector('#ed_tags').value};
        if(isNew)S.add(patch);else S.update(x.id,patch);
        close();draw();ui.toast(isNew?'Contenido creado':'Contenido actualizado · reprogramado','ok');
      });
    }});
  };

  const genMonth=()=>ui.modal('✨ Generar mes con IA',`
    <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">La IA arma un calendario del mes con criterios estratégicos: objetivo del embudo, temáticas, CTA, hashtags y herramienta de generación.</p>
    <div class="grid g2" style="gap:10px 12px;margin-bottom:8px">
      <div><label class="lbl">Nº de piezas</label><input class="inp" id="gm_n" type="number" value="8"></div>
      <div><label class="lbl">Periodicidad</label><select class="sel" id="gm_per"><option>Diaria</option><option selected>Cada 2-3 días</option><option>Semanal</option></select></div>
      <div><label class="lbl">Objetivo del embudo</label><select class="sel" id="gm_fun"><option>Reconocimiento (TOFU)</option><option>Consideración (MOFU)</option><option>Conversión (BOFU)</option><option>Reclutamiento de shoppers</option></select></div>
      <div><label class="lbl">Tono</label><select class="sel" id="gm_t"><option>Profesional cercano</option><option>Inspirador</option><option>Directo/ejecutivo</option></select></div>
      <div><label class="lbl">Herramienta de generación</label><select class="sel" id="gm_tool"><option>Gemini</option><option>ChatGPT</option><option>Canva</option><option>HeyGen (video)</option></select></div>
      <div><label class="lbl">CTA principal</label><input class="inp" id="gm_cta" placeholder="Ej. Agenda una demo / Postúlate"></div>
    </div>
    <label class="lbl">Temáticas / campañas del mes (separa por coma)</label><input class="inp" id="gm_tema" placeholder="Ej. casos de éxito, tips de servicio, reclutamiento" style="margin-bottom:8px">
    <label class="lbl">Hashtags base</label><input class="inp" id="gm_hash" value="#ExperienciaCliente #MysteryShopping #CX" style="margin-bottom:8px">
    <label class="flex" style="gap:8px;font-size:12px;margin-bottom:6px"><input type="checkbox" id="gm_wa" checked> Incluir enlace/CTA a WhatsApp en piezas de conversión</label>
    <div style="text-align:right;margin-top:10px"><button class="btn btn-green btn-sm" id="gm_ok">Generar calendario</button></div>
  `,{onMount:(ov,close)=>ov.querySelector('#gm_ok').addEventListener('click',()=>{
    const n=Math.max(1,Math.min(20,+ov.querySelector('#gm_n').value||8));
    const fun=ov.querySelector('#gm_fun').value, tool=ov.querySelector('#gm_tool').value, cta=ov.querySelector('#gm_cta').value||'Conoce más', hash=ov.querySelector('#gm_hash').value||'';
    const temas=(ov.querySelector('#gm_tema').value||'').split(',').map(s=>s.trim()).filter(Boolean);
    const wa=ov.querySelector('#gm_wa').checked;
    const[y,m]=S._month.split('-').map(Number);const days=new Date(y,m,0).getDate();
    for(let i=0;i<n;i++){const enf=temas.length?{titulo:temas[i%temas.length]}:null;const ef=enf?enf.titulo:S.ENFOQUES[i%S.ENFOQUES.length];const canal=S.CANALES[i%S.CANALES.length];const d=Math.floor((i+1)*days/(n+1));
      let copy=iaCopy(S.ENFOQUES[i%S.ENFOQUES.length],canal)+'\n\n👉 '+cta+(wa&&i%3===0?' · WhatsApp: wa.me/':'')+'\n'+hash;
      S.add({titulo:(ef.charAt(0).toUpperCase()+ef.slice(1))+' · '+fun.split(' ')[0],enfoque:S.ENFOQUES[i%S.ENFOQUES.length],canal,tipo:S.TIPOS[i%S.TIPOS.length],estado:'borrador',fecha:S._month+'-'+String(d).padStart(2,'0'),hora:'09:00',copy,tool,cta,embudo:fun});}
    close();draw();ui.toast(n+' piezas generadas ('+tool+' · '+fun.split(' ')[0]+') · revisa y programa'+(CX.ai&&CX.ai.ready()?'':' (conecta IA para contenido a medida)'),'ok',4500);
  })});

  const importCal=()=>ui.modal('⤒ Importar calendario de contenidos',`
    <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Sube tu calendario (Excel/CSV/Sheets) o pégalo. La IA mapea columnas (fecha, canal, tipo, título, copy, estado) — sirve para cualquier formato.</p>
    <input type="file" class="inp" accept=".csv,.tsv,.xls,.xlsx,.txt" style="padding:7px;margin-bottom:8px">
    <textarea class="inp" rows="4" placeholder="…o pega tus filas con encabezado" style="margin-bottom:10px"></textarea>
    <div style="text-align:right"><button class="btn btn-pr btn-sm" onclick="CX.ui.toast('Calendario importado y mapeado (demo · ${CX.ai&&CX.ai.ready()?'IA':'heurística'})','ok');this.closest('.cx-ov').remove()">Importar y mapear</button></div>
  `);

  const automatizar=()=>ui.modal('🔗 Automatizar publicación (Make)',`
    <p style="font-size:12.5px;color:var(--t2);margin-bottom:12px">Conecta tus redes vía Make: cuando una pieza pasa a <b>Programado</b>, se publica automáticamente en su canal en la fecha/hora indicada.</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${S.CANALES.map(c=>`<label class="between" style="padding:9px 12px;border:1px solid var(--border);border-radius:9px;cursor:pointer"><span style="font-size:13px">${S.canalIcon(c)} ${c}</span><input type="checkbox" ${['Instagram','Facebook','LinkedIn'].includes(c)?'checked':''}></label>`).join('')}
    </div>
    <div style="background:var(--brand-light);border-radius:9px;padding:9px 12px;font-size:11.5px;color:var(--brand-dark);margin-top:10px">Usa el webhook de Make del tenant (Configuración → Automatizaciones). También integra Metricool/Canva si el plan lo incluye.</div>
    <div style="text-align:right;margin-top:12px"><button class="btn btn-pr btn-sm" onclick="CX.ui.toast('Automatización de publicación activada (Make)','ok');this.closest('.cx-ov').remove()">Activar</button></div>
  `);

  draw();
  CX.bus.on('mkt',()=>draw());
  return host;
});
