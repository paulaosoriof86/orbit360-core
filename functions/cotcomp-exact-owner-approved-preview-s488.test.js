'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('crypto');
const S=require('./cotcomp-exact-owner-approved-preview-s488');

test('S4.88 reconstructs the exact S4.10/S4.18 owner-approved standalone byte-for-byte',()=>{
  const x=S.loadExactHtml();
  assert.equal(x.files.length,28);
  assert.equal(x.digest,'a7f1be79cdb6d8144f608dc559d69ebc38bb6347a03ad2733eac2bb914a4673d');
  assert.equal(crypto.createHash('sha256').update(x.html,'utf8').digest('hex'),S.EXPECTED_SHA256);
});

test('S4.88 exact baseline opens directly on CotComp and preserves the approved hierarchy',()=>{
  const {html}=S.loadExactHtml();
  assert.match(html,/state = \{ screen:'cotcomp'/);
  assert.match(html,/Empecemos por lo que quieres proteger\./);
  assert.match(html,/TU RECORRIDO/);
  assert.match(html,/ANTES DE COMPARAR/);
  assert.match(html,/¿Qué quieres proteger o revisar\?/);
});

test('S4.88 exact approved baseline already contains the broad product entry set',()=>{
  const {html}=S.loadExactHtml();
  for(const label of [
    'Auto / movilidad',
    'Hogar',
    'Gastos Médicos',
    'Vida e ingreso',
    'Empresa',
    'Flotilla / transporte / carga',
    'Contrato / obligación / proyecto',
    'Revisar póliza existente',
    'No estoy seguro'
  ]) assert.ok(html.includes(label),label);
});

test('S4.88 preserves approved comparison truth and explicit choice semantics',()=>{
  const {html}=S.loadExactHtml();
  assert.match(html,/Revisamos las opciones antes de compararlas\./);
  assert.match(html,/Compara diferencias que sí cambian la decisión\./);
  assert.match(html,/A&S no selecciona automáticamente una alternativa por ti/);
  assert.match(html,/Elegir una opción inicia la continuidad del proceso\. No equivale a emisión ni confirma cobertura\./);
});

test('S4.88 serves only GET and reports exact baseline identity headers',()=>{
  const headers={};
  const res={statusCode:200,body:null,set(k,v){headers[k]=v;return this;},status(n){this.statusCode=n;return this;},send(v){this.body=v;return this;}};
  S.handler({method:'POST'},res);
  assert.equal(res.statusCode,405);
  assert.equal(headers['X-Ays-CotComp-Baseline'],'S4.10/S4.18 exact');
  assert.equal(headers['X-Ays-CotComp-Sha256'],S.EXPECTED_SHA256);
});
