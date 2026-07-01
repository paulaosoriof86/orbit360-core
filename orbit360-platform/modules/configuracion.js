/* CXOrbia · Configuración: Cuestionarios, Usuarios, Configuración (admin)
   Módulos AUTO-ADMINISTRABLES: todo editable desde la UI, sin tocar código. */

/* ---------- Cuestionarios: editor del PROGRAMA (secciones→preguntas, pesos, versiones) ---------- */
let _qProg=null, _qPid=null;
CX.module('cuestionarios', ({data,ui})=>{
  const p=data.project();
  if(!_qProg||_qPid!==p.id){ _qProg=JSON.parse(JSON.stringify(CX.programa.get(p.id))); _qPid=p.id; }
  const TIPOS=CX.programa.TIPOS, CRIT=CX.programa.CRITERIOS;
  const host=ui.el('div');

  const ver=()=>_qProg.versions.find(v=>v.id===_qProg.activeId)||_qProg.versions[0];

  /* importar cuestionario (pegar/CSV simple) y crear con IA */
  const IMPORT_SAMPLE=`# Recibimiento | 20\n- Saludo y bienvenida | Escala 1–5 | 60 | req\n- Tiempo de espera | Escala 1–5 | 40\n# Atención | 50\n- Conocimiento del asesor | Escala 1–5 | 50 | req\n- Amabilidad | Escala 1–5 | 50\n# Cierre | 30\n- Despedida | Sí / No | 100`;
  function parseImport(text){
    const secs=[]; let cur=null;
    (text||'').split(/\n/).forEach(l=>{ l=l.trim(); if(!l)return;
      if(l[0]==='#'){ const [name,w]=l.slice(1).split('|').map(x=>x.trim()); cur={id:CX.programa.uid('sec'),name:name||'Sección',weight:+w||0,questions:[]}; secs.push(cur); }
      else if((l[0]==='-'||l[0]==='*')&&cur){ const p=l.slice(1).split('|').map(x=>x.trim());
        cur.questions.push({id:CX.programa.uid('q'),name:p[0]||'Pregunta',tipo:CX.programa.TIPOS.includes(p[1])?p[1]:'Escala 1–5',weight:+p[2]||0,req:/req/i.test(p[3]||''),critico:/ko|crít|crit/i.test(p[4]||'')}); }
    });
    return secs;
  }
  function importModal(){
    ui.modal('Importar cuestionario', `
      <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Pega tu cuestionario (o llénalo desde Excel/CSV exportado). Formato: <b># Sección | peso</b> y por pregunta <b>- texto | tipo | peso | req | ko</b>.</p>
      <textarea class="inp" id="impTxt" rows="9" style="font-family:monospace;font-size:12px"></textarea>
      <div class="flex" style="justify-content:space-between;margin-top:12px"><button class="btn btn-ghost btn-sm" id="impSample">Cargar ejemplo</button>
        <button class="btn btn-green btn-sm" id="impApply">Importar a esta versión</button></div>`,
    {onMount:(ov,close)=>{
      ov.querySelector('#impSample').addEventListener('click',()=>{ov.querySelector('#impTxt').value=IMPORT_SAMPLE;});
      ov.querySelector('#impApply').addEventListener('click',()=>{ const secs=parseImport(ov.querySelector('#impTxt').value);
        if(!secs.length){ ui.toast('No se detectaron secciones (revisa el formato)','err'); return; }
        ver().sections=secs; close(); draw(); ui.toast('Importadas '+secs.length+' secciones','ok'); }); }});
  }
  function aiGenerate(desc){
    const d=(desc||'').toLowerCase(); let banks;
    if(/restau|comida|food|bebida|sabor|menú|menu/.test(d)) banks=[['Recibimiento',15,['Saludo y bienvenida','Tiempo hasta atención']],['Toma de orden',25,['Sugerencia del menú','Claridad del pedido']],['Calidad de alimentos',30,['Sabor y temperatura','Presentación del plato']],['Tiempos',15,['Tiempo de entrega']],['Limpieza',10,['Mesa e instalaciones']],['Cierre',5,['Despedida e invitación a volver']]];
    else if(/banc|finan|agencia|asesor|préstamo|prestamo|cuenta/.test(d)) banks=[['Espera',15,['Tiempo en fila']],['Asesoría',35,['Conocimiento del asesor','Claridad de la información']],['Protocolo',25,['Cumplimiento de protocolo','Verificación de identidad']],['Instalaciones',15,['Orden y señalización']],['Cierre',10,['Despedida y seguimiento']]];
    else if(/retail|tienda|super|caja|producto|ropa|calzado/.test(d)) banks=[['Recibimiento',15,['Saludo en piso']],['Asesoría de producto',30,['Conocimiento','Disponibilidad de stock']],['Experiencia de compra',25,['Orden y exhibición','Facilidad para encontrar']],['Caja',20,['Tiempo en caja','Amabilidad en el cobro']],['Cierre',10,['Invitación a volver']]];
    else banks=null;
    const base=banks||CX.programa.sections(p.id).map(s=>[s.name,s.weight,s.questions.map(q=>q.name)]);
    return base.map(([name,weight,qs])=>({id:CX.programa.uid('sec'),name,weight,questions:qs.map((qn,i)=>({id:CX.programa.uid('q'),name:qn,tipo:'Escala 1–5',weight:Math.round(100/qs.length),req:i===0,critico:false}))}));
  }
  function aiModal(){
    const CRIT=CX.programa.CRITERIOS;
    ui.modal('🤖 Set-up inteligente desde instructivo', `
      <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Carga el <b>instructivo / protocolo de servicio</b> del cliente (o pégalo) y la IA propone secciones, preguntas ponderadas y evidencias. Asígnalo al <b>tipo de visita</b> que agrupa ciertas sucursales (marca, cadena, formato…).</p>
      <input type="file" class="inp" id="aiFile" accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,image/*" style="padding:7px;margin-bottom:8px">
      <textarea class="inp" id="aiTxt" rows="4" placeholder="…o pega aquí el instructivo / protocolo / qué quieres evaluar" style="margin-bottom:10px"></textarea>
      <div class="grid g2" style="gap:10px 12px;margin-bottom:6px">
        <div><label class="lbl">Crear como versión</label><select class="sel" id="aiMode"><option value="new">Nueva versión (recomendado)</option><option value="replace">Reemplazar versión activa</option></select></div>
        <div><label class="lbl">Aplica por</label><select class="sel" id="aiCrit">${CRIT.map(c=>`<option ${c==='Por tipo de tienda'?'selected':''}>${c}</option>`).join('')}</select></div>
        <div style="grid-column:1/3"><label class="lbl">Tipo de visita / agrupador (ej. Marca X, Cadena Norte, Formato Express)</label><input class="inp" id="aiAplica" placeholder="A qué sucursales aplica este cuestionario"></div>
      </div>
      <div style="text-align:right;margin-top:10px"><button class="btn btn-green btn-sm" id="aiGo">Generar set-up</button></div>`,
    {onMount:(ov,close)=>{
      ov.querySelector('#aiFile').addEventListener('change',e=>{const f=e.target.files[0];if(f)ov.querySelector('#aiTxt').placeholder='Documento "'+f.name+'" cargado · la IA extraerá el contenido. Puedes añadir notas aquí.';});
      ov.querySelector('#aiGo').addEventListener('click',()=>{ const file=ov.querySelector('#aiFile').files[0];
        let secs=aiGenerate(ov.querySelector('#aiTxt').value+' '+(file?file.name:''));
        const aplica=ov.querySelector('#aiAplica').value.trim();
        const mode=ov.querySelector('#aiMode').value;
        const crit=ov.querySelector('#aiCrit').value;
        if(mode==='replace') ver().sections=secs;
        else { const nv={id:CX.programa.uid('v'),name:(aplica||'Versión IA'),criteria:crit,aplica,sections:secs}; _qProg.versions.push(nv); _qProg.activeId=nv.id; }
        CX.programa.set(p.id,_qProg); close(); draw();
        ui.modal('✅ Set-up generado', `
          <p style="font-size:13px;color:var(--t2);margin-bottom:14px">La IA propuso <b>${secs.length} secciones</b> para <b>${aplica||'todas las sucursales'}</b>. Revisa y ajusta en el editor.</p>
          <div style="margin-bottom:12px"><b style="font-size:12.5px">Resumen:</b>
            <ul style="margin:6px 0 0 16px;font-size:12.5px;color:var(--t2)">${secs.map(s=>`<li><b>${s.name}</b> (${s.weight}%) · ${s.questions.length} preguntas</li>`).join('')}</ul>
          </div>
          <div style="text-align:right;display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-ghost btn-sm" id="aiRefine">🔄 Refinar con IA</button>
            <button class="btn btn-pr btn-sm" id="aiOk">Ver en el editor</button>
          </div>`,
        {onMount:(ov2,cl2)=>{
          ov2.querySelector('#aiOk').addEventListener('click',cl2);
          ov2.querySelector('#aiRefine').addEventListener('click',()=>{cl2();
            ui.modal('🔄 Refinar set-up con IA',`
              <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Describe qué cambiar: agregar/quitar secciones, ajustar pesos, enfocar en algo específico.</p>
              <textarea class="inp" id="refTxt" rows="3" placeholder="Ej: agrega sección de Protocolo de caja con 20%, reduce Limpieza a 5%…"></textarea>
              <div style="text-align:right;margin-top:10px"><button class="btn btn-pr btn-sm" id="refGo">Regenerar</button></div>`,
            {onMount:(ov3,cl3)=>ov3.querySelector('#refGo').addEventListener('click',()=>{
              const instr=ov3.querySelector('#refTxt').value||'';
              const newSecs=aiGenerate(instr+' '+secs.map(s=>s.name).join(' '));
              ver().sections=newSecs; CX.programa.set(p.id,_qProg); cl3(); draw();
              ui.toast('Set-up refinado y aplicado','ok');
            })});
          });
        }});
      });
    }});
  }

  const sync=()=>{
    const v=ver();
    host.querySelectorAll('[data-sec]').forEach(secEl=>{
      const s=v.sections.find(x=>x.id===secEl.dataset.sec); if(!s)return;
      const nm=secEl.querySelector('[data-sf="name"]'); if(nm)s.name=nm.value;
      const wt=secEl.querySelector('[data-sf="weight"]'); if(wt)s.weight=+wt.value||0;
      secEl.querySelectorAll('[data-qi]').forEach(tr=>{
        const q=s.questions.find(x=>x.id===tr.dataset.qi); if(!q)return;
        tr.querySelectorAll('[data-qf]').forEach(el=>{const f=el.dataset.qf; q[f]=el.type==='checkbox'?el.checked:(f==='weight'?(+el.value||0):el.value);});
      });
    });
  };

  const qrow=(s,q,i)=>`<tr data-qi="${q.id}">
    <td style="width:26px;color:var(--brand);font-weight:700">${i+1}</td>
    <td><input class="inp" data-qf="name" value="${q.name}" style="border-color:transparent;background:transparent;font-weight:600"></td>
    <td><select class="sel" data-qf="tipo" style="width:auto;padding:5px 8px">${TIPOS.map(t=>`<option ${t===q.tipo?'selected':''}>${t}</option>`).join('')}</select></td>
    <td style="width:70px"><input class="inp" data-qf="weight" type="number" value="${q.weight}" style="padding:5px 8px"></td>
    <td style="width:50px;text-align:center"><input type="checkbox" data-qf="req" ${q.req?'checked':''}></td>
    <td style="width:50px;text-align:center" title="Pregunta crítica / KO"><input type="checkbox" data-qf="critico" ${q.critico?'checked':''}></td>
    <td style="width:140px"><select class="sel" data-qf="evidencia" style="width:auto;padding:5px 8px">${CX.programa.EVID.map(e=>`<option value="${e.id}" ${e.id===(q.evidencia||'none')?'selected':''}>${e.icon} ${e.label}</option>`).join('')}</select></td>
    <td style="width:34px;text-align:right"><button class="btn btn-ghost btn-sm" data-delq="${s.id}|${q.id}" style="color:var(--red)">✕</button></td>
  </tr>`;

  const secCard=(s)=>{
    const qs=s.questions.reduce((a,q)=>a+(+q.weight||0),0);
    return `<div class="card card-p" data-sec="${s.id}" style="margin-bottom:12px">
      <div class="between" style="margin-bottom:10px;gap:10px;flex-wrap:wrap">
        <div class="flex" style="gap:8px;flex:1;min-width:220px">
          <input class="inp" data-sf="name" value="${s.name}" style="max-width:260px;font-weight:700">
          <span class="flex" style="gap:4px"><span style="font-size:11px;color:var(--t3)">peso</span><input class="inp" data-sf="weight" type="number" value="${s.weight}" style="width:64px;padding:5px 8px"><span style="font-size:12px;color:var(--t3)">%</span></span>
          ${qs===100?ui.bdg('preguntas 100%','g'):ui.bdg('preguntas '+qs+'%','a')}
        </div>
        <button class="btn btn-ghost btn-sm" data-dels="${s.id}" style="color:var(--red)">✕ sección</button>
      </div>
      <table class="tbl"><thead><tr><th></th><th>Pregunta</th><th>Tipo</th><th>Peso %</th><th>Oblig.</th><th>Crít.</th><th>Evidencia</th><th></th></tr></thead>
      <tbody>${s.questions.map((q,i)=>qrow(s,q,i)).join('')}</tbody></table>
      <button class="btn btn-soft btn-sm" data-addq="${s.id}" style="margin-top:10px">＋ Pregunta</button>
    </div>`;
  };

  const draw=()=>{
    const v=ver(); const val=CX.programa.validate(v.sections);
    host.innerHTML=`
    ${ui.ph('Cuestionarios y Programa', p.name+' · secciones y preguntas ponderadas · versiones por criterio')}
    <div class="card card-p" style="margin-bottom:14px;background:var(--brand-light);border-color:#cfe6f7">
      <div style="font-size:12.5px;color:var(--brand-dark)">📌 <b>Fuente única.</b> Lo que definas aquí calcula el <b>score del shopper</b> al llenar el cuestionario y se refleja en el <b>Portal del Cliente</b> (mismas secciones y pesos).</div>
    </div>
    <div class="flex wrap" style="gap:7px;margin-bottom:14px;align-items:center">
      <span style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.5px">Versión</span>
      ${_qProg.versions.map(vv=>`<button class="btn ${vv.id===_qProg.activeId?'btn-pr':'btn-ghost'} btn-sm" data-ver="${vv.id}">${vv.name} · ${vv.criterio}</button>`).join('')}
      <button class="btn btn-soft btn-sm" id="addVer">＋ Versión</button>
      ${_qProg.versions.length>1?`<button class="btn btn-ghost btn-sm" id="delVer" style="color:var(--red)">✕ versión</button>`:''}
      <button class="btn btn-ghost btn-sm" id="dupVer">⧉ Duplicar</button>
    </div>
    <div class="card card-p" style="margin-bottom:14px">
      <div class="between" style="gap:10px;flex-wrap:wrap">
        <div class="flex" style="gap:8px;flex:1;min-width:240px">
          <input class="inp" id="verName" value="${v.name}" style="max-width:220px;font-weight:700">
          <select class="sel" id="verCrit" style="width:auto">${CRIT.map(c=>`<option ${c===v.criterio?'selected':''}>${c}</option>`).join('')}</select>
          <input class="inp" id="verAplica" value="${v.aplica||''}" placeholder="Aplica a (ej. Cadena X / Marca Y)" style="max-width:240px">
        </div>
        <div class="flex" style="gap:6px">
          ${val.sectionsOk?ui.bdg('Secciones 100%','g'):ui.bdg('Secciones '+val.sectionsSum+'%','a')}
          <button class="btn btn-green btn-sm" id="saveProg">💾 Guardar programa</button>
        </div>
      </div>
    </div>
    <div id="secList">${v.sections.map(secCard).join('')}</div>
    <div class="flex" style="gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn btn-soft btn-sm" id="addSec">＋ Sección</button>
      <button class="btn btn-ghost btn-sm" id="impBtn">📥 Importar</button>
      <button class="btn btn-ghost btn-sm" id="aiBtn">✨ Crear con IA</button>
    </div>
    <div class="card card-p">${ui.aiBox('Valido que las secciones sumen 100% y que cada sección sume 100% en sus preguntas. Puedes versionar el cuestionario por sucursal, marca o cadena. Las preguntas crítico/KO limitan el score si se incumplen.','Editor ponderado · una sola fuente para las 3 caras')}</div>`;
    bind();
  };

  const bind=()=>{
    host.querySelectorAll('[data-ver]').forEach(b=>b.addEventListener('click',()=>{sync();_qProg.activeId=b.dataset.ver;draw();}));
    host.querySelector('#addVer').addEventListener('click',()=>{sync();const v={id:CX.programa.uid('ver'),name:'Versión '+(_qProg.versions.length+1),criterio:'Por sucursal',aplica:'',sections:JSON.parse(JSON.stringify(ver().sections))};v.sections.forEach(s=>{s.id=CX.programa.uid('sec');s.questions.forEach(q=>q.id=CX.programa.uid('q'));});_qProg.versions.push(v);_qProg.activeId=v.id;draw();ui.toast('Versión creada','ok');});
    const dv=host.querySelector('#delVer'); if(dv)dv.addEventListener('click',()=>{_qProg.versions=_qProg.versions.filter(x=>x.id!==_qProg.activeId);_qProg.activeId=_qProg.versions[0].id;draw();ui.toast('Versión eliminada','');});
    host.querySelector('#dupVer').addEventListener('click',()=>{sync();const src=ver();const c=JSON.parse(JSON.stringify(src));c.id=CX.programa.uid('ver');c.name=src.name+' (copia)';c.sections.forEach(s=>{s.id=CX.programa.uid('sec');s.questions.forEach(q=>q.id=CX.programa.uid('q'));});_qProg.versions.push(c);_qProg.activeId=c.id;draw();ui.toast('Versión duplicada','ok');});
    host.querySelector('#addSec').addEventListener('click',()=>{sync();ver().sections.push({id:CX.programa.uid('sec'),name:'Nueva sección',weight:0,questions:[]});draw();});
    host.querySelector('#impBtn').addEventListener('click',()=>{sync();importModal();});
    host.querySelector('#aiBtn').addEventListener('click',()=>{sync();aiModal();});
    host.querySelectorAll('[data-dels]').forEach(b=>b.addEventListener('click',()=>{sync();const v=ver();v.sections=v.sections.filter(s=>s.id!==b.dataset.dels);draw();}));
    host.querySelectorAll('[data-addq]').forEach(b=>b.addEventListener('click',()=>{sync();const s=ver().sections.find(x=>x.id===b.dataset.addq);s.questions.push({id:CX.programa.uid('q'),name:'Nueva pregunta',tipo:'Escala 1–5',weight:0,req:false,critico:false});draw();}));
    host.querySelectorAll('[data-delq]').forEach(b=>b.addEventListener('click',()=>{sync();const[sid,qid]=b.dataset.delq.split('|');const s=ver().sections.find(x=>x.id===sid);s.questions=s.questions.filter(q=>q.id!==qid);draw();}));
    host.querySelector('#saveProg').addEventListener('click',()=>{
      sync(); const v=ver();
      v.name=host.querySelector('#verName').value||v.name; v.criterio=host.querySelector('#verCrit').value; v.aplica=host.querySelector('#verAplica').value;
      const val=CX.programa.validate(v.sections);
      CX.programa.save(p.id,_qProg);
      ui.toast(val.sectionsOk&&val.allQOk?'Programa guardado · aplica a shopper y portal del cliente':'Guardado (revisa pesos: deben sumar 100%)', val.sectionsOk&&val.allQOk?'ok':'a',3600);
      draw();
    });
  };
  draw();
  return host;
});

