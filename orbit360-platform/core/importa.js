/* ============================================================
   Orbit 360 · Importación inteligente (capa transversal)
   Drawer/wizard reutilizable por todos los módulos. Acepta
   CUALQUIER formato (PDF, Excel, CSV, imagen, planilla) y
   "extrae" a la entidad destino. (Demo: motor simulado; en
   producción se conecta el extractor inteligente real.)
   Uso:  Orbit.importa.open('clientes')
         Orbit.importa.open('estados-cuenta', { onDone })
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.importa = (function () {
  const U = Orbit.ui;

  // Catálogo de secciones de importación (todas las requeridas)
  const KINDS = {
    'base-inicial': { icon: '🗄', title: 'Base de datos inicial', desc: 'Carga completa para arrancar la plataforma (clientes, pólizas, cobros, comisiones).', cols: ['Entidad', 'Registros', 'Estado'], sample: [['Clientes', '142', 'Listo'], ['Pólizas', '388', 'Listo'], ['Cobros', '1 920', 'Listo'], ['Comisiones', '1 510', 'Listo']] },
    'clientes': { icon: '🧑‍💼', title: 'Importar clientes', desc: 'Detecta personas y empresas, identificación, contacto y asesor.', cols: ['Nombre', 'Tipo', 'Identificación', 'Asesor'], sample: [['Sofía Castellanos', 'Persona', '2547 88012 4', 'D. Marroquín'], ['Distribuidora Andina S.A.', 'Empresa', '901456789', 'L. Herrera'], ['Roberto Quezada', 'Persona', '1102 33456 7', 'M. Villatoro']] },
    'polizas': { icon: '📑', title: 'Importar pólizas', desc: 'Extrae número, ramo, producto, aseguradora, vigencia y prima.', cols: ['Póliza', 'Ramo', 'Aseguradora', 'Prima'], sample: [['GT-AT-48210', 'Auto', 'Seguros Atlas', 'Q 8,400'], ['CO-PA-91733', 'Hogar', 'Pacífico Seguros', '$ 1,2M'], ['GT-VE-22041', 'Gastos Médicos', 'Vértice', 'Q 14,900']] },
    'vehiculos': { icon: '🚗', title: 'Importar vehículos', desc: 'Asocia vehículos a clientes y pólizas de auto (placa, marca, modelo, año).', cols: ['Placa', 'Vehículo', 'Año', 'Cliente'], sample: [['P-482GTR', 'Toyota Hilux', '2023', 'R. Quezada'], ['CO-ABC12', 'Mazda CX-5', '2022', 'C. Rojas'], ['P-901XYZ', 'Hyundai Tucson', '2024', 'J. Pineda']] },
    'directorio-aseguradoras': { icon: '🏢', title: 'Importar directorio de aseguradoras', desc: 'Contactos, ramos, accesos. Se fusiona con la info del Cotizador.', cols: ['Aseguradora', 'Ramos', 'Contacto'], sample: [['Seguros Atlas', 'Auto, Vida, GM', 'mesa@atlas.com'], ['Pacífico Seguros', 'Auto, Hogar, RC', 'corredores@pacifico.co'], ['Vértice Seguros', 'Auto, GM, Hogar', 'soporte@vertice.gt']] },
    'estados-cuenta': { icon: '🧾', title: 'Importar estados de cuenta', desc: 'Lee el estado de cartera que envía cada aseguradora en CUALQUIER formato (PDF, Excel, imagen). Despliega recibos según forma de pago, detecta recibos no creados y pagos aún no aplicados, y permite aplicar pagos por póliza.', cols: ['Recibo', 'Póliza', 'Forma pago', 'Monto'], sample: [['REC-00451', 'GT-AT-48210', 'Mensual', 'Q 700'], ['REC-00452', 'GT-AT-48210', 'Mensual', 'Q 700'], ['REC-01188', 'CO-PA-91733', 'Trimestral', '$ 300K']], conciliacion: true, detect: { noCreados: [['ATL-99820', 'GT-AT-77310', 'No existe en Orbit', 'Q 1,150'], ['ATL-99821', 'GT-AT-48210', 'Cuota 7/12 faltante', 'Q 700']], noAplicados: [['REC-00451', 'GT-AT-48210', 'Pagado en banco, sin aplicar', 'Q 700'], ['REC-01044', 'CO-PA-91733', 'Transferencia 12-jun', '$ 300K']] } },
    'planillas-comision': { icon: '💼', title: 'Importar planillas de comisiones', desc: 'Lee la planilla de comisiones que envía la aseguradora en CUALQUIER formato y la cruza contra las comisiones devengadas: detecta pagos no aplicados a póliza y valida que la liquidación de cada asesor sea la correcta.', cols: ['Aseguradora', 'Periodo', 'Comisión', 'Cruce'], sample: [['Seguros Atlas', '2026-05', 'Q 12,400', '✓ concilia'], ['Pacífico Seguros', '2026-05', '$ 3,1M', '◷ revisar'], ['Vértice', '2026-05', 'Q 6,900', '✓ concilia']], detect: { noCreados: [['Atlas · GT-AT-77310', 'Póliza no creada en Orbit', 'Comisión huérfana', 'Q 410']], noAplicados: [['Pacífico · CO-PA-91733', 'Comisión cobrada, pago no aplicado', 'Recaudo sin conciliar', '$ 92K'], ['Atlas · GT-AT-48210', 'Liquidación asesor difiere 2%', 'Ajuste de % asesor', 'Q 58']] } },
    'movimientos-finanzas': { icon: '💰', title: 'Importar movimientos / estados de cuenta (Finanzas)', desc: 'Histórico de movimientos para generar mensuales y conciliar.', cols: ['Fecha', 'Concepto', 'Monto', 'Tipo'], sample: [['2026-05-31', 'Liquidación Atlas', 'Q 12,400', 'Ingreso'], ['2026-05-28', 'Comisión asesor DM', 'Q -3,100', 'Egreso'], ['2026-05-15', 'Pago cliente REC-00451', 'Q 700', 'Ingreso']] },
    'estados-banco': { icon: '🏦', title: 'Importar estado de cuenta bancario', desc: 'Lee el estado bancario en cualquier formato (PDF, Excel, CSV) para conciliar finanzas: cruza depósitos con recaudo y egresos con liquidaciones.', cols: ['Fecha', 'Descripción', 'Monto', 'Conciliación'], sample: [['2026-05-31', 'Depósito Atlas', 'Q 12,400', '✓ liquidación'], ['2026-05-15', 'Transf. cliente', 'Q 700', '✓ REC-00451'], ['2026-05-12', 'Comisión NETxxx', 'Q 4,210', '◷ sin asociar']], detect: { noCreados: [['MOV-5521', 'Depósito sin movimiento en Orbit', 'Crear movimiento', 'Q 1,900']], noAplicados: [['Transf. 0455', 'Depósito de cliente no aplicado', 'Aplicar a recibo', 'Q 700']] } },
    'calendario-marketing': { icon: '📣', title: 'Importar calendarización de contenidos', desc: 'Carga el calendario; se muestra como mes con cada día y sus piezas.', cols: ['Fecha', 'Contenido', 'Pieza', 'Canal'], sample: [['2026-06-03', 'Tip de renovación', 'Reel', 'Instagram'], ['2026-06-10', 'Beneficio Vida', 'Carrusel', 'Facebook'], ['2026-06-18', 'Caso de éxito', 'Post', 'LinkedIn']] },
    'facturas': { icon: '🧾', title: 'Importar facturas', desc: 'Adjunta facturas al expediente; se extraen número, fecha, monto y se vinculan a la póliza.', cols: ['Factura', 'Fecha', 'Monto', 'Póliza'], sample: [['FAC-2041', '2026-05-12', 'Q 8,400', 'GT-AT-48210'], ['FAC-2042', '2026-05-30', 'Q 700', 'GT-AT-48210']] },
    'documentos': { icon: '📎', title: 'Importar documentos', desc: 'Carga uno o varios documentos (DPI, RTU, patente, recibo de servicios, pólizas en PDF). El motor extrae datos y completa la ficha.', cols: ['Documento', 'Tipo detectado', 'Dato extraído'], sample: [['dpi_frente.jpg', 'DPI', 'Dirección, fecha nac.'], ['rtu_2026.pdf', 'RTU', 'Razón social, NIT'], ['poliza_auto.pdf', 'Póliza', 'Vehículo, vigencia']] },
    'docs-aseguradora': { icon: '🏢', title: 'Importar documentos de aseguradora', desc: 'Carga tarifas, formularios, cotizaciones y pólizas de ejemplo. En modo inteligente, alimenta el Cotizador, el Comparativo y la IA; en modo documental, solo se almacenan para consulta.', cols: ['Documento', 'Categoría detectada', 'Uso'], sample: [['tarifario_2026.pdf', 'Tarifas', 'Cotizador / Comparativo'], ['formulario_auto.pdf', 'Formularios', 'Requisitos de emisión'], ['cotizacion_ejemplo.pdf', 'Cotización ejemplo', 'Entrenar IA']] }
  };

  let state = null;

  function ensureDom() {
    if (document.getElementById('imp-back')) return;
    const back = document.createElement('div'); back.id = 'imp-back'; back.className = 'drawer-back';
    const dr = document.createElement('div'); dr.id = 'imp-drawer'; dr.className = 'drawer';
    document.body.appendChild(back); document.body.appendChild(dr);
    back.addEventListener('click', close);
  }

  /* Importación con destino = un expediente de cliente.
     Muestra un menú de tipos relevantes y vincula al cliente. */
  function openFor(cid) {
    ensureDom();
    const cli = Orbit.store.get('clientes', cid);
    const nombre = cli ? cli.nombre : 'cliente';
    const opciones = [
      ['polizas', 'Pólizas'], ['vehiculos', 'Vehículos'], ['estados-cuenta', 'Estados de cuenta'],
      ['facturas', 'Facturas'], ['documentos', 'Documentos (DPI/RTU/…)']
    ];
    state = { picker: true, cid, nombre, opciones };
    document.getElementById('imp-back').classList.add('open');
    document.getElementById('imp-drawer').classList.add('open');
    const dr = document.getElementById('imp-drawer');
    dr.innerHTML = `<div class="imp-head">
        <div><div class="imp-eyebrow">Importar al expediente</div>
        <div class="imp-title">📂 ${U.esc(nombre)}</div></div>
        <button class="imp-x" id="imp-close">✕</button>
      </div>
      <div class="imp-body">
        <p class="imp-desc">Selecciona qué importar. Podés cargar <b>varios archivos</b> a la vez; el motor mapea y <b>vincula todo a este expediente</b>.</p>
        <div class="imp-cards">${opciones.map(o => `<button class="imp-card" data-k="${o[0]}"><span class="ic">${KINDS[o[0]].icon}</span><span class="tx"><b>${o[1]}</b><small>${U.esc(KINDS[o[0]].desc)}</small></span><span class="go">Importar →</span></button>`).join('')}</div>
        <div class="imp-note" style="margin-top:14px">🔗 Todo lo importado aquí queda vinculado a <b>${U.esc(nombre)}</b>. Al terminar te llevamos a la ficha para revisar y complementar.</div>
      </div>`;
    dr.querySelector('#imp-close').addEventListener('click', close);
    dr.querySelectorAll('.imp-card').forEach(el => el.addEventListener('click', () => open(el.dataset.k, { multi: true, scope: { cid, nombre }, onDone: () => { location.hash = '#/cliente360?c=' + cid; } })));
  }

  function open(kind, opts) {
    ensureDom();
    const meta = KINDS[kind] || KINDS['clientes'];
    state = { kind, meta, step: 1, opts: opts || {}, multi: opts && opts.multi, scope: opts && opts.scope, modo: (opts && opts.modo) || 'inteligente', files: [] };
    document.getElementById('imp-back').classList.add('open');
    document.getElementById('imp-drawer').classList.add('open');
    paint();
  }
  function close() {
    document.getElementById('imp-back') && document.getElementById('imp-back').classList.remove('open');
    document.getElementById('imp-drawer') && document.getElementById('imp-drawer').classList.remove('open');
  }

  function paint() {
    const dr = document.getElementById('imp-drawer');
    const m = state.meta;
    const steps = ['Cargar archivo', 'Extracción inteligente', 'Confirmar'];
    dr.innerHTML = `<div class="imp-head">
        <div><div class="imp-eyebrow">Importación inteligente</div>
        <div class="imp-title">${m.icon} ${U.esc(m.title)}</div></div>
        <button class="imp-x" id="imp-close">✕</button>
      </div>
      <div class="imp-steps">${steps.map((s, i) => `<span class="imp-step ${state.step === i + 1 ? 'on' : ''} ${state.step > i + 1 ? 'done' : ''}"><b>${state.step > i + 1 ? '✓' : i + 1}</b>${s}</span>`).join('')}</div>
      <div class="imp-body">${state.step === 1 ? step1(m) : state.step === 2 ? step2(m) : step3(m)}</div>`;
    dr.querySelector('#imp-close').addEventListener('click', close);
    wire();
  }

  function step1(m) {
    return `<p class="imp-desc">${U.esc(m.desc)}</p>
      <div class="imp-mode" id="imp-mode">
        <button class="imp-mode-b ${state.modo !== 'documental' ? 'on' : ''}" data-modo="inteligente">✨ Inteligente<small>extrae y mapea a los módulos</small></button>
        <button class="imp-mode-b ${state.modo === 'documental' ? 'on' : ''}" data-modo="documental">📁 Documental<small>solo almacena para consulta</small></button>
      </div>
      <div class="imp-drop" id="imp-drop">
        <div style="font-size:40px">⬆️</div>
        <div style="font-weight:700;font-family:var(--f-display);font-size:16px;margin-top:6px">Arrastra ${state.multi ? 'tus archivos' : 'tu archivo'} aquí</div>
        <div class="muted" style="font-size:13px;margin-top:4px">Acepta <b>cualquier formato</b>${state.multi ? ' y <b>varios a la vez</b>' : ''}: PDF, Excel, CSV, imagen o planilla.</div>
        <label class="btn ghost sm" style="margin-top:14px;cursor:pointer">Seleccionar archivo${state.multi ? 's' : ''}<input type="file" id="imp-file" ${state.multi ? 'multiple' : ''} style="display:none"></label>
        <div id="imp-files" class="imp-files"></div>
      </div>
      <div class="imp-note">${state.modo === 'documental' ? '📁 Modo documental: los archivos se <b>almacenan y quedan visibles</b> en el expediente/ficha, sin extraer datos.' : '🧠 Modo inteligente: reconoce el formato, <b>extrae los datos y los mapea</b> a Orbit 360 (cruza y complementa sin duplicar).'}</div>`;
  }
  function step2(m) {
    const scopeNote = state.scope ? `<div class="imp-note" style="margin-top:0;margin-bottom:12px">🔗 Se vinculará a <b>${U.esc(state.scope.nombre)}</b>.</div>` : '';
    const assoc = state.kind === 'vehiculos' ? `<div class="card pad" style="margin-top:12px"><b style="font-family:var(--f-display);font-size:13px">Asociar a</b>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:9px">
        <label class="ce-l">Cliente<select class="o-sel" style="width:100%">${Orbit.store.all('clientes').slice(0, 8).map(c => `<option ${state.scope && state.scope.cid === c.id ? 'selected' : ''}>${U.esc(c.nombre)}</option>`).join('')}</select></label>
        <label class="ce-l">Póliza de auto<select class="o-sel" style="width:100%">${Orbit.store.where('polizas', p => p.ramo === 'Auto').slice(0, 8).map(p => `<option>${p.numero}</option>`).join('') || '<option>—</option>'}</select></label>
      </div></div>` : '';
    return `${scopeNote}<p class="imp-desc">Detectamos y mapeamos estos registros. Revisa antes de confirmar.</p>
      <div class="imp-scan"><span class="imp-spark">🧠</span> Extracción ${state.iterado ? 'refinada (' + state.iterado + 'ª pasada)' : 'completada'} · <b>${m.sample.length}+ registros</b> reconocidos · 0 errores de formato.<button class="btn ghost sm" id="imp-iterar" style="margin-left:auto">🔄 Iterar / mejorar</button></div>
      <div class="card" style="overflow:hidden;margin-top:12px"><table class="tbl"><thead><tr>${m.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${m.sample.map(row => `<tr>${row.map((cell, i) => `<td${i === 0 ? ' style="font-weight:600"' : ''}>${U.esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${assoc}
      ${m.detect ? `
        <div class="imp-detect">
          <div class="imp-det-card warn">
            <div class="idc-h"><span>🧩</span> Recibos no creados <b>${m.detect.noCreados.length}</b></div>
            <div class="idc-sub">Aparecen en el estado de la aseguradora pero no existen aún en Orbit. Se crearán al confirmar.</div>
            <table class="tbl" style="margin-top:8px"><tbody>${m.detect.noCreados.map(r => `<tr><td class="mono" style="font-size:12px">${r[0]}</td><td class="mono" style="font-size:12px">${r[1]}</td><td style="font-size:12px">${r[2]}</td><td class="num">${r[3]}</td></tr>`).join('')}</tbody></table>
          </div>
          <div class="imp-det-card info">
            <div class="idc-h"><span>💸</span> Pagos no aplicados <b>${m.detect.noAplicados.length}</b></div>
            <div class="idc-sub">Pagos detectados que aún no se aplicaron a su póliza. Se aplicarán sin duplicar lo ya conciliado.</div>
            <table class="tbl" style="margin-top:8px"><tbody>${m.detect.noAplicados.map(r => `<tr><td class="mono" style="font-size:12px">${r[0]}</td><td class="mono" style="font-size:12px">${r[1]}</td><td style="font-size:12px">${r[2]}</td><td class="num">${r[3]}</td></tr>`).join('')}</tbody></table>
          </div>
        </div>` : ''}
      ${state.kind === 'planillas-comision' ? tarifasDetect() : ''}
      ${m.conciliacion ? `<div class="imp-note" style="margin-top:12px">🧾 Se desplegaron los <b>recibos según forma de pago</b>. La conciliación <b>no duplica</b>: solo crea lo que falta, completa o ajusta lo que no coincida. En el paso siguiente podés <b>aplicar pagos por póliza</b>.</div>` : ''}`;
  }

  /* Tarifas detectadas en la planilla: % por PRODUCTO que paga cada aseguradora (editable) */
  function tarifasDetect() {
    if (!state.detectedRates) {
      const asgs = Orbit.store.all('aseguradoras').slice(0, 3);
      const rows = [];
      asgs.forEach(a => {
        const ramos = (a.ramos || []).slice(0, 2);
        ramos.forEach(r => {
          const prods = (Orbit.cat && Orbit.cat.subramosDe) ? Orbit.cat.subramosDe(a.pais, r) : [];
          const prod = prods[0] || r;
          const baseP = (a.comisiones && a.comisiones[r]) || a.comisionDefault || 12;
          rows.push({ aseguradoraId: a.id, asg: a.nombre, ramo: r, producto: prod, pct: baseP + (Math.random() > .5 ? 2 : -1) });
        });
      });
      state.detectedRates = rows;
    }
    return `<div class="card" style="overflow:hidden;margin-top:14px;border:1px solid var(--info)">
      <div style="padding:10px 13px;background:rgba(31,58,95,.06);font-family:var(--f-display);font-weight:700;font-size:13px">💼 Tarifas leídas de la planilla · % por producto <span class="muted" style="font-weight:400">(editable antes de aplicar)</span></div>
      <table class="tbl"><thead><tr><th>Aseguradora</th><th>Ramo</th><th>Producto</th><th class="num">% que paga</th></tr></thead>
      <tbody>${state.detectedRates.map((r, i) => `<tr>
        <td>${U.esc(r.asg)}</td><td>${U.esc(r.ramo)}</td><td>${U.esc(r.producto)}</td>
        <td class="num"><input type="number" min="0" max="100" step="0.5" value="${r.pct}" data-rate="${i}" style="width:64px;text-align:right;padding:4px 6px;border:1px solid var(--line);border-radius:6px">%</td></tr>`).join('')}</tbody></table>
      <div class="imp-note" style="margin:0;border-radius:0">Al confirmar, estos % se cargan en <b>Tarifas de comisión</b> como override por producto. No se duplica: actualiza lo existente.</div>
    </div>`;
  }
  function step3(m) {
    return `<div style="text-align:center;padding:24px 8px">
        <div style="font-size:52px">✅</div>
        <div style="font-family:var(--f-display);font-weight:800;font-size:20px;margin-top:8px">Importación lista para aplicar</div>
        <p class="muted" style="max-width:380px;margin:10px auto 0">Los registros se integran a la capa de datos y quedan disponibles en todos los módulos relacionados.</p>
        ${m.conciliacion ? `<button class="btn ghost" style="margin-top:16px">Aplicar pagos por póliza →</button>` : ''}
        <div style="margin-top:20px;display:flex;gap:8px;justify-content:center">
          <button class="btn ghost" id="imp-again">Importar otro</button>
          <button class="btn primary" id="imp-finish">Finalizar</button>
        </div>
        <div class="muted" style="font-size:12px;margin-top:14px">${state.modo === 'documental' ? 'Los archivos quedan almacenados y visibles en el expediente/ficha.' : 'En producción se conecta el extractor real (IA) para mapear automáticamente.'}</div>
      </div>`;
  }
  function wire() {
    const dr = document.getElementById('imp-drawer');
    const drop = dr.querySelector('#imp-drop');
    dr.querySelectorAll('.imp-mode-b').forEach(b => b.addEventListener('click', () => { state.modo = b.dataset.modo; paint(); }));
    const fileInput = dr.querySelector('#imp-file');
    if (fileInput) fileInput.addEventListener('change', e => {
      state.files = [...e.target.files].map(f => f.name);
      state.filesReal = [...e.target.files];
      const fl = dr.querySelector('#imp-files');
      if (fl) fl.innerHTML = state.files.map(n => `<span class="mail-chip">📎 ${U.esc(n)}</span>`).join('');
      if (state.files.length) setTimeout(() => { state.step = state.modo === 'documental' ? 3 : 2; paint(); }, 400);
    });
    if (drop) {
      // clic en el área (no en el botón-label) abre el selector de archivo real
      drop.addEventListener('click', e => { if (e.target.closest('label')) return; if (fileInput) fileInput.click(); });
      drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); state.step = state.modo === 'documental' ? 3 : 2; paint(); });
    }
    if (state.step === 2) {
      const it = dr.querySelector('#imp-iterar');
      if (it) it.addEventListener('click', () => {
        const ins = prompt('¿Qué quieres mejorar de la extracción? (ej. "corrige las fechas", "separa nombre y apellido", "ignora filas vacías")', '');
        if (ins === null) return;
        state.iterado = (state.iterado || 1) + 1;
        paint();
        const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '🔄 Extracción refinada con tu instrucción'; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
      });
      // editar tarifas detectadas (planilla de comisiones)
      dr.querySelectorAll('[data-rate]').forEach(inp => inp.addEventListener('change', () => { state.detectedRates[+inp.dataset.rate].pct = +inp.value || 0; }));
      // botón continuar al pie
      const body = dr.querySelector('.imp-body');
      const bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px';
      bar.innerHTML = `<button class="btn ghost" id="imp-back2">Atrás</button><button class="btn primary" id="imp-next2">Confirmar mapeo →</button>`;
      body.appendChild(bar);
      bar.querySelector('#imp-back2').addEventListener('click', () => { state.step = 1; paint(); });
      bar.querySelector('#imp-next2').addEventListener('click', () => { state.step = 3; paint(); });
    }
    const fin = dr.querySelector('#imp-finish'); if (fin) fin.addEventListener('click', () => {
      if (state.kind === 'planillas-comision' && state.detectedRates && Orbit.comeng) {
        const n = Orbit.comeng.aplicarPlanilla(state.detectedRates);
        if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast('✓ ' + n + ' tarifas de comisión actualizadas');
      }
      close(); if (state.opts.onDone) state.opts.onDone();
    });
    const again = dr.querySelector('#imp-again'); if (again) again.addEventListener('click', () => { state.step = 1; paint(); });
  }

  return { open, openFor, close, KINDS };
})();
