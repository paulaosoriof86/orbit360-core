/* CXOrbia · Portal del Cliente — Capacitación · Reportes · Mi Programa · Add-ons */

/* ============== Capacitación (brechas → cursos recomendados) ============== */
CX.module('cli_capacitacion', ({ui})=>{
  const C=CX.clienteData, p=CX.data.project();
  const list=C.scoped(p), R=C.resumen(list);
  const CURSOS={
    recib:['Protocolo de bienvenida','Primeros 30 segundos de servicio'],
    aten:['Asesoría consultiva','Manejo de objeciones','Escucha activa'],
    tiemp:['Gestión de filas y tiempos','Eficiencia operativa en piso'],
    inst:['Estándares de imagen y limpieza','Visual merchandising'],
    proc:['Cumplimiento de protocolo','Calidad y consistencia'],
    cierre:['Cierre y fidelización','Venta cruzada efectiva'],
  };
  const gaps=R.secAvg.slice(0,3); // 3 secciones más débiles
  const needTraining=list.filter(s=>s.score<70);

  setTimeout(()=>{ CX.cliUI.wirePersona();
    document.querySelectorAll('[data-asig]').forEach(b=>b.addEventListener('click',()=>CX.ui.toast('Capacitación asignada: '+b.dataset.asig,'ok')));
  },0);

  const gapCard=(g)=>{
    const cursos=CURSOS[g.sec.id]||['Capacitación general de servicio'];
    return `<div class="card card-p">
      <div class="between"><div class="card-t" style="font-size:14px">${g.sec.name}</div>${CX.cliUI.pill(g.val)}</div>
      <div class="bar" style="margin:10px 0 14px"><i style="width:${g.val}%;background:${CX.cliUI.TONE_VAR[C.tone(g.val)]}"></i></div>
      <div class="grid" style="gap:8px">${cursos.map(c=>`<div class="flex between" style="gap:10px"><span style="font-size:12.5px;color:var(--t1)">🎓 ${c}</span><button class="btn btn-soft btn-sm" data-asig="${c}">Asignar</button></div>`).join('')}</div>
    </div>`;
  };

  return `
    ${ui.ph('Capacitación', 'Cierra brechas: cursos recomendados según los resultados del programa')}
    ${CX.cliUI.personaBarHTML()}
    <div class="grid g4" style="margin-bottom:16px">
      ${ui.kpi('Sucursales a reforzar',needTraining.length,'a','score < 70')}
      ${ui.kpi('Brecha principal',R.peorSeccion.sec.name,'r')}
      ${ui.kpi('Score más bajo',R.peorSeccion.val,'r','/100')}
      ${ui.kpi('Cursos sugeridos',gaps.reduce((a,g)=>a+((CURSOS[g.sec.id]||[1]).length),0),'b')}
    </div>
    <div class="card-t" style="font-size:13px;margin-bottom:12px">Brechas prioritarias y cursos recomendados</div>
    <div class="grid g3" style="gap:14px;margin-bottom:18px">${gaps.map(gapCard).join('')}</div>
    <div class="card card-p">
      <div class="card-h"><div class="card-t">Sucursales que requieren capacitación</div></div>
      ${needTraining.length?`<table class="tbl"><thead><tr><th>Sucursal</th><th>Región</th><th>Responsable</th><th>Score</th><th></th></tr></thead><tbody>
        ${needTraining.map(s=>`<tr><td><b>${s.name}</b></td><td style="font-size:12px">${s.region}</td><td style="font-size:12px;color:var(--t3)">${s.responsable}</td><td>${CX.cliUI.pill(s.score)}</td><td style="text-align:right"><button class="btn btn-soft btn-sm" data-asig="Plan de capacitación · ${s.name}">Asignar plan</button></td></tr>`).join('')}
      </tbody></table>`:ui.empty('✅','Ninguna sucursal por debajo del umbral. ¡Buen trabajo!')}
      <div style="margin-top:14px">${ui.aiBox('La academia para tu personal es un servicio adicional: cursos, evaluación y certificación ligados a las brechas que detecta el programa.','Servicio de capacitación')}</div>
    </div>`;
});

