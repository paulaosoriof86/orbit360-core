/* ============================================================
   Orbit 360 · Contrato visual reusable Cliente 360 + Aseguradoras
   2026-07-20

   - Proyección canónica de lectura sin escritura ni reimportación.
   - Cliente 360 consume Persona/Empresa, país y fechas normalizadas.
   - Aseguradoras presenta contactos, portales y campos de resumen
     con jerarquía, enlaces accionables y copia segura.
   - No modifica Orbit.store protegido ni datos persistidos.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};
  var Orbit = window.Orbit;
  if (Orbit.clientInsurerVisualContractV20260720) return;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function normalized(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function esc(value) {
    if (Orbit.ui && Orbit.ui.esc) return Orbit.ui.esc(clean(value));
    return clean(value).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; });
  }
  function clone(row) {
    if (!row || typeof row !== 'object') return row;
    return Object.assign({}, row);
  }
  function pick(row, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var value = row ? row[keys[i]] : undefined;
      if (value !== undefined && value !== null && clean(value) !== '') return value;
    }
    return '';
  }
  function normalizeType(value, row) {
    var text = normalized(value);
    if (/empresa|jurid|legal|sociedad|corporacion|compania|cia|fundacion|asociacion/.test(text)) return 'Empresa';
    if (/persona|natural|fisic|individual|particular/.test(text)) return 'Persona';
    var evidence = normalized(row && [row.tipoPersona, row.razonSocial, row.nombreEmpresa].filter(Boolean).join(' '));
    return /jurid|legal|empresa|sociedad|corporacion|compania|cia|fundacion|asociacion/.test(evidence) ? 'Empresa' : 'Persona';
  }
  function normalizeCountry(value, row) {
    var text = normalized(value);
    if (/requiere validacion|por validar|sin dato|pendiente/.test(text)) return 'REQUIERE_VALIDACION';
    if (/^co$|^col$|colombia|colombiano|colombiana/.test(text)) return 'CO';
    if (/^gt$|^gtm$|guatemala|guatemalteco|guatemalteca/.test(text)) return 'GT';
    var currency = normalized(row && row.moneda);
    if (currency === 'cop' || /peso colombiano/.test(currency)) return 'CO';
    if (currency === 'gtq' || /quetzal/.test(currency)) return 'GT';
    return 'REQUIERE_VALIDACION';
  }
  function normalizeDate(value) {
    if (value == null || value === '') return '';
    try {
      if (value && typeof value.toDate === 'function') value = value.toDate();
      if (value && typeof value === 'object' && Number.isFinite(value.seconds)) value = new Date(value.seconds * 1000);
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
      var raw = clean(value);
      if (!raw || /invalid|n\/a|s\/d|sin fecha/i.test(raw)) return '';
      var iso = raw.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
      if (iso) {
        var id = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
        return Number.isNaN(id.getTime()) ? '' : id.toISOString().slice(0, 10);
      }
      var latam = raw.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
      if (latam) {
        var ld = new Date(Date.UTC(+latam[3], +latam[2] - 1, +latam[1]));
        return Number.isNaN(ld.getTime()) ? '' : ld.toISOString().slice(0, 10);
      }
      var date = new Date(raw);
      return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
    } catch (error) { return ''; }
  }

  var CLIENT_ALIAS = {
    nombre: ['nombre', 'nombreCompleto', 'razonSocial'],
    identificacion: ['identificacion', 'numeroDocumento', 'documento', 'nit'],
    email: ['email', 'correo', 'contactoPrincipalCorreo'],
    telefono: ['telefono', 'whatsapp', 'telefonoAlterno', 'contactoPrincipalTelefono'],
    ciudad: ['ciudad', 'ciudadMunicipio', 'canton'],
    departamento: ['departamento', 'departamentoProvincia', 'provincia'],
    pais: ['pais', 'paisCodigo', 'codigoPais', 'country', 'nacionalidad'],
    fechaAlta: ['fechaAlta', 'fechaAltaOrigen', 'fechaCreacion', 'creadoEn', 'createdAt'],
    fechaNac: ['fechaNac', 'fechaNacimiento'],
    driveLink: ['driveLink', 'drive', 'expedienteUrl']
  };

  function projectClient(row) {
    if (!row || typeof row !== 'object') return row;
    var out = clone(row);
    Object.keys(CLIENT_ALIAS).forEach(function (key) {
      var value = pick(row, CLIENT_ALIAS[key]);
      if (value !== '' || out[key] === undefined) out[key] = value || out[key] || '';
    });
    out.tipo = normalizeType(out.tipo || out.tipoPersona, out);
    out.pais = normalizeCountry(out.pais, out);
    out.fechaAlta = normalizeDate(out.fechaAlta);
    out.fechaNac = normalizeDate(out.fechaNac);
    out.moneda = clean(out.moneda || (out.pais === 'CO' ? 'COP' : out.pais === 'GT' ? 'GTQ' : ''));
    out.segmento = clean(out.segmento || 'Nuevo');
    out.canal = clean(out.canal || out.canalOrigen || 'Migración');
    out.etiquetas = Array.isArray(out.etiquetas) ? out.etiquetas.slice() : [];
    out.__canonicalVisualProjection = '20260720.1';
    return out;
  }

  function installClientReadProjection() {
    var store = Orbit.store;
    if (!store || store.__clientCanonicalReadProjectionV20260720) return;
    var nativeAll = store.all.bind(store);
    var nativeWhere = store.where && store.where.bind(store);
    var nativeFind = store.find && store.find.bind(store);

    function projectedAll(collection) {
      var rows = nativeAll(collection) || [];
      return collection === 'clientes' ? rows.map(projectClient) : rows;
    }
    function evaluateWhere(rows, args) {
      var fieldOrPredicate = args[1];
      var opOrValue = args[2];
      var maybeValue = args[3];
      if (typeof fieldOrPredicate === 'function') {
        return rows.filter(function (row) { try { return !!fieldOrPredicate(row); } catch (error) { return false; } });
      }
      if (fieldOrPredicate && typeof fieldOrPredicate === 'object') {
        return rows.filter(function (row) {
          return Object.keys(fieldOrPredicate).every(function (key) { return row && row[key] === fieldOrPredicate[key]; });
        });
      }
      var field = fieldOrPredicate;
      var op = args.length >= 4 ? opOrValue : '==';
      var value = args.length >= 4 ? maybeValue : opOrValue;
      return rows.filter(function (row) {
        if (!row) return false;
        if (op === '==' || op === '=') return row[field] === value;
        if (op === '!=') return row[field] !== value;
        if (op === '>') return row[field] > value;
        if (op === '>=') return row[field] >= value;
        if (op === '<') return row[field] < value;
        if (op === '<=') return row[field] <= value;
        if (op === 'array-contains') return Array.isArray(row[field]) && row[field].indexOf(value) >= 0;
        return row[field] === value;
      });
    }

    store.all = function (collection) { return projectedAll(collection); };
    if (nativeWhere) {
      store.where = function () {
        if (arguments[0] !== 'clientes') return nativeWhere.apply(store, arguments);
        return evaluateWhere(projectedAll('clientes'), arguments);
      };
    }
    if (nativeFind) {
      store.find = function (collection, predicate) {
        if (collection !== 'clientes') return nativeFind.apply(store, arguments);
        if (typeof predicate === 'function') return projectedAll('clientes').find(predicate) || null;
        if (predicate && typeof predicate === 'object') return evaluateWhere(projectedAll('clientes'), [collection, predicate])[0] || null;
        return null;
      };
    }
    store.__clientCanonicalReadProjectionV20260720 = {
      version: '20260720.1', writesStore: false, reimportsData: false,
      nativeAll: nativeAll, nativeWhere: nativeWhere, nativeFind: nativeFind
    };
  }

  installClientReadProjection();

  Orbit.clientProjection = {
    version: '20260720.1',
    project: projectClient,
    get: function (id) { return projectClient(Orbit.store && Orbit.store.get ? Orbit.store.get('clientes', id) : null); },
    normalizeType: normalizeType,
    normalizeCountry: normalizeCountry,
    normalizeDate: normalizeDate,
    writesStore: false,
    reimportsData: false,
    createsRelations: false
  };
  Orbit.clientCanonicalViewProjectionV20260716 = {
    version: '20260720.1',
    projectCopy: projectClient,
    temporaryInPlaceBridge: false,
    writesStore: false,
    reimportsData: false,
    replacesRenderer: false
  };

  if (Orbit.q && typeof Orbit.q.clienteResumen === 'function' && !Orbit.q.__clientCanonicalResumenV20260720) {
    var nativeClientSummary = Orbit.q.clienteResumen.bind(Orbit.q);
    Orbit.q.clienteResumen = function (clientId) {
      var summary = nativeClientSummary(clientId) || {};
      var projected = projectClient(summary.cli || (Orbit.store && Orbit.store.get && Orbit.store.get('clientes', clientId)));
      return Object.assign({}, summary, {
        cli: projected,
        moneda: clean(summary.moneda || (projected && projected.moneda) || ((projected && projected.pais) === 'CO' ? 'COP' : 'GTQ'))
      });
    };
    Orbit.q.__clientCanonicalResumenV20260720 = true;
  }

  var viewState = { countryFilter: '' };
  document.addEventListener('change', function (event) {
    if (event.target && event.target.id === 'f-pais') viewState.countryFilter = event.target.value || '';
  }, true);

  function safeHref(value, type) {
    var raw = clean(value);
    if (!raw) return '';
    if (type === 'email') return 'mailto:' + raw;
    if (type === 'phone') return 'tel:' + raw.replace(/[^+0-9]/g, '');
    if (/^https?:\/\//i.test(raw)) return raw;
    return 'https://' + raw;
  }
  function copyButton(value, label) {
    if (!clean(value)) return '';
    return '<button type="button" class="m1-copy-btn" data-m1-copy="' + esc(value) + '" aria-label="Copiar ' + esc(label || 'valor') + '">Copiar</button>';
  }
  function valueAction(value, kind, label) {
    var raw = clean(value);
    if (!raw) return '<span class="m1-empty">Sin registrar</span>';
    var href = safeHref(raw, kind);
    var text = '<span class="m1-selectable">' + esc(raw) + '</span>';
    if (href) text = '<a class="m1-action-link" href="' + esc(href) + '"' + (kind === 'url' ? ' target="_blank" rel="noopener"' : '') + '>' + esc(raw) + '</a>';
    return '<span class="m1-value-actions">' + text + copyButton(raw, label) + '</span>';
  }
  function labelText(label) {
    var parts = [];
    Array.prototype.forEach.call(label.childNodes || [], function (node) {
      if (node.nodeType === 3 && clean(node.nodeValue)) parts.push(clean(node.nodeValue));
    });
    return clean(parts.join(' ')).replace(/[📁📞☎🌐🔗✉📧]/g, '').trim();
  }
  function controlValue(control) {
    if (!control) return '';
    if (control.tagName === 'SELECT') return clean(control.options[control.selectedIndex] && control.options[control.selectedIndex].text);
    return clean(control.value);
  }
  function fieldKind(label) {
    var key = normalized(label);
    if (/correo|email/.test(key)) return 'email';
    if (/telefono|celular|emergencia|asistencia/.test(key)) return 'phone';
    if (/sitio web|portal|plataforma|drive|repositorio|url|link/.test(key)) return 'url';
    return 'text';
  }

  function enhanceReadFields(root) {
    if (!root || root.querySelector('#af-guardar')) return;
    root.querySelectorAll('.asg-sec label.ce-l').forEach(function (label) {
      if (label.dataset.m1ReadField === '1') return;
      var control = label.querySelector('input,select,textarea');
      if (!control || !control.disabled) return;
      var title = labelText(label) || clean(control.placeholder) || 'Dato';
      var value = controlValue(control);
      if (control.type === 'date' && !value) value = '';
      label.dataset.m1ReadField = '1';
      label.classList.add('m1-read-field');
      control.classList.add('m1-source-control');
      var view = document.createElement('div');
      view.className = 'm1-read-field-view';
      view.innerHTML = '<span class="m1-read-label">' + esc(title) + '</span><div class="m1-read-value">' +
        (fieldKind(title) === 'text' ? (value ? '<span class="m1-selectable">' + esc(value) + '</span>' : '<span class="m1-empty">Sin registrar</span>') : valueAction(value, fieldKind(title), title)) + '</div>';
      label.appendChild(view);
    });
  }

  function enhanceClientContacts(root) {
    if (!root || root.querySelector('#af-guardar')) return;
    root.querySelectorAll('#af-contactos .asg-row[data-cont]').forEach(function (row) {
      if (row.dataset.m1ContactCard === '1') return;
      var name = controlValue(row.querySelector('[data-cn]'));
      var area = controlValue(row.querySelector('[data-ca]'));
      var email = controlValue(row.querySelector('[data-ce]'));
      var phone = controlValue(row.querySelector('[data-cl]'));
      var ext = controlValue(row.querySelector('[data-cext]'));
      var role = controlValue(row.querySelector('[data-cargo]'));
      var country = controlValue(row.querySelector('[data-cpais]'));
      var channel = controlValue(row.querySelector('[data-cchan]'));
      var status = controlValue(row.querySelector('[data-cvig]'));
      var preferred = controlValue(row.querySelector('[data-cgest]'));
      var principal = !!(row.querySelector('[data-cppal]') && row.querySelector('[data-cppal]').checked);
      var digits = phone.replace(/\D/g, '');
      var wa = '';
      if (digits.length >= 8) {
        if (digits.length <= 10) digits = (country === 'CO' ? '57' : '502') + digits;
        wa = 'https://wa.me/' + digits;
      }
      row.dataset.m1ContactCard = '1';
      row.className = 'm1-contact-card';
      row.innerHTML = '<div class="m1-contact-head"><div><strong>' + esc(name || 'Contacto sin nombre') + '</strong><span>' + esc([area, role].filter(Boolean).join(' · ') || 'Área por confirmar') + '</span></div>' +
        (principal ? '<span class="badge ok">Principal</span>' : '<span class="badge neutral">Contacto</span>') + '</div>' +
        '<div class="m1-contact-grid">' +
          '<div><span>Correo</span>' + valueAction(email, 'email', 'correo') + '</div>' +
          '<div><span>Teléfono</span>' + valueAction(phone, 'phone', 'teléfono') + (ext ? '<small>Ext. ' + esc(ext) + '</small>' : '') + '</div>' +
          '<div><span>País y canal</span><b>' + esc([country, channel].filter(Boolean).join(' · ') || 'Por confirmar') + '</b></div>' +
          '<div><span>Estado</span><b>' + esc(status || 'Por confirmar') + '</b></div>' +
          '<div class="m1-contact-wide"><span>Gestión preferida</span><b>' + esc(preferred || 'Por confirmar') + '</b></div>' +
        '</div>' +
        '<div class="m1-contact-actions">' +
          (email ? '<a class="btn ghost sm" href="mailto:' + esc(email) + '">Correo</a>' : '') +
          (phone ? '<a class="btn ghost sm" href="' + esc(safeHref(phone, 'phone')) + '">Llamar</a>' : '') +
          (wa ? '<a class="btn ghost sm" href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
        '</div>';
    });
  }

  function enhancePortals(root) {
    if (!root || root.querySelector('#af-guardar')) return;
    root.querySelectorAll('#af-portales .asg-row[data-portal]').forEach(function (row) {
      if (row.dataset.m1PortalCard === '1') return;
      var name = controlValue(row.querySelector('[data-pn]'));
      var type = controlValue(row.querySelector('[data-ptipo]'));
      var url = controlValue(row.querySelector('[data-pu]'));
      var country = controlValue(row.querySelector('[data-ppais]'));
      var status = controlValue(row.querySelector('[data-pest]'));
      var owner = controlValue(row.querySelector('[data-presp]'));
      var verified = controlValue(row.querySelector('[data-pver]'));
      row.dataset.m1PortalCard = '1';
      row.className = 'm1-portal-card';
      row.innerHTML = '<div class="m1-portal-head"><div><strong>' + esc(name || 'Plataforma sin nombre') + '</strong><span>' + esc([type, country].filter(Boolean).join(' · ') || 'Clasificación pendiente') + '</span></div><span class="badge ' + (/disponible/i.test(status) ? 'ok' : /actualiz/i.test(status) ? 'danger' : 'warn') + '">' + esc(status || 'Sin verificar') + '</span></div>' +
        '<div class="m1-portal-url"><span>URL</span>' + valueAction(url, 'url', 'URL') + '</div>' +
        '<div class="m1-portal-meta"><div><span>Responsable</span><b>' + esc(owner || 'Por confirmar') + '</b></div><div><span>Última verificación</span><b>' + esc(verified || 'Sin verificar') + '</b></div></div>' +
        (url ? '<div class="m1-contact-actions"><a class="btn primary sm" href="' + esc(safeHref(url, 'url')) + '" target="_blank" rel="noopener">Abrir plataforma</a></div>' : '');
    });
  }

  function enhanceBankRows(root) {
    if (!root || root.querySelector('#af-guardar')) return;
    root.querySelectorAll('#af-cuentas .asg-row[data-cta]').forEach(function (row) {
      if (row.dataset.m1BankCard === '1') return;
      var values = Array.prototype.map.call(row.children, function (child) { return clean(child.textContent); });
      var vault = row.querySelector('.vault-field');
      row.dataset.m1BankCard = '1';
      row.classList.add('m1-bank-card');
      if (!row.querySelector('.m1-bank-labels')) {
        var labels = document.createElement('div');
        labels.className = 'm1-bank-labels';
        labels.innerHTML = '<span>Banco</span><b>' + esc(values[0] || 'Sin registrar') + '</b><span>Tipo</span><b>' + esc(values[1] || 'Sin registrar') + '</b><span>Cuenta</span>' +
          (vault ? '<div class="m1-vault-slot"></div>' : '<b>Sin registrar</b>') + '<span>Moneda</span><b>' + esc(values[3] || 'Sin registrar') + '</b><span>Titular</span><b>' + esc(values[4] || 'Sin registrar') + '</b><span>Uso</span><b>' + esc(values[5] || 'Sin registrar') + '</b>';
        row.innerHTML = '';
        row.appendChild(labels);
        if (vault) labels.querySelector('.m1-vault-slot').appendChild(vault);
      }
    });
  }

  function enhanceClient360() {
    var root = document.getElementById('host');
    if (!root || location.hash.indexOf('#/cliente360') !== 0) return;
    var clients = Orbit.store && Orbit.store.all ? Orbit.store.all('clientes') : [];
    var rvCount = clients.filter(function (row) { return row.pais === 'REQUIERE_VALIDACION'; }).length;
    var countrySelect = root.querySelector('#f-pais');
    if (countrySelect) {
      if (!countrySelect.querySelector('option[value="REQUIERE_VALIDACION"]')) {
        var option = document.createElement('option');
        option.value = 'REQUIERE_VALIDACION';
        option.textContent = 'País por validar (' + rvCount + ')';
        countrySelect.appendChild(option);
      }
      if (viewState.countryFilter) countrySelect.value = viewState.countryFilter;
      if (!viewState.countryFilter && countrySelect.value) viewState.countryFilter = countrySelect.value;
      var controls = countrySelect.closest('.card') && countrySelect.closest('.card').querySelector('div');
      if (controls && !controls.querySelector('[data-m1-country-quality]')) {
        var quality = document.createElement('button');
        quality.type = 'button';
        quality.className = 'm1-quality-chip';
        quality.dataset.m1CountryQuality = '1';
        quality.textContent = 'País por validar · ' + rvCount;
        quality.addEventListener('click', function () {
          viewState.countryFilter = 'REQUIERE_VALIDACION';
          countrySelect.value = 'REQUIERE_VALIDACION';
          countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
        });
        controls.appendChild(quality);
      }
    }

    root.querySelectorAll('.fh-meta span').forEach(function (item) {
      if (/^Desde\s/i.test(clean(item.textContent))) {
        var bold = item.querySelector('b');
        if (bold && (!clean(bold.textContent) || /InvalidDate/i.test(bold.textContent))) bold.textContent = 'Sin fecha registrada';
      }
    });
    root.querySelectorAll('*').forEach(function (node) {
      if (node.children.length === 0 && /InvalidDate/.test(node.textContent || '')) node.textContent = (node.textContent || '').replace(/InvalidDate/g, 'Sin fecha registrada');
    });

    root.querySelectorAll('table.tbl tbody tr.clickable').forEach(function (row) {
      var onclick = clean(row.getAttribute('onclick'));
      var match = onclick.match(/c=([^'"&]+)/);
      var id = match && match[1];
      if (!id || !Orbit.store || !Orbit.store.where) return;
      var policies = Orbit.store.where('polizas', function (p) { return p.clienteId === id; });
      if (policies.length) return;
      var cells = row.querySelectorAll('td');
      if (cells[4]) cells[4].innerHTML = '<span class="badge neutral">Sin cartera cargada</span>';
      if (cells[5]) cells[5].innerHTML = '<span class="badge warn">Pendiente de información</span>';
    });
  }

  function enhanceInsurers() {
    var root = document.getElementById('asg-ficha');
    if (!root) return;
    root.classList.add('m1-asg-ficha');
    var hero = root.querySelector(':scope > .card > div:first-child');
    if (hero) hero.classList.add('m1-asg-hero');
    var body = root.querySelector('#af-body');
    if (!body) return;
    enhanceReadFields(root);
    enhanceClientContacts(root);
    enhancePortals(root);
    enhanceBankRows(root);
    if (Orbit.vault && Orbit.vault.wire) Orbit.vault.wire(root);
  }

  function enhance() {
    enhanceClient360();
    enhanceInsurers();
  }

  var scheduled = false;
  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      enhance();
    });
  }

  var host = document.getElementById('host');
  if (host && window.MutationObserver) {
    new MutationObserver(scheduleEnhance).observe(host, { childList: true, subtree: true });
  }
  window.addEventListener('hashchange', scheduleEnhance);
  document.addEventListener('orbit:session', scheduleEnhance);
  window.addEventListener('orbit:store:emit', scheduleEnhance);
  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-m1-copy]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    var value = button.dataset.m1Copy || '';
    var done = Orbit.vault && Orbit.vault.copyText ? Orbit.vault.copyText(value) : Promise.resolve(false);
    Promise.resolve(done).then(function (ok) {
      if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast(ok ? 'Copiado al portapapeles' : 'No se pudo copiar');
    });
  });

  document.documentElement.classList.add('orbit-m1-stable-ui');
  Orbit.clientInsurerVisualContractV20260720 = {
    version: '20260720.1',
    clientProjection: true,
    insurerSemanticView: true,
    visualStability: true,
    writesStore: false,
    reimportsData: false,
    exposesSecrets: false,
    enhance: enhance
  };
  scheduleEnhance();
})();
