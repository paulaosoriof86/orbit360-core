#!/usr/bin/env node
/* Smoke P0 calendario marketing — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

global.window = global;
global.Orbit = {};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-dryrun-p0.js', 'utf8'), { filename: 'importa-dryrun-p0.js' });
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-calendario-marketing-p0.js', 'utf8'), { filename: 'importa-calendario-marketing-p0.js' });

assert.ok(Orbit.importaCalendarioMarketingP0, 'debe registrar Orbit.importaCalendarioMarketingP0');

const built = Orbit.importaCalendarioMarketingP0.buildOperations({
  sourceFileName: 'Calendario Demo.xlsx',
  rows: [{
    ID: 1,
    'Estado general': 'Pendiente',
    'Fecha programada': 46174,
    'Hora sugerida': '08:00',
    Funnel: 'TOFU',
    'Campaña': 'Ruta de claridad',
    'Pilar de contenido': 'Educación práctica',
    Segmento: 'General',
    'Tema / gancho': 'Asegurarte no debería ser confuso.',
    'Desarrollo central': 'Contenido educativo de prueba',
    'Formato del recurso': 'Carrusel 5 láminas',
    'Herramienta sugerida': 'Canva + ChatGPT',
    'Prompt para generar el recurso': 'Diseña un carrusel ficticio',
    'Plataformas previstas': 'Facebook GT, Instagram GT, LinkedIn binacional',
    'Copy Facebook Guatemala': 'Copy ficticio Guatemala',
    'Copy Instagram Guatemala': 'Copy ficticio Instagram',
    'CTA Guatemala': 'Escríbenos CLARIDAD',
    'Hashtags Facebook': '#Seguros #Demo',
    'Responsable': 'Paula / automatización',
    'Código contenido': 'AYS-20260601-001',
    'Difusión recomendada': 'Orgánico + pauta test',
    '¿Pautar?': 'Sí',
    'País pauta': 'GT',
    'Campaña Meta sugerida': 'GT_TEST_CLARIDAD_JUN',
    'Objetivo de pauta': 'Mensajes',
    'Audiencia sugerida': 'Adultos 25-60',
    'Cobertura geográfica': 'Guatemala',
    'Inicio pauta': 46174,
    'Fin pauta': 46180,
    'Días pauta': 7,
    'Presupuesto sugerido (Q)': 100,
    'UTM campaign': 'gt_test_claridad_jun',
    'UTM content': 'contenido_demo',
    'Estado de producción': 'Pendiente',
    'Aprobación humana': 'Pendiente',
    'Estado de programación': 'Pendiente',
    'Estado pauta': 'Pendiente'
  }]
});

assert.equal(built.sourceType, 'calendario_marketing');
assert.equal(built.totalRows, 1);
assert.ok(built.operations.some(op => op.collection === 'contenidos'), 'debe proponer contenido');
assert.ok(built.operations.some(op => op.collection === 'campanasMarketing'), 'debe proponer campaña si se pauta');
assert.ok(built.operations.some(op => op.collection === 'gestiones'), 'debe proponer gestión de producción/revisión');
assert.equal(JSON.stringify(built).includes('finmovs'), false, 'no debe proponer finmovs');
assert.equal(JSON.stringify(built).includes('clientes'), false, 'no debe proponer clientes');

const report = Orbit.importaCalendarioMarketingP0.buildSanitizedDryRun({
  tenantId: 'tenant_demo',
  sourceFileName: 'Calendario Demo.xlsx',
  rows: [{
    'Código contenido': 'AYS-20260602-002',
    'Fecha programada': '2026-06-02',
    'Tema / gancho': 'Tres preguntas sobre tu seguro.',
    'Copy Facebook Guatemala': 'Copy público ficticio',
    '¿Pautar?': 'No'
  }]
});

assert.equal(report.sourceType, 'calendario_marketing');
assert.ok(report.operations.some(op => op.collection === 'contenidos'), 'dry-run debe traer contenido');
assert.equal(report.byCollection.contenidos, 1);
assert.ok(report.totals.blocked >= 1, 'pendiente_revision debe requerir validación humana');

const blocked = Orbit.importaDryRunP0.buildDryRun({
  sourceType: 'calendario_marketing',
  operations: [{ action: 'insert', collection: 'finmovs', data: { fecha: '2026-06-01', monto: 100, moneda: 'GTQ' } }]
});
assert.equal(blocked.hasBlockingErrors, true, 'calendario no puede crear finmovs');

console.log('OK P0 marketing calendar operation builder smoke passed');