/* ============== Reportes (exportables) ============== */
CX.module('cli_reportes', ({ui})=>{
  const C=CX.clienteData, p=CX.data.project();
  const list=C.scoped(p), R=C.resumen(list);
  setTimeout(()=>{ CX.cliUI.wirePersona();
    document.querySelectorAll('[data-rep]').forEach(b=>b.addEventListener('click',()=>CX.ui.toast('Generando “'+b.dataset.rep+'” ('+b.dataset.fmt+') — demo','ok',2600)));
  },0);
  const reps=[
    ['📊','Resumen ejecutivo de la marca','Score global, NPS, ranking y tendencia'],
    ['🏬','Scorecard por sucursal','Desglose ponderado por sección y visita'],
    ['🗺️','Cobertura por región','Avance del programa por región y periodo'],
    ['📈','Tendencia y benchmarking','Comparativo entre periodos y regiones'],
    ['🎯','Planes de acción','Incentivos, mejoras y sanciones con seguimiento'],
    ['🎓','Brechas y capacitación','Secciones débiles y cursos recomendados'],
  ];
  return `
    ${ui.ph('Reportes', 'Entregables listos para dirección, regional y sucursal')}
    ${CX.cliUI.personaBarHTML()}
    <div class="grid g4" style="margin-bottom:16px">
      ${ui.kpi('Sucursales en alcance',R.n,'b')}${ui.kpi('Visitas del periodo',R.visitas,'p')}
      ${ui.kpi('Score global',R.score,C.tone(R.score),'/100')}${ui.kpi('NPS',R.nps,'g')}
    </div>
    <div class="grid g2" style="gap:14px">
      ${reps.map(r=>`<div class="card card-p flex" style="gap:14px">
        <div style="font-size:26px">${r[0]}</div>
        <div style="flex:1"><div class="card-t" style="font-size:14px">${r[1]}</div><div style="font-size:12px;color:var(--t3);margin-top:2px">${r[2]}</div></div>
        <div class="flex" style="gap:6px"><button class="btn btn-soft btn-sm" data-rep="${r[1]}" data-fmt="PDF">PDF</button><button class="btn btn-soft btn-sm" data-rep="${r[1]}" data-fmt="Excel">Excel</button><button class="btn btn-soft btn-sm" data-rep="${r[1]}" data-fmt="PPT">PPT</button></div>
      </div>`).join('')}
    </div>
    <div style="margin-top:16px">${ui.aiBox('Cada reporte respeta tu rol y alcance: un Responsable de Sucursal exporta lo suyo; un Director, toda la marca.','Exportación por permiso')}</div>`;
});

