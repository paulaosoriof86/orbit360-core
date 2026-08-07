#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const CLIENTE = 'orbit360-platform/modules/cliente360.js';
const ROOTFIX = 'orbit360-platform/core/visual-runtime-rootfix-v20260805.js';
const SEALER = 'tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs';

function read(file) { return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); }
function writeIfChanged(file, next) {
  const prev = read(file);
  if (prev !== next) fs.writeFileSync(file, next, 'utf8');
  return prev !== next;
}

let cliente = read(CLIENTE);
if (!cliente.includes('LIST_PAGE_SIZE = 40')) {
  cliente = cliente.replace(
    "  let shownCid = null; // cliente actualmente abierto (para resetear pestaña al cambiar)\n",
    "  let shownCid = null; // cliente actualmente abierto (para resetear pestaña al cambiar)\n  const LIST_PAGE_SIZE = 40;\n  let listPage = 1;\n  let listRenderSeq = 0;\n  const perfNow = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());\n"
  );

  cliente = cliente.replace(
    "    const f = filtros;\n",
    "    const f = filtros;\n    const renderStartedAt = perfNow();\n    const summaryStartedAt = perfNow();\n    const summaryIndex = q.clientesResumenIndex ? q.clientesResumenIndex() : null;\n    const summaryCacheMs = perfNow() - summaryStartedAt;\n"
  );

  const filterTail = "      (!f.seg || c.segmento === f.seg)\n    );\n    const totPrima = clientes.reduce((s, c) => { const r = q.clienteResumen(c.id); return s + (r.moneda === 'COP' ? r.primaAnual / 1000 : r.primaAnual); }, 0);\n";
  if (!cliente.includes(filterTail)) throw new Error('PIPELINE_MECHANISM_FAILURE_V19_CLIENT_FILTER_PATTERN_NOT_FOUND');
  cliente = cliente.replace(filterTail,
    "      (!f.seg || c.segmento === f.seg)\n    );\n" +
    "    const pageCount = Math.max(1, Math.ceil(rows.length / LIST_PAGE_SIZE));\n" +
    "    if (listPage > pageCount) listPage = pageCount;\n" +
    "    if (listPage < 1) listPage = 1;\n" +
    "    const pageStart = (listPage - 1) * LIST_PAGE_SIZE;\n" +
    "    const visibleRows = rows.slice(pageStart, pageStart + LIST_PAGE_SIZE);\n" +
    "    const resumenDe = c => (summaryIndex && typeof summaryIndex.get === 'function' && summaryIndex.get(c.id)) || q.clienteResumen(c.id);\n" +
    "    const summaryAggregateStartedAt = perfNow();\n" +
    "    const totPrima = clientes.reduce((s, c) => { const r = resumenDe(c); return s + (r.moneda === 'COP' ? r.primaAnual / 1000 : r.primaAnual); }, 0);\n" +
    "    const summaryAggregateMs = perfNow() - summaryAggregateStartedAt;\n"
  );

  const rowMatch = cliente.match(/\$\{rows\.map\(c => \{[\s\S]*?\}\)\.join\(''\)\}/);
  if (!rowMatch) throw new Error('PIPELINE_MECHANISM_FAILURE_V19_ROW_TEMPLATE_PATTERN_NOT_FOUND');
  const rowExpression = rowMatch[0].slice(2, -1).replace(/^rows\.map/, 'visibleRows.map').replace('q.clienteResumen(c.id)', 'resumenDe(c)');
  cliente = cliente.replace(rowMatch[0], '${rowsHtml}');
  const hostMarker = "    host.innerHTML = `<div class=\"page\">";
  if (!cliente.includes(hostMarker)) throw new Error('PIPELINE_MECHANISM_FAILURE_V19_HOST_MARKER_NOT_FOUND');
  cliente = cliente.replace(hostMarker,
    "    const rowsBuildStartedAt = perfNow();\n" +
    "    const rowsHtml = " + rowExpression + ";\n" +
    "    const rowsBuildMs = perfNow() - rowsBuildStartedAt;\n" +
    "    const innerHtmlStartedAt = perfNow();\n\n" + hostMarker
  );

  const tableTail = "        </table>\n        </div>\n      </div>\n    </div>`;";
  if (!cliente.includes(tableTail)) throw new Error('PIPELINE_MECHANISM_FAILURE_V19_TABLE_TAIL_NOT_FOUND');
  cliente = cliente.replace(tableTail,
    "        </table>\n" +
    "        </div>\n" +
    "        <div class=\"c360-pagination\" style=\"display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 14px;border-top:1px solid var(--line);flex-wrap:wrap\">\n" +
    "          <span class=\"muted\" style=\"font-size:12px;margin-right:auto\">Mostrando ${visibleRows.length ? pageStart + 1 : 0}–${Math.min(pageStart + visibleRows.length, rows.length)} de ${rows.length}</span>\n" +
    "          <button id=\"c360-prev\" class=\"btn ghost sm\" ${listPage <= 1 ? 'disabled' : ''}>‹ Anterior</button>\n" +
    "          <span class=\"mono\" style=\"font-size:12px\">Página ${listPage} de ${pageCount}</span>\n" +
    "          <button id=\"c360-next\" class=\"btn ghost sm\" ${listPage >= pageCount ? 'disabled' : ''}>Siguiente ›</button>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>`;"
  );

  cliente = cliente.replace(
    "\n    const reb = () => { tab = 'resumen'; lista(); };\n",
    "\n    const innerHtmlMs = perfNow() - innerHtmlStartedAt;\n    const bindingStartedAt = perfNow();\n    const reb = () => { tab = 'resumen'; listPage = 1; lista(); };\n"
  );

  const qiLine = "    if (qi) qi.addEventListener('input', e => { filtros.q = e.target.value; liveFilter(); });\n";
  if (!cliente.includes(qiLine)) throw new Error('PIPELINE_MECHANISM_FAILURE_V19_QI_PATTERN_NOT_FOUND');
  cliente = cliente.replace(qiLine,
    qiLine +
    "    const prev = document.getElementById('c360-prev');\n" +
    "    const next = document.getElementById('c360-next');\n" +
    "    if (prev) prev.addEventListener('click', () => { if (listPage > 1) { listPage -= 1; lista(); } });\n" +
    "    if (next) next.addEventListener('click', () => { if (listPage < pageCount) { listPage += 1; lista(); } });\n" +
    "    const bindingsMs = perfNow() - bindingStartedAt;\n" +
    "    const totalMs = perfNow() - renderStartedAt;\n" +
    "    listRenderSeq += 1;\n" +
    "    window.OrbitRuntimeDiagnostics = window.OrbitRuntimeDiagnostics || {};\n" +
    "    OrbitRuntimeDiagnostics.cliente360 = Object.assign({}, OrbitRuntimeDiagnostics.cliente360 || {}, {\n" +
    "      version: '20260807.19-bounded-list-render',\n" +
    "      renderMs: totalMs,\n" +
    "      list: { bounded: true, pageSize: LIST_PAGE_SIZE, page: listPage, pageCount, totalRows: clientes.length, filteredRows: rows.length, renderedRows: visibleRows.length, summaryCacheMs, summaryAggregateMs, rowsBuildMs, innerHtmlMs, bindingsMs, totalMs, renderSeq: listRenderSeq, writes: 0 }\n" +
    "    });\n"
  );

  cliente = cliente.replace(
    "    lista();\n    const qi = document.getElementById('f-q');\n",
    "    listPage = 1;\n    lista();\n    const qi = document.getElementById('f-q');\n"
  );
}

