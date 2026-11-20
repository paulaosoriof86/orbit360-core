'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../orbit360-platform/core/importa.js'), 'utf8');

function openImport(mode = 'inteligente') {
  class Element {
    constructor() {
      this.innerHTML = '';
      this.children = [];
      this.listeners = {};
      this.nodes = new Map();
      this.style = {};
      this.classList = { add() {}, remove() {} };
    }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    appendChild(el) { this.children.push(el); }
    querySelectorAll() { return []; }
    querySelector(selector) {
      const attribute = selector.startsWith('#') ? 'id="' + selector.slice(1) + '"' : 'class="' + selector.slice(1) + '"';
      if (!this.innerHTML.includes(attribute)) return null;
      if (!this.nodes.has(selector)) this.nodes.set(selector, new Element());
      return this.nodes.get(selector);
    }
  }
  class Reader {
    readAsText(file) { this.result = file.text; this.onload(); }
  }
  const drawer = new Element(), back = new Element();
  const document = {
    getElementById: id => id === 'imp-drawer' ? drawer : back,
    createElement: () => new Element(),
    head: {appendChild(script) { script.onerror(); }}
  };
  const Orbit = { ui: {esc: value => String(value || ''), toast() {}}, store: {all: () => []} };
  vm.runInNewContext(source, {window:{Orbit}, Orbit, document, FileReader:Reader, setTimeout: fn => fn()});
  Orbit.importa.open('polizas', {modo:mode});
  return {
    select(file) { drawer.querySelector('#imp-file').listeners.change({target:{files:[file]}}); },
    drop(file) { drawer.querySelector('#imp-drop').listeners.drop({preventDefault(){},dataTransfer:{files:[file]}}); },
    get html() { return drawer.innerHTML; },
    get buttons() { return drawer.querySelector('.imp-body').children.at(-1); }
  };
}

for (const entry of ['select','drop']) {
  test(entry + ' PDF with unavailable reader cannot present example policies or advance', async () => {
    const ui = openImport();
    ui[entry]({name:'emitida.pdf'});
    await new Promise(resolve => setImmediate(resolve));
    assert.match(ui.html,/No se extrajeron registros/);
    assert.doesNotMatch(ui.html,/GT-AT-48210|CO-PA-91733|GT-VE-22041|Extracción completada/);
    assert.match(ui.buttons.innerHTML,/id="imp-next2" disabled/);
    ui.buttons.querySelector('#imp-next2').listeners.click();
    assert.match(ui.html,/No se extrajeron registros/);
  });

  test(entry + ' mapped rows come from the supplied file', () => {
    const ui = openImport();
    ui[entry]({name:'registro.csv',text:'poliza,ramo\nORIGINAL-318,Autos'});
    assert.match(ui.html,/ORIGINAL-318/);
    assert.doesNotMatch(ui.html,/GT-AT-48210/);
    assert.doesNotMatch(ui.buttons.innerHTML,/id="imp-next2" disabled/);
  });
}
test('unrecognized columns remain available for remapping without approval', () => {
  const ui = openImport();
  ui.select({name:'archivo.csv',text:'xyzabc,uvwxyz\noriginal,manual'});
  assert.match(ui.html,/original/);
  assert.match(ui.buttons.innerHTML,/id="imp-next2" disabled/);
});
test('document-only mode retains Drive confirmation without inventing a row', () => {
  const ui = openImport('documental');
  ui.select({name:'original.pdf'});
  assert.match(ui.html,/guardar en Drive/);
  assert.doesNotMatch(ui.html,/GT-AT-48210/);
  ui.buttons.querySelector('#imp-next2').listeners.click();
  assert.match(ui.html,/Guardar en Drive/);
});
