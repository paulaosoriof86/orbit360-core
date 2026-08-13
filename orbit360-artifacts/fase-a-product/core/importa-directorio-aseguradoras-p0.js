/* ============================================================
   Orbit 360 · P0 directorio aseguradoras → operaciones propuestas
   Fecha: 2026-07-09

   Normaliza filas de directorios GT/CO y construye operaciones para
   dry-run sanitizado. No escribe datos. No guarda credenciales.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  const SECRET_KEYS = /password|contrase[nñ]a|token|secret|credential|credencial|clave|api[_ -]?key|usuario[_ -]?portal|acceso|login|pin/i;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

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

  function countryOf(v, fallback) {
    const n = norm(v || fallback || '');
    if (/guate|\bgt\b|guatemala/.test(n)) return 'GT';
    if (/colomb|\bco\b|colombia/.test(n)) return 'CO';
    return fallback || '';
  }

  function pick(row, names) {
    const keys = Object.keys(row || {});
    for (const name of names) {
      const n = norm(name);
      const k = keys.find(x => norm(x) === n || norm(x).indexOf(n) >= 0 || n.indexOf(norm(x)) >= 0);
      if (k && row[k] != null && clean(row[k]) !== '') return row[k];
    }
    return '';
  }

  function splitList(v) {
    return String(v == null ? '' : v)
      .split(/[;,/\n]+/)
      .map(clean)
      .filter(Boolean)
      .filter((x, i, a) => a.findIndex(y => norm(y) === norm(x)) === i);
  }

  function stableId(prefix, parts) {
    let h = 0;
    const s = parts.map(x => norm(x)).join('|');
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return prefix + '_' + Math.abs(h).toString(36);
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
    const country = countryOf(pick(row, ['pais', 'país', 'country']), opts.country || '');
    const nombre = clean(pick(row, ['aseguradora', 'compania', 'compañia', 'compania aseguradora', 'nombre', 'asegurador', 'cia']));
    const razonSocial = clean(pick(row, ['razon social', 'razón social', 'sociedad', 'empresa']));
    const nit = clean(pick(row, ['nit', 'identificacion', 'identificación', 'tax id', 'rut']));
    const web = clean(pick(row, ['web', 'sitio web', 'pagina', 'página', 'portal', 'url']));
    const email = clean(pick(row, ['correo', 'email', 'e mail', 'mail', 'contacto']));
    const telefono = clean(pick(row, ['telefono', 'teléfono', 'tel', 'pbx', 'conmutador', 'whatsapp']));
    const contacto = clean(pick(row, ['contacto', 'nombre contacto', 'ejecutivo', 'asesor', 'mesa', 'comercial']));
    const cargo = clean(pick(row, ['cargo', 'area', 'área', 'rol', 'departamento contacto']));
    const ramos = splitList(pick(row, ['ramos', 'lineas', 'líneas', 'productos', 'ramos autorizados', 'servicios']));
    const notas = clean(pick(row, ['notas', 'observaciones', 'comentarios', 'comentario']));
    const secretDetected = hasSecret(row);
    return { country, nombre, razonSocial, nit, web, email, telefono, contacto, cargo, ramos, notas, secretDetected };
  }

  function buildOperations(input) {
    input = input || {};
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const sourceFileName = input.sourceFileName || '';
    const country = input.country || '';
    const operations = [];
    const warnings = [];
    const insurers = {};
    const seenContacts = {};
    const seenCatalog = {};
    const seenNotes = {};
    const seenCredentialGestion = {};

    function ensureInsurer(n, rowIndex) {
      const key = [n.country || 'REQUIERE_VALIDACION', n.nombre].map(norm).join('|');
      if (insurers[key]) {
        warnings.push({ row: rowIndex + 1, code: 'duplicado_probable_aseguradora', insurerKey: key });
        return insurers[key];
      }
      const aseguradoraId = stableId('asg', [n.country, n.nombre, n.nit]);
      insurers[key] = aseguradoraId;
      operations.push({
        action: 'insert',
        collection: 'aseguradoras',
        data: {
          id: aseguradoraId,
          nombre: n.nombre,
          razonSocial: n.razonSocial,
          nit: n.nit,
          pais: n.country || 'REQUIERE_VALIDACION',
          moneda: n.country === 'CO' ? 'COP' : n.country === 'GT' ? 'GTQ' : 'REQUIERE_VALIDACION',
          web: n.web,
          ramos: n.ramos,
          origen: 'directorio_aseguradoras',
          archivoFuente: sourceFileName,
          validationStatus: n.country ? 'pendiente_revision' : 'requiere_validacion',
          requiereValidacion: !n.country
        }
      });
      return aseguradoraId;
    }

    rows.forEach(function (row, i) {
      const n = normalizeRow(row, { country });
      if (!n.nombre) {
        warnings.push({ row: i + 1, code: 'aseguradora_sin_nombre' });
        return;
      }
      const aseguradoraId = ensureInsurer(n, i);

      if (n.email || n.telefono || n.contacto) {
        const contactKey = [aseguradoraId, n.contacto || 'Mesa de corredores', n.email, n.telefono].map(norm).join('|');
        if (!seenContacts[contactKey]) {
          seenContacts[contactKey] = true;
          operations.push({
            action: 'insert',
            collection: 'contactosAseguradora',
            data: {
              id: stableId('asg_cto', [aseguradoraId, n.contacto, n.email, n.telefono]),
              aseguradoraId,
              pais: n.country || 'REQUIERE_VALIDACION',
              nombre: n.contacto || 'Mesa de corredores',
              cargo: n.cargo || 'Comercial / servicio',
              email: EMAIL_RE.test(n.email) ? n.email : '',
              telefono: n.telefono,
              origen: 'directorio_aseguradoras',
              archivoFuente: sourceFileName,
              validationStatus: 'pendiente_revision',
              requiereValidacion: !n.country || (!!n.email && !EMAIL_RE.test(n.email))
            }
          });
        }
      }

      n.ramos.forEach(function (ramo) {
        const catKey = [aseguradoraId, ramo].map(norm).join('|');
        if (seenCatalog[catKey]) return;
        seenCatalog[catKey] = true;
        operations.push({
          action: 'insert',
          collection: 'configuracionCatalogo',
          data: {
            id: stableId('cat_ramo_asg', [aseguradoraId, ramo]),
            tipo: 'ramo_aseguradora',
            aseguradoraId,
            pais: n.country || 'REQUIERE_VALIDACION',
            valor: ramo,
            origen: 'directorio_aseguradoras',
            archivoFuente: sourceFileName,
            validationStatus: 'pendiente_revision',
            requiereValidacion: !n.country
          }
        });
      });

      if (n.notas) {
        const noteKey = [aseguradoraId, n.notas].map(norm).join('|');
        if (!seenNotes[noteKey]) {
          seenNotes[noteKey] = true;
          operations.push({
            action: 'insert',
            collection: 'gestiones',
            data: {
              id: stableId('ges_asg', [aseguradoraId, n.notas]),
              tipo: 'nota_directorio_aseguradora',
              entidad: 'aseguradora',
              entidadId: aseguradoraId,
              pais: n.country || 'REQUIERE_VALIDACION',
              detalle: n.notas,
              origen: 'directorio_aseguradoras',
              archivoFuente: sourceFileName,
              validationStatus: 'pendiente_revision',
              requiereValidacion: !n.country
            }
          });
        }
      }

      if (n.secretDetected) {
        const credKey = [aseguradoraId, sourceFileName].map(norm).join('|');
        if (!seenCredentialGestion[credKey]) {
          seenCredentialGestion[credKey] = true;
          operations.push({
            action: 'insert',
            collection: 'gestiones',
            data: {
              id: stableId('ges_cred_asg', [aseguradoraId, sourceFileName]),
              tipo: 'acceso_requiere_backend',
              entidad: 'aseguradora',
              entidadId: aseguradoraId,
              pais: n.country || 'REQUIERE_VALIDACION',
              detalle: 'Fuente contiene acceso/credencial. No importar valor. Configurar referencia segura en backend.',
              credentialRef: 'backend_required',
              origen: 'directorio_aseguradoras',
              archivoFuente: sourceFileName,
              validationStatus: 'pendiente_revision',
              requiereValidacion: true
            }
          });
        }
      }
    });

    return {
      sourceType: 'directorio_aseguradoras',
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
      sourceType: 'directorio_aseguradoras',
      sourceFileName: op.sourceFileName,
      sourceHash: input && input.sourceHash || '',
      tenantId: input && input.tenantId || '',
      operations: op.operations
    });
    report.sourceWarnings = op.warnings;
    report.totalSourceRows = op.totalRows;
    return report;
  }

  window.Orbit.importaDirectorioAseguradorasP0 = {
    normalizeRow,
    buildOperations,
    buildSanitizedDryRun
  };
})();