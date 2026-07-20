export const CLIENT360_VALIDATOR_CONTRACT_VERSION = '1.0.27';
const EXPECTED_CLIENTS = 414;
const EXPECTED_TABS = ['resumen','polizas','vehiculos','cobros','recibos','renovaciones','siniestros','comisiones','correos','historial'];
const EXPECTED_CLIENT_PROJECTION_VERSION = '20260720.1';
const EXPECTED_VISUAL_CONTRACT_VERSION = '20260720.1';
const VISUAL_REPAIR_REVISION = 'visual-human-repair-v4-dom-contract';
const COUNTRY_DATA_CONTRACT_REVISION = 'country-data-contract-v2-source-region';
const EXPECTED_COUNTRY_COUNTS = { GT: 337, CO: 16, REQUIERE_VALIDACION: 61 };
const EXPECTED_TYPE_COUNTS = { Persona: 391, Empresa: 23 };

function assert(condition, code, detail = '') {
  if (!condition) throw new Error(`${code}${detail ? `:${detail}` : ''}`);
}
function clean(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }

export async function readSanitizedStoreCounts(page) {
  return page.evaluate(() => ({
    clientes: Orbit.store.all('clientes').length,
    aseguradoras: Orbit.store.all('aseguradoras').length,
    asesores: Orbit.store.all('asesores').length,
    polizas: Orbit.store.all('polizas').length,
    vehiculos: Orbit.store.all('vehiculos').length,
    cobros: Orbit.store.all('cobros').length,
    comisiones: Orbit.store.all('comisiones').length,
    reclamos: Orbit.store.all('reclamos').length,
    gestiones: Orbit.store.all('gestiones').length
  }));
}

export async function waitForRealTenantData(page, expectedInsurers = 26) {
  await page.waitForFunction(({ clients, insurers }) => {
    return window.Orbit && Orbit.store && Orbit.store.all &&
      Orbit.store.all('clientes').length === clients &&
      Orbit.store.all('aseguradoras').length === insurers;
  }, { clients: EXPECTED_CLIENTS, insurers: expectedInsurers }, { timeout: 45000 });
  const counts = await readSanitizedStoreCounts(page);
  assert(counts.clientes === EXPECTED_CLIENTS, 'CLIENT_COUNT_INVALID', String(counts.clientes));
  assert(counts.aseguradoras === expectedInsurers, 'INSURER_COUNT_INVALID', String(counts.aseguradoras));
  return counts;
}

async function readScopeState(page) {
  return page.evaluate(() => {
    const all = Orbit.store.all('clientes') || [];
    const access = Orbit.access;
    const scope = access && access.dataScope ? access.dataScope('cliente360') : 'all';
    const actorAdvisorId = access && access.actorAdvisorId ? String(access.actorAdvisorId() || '') : '';
    const scoped = access && access.filter ? access.filter('clientes', all, 'cliente360') : all;
    return {
      role: Orbit.session && Orbit.session.rol ? String(Orbit.session.rol() || '') : '',
      scope,
      actorAdvisorIdPresent: Boolean(actorAdvisorId),
      totalClients: all.length,
      scopedClients: scoped.length,
      ownConsistent: scope !== 'own' || scoped.every(row => String(row.asesorId || '') === actorAdvisorId)
    };
  });
}

async function readCanonicalDataset(page) {
  return page.evaluate(() => {
    const helper = Orbit.clientProjection || {};
    const rows = (Orbit.store.all('clientes') || []).map(row => helper.project ? helper.project(row) : row);
    return {
      helperVersion: helper.version || '',
      visualContractVersion: Orbit.clientInsurerVisualContractV20260720 && Orbit.clientInsurerVisualContractV20260720.version || '',
      visualContractWritesStore: Orbit.clientInsurerVisualContractV20260720 && Orbit.clientInsurerVisualContractV20260720.writesStore,
      visualContractReimportsData: Orbit.clientInsurerVisualContractV20260720 && Orbit.clientInsurerVisualContractV20260720.reimportsData,
      total: rows.length,
      personas: rows.filter(row => row.tipo === 'Persona').length,
      empresas: rows.filter(row => row.tipo === 'Empresa').length,
      gt: rows.filter(row => row.pais === 'GT').length,
      co: rows.filter(row => row.pais === 'CO').length,
      requiereValidacion: rows.filter(row => row.pais === 'REQUIERE_VALIDACION').length,
      invalidDates: rows.filter(row => /InvalidDate/i.test(String(row.fechaAlta || '')) || /InvalidDate/i.test(String(row.fechaNac || ''))).length,
      invalidTypes: rows.filter(row => !['Persona','Empresa'].includes(String(row.tipo || ''))).length,
      invalidCountries: rows.filter(row => !['GT','CO','REQUIERE_VALIDACION'].includes(String(row.pais || ''))).length
    };
  });
}