/* ---------- Usuarios & Permisos (matriz editable) ---------- */
let _uState=null;
CX.module('usuarios', ({ui})=>{
  if(!_uState) _uState={users:[
    {name:'Admin Demo',email:'admin@demo.cxorbia',rol:'super',activo:true},
    {name:'Coordinación',email:'coord@demo.cxorbia',rol:'admin',activo:true},
    {name:'Operaciones',email:'ops@demo.cxorbia',rol:'ops',activo:true},
    {name:'Evaluador 01',email:'evaluador01@demo.cxorbia',rol:'shopper',activo:true},
    {name:'Finanzas',email:'finanzas@demo.cxorbia',rol:'admin',activo:false},
  ]};
  const st=_uState;
  const MODS=[['Operación','op'],['Finanzas','fin'],['Admin Proyecto','prj'],['Capacitación','cap'],['Configuración','cfg'],['Portal Shopper','sh'],['Comercial','com']];
  if(!st.perm) st.perm={super:['op','fin','prj','cap','cfg','sh','com'],admin:['op','fin','prj','cap','com'],ops:['op','prj','cap'],shopper:['sh','cap']};
  const PERM=st.perm;

  const host=ui.el('div');
  if(!st.customRoles) st.customRoles=[];
  const allRoles=()=>[...CX.ROLES,...st.customRoles];
  const rolColor={super:'p',admin:'b',ops:'t',shopper:'g'};
  const getColor=(id)=>rolColor[id]||'n';

  const draw=()=>{
    const roles=allRoles();
    host.innerHTML=`
    <div class="between" style="margin-bottom:6px"><div>${ui.ph('Usuarios & Permisos', 'Roles con acceso por módulo · configurable y autoadministrable')}</div>
      <div class="flex" style="gap:8px"><button class="btn btn-ghost btn-sm" id="addRol">🎨 Nuevo rol</button><button class="btn btn-pr btn-sm" id="addU">＋ Invitar usuario</button></div></div>
    <div class="grid g4" style="margin-bottom:16px">
      ${roles.map(r=>`<div class="card card-p">
        <div class="flex between" style="margin-bottom:6px">${ui.bdg(r.label,getColor(r.id))}
          ${r.custom?`<button class="btn btn-ghost btn-sm" data-delrole="${r.id}" style="color:var(--red);padding:2px 7px;font-size:11px">✕</button>`:''}</div>
        <div style="font-size:11.5px;color:var(--t3)">${r.desc}</div>
        <div style="font-size:10px;color:var(--t3);margin-top:6px">${st.users.filter(u=>u.rol===r.id).length} usuario(s)</div></div>`).join('')}
    </div>
    <div class="card card-p" style="margin-bottom:16px">
      <div class="card-t" style="margin-bottom:12px">Usuarios</div>
      <table class="tbl"><thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>
      ${st.users.map((u,i)=>`<tr data-ui="${i}"><td><b>${u.name}</b></td><td style="font-size:12px">${u.email}</td>
        <td><select class="sel" data-rol style="width:auto;padding:5px 8px">${roles.map(r=>`<option value="${r.id}" ${r.id===u.rol?'selected':''}>${r.label}</option>`).join('')}</select></td>
        <td><label class="flex" style="gap:6px;font-size:12px"><input type="checkbox" data-act ${u.activo?'checked':''}> ${u.activo?'Activo':'Inactivo'}</label></td>
        <td style="text-align:right"><button class="btn btn-ghost btn-sm" data-ed="${i}" style="padding:2px 8px;font-size:11px">✎ Editar</button> <button class="btn btn-ghost btn-sm" data-rm="${i}" style="color:var(--red)">✕</button></td></tr>`).join('')}
      </tbody></table>
    </div>
    <div class="card card-p">
      <div class="between" style="margin-bottom:12px"><div class="card-t">Matriz de acceso por rol <span class="muted" style="font-weight:500;font-size:11px">· editable</span></div><span class="bdg bdg-g" id="permSaved" style="display:none">✓ Guardado</span></div>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Rol</th>${MODS.map(m=>`<th style="text-align:center">${m[0]}</th>`).join('')}</tr></thead><tbody>
      ${roles.map(r=>`<tr><td>${ui.bdg(r.label,getColor(r.id))}</td>${MODS.map(m=>`<td style="text-align:center"><input type="checkbox" class="permChk" data-role="${r.id}" data-mod="${m[1]}" ${PERM[r.id]&&PERM[r.id].includes(m[1])?'checked':''} ${r.id==='super'?'disabled title="Super siempre tiene acceso total"':''}></td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <div style="margin-top:14px">${ui.aiBox('Marca/desmarca el acceso de cada rol a cada módulo. Los roles personalizados permiten segmentar por área: Coordinador, Comercial, Revisor, etc. En producción también se valida en el backend.','Gobierno · autoadministrable')}</div>
    </div>`;
    host.querySelectorAll('[data-ui]').forEach(tr=>{const i=+tr.dataset.ui;
      tr.querySelector('[data-rol]').addEventListener('change',e=>{st.users[i].rol=e.target.value;ui.toast('Rol actualizado','ok');draw();});
      tr.querySelector('[data-act]').addEventListener('change',e=>{st.users[i].activo=e.target.checked;draw();});});
    host.querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click',()=>{st.users.splice(+b.dataset.rm,1);draw();ui.toast('Usuario eliminado','');}));
    host.querySelectorAll('[data-ed]').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.ed,u=st.users[i];
      ui.modal('✎ Editar usuario',`
        <div style="margin-bottom:10px"><label class="lbl">Nombre</label><input class="inp" id="euName" value="${(u.name||'').replace(/"/g,'&quot;')}"></div>
        <div style="margin-bottom:10px"><label class="lbl">Correo (cualquier dominio)</label><input class="inp" id="euMail" value="${(u.email||'').replace(/"/g,'&quot;')}" placeholder="correo@empresa.com"></div>
        <div style="margin-bottom:10px"><label class="lbl">Rol</label><select class="sel" id="euRol">${allRoles().map(r=>`<option value="${r.id}" ${r.id===u.rol?'selected':''}>${r.label}</option>`).join('')}</select></div>
        <div style="margin-bottom:14px"><label class="flex" style="gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="euAct" ${u.activo?'checked':''}> Usuario activo</label></div>
        <div class="between"><button class="btn btn-ghost btn-sm" id="euInvite">📨 Reenviar invitación</button><button class="btn btn-pr btn-sm" id="euSave">Guardar cambios</button></div>
      `,{onMount:(ov,close)=>{
        ov.querySelector('#euSave').addEventListener('click',()=>{
          const mail=(ov.querySelector('#euMail').value||'').trim();
          if(mail&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)){ui.toast('Correo inválido','warn');return;}
          u.name=(ov.querySelector('#euName').value||'').trim()||u.name;
          u.email=mail||u.email;u.rol=ov.querySelector('#euRol').value;u.activo=ov.querySelector('#euAct').checked;
          close();draw();ui.toast('Usuario actualizado','ok');
        });
        ov.querySelector('#euInvite').addEventListener('click',()=>{
          if(CX.automations&&CX.automations.fire)CX.automations.fire('invitacion_usuario',{nombre:u.name,email:u.email,rol:u.rol});
          ui.toast('Invitación reenviada a '+(u.email||u.name)+' (correo/WA según automatización)','ok',4000);
        });
      }});
    }));
    host.querySelectorAll('.permChk').forEach(c=>c.addEventListener('change',()=>{
      const role=c.dataset.role, mod=c.dataset.mod; PERM[role]=PERM[role]||[];
      if(c.checked){ if(!PERM[role].includes(mod))PERM[role].push(mod); } else { PERM[role]=PERM[role].filter(m=>m!==mod); }
      const sv=host.querySelector('#permSaved'); if(sv){sv.style.display='';setTimeout(()=>sv.style.display='none',1500);}
    }));
    host.querySelector('#addU').addEventListener('click',()=>ui.modal('Invitar usuario',`
      <div style="margin-bottom:12px"><label class="lbl">Nombre</label><input class="inp" id="nuName" placeholder="Nombre y apellido"></div>
      <div style="margin-bottom:12px"><label class="lbl">Correo</label><input class="inp" id="nuMail" placeholder="correo@empresa.com"></div>
      <div style="margin-bottom:16px"><label class="lbl">Rol</label><select class="sel" id="nuRol">${allRoles().map(r=>`<option value="${r.id}">${r.label}</option>`).join('')}</select></div>
      <div style="text-align:right"><button class="btn btn-pr btn-sm" id="nuSave">Enviar invitación</button></div>`,{onMount:(ov,close)=>{
        ov.querySelector('#nuSave').addEventListener('click',()=>{const n=ov.querySelector('#nuName').value||'Usuario nuevo';st.users.push({name:n,email:ov.querySelector('#nuMail').value||'nuevo@demo.cxorbia',rol:ov.querySelector('#nuRol').value,activo:true});close();draw();ui.toast('Invitación enviada','ok');});}}));
    /* Nuevo rol personalizado */
    host.querySelector('#addRol')?.addEventListener('click',()=>ui.modal('🎨 Crear rol personalizado',`
      <div class="grid g2" style="gap:10px;margin-bottom:12px">
        <div><label class="lbl">Nombre del rol</label><input class="inp" id="rnName" placeholder="Ej. Coordinador Regional"></div>
        <div><label class="lbl">ID interno (sin espacios)</label><input class="inp" id="rnId" placeholder="coordinador"></div>
      </div>
      <div style="margin-bottom:12px"><label class="lbl">Descripción</label><input class="inp" id="rnDesc" placeholder="Qué puede hacer este rol"></div>
      <div style="margin-bottom:14px"><label class="lbl">Módulos con acceso</label>
        <div class="flex wrap" style="gap:8px;margin-top:6px">${MODS.map(m=>`<label class="flex" style="gap:5px;font-size:12.5px;cursor:pointer"><input type="checkbox" data-rm="${m[1]}"> ${m[0]}</label>`).join('')}</div>
      </div>
      <div style="text-align:right"><button class="btn btn-pr btn-sm" id="rnSave">Crear rol</button></div>`,
    {onMount:(ov,close)=>ov.querySelector('#rnSave').addEventListener('click',()=>{
      const name=(ov.querySelector('#rnName').value||'').trim();
      if(!name){ui.toast('Pon un nombre al rol','warn');return;}
      let id=(ov.querySelector('#rnId').value||name).toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
      if(!id)id='rol_'+Date.now().toString(36);
      const mods=[...ov.querySelectorAll('[data-rm]:checked')].map(c=>c.dataset.rm);
      st.customRoles=st.customRoles||[];
      st.customRoles.push({id,label:name,desc:ov.querySelector('#rnDesc').value||'Rol personalizado',custom:true});
      PERM[id]=mods;
      close();draw();ui.toast('Rol "'+name+'" creado','ok');
    })}));
    /* Eliminar rol personalizado */
    host.querySelectorAll('[data-delrole]').forEach(b=>b.addEventListener('click',()=>{
      const rid=b.dataset.delrole;
      st.customRoles=(st.customRoles||[]).filter(r=>r.id!==rid);
      st.users.forEach(u=>{if(u.rol===rid)u.rol='admin';});
      delete PERM[rid]; draw(); ui.toast('Rol eliminado','');
    }));
  };
  draw();
  return host;
});