/* ============== Mi Programa (cuestionario con pesos + simulador) ============== */
CX.module('cli_programa', ({ui})=>{
  const C=CX.clienteData, p=CX.data.project(), prog=C.programa(p);
  const secBlock=(sec)=>`
    <div class="card card-p">
      <div class="between"><div class="card-t" style="font-size:14px">${sec.name}</div><span class="bdg bdg-b">Peso ${sec.weight}%</span></div>
      <table class="tbl" style="margin-top:10px"><thead><tr><th>Pregunta</th><th style="text-align:right">Peso en la sección</th></tr></thead><tbody>
        ${sec.questions.map(q=>`<tr><td style="font-size:12.5px">${q.name}</td><td style="text-align:right"><b style="font-family:var(--disp)">${q.weight}%</b></td></tr>`).join('')}
      </tbody></table>
    </div>`;
  const simRows=prog.map(sec=>`<div class="flex" style="gap:10px;margin-bottom:10px">
    <span style="width:160px;font-size:12px;color:var(--t2);flex-shrink:0">${sec.name} · ${sec.weight}%</span>
    <input type="range" min="0" max="100" value="80" data-sim="${sec.id}" data-w="${sec.weight}" style="flex:1;accent-color:var(--brand)">
    <b data-simv="${sec.id}" style="width:34px;text-align:right;font-size:12px;font-family:var(--disp)">80</b></div>`).join('');

  setTimeout(()=>{ CX.cliUI.wirePersona();
    const calc=()=>{ let tot=0; document.querySelectorAll('[data-sim]').forEach(r=>{ const v=+r.value, w=+r.dataset.w; tot+=v*(w/100); document.querySelector('[data-simv="'+r.dataset.sim+'"]').textContent=v; });
      tot=Math.round(tot); const out=document.getElementById('simScore'); out.textContent=tot;
      out.style.color=CX.cliUI.TONE_VAR[CX.clienteData.tone(tot)]; document.getElementById('simPill').innerHTML=CX.cliUI.pill(tot); };
    document.querySelectorAll('[data-sim]').forEach(r=>r.addEventListener('input',calc)); calc();
  },0);

  const sumSec=prog.reduce((a,s)=>a+s.weight,0);
  return `
    ${ui.ph('Mi Programa de Evaluación', 'Qué se evalúa y cuánto pesa cada cosa · ponderación del score')}
    ${CX.cliUI.personaBarHTML()}
    <div class="card card-p" style="margin-bottom:16px">
      <div class="between"><div class="card-t">Estructura ponderada</div><span class="bdg ${sumSec===100?'bdg-g':'bdg-r'}">Secciones suman ${sumSec}%</span></div>
      <p style="font-size:12.5px;color:var(--t2);margin-top:6px">El score de cada visita = Σ(sección × su peso). Dentro de cada sección, cada pregunta aporta según su propio peso. La consultora configura esta estructura por programa; aquí la consultas (edición según tu plan).</p>
    </div>
    <div class="grid g2" style="gap:14px;margin-bottom:18px">${prog.map(secBlock).join('')}</div>
    <div class="card card-p">
      <div class="between" style="margin-bottom:14px"><div class="card-t">🧮 Simulador de score</div><div class="flex" style="gap:10px"><b id="simScore" style="font-size:30px;font-family:var(--disp);color:var(--brand)">80</b><span id="simPill"></span></div></div>
      ${simRows}
      <div style="margin-top:8px">${ui.aiBox('Mueve las secciones para ver cómo cambia el score global según los pesos del programa. Útil para fijar metas por sucursal.','Cómo leer el score')}</div>
    </div>`;
});

