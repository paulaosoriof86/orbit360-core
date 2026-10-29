'use strict';
// I6.5/B4-003: the canonical shell mirrors the existing country owner.
// VM + synthetic DOM only; no browser, network, database or persistence.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../orbit360-platform/index.html'), 'utf8');
const start = html.indexOf("    (function () {\n      var sel = document.getElementById('pais-sel');");
assert.notEqual(start, -1, 'Canonical country selector owner not found');
const end = html.indexOf('    })();', start);
assert.notEqual(end, -1, 'Canonical country selector owner end not found');
const source = html.slice(start, end + '    })();'.length);

function harness(country = 'GT', persistAllowed = true) {
  const handlers = new Map(), selectHandlers = new Map(), frames = [], events = [], persisted = [];
  const optionIds = ['TODOS', 'GT', 'CO'];
  let value = '', hostWrites = 0, refreshes = 0;
  const selector = {
    innerHTML: '',
    get value() { return value; },
    set value(next) { value = optionIds.includes(next) ? next : ''; },
    addEventListener(type, fn) { selectHandlers.set(type, fn); }
  };
  const host = {
    setAttribute() { hostWrites += 1; },
    removeAttribute() { hostWrites += 1; },
    set innerHTML(_html) { hostWrites += 1; }
  };
  const Orbit = {
    pais: country,
    PAISES: optionIds.map(id => ({ id, label: id })),
    productAppP0: {
      persistCountry(next) { persisted.push(next); return persistAllowed; },
      isStarted() { return true; }
    }
  };
  const document = {
    getElementById(id) { return id === 'pais-sel' ? selector : id === 'host' ? host : null; },
    addEventListener(type, fn) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(fn);
    },
    dispatchEvent(event) {
      events.push(event.type);
      for (const fn of handlers.get(event.type) || []) fn(event);
      return true;
    }
  };
  const window = {
    requestAnimationFrame(fn) { frames.push(fn); },
    dispatchEvent() { refreshes += 1; return true; }
  };
  class Event { constructor(type, detail) { this.type = type; this.detail = detail; } }
  const context = vm.createContext({ Orbit, document, window, location: { hash: '#/insights' }, Event, CustomEvent: Event, HashChangeEvent: Event });
  vm.runInContext(source, context, { filename: 'index.html#country-owner' });
  return {
    Orbit, selector, persisted, events,
    localCountry(next, detail) { Orbit.pais = next; document.dispatchEvent(new Event('orbit:pais', detail)); },
    dispatchCountry(detail) { document.dispatchEvent(new Event('orbit:pais', detail)); },
    changeHeader(next) { selector.value = next; selectHandlers.get('change')(); },
    flush() { while (frames.length) frames.shift()(); },
    stats() { return { hostWrites, refreshes, countryListeners: (handlers.get('orbit:pais') || []).length }; }
  };
}

test('shell initially reflects the canonical GT, CO or TODOS value', () => {
  for (const country of ['GT', 'CO', 'TODOS']) assert.equal(harness(country).selector.value, country);
  assert.equal(harness(null).selector.value, 'TODOS');
});

test('Insights/Finanzas country events repaint the shell GT → CO → TODOS → GT', () => {
  const h = harness('GT');
  for (const country of ['CO', 'TODOS', 'GT']) {
    h.localCountry(country);
    assert.equal(h.selector.value, country, `header did not mirror ${country}`);
    assert.equal(h.Orbit.pais, country);
  }
  assert.deepEqual(h.persisted, [], 'paint must not create a second persistence owner');
  assert.deepEqual(h.stats(), { hostWrites: 0, refreshes: 0, countryListeners: 1 });
});

test('country event detail cannot replace canonical country or trigger writes', () => {
  const h = harness('GT');
  h.selector.value = 'CO';
  h.dispatchCountry({ country: 'CO', pais: 'CO', clientePais: 'CO' });
  assert.equal(h.selector.value, 'GT');
  assert.equal(h.Orbit.pais, 'GT');
  assert.deepEqual(h.persisted, []);
  assert.equal(h.stats().hostWrites, 0);
});

test('repeated country events are idempotent and never redispatch or rerender', () => {
  const h = harness('CO');
  for (let n = 0; n < 20; n += 1) h.dispatchCountry();
  assert.equal(h.selector.value, 'CO');
  assert.equal(h.events.length, 20);
  assert.deepEqual(h.persisted, []);
  assert.deepEqual(h.stats(), { hostWrites: 0, refreshes: 0, countryListeners: 1 });
});

test('unknown country remains unselected and never silently becomes GT', () => {
  const h = harness('GT');
  h.localCountry('XX');
  assert.equal(h.selector.value, '');
  assert.equal(h.Orbit.pais, 'XX');
  assert.deepEqual(h.persisted, []);
});

test('existing header change still delegates persistence and refreshes once', () => {
  const h = harness('GT');
  h.changeHeader('CO');
  assert.equal(h.Orbit.pais, 'CO');
  assert.deepEqual(h.persisted, ['CO']);
  h.flush();
  assert.equal(h.selector.value, 'CO');
  assert.deepEqual(h.events, ['orbit:pais']);
  assert.equal(h.stats().refreshes, 1);
  assert.equal(h.stats().hostWrites, 3);
});

test('rejected header change retains the existing country and does not redraw', () => {
  const h = harness('GT', false);
  h.changeHeader('CO');
  h.flush();
  assert.equal(h.Orbit.pais, 'GT');
  assert.equal(h.selector.value, 'GT');
  assert.deepEqual(h.persisted, ['CO']);
  assert.deepEqual(h.events, []);
  assert.equal(h.stats().refreshes, 0);
  assert.equal(h.stats().hostWrites, 0);
});

test('rapid header changes retain the existing latest-frame guard', () => {
  const h = harness('GT');
  h.changeHeader('CO');
  h.changeHeader('TODOS');
  h.flush();
  assert.equal(h.Orbit.pais, 'TODOS');
  assert.equal(h.selector.value, 'TODOS');
  assert.deepEqual(h.persisted, ['CO', 'TODOS']);
  assert.deepEqual(h.events, ['orbit:pais']);
  assert.equal(h.stats().refreshes, 1);
});
