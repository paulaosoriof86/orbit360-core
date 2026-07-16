const EXPECTED_CLIENTS = 414;
const EXPECTED_TABS = ['resumen','polizas','vehiculos','cobros','recibos','renovaciones','siniestros','comisiones','correos','historial'];

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

export async function validateClient360(page, report, label) {
  await page.evaluate(() => { location.hash = '#/cliente360'; });
  await page.waitForTimeout(700);

  const rows = page.locator('table.tbl tbody tr.clickable');
  await rows.first().waitFor({ state: 'visible', timeout: 20000 });
  report[`${label}VisibleClientRows`] = await rows.count();
  assert(report[`${label}VisibleClientRows`] > 0, 'CLIENT_LIST_EMPTY', label);

  const kpiText = clean(await page.locator('.kpi-row .kpi').first().innerText());
  report[`${label}ClientKpiHasExpectedCount`] = new RegExp(`\\b${EXPECTED_CLIENTS}\\b`).test(kpiText);
  assert(report[`${label}ClientKpiHasExpectedCount`], 'CLIENT_KPI_NOT_414', label);

  await rows.first().click();
  await page.locator('.fichahdr').waitFor({ state: 'visible', timeout: 15000 });

  const projection = await page.evaluate(() => {
    const id = Orbit.route && Orbit.route.params && Orbit.route.params.c;
    const row = id && Orbit.store.get('clientes', id);
    return row ? {
      canonical: row.__canonicalViewProjection || '',
      hasName: !!row.nombre,
      hasType: !!row.tipo,
      hasState: !!row.estadoOperativo,
      hasLabelsArray: Array.isArray(row.etiquetas),
      state: row.estadoOperativo || row.estado || ''
    } : null;
  });
  report[`${label}ClientProjection`] = projection;
  assert(projection && projection.canonical === '20260716.1', 'CLIENT_CANONICAL_PROJECTION_MISSING', label);
  assert(projection.hasName && projection.hasType && projection.hasState && projection.hasLabelsArray, 'CLIENT_CANONICAL_FIELDS_INCOMPLETE', label);
  assert(/pendiente_polizas/i.test(projection.state), 'CLIENT_STATE_NOT_PENDING_POLICIES', projection.state);

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
  assert(!/Firebase|Firestore|localStorage|mock|smoke/i.test(bodyText), 'TECHNICAL_COPY_VISIBLE', label);
  return true;
}
