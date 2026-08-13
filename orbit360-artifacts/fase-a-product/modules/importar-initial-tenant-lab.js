/* Orbit 360 · Carga inicial configurable dentro de Importar */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var S = {
    p: null,
    file: null,
    payload: null,
    hash: '',
    batch: null,
    diff: null,
    rollback: null,
    advisorsReady: false
  };

  function e(value) {
    return Orbit.ui && Orbit.ui.esc
      ? Orbit.ui.esc(value)
      : String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
          return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
        });
  }

  function n(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function c(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function u(values) {
    return Array.from(new Set((values || []).filter(Boolean)));
  }

  function tenant() {
    try {
      var current = Orbit.tenant && Orbit.tenant.get ? Orbit.tenant.get() : null;
      if (current && current.id) return current.id;
    } catch (error) {}
    return window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant) || '';
  }

  function profile() {
    return (Orbit.importInitialProfiles || {})[tenant()] || null;
  }

  function mode() {
    return window.OrbitBackend && OrbitBackend.mode || '';
  }

  function rawStatus() {
    try {
      if (Orbit.store && Orbit.store._labStatus) return Orbit.store._labStatus();
      if (window.OrbitBackend && OrbitBackend.status) return OrbitBackend.status();
    } catch (error) {}
    return {};
  }

  function firebaseUser() {
    try {
      return window.firebase && typeof window.firebase.auth === 'function'
        ? window.firebase.auth().currentUser
        : null;
    } catch (error) {
      return null;
    }
  }

  function canonicalUser() {
    var user = firebaseUser();
    if (!user) return null;
    var expectedEmail = String(window.OrbitBackend && OrbitBackend.expectedEmail || 'orbit.lab@demo.com').toLowerCase();
    var expectedUid = String(window.OrbitBackend && OrbitBackend.expectedUid || '');
    if (String(user.email || '').toLowerCase() !== expectedEmail) return null;
    if (expectedUid && String(user.uid || '') !== expectedUid) return null;
    return user;
  }

  function status() {
    var current = rawStatus() || {};
    var user = canonicalUser();
    if (user) current.auth = { uid: user.uid || '', email: user.email || '' };
    return current;
  }

  function arrays(payload) {
    return {
      clientes: payload && payload.collections && Array.isArray(payload.collections.clientes)
        ? payload.collections.clientes
        : [],
      aseguradoras: payload && payload.collections && Array.isArray(payload.collections.aseguradoras)
        ? payload.collections.aseguradoras
        : [],
      retenidos: payload && payload.retained && Array.isArray(payload.retained.clientes)
        ? payload.retained.clientes
        : []
    };
  }

  function download(name, object) {
    var blob = new Blob([JSON.stringify(object, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  async function hash(file) {
    if (!crypto || !crypto.subtle) return '';
    var digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map(function (byte) { return byte.toString(16).padStart(2, '0'); })
      .join('');
  }

  function insurerIsPending(row) {
    return !!(row && row.requiereValidacion);
  }

  function insurerIsQuarantined(row) {
    var action = n(row && row._migration && row._migration.dryRunAction);
    return /cuarentena|no escribir|bloqueado/.test(action);
  }

  function validate(payload, profileConfig) {
    var data = arrays(payload);
    var errors = [];
    var warnings = [];
    var expected = profileConfig.expectedCounts || {};
    var sensitiveKey = /password|contrase|clave|secret|token|api.?key|private.?key|client.?secret|bearer|webhook|credentialValue/i;

    if (!payload || payload.schemaVersion !== profileConfig.sourceSchemaVersion) errors.push('schema');
    if (!payload || payload.tenantId !== profileConfig.tenantId) errors.push('tenant');
    if (
      !payload ||
      !payload.security ||
      payload.security.secretValuesIncluded !== false ||
      payload.security.credentialsAsReferencesOnly !== true ||
      payload.security.contactsSeparatedFromAccesses !== true
    ) errors.push('seguridad');

    if (data.clientes.length !== expected.clientes) errors.push('clientes:' + data.clientes.length);
    if (data.retenidos.length !== expected.clientesRetenidos) errors.push('retenidos:' + data.retenidos.length);
    if (data.aseguradoras.length !== expected.aseguradoras) errors.push('aseguradoras:' + data.aseguradoras.length);

    (function walk(value, path) {
      if (Array.isArray(value)) {
        value.forEach(function (item, index) { walk(item, path.concat(index)); });
        return;
      }
      if (value && typeof value === 'object') {
        Object.keys(value).forEach(function (key) {
          if (
            sensitiveKey.test(key) &&
            ![
              'credentialRef',
              'credentialStatus',
              'usuarioRef',
              'secretValuesIncluded',
              'credentialsAsReferencesOnly',
              'credentialValuesStored',
              'forbiddenCollections'
            ].includes(key)
          ) errors.push('sensible:' + path.concat(key).join('.'));
          walk(value[key], path.concat(key));
        });
        return;
      }
      if (
        typeof value === 'string' &&
        (/BEGIN [A-Z ]*PRIVATE KEY|eyJ[a-zA-Z0-9_-]{10,}\./.test(value))
      ) errors.push('valor_sensible:' + path.join('.'));
    })(payload, []);

    var seenClientes = {};
    data.clientes.forEach(function (row, index) {
      if (!row || !row.id) errors.push('clientes_' + index + ':id');
      else if (seenClientes[row.id]) errors.push('clientes_' + index + ':duplicado');
      else seenClientes[row.id] = 1;
      if (row && row.tenantId && row.tenantId !== profileConfig.tenantId) errors.push('clientes_' + index + ':tenant');
      if (row && row.requiereValidacion) errors.push('clientes_' + index + ':validacion');
      if (row && (!row.pais || row.pais === 'REQUIERE_VALIDACION')) errors.push('clientes_' + index + ':pais');
    });

    var seenInsurers = {};
    data.aseguradoras.forEach(function (row, index) {
      if (!row || !row.id) errors.push('aseguradoras_' + index + ':id');
      else if (seenInsurers[row.id]) errors.push('aseguradoras_' + index + ':duplicado');
      else seenInsurers[row.id] = 1;
      if (row && row.tenantId && row.tenantId !== profileConfig.tenantId) errors.push('aseguradoras_' + index + ':tenant');
      if (row && (!row.pais || row.pais === 'REQUIERE_VALIDACION')) errors.push('aseguradoras_' + index + ':pais');
      if (insurerIsPending(row)) {
        warnings.push({
          collection: 'aseguradoras',
          id: row.id,
          index: index,
          reason: row.validationReason || 'DATOS_PENDIENTES'
        });
      }
      (row.contactos || []).forEach(function (contact, contactIndex) {
        var text = [contact.nombre, contact.cargo, contact.area, contact.observaciones].join(' ');
        if (
          /https?:\/\/|www\./i.test(text) ||
          /^\s*(?:🖥|🔐|🔑|📱|🌐|[-–—])*\s*(accesos?|sistema en l[ií]nea|plataformas?|portales?|usuarios?|credenciales?|cotizadores?)/i.test(contact.nombre || '')
        ) errors.push('contacto_' + index + '_' + contactIndex);
      });
      (row.portales || []).forEach(function (portal, portalIndex) {
        if (
          portal.credentialStatus !== 'backend_required' ||
          portal.usuarioRef !== 'backend_required' ||
          !portal.credentialRef
        ) errors.push('portal_' + index + '_' + portalIndex);
      });
    });

    return { ok: !errors.length, errors: errors, warnings: warnings, arrays: data };
  }

  function allow(profileConfig) {
    if (!Orbit.importaWriteP0 || !Array.isArray(Orbit.importaWriteP0.ALLOWED_COLLECTIONS)) return false;
    (profileConfig.allowedCollections || []).forEach(function (collection) {
      if (!Orbit.importaWriteP0.ALLOWED_COLLECTIONS.includes(collection)) {
        Orbit.importaWriteP0.ALLOWED_COLLECTIONS.push(collection);
      }
    });
    return true;
  }

  function advisors() {
    var map = {};
    (Orbit.store.all('asesores') || []).forEach(function (row) {
      u([row.nombre, row.name, row.displayName, row.email].concat(row.aliases || []))
        .forEach(function (key) {
          if (n(key)) map[n(key)] = row;
        });
    });
    return map;
  }

  function clientMatches(row, existingRows) {
    var documentId = n(row.documento || row.numeroDocumento);
    var email = n(row.email || row.correo);
    var name = n(row.nombre || row.nombreCompleto);
    var matches = {};
    (existingRows || []).forEach(function (existing) {
      if (
        String(existing.id) === String(row.id) ||
        (documentId && n(existing.documento || existing.numeroDocumento) === documentId) ||
        (email && n(existing.email || existing.correo) === email) ||
        (name && n(existing.nombre || existing.nombreCompleto) === name && n(existing.pais) === n(row.pais))
      ) matches[existing.id] = existing;
    });
    return Object.keys(matches).map(function (key) { return matches[key]; });
  }

  function insurerMatches(row, existingRows) {
    var names = u([row.nombre, row.canonicalName].concat(row.aliases || [])).map(n);
    return (existingRows || []).filter(function (existing) {
      if (String(existing.id) === String(row.id)) return true;
      if (n(existing.pais) !== n(row.pais)) return false;
      return u([existing.nombre, existing.canonicalName].concat(existing.aliases || []))
        .map(n)
        .some(function (name) { return names.includes(name); });
    });
  }

  function build(payload, profileConfig, file, sourceHash) {
    var data = arrays(payload);
    var advisorMap = advisors();
    var existingClients = Orbit.store.all('clientes') || [];
    var existingInsurers = Orbit.store.all('aseguradoras') || [];
    var operations = [];
    var blockers = [];
    var warnings = [];

    data.clientes.forEach(function (source) {
      var row = c(source);
      var advisor = advisorMap[n(row.asesorNombre)];
      if (!advisor) {
        blockers.push({ collection: 'clientes', id: row.id, reason: 'asesor_no_resuelto', asesor: row.asesorNombre });
        return;
      }
      row.asesorId = advisor.id;
      row.tenantId = profileConfig.tenantId;
      row.validationStatus = 'validado';
      row.requiereValidacion = false;
      var matches = clientMatches(row, existingClients);
      if (matches.length > 1) {
        blockers.push({
          collection: 'clientes',
          id: row.id,
          reason: 'coincidencia_ambigua',
          matches: matches.map(function (match) { return match.id; })
        });
        return;
      }
      if (matches.length) {
        row.id = matches[0].id;
        operations.push({ collection: 'clientes', action: 'update', id: row.id, data: row });
      } else {
        operations.push({ collection: 'clientes', action: 'insert', data: row });
      }
    });

    data.aseguradoras.forEach(function (source) {
      var row = c(source);
      var pending = insurerIsPending(row);
      if (insurerIsQuarantined(row)) {
        blockers.push({
          collection: 'aseguradoras',
          id: row.id,
          reason: 'cuarentena_fuente',
          detail: row.validationReason || row._migration && row._migration.dryRunAction || ''
        });
        return;
      }
      row.tenantId = profileConfig.tenantId;
      row.validationStatus = pending ? 'requiere_validacion' : 'validado';
      row.requiereValidacion = pending;
      if (pending) {
        row.vinculada = false;
        row.cotizadorHabilitado = false;
        row.comparativoHabilitado = false;
        row.tarifasHabilitadas = false;
        row.estadoOperativo = 'pendiente_validacion';
        warnings.push({
          collection: 'aseguradoras',
          id: row.id,
          reason: row.validationReason || 'DATOS_PENDIENTES',
          treatment: 'directorio_restringido'
        });
      }
      var matches = insurerMatches(row, existingInsurers);
      if (matches.length > 1) {
        blockers.push({
          collection: 'aseguradoras',
          id: row.id,
          reason: 'coincidencia_ambigua',
          matches: matches.map(function (match) { return match.id; })
        });
        return;
      }
      if (matches.length) {
        row.id = matches[0].id;
        operations.push({ collection: 'aseguradoras', action: 'update', id: row.id, data: row });
      } else {
        operations.push({ collection: 'aseguradoras', action: 'insert', data: row });
      }
    });

    var batchId = 'initial_' + profileConfig.id + '_' + new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    var count = function (collection, action) {
      return operations.filter(function (operation) {
        return operation.collection === collection && operation.action === action;
      }).length;
    };

    var diff = {
      batchId: batchId,
      tenantId: profileConfig.tenantId,
      generatedAt: new Date().toISOString(),
      sourceFileName: file.name,
      sourceHash: sourceHash || payload.sourceHash || '',
      counts: {
        clientesCrear: count('clientes', 'insert'),
        clientesActualizar: count('clientes', 'update'),
        clientesRetenidos: data.retenidos.length,
        aseguradorasCrear: count('aseguradoras', 'insert'),
        aseguradorasActualizar: count('aseguradoras', 'update'),
        aseguradorasPendientesValidacion: warnings.length,
        bloqueos: blockers.length
      },
      blockers: blockers,
      warnings: warnings,
      restrictions: profileConfig.restrictions || []
    };

    return {
      batch: {
        batchId: batchId,
        tenantId: profileConfig.tenantId,
        sourceType: payload.sourceType || profileConfig.id,
        sourceFileName: file.name,
        sourceHash: diff.sourceHash,
        status: blockers.length ? 'dry_run_bloqueado' : 'dry_run_aprobado',
        hasBlockingErrors: !!blockers.length,
        operations: operations
      },
      diff: diff
    };
  }

  function wait(batch) {
    var ids = (batch.operations || []).map(function (operation) {
      return { c: operation.collection, id: operation.id || operation.data && operation.data.id };
    });
    return new Promise(function (resolve, reject) {
      var start = Date.now();
      (function tick() {
        var pending = 0;
        var failed = 0;
        ids.forEach(function (item) {
          var row = Orbit.store.get(item.c, item.id);
          if (row && row._syncStatus === 'failed') failed++;
          else if (!row || row._syncStatus !== 'synced') pending++;
        });
        if (failed) return reject(new Error('Falló la escritura de ' + failed + ' registros.'));
        if (!pending) return resolve();
        if (Date.now() - start > 120000) {
          return reject(new Error('Tiempo de verificación agotado. Pendientes: ' + pending));
        }
        setTimeout(tick, 500);
      })();
    });
  }

  function waitCatalog(ids) {
    var expected = {};
    ids.forEach(function (id) { expected[id] = true; });

    return new Promise(function (resolve, reject) {
      var start = Date.now();
      (function tick() {
        var current = rawStatus() || {};
        var queue = Array.isArray(current.writeQueue) ? current.writeQueue : [];
        var errors = Array.isArray(current.writeErrors) ? current.writeErrors : [];
        var relevantErrors = errors.filter(function (item) {
          return item && item.collection === 'asesores' && expected[item.id];
        });
        if (relevantErrors.length) {
          return reject(new Error('No fue posible sincronizar el catálogo de asesores: ' + String(relevantErrors[0].error || 'escritura rechazada').slice(0, 180)));
        }

        var relevantPending = queue.filter(function (item) {
          return item && item.collection === 'asesores' && expected[item.id] && item.status === 'pending';
        });
        var missing = ids.filter(function (id) {
          var row = Orbit.store.get('asesores', id);
          return !row || row.configSource !== 'configuracion_catalogo';
        });

        if (!relevantPending.length && !missing.length) return resolve();
        if (Date.now() - start > 45000) {
          return reject(new Error(
            'La sincronización del catálogo de asesores no terminó. Pendientes: ' +
            relevantPending.length + '; faltantes: ' + missing.length + '.'
          ));
        }
        setTimeout(tick, 300);
      })();
    });
  }

  function validateAdvisorConfig(config) {
    if (!config || config.schemaVersion !== 'orbit360.tenant-advisors.v1') {
      throw new Error('Configuración de asesores inválida.');
    }
    if (config.tenantId !== tenant()) throw new Error('Tenant incorrecto en configuración de asesores.');
    if (!Array.isArray(config.advisors) || config.advisors.length !== 7) {
      throw new Error('El catálogo debe contener siete asesores.');
    }
    var ids = {};
    var names = {};
    config.advisors.forEach(function (row) {
      var id = String(row && row.id || '').trim();
      var name = String(row && row.nombre || '').trim();
      if (!id || !name || row.estado !== 'activo') throw new Error('Registro de asesor inválido.');
      if (ids[id] || names[n(name)]) throw new Error('Asesor duplicado en configuración.');
      ids[id] = 1;
      names[n(name)] = 1;
    });
    return config;
  }

  async function ensureAdvisorCatalog(auth) {
    if (S.advisorsReady) return;
    var response = await fetch(
      'data/tenant-config/alianzas-soluciones.asesores.json?v=20260715-1',
      { cache: 'no-store', credentials: 'same-origin' }
    );
    if (!response.ok) throw new Error('No fue posible leer la configuración de asesores.');
    var config = validateAdvisorConfig(await response.json());
    var ids = [];

    config.advisors.forEach(function (row) {
      Orbit.store.update('asesores', row.id, {
        id: row.id,
        tenantId: tenant(),
        nombre: row.nombre,
        name: row.nombre,
        displayName: row.nombre,
        aliases: Array.isArray(row.aliases) ? row.aliases : [],
        estado: 'activo',
        activo: true,
        configSource: 'configuracion_catalogo',
        configSchemaVersion: config.schemaVersion,
        configEffectiveDate: config.effectiveDate,
        accessProvisioned: false,
        labOnly: true,
        updatedBy: auth && auth.uid || 'orbit-lab-user'
      });
      ids.push(row.id);
    });

    Orbit.store.update('configuracion_catalogo', 'asesores-activos', {
      id: 'asesores-activos',
      tenantId: tenant(),
      schemaVersion: config.schemaVersion,
      source: config.source,
      effectiveDate: config.effectiveDate,
      advisorIds: ids.slice(),
      advisorCount: ids.length,
      status: 'active',
      labOnly: true,
      updatedBy: auth && auth.uid || 'orbit-lab-user'
    });

    await waitCatalog(ids);
    S.advisorsReady = true;
  }

  function replaceStoreCollection(name, rows) {
    if (!Orbit.store || typeof Orbit.store.raw !== 'function') {
      throw new Error('El almacenamiento LAB no está disponible.');
    }
    var raw = Orbit.store.raw() || {};
    var target = raw[name];
    if (!Array.isArray(target)) throw new Error('Colección LAB no disponible: ' + name + '.');
    target.splice(0, target.length);
    rows.forEach(function (row) { target.push(row); });
    if (typeof Orbit.store._emit === 'function') Orbit.store._emit(name);
  }

  async function readCriticalDirect(force) {
    var user = canonicalUser();
    if (!user) throw new Error('Inicia sesión.');

    if (window.OrbitLabImportReadiness) {
      if (force && typeof OrbitLabImportReadiness.loadCriticalCollections === 'function') {
        await OrbitLabImportReadiness.loadCriticalCollections(true);
      } else if (typeof OrbitLabImportReadiness.readiness === 'function') {
        await OrbitLabImportReadiness.readiness();
      }
      return status();
    }

    var db = null;
    try {
      db = window.firebase && typeof window.firebase.firestore === 'function'
        ? window.firebase.firestore()
        : null;
    } catch (error) {}
    if (!db || typeof db.collection !== 'function') {
      throw new Error('El servicio de datos LAB no está disponible.');
    }

    var names = ['clientes', 'aseguradoras', 'asesores'];
    await Promise.all(names.map(function (name) {
      return db.collection('tenantId').doc(tenant()).collection(name).get().then(function (snapshot) {
        var rows = [];
        snapshot.forEach(function (documentSnapshot) {
          var data = documentSnapshot.data() || {};
          rows.push(Object.assign({}, data, {
            id: data.id || documentSnapshot.id,
            tenantId: data.tenantId || tenant()
          }));
        });
        replaceStoreCollection(name, rows);
      });
    }));

    var current = status();
    current.snapshotAttached = true;
    current.snapshotMode = 'critical-one-shot-inline';
    return current;
  }

  function describeError(error) {
    var code = String(error && error.code || '').replace(/^firestore\//, '');
    if (code === 'permission-denied') return 'Permiso denegado para leer o configurar el entorno de validación.';
    if (code === 'unauthenticated') return 'La sesión LAB perdió autenticación.';
    return String(error && error.message || error || 'No fue posible preparar el dry-run.');
  }

  function modal(profileConfig) {
    var old = document.querySelector('[data-ays-initial-modal]');
    if (old) old.remove();

    var dialog = document.createElement('div');
    dialog.dataset.aysInitialModal = '1';
    dialog.style.cssText = 'position:fixed;inset:0;z-index:1200;background:rgba(15,18,22,.72);display:grid;place-items:center;padding:18px';
    dialog.innerHTML =
      '<div style="width:min(900px,100%);max-height:92vh;overflow:auto;background:var(--surface,#fff);color:var(--text,#1E2227);border-radius:16px;border:1px solid var(--line,#ddd)">' +
        '<div style="padding:18px;border-bottom:1px solid var(--line,#ddd);display:flex;justify-content:space-between;gap:12px">' +
          '<div><div class="page-sub">Importación controlada</div><h3 style="margin:3px 0">' + e(profileConfig.title) + '</h3><p class="muted" style="margin:0">' + e(profileConfig.description) + '</p></div>' +
          '<button class="btn secondary" data-x>Cerrar</button>' +
        '</div>' +
        '<div style="padding:18px;display:grid;gap:13px">' +
          '<div class="cfg-note">Carga esperada: 414 clientes, 26 retenidos y 26 aseguradoras. El archivo permanece en el navegador hasta confirmar.</div>' +
          '<input data-file type="file" accept=".json,application/json">' +
          '<div class="cfg-note" data-status>Selecciona el archivo sanitizado.</div>' +
          '<div data-summary></div>' +
          '<label style="display:flex;gap:8px"><input data-confirm type="checkbox" disabled><span>' + e(profileConfig.confirmationLabel) + '</span></label>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<button class="btn secondary" data-dry disabled>Preparar dry-run</button>' +
            '<button class="btn primary" data-write disabled>Confirmar carga</button>' +
            '<button class="btn secondary" data-report disabled>Descargar reporte</button>' +
            '<button class="btn secondary" data-rollback disabled>Rollback</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dialog);

    var q = function (selector) { return dialog.querySelector(selector); };
    var statusElement = q('[data-status]');
    var fileInput = q('[data-file]');
    var dryButton = q('[data-dry]');
    var writeButton = q('[data-write]');
    var reportButton = q('[data-report]');
    var rollbackButton = q('[data-rollback]');
    var confirmInput = q('[data-confirm]');

    function set(text, bad) {
      statusElement.textContent = text;
      statusElement.style.borderColor = bad ? 'var(--danger,#C5162E)' : 'var(--line,#ddd)';
    }

    q('[data-x]').onclick = function () { dialog.remove(); };

    fileInput.onchange = async function () {
      S.file = fileInput.files && fileInput.files[0];
      S.payload = null;
      dryButton.disabled = true;
      writeButton.disabled = true;
      reportButton.disabled = true;
      rollbackButton.disabled = true;
      confirmInput.disabled = true;
      confirmInput.checked = false;
      if (!S.file) return;

      try {
        var payload = JSON.parse(await S.file.text());
        var validation = validate(payload, profileConfig);
        if (!validation.ok) throw new Error(validation.errors.slice(0, 12).join(' | '));
        S.payload = payload;
        S.hash = await hash(S.file);
        set(
          'Archivo validado. ' + validation.warnings.length +
          ' aseguradoras conservarán estado pendiente de validación y uso restringido. Prepara el dry-run.'
        );
        dryButton.disabled = false;
      } catch (error) {
        set('Archivo bloqueado: ' + error.message, true);
      }
    };

    dryButton.onclick = async function () {
      dryButton.disabled = true;
      try {
        if (mode() !== profileConfig.requiredBackendMode) throw new Error('Abre el canal de validación de A&S.');
        if (tenant() !== profileConfig.tenantId) throw new Error('Tenant incorrecto.');

        set('Validando sesión y leyendo Clientes, Aseguradoras y Asesores…');
        var current = await readCriticalDirect(false);
        if (!current.auth || !current.auth.uid) throw new Error('Inicia sesión.');

        set('Sincronizando catálogo controlado de asesores…');
        await ensureAdvisorCatalog(current.auth);
        current = await readCriticalDirect(true);

        if (!allow(profileConfig)) throw new Error('Contrato de escritura no disponible.');
        var built = build(S.payload, profileConfig, S.file, S.hash);
        S.batch = built.batch;
        S.diff = built.diff;
        var counts = built.diff.counts;

        q('[data-summary]').innerHTML =
          '<div class="card pad" style="margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px">' +
            '<div>Clientes crear<br><b>' + counts.clientesCrear + '</b></div>' +
            '<div>Clientes actualizar<br><b>' + counts.clientesActualizar + '</b></div>' +
            '<div>Retenidos<br><b>' + counts.clientesRetenidos + '</b></div>' +
            '<div>Aseguradoras crear<br><b>' + counts.aseguradorasCrear + '</b></div>' +
            '<div>Aseguradoras actualizar<br><b>' + counts.aseguradorasActualizar + '</b></div>' +
            '<div>Aseguradoras pendientes<br><b>' + counts.aseguradorasPendientesValidacion + '</b></div>' +
            '<div>Bloqueos<br><b>' + counts.bloqueos + '</b></div>' +
          '</div>';

        reportButton.disabled = false;
        confirmInput.disabled = built.batch.hasBlockingErrors;
        writeButton.disabled = true;
        set(
          built.batch.hasBlockingErrors
            ? 'Dry-run bloqueado. No se escribió nada.'
            : 'Dry-run aprobado. Catálogo de asesores verificado; las aseguradoras pendientes quedarán restringidas.',
          built.batch.hasBlockingErrors
        );
      } catch (error) {
        set('Dry-run no disponible: ' + describeError(error), true);
      } finally {
        dryButton.disabled = !S.payload;
      }
    };

    confirmInput.onchange = function () {
      writeButton.disabled = !(confirmInput.checked && S.batch && !S.batch.hasBlockingErrors);
    };

    reportButton.onclick = function () {
      if (S.diff) download('DRY-RUN-' + S.diff.batchId + '.json', S.diff);
    };

    writeButton.onclick = async function () {
      writeButton.disabled = true;
      confirmInput.disabled = true;
      try {
        var current = status();
        if (!current.auth || !current.auth.uid) throw new Error('La sesión LAB no está activa.');
        var result = Orbit.importaWriteP0.writeBatch(S.batch, {
          approved: true,
          phrase: 'CONFIRMO ESCRITURA CONTROLADA',
          userId: current.auth.uid,
          reason: profileConfig.confirmationReason
        });
        S.rollback = result.rollback || [];
        if (!result.ok) throw new Error((result.errors || []).join(' | '));
        set('Escritura iniciada. Verificando…');
        await wait(S.batch);
        download('RESULTADO-' + S.batch.batchId + '.json', {
          status: 'WRITE_LAB_OK',
          completedAt: new Date().toISOString(),
          diff: S.diff,
          written: result.written,
          auditIds: result.auditIds || [],
          rollbackAvailable: !!S.rollback.length
        });
        rollbackButton.disabled = !S.rollback.length;
        set('Carga verificada. Ya puedes revisar Clientes y Aseguradoras.');
        setTimeout(function () { location.hash = '#/cliente360'; }, 800);
      } catch (error) {
        rollbackButton.disabled = !S.rollback || !S.rollback.length;
        set('No se pudo verificar la carga: ' + error.message, true);
      }
    };

    rollbackButton.onclick = function () {
      var current = status();
      if (!current.auth || !S.rollback) return;
      var result = Orbit.importaWriteP0.rollback(S.rollback, {
        approved: true,
        phrase: 'CONFIRMO ROLLBACK',
        userId: current.auth.uid,
        reason: 'Reversión de carga inicial A&S.'
      });
      download('ROLLBACK-' + (S.batch && S.batch.batchId || 'sin-lote') + '.json', {
        result: result,
        plan: S.rollback
      });
      set(result.ok ? 'Rollback solicitado.' : 'Rollback con errores.', !result.ok);
    };
  }

  function mount(host) {
    var profileConfig = profile();
    if (
      !profileConfig ||
      mode() !== profileConfig.requiredBackendMode ||
      !host ||
      host.querySelector('[data-ays-initial-card]')
    ) return;

    var page = host.querySelector('.page') || host;
    var card = document.createElement('div');
    card.dataset.aysInitialCard = '1';
    card.className = 'card pad';
    card.style.cssText = 'margin:0 0 18px;border:1px solid var(--red,#C5162E);display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap';
    card.innerHTML =
      '<div><b style="font-size:16px">' + e(profileConfig.title) + '</b>' +
      '<p class="muted" style="margin:5px 0">' + e(profileConfig.description) + '</p>' +
      '<small class="muted">Dry-run, confirmación y rollback.</small></div>' +
      '<button class="btn primary">Abrir carga inicial</button>';
    card.querySelector('button').onclick = function () { modal(profileConfig); };

    var header = page.querySelector('.page-head');
    if (header && header.nextSibling) page.insertBefore(card, header.nextSibling);
    else page.insertBefore(card, page.firstChild);
  }

  function patch() {
    var module = Orbit.modules && Orbit.modules.importar;
    if (!module || typeof module.render !== 'function') return false;
    if (module.__aysInitialPatched) return true;
    var originalRender = module.render;
    module.render = function (host) {
      originalRender(host);
      mount(host);
    };
    module.__aysInitialPatched = true;
    if (location.hash === '#/importar') {
      setTimeout(function () { mount(document.getElementById('host')); }, 0);
    }
    return true;
  }

  function init() {
    S.p = profile();
    if (!S.p) return;
    if (patch()) return;
    var attempts = 0;
    var timer = setInterval(function () {
      if (patch() || ++attempts > 40) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  Orbit.initialTenantImport = {
    validatePayload: validate,
    buildDryRun: build,
    currentProfile: profile,
    ensureAdvisorCatalog: ensureAdvisorCatalog
  };
})();
