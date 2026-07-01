/* CXOrbia · Comercial — Calculadora de costos & Propuestas (consultora) */
/* CXOrbia · Comercial — Calculadora de costos & Propuestas (consultora)
   #159: las propuestas quedan vinculadas al cliente con estado y trazabilidad. */
CX.propStore = CX.propStore || {
  _k:'cx_propuestas',
  all(){ try{return JSON.parse(localStorage.getItem(this._k)||'[]');}catch(e){return [];} },
  save(a){ try{localStorage.setItem(this._k,JSON.stringify(a));}catch(e){} CX.bus&&CX.bus.emit('crm'); },
  forClient(name){ if(!name)return []; return this.all().filter(p=>(p.cliente||'').toLowerCase()===(''+name).toLowerCase()); },
  add(prop){ const a=this.all(); a.unshift(Object.assign({id:'prop'+Date.now().toString(36),fecha:new Date().toISOString().slice(0,10),estado:'borrador'},prop)); this.save(a); return a[0]; },
  setEstado(id,estado){ const a=this.all(); const p=a.find(x=>x.id===id); if(p){p.estado=estado;p.histStatus=(p.histStatus||[]);p.histStatus.push({estado,fecha:new Date().toISOString().slice(0,10)});} this.save(a); },
  update(id,patch){ const a=this.all(); const p=a.find(x=>x.id===id); if(p)Object.assign(p,patch); this.save(a); },
  del(id){ this.save(this.all().filter(x=>x.id!==id)); },
};