async function readVisualBootstrap(page) {
  return page.evaluate(() => {
    const state = window.OrbitTenantBootstrapState || {};
    const contracts = Orbit.router && Orbit.router.runtimeContractState ? Orbit.router.runtimeContractState : {};
    const clientState = contracts['data-orbit-client-projection-runtime-v20260716'] || {};
    const style = document.querySelector('link[data-orbit-m1-visual-style]');
    return {
      bootstrapVersion: state.visualContractVersion || '',
      requested: state.visualContractRequested === true,
      scriptPresent: Boolean(document.querySelector('script[data-orbit-m1-visual-contract]')),
      stylePresent: Boolean(style),
      styleLoaded: Boolean(style && style.sheet),
      stableClass: document.documentElement.classList.contains('orbit-m1-stable-ui'),
      routerProjectionStatus: clientState.status || '',
      routerProjectionExecutionMode: clientState.executionMode || '',
      loadedWithoutDynamicProjectionImport: clientState.status === 'ready' && !clientState.executionMode
    };
  });
}

async function probeStableNavigation(page) {
  await page.evaluate(() => {
    const host = document.getElementById('host');
    const state = window.__orbitM1StableProbe = {
      frames: 0,
      contentSeen: false,
      blankAfterContent: 0,
      directMutations: 0,
      startedAt: Date.now()
    };
    const observer = new MutationObserver(records => {
      state.directMutations += records.filter(record => record.target === host).length;
    });
    if (host) observer.observe(host, { childList: true });
    function sample() {
      const text = host ? String(host.innerText || '').trim() : '';
      if (text.length > 40) state.contentSeen = true;
      else if (state.contentSeen) state.blankAfterContent += 1;
      state.frames += 1;
      if (Date.now() - state.startedAt < 1200) requestAnimationFrame(sample);
      else observer.disconnect();
    }
    requestAnimationFrame(sample);
    location.hash = '#/cliente360';
  });
  await page.waitForTimeout(1350);
  return page.evaluate(() => window.__orbitM1StableProbe || null);
}

async function validateHumanResponsiveControls(page, label) {
  const state = await page.evaluate(() => {
    const visible = element => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    return {
      width: innerWidth,
      roleVisible: visible(document.getElementById('tb-rol')) && visible(document.getElementById('rol-sel')),
      moduleSearchVisible: visible(document.getElementById('f-q')) || visible(document.querySelector('.tb-search input')),
      technicalCopyVisible: /Usuario entorno de validación|dry-run|Firebase|Firestore|localStorage|mock|smoke/i.test(document.body.innerText)
    };
  });
  if (state.width <= 980) {
    assert(state.roleVisible, 'ROLE_SELECTOR_NOT_HUMAN_VISIBLE', label);
    assert(state.moduleSearchVisible, 'CLIENT_SEARCH_NOT_HUMAN_VISIBLE', label);
  }
  assert(!state.technicalCopyVisible, 'TECHNICAL_COPY_VISIBLE', label);
  return state;
}

