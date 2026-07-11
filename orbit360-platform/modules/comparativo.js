/* ============================================================
   Orbit 360 · 📋 Comparativo (independiente)
   Toma las cotizaciones elegidas del Cotizador (Orbit._cots) y/o
   propuestas cargadas como PDF (de aseguradoras sin tarifa). Arma
   un comparativo PROFUNDO: tabla completa con logos, criterios por
   ramo (coberturas, suma asegurada, deducible, asistencias),
   recomendación consultiva replanteable (precio / cobertura /
   equilibrio), edición por propuesta e impresión.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.comparativo = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  let host, props = [];
  let meta = { pais: 'GT', cliente: '', ramo: 'Auto', marca: '', linea: '', modelo: '', anio: 2022, sub: '', detalle: '', criterio: 'equilibrio' };
  // versiones/trims frecuentes por línea (3er nivel). Fallback genérico si no está.
  const MODELOS = {
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
  function modelosDe(linea) { return MODELOS[linea] || ['Estándar', 'Full Extras', 'Edición Especial']; }
  const VEH = {
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
    const marcas = Object.keys(VEH), lineas = VEH[meta.marca] || [];
    const subAuto = meta.pais === 'CO'
      ? ['Todo riesgo', 'RC / SOAT+', 'Pérdidas totales', 'Pérdidas parciales', 'Por kilómetros', 'Pesado']
      : ['Liviano', 'Responsabilidad Civil', 'Pesado', 'Pick-up / Comercial', 'Motocicleta', 'Grúa'];
    let campos;
    if (meta.ramo === 'Auto') {
      campos = `<label class="ce-l">🚙 Tipo<select id="cp-sub" class="o-sel">${subAuto.map(x => `<option ${x === meta.sub ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="ce-l">📅 Año / modelo<input id="cp-anio" class="o-sel" type="number" value="${meta.anio}"></label>
        <label class="ce-l">🚗 Marca<select id="cp-marca" class="o-sel"><option value="">— Marca —</option>${marcas.map(m => `<option ${m === meta.marca ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label class="ce-l">🔻 Línea<select id="cp-linea" class="o-sel" ${lineas.length ? '' : 'disabled'}><option value="">${lineas.length ? '— Línea —' : 'Elige marca'}</option>${lineas.map(l => `<option ${l === meta.linea ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="ce-l">🏷️ Modelo / versión<select id="cp-modelo" class="o-sel" ${meta.linea ? '' : 'disabled'}><option value="">${meta.linea ? '— Versión —' : 'Elige línea'}</option>${meta.linea ? modelosDe(meta.linea).map(mo => `<option ${mo === meta.modelo ? 'selected' : ''}>${mo}</option>`).join('') : ''}</select></label>
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
    set('#cp-pais', 'pais'); set('#cp-cli', 'cliente'); set('#cp-ramo', 'ramo'); set('#cp-anio', 'anio', true); set('#cp-det', 'detalle'); set('#cp-sub', 'sub'); set('#cp-placa', 'placa');
    const mk = host.querySelector('#cp-marca'); if (mk) mk.addEventListener('change', () => { meta.marca = mk.value; meta.linea = ''; meta.modelo = ''; render(host); });
    const ln = host.querySelector('#cp-linea'); if (ln) ln.addEventListener('change', () => { meta.linea = ln.value; meta.modelo = ''; render(host); });
    const mo = host.querySelector('#cp-modelo'); if (mo) mo.addEventListener('change', () => { meta.modelo = mo.value; });
  }

  function init() {
    if (Orbit._cots && Orbit._cots.length && !props.length) props = Orbit._cots.map(c => Object.assign({ nombre: c.nombre, color: c.color, total: c.total, neta: c.neta, iva: c.iva, cur: c.cur, ramo: c.ramo, cliente: c.cliente, fracc: c.fracc, sumaAsegurada: c.sumaAsegurada || 0, deducible: c.deducible || '', cob: c.cob || {}, origen: 'cotizador' }));
  }

  /* ---- score consultivo por criterio elegido ---- */
  function ranking() {
    if (!props.length) return [];
    const totals = props.map(p => p.total || 0).filter(Boolean);
    const minT = Math.min(...totals), maxT = Math.max(...totals);
    const sumas = props.map(p => +p.sumaAsegurada || 0);
    const maxS = Math.max(1, ...sumas);
    const crits = criteriosDe();
    return props.map((p, i) => {
      // precio: 1 = más barato
      const precioScore = maxT === minT ? 1 : 1 - ((p.total || maxT) - minT) / (maxT - minT);
      // cobertura: suma normalizada + coberturas booleanas presentes
      const boolCob = crits.filter(c => c.tipo === 'bool').reduce((s, c) => s + (p.cob && p.cob[c.k] ? 1 : 0), 0);
      const boolMax = Math.max(1, crits.filter(c => c.tipo === 'bool').length);
      const cobScore = ((+p.sumaAsegurada || 0) / maxS) * 0.6 + (boolCob / boolMax) * 0.4;
      const score = meta.criterio === 'precio' ? precioScore : meta.criterio === 'cobertura' ? cobScore : (precioScore * 0.5 + cobScore * 0.5);
      return { i, p, precioScore, cobScore, score };
    }).sort((a, b) => b.score - a.score);
  }

  function render(h) {
    host = h; init();
    const cur = (props[0] || {}).cur || 'GTQ';
    const rk = ranking();
    const winI = rk.length ? rk[0].i : -1;
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '📋', title: 'Comparativo', sub: 'Compara aseguradoras a fondo (del cotizador o por PDF) y cierra con la mejor', features: [], actions: `<button class="btn ghost" id="cp-hist-b" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">🕘 Historial</button><button class="btn ghost" id="cp-pdf" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">⬆ Cargar propuestas (PDF)</button>` })}
      <div class="cfg-note" style="margin-bottom:14px">🔗 Compara cotizaciones traídas del <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/cotizador'">Cotizador</a> o PDFs externos por aseguradora — el directorio y las tarifas viven en <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/aseguradoras'">Aseguradoras</a>.</div>
      ${props.length ? '' : '<div class="cfg-note" style="margin-bottom:14px">📋 El comparativo funciona <b>solo</b>: llena los <b>datos del riesgo</b> abajo, luego <b>⬆ carga PDFs</b> de propuestas (extracción inteligente) o <b>➕ agrégalas manual</b>. También puedes traerlas desde el <a style="color:var(--red);cursor:pointer" onclick="location.hash=\'#/cotizador\'">🧮 Cotizador</a>.</div>'}
      ${datosIniciales()}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <b style="font-family:var(--f-display);font-size:16px">${props.length ? '⚖️ ' + props.length + ' aseguradoras · ' + meta.ramo : '⚖️ Nuevo comparativo'}</b>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" id="cp-add">➕ Propuesta manual</button>${props.length ? `<button class="btn ghost sm" id="cp-save">💾 Guardar</button><button class="btn ghost sm" id="cp-send">📲 Enviar al cliente</button><button class="btn primary sm" id="cp-print">🖨 Imprimir</button>` : ''}</div>
      </div>
      <div id="cp-out" class="cz-cards">${props.map((p, i) => card(p, i === winI, i, cur)).join('') || '<div class="muted" style="padding:30px 0;text-align:center;grid-column:1/-1">Sin propuestas todavía.</div>'}</div>
      ${props.length > 1 ? tabla(cur, rk) : ''}
      ${props.length > 1 ? recomendacion(rk, cur) : ''}
    </div>`;
    host.querySelector('#cp-pdf').addEventListener('click', cargarPDF);
    host.querySelector('#cp-hist-b').addEventListener('click', verHist);
    bindMeta();
    const add = host.querySelector('#cp-add'); if (add) add.addEventListener('click', manual);
    const sv = host.querySelector('#cp-save'); if (sv) sv.addEventListener('click', guardarHist);
    const pr = host.querySelector('#cp-print'); if (pr) pr.addEventListener('click', imprimir);
    const snd = host.querySelector('#cp-send'); if (snd) snd.addEventListener('click', enviarCliente);
    host.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { props.splice(+b.dataset.del, 1); render(host); }));
    host.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editarProp(+b.dataset.edit)));
    host.querySelectorAll('[data-crit]').forEach(b => b.addEventListener('click', () => { meta.criterio = b.dataset.crit; render(host); }));
  }
  function card(p, win, i, cur) {
    return `<div class="cz-card ${win ? 'win' : ''}">
      ${win ? '<span class="cz-badge">🏆 Recomendada</span>' : ''}
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px">${logoDe(p)}<b style="font-family:var(--f-display);flex:1;line-height:1.15">${U.esc(p.nombre)}</b>${p.origen === 'pdf' ? '<span class="badge info" style="font-size:9px">📄 PDF</span>' : ''}<button class="asg-del" data-edit="${i}" title="Editar valores">✏</button><button class="asg-del" data-del="${i}">✕</button></div>
      <div class="cz-total">${U.money(p.total || 0, cur)}</div>
      <div class="muted" style="font-size:11.5px">💵 prima total${p.fracc > 1 ? ' · ' + U.money((p.total || 0) / p.fracc, cur) + '/pago' : ''}</div>
      ${p.sumaAsegurada ? `<div class="muted" style="font-size:11.5px;margin-top:3px">💰 suma ${U.money(p.sumaAsegurada, cur)}</div>` : ''}
      ${p.origen === 'pdf' ? '<div style="font-size:11px;color:var(--warn);margin-top:4px">⚠ revisar extracción</div>' : ''}
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
      + '</div>'
      + '<div style="padding:13px 18px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="pe-cancel">Cancelar</button><button class="btn primary" id="pe-ok">Guardar</button></div></div>';
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
    const minT = Math.min(...props.map(p => p.total || 1e15));
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
    const p = top.p, minT = Math.min(...props.map(x => x.total || 1e15));
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
  async function manual() {
    const nombre = await Orbit.ui.prompt('Nombre de la aseguradora / propuesta:', { title: 'Propuesta manual' }); if (!nombre) return;
    const total = +(await Orbit.ui.prompt('Prima total:', { title: 'Prima total', value: '0' })) || 0;
    props.push(Orbit.dto.cotizacionNormalizada({ nombre, color: '#6b7280', total, neta: total / 1.12, iva: total - total / 1.12, cur: (props[0] || {}).cur || 'GTQ', fracc: (props[0] || {}).fracc || 1, ramo: meta.ramo, sumaAsegurada: 0, deducible: '', origen: 'manual' })); props[props.length-1].cob = {}; render(host);
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
              multi.forEach(d => { const p = Orbit.dto.cotizacionNormalizada({ nombre: d.nombre, color: '#1f3a5f', total: d.total, neta: d.neta, iva: d.iva, cur: (props[0] || {}).cur || 'GTQ', fracc: 1, ramo: meta.ramo, sumaAsegurada: d.sumaAsegurada || 0, deducible: d.deducible || '', origen: 'pdf' }); p.cob = d.cob || {}; p.archivo = f.name; p.via = 'pdf-multi'; p.plan = d.plan; props.push(p); });
              usados = true;
            }
          }
        } catch (x) {}
        if (usados) continue;
        let d = null;
        try { if (Orbit.ia && Orbit.ia.extraerPDF) d = await Orbit.ia.extraerPDF(f); } catch (x) { d = null; }
        if (d && (d.total || d.neta)) {
          const total = d.total || (d.neta + (d.iva || 0));
          const p = Orbit.dto.cotizacionNormalizada({ nombre: d.nombre || f.name.replace(/\.(pdf|png|jpe?g)$/i, ''), color: '#1f3a5f', total: Math.round(total), neta: Math.round(d.neta || total / 1.12), iva: Math.round(d.iva || total - total / 1.12), cur: (props[0] || {}).cur || 'GTQ', fracc: d.fracc || 1, ramo: meta.ramo, sumaAsegurada: Math.round(d.sumaAsegurada || 0), deducible: d.deducible || '', origen: 'pdf' });
          p.cob = d.cob || {}; p.archivo = f.name; p.via = d._via || 'local'; props.push(p);
        } else {
          const p = Orbit.dto.cotizacionNormalizada({ nombre: f.name.replace(/\.(pdf|png|jpe?g)$/i, '').replace(/[_-]+/g, ' '), color: '#6b7280', total: 0, neta: 0, iva: 0, cur: (props[0] || {}).cur || 'GTQ', fracc: 1, ramo: meta.ramo, sumaAsegurada: 0, deducible: '', origen: 'pdf' });
          p.cob = {}; p.archivo = f.name; p.via = 'manual'; props.push(p);
        }
      }
      t.remove(); render(host);
      const viaIA = props.some(p => p.via === 'ia');
      const t2 = document.createElement('div'); t2.className = 'ciclo-toast'; t2.textContent = '✓ ' + files.length + ' propuesta(s) extraída(s)' + (viaIA ? ' con IA' : '') + ' — revisá con ✏ y completá lo que falte'; document.body.appendChild(t2); setTimeout(() => t2.remove(), 3200);
    });
    inp.click();
  }
  function guardarHist() {
    if (!props.length) return;
    const h = Orbit._compHist = Orbit._compHist || [];
    h.unshift({ id: 'cmp' + Date.now(), fecha: Orbit.ui.today(), ramo: meta.ramo, cliente: meta.cliente || 'Prospecto', n: props.length, mejor: (ranking()[0] || {}).p ? ranking()[0].p.nombre : props[0].nombre, criterio: meta.criterio, props: JSON.parse(JSON.stringify(props)), meta: JSON.parse(JSON.stringify(meta)) });
    const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ Comparativo guardado en el historial'; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
    render(host);
  }
  function verHist() {
    const h = Orbit._compHist || [];
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
    back.querySelectorAll('[data-load]').forEach(b => b.addEventListener('click', () => { const c = (Orbit._compHist || []).find(x => x.id === b.dataset.load); if (c) { props = JSON.parse(JSON.stringify(c.props)); if (c.meta) meta = JSON.parse(JSON.stringify(c.meta)); close(); render(host); } }));
  }
  function imprimir() {
    const cur = (props[0] || {}).cur || 'GTQ', rk = ranking(), minT = Math.min(...props.map(p => p.total || 1e15));
    const ordered = rk.map(r => props[r.i]);
    const crits = criteriosDe();
    const landscape = props.length >= 3;
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
    if (!props.length) { Orbit.ui.toast('Agrega al menos una propuesta.'); return; }
    const rk = ranking(), ganador = props[(rk[0] || {}).i] || props[0];
    const cur = (props[0] || {}).cur || 'GTQ';
    // elegir cliente: el del meta si existe, o pedir
    const cid = meta.clienteId || (S().all('clientes')[0] || {}).id;
    const resumen = props.map((p, i) => '• ' + (p.aseguradora || 'Propuesta ' + (i + 1)) + ': ' + Orbit.ui.money(p.total || 0, cur)).join('\n');
    const msg = 'Hola, te comparto el comparativo de ' + (meta.ramo || 'seguros') + ' con ' + props.length + ' opciones:\n\n' + resumen + '\n\nNuestra recomendación: ' + (ganador.aseguradora || 'la mejor relación valor/precio') + '. Quedo atento para avanzar con la que prefieras.';
    if (!cid) { Orbit.ui.toast('No hay cliente para asociar. Crea o selecciona uno.'); return; }
    Orbit.notify.pedir(cid, { tipo: 'Comparativo enviado', icon: '⚖️', asunto: 'Comparativo de ' + (meta.ramo || 'seguros') + ' · ' + props.length + ' opciones', mensaje: msg, adjunto: 'Comparativo-' + (meta.ramo || 'seguros') + '.pdf' });
  }
  function rgbaHex(hex, a) { let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  return { render, enviarCliente };
})();