/* ============== Servicios & Add-ons (marketplace) ============== */
CX.module('cli_market', ({ui})=>{
  const C=CX.clienteData;
  const DET={
    'Investigación de mercados':{como:'Diseñamos y ejecutamos estudios ad-hoc (paneles, encuestas cuanti/cuali, focus groups) y los cruzamos con tus datos de mystery shopping para una lectura 360°.',valor:['Decisiones con evidencia, no intuición','Mismo proveedor que ya conoce tu marca','Resultados en tableros, no en PDFs sueltos']},
    'Voz del Cliente (VoC)':{como:'Encuestas post-transacción (QR en sucursal, link, WhatsApp) que capturan al cliente REAL y calculan tu NPS/CSAT en vivo, comparable con la evaluación incógnita.',valor:['Contrastas lo que dice el cliente vs. lo que ve el evaluador','NPS por sucursal en tiempo real','Alertas automáticas ante caídas']},
    'Mystery shopping competitivo':{como:'Medimos a tu competencia con la misma vara y escenarios, para que sepas dónde estás vs. el sector.',valor:['Benchmark objetivo por sector','Identifica tus ventajas y brechas reales','Argumento para dirección y junta']},
    'Academia para tu personal':{como:'Cursos y certificación para TU personal, generados a partir de las brechas que detecta el programa: si falla "tiempos de espera", se crea el módulo de refuerzo.',valor:['Capacitación dirigida a lo que de verdad falla','Certifica a tu equipo, no solo lo evalúa','Mide la mejora curso → siguiente visita']},
    'Evidencia foto/GPS/video':{como:'Validación de ubicación (geocerca), foto con timestamp y video según el escenario, para evidencia irrefutable de cada visita.',valor:['Cero dudas sobre si la visita ocurrió','Evidencia con hora y lugar verificables','Soporta auditorías y reclamos']},
    'BI & tableros avanzados':{como:'Conectamos tus datos a Power BI / Looker para explotarlos a profundidad con tableros ejecutivos a la medida.',valor:['Tu data integrada con el resto del negocio','Tableros para dirección','Exploración sin límites']},
    'Contenidos & campañas':{como:'Generación de piezas y campañas (con IA), publicación y medición — para reclutar shoppers o comunicar resultados de marca.',valor:['Convocatorias de evaluadores más rápidas','Comunicación de marca consistente','Medición de alcance y engagement']},
    'Integraciones a la medida':{como:'Conectamos WhatsApp, Notion, Zoom/Meet, Mailchimp, Microsoft 365, SSO y más, según tu stack.',valor:['La plataforma vive dentro de tus herramientas','Automatizaciones de punta a punta','Single sign-on para tu equipo']},
  };
  const tagTone={'Add-on':'b','Pro':'p','Enterprise':'a'};
  const detail=(m)=>{ const d=DET[m.name]||{como:m.desc,valor:[]};
    ui.modal(m.icon+' '+m.name,`
      <div class="flex" style="gap:8px;margin-bottom:10px">${ui.bdg(m.tag,tagTone[m.tag]||'n')}<span class="muted" style="font-size:11.5px">${m.cat}</span></div>
      <div style="font-size:12.5px;color:var(--t2);line-height:1.6;margin-bottom:12px">${d.como}</div>
      ${d.valor.length?`<div class="card-t" style="font-size:12.5px;margin-bottom:6px">Valor para tu marca</div>
      <ul style="margin:0 0 14px 18px;font-size:12.5px;color:var(--t2);line-height:1.7">${d.valor.map(v=>`<li>${v}</li>`).join('')}</ul>`:''}
      <div style="text-align:right"><button class="btn btn-pr btn-sm" data-req="${m.name}">Solicitar a mi consultora</button></div>
    `,{onMount:(ov,close)=>ov.querySelector('[data-req]').addEventListener('click',()=>{close();ui.toast('Solicitud enviada a tu consultora: '+m.name,'ok',2800);})});
  };
  setTimeout(()=>{ CX.cliUI.wirePersona();
    document.querySelectorAll('[data-svc]').forEach(b=>b.addEventListener('click',()=>detail(C.marketplace.find(x=>x.name===b.dataset.svc))));
    document.querySelectorAll('[data-card]').forEach(b=>b.addEventListener('click',()=>detail(C.marketplace.find(x=>x.name===b.dataset.card))));
  },0);
  const card=(m)=>`<div class="card card-p hov" data-card="${m.name}" style="cursor:pointer">
    <div class="between"><div style="font-size:26px">${m.icon}</div>${ui.bdg(m.tag,tagTone[m.tag]||'n')}</div>
    <div class="card-t" style="font-size:14px;margin-top:10px">${m.name}</div>
    <div style="font-size:12.5px;color:var(--t2);margin-top:4px;line-height:1.5">${m.desc}</div>
    <div style="font-size:11px;color:var(--t3);margin-top:8px">${m.cat}</div>
    <button class="btn btn-soft btn-sm" data-svc="${m.name}" style="margin-top:12px;width:100%">Ver detalle y solicitar</button>
  </div>`;
  return `
    ${ui.ph('Servicios & Add-ons', 'Lleva tu programa más allá del trabajo de campo')}
    ${CX.cliUI.personaBarHTML()}
    <div class="card card-p" style="margin-bottom:16px;background:var(--brand-light);border:none">
      <div class="card-t" style="font-size:15px;color:var(--brand-dark)">De plataforma operativa a plataforma estratégica</div>
      <p style="font-size:12.5px;color:var(--brand-dark);margin-top:4px;line-height:1.6">Estos servicios los habilita tu consultora como valor agregado: investigación, voz del cliente, capacitación, BI, marketing e integraciones. Solicítalos y tu consultora arma la propuesta.</p>
    </div>
    <div class="grid g3" style="gap:14px">${C.marketplace.map(card).join('')}</div>`;
});
