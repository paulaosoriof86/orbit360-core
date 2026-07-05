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

  /* ---- Motor de extracción REAL (CSV/TSV/TXT) ----------------------
     Lee el archivo del cliente, detecta delimitador, mapea encabezados
     a campos de Orbit por sinónimos difusos y escribe al store con
     deduplicación (crea lo nuevo, actualiza lo existente). PDF/XLSX/
     imagen requieren el extractor de backend (producción). */
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function normPais(s) { const n = norm(s); if (n.indexOf('colomb') >= 0 || n === 'co' || n === 'col') return 'CO'; if (n.indexOf('guate') >= 0 || n === 'gt' || n === 'gtm') return 'GT'; return ''; }
  function monedaDe(pais) { return pais === 'CO' ? 'COP' : pais === 'GT' ? 'GTQ' : ''; }
  // Detecta país/moneda desde un texto (nombre de hoja o celda) SIN asumir GT por defecto.
  function detectaPais(txt) { const n = norm(txt); if (/colomb|\bco\b|\bcop\b|bogota|medellin/.test(n)) return 'CO'; if (/guate|\bgt\b|\bgtq\b|quetzal/.test(n)) return 'GT'; return ''; }
  function detectaMoneda(txt) { const n = norm(txt); if (/cop|peso/.test(n)) return 'COP'; if (/gtq|quetzal|\bq\b/.test(n)) return 'GTQ'; if (/usd|dolar/.test(n)) return 'USD'; return ''; }
  // Hojas soporte que NO deben mapearse como movimientos (dashboard, análisis, presupuesto…).
  const HOJA_SOPORTE = /dashboard|resumen|presupuesto|analisis|análisis|graf|chart|tablero|indice|índice|portada|instruc|glosario|catalogo|catálogo|produccion|producción|metas?|proyec/i;
  function esHojaSoporte(sn) { return HOJA_SOPORTE.test(String(sn || '')); }
  function detectaPeriodo(txt) {
    const n = norm(txt);
    const MES = { ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06', jul: '07', ago: '08', sep: '09', set: '09', oct: '10', nov: '11', dic: '12' };
    let m = n.match(/(20\d{2})[ _-]?(0[1-9]|1[0-2])/); if (m) return m[1] + '-' + m[2];
    m = n.match(/(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)\w*[ _-]?(20\d{2})/); if (m) return m[2] + '-' + MES[m[1]];
    m = n.match(/(0[1-9]|1[0-2])[ _-](20\d{2})/); if (m) return m[2] + '-' + m[1];
    return '';
  }
  function parseNum(v) { if (v == null) return 0; let s = String(v).replace(/[^0-9,.\-]/g, ''); s = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'); const n = parseFloat(s); return isNaN(n) ? 0 : n; }
  /* Normaliza un movimiento importado a la FORMA REAL de finmovs del seed
     ({ tipo:'ingreso'|'egreso'|'saldo_inicial', clase, pais, moneda, periodo, dia, valor, estado })
     para que Finanzas lo sume correctamente. */
  function finmovShape(rec, clasePorDefecto) {
    const mv = parseNum(rec.monto);
    const c = norm(rec.concepto);
    const esSaldo = /saldo anterior|saldo inicial/.test(c);
    // País/moneda: usa lo de la fila, si no la traza de hoja; NUNCA asume GT.
    const pais = normPais(rec.pais) || rec._paisHoja || '';
    // MONEDA (P0-02): solo se ACEPTA moneda EXPLÍCITA (fila o hoja). monedaDe(pais) es SUGERENCIA, nunca valor escrito.
    const monedaExplicita = (norm(rec.moneda) === 'cop' ? 'COP' : norm(rec.moneda) === 'gtq' ? 'GTQ' : norm(rec.moneda) === 'usd' ? 'USD' : '') || rec._monedaHoja || '';
    const monedaSugerida = monedaDe(pais);
    const cur = monedaExplicita;
    const fecha = String(rec.fecha || '');
    const periodo = (fecha.match(/^(\d{4}-\d{2})/) || [])[1] || rec._periodoHoja || (Orbit.ui.today ? Orbit.ui.today().slice(0, 7) : new Date().toISOString().slice(0, 7));
    const dia = +((fecha.match(/^\d{4}-\d{2}-(\d{2})/) || [])[1]) || 1;
    const clase = rec.categoria || rec.clase || clasePorDefecto || 'Otros';
    const concepto = rec.concepto || clase;
    const out = { pais, moneda: cur, monedaSugerida: monedaSugerida, periodo, dia, valor: Math.abs(mv), concepto, clase, origen: rec.origen || 'importado', importado: true };
    // Trazabilidad de hoja/bloque/fila (P0-01/P0-02)
    ['_origenHoja', '_paisHoja', '_monedaHoja', '_periodoHoja', '_bloqueOrigen', '_numeroFila'].forEach(k => { if (rec[k] != null) out[k] = rec[k]; });
    // País o moneda EXPLÍCITA ausentes → requiere validación; NO se asume GT/GTQ ni se escribe la sugerida (P0-02/P0-03).
    if (!pais || !cur) { out.requiereValidacion = true; out.estado = 'requiere_validacion'; out._motivoValidacion = (!pais ? 'país' : '') + (!pais && !cur ? ' y ' : '') + (!cur ? 'moneda' : '') + ' no confiables' + (monedaSugerida && !cur ? ' (sugerida: ' + monedaSugerida + ')' : ''); }
    if (esSaldo) { out.tipo = 'saldo_inicial'; if (!out.estado || out.estado !== 'requiere_validacion') out.estado = 'referencia'; out.requiereValidacion = true; out.clase = 'Saldo inicial'; out.valor = Math.abs(mv); return out; }
    const egreso = (norm(rec.tipoMov).indexOf('egr') === 0 || mv < 0);
    out.tipo = egreso ? 'egreso' : 'ingreso';
    if (!out.estado || out.estado !== 'requiere_validacion') out.estado = egreso ? 'pagado' : 'recaudado';
    out[egreso ? 'beneficiario' : 'pagador'] = rec.pagador || rec.beneficiario || '';
    return out;
  }
  function detectDelim(line) { const c = (line.match(/,/g) || []).length, sc = (line.match(/;/g) || []).length, t = (line.match(/\t/g) || []).length; if (t >= c && t >= sc) return '\t'; if (sc >= c) return ';'; return ','; }
  function parseDelimited(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length);
    if (!lines.length) return { headers: [], rows: [] };
    const d = detectDelim(lines[0]);
    function split(line) { const out = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === d && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(s => s.trim()); }
    return { headers: split(lines[0]), rows: lines.slice(1).map(split) };
  }
  /* Carga perezosa de librerías de parseo (solo cuando se usan) */
  const _libs = {};
  function loadLib(url, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (_libs[url]) return _libs[url];
    _libs[url] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.onload = () => res(window[globalName]); s.onerror = () => rej(new Error('load ' + url)); document.head.appendChild(s); });
    return _libs[url];
  }
  /* matriz (Excel) -> {headers, rows} */
  function matrixToParsed(mat) {
    mat = (mat || []).filter(r => r && r.some(c => String(c).trim() !== ''));
    if (!mat.length) return { headers: [], rows: [] };
    return { headers: mat[0].map(c => String(c)), rows: mat.slice(1).map(r => r.map(c => String(c == null ? '' : c))) };
  }
  /* texto plano (PDF/Word/OCR) -> tabla delimitada o, si no, extracción etiquetada de UN registro */
  function textToParsed(text, kind) {
    const d = parseDelimited(text);
    if (d.headers.length > 1 && d.rows.length) { const idx = mapHeaders(kind, d.headers); if (Object.keys(idx).length) return d; }
    const cfg = IMPORT_MAP[kind]; if (!cfg) return d;
    const flat = String(text).replace(/\s+/g, ' ');
    const headers = [], values = [];
    Object.keys(cfg.fields).forEach(field => {
      for (let i = 0; i < cfg.fields[field].length; i++) {
        const syn = cfg.fields[field][i];
        const re = new RegExp(syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[:#=-]?\\s*([^\\s].{0,50}?)(?=\\s{2,}|$|[A-ZÁÉÍÓÚ][a-z]+\\s*[:#=])', 'i');
        const m = flat.match(re); if (m && m[1]) { headers.push(cfg.fields[field][0]); values.push(m[1].trim()); break; }
      }
    });
    if (headers.length) return { headers, rows: [values] };
    return d;
  }
  function showLoading(msg) { state.processing = msg; paint(); }
  /* Extractor INTELIGENTE real: la IA lee el documento y devuelve registros estructurados
     según el esquema del destino. Si no hay IA disponible, retorna null (fallback heurístico). */
  async function aiExtract(text, kind) {
    const cfg = IMPORT_MAP[kind];
    if (!cfg || !text || text.replace(/\s/g, '').length < 12) return null;
    if (!(Orbit.ia.disponible())) return null;
    const fields = Object.keys(cfg.fields);
    const prompt = 'Eres un extractor de datos de seguros. Del siguiente documento extrae TODOS los registros de tipo "' + cfg.label + '". '
      + 'Devuelve SOLO un JSON array válido, sin explicación ni markdown. Cada objeto usa exactamente estas claves (cadena vacía si el dato no está): '
      + fields.join(', ') + '. '
      + 'Si el documento describe un solo registro, devuelve un array de 1. Si hay varias secciones/hojas/filas, devuelve uno por cada registro real (no por línea de texto). '
      + 'Limpia los valores (sin etiquetas, solo el dato). Documento:\n"""' + String(text).slice(0, 7000) + '"""';
    try {
      const out = await Orbit.ia.complete(prompt);
      const m = String(out).match(/\[[\s\S]*\]/); if (!m) return null;
      const arr = JSON.parse(m[0]);
      if (!Array.isArray(arr) || !arr.length) return null;
      const rows = arr.map(o => fields.map(f => (o && o[f] != null) ? String(o[f]) : ''));
      return { headers: fields.slice(), rows: rows.filter(r => r.some(v => v && v.trim())), ai: true };
    } catch (e) { return null; }
  }
  /* Procesa texto de documento: intenta IA, si no, heurística. (async) */
  async function procesarTexto(text) {
    showLoading('🧠 Extracción inteligente con IA…');
    let parsed = null;
    try { parsed = await aiExtract(text, state.kind); } catch (e) { parsed = null; }
    state.parsed = parsed || textToParsed(text, state.kind);
    state.processing = null; if (state.kind === 'base-inicial' && state.parsed && state.parsed.headers && state.parsed.headers.length) { let best = 'clientes', score = -1;['clientes', 'polizas', 'vehiculos', 'movimientos-finanzas', 'estados-cuenta'].forEach(k => { const n = Object.keys(mapHeaders(k, state.parsed.headers)).length; if (n > score) { score = n; best = k; } }); state.kind = best; state.meta = KINDS[best] || state.meta; }
    state.step = 2; paint();
  }
  const FIELD_LABEL = { nombre: 'Nombre', tipo: 'Tipo', identificacion: 'Identificación', asesorNombre: 'Asesor', email: 'Correo', telefono: 'Teléfono', pais: 'País', ciudad: 'Ciudad', departamento: 'Departamento', direccion: 'Dirección', segmento: 'Segmento', canal: 'Canal', numero: 'Póliza', ramo: 'Ramo', producto: 'Producto', aseguradoraNombre: 'Aseguradora', prima: 'Prima', clienteNombre: 'Cliente', vigenciaIni: 'Vig. inicio', vigenciaFin: 'Vig. fin', placa: 'Placa', marca: 'Marca', linea: 'Línea/Modelo', anio: 'Año', fecha: 'Fecha', concepto: 'Concepto', monto: 'Monto', tipoMov: 'Tipo' };
  const IMPORT_MAP = {
    'clientes': {
      coll: 'clientes', label: 'Clientes 360', dedup: ['identificacion', 'nombre'],
      fields: {
        nombre: ['nombre', 'cliente', 'razon social', 'razonsocial', 'nombres', 'nombre completo', 'asegurado', 'contratante', 'tomador'],
        tipo: ['tipo', 'tipo cliente', 'persona empresa'],
        identificacion: ['identificacion', 'documento', 'dpi', 'nit', 'cedula', 'id', 'rut', 'cc', 'no documento', 'nro documento', 'numero documento', 'doc'],
        asesorNombre: ['asesor', 'ejecutivo', 'agente', 'vendedor', 'productor'],
        email: ['email', 'correo', 'e mail', 'mail', 'correo electronico'],
        telefono: ['telefono', 'tel', 'celular', 'movil', 'whatsapp', 'contacto', 'numero telefono'],
        pais: ['pais'], moneda: ['moneda', 'divisa', 'currency'], ciudad: ['ciudad', 'municipio'], departamento: ['departamento', 'depto', 'provincia', 'estado'],
        direccion: ['direccion', 'domicilio'], segmento: ['segmento'], canal: ['canal', 'origen', 'fuente']
      },
      build(rec) {
        const ne = norm(rec.tipo), nn = norm(rec.nombre);
        rec.tipo = (ne.indexOf('emp') === 0 || ne.indexOf('jurid') >= 0 || /\b(sa|sas|ltda)\b/.test(nn)) ? 'Empresa' : 'Persona';
        // P0-02: país de la fila; NUNCA default GTQ. Moneda solo explícita; si no, requiere validación.
        rec.pais = normPais(rec.pais);
        rec.monedaSugerida = monedaDe(rec.pais);
        rec.moneda = (norm(rec.moneda) === 'cop' ? 'COP' : norm(rec.moneda) === 'gtq' ? 'GTQ' : norm(rec.moneda) === 'usd' ? 'USD' : '');
        if (!rec.pais || !rec.moneda) { rec.requiereValidacion = true; rec.estado = 'requiere_validacion'; rec._motivoValidacion = (!rec.pais ? 'país' : '') + (!rec.pais && !rec.moneda ? ' y ' : '') + (!rec.moneda ? 'moneda' : '') + ' no confiables' + (rec.monedaSugerida && !rec.moneda ? ' (sugerida: ' + rec.monedaSugerida + ')' : ''); }
        if (rec.asesorNombre) { const a = Orbit.store.all('asesores').find(x => norm(x.nombre).indexOf(norm(rec.asesorNombre)) >= 0 || norm(rec.asesorNombre).indexOf(norm(x.nombre)) >= 0); if (a) rec.asesorId = a.id; }
        delete rec.asesorNombre;
        rec.fechaAlta = rec.fechaAlta || new Date().toISOString().slice(0, 10);
        rec.etiquetas = rec.etiquetas || []; rec.notas = rec.notas || ''; rec.driveLink = rec.driveLink || '';
        return rec;
      }
    },
    'polizas': {
      coll: 'polizas', label: 'Pólizas', dedup: ['numero'],
      fields: {
        numero: ['poliza', 'numero poliza', 'no poliza', 'num poliza', 'nro poliza', 'numero', 'no', 'number'],
        ramo: ['ramo', 'linea', 'tipo seguro', 'categoria'], producto: ['producto', 'subramo', 'plan', 'cobertura'],
        aseguradoraNombre: ['aseguradora', 'compania', 'cia', 'asegurador'],
        prima: ['prima', 'valor', 'monto'],
        primaNeta: ['prima neta', 'neta', 'prima base'],
        primaTotal: ['prima total', 'total', 'total a pagar', 'prima bruta'],
        gastos: ['gastos', 'gastos emision', 'gastos de emision', 'gasto emision', 'derechos'],
        iva: ['iva', 'impuesto', 'igv'],
        pais: ['pais', 'país', 'country'], moneda: ['moneda', 'divisa', 'currency'],
        clienteNombre: ['cliente', 'asegurado', 'contratante', 'tomador', 'nombre'],
        vigenciaIni: ['vigencia inicio', 'inicio vigencia', 'desde', 'fecha inicio', 'vigencia desde'],
        vigenciaFin: ['vigencia fin', 'fin vigencia', 'hasta', 'fecha fin', 'vencimiento', 'vigencia hasta'],
        frecuencia: ['frecuencia', 'forma de pago', 'fraccionamiento', 'periodicidad', 'modo pago'],
        formaPago: ['medio de pago', 'medio', 'metodo de pago', 'metodo pago', 'conducto'],
        estadoPol: ['estado', 'status', 'situacion', 'vigente'],
        sumaAsegurada: ['suma asegurada', 'suma', 'valor asegurado']
      },
      build(rec) {
        // P1-04: separar prima neta / gastos / IVA / total; NO colapsar todo a un solo campo.
        rec.primaNeta = parseNum(rec.primaNeta); rec.primaTotal = parseNum(rec.primaTotal);
        rec.gastos = parseNum(rec.gastos); rec.iva = parseNum(rec.iva);
        const primaGen = parseNum(rec.prima);
        // Si no viene neta explícita: si hay total y componentes, derivar; si no, marcar validación.
        if (!rec.primaNeta) {
          if (primaGen && !rec.primaTotal) { rec.primaTotal = primaGen; }
          if (rec.primaTotal && (rec.gastos || rec.iva)) { rec.primaNeta = Math.max(0, rec.primaTotal - rec.gastos - rec.iva); }
          else { rec._primaAmbigua = true; }   // no sabemos cuál es neta → requiere_validacion
        }
        if (!rec.primaTotal) rec.primaTotal = rec.primaNeta + rec.gastos + rec.iva || rec.primaNeta;
        rec.prima = rec.primaTotal || rec.primaNeta;   // compat: 'prima' visible = total
        rec.ramo = rec.ramo || '';
        rec.sumaAsegurada = parseNum(rec.sumaAsegurada);
        // P0-04: estado explícito; si no viene, requiere_validacion (NO asumir Vigente).
        const ne = norm(rec.estadoPol);
        if (!ne) { rec.estado = 'Requiere validación'; rec._estadoAmbiguo = true; }
        else rec.estado = ne.indexOf('cancel') >= 0 ? 'Cancelada' : ne.indexOf('venc') >= 0 ? 'Vencida' : ne.indexOf('renov') >= 0 ? 'Por renovar' : ne.indexOf('vig') >= 0 ? 'Vigente' : 'Requiere validación';
        delete rec.estadoPol;
        rec.frecuencia = rec.frecuencia || 'Contado'; rec.forma = rec.frecuencia; rec.formaPago = rec.formaPago || '';
        rec.renovable = true;
        // País/moneda: de la fila; si no, del cliente vinculado; NUNCA asumir GT. Moneda solo EXPLÍCITA (P0-02).
        rec.pais = normPais(rec.pais);
        rec.monedaSugerida = monedaDe(rec.pais);
        rec.moneda = (norm(rec.moneda) === 'cop' ? 'COP' : norm(rec.moneda) === 'gtq' ? 'GTQ' : norm(rec.moneda) === 'usd' ? 'USD' : '');
        if (rec.clienteNombre) { const c = Orbit.store.all('clientes').find(x => norm(x.nombre).indexOf(norm(rec.clienteNombre)) >= 0 || norm(rec.clienteNombre).indexOf(norm(x.nombre)) >= 0); if (c) { rec.clienteId = c.id; rec.pais = rec.pais || c.pais; rec.moneda = rec.moneda || c.moneda; rec.asesorId = c.asesorId; } }
        if (rec.aseguradoraNombre) { const a = Orbit.store.all('aseguradoras').find(x => norm(x.nombre).indexOf(norm(rec.aseguradoraNombre)) >= 0 || norm(rec.aseguradoraNombre).indexOf(norm(x.nombre)) >= 0); if (a) { rec.aseguradoraId = a.id; rec.comAseguradoraPct = (a.comisiones && a.comisiones[rec.ramo]) || a.comisionDefault || 12; } }
        rec.comVendedorPct = rec.comVendedorPct || 50;
        // Sin país o moneda confiables → requiere validación (P0-04).
        if (!rec.pais || !rec.moneda || rec._estadoAmbiguo || rec._primaAmbigua) {
          rec.requiereValidacion = true;
          rec._motivoValidacion = [!rec.pais && 'país', !rec.moneda && 'moneda', rec._estadoAmbiguo && 'estado', rec._primaAmbigua && 'prima neta'].filter(Boolean).join(', ') + ' no confiables';
        }
        delete rec.clienteNombre; delete rec.aseguradoraNombre; return rec;
      },
      /* MIGRACIÓN: recibos SOLO si la póliza es Vigente/Por renovar, con país+moneda+forma de pago
         confiables y sin marca de validación. Cualquier ambigüedad → sin cartera (P0-04). */
      afterInsert(rec) {
        if (!Orbit.primas || !rec.clienteId) return;
        const confiable = (rec.estado === 'Vigente' || rec.estado === 'Por renovar') && rec.pais && rec.moneda && rec.formaPago && !rec.requiereValidacion && rec.primaNeta > 0;
        if (!confiable) return; // histórico / incompleto: sin recibos en cartera
        const frac = Orbit.primas.cuotasDe(rec.frecuencia) > 1;
        const d = Orbit.primas.desglose(rec.primaNeta, rec.pais, { fraccionado: frac });
        Orbit.primas.recibos(d, { frecuencia: rec.frecuencia, vigenciaInicio: rec.vigenciaIni || (Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10)), comAseguradoraPct: rec.comAseguradoraPct, comVendedorPct: rec.comVendedorPct }).forEach((r, i) => {
          Orbit.store.insert('cobros', { id: 'cob_imp_' + rec.id + '_' + i, polizaId: rec.id, clienteId: rec.clienteId, asesorId: rec.asesorId, cuota: r.n, monto: r.total, moneda: rec.moneda, neta: r.neta, gastosEmision: r.gastosEmision, gastosFinan: r.gastosFinan, otros: r.otros, iva: r.iva, comAseguradora: r.comAseguradora, comVendedor: r.comVendedor, vence: r.vence, fechaLimite: r.fechaLimite, fechaPago: null, estado: 'Pendiente', metodo: null, conducto: rec.formaPago, conciliado: false, importado: true });
        });
      }
    },
    'vehiculos': {
      coll: 'vehiculos', label: 'Vehículos', dedup: ['placa'],
      fields: {
        placa: ['placa', 'matricula', 'patente', 'chapa'], marca: ['marca', 'fabricante'],
        linea: ['linea', 'modelo', 'referencia', 'version'], anio: ['anio', 'ano', 'modelo año', 'year'],
        chasis: ['chasis', 'vin', 'serie', 'no chasis'], motor: ['motor', 'no motor', 'numero motor'],
        clienteNombre: ['cliente', 'propietario', 'asegurado', 'nombre'],
        polizaNumero: ['poliza', 'no poliza', 'numero poliza', 'nro poliza']
      },
      build(rec) {
        rec.anio = parseNum(rec.anio) || rec.anio;
        if (rec.clienteNombre) { const c = Orbit.store.all('clientes').find(x => norm(x.nombre).indexOf(norm(rec.clienteNombre)) >= 0 || norm(rec.clienteNombre).indexOf(norm(x.nombre)) >= 0); if (c) rec.clienteId = c.id; }
        // tarjeta de circulación: enlaza a la póliza (y hereda cliente de ella)
        if (rec.polizaNumero) { const p = Orbit.store.all('polizas').find(x => norm(x.numero) === norm(rec.polizaNumero)); if (p) { rec.polizaId = p.id; if (!rec.clienteId) rec.clienteId = p.clienteId; } }
        // si la importación va dentro de una póliza abierta (scope), enlazarla
        if (!rec.polizaId && state && state.scope && state.scope.polId) { rec.polizaId = state.scope.polId; const p = Orbit.store.get('polizas', state.scope.polId); if (p && !rec.clienteId) rec.clienteId = p.clienteId; }
        delete rec.clienteNombre; delete rec.polizaNumero; return rec;
      }
    },
    'planillas-comision': {
      coll: 'comisiones', label: 'Comisiones (planilla)', dedup: [], conciliacion: true,
      fields: {
        aseguradoraNombre: ['aseguradora', 'compania', 'cia', 'asegurador'],
        polizaNumero: ['poliza', 'no poliza', 'numero poliza', 'nro poliza'],
        reciboNumero: ['recibo', 'no recibo', 'numero recibo'],
        asesorNombre: ['asesor', 'vendedor', 'productor', 'agente'],
        ramo: ['ramo', 'linea', 'tipo'], producto: ['producto', 'subramo', 'plan'],
        primaNeta: ['prima neta', 'prima', 'base', 'monto base'],
        pct: ['porcentaje', 'tasa comision', 'pct', 'tasa'],
        comEsperada: ['comision esperada', 'comision calculada', 'esperada'],
        comPagada: ['comision pagada', 'pagado', 'comision recibida', 'valor comision', 'monto comision'],
        pais: ['pais', 'país', 'country'], moneda: ['moneda', 'divisa', 'currency'],
        periodo: ['periodo', 'mes', 'fecha']
      },
      build(rec) {
        // P0-03: filas REALES de comisión. Separar esperada vs pagada. País/moneda/periodo obligatorios.
        rec.primaNeta = parseNum(rec.primaNeta); rec.pct = parseNum(rec.pct);
        rec.comEsperada = parseNum(rec.comEsperada) || (rec.primaNeta && rec.pct ? rec.primaNeta * rec.pct / 100 : 0);
        rec.comPagada = parseNum(rec.comPagada);
        rec.pais = normPais(rec.pais) || rec._paisHoja || '';
        rec.monedaSugerida = monedaDe(rec.pais);
        rec.moneda = (norm(rec.moneda) === 'cop' ? 'COP' : norm(rec.moneda) === 'gtq' ? 'GTQ' : norm(rec.moneda) === 'usd' ? 'USD' : '') || rec._monedaHoja || '';
        rec.periodo = String(rec.periodo || rec._periodoHoja || '').slice(0, 7);
        if (rec.aseguradoraNombre) { const a = Orbit.store.all('aseguradoras').find(x => norm(x.nombre).indexOf(norm(rec.aseguradoraNombre)) >= 0 || norm(rec.aseguradoraNombre).indexOf(norm(x.nombre)) >= 0); if (a) rec.aseguradoraId = a.id; }
        if (rec.polizaNumero) { const p = Orbit.store.all('polizas').find(x => norm(x.numero) === norm(rec.polizaNumero)); if (p) { rec.polizaId = p.id; rec.clienteId = p.clienteId; } }
        if (rec.asesorNombre) { const s = Orbit.store.all('asesores').find(x => norm(x.nombre).indexOf(norm(rec.asesorNombre)) >= 0); if (s) rec.asesorId = s.id; }
        // Conciliación esperada vs pagada
        rec.difComision = Math.round((rec.comPagada - rec.comEsperada) * 100) / 100;
        rec.montoConciliacion = rec.comPagada || rec.comEsperada;
        // Falta país/moneda/periodo o aseguradora → requiere_validacion (no conciliar a ciegas)
        const falta = [!rec.aseguradoraId && 'aseguradora', !rec.pais && 'país', !rec.moneda && 'moneda', !rec.periodo && 'periodo', (!rec.comEsperada && !rec.comPagada) && 'monto'].filter(Boolean);
        if (falta.length) { rec.requiereValidacion = true; rec.estado = 'requiere_validacion'; rec._motivoValidacion = falta.join(', ') + ' faltante(s)'; }
        else rec.estado = rec.difComision === 0 ? 'conciliada' : 'conciliar';
        delete rec.aseguradoraNombre; delete rec.polizaNumero; delete rec.asesorNombre; delete rec.reciboNumero;
        return rec;
      }
    },
    'movimientos-finanzas': {
      coll: 'finmovs', label: 'Movimientos', dedup: [],
      fields: {
        fecha: ['fecha', 'date', 'dia'], concepto: ['concepto', 'descripcion', 'detalle', 'glosa', 'referencia'],
        monto: ['monto', 'valor', 'importe', 'amount', 'debito', 'credito'], tipoMov: ['tipo', 'tipo movimiento', 'clase', 'naturaleza']
      },
      build(rec) {
        // Devuelve la FORMA del seed mutando rec (saldo anterior → saldo_inicial/referencia).
        const s = finmovShape(rec, 'Histórico');
        Object.keys(rec).forEach(k => delete rec[k]); Object.assign(rec, s); return rec;
      }
    },
    'documentos': {
      coll: 'parchesPendientes', label: 'documentos / parches al expediente', dedup: [], docPatch: true,
      fields: {
        nombre: ['nombre', 'cliente', 'razon social', 'nombres', 'nombre completo', 'asegurado'],
        identificacion: ['identificacion', 'documento', 'dpi', 'cui', 'nit', 'cedula', 'rut', 'cc', 'no documento', 'doc'],
        direccion: ['direccion', 'domicilio', 'residencia'],
        fechaNac: ['fecha de nacimiento', 'fecha nacimiento', 'nacimiento', 'fec nac', 'f nac'],
        telefono: ['telefono', 'tel', 'celular', 'movil', 'whatsapp'],
        email: ['email', 'correo', 'e mail'],
        ciudad: ['ciudad', 'municipio'], departamento: ['departamento', 'depto', 'provincia']
      },
      build(rec) { return rec; }
    },
    'facturas': {
      coll: 'facturas', label: 'Facturas', dedup: ['numero'],
      fields: {
        numero: ['factura', 'no factura', 'numero factura', 'nro factura', 'numero', 'serie'],
        fecha: ['fecha', 'fecha emision', 'date'], monto: ['monto', 'total', 'valor', 'importe'],
        polizaNumero: ['poliza', 'no poliza', 'numero poliza']
      },
      build(rec) { rec.monto = parseNum(rec.monto); if (rec.polizaNumero) { const p = Orbit.store.all('polizas').find(x => norm(x.numero) === norm(rec.polizaNumero)); if (p) { rec.polizaId = p.id; rec.clienteId = p.clienteId; } } delete rec.polizaNumero; return rec; }
    },
    'directorio-aseguradoras': {
      coll: 'aseguradoras', label: 'Directorio de aseguradoras', dedup: ['nombre'],
      fields: {
        nombre: ['aseguradora', 'compania', 'cia', 'nombre', 'asegurador'],
        ramosTxt: ['ramos', 'lineas', 'productos', 'ramos autorizados'],
        email: ['contacto', 'correo', 'email', 'mesa', 'e mail'],
        telefono: ['telefono', 'tel', 'conmutador'], pais: ['pais']
      },
      build(rec) {
        rec.pais = normPais(rec.pais);
        if (rec.ramosTxt) rec.ramos = String(rec.ramosTxt).split(/[,;/]+/).map(s => s.trim()).filter(Boolean);
        delete rec.ramosTxt;
        rec.comisionDefault = rec.comisionDefault || 12; rec.comisiones = rec.comisiones || {}; rec.comisionesProd = rec.comisionesProd || {};
        rec.vinculada = rec.vinculada != null ? rec.vinculada : false; rec.color = rec.color || '#1f3a5f';
        if (rec.email || rec.telefono) rec.contactos = [{ tipo: 'Comercial', nombre: 'Mesa de corredores', email: rec.email || '', tel: rec.telefono || '' }];
        delete rec.email; delete rec.telefono; return rec;
      }
    },
    'bitacora-reclamos': {
      coll: 'reclamos', label: 'Siniestros / Reclamos', dedup: ['numero'],
      fields: {
        numero: ['siniestro', 'no siniestro', 'numero siniestro', 'reclamo', 'no reclamo', 'numero', 'expediente'],
        polizaNumero: ['poliza', 'no poliza', 'numero poliza'],
        tipo: ['tipo', 'causa', 'cobertura', 'motivo'], estado: ['estado', 'status', 'situacion'],
        montoReclamado: ['monto', 'monto reclamado', 'valor', 'reclamado', 'importe'],
        fecha: ['fecha', 'fecha siniestro', 'fecha reclamo', 'date'],
        descripcion: ['descripcion', 'detalle', 'observacion', 'glosa']
      },
      build(rec) {
        rec.montoReclamado = parseNum(rec.montoReclamado); rec.montoAprobado = 0;
        rec.estado = rec.estado || 'Reportado'; rec.fecha = rec.fecha || new Date().toISOString().slice(0, 10);
        rec.bitacora = [{ ts: new Date().toISOString().slice(0, 16).replace('T', ' '), user: 'Importación', t: 'Reclamo importado', d: 'Cargado desde bitácora de la aseguradora.' }];
        rec.correos = []; rec.docs = []; rec.actualizado = new Date().toISOString().slice(0, 10);
        if (rec.polizaNumero) { const p = Orbit.store.all('polizas').find(x => norm(x.numero) === norm(rec.polizaNumero)); if (p) { rec.polizaId = p.id; rec.clienteId = p.clienteId; rec.aseguradoraId = p.aseguradoraId; rec.asesorId = p.asesorId; rec.ramo = p.ramo; } }
        delete rec.polizaNumero; return rec;
      }
    },
    'calendario-marketing': {
      coll: 'contenidos', label: 'Calendario de contenidos', dedup: [],
      fields: {
        fecha: ['fecha', 'dia', 'date'], titulo: ['contenido', 'titulo', 'tema', 'copy', 'pieza nombre'],
        tipo: ['tipo', 'formato', 'pieza'], canal: ['canal', 'red', 'plataforma', 'red social'],
        enfoque: ['enfoque', 'ramo', 'categoria', 'linea'], hora: ['hora', 'time']
      },
      build(rec) { rec.estado = rec.estado || 'Programado'; rec.hora = rec.hora || '08:00'; rec.canal = rec.canal || 'Instagram'; rec.tipo = rec.tipo || 'Texto'; rec.enfoque = rec.enfoque || 'Tendencias'; rec.stats = null; return rec; }
    },
    'estados-cuenta': {
      coll: 'cobros', label: 'Recibos (estado de cuenta)', dedup: [], conciliacion: true,
      fields: {
        numeroRecibo: ['recibo', 'no recibo', 'numero recibo', 'nro recibo'],
        polizaNumero: ['poliza', 'no poliza', 'numero poliza'],
        monto: ['monto', 'prima', 'valor', 'total', 'importe'],
        vence: ['vence', 'vencimiento', 'fecha limite', 'fecha', 'f limite'],
        estadoPago: ['estado', 'pagado', 'status', 'pago']
      },
      build(rec) {
        rec.monto = parseNum(rec.monto);
        if (rec.polizaNumero) { const p = Orbit.store.all('polizas').find(x => norm(x.numero) === norm(rec.polizaNumero)); if (p) { rec.polizaId = p.id; rec.clienteId = p.clienteId; rec.asesorId = p.asesorId; rec.moneda = p.moneda; } }
        const pago = norm(rec.estadoPago); rec.estado = (pago.indexOf('pag') >= 0 || pago === 'si' || pago === 'x') ? 'Pagado' : 'Pendiente';
        if (rec.estado === 'Pagado') { rec.fechaPago = rec.vence; rec.conciliado = false; }
        delete rec.polizaNumero; delete rec.estadoPago; rec.cuota = rec.cuota || 1; return rec;
      }
    },
    'estados-banco': {
      coll: 'conciliacionBanco', label: 'Conciliación bancaria', dedup: [], conciliacionBanco: true,
      fields: {
        fecha: ['fecha', 'date', 'dia'], concepto: ['descripcion', 'concepto', 'detalle', 'referencia', 'glosa'],
        monto: ['monto', 'valor', 'importe', 'debito', 'credito', 'amount'],
        pais: ['pais', 'país', 'country'], moneda: ['moneda', 'divisa', 'currency']
      },
      /* P0-134907-02: el estado de cuenta bancario va a una BANDEJA DE CONCILIACIÓN.
         NO escribe finmovs, cobros, clientes ni pólizas hasta validarse. */
      build(rec) {
        rec.monto = parseNum(rec.monto);
        rec.pais = normPais(rec.pais);
        rec.monedaSugerida = monedaDe(rec.pais);
        rec.moneda = (norm(rec.moneda) === 'cop' ? 'COP' : norm(rec.moneda) === 'gtq' ? 'GTQ' : norm(rec.moneda) === 'usd' ? 'USD' : '');
        rec.tipo = rec.monto < 0 ? 'cargo' : 'abono';
        rec.monto = Math.abs(rec.monto);
        rec.estado = 'pendiente_conciliacion';
        rec.requiereValidacion = true;
        rec.origen = 'estado-cuenta-banco';
        return rec;
      }
    },
    'financiero-historico': {
      coll: 'finmovs', label: 'Movimientos financieros históricos', dedup: [],
      fields: {
        fecha: ['fecha', 'date', 'dia', 'mes'], concepto: ['concepto', 'descripcion', 'detalle', 'glosa', 'rubro', 'referencia'],
        monto: ['monto', 'valor', 'importe', 'debito', 'credito', 'amount', 'saldo'],
        tipoMov: ['tipo', 'tipo movimiento', 'clase', 'naturaleza', 'ingreso egreso'],
        pais: ['pais', 'país', 'country'], categoria: ['categoria', 'rubro', 'cuenta']
      },
      /* P4 del paquete: histrico financiero GT/CO. Excluye filas no-movimiento
         (títulos, subtotales, totales, dashboards, presupuestos, producción),
         separa país/moneda (no mezcla), y trata saldo anterior como referencia.
         BLOQUEA (por SCOPE) creación de clientes/pólizas/cobros/cartera. */
      build(rec) {
        const c = norm(rec.concepto);
        if (!c || /^(total|subtotal|totales|gran total|total general|dashboard|presupuesto|produccion|resumen|encabezado|saldo final)/.test(c) || /dashboard|presupuesto|produccion/.test(c)) { rec._excluir = true; rec._motivo = 'título/subtotal/total/dashboard'; return rec; }
        const s = finmovShape(rec, rec.categoria || 'Histórico'); s.origen = 'financiero-historico'; s.historico = true;
        // P1-07: conceptos que parecen COBRO/RECAUDO de cliente NO son movimiento de caja de la empresa.
        // Se marcan requiere_validacion (deben ir a cobros/conciliación), salvo que sean egreso.
        if (s.tipo === 'ingreso' && /\b(pago cliente|recibo|poliza|póliza|prima|cuota|recaudo|abono)\b/.test(c)) {
          s.requiereValidacion = true; s.estado = 'requiere_validacion';
          s._motivoValidacion = 'concepto parece cobro/recaudo de cliente — clasificar en cobros/conciliación, no en caja';
        }
        Object.keys(rec).forEach(k => delete rec[k]); Object.assign(rec, s); return rec;
      }
    }
  };
  function mapHeaders(kind, headers) {
    const cfg = IMPORT_MAP[kind]; if (!cfg) return (state && state.manualMap) ? Object.assign({}, state.manualMap) : {};
    const nh = headers.map(norm), idx = {};
    Object.keys(cfg.fields).forEach(field => {
      const syns = cfg.fields[field].map(norm);
      let hi = nh.findIndex(h => syns.indexOf(h) >= 0);
      if (hi < 0) hi = nh.findIndex(h => h && syns.some(s => h.indexOf(s) >= 0 || s.indexOf(h) >= 0));
      if (hi >= 0) idx[field] = hi;
    });
    // overrides manuales del usuario (botón Iterar / mejorar)
    if (state && state.manualMap) Object.keys(state.manualMap).forEach(f => { const v = state.manualMap[f]; if (v < 0) delete idx[f]; else idx[f] = v; });
    return idx;
  }
  function impToast(msg) { const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
  /* Reporte de exclusiones/dry-run descargable (CSV) — trazabilidad de la importación. */
  function descargarReporte() {
    const kind = state.kind, dr = dryRun(kind);
    const cfg = IMPORT_MAP[kind] || {};
    const meta = KINDS[kind] || {};
    const estado = !dr ? 'sin_datos' : (dr.errores.length ? 'requiere_validacion' : 'listo');
    const lines = [];
    lines.push(['Reporte de importación · Orbit 360']);
    lines.push(['Tipo de fuente', meta.title || kind]);
    lines.push(['Archivo', state.files && state.files[0] || '—']);
    lines.push(['Alcance (crea/actualiza)', (SCOPE[kind] ? SCOPE[kind].label.join(' · ') : (cfg.coll || ''))]);
    lines.push(['Bloqueado (no crea)', (SCOPE[kind] ? SCOPE[kind].no.join(' · ') : '')]);
    lines.push(['Estado del archivo', estado]);
    if (state.hojas) {
      lines.push([]); lines.push(['Hojas procesadas', (state.hojas.procesadas || []).length]);
      (state.hojas.procesadas || []).forEach(h => lines.push(['  · ' + h.hoja, h.filas + ' filas · ' + h.pais + '/' + h.moneda + ' · ' + h.periodo]));
      lines.push(['Hojas excluidas', (state.hojas.excluidas || []).length]);
      (state.hojas.excluidas || []).forEach(h => lines.push(['  · ' + h.hoja, h.motivo]));
    }
    if (dr) {
      lines.push([]); lines.push(['Resumen', 'Cantidad']);
      lines.push(['Crear nuevos', dr.crear]); lines.push(['Actualizar', dr.actualizar]); lines.push(['Omitir/excluir', dr.omitir]); lines.push(['Total filas', dr.total]);
      lines.push([]); lines.push(['Fila', 'Motivo de exclusión / aviso']);
      (dr.errores || []).forEach(e => lines.push([e.fila, e.motivo]));
    }
    const csv = lines.map(r => r.map(c => { const s = String(c == null ? '' : c); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'reporte-import-' + kind + '-' + (Orbit.ui.today ? Orbit.ui.today() : 'hoy') + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    impToast('⬇ Reporte de importación descargado');
  }
  function renderRemap() {
    const dr = document.getElementById('imp-drawer'); const kind = state.kind, cfg = IMPORT_MAP[kind];
    const headers = state.parsed ? state.parsed.headers : [];
    const cur = mapHeaders(kind, headers);
    const fields = cfg ? Object.keys(cfg.fields) : [];
    const body = dr.querySelector('.imp-body');
    if (!cfg || !headers.length) { impToast('Carga un archivo primero para ajustar el mapeo'); return; }
    body.innerHTML = `<div class="imp-note" style="margin-top:0">🔧 Ajustá el mapeo: conectá cada campo de Orbit con una columna de tu archivo. Lo que no se reconoció automáticamente, asignalo acá.</div>
      <div class="card" style="overflow:hidden;margin-top:12px"><table class="tbl"><thead><tr><th>Campo de Orbit 360</th><th>Columna de tu archivo</th></tr></thead><tbody>
      ${fields.map(f => `<tr><td><b>${U.esc(FIELD_LABEL[f] || f)}</b></td><td><select class="o-sel" data-remap="${f}" style="width:100%"><option value="-1">— (ignorar) —</option>${headers.map((h, i) => `<option value="${i}" ${cur[f] === i ? 'selected' : ''}>${U.esc(h || ('Columna ' + (i + 1)))}</option>`).join('')}</select></td></tr>`).join('')}
      </tbody></table></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn ghost" id="rm-cancel">Volver</button><button class="btn primary" id="rm-apply">Aplicar mapeo →</button></div>`;
    body.querySelector('#rm-cancel').addEventListener('click', () => paint());
    body.querySelector('#rm-apply').addEventListener('click', () => {
      state.manualMap = state.manualMap || {};
      body.querySelectorAll('[data-remap]').forEach(sel => { state.manualMap[sel.dataset.remap] = +sel.value; });
      state.iterado = (state.iterado || 1) + 1; paint(); impToast('🔧 Mapeo actualizado con tus ajustes');
    });
  }
  function realPreview(kind) {
    const p = state.parsed, idx = mapHeaders(kind, p.headers), fields = Object.keys(idx);
    if (fields.length) return { cols: fields.map(f => FIELD_LABEL[f] || f), rows: p.rows.slice(0, 8).map(c => fields.map(f => (c[idx[f]] || '—'))), total: p.rows.length, mapped: fields.length, totalCols: p.headers.length };
    // sin columnas reconocidas: mostrar lo realmente extraído (crudo), nunca datos de ejemplo
    const cols = p.headers.length ? p.headers : ['Contenido extraído'];
    const rows = (p.rows.length ? p.rows.slice(0, 8) : [['(no se detectó estructura tabular en el archivo)']]);
    return { cols, rows, total: p.rows.length, mapped: 0, totalCols: p.headers.length, raw: true };
  }
  function applyImport(kind) {
    const cfg = IMPORT_MAP[kind]; if (!cfg || !state.parsed) return { created: 0, updated: 0 };
    // P0-04/P1-03: 'documentos' NUNCA modifica clientes directo. Genera un PARCHE PENDIENTE con diff.
    if (kind === 'documentos' || cfg.docPatch) {
      if (!(state.scope && state.scope.cid)) {
        impToast('📎 Documento(s) recibido(s). No se crearon ni modificaron clientes: abrí el expediente del cliente para proponer cambios.');
        return { created: 0, updated: 0, blocked: true };
      }
      const idxD = mapHeaders(kind, state.parsed.headers);
      const cells = state.parsed.rows[0] || [];
      const rec = {}; Object.keys(idxD).forEach(f => { const v = cells[idxD[f]]; if (v != null && v !== '') rec[f] = v; }); copyRowMeta(cells, rec);
      const cli = Orbit.store.get('clientes', state.scope.cid) || {};
      // Diff: solo campos que difieren del expediente actual
      const diff = {};
      Object.keys(rec).forEach(k => { if (k.charAt(0) === '_') return; const nuevo = String(rec[k] || '').trim(); const actual = String(cli[k] || '').trim(); if (nuevo && nuevo !== actual) diff[k] = { actual: actual || '(vacío)', propuesto: nuevo }; });
      if (!Object.keys(diff).length) { impToast('📎 Documento adjuntado. Sin cambios propuestos al expediente.'); return { created: 0, updated: 0 }; }
      const pid = 'patch_' + Date.now().toString(36);
      Orbit.store.insert('parchesPendientes', { id: pid, clienteId: state.scope.cid, origen: 'documento', archivo: (state.files && state.files[0]) || '', diff: diff, estado: 'pendiente', creado: (Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10)) });
      impToast('📎 Documento adjuntado · ' + Object.keys(diff).length + ' cambio(s) propuesto(s) al expediente, pendientes de confirmación.');
      return { created: 1, updated: 0, patch: true };
    }
    // Guarda de alcance: una fuente NUNCA escribe fuera de su colección declarada (Prioridad 2).
    if (!scopeGuard(kind, cfg.coll)) { impToast('⛔ Bloqueado por alcance: esta fuente no puede crear ' + cfg.coll); return { created: 0, updated: 0 }; }
    const idx = mapHeaders(kind, state.parsed.headers); if (!Object.keys(idx).length) return { created: 0, updated: 0 };
    // Modo expediente: completar el cliente abierto (no crear uno nuevo)
    if (cfg.scopedUpdate && state.scope && state.scope.cid) {
      const cells = state.parsed.rows[0] || [];
      const rec = {}; Object.keys(idx).forEach(f => { const v = cells[idx[f]]; if (v != null && v !== '') rec[f] = v; }); copyRowMeta(cells, rec);
      if (cfg.build) cfg.build(rec);
      if (Object.keys(rec).length) { Orbit.store.update(cfg.coll, state.scope.cid, rec); return { created: 0, updated: 1 }; }
      return { created: 0, updated: 0 };
    }
    let created = 0, updated = 0;
    state.parsed.rows.forEach((cells, ri) => {
      const rec = {}; Object.keys(idx).forEach(f => { const v = cells[idx[f]]; if (v != null && v !== '') rec[f] = v; }); copyRowMeta(cells, rec);
      if (!Object.keys(rec).length) return;
      if (cfg.build) cfg.build(rec);
      if (rec._excluir) return; // fila excluida por regla de la fuente (título/subtotal/total)
      let existing = null;
      for (let j = 0; j < (cfg.dedup || []).length; j++) { const k = cfg.dedup[j]; if (rec[k]) { existing = Orbit.store.all(cfg.coll).find(r => norm(r[k]) === norm(rec[k])); if (existing) break; } }
      if (existing) { Orbit.store.update(cfg.coll, existing.id, rec); updated++; }
      else {
        rec.id = cfg.coll.slice(0, 3) + '_imp_' + Date.now().toString(36) + ri; rec.importado = true;
        if (state.scope && state.scope.cid && !rec.clienteId) rec.clienteId = state.scope.cid;
        Orbit.store.insert(cfg.coll, rec);
        if (cfg.afterInsert) { try { cfg.afterInsert(rec); } catch (e) {} }
        // registrar actividad viva (aparece en Historial y en la ficha del cliente)
        try {
          if (cfg.coll === 'clientes') Orbit.store.insert('actividades', { id: 'act_imp_' + rec.id, clienteId: rec.id, asesorId: rec.asesorId || '', tipo: 'sistema', icon: '📥', fecha: new Date().toISOString().slice(0, 10), titulo: 'Cliente importado: ' + (rec.nombre || ''), detalle: 'Alta por importación inteligente.' });
          else if (cfg.coll === 'polizas' && rec.clienteId) Orbit.store.insert('actividades', { id: 'act_imp_' + rec.id, clienteId: rec.clienteId, asesorId: rec.asesorId || '', tipo: 'sistema', icon: '📑', fecha: new Date().toISOString().slice(0, 10), titulo: 'Póliza importada: ' + (rec.numero || ''), detalle: (rec.ramo || '') + ' · ' + (rec.estado || 'Vigente') });
          else if (cfg.coll === 'reclamos' && rec.clienteId) Orbit.store.insert('actividades', { id: 'act_imp_' + rec.id, clienteId: rec.clienteId, asesorId: rec.asesorId || '', tipo: 'sistema', icon: '🚨', fecha: new Date().toISOString().slice(0, 10), titulo: 'Siniestro importado: ' + (rec.numero || ''), detalle: (rec.tipo || '') + ' · ' + (rec.estado || '') });
        } catch (e) {}
        created++;
      }
    });
    return { created, updated };
  }

  // P0-01: copia la trazabilidad de hoja/fila (propiedades puestas en el array de celdas) al rec.
  var ROW_META = ['_origenHoja', '_paisHoja', '_monedaHoja', '_monedaSugeridaHoja', '_periodoHoja', '_bloqueOrigen', '_numeroFila'];
  function copyRowMeta(cells, rec) { if (!cells) return rec; ROW_META.forEach(function (k) { if (cells[k] != null) rec[k] = cells[k]; }); return rec; }

  /* Simulación pre-escritura (dry-run): calcula crear/actualizar/omitir + errores por fila
     SIN tocar el store. Para el resumen de confirmación del importador. */
  function dryRun(kind) {
    const cfg = IMPORT_MAP[kind]; if (!cfg || !state.parsed) return null;
    const idx = mapHeaders(kind, state.parsed.headers); if (!Object.keys(idx).length) return null;
    let crear = 0, actualizar = 0, omitir = 0; const errores = []; const dupKeys = {};
    (state.parsed.rows || []).forEach((cells, ri) => {
      const rec = {}; Object.keys(idx).forEach(f => { const v = cells[idx[f]]; if (v != null && v !== '') rec[f] = v; }); copyRowMeta(cells, rec);
      if (!Object.keys(rec).length) { omitir++; return; }
      if (cfg.build) { try { cfg.build(rec); } catch (e) {} }
      if (rec._excluir) { omitir++; errores.push({ fila: ri + 2, motivo: 'excluida: ' + (rec._motivo || 'título/subtotal/total') }); return; }
      // validación mínima: al menos una clave de dedup o campo requerido
      const claveDedup = (cfg.dedup || []).find(k => rec[k]);
      if ((cfg.required || cfg.dedup || []).length && !claveDedup && !(cfg.required || []).some(k => rec[k])) {
        errores.push({ fila: ri + 2, motivo: 'faltan campos clave (' + (cfg.dedup || cfg.required || []).join('/') + ')' }); omitir++; return;
      }
      // dedup dentro del store + dentro del propio archivo
      let existing = null;
      for (let j = 0; j < (cfg.dedup || []).length; j++) { const k = cfg.dedup[j]; if (rec[k]) { existing = Orbit.store.all(cfg.coll).find(r => norm(r[k]) === norm(rec[k])); if (existing) break; } }
      const fileKey = claveDedup ? norm(rec[claveDedup]) : null;
      if (fileKey && dupKeys[fileKey]) { omitir++; errores.push({ fila: ri + 2, motivo: 'duplicado dentro del archivo (' + rec[claveDedup] + ')' }); return; }
      if (fileKey) dupKeys[fileKey] = 1;
      if (existing) actualizar++; else crear++;
    });
    return { crear, actualizar, omitir, errores, total: (state.parsed.rows || []).length, coll: cfg.coll };
  }

  function conciliarRows(kind) {
    const cfg = IMPORT_MAP[kind]; if (!cfg || !state.parsed) return { rows: [], noCreados: [], noAplicados: [] };
    const idx = mapHeaders(kind, state.parsed.headers);
    const rows = state.parsed.rows.map(cells => { const rec = {}; Object.keys(idx).forEach(f => { const v = cells[idx[f]]; if (v != null && v !== '') rec[f] = v; }); copyRowMeta(cells, rec); if (cfg.build) cfg.build(rec); return rec; }).filter(r => Object.keys(r).length);
    const noCreados = [], noAplicados = [];
    rows.forEach(r => {
      if (kind === 'estados-cuenta') {
        if (!r.polizaId) { r._motivo = 'Póliza no existe en Orbit'; noCreados.push(r); return; }
        const existing = Orbit.store.where('cobros', c => c.polizaId === r.polizaId && Math.abs((c.monto || 0) - (r.monto || 0)) < 1);
        if (!existing.length) { r._motivo = 'Recibo no creado'; noCreados.push(r); }
        else if (r.estado === 'Pagado') { const pend = existing.find(c => c.estado !== 'Pagado'); if (pend) { r._aplicaA = pend.id; r._motivo = 'Pago en estado de cuenta, sin aplicar'; noAplicados.push(r); } }
      } else if (kind === 'estados-banco') {
        const existing = Orbit.store.where('finmovs', m => Math.abs((m.monto || 0) - (r.monto || 0)) < 1 && (m.fecha === r.fecha));
        if (!existing.length) { r._motivo = 'Depósito sin movimiento en Orbit'; noCreados.push(r); }
      }
    });
    return { rows, noCreados, noAplicados };
  }
  function applyConciliacion(kind) {
    const { noCreados, noAplicados } = conciliarRows(kind);
    let creados = 0, propuestas = 0;
    // Registros que faltan: se crean como referencia importada (no aplican pagos).
    noCreados.forEach((r, i) => { const rec = Object.assign({}, r); delete rec._motivo; delete rec._aplicaA; rec.id = (IMPORT_MAP[kind].coll).slice(0, 3) + '_cc_' + Date.now().toString(36) + i; rec.importado = true; Orbit.store.insert(IMPORT_MAP[kind].coll, rec); creados++; });
    // P0-2: la conciliación NO aplica pagos directo. Marca PROPUESTA pendiente de validación sobre el recibo.
    noAplicados.forEach(r => {
      if (r._aplicaA) {
        const cob = Orbit.store.get('cobros', r._aplicaA);
        if (cob) { Orbit.store.update('cobros', r._aplicaA, { conciliacionPropuesta: { fuente: kind, monto: r.monto, fecha: r.vence || (Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10)), estado: 'REQUIERE_VALIDACION' } }); propuestas++; }
      }
    });
    return { creados, propuestas };
  }

  // Catálogo de secciones de importación (todas las requeridas)
  const KINDS = {
    'base-inicial': { icon: '🗄', title: 'Base de datos inicial', desc: 'Carga completa para arrancar la plataforma (clientes, pólizas, cobros, comisiones).', cols: ['Entidad', 'Registros', 'Estado'], sample: [['Clientes', '142', 'Listo'], ['Pólizas', '388', 'Listo'], ['Cobros', '1 920', 'Listo'], ['Comisiones', '1 510', 'Listo']] },
    'clientes': { icon: '🧑‍💼', title: 'Importar clientes', desc: 'Detecta personas y empresas, identificación, contacto y asesor.', cols: ['Nombre', 'Tipo', 'Identificación', 'Asesor'], sample: [['Sofía Castellanos', 'Persona', '2547 88012 4', 'D. Marroquín'], ['Distribuidora Andina S.A.', 'Empresa', '901456789', 'L. Herrera'], ['Roberto Quezada', 'Persona', '1102 33456 7', 'M. Villatoro']] },
    'polizas': { icon: '📑', title: 'Importar pólizas', desc: 'Extrae número, ramo, producto, aseguradora, vigencia y prima.', cols: ['Póliza', 'Ramo', 'Aseguradora', 'Prima'], sample: [['GT-AT-48210', 'Auto', 'Seguros Atlas', 'Q 8,400'], ['CO-PA-91733', 'Hogar', 'Pacífico Seguros', '$ 1,2M'], ['GT-VE-22041', 'Gastos Médicos', 'Vértice', 'Q 14,900']] },
    'vehiculos': { icon: '🚗', title: 'Importar vehículos', desc: 'Asocia vehículos a clientes y pólizas de auto (placa, marca, modelo, año).', cols: ['Placa', 'Vehículo', 'Año', 'Cliente'], sample: [['P-482GTR', 'Toyota Hilux', '2023', 'R. Quezada'], ['CO-ABC12', 'Mazda CX-5', '2022', 'C. Rojas'], ['P-901XYZ', 'Hyundai Tucson', '2024', 'J. Pineda']] },
    'directorio-aseguradoras': { icon: '🏢', title: 'Importar directorio de aseguradoras', desc: 'Contactos, ramos, accesos. Se fusiona con la info del Cotizador.', cols: ['Aseguradora', 'Ramos', 'Contacto'], sample: [['Seguros Atlas', 'Auto, Vida, GM', 'mesa@atlas.com'], ['Pacífico Seguros', 'Auto, Hogar, RC', 'corredores@pacifico.co'], ['Vértice Seguros', 'Auto, GM, Hogar', 'soporte@vertice.gt']] },
    'estados-cuenta': { icon: '🧾', title: 'Importar estados de cuenta', desc: 'Lee el estado de cartera que envía cada aseguradora en CUALQUIER formato (PDF, Excel, imagen). Despliega recibos según forma de pago, detecta recibos no creados y pagos aún no aplicados, y permite aplicar pagos por póliza.', cols: ['Recibo', 'Póliza', 'Forma pago', 'Monto'], sample: [['REC-00451', 'GT-AT-48210', 'Mensual', 'Q 700'], ['REC-00452', 'GT-AT-48210', 'Mensual', 'Q 700'], ['REC-01188', 'CO-PA-91733', 'Trimestral', '$ 300K']], conciliacion: true, detect: { noCreados: [['ATL-99820', 'GT-AT-77310', 'No existe en Orbit', 'Q 1,150'], ['ATL-99821', 'GT-AT-48210', 'Cuota 7/12 faltante', 'Q 700']], noAplicados: [['REC-00451', 'GT-AT-48210', 'Pagado en banco, sin aplicar', 'Q 700'], ['REC-01044', 'CO-PA-91733', 'Transferencia 12-jun', '$ 300K']] } },
    'planillas-comision': { icon: '💼', title: 'Importar planillas de comisiones', desc: 'Lee la planilla de comisiones que envía la aseguradora en CUALQUIER formato y la cruza contra las comisiones devengadas: detecta pagos no aplicados a póliza y valida que la liquidación de cada asesor sea la correcta.', cols: ['Aseguradora', 'Periodo', 'Comisión', 'Cruce'], sample: [['Seguros Atlas', '2026-05', 'Q 12,400', '✓ concilia'], ['Pacífico Seguros', '2026-05', '$ 3,1M', '◷ revisar'], ['Vértice', '2026-05', 'Q 6,900', '✓ concilia']], detect: { noCreados: [['Atlas · GT-AT-77310', 'Póliza no creada en Orbit', 'Comisión huérfana', 'Q 410']], noAplicados: [['Pacífico · CO-PA-91733', 'Comisión cobrada, pago no aplicado', 'Recaudo sin conciliar', '$ 92K'], ['Atlas · GT-AT-48210', 'Liquidación asesor difiere 2%', 'Ajuste de % asesor', 'Q 58']] } },
    'movimientos-finanzas': { icon: '💰', title: 'Importar movimientos / estados de cuenta (Finanzas)', desc: 'Histórico de movimientos reales de caja/banco de la empresa para generar mensuales y conciliar. Los pagos de clientes NO van aquí: se importan como recibos/cobros y se concilian aparte.', cols: ['Fecha', 'Concepto', 'Monto', 'Tipo'], sample: [['2026-05-31', 'Liquidación Atlas', 'Q 12,400', 'Ingreso'], ['2026-05-28', 'Comisión asesor DM', 'Q -3,100', 'Egreso'], ['2026-05-15', 'Pago de renta oficina', 'Q -2,800', 'Egreso']] },
    'financiero-historico': { icon: '📚', title: 'Importar histórico financiero (GT/CO)', desc: 'Carga los movimientos financieros históricos por país y mes. Excluye títulos, subtotales, totales y dashboards; separa GTQ/COP sin mezclar; trata “saldo anterior” como referencia. No crea clientes, pólizas ni cartera.', cols: ['Fecha', 'Concepto', 'Monto', 'Tipo'], sample: [['2025-11', 'Saldo anterior', '—', 'Referencia'], ['2026-01-15', 'Comisión aseguradora', 'Q 8,200', 'Ingreso'], ['2026-01-20', 'Nómina', 'Q -4,100', 'Egreso']] },
    'estados-banco': { icon: '🏦', title: 'Importar estado de cuenta bancario', desc: 'Se carga para conciliación bancaria. No crea cobros ni movimientos financieros hasta que se valide: cada línea queda en la bandeja de conciliación para cruzarla con recaudos y egresos.', cols: ['Fecha', 'Descripción', 'Monto', 'Conciliación'], sample: [['2026-05-31', 'Depósito Atlas', 'Q 12,400', '◷ por conciliar'], ['2026-05-15', 'Transf. cliente', 'Q 700', '◷ por conciliar'], ['2026-05-12', 'Comisión NETxxx', 'Q 4,210', '◷ por conciliar']] },
    'calendario-marketing': { icon: '📣', title: 'Importar calendarización de contenidos', desc: 'Carga el calendario; se muestra como mes con cada día y sus piezas.', cols: ['Fecha', 'Contenido', 'Pieza', 'Canal'], sample: [['2026-06-03', 'Tip de renovación', 'Reel', 'Instagram'], ['2026-06-10', 'Beneficio Vida', 'Carrusel', 'Facebook'], ['2026-06-18', 'Caso de éxito', 'Post', 'LinkedIn']] },
    'facturas': { icon: '🧾', title: 'Importar facturas', desc: 'Adjunta facturas al expediente; se extraen número, fecha, monto y se vinculan a la póliza.', cols: ['Factura', 'Fecha', 'Monto', 'Póliza'], sample: [['FAC-2041', '2026-05-12', 'Q 8,400', 'GT-AT-48210'], ['FAC-2042', '2026-05-30', 'Q 700', 'GT-AT-48210']] },
    'documentos': { icon: '📎', title: 'Importar documentos', desc: 'Carga documentos del expediente. El sistema extrae posibles datos y propone cambios para revisión/aprobación; no modifica clientes ni pólizas directamente.', cols: ['Documento', 'Tipo detectado', 'Dato extraído'], sample: [['dpi_frente.jpg', 'DPI', 'Dirección, fecha nac.'], ['rtu_2026.pdf', 'RTU', 'Razón social, NIT'], ['poliza_auto.pdf', 'Póliza', 'Vehículo, vigencia']] },
    'bitacora-reclamos': { icon: '🚨', title: 'Importar bitácora de siniestros', desc: 'Carga la bitácora de reclamos que envía la aseguradora (uno o varios clientes). Cada reclamo se vincula a su póliza y queda en la ficha del cliente correspondiente.', cols: ['Siniestro', 'Póliza', 'Tipo', 'Estado'], sample: [['SIN-48210', 'GT-AT-48210', 'Colisión', 'En análisis'], ['SIN-77310', 'GT-AT-77310', 'Robo parcial', 'Aprobado'], ['SIN-91733', 'CO-PA-91733', 'Daños a terceros', 'Documentación']] },
    'docs-aseguradora': { icon: '🏢', title: 'Importar documentos de aseguradora', desc: 'Carga tarifas, formularios, cotizaciones y pólizas de ejemplo. En modo inteligente, alimenta el Cotizador, el Comparativo y la IA; en modo documental, solo se almacenan para consulta.', cols: ['Documento', 'Categoría detectada', 'Uso'], sample: [['tarifario_2026.pdf', 'Tarifas', 'Cotizador / Comparativo'], ['formulario_auto.pdf', 'Formularios', 'Requisitos de emisión'], ['cotizacion_ejemplo.pdf', 'Cotización ejemplo', 'Entrenar IA']] }
  };

  let state = null;

  /* ALCANCE POR FUENTE (Prioridad 1–2 del paquete): qué puede crear cada tipo de
     fuente y qué queda BLOQUEADO. Se muestra al usuario y se aplica como guarda
     defensiva en applyImport (una fuente nunca escribe fuera de su alcance). */
  const SCOPE = {
    'clientes': { crea: ['clientes'], label: ['Clientes'], no: ['Pólizas', 'Cobros / cartera', 'Finanzas'] },
    'polizas': { crea: ['polizas', 'cobros'], label: ['Pólizas', 'Recibos SOLO si vigente/por renovar con forma de pago'], no: ['Clientes nuevos por inferencia', 'Cartera de pólizas canceladas/vencidas'] },
    'vehiculos': { crea: ['vehiculos'], label: ['Vehículos'], no: ['Clientes', 'Pólizas'] },
    'estados-cuenta': { crea: ['cobros'], label: ['Recibos / cobros + conciliación'], no: ['Pólizas', 'Clientes'] },
    'planillas-comision': { crea: ['comisiones'], label: ['Comisiones + conciliación'], no: ['Clientes', 'Pólizas', 'Cobros'] },
    'estados-banco': { crea: ['conciliacionBanco'], label: ['Conciliación bancaria (bandeja de validación)'], no: ['Movimientos financieros', 'Cobros', 'Clientes', 'Pólizas', 'Cartera'] },
    'movimientos-finanzas': { crea: ['finmovs'], label: ['Movimientos financieros (histórico)'], no: ['Clientes', 'Pólizas', 'Cobros', 'Cartera'] },
    'financiero-historico': { crea: ['finmovs'], label: ['Movimientos financieros históricos GT/CO (referencia/conciliación)'], no: ['Clientes', 'Pólizas', 'Cobros', 'Cartera', 'Producción real'] },
    'bitacora-reclamos': { crea: ['reclamos'], label: ['Siniestros / reclamos'], no: ['Clientes', 'Pólizas'] },
    'directorio-aseguradoras': { crea: ['aseguradoras'], label: ['Aseguradoras'], no: ['Clientes', 'Pólizas'] },
    'facturas': { crea: ['facturas'], label: ['Facturas'], no: ['Clientes', 'Pólizas', 'Cobros'] },
    'documentos': { crea: ['parchesPendientes'], label: ['Propuestas de actualización del expediente (pendientes de aprobación)'], no: ['Clientes directos', 'Pólizas directas', 'Cobros'] },
    'calendario-marketing': { crea: ['contenidos'], label: ['Contenidos de marketing'], no: ['Datos operativos'] },
    'docs-aseguradora': { crea: [], label: ['Documentos de aseguradora (solo almacenamiento)'], no: ['Clientes', 'Pólizas', 'Cobros', 'Tarifas sin validar'] }
  };
  function scopeBanner(kind) {
    const s = SCOPE[kind]; if (!s) return '';
    return `<div class="card" style="border:1px solid var(--line);border-left:4px solid var(--info,#2A6FDB);padding:11px 13px;margin-bottom:12px;background:var(--surface)">
      <div style="font-family:var(--f-display);font-weight:800;font-size:12.5px;margin-bottom:4px">🔒 Alcance de esta fuente</div>
      <div style="font-size:12.5px;line-height:1.5"><b style="color:var(--ok,#1F8A5B)">Crea / actualiza:</b> ${s.label.map(U.esc).join(' · ')}</div>
      <div style="font-size:12.5px;line-height:1.5;margin-top:2px"><b style="color:var(--danger,#C5162E)">No crea (bloqueado):</b> ${s.no.map(U.esc).join(' · ')}</div>
    </div>`;
  }
  function scopeGuard(kind, coll) {
    const s = SCOPE[kind]; if (!s || !s.crea) return true; // sin regla declarada: permitir (comportamiento previo)
    return s.crea.indexOf(coll) >= 0;
  }

  function ensureDom() {
    // robusto: recrear si falta CUALQUIERA de los dos (evita estado a medias)
    if (document.getElementById('imp-back') && document.getElementById('imp-drawer')) return;
    const stb = document.getElementById('imp-back'); if (stb) stb.remove();
    const std = document.getElementById('imp-drawer'); if (std) std.remove();
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
    // docs-aseguradora es documental (guarda archivos; no escribe registros estructurados a ciegas) — P0-06.
    const modoIni = (kind === 'docs-aseguradora') ? 'documental' : ((opts && opts.modo) || 'inteligente');
    state = { kind, meta, step: 1, opts: opts || {}, multi: opts && opts.multi, scope: opts && opts.scope, modo: modoIni, files: [] };
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
    if (state.processing) return `<div style="text-align:center;padding:48px 16px"><div class="imp-spinner"></div><div style="font-family:var(--f-display);font-weight:700;font-size:16px;margin-top:16px">${U.esc(state.processing)}</div><p class="muted" style="font-size:13px;margin-top:6px">Procesando <b>${U.esc(state.files[0] || '')}</b> en tu navegador…</p></div>`;
    return `${scopeBanner(state.kind)}<p class="imp-desc">${U.esc(m.desc)}</p>
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
    // Base de datos inicial: si aún no se resolvió a una entidad real, hacerlo aquí (nunca mostrar la tabla de ejemplo)
    if (state.kind === 'base-inicial' && state.parsed && state.parsed.headers && state.parsed.headers.length) {
      let best = 'clientes', score = -1;['clientes', 'polizas', 'vehiculos', 'movimientos-finanzas', 'estados-cuenta'].forEach(k => { const n = Object.keys(mapHeaders(k, state.parsed.headers)).length; if (n > score) { score = n; best = k; } });
      state.kind = best; state.meta = KINDS[best] || state.meta; m = state.meta;
    }
    const scopeNote = state.scope ? `<div class="imp-note" style="margin-top:0;margin-bottom:12px">🔗 Se vinculará a <b>${U.esc(state.scope.nombre)}</b>.</div>` : '';
    const scopeB = scopeBanner(state.kind);
    const assoc = state.kind === 'vehiculos' ? `<div class="card pad" style="margin-top:12px"><b style="font-family:var(--f-display);font-size:13px">Asociar a</b>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:9px">
        <label class="ce-l">Cliente<select class="o-sel" style="width:100%">${Orbit.store.all('clientes').slice(0, 8).map(c => `<option ${state.scope && state.scope.cid === c.id ? 'selected' : ''}>${U.esc(c.nombre)}</option>`).join('')}</select></label>
        <label class="ce-l">Póliza de auto<select class="o-sel" style="width:100%">${Orbit.store.where('polizas', p => p.ramo === 'Auto').slice(0, 8).map(p => `<option>${p.numero}</option>`).join('') || '<option>—</option>'}</select></label>
      </div></div>` : '';
    const real = (state.parsed && IMPORT_MAP[state.kind]) ? realPreview(state.kind) : null;
    const cols = real ? real.cols : m.cols;
    const sample = real ? real.rows : m.sample;
    const nReg = real ? real.total : (m.sample.length + '+');
    // Conciliación: computar desde datos REALES si hay archivo; si no, mostrar ejemplo
    const det = (m.conciliacion || state.kind === 'estados-banco') ? (state.parsed ? conciliarRows(state.kind) : null) : null;
    const detData = det ? { noCreados: det.noCreados.map(r => [r.numeroRecibo || r.concepto || '—', r.polizaNumero || (r.polizaId ? (Orbit.store.get('polizas', r.polizaId) || {}).numero : '') || '—', r._motivo || '', U.money ? U.money(r.monto || 0, r.moneda || 'GTQ') : (r.monto || 0)]), noAplicados: det.noAplicados.map(r => [r.numeroRecibo || '—', (Orbit.store.get('polizas', r.polizaId) || {}).numero || '—', r._motivo || '', U.money ? U.money(r.monto || 0, r.moneda || 'GTQ') : (r.monto || 0)]) } : (m.detect || null);
    const isAI = state.parsed && state.parsed.ai;
    const mapNote = real ? ('<div class="imp-note" style="margin-top:0;margin-bottom:10px">' + (isAI
      ? ('🧠 <b>Extracción inteligente (IA):</b> leí el documento y estructuré <b>' + real.total + ' registros</b> de <b>' + U.esc(state.files[0] || 'tu archivo') + '</b> detectando los campos automáticamente.')
      : ('🧠 Leí <b>' + real.total + ' registros</b> de <b>' + U.esc(state.files[0] || 'tu archivo') + '</b> y mapeé <b>' + real.mapped + '/' + real.totalCols + ' columnas</b> a Orbit 360.' + (real.mapped === 0 ? ' <b>No reconocí columnas</b> — usá <b>🔄 Iterar / mejorar</b> para asignarlas a mano, o modo documental.' : (real.mapped < real.totalCols ? ' Las columnas no reconocidas se ignoran.' : '')))
    ) + '</div>') : (state.parsed && !IMPORT_MAP[state.kind] ? `<div class="imp-note" style="margin-top:0;margin-bottom:10px">📄 Archivo recibido. El motor procesará este tipo de documento y mapeará sus datos; abajo se muestra un ejemplo del mapeo.</div>` : '');
    // Resumen pre-escritura (dry-run): crear / actualizar / omitir + errores por fila
    const dr = (real && real.mapped > 0 && !det) ? dryRun(state.kind) : null;
    const drCard = dr ? `<div class="card" style="overflow:hidden;margin:12px 0;border:1px solid var(--line)">
      <div style="padding:9px 13px;background:var(--soft,#f5f5f5);font-family:var(--f-display);font-weight:700;font-size:13px">🔎 Resumen antes de guardar · ${dr.coll}</div>
      <div style="display:flex;gap:0;text-align:center">
        <div style="flex:1;padding:12px 6px;border-right:1px solid var(--line)"><div style="font-family:var(--f-display);font-size:22px;font-weight:800;color:var(--ok,#1F8A5B)">${dr.crear}</div><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em">Crear nuevos</div></div>
        <div style="flex:1;padding:12px 6px;border-right:1px solid var(--line)"><div style="font-family:var(--f-display);font-size:22px;font-weight:800;color:var(--info,#2A6FDB)">${dr.actualizar}</div><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em">Actualizar</div></div>
        <div style="flex:1;padding:12px 6px"><div style="font-family:var(--f-display);font-size:22px;font-weight:800;color:var(--muted,#888)">${dr.omitir}</div><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em">Omitir</div></div>
      </div>
      ${dr.errores.length ? `<div style="padding:9px 13px;border-top:1px solid var(--line);background:rgba(197,22,46,.05)"><b style="font-size:12px;color:var(--danger,#C5162E)">⚠ ${dr.errores.length} fila(s) con avisos:</b><div style="max-height:120px;overflow:auto;margin-top:5px">${dr.errores.slice(0, 12).map(e => `<div style="font-size:11.5px;color:var(--ink-2)">Fila ${e.fila}: ${U.esc(e.motivo)}</div>`).join('')}${dr.errores.length > 12 ? `<div class="muted" style="font-size:11px">…y ${dr.errores.length - 12} más</div>` : ''}</div></div>` : '<div style="padding:8px 13px;border-top:1px solid var(--line);font-size:12px;color:var(--ok,#1F8A5B)">✓ Sin errores de formato. La dedup evita duplicados (actualiza en vez de duplicar).</div>'}
    </div>` : '';
    return `${scopeB}${scopeNote}${mapNote}<p class="imp-desc">Detectamos y mapeamos estos registros. Revisa antes de confirmar.</p>
      <div class="imp-scan"><span class="imp-spark">🧠</span> Extracción ${state.iterado ? 'refinada (' + state.iterado + 'ª pasada)' : 'completada'} · <b>${nReg} registros</b> reconocidos · 0 errores de formato.<button class="btn ghost sm" id="imp-reporte" style="margin-left:auto">⬇ Reporte</button><button class="btn ghost sm" id="imp-iterar">🔄 Iterar / mejorar</button></div>
      ${state.hojas ? `<div class="cfg-note" style="margin-top:10px">📑 <b>${(state.hojas.procesadas || []).length}</b> hoja(s) procesada(s)${(state.hojas.procesadas || []).length ? ' · ' + state.hojas.procesadas.map(h => U.esc(h.hoja) + ' (' + h.filas + ' filas' + (h.pais !== '—' ? ', ' + h.pais + '/' + h.moneda : '') + (h.periodo !== '—' ? ', ' + h.periodo : '') + ')').join(' · ') : ''}${(state.hojas.excluidas || []).length ? `<br>🚫 <b>${state.hojas.excluidas.length}</b> hoja(s) excluida(s): ` + state.hojas.excluidas.map(h => U.esc(h.hoja) + ' — ' + U.esc(h.motivo)).join(' · ') : ''}</div>` : ''}
      ${drCard}
      <div class="card" style="overflow:hidden;margin-top:12px"><div style="overflow-x:auto"><table class="tbl" style="min-width:max-content"><thead><tr>${cols.map(c => `<th style="white-space:nowrap">${U.esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${sample.map(row => `<tr>${row.map((cell, i) => `<td${i === 0 ? ' style="font-weight:600"' : ''}>${U.esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
      ${assoc}
      ${detData ? `
        <div class="imp-detect">
          <div class="imp-det-card warn">
            <div class="idc-h"><span>🧩</span> ${state.kind === 'estados-banco' ? 'Depósitos sin movimiento' : 'Recibos no creados'} <b>${detData.noCreados.length}</b></div>
            <div class="idc-sub">${det ? 'Detectados en tu archivo y ausentes en Orbit. Se crearán al confirmar.' : 'Ejemplo del cruce. Carga un archivo para ver la detección real.'}</div>
            ${detData.noCreados.length ? `<table class="tbl" style="margin-top:8px"><tbody>${detData.noCreados.map(r => `<tr><td class="mono" style="font-size:12px">${U.esc(r[0])}</td><td class="mono" style="font-size:12px">${U.esc(r[1])}</td><td style="font-size:12px">${U.esc(r[2])}</td><td class="num">${U.esc(r[3])}</td></tr>`).join('')}</tbody></table>` : '<div class="muted" style="font-size:12px;margin-top:6px">Todo cuadra — nada por crear.</div>'}
          </div>
          <div class="imp-det-card info">
            <div class="idc-h"><span>💸</span> Pagos no aplicados <b>${detData.noAplicados.length}</b></div>
            <div class="idc-sub">${det ? 'Pagos del archivo aún no aplicados a su póliza. Se aplicarán sin duplicar.' : 'Ejemplo del cruce. Carga un archivo para ver la detección real.'}</div>
            ${detData.noAplicados.length ? `<table class="tbl" style="margin-top:8px"><tbody>${detData.noAplicados.map(r => `<tr><td class="mono" style="font-size:12px">${U.esc(r[0])}</td><td class="mono" style="font-size:12px">${U.esc(r[1])}</td><td style="font-size:12px">${U.esc(r[2])}</td><td class="num">${U.esc(r[3])}</td></tr>`).join('')}</tbody></table>` : '<div class="muted" style="font-size:12px;margin-top:6px">Sin pagos pendientes de aplicar.</div>'}
          </div>
        </div>` : ''}
      ${state.kind === 'planillas-comision' ? tarifasDetect() : ''}
      ${m.conciliacion ? `<div class="imp-note" style="margin-top:12px">🧾 Se desplegaron los <b>recibos según forma de pago</b>. La conciliación <b>no duplica</b>: solo crea lo que falta, completa o ajusta lo que no coincida. En el paso siguiente podés <b>aplicar pagos por póliza</b>.</div>` : ''}`;
  }

  /* Tarifas detectadas en la planilla: % por PRODUCTO que paga cada aseguradora (editable) */
  /* P0-05: tarifas leídas de las FILAS REALES de la planilla (no simuladas).
     Mapea aseguradora / ramo / producto / % / base / vigencia desde el parsed.
     Si no hay extracción confiable (0 filas con % válido), NO actualiza tarifas. */
  function tarifasDetect() {
    if (!state.detectedRates) {
      const rows = [];
      const parsed = state.parsed || { headers: [], rows: [] };
      const H = (parsed.headers || []).map(norm);
      const find = (syns) => { for (const s of syns) { const i = H.findIndex(h => h.indexOf(s) >= 0); if (i >= 0) return i; } return -1; };
      const iAsg = find(['aseguradora', 'compania', 'cia', 'asegurador']);
      const iRamo = find(['ramo', 'linea', 'tipo']);
      const iProd = find(['producto', 'subramo', 'plan']);
      const iPct = find(['porcentaje', 'comision', '% ', 'pct', 'tasa']);
      const iBase = find(['base', 'sobre']);
      const iVig = find(['vigencia', 'desde', 'periodo']);
      (parsed.rows || []).forEach(r => {
        const cell = (i) => i >= 0 ? (Array.isArray(r) ? r[i] : r[Object.keys(r)[i]]) : '';
        const asgTxt = String(cell(iAsg) || '').trim();
        const pctRaw = cell(iPct);
        const pct = parseNum(pctRaw);
        if (!asgTxt && iPct < 0) return;
        const a = Orbit.store.all('aseguradoras').find(x => norm(x.nombre).indexOf(norm(asgTxt)) >= 0 || (asgTxt && norm(asgTxt).indexOf(norm(x.nombre)) >= 0));
        const valido = !!a && pct > 0 && pct <= 100 && String(pctRaw).trim() !== '';
        rows.push({ aseguradoraId: a ? a.id : '', asg: a ? a.nombre : (asgTxt || '—'), ramo: String(cell(iRamo) || '').trim() || '—', producto: String(cell(iProd) || '').trim() || String(cell(iRamo) || '').trim() || '—', pct: valido ? pct : (pct || 0), base: String(cell(iBase) || 'prima neta').trim(), vigencia: String(cell(iVig) || '').trim(), valido: valido });
      });
      state.detectedRates = rows;
      state.tarifasConfiables = rows.length > 0 && rows.some(r => r.valido);
    }
    const confiables = state.tarifasConfiables;
    const rows = state.detectedRates;
    if (!rows.length || !confiables) {
      return `<div class="card" style="overflow:hidden;margin-top:14px;border:1px solid var(--warn)">
        <div style="padding:12px 14px;background:rgba(200,140,0,.08);font-family:var(--f-display);font-weight:700;font-size:13px">⚠ No se pudieron leer tarifas con confianza</div>
        <div class="imp-note" style="margin:0;border-radius:0">La planilla no trae columnas claras de <b>aseguradora</b> y <b>% de comisión</b> (o no coinciden con aseguradoras registradas). Los movimientos de comisión se importan como <b>referencia</b>, pero <b>no se actualizarán las tarifas</b> hasta validar manualmente. Revisá el archivo o usá "🔄 Iterar / mejorar".</div>
      </div>`;
    }
    return `<div class="card" style="overflow:hidden;margin-top:14px;border:1px solid var(--info)">
      <div style="padding:10px 13px;background:rgba(31,58,95,.06);font-family:var(--f-display);font-weight:700;font-size:13px">💼 Tarifas leídas de la planilla · % por producto <span class="muted" style="font-weight:400">(diff antes de aplicar)</span></div>
      <table class="tbl"><thead><tr><th>Aseguradora</th><th>Ramo</th><th>Producto</th><th class="num">% actual</th><th class="num">% nuevo</th></tr></thead>
      <tbody>${rows.map((r, i) => { const act = (Orbit.comeng && Orbit.comeng.tarifaDe) ? Orbit.comeng.tarifaDe(r.aseguradoraId, r.producto || r.ramo) : null; const cambia = act != null && Math.abs((act || 0) - r.pct) > 0.01; return `<tr${r.valido ? '' : ' style="opacity:.55"'}>
        <td>${U.esc(r.asg)}${r.valido ? '' : ' <span class="badge warn" style="font-size:9px">sin match</span>'}</td><td>${U.esc(r.ramo)}</td><td>${U.esc(r.producto)}</td>
        <td class="num muted">${act != null ? act + '%' : '—'}</td>
        <td class="num"><input type="number" min="0" max="100" step="0.5" value="${r.pct}" data-rate="${i}" style="width:64px;text-align:right;padding:4px 6px;border:1px solid var(--line);border-radius:6px;${cambia ? 'border-color:var(--warn);font-weight:700' : ''}">%${cambia ? ' <span class="badge warn" style="font-size:8.5px">Δ</span>' : ''}</td></tr>`; }).join('')}</tbody></table>
      <label class="ce-l" style="display:flex;flex-direction:row;align-items:center;gap:8px;padding:11px 13px;margin:0;border-top:1px solid var(--line);cursor:pointer"><input type="checkbox" id="imp-aplicar-tarifas" ${state.aplicarTarifas ? 'checked' : ''} style="width:auto"> <b>Aplicar estos % al tarifario</b> <span class="muted" style="font-weight:400;font-size:11.5px">— si lo dejás sin marcar, la planilla se importa como referencia y las tarifas no cambian.</span></label>
    </div>${planillaFlujo()}`;
  }
  /* P0-07-FIX: flujo visual de la planilla (fila real → esperada/pagada/dif/retención/ajuste → score → acción → estado → impacto). Es PROPUESTA: no aplica a cobros/comisiones automáticamente. */
  function planillaFlujo() {
    let rows = [];
    try {
      const parsed = state.parsed || { headers: [], rows: [] };
      const idx = mapHeaders('planillas-comision', parsed.headers);
      rows = (parsed.rows || []).slice(0, 40).map(cells => {
        const rec = {}; Object.keys(idx).forEach(f => { const v = cells[idx[f]]; if (v != null && v !== '') rec[f] = v; });
        if (IMPORT_MAP['planillas-comision'].build) IMPORT_MAP['planillas-comision'].build(rec);
        return rec;
      });
    } catch (e) {}
    if (!rows.length) return '';
    const score = (r) => {
      if (r.requiereValidacion || !r.moneda) return { t: 'REQUIERE_VALIDACION', tone: 'warn' };
      const base = Math.abs(r.comEsperada || 0) || 1, rel = Math.abs((r.difComision || 0)) / base;
      if (Math.abs(r.difComision || 0) < 0.5) return { t: 'MATCH_EXACTO', tone: 'ok' };
      if (rel <= 0.05) return { t: 'MATCH_PROBABLE', tone: 'info' };
      if (rel > 0.25) return { t: 'BLOQUEADO', tone: 'danger' };
      return { t: 'REQUIERE_VALIDACION', tone: 'warn' };
    };
    const M = (n, cur) => (n == null || !cur) ? '<span class="muted">moneda requerida</span>' : U.money(n, cur);
    return `<div class="card" style="overflow:hidden;margin-top:14px;border:1px solid var(--line)">
      <div style="padding:10px 13px;border-bottom:1px solid var(--line);font-family:var(--f-display);font-weight:800;font-size:13px">🧾 Flujo de conciliación de la planilla <span class="muted" style="font-weight:400;font-size:11.5px">— propuesta; no impacta cobros/comisiones hasta validar</span></div>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Fila</th><th>Aseguradora</th><th>Periodo</th><th class="num">Esperada</th><th class="num">Pagada</th><th class="num">Dif.</th><th class="num">Ret.</th><th class="num">Ajuste</th><th>Score</th><th>Acción propuesta</th><th>Estado</th></tr></thead>
      <tbody>${rows.map(r => { const s = score(r); const cur = r.moneda; const asg = r.aseguradoraId ? (Orbit.q.aseguradora(r.aseguradoraId) || {}).nombre : (r._asgTxt || '—'); const accion = (r.requiereValidacion || !r.moneda) ? 'Revisar y completar' : (Math.abs(r.difComision || 0) < 0.5 ? 'Confirmar conciliación' : 'Ajustar / validar diferencia'); return `<tr>
        <td class="mono" style="font-size:11px">${r._numeroFila || '—'}</td><td style="font-size:12px">${U.esc(asg || '—')}</td><td class="mono" style="font-size:11px">${U.esc(r.periodo || '—')}</td>
        <td class="num">${M(r.comEsperada, cur)}</td><td class="num">${M(r.comPagada, cur)}</td>
        <td class="num" style="color:${Math.abs(r.difComision||0)<0.5?'var(--ok)':(r.difComision<0?'var(--danger)':'var(--warn)')}">${r.difComision ? (r.difComision>0?'+':'')+M(r.difComision,cur) : '—'}</td>
        <td class="num muted">${r.retencion ? M(r.retencion,cur) : '—'}</td><td class="num muted">${r.ajuste ? M(r.ajuste,cur) : '—'}</td>
        <td><span class="badge ${s.tone}">${s.t}</span></td><td style="font-size:12px">${accion}</td>
        <td><span class="badge ${r.requiereValidacion || !r.moneda ?'warn':'info'}">${r.requiereValidacion || !r.moneda ?'Requiere validación':'Pendiente de aplicar'}</span></td></tr>`; }).join('')}</tbody></table></div>
      <div class="imp-note" style="margin:0;border-radius:0">Ninguna fila impacta cobros/comisiones/liquidaciones hasta que un usuario la valide. El importe se muestra en la moneda del país (no se mezcla).</div>
    </div>`;
  }
  function step3(m) {
    return `<div style="text-align:center;padding:24px 8px">
        <div style="font-size:52px">✅</div>
        <div style="font-family:var(--f-display);font-weight:800;font-size:20px;margin-top:8px">Importación lista para aplicar</div>
        <p class="muted" style="max-width:380px;margin:10px auto 0">${(state.parsed && IMPORT_MAP[state.kind] && state.modo !== 'documental') ? '<b>' + state.parsed.rows.length + ' registros</b> de tu archivo se integrarán a <b>' + IMPORT_MAP[state.kind].label + '</b> — crea lo nuevo, actualiza lo existente, sin duplicar.' : 'Los registros se integran a la capa de datos y quedan disponibles en todos los módulos relacionados.'}</p>
        ${m.conciliacion ? `<button class="btn ghost" style="margin-top:16px">Aplicar pagos por póliza →</button>` : ''}
        <div style="margin-top:20px;display:flex;gap:8px;justify-content:center">
          <button class="btn ghost" id="imp-again">Importar otro</button>
          <button class="btn primary" id="imp-finish">Finalizar</button>
        </div>
        <div class="muted" style="font-size:12px;margin-top:14px">${state.modo === 'documental' ? 'Los archivos quedan almacenados y visibles en el expediente/ficha.' : 'El motor mapea automáticamente los datos a Orbit 360.'}</div>
      </div>`;
  }
  function wire() {
    const dr = document.getElementById('imp-drawer');
    const drop = dr.querySelector('#imp-drop');
    dr.querySelectorAll('.imp-mode-b').forEach(b => b.addEventListener('click', () => { state.modo = b.dataset.modo; paint(); }));
    const fileInput = dr.querySelector('#imp-file');
    if (fileInput) fileInput.addEventListener('change', e => {
      const files = [...e.target.files];
      state.files = files.map(f => f.name);
      state.filesReal = files; state.parsed = null; state.processing = null;
      const fl = dr.querySelector('#imp-files');
      if (fl) fl.innerHTML = state.files.map(n => `<span class="mail-chip">📎 ${U.esc(n)}</span>`).join('');
      if (!files.length) return;
      const f0 = files[0];
      const ext = (f0.name.split('.').pop() || '').toLowerCase();
      const goPreview = () => {
        state.processing = null;
        // Base de datos inicial: detectar a qué entidad corresponde el archivo por sus columnas
        if (state.kind === 'base-inicial' && state.parsed && state.parsed.headers && state.parsed.headers.length) {
          let best = 'clientes', score = -1;
          ['clientes', 'polizas', 'vehiculos', 'movimientos-finanzas', 'estados-cuenta'].forEach(k => { const n = Object.keys(mapHeaders(k, state.parsed.headers)).length; if (n > score) { score = n; best = k; } });
          state.kind = best; state.meta = KINDS[best] || state.meta;
        }
        state.step = 2; paint();
      };
      const fail = (why) => { state.parsed = null; state.processing = null; state.step = 2; paint(); if (why && Orbit.ui && Orbit.ui.toast) Orbit.ui.toast('⚠ ' + why); };
      if (state.modo === 'documental') { setTimeout(() => { state.step = 3; paint(); }, 300); return; }
      // CSV / TSV / TXT
      if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
        const rd = new FileReader();
        rd.onload = () => { try { state.parsed = (ext === 'txt') ? textToParsed(String(rd.result), state.kind) : parseDelimited(String(rd.result)); } catch (err) { state.parsed = null; } goPreview(); };
        rd.onerror = () => fail('No se pudo leer el archivo');
        rd.readAsText(f0); return;
      }
      // EXCEL — lee TODAS las hojas y combina; si el mapeo es débil, IA sobre el volcado
      if (ext === 'xlsx' || ext === 'xls') {
        showLoading('📊 Leyendo Excel (todas las hojas)…');
        loadLib('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', 'XLSX').then(() => {
          const rd = new FileReader();
          rd.onload = async () => {
            try {
              const wb = XLSX.read(rd.result, { type: 'array' });
              // Multihoja con TRAZABILIDAD (P0-02): cada fila conserva hoja/país/moneda/periodo/bloque/fila.
              // Hojas soporte (dashboard/resumen/presupuesto/producción…) se EXCLUYEN antes de mapear (P1-02).
              let combined = [], headerRow = null, dump = '';
              const hojas = { procesadas: [], excluidas: [] };
              wb.SheetNames.forEach(sn => {
                const ws = wb.Sheets[sn]; const mat = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
                dump += '### Hoja: ' + sn + '\n' + mat.map(r => r.join(' | ')).join('\n') + '\n\n';
                if (esHojaSoporte(sn)) { hojas.excluidas.push({ hoja: sn, motivo: 'hoja soporte (no movimientos)' }); return; }
                const p = matrixToParsed(mat);
                if (!p.headers.length) { hojas.excluidas.push({ hoja: sn, motivo: 'sin encabezado reconocible' }); return; }
                // Traza por hoja: país/moneda/periodo inferidos del NOMBRE de hoja (sin asumir GT)
                // Traza por hoja: país/moneda/periodo del NOMBRE de hoja. Moneda SOLO explícita (P0-01);
                // monedaDe(paisHoja) es SUGERENCIA, no se escribe como moneda de la fila.
                const paisHoja = detectaPais(sn), monedaHoja = detectaMoneda(sn), monedaSugeridaHoja = monedaDe(paisHoja), periodoHoja = detectaPeriodo(sn);
                p.rows.forEach((row, ri) => {
                  row._origenHoja = sn; row._paisHoja = paisHoja; row._monedaHoja = monedaHoja; row._monedaSugeridaHoja = monedaSugeridaHoja;
                  row._periodoHoja = periodoHoja; row._bloqueOrigen = sn; row._numeroFila = ri + 2;
                });
                if (!headerRow) headerRow = p.headers;
                combined = combined.concat(p.rows);
                hojas.procesadas.push({ hoja: sn, filas: p.rows.length, pais: paisHoja || '—', moneda: monedaHoja || '—', periodo: periodoHoja || '—' });
              });
              state.hojas = hojas;
              const parsedXls = { headers: headerRow || [], rows: combined };
              const mapped = Object.keys(mapHeaders(state.kind, parsedXls.headers)).length;
              if (mapped < 2 && Orbit.ia.disponible()) { showLoading('🧠 Extracción inteligente con IA…'); const ai = await aiExtract(dump, state.kind); state.parsed = ai || parsedXls; }
              else state.parsed = parsedXls;
              state.processing = null; state.step = 2; paint();
            } catch (err) { fail('No se pudo leer el Excel'); }
          };
          rd.onerror = () => fail('No se pudo leer el Excel'); rd.readAsArrayBuffer(f0);
        }).catch(() => fail('No se pudo cargar el lector de Excel (sin conexión?)')); return;
      }
      // PDF — texto nativo y, si está escaneado, OCR por render de página
      if (ext === 'pdf') {
        showLoading('📄 Extrayendo texto del PDF…');
        loadLib('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib').then(async () => {
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const buf = await f0.arrayBuffer(); const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
            let txt = '';
            for (let i = 1; i <= pdf.numPages; i++) { const pg = await pdf.getPage(i); const tc = await pg.getTextContent(); txt += tc.items.map(it => it.str).join(' ') + '\n'; }
            if (txt.replace(/\s/g, '').length < 30) {
              // PDF escaneado (sin capa de texto) → OCR por render de cada página
              showLoading('🔍 PDF escaneado · aplicando OCR…');
              const Tess = await loadLib('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js', 'Tesseract');
              let ocr = '';
              const maxP = Math.min(pdf.numPages, 5);
              for (let i = 1; i <= maxP; i++) {
                const pg = await pdf.getPage(i); const vp = pg.getViewport({ scale: 2 });
                const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
                await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
                const out = await Tess.recognize(cv, 'spa+eng'); ocr += out.data.text + '\n';
              }
              txt = ocr;
            }
            await procesarTexto(txt);
          } catch (err) { fail('No se pudo leer el PDF. Probá modo documental.'); }
        }).catch(() => fail('No se pudo cargar el lector de PDF')); return;
      }
      // WORD
      if (ext === 'docx' || ext === 'doc') {
        showLoading('📝 Leyendo Word…');
        loadLib('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', 'mammoth').then(async () => {
          try { const buf = await f0.arrayBuffer(); const r = await mammoth.extractRawText({ arrayBuffer: buf }); await procesarTexto(r.value); } catch (err) { fail('No se pudo leer el Word'); }
        }).catch(() => fail('No se pudo cargar el lector de Word')); return;
      }
      // IMAGEN (OCR)
      if (/^(png|jpe?g|webp|gif|bmp|tiff?)$/.test(ext)) {
        showLoading('🖼️ OCR de la imagen… (puede tardar unos segundos)');
        loadLib('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js', 'Tesseract').then(async () => {
          try { const out = await Tesseract.recognize(f0, 'spa+eng'); state.parsed = textToParsed(out.data.text, state.kind); goPreview(); } catch (err) { fail('No se pudo procesar la imagen'); }
        }).catch(() => fail('No se pudo cargar el OCR')); return;
      }
      // otro formato: vista de ejemplo
      setTimeout(() => { state.step = 2; paint(); }, 300);
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
      if (it) it.addEventListener('click', () => { renderRemap(); });
      const rep = dr.querySelector('#imp-reporte');
      if (rep) rep.addEventListener('click', () => { descargarReporte(); });
      // editar tarifas detectadas (planilla de comisiones)
      dr.querySelectorAll('[data-rate]').forEach(inp => inp.addEventListener('change', () => { state.detectedRates[+inp.dataset.rate].pct = +inp.value || 0; }));
      const aplT = dr.querySelector('#imp-aplicar-tarifas'); if (aplT) aplT.addEventListener('change', () => { state.aplicarTarifas = aplT.checked; });
      // botón continuar al pie
      const body = dr.querySelector('.imp-body');
      const bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px';
      bar.innerHTML = `<button class="btn ghost" id="imp-back2">Atrás</button><button class="btn primary" id="imp-next2">Confirmar mapeo →</button>`;
      body.appendChild(bar);
      bar.querySelector('#imp-back2').addEventListener('click', () => { state.step = 1; paint(); });
      bar.querySelector('#imp-next2').addEventListener('click', () => { state.step = 3; paint(); });
    }
    const fin = dr.querySelector('#imp-finish'); if (fin) fin.addEventListener('click', () => {
      let msg = '';
      const kind = state.kind;
      const isConc = (state.meta.conciliacion === true);
      if (state.parsed && state.modo !== 'documental' && isConc) {
        const r = applyConciliacion(kind);
        msg = '✓ Conciliación: ' + r.creados + ' referencias creadas · ' + r.propuestas + ' propuestas para revisión (pendiente de validación · no impacta cobros hasta aprobación)';
      } else if (state.parsed && state.modo !== 'documental' && IMPORT_MAP[kind]) {
        const r = applyImport(kind);
        msg = '✓ ' + r.created + ' creados · ' + r.updated + ' actualizados en ' + IMPORT_MAP[kind].label;
      }
      if (kind === 'planillas-comision' && state.detectedRates && state.tarifasConfiables && state.aplicarTarifas && Orbit.comeng) {
        const validas = state.detectedRates.filter(r => r.valido && r.aseguradoraId);
        const n = validas.length ? Orbit.comeng.aplicarPlanilla(validas) : 0;
        msg = n ? ('✓ Comisiones importadas · ' + n + ' tarifas actualizadas (diff confirmado)') : 'Comisiones importadas · tarifas sin cambios';
      } else if (kind === 'planillas-comision') {
        msg = 'Comisiones importadas como referencia · tarifas NO modificadas (sin confirmar diff)';
      }
      if (msg) { const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); }
      close(); if (state.opts.onDone) state.opts.onDone();
    });
    const again = dr.querySelector('#imp-again'); if (again) again.addEventListener('click', () => { state.step = 1; paint(); });
  }

  return { open, openFor, close, KINDS };
})();
