#!/usr/bin/env node
/* Orbit 360 · A&S country/currency normalizer
   Safe mode: metadata-only validator/suggester.
   It never writes store/Firestore and never defaults country/currency for writes.

   Usage:
     node tools/orbit360-normalizar-pais-moneda-ays.mjs --country "Guatemala" --currency "GTQ" --source-name "archivo.xlsx" --sheet-name "GT Ene 2026"
*/
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const REPORT_DIR = path.join(root, '_orbit360_reports');
const VERSION = 'v1.0.0-ays-country-currency-normalizer';

const COUNTRY_CURRENCY = {
  GT: 'GTQ',
  CO: 'COP'
};

const COUNTRY_PATTERNS = [
  { code: 'GT', label: 'Guatemala', patterns: [/\bGT\b/i, /guatemala/i, /guate/i] },
  { code: 'CO', label: 'Colombia', patterns: [/\bCO\b/i, /colombia/i, /colomb/i] }
];

const CURRENCY_PATTERNS = [
  { code: 'GTQ', label: 'Quetzal guatemalteco', patterns: [/\bGTQ\b/i, /quetzal/i, /quetzales/i, /\bQ\s*\d/i] },
  { code: 'COP', label: 'Peso colombiano', patterns: [/\bCOP\b/i, /peso[s]? colombiano[s]?/i, /\bCOL\$\b/i, /\bCOP\$\b/i] }
];

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : '';
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function detectFromText(text, patterns) {
  const hits = [];
  for (const item of patterns) {
    for (const re of item.patterns) {
      if (re.test(text)) {
        hits.push({ code: item.code, label: item.label, pattern: String(re) });
        break;
      }
    }
  }
  return hits;
}

function uniqueCodes(hits) {
  return [...new Set(hits.map((h) => h.code))];
}

const countryRaw = argValue('--country');
const currencyRaw = argValue('--currency');
const sourceName = argValue('--source-name');
const sheetName = argValue('--sheet-name');
const hint = argValue('--text-hint');
const contextText = [countryRaw, currencyRaw, sourceName, sheetName, hint].filter(Boolean).join(' | ');

const countryHits = detectFromText(contextText, COUNTRY_PATTERNS);
const currencyHits = detectFromText(contextText, CURRENCY_PATTERNS);
const countryCodes = uniqueCodes(countryHits);
const currencyCodes = uniqueCodes(currencyHits);
const errors = [];
const warnings = [];

let normalizedCountry = null;
let normalizedCurrency = null;
let suggestedCurrency = null;
let requiresValidation = false;

if (countryCodes.length > 1) errors.push(`País ambiguo: ${countryCodes.join(', ')}`);
if (currencyCodes.length > 1) errors.push(`Moneda ambigua: ${currencyCodes.join(', ')}`);

if (countryCodes.length === 1) normalizedCountry = countryCodes[0];
if (currencyCodes.length === 1) normalizedCurrency = currencyCodes[0];
if (normalizedCountry) suggestedCurrency = COUNTRY_CURRENCY[normalizedCountry] || null;

if (normalizedCountry && normalizedCurrency && COUNTRY_CURRENCY[normalizedCountry] !== normalizedCurrency) {
  errors.push(`País/moneda incoherente: ${normalizedCountry}/${normalizedCurrency}. Esperado: ${COUNTRY_CURRENCY[normalizedCountry]}.`);
}

if (!normalizedCountry || !normalizedCurrency) {
  requiresValidation = true;
  warnings.push('País o moneda no detectados con evidencia completa. No usar como escritura automática.');
}

if (normalizedCountry && !normalizedCurrency) {
  warnings.push(`Moneda sugerida por país: ${suggestedCurrency}. Debe confirmarse antes de escribir.`);
}

if (!contextText.trim()) {
  errors.push('No se recibió metadata para evaluar.');
}

const decision = errors.length ? 'BLOQUEADO' : (requiresValidation || warnings.length ? 'REQUIERE_VALIDACION' : 'LISTO_METADATA');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(REPORT_DIR, { recursive: true });
const jsonPath = path.join(REPORT_DIR, `NORMALIZAR-PAIS-MONEDA-AYS-${stamp}.json`);
const txtPath = path.join(REPORT_DIR, `NORMALIZAR-PAIS-MONEDA-AYS-${stamp}.txt`);

const result = {
  version: VERSION,
  created_at: new Date().toISOString(),
  inputs: { countryRaw, currencyRaw, sourceName, sheetName, hint },
  decision,
  normalized_country: normalizedCountry,
  normalized_currency: normalizedCurrency,
  suggested_currency: suggestedCurrency,
  requires_validation: requiresValidation,
  country_hits: countryHits,
  currency_hits: currencyHits,
  errors,
  warnings
};

const txt = [
  '============================================================',
  'ORBIT 360 - NORMALIZAR PAIS/MONEDA A&S',
  `Version: ${VERSION}`,
  `Fecha: ${result.created_at}`,
  `Decision: ${decision}`,
  'Restricciones: metadata-only, no defaults para escritura, no store/Firestore.',
  '============================================================',
  '',
  `País normalizado: ${normalizedCountry || 'S/D'}`,
  `Moneda normalizada: ${normalizedCurrency || 'S/D'}`,
  `Moneda sugerida: ${suggestedCurrency || 'S/D'}`,
  `Requiere validación: ${requiresValidation}`,
  '',
  `Errores: ${errors.length}`,
  ...errors.map((e) => `ERROR: ${e}`),
  '',
  `Advertencias: ${warnings.length}`,
  ...warnings.map((w) => `WARN: ${w}`),
  '',
  `JSON: ${rel(jsonPath)}`,
  errors.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'
].join('\n');

fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
fs.writeFileSync(txtPath, txt, 'utf8');
console.log(txt);
process.exit(errors.length ? 1 : 0);
