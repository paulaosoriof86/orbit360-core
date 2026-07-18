#!/usr/bin/env node
import fs from 'node:fs';

const path = 'tools/orbit360-gate-runtime-crm-v20260716.mjs';
let source = fs.readFileSync(path, 'utf8');
const from = "contractVersion:'1.0.17'";
const to = "contractVersion:'1.0.18'";
const count = source.split(from).length - 1;
if (count !== 1) throw new Error(`CONTRACT_VERSION_MATCH_COUNT:${count}`);
source = source.replace(from, to);
if (!source.includes(to) || source.includes(from)) throw new Error('CONTRACT_VERSION_REPLACE_FAILED');
fs.writeFileSync(path, source, 'utf8');
console.log(JSON.stringify({ ok: true, path, contractVersion: '1.0.18' }, null, 2));