CX.module('costos', ({data,ui})=>{
  const p=data.project();
  const cur=(p.currency&&p.currency[p.countries[0]])||'$';
  // estado editable (persistente por sesión en memoria del módulo)
  let cfg=Object.assign(CX.costos.defaults(),{moneda:cur}, _costosState||{});
  const host=ui.el('div');

  const fields=[
    ['Volumen','visitasMes','Visitas / mes',''],
    ['Honorarios','honShopperCapital','Honorario shopper (capital)',cur],
    ['Honorarios','incrUbicacionPct','Incremento ubicación (interior)','%'],
    ['Honorarios','mixInteriorPct','% de visitas en interior','%'],
    ['Honorarios','viaticoInterior','Viático por visita interior',cur],
    ['Reembolsos','reembolsoPorVisita','Reembolso por visita (consumo/boleto)',cur],
    ['Overhead','revisionPorVisita','Revisión / QA por visita',cur],
    ['Overhead','rrhhLqPorVisita','RRHH / liquidación por visita',cur],
    ['Overhead','coordinacionMes','Coordinación / mes',cur],
    ['Overhead','plataformaMes','Plataforma / mes',cur],
    ['Fiscal','regaliasPct','Regalías de marca','%'],
    ['Fiscal','retencionPct','Retención fuente / ISR','%'],
    ['Pricing','margenObjetivoPct','Margen objetivo','%'],
  ];
  const groups=[...new Set(fields.map(f=>f[0]))];

  const draw=()=>{
    const r=CX.costos.calc(cfg);
    const f=(n)=>CX.costos.fmt(cfg.moneda,n);
    const inputBlock=(g)=>`<div class="card card-p" style="margin-bottom:12px">
      <div class="card-t" style="font-size:13px;margin-bottom:10px">${g}</div>
      <div class="grid g2" style="gap:10px 14px">
      ${fields.filter(x=>x[0]===g).map(x=>`<div><label class="lbl">${x[2]}${x[3]?' ('+x[3]+')':''}</label>
        <input class="inp cfgF" data-k="${x[1]}" type="number" value="${cfg[x[1]]}" style="padding:7px 10px"></div>`).join('')}
      </div></div>`;

    const compar=CX.costos.compararModalidades(cfg);
    const maxP=Math.max(...compar.map(c=>c.precioPorVisita));

    host.innerHTML=`
    ${ui.ph('Calculadora de Costos & Propuestas', p.name+' · estructura de costos → precio sugerido por margen · '+cfg.moneda)}
    <div class="grid" style="grid-template-columns:1.05fr .95fr;gap:16px;align-items:start">
      <div>
        <div class="card card-p" style="margin-bottom:12px">
          <label class="lbl">Modalidad de servicio</label>
          <select class="sel" id="cfgMod">${CX.costos.modalidadList().map(m=>`<option value="${m.k}" ${m.k===cfg.modalidad?'selected':''}>${m.label} (×${m.mult})</option>`).join('')}</select>
        </div>
        ${groups.map(inputBlock).join('')}
      </div>
      <div>
        <div class="card card-p" style="position:sticky;top:8px">
          <div class="between" style="margin-bottom:12px"><div class="card-t">Resultado</div><span class="bdg ${r.margenPct>=cfg.margenObjetivoPct?'bdg-g':'bdg-a'}">${r.margenPct}% margen</span></div>
          <div style="text-align:center;padding:8px 0 14px;border-bottom:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.5px">Precio sugerido / visita</div>
            <div style="font-size:34px;font-weight:800;font-family:var(--disp);color:var(--brand-dark);line-height:1.1">${f(r.precioPorVisita)}</div>
            <div style="font-size:12px;color:var(--t3)">costo/visita ${f(r.costoPorVisita)} · ${r.visitas} visitas/mes</div>
          </div>
          <div style="padding:12px 0">
            ${[['Honorarios shopper',r.honTotal],['Viáticos interior',r.viaticos],['Revisión / QA',r.revision],['RRHH / liquidación',r.rrhh],['Coordinación + plataforma',r.fijos]].map(x=>`<div class="between" style="padding:5px 0"><span style="font-size:12px;color:var(--t2)">${x[0]}</span><b style="font-size:12.5px">${f(x[1])}</b></div>`).join('')}
            <div class="between" style="padding:7px 0;border-top:1px solid var(--border-2);margin-top:4px"><span style="font-size:12.5px;font-weight:700">Costo directo / mes</span><b style="color:var(--red)">${f(r.costoDirecto)}</b></div>
            <div class="between" style="padding:5px 0"><span style="font-size:12px;color:var(--t2)">Regalías (${cfg.regaliasPct}%)</span><b style="font-size:12.5px">${f(r.regalias)}</b></div>
            <div class="between" style="padding:5px 0"><span style="font-size:12px;color:var(--t2)">Retención / ISR (${cfg.retencionPct}%)</span><b style="font-size:12.5px">${f(r.retencion)}</b></div>
            <div class="between" style="padding:5px 0"><span style="font-size:12px;color:var(--green);font-weight:700">Margen / utilidad</span><b style="color:var(--green)">${f(r.margen)}</b></div>
          </div>
          <div style="background:var(--brand-light);border-radius:10px;padding:11px 13px;margin-top:4px">
            <div class="between"><span style="font-size:12px;font-weight:700;color:var(--brand-dark)">Precio al cliente / mes</span><b style="font-family:var(--disp);font-size:16px;color:var(--brand-dark)">${f(r.precioCliente)}</b></div>
            <div style="font-size:10.5px;color:var(--brand-dark);opacity:.8;margin-top:3px">incluye reembolsos pass-through ${f(r.reembolsos)}</div>
          </div>
          <div style="background:#eafaf1;border-radius:10px;padding:10px 13px;margin-top:8px">
            <div class="between"><span style="font-size:12px;font-weight:700;color:#1d7a44">Honorario sugerido al shopper</span><b style="color:#1d7a44">${f(r.honShopperProm)}/visita</b></div>
          </div>
          <button class="btn btn-pr btn-sm" id="genProp" style="width:100%;margin-top:12px">📄 Generar propuesta</button>
        </div>
      </div>
    </div>

    <div class="card card-p" style="margin-top:16px">
      <div class="card-h"><div class="card-t">Comparador de modalidades</div><span class="muted" style="font-size:11px">mismos parámetros · precio por visita</span></div>
      <table class="tbl"><thead><tr><th>Modalidad</th><th>Costo/visita</th><th>Precio/visita</th><th>Margen</th><th></th></tr></thead><tbody>
        ${compar.map(c=>`<tr style="${c.key===cfg.modalidad?'background:var(--brand-light)':''}"><td><b>${c.modalidad}</b></td><td>${f(c.costoPorVisita)}</td><td style="font-weight:700;color:var(--brand-dark)">${f(c.precioPorVisita)}</td><td>${ui.bdg(c.margenPct+'%',c.margenPct>=30?'g':'a')}</td>
          <td><div class="bar" style="min-width:90px"><i style="width:${Math.round(c.precioPorVisita/maxP*100)}%;background:var(--brand)"></i></div></td></tr>`).join('')}
      </tbody></table>
      <div style="margin-top:12px">${ui.aiBox('El precio sale del costo directo dividido por (1 − margen − regalías − retención), así el margen objetivo se respeta después de cargas. Los reembolsos son pass-through y no inflan la utilidad. La calculadora también sugiere el honorario del shopper según ubicación y modalidad.','Pricing por margen objetivo')}</div>
    </div>`;

    bind();
  };

  const bind=()=>{
    host.querySelector('#cfgMod').addEventListener('change',e=>{cfg.modalidad=e.target.value;_costosState=cfg;draw();});
    host.querySelectorAll('.cfgF').forEach(inp=>inp.addEventListener('input',()=>{cfg[inp.dataset.k]=+inp.value||0;_costosState=cfg;
      // recalcula solo el panel sin perder foco: redibujo completo es simple y seguro
      const r=CX.costos.calc(cfg); host.querySelector('#genProp'); draw(); 
      const again=host.querySelector('[data-k="'+inp.dataset.k+'"]'); if(again){again.focus();again.setSelectionRange(again.value.length,again.value.length);}
    }));
    host.querySelector('#genProp').addEventListener('click',()=>propuesta(CX.costos.calc(cfg)));
  };

  const PLANTILLAS={
    formal:{n:'Formal corporativa',intro:(cli,r)=>`Nos complace presentar a ${cli.name||'su empresa'} nuestra propuesta para un programa de <b>${r.modalidad}</b> de <b>${r.visitas} visitas mensuales</b>, diseñado para medir y elevar la experiencia en sus puntos de servicio con rigor metodológico y evidencia verificable.`},
    consultiva:{n:'Consultiva / valor',intro:(cli,r)=>`En ${cli.name||'su organización'} cada interacción cuenta. Proponemos un programa de <b>${r.modalidad}</b> (${r.visitas} visitas/mes) que no solo audita: identifica brechas, prioriza acciones y acompaña la mejora continua con tableros y planes de capacitación dirigidos.`},
    directa:{n:'Directa / ejecutiva',intro:(cli,r)=>`Programa de <b>${r.modalidad}</b>: ${r.visitas} visitas/mes, evaluación ponderada, evidencia y portal de resultados. Inversión clara, ROI medible, sin sorpresas.`},
    corporativa:{n:'Mi plantilla corporativa',intro:(cli,r)=>`${cli.name||'Estimado cliente'}: ${r.visitas} visitas · ${r.modalidad} · <span style="color:var(--t3);font-size:11px">[Completa con el formato de tu plantilla]</span>`},
  };

  /* plantilla corporativa: carga y parseo */
  let _tplContent='';
  const loadTpl=()=>ui.modal('📋 Cargar plantilla corporativa',`
    <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Sube tu plantilla (Word/PDF/HTML) o pega el texto. La IA la usa como formato base para la propuesta, insertando los datos del programa automáticamente.</p>
    <input type="file" class="inp" accept=".docx,.pdf,.html,.txt" style="padding:7px;margin-bottom:8px" id="tplFile">
    <textarea class="inp" id="tplTxt" rows="5" placeholder="o pega aquí el contenido de tu plantilla con [NOMBRE_CLIENTE], [VISITAS], [PRECIO], [MODALIDAD] como variables…" style="margin-bottom:10px"></textarea>
    <div style="text-align:right"><button class="btn btn-pr btn-sm" id="tplSave">Usar como plantilla base</button></div>
  `,{onMount:(ov,close)=>{
    ov.querySelector('#tplFile').addEventListener('change',e=>{const f=e.target.files[0];if(f){const rd=new FileReader();rd.onload=ev=>{_tplContent=ev.target.result.substring(0,5000);ov.querySelector('#tplTxt').value='Plantilla cargada: '+f.name+' ('+Math.round(f.size/1024)+'KB). La IA usará su formato.';};rd.readAsText(f);}});
    ov.querySelector('#tplSave').addEventListener('click',()=>{_tplContent=ov.querySelector('#tplTxt').value.trim();close();ui.toast('Plantilla corporativa cargada · se usará en la próxima propuesta','ok',3200);});
  }});

  const propuesta=(r)=>{
    const f=(n)=>CX.costos.fmt(cfg.moneda,n);
    const cli=data.getClient?(data.clients.find(c=>data.projectsForClient(c.id).some(x=>x.id===p.id))||{}):{};
    let tpl='formal'; let intro=PLANTILLAS[tpl].intro(cli,r);
    const beneficios=['Coordinación de campo y evaluadores certificados','Revisión de calidad (QA) de cada cuestionario','Plataforma operativa + portal de resultados para la marca','Reporte de hallazgos y ranking de sucursales','Planes de capacitación dirigidos a las áreas más débiles'];
    const render=()=>`
      <div class="flex" style="gap:8px;margin-bottom:12px">
        <select class="sel" id="propTpl" style="width:auto">${Object.keys(PLANTILLAS).map(k=>`<option value="${k}" ${k===tpl?'selected':''}>Plantilla: ${PLANTILLAS[k].n}</option>`).join('')}</select>
        <button class="btn btn-soft btn-sm" id="loadTplBtn">📋 Cargar mi plantilla</button>
        <button class="btn btn-soft btn-sm" id="propIA">✨ Redactar con IA</button>
        <button class="btn btn-ghost btn-sm" id="propWeb">🔎 Investigar cliente (web)</button>
      </div>
      <div style="border:1px solid var(--border);border-radius:12px;padding:18px 20px">
        <div class="between" style="border-bottom:2px solid var(--brand);padding-bottom:10px;margin-bottom:12px">
          <div class="flex" style="gap:12px;align-items:center">
            ${(CX.BRAND.logo||CX.BRAND.logoUrl)?`<img src="${CX.BRAND.logo||CX.BRAND.logoUrl}" style="max-height:42px;max-width:130px;object-fit:contain">`:''}
            <div><div style="font-size:17px;font-weight:800;color:var(--brand-dark)" contenteditable>Propuesta de servicio</div>
            <div style="font-size:12px;color:var(--t3)">${cli.name||'Cliente'} · ${p.name} · ${r.modalidad}</div></div>
          </div>
          <div style="font-size:11px;color:var(--t3);text-align:right">${CX.BRAND.name||'CXOrbia'}<br>${new Date().toLocaleDateString('es-GT')}<br>${cfg.moneda}</div>
        </div>
        <div style="font-size:12.5px;color:var(--t2);line-height:1.6;margin-bottom:12px" id="propIntro" contenteditable>${intro}</div>
        <div style="font-size:12px;font-weight:700;color:var(--t1);margin-bottom:6px">Incluye</div>
        <ul style="font-size:12px;color:var(--t2);line-height:1.7;margin:0 0 12px 18px" id="propBen" contenteditable>${beneficios.map(b=>`<li>${b}</li>`).join('')}</ul>
        <table class="tbl" style="margin-bottom:12px"><tbody>
          <tr><td>Visitas por mes</td><td style="text-align:right"><b>${r.visitas}</b></td></tr>
          <tr><td>Inversión por visita</td><td style="text-align:right"><b>${f(r.precioPorVisita)}</b></td></tr>
          <tr><td>Reembolsos (pass-through)</td><td style="text-align:right">${f(r.reembolsos)}</td></tr>
          <tr><td style="font-weight:800">Inversión mensual total</td><td style="text-align:right;font-weight:800;color:var(--brand-dark)">${f(r.precioCliente)}</td></tr>
        </tbody></table>
        <div style="font-size:11px;color:var(--t3)">Vigencia 30 días · Edita cualquier texto haciendo clic sobre él.</div>
      </div>
      <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:14px">
        <button class="btn btn-ghost btn-sm" data-x5>Cerrar</button>
        <button class="btn btn-soft btn-sm" id="propPdf">⤓ Exportar PDF</button>
        <button class="btn btn-pr btn-sm" id="propSend">📤 Enviar al cliente</button>
      </div>`;
    ui.modal('Propuesta · '+p.name, render(),{onMount:(ov,close)=>{
      const wire=()=>{
        ov.querySelector('#loadTplBtn').addEventListener('click',loadTpl);
        ov.querySelector('#propTpl').addEventListener('change',e=>{tpl=e.target.value;intro=PLANTILLAS[tpl].intro(cli,r);ov.querySelector('#propIntro').innerHTML=intro;});
        ov.querySelector('#propIA').addEventListener('click',()=>{
          const creativa=`Imagine la experiencia de sus clientes en ${cli.name||'cada sucursal'} medida con la precisión de un aliado estratégico. Nuestro programa de <b>${r.modalidad}</b> —${r.visitas} visitas/mes— convierte cada visita incógnita en inteligencia accionable: detectamos lo que su equipo no ve, priorizamos lo que mueve la aguja y lo acompañamos con capacitación dirigida. No entregamos reportes; entregamos decisiones.`;
          ov.querySelector('#propIntro').innerHTML=creativa;
          ui.toast(CX.ai&&CX.ai.ready()?'Redactado con '+CX.ai.cfg().model:'Borrador creativo (configura Gemini para personalización por relevamiento)','ok',3600);
        });
        ov.querySelector('#propWeb').addEventListener('click',()=>ui.modal('🔎 Investigar cliente en la web',`
          <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">La IA busca información pública de <b>${cli.name||'el cliente'}</b> (sector, presencia, nº de sucursales, tono de marca) para personalizar la propuesta.</p>
          <input class="inp" id="webQ" value="${cli.name||''}" placeholder="Nombre / sitio del cliente" style="margin-bottom:12px">
          <div style="text-align:right"><button class="btn btn-pr btn-sm" onclick="CX.ui.toast('${CX.ai&&CX.ai.ready()?'Investigación aplicada a la propuesta':'Configura Gemini para investigación web real'}','ok');this.closest('.cx-ov').remove()">Investigar</button></div>`));
        ov.querySelector('[data-x5]').addEventListener('click',close);
        ov.querySelector('#propPdf').addEventListener('click',()=>{
          CX.propStore.add({cliente:cli.name||p.name,proyecto:p.name,modalidad:r.modalidad,visitas:r.visitas,total:r.precioCliente,moneda:cfg.moneda,intro:ov.querySelector('#propIntro').innerHTML,estado:'borrador'});
          ui.toast('Propuesta guardada (borrador) · queda en la ficha del cliente','ok',3600);
        });
        ov.querySelector('#propSend').addEventListener('click',()=>{
          CX.propStore.add({cliente:cli.name||p.name,proyecto:p.name,modalidad:r.modalidad,visitas:r.visitas,total:r.precioCliente,moneda:cfg.moneda,intro:ov.querySelector('#propIntro').innerHTML,estado:'enviada'});
          close();ui.toast('📤 Propuesta enviada · registrada en la ficha del cliente con trazabilidad','ok',4000);
        });
      };
      wire();
    }});
  };

  draw();
  return host;
});
window._costosState=window._costosState||null;
