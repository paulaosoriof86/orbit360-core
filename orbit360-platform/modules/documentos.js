/* CXOrbia · Documentos (admin + shopper) — lectura DENTRO de la plataforma + subir */
CX.docStore = CX.docStore || {
  _d:{},
  seed(pid){ return [
    {id:'d1',ic:'📄',n:'Instructivo general',meta:'PDF · 2.1 MB',tipo:'pdf',
      body:'# Instructivo general del programa\n\nEste documento describe el objetivo de la evaluación, el perfil del evaluador y las reglas generales.\n\n## Antes de la visita\n- Lee el escenario asignado y memorízalo (no lleves notas visibles).\n- Verifica que estás certificado para este proyecto.\n- Confirma fecha y franja en Mis Visitas.\n\n## Durante la visita\n- Mantén el anonimato en todo momento.\n- Cronometra los tiempos desde que ingresas.\n- Toma la evidencia requerida según el escenario.\n\n## Después\n- Completa el cuestionario el mismo día.\n- Adjunta la evidencia y los comprobantes para tu reembolso.'},
    {id:'d2',ic:'🎯',n:'Escenario de evaluación',meta:'PDF · 1.4 MB',tipo:'pdf',
      body:'# Escenario: Compra estándar\n\nActúa como un cliente habitual. Realiza una compra del producto definido y evalúa la atención, los tiempos y la limpieza.\n\n## Puntos clave a observar\n1. Saludo y bienvenida (¿te saludaron en los primeros 30s?).\n2. Conocimiento del asesor sobre el producto.\n3. Tiempo total en caja.\n4. Estado de limpieza y orden del local.\n5. Despedida e invitación a volver.'},
    {id:'d3',ic:'🎬',n:'Video de inducción',meta:'YouTube · 5 min',tipo:'video',url:'https://www.youtube.com/embed/aqz-KE-bpKQ'},
    {id:'d4',ic:'📋',n:'Checklist de visita',meta:'Lista · 8 ítems',tipo:'check',
      items:['Certificación vigente','Escenario memorizado','Fecha confirmada','Evidencia lista (cámara)','Efectivo/medios de pago','Cronómetro a mano','Comprobantes guardados','Cuestionario enviado el mismo día']},
  ];},
  list(pid){ pid=pid||CX.data.currentProjectId; if(!this._d[pid]) this._d[pid]=this.seed(pid); return this._d[pid]; },
  add(pid,d){ this.list(pid).unshift(Object.assign({id:'d'+Date.now().toString(36),ic:'📎',meta:'subido ahora'},d)); CX.bus&&CX.bus.emit('docs'); },
};

