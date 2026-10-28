'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../orbit360-platform/modules/cronograma.js'), 'utf8');

function scenario(hostname, reject = false) {
  const written = [];
  const rows = [];
  const messages = [];
  const clicks = Object.create(null);
  const view = {
    innerHTML: '',
    querySelector(selector) {
      return { addEventListener(_, callback) { clicks[selector] = callback; } };
    },
    querySelectorAll() { return []; }
  };
  const store = {
    all(collection) { return collection === 'tareas' ? rows : []; },
    get(collection, id) { return collection === 'tareas' ? rows.find(row => row.id === id) : null; },
    insertDurable(collection, row) {
      written.push({ collection, row: { ...row } });
      if (reject) return Promise.reject(new Error('DENIED'));
      rows.push({ ...row });
      return Promise.resolve(row);
    }
  };
  const orbit = {
    modules: {}, store,
    ui: { NOW: new Date('2026-10-28T12:00:00Z'), prompt: async () => '2026-10-28 QA B4-003 tarea sin acción externa', toast: message => messages.push(message), esc: x => x },
    kit: { banner: () => '' },
    q: { renovacionesProximas: () => [] }
  };
  const context = { window: { Orbit: orbit }, Orbit: orbit, location: { hostname }, Date, Map, Set, String, Number, Array, Object, RegExp, encodeURIComponent };
  vm.runInNewContext(source, context, { filename: 'cronograma.js' });
  orbit.modules.cronograma.render(view);
  return { click: clicks['#cr-new'], rows, written, messages, view };
}

test('Preview creates a marked B4-003 synthetic task with durable confirmation', async () => {
  const x = scenario('ays-orbit-360-lab--gi-i65-b4-40727347719-zp30idpv.web.app');
  await x.click();
  assert.equal(x.written.length, 1);
  assert.equal(x.written[0].collection, 'tareas');
  assert.match(x.written[0].row.id, /^b4003qa_tareas_[0-9]+$/);
  assert.equal(x.written[0].row.__syntheticQa, true);
  assert.equal(x.rows.length, 1);
  assert.match(x.view.innerHTML, /QA B4-003 tarea sin acción externa/);
  assert.ok(x.messages.some(message => message.includes('confirmada en el servidor')));
});

test('LIVE creates a normal task without Preview synthetic marking', async () => {
  const x = scenario('gravicentra.example.com');
  await x.click();
  assert.match(x.written[0].row.id, /^tk[0-9]+$/);
  assert.equal(x.written[0].row.__syntheticQa, undefined);
});

test('failed server write must not appear as a successfully created task', async () => {
  const x = scenario('ays-orbit-360-lab--gi-i65-b4-40727347719-zp30idpv.web.app', true);
  await x.click();
  assert.equal(x.rows.length, 0);
  assert.ok(x.messages.some(message => message.includes('no se guardó')));
});
