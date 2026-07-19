export const CLIENT360_VALIDATOR_CONTRACT_VERSION = '1.0.27';
const EXPECTED_CLIENTS = 414;
const EXPECTED_TABS = ['resumen','polizas','vehiculos','cobros','recibos','renovaciones','siniestros','comisiones','correos','historial'];
const EXPECTED_CLIENT_PROJECTION_VERSION = '20260719.2';
const EXPECTED_CLIENT_PROJECTION_BRIDGE = '20260719.2-temporal';
const VISUAL_REPAIR_REVISION = 'visual-human-repair-v2';

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
    const ownConsistent = scope !== 'own' || scoped.every(row => String(row.asesorId || '') === actorAdvisorId);
    return {
      role: Orbit.session && Orbit.session.rol ? String(Orbit.session.rol() || '') : '',
      scope,
      actorAdvisorIdPresent: !!actorAdvisorId,
      totalClients: all.length,
      scopedClients: scoped.length,
      ownConsistent
    };
  });
}

async function readCanonicalDataset(page) {
  return page.evaluate(() => {
    const helper = Orbit.clientProjection || {};
    const rows = (Orbit.store.all('clientes') || []).map(row => helper.project ? helper.project(row) : row);
    const invalidDates = rows.filter(row => /InvalidDate/i.test(String(row.fechaAlta || '')) || /InvalidDate/i.test(String(row.fechaNac || ''))).length;
    const invalidTypes = rows.filter(row => !['Persona','Empresa'].includes(String(row.tipo || ''))).length;
    const invalidCountries = rows.filter(row => !['GT','CO'].includes(String(row.pais || ''))).length;
    return {
      helperVersion: helper.version || '',
      total: rows.length,
      personas: rows.filter(row => row.tipo === 'Persona').length,
      empresas: rows.filter(row => row.tipo === 'Empresa').length,
      gt: rows.filter(row => row.pais === 'GT').length,
      co: rows.filter(row => row.pais === 'CO').length,
      invalidDates,
      invalidTypes,
      invalidCountries
    };
  });
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
    let country = document.getElementById('f-pais');
    const type = document.getElementById('f-tipo');
    const initialCountry = country && country.value;
    const initialType = type && type.value;
    let colombia = null;
    let companies = null;
    if (country) {
      country.value = 'CO';
      country.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(180);
      colombia = countRows();
      country = document.getElementById('f-pais');
      if (country) {
        country.value = initialCountry || '';
        country.dispatchEvent(new Event('change', { bubbles: true }));
        await wait(180);
      }
    }
    let typeNow = document.getElementById('f-tipo');
    if (typeNow) {
      typeNow.value = 'Empresa';
      typeNow.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(180);
      companies = countRows();
      typeNow = document.getElementById('f-tipo');
      if (typeNow) {
        typeNow.value = initialType || '';
        typeNow.dispatchEvent(new Event('change', { bubbles: true }));
        await wait(180);
      }
    }
    return { colombia, companies };
  });
  report[`${label}CanonicalFilters`] = result;
  assert(result.colombia != null && result.colombia > 0, 'CLIENT_FILTER_CO_EMPTY', label);
  assert(result.companies != null && result.companies > 0, 'CLIENT_FILTER_COMPANY_EMPTY', label);
}

