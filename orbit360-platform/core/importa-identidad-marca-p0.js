/* ============================================================
   Orbit 360 · P0 identidad de marca → configuración propuesta
   Fecha: 2026-07-09

   Normaliza manuales/logo/guías de identidad para configuración
   white-label. No escribe datos. No guarda secretos ni hardcodea tenant.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  const SECRET_KEYS = /password|contrase[nñ]a|token|secret|credential|credencial|clave(?!.*color)|api[_ -]?key|login|pin/i;
  const COLOR_RE = /^#?[0-9a-f]{6}$/i;

  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

  function pick(row, names) {
    const keys = Object.keys(row || {});
    for (const name of names) {
      const n = norm(name);
      const k = keys.find(x => norm(x) === n || norm(x).indexOf(n) >= 0 || n.indexOf(norm(x)) >= 0);
      if (k && row[k] != null && clean(row[k]) !== '') return row[k];
    }
    return '';
  }

  function stableId(prefix, parts) {
    let h = 0;
    const s = parts.map(x => norm(x)).join('|');
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return prefix + '_' + Math.abs(h).toString(36);
  }

  function colorValue(v) {
    const raw = clean(v);
    if (!raw) return '';
    const match = raw.match(/#?[0-9a-f]{6}/i);
    if (!match) return '';
    const c = match[0].charAt(0) === '#' ? match[0] : '#' + match[0];
    return COLOR_RE.test(c) ? c.toUpperCase() : '';
  }

  function hasSecret(row) {
    return Object.keys(row || {}).some(function (k) {
      if (!SECRET_KEYS.test(k)) return false;
      const v = clean(row[k]);
      return v && v !== 'backend_required' && v !== 'credentialRef';
    });
  }

  function normalizeRow(row, opts) {
    opts = opts || {};
    const tenantId = clean(pick(row, ['tenantId', 'tenant', 'cliente', 'cliente white label'])) || opts.tenantId || '';
    const clave = clean(pick(row, ['clave', 'key', 'campo', 'elemento', 'configuracion', 'configuración']));
    const valor = clean(pick(row, ['valor', 'value', 'contenido', 'descripcion', 'descripción']));
    const marcaCliente = clean(pick(row, ['marca', 'marca cliente', 'nombre marca', 'cliente marca']));
    const colorPrimario = colorValue(pick(row, ['color primario', 'primario', 'rojo', 'principal']));
    const colorSecundario = colorValue(pick(row, ['color secundario', 'secundario', 'grafito', 'gris']));
    const tipografia = clean(pick(row, ['tipografia', 'tipografía', 'fuente', 'font']));
    const logo = clean(pick(row, ['logo', 'logotipo', 'archivo logo', 'logo cliente']));
    const version = clean(pick(row, ['version', 'versión', 'vigente', 'fecha version']));
    const uso = clean(pick(row, ['uso', 'aplicacion', 'aplicación', 'nota', 'notas', 'observaciones']));
    const categoria = clean(pick(row, ['categoria', 'categoría', 'seccion', 'sección'])) || 'marca_white_label';
    const secretDetected = hasSecret(row);
    return { tenantId, clave, valor, marcaCliente, colorPrimario, colorSecundario, tipografia, logo, version, uso, categoria, secretDetected };
  }

  function buildOperations(input) {
    input = input || {};
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const sourceFileName = input.sourceFileName || '';
    const tenantId = input.tenantId || '';
    const operations = [];
    const warnings = [];
    const seen = {};

    function addConfig(clave, valor, categoria, extra) {
      if (!clave || valor == null || valor === '') return;
      const key = [tenantId || 'REQUIERE_VALIDACION', clave, String(valor)].map(norm).join('|');
      if (seen[key]) return;
      seen[key] = true;
      operations.push({
        action: 'insert',
        collection: 'configuracionCatalogo',
        data: Object.assign({
          id: stableId('cfg_brand', [tenantId, clave, valor]),
          tipo: categoria || 'marca_white_label',
          clave,
          valor,
          tenantId: tenantId || 'REQUIERE_VALIDACION',
          origen: 'identidad_marca',
          archivoFuente: sourceFileName,
          validationStatus: 'pendiente_revision',
          requiereValidacion: !tenantId
        }, extra || {})
      });
    }

    rows.forEach(function (row, i) {
      const n = normalizeRow(row, { tenantId });
      if (n.clave && n.valor) addConfig(n.clave, n.valor, n.categoria, { version: n.version, uso: n.uso });
      if (n.marcaCliente) addConfig('marca.cliente.nombre_visible', n.marcaCliente, 'marca_white_label', { version: n.version, uso: n.uso });
      if (n.colorPrimario) addConfig('marca.color.primario', n.colorPrimario, 'marca_white_label', { version: n.version, uso: n.uso });
      if (n.colorSecundario) addConfig('marca.color.secundario', n.colorSecundario, 'marca_white_label', { version: n.version, uso: n.uso });
      if (n.tipografia) addConfig('marca.tipografia', n.tipografia, 'marca_white_label', { version: n.version, uso: n.uso });
      if (n.logo) addConfig('marca.logo_cliente.slot', 'white_label_slot', 'marca_white_label', { logoRef: 'white_label_slot', archivoLogoFuente: sourceFileName, version: n.version, uso: n.uso });
      if (!n.clave && !n.valor && !n.marcaCliente && !n.colorPrimario && !n.colorSecundario && !n.tipografia && !n.logo) warnings.push({ row: i + 1, code: 'fila_identidad_sin_configuracion_detectable' });
      if (n.secretDetected) {
        operations.push({
          action: 'insert',
          collection: 'gestiones',
          data: {
            id: stableId('ges_brand_secret', [tenantId, sourceFileName, i]),
            tipo: 'marca_requiere_revision_segura',
            entidad: 'tenant_config',
            entidadId: tenantId || 'REQUIERE_VALIDACION',
            detalle: 'Fuente contiene campo sensible. No importar valor. Revisar referencia segura antes de configurar.',
            credentialRef: 'backend_required',
            tenantId: tenantId || 'REQUIERE_VALIDACION',
            origen: 'identidad_marca',
            archivoFuente: sourceFileName,
            validationStatus: 'pendiente_revision',
            requiereValidacion: true
          }
        });
      }
    });

    if (sourceFileName) {
      addConfig('academia.identidad.material_fuente', sourceFileName, 'academia_material', { uso: 'Manual/guía de identidad para capacitación interna por rol.' });
    }

    return {
      sourceType: 'identidad_marca',
      sourceFileName,
      totalRows: rows.length,
      operations,
      warnings
    };
  }

  function buildSanitizedDryRun(input) {
    const op = buildOperations(input);
    if (!window.Orbit.importaDryRunP0 || !window.Orbit.importaDryRunP0.buildDryRun) {
      return Object.assign({}, op, { status: 'dry_run_builder_no_disponible' });
    }
    const report = window.Orbit.importaDryRunP0.buildDryRun({
      sourceType: 'identidad_marca',
      sourceFileName: op.sourceFileName,
      sourceHash: input && input.sourceHash || '',
      tenantId: input && input.tenantId || '',
      operations: op.operations
    });
    report.sourceWarnings = op.warnings;
    report.totalSourceRows = op.totalRows;
    return report;
  }

  window.Orbit.importaIdentidadMarcaP0 = {
    normalizeRow,
    buildOperations,
    buildSanitizedDryRun
  };
})();