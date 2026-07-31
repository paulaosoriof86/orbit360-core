#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const source=path.join(root,'firestore.product-readonly.rules');
const out=path.join(root,'orbit360-platform/runtime-gate-crm-v20260716/firestore.product-readonly.v910-candidate.rules');
const evidence=path.join(root,'orbit360-platform/runtime-gate-crm-v20260716/firestore-legacy-lab-compat-candidate-v910.json');
const expectedSourceBlob='bc573f59651bec2dc438877fcb9f88caf3f026d4';
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const allowed=['clientes','aseguradoras','asesores','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const src=fs.readFileSync(source,'utf8');
const sourceBlob=execFileSync('git',['rev-parse','HEAD:firestore.product-readonly.rules'],{encoding:'utf8'}).trim();
if(sourceBlob!==expectedSourceBlob)throw new Error('SECURITY_CANDIDATE_SOURCE_DRIFT');
if(!src.includes('match /{document=**} {\n      allow read, write: if false;\n    }'))throw new Error('SECURITY_CANDIDATE_CATCHALL_NOT_FOUND');
const functionAnchor=`    function activeMembership(tenantId) {\n      return isSignedIn()\n        && exists(membershipPath(tenantId))\n        && get(membershipPath(tenantId)).data.uid == request.auth.uid\n        && get(membershipPath(tenantId)).data.tenantId == tenantId\n        && get(membershipPath(tenantId)).data.status == 'active';\n    }\n`;
if(!src.includes(functionAnchor))throw new Error('SECURITY_CANDIDATE_ACTIVE_MEMBERSHIP_ANCHOR_NOT_FOUND');
const labFn=`\n    // TEMPORAL_RETIRO · compatibilidad de lectura exclusivamente para validación LAB A&S.\n    function isLegacyLabValidationUser() {\n      return isSignedIn()\n        && request.auth.uid == 'woJlxR1iFEeiQZvTscPj4qQ5Qc73'\n        && request.auth.token.email == 'orbit.lab@demo.com';\n    }\n`;
const match=`\n    // TEMPORAL_RETIRO · preview LAB legado; no habilita escrituras ni otras colecciones.\n    match /tenantId/{tenantId}/{collection}/{documentId} {\n      allow read: if tenantId == 'alianzas-soluciones'\n        && isLegacyLabValidationUser()\n        && activeMembership(tenantId)\n        && collection in [${allowed.map(x=>`'${x}'`).join(', ')}];\n      allow create, update, delete: if false;\n    }\n`;
let candidate=src.replace(functionAnchor,functionAnchor+labFn);
candidate=candidate.replace(`    match /{document=**} {\n      allow read, write: if false;\n    }`,match+`\n    match /{document=**} {\n      allow read, write: if false;\n    }`);
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,candidate,'utf8');
const result={schemaVersion:'orbit360-firestore-legacy-lab-compat-candidate-v1',contractVersion:'9.1.0',classification:'SECURITY_FAILURE',sourceRules:'firestore.product-readonly.rules',sourceGitBlob:sourceBlob,sourceSha256:sha(src),candidateSha256:sha(candidate),candidateCommitted:false,candidatePathRuntimeOnly:'runtime-gate-crm-v20260716/firestore.product-readonly.v910-candidate.rules',tenant:'alianzas-soluciones',technicalLabIdentityOnly:true,allowedCollections:allowed,readOnly:true,writesAllowed:false,credentialRefsAllowed:false,otherMembersLegacyAllowed:false,productionRuleSourceModified:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.writeFileSync(evidence,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