/* ---------- Configuración general (submenús + consola cliente/proveedor) ---------- */
let _cfgTab='centro', _cfgMode='proveedor';
CX.module('config', ({data,ui})=>{
  const p=data.project();
  const host=ui.el('div');
  const plan=CX.session.plan||p.plan||'estandar';

  const draw=()=>{
    host.innerHTML=`${ui.ph('Configuración', 'Centro de autoadministración · personaliza TODA la plataforma sin tocar código')}
    <div class="flex wrap" style="gap:6px;margin-bottom:14px">
      ${['centro','marca','plan','paises','listas','nda'].map(t=>`<button class="btn btn-sm ${_cfgTab===t?'btn-pr':'btn-ghost'}" data-tab="${t}">${{centro:'🎛️ Centro',marca:'🎨 Marca',plan:'📦 Plan',paises:'🌍 Países',listas:'📋 Listas',nda:'📜 NDA'}[t]}</button>`).join('')}
    </div>
    <div id="cfgBody"></div>`;
    host.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{_cfgTab=b.dataset.tab;drawTab();}));
    drawTab();
  };

  const drawTab=()=>{
    const body=host.querySelector('#cfgBody'); if(!body)return;
    if(_cfgTab==='centro') drawCentro(body);
    else if(_cfgTab==='listas') drawListas(body);
    else if(_cfgTab==='marca') drawMarca(body);
    else if(_cfgTab==='plan') drawPlan(body);
    else if(_cfgTab==='paises') drawPaises(body);
    else if(_cfgTab==='nda') drawNDA(body);
  };

  /* #175 — Listas/catálogos administrables (alimentan dropdowns de toda la plataforma) */
  const drawListas=(body)=>{
    const K='cx_listas';
    const defs={rubros:['Retail','Banca','Restaurantes','Salud','Telecom','Automotriz','Seguros','Combustibles'],tiposVisita:['Mystery presencial','Mystery Calling','Auditoría de imagen','Experiencia digital'],canales:['Tienda física','App móvil','Teléfono','Web','Delivery'],conceptosFin:['Anticipo','Honorario shopper','Comisión','Facturación','Remesa','Reembolso','Financiamiento'],estadosAccion:['Abierto','En curso','Cerrado']};
    const get=()=>{try{return Object.assign({},defs,JSON.parse(localStorage.getItem(K)||'{}'));}catch(e){return defs;}};
    const save=(o)=>{try{localStorage.setItem(K,JSON.stringify(o));}catch(e){}};
    const titles={rubros:'🏢 Rubros / Industrias',tiposVisita:'🎯 Tipos de visita',canales:'📡 Canales',conceptosFin:'💰 Conceptos financieros',estadosAccion:'🎬 Estados de acción'};
    const render=()=>{const data=get();
      body.innerHTML=`<div class="card card-p" style="margin-bottom:12px;background:var(--brand-light);border-color:#cfe6f7"><div style="font-size:13px;color:var(--brand-dark)">📋 Estas listas alimentan los menús desplegables de toda la plataforma. Edítalas sin tocar código.</div></div>
        <div class="grid g2" style="gap:14px">${Object.keys(titles).map(key=>`
          <div class="card card-p"><div class="card-t" style="margin-bottom:10px">${titles[key]}</div>
            <div>${data[key].map((v,i)=>`<div class="between" style="padding:5px 0;border-bottom:1px solid var(--border-2)"><span style="font-size:12.5px">${v}</span><button class="btn btn-ghost btn-sm" data-del="${key}:${i}" style="color:var(--red);padding:1px 7px">✕</button></div>`).join('')}</div>
            <div class="flex" style="gap:6px;margin-top:8px"><input class="inp" id="add-${key}" placeholder="Agregar…" style="flex:1;padding:5px 9px"><button class="btn btn-soft btn-sm" data-add="${key}">＋</button></div>
          </div>`).join('')}</div>`;
      body.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.add;const inp=body.querySelector('#add-'+key);const val=(inp.value||'').trim();if(!val)return;const o=get();o[key]=[...o[key],val];save(o);render();ui.toast('Agregado a '+titles[key],'ok');}));
      body.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{const [key,i]=b.dataset.del.split(':');const o=get();o[key]=o[key].filter((_,x)=>x!=+i);save(o);render();ui.toast('Eliminado','');}));
    };
    render();
  };

  /* Centro de autoadministración: mapa completo de TODO lo editable */
  const drawCentro=(body)=>{
    const areas=[
      {ic:'🎨',t:'Identidad de Marca',d:'Logo, colores, tipografía, tema visual. Se aplica a toda la plataforma, documentos y correos.',nav:'marca',tag:'Branding'},
      {ic:'📦',t:'Plan y Módulos',d:'Activa/desactiva módulos por plan. Personaliza qué ve cada tenant.',tab:'plan',tag:'Acceso'},
      {ic:'🌍',t:'Países y Monedas',d:'Agrega países de operación con su moneda. Las finanzas se separan automáticamente.',tab:'paises',tag:'Operación'},
      {ic:'🔐',t:'Usuarios y Permisos',d:'Invita usuarios, asigna roles y define la matriz de acceso por módulo. Crea roles personalizados.',nav:'usuarios',tag:'Seguridad'},
      {ic:'🧩',t:'Cuestionarios',d:'Editor de secciones, preguntas, pesos, criterios y versiones. Genera con IA desde un instructivo.',nav:'cuestionarios',tag:'Set-up'},
      {ic:'⚡',t:'Automatizaciones',d:'Conecta eventos con Make, WhatsApp, correo y Sheets. Toggles y plantillas por evento.',nav:'automatizaciones',tag:'Flujos'},
      {ic:'🔌',t:'Integraciones & Add-ons',d:'Correo, WhatsApp, Google, IA (Gemini), Canva, redes, facturación. Vincula y configura.',nav:'integraciones',tag:'Conexiones'},
      {ic:'✉️',t:'Correo integrado',d:'Bandeja con trazabilidad a clientes y proyectos. Outlook/Gmail. Plantillas.',nav:'correo',tag:'Comunicación'},
      {ic:'📁',t:'Proyectos',d:'Crea programas, define periodicidad de rondas, escenarios, periodo de cumplimiento y set-up.',nav:'proyectos',tag:'Set-up'},
      {ic:'🎓',t:'Academia',d:'Crea y edita cursos y lecciones (texto, video, quiz) con IA. Por rol: consultora, shopper, cliente.',nav:'aprendizaje',tag:'Capacitación'},
      {ic:'📄',t:'Documentos',d:'Genera documentos con IA y branding del cliente. Edita los existentes.',nav:'documentos',tag:'Contenido'},
      {ic:'📜',t:'NDA / Confidencialidad',d:'Edita el acuerdo de confidencialidad que firman los usuarios por rol.',tab:'nda',tag:'Legal'},
    ];
    body.innerHTML=`
    <div class="card card-p" style="margin-bottom:14px;background:var(--brand-light);border-color:#cfe6f7">
      <div style="font-size:13px;color:var(--brand-dark)"><b>✅ Toda la plataforma es autoadministrable.</b> Cada área de abajo se edita desde la interfaz, sin tocar código. Haz clic para abrir cada gestor.</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
      ${areas.map(a=>`<button class="card hov centro-area" ${a.nav?`data-nav="${a.nav}"`:''} ${a.tab?`data-tab2="${a.tab}"`:''} style="padding:16px;cursor:pointer;text-align:left;border:1px solid var(--border);background:#fff;display:flex;flex-direction:column;gap:6px">
        <div class="between"><div style="font-size:24px">${a.ic}</div><span class="bdg bdg-n" style="font-size:9.5px">${a.tag}</span></div>
        <div style="font-size:13.5px;font-weight:700;color:var(--t1)">${a.t}</div>
        <div style="font-size:11.5px;color:var(--t2);line-height:1.5">${a.d}</div>
        <div style="font-size:11px;color:var(--brand);font-weight:600;margin-top:2px">Abrir →</div>
      </button>`).join('')}
    </div>`;
    body.querySelectorAll('.centro-area').forEach(b=>b.addEventListener('click',()=>{
      if(b.dataset.nav)CX.router.nav(b.dataset.nav);
      else if(b.dataset.tab2){_cfgTab=b.dataset.tab2;drawTab();}
    }));
  };

  const drawMarca=(body)=>{
    const brandStored=(()=>{try{return JSON.parse(localStorage.getItem('cx_brand_identity')||'null');}catch(e){return null;}})();
    const logoUrl=brandStored&&brandStored.logo||CX.BRAND.logoUrl||'';
    const nombre=brandStored&&brandStored.name||CX.BRAND.name||'CXOrbia';
    const curTheme=CX.BRAND.theme||'cxorbia';
    body.innerHTML=`
    <div class="card card-p" style="margin-bottom:14px">
      <div class="between" style="margin-bottom:12px">
        <div class="card-t">Identidad de marca activa</div>
        <div class="flex" style="gap:8px">
          <button class="btn btn-ghost btn-sm" id="goMarca">🎨 Personalizar completo (logo, colores, tipografía) →</button>
          <button class="btn btn-ghost btn-sm" id="resetMarca" style="color:var(--red)">🔄 Restablecer CXOrbia</button>
        </div>
      </div>
      ${logoUrl
        ?`<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:8px 14px">
              <img src="${logoUrl}" style="max-height:44px;max-width:140px;object-fit:contain;display:block">
            </div>
            <div><div style="font-size:14px;font-weight:700">${nombre}</div><div style="font-size:12px;color:var(--t3)">Logo personalizado activo</div></div>
          </div>`
        :`<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <div style="width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,var(--brand-mid),var(--brand-dark));display:flex;align-items:center;justify-content:center">
              <div style="width:12px;height:12px;border:2px solid #fff;border-radius:50%;border-right-color:transparent"></div>
            </div>
            <div><div style="font-size:14px;font-weight:700">CXOrbia</div><div style="font-size:12px;color:var(--t3)">Logo predeterminado</div></div>
          </div>`
      }
      <div class="grid g2" style="gap:10px 14px;margin-bottom:14px">
        <div><label class="lbl">Nombre de la consultora</label><input class="inp" id="cfg_name" value="${CX.BRAND?.name||''}"></div>
        <div><label class="lbl">Tagline</label><input class="inp" id="cfg_tag" value="${CX.BRAND?.tagline||''}"></div>
      </div>
    </div>
    <div class="card card-p" style="margin-bottom:14px">
      <div class="card-t" style="margin-bottom:4px">🎨 Paleta de colores y tema visual</div>
      <div style="font-size:11.5px;color:var(--t3);margin-bottom:12px">Haz clic en una paleta para aplicarla al instante</div>
      <div class="grid g2" style="gap:10px">
        ${Object.entries(CX.THEMES).map(([id,t])=>`
          <button class="card hov tema-pick" data-tema="${id}" style="padding:14px;cursor:pointer;transition:.12s;text-align:left;border:1px solid var(--border);background:#fff;${curTheme===id?'border-color:var(--brand);box-shadow:0 0 0 2px var(--brand-light)':''}">
            <div class="flex" style="gap:8px;margin-bottom:8px">
              ${(['brand','accent','navy'].map(k=>`<div style="width:22px;height:22px;border-radius:6px;border:1px solid rgba(0,0,0,.08);background:${t.colors[k]||t.colors.brand}"></div>`)).join('')}
            </div>
            <div style="font-size:13px;font-weight:700;color:var(--t1)">${t.label} ${curTheme===id?'<span style="color:var(--brand);font-size:11px">● activo</span>':''}</div>
            <div style="font-size:10.5px;color:var(--t3);margin-top:2px">${t.railStyle==='light'?'Sidebar claro':'Sidebar oscuro'}</div>
          </button>`).join('')}
      </div>
    </div>`;
    body.querySelector('#goMarca')?.addEventListener('click',()=>CX.router.nav('marca'));
    body.querySelectorAll('.tema-pick').forEach(btn=>btn.addEventListener('click',()=>{
      const id=btn.dataset.tema;
      CX.applyTheme(id);
      try{localStorage.setItem('cx_theme',id);}catch(e){}
      if(CX.router&&CX.session.role)CX.router.buildRail(CX.session.role);
      ui.toast('✓ Tema aplicado: '+CX.THEMES[id].label,'ok');
      drawMarca(body);
    }));
    body.querySelector('#resetMarca')?.addEventListener('click',()=>{
      try{localStorage.removeItem('cx_brand_identity');}catch(e){}
      Object.assign(CX.BRAND,{logo:'',logoUrl:'',name:'CXOrbia',tagline:'Field Operations Platform',clientName:'',theme:'cxorbia'});
      CX.applyTheme('cxorbia');
      if(CX.router&&CX.session.role)CX.router.buildRail(CX.session.role);
      ui.toast('✅ Identidad restablecida a CXOrbia','ok',3000); drawMarca(body);
    });
    body.querySelector('#cfg_name')?.addEventListener('change',e=>{if(!CX.BRAND)CX.BRAND={};CX.BRAND.name=e.target.value;});
    body.querySelector('#cfg_tag')?.addEventListener('change',e=>{if(!CX.BRAND)CX.BRAND={};CX.BRAND.tagline=e.target.value;});
  };

  const drawPlan=(body)=>{
    const curPlan=CX.BRAND.plan||(localStorage.getItem('cx_plan'))||plan;
    body.innerHTML=`<div class="card card-p">
      <div class="card-h" style="margin-bottom:4px"><div class="card-t">Plan contratado</div><span class="muted">activa módulos automáticamente</span></div>
      <div style="font-size:11.5px;color:var(--t3);margin-bottom:12px">Haz clic en un plan para aplicarlo al instante. Los módulos de administración siempre quedan disponibles.</div>
      <div class="grid g4" style="gap:10px">
        ${Object.keys(CX.PLANS).map(k=>`<button class="card hov plan-pick" data-plan="${k}" style="padding:14px;cursor:pointer;text-align:center;border:1px solid var(--border);background:#fff;${curPlan===k?'border-color:var(--brand);box-shadow:0 0 0 2px var(--brand-light)':''}">
          <div style="font-size:13px;font-weight:800;color:var(--t1)">${CX.PLANS[k].label}${curPlan===k?' <span style="color:var(--brand);font-size:10px">● activo</span>':''}</div>
          <div style="font-size:10.5px;color:var(--t3);margin-top:3px">${CX.planModules(k).length} módulos</div></button>`).join('')}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
        <button class="btn btn-ghost btn-sm" id="editMods">⚙️ Personalizar módulos activos</button>
      </div>
    </div>`;
    body.querySelectorAll('.plan-pick').forEach(btn=>btn.addEventListener('click',()=>{
      const k=btn.dataset.plan;
      CX.applyPlan(k);
      if(CX.router&&CX.session.role)CX.router.buildRail(CX.session.role);
      ui.toast('✓ Plan '+CX.PLANS[k].label+' aplicado · '+CX.planModules(k).length+' módulos','ok',3000);
      drawPlan(body);
    }));
    body.querySelector('#editMods')?.addEventListener('click',()=>{
      const all=Object.keys(CX.MODULES).filter(k=>CX.MODULES[k].roles.includes('admin'));
      const active=new Set(CX.planModules(plan));
      ui.modal('⚙️ Módulos activos',
        '<p style="font-size:12.5px;color:var(--t2);margin-bottom:12px">Activa o desactiva módulos del menú.</p><div class="grid g2" style="gap:8px">'+
        all.map(k=>'<label class="flex" style="gap:9px;padding:9px 11px;border:1px solid var(--border);border-radius:9px;cursor:pointer"><input type="checkbox" class="modChk" data-id="'+k+'" '+(active.has(k)?'checked':'')+
        '> <b style="font-size:12.5px">'+CX.MODULES[k].icon+' '+CX.MODULES[k].label+'</b></label>').join('')+
        '</div><div style="text-align:right;margin-top:14px"><button class="btn btn-pr btn-sm" id="modSave">Guardar</button></div>',
        {onMount:(ov,close)=>{ov.querySelector('#modSave').addEventListener('click',()=>{
          const sel=[...ov.querySelectorAll('.modChk:checked')].map(c=>c.dataset.id);
          try{localStorage.setItem('cx_modules_override',JSON.stringify(sel));}catch(e){}
          CX.router.buildRail(CX.session.role);close();ui.toast(sel.length+' módulos activos guardados','ok');
        });}});
    });
  };

  const drawPaises=(body)=>{
    body.innerHTML=`<div class="card card-p">
      <div class="card-h"><div class="card-t">Países del proyecto</div><button class="btn btn-soft btn-sm" id="addPais">＋ Agregar país</button></div>
      <div class="flex wrap" style="gap:8px">${p.countries.map(c=>`<div class="flex" style="gap:6px;padding:6px 11px;border:1px solid var(--border);border-radius:9px">
        <span>${CX.paisFlag(c)} ${CX.paisName(c)} (${p.currency[c]||'—'})</span>
        <button class="btn btn-ghost btn-sm" data-rmc="${c}" style="color:var(--red);padding:1px 7px">✕</button></div>`).join('')}
      </div>
    </div>`;
    body.querySelector('#addPais')?.addEventListener('click',()=>{
      const opts=CX.COUNTRIES.filter(co=>!p.countries.includes(co.c));
      ui.modal('Agregar país',
        '<input class="inp" id="paisSearch" placeholder="🔎 Buscar..." style="margin-bottom:8px">'+
        '<div id="paisList" style="max-height:300px;overflow:auto">'+
        opts.map(co=>'<button class="btn btn-ghost" data-c="'+co.c+'" data-n="'+co.n+'" style="display:block;width:100%;text-align:left;padding:8px 11px">'+
        CX.paisFlag(co.c)+' '+co.n+' ('+co.cur+')</button>').join('')+'</div>',
        {onMount:(ov,close)=>{
          ov.querySelector('#paisSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase();ov.querySelectorAll('[data-c]').forEach(b=>{b.style.display=(b.dataset.n.toLowerCase().includes(q)||b.dataset.c.toLowerCase().includes(q))?'':'none';});});
          ov.querySelectorAll('[data-c]').forEach(b=>b.addEventListener('click',()=>{p.countries.push(b.dataset.c);p.currency=p.currency||{};p.currency[b.dataset.c]=CX.moneda(b.dataset.c);close();ui.toast(b.dataset.n+' agregado','ok');draw();}));
        }});
    });
    body.querySelectorAll('[data-rmc]').forEach(b=>b.addEventListener('click',()=>{p.countries=p.countries.filter(c=>c!==b.dataset.rmc);draw();ui.toast('País eliminado del proyecto','');}));
  };

  const drawNDA=(body)=>{
    const nda=CX.BRAND&&CX.BRAND.nda||'Al acceder a esta plataforma, confirmas que has leído y aceptas los términos de confidencialidad y uso de datos.';
    body.innerHTML=`<div class="card card-p">
      <div class="card-t" style="margin-bottom:10px">NDA / Acuerdo de confidencialidad</div>
      <textarea class="inp" id="cfg_nda" rows="6">${nda}</textarea>
      <div style="text-align:right;margin-top:10px"><button class="btn btn-pr btn-sm" id="saveNDA">Guardar NDA</button></div>
    </div>`;
    body.querySelector('#saveNDA')?.addEventListener('click',()=>{if(!CX.BRAND)CX.BRAND={};CX.BRAND.nda=body.querySelector('#cfg_nda').value;ui.toast('NDA actualizado','ok');});
  };

  draw();
  return host;
});