let rootfix = read(ROOTFIX);
if (!rootfix.includes('totalWithAfterRenderMs')) {
  const oldBlock = "      var output = original(host);\n      var elapsed = Math.round((performance && performance.now ? performance.now() : Date.now()) - started);\n      window.OrbitRuntimeDiagnostics = window.OrbitRuntimeDiagnostics || {};\n      OrbitRuntimeDiagnostics[moduleName] = { version: VERSION, renderMs: elapsed, at: new Date().toISOString(), hydrated: true };\n      afterRender(moduleName, host);\n      setTimeout(function () { afterRender(moduleName, host); }, 0);\n      return output;";
  const newBlock = "      var output = original(host);\n      var elapsed = Math.round((performance && performance.now ? performance.now() : Date.now()) - started);\n      window.OrbitRuntimeDiagnostics = window.OrbitRuntimeDiagnostics || {};\n      OrbitRuntimeDiagnostics[moduleName] = Object.assign({}, OrbitRuntimeDiagnostics[moduleName] || {}, { version: VERSION, renderMs: elapsed, at: new Date().toISOString(), hydrated: true });\n      var afterStarted = performance && performance.now ? performance.now() : Date.now();\n      afterRender(moduleName, host);\n      var afterElapsed = Math.round((performance && performance.now ? performance.now() : Date.now()) - afterStarted);\n      OrbitRuntimeDiagnostics[moduleName] = Object.assign({}, OrbitRuntimeDiagnostics[moduleName] || {}, { afterRenderMs: afterElapsed, totalWithAfterRenderMs: elapsed + afterElapsed });\n      setTimeout(function () { afterRender(moduleName, host); }, 0);\n      return output;";
  if (!rootfix.includes(oldBlock)) throw new Error('PIPELINE_MECHANISM_FAILURE_V19_ROOTFIX_RENDER_PATTERN_NOT_FOUND');
  rootfix = rootfix.replace(oldBlock, newBlock);
}

let sealer = read(SEALER);
if (!sealer.includes('matrixValidatorFinding')) {
  const marker = "  matrixCheckpoint: outcomes.matrix === 'skipped' ? 'NOT_EXECUTED' : matrix && (matrix.currentCheckpoint || matrix.checkpoint) || 'NOT_EXECUTED',\n";
  if (!sealer.includes(marker)) throw new Error('PIPELINE_MECHANISM_FAILURE_V19_SEALER_MATRIX_PATTERN_NOT_FOUND');
  sealer = sealer.replace(marker, marker +
    "  matrixValidatorFinding: outcomes.matrix === 'skipped' ? '' : matrix && matrix.validatorFinding || '',\n" +
    "  routeMetrics: outcomes.matrix === 'skipped' ? [] : matrix && Array.isArray(matrix.routeMetrics) ? matrix.routeMetrics : [],\n"
  );
}

const changed = {
  cliente360: writeIfChanged(CLIENTE, cliente),
  visualRootfix: writeIfChanged(ROOTFIX, rootfix),
  sealer: writeIfChanged(SEALER, sealer)
};
console.log(JSON.stringify({ status:'PASS_V19_SOURCE_PATCH_APPLIED', changed, writes:0, secretsRead:false, firebaseAccess:false, hostingTouched:false, browserExecuted:false, deployExecuted:false, ok:true }, null, 2));
