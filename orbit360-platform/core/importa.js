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
    'estados-cuenta': { icon: '🧾', title: 'Importar estados de cuenta', desc: 'Lee el estado de la aseguradora, despliega recibos según forma de pago y permite aplicar pagos por póliza (habilita conciliación).', cols: ['Recibo', 'Póliza', 'Forma pago', 'Monto'], sample: [['REC-00451', 'GT-AT-48210', 'Mensual', 'Q 700'], ['REC-00452', 'GT-AT-48210', 'Mensual', 'Q 700'], ['REC-01188', 'CO-PA-91733', 'Trimestral', '$ 300K']], conciliacion: true },
    'planillas-comision': { icon: '💼', title: 'Importar planillas de comisiones', desc: 'Cruza la planilla de la aseguradora contra las comisiones devengadas.', cols: ['Aseguradora', 'Periodo', 'Comisión', 'Cruce'], sample: [['Seguros Atlas', '2026-05', 'Q 12,400', '✓ concilia'], ['Pacífico Seguros', '2026-05', '$ 3,1M', '◷ revisar'], ['Vértice', '2026-05', 'Q 6,900', '✓ concilia']] },
    'movimientos-finanzas': { icon: '💰', title: 'Importar movimientos / estados de cuenta (Finanzas)', desc: 'Histórico de movimientos para generar mensuales y conciliar.', cols: ['Fecha', 'Concepto', 'Monto', 'Tipo'], sample: [['2026-05-31', 'Liquidación Atlas', 'Q 12,400', 'Ingreso'], ['2026-05-28', 'Comisión asesor DM', 'Q -3,100', 'Egreso'], ['2026-05-15', 'Pago cliente REC-00451', 'Q 700', 'Ingreso']] },
    'calendario-marketing': { icon: '📣', title: 'Importar calendarización de contenidos', desc: 'Carga el calendario; se muestra como mes con cada día y sus piezas.', cols: ['Fecha', 'Contenido', 'Pieza', 'Canal'], sample: [['2026-06-03', 'Tip de renovación', 'Reel', 'Instagram'], ['2026-06-10', 'Beneficio Vida', 'Carrusel', 'Facebook'], ['2026-06-18', 'Caso de éxito', 'Post', 'LinkedIn']] }
  };

  let state = null;

  function ensureDom() {
    if (document.getElementById('imp-back')) return;
    const back = document.createElement('div'); back.id = 'imp-back'; back.className = 'drawer-back';
    const dr = document.createElement('div'); dr.id = 'imp-drawer'; dr.className = 'drawer';
    document.body.appendChild(back); document.body.appendChild(dr);
    back.addEventListener('click', close);
  }

  function open(kind, opts) {
    ensureDom();
    const meta = KINDS[kind] || KINDS['clientes'];
    state = { kind, meta, step: 1, opts: opts || {} };
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
      <div class="imp-drop" id="imp-drop">
        <div style="font-size:40px">⬆️</div>
        <div style="font-weight:700;font-family:var(--f-display);font-size:16px;margin-top:6px">Arrastra tu archivo aquí</div>
        <div class="muted" style="font-size:13px;margin-top:4px">Acepta <b>cualquier formato</b>: PDF, Excel, CSV, imagen o planilla.</div>
        <button class="btn ghost sm" style="margin-top:14px">Seleccionar archivo</button>
      </div>
      <div class="imp-note">🧠 La extracción inteligente reconoce el formato automáticamente y mapea los campos a Orbit 360. Adaptable a la estructura de cada aseguradora.</div>`;
  }
  function step2(m) {
    return `<p class="imp-desc">Detectamos y mapeamos estos registros. Revisa antes de confirmar.</p>
      <div class="imp-scan"><span class="imp-spark">🧠</span> Extracción completada · <b>${m.sample.length}+ registros</b> reconocidos · 0 errores de formato.</div>
      <div class="card" style="overflow:hidden;margin-top:12px"><table class="tbl"><thead><tr>${m.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${m.sample.map(row => `<tr>${row.map((cell, i) => `<td${i === 0 ? ' style="font-weight:600"' : ''}>${U.esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${m.conciliacion ? `<div class="imp-note" style="margin-top:12px">🧾 Se desplegaron los <b>recibos según forma de pago</b>. En el paso siguiente podrás <b>aplicar pagos por póliza</b> (conciliación).</div>` : ''}`;
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
        <div class="muted" style="font-size:12px;margin-top:14px">Demo: el motor de extracción real se conecta en producción.</div>
      </div>`;
  }
  function wire() {
    const dr = document.getElementById('imp-drawer');
    const drop = dr.querySelector('#imp-drop');
    if (drop) {
      const adv = () => { state.step = 2; paint(); };
      drop.addEventListener('click', adv);
      drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', e => { e.preventDefault(); adv(); });
    }
    if (state.step === 2) {
      // botón continuar al pie
      const body = dr.querySelector('.imp-body');
      const bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px';
      bar.innerHTML = `<button class="btn ghost" id="imp-back2">Atrás</button><button class="btn primary" id="imp-next2">Confirmar mapeo →</button>`;
      body.appendChild(bar);
      bar.querySelector('#imp-back2').addEventListener('click', () => { state.step = 1; paint(); });
      bar.querySelector('#imp-next2').addEventListener('click', () => { state.step = 3; paint(); });
    }
    const fin = dr.querySelector('#imp-finish'); if (fin) fin.addEventListener('click', () => { close(); if (state.opts.onDone) state.opts.onDone(); });
    const again = dr.querySelector('#imp-again'); if (again) again.addEventListener('click', () => { state.step = 1; paint(); });
  }

  return { open, close, KINDS };
})();
