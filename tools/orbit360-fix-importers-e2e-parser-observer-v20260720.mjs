#!/usr/bin/env node
import fs from 'node:fs';

const target = 'tools/orbit360-importers-e2e-browser-v20260720.mjs';
let source = fs.readFileSync(target, 'utf8');

const before = `    const parsed = await page.evaluate(() => {
      const modal = document.getElementById('ins-dir-import-v1202');
      const text = modal?.textContent || '';
      return Boolean(modal?.querySelector('[data-secure-only]')) &&
        /Operaciones\\s*1\\b/.test(text) &&
        /Credenciales detectadas\\s*1\\b/.test(text);
    });
    if (!parsed) throw Object.assign(new Error('PARSE'), { gateCode: 'SOURCE_PARSE_FAILED' });`;

const after = `    const parsed = await page.evaluate(() => {
      const modal = document.getElementById('ins-dir-import-v1202');
      const text = modal?.textContent || '';
      const operations = Number((text.match(/Operaciones\\s*(\\d+)/i) || [])[1] || 0);
      const references = Number((text.match(/(?:referencias de conexión detectadas|Credenciales detectadas)\\s*(\\d+)/i) || [])[1] || 0);
      return {
        ready: Boolean(modal?.querySelector('[data-secure-only]')),
        operations,
        references
      };
    });
    diagnostic.parser = {
      ready: parsed.ready === true,
      operations: Number(parsed.operations || 0),
      references: Number(parsed.references || 0),
      observerVersion: '20260720.2'
    };
    write();
    if (!parsed.ready || parsed.operations !== 1 || parsed.references !== 1) {
      throw Object.assign(new Error('PARSE'), { gateCode: 'SOURCE_PARSE_FAILED' });
    }`;

if (source.includes(after)) {
  console.log('OBSERVER_ALREADY_CURRENT');
  process.exit(0);
}
if (!source.includes(before)) throw new Error('STALE_OBSERVER_SIGNATURE_NOT_FOUND');
source = source.replace(before, after);
fs.writeFileSync(target, source, 'utf8');
console.log('GO_IMPORTERS_E2E_PARSER_OBSERVER_20260720_2');