async function validateCountryAndTypeFilters(page, report, label, scopeState) {
  if (scopeState.scope !== 'all') return;
  const result = await page.evaluate(async () => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const countRows = () => document.querySelectorAll('table.tbl tbody tr.clickable').length;
    async function apply(id, value) {
      const element = document.getElementById(id);
      if (!element) return null;
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(260);
      return countRows();
    }
    await apply('f-pais', '');
    await apply('f-tipo', '');
    const colombia = await apply('f-pais', 'CO');
    await apply('f-pais', '');
    const requiereValidacion = await apply('f-pais', 'REQUIERE_VALIDACION');
    await apply('f-pais', '');
    const personas = await apply('f-tipo', 'Persona');
    await apply('f-tipo', '');
    const empresas = await apply('f-tipo', 'Empresa');
    await apply('f-tipo', '');
    return {
      colombia,
      requiereValidacion,
      personas,
      empresas,
      qualityOptionPresent: Boolean(document.querySelector('#f-pais option[value="REQUIERE_VALIDACION"]')),
      qualityChipPresent: Boolean(document.querySelector('[data-m1-country-quality]')),
      rawTypeVisible: Array.from(document.querySelectorAll('table.tbl tbody tr.clickable td:first-child .muted'))
        .some(node => /\bnatural\b|\blegal\b/i.test(String(node.textContent || '')))
    };
  });
  report[`${label}CanonicalFilters`] = result;
  assert(result.colombia === EXPECTED_COUNTRY_COUNTS.CO, 'CLIENT_FILTER_CO_COUNT_INVALID', `${label}:${result.colombia}`);
  assert(result.requiereValidacion === EXPECTED_COUNTRY_COUNTS.REQUIERE_VALIDACION, 'CLIENT_FILTER_COUNTRY_VALIDATION_COUNT_INVALID', `${label}:${result.requiereValidacion}`);
  assert(result.personas === EXPECTED_TYPE_COUNTS.Persona, 'CLIENT_FILTER_PERSON_COUNT_INVALID', `${label}:${result.personas}`);
  assert(result.empresas === EXPECTED_TYPE_COUNTS.Empresa, 'CLIENT_FILTER_COMPANY_COUNT_INVALID', `${label}:${result.empresas}`);
  assert(result.qualityOptionPresent && result.qualityChipPresent, 'CLIENT_COUNTRY_VALIDATION_CONTROL_MISSING', label);
  assert(!result.rawTypeVisible, 'CLIENT_RAW_TYPE_VISIBLE', label);
}

