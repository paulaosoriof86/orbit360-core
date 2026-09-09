import fs from 'node:fs';
import path from 'node:path';

const cliRoot = process.argv[2];
if (!cliRoot) throw new Error('FIREBASE_CLI_ROOT_REQUIRED');

const packagePath = path.join(cliRoot, 'node_modules', 'firebase-tools', 'package.json');
const preparePath = path.join(cliRoot, 'node_modules', 'firebase-tools', 'lib', 'deploy', 'functions', 'prepare.js');
if (!fs.existsSync(packagePath)) throw new Error('FIREBASE_TOOLS_PACKAGE_NOT_FOUND');
if (!fs.existsSync(preparePath)) throw new Error('FIREBASE_TOOLS_PREPARE_NOT_FOUND');

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (pkg.version !== '14.10.1') throw new Error(`FIREBASE_TOOLS_VERSION_DRIFT:${pkg.version}`);

const vulnerable = 'if (Object.values(wantBuilds).some((b) => b.extensions)) {';
const fixed = 'if (Object.values(wantBuilds).some((b) => b.extensions && Object.keys(b.extensions).length > 0)) {';
let text = fs.readFileSync(preparePath, 'utf8');
const count = text.split(vulnerable).length - 1;
if (count !== 1) throw new Error(`FIREBASE_TOOLS_VULNERABLE_EXPRESSION_COUNT:${count}`);
if (text.includes(fixed)) throw new Error('FIREBASE_TOOLS_ALREADY_PATCHED_UNEXPECTEDLY');

text = text.replace(vulnerable, fixed);
fs.writeFileSync(preparePath, text, 'utf8');
const after = fs.readFileSync(preparePath, 'utf8');
if ((after.split(fixed).length - 1) !== 1) throw new Error('FIREBASE_TOOLS_WORKAROUND_NOT_APPLIED_EXACTLY_ONCE');
if (after.includes(vulnerable)) throw new Error('FIREBASE_TOOLS_VULNERABLE_EXPRESSION_REMAINS');

console.log('GRAVICENTRA_FIREBASE_TOOLS_EMPTY_EXTENSIONS_WORKAROUND=PASS');
console.log('FIREBASE_TOOLS_VERSION=14.10.1');
console.log('PRODUCT_SOURCE_CHANGED=false');
console.log('CERTIFIED_ARTIFACT_CHANGED=false');
