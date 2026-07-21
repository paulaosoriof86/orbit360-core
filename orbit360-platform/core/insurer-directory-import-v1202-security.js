/* ============================================================
   Orbit 360 · Coordinador canónico del importador de directorios v1.221
   - el parser/dry-run permanece en insurer-directory-import-v1202.js;
   - proveedor protegido confirma antes de la escritura operativa;
   - merge no destructivo preserva IDs y referencias opacas existentes;
   - escritura durable, read-after-write y rollback son obligatorios;
   - no persiste contraseñas, usuarios ni cuentas completas en Orbit.store.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  'use strict';

  const D = Orbit.insurerDirectoryImport;
  if (!D || D.__canonicalCoordinatorV1221) return;

  const CONFIRM_PHRASE = D.CONFIRM_PHRASE || 'CONFIRMO DIRECTORIO';
  const CREDENTIAL_REF_RE = /^cred_[a-f0-9]{32}$/;
  const ACCOUNT_REF_RE = /^acct_[a-f0-9]{32}$/;
  const modalState = { result: null, country: '', fileName: '', options: {}, secureByReport: new Map() };

  const ERROR_COPY = {
    permiso_importacion_denegado: 'Tu rol activo no tiene permiso para confirmar esta importación.',
    dry_run_requerido: 'Primero completa la revisión previa del archivo.',
    confirmacion_reforzada_requerida: 'Completa el motivo y la frase de confirmación solicitada.',
    dry_run_con_bloqueos: 'Existen registros pendientes de validación. Corrige el mapeo antes de confirmar.',
    sin_operaciones_validadas: 'No hay registros validados disponibles para confirmar.',
    backend_operativo_requerido_para_aplicar_datos_reales: 'La conexión segura de la organización aún no está disponible.',
    proveedor_seguro_no_disponible: 'El servicio protegido no está disponible. No se realizó ningún cambio.',
    confirmacion_remota_incompleta: 'El servicio protegido no confirmó todos los recursos. No se realizó la importación.',
    escritura_durable_no_confirmada: 'No se pudo confirmar la escritura. Los cambios operativos fueron revertidos.',
    read_after_write_incompleto: 'La verificación posterior no coincide con el resultado aprobado. Los cambios fueron revertidos.',
    extraccion_segura_incompleta: 'El archivo contiene recursos protegidos que no pudieron vincularse de forma determinística.',
    xlsx_no_disponible: 'No fue posible leer el archivo. Verifica su formato y repite el proceso.',
    pais_directorio_requerido: 'Selecciona el país que corresponde al directorio.'
  };

  function S() { return Orbit.store; }
  function U() { return Orbit.ui || {}; }
  function A() { return Orbit.access || {}; }
  function clean(value, max) { return String(value == null ? '' : value).replace(/\u00a0/g, ' ').replace(/\u0000/g, '').trim().slice(0, max || 1000); }
  function fold(value) {
    return clean(value).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return Object.assign({}, value || {}); } }
  function today() { return U().today ? U().today() : new Date().toISOString().slice(0, 10); }
  function actor() { return A().actorUser ? A().actorUser() : { nombre: 'Usuario' }; }
  function tenantId() { return A().tenantId ? A().tenantId() : ((window.OrbitBackend && OrbitBackend.status && OrbitBackend.status().tenantId) || ''); }
  function isMeaningful(value) {
    if (value == null) return false;
    if (typeof value === 'string') return clean(value) !== '';
    return true;
  }
  function last4(value) {
    const digits = clean(value, 320).replace(/[^0-9]/g, '');
    return digits ? digits.slice(-4) : '';
  }
  function traceSheet(resource) { return clean(resource && resource.fuenteTraza && resource.fuenteTraza.hoja || resource && resource.source && resource.source.sheet, 240); }
  function traceRow(resource) {
    const value = resource && resource.fuenteTraza && resource.fuenteTraza.fila != null
      ? resource.fuenteTraza.fila
      : resource && resource.source && resource.source.row;
    return Number(value || 0);
  }
  function validCredentialRef(value) { return CREDENTIAL_REF_RE.test(clean(value, 80)); }
  function validAccountRef(value) { return ACCOUNT_REF_RE.test(clean(value, 80)); }
  function wipeSecure(items) {
    [].concat(items || []).forEach(item => {
      if (!item || typeof item !== 'object') return;
      ['username','password','accountNumber'].forEach(key => { if (key in item) item[key] = ''; });
    });
  }
  function friendlyError(value) {
    const key = clean(value, 240);
    if (!key) return '';
    if (ERROR_COPY[key]) return ERROR_COPY[key];
    if (/^[a-z0-9_]+$/i.test(key)) return 'La operación requiere una revisión adicional antes de continuar.';
    return key.replace(/\b(?:Orbit\.store|credentialRef|accountRef|backend_required|Firestore|Firebase|LAB|mock)\b/gi, 'configuración protegida');
  }

  function backendState() {
    try {
      if (window.OrbitBackend && typeof OrbitBackend.status === 'function') {
        const state = OrbitBackend.status() || {};
        if (state.mode || state.noFallback != null) return state;
      }
    } catch (error) {}
    try {
      const raw = S() && S().raw && S().raw();
      return raw && raw.__backend || {};
    } catch (error) { return {}; }
  }
  function backendWriteAllowed() {
    const state = backendState();
    const mode = clean(state.mode || state.adapter).toLowerCase();
    const tenant = clean(state.tenantId || state.tenant);
    return !!tenant && /firestore|backend|api|remote|production/.test(mode) && state.noFallback !== false;
  }
  function backendWriteErrorCount() {
    const state = backendState();
    return [].concat(state.writeErrors || []).length;
  }
  async function waitForStoreIdle(errorCountBefore, timeoutMs) {
    const started = Date.now();
    const timeout = Math.max(2000, Number(timeoutMs) || 20000);
    while (Date.now() - started < timeout) {
      const state = backendState();
      const errors = [].concat(state.writeErrors || []);
      if (errors.length > errorCountBefore) throw new Error('escritura_durable_no_confirmada');
      if (![].concat(state.writeQueue || []).length) {
        await new Promise(resolve => setTimeout(resolve, 120));
        const stable = backendState();
        if (![].concat(stable.writeQueue || []).length && [].concat(stable.writeErrors || []).length === errorCountBefore) return true;
      }
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    throw new Error('escritura_durable_no_confirmada');
  }

  function findHeaderIndex(row, aliases) {
    const normalized = (row || []).map(fold);
    for (let index = 0; index < normalized.length; index += 1) {
      if (aliases.some(alias => normalized[index] === alias || normalized[index].includes(alias))) return index;
    }
    return -1;
  }
  function rowAt(rows, oneBased) { return rows && oneBased > 0 ? (rows[oneBased - 1] || []) : []; }
  function findHeaderBefore(rows, sourceRow, predicate, maxBack) {
    const start = Math.max(0, Number(sourceRow || 1) - 1);
    for (let index = start; index >= Math.max(0, start - (maxBack || 8)); index -= 1) {
      if (predicate(rows[index] || [])) return index;
    }
    return -1;
  }
  function extractSecureItems(parsed, matrices) {
    const items = [];
    (parsed.candidates || []).forEach(candidate => {
      const sheet = candidate.sourceSheet;
      const rows = matrices[sheet] || [];
      (candidate.record && candidate.record.portales || []).forEach((portal, platformIndex) => {
        if (portal.credentialRef !== 'backend_required') return;
        const sourceRow = traceRow(portal);
        let username = '', password = '', url = portal.url || '', product = portal.nombre || '';
        if (candidate.country === 'GT') {
          const headerIndex = findHeaderBefore(rows, sourceRow, row => {
            const normalized = (row || []).map(fold);
            return normalized.some(value => value.includes('producto')) && normalized.some(value => value.includes('usuario'));
          }, 6);
          const header = headerIndex >= 0 ? rows[headerIndex] || [] : [];
          const source = rowAt(rows, sourceRow);
          const productIndex = findHeaderIndex(header, ['producto','sistema']);
          const linkIndex = findHeaderIndex(header, ['link','url']);
          const userIndex = findHeaderIndex(header, ['usuario']);
          const passwordIndex = findHeaderIndex(header, ['contrasena','password']);
          product = clean(source[productIndex]) || product;
          url = clean(source[linkIndex]) || url;
          username = clean(source[userIndex], 320);
          password = clean(source[passwordIndex], 512);
        } else {
          const productRowIndex = Math.max(0, sourceRow - 1);
          const productRow = rows[productRowIndex] || [];
          const columns = [1, 4];
          const column = columns.find(value => fold(productRow[value]) === fold(product)) || columns.find(value => clean(productRow[value])) || -1;
          if (column >= 0) {
            product = clean(productRow[column]) || product;
            url = clean((rows[productRowIndex + 1] || [])[column]) || url;
            username = clean((rows[productRowIndex + 2] || [])[column], 320);
            password = clean((rows[productRowIndex + 3] || [])[column], 512);
          }
        }
        if (username || password) items.push({
          type: 'credential', insurerSheet: sheet, platformIndex, sourceRow,
          username, password, url, product
        });
      });
      (candidate.record && candidate.record.cuentas || []).forEach((account, accountIndex) => {
        if (account.accountRef !== 'backend_required') return;
        const sourceRow = traceRow(account);
        const headerIndex = findHeaderBefore(rows, sourceRow, row => {
          const normalized = (row || []).map(fold);
          return normalized.some(value => value === 'banco') && normalized.some(value => value.includes('cuenta'));
        }, 7);
        const header = headerIndex >= 0 ? rows[headerIndex] || [] : [];
        const source = rowAt(rows, sourceRow);
        let bankIndex = findHeaderIndex(header, ['banco']);
        let accountNumberIndex = findHeaderIndex(header, ['no de cuenta','cuenta']);
        let accountTypeIndex = findHeaderIndex(header, ['tipo de cuenta','tipo cuenta']);
        if (candidate.country === 'CO') { bankIndex = 0; accountNumberIndex = 1; accountTypeIndex = 2; }
        const accountNumber = clean(source[accountNumberIndex], 240);
        if (accountNumber) items.push({
          type: 'bank_account', insurerSheet: sheet, accountIndex, sourceRow,
          accountNumber, bank: clean(source[bankIndex]) || account.banco,
          accountType: clean(source[accountTypeIndex]) || account.tipo,
          currency: account.moneda
        });
      });
    });
    return items;
  }
  function workbookToMatrices(workbook) {
    const matrices = {};
    (workbook.SheetNames || []).forEach(name => {
      matrices[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, blankrows: false, defval: '' });
    });
    return matrices;
  }
  function loadSheetJs() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((resolve, reject) => {
      const current = document.querySelector('script[data-orbit-sheetjs-v1221]');
      if (current) {
        current.addEventListener('load', () => resolve(window.XLSX), { once: true });
        current.addEventListener('error', () => reject(new Error('xlsx_no_disponible')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.dataset.orbitSheetjsV1221 = '1';
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('xlsx_no_disponible'));
      script.onerror = () => reject(new Error('xlsx_no_disponible'));
      document.head.appendChild(script);
    });
  }
  async function sha256(buffer) {
    if (!(window.crypto && window.crypto.subtle)) return '';
    const digest = await window.crypto.subtle.digest('SHA-256', buffer.slice(0));
    return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, '0')).join('');
  }
  async function parseFileCanonical(file, country) {
    await loadSheetJs();
    const buffer = await file.arrayBuffer();
    const sourceHash = await sha256(buffer);
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const matrices = workbookToMatrices(workbook);
    const parsed = D.parseMatrices(matrices, { country, fileName: file.name, sourceHash, captureSecure: false });
    const secureItems = extractSecureItems(parsed, matrices);
    Object.keys(matrices).forEach(key => { matrices[key] = []; });
    const expectedSecure = Number(parsed.report && parsed.report.sensitiveSummary && parsed.report.sensitiveSummary.credentials || 0) +
      Number(parsed.report && parsed.report.sensitiveSummary && parsed.report.sensitiveSummary.accounts || 0);
    if (secureItems.length !== expectedSecure) {
      wipeSecure(secureItems);
      throw new Error('extraccion_segura_incompleta');
    }
    modalState.secureByReport.set(parsed.report.reportId, secureItems);
    return parsed;
  }

  function mergeMeaningful(base, incoming, protectedKeys) {
    const out = clone(base || {});
    const protectedSet = new Set(protectedKeys || []);
    Object.keys(incoming || {}).forEach(key => {
      if (protectedSet.has(key)) return;
      const value = incoming[key];
      if (!isMeaningful(value)) return;
      if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
        out[key] = mergeMeaningful(out[key], value, []);
      } else out[key] = clone(value);
    });
    return out;
  }
  function accountKey(resource) {
    return [fold(resource && resource.banco), fold(resource && resource.tipo), clean(resource && resource.moneda, 20).toUpperCase(), last4(resource && (resource.numeroHint || resource.numero || resource.accountNumber))].join('|');
  }
  function portalKey(resource) {
    let host = '';
    try { host = new URL(resource && (resource.url || resource.urlHint) || 'https://invalid.local').hostname.replace(/^www\./i, ''); }
    catch (error) { host = clean(resource && resource.urlHint); }
    return [fold(resource && resource.nombre), fold(host), fold(resource && resource.tipo)].join('|');
  }
  function contactKey(resource) {
    return fold([resource && resource.email, resource && (resource.tel || resource.telefono), resource && resource.nombre, resource && resource.cargo].join('|'));
  }
  function preferredResource(left, right, refField, refValidator) {
    const leftProtected = refValidator(left && left[refField]);
    const rightProtected = refValidator(right && right[refField]);
    if (leftProtected && !rightProtected) return { keep: left, merge: right };
    if (rightProtected && !leftProtected) return { keep: right, merge: left };
    return { keep: left, merge: right };
  }
  function dedupeResources(resources, kind) {
    const keyFn = kind === 'account' ? accountKey : portalKey;
    const refField = kind === 'account' ? 'accountRef' : 'credentialRef';
    const refValidator = kind === 'account' ? validAccountRef : validCredentialRef;
    const out = [], byKey = new Map();
    [].concat(resources || []).forEach(resource => {
      const copy = clone(resource || {});
      const key = keyFn(copy);
      if (!key || key.endsWith('|')) { out.push(copy); return; }
      if (!byKey.has(key)) { byKey.set(key, out.length); out.push(copy); return; }
      const index = byKey.get(key);
      const chosen = preferredResource(out[index], copy, refField, refValidator);
      const merged = mergeMeaningful(chosen.keep, chosen.merge, ['id', refField]);
      merged.id = chosen.keep.id || chosen.merge.id;
      if (refValidator(chosen.keep[refField])) merged[refField] = chosen.keep[refField];
      else if (refValidator(chosen.merge[refField])) merged[refField] = chosen.merge[refField];
      out[index] = merged;
    });
    return out;
  }
  function findResourceMatch(resources, incoming, kind) {
    const id = clean(incoming && incoming.id, 160);
    if (id) {
      const direct = resources.findIndex(resource => clean(resource && resource.id, 160) === id);
      if (direct >= 0) return direct;
    }
    const sheet = traceSheet(incoming), row = traceRow(incoming);
    if (sheet && row) {
      const traced = resources.reduce((matches, resource, index) => {
        if (traceSheet(resource) === sheet && traceRow(resource) === row) matches.push(index);
        return matches;
      }, []);
      if (traced.length === 1) return traced[0];
      if (traced.length > 1) {
        const refValidator = kind === 'account' ? validAccountRef : validCredentialRef;
        const refField = kind === 'account' ? 'accountRef' : 'credentialRef';
        const protectedIndex = traced.filter(index => refValidator(resources[index] && resources[index][refField]));
        if (protectedIndex.length === 1) return protectedIndex[0];
      }
    }
    const keyFn = kind === 'account' ? accountKey : portalKey;
    const key = keyFn(incoming);
    const keyed = resources.reduce((matches, resource, index) => {
      if (key && keyFn(resource) === key) matches.push(index);
      return matches;
    }, []);
    if (keyed.length === 1) return keyed[0];
    if (keyed.length > 1) {
      const refValidator = kind === 'account' ? validAccountRef : validCredentialRef;
      const refField = kind === 'account' ? 'accountRef' : 'credentialRef';
      const protectedIndex = keyed.filter(index => refValidator(resources[index] && resources[index][refField]));
      if (protectedIndex.length === 1) return protectedIndex[0];
    }
    return -1;
  }
  function mergeResources(existing, incoming, kind) {
    const refField = kind === 'account' ? 'accountRef' : 'credentialRef';
    const refValidator = kind === 'account' ? validAccountRef : validCredentialRef;
    const resources = dedupeResources(existing, kind);
    [].concat(incoming || []).forEach(resource => {
      const index = findResourceMatch(resources, resource, kind);
      if (index < 0) { resources.push(clone(resource)); return; }
      const current = resources[index];
      const merged = mergeMeaningful(current, resource, ['id', refField]);
      merged.id = current.id || resource.id;
      if (refValidator(current[refField])) merged[refField] = current[refField];
      else if (refValidator(resource[refField])) merged[refField] = resource[refField];
      else merged[refField] = clean(resource[refField]) === 'backend_required' ? 'backend_required' : clean(current[refField]);
      resources[index] = merged;
    });
    return dedupeResources(resources, kind);
  }
  function mergeContacts(existing, incoming) {
    const out = [].concat(existing || []).map(clone), index = new Map();
    out.forEach((item, position) => { const key = contactKey(item); if (key) index.set(key, position); });
    [].concat(incoming || []).forEach(item => {
      const key = contactKey(item);
      if (!key) return;
      if (index.has(key)) out[index.get(key)] = mergeMeaningful(out[index.get(key)], item, ['id']);
      else { index.set(key, out.length); out.push(clone(item)); }
    });
    return out;
  }
  function applyMappings(data, insurerId, mappings) {
    [].concat(mappings || []).filter(mapping => clean(mapping && mapping.insurerId, 160) === clean(insurerId, 160)).forEach(mapping => {
      if (mapping.accountId && mapping.accountRef) {
        const index = (data.cuentas || []).findIndex((resource, position) => clean(resource && (resource.id || String(position)), 160) === clean(mapping.accountId, 160));
        if (index >= 0 && validAccountRef(mapping.accountRef)) {
          data.cuentas[index].accountRef = clean(mapping.accountRef, 80);
          data.cuentas[index].estado = mapping.available === false ? 'Requiere actualización' : 'Cuenta protegida disponible';
          delete data.cuentas[index].numero;
          delete data.cuentas[index].accountNumber;
        }
      }
      if (mapping.portalId && mapping.credentialRef) {
        const index = (data.portales || []).findIndex((resource, position) => clean(resource && (resource.id || String(position)), 160) === clean(mapping.portalId, 160));
        if (index >= 0 && validCredentialRef(mapping.credentialRef)) {
          data.portales[index].credentialRef = clean(mapping.credentialRef, 80);
          data.portales[index].estadoCredencial = mapping.available === false ? 'requiere_actualizacion' : 'registrada';
          data.portales[index].estadoAcceso = mapping.available === false ? 'Requiere actualización' : 'Acceso disponible';
        }
      }
    });
    return data;
  }
  function sanitizeOperationalData(data) {
    const out = clone(data || {});
    (out.portales || []).forEach(resource => {
      delete resource.usuario; delete resource.user; delete resource.username;
      delete resource.password; delete resource.contrasena;
    });
    (out.cuentas || []).forEach(resource => {
      delete resource.numero; delete resource.accountNumber;
    });
    delete out.validationStatus;
    return out;
  }
  function mergeInsurer(existing, incoming, mappings, sourceSheet) {
    const base = clone(existing || {});
    const merged = mergeMeaningful(base, incoming || {}, ['id','contactos','portales','cuentas','ramos','docs','actividad','vinculada','color']);
    merged.id = clean(base.id || incoming.id, 160);
    merged.tenantId = base.tenantId || incoming.tenantId || tenantId();
    merged.vinculada = base.vinculada !== false;
    merged.color = base.color || incoming.color || '#1f3a5f';
    merged.ramos = clone(base.ramos || incoming.ramos || []);
    merged.docs = clone(base.docs || incoming.docs || []);
    merged.contactos = mergeContacts(base.contactos, incoming.contactos);
    merged.portales = mergeResources(base.portales, incoming.portales, 'portal');
    merged.cuentas = mergeResources(base.cuentas, incoming.cuentas, 'account');
    applyMappings(merged, merged.id, mappings);
    merged.actividad = [].concat(base.actividad || [], [{ fecha: today(), cambio: 'Directorio actualizado con merge no destructivo', responsable: actor().nombre || 'Usuario', fuente: sourceSheet }]);
    const credentialsStored = (merged.portales || []).filter(resource => validCredentialRef(resource.credentialRef)).length;
    const accountsStored = (merged.cuentas || []).filter(resource => validAccountRef(resource.accountRef)).length;
    merged.sensitiveImportStatus = Object.assign({}, base.sensitiveImportStatus || {}, incoming.sensitiveImportStatus || {}, {
      status: 'stored_securely', credentialsStored, accountsStored, updatedAt: new Date().toISOString()
    });
    return sanitizeOperationalData(merged);
  }
  function validateResolved(incoming, merged) {
    const accountUnresolved = [].concat(incoming && incoming.cuentas || []).filter(resource => clean(resource.accountRef) === 'backend_required').some(resource => {
      const index = findResourceMatch(merged.cuentas || [], resource, 'account');
      return index < 0 || !validAccountRef(merged.cuentas[index].accountRef);
    });
    const portalUnresolved = [].concat(incoming && incoming.portales || []).filter(resource => clean(resource.credentialRef) === 'backend_required').some(resource => {
      const index = findResourceMatch(merged.portales || [], resource, 'portal');
      return index < 0 || !validCredentialRef(merged.portales[index].credentialRef);
    });
    if (accountUnresolved || portalUnresolved) throw new Error('confirmacion_remota_incompleta');
    const duplicateAccounts = new Set(), duplicatePortals = new Set();
    (merged.cuentas || []).forEach(resource => { const key = accountKey(resource); if (!key || key.endsWith('|')) return; if (duplicateAccounts.has(key)) throw new Error('read_after_write_incompleto'); duplicateAccounts.add(key); });
    (merged.portales || []).forEach(resource => { const key = portalKey(resource); if (!key || key.endsWith('|')) return; if (duplicatePortals.has(key)) throw new Error('read_after_write_incompleto'); duplicatePortals.add(key); });
    return true;
  }
  function readBackMatches(expected, actual) {
    if (!actual || clean(actual.id, 160) !== clean(expected.id, 160)) return false;
    const expectedAccounts = (expected.cuentas || []).map(resource => [clean(resource.id,160), clean(resource.accountRef,80), accountKey(resource)].join('|')).sort();
    const actualAccounts = (actual.cuentas || []).map(resource => [clean(resource.id,160), clean(resource.accountRef,80), accountKey(resource)].join('|')).sort();
    const expectedPortals = (expected.portales || []).map(resource => [clean(resource.id,160), clean(resource.credentialRef,80), portalKey(resource)].join('|')).sort();
    const actualPortals = (actual.portales || []).map(resource => [clean(resource.id,160), clean(resource.credentialRef,80), portalKey(resource)].join('|')).sort();
    return JSON.stringify(expectedAccounts) === JSON.stringify(actualAccounts) && JSON.stringify(expectedPortals) === JSON.stringify(actualPortals);
  }
  async function waitForSecureProvider(timeoutMs) {
    const started = Date.now();
    while (Date.now() - started < Math.max(2000, Number(timeoutMs) || 12000)) {
      if (Orbit.secureImport && typeof Orbit.secureImport.importInsurerDirectory === 'function') return Orbit.secureImport.importInsurerDirectory;
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    return null;
  }
  function targetKey(item) {
    return item.type === 'bank_account'
      ? ['bank_account', clean(item.insurerId,160), clean(item.accountId,160)].join('|')
      : ['credential', clean(item.insurerId,160), clean(item.portalId,160)].join('|');
  }
  function mappingKey(mapping) {
    return mapping && mapping.accountId
      ? ['bank_account', clean(mapping.insurerId,160), clean(mapping.accountId,160)].join('|')
      : ['credential', clean(mapping && mapping.insurerId,160), clean(mapping && mapping.portalId,160)].join('|');
  }
  async function confirmSecureResources(result, secureItems) {
    if (!secureItems.length) return { mappings: [], imported: 0, requested: 0 };
    const provider = await waitForSecureProvider(12000);
    if (typeof provider !== 'function') throw new Error('proveedor_seguro_no_disponible');
    const bridge = Orbit.__insurerSecureTargetBridgeV20260720;
    if (!bridge || typeof bridge.enrich !== 'function') throw new Error('proveedor_seguro_no_disponible');
    const enrichedPayload = bridge.enrich({
      tenantId: tenantId(), sourceFileName: result.report.sourceFileName,
      sourceHash: result.report.sourceHash, items: secureItems
    });
    const enrichedItems = [].concat(enrichedPayload.items || []);
    if (enrichedItems.length !== secureItems.length || enrichedItems.some(item => !item.insurerId || (item.type === 'bank_account' ? !item.accountId : !item.portalId))) {
      throw new Error('extraccion_segura_incompleta');
    }
    const expectedTargets = enrichedItems.map(targetKey);
    const errorCount = backendWriteErrorCount();
    let remote;
    try { remote = await provider(enrichedPayload); }
    finally { wipeSecure(enrichedItems); wipeSecure(secureItems); }
    const mappings = [].concat(remote && remote.mappings || []);
    const mappedTargets = new Set(mappings.map(mappingKey));
    const referencesValid = mappings.every(mapping => mapping.accountId ? validAccountRef(mapping.accountRef) : validCredentialRef(mapping.credentialRef));
    if (!remote || remote.ok !== true || Number(remote.imported || 0) !== expectedTargets.length || mappings.length !== expectedTargets.length || !referencesValid || expectedTargets.some(key => !mappedTargets.has(key))) {
      throw new Error('confirmacion_remota_incompleta');
    }
    await waitForStoreIdle(errorCount, 20000);
    return { mappings, imported: Number(remote.imported || 0), requested: expectedTargets.length };
  }
  async function rollbackSnapshots(snapshots, insertedIds) {
    let ok = true;
    for (const id of insertedIds.slice().reverse()) {
      try {
        const errors = backendWriteErrorCount();
        S().remove('aseguradoras', id);
        await waitForStoreIdle(errors, 20000);
      } catch (error) { ok = false; }
    }
    for (const [id, snapshot] of snapshots.entries()) {
      try {
        const errors = backendWriteErrorCount();
        S().update('aseguradoras', id, clone(snapshot));
        await waitForStoreIdle(errors, 20000);
      } catch (error) { ok = false; }
    }
    return ok;
  }

  async function applyApproved(result, confirmation) {
    if (!D.canManage()) return { ok: false, errors: ['permiso_importacion_denegado'] };
    if (!backendWriteAllowed()) return { ok: false, errors: ['backend_operativo_requerido_para_aplicar_datos_reales'] };
    if (!result || !result.report) return { ok: false, errors: ['dry_run_requerido'] };
    if (!confirmation || confirmation.approved !== true || confirmation.phrase !== CONFIRM_PHRASE || !clean(confirmation.reason)) {
      return { ok: false, errors: ['confirmacion_reforzada_requerida'] };
    }
    const operations = [].concat(result.report._operations || []);
    const blocked = operations.filter(operation => operation && operation.data && (operation.data.requiereValidacion || operation.data.validationStatus !== 'validado'));
    if (blocked.length) return { ok: false, errors: ['dry_run_con_bloqueos'], blocked: blocked.length };
    if (!operations.length) return { ok: false, errors: ['sin_operaciones_validadas'] };

    const secureItems = modalState.secureByReport.get(result.report.reportId) || [];
    const snapshots = new Map(), insertedIds = [];
    let secureConfirmation = { mappings: [], imported: 0, requested: 0 };
    try {
      secureConfirmation = await confirmSecureResources(result, secureItems);
      modalState.secureByReport.delete(result.report.reportId);

      const plans = operations.map((operation, operationIndex) => {
        const existing = operation.id && S().get('aseguradoras', operation.id) || null;
        const targetId = clean(existing && existing.id || operation.id || operation.data && operation.data.id || ('asg_' + Date.now().toString(36) + '_' + String(operationIndex + 1).padStart(2, '0')), 160);
        if (existing) snapshots.set(existing.id, clone(existing));
        const incoming = Object.assign({}, operation.data || {}, { id: targetId });
        const merged = mergeInsurer(existing || { id: targetId, tenantId: tenantId() }, incoming, secureConfirmation.mappings, operation.sourceSheet);
        validateResolved(incoming, merged);
        return { action: existing ? 'update' : 'insert', id: targetId, data: merged };
      });

      for (const plan of plans) {
        const errors = backendWriteErrorCount();
        if (plan.action === 'update') S().update('aseguradoras', plan.id, plan.data);
        else { S().insert('aseguradoras', plan.data); insertedIds.push(plan.id); }
        await waitForStoreIdle(errors, 20000);
        const actual = S().get('aseguradoras', plan.id);
        if (!readBackMatches(plan.data, actual)) throw new Error('read_after_write_incompleto');
      }

      try {
        const errors = backendWriteErrorCount();
        S().insert('actividades', {
          id: 'act_' + Date.now().toString(36), tenantId: tenantId(), tipo: 'importacion', icon: '🏢', fecha: today(),
          titulo: 'Directorio de aseguradoras actualizado',
          detalle: plans.length + ' registro(s) · merge no destructivo · recursos protegidos confirmados',
          fuente: D.SOURCE_TYPE, containsSecrets: false
        });
        await waitForStoreIdle(errors, 20000);
      } catch (error) {}

      if (A().audit) A().audit('aplicar_directorio_aseguradoras_atomico', 'aseguradoras', result.report.reportId, null, {
        operations: plans.length, secureImported: secureConfirmation.imported,
        providerConfirmedBeforeWrite: true, durableWriteConfirmed: true, readAfterWrite: true,
        rollbackPrepared: true, containsSecrets: false
      }, confirmation.reason, {
        sourceHash: result.report.sourceHash, sourceFileName: result.report.sourceFileName,
        confirmationPhrase: CONFIRM_PHRASE, owner: 'insurer-directory-import-coordinator-v1221'
      });
      return {
        ok: true,
        inserted: plans.filter(plan => plan.action === 'insert').length,
        updated: plans.filter(plan => plan.action === 'update').length,
        blocked: 0,
        secureStatus: secureConfirmation.requested ? 'confirmado_backend_seguro' : 'sin_sensibles',
        providerConfirmedBeforeWrite: true,
        durableWriteConfirmed: true,
        readAfterWrite: true,
        rollbackPrepared: true
      };
    } catch (error) {
      wipeSecure(secureItems);
      modalState.secureByReport.delete(result.report.reportId);
      const rollbackOk = await rollbackSnapshots(snapshots, insertedIds);
      return {
        ok: false,
        errors: [friendlyError(error && error.message || 'escritura_durable_no_confirmada')],
        errorCode: clean(error && error.message, 120),
        rollbackAttempted: snapshots.size > 0 || insertedIds.length > 0,
        rollbackOk,
        providerConfirmed: secureConfirmation.imported > 0,
        containsSecrets: false
      };
    }
  }

  function esc(value) { return U().esc ? U().esc(clean(value)) : clean(value); }
  function toast(value) { try { U().toast(value); } catch (error) {} }
  function close() {
    modalState.secureByReport.forEach(wipeSecure);
    modalState.secureByReport.clear();
    modalState.result = null; modalState.country = ''; modalState.fileName = ''; modalState.options = {};
    const modal = document.getElementById('ins-dir-import-v1202');
    if (modal) modal.remove();
  }
  function reportHtml(result) {
    const report = result.report || {}, totals = report.totals || {};
    const rows = (report.sheetSummary || []).map(summary => `<tr><td>${esc(summary.sheet)}</td><td>${esc(summary.country)}</td><td class="num">${summary.contacts}</td><td class="num">${summary.platforms}</td><td class="num">${summary.accounts}</td><td>${summary.alerts && summary.alerts.length ? '<span class="badge warn">Revisar</span>' : '<span class="badge ok">Lista</span>'}</td></tr>`).join('');
    return `<div class="cfg-note" style="margin-bottom:12px"><b>Importación protegida:</b> completa registros existentes sin borrar información válida. Los recursos protegidos se confirman antes de actualizar el directorio.</div>
      <div class="asg197-info-grid"><div><small>Operaciones</small><b>${totals.operations || 0}</b></div><div><small>Crear</small><b>${totals.insert || 0}</b></div><div><small>Actualizar</small><b>${totals.update || 0}</b></div><div><small>Requieren revisión</small><b>${totals.blocked || 0}</b></div><div><small>Accesos protegidos</small><b>${report.sensitiveSummary && report.sensitiveSummary.credentials || 0}</b></div><div><small>Cuentas protegidas</small><b>${report.sensitiveSummary && report.sensitiveSummary.accounts || 0}</b></div></div>
      <div style="overflow:auto;margin-top:12px"><table class="tbl"><thead><tr><th>Hoja</th><th>País</th><th class="num">Contactos</th><th class="num">Plataformas</th><th class="num">Bancos/pagos</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function paint() {
    const modal = document.getElementById('ins-dir-import-v1202');
    if (!modal) return;
    const result = modalState.result;
    const blocked = Number(result && result.report && result.report.totals && result.report.totals.blocked || 0);
    modal.innerHTML = `<div class="card" style="width:min(980px,97vw);max-height:94vh;display:flex;flex-direction:column;padding:0"><div style="padding:17px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;gap:12px"><div><small style="color:rgba(255,255,255,.65)">Importación inteligente</small><b style="display:block;color:#fff;font-family:var(--f-display);font-size:18px">Directorio de aseguradoras</b></div><button class="imp-x" data-close style="color:#fff">✕</button></div><div style="padding:18px 20px;overflow:auto;flex:1">
      ${result ? reportHtml(result) : '<div class="cfg-note" style="margin-bottom:13px">Selecciona el país y el archivo del directorio. La revisión no modifica información.</div><div class="cgrid"><label class="ce-l">País del directorio *<select id="idir-country" class="o-sel"><option value="">— Seleccionar —</option><option value="GT">Guatemala · GTQ</option><option value="CO">Colombia · COP</option></select></label><label class="ce-l">Archivo Excel *<input id="idir-file" type="file" accept=".xlsx,.xls" class="o-sel"></label></div><div id="idir-status" class="muted" style="margin-top:13px">Listo para revisar el archivo.</div>'}
      </div><div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">${result ? '<button class="btn ghost" data-reset>Elegir otro archivo</button>' : ''}${result && !blocked ? '<button class="btn primary" data-approve>Confirmar importación validada</button>' : ''}<button class="btn ghost" data-close>Cerrar</button></div></div>`;
    modal.querySelectorAll('[data-close]').forEach(button => { button.onclick = close; });
    const reset = modal.querySelector('[data-reset]');
    if (reset) reset.onclick = () => { const options = modalState.options; close(); open(options); };
    const file = modal.querySelector('#idir-file');
    if (file) file.onchange = async () => {
      const country = clean(modal.querySelector('#idir-country').value).toUpperCase();
      const status = modal.querySelector('#idir-status');
      if (!country) { file.value = ''; toast(ERROR_COPY.pais_directorio_requerido); return; }
      if (!file.files || !file.files[0]) return;
      status.textContent = 'Revisando estructura, identidades y recursos…';
      try {
        modalState.country = country; modalState.fileName = file.files[0].name;
        modalState.result = await parseFileCanonical(file.files[0], country);
        paint();
      } catch (error) {
        status.textContent = friendlyError(error && error.message || 'xlsx_no_disponible');
      }
    };
    const approve = modal.querySelector('[data-approve]');
    if (approve) approve.onclick = async () => {
      const reason = clean(await U().prompt('Motivo de la importación:', { title: 'Confirmar directorio' }));
      if (!reason) return;
      const phrase = clean(await U().prompt('Escribe exactamente: ' + CONFIRM_PHRASE, { title: 'Confirmación reforzada' }));
      approve.disabled = true; approve.textContent = 'Confirmando recursos y escritura…';
      const applied = await applyApproved(modalState.result, { approved: true, phrase, reason });
      if (!applied.ok) {
        approve.disabled = false; approve.textContent = 'Confirmar importación validada';
        toast((applied.errors || []).join(' '));
        return;
      }
      const done = modalState.options && modalState.options.onDone;
      close();
      toast(applied.updated + ' aseguradora(s) actualizada(s) · ' + applied.inserted + ' creada(s). Recursos protegidos confirmados.');
      if (done) done(applied);
      else if (Orbit.modules && Orbit.modules.aseguradoras && Orbit.modules.aseguradoras.render) Orbit.modules.aseguradoras.render(document.getElementById('host'));
    };
  }
  function open(options) {
    if (!D.canManage()) return toast(ERROR_COPY.permiso_importacion_denegado);
    close();
    const modal = document.createElement('div');
    modal.id = 'ins-dir-import-v1202'; modal.className = 'drawer-back open';
    modal.style.cssText = 'display:grid;place-items:center;z-index:250';
    modalState.options = options || {};
    document.body.appendChild(modal); paint();
  }

  D.applyApproved = applyApproved;
  D.open = open;
  D.close = close;
  D.backendWriteAllowed = backendWriteAllowed;
  D.backendState = backendState;
  D.friendlyImportError = friendlyError;
  D.parseFileCanonical = parseFileCanonical;
  D.__canonicalCoordinatorV1221 = {
    owner: 'insurer-directory-import-coordinator-v1221',
    parser: 'insurer-directory-import-v1202.js',
    providerConfirmedBeforeWrite: true,
    mergeNonDestructive: true,
    durableWriteRequired: true,
    readAfterWriteRequired: true,
    rollbackRequired: true,
    partialApplyAllowed: false,
    noSecretPersistence: true
  };
})();