async function validateInsurerVisualContract(page, report, label) {
  const ids = await page.evaluate(() => {
    const rows = Orbit.store.all('aseguradoras') || [];
    const withContacts = rows.find(row => (row.contactos || []).some(item => item && (item.email || item.tel || item.telefono)));
    const withPortal = rows.find(row => (row.portales || []).some(item => item && item.url));
    const withBank = rows.find(row => (row.cuentas || []).length);
    return {
      contact: withContacts && withContacts.id || '',
      portal: withPortal && withPortal.id || '',
      bank: withBank && withBank.id || ''
    };
  });
  assert(ids.contact, 'INSURER_CONTACT_EVIDENCE_MISSING', label);
  assert(ids.portal, 'INSURER_PORTAL_EVIDENCE_MISSING', label);
  assert(ids.bank, 'INSURER_BANK_EVIDENCE_MISSING', label);

  await page.evaluate(id => { location.hash = '#/aseguradoras?ficha=' + encodeURIComponent(id); }, ids.contact);
  await page.locator('#asg-ficha.m1-asg-ficha').waitFor({ state: 'visible', timeout: 15000 });
  const hero = await page.evaluate(() => {
    const root = document.querySelector('#asg-ficha');
    const element = root && root.querySelector('.m1-asg-hero');
    const rect = element && element.getBoundingClientRect();
    const style = element && getComputedStyle(element);
    return {
      visible: Boolean(element && rect && rect.width > 0 && rect.height > 60 && style.visibility !== 'hidden' && style.display !== 'none'),
      withinViewport: Boolean(rect && rect.left >= -2 && rect.right <= innerWidth + 2),
      width: innerWidth
    };
  });
  assert(hero.visible, 'INSURER_MOBILE_HERO_NOT_VISIBLE', label);
  if (hero.width <= 760) assert(hero.withinViewport, 'INSURER_MOBILE_HERO_OVERFLOW', label);

  await page.locator('[data-tab="contactos"]').click();
  await page.locator('.m1-contact-card').first().waitFor({ state: 'visible', timeout: 10000 });
  const contacts = await page.evaluate(() => ({
    cards: document.querySelectorAll('.m1-contact-card').length,
    mailLinks: document.querySelectorAll('.m1-contact-card a[href^="mailto:"]').length,
    phoneLinks: document.querySelectorAll('.m1-contact-card a[href^="tel:"]').length,
    copyButtons: document.querySelectorAll('.m1-contact-card [data-m1-copy]').length,
    labeled: Array.from(document.querySelectorAll('.m1-contact-card')).every(card => /Correo|Teléfono|País y canal|Estado/i.test(card.innerText))
  }));
  assert(contacts.cards > 0 && contacts.labeled, 'INSURER_CONTACT_HIERARCHY_MISSING', label);
  assert(contacts.mailLinks > 0, 'INSURER_EMAIL_LINK_MISSING', label);
  assert(contacts.phoneLinks > 0, 'INSURER_PHONE_LINK_MISSING', label);
  assert(contacts.copyButtons > 0, 'INSURER_CONTACT_COPY_MISSING', label);

  await page.evaluate(id => { location.hash = '#/aseguradoras?ficha=' + encodeURIComponent(id); }, ids.portal);
  await page.locator('#asg-ficha.m1-asg-ficha').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('[data-tab="plataformas"]').click();
  await page.locator('.m1-portal-card').first().waitFor({ state: 'visible', timeout: 10000 });
  const portals = await page.evaluate(() => ({
    cards: document.querySelectorAll('.m1-portal-card').length,
    openLinks: document.querySelectorAll('.m1-portal-card a[target="_blank"]').length,
    copyButtons: document.querySelectorAll('.m1-portal-card [data-m1-copy]').length,
    labeled: Array.from(document.querySelectorAll('.m1-portal-card')).every(card => /URL|Responsable|Última verificación/i.test(card.innerText))
  }));
  assert(portals.cards > 0 && portals.labeled, 'INSURER_PORTAL_HIERARCHY_MISSING', label);
  assert(portals.openLinks > 0, 'INSURER_PORTAL_LINK_MISSING', label);
  assert(portals.copyButtons > 0, 'INSURER_PORTAL_COPY_MISSING', label);

  await page.evaluate(id => { location.hash = '#/aseguradoras?ficha=' + encodeURIComponent(id); }, ids.bank);
  await page.locator('#asg-ficha.m1-asg-ficha').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('[data-tab="bancos"]').click();
  await page.locator('.m1-bank-card').first().waitFor({ state: 'visible', timeout: 10000 });
  const banks = await page.evaluate(() => ({
    cards: document.querySelectorAll('.m1-bank-card').length,
    labeled: Array.from(document.querySelectorAll('.m1-bank-card')).every(card => /Banco|Tipo|Cuenta|Moneda|Titular|Uso/i.test(card.innerText)),
    secureCopy: document.querySelectorAll('.m1-bank-card [data-vlt-copy]').length,
    secureReveal: document.querySelectorAll('.m1-bank-card [data-vlt-view]').length
  }));
  assert(banks.cards > 0 && banks.labeled, 'INSURER_BANK_HIERARCHY_MISSING', label);
  assert(banks.secureCopy > 0 && banks.secureReveal > 0, 'INSURER_BANK_SECURE_CONTROL_MISSING', label);

  report[`${label}InsurerVisualContract`] = {
    hero,
    contactCards: contacts.cards,
    portalCards: portals.cards,
    bankCards: banks.cards,
    actionableContacts: true,
    actionablePortals: true,
    secureBankControls: true
  };
}