export async function validateClient360(page, report, label) {
  report.contractVersion = CLIENT360_VALIDATOR_CONTRACT_VERSION;
  if (report.error == null) report.error = '';
  report.schemaVersion = 'orbit360-runtime-gate-joint-v27-role-selection-parity';
  report.visualRepairRevision = VISUAL_REPAIR_REVISION;
  await page.evaluate(() => { location.hash = '#/cliente360'; });
  await page.waitForTimeout(800);

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
  assert(dataset.total === EXPECTED_CLIENTS, 'CLIENT_CANONICAL_TOTAL_INVALID', `${label}:${dataset.total}`);
  assert(dataset.invalidTypes === 0, 'CLIENT_CANONICAL_TYPE_INVALID', `${label}:${dataset.invalidTypes}`);
  assert(dataset.invalidCountries === 0, 'CLIENT_CANONICAL_COUNTRY_INVALID', `${label}:${dataset.invalidCountries}`);
  assert(dataset.invalidDates === 0, 'CLIENT_CANONICAL_DATE_INVALID', `${label}:${dataset.invalidDates}`);
  assert(dataset.personas > 0 && dataset.empresas > 0, 'CLIENT_CANONICAL_TYPE_BUCKET_EMPTY', `${label}:${dataset.personas}/${dataset.empresas}`);
  assert(dataset.gt > 0 && dataset.co > 0, 'CLIENT_CANONICAL_COUNTRY_BUCKET_EMPTY', `${label}:${dataset.gt}/${dataset.co}`);

  const rows = page.locator('table.tbl tbody tr.clickable');
  await rows.first().waitFor({ state: 'visible', timeout: 20000 });
  report[`${label}VisibleClientRows`] = await rows.count();
  assert(report[`${label}VisibleClientRows`] === scopeState.scopedClients, 'CLIENT_LIST_SCOPE_COUNT_MISMATCH', `${label}:${report[`${label}VisibleClientRows`]}/${scopeState.scopedClients}`);

  const kpiText = clean(await page.locator('.kpi-row .kpi').first().innerText());
  report[`${label}ClientKpiExpectedCount`] = scopeState.scopedClients;
  report[`${label}ClientKpiMatchesScope`] = new RegExp(`\\b${scopeState.scopedClients}\\b`).test(kpiText);
  assert(report[`${label}ClientKpiMatchesScope`], 'CLIENT_KPI_SCOPE_MISMATCH', `${label}:${scopeState.scopedClients}`);

  await validateCountryAndTypeFilters(page, report, label, scopeState);
  report[`${label}ResponsiveControls`] = await validateHumanResponsiveControls(page, label);

  await rows.first().click();
  await page.locator('.fichahdr').waitFor({ state: 'visible', timeout: 15000 });

  const projection = await page.evaluate(() => {
    const id = Orbit.route && Orbit.route.params && Orbit.route.params.c;
    const row = id && Orbit.store.get('clientes', id);
    const helper = Orbit.clientProjection || {};
    const bridge = Orbit.clientCanonicalViewProjectionV20260716 || {};
    return row ? {
      canonical: row.__canonicalViewProjection || '',
      helperVersion: helper.version || '',
      temporaryBridge: bridge.temporaryInPlaceBridge === true,
      hasName: !!row.nombre,
      hasType: ['Persona','Empresa'].includes(row.tipo),
      hasCountry: ['GT','CO'].includes(row.pais),
      hasState: !!row.estadoOperativo,
      hasLabelsArray: Array.isArray(row.etiquetas),
      state: row.estadoOperativo || row.estado || '',
      policyCount: Orbit.store.where('polizas', p => p.clienteId === row.id).length,
      bodyText: document.body.innerText
    } : null;
  });
  report[`${label}ClientProjection`] = projection;
  assert(projection && projection.helperVersion === EXPECTED_CLIENT_PROJECTION_VERSION, 'CLIENT_CANONICAL_HELPER_VERSION_MISMATCH', `${label}:${projection && projection.helperVersion || 'missing'}`);
  assert(projection.canonical === EXPECTED_CLIENT_PROJECTION_BRIDGE, 'CLIENT_CANONICAL_PROJECTION_MISSING', `${label}:${projection.canonical || 'missing'}`);
  assert(projection.temporaryBridge, 'CLIENT_CANONICAL_TEMPORARY_BRIDGE_NOT_DECLARED', label);
  assert(projection.hasName && projection.hasType && projection.hasCountry && projection.hasState && projection.hasLabelsArray, 'CLIENT_CANONICAL_FIELDS_INCOMPLETE', label);
  assert(/pendiente_polizas/i.test(projection.state), 'CLIENT_STATE_NOT_PENDING_POLICIES', projection.state);
  assert(!/InvalidDate/i.test(projection.bodyText), 'CLIENT_INVALID_DATE_VISIBLE', label);
  if (projection.policyCount === 0) {
    assert(!/Cartera al día|Sin cobros pendientes|\bSalud\s*70\b/i.test(projection.bodyText), 'CLIENT_EMPTY_RELATIONS_SHOWN_AS_HEALTHY', label);
    assert(/Cartera (aún no disponible|no cargada)|Calidad de datos|Pendiente/i.test(projection.bodyText), 'CLIENT_EMPTY_RELATIONS_NOT_HONEST', label);
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
  return true;
}
