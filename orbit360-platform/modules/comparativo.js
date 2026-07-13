/* ============================================================
   Orbit 360 · 📋 Comparativo (independiente)
   Toma cotizaciones normalizadas y persistidas (Orbit.store,
   colección 'cotizaciones', entregadas por id vía handoff) del
   Cotizador y/o propuestas cargadas como PDF/manual. Cada propuesta
   nace en estado "requiere_revisión" y solo entra al ranking,
   tabla, impresión, comunicación y aceptación una vez "validada"
   (con actor + fecha + motivo registrados). Comparativo PROFUNDO:
   tabla completa con logos, criterios por ramo (coberturas, suma
   asegurada, deducible, asistencias), recomendación consultiva
   replanteable (precio / cobertura / equilibrio), edición por
   propuesta e impresión.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.comparativo = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  let host, props = [];
  /* Rol ACTIVO (no el rol base) para el gate de validación de propuestas */
  function activeRole() {
    try { if (Orbit.session && Orbit.session.rol) return Orbit.session.rol(); } catch (e) {}
    try { if (Orbit.auth && Orbit.auth.user && Orbit.auth.user()) return Orbit.auth.user().rol || 'Asesor'; } catch (e) {}
    return 'Asesor';
  }
  function puedeValidarProp() { return ['Asistente', 'Marketing'].indexOf(activeRole()) < 0; }
  function cotizacionPorId(id) { return id ? S().get('cotizaciones', id) : null; }
  /* P0-QUOTE-PERSIST: toda propuesta manual/PDF se persiste como cotización canónica (id + documentRef), recuperable por id */
  function persistirCotizacion(p, archivo) {
    p.id = p.id || ('cot' + Date.now() + Math.floor(Math.random() * 999));
    p.documentRef = archivo || p.documentRef || p.referencia || '';
    S().insert('cotizaciones', p);
    return p;
  }
  let meta = { pais: 'GT', cliente: '', ramo: 'Auto', marca: '', linea: '', modelo: '', anio: 2022, sub: '', detalle: '', criterio: 'equilibrio' };
  // Catálogo marca → líneas, DIFERENCIADO POR PAÍS (el parque vehicular difiere entre GT/CA y CO)
  const MODELOS_GT = {
    'Corolla': ['XLI', 'XEI', 'SE-G', 'GLI', 'Cross', 'Hybrid'],
    'Hilux': ['DX 4x2', 'SR 4x4', 'SRV 4x4', 'GR-Sport'],
    'RAV4': ['LE', 'XLE', 'Limited', 'Adventure', 'Hybrid'],
    'Yaris': ['Core', 'S', 'Sedán', 'Hatchback'],
    'Tucson': ['GL', 'GLS', 'Limited', 'N-Line'],
    'Accent': ['GL', 'GLS', 'Sport'],
    'Sportage': ['LX', 'EX', 'SX', 'X-Line'],
    'Rio': ['LX', 'EX', 'Hatchback'],
    'Sentra': ['Sense', 'Advance', 'Exclusive', 'SR'],
    'Frontier': ['S 4x2', 'SE 4x4', 'PRO-4X', 'LE'],
    'Mazda 3': ['i Touring', 's Grand Touring', 'Sedán', 'Hatchback'],
    'CX-5': ['Sport', 'Touring', 'Grand Touring', 'Signature'],
    'Civic': ['LX', 'EX', 'Sport', 'Touring'],
    'CR-V': ['LX', 'EX', 'EX-L', 'Touring'],
    'Jetta': ['Trendline', 'Comfortline', 'Highline', 'GLI'],
    'Tiguan': ['Trendline', 'Comfortline', 'Highline', 'R-Line']
  };
  const MODELOS_CO = {
    'Sandero': ['Life', 'Zen', 'Intens'],
    'Duster': ['Zen', 'Intens', 'Iconic 4x4'],
    'Logan': ['Life', 'Zen', 'Intens'],
    'Spark GT': ['LS', 'LT', 'Activ'],
    'Tracker': ['LS', 'LT', 'Premier'],
    'Mazda 3': ['Touring', 'Grand Touring', 'Signature'],
    'CX-30': ['Touring', 'Grand Touring'],
    'Soluto': ['LX', 'EX'],
    'Sportage': ['LX', 'EX', 'SX'],
    'Versa': ['Sense', 'Advance', 'Exclusive'],
    'Corolla': ['XLI', 'XEI', 'SEG', 'Cross'],
    'Virtus': ['Trendline', 'Comfortline', 'Highline'],
    'Grand i10': ['Sedán', 'Hatchback'],
    'EcoSport': ['S', 'SE', 'Titanium'],
    'Ertiga': ['GL', 'GLX']
  };
  function modelosDe(linea, pais) { const M = pais === 'CO' ? MODELOS_CO : MODELOS_GT; return M[linea] || ['Estándar', 'Full Extras', 'Edición Especial']; }
  const VEH_GT = {
    'Toyota': ['Corolla', 'Hilux', 'RAV4', 'Yaris', 'Land Cruiser', 'Prado', 'Fortuner'],
    'Hyundai': ['Tucson', 'Accent', 'Elantra', 'Santa Fe', 'Creta', 'i10'],
    'Kia': ['Sportage', 'Rio', 'Picanto', 'Sorento', 'Seltos'],
    'Nissan': ['Sentra', 'Frontier', 'Versa', 'Kicks', 'X-Trail'],
    'Mazda': ['Mazda 3', 'CX-5', 'CX-30', 'Mazda 2', 'BT-50'],
    'Chevrolet': ['Spark', 'Onix', 'Tracker', 'Captiva', 'D-Max'],
    'Honda': ['Civic', 'CR-V', 'HR-V', 'Fit'],
    'Volkswagen': ['Jetta', 'Tiguan', 'Gol', 'Amarok', 'T-Cross'],
    'Otra': ['—']
  };
  const VEH_CO = {
    'Renault': ['Sandero', 'Duster', 'Logan', 'Stepway', 'Kwid', 'Koleos'],
    'Chevrolet': ['Spark GT', 'Onix', 'Tracker', 'Captiva', 'Sail', 'Groove'],
    'Mazda': ['Mazda 2', 'Mazda 3', 'CX-30', 'CX-5', 'BT-50'],
    'Kia': ['Picanto', 'Rio', 'Sportage', 'Soluto', 'Seltos'],
    'Nissan': ['Versa', 'March', 'Kicks', 'Frontier', 'X-Trail'],
    'Toyota': ['Corolla', 'Hilux', 'Fortuner', 'RAV4', 'Yaris', 'Prado'],
    'Volkswagen': ['Gol', 'Polo', 'T-Cross', 'Virtus', 'Amarok'],
    'Hyundai': ['Grand i10', 'Accent', 'Tucson', 'Creta', 'Santa Fe'],
    'Otra': ['—']
  };
  function vehDe(pais) { return pais === 'CO' ? VEH_CO : VEH_GT; }

  /* ---- criterios de comparación por ramo (lo que se compara, no solo prima) ---- */
  const CRITERIOS = {
    Auto: [
      { k: 'sumaAsegurada', t: '💰 Suma asegurada', tipo: 'money', mejor: 'max' },
      { k: 'deducible', t: '📉 Deducible', tipo: 'txt' },
      { k: 'cob_rc', t: '⚖️ Responsabilidad civil', tipo: 'money', mejor: 'max' },
      { k: 'cob_gmo', t: '🏥 Gastos médicos ocupantes', tipo: 'money', mejor: 'max' },
      { k: 'cob_robo', t: '🔒 Robo total', tipo: 'bool' },
      { k: 'cob_asist', t: '🛟 Asistencia vial', tipo: 'txt' },
      { k: 'cob_auto_sust', t: '🚗 Auto sustituto', tipo: 'bool' }
    ],
    'Gastos Médicos': [
      { k: 'sumaAsegurada', t: '💰 Suma asegurada', tipo: 'money', mejor: 'max' },
      { k: 'deducible', t: '📉 Deducible', tipo: 'txt' },
      { k: 'cob_coaseguro', t: '➗ Coaseguro', tipo: 'txt' },
      { k: 'cob_hosp', t: '🛏️ Hospitalización', tipo: 'txt' },
      { k: 'cob_maternidad', t: '👶 Maternidad', tipo: 'bool' },
      { k: 'cob_dental', t: '🦷 Dental / visión', tipo: 'bool' },
      { k: 'cob_red', t: '🏥 Red de hospitales', tipo: 'txt' }
    ],
    Vida: [
      { k: 'sumaAsegurada', t: '💰 Suma por fallecimiento', tipo: 'money', mejor: 'max' },
      { k: 'cob_invalidez', t: '♿ Invalidez total', tipo: 'money', mejor: 'max' },
      { k: 'cob_enf_graves', t: '🩺 Enfermedades graves', tipo: 'bool' },
      { k: 'cob_ahorro', t: '🏦 Componente de ahorro', tipo: 'bool' },
      { k: 'cob_doble', t: '✖️2 Doble indemnización', tipo: 'bool' }
    ],
    Hogar: [
      { k: 'sumaAsegurada', t: '💰 Suma (inmueble)', tipo: 'money', mejor: 'max' },
      { k: 'cob_contenido', t: '📦 Contenido', tipo: 'money', mejor: 'max' },
      { k: 'cob_rc', t: '⚖️ RC familiar', tipo: 'money', mejor: 'max' },
      { k: 'cob_sismo', t: '🌎 Sismo / terremoto', tipo: 'bool' },
      { k: 'cob_robo', t: '🔒 Robo', tipo: 'bool' },
      { k: 'cob_asist_hogar', t: '🛠️ Asistencia hogar', tipo: 'txt' }
    ],
    Daños: [
      { k: 'sumaAsegurada', t: '💰 Suma asegurada', tipo: 'money', mejor: 'max' },
      { k: 'deducible', t: '📉 Deducible', tipo: 'txt' },
      { k: 'cob_incendio', t: '🔥 Incendio', tipo: 'bool' },
      { k: 'cob_rc', t: '⚖️ RC', tipo: 'money', mejor: 'max' },
      { k: 'cob_equipo', t: '💻 Equipo electrónico', tipo: 'bool' },
      { k: 'cob_robo', t: '🔒 Robo', tipo: 'bool' }
    ]
  };
  function criteriosDe() { return CRITERIOS[meta.ramo] || CRITERIOS.Auto; }

  /* ---- logo de aseguradora: imagen si existe en Orbit, si no iniciales sobre su color ---- */
  function logoDe(p) {
    const a = S().all('aseguradoras').find(x => x.nombre && p.nombre && (x.nombre.toLowerCase() === p.nombre.toLowerCase() || p.nombre.toLowerCase().indexOf(x.nombre.toLowerCase()) >= 0));
    const color = (a && a.color) || p.color || '#6b7280';
    if (a && a.logo) return `<img src="${a.logo}" alt="${U.esc(p.nombre)}" style="width:34px;height:34px;border-radius:8px;object-fit:contain;background:#fff;border:1px solid var(--line)">`;
    const ini = (p.nombre || '??').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return `<span style="width:34px;height:34px;border-radius:8px;display:inline-grid;place-items:center;background:${color};color:#fff;font-weight:800;font-size:13px;font-family:var(--f-display);flex-shrink:0">${ini}</span>`;
  }

  function datosIniciales() {
    const marcas = Object.keys(vehDe(meta.pais)), lineas = vehDe(meta.pais)[meta.marca] || [];
    const subAuto = meta.pais === 'CO'
      ? ['Todo riesgo', 'RC / SOAT+', 'Pérdidas totales', 'Pérdidas parciales', 'Por kilómetros', 'Pesado']
      : ['Liviano', 'Responsabilidad Civil', 'Pesado', 'Pick-up / Comercial', 'Motocicleta', 'Grúa'];
    let campos;
    if (meta.ramo === 'Auto') {
      campos = `<label class="ce-l">🚙 Tipo<select id="cp-sub" class="o-sel">${subAuto.map(x => `<option ${x === meta.sub ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="ce-l">📅 Año / modelo<input id="cp-anio" class="o-sel" type="number" value="${meta.anio}"></label>
        <label class="ce-l">🚗 Marca<select id="cp-marca" class="o-sel"><option value="">— Marca —</option>${marcas.map(m => `<option ${m === meta.marca ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label class="ce-l">🔻 Línea<select id="cp-linea" class="o-sel" ${lineas.length ? '' : 'disabled'}><option value="">${lineas.length ? '— Línea —' : 'Elige marca'}</option>${lineas.map(l => `<option ${l === meta.linea ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="ce-l">🏷️ Modelo / versión<select id="cp-modelo" class="o-sel" ${meta.linea ? '' : 'disabled'}><option value="">${meta.linea ? '— Versión —' : 'Elige línea'}</option>${meta.linea ? modelosDe(meta.linea, meta.pais).map(mo => `<option ${mo === meta.modelo ? 'selected' : ''}>${mo}</option>`).join('') : ''}</select></label>
        <label class="ce-l">🔢 Placa<input id="cp-placa" class="o-sel" value="${U.esc(meta.placa || '')}" placeholder="P-123ABC"></label>`;
    } else if (meta.ramo === 'Gastos Médicos') {
      campos = `<label class="ce-l">👨‍👩‍👧 Plan<select id="cp-sub" class="o-sel">${['Individual', 'Familiar', 'Colectivo'].map(x => `<option ${x === meta.sub ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="ce-l">📝 Integrantes / edades<input id="cp-det" class="o-sel" value="${U.esc(meta.detalle)}" placeholder="Ej. 38, 35, 8, 5"></label>`;
    } else if (meta.ramo === 'Vida') {
      campos = `<label class="ce-l">💰 Suma asegurada<input id="cp-det" class="o-sel" value="${U.esc(meta.detalle)}" placeholder="Q…"></label><label class="ce-l">📝 Cobertura<select id="cp-sub" class="o-sel">${['Vida', 'Vida + invalidez', 'Vida + ahorro'].map(x => `<option ${x === meta.sub ? 'selected' : ''}>${x}</option>`).join('')}</select></label>`;
    } else if (meta.ramo === 'Hogar') {
      campos = `<label class="ce-l">🏠 Tipo<select id="cp-sub" class="o-sel">${['Casa', 'Apartamento', 'Edificio'].map(x => `<option ${x === meta.sub ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="ce-l">📝 Valor inmueble / contenido<input id="cp-det" class="o-sel" value="${U.esc(meta.detalle)}" placeholder="Inmueble / contenido"></label>`;
    } else {
      const subOtro = meta.pais === 'CO' ? ['Multirriesgo', 'Cumplimiento', 'RC', 'Transporte'] : ['Incendio', 'Robo', 'RC', 'Equipo electrónico', 'Fianzas'];
      campos = `<label class="ce-l">🏷️ Tipo<select id="cp-sub" class="o-sel">${subOtro.map(x => `<option ${x === meta.sub ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="ce-l">📝 Detalle del riesgo<input id="cp-det" class="o-sel" value="${U.esc(meta.detalle)}" placeholder="Suma, ubicación…"></label>`;
    }
    return `<div class="card pad" style="margin-bottom:14px">
      <div class="asg-sec-t">📋 Datos del riesgo a comparar</div>
      <div class="cgrid">
        <label class="ce-l">🌎 País<select id="cp-pais" class="o-sel"><option ${meta.pais === 'GT' ? 'selected' : ''}>GT</option><option ${meta.pais === 'CO' ? 'selected' : ''}>CO</option></select></label>
        <label class="ce-l">🧑 Cliente / prospecto<input id="cp-cli" class="o-sel" value="${U.esc(meta.cliente)}" placeholder="Nombre"></label>
        <label class="ce-l">🛡️ Ramo<select id="cp-ramo" class="o-sel">${['Auto', 'Vida', 'Gastos Médicos', 'Hogar', 'Daños'].map(r => `<option ${r === meta.ramo ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
        ${campos}
      </div>
    </div>`;
  }
  function bindMeta() {
    const set = (id, k, num) => { const el = host.querySelector(id); if (el) el.addEventListener('change', () => { meta[k] = num ? +el.value : el.value; if (k === 'ramo' || k === 'marca' || k === 'pais') render(host); }); };
    set('#cp-cli', 'cliente'); set('#cp-ramo', 'ramo'); set('#cp-anio', 'anio', true); set('#cp-det', 'detalle'); set('#cp-sub', 'sub'); set('#cp-placa', 'placa');
    const paisEl = host.querySelector('#cp-pais'); if (paisEl) paisEl.addEventListener('change', () => { meta.pais = paisEl.value; meta.marca = ''; meta.linea = ''; meta.modelo = ''; render(host); });
    const mk = host.querySelector('#cp-marca'); if (mk) mk.addEventListener('change', () => { meta.marca = mk.value; meta.linea = ''; meta.modelo = ''; render(host); });
    const ln = host.querySelector('#cp-linea'); if (ln) ln.addEventListener('change', () => { meta.linea = ln.value; meta.modelo = ''; render(host); });
    const mo = host.querySelector('#cp-modelo'); if (mo) mo.addEventListener('change', () => { meta.modelo = mo.value; });
  }

  function init() {
    if (props.length) return;
    /* P0-HANDOFF: recuperar transferencia persistida en Orbit.store (nunca sessionStorage/localStorage) */
    const pend = S().all('quoteTransfers').filter(t => t.estado === 'pendiente').sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    if (!pend.length) return;
    const tr = pend[0];
    const fromStore = (tr.cotizacionIds || []).map(id => S().get('cotizaciones', id)).filter(Boolean);
    if (fromStore.length) {
      props = fromStore.map(c => Object.assign({}, c));
      meta.clienteId = tr.clienteId || meta.clienteId; meta.cliente = tr.cliente || meta.cliente; meta.pais = tr.pais || meta.pais; meta.ramo = tr.ramo || meta.ramo;
      S().update('quoteTransfers', tr.id, { estado: 'recibida' });
    }
  }
  function esValidada(p) { return p.estadoValidacion === 'validada'; }
  function propsValidadas() { return props.filter(esValidada); }

  /* ---- score consultivo por criterio elegido ---- */
  function ranking() {
    const validos = props.map((p, i) => ({ p, i })).filter(x => esValidada(x.p) && Number.isFinite(x.p.total) && x.p.total > 0 && Number.isFinite(x.p.neta));
    if (!validos.length) return [];
    const totals = validos.map(x => x.p.total || 0).filter(v => Number.isFinite(v) && v > 0);
    if (!totals.length) return [];
    const minT = Math.min(...totals), maxT = Math.max(...totals);
    const sumas = validos.map(x => Number.isFinite(+x.p.sumaAsegurada) ? +x.p.sumaAsegurada : 0);
    const maxS = Math.max(1, ...sumas);
    const crits = criteriosDe();
    return validos.map(({ p, i }) => {
      // precio: 1 = más barato
      const precioScore = maxT === minT ? 1 : 1 - ((p.total || maxT) - minT) / (maxT - minT);
      // cobertura: suma normalizada + coberturas booleanas presentes
      const boolCob = crits.filter(c => c.tipo === 'bool').reduce((s, c) => s + (p.cob && p.cob[c.k] ? 1 : 0), 0);
      const boolMax = Math.max(1, crits.filter(c => c.tipo === 'bool').length);
      const cobScore = ((+p.sumaAsegurada || 0) / maxS) * 0.6 + (boolCob / boolMax) * 0.4;
      let score = meta.criterio === 'precio' ? precioScore : meta.criterio === 'cobertura' ? cobScore : (precioScore * 0.5 + cobScore * 0.5);
      if (!Number.isFinite(score)) score = 0;
      return { i, p, precioScore, cobScore, score };
    }).sort((a, b) => b.score - a.score);
  }

  function guiaPasos() {
    const p1 = !!(meta.cliente || meta.ramo);
    const p2 = props.length > 0;
    const p3 = props.length > 1;
    const step = p3 ? 3 : p2 ? 2 : 1;
    const steps = [
      { n: 1, t: '📋 Datos del riesgo', done: p1 },
      { n: 2, t: '🏢 Reunir propuestas', done: p2 },
      { n: 3, t: '⚖️ Comparar y cerrar', done: p3 }
    ];
    const cta = step === 1
      ? { t: '⬇ Completá los datos abajo, luego sumá tu primera propuesta:', act: 'cp-add', label: '✍ Escribir cotización a mano' }
      : step === 2
      ? { t: '👇 Ya tenés ' + props.length + ' propuesta(s) — sumá al menos otra (PDF o a mano) para poder comparar', act: 'cp-add', label: '✍ Escribir otra a mano' }
      : { t: '🔽 Ya podés comparar — revisá la tabla y la recomendación más abajo, o sumá otra aseguradora', act: 'cp-add', label: '✍ Agregar otra a mano' };
    return '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">' + steps.map(s => {
      const active = s.n === step;
      return `<div style="flex:1;min-width:130px;text-align:center;padding:9px 10px;border-radius:10px;font-size:12.5px;font-weight:700;border:1.5px solid ${active ? 'var(--red)' : s.done ? 'var(--ok)' : 'var(--line)'};background:${active ? 'var(--red)' : 'transparent'};color:${active ? '#fff' : s.done ? 'var(--ok)' : 'var(--ink-3)'}">${s.done && !active ? '✓ ' : s.n + '. '}${s.t}</div>`;
    }).join('') + '</div>'
    + `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:9px 13px;margin-bottom:14px">
        <span style="font-size:12.5px;font-weight:600">${cta.t}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${step === 3 ? '<button class="btn ghost sm" id="cp-cta-scroll">⬇ Ir al comparativo</button>' : ''}<button class="btn ghost sm" id="cp-cta-pdf">⬆ Cargar PDF de propuesta</button><button class="btn primary sm" id="cp-cta-btn" data-act="${cta.act}">${cta.label}</button></div>
      </div>`
    + '<div class="muted" style="font-size:11.5px;margin:-8px 0 14px">💡 Las propuestas suelen llegar en momentos distintos — agregá cada una apenas la recibas (PDF o manual); el comparativo y la recomendación se actualizan solos con lo que tengas.</div>';
  }
  function render(h) {
    host = h; init();
    const cur = (props[0] || {}).cur || 'GTQ';
    const rk = ranking();
    const winI = rk.length ? rk[0].i : -1;
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '📋', title: 'Comparativo', sub: 'Compara aseguradoras a fondo (del cotizador o por PDF) y cierra con la mejor', features: [], actions: `<button class="btn ghost" id="cp-hist-b" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">🕘 Historial</button>` })}
      ${props.length ? '' : '<div class="cfg-note" style="margin-bottom:14px">📋 El comparativo funciona <b>solo</b>: llena los <b>datos del riesgo</b> abajo, luego <b>⬆ carga PDFs</b> de propuestas (extracción inteligente) o <b>➕ registrá una cotización recibida</b>. También puedes traerlas desde el <a style="color:var(--red);cursor:pointer" onclick="location.hash=\'#/cotizador\'">🧮 Cotizador</a>.</div>'}
      ${guiaPasos()}
      ${datosIniciales()}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <b style="font-family:var(--f-display);font-size:16px">${props.length ? '⚖️ ' + props.length + ' aseguradoras · ' + meta.ramo : '⚖️ Nuevo comparativo'}</b>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${propsValidadas().length ? `<button class="btn ghost sm" id="cp-accept">✓ Registrar opción aceptada</button><button class="btn ghost sm" id="cp-save">💾 Guardar</button><button class="btn ghost sm" id="cp-send">📲 Preparar envío al cliente (WhatsApp/Correo)</button><button class="btn primary sm" id="cp-print">🖨 Imprimir</button>` : ''}</div>
      </div>
      <div id="cp-out" class="cz-cards">${props.map((p, i) => card(p, i === winI, i, cur)).join('') || '<div class="muted" style="padding:30px 0;text-align:center;grid-column:1/-1">Sin propuestas todavía.</div>'}</div>
      ${propsValidadas().length > 1 ? tabla(cur, rk) : ''}
      ${propsValidadas().length > 1 ? recomendacion(rk, cur) : ''}
    </div>`;
    host.querySelector('#cp-hist-b').addEventListener('click', verHist);
    bindMeta();
    const ctaScroll = host.querySelector('#cp-cta-scroll'); if (ctaScroll) ctaScroll.addEventListener('click', () => { const t = host.querySelector('#cp-out'); if (t) t.scrollIntoView({ block: 'start' }); });
    const ctaPdf = host.querySelector('#cp-cta-pdf'); if (ctaPdf) ctaPdf.addEventListener('click', cargarPDF);
    const ctaBtn = host.querySelector('#cp-cta-btn'); if (ctaBtn) ctaBtn.addEventListener('click', manual);
    const sv = host.querySelector('#cp-save'); if (sv) sv.addEventListener('click', guardarHist);
    const pr = host.querySelector('#cp-print'); if (pr) pr.addEventListener('click', imprimir);
    const snd = host.querySelector('#cp-send'); if (snd) snd.addEventListener('click', enviarCliente);
    const acc = host.querySelector('#cp-accept'); if (acc) acc.addEventListener('click', aceptarOpcion);
    host.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { props.splice(+b.dataset.del, 1); render(host); }));
    host.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editarProp(+b.dataset.edit)));
    host.querySelectorAll('[data-validar]').forEach(b => b.addEventListener('click', () => validarProp(+b.dataset.validar)));
    host.querySelectorAll('[data-crit]').forEach(b => b.addEventListener('click', () => { meta.criterio = b.dataset.crit; render(host); }));
  }
  function validarProp(i) {
    const p = props[i]; if (!p) return;
    if (!puedeValidarProp()) { U.toast('Tu rol activo (' + activeRole() + ') no puede validar propuestas.'); return; }
    const u = (Orbit.auth && Orbit.auth.user && Orbit.auth.user()) || {};
    /* P0-MONTOS: finitos, neta>0, iva/total no negativos, y neta+extras(gastos/recargos)+iva ≈ total con tolerancia de redondeo */
    const EPS = 0.51;
    const finitos = [p.total, p.neta, p.iva].every(Number.isFinite);
    const extras = (Number(p.total) || 0) - (Number(p.neta) || 0) - (Number(p.iva) || 0);
    const montosOk = finitos && p.neta > 0 && p.iva >= -EPS && p.total > 0 && extras >= -EPS && extras <= (p.neta || 0) * 2 + 5;
    /* P0-CONSISTENCIA: compara realmente país, moneda (según país) y ramo; cliente si ambos lo tienen. Campo ausente no contradice, pero presente y distinto sí bloquea. */
    const monedaEsperada = { GT: 'GTQ', CO: 'COP' }[meta.pais] || null;
    const consistente = (!p.pais || p.pais === meta.pais)
      && (!monedaEsperada || !p.cur || p.cur === monedaEsperada)
      && (!p.ramo || p.ramo === meta.ramo)
      && (!p.clienteId || !meta.clienteId || p.clienteId === meta.clienteId);
    /* P0-FUENTE: reglas por origen, sin OR donde un campo aislado alcance. Estimación interna se acepta como TAL (nunca como propuesta validada de aseguradora). */
    const fuenteOk = p.origen === 'estimacion_interna' ? true
      : (p.origen === 'cotizador') ? !!(p.fuenteDocumentoId && p.versionFuente && p.vigenciaFuente)
      : (p.origen === 'pdf' || p.origen === 'cotizacion_recibida' || p.origen === 'manual') ? !!(p.fuenteDocumentoId || p.documentRef || (p.referencia && p.referencia.trim()))
      : false;
    let back = document.getElementById('cp-validar'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cp-validar'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 98;
    back.innerHTML = '<div class="card" style="width:min(460px,95vw);padding:0">'
      + '<div style="padding:15px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display)">✓ Validar propuesta · ' + U.esc(p.nombre) + '</b><button class="imp-x" id="cv-x">✕</button></div>'
      + '<div style="padding:16px 18px;display:grid;gap:10px">'
      + (!montosOk ? '<div class="cfg-note" style="border-left:3px solid var(--danger)">⚠ Los montos no son válidos (deben ser finitos, prima neta &gt; 0, y neta+gastos/recargos+impuestos ≈ total). Corregi con ✏ antes de validar.</div>' : '')
      + (!consistente ? '<div class="cfg-note" style="border-left:3px solid var(--danger)">⛔ País/moneda/ramo/cliente de esta propuesta no coincide con este comparativo. No se puede validar así — corregí con ✏ primero.</div>' : '')
      + (!fuenteOk ? '<div class="cfg-note" style="border-left:3px solid var(--danger)">⛔ Falta fuente/referencia trazable para el origen de esta propuesta (documento, versión y vigencia si viene del Cotizador; referencia si es PDF/manual).</div>' : '')
      + '<div class="cfg-note">Antes de validar, revisá los valores (usá ✏ si hay que corregir algo). Al validar se registra quién, cuándo y con qué motivo.</div>'
      + '<label class="ce-l">Motivo de validación *<input id="cv-motivo" class="o-sel" placeholder="Ej. confirmado con la aseguradora por correo"></label>'
      + '<label class="ce-l ck"><input type="checkbox" id="cv-conf"> CONFIRMO que revisé los valores y son correctos</label>'
      + '<div class="muted" style="font-size:11.5px">Validado por: <b>' + U.esc(u.nombre || 'Usuario') + '</b> · rol activo <b>' + U.esc(activeRole()) + '</b> · ' + (Orbit.ui.today ? Orbit.ui.today() : '') + '</div>'
      + '</div>'
      + '<div style="padding:13px 18px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="cv-cancel">Cancelar</button><button class="btn primary" id="cv-ok">Marcar como validada</button></div></div>';
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#cv-x').onclick = close; back.querySelector('#cv-cancel').onclick = close;
    back.querySelector('#cv-ok').onclick = () => {
      const motivo = (back.querySelector('#cv-motivo').value || '').trim();
      if (!montosOk) { U.toast('No se puede validar: montos inválidos.'); return; }
      if (!consistente) { U.toast('No se puede validar: país/moneda/ramo/cliente no coinciden con este comparativo.'); return; }
      if (!motivo) { U.toast('El motivo de validación es obligatorio.'); return; }
      if (!back.querySelector('#cv-conf').checked) { U.toast('Confirmá que revisaste los valores.'); return; }
      if (!fuenteOk) { U.toast('Falta fuente/referencia trazable para el origen de esta propuesta.'); return; }
      const antes = { estadoValidacion: p.estadoValidacion, total: p.total, neta: p.neta };
      p.estadoValidacion = 'validada';
      p.validacion = { actor: u.nombre || 'Usuario', rolActivo: activeRole(), fecha: (Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10)), motivo, diff: { antes, despues: { estadoValidacion: 'validada', total: p.total, neta: p.neta } } };
      if (p.id) S().update('cotizaciones', p.id, { estadoValidacion: 'validada', validacion: p.validacion });
      close(); render(host);
    };
  }
  function card(p, win, i, cur) {
    const estado = p.estadoValidacion || 'requiere_revision';
    const badge = {
      validada: '<span class="badge ok" style="font-size:9px">✓ Validada</span>',
      requiere_revision: '<span class="badge warn" style="font-size:9px">⚠ Requiere revisión</span>',
      borrador: '<span class="badge neutral" style="font-size:9px">✎ Borrador</span>',
      rechazada: '<span class="badge danger" style="font-size:9px">✕ Rechazada</span>',
      vencida: '<span class="badge neutral" style="font-size:9px">⏱ Vencida</span>'
    }[estado] || '';
    return `<div class="cz-card ${win ? 'win' : ''}">
      ${win ? '<span class="cz-badge">🏆 Recomendada</span>' : ''}
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px">${logoDe(p)}<b style="font-family:var(--f-display);flex:1;line-height:1.15">${U.esc(p.nombre)}</b>${badge}${p.origen === 'pdf' ? '<span class="badge info" style="font-size:9px">📄 PDF</span>' : ''}<button class="asg-del" data-edit="${i}" title="Editar valores">✏</button><button class="asg-del" data-del="${i}">✕</button></div>
      <div class="cz-total">${U.money(p.total || 0, cur)}</div>
      <div class="muted" style="font-size:11.5px">💵 prima total${p.fracc > 1 ? ' · ' + U.money((p.total || 0) / p.fracc, cur) + '/pago' : ''}</div>
      ${p.sumaAsegurada ? `<div class="muted" style="font-size:11.5px;margin-top:3px">💰 suma ${U.money(p.sumaAsegurada, cur)}</div>` : ''}
      ${estado !== 'validada' ? `<div style="font-size:11px;color:var(--warn);margin-top:4px">⚠ No entra al ranking, impresión ni comunicación hasta validar</div><button class="btn primary sm" style="margin-top:9px;width:100%" data-validar="${i}">✓ Validar datos</button>` : ''}
    </div>`;
  }
  function editarProp(i) {
    const p = props[i]; if (!p) return;
    p.cob = p.cob || {};
    const crits = criteriosDe();
    let back = document.getElementById('cp-edit'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cp-edit'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    const cobFields = crits.map(c => {
      if (c.k === 'sumaAsegurada' || c.k === 'deducible') return '';
      if (c.tipo === 'bool') return `<label class="ce-l ck" style="font-size:12.5px"><input type="checkbox" data-cob="${c.k}" ${p.cob[c.k] ? 'checked' : ''}> ${c.t}</label>`;
      if (c.tipo === 'money') return `<label class="ce-l">${c.t}<input type="number" data-cob="${c.k}" class="o-sel" value="${p.cob[c.k] || 0}"></label>`;
      return `<label class="ce-l">${c.t}<input data-cob="${c.k}" class="o-sel" value="${U.esc(p.cob[c.k] || '')}"></label>`;
    }).join('');
    back.innerHTML = '<div class="card" style="width:min(520px,95vw);max-height:90vh;overflow:auto;padding:0">'
      + '<div style="padding:15px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display)">✏ Editar propuesta · ' + U.esc(p.nombre) + '</b><button class="imp-x" id="pe-x">✕</button></div>'
      + '<div style="padding:16px 18px;display:grid;gap:10px">'
      + (p.origen === 'pdf' ? '<div class="cfg-note">📄 Valores extraídos del PDF — verifica y corrige antes de comparar.</div>' : '')
      + '<label class="ce-l">Aseguradora / propuesta<input id="pe-nom" class="o-sel" value="' + U.esc(p.nombre) + '"></label>'
      + '<div class="cgrid"><label class="ce-l">Prima neta<input id="pe-neta" type="number" class="o-sel" value="' + Math.round(p.neta || 0) + '"></label>'
      + '<label class="ce-l">IVA<input id="pe-iva" type="number" class="o-sel" value="' + Math.round(p.iva || 0) + '"></label>'
      + '<label class="ce-l">Prima total<input id="pe-total" type="number" class="o-sel" value="' + Math.round(p.total || 0) + '"></label>'
      + '<label class="ce-l">Pagos<input id="pe-fracc" type="number" class="o-sel" value="' + (p.fracc || 1) + '"></label>'
      + '<label class="ce-l">💰 Suma asegurada<input id="pe-suma" type="number" class="o-sel" value="' + (p.sumaAsegurada || 0) + '"></label>'
      + '<label class="ce-l">📉 Deducible<input id="pe-ded" class="o-sel" value="' + U.esc(p.deducible || '') + '" placeholder="1% · Q1,000…"></label></div>'
      + '<div class="asg-sec-t" style="margin-top:6px">Coberturas comparables (' + meta.ramo + ')</div>'
      + '<div class="cgrid">' + cobFields + '</div>'
      + (p.origen === 'pdf' || p.origen === 'cotizacion_recibida' ? '<label class="ce-l">Motivo de la corrección<input id="pe-motivo" class="o-sel" placeholder="Ej. el PDF traía mal el deducible"></label>' : '')
      + '</div>'
      + '<div style="padding:13px 18px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="pe-cancel">Cancelar</button><button class="btn primary" id="pe-ok">Guardar (requiere revalidar)</button></div></div>';
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#pe-x').onclick = close; back.querySelector('#pe-cancel').onclick = close;
    back.querySelector('#pe-ok').onclick = () => {
      p.nombre = back.querySelector('#pe-nom').value || p.nombre;
      p.neta = +back.querySelector('#pe-neta').value || 0;
      p.iva = +back.querySelector('#pe-iva').value || 0;
      p.total = +back.querySelector('#pe-total').value || (p.neta + p.iva);
      p.fracc = +back.querySelector('#pe-fracc').value || 1;
      p.sumaAsegurada = +back.querySelector('#pe-suma').value || 0;
      p.deducible = back.querySelector('#pe-ded').value;
      back.querySelectorAll('[data-cob]').forEach(el => { p.cob[el.dataset.cob] = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? +el.value : el.value); });
      const motivoEl = back.querySelector('#pe-motivo');
      if (p.origen === 'pdf' || p.origen === 'cotizacion_recibida') {
        const u = (Orbit.auth && Orbit.auth.user && Orbit.auth.user()) || {};
        p.estadoValidacion = 'requiere_revision';
        p.correccion = { actor: u.nombre || 'Usuario', fecha: (Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10)), motivo: (motivoEl && motivoEl.value) || '' };
      }
      close(); render(host);
    };
  }
  function celdaCob(p, c, cur, best) {
    if (c.k === 'sumaAsegurada') return p.sumaAsegurada ? U.money(p.sumaAsegurada, cur) : '—';
    if (c.k === 'deducible') return U.esc(p.deducible || '—');
    const v = p.cob && p.cob[c.k];
    if (c.tipo === 'bool') return v ? '<span style="color:var(--ok);font-weight:700">✔ Sí</span>' : '<span class="muted">— No</span>';
    if (c.tipo === 'money') return v ? U.money(v, cur) : '—';
    return v ? U.esc(v) : '—';
  }
  function tabla(cur, rk) {
    const order = rk.map(r => r.i);
    const ordered = order.map(i => props[i]);
    const minT = Math.min(...ordered.map(p => p.total || 1e15));
    const crits = criteriosDe();
    // mejor por criterio money (max)
    const bestBy = {};
    crits.forEach(c => { if (c.tipo === 'money' || c.k === 'sumaAsegurada') { let bv = -1, bi = -1; ordered.forEach((p, j) => { const v = c.k === 'sumaAsegurada' ? (+p.sumaAsegurada || 0) : (p.cob && +p.cob[c.k] || 0); if (v > bv) { bv = v; bi = j; } }); bestBy[c.k] = bv > 0 ? bi : -1; } });
    const filaPrima = `<tr style="background:var(--surface)"><td style="font-weight:700">💵 Prima total</td>${ordered.map(p => `<td class="num" style="font-weight:800;color:${p.total === minT ? 'var(--ok)' : 'var(--ink)'}">${U.money(p.total || 0, cur)}${p.total === minT ? ' 🏆' : ''}</td>`).join('')}</tr>`;
    const filaPago = `<tr><td>📆 Forma de pago</td>${ordered.map(p => `<td class="num">${p.fracc > 1 ? p.fracc + ' cuotas · ' + U.money((p.total || 0) / p.fracc, cur) : 'Contado'}</td>`).join('')}</tr>`;
    const filaNeta = `<tr><td>Prima neta</td>${ordered.map(p => `<td class="num">${U.money(p.neta || 0, cur)}</td>`).join('')}</tr>`;
    const filaIva = `<tr><td>IVA / recargos</td>${ordered.map(p => `<td class="num">${U.money(p.iva || 0, cur)}</td>`).join('')}</tr>`;
    const filasCob = crits.map(c => `<tr><td>${c.t}</td>${ordered.map((p, j) => `<td class="num" style="${bestBy[c.k] === j ? 'color:var(--ok);font-weight:700' : ''}">${celdaCob(p, c, cur, bestBy[c.k] === j)}</td>`).join('')}</tr>`).join('');
    return `<div class="card" style="overflow:hidden;margin-top:16px">
      <div style="padding:12px 16px;border-bottom:1px solid var(--line)"><b style="font-family:var(--f-display);font-size:14px">⚖️ Comparativo de aseguradoras · ${meta.ramo}</b></div>
      <div style="overflow-x:auto"><table class="tbl cmp-tbl">
      <thead><tr><th style="min-width:160px">Aseguradora →</th>${ordered.map(p => `<th class="num" style="min-width:130px"><div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">${logoDe(p)}<span>${U.esc(p.nombre)}</span></div></th>`).join('')}</tr></thead>
      <tbody>${filaPrima}${filaPago}${filaNeta}${filaIva}<tr><td colspan="${ordered.length + 1}" style="background:var(--surface);font-weight:700;font-size:12px">🛡️ Coberturas</td></tr>${filasCob}</tbody>
    </table></div></div>`;
  }
  function recomendacion(rk, cur) {
    const top = rk[0], second = rk[1];
    const p = top.p, minT = Math.min(...propsValidadas().map(x => x.total || 1e15));
    const esMasBarata = p.total === minT;
    const critLabel = { precio: '💵 mejor precio', cobertura: '🛡️ mejor cobertura', equilibrio: '⚖️ mejor equilibrio precio/cobertura' }[meta.criterio];
    let texto;
    if (meta.criterio === 'precio') texto = `Por <b>precio</b>, <b>${U.esc(p.nombre)}</b> es la más económica (${U.money(p.total, cur)})${second ? `, ${Math.round((1 - top.p.total / second.p.total) * 100)}% bajo la siguiente` : ''}. Verificá que las coberturas cubran las necesidades del cliente antes de cerrar.`;
    else if (meta.criterio === 'cobertura') texto = `Por <b>cobertura</b>, <b>${U.esc(p.nombre)}</b> ofrece la protección más amplia${p.sumaAsegurada ? ` (suma ${U.money(p.sumaAsegurada, cur)})` : ''}. ${esMasBarata ? 'Y además es la más económica — opción clara.' : 'Tiene una prima mayor, justificable por el alcance.'}`;
    else texto = `Equilibrando precio y cobertura, <b>${U.esc(p.nombre)}</b> es la opción más sólida: ${esMasBarata ? 'precio competitivo' : 'prima razonable'} con buena protección${p.sumaAsegurada ? ` (suma ${U.money(p.sumaAsegurada, cur)})` : ''}. ${second ? `Alternativa: ${U.esc(second.p.nombre)}.` : ''}`;
    return `<div class="card pad" style="margin-top:14px;border-left:3px solid var(--red)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <b style="font-family:var(--f-display);font-size:14px">🧠 Recomendación consultiva</b>
        <div class="seg" style="display:inline-flex;gap:4px">
          ${[['precio', '💵 Precio'], ['cobertura', '🛡️ Cobertura'], ['equilibrio', '⚖️ Equilibrio']].map(([k, t]) => `<button class="btn ${meta.criterio === k ? 'primary' : 'ghost'} sm" data-crit="${k}">${t}</button>`).join('')}
        </div>
      </div>
      <div class="muted" style="font-size:11.5px;margin-bottom:6px">Criterio actual: <b>${critLabel}</b> · cambia el criterio para replantear la recomendación.</div>
      <p style="font-size:13.5px;margin:0;line-height:1.6">${texto}</p>
    </div>`;
  }
  async function aceptarOpcion() {
    const rk = ranking(); if (!rk.length) { U.toast('Necesitás al menos una propuesta VALIDADA para aceptar una opción.'); return; }
    const cur = (props[0] || {}).cur || 'GTQ';
    const clientes = S().all('clientes');
    const validas = propsValidadas();
    let back = document.getElementById('cp-accept-m'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cp-accept-m'; back.className = 'drawer-back open'; back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 99;
    back.innerHTML = '<div class="card" style="width:min(500px,95vw);max-height:90vh;overflow:auto;padding:0">'
      + '<div style="padding:15px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display)">✓ Registrar opción aceptada</b><button class="imp-x" id="ca-x">✕</button></div>'
      + '<div style="padding:16px 18px;display:grid;gap:10px">'
      + '<div class="cfg-note">Solo se listan propuestas <b>validadas</b> — las que aún requieren revisión no pueden aceptarse.</div>'
      + '<label class="ce-l">Propuesta aceptada *<select id="ca-prop" class="o-sel">' + validas.map((p) => { const i = props.indexOf(p); return '<option value="' + i + '"' + (i === rk[0].i ? ' selected' : '') + '>' + U.esc(p.nombre) + (p.plan ? ' · ' + U.esc(p.plan) : '') + ' · ' + U.money(p.total || 0, cur) + '</option>'; }).join('') + '</select></label>'
      + '<label class="ce-l">Cliente *<select id="ca-cli" class="o-sel">' + (meta.clienteId ? '' : '<option value="">— Seleccionar cliente —</option>') + clientes.map(c => '<option value="' + c.id + '"' + (c.id === meta.clienteId ? ' selected' : '') + '>' + U.esc(c.nombre) + '</option>').join('') + '</select></label>'
      + '<div class="cfg-note">Esto crea una <b>solicitud de emisión en Orbit Ops</b>. No crea una póliza ni recibos — la póliza nace cuando la aseguradora entregue número y documento reales.</div>'
      + '<label class="ce-l ck"><input type="checkbox" id="ca-conf"> El cliente confirmó esta opción</label>'
      + '</div>'
      + '<div style="padding:13px 18px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="ca-cancel">Cancelar</button><button class="btn primary" id="ca-ok">Crear solicitud de emisión</button></div></div>';
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#ca-x').onclick = close; back.querySelector('#ca-cancel').onclick = close;
    back.querySelector('#ca-ok').onclick = () => {
      const cid = back.querySelector('#ca-cli').value;
      if (!cid) { U.toast('Selecciona un cliente.'); return; }
      if (!back.querySelector('#ca-conf').checked) { U.toast('Confirma que el cliente aceptó esta opción.'); return; }
      const p = props[+back.querySelector('#ca-prop').value];
      const cli = S().get('clientes', cid);
      /* P0-COMP-ORDER: persistir el comparativo actual ANTES de crear la emisión; comparisonId exacto del registro recién guardado */
      const comparisonId = guardarHist({ silencioso: true }) || '';
      const quoteId = p.id || '';
      const g = Orbit.ciclo.crearGestion({
        lista: 'Gestiones Admin', tipo: 'Solicitud de emisión', titulo: 'Emisión · ' + (cli ? cli.nombre : 'Cliente') + ' · ' + U.esc(p.nombre),
        clienteId: cid, ramo: meta.ramo, prioridad: 'Alta', workflowType: 'issuance_request', quoteId: quoteId, comparisonId: comparisonId,
        nota: 'Aseguradora: ' + p.nombre + (p.plan ? ' · Plan: ' + p.plan : '') + '\nPrima neta: ' + U.money(p.neta || 0, cur) + ' · IVA: ' + U.money(p.iva || 0, cur) + ' · Prima total: ' + U.money(p.total || 0, cur) + ' · Pagos: ' + (p.fracc || 1) + '\nSuma asegurada: ' + U.money(p.sumaAsegurada || 0, cur) + (p.deducible ? ' · Deducible: ' + p.deducible : '') + '\nFuente: ' + (p.fuenteOferta || p.origen || 'cotizador') + (p.referencia ? ' · Ref: ' + p.referencia : '') + '\nEstado: pendiente de número y documento de la aseguradora para emitir la póliza.'
      });
      close(); U.toast('✓ Solicitud de emisión creada en Orbit Ops.'); render(host);
    };
  }
  function manual() {
    const aseguradoras = (S().all('aseguradoras') || []).filter(a => a.vinculada !== false);
    let back = document.getElementById('cp-manual'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cp-manual'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 98;
    back.innerHTML = '<div class="card" style="width:min(560px,95vw);max-height:90vh;overflow:auto;padding:0">'
      + '<div style="padding:15px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display)">📄 Registrar cotización recibida</b><button class="imp-x" id="cm-x">✕</button></div>'
      + '<div style="padding:16px 18px;display:grid;gap:10px">'
      + '<div class="cfg-note">Usá esto cuando la aseguradora te envió una propuesta por fuera del cotizador automático (correo, PDF, llamada). Completá lo que tengas; podés corregirlo después con ✱ Editar.</div>'
      + '<label class="ce-l">Aseguradora *<select id="cm-aseg" class="o-sel">' + (aseguradoras.length ? aseguradoras.map(a => '<option value="' + a.id + '">' + U.esc(a.nombre) + '</option>').join('') : '') + '<option value="__otra">Otra / no está en el directorio…</option></select></label>'
      + '<div id="cm-otra-wrap" style="display:' + (aseguradoras.length ? 'none' : 'block') + '"><label class="ce-l">Nombre de la aseguradora<input id="cm-otra" class="o-sel" placeholder="Nombre"></label></div>'
      + '<div class="cgrid"><label class="ce-l">Producto / plan<input id="cm-plan" class="o-sel" placeholder="Ej. Plan Oro"></label>'
      + '<label class="ce-l">Fuente de la oferta<select id="cm-fuente" class="o-sel"><option value="cotizacion_oficial">Cotización oficial de aseguradora</option><option value="correo">Correo/carta</option><option value="llamada">Llamada telefónica</option><option value="estimado">Estimado propio</option></select></label></div>'
      + '<div class="asg-sec-t" style="margin-top:6px">Desglose de la prima</div>'
      + '<div class="cgrid"><label class="ce-l">Prima neta<input id="cm-neta" type="number" class="o-sel" value="0"></label>'
      + '<label class="ce-l">Gastos de emisión<input id="cm-gastos" type="number" class="o-sel" value="0"></label>'
      + '<label class="ce-l">IVA/impuestos<input id="cm-iva" type="number" class="o-sel" value="0"></label>'
      + '<label class="ce-l">Prima total *<input id="cm-total" type="number" class="o-sel" value="0"></label>'
      + '<label class="ce-l">Cantidad de pagos<input id="cm-fracc" type="number" class="o-sel" value="1"></label>'
      + '<label class="ce-l">💰 Suma asegurada<input id="cm-suma" type="number" class="o-sel" value="0"></label>'
      + '<label class="ce-l">📉 Deducible<input id="cm-ded" class="o-sel" placeholder="1% · Q1,000…"></label>'
      + '<label class="ce-l">Referencia / N.° cotización<input id="cm-ref" class="o-sel" placeholder="Opcional"></label></div>'
      + '</div>'
      + '<div style="padding:13px 18px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="cm-cancel">Cancelar</button><button class="btn primary" id="cm-ok">Agregar propuesta</button></div></div>';
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#cm-x').onclick = close; back.querySelector('#cm-cancel').onclick = close;
    back.querySelector('#cm-aseg').addEventListener('change', e => { back.querySelector('#cm-otra-wrap').style.display = e.target.value === '__otra' ? 'block' : 'none'; });
    const autoTotal = () => { const neta = +back.querySelector('#cm-neta').value || 0, gastos = +back.querySelector('#cm-gastos').value || 0, iva = +back.querySelector('#cm-iva').value || 0; const t = back.querySelector('#cm-total'); if (!t.dataset.touched) t.value = Math.round(neta + gastos + iva); };
    ['cm-neta', 'cm-gastos', 'cm-iva'].forEach(id => back.querySelector('#' + id).addEventListener('input', autoTotal));
    back.querySelector('#cm-total').addEventListener('input', e => { e.target.dataset.touched = '1'; });
    back.querySelector('#cm-ok').onclick = () => {
      const aid = back.querySelector('#cm-aseg').value;
      const aseguradoraSel = aseguradoras.find(a => a.id === aid);
      const nombre = aid === '__otra' ? (back.querySelector('#cm-otra').value || 'Aseguradora sin identificar') : (aseguradoraSel ? aseguradoraSel.nombre : 'Aseguradora');
      if (aid === '__otra' && !back.querySelector('#cm-otra').value.trim()) { U.toast('Indicá el nombre de la aseguradora.'); return; }
      const total = +back.querySelector('#cm-total').value || 0;
      const netaInput = back.querySelector('#cm-neta').value;
      const ivaInput = back.querySelector('#cm-iva').value;
      /* P0-TAX-COUNTRY: no inferir impuesto fijo (antes total/1.12). Si no se digitaron neta/IVA
         explícitos, se marca Requiere revisión en vez de asumir un 12% fijo para todos los países. */
      const neta = netaInput !== '' ? +netaInput : null;
      const iva = ivaInput !== '' ? +ivaInput : (neta != null ? Math.max(0, total - neta) : null);
      const faltaDesglose = neta == null;
      const fuenteSel = back.querySelector('#cm-fuente').value;
      const p = Orbit.dto.cotizacionNormalizada({ nombre, color: aseguradoraSel ? aseguradoraSel.color : '#6b7280', total, neta: neta || 0, iva: iva || 0, cur: (props[0] || {}).cur || 'GTQ', fracc: +back.querySelector('#cm-fracc').value || 1, ramo: meta.ramo, sumaAsegurada: +back.querySelector('#cm-suma').value || 0, deducible: back.querySelector('#cm-ded').value, origen: fuenteSel === 'estimado' ? 'estimacion_interna' : 'cotizacion_recibida' });
      p.cob = {}; p.plan = back.querySelector('#cm-plan').value || ''; p.fuenteOferta = fuenteSel; p.referencia = back.querySelector('#cm-ref').value || ''; p.estadoValidacion = 'requiere_revision'; p.desgloseIncompleto = faltaDesglose;
      persistirCotizacion(p, p.referencia);
      props.push(p); close(); render(host);
    };
  }
  function cargarPDF() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf,image/*'; inp.multiple = true;
    inp.addEventListener('change', async e => {
      const files = [...e.target.files]; if (!files.length) return;
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '🧠 Leyendo ' + files.length + ' PDF(s)…'; document.body.appendChild(t);
      for (const f of files) {
        let usados = false;
        try {
          if (Orbit.ia && Orbit.ia.pdfTexto) {
            const txt = await Orbit.ia.pdfTexto(f);
            // 1) intentar multi-aseguradora (PDF comparativo con varias)
            const multi = (Orbit.ia.parseMulti ? Orbit.ia.parseMulti(txt) : []);
            if (multi.length >= 2) {
              multi.forEach(d => { const p = Orbit.dto.cotizacionNormalizada({ nombre: d.nombre, color: '#1f3a5f', total: d.total, neta: d.neta, iva: d.iva, cur: (props[0] || {}).cur || 'GTQ', fracc: 1, ramo: meta.ramo, sumaAsegurada: d.sumaAsegurada || 0, deducible: d.deducible || '', origen: 'pdf' }); p.cob = d.cob || {}; p.archivo = f.name; p.via = 'pdf-multi'; p.plan = d.plan; persistirCotizacion(p, f.name); props.push(p); });
              usados = true;
            }
          }
        } catch (x) {}
        if (usados) continue;
        let d = null;
        try { if (Orbit.ia && Orbit.ia.extraerPDF) d = await Orbit.ia.extraerPDF(f); } catch (x) { d = null; }
        if (d && (d.total || d.neta)) {
          const total = d.total || (d.neta + (d.iva || 0));
          const p = Orbit.dto.cotizacionNormalizada({ nombre: d.nombre || f.name.replace(/\.(pdf|png|jpe?g)$/i, ''), color: '#1f3a5f', total: Math.round(total), neta: Math.round(d.neta || 0), iva: Math.round(d.iva != null ? d.iva : 0), cur: (props[0] || {}).cur || 'GTQ', fracc: d.fracc || 1, ramo: meta.ramo, sumaAsegurada: Math.round(d.sumaAsegurada || 0), deducible: d.deducible || '', origen: 'pdf' });
          p.cob = d.cob || {}; p.archivo = f.name; p.via = d._via || 'local'; p.desgloseIncompleto = !d.neta; persistirCotizacion(p, f.name); props.push(p);
        } else {
          const p = Orbit.dto.cotizacionNormalizada({ nombre: f.name.replace(/\.(pdf|png|jpe?g)$/i, '').replace(/[_-]+/g, ' '), color: '#6b7280', total: 0, neta: 0, iva: 0, cur: (props[0] || {}).cur || 'GTQ', fracc: 1, ramo: meta.ramo, sumaAsegurada: 0, deducible: '', origen: 'pdf' });
          p.cob = {}; p.archivo = f.name; p.via = 'manual'; persistirCotizacion(p, f.name); props.push(p);
        }
      }
      t.remove(); render(host);
      const viaIA = props.some(p => p.via === 'ia');
      const t2 = document.createElement('div'); t2.className = 'ciclo-toast'; t2.textContent = '✓ ' + files.length + ' propuesta(s) extraída(s)' + (viaIA ? ' con IA' : '') + ' — revisá con ✏ y completá lo que falte'; document.body.appendChild(t2); setTimeout(() => t2.remove(), 3200);
    });
    inp.click();
  }
  function guardarHist(opts) {
    opts = opts || {};
    if (!props.length) return null;
    /* P0-COMPARISON-PERSIST: Comparativo + historial persistidos en Orbit.store (antes Orbit._compHist volátil) */
    const rec = { id: 'cmp' + Date.now(), fecha: Orbit.ui.today(), ramo: meta.ramo, cliente: meta.cliente || 'Prospecto', clienteId: meta.clienteId || '', n: props.length, mejor: (ranking()[0] || {}).p ? ranking()[0].p.nombre : props[0].nombre, criterio: meta.criterio, cotizacionIds: props.map(p => p.id).filter(Boolean), props: JSON.parse(JSON.stringify(props)), meta: JSON.parse(JSON.stringify(meta)) };
    S().insert('comparativos', rec);
    if (!opts.silencioso) {
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ Comparativo guardado en el historial'; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
      render(host);
    }
    return rec.id;
  }
  function verHist() {
    const h = S().all('comparativos').sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    let back = document.getElementById('cp-hist'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cp-hist'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    back.innerHTML = `<div class="card" style="width:min(560px,94vw);max-height:88vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:15px">🕘 Historial de comparativos</b><button class="imp-x" id="ch-x">✕</button></div>
      <div style="padding:14px 18px">${h.length ? h.map(c => `<div class="pt-row pt-click" data-load="${c.id}"><span class="pt-row-ic">📋</span><div style="flex:1"><b>${U.esc(c.cliente)} · ${c.ramo}</b><div class="muted" style="font-size:11.5px">${c.n} propuestas · 🏆 ${U.esc(c.mejor)} · ${U.fmtDate(c.fecha)}</div></div>›</div>`).join('') : '<div class="pt-empty">Aún no hay comparativos guardados.</div>'}</div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#ch-x').addEventListener('click', close);
    back.querySelectorAll('[data-load]').forEach(b => b.addEventListener('click', () => { const c = S().all('comparativos').find(x => x.id === b.dataset.load); if (c) { props = JSON.parse(JSON.stringify(c.props)); if (c.meta) meta = JSON.parse(JSON.stringify(c.meta)); close(); render(host); } }));
  }
  function imprimir() {
    const validas = propsValidadas(); if (!validas.length) { Orbit.ui.toast('Necesitás al menos una propuesta validada para imprimir.'); return; }
    const cur = (validas[0] || {}).cur || 'GTQ', rk = ranking(), minT = Math.min(...validas.map(p => p.total || 1e15));
    const ordered = rk.map(r => r.p);
    const crits = criteriosDe();
    const landscape = validas.length >= 3;
    const top = rk[0] ? rk[0].p : null;
    // color de marca del cliente (white-label) + logo
    const cs = getComputedStyle(document.documentElement);
    const brand = (cs.getPropertyValue('--red') || '#C5162E').trim() || '#C5162E';
    const ink = (cs.getPropertyValue('--ink') || '#1E2227').trim() || '#1E2227';
    const tenant = (Orbit.tenant && Orbit.tenant.nombre) || 'Orbit 360';
    const tlogo = (Orbit.tenant && Orbit.tenant.logo) || '';
    const logoImg = (p) => { const a = S().all('aseguradoras').find(x => x.nombre && p.nombre && (x.nombre.toLowerCase() === p.nombre.toLowerCase() || p.nombre.toLowerCase().indexOf(x.nombre.toLowerCase()) >= 0)); if (a && a.logo) return `<img src="${a.logo}" style="height:26px;object-fit:contain">`; const c = (a && a.color) || p.color || brand; const ini = (p.nombre || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(); return `<span style="display:inline-grid;place-items:center;width:26px;height:26px;border-radius:6px;background:${c};color:#fff;font-weight:800;font-size:11px">${ini}</span>`; };
    const cobRows = crits.map(c => `<tr><td>${c.t.replace(/^[^ ]+ /, '')}</td>${ordered.map(p => `<td class="n">${(function () { if (c.k === 'sumaAsegurada') return p.sumaAsegurada ? U.money(p.sumaAsegurada, cur) : '—'; if (c.k === 'deducible') return p.deducible || '—'; const v = p.cob && p.cob[c.k]; if (c.tipo === 'bool') return v ? 'Sí' : 'No'; if (c.tipo === 'money') return v ? U.money(v, cur) : '—'; return v || '—'; })()}</td>`).join('')}</tr>`).join('');
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html><head><title>Comparativo de seguros · ${tenant}</title><style>@page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:11mm}body{font-family:system-ui,sans-serif;color:${ink}}
      .hd{display:flex;align-items:center;gap:12px;border-bottom:3px solid ${brand};padding-bottom:10px;margin-bottom:6px}
      .hd .lg{height:38px;object-fit:contain} .hd h1{color:${brand};font-size:19px;margin:0;flex:1} .hd .tn{font-weight:800;font-size:14px;color:${ink}}
      .sub{color:#666;font-size:12px;margin:4px 0 10px}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}th,td{border:1px solid #e2e2e2;padding:6px 8px;text-align:left}
      th{background:${ink};color:#fff} td.n,th.n{text-align:right} thead .lg{display:block;margin:0 0 4px auto}
      tr.win td{background:${rgbaHex(brand, .07)}} .sec td{background:#f3f3f3;font-weight:700}
      .rec{margin-top:14px;border-left:3px solid ${brand};padding:9px 13px;background:#fafafa;font-size:12px;border-radius:0 6px 6px 0}
      .ft{margin-top:16px;color:#999;font-size:10px}</style></head><body>
      <div class="hd">${tlogo ? `<img class="lg" src="${tlogo}">` : ''}<h1>⚖️ Comparativo de seguros · ${meta.ramo}</h1><span class="tn">${tenant}</span></div>
      <div class="sub">${U.esc(meta.cliente || 'Prospecto')}${meta.marca ? ' · ' + meta.marca + ' ' + meta.linea + (meta.modelo ? ' ' + meta.modelo : '') + ' ' + meta.anio : ''}</div>
      <table><thead><tr><th>Concepto</th>${ordered.map(p => `<th class="n">${logoImg(p)}<br>${U.esc(p.nombre)}</th>`).join('')}</tr></thead>
      <tbody>
        <tr class="win"><td><b>Prima total</b></td>${ordered.map(p => `<td class="n"><b>${U.money(p.total || 0, cur)}</b>${p.total === minT ? ' 🏆' : ''}</td>`).join('')}</tr>
        <tr><td>Forma de pago</td>${ordered.map(p => `<td class="n">${p.fracc > 1 ? p.fracc + ' cuotas · ' + U.money((p.total || 0) / p.fracc, cur) : 'Contado'}</td>`).join('')}</tr>
        <tr><td>Prima neta</td>${ordered.map(p => `<td class="n">${U.money(p.neta || 0, cur)}</td>`).join('')}</tr>
        <tr><td>IVA / recargos</td>${ordered.map(p => `<td class="n">${U.money(p.iva || 0, cur)}</td>`).join('')}</tr>
        <tr class="sec"><td colspan="${ordered.length + 1}">🛡️ Coberturas</td></tr>
        ${cobRows}
      </tbody></table>
      ${top ? `<div class="rec"><b>🧠 Recomendación (${meta.criterio}):</b> ${U.esc(top.nombre)} — opción sugerida según el criterio de ${meta.criterio === 'precio' ? 'mejor precio' : meta.criterio === 'cobertura' ? 'mejor cobertura' : 'equilibrio precio/cobertura'}.</div>` : ''}
      <p class="ft">Documento informativo emitido por ${tenant}. Coberturas sujetas a condiciones de póliza vigentes. Las propuestas pueden variar según suscripción de la aseguradora.</p></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 350);
  }
  function enviarCliente() {
    const validas = propsValidadas();
    if (!validas.length) { Orbit.ui.toast('Necesitás al menos una propuesta validada para enviar al cliente.'); return; }
    const rk = ranking(), ganador = rk[0] ? rk[0].p : validas[0];
    const cur = (validas[0] || {}).cur || 'GTQ';
    // elegir cliente: el del meta si existe, o pedir
    const cid = meta.clienteId || (S().all('clientes')[0] || {}).id;
    const resumen = validas.map((p, i) => '• ' + (p.nombre || 'Propuesta ' + (i + 1)) + ': ' + Orbit.ui.money(p.total || 0, cur)).join('\n');
    const msg = 'Hola, te comparto el comparativo de ' + (meta.ramo || 'seguros') + ' con ' + validas.length + ' opciones:\n\n' + resumen + '\n\nNuestra recomendación: ' + (ganador.nombre || 'la mejor relación valor/precio') + '. Quedo atento para avanzar con la que prefieras.';
    if (!cid) { Orbit.ui.toast('No hay cliente para asociar. Crea o selecciona uno.'); return; }
    Orbit.notify.pedir(cid, { tipo: 'Comparativo preparado', icon: '⚖️', asunto: 'Comparativo de ' + (meta.ramo || 'seguros') + ' · ' + validas.length + ' opciones', mensaje: msg, adjunto: 'Comparativo-' + (meta.ramo || 'seguros') + '.pdf' });
  }
  function rgbaHex(hex, a) { let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  return { render, enviarCliente };
})();