export async function validateClient360(page, report, label) {
  report.contractVersion = CLIENT360_VALIDATOR_CONTRACT_VERSION;
  if (report.error == null) report.error = '';
  report.schemaVersion = 'orbit360-runtime-gate-joint-v27-visual-dom-v4';
  report.visualRepairRevision = VISUAL_REPAIR_REVISION;
  report.countryDataContractRevision = COUNTRY_DATA_CONTRACT_REVISION;

  const bootstrap = await readVisualBootstrap(page);
  report[`${label}VisualBootstrap`] = bootstrap;
  assert(bootstrap.bootstrapVersion === EXPECTED_VISUAL_CONTRACT_VERSION, 'M1_VISUAL_BOOTSTRAP_VERSION_MISMATCH', `${label}:${bootstrap.bootstrapVersion || 'missing'}`);
  assert(bootstrap.requested && bootstrap.scriptPresent && bootstrap.stylePresent && bootstrap.styleLoaded && bootstrap.stableClass, 'M1_VISUAL_BOOTSTRAP_INCOMPLETE', label);
  assert(bootstrap.loadedWithoutDynamicProjectionImport, 'CLIENT_PROJECTION_LOADED_LATE', `${label}:${bootstrap.routerProjectionStatus}/${bootstrap.routerProjectionExecutionMode || 'none'}`);

  const navigationProbe = await probeStableNavigation(page);
  report[`${label}NavigationStability`] = navigationProbe;
  assert(navigationProbe && navigationProbe.contentSeen, 'MODULE_CONTENT_NEVER_VISIBLE', label);
  assert(navigationProbe.blankAfterContent === 0, 'MODULE_DOUBLE_FLICKER_DETECTED', `${label}:${navigationProbe.blankAfterContent}`);

  await page.locator('table.tbl tbody tr.clickable').first().waitFor({ state: 'visible', timeout: 20000 });
  const scopeState = await readScopeState(page);
  report[`${label}ClientScope`] = scopeState;
  assert(scopeState.totalClients === EXPECTED_CLIENTS, 'CLIENT_TOTAL_NOT_414', `${label}:${scopeState.totalClients}`);
  assert(['all','team','own'].includes(scopeState.scope), 'CLIENT_SCOPE_INVALID', `${label}:${scopeState.scope}`);
  assert(scopeState.scopedClients > 0, 'CLIENT_SCOPE_EMPTY', `${label}:${scopeState.scope}`);
  assert(scopeState.ownConsistent, 'CLIENT_OWN_SCOPE_LEAK', label);
  if (scopeState.scope === 'own') assert(scopeState.actorAdvisorIdPresent, 'CLIENT_OWN_SCOPE_WITHOUT_ADVISOR', label);

  const dataset = await readCanonicalDataset(page);
  report[`${label}CanonicalDataset`] = dataset;
  assert(dataset.helperVersion === EXPECTED_CLIENT_PROJECTION_VERSION, 'CLIENT_CANONICAL_HELPER_VERSION_MISMATCH', `${label}:${dataset.helperVersion || 'missing'}`);
  assert(dataset.visualContractVersion === EXPECTED_VISUAL_CONTRACT_VERSION, 'M1_VISUAL_CONTRACT_VERSION_MISMATCH', `${label}:${dataset.visualContractVersion || 'missing'}`);
  assert(dataset.visualContractWritesStore === false && dataset.visualContractReimportsData === false, 'M1_VISUAL_CONTRACT_DATA_MUTATION_DECLARED', label);
  assert(dataset.total === EXPECTED_CLIENTS, 'CLIENT_CANONICAL_TOTAL_INVALID', `${label}:${dataset.total}`);
  assert(dataset.invalidTypes === 0, 'CLIENT_CANONICAL_TYPE_INVALID', `${label}:${dataset.invalidTypes}`);
  assert(dataset.invalidCountries === 0, 'CLIENT_CANONICAL_COUNTRY_INVALID', `${label}:${dataset.invalidCountries}`);
  assert(dataset.invalidDates === 0, 'CLIENT_CANONICAL_DATE_INVALID', `${label}:${dataset.invalidDates}`);
  assert(dataset.personas === EXPECTED_TYPE_COUNTS.Persona && dataset.empresas === EXPECTED_TYPE_COUNTS.Empresa, 'CLIENT_CANONICAL_TYPE_COUNTS_INVALID', `${label}:${dataset.personas}/${dataset.empresas}`);
  assert(
    dataset.gt === EXPECTED_COUNTRY_COUNTS.GT &&
    dataset.co === EXPECTED_COUNTRY_COUNTS.CO &&
    dataset.requiereValidacion === EXPECTED_COUNTRY_COUNTS.REQUIERE_VALIDACION,
    'CLIENT_CANONICAL_COUNTRY_COUNTS_INVALID',
    `${label}:${dataset.gt}/${dataset.co}/${dataset.requiereValidacion}`
  );

  const rows = page.locator('table.tbl tbody tr.clickable');
  report[`${label}VisibleClientRows`] = await rows.count();
  assert(report[`${label}VisibleClientRows`] === scopeState.scopedClients, 'CLIENT_LIST_SCOPE_COUNT_MISMATCH', `${label}:${report[`${label}VisibleClientRows`]}/${scopeState.scopedClients}`);

  const kpiText = clean(await page.locator('.kpi-row .kpi').first().innerText());
  report[`${label}ClientKpiExpectedCount`] = scopeState.scopedClients;
  report[`${label}ClientKpiMatchesScope`] = new RegExp(`\\b${scopeState.scopedClients}\\b`).test(kpiText);
  assert(report[`${label}ClientKpiMatchesScope`], 'CLIENT_KPI_SCOPE_MISMATCH', `${label}:${scopeState.scopedClients}`);
  if (scopeState.scope === 'all') {
    assert(new RegExp(`\\b${EXPECTED_TYPE_COUNTS.Empresa}\\s+empresas\\b`, 'i').test(kpiText), 'CLIENT_KPI_COMPANY_COUNT_INVALID', label);
    assert(new RegExp(`\\b${EXPECTED_TYPE_COUNTS.Persona}\\s+personas\\b`, 'i').test(kpiText), 'CLIENT_KPI_PERSON_COUNT_INVALID', label);
  }

  await validateCountryAndTypeFilters(page, report, label, scopeState);
  report[`${label}ResponsiveControls`] = await validateHumanResponsiveControls(page, label);

  await rows.first().click();
  await page.locator('.fichahdr').waitFor({ state: 'visible', timeout: 15000 });

  const projection = await page.evaluate(() => {
    const id = Orbit.route && Orbit.route.params && Orbit.route.params.c;
    const raw = id && Orbit.store.get('clientes', id);
    const helper = Orbit.clientProjection || {};
    const projected = raw && helper.project ? helper.project(raw) : raw;
    const bridge = Orbit.clientCanonicalViewProjectionV20260716 || {};
    return projected ? {
      helperVersion: helper.version || '',
      visualContractVersion: Orbit.clientInsurerVisualContractV20260720 && Orbit.clientInsurerVisualContractV20260720.version || '',
      temporaryBridge: bridge.temporaryInPlaceBridge === true,
      hasName: Boolean(projected.nombre),
      hasType: ['Persona','Empresa'].includes(projected.tipo),
      hasCountry: ['GT','CO','REQUIERE_VALIDACION'].includes(projected.pais),
      hasLabelsArray: Array.isArray(projected.etiquetas),
      policyCount: Orbit.store.where('polizas', p => p.clienteId === projected.id).length,
      bodyHasInvalidDate: /InvalidDate/i.test(document.body.innerText),
      bodyShowsHealthyEmptyRelations: /Cartera al día|Sin cobros pendientes|\bSalud\s*70\b/i.test(document.body.innerText),
      bodyShowsHonestEmptyRelations: /Cartera (aún no disponible|no cargada)|Calidad de datos|Pendiente|Sin pólizas cargadas/i.test(document.body.innerText)
    } : null;
  });
  report[`${label}ClientProjection`] = projection;
  assert(projection && projection.helperVersion === EXPECTED_CLIENT_PROJECTION_VERSION, 'CLIENT_CANONICAL_HELPER_VERSION_MISMATCH', `${label}:${projection && projection.helperVersion || 'missing'}`);
  assert(projection.visualContractVersion === EXPECTED_VISUAL_CONTRACT_VERSION, 'M1_VISUAL_CONTRACT_VERSION_MISMATCH', label);
  assert(!projection.temporaryBridge, 'CLIENT_CANONICAL_TEMPORARY_BRIDGE_STILL_ACTIVE', label);
  assert(projection.hasName && projection.hasType && projection.hasCountry && projection.hasLabelsArray, 'CLIENT_CANONICAL_FIELDS_INCOMPLETE', label);
  assert(!projection.bodyHasInvalidDate, 'CLIENT_INVALID_DATE_VISIBLE', label);
  if (projection.policyCount === 0) {
    assert(!projection.bodyShowsHealthyEmptyRelations, 'CLIENT_EMPTY_RELATIONS_SHOWN_AS_HEALTHY', label);
    assert(projection.bodyShowsHonestEmptyRelations, 'CLIENT_EMPTY_RELATIONS_NOT_HONEST', label);
  }

  const tabs = page.locator('#ficha-tabs [data-tab]');
  const tabKeys = await tabs.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-tab')));
  report[`${label}ClientTabs`] = tabKeys;
  EXPECTED_TABS.forEach(tab => assert(tabKeys.includes(tab), 'CLIENT_TAB_MISSING', `${label}:${tab}`));
  for (const tab of EXPECTED_TABS) {
    await page.locator(`#ficha-tabs [data-tab="${tab}"]`).click();
    await page.waitForTimeout(120);
    assert(await page.locator('#c360-body').count() === 1, 'CLIENT_TAB_BODY_MISSING', `${label}:${tab}`);
  }

  const bodyText = await page.locator('body').innerText();
  assert(!/Firebase|Firestore|localStorage|mock|smoke|dry-run|Usuario entorno de validación/i.test(bodyText), 'TECHNICAL_COPY_VISIBLE', label);

  await validateInsurerVisualContract(page, report, label);
  return true;
}
