import fs from 'node:fs';
import path from 'node:path';

const cliRoot = process.argv[2];
if (!cliRoot) throw new Error('FIREBASE_CLI_ROOT_REQUIRED');

const packagePath = path.join(cliRoot, 'node_modules', 'firebase-tools', 'package.json');
const preparePath = path.join(cliRoot, 'node_modules', 'firebase-tools', 'lib', 'deploy', 'functions', 'prepare.js');
const releasePath = path.join(cliRoot, 'node_modules', 'firebase-tools', 'lib', 'deploy', 'functions', 'release', 'index.js');
if (!fs.existsSync(packagePath)) throw new Error('FIREBASE_TOOLS_PACKAGE_NOT_FOUND');
if (!fs.existsSync(preparePath)) throw new Error('FIREBASE_TOOLS_PREPARE_NOT_FOUND');
if (!fs.existsSync(releasePath)) throw new Error('FIREBASE_TOOLS_RELEASE_NOT_FOUND');

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

let release = fs.readFileSync(releasePath, 'utf8');
const cleanupCall = /await setupArtifactCleanupPolicies\(options,\s*options\.projectId,\s*Object\.keys\(wantBackend\.endpoints\),?\s*\);/g;
const matches = [...release.matchAll(cleanupCall)];
if (matches.length !== 1) throw new Error(`FIREBASE_TOOLS_CLEANUP_CALL_COUNT:${matches.length}`);
const originalCall = matches[0][0];
const guardedCall = `if (!(options.nonInteractive && !options.force)) {\n        ${originalCall}\n    }`;
release = release.replace(cleanupCall, guardedCall);
fs.writeFileSync(releasePath, release, 'utf8');
const releaseAfter = fs.readFileSync(releasePath, 'utf8');
if ((releaseAfter.split(guardedCall).length - 1) !== 1) throw new Error('FIREBASE_TOOLS_CLEANUP_GUARD_NOT_APPLIED_EXACTLY_ONCE');
if ((releaseAfter.match(/await setupArtifactCleanupPolicies\(/g) || []).length !== 1) throw new Error('FIREBASE_TOOLS_CLEANUP_CALL_POSTCOUNT_INVALID');

console.log('GRAVICENTRA_FIREBASE_TOOLS_EMPTY_EXTENSIONS_WORKAROUND=PASS');
console.log('GRAVICENTRA_FIREBASE_TOOLS_NONINTERACTIVE_CLEANUP_POLICY_SIDE_EFFECT_SKIPPED=PASS');
console.log('FIREBASE_TOOLS_VERSION=14.10.1');
console.log('PRODUCT_SOURCE_CHANGED=false');
console.log('CERTIFIED_ARTIFACT_CHANGED=false');
console.log('ARTIFACT_REGISTRY_POLICY_CHANGED=false');