CX.module('documentos', ({data,role,ui})=>{
  const p=data.project(), pid=p.id;
  const host=ui.el('div');

  /* visor a PANTALLA COMPLETA en el área del módulo (no modal) */
  const viewer=(d)=>{
    const isPdf = d.url && (/^data:application\/pdf/i.test(d.url) || /\.pdf($|\?)/i.test(d.url));
    const isImg = (d.tipo==='image'&&d.url) || (d.url&&/^data:image\//i.test(d.url));
    const isXls = d.url && (/^data:application\/(vnd\.openxmlformats-officedocument\.spreadsheetml|vnd\.ms-excel)/i.test(d.url) || /\.(xlsx|xls)$/i.test(d.meta||''));
    const isDocx = d.url && (/^data:application\/vnd\.openxmlformats-officedocument\.wordprocessingml/i.test(d.url) || /\.docx$/i.test(d.meta||''));
    let body;
    if(isXls||isDocx) body=`<div id="docEmbed" class="acad-content" style="max-width:900px;font-size:14px;line-height:1.7"><div style="color:var(--t3);padding:20px">Cargando vista del documento…</div></div>`;
    else if(d.tipo==='video'&&d.url) body=`<iframe src="${d.url}" style="width:100%;height:68vh;border:0;border-radius:12px" allowfullscreen></iframe>`;
    else if(d.tipo==='check') body=`<div style="max-width:760px">${(d.items||[]).map(it=>`<label class="flex" style="gap:10px;padding:11px 14px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;cursor:pointer;font-size:14px"><input type="checkbox"> ${it}</label>`).join('')}</div>`;
    else if(isImg) body=`<img src="${d.url}" style="max-width:100%;border-radius:12px">`;
    else if(isPdf) body=`<iframe src="${d.url}" style="width:100%;height:72vh;border:0;border-radius:12px"></iframe>`;
    else if(d.url&&!d.body) body=`<div style="text-align:center;padding:40px"><div style="font-size:40px;margin-bottom:12px">${d.ic||'📄'}</div><a href="${d.url}" target="_blank" class="btn btn-pr btn-sm" style="text-decoration:none">Abrir en pestaña nueva ↗</a></div>`;
    else body=`<div class="acad-content" style="max-width:820px;font-size:14px;line-height:1.75">${(d.body||'Vista previa no disponible.').split('\n').map(l=>{
      if(l.startsWith('## ')) return `<h3 style="margin:14px 0 4px">${l.slice(3)}</h3>`;
      if(l.startsWith('# ')) return `<h2 style="margin-bottom:10px">${l.slice(2)}</h2>`;
      if(l.startsWith('- ')||/^\d+\./.test(l)) return `<div style="padding-left:14px;line-height:1.7">• ${l.replace(/^(-|\d+\.)\s*/,'')}</div>`;
      return l.trim()?`<p style="margin:4px 0">${l}</p>`:'<div style="height:8px"></div>';
    }).join('')}</div>`;
    host.innerHTML=`
      <div style="background:linear-gradient(135deg,#1a2740,#0d1b2e);border-radius:14px;padding:16px 20px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
        <div class="flex" style="gap:12px;align-items:center">
          <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.3)" id="docBack">← Volver</button>
          <div><div style="font-size:15px;font-weight:800;color:#fff">${d.ic||'📄'} ${d.n}</div><div style="font-size:11px;color:#94a3b8">${d.meta||''}</div></div>
        </div>
        <div class="flex" style="gap:8px">${d.url?`<a href="${d.url}" download="${d.n}" class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.3);text-decoration:none">⤓ Descargar</a>`:''}<button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.3)" id="docPrint">🖨 PDF</button></div>
      </div>
      <div class="card card-p">${body}</div>`;
    host.querySelector('#docBack').addEventListener('click',()=>draw());
    host.querySelector('#docPrint')?.addEventListener('click',()=>window.print());
    /* render inline de Excel (SheetJS) y Word (Mammoth) — no descarga */
    if(isXls||isDocx){
      const slot=host.querySelector('#docEmbed');
      const toBuf=(url)=>{const b64=url.split(',')[1]||'';const bin=atob(b64);const len=bin.length;const bytes=new Uint8Array(len);for(let i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);return bytes;};
      try{
        if(isXls && window.XLSX){
          const wb=XLSX.read(toBuf(d.url),{type:'array'});
          slot.innerHTML=wb.SheetNames.map(sn=>`<h3 style="margin:14px 0 6px">${sn}</h3>`+XLSX.utils.sheet_to_html(wb.Sheets[sn])).join('');
          slot.querySelectorAll('table').forEach(t=>{t.className='tbl';t.style.cssText='width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px';});
        } else if(isDocx && window.mammoth){
          mammoth.convertToHtml({arrayBuffer:toBuf(d.url).buffer}).then(r=>{slot.innerHTML=r.value||'<p>Documento vacío.</p>';}).catch(err=>{slot.innerHTML='<p style="color:var(--red)">No se pudo renderizar: '+err.message+'</p>';});
        } else { slot.innerHTML='<p style="color:var(--t3)">Visor no disponible.</p>'; }
      }catch(e){ slot.innerHTML='<p style="color:var(--red)">Error al leer el documento: '+e.message+'</p>'; }
    }
  };

  const draw=()=>{
    const docs=CX.docStore.list(pid);
    host.innerHTML=`
      ${ui.ph('Recursos del proyecto', p.name+' · documentos, videos, imágenes y checklists · se abren a pantalla completa')}
      <div class="between" style="margin-bottom:14px">${ui.bdg(docs.length+' recursos','n')}${role==='admin'?'<div class="flex" style="gap:8px"><button class="btn btn-soft btn-sm" id="docIA">✨ Generar con IA</button><button class="btn btn-pr btn-sm" id="docUp">＋ Subir recurso</button></div>':''}</div>
      <div class="grid g2">
        ${docs.map(d=>`<div class="card hov card-p flex" style="gap:13px">
          <div style="flex:1;display:flex;gap:13px;cursor:pointer" data-doc="${d.id}"><div style="font-size:26px">${d.ic}</div>
          <div style="flex:1"><div style="font-size:13.5px;font-weight:700;color:var(--t1)">${d.n}</div><div style="font-size:11.5px;color:var(--t3)">${d.meta}</div></div></div>
          <div class="flex" style="gap:6px;flex-shrink:0">
            <button class="btn btn-soft btn-sm" data-doc="${d.id}">Abrir</button>
            ${role==='admin'?`<button class="btn btn-ghost btn-sm" data-editd="${d.id}" title="Editar">✎</button><button class="btn btn-ghost btn-sm" data-deld="${d.id}" title="Eliminar" style="color:var(--red)">✕</button>`:''}
          </div></div>`).join('')}
      </div>
      <div class="card card-p" style="margin-top:16px">${ui.aiBox('Cada recurso se abre y se lee dentro de la plataforma (PDF, video embebido, checklist) — sin descargar ni buscar en chats. Entrego el correcto según la visita.','Lectura contextual en plataforma')}</div>`;
    host.querySelectorAll('[data-doc]').forEach(b=>b.addEventListener('click',()=>{const d=docs.find(x=>x.id===b.dataset.doc);if(d)viewer(d);}));
    host.querySelectorAll('[data-editd]').forEach(b=>b.addEventListener('click',()=>{const d=docs.find(x=>x.id===b.dataset.editd);if(!d)return;
      ui.modal('✎ Editar documento · '+d.n,`
        <div class="grid g2" style="gap:10px 12px"><div><label class="lbl">Nombre</label><input class="inp" id="edN" value="${(d.n||'').replace(/"/g,'&quot;')}"></div>
        <div><label class="lbl">Icono</label><input class="inp" id="edIc" value="${d.ic||'📄'}" style="max-width:80px"></div>
        <div style="grid-column:1/3"><label class="lbl">Reemplazar archivo (PDF/imagen/video/Excel/Word)</label><input type="file" class="inp" id="edFile" accept="application/pdf,image/*,video/*,.xlsx,.xls,.docx" style="padding:7px">${d.url&&/^data:/.test(d.url)?'<div style="font-size:11px;color:var(--t3);margin-top:3px">📎 Archivo actual cargado · sube uno nuevo para reemplazar</div>':''}</div>
        <div style="grid-column:1/3"><label class="lbl">URL de video (YouTube/Vimeo, opcional)</label><input class="inp" id="edUrl" value="${(d.url&&/^https?:/.test(d.url))?d.url.replace(/"/g,'&quot;'):''}" placeholder="https://youtube.com/…"></div>
        <div style="grid-column:1/3"><label class="lbl">Contenido / texto (Markdown)</label><textarea class="inp" id="edBody" rows="4">${d.body||''}</textarea></div></div>
        <div class="between" style="margin-top:12px"><button class="btn btn-soft btn-sm" id="edIA">✨ Mejorar/generar con IA</button><button class="btn btn-pr btn-sm" id="edSave">Guardar</button></div>
      `,{onMount:(ov,close)=>{
        ov.querySelector('#edIA').addEventListener('click',()=>{
          const base=ov.querySelector('#edBody').value.trim();
          if(!(CX.ai&&CX.ai.ready())){ui.toast('Configura un proveedor de IA en Integraciones','warn',3500);return;}
          ui.modal('✨ Generar/mejorar con IA',`<label class="lbl">Instrucción (qué generar o cómo mejorar)</label><textarea class="inp" id="iaInstr" rows="3" placeholder="Ej. amplía con ejemplos / redacta un instructivo a partir de estos puntos / resume"></textarea><div style="text-align:right;margin-top:10px"><button class="btn btn-green btn-sm" id="iaGo">Generar</button></div>`,{onMount:(o2,c2)=>o2.querySelector('#iaGo').addEventListener('click',()=>{
            const instr=(o2.querySelector('#iaInstr').value||'').trim();if(!instr){ui.toast('Escribe la instrucción','warn');return;}
            ui.toast('Generando con '+CX.ai.cfg().model+'…','',2500);
            CX.ai.ask('Eres editor de documentos de mystery shopping. '+instr+'. Devuelve en Markdown.\n\nContenido base:\n'+(base||'(vacío)'))
              .then(res=>{ov.querySelector('#edBody').value=res;c2();ui.toast('Contenido generado · revisa, itera o guarda','ok',3500);})
              .catch(e=>{c2();ui.toast('Error IA: '+e.message,'warn');});
          })});
        });
        ov.querySelector('#edSave').addEventListener('click',()=>{
        d.n=ov.querySelector('#edN').value.trim()||d.n;d.ic=ov.querySelector('#edIc').value||d.ic;
        const u=ov.querySelector('#edUrl').value.trim();if(u){d.url=CX.learnStore?CX.learnStore.embedUrl(u):u.replace('youtube.com/watch?v=','youtube-nocookie.com/embed/');d.tipo='video';d.ic=d.ic||'🎬';}
        d.body=ov.querySelector('#edBody').value;
        const nf=ov.querySelector('#edFile').files[0];
        if(nf){const rd=new FileReader();rd.onload=()=>{d.url=rd.result;d.meta=nf.name;if(nf.type==='application/pdf')d.tipo='pdf';else if(/^image\//.test(nf.type)){d.tipo='image';}else if(/^video\//.test(nf.type)){d.tipo='video';}close();draw();ui.toast('Documento actualizado','ok');};rd.readAsDataURL(nf);}
        else{close();draw();ui.toast('Documento actualizado','ok');}
      });}});
    }));
    host.querySelectorAll('[data-deld]').forEach(b=>b.addEventListener('click',()=>{CX.docStore._d[pid]=(CX.docStore._d[pid]||[]).filter(x=>x.id!==b.dataset.deld);draw();ui.toast('Documento eliminado','');}));
    const up=host.querySelector('#docUp');
    host.querySelector('#docIA')?.addEventListener('click',()=>ui.modal('✨ Generar recurso con IA',`
      <label class="lbl">Tipo de recurso a generar</label>
      <select class="sel" id="giT" style="margin-bottom:8px"><option value="instructivo">📄 Instructivo</option><option value="checklist">📋 Checklist de visita</option><option value="escenario">🎯 Escenario de evaluación</option><option value="protocolo">📘 Protocolo / material</option></select>
      <label class="lbl">Fuente: idea, temario o pega el material</label>
      <textarea class="inp" id="giTxt" rows="4" placeholder="Describe qué necesitas o pega el contenido base…" style="margin-bottom:8px"></textarea>
      <label class="btn btn-soft btn-sm" style="cursor:pointer">📎 Cargar documento base<input type="file" id="giF" accept=".pdf,.doc,.docx,.txt,image/*" style="display:none"></label>
      <div id="giFN" style="font-size:11px;color:var(--t3);margin-top:5px"></div>
      <div style="text-align:right;margin-top:12px"><button class="btn btn-green btn-sm" id="giGo">Generar</button></div>
    `,{onMount:(ov,close)=>{
      let src='';ov.querySelector('#giF').addEventListener('change',e=>{const f=e.target.files[0];if(f){ov.querySelector('#giFN').textContent='📎 '+f.name;if(/\.(txt|csv)$/i.test(f.name)){const r=new FileReader();r.onload=ev=>src=ev.target.result;r.readAsText(f);}else src='[Documento: '+f.name+']';}});
      ov.querySelector('#giGo').addEventListener('click',()=>{
        const tipo=ov.querySelector('#giT').value, fuente=((ov.querySelector('#giTxt').value||'')+' '+src).trim();
        if(!fuente){ui.toast('Describe o carga la fuente','warn');return;}
        const nombres={instructivo:'Instructivo',checklist:'Checklist de visita',escenario:'Escenario de evaluación',protocolo:'Protocolo'};
        const ics={instructivo:'📄',checklist:'📋',escenario:'🎯',protocolo:'📘'};
        if(CX.ai&&CX.ai.ready()){
          ui.toast('Generando con '+CX.ai.cfg().model+'…','',2500);
          const prompt=tipo==='checklist'
            ? 'Genera un checklist de visita de mystery shopping (lista de 8-12 ítems verificables, una línea cada uno empezando con "- ") a partir de:\n\n'+fuente
            : 'Genera un '+nombres[tipo]+' profesional de mystery shopping en Markdown (# título, ## secciones, viñetas) a partir de:\n\n'+fuente;
          CX.ai.ask(prompt).then(res=>{
            const rec={n:nombres[tipo]+' (IA)',ic:ics[tipo],meta:'generado con IA',tipo:tipo==='checklist'?'check':'text'};
            if(tipo==='checklist')rec.items=res.split('\n').filter(l=>/^[-•\d]/.test(l.trim())).map(l=>l.replace(/^[-•\d.\s]+/,'').trim()).filter(Boolean);
            else rec.body=res;
            CX.docStore.add(pid,rec);close();draw();ui.toast('Recurso generado · revísalo, edítalo o itera','ok',4000);
          }).catch(e=>{close();ui.toast('Error IA: '+e.message,'warn');});
        } else { close();ui.toast('Configura un proveedor de IA en Integraciones para generar el recurso','warn',4000); }
      });
    }}));
    if(up)up.addEventListener('click',()=>ui.modal('Subir recurso',`
      <div style="margin-bottom:10px"><label class="lbl">Nombre</label><input class="inp" id="duN" placeholder="Ej. Protocolo de servicio 2026"></div>
      <div style="margin-bottom:10px"><label class="lbl">Tipo</label><select class="sel" id="duT"><option value="pdf">📄 Documento (PDF/imagen)</option><option value="video">🎬 Video (YouTube/Vimeo)</option><option value="text">📝 Texto/Markdown</option></select></div>
      <div style="margin-bottom:10px"><label class="lbl">Archivo (PDF/imagen/video)</label><input type="file" class="inp" id="duF" accept="application/pdf,image/*,video/*" style="padding:7px"></div>
      <div style="margin-bottom:10px"><label class="lbl">o URL de video (YouTube/Vimeo)</label><input class="inp" id="duU" placeholder="https://…"></div>
      <div style="margin-bottom:14px"><label class="lbl">o pega el texto (Markdown)</label><textarea class="inp" id="duB" rows="3" placeholder="# Título…"></textarea></div>
      <div style="text-align:right"><button class="btn btn-pr btn-sm" id="duS">Subir</button></div>
    `,{onMount:(ov,close)=>{
      ov.querySelector('#duF').addEventListener('change',e=>{const f=e.target.files[0];if(f&&!ov.querySelector('#duN').value)ov.querySelector('#duN').value=f.name;});
      ov.querySelector('#duS').addEventListener('click',()=>{
        const n=(ov.querySelector('#duN').value||'').trim(); if(!n){ui.toast('Pon un nombre','warn');return;}
        const t=ov.querySelector('#duT').value, url=(ov.querySelector('#duU').value||'').trim(), body=(ov.querySelector('#duB').value||'').trim(), f=ov.querySelector('#duF').files[0];
        const rec={n,tipo:t,ic:t==='video'?'🎬':t==='text'?'📝':'📄',meta:f?f.name:(url?'video':'texto')};
        if(t==='video'&&url)rec.url=CX.learnStore?CX.learnStore.embedUrl(url):url;
        if(body)rec.body=body;
        const finish=()=>{CX.docStore.add(pid,rec);close();draw();ui.toast('Documento subido · disponible para el proyecto','ok');};
        if(f){const rd=new FileReader();rd.onload=()=>{rec.url=rd.result;if(f.type==='application/pdf')rec.tipo='pdf';else if(/^image\//.test(f.type)){rec.tipo='image';rec.ic='🖼️';}else if(/^video\//.test(f.type)){rec.tipo='video';rec.ic='🎬';}finish();};rd.readAsDataURL(f);}
        else finish();
      });
    }}));
  };
  draw();
  CX.bus.on('docs',()=>draw());
  return host;
});

/* CXOrbia · Centro de Aprendizaje → modules/aprendizaje.js */
